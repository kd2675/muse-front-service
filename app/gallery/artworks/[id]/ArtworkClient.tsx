"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import PageShell from "../../../components/PageShell";
import TopNav from "../../../components/TopNav";
import { getArtworkDetail } from "../../../lib/artwork";
import { Skeleton, SkeletonText } from "../../../components/Skeleton";

type ArtworkClientProps = {
  id: number;
};

const storageKey = (id: number) => `muse:artwork:${id}:view`;
const bookmarkStorageKey = "muse:artwork:bookmarks";

function readInitialCollected(id: number): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const raw = window.localStorage.getItem(bookmarkStorageKey);
  if (!raw) {
    return false;
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return Boolean(parsed[String(id)]);
  } catch {
    return false;
  }
}

export default function ArtworkClient({ id }: ArtworkClientProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isTransforming, setIsTransforming] = useState(false);
  const [isCollected, setIsCollected] = useState(() => readInitialCollected(id));
  const [isNoteExpanded, setIsNoteExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isPanningRef = useRef(false);
  const wheelIdleTimerRef = useRef<number | null>(null);
  const lastPointRef = useRef({ x: 0, y: 0 });
  const pinchStartRef = useRef<{ distance: number; zoom: number } | null>(null);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(
    new Map(),
  );
  const { data, isLoading } = useQuery({
    queryKey: ["artwork", id],
    queryFn: () => getArtworkDetail(id),
  });

  const artwork = data?.data ?? null;
  const error = data?.error;
  const relatedWorks = artwork?.relatedWorks ?? [];
  const maxZoom = 2.4;
  const minZoom = 1;

  const clampOffset = useCallback(
    (next: { x: number; y: number }, targetZoom = zoom) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) {
        return next;
      }
      const maxX = ((targetZoom - 1) * rect.width) / 2;
      const maxY = ((targetZoom - 1) * rect.height) / 2;
      return {
        x: Math.max(-maxX, Math.min(maxX, next.x)),
        y: Math.max(-maxY, Math.min(maxY, next.y)),
      };
    },
    [zoom],
  );

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const raw = window.sessionStorage.getItem(storageKey(id));
    if (!raw) {
      return;
    }
    try {
      const saved = JSON.parse(raw) as {
        zoom?: number;
        rotation?: number;
        offset?: { x: number; y: number };
      };
      let restoredZoom = minZoom;
      if (typeof saved.zoom === "number") {
        restoredZoom = Math.max(minZoom, Math.min(maxZoom, saved.zoom));
        setZoom(restoredZoom);
      }
      if (typeof saved.rotation === "number") {
        setRotation(saved.rotation % 360);
      }
      if (saved.offset) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) {
          setOffset(saved.offset);
        } else {
          const maxX = ((restoredZoom - 1) * rect.width) / 2;
          const maxY = ((restoredZoom - 1) * rect.height) / 2;
          setOffset({
            x: Math.max(-maxX, Math.min(maxX, saved.offset.x)),
            y: Math.max(-maxY, Math.min(maxY, saved.offset.y)),
          });
        }
      }
    } catch {
      // ignore invalid cache
    }
  }, [id, maxZoom, minZoom]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    const payload = JSON.stringify({ zoom, rotation, offset });
    window.sessionStorage.setItem(storageKey(id), payload);
  }, [id, zoom, rotation, offset]);

  const toggleCollection = useCallback(() => {
    const raw = window.localStorage.getItem(bookmarkStorageKey);
    let nextState = false;
    try {
      const parsed = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
      nextState = !Boolean(parsed[String(id)]);
      parsed[String(id)] = nextState;
      window.localStorage.setItem(bookmarkStorageKey, JSON.stringify(parsed));
    } catch {
      const fallback = { [String(id)]: true };
      nextState = true;
      window.localStorage.setItem(bookmarkStorageKey, JSON.stringify(fallback));
    }
    setIsCollected(nextState);
  }, [id]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (zoom === 1) {
      setOffset({ x: 0, y: 0 });
      return;
    }
    setOffset((prev) => clampOffset(prev));
  }, [zoom, clampOffset]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const applyWheelZoom = useCallback((deltaY: number) => {
    const delta = -deltaY * 0.001;
    setIsTransforming(true);
    if (wheelIdleTimerRef.current !== null) {
      window.clearTimeout(wheelIdleTimerRef.current);
    }
    wheelIdleTimerRef.current = window.setTimeout(() => {
      setIsTransforming(false);
      wheelIdleTimerRef.current = null;
    }, 120);
    setZoom((prev) => {
      const next = Math.max(minZoom, Math.min(maxZoom, prev + delta));
      return Number(next.toFixed(2));
    });
  }, [maxZoom, minZoom]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      applyWheelZoom(event.deltaY);
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", onWheel);
    };
  }, [applyWheelZoom]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (pointersRef.current.size === 2) {
      const points = Array.from(pointersRef.current.values());
      const distance = Math.hypot(
        points[0].x - points[1].x,
        points[0].y - points[1].y,
      );
      pinchStartRef.current = { distance, zoom };
      isPanningRef.current = false;
      setIsTransforming(true);
      return;
    }

    if (zoom <= 1) {
      return;
    }
    isPanningRef.current = true;
    setIsTransforming(true);
    lastPointRef.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) {
      return;
    }
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (pointersRef.current.size === 2 && pinchStartRef.current) {
      const points = Array.from(pointersRef.current.values());
      const distance = Math.hypot(
        points[0].x - points[1].x,
        points[0].y - points[1].y,
      );
      const scale = distance / pinchStartRef.current.distance;
      const nextZoom = Math.max(
        minZoom,
        Math.min(maxZoom, pinchStartRef.current.zoom * scale),
      );
      setZoom(Number(nextZoom.toFixed(2)));
      return;
    }

    if (!isPanningRef.current) {
      return;
    }
    const dx = event.clientX - lastPointRef.current.x;
    const dy = event.clientY - lastPointRef.current.y;
    lastPointRef.current = { x: event.clientX, y: event.clientY };
    setOffset((prev) => clampOffset({ x: prev.x + dx, y: prev.y + dy }));
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    isPanningRef.current = false;
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) {
      pinchStartRef.current = null;
    }
    if (pointersRef.current.size === 0) {
      setIsTransforming(false);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  useEffect(() => {
    return () => {
      if (wheelIdleTimerRef.current !== null) {
        window.clearTimeout(wheelIdleTimerRef.current);
      }
    };
  }, []);

  return (
    <PageShell>
      <TopNav />
      {isLoading ? (
        <section className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border border-[color:var(--line)] bg-white/70 p-8 shadow-[var(--shadow)]">
            <Skeleton className="h-[360px] w-full rounded-[22px]" />
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Skeleton className="h-7 w-16 rounded-full" />
              <Skeleton className="h-7 w-16 rounded-full" />
              <Skeleton className="h-7 w-16 rounded-full" />
              <Skeleton className="h-7 w-16 rounded-full" />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Skeleton className="h-10 w-24 rounded-full" />
              <Skeleton className="h-10 w-24 rounded-full" />
              <Skeleton className="h-10 w-24 rounded-full" />
            </div>
          </div>
          <div className="grid gap-6">
            <div className="rounded-[28px] border border-[color:var(--line)] bg-white/70 p-8 shadow-[var(--shadow)]">
              <Skeleton className="h-8 w-1/2 rounded-[16px]" />
              <SkeletonText className="mt-4" lines={3} />
              <div className="mt-6 grid gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton
                    // eslint-disable-next-line react/no-array-index-key
                    key={index}
                    className="h-7 w-full rounded-full"
                  />
                ))}
              </div>
            </div>
            <div className="rounded-[28px] border border-[color:var(--line)] bg-white/70 p-8 shadow-[var(--shadow)]">
              <Skeleton className="h-6 w-32 rounded-[14px]" />
              <div className="mt-4 grid gap-3">
                <Skeleton className="h-24 w-full rounded-[18px]" />
                <Skeleton className="h-24 w-full rounded-[18px]" />
              </div>
            </div>
          </div>
        </section>
      ) : artwork ? (
        <>
          {artwork && (
            <section className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border border-[color:var(--line)] bg-white/70 p-8 shadow-[var(--shadow)]">
            <div
              ref={containerRef}
              className="overflow-hidden rounded-[22px] border border-[color:var(--line)] bg-white/80"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{ touchAction: "none" }}
            >
              <div
                className="h-[360px] w-full"
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                  transition: isTransforming ? "none" : "transform 0.18s ease-out",
                  cursor: zoom > 1 ? (isTransforming ? "grabbing" : "grab") : "default",
                }}
              >
                {artwork.imageUrl ? (
                  <img
                    src={artwork.imageUrl}
                    alt={artwork.title}
                    className="h-full w-full object-cover select-none"
                    draggable={false}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-white text-sm text-[color:var(--muted)]">
                    이미지 없음
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[color:var(--muted)]">
              <button
                className="rounded-full border border-[color:var(--line)] px-3 py-1 transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                onClick={() => setZoom((prev) => Math.min(prev + 0.2, maxZoom))}
              >
                줌 인
              </button>
              <button
                className="rounded-full border border-[color:var(--line)] px-3 py-1 transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                onClick={() => setZoom((prev) => Math.max(prev - 0.2, minZoom))}
              >
                줌 아웃
              </button>
              <button
                className="rounded-full border border-[color:var(--line)] px-3 py-1 transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                onClick={() => setRotation((prev) => (prev + 90) % 360)}
              >
                회전
              </button>
              <button
                className="rounded-full border border-[color:var(--line)] px-3 py-1 transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                onClick={() => {
                  setZoom(1);
                  setRotation(0);
                  setOffset({ x: 0, y: 0 });
                }}
              >
                리셋
              </button>
              <span className="ml-auto rounded-full bg-[color:var(--chip)] px-3 py-1 text-xs text-[color:var(--accent)]">
                Zoom {zoom.toFixed(1)}x
              </span>
            </div>
            <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--accent)]">
                  {artwork.category}
                </p>
                <h1 className="mt-2 font-[var(--font-display)] text-3xl">
                  {artwork.title}
                </h1>
                <p className="mt-2 text-sm text-[color:var(--muted)]">
                  {artwork.artist}
                </p>
              </div>
              <button
                className="rounded-full bg-[color:var(--accent)] px-4 py-2 text-sm text-white shadow-[var(--shadow)]"
                onClick={toggleCollection}
              >
                {isCollected ? "컬렉션 저장됨" : "컬렉션 저장"}
              </button>
            </div>
            <p className="mt-6 text-sm text-[color:var(--muted)]">
              {artwork.description}
            </p>
          </div>

          <div className="grid gap-6">
            <div className="rounded-[28px] border border-[color:var(--line)] bg-white/70 p-8 shadow-[var(--shadow)]">
              <h2 className="font-[var(--font-display)] text-2xl">EXIF</h2>
              <p className="mt-2 text-sm text-[color:var(--muted)]">
                촬영 정보 기반으로 작품을 분석해보세요.
              </p>
              <div className="mt-6 grid gap-4">
                <div className="rounded-[20px] border border-[color:var(--line)] bg-white/80 p-4">
                  <p className="text-xs text-[color:var(--muted)]">Camera</p>
                  <p className="mt-2 text-sm font-semibold">
                    {artwork.exif.camera}
                  </p>
                </div>
                <div className="rounded-[20px] border border-[color:var(--line)] bg-white/80 p-4">
                  <p className="text-xs text-[color:var(--muted)]">Lens</p>
                  <p className="mt-2 text-sm font-semibold">
                    {artwork.exif.lens}
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[20px] border border-[color:var(--line)] bg-white/80 p-4">
                    <p className="text-xs text-[color:var(--muted)]">
                      Focal
                    </p>
                    <p className="mt-2 text-sm font-semibold">
                      {artwork.exif.focalLength}
                    </p>
                  </div>
                  <div className="rounded-[20px] border border-[color:var(--line)] bg-white/80 p-4">
                    <p className="text-xs text-[color:var(--muted)]">
                      Aperture
                    </p>
                    <p className="mt-2 text-sm font-semibold">
                      {artwork.exif.aperture}
                    </p>
                  </div>
                  <div className="rounded-[20px] border border-[color:var(--line)] bg-white/80 p-4">
                    <p className="text-xs text-[color:var(--muted)]">
                      Shutter
                    </p>
                    <p className="mt-2 text-sm font-semibold">
                      {artwork.exif.shutterSpeed}
                    </p>
                  </div>
                  <div className="rounded-[20px] border border-[color:var(--line)] bg-white/80 p-4">
                    <p className="text-xs text-[color:var(--muted)]">ISO</p>
                    <p className="mt-2 text-sm font-semibold">
                      {artwork.exif.iso}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-[28px] border border-[color:var(--line)] bg-white/70 p-8 shadow-[var(--shadow)]">
              <h2 className="font-[var(--font-display)] text-2xl">
                Curator Notes
              </h2>
              <p className="mt-2 text-sm text-[color:var(--muted)]">
                {artwork.title}는 빛의 잔향과 텍스처를 통해 감상자의 시선을
                집중시키는 작품입니다. 구조적 대비와 미세한 색온도 차이를 함께
                보면 작품의 깊이가 더 선명해집니다.
              </p>
              {isNoteExpanded && (
                <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
                  수평/수직 요소가 교차하는 지점을 중심으로 하이라이트가 퍼지며,
                  시선이 프레임 안에서 순환하도록 구성되어 있습니다. 감상 시
                  하이라이트 영역의 경계와 어두운 면의 질감 차이를 번갈아 보면
                  의도한 리듬을 더 잘 확인할 수 있습니다.
                </p>
              )}
              <button
                className="mt-6 rounded-full border border-[color:var(--line)] px-4 py-2 text-xs text-[color:var(--muted)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                onClick={() => setIsNoteExpanded((prev) => !prev)}
              >
                {isNoteExpanded ? "노트 접기" : "전체 노트 보기"}
              </button>
            </div>
            <div className="rounded-[28px] border border-[color:var(--line)] bg-white/70 p-8 shadow-[var(--shadow)]">
              <h2 className="font-[var(--font-display)] text-2xl">
                Related Works
              </h2>
              <p className="mt-2 text-sm text-[color:var(--muted)]">
                {artwork.artist}의 다른 작품을 확인하세요.
              </p>
              <div className="mt-6 grid gap-4">
                {relatedWorks.length > 0 ? (
                  relatedWorks.map((item) => (
                    <Link
                      key={item.id}
                      href={`/gallery/artworks/${item.id}`}
                      className="block rounded-[22px] border border-[color:var(--line)] bg-white/80 p-4 transition hover:border-[color:var(--accent)] hover:shadow-[var(--shadow)]"
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="h-20 w-full rounded-[16px] object-cover"
                        />
                      ) : (
                        <div className="flex h-20 w-full items-center justify-center rounded-[16px] border border-dashed border-[color:var(--line)] bg-white text-xs text-[color:var(--muted)]">
                          이미지 없음
                        </div>
                      )}
                      <p className="mt-3 text-xs text-[color:var(--muted)]">
                        {item.artist}
                      </p>
                      <h3 className="mt-1 font-[var(--font-display)] text-lg">
                        {item.title}
                      </h3>
                    </Link>
                  ))
                ) : (
                  <div className="rounded-[20px] border border-[color:var(--line)] bg-white/80 px-4 py-3 text-xs text-[color:var(--muted)]">
                    연관 작품이 아직 없습니다.
                  </div>
                )}
              </div>
            </div>
          </div>
            </section>
          )}
        </>
      ) : (
        <div className="mt-10 rounded-[28px] border border-[color:var(--line)] bg-white/70 px-6 py-6 text-sm text-[color:var(--muted)] shadow-[var(--shadow)]">
          작품 정보를 불러오지 못했습니다.
          {error ? ` (${error})` : ""}
        </div>
      )}
    </PageShell>
  );
}
