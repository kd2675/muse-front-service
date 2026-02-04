"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import PageShell from "../../../components/PageShell";
import TopNav from "../../../components/TopNav";
import { getArtworkDetail } from "../../../lib/artwork";
import { Skeleton, SkeletonText } from "../../../components/Skeleton";
import { useAppDispatch } from "../../../store/hooks";
import { showToast } from "../../../store/uiSlice";

type ArtworkClientProps = {
  id: number;
};

const storageKey = (id: number) => `muse:artwork:${id}:view`;

export default function ArtworkClient({ id }: ArtworkClientProps) {
  const dispatch = useAppDispatch();
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isPanningRef = useRef(false);
  const lastPointRef = useRef({ x: 0, y: 0 });
  const pinchStartRef = useRef<{ distance: number; zoom: number } | null>(null);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(
    new Map(),
  );
  const { data, isLoading } = useQuery({
    queryKey: ["artwork", id],
    queryFn: () => getArtworkDetail(id),
  });

  const artwork = data?.data;
  const isFallback = data?.isFallback ?? false;
  const error = data?.error;
  const relatedWorks = artwork
    ? [
        {
          id: artwork.id + 1,
          title: `${artwork.category} Drift`,
          artist: artwork.artist,
          colorFrom: artwork.colorTo,
          colorTo: artwork.colorFrom,
        },
        {
          id: artwork.id + 2,
          title: `${artwork.category} Bloom`,
          artist: artwork.artist,
          colorFrom: artwork.colorFrom,
          colorTo: "#D0C4B1",
        },
        {
          id: artwork.id + 3,
          title: `${artwork.category} Frame`,
          artist: artwork.artist,
          colorFrom: "#1E2A35",
          colorTo: "#6B7C93",
        },
      ]
    : [];
  const maxZoom = 2.4;
  const minZoom = 1;

  const clampOffset = useCallback(
    (next: { x: number; y: number }) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) {
        return next;
      }
      const maxX = ((zoom - 1) * rect.width) / 2;
      const maxY = ((zoom - 1) * rect.height) / 2;
      return {
        x: Math.max(-maxX, Math.min(maxX, next.x)),
        y: Math.max(-maxY, Math.min(maxY, next.y)),
      };
    },
    [zoom],
  );

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
      if (typeof saved.zoom === "number") {
        setZoom(Math.max(minZoom, Math.min(maxZoom, saved.zoom)));
      }
      if (typeof saved.rotation === "number") {
        setRotation(saved.rotation % 360);
      }
      if (saved.offset) {
        setOffset((prev) => clampOffset(saved.offset ?? prev));
      }
    } catch {
      // ignore invalid cache
    }
  }, [id, clampOffset, maxZoom, minZoom]);

  useEffect(() => {
    const payload = JSON.stringify({ zoom, rotation, offset });
    window.sessionStorage.setItem(storageKey(id), payload);
  }, [id, zoom, rotation, offset]);

  useEffect(() => {
    if (zoom === 1) {
      setOffset({ x: 0, y: 0 });
      return;
    }
    setOffset((prev) => clampOffset(prev));
  }, [zoom, clampOffset]);

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const delta = -event.deltaY * 0.001;
    setZoom((prev) => {
      const next = Math.max(minZoom, Math.min(maxZoom, prev + delta));
      return Number(next.toFixed(2));
    });
  };

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
      return;
    }

    if (zoom <= 1) {
      return;
    }
    isPanningRef.current = true;
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
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

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
      ) : (
        <>
          {isFallback && (
            <div className="mt-10 rounded-2xl border border-[color:var(--line)] bg-white/70 px-5 py-3 text-xs text-[color:var(--muted)]">
              작품 정보를 불러오지 못해 임시 콘텐츠를 표시하고 있습니다.
              {error ? ` (${error})` : ""}
            </div>
          )}

          {artwork && (
            <section className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border border-[color:var(--line)] bg-white/70 p-8 shadow-[var(--shadow)]">
            <div
              ref={containerRef}
              className="overflow-hidden rounded-[22px] border border-[color:var(--line)] bg-white/80"
              onWheel={handleWheel}
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
                  background: `linear-gradient(135deg, ${artwork.colorFrom}, ${artwork.colorTo})`,
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                  transition: "transform 0.2s ease",
                  cursor: zoom > 1 ? "grab" : "default",
                }}
              />
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
                onClick={() =>
                  dispatch(showToast("컬렉션 저장 기능은 준비 중입니다."))
                }
              >
                컬렉션 저장
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
                집중시키는 작품입니다.
              </p>
              <button
                className="mt-6 rounded-full border border-[color:var(--line)] px-4 py-2 text-xs text-[color:var(--muted)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                onClick={() =>
                  dispatch(showToast("전체 노트 보기 기능은 준비 중입니다."))
                }
              >
                전체 노트 보기
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
                {relatedWorks.map((item) => (
                  <Link
                    key={item.id}
                    href={`/gallery/artworks/${item.id}`}
                    className="block rounded-[22px] border border-[color:var(--line)] bg-white/80 p-4 transition hover:border-[color:var(--accent)] hover:shadow-[var(--shadow)]"
                  >
                    <div
                      className="h-20 w-full rounded-[16px]"
                      style={{
                        background: `linear-gradient(140deg, ${item.colorFrom}, ${item.colorTo})`,
                      }}
                    />
                    <p className="mt-3 text-xs text-[color:var(--muted)]">
                      {item.artist}
                    </p>
                    <h3 className="mt-1 font-[var(--font-display)] text-lg">
                      {item.title}
                    </h3>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
          )}
        </>
      )}
    </PageShell>
  );
}
