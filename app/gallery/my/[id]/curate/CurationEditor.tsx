"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import ConfirmDialog from "../../../../components/ConfirmDialog";
import OverviewStyleHeader from "../../../../components/OverviewStyleHeader";
import QueryState from "../../../../components/QueryState";
import WorkspaceNavigation from "../../../../components/WorkspaceNavigation";
import useUnsavedChanges from "../../../../hooks/useUnsavedChanges";
import {
  compositionError,
  curationSettings,
  museumComposition,
  type CurationSettings,
} from "../../../../lib/curation";
import {
  saveMuseumComposition,
  type MuseumComposition,
} from "../../../../lib/museum";
import { getGalleryModerationLabel } from "../../../../lib/statusTheme";
import type { MyMuseum, MyMuseumArtwork } from "../../../../types/museum";
import ArtworkDirectionFields from "./ArtworkDirectionFields";

export default function CurationEditor({
  museum,
  artworks,
}: {
  museum: MyMuseum;
  artworks: MyMuseumArtwork[];
}) {
  const queryClient = useQueryClient();
  const [ordered, setOrdered] = useState(() =>
    [...artworks].sort((a, b) => a.sortOrder - b.sortOrder),
  );
  const [settings, setSettings] = useState(() => curationSettings(museum));
  const [selectedId, setSelectedId] = useState(ordered[0]?.museumArtworkId);
  const [saved, setSaved] = useState(() =>
    JSON.stringify({ ordered, settings }),
  );
  const [savedMuseum, setSavedMuseum] = useState(museum);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const dirty = JSON.stringify({ ordered, settings }) !== saved;
  const navigation = useUnsavedChanges(dirty);
  const selected = ordered.find(
    (artwork) => artwork.museumArtworkId === selectedId,
  );
  const visible = ordered.filter(
    (artwork) => artwork.moderationStatus === "VISIBLE",
  );
  const mutation = useMutation({
    mutationFn: (payload: MuseumComposition) =>
      saveMuseumComposition(museum.museumId, payload),
    onSuccess: (result) => {
      if (!result.data || result.error) {
        setError(result.error || "전시를 저장하지 못했습니다.");
        return;
      }
      const nextArtworks = [...result.data.artworks].sort(
        (a, b) => a.sortOrder - b.sortOrder,
      );
      const nextSettings = curationSettings(result.data.museum);
      setOrdered(nextArtworks);
      setSettings(nextSettings);
      setSavedMuseum(result.data.museum);
      setSaved(
        JSON.stringify({ ordered: nextArtworks, settings: nextSettings }),
      );
      setMessage("작품, 순서와 공개 설정을 모두 저장했습니다.");
      queryClient.setQueryData(["my", "museums", museum.museumId, "artworks"], {
        data: nextArtworks,
      });
      for (const key of [
        "my",
        "gallery",
        "home",
        "overview",
        "artist",
        "discovery",
        "admin",
      ])
        void queryClient.invalidateQueries({ queryKey: [key] });
    },
    onError: () =>
      setError(
        "저장에 실패했습니다. 입력한 내용은 유지됩니다. 연결을 확인한 뒤 다시 시도해 주세요.",
      ),
  });
  const updateArtwork = (patch: Partial<MyMuseumArtwork>) =>
    setOrdered((items) =>
      items.map((item) =>
        item.museumArtworkId === selectedId ? { ...item, ...patch } : item,
      ),
    );
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;
    setOrdered((items) => {
      const next = [...items];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((item, sortOrder) => ({ ...item, sortOrder }));
    });
  };
  const save = () => {
    setError("");
    setMessage("");
    const validation = compositionError(settings, ordered);
    if (validation) {
      setError(validation);
      return;
    }
    mutation.mutate(museumComposition(settings, ordered));
  };

  return (
    <div className="museum-grain min-h-dvh bg-[var(--canvas)] text-[var(--canvas-ink)]">
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-[1500px] px-5 pb-12 md:px-8"
      >
        <OverviewStyleHeader
          title={museum.name}
          subtitle="큐레이션 스튜디오"
          rightSlot={
            <Link
              href={`/gallery/my?museumId=${museum.museumId}`}
              className="text-sm"
            >
              전시 관리로 돌아가기
            </Link>
          }
        />
        <WorkspaceNavigation />
        <div className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--canvas)] py-4">
          <div>
            <p className="text-sm">
              {dirty
                ? "저장하지 않은 변경 사항이 있습니다"
                : "저장된 전시 구성"}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              전체 {ordered.length}점 · 공개 가능 {visible.length}점 · 순서와
              연출은 저장 후 반영됩니다.
            </p>
          </div>
          <button
            type="button"
            onClick={save}
            disabled={!dirty || mutation.isPending}
            className="museum-button-primary px-5 py-3 text-sm"
          >
            {mutation.isPending ? "전시 저장 중" : "변경 사항 저장"}
          </button>
        </div>
        {error ? (
          <p
            role="alert"
            className="my-4 border-l-2 border-[var(--danger)] p-3 text-sm leading-6 text-[var(--danger)]"
          >
            {error}
          </p>
        ) : null}
        {message ? (
          <p role="status" className="my-4 text-sm text-[var(--success)]">
            {message}
          </p>
        ) : null}
        <fieldset
          disabled={mutation.isPending}
          className="mt-6 grid min-w-0 gap-5 xl:grid-cols-[270px_minmax(0,1fr)_320px]"
        >
          <legend className="sr-only">전시와 작품 구성</legend>
          <aside className="museum-panel min-w-0 p-4">
            <h2 className="font-[var(--font-display)] text-2xl">작품 순서</h2>
            <div className="mt-4 max-h-[65vh] space-y-2 overflow-y-auto">
              {ordered.map((artwork, index) => (
                <div
                  key={artwork.museumArtworkId}
                  className={`flex items-center gap-2 border p-2 ${selectedId === artwork.museumArtworkId ? "border-[var(--accent)]" : "border-[var(--line)]"}`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedId(artwork.museumArtworkId)}
                    aria-pressed={selectedId === artwork.museumArtworkId}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span className="relative h-14 w-14 shrink-0">
                      <Image
                        src={artwork.imageUrl}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    </span>
                    <span className="min-w-0">
                      <strong className="block truncate text-sm">
                        {artwork.title}
                      </strong>
                      <small className="text-[var(--muted)]">
                        {getGalleryModerationLabel(artwork.moderationStatus)}
                      </small>
                    </span>
                  </button>
                  <span className="flex flex-col">
                    <button
                      type="button"
                      aria-label={`${artwork.title} 앞으로 이동`}
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                      className="h-11 w-11 disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label={`${artwork.title} 뒤로 이동`}
                      disabled={index === ordered.length - 1}
                      onClick={() => move(index, 1)}
                      className="h-11 w-11 disabled:opacity-30"
                    >
                      ↓
                    </button>
                  </span>
                </div>
              ))}
            </div>
            <Link
              href={`/gallery/my?museumId=${museum.museumId}`}
              className="museum-button-secondary mt-4 w-full py-3 text-sm"
            >
              작품 추가하기
            </Link>
          </aside>
          <section className="min-w-0 border border-[var(--line)] bg-[var(--canvas-raised)] p-5 md:p-8">
            <p className="museum-kicker">작품 미리보기</p>
            {selected ? (
              <div className="mt-5">
                <div
                  className="exhibition-stage relative aspect-[4/3]"
                  data-lighting={
                    selected.lightingPreset || settings.lightingPreset
                  }
                >
                  <Image
                    src={selected.imageUrl}
                    alt={selected.title}
                    fill
                    sizes="(min-width: 1280px) 50vw, 100vw"
                    className={
                      settings.layoutPreset === "IMMERSIVE"
                        ? "object-cover"
                        : "object-contain"
                    }
                    style={{
                      objectPosition: `${selected.focalX}% ${selected.focalY}%`,
                    }}
                  />
                </div>
                <p className="mt-5 text-xs text-[var(--accent)]">
                  {selected.roomLabel || "전시실"}
                </p>
                <h2 className="mt-2 font-[var(--font-display)] text-3xl">
                  {selected.title}
                </h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--muted)]">
                  {selected.description}
                </p>
                <ArtworkDirectionFields
                  artwork={selected}
                  update={updateArtwork}
                />
              </div>
            ) : (
              <QueryState
                title="작품을 먼저 등록하세요"
                description="작품을 등록하고 심사를 받은 뒤 공개할 수 있습니다."
                action={{ href: "/gallery/my", label: "작품 등록하러 가기" }}
              />
            )}
          </section>
          <aside className="space-y-5">
            <section className="museum-panel space-y-4 p-5">
              <h2 className="font-[var(--font-display)] text-2xl">공개 설정</h2>
              <p className="text-xs leading-6 text-[var(--muted)]">
                작품 등록 → 운영 심사 → 전시 공개. 심사를 통과한 작품만
                관람객에게 보입니다.
              </p>
              <label className="block text-sm">
                공개 상태
                <select
                  value={settings.publishStatus}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      publishStatus: event.target
                        .value as CurationSettings["publishStatus"],
                    })
                  }
                  className="museum-field mt-2 px-3"
                >
                  <option value="DRAFT">초안으로 보관</option>
                  <option value="SCHEDULED">예약 공개</option>
                  <option value="PUBLISHED">바로 공개</option>
                </select>
              </label>
              {settings.publishStatus === "SCHEDULED" ? (
                <label className="block text-sm">
                  공개 시각 · 한국 시간
                  <input
                    type="datetime-local"
                    required
                    value={settings.openingAt || ""}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        openingAt: event.target.value,
                      })
                    }
                    className="museum-field mt-2 px-3"
                  />
                </label>
              ) : null}
              <label className="block text-sm">
                대표 작품
                <select
                  value={settings.coverArtworkId || ""}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      coverArtworkId: event.target.value
                        ? Number(event.target.value)
                        : null,
                    })
                  }
                  className="museum-field mt-2 px-3"
                >
                  <option value="">첫 번째 공개 작품</option>
                  {ordered.map((item) => (
                    <option
                      key={item.museumArtworkId}
                      value={item.museumArtworkId}
                    >
                      {item.title} ·{" "}
                      {getGalleryModerationLabel(item.moderationStatus)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                큐레이터 노트
                <textarea
                  maxLength={2000}
                  value={settings.curatorNote || ""}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      curatorNote: event.target.value,
                    })
                  }
                  className="museum-field mt-2 min-h-32 p-3"
                />
              </label>
              {savedMuseum.isPublic ? (
                <Link
                  href={`/gallery/museums/${museum.museumId}`}
                  className="museum-button-secondary w-full py-3 text-sm"
                >
                  저장된 공개 전시 보기 ↗
                </Link>
              ) : null}
            </section>
            <section className="museum-panel space-y-4 p-5">
              <h2 className="font-[var(--font-display)] text-2xl">전시 연출</h2>
              <label className="block text-sm">
                전시 방식
                <select
                  value={settings.layoutPreset}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      layoutPreset: event.target
                        .value as CurationSettings["layoutPreset"],
                    })
                  }
                  className="museum-field mt-2 px-3"
                >
                  <option value="SALON">살롱 · 작품 전체 감상</option>
                  <option value="LINEAR">선형 · 순서대로 감상</option>
                  <option value="IMMERSIVE">몰입형 · 화면을 채운 감상</option>
                </select>
              </label>
              <label className="block text-sm">
                전시 조명
                <select
                  value={settings.lightingPreset}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      lightingPreset: event.target
                        .value as CurationSettings["lightingPreset"],
                    })
                  }
                  className="museum-field mt-2 px-3"
                >
                  <option value="WARM">따뜻한 조명</option>
                  <option value="NEUTRAL">중립 조명</option>
                  <option value="DRAMATIC">집중 조명</option>
                </select>
              </label>
            </section>
          </aside>
        </fieldset>
      </main>
      <ConfirmDialog
        open={navigation.open}
        title="저장하지 않고 이동할까요?"
        description="아직 저장하지 않은 작품 연출과 공개 설정이 있습니다. 계속 편집하려면 취소를 누르세요."
        confirmLabel="저장하지 않고 이동"
        onCancel={navigation.stay}
        onConfirm={navigation.leave}
      />
    </div>
  );
}
