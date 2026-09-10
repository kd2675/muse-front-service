"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import CinematicBottomNav from "../../../components/CinematicBottomNav";
import OverviewStyleHeader from "../../../components/OverviewStyleHeader";
import QueryState from "../../../components/QueryState";
import useAuthSession from "../../../hooks/useAuthSession";
import { buildLoginPath } from "../../../lib/authRouting";
import {
  getBookmarkStatus,
  recordMuseumView,
  setBookmark,
} from "../../../lib/discovery";
import { getPublicMuseumDetail } from "../../../lib/museum";
import type { PublicMuseumDetail } from "../../../types/museum";
import ExhibitionViewer from "./ExhibitionViewer";

export default function MuseumDetailClient({ museumId }: { museumId: number }) {
  const query = useQuery({
    queryKey: ["gallery", "museum", museumId, "detail"],
    queryFn: () => getPublicMuseumDetail(museumId),
    refetchInterval: (current) =>
      current.state.data?.data && !current.state.data.data.contentAvailable
        ? 30000
        : false,
  });
  const museum = query.data?.data;
  return (
    <div className="museum-grain min-h-dvh bg-[var(--canvas)] text-[var(--canvas-ink)]">
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-[1500px] px-5 pb-32 md:px-10"
      >
        <OverviewStyleHeader
          title={museum?.name || "영구 전시"}
          subtitle={
            museum ? `${museum.ownerName}의 전시` : "Permanent exhibition"
          }
          rightSlot={
            <Link href="/gallery" className="text-sm">
              모든 전시 보기
            </Link>
          }
        />
        {query.isPending ? (
          <QueryState kind="loading" title="전시를 준비하고 있습니다" />
        ) : !museum || query.data?.error ? (
          <QueryState
            kind="error"
            title="전시를 불러오지 못했습니다"
            description="비공개로 변경되었거나 연결이 원활하지 않을 수 있습니다."
            retry={() => void query.refetch()}
            retrying={query.isFetching}
            action={{ href: "/gallery", label: "다른 전시 감상하기" }}
          />
        ) : !museum.contentAvailable ? (
          <QueryState
            title="곧 문을 엽니다"
            description={
              museum.curatorNote ||
              "전시 공개 시각에 작품을 만나볼 수 있습니다."
            }
          >
            <p className="mt-6 text-sm text-[var(--accent)]">
              {museum.openingAt
                ? `${museum.openingAt.slice(0, 16).replace("T", " ")} · 한국 시간`
                : "공개 일정 준비 중"}
            </p>
          </QueryState>
        ) : museum.artworks.length ? (
          <MuseumExperience key={museumId} museum={museum} />
        ) : (
          <QueryState
            title="현재 감상할 수 있는 작품이 없습니다"
            action={{ href: "/gallery", label: "다른 전시 보기" }}
          />
        )}
      </main>
      <CinematicBottomNav activeTab="gallery" layout="fixed" />
    </div>
  );
}

function MuseumExperience({ museum }: { museum: PublicMuseumDetail }) {
  const { authStatus } = useAuthSession();
  const signedIn = authStatus === "in";
  const search = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      museum.artworks.findIndex(
        (item) => item.museumArtworkId === Number(search.get("artworkId")),
      ),
    ),
  );
  const activeIndex = Math.min(index, museum.artworks.length - 1);
  const artwork = museum.artworks[activeIndex];
  const urlImmersive =
    search.get("mode") === "focus" || search.get("immersive") === "1";
  const [immersive, setImmersive] = useState(urlImmersive);
  useEffect(() => {
    setImmersive(urlImmersive);
  }, [urlImmersive]);
  const [message, setMessage] = useState("");
  const bookmark = useQuery({
    queryKey: ["gallery", "museum", museum.museumId, "bookmark"],
    queryFn: () => getBookmarkStatus(museum.museumId),
    enabled: signedIn,
  });
  const mutation = useMutation({
    mutationFn: (value: boolean) => setBookmark(museum.museumId, value),
    onSuccess: (result) => {
      if (!result.data || result.error) {
        setMessage("전시 저장 상태를 변경하지 못했습니다. 다시 시도해 주세요.");
        return;
      }
      queryClient.setQueryData(
        ["gallery", "museum", museum.museumId, "bookmark"],
        result,
      );
      void queryClient.invalidateQueries({
        queryKey: ["library", "bookmarks"],
      });
      setMessage(
        result.data.bookmarked
          ? "전시를 저장했습니다. 관람 기록에서 다시 만날 수 있습니다."
          : "저장한 전시에서 해제했습니다.",
      );
    },
    onError: () => setMessage("전시 저장에 실패했습니다. 다시 시도해 주세요."),
  });

  useEffect(() => {
    if (!signedIn || !artwork) return;
    const timer = window.setTimeout(() => {
      void recordMuseumView(
        museum.museumId,
        artwork.museumArtworkId,
        Math.round(((activeIndex + 1) / museum.artworks.length) * 100),
      ).then((result) => {
        if (!result.error)
          void queryClient.invalidateQueries({
            queryKey: ["library", "history"],
          });
      });
    }, 800);
    return () => window.clearTimeout(timer);
  }, [
    activeIndex,
    artwork,
    museum.artworks.length,
    museum.museumId,
    queryClient,
    signedIn,
  ]);

  const changeImmersive = (open: boolean) => {
    setImmersive(open);
    const params = new URLSearchParams(search.toString());
    params.delete("immersive");
    if (open) params.set("mode", "focus");
    else params.delete("mode");
    params.set("artworkId", String(artwork.museumArtworkId));
    router.replace(`${pathname}?${params}`, { scroll: false });
  };
  const share = async () => {
    try {
      const url = `${window.location.origin}${pathname}?artworkId=${artwork.museumArtworkId}`;
      if (navigator.share) await navigator.share({ title: museum.name, url });
      else {
        await navigator.clipboard.writeText(url);
        setMessage("전시 링크를 복사했습니다.");
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError"))
        setMessage(
          "링크를 공유하지 못했습니다. 주소창의 전시 주소를 복사해 주세요.",
        );
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 py-5">
        <Link
          href={`/artists/${museum.artistId}`}
          className="min-h-11 py-3 text-sm text-[var(--accent)]"
        >
          {museum.ownerName} 작가의 기록 ↗
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {signedIn ? (
            <button
              type="button"
              disabled={
                mutation.isPending ||
                bookmark.isPending ||
                !!bookmark.data?.error
              }
              onClick={() => mutation.mutate(!bookmark.data?.data?.bookmarked)}
              aria-pressed={bookmark.data?.data?.bookmarked ?? false}
              className="museum-button-secondary px-4 text-sm"
            >
              {mutation.isPending
                ? "저장 중"
                : bookmark.data?.data?.bookmarked
                  ? "저장됨 ✓"
                  : "전시 저장"}
            </button>
          ) : (
            <Link
              href={buildLoginPath(pathname)}
              className="museum-button-secondary px-4 text-sm"
            >
              로그인하고 저장
            </Link>
          )}
          <button
            type="button"
            onClick={() => void share()}
            className="museum-button-secondary px-4 text-sm"
          >
            공유
          </button>
          <Link
            href={`${pathname}/catalog`}
            className="museum-button-secondary px-4 text-sm"
          >
            도록·PDF
          </Link>
        </div>
      </div>
      {bookmark.data?.error ? (
        <p role="alert" className="mb-4 text-sm text-[var(--danger)]">
          저장 상태를 확인하지 못했습니다.{" "}
          <button
            type="button"
            onClick={() => void bookmark.refetch()}
            className="underline"
          >
            다시 확인
          </button>
        </p>
      ) : null}
      {message ? (
        <p role="status" className="mb-4 text-sm text-[var(--accent)]">
          {message}
        </p>
      ) : null}
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
        <ExhibitionViewer
          artworks={museum.artworks}
          activeIndex={activeIndex}
          onSelect={setIndex}
          immersive={immersive}
          onImmersiveChange={changeImmersive}
          layout={museum.layoutPreset}
          lighting={museum.lightingPreset}
        />
        <aside className="min-w-0 border-t border-[var(--line)] pt-5 xl:border-l xl:border-t-0 xl:pl-7">
          <p className="museum-kicker">
            {artwork.roomLabel || `작품 ${activeIndex + 1}`}
          </p>
          <h2 className="mt-3 font-[var(--font-display)] text-3xl">
            {artwork.title}
          </h2>
          <p className="mt-5 whitespace-pre-wrap text-sm leading-8 text-[var(--muted)]">
            {artwork.description || "사진 속 세부에 천천히 머물러 보세요."}
          </p>
          {artwork.audioUrl ? (
            <div className="mt-6">
              <h3 className="text-sm">음성 해설</h3>
              <audio
                key={artwork.museumArtworkId}
                src={artwork.audioUrl}
                controls
                preload="none"
                aria-label={`${artwork.title} 음성 해설`}
                className="mt-3 w-full"
              />
            </div>
          ) : null}
          {artwork.audioTranscript ? (
            <details className="mt-5 text-sm">
              <summary className="min-h-11 cursor-pointer py-3">
                해설 대본 읽기
              </summary>
              <p className="whitespace-pre-wrap leading-8 text-[var(--muted)]">
                {artwork.audioTranscript}
              </p>
            </details>
          ) : null}
          <div className="mt-8 border-t border-[var(--line)] pt-5">
            <h3 className="font-[var(--font-display)] text-xl">
              전시에 대하여
            </h3>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-8 text-[var(--muted)]">
              {museum.curatorNote ||
                museum.description ||
                `${museum.ownerName} 작가의 사진 ${museum.artworks.length}점을 만나는 전시입니다.`}
            </p>
          </div>
        </aside>
      </div>
      <div className="mt-10 flex flex-wrap justify-between gap-4 border-t border-[var(--line)] pt-6">
        <Link href="/gallery" className="min-h-11 text-sm">
          ← 다른 전시 둘러보기
        </Link>
        <Link
          href={`/artists/${museum.artistId}`}
          className="min-h-11 text-sm text-[var(--accent)]"
        >
          작가의 다른 기록 보기 →
        </Link>
      </div>
    </>
  );
}
