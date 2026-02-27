"use client";
/* eslint-disable @next/next/no-img-element */

import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCoverflow, Keyboard, Mousewheel } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import CinematicBottomNav from "../../../components/CinematicBottomNav";
import OverviewStyleHeader from "../../../components/OverviewStyleHeader";
import { overlayFadeMotion, popInMotion, staggeredFadeUpMotion } from "../../../lib/motion";
import { getPublicMuseumDetail } from "../../../lib/museum";
import { useBodyScrollLock } from "../../../lib/useBodyScrollLock";
import "swiper/css/effect-coverflow";

type MuseumDetailClientProps = {
  museumId: number;
};

type ExhibitEffectVariant = "woodClassic" | "refractedReality" | "prismAcrylic" | "acrylicDepth";
type ExhibitEffectMode = ExhibitEffectVariant | "random";
type ExhibitEffectProfile = "wood" | "prism" | "acrylic";

type ExhibitEffectPreset = {
  variant: ExhibitEffectVariant;
  profile: ExhibitEffectProfile;
  hallLabel: string;
  subtitle: string;
  rimTop: string;
  rimMid: string;
  rimBottom: string;
  rimWidth: number;
  rimEdge: string;
  innerLine: string;
  depthLine: string;
  aura: string;
  auraOpacity: number;
  beam: string;
  beamOpacity: number;
  reflectionOpacity: number;
  reflectionHeight: string;
  reflectionBlur?: string;
  floorGlow?: string;
  floorGlowOpacity?: number;
};

const EXHIBIT_EFFECT_PRESETS: ExhibitEffectPreset[] = [
  {
    variant: "woodClassic",
    profile: "wood",
    hallLabel: "Classic Hall",
    subtitle: "Wooden Frame",
    rimTop: "#9b6e42",
    rimMid: "#6e482a",
    rimBottom: "#422814",
    rimWidth: 9,
    rimEdge: "rgba(255,220,176,0.16)",
    innerLine: "rgba(255,224,186,0.26)",
    depthLine: "rgba(24,14,8,0.64)",
    aura: "radial-gradient(ellipse at 50% 48%, rgba(255,190,132,0.2) 0%, rgba(0,0,0,0) 76%)",
    auraOpacity: 0.44,
    beam: "linear-gradient(180deg, rgba(255,226,188,0.3) 0%, rgba(255,255,255,0) 100%)",
    beamOpacity: 0.24,
    reflectionOpacity: 0.62,
    reflectionHeight: "28%",
    reflectionBlur: "blur-[1px]",
    floorGlow: "radial-gradient(ellipse at center, rgba(22,14,8,0.58) 0%, rgba(0,0,0,0) 78%)",
    floorGlowOpacity: 0.54,
  },
  {
    variant: "refractedReality",
    profile: "prism",
    hallLabel: "Prism Hall",
    subtitle: "Refracted Reality",
    rimTop: "rgba(240,244,255,0.9)",
    rimMid: "rgba(184,198,220,0.58)",
    rimBottom: "rgba(90,104,132,0.46)",
    rimWidth: 6,
    rimEdge: "rgba(255,255,255,0.15)",
    innerLine: "rgba(255,255,255,0.1)",
    depthLine: "rgba(8,8,12,0.72)",
    aura: "radial-gradient(ellipse at 50% 46%, rgba(122,210,255,0.34) 0%, rgba(200,110,255,0.22) 44%, rgba(0,0,0,0) 84%)",
    auraOpacity: 0.72,
    beam: "linear-gradient(180deg, rgba(240,248,255,0.42) 0%, rgba(255,255,255,0) 100%)",
    beamOpacity: 0.3,
    reflectionOpacity: 0.9,
    reflectionHeight: "32%",
    reflectionBlur: "blur-[4px]",
    floorGlow: "radial-gradient(ellipse at center, rgba(120,188,255,0.22) 0%, rgba(0,0,0,0) 78%)",
    floorGlowOpacity: 0.22,
  },
  {
    variant: "prismAcrylic",
    profile: "prism",
    hallLabel: "Prism Hall",
    subtitle: "Prism Acrylic",
    rimTop: "rgba(244,248,255,0.88)",
    rimMid: "rgba(206,218,236,0.56)",
    rimBottom: "rgba(116,130,152,0.44)",
    rimWidth: 6,
    rimEdge: "rgba(255,255,255,0.12)",
    innerLine: "rgba(255,255,255,0.08)",
    depthLine: "rgba(12,12,16,0.72)",
    aura: "radial-gradient(ellipse at 50% 48%, rgba(140,204,255,0.3) 0%, rgba(176,112,255,0.2) 38%, rgba(0,0,0,0) 82%)",
    auraOpacity: 0.64,
    beam: "linear-gradient(180deg, rgba(246,252,255,0.42) 0%, rgba(255,255,255,0) 100%)",
    beamOpacity: 0.32,
    reflectionOpacity: 0.8,
    reflectionHeight: "32%",
    reflectionBlur: "blur-[6px]",
    floorGlow: "radial-gradient(ellipse at center, rgba(116,178,255,0.2) 0%, rgba(0,0,0,0) 78%)",
    floorGlowOpacity: 0.2,
  },
  {
    variant: "acrylicDepth",
    profile: "acrylic",
    hallLabel: "Ethereal Hall",
    subtitle: "Acrylic Depth",
    rimTop: "rgba(252,255,255,0.9)",
    rimMid: "rgba(206,220,236,0.58)",
    rimBottom: "rgba(112,130,152,0.42)",
    rimWidth: 8,
    rimEdge: "rgba(235,245,255,0.24)",
    innerLine: "rgba(255,255,255,0.44)",
    depthLine: "rgba(92,110,126,0.54)",
    aura: "radial-gradient(ellipse at 50% 44%, rgba(224,238,255,0.28) 0%, rgba(116,170,255,0.16) 44%, rgba(0,0,0,0) 84%)",
    auraOpacity: 0.54,
    beam: "linear-gradient(180deg, rgba(246,252,255,0.62) 0%, rgba(255,255,255,0) 100%)",
    beamOpacity: 0.52,
    reflectionOpacity: 0.58,
    reflectionHeight: "32%",
    reflectionBlur: "blur-[8px]",
    floorGlow: "radial-gradient(ellipse at center, rgba(176,212,255,0.22) 0%, rgba(0,0,0,0) 80%)",
    floorGlowOpacity: 0.2,
  },
];

const EXHIBIT_EFFECT_OPTIONS: Array<{ value: ExhibitEffectMode; label: string }> = [
  { value: "random", label: "랜덤" },
  { value: "woodClassic", label: "원목 프레임" },
  { value: "acrylicDepth", label: "아크릴 심도" },
  { value: "prismAcrylic", label: "프리즘 아크릴" },
  { value: "refractedReality", label: "굴절 리얼리티" },
];

const DESCRIPTION_SHEET_HEIGHT = 238;
const DESCRIPTION_SHEET_PEEK = 36;
const DESCRIPTION_SHEET_SNAP_RATIO = 0.5;
const FX_PANEL_WIDTH = 196;
const FX_PANEL_PEEK = 26;
const ARTWORK_MIN_ASPECT_RATIO = 0.56;
const ARTWORK_MAX_ASPECT_RATIO = 1.9;
const ARTWORK_DEFAULT_ASPECT_RATIO = 1;

function clampArtworkAspectRatio(ratio: number): number {
  return Math.min(ARTWORK_MAX_ASPECT_RATIO, Math.max(ARTWORK_MIN_ASPECT_RATIO, ratio));
}

function hashString(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export default function MuseumDetailClient({ museumId }: MuseumDetailClientProps) {
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = Boolean(prefersReducedMotion);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [effectMode, setEffectMode] = useState<ExhibitEffectMode>("random");
  const [effectShuffleSeed, setEffectShuffleSeed] = useState(0);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [sheetDragTranslate, setSheetDragTranslate] = useState<number | null>(null);
  const [isFxPanelExpanded, setIsFxPanelExpanded] = useState(false);
  const [fxPanelDragTranslate, setFxPanelDragTranslate] = useState<number | null>(null);
  const [artworkAspectRatioById, setArtworkAspectRatioById] = useState<Record<number, number>>({});

  const swiperRef = useRef<SwiperType | null>(null);
  const sheetDragRef = useRef<{
    pointerId: number;
    startY: number;
    startTranslate: number;
    currentTranslate: number;
    hasMoved: boolean;
  } | null>(null);
  const fxPanelDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startTranslate: number;
    currentTranslate: number;
    hasMoved: boolean;
  } | null>(null);
  const fxPanelSuppressClickRef = useRef(false);

  const { data, isLoading } = useQuery({
    queryKey: ["gallery", "museum", museumId, "cylindrical-hall"],
    queryFn: () => getPublicMuseumDetail(museumId),
  });

  const museum = data?.data ?? null;
  const error = data?.error;
  const artworks = useMemo(() => museum?.artworks ?? [], [museum?.artworks]);

  useEffect(() => {
    const unresolvedArtworks = artworks.filter(
      (artwork) => artworkAspectRatioById[artwork.museumArtworkId] == null,
    );
    if (unresolvedArtworks.length === 0) {
      return;
    }

    let isCancelled = false;
    const cleanups: Array<() => void> = [];

    unresolvedArtworks.forEach((artwork) => {
      const image = new Image();
      const commitAspectRatio = (rawRatio: number) => {
        if (isCancelled || !Number.isFinite(rawRatio) || rawRatio <= 0) {
          return;
        }
        const normalizedRatio = clampArtworkAspectRatio(rawRatio);
        setArtworkAspectRatioById((prev) => {
          if (prev[artwork.museumArtworkId] != null) {
            return prev;
          }
          return {
            ...prev,
            [artwork.museumArtworkId]: normalizedRatio,
          };
        });
      };
      const handleLoad = () => {
        commitAspectRatio(image.naturalWidth / image.naturalHeight);
      };
      const handleError = () => {
        commitAspectRatio(ARTWORK_DEFAULT_ASPECT_RATIO);
      };

      image.addEventListener("load", handleLoad);
      image.addEventListener("error", handleError);
      image.src = artwork.imageUrl;

      cleanups.push(() => {
        image.removeEventListener("load", handleLoad);
        image.removeEventListener("error", handleError);
      });
    });

    return () => {
      isCancelled = true;
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [artworks, artworkAspectRatioById]);

  const effectCandidates = useMemo(() => {
    if (effectMode === "random") {
      return EXHIBIT_EFFECT_PRESETS;
    }
    return EXHIBIT_EFFECT_PRESETS.filter((preset) => preset.variant === effectMode);
  }, [effectMode]);
  const effectPresetByArtworkId = useMemo(() => {
    const map = new Map<number, ExhibitEffectPreset>();
    const candidates = effectCandidates.length > 0 ? effectCandidates : EXHIBIT_EFFECT_PRESETS;
    artworks.forEach((artwork) => {
      const seed = hashString(`${museumId}-${artwork.museumArtworkId}-${artwork.title}`);
      const mixedSeed = (seed + effectShuffleSeed * 2654435761) >>> 0;
      const preset = candidates[mixedSeed % candidates.length] ?? candidates[0];
      map.set(artwork.museumArtworkId, preset);
    });
    return map;
  }, [artworks, effectCandidates, effectShuffleSeed, museumId]);
  const safeActiveIndex =
    artworks.length > 0 ? ((activeIndex % artworks.length) + artworks.length) % artworks.length : 0;
  const currentArtwork = artworks.length > 0 ? artworks[safeActiveIndex] : null;
  const currentEffect = currentArtwork
    ? effectPresetByArtworkId.get(currentArtwork.museumArtworkId) ?? EXHIBIT_EFFECT_PRESETS[0]
    : EXHIBIT_EFFECT_PRESETS[0];
  const collapsedSheetTranslate = DESCRIPTION_SHEET_HEIGHT - DESCRIPTION_SHEET_PEEK;
  const effectiveSheetTranslate =
    sheetDragTranslate ?? (isDescriptionExpanded ? 0 : collapsedSheetTranslate);
  const collapsedFxTranslate = FX_PANEL_WIDTH - FX_PANEL_PEEK;
  const effectiveFxTranslate =
    fxPanelDragTranslate ?? (isFxPanelExpanded ? 0 : collapsedFxTranslate);
  const sheetStyle = {
    height: `${DESCRIPTION_SHEET_HEIGHT}px`,
    transform: `translateY(${effectiveSheetTranslate}px)`,
    backgroundImage: `linear-gradient(180deg, ${currentEffect.rimMid} 0%, ${currentEffect.rimBottom} 56%, rgba(2,2,2,0.94) 100%)`,
    borderColor: currentEffect.rimEdge,
    boxShadow: `inset 0 1px 0 ${currentEffect.innerLine}`,
  } as const;
  const fxPanelStyle = {
    width: `${FX_PANEL_WIDTH}px`,
    transform: `translateX(-${effectiveFxTranslate}px)`,
  } as const;

  useBodyScrollLock(isLightboxOpen);

  const goPrev = useCallback(() => {
    if (!swiperRef.current || artworks.length <= 1) {
      return;
    }
    swiperRef.current.slidePrev();
  }, [artworks.length]);
  const goNext = useCallback(() => {
    if (!swiperRef.current || artworks.length <= 1) {
      return;
    }
    swiperRef.current.slideNext();
  }, [artworks.length]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        goPrev();
      }
      if (event.key === "ArrowRight") {
        goNext();
      }
      if (event.key === "Escape") {
        setIsLightboxOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, goPrev]);

  const today = useMemo(() => new Date(), []);
  const dayLabel = String(today.getDate()).padStart(2, "0");
  const monthLabel = today.toLocaleString("en-US", { month: "long" });
  const shuffleEffects = () => {
    setEffectShuffleSeed((prev) => (prev + 1) >>> 0);
  };

  const clampSheetTranslate = (value: number) => {
    return Math.min(collapsedSheetTranslate, Math.max(0, value));
  };
  const clampFxTranslate = (value: number) => {
    return Math.min(collapsedFxTranslate, Math.max(0, value));
  };

  const isInteractiveTarget = (target: EventTarget | null) => {
    return target instanceof Element && Boolean(target.closest("button,a,input,textarea,select,[role='button']"));
  };

  const handleDescriptionPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isInteractiveTarget(event.target)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    sheetDragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startTranslate: effectiveSheetTranslate,
      currentTranslate: effectiveSheetTranslate,
      hasMoved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleDescriptionPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = sheetDragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const deltaY = event.clientY - dragState.startY;
    if (Math.abs(deltaY) > 2) {
      dragState.hasMoved = true;
    }
    if (!dragState.hasMoved) {
      return;
    }
    const nextTranslate = clampSheetTranslate(dragState.startTranslate + deltaY);
    dragState.currentTranslate = nextTranslate;
    setSheetDragTranslate(nextTranslate);
  };

  const settleDescriptionSheet = (translate: number) => {
    const snapPoint = collapsedSheetTranslate * DESCRIPTION_SHEET_SNAP_RATIO;
    setIsDescriptionExpanded(translate <= snapPoint);
    setSheetDragTranslate(null);
  };

  const handleDescriptionPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = sheetDragRef.current;
    if (dragState && dragState.pointerId === event.pointerId) {
      event.preventDefault();
      event.stopPropagation();
      const finalTranslate = dragState.hasMoved ? dragState.currentTranslate : dragState.startTranslate;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      sheetDragRef.current = null;
      settleDescriptionSheet(finalTranslate);
    }
  };

  const handleDescriptionPointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = sheetDragRef.current;
    if (dragState && dragState.pointerId === event.pointerId) {
      event.preventDefault();
      event.stopPropagation();
      const finalTranslate = dragState.hasMoved ? dragState.currentTranslate : dragState.startTranslate;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      sheetDragRef.current = null;
      settleDescriptionSheet(finalTranslate);
    }
  };

  const handleFxPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    fxPanelSuppressClickRef.current = false;
    fxPanelDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startTranslate: effectiveFxTranslate,
      currentTranslate: effectiveFxTranslate,
      hasMoved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleFxPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = fxPanelDragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }
    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;
    if (Math.abs(deltaX) > 6 && Math.abs(deltaX) > Math.abs(deltaY)) {
      dragState.hasMoved = true;
      fxPanelSuppressClickRef.current = true;
    }
    if (!dragState.hasMoved) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const nextTranslate = clampFxTranslate(dragState.startTranslate - deltaX);
    dragState.currentTranslate = nextTranslate;
    setFxPanelDragTranslate(nextTranslate);
  };

  const settleFxPanel = (translate: number) => {
    const snapPoint = collapsedFxTranslate * 0.5;
    setIsFxPanelExpanded(translate <= snapPoint);
    setFxPanelDragTranslate(null);
  };

  const handleFxPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = fxPanelDragRef.current;
    if (dragState && dragState.pointerId === event.pointerId) {
      if (dragState.hasMoved) {
        event.preventDefault();
        event.stopPropagation();
      }
      const finalTranslate = dragState.hasMoved ? dragState.currentTranslate : dragState.startTranslate;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      fxPanelDragRef.current = null;
      settleFxPanel(finalTranslate);
    }
  };

  const handleFxPointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = fxPanelDragRef.current;
    if (dragState && dragState.pointerId === event.pointerId) {
      if (dragState.hasMoved) {
        event.preventDefault();
        event.stopPropagation();
      }
      const finalTranslate = dragState.hasMoved ? dragState.currentTranslate : dragState.startTranslate;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      fxPanelDragRef.current = null;
      settleFxPanel(finalTranslate);
    }
  };

  return (
    <section className="relative h-screen overflow-hidden bg-[#020202] text-slate-100 touch-pan-y">
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_50%_0%,rgba(156,156,156,0.18)_0%,rgba(0,0,0,0)_68%)]" />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(to_bottom,rgba(0,0,0,0.44)_0%,rgba(0,0,0,0.16)_34%,rgba(0,0,0,0.18)_68%,rgba(0,0,0,0.9)_100%)]" />

      <header className="pointer-events-none absolute top-0 left-0 z-[25] w-full">
        <motion.div
          className="pointer-events-auto mx-auto w-full max-w-6xl px-6 pt-8 md:px-8"
          {...staggeredFadeUpMotion(0, reduceMotion)}
        >
          <OverviewStyleHeader title="The Gallery" />
        </motion.div>
      </header>

      <main className="relative z-10 flex h-full w-full flex-col justify-center">
        <motion.div
          className="relative h-full w-full"
          {...staggeredFadeUpMotion(1, reduceMotion)}
        >
          <div className="pointer-events-none absolute top-1/2 left-0 z-[28] -translate-y-1/2">
            <div
              className={`pointer-events-auto relative touch-none transition-transform ease-out ${
                fxPanelDragTranslate == null ? "duration-300" : "duration-0"
              }`}
              style={fxPanelStyle}
              onPointerDown={handleFxPointerDown}
              onPointerMove={handleFxPointerMove}
              onPointerUp={handleFxPointerUp}
              onPointerCancel={handleFxPointerCancel}
              onClickCapture={(event) => {
                if (fxPanelSuppressClickRef.current) {
                  event.preventDefault();
                  event.stopPropagation();
                  fxPanelSuppressClickRef.current = false;
                }
              }}
            >
              <div className="rounded-r-[12px] border border-white/10 bg-black/58 px-2 py-3 backdrop-blur-md">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/56">Exhibit FX</p>
                <div className="mt-2 grid w-[172px] grid-cols-1 gap-1.5">
                  {EXHIBIT_EFFECT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setEffectMode(option.value)}
                      className={
                        effectMode === option.value
                          ? "w-full rounded-md border border-[#c0a062]/48 bg-[#c0a062]/20 px-1 py-1.5 text-[9px] leading-tight uppercase tracking-[0.1em] text-[#f8e6be]"
                          : "w-full rounded-md border border-white/16 bg-white/8 px-1 py-1.5 text-[9px] leading-tight uppercase tracking-[0.1em] text-white/72 transition hover:bg-white/14"
                    }
                  >
                      {option.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={shuffleEffects}
                    className="mt-0.5 rounded-md border border-white/18 bg-white/8 py-1.5 text-[9px] uppercase tracking-[0.14em] text-white/78 transition hover:bg-white/16"
                    aria-label="연출 랜덤 셔플"
                  >
                    랜덤 셔플
                  </button>
                </div>
              </div>
              <div className="absolute right-2 top-2 rounded-[8px] border border-white/14 bg-black/66 px-1.5 py-1.5 text-[9px] uppercase tracking-[0.2em] text-white/66 backdrop-blur-md">
                FX
              </div>
            </div>
          </div>

          <div
            className="pointer-events-none absolute top-[-20%] left-1/2 z-0 h-[122%] w-[210%] -translate-x-1/2 rounded-[50%] shadow-[inset_0_0_260px_rgba(0,0,0,0.9),inset_0_0_0_1px_rgba(210,210,210,0.08)]"
            style={{
              backgroundImage:
                "radial-gradient(ellipse at center, rgba(122,122,122,0.42) 0%, rgba(82,82,82,0.58) 40%, rgba(36,36,36,0.82) 72%, rgba(8,8,8,0.98) 100%), url(https://www.transparenttextures.com/patterns/dark-concrete.png)",
              backgroundSize: "100% 100%, 220px 220px",
              backgroundPosition: "center, center",
              backgroundBlendMode: "normal, soft-light",
            }}
          />
          <div className="pointer-events-none absolute top-[10%] left-1/2 z-[1] h-[48%] w-[170%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(232,232,232,0.16)_0%,rgba(220,220,220,0)_72%)] opacity-[0.46]" />
          <div className="pointer-events-none absolute bottom-[-12%] left-1/2 z-[1] h-[52%] w-[220%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center_top,rgba(40,40,40,0.92)_0%,rgba(14,14,14,0.92)_62%,rgba(0,0,0,1)_100%)] [transform:rotateX(64deg)] opacity-94" />
          <div className="pointer-events-none absolute top-[18%] left-1/2 z-[4] h-[42%] w-[112%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(232,232,232,0.14)_0%,rgba(255,255,255,0)_74%)] opacity-[0.58] md:top-[12%] md:h-[48%] md:w-[102%]" />
          <div className="pointer-events-none absolute bottom-[16%] left-1/2 z-[5] h-40 w-[86vw] max-w-5xl -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.72)_0%,rgba(0,0,0,0.34)_40%,rgba(0,0,0,0)_80%)] blur-[10px] md:h-44 md:w-[62vw]" />

          <div className="relative z-20 mx-auto flex h-full w-full max-w-6xl items-center justify-end px-6 pb-28 pt-16 [perspective:820px] md:px-8">
            {isLoading ? (
              <div className="mr-[-2px] h-[72vh] w-[75%] rounded-none bg-white/8" />
            ) : artworks.length > 0 ? (
              <div className="relative mr-[-2px] h-[72vh] w-[75%] overflow-visible [transform-style:preserve-3d]">
                <div className="pointer-events-none absolute inset-y-[8%] left-[2%] z-[12] w-[18%] rounded-none bg-[linear-gradient(90deg,rgba(255,255,255,0.08),rgba(255,255,255,0.0))] opacity-40 [transform:perspective(1200px)_rotateY(34deg)] md:hidden" />
                <div className="pointer-events-none absolute inset-y-[8%] right-[2%] z-[12] w-[18%] rounded-none bg-[linear-gradient(270deg,rgba(255,255,255,0.08),rgba(255,255,255,0.0))] opacity-40 [transform:perspective(1200px)_rotateY(-34deg)] md:hidden" />
                <Swiper
                  className="museum-cyl-swiper !overflow-visible"
                  modules={[EffectCoverflow, Mousewheel, Keyboard]}
                  effect="coverflow"
                  centeredSlides
                  slidesPerView={1}
                  breakpoints={{
                    768: { slidesPerView: 1 },
                    1200: { slidesPerView: 1 },
                  }}
                  coverflowEffect={{
                    rotate: 20,
                    stretch: 0,
                    depth: 180,
                    modifier: 1.02,
                    slideShadows: false,
                  }}
                  mousewheel={artworks.length > 1 ? { forceToAxis: true, sensitivity: 0.6 } : false}
                  keyboard={artworks.length > 1 ? { enabled: true, onlyInViewport: true } : false}
                  allowTouchMove={artworks.length > 1}
                  speed={reduceMotion ? 0 : 620}
                  initialSlide={safeActiveIndex}
                  grabCursor={artworks.length > 1}
                  onSwiper={(swiper) => {
                    swiperRef.current = swiper;
                    setActiveIndex(swiper.activeIndex);
                  }}
                  onSlideChange={(swiper) => {
                    setActiveIndex(swiper.activeIndex);
                    setIsDescriptionExpanded(false);
                    setSheetDragTranslate(null);
                  }}
                >
                  {artworks.map((artwork) => {
                    const effect = effectPresetByArtworkId.get(artwork.museumArtworkId) ?? EXHIBIT_EFFECT_PRESETS[0];
                    const isWoodClassic = effect.variant === "woodClassic";
                    const isAcrylicDepth = effect.variant === "acrylicDepth";
                    const isPrismAcrylic = effect.variant === "prismAcrylic";
                    const isRefractedReality = effect.variant === "refractedReality";
                    const artworkAspectRatio =
                      artworkAspectRatioById[artwork.museumArtworkId] ?? ARTWORK_DEFAULT_ASPECT_RATIO;
                    const artworkAspectRatioCss = artworkAspectRatio.toFixed(4);
                    return (
                      <SwiperSlide key={artwork.museumArtworkId} className="!h-auto pb-8 pt-6 md:pt-6 md:pb-10">
                        <button
                          type="button"
                          onClick={() => setIsLightboxOpen(true)}
                          className="artwork-shell relative mx-auto overflow-visible rounded-none [transform-style:preserve-3d]"
                          style={{
                            aspectRatio: artworkAspectRatioCss,
                            width: `min(100%, calc(72vh * ${artworkAspectRatioCss}))`,
                          }}
                        >
                          {isWoodClassic ? (
                            <>
                              <div
                                className="pointer-events-none absolute -inset-x-[8%] -inset-y-[10%] z-0 blur-[30px]"
                                style={{ background: effect.aura, opacity: effect.auraOpacity }}
                              />
                              <div className="pointer-events-none absolute left-[7%] right-[7%] -top-[6%] z-[6] h-[18%] [background:linear-gradient(180deg,rgba(255,226,188,0.34)_0%,rgba(255,255,255,0)_100%)] opacity-30" />
                              <div className="relative z-10 h-full w-full overflow-hidden rounded-none bg-black shadow-[0_0_0_1px_rgba(255,220,176,0.14),0_18px_48px_-14px_rgba(0,0,0,0.92)]">
                                <img alt={artwork.title} src={artwork.imageUrl} className="h-full w-full object-contain" />
                                <div
                                  className="pointer-events-none absolute inset-0 border-transparent [border-style:solid]"
                                  style={{
                                    borderWidth: `${effect.rimWidth}px`,
                                    borderImageSource:
                                      "linear-gradient(145deg, #9b6e42 0%, #6e482a 44%, #422814 100%)",
                                    borderImageSlice: 1,
                                    boxShadow:
                                      "inset 0 0 0 1px rgba(255,224,186,0.26), inset 0 0 0 2px rgba(24,14,8,0.64)",
                                  }}
                                />
                                <div
                                  className="pointer-events-none absolute inset-0 border-transparent [border-style:solid] mix-blend-soft-light"
                                  style={{
                                    borderWidth: `${effect.rimWidth}px`,
                                    opacity: 0.6,
                                    borderImageSource:
                                      "repeating-linear-gradient(102deg, rgba(255,222,184,0.26) 0px, rgba(255,222,184,0.26) 1px, rgba(58,34,18,0.18) 1px, rgba(58,34,18,0.18) 8px)",
                                    borderImageSlice: 1,
                                  }}
                                />
                                <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),inset_0_0_22px_rgba(0,0,0,0.24)]" />
                              </div>
                            </>
                          ) : null}
                          {isAcrylicDepth ? (
                            <>
                              <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[140%] w-[140%] -translate-x-1/2 -translate-y-1/2">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(200,220,255,0.15)_0%,rgba(100,150,255,0.05)_40%,transparent_70%)] blur-[40px] opacity-80 mix-blend-screen" />
                                <div className="absolute -inset-[2px] rounded-[10px] bg-[linear-gradient(to_bottom,rgba(255,255,255,0.6),rgba(255,255,255,0.1),rgba(255,255,255,0))] blur-[8px] opacity-50" />
                              </div>
                              <div className="relative z-10 h-full w-full overflow-hidden rounded-[8px] bg-black shadow-[0_40px_100px_-20px_rgba(0,0,0,1),0_0_0_1px_rgba(255,255,255,0.08),inset_0_0_40px_rgba(0,0,0,0.5)]">
                                <div
                                  className="pointer-events-none absolute inset-0 z-[50] rounded-[8px]"
                                  style={{
                                    boxShadow:
                                      "inset 0 1px 0 0 rgba(255,255,255,0.4), inset 1px 0 0 0 rgba(255,255,255,0.2), inset -1px 0 0 0 rgba(255,255,255,0.2), inset 0 -1px 0 0 rgba(255,255,255,0.1), inset 10px 0 25px -5px rgba(0,0,0,0.8), inset -10px 0 25px -5px rgba(0,0,0,0.8)",
                                    background:
                                      "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.01) 25%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.02) 100%)",
                                  }}
                                />
                                <div className="pointer-events-none absolute inset-[8px] z-[52] rounded-[4px] border border-white/5 shadow-[inset_0_0_30px_rgba(255,255,255,0.02)]" />
                                <div className="pointer-events-none absolute left-0 right-0 top-0 z-[51] h-[70%] rounded-t-[8px] bg-[linear-gradient(160deg,rgba(255,255,255,0.15)_0%,rgba(255,255,255,0.02)_40%,transparent_100%)] opacity-90 mix-blend-overlay" />
                                <div className="relative h-full w-full bg-[#080808]">
                                  <img
                                    alt={artwork.title}
                                    src={artwork.imageUrl}
                                    className="h-full w-full object-contain"
                                  />
                                </div>
                              </div>
                            </>
                          ) : null}
                          {isPrismAcrylic ? (
                            <>
                              <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[140%] w-[140%] -translate-x-1/2 -translate-y-1/2">
                                <div className="absolute left-[-50%] top-[20%] h-[60px] w-[200%] -rotate-[15deg] blur-[20px] mix-blend-color-dodge [background:linear-gradient(90deg,transparent,rgba(255,0,0,0.2),rgba(255,165,0,0.2),rgba(255,255,0,0.2),rgba(0,128,0,0.2),rgba(0,0,255,0.2),rgba(75,0,130,0.2),rgba(238,130,238,0.2),transparent)] opacity-60" />
                                <div className="absolute bottom-[30%] right-[-50%] h-[60px] w-[200%] rotate-[15deg] blur-[20px] mix-blend-color-dodge [background:linear-gradient(90deg,transparent,rgba(255,0,0,0.2),rgba(255,165,0,0.2),rgba(255,255,0,0.2),rgba(0,128,0,0.2),rgba(0,0,255,0.2),rgba(75,0,130,0.2),rgba(238,130,238,0.2),transparent)] opacity-60" />
                              </div>
                              <div className="pointer-events-none absolute -inset-[2px] -z-[5] rounded-[14px] blur-[20px] opacity-50 [background:conic-gradient(from_0deg,#ff0000,#ffff00,#00ff00,#00ffff,#0000ff,#ff00ff,#ff0000)]" />
                              <div className="relative z-10 h-full w-full overflow-hidden rounded-[12px] bg-black shadow-[0_25px_50px_-12px_rgba(0,0,0,1),0_0_0_1px_rgba(255,255,255,0.1)]">
                                <div
                                  className="pointer-events-none absolute inset-0 z-[50] rounded-[12px]"
                                  style={{
                                    boxShadow:
                                      "inset 0 0 0 2px rgba(255,255,255,0.05), inset 0 1px 0 0 rgba(255,255,255,0.5), inset 0 -1px 0 0 rgba(255,255,255,0.15), inset 10px 0 20px -10px rgba(0,0,0,0.5), inset -10px 0 20px -10px rgba(0,0,0,0.5)",
                                    background:
                                      "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0) 60%, rgba(255,255,255,0.05) 100%)",
                                  }}
                                />
                                <div className="pointer-events-none absolute inset-[4px] z-[52] rounded-[8px] border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]" />
                                <div className="pointer-events-none absolute left-0 right-0 top-0 z-[51] h-[40%] rounded-t-[12px] bg-[linear-gradient(180deg,rgba(255,255,255,0.15)_0%,transparent_100%)] opacity-60 mix-blend-screen" />
                                <div className="relative h-full w-full bg-[#080808]">
                                  <img
                                    alt={artwork.title}
                                    src={artwork.imageUrl}
                                    className="h-full w-full object-contain"
                                  />
                                  <div className="pointer-events-none absolute inset-0 z-10 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]" />
                                </div>
                              </div>
                            </>
                          ) : null}
                          {isRefractedReality ? (
                            <>
                              <div className="pointer-events-none absolute -inset-[20px] -z-10 rounded-[20px] bg-[conic-gradient(from_180deg_at_50%_50%,#ff0000,#ff8000,#ffff00,#00ff00,#0000ff,#4b0082,#ee82ee,#ff0000)] blur-[35px] opacity-40 mix-blend-screen" />
                              <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 blur-[40px] opacity-80 mix-blend-screen [background:conic-gradient(from_0deg_at_50%_50%,transparent_0deg,rgba(255,0,0,0.15)_20deg,rgba(0,0,255,0.15)_40deg,transparent_60deg,transparent_300deg,rgba(0,255,0,0.1)_320deg,rgba(255,0,255,0.1)_340deg,transparent_360deg)]" />
                              <div className="relative z-10 h-full w-full overflow-hidden rounded-[6px] border border-white/10 bg-[#1a1a1a] backdrop-blur-md shadow-[0_0_0_1px_rgba(255,255,255,0.15),0_30px_60px_-15px_rgba(0,0,0,0.9),0_0_100px_rgba(255,255,255,0.05),inset_0_0_0_4px_rgba(255,255,255,0.05),inset_0_2px_0_0_rgba(255,255,255,0.4),inset_0_-1px_0_0_rgba(255,255,255,0.1)]">
                                <div
                                  className="pointer-events-none absolute inset-0 z-[50] rounded-[6px]"
                                  style={{
                                    background:
                                      "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.01) 30%, transparent 60%, rgba(255,255,255,0.05) 100%)",
                                    boxShadow: "inset 0 0 40px rgba(255,255,255,0.05)",
                                  }}
                                />
                                <div className="pointer-events-none absolute bottom-0 left-0 z-[30] h-1/2 w-full bg-gradient-to-t from-fuchsia-500/10 to-transparent mix-blend-color-dodge" />
                                <div className="pointer-events-none absolute inset-0 z-[30] bg-gradient-to-tr from-transparent via-transparent to-sky-500/10 mix-blend-overlay" />
                                <div className="pointer-events-none absolute inset-0 z-[55] rounded-[6px] bg-[linear-gradient(115deg,rgba(255,255,255,0.4)_0%,transparent_15%,transparent_85%,rgba(255,255,255,0.1)_100%)] shadow-[inset_0_0_20px_rgba(255,255,255,0.1)] mix-blend-overlay" />
                                <div className="pointer-events-none absolute -inset-[1px] z-[60] rounded-[7px] border border-white/25 opacity-60" />
                                <div className="pointer-events-none absolute -left-1/2 top-[-50%] z-[56] h-[200%] w-[200%] rotate-[30deg] bg-[linear-gradient(to_right,transparent_45%,rgba(255,255,255,0.1)_50%,transparent_55%)] opacity-30 mix-blend-screen" />
                                <div className="relative h-full w-full overflow-hidden rounded-[4px] border border-white/5 bg-[#080808]">
                                  <div className="pointer-events-none absolute inset-0 z-40 bg-gradient-to-br from-white/5 to-transparent opacity-40 mix-blend-soft-light" />
                                  <img
                                    alt={artwork.title}
                                    src={artwork.imageUrl}
                                    className="h-full w-full object-contain brightness-110 contrast-125"
                                  />
                                  <div className="pointer-events-none absolute inset-0 z-10 shadow-[inset_0_0_80px_rgba(0,0,0,0.5)]" />
                                </div>
                              </div>
                            </>
                          ) : null}
                          {effect.floorGlow ? (
                            <div
                              className="pointer-events-none absolute inset-x-[8%] -bottom-[7%] z-[2] h-[16%] blur-[10px]"
                              style={{ background: effect.floorGlow, opacity: effect.floorGlowOpacity ?? 0.4 }}
                            />
                          ) : null}
                          <div className="pointer-events-none absolute inset-x-0 -bottom-10 h-28 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.3)_0%,rgba(255,255,255,0.12)_36%,rgba(255,255,255,0)_80%)] blur-[2px] md:-bottom-12 md:h-32" />
                        </button>
                      </SwiperSlide>
                    );
                  })}
                </Swiper>
              </div>
            ) : (
              <div className="mr-[-2px] h-[72vh] w-[75%] rounded-none bg-white/10 px-6 py-10 text-center text-sm text-slate-200/86">
                전시할 작품이 없습니다.
              </div>
            )}
          </div>
        </motion.div>

        {artworks.length > 0 && currentArtwork ? (
          <div className="pointer-events-none absolute inset-x-0 z-30 [bottom:calc(env(safe-area-inset-bottom)+66px)]">
            <div className="mx-auto flex w-full max-w-6xl justify-end px-6 md:px-8">
              <div className="pointer-events-auto w-[75%]">
                <div
                  className={`relative overflow-hidden rounded-t-[16px] border border-b-0 transition-transform ease-out touch-none ${
                    sheetDragTranslate == null ? "duration-300" : "duration-0"
                  }`}
                  style={sheetStyle}
                  onPointerDown={handleDescriptionPointerDown}
                  onPointerMove={handleDescriptionPointerMove}
                  onPointerUp={handleDescriptionPointerUp}
                  onPointerCancel={handleDescriptionPointerCancel}
                >
                  <div className="cursor-ns-resize px-4 pt-2 pb-1">
                    <div className="mx-auto h-1.5 w-14 rounded-full bg-white/35" />
                  </div>

                  <div className="px-4 pb-4">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/58">
                      {currentEffect.hallLabel}
                    </p>
                    <p className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-white/42">
                      {currentEffect.subtitle}
                    </p>
                    <h2 className="mt-1 font-[var(--font-display)] text-[1.25rem] italic leading-[1.1] text-white md:text-[1.6rem]">
                      {currentArtwork.title}
                    </h2>
                    <p
                      className={`mt-1 text-sm leading-relaxed text-white/78 ${
                        isDescriptionExpanded ? "" : "line-clamp-1"
                      }`}
                    >
                      {currentArtwork.description || "작품 설명이 준비 중입니다."}
                    </p>

                    <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-white/62">
                      {safeActiveIndex + 1} / {artworks.length} · {dayLabel} {monthLabel}
                    </p>

                    {isDescriptionExpanded ? (
                      <p className="mt-3 text-[11px] text-white/58">
                        액자 프리셋은 왼쪽 `FX` 패널을 드래그/터치해 선택
                      </p>
                    ) : (
                      <p className="mt-2 text-[11px] text-white/58">드래그/터치로 올려 설명 펼치기</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {!isLoading && error ? (
          <div className="absolute right-6 z-30 rounded-full bg-rose-300/18 px-3 py-1.5 text-xs text-rose-100 [bottom:calc(env(safe-area-inset-bottom)+138px)] md:bottom-36">
            {error}
          </div>
        ) : null}
      </main>

      <AnimatePresence>
        {isLightboxOpen && currentArtwork && (
          <motion.div
            {...overlayFadeMotion(reduceMotion)}
            className="fixed inset-0 z-[80] bg-[rgba(2,2,4,0.94)] p-4 md:p-8"
          >
            <motion.div
              {...popInMotion(reduceMotion)}
              className="mx-auto flex h-full w-full max-w-7xl flex-col"
            >
              <div className="mb-4 flex items-center justify-between gap-3 text-slate-100">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-300">Immersive View</p>
                <button
                  className="rounded-full bg-white/16 px-4 py-2 text-sm text-slate-100 transition hover:bg-white/24"
                  onClick={() => setIsLightboxOpen(false)}
                >
                  닫기
                </button>
              </div>

              <div className="relative flex-1 overflow-hidden rounded-none bg-black/72">
                <img
                  src={currentArtwork.imageUrl}
                  alt={currentArtwork.title}
                  className="h-full w-full object-contain"
                />
                <button
                  type="button"
                  aria-label="이전 작품"
                  className="absolute inset-y-0 left-0 z-10 w-1/2 cursor-w-resize bg-transparent"
                  onClick={goPrev}
                />
                <button
                  type="button"
                  aria-label="다음 작품"
                  className="absolute inset-y-0 right-0 z-10 w-1/2 cursor-e-resize bg-transparent"
                  onClick={goNext}
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-slate-200">
                <div>
                  <p className="text-sm font-semibold">{currentArtwork.title}</p>
                  <p className="text-xs opacity-90">{museum?.ownerName}</p>
                </div>
                <span className="rounded-full bg-white/14 px-3 py-1 text-xs">
                  {artworks.length === 0 ? "0/0" : `${safeActiveIndex + 1}/${artworks.length}`}
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <CinematicBottomNav activeTab="gallery" layout="fixed" />
    </section>
  );
}
