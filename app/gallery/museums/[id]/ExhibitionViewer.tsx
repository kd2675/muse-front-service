"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { useBodyScrollLock } from "../../../hooks/useBodyScrollLock";
import { useDialogAccessibility } from "../../../hooks/useDialogAccessibility";
import type { PublicMuseumDetailArtwork } from "../../../types/museum";

type Props = {
  artworks: PublicMuseumDetailArtwork[];
  activeIndex: number;
  onSelect: (index: number) => void;
  immersive: boolean;
  onImmersiveChange: (open: boolean) => void;
  layout: string;
  lighting: string;
};

export default function ExhibitionViewer({
  artworks,
  activeIndex,
  onSelect,
  immersive,
  onImmersiveChange,
  layout,
  lighting,
}: Props) {
  const artwork = artworks[activeIndex];
  const [zoom, setZoom] = useState(1);
  const viewportRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const view = viewportRef.current;
    if (view) {
      view.scrollLeft = (view.scrollWidth - view.clientWidth) / 2;
      view.scrollTop = (view.scrollHeight - view.clientHeight) / 2;
    }
  }, [zoom, immersive, activeIndex]);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const dialogRef = useDialogAccessibility(immersive, () =>
    onImmersiveChange(false),
  );
  useBodyScrollLock(immersive);
  const select = (index: number) => {
    if (index >= 0 && index < artworks.length) {
      setZoom(1);
      onSelect(index);
    }
  };
  const keyboard = (event: KeyboardEvent) => {
    if (
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      (event.target as Element).matches("input,textarea,select")
    )
      return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      select(activeIndex - 1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      select(activeIndex + 1);
    }
    if (event.key === "Home") {
      event.preventDefault();
      select(0);
    }
    if (event.key === "End") {
      event.preventDefault();
      select(artworks.length - 1);
    }
  };
  if (!artwork) return null;
  const controls = (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] py-4">
      <button
        type="button"
        onClick={() => select(activeIndex - 1)}
        disabled={activeIndex === 0}
        className="museum-button-secondary px-4"
        aria-label="이전 작품"
      >
        ← <span className="ml-2">이전</span>
      </button>
      <p className="text-sm text-[var(--muted)]" aria-live="polite">
        {activeIndex + 1} / {artworks.length}
      </p>
      <button
        type="button"
        onClick={() => select(activeIndex + 1)}
        disabled={activeIndex === artworks.length - 1}
        className="museum-button-secondary px-4"
        aria-label="다음 작품"
      >
        <span className="mr-2">다음</span> →
      </button>
    </div>
  );

  return (
    <>
      <section
        aria-label="전시 작품 감상"
        aria-roledescription="carousel"
        tabIndex={0}
        onKeyDown={keyboard}
        className="min-w-0"
      >
        <button
          type="button"
          onClick={() => onImmersiveChange(true)}
          className="exhibition-stage relative block h-[min(62dvh,720px)] min-h-72 w-full overflow-hidden p-5 md:p-10"
          data-lighting={lighting}
          aria-label={`${artwork.title} 크게 감상하기`}
        >
          <div
            className="artwork-mount absolute inset-5 md:inset-10"
            data-lighting={artwork.lightingPreset}
          >
            <ArtworkImage
              key={artwork.museumArtworkId}
              artwork={artwork}
              cover={layout === "IMMERSIVE"}
            />
          </div>
          <span className="absolute bottom-4 right-4 border border-white/20 bg-black/70 px-3 py-2 text-xs text-white">
            크게 감상하기 ↗
          </span>
        </button>
        {controls}
        {layout === "LINEAR" ? (
          <p className="mb-4 text-xs text-[var(--muted)]">
            작가가 구성한 순서대로 다음 작품을 감상해 보세요.
          </p>
        ) : (
          <div
            className="flex gap-3 overflow-x-auto pb-3"
            aria-label="작품 선택"
          >
            {artworks.map((item, index) => (
              <button
                key={item.museumArtworkId}
                type="button"
                onClick={() => select(index)}
                aria-label={`${index + 1}번 작품 ${item.title}`}
                aria-pressed={index === activeIndex}
                className={`relative h-20 w-24 shrink-0 overflow-hidden border-2 ${index === activeIndex ? "border-[var(--accent)]" : "border-transparent opacity-65 hover:opacity-100"}`}
              >
                <Image
                  src={item.imageUrl}
                  alt=""
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-[var(--muted)]">
          키보드의 ← → 키로 작품을 이동할 수 있습니다.
        </p>
      </section>
      {immersive ? (
        <div
          className="fixed inset-0 z-[120] bg-[#080909] px-4 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] md:px-10"
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="exhibition-viewer-title"
          tabIndex={-1}
          onKeyDown={keyboard}
        >
          <div className="mx-auto flex h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom))] max-w-[1800px] flex-col">
            <div className="flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] py-2">
              <h2
                id="exhibition-viewer-title"
                className="min-w-0 max-w-[60%] truncate font-[var(--font-display)] text-lg"
              >
                {artwork.title}
              </h2>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="작품 축소"
                  disabled={zoom <= 1}
                  onClick={() => setZoom(Math.max(1, zoom - 0.5))}
                  className="h-11 w-11 disabled:opacity-30"
                >
                  −
                </button>
                <button
                  type="button"
                  aria-label="확대 초기화"
                  onClick={() => setZoom(1)}
                  className="h-11 min-w-12 text-xs"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  type="button"
                  aria-label="작품 확대"
                  disabled={zoom >= 3}
                  onClick={() => setZoom(Math.min(3, zoom + 0.5))}
                  className="h-11 w-11 disabled:opacity-30"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => onImmersiveChange(false)}
                  className="ml-2 min-h-11 px-3 text-sm"
                >
                  닫기
                </button>
              </div>
            </div>
            <div
              ref={viewportRef}
              style={{ touchAction: zoom > 1 ? "auto" : "pan-y" }}
              className="relative min-h-0 flex-1 overflow-auto overscroll-contain"
              onPointerDown={(event) => {
                pointerStart.current = { x: event.clientX, y: event.clientY };
              }}
              onPointerUp={(event) => {
                const start = pointerStart.current;
                pointerStart.current = null;
                if (!start || zoom !== 1) return;
                const dx = event.clientX - start.x;
                const dy = event.clientY - start.y;
                if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.5)
                  select(activeIndex + (dx < 0 ? 1 : -1));
              }}
              onPointerCancel={() => {
                pointerStart.current = null;
              }}
            >
              <div
                className="relative min-h-full min-w-full"
                style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}
              >
                <ArtworkImage
                  key={artwork.museumArtworkId}
                  artwork={artwork}
                  cover={false}
                />
              </div>
            </div>
            <div className="shrink-0">{controls}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ArtworkImage({
  artwork,
  cover,
}: {
  artwork: PublicMuseumDetailArtwork;
  cover: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (failed)
    return (
      <span
        role="status"
        className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-[var(--muted)]"
      >
        작품 이미지를 불러오지 못했습니다. 다른 작품을 감상하거나 잠시 후 다시
        방문해 주세요.
      </span>
    );
  return (
    <Image
      src={artwork.imageUrl}
      alt={artwork.title}
      fill
      sizes="(min-width: 1024px) 80vw, 100vw"
      className={cover ? "object-cover" : "object-contain"}
      style={{
        objectPosition: cover
          ? `${artwork.focalX}% ${artwork.focalY}%`
          : "center",
      }}
      onError={() => setFailed(true)}
      draggable={false}
    />
  );
}
