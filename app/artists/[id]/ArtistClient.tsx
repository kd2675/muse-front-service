"use client";

import Image from "next/image";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import CinematicBottomNav from "../../components/CinematicBottomNav";
import OverviewStyleHeader from "../../components/OverviewStyleHeader";
import QueryState from "../../components/QueryState";
import useAuthSession from "../../hooks/useAuthSession";
import { buildLoginPath } from "../../lib/authRouting";
import { getProfileSummary } from "../../lib/profile";
import { useState } from "react";
import { getFollowStatus, getPublicArtist, setFollowing } from "../../lib/discovery";

export default function ArtistClient({ artistId }: { artistId: number }) {
  const { authStatus } = useAuthSession();
  const hasToken = authStatus === "in";
  const [followError, setFollowError] = useState("");
  const profile = useQuery({ queryKey: ["profile", "summary"], queryFn: getProfileSummary, enabled: hasToken });
  const isSelf = profile.data?.data?.artist.id === artistId;
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["artist", artistId], queryFn: () => getPublicArtist(artistId) });
  const followQuery = useQuery({
    queryKey: ["artist", artistId, "follow"],
    queryFn: () => getFollowStatus(artistId),
    enabled: hasToken,
  });
  const followMutation = useMutation({
    mutationFn: (following: boolean) => setFollowing(artistId, following),
    onSuccess: (result) => {
      if (!result.data || result.error) { setFollowError("팔로우 상태를 변경하지 못했습니다. 다시 시도해 주세요."); return; }
      setFollowError("");
      queryClient.setQueryData(["artist", artistId, "follow"], result);
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["artist", artistId] });
      queryClient.invalidateQueries({ queryKey: ["artist", artistId, "follow"] });
    },
    onError: () => setFollowError("팔로우 상태를 변경하지 못했습니다. 다시 시도해 주세요."),
  });
  const artist = query.data?.data;
  const following = followQuery.data?.data?.following ?? false;

  return (
    <div className="museum-grain min-h-screen bg-[var(--canvas)] text-[var(--canvas-ink)]">
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-6xl px-6 pb-40 pt-8 md:px-8">
        <OverviewStyleHeader title={artist?.name ?? "작가 기록"} subtitle="Public artist archive" />
        {artist ? (
          <>
            <section className="museum-panel mt-8 border-x-0 p-7 md:p-10">
              <div className="flex flex-wrap items-end justify-between gap-6">
                <div className="max-w-2xl">
                  <p className="museum-kicker">Artist statement</p>
                  <p className="mt-4 text-lg leading-8 text-[var(--muted)]">{artist.tagline || "이미지와 시간의 흔적을 기록합니다."}</p>
                </div>
                {isSelf ? <Link href="/profile" className="museum-button-secondary px-5 py-3 text-sm">나의 작가실</Link> : hasToken ? (
                  <button
                    type="button"
                    disabled={followMutation.isPending || followQuery.isPending || !!followQuery.data?.error || profile.isPending}
                    onClick={() => followMutation.mutate(!following)}
                    className={following ? "border border-[var(--line)] px-6 py-3 text-sm" : "bg-[var(--accent)] px-6 py-3 text-sm text-[#111]"}
                  >
                    {following ? "팔로잉" : "작가 팔로우"}
                  </button>
                ) : <Link href={buildLoginPath(`/artists/${artistId}`)} className="museum-button-secondary px-5 py-3 text-sm">로그인하고 팔로우</Link>}
              </div>
              {followError ? <p role="alert" className="mt-3 text-sm text-[var(--danger)]">{followError}</p> : null}
              {followQuery.data?.error ? <p className="mt-3 text-sm text-[var(--danger)]">팔로우 상태 확인 실패 · <button type="button" onClick={() => void followQuery.refetch()} className="underline">다시 확인</button></p> : null}
              <dl className="mt-8 grid grid-cols-3 border-y border-[var(--line)]">
                <Metric label="작품" value={artist.totalWorks} />
                <Metric label="수상" value={artist.totalAwards} />
                <Metric label="팔로워" value={artist.followerCount} />
              </dl>
            </section>
            <section className="mt-12">
              <h2 className="font-[var(--font-display)] text-3xl">공개 전시</h2>
              <div className="mt-5 grid gap-6 md:grid-cols-2">
                {artist.museums.length === 0 ? <p className="py-5 text-sm text-[var(--muted)]">아직 공개된 전시가 없습니다.</p> : null}
                {artist.museums.map((museum, index) => (
                  <Link key={museum.museumId} href={`/gallery/museums/${museum.museumId}`} className="group border-t border-[var(--line)] pt-5">
                    {museum.coverImageUrl ? <div className="relative aspect-[16/9] overflow-hidden"><Image src={museum.coverImageUrl} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" preload={index === 0} className="object-cover transition duration-700 group-hover:scale-[1.02]" /></div> : null}
                    <h3 className="mt-4 font-[var(--font-display)] text-2xl">{museum.name}</h3>
                    <p className="mt-2 text-sm text-[var(--muted)]">{museum.description || `${museum.artworkCount}점의 전시`}</p>
                  </Link>
                ))}
              </div>
            </section>
            <section className="mt-12">
              <h2 className="font-[var(--font-display)] text-3xl">수상 기록</h2>
              <div className="mt-5 divide-y divide-[var(--line)] border-y border-[var(--line)]">
                {artist.awards.length === 0 ? <p className="py-5 text-sm text-[var(--muted)]">등록된 수상 기록이 없습니다.</p> : null}
                {artist.awards.map((award) => (
                  <Link key={award.awardId} href={award.contestId ? `/contest/${award.contestId}/results` : "/contest"} className="grid gap-2 py-5 md:grid-cols-[1fr_auto_auto]">
                    <strong>{award.contest}</strong><span>{award.rank}</span><span className="text-[var(--muted)]">{award.period}</span>
                  </Link>
                ))}
              </div>
            </section>
          </>
        ) : query.isPending ? <QueryState kind="loading" title="작가 기록을 불러오고 있습니다" /> : <QueryState kind="error" title="작가 기록을 불러오지 못했습니다" retry={() => void query.refetch()} action={{ href: "/search", label: "다른 작가 찾기" }} />}
      </main>
      <CinematicBottomNav activeTab="gallery" layout="fixed" />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="border-r border-[var(--line)] p-4 last:border-r-0"><dt className="text-xs text-[var(--muted)]">{label}</dt><dd className="mt-2 font-[var(--font-display)] text-2xl">{value.toLocaleString("ko-KR")}</dd></div>;
}
