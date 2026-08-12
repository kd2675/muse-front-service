"use client";

import Image from "next/image";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import OverviewStyleHeader from "../../../../components/OverviewStyleHeader";
import {
  getMyMuseumArtworks,
  getMyMuseums,
  reorderMuseumArtworks,
  updateMuseumArtwork,
  updateMuseumCuration,
} from "../../../../lib/museum";
import type { MyMuseumArtwork } from "../../../../types/museum";

type PublishStatus = "DRAFT" | "SCHEDULED" | "PUBLISHED";
type LayoutPreset = "SALON" | "LINEAR" | "IMMERSIVE";
type LightingPreset = "WARM" | "NEUTRAL" | "DRAMATIC";

export default function CurateMuseumClient({ museumId }: { museumId: number }) {
  const queryClient = useQueryClient();
  const museumsQuery = useQuery({ queryKey: ["my", "museums"], queryFn: getMyMuseums });
  const artworksQuery = useQuery({
    queryKey: ["my", "museums", museumId, "artworks"],
    queryFn: () => getMyMuseumArtworks(museumId),
  });
  const museum = museumsQuery.data?.data.find((item) => item.museumId === museumId);
  const [ordered, setOrdered] = useState<MyMuseumArtwork[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [publishStatus, setPublishStatus] = useState<PublishStatus>("DRAFT");
  const [openingAt, setOpeningAt] = useState("");
  const [curatorNote, setCuratorNote] = useState("");
  const [layoutPreset, setLayoutPreset] = useState<LayoutPreset>("SALON");
  const [lightingPreset, setLightingPreset] = useState<LightingPreset>("WARM");
  const [coverArtworkId, setCoverArtworkId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const initializedArtworksRef = useRef(false);
  const initializedMuseumRef = useRef(false);

  useEffect(() => {
    const items = artworksQuery.data?.data;
    if (!items || initializedArtworksRef.current) return;
    initializedArtworksRef.current = true;
    const timer = window.setTimeout(() => {
      setOrdered([...items].sort((a, b) => a.sortOrder - b.sortOrder));
      setSelectedId((value) => value ?? items[0]?.museumArtworkId ?? null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [artworksQuery.data?.data]);
  useEffect(() => {
    if (!museum || initializedMuseumRef.current) return;
    initializedMuseumRef.current = true;
    const timer = window.setTimeout(() => {
      setPublishStatus((museum.publishStatus as PublishStatus) || "DRAFT");
      setOpeningAt(museum.openingAt?.slice(0, 16) ?? "");
      setCuratorNote(museum.curatorNote ?? "");
      setLayoutPreset((museum.layoutPreset as LayoutPreset) || "SALON");
      setLightingPreset((museum.lightingPreset as LightingPreset) || "WARM");
      setCoverArtworkId(museum.coverArtworkId ?? null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [museum]);

  const selected = useMemo(() => ordered.find((item) => item.museumArtworkId === selectedId) ?? null, [ordered, selectedId]);
  const curationMutation = useMutation({
    mutationFn: () => updateMuseumCuration(museumId, {
      publishStatus, coverArtworkId, openingAt: openingAt || null, curatorNote,
      layoutPreset, lightingPreset,
    }),
    onSuccess: (result) => {
      setMessage(result.error ?? "전시 설정을 저장했습니다.");
      queryClient.invalidateQueries({ queryKey: ["my", "museums"] });
    },
  });
  const orderMutation = useMutation({
    mutationFn: (items: MyMuseumArtwork[]) => reorderMuseumArtworks(
      museumId,
      items.map((item, index) => ({ museumArtworkId: item.museumArtworkId, sortOrder: index })),
    ),
    onSuccess: (result) => {
      if (!result.error) setOrdered(result.data);
      setMessage(result.error ?? "작품 순서를 저장했습니다.");
    },
  });
  const artworkMutation = useMutation({
    mutationFn: (artwork: MyMuseumArtwork) => updateMuseumArtwork(museumId, artwork.museumArtworkId, {
      title: artwork.title,
      description: artwork.description ?? "",
      sortOrder: artwork.sortOrder,
      roomLabel: artwork.roomLabel ?? "",
      focalX: artwork.focalX,
      focalY: artwork.focalY,
      audioUrl: artwork.audioUrl ?? "",
      audioTranscript: artwork.audioTranscript ?? "",
      lightingPreset: (artwork.lightingPreset as LightingPreset) || "WARM",
    }),
    onSuccess: (result) => setMessage(result.error ?? "작품 연출을 저장했습니다."),
  });

  const updateSelected = (patch: Partial<MyMuseumArtwork>) => {
    if (!selected) return;
    setOrdered((items) => items.map((item) => item.museumArtworkId === selected.museumArtworkId ? { ...item, ...patch } : item));
  };
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;
    const next = [...ordered];
    [next[index], next[target]] = [next[target], next[index]];
    const normalized = next.map((item, itemIndex) => ({ ...item, sortOrder: itemIndex }));
    setOrdered(normalized); orderMutation.mutate(normalized);
  };

  return (
    <div className="museum-grain min-h-screen bg-[var(--canvas)] text-[var(--canvas-ink)]">
      <main className="mx-auto w-full max-w-[1500px] px-5 pb-24 pt-6 md:px-8">
        <OverviewStyleHeader title={museum?.name ?? "큐레이션 스튜디오"} subtitle="Exhibition composer" rightSlot={<Link href="/gallery/my" className="text-xs text-[var(--muted)] hover:text-white">나가기</Link>} />
        <div className="mt-6 grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)_340px]">
          <aside className="museum-panel p-4">
            <div className="flex items-end justify-between"><h2 className="font-[var(--font-display)] text-2xl">작품 순서</h2><span className="museum-kicker">{ordered.length}</span></div>
            <div className="mt-4 max-h-[72vh] space-y-2 overflow-y-auto">
              {ordered.map((artwork, index) => (
                <div key={artwork.museumArtworkId} className={`grid grid-cols-[64px_1fr_auto] gap-3 border p-2 ${selectedId === artwork.museumArtworkId ? "border-[var(--accent)]" : "border-[var(--line)]"}`}>
                  <button type="button" onClick={() => setSelectedId(artwork.museumArtworkId)} className="relative h-16"><Image src={artwork.imageUrl} alt="" fill sizes="64px" className="object-cover" /></button>
                  <button type="button" onClick={() => setSelectedId(artwork.museumArtworkId)} className="min-w-0 text-left"><strong className="block truncate text-sm">{artwork.title}</strong><small className="text-[var(--muted)]">{artwork.roomLabel || `Room ${index + 1}`}</small></button>
                  <span className="grid"><button type="button" aria-label="앞으로 이동" onClick={() => move(index, -1)} className="px-2">↑</button><button type="button" aria-label="뒤로 이동" onClick={() => move(index, 1)} className="px-2">↓</button></span>
                </div>
              ))}
            </div>
          </aside>

          <section className="relative flex min-h-[68vh] items-center justify-center overflow-hidden border border-[var(--line)] bg-[#090a09] p-6 md:p-12">
            <div className={`absolute inset-0 ${lightingPreset === "DRAMATIC" ? "bg-[radial-gradient(circle_at_50%_20%,rgba(255,220,160,.18),transparent_45%)]" : lightingPreset === "NEUTRAL" ? "bg-[radial-gradient(circle_at_50%_20%,rgba(220,235,255,.13),transparent_52%)]" : "bg-[radial-gradient(circle_at_50%_20%,rgba(255,210,145,.15),transparent_52%)]"}`} />
            {selected ? (
              <div className={`relative z-10 w-full ${layoutPreset === "IMMERSIVE" ? "max-w-5xl" : "max-w-3xl"}`}>
                <div className="relative aspect-[4/3] shadow-[0_30px_80px_rgba(0,0,0,.65)]">
                  <Image src={selected.imageUrl} alt={selected.title} fill sizes="(min-width: 1280px) 60vw, 100vw" className="object-cover" style={{ objectPosition: `${selected.focalX}% ${selected.focalY}%` }} />
                </div>
                <p className="mt-5 museum-kicker">{selected.roomLabel || "Main hall"}</p><h2 className="mt-2 font-[var(--font-display)] text-3xl">{selected.title}</h2>
              </div>
            ) : <p className="text-sm text-[var(--muted)]">작품을 등록한 뒤 전시를 구성하세요.</p>}
          </section>

          <aside className="space-y-5">
            <section className="museum-panel p-5">
              <p className="museum-kicker">Publish</p><h2 className="mt-2 font-[var(--font-display)] text-2xl">전시 공개</h2>
              <label className="mt-4 block text-xs text-[var(--muted)]">상태<select value={publishStatus} onChange={(event) => setPublishStatus(event.target.value as PublishStatus)} className="museum-field mt-2 w-full px-3"><option value="DRAFT">초안</option><option value="SCHEDULED">예약 공개</option><option value="PUBLISHED">바로 공개</option></select></label>
              {publishStatus === "SCHEDULED" ? <label className="mt-3 block text-xs text-[var(--muted)]">오픈 시각<input type="datetime-local" value={openingAt} onChange={(event) => setOpeningAt(event.target.value)} className="museum-field mt-2 w-full px-3" /></label> : null}
              <label className="mt-3 block text-xs text-[var(--muted)]">표지 작품<select value={coverArtworkId ?? ""} onChange={(event) => setCoverArtworkId(event.target.value ? Number(event.target.value) : null)} className="museum-field mt-2 w-full px-3"><option value="">자동 선택</option>{ordered.map((item) => <option key={item.museumArtworkId} value={item.museumArtworkId}>{item.title}</option>)}</select></label>
              <label className="mt-3 block text-xs text-[var(--muted)]">큐레이터 노트<textarea value={curatorNote} onChange={(event) => setCuratorNote(event.target.value)} className="museum-field mt-2 min-h-24 w-full p-3" /></label>
              <div className="mt-3 grid grid-cols-2 gap-2"><select value={layoutPreset} onChange={(event) => setLayoutPreset(event.target.value as LayoutPreset)} className="museum-field px-2"><option value="SALON">살롱</option><option value="LINEAR">선형</option><option value="IMMERSIVE">몰입형</option></select><select value={lightingPreset} onChange={(event) => setLightingPreset(event.target.value as LightingPreset)} className="museum-field px-2"><option value="WARM">웜</option><option value="NEUTRAL">뉴트럴</option><option value="DRAMATIC">드라마틱</option></select></div>
              <button type="button" onClick={() => curationMutation.mutate()} disabled={curationMutation.isPending} className="museum-button-primary mt-4 w-full py-3 text-sm">전시 설정 저장</button>
              {museum?.isPublic ? <Link href={`/gallery/museums/${museumId}`} className="mt-2 block border border-[var(--line)] py-3 text-center text-sm">공개 전시 미리보기</Link> : null}
            </section>

            {selected ? <section className="museum-panel p-5">
              <p className="museum-kicker">Artwork direction</p><h2 className="mt-2 font-[var(--font-display)] text-2xl">작품 연출</h2>
              <input value={selected.title} onChange={(event) => updateSelected({ title: event.target.value })} className="museum-field mt-4 w-full px-3" aria-label="작품 제목" />
              <input value={selected.roomLabel ?? ""} onChange={(event) => updateSelected({ roomLabel: event.target.value })} className="museum-field mt-2 w-full px-3" placeholder="공간 라벨" />
              <label className="mt-3 block text-xs text-[var(--muted)]">초점 X {selected.focalX}<input type="range" min="0" max="100" value={selected.focalX} onChange={(event) => updateSelected({ focalX: Number(event.target.value) })} className="w-full" /></label>
              <label className="mt-2 block text-xs text-[var(--muted)]">초점 Y {selected.focalY}<input type="range" min="0" max="100" value={selected.focalY} onChange={(event) => updateSelected({ focalY: Number(event.target.value) })} className="w-full" /></label>
              <input value={selected.audioUrl ?? ""} onChange={(event) => updateSelected({ audioUrl: event.target.value })} className="museum-field mt-3 w-full px-3" placeholder="오디오 해설 URL" />
              <textarea value={selected.audioTranscript ?? ""} onChange={(event) => updateSelected({ audioTranscript: event.target.value })} className="museum-field mt-2 min-h-20 w-full p-3" placeholder="오디오 대체 텍스트" />
              <button type="button" onClick={() => artworkMutation.mutate(selected)} className="museum-button-primary mt-3 w-full py-3 text-sm">작품 연출 저장</button>
            </section> : null}
          </aside>
        </div>
        {message ? <p aria-live="polite" className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 bg-[#161817] px-5 py-3 text-sm shadow-xl">{message}</p> : null}
      </main>
    </div>
  );
}
