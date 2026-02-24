"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "motion/react";
import PageShell from "../../components/PageShell";
import TopNav from "../../components/TopNav";
import { Skeleton } from "../../components/Skeleton";
import Reveal from "../../components/motion/Reveal";
import { getUserFromToken, isAdminRole } from "../../lib/auth";
import { staggeredFadeUpMotion } from "../../lib/motion";
import {
  deleteAdminMuseumArtwork,
  getAdminMuseumArtworks,
  getAdminMuseums,
  updateAdminMuseumArtworkModeration,
  updateAdminMuseumFeatured,
  updateAdminMuseumVisibility,
} from "../../lib/museum";
import { useAppDispatch } from "../../store/hooks";
import { showToast } from "../../store/uiSlice";

type MuseumFilter = "all" | "featured" | "public" | "private";
type ArtworkFilter = "all" | "REVIEWING" | "VISIBLE" | "REMOVED";

export default function AdminGalleryClient() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = Boolean(prefersReducedMotion);
  const role = getUserFromToken()?.role;
  const isAdmin = isAdminRole(role);
  const [selectedMuseumId, setSelectedMuseumId] = useState<number | null>(null);
  const [museumFilter, setMuseumFilter] = useState<MuseumFilter>("all");
  const [artworkFilter, setArtworkFilter] = useState<ArtworkFilter>("REVIEWING");
  const [search, setSearch] = useState("");
  const [processingMuseumId, setProcessingMuseumId] = useState<number | null>(null);
  const [processingArtworkId, setProcessingArtworkId] = useState<number | null>(null);

  const museumsQuery = useQuery({
    queryKey: ["admin", "gallery", "museums"],
    queryFn: getAdminMuseums,
    enabled: isAdmin,
  });

  const museums = useMemo(
    () => museumsQuery.data?.data ?? [],
    [museumsQuery.data?.data],
  );
  const museumsError = museumsQuery.data?.error;

  const filteredMuseums = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return museums.filter((museum) => {
      const filterPass =
        museumFilter === "all" ||
        (museumFilter === "featured" && museum.isFeatured) ||
        (museumFilter === "public" && museum.isPublic) ||
        (museumFilter === "private" && !museum.isPublic);
      const searchPass =
        normalizedSearch.length === 0 ||
        museum.name.toLowerCase().includes(normalizedSearch) ||
        museum.ownerName.toLowerCase().includes(normalizedSearch) ||
        String(museum.museumId).includes(normalizedSearch);
      return filterPass && searchPass;
    });
  }, [museumFilter, museums, search]);

  const activeSelectedMuseumId = useMemo(() => {
    if (filteredMuseums.length === 0) {
      return null;
    }
    if (selectedMuseumId && filteredMuseums.some((museum) => museum.museumId === selectedMuseumId)) {
      return selectedMuseumId;
    }
    return filteredMuseums[0].museumId;
  }, [filteredMuseums, selectedMuseumId]);

  const selectedMuseum = useMemo(
    () => museums.find((museum) => museum.museumId === activeSelectedMuseumId) ?? null,
    [activeSelectedMuseumId, museums],
  );

  const artworksQuery = useQuery({
    queryKey: ["admin", "gallery", "museums", activeSelectedMuseumId, "artworks"],
    queryFn: () => getAdminMuseumArtworks(activeSelectedMuseumId as number),
    enabled: isAdmin && !!activeSelectedMuseumId,
  });

  const artworks = useMemo(
    () => artworksQuery.data?.data ?? [],
    [artworksQuery.data?.data],
  );
  const artworksError = artworksQuery.data?.error;

  const filteredArtworks = useMemo(() => {
    if (artworkFilter === "all") {
      return artworks;
    }
    return artworks.filter((artwork) => artwork.moderationStatus === artworkFilter);
  }, [artworkFilter, artworks]);

  const updateFeaturedMutation = useMutation({
    mutationFn: async (museumId: number) => {
      const museum = museums.find((item) => item.museumId === museumId);
      if (!museum) {
        return { data: null, error: "뮤지엄 정보를 찾을 수 없습니다." };
      }
      setProcessingMuseumId(museumId);
      return updateAdminMuseumFeatured(museumId, !museum.isFeatured);
    },
    onSuccess: (result) => {
      if (result.error) {
        dispatch(showToast(result.error));
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["admin", "gallery", "museums"] });
      queryClient.invalidateQueries({ queryKey: ["gallery", "museums"] });
      dispatch(showToast("메인 노출 설정을 변경했습니다."));
    },
    onError: () => dispatch(showToast("메인 노출 설정 변경 중 오류가 발생했습니다.")),
    onSettled: () => setProcessingMuseumId(null),
  });

  const updateVisibilityMutation = useMutation({
    mutationFn: async (museumId: number) => {
      const museum = museums.find((item) => item.museumId === museumId);
      if (!museum) {
        return { data: null, error: "뮤지엄 정보를 찾을 수 없습니다." };
      }
      setProcessingMuseumId(museumId);
      return updateAdminMuseumVisibility(museumId, !museum.isPublic);
    },
    onSuccess: (result) => {
      if (result.error) {
        dispatch(showToast(result.error));
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["admin", "gallery", "museums"] });
      queryClient.invalidateQueries({ queryKey: ["gallery", "museums"] });
      dispatch(showToast("공개 상태를 변경했습니다."));
    },
    onError: () => dispatch(showToast("공개 상태 변경 중 오류가 발생했습니다.")),
    onSettled: () => setProcessingMuseumId(null),
  });

  const updateArtworkModerationMutation = useMutation({
    mutationFn: async (payload: {
      museumId: number;
      museumArtworkId: number;
      moderationStatus: "REVIEWING" | "VISIBLE" | "REMOVED";
    }) => {
      setProcessingArtworkId(payload.museumArtworkId);
      return updateAdminMuseumArtworkModeration(
        payload.museumId,
        payload.museumArtworkId,
        payload.moderationStatus,
      );
    },
    onSuccess: (result) => {
      if (result.error) {
        dispatch(showToast(result.error));
        return;
      }
      queryClient.invalidateQueries({
        queryKey: ["admin", "gallery", "museums", activeSelectedMuseumId, "artworks"],
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "gallery", "museums"] });
      queryClient.invalidateQueries({ queryKey: ["gallery", "museums"] });
      dispatch(showToast("작품 모더레이션 상태를 변경했습니다."));
    },
    onError: () => dispatch(showToast("작품 상태 변경 중 오류가 발생했습니다.")),
    onSettled: () => setProcessingArtworkId(null),
  });

  const deleteArtworkMutation = useMutation({
    mutationFn: async (payload: { museumId: number; museumArtworkId: number }) => {
      setProcessingArtworkId(payload.museumArtworkId);
      return deleteAdminMuseumArtwork(payload.museumId, payload.museumArtworkId);
    },
    onSuccess: (result) => {
      if (result.error) {
        dispatch(showToast(result.error));
        return;
      }
      queryClient.invalidateQueries({
        queryKey: ["admin", "gallery", "museums", activeSelectedMuseumId, "artworks"],
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "gallery", "museums"] });
      queryClient.invalidateQueries({ queryKey: ["gallery", "museums"] });
      dispatch(showToast("작품을 삭제했습니다."));
    },
    onError: () => dispatch(showToast("작품 삭제 중 오류가 발생했습니다.")),
    onSettled: () => setProcessingArtworkId(null),
  });

  if (!isAdmin) {
    return (
      <PageShell>
        <TopNav />
        <section className="mt-10 rounded-[28px] border border-[color:var(--line)] bg-white/75 p-8 text-center shadow-[var(--shadow)]">
          <h2 className="font-[var(--font-display)] text-3xl">관리자 권한이 필요합니다</h2>
          <p className="mt-3 text-sm text-[color:var(--muted)]">
            갤러리 어드민은 모더레이션/메인 노출 관리를 위한 전용 페이지입니다.
          </p>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <TopNav />
      <Reveal index={0} className="mt-8">
      <section className="rounded-[28px] border border-[color:var(--line)] bg-white/75 p-6 shadow-[var(--shadow)]">
        <h2 className="font-[var(--font-display)] text-3xl">Gallery Admin Moderation</h2>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          유저 업로드 작품은 기본 심사중이며, 어드민 승인 후에만 노출됩니다.
        </p>

        <div className="mt-6 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="rounded-[20px] border border-[color:var(--line)] bg-white/90 p-4">
            <div className="space-y-3">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="뮤지엄/작가/ID 검색"
                className="h-10 w-full rounded-[12px] border border-[color:var(--line)] bg-white px-3 text-sm outline-none focus:border-[color:var(--accent)]"
              />
              <select
                value={museumFilter}
                onChange={(event) => setMuseumFilter(event.target.value as MuseumFilter)}
                className="h-10 w-full rounded-[12px] border border-[color:var(--line)] bg-white px-3 text-sm outline-none focus:border-[color:var(--accent)]"
              >
                <option value="all">전체</option>
                <option value="featured">메인 노출</option>
                <option value="public">공개</option>
                <option value="private">비공개</option>
              </select>
            </div>

            {museumsQuery.isLoading ? (
              <div className="mt-4 space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton
                    key={index}
                    className="h-28 w-full rounded-[14px]"
                  />
                ))}
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {filteredMuseums.map((museum, index) => (
                  <motion.article
                    key={museum.museumId}
                    {...staggeredFadeUpMotion(index + 1, reduceMotion)}
                    className={`rounded-[14px] border p-3 ${
                      museum.museumId === activeSelectedMuseumId
                        ? "border-[color:var(--accent)] bg-[color:var(--chip)]"
                        : "border-[color:var(--line)] bg-white"
                    }`}
                  >
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => setSelectedMuseumId(museum.museumId)}
                    >
                      <p className="text-xs text-[color:var(--muted)]">
                        #{museum.museumId} · {museum.ownerName}
                      </p>
                      <p className="mt-1 font-medium text-[color:var(--canvas-ink)]">
                        {museum.name}
                      </p>
                      <p className="mt-1 text-xs text-[color:var(--muted)]">
                        심사중 {museum.reviewingArtworkCount} / 노출 {museum.visibleArtworkCount} / 반려 {museum.removedArtworkCount}
                      </p>
                    </button>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => updateFeaturedMutation.mutate(museum.museumId)}
                        disabled={processingMuseumId === museum.museumId}
                        className={`rounded-full px-3 py-2 text-xs ${
                          museum.isFeatured
                            ? "border border-blue-200 bg-blue-50 text-blue-700"
                            : "border border-[color:var(--line)] bg-white text-[color:var(--muted)]"
                        } cursor-pointer transition hover:brightness-95 disabled:cursor-pointer disabled:hover:brightness-95 disabled:opacity-60`}
                      >
                        {museum.isFeatured ? "메인 노출 중" : "메인 노출 해제"}
                      </button>
                      <button
                        type="button"
                        onClick={() => updateVisibilityMutation.mutate(museum.museumId)}
                        disabled={processingMuseumId === museum.museumId}
                        className={`rounded-full px-3 py-2 text-xs ${
                          museum.isPublic
                            ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border border-amber-200 bg-amber-50 text-amber-700"
                        } cursor-pointer transition hover:brightness-95 disabled:cursor-pointer disabled:hover:brightness-95 disabled:opacity-60`}
                      >
                        {museum.isPublic ? "공개" : "비공개"}
                      </button>
                    </div>
                  </motion.article>
                ))}

                {filteredMuseums.length === 0 && (
                  <p className="rounded-[14px] border border-[color:var(--line)] bg-white px-4 py-5 text-sm text-[color:var(--muted)]">
                    조건에 맞는 뮤지엄이 없습니다.
                  </p>
                )}
                {museumsError && (
                  <p className="text-xs text-red-500">{museumsError}</p>
                )}
              </div>
            )}
          </aside>

          <div className="rounded-[20px] border border-[color:var(--line)] bg-white/90 p-5">
            {selectedMuseum ? (
              <>
                <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[color:var(--line)] pb-4">
                  <div>
                    <p className="text-xs text-[color:var(--muted)]">
                      #{selectedMuseum.museumId} · {selectedMuseum.ownerName}
                    </p>
                    <h3 className="font-[var(--font-display)] text-2xl">{selectedMuseum.name}</h3>
                    <p className="mt-1 text-sm text-[color:var(--muted)]">
                      {selectedMuseum.description || "뮤지엄 소개 없음"}
                    </p>
                  </div>
                  <select
                    value={artworkFilter}
                    onChange={(event) => setArtworkFilter(event.target.value as ArtworkFilter)}
                    className="h-10 rounded-[12px] border border-[color:var(--line)] bg-white px-3 text-sm outline-none focus:border-[color:var(--accent)]"
                  >
                    <option value="all">작품 상태: 전체</option>
                    <option value="REVIEWING">작품 상태: 심사중</option>
                    <option value="VISIBLE">작품 상태: 노출</option>
                    <option value="REMOVED">작품 상태: 반려</option>
                  </select>
                </div>

                {artworksQuery.isLoading ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <Skeleton
                        key={index}
                        className="h-64 w-full rounded-[16px]"
                      />
                    ))}
                  </div>
                ) : filteredArtworks.length > 0 ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredArtworks.map((artwork, index) => (
                      <motion.article
                        key={artwork.museumArtworkId}
                        {...staggeredFadeUpMotion(index + 8, reduceMotion)}
                        className="overflow-hidden rounded-[16px] border border-[color:var(--line)] bg-white"
                      >
                        <div className="relative h-52 w-full">
                          <Image
                            src={artwork.imageUrl}
                            alt={artwork.title}
                            fill
                            unoptimized
                            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                            className="object-cover"
                          />
                        </div>
                        <div className="p-4">
                          <p className="text-xs text-[color:var(--muted)]">
                            #{artwork.museumArtworkId} · {artwork.ownerName}
                          </p>
                          <h4 className="mt-1 font-medium">{artwork.title}</h4>
                          <p className="mt-1 text-xs text-[color:var(--muted)]">
                            상태: {artwork.moderationStatus === "REVIEWING"
                              ? "심사중"
                              : artwork.moderationStatus === "VISIBLE"
                                ? "노출"
                                : artwork.moderationStatus === "REMOVED"
                                  ? "반려"
                                  : artwork.moderationStatus}
                          </p>
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                updateArtworkModerationMutation.mutate({
                                  museumId: selectedMuseum.museumId,
                                  museumArtworkId: artwork.museumArtworkId,
                                  moderationStatus: "REVIEWING",
                                })
                              }
                              disabled={processingArtworkId === artwork.museumArtworkId}
                              className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700 cursor-pointer transition hover:brightness-95 disabled:cursor-pointer disabled:hover:brightness-95 disabled:opacity-60"
                            >
                              심사중
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateArtworkModerationMutation.mutate({
                                  museumId: selectedMuseum.museumId,
                                  museumArtworkId: artwork.museumArtworkId,
                                  moderationStatus: "VISIBLE",
                                })
                              }
                              disabled={processingArtworkId === artwork.museumArtworkId}
                              className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700 cursor-pointer transition hover:brightness-95 disabled:cursor-pointer disabled:hover:brightness-95 disabled:opacity-60"
                            >
                              승인
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateArtworkModerationMutation.mutate({
                                  museumId: selectedMuseum.museumId,
                                  museumArtworkId: artwork.museumArtworkId,
                                  moderationStatus: "REMOVED",
                                })
                              }
                              disabled={processingArtworkId === artwork.museumArtworkId}
                              className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-700 cursor-pointer transition hover:brightness-95 disabled:cursor-pointer disabled:hover:brightness-95 disabled:opacity-60"
                            >
                              반려
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (!window.confirm("이 작품을 완전히 삭제할까요?")) {
                                return;
                              }
                              deleteArtworkMutation.mutate({
                                museumId: selectedMuseum.museumId,
                                museumArtworkId: artwork.museumArtworkId,
                              });
                            }}
                            disabled={processingArtworkId === artwork.museumArtworkId}
                            className="mt-2 w-full rounded-full border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-700 disabled:opacity-60"
                          >
                            삭제
                          </button>
                        </div>
                      </motion.article>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 rounded-[14px] border border-[color:var(--line)] bg-white px-4 py-6 text-sm text-[color:var(--muted)]">
                    조건에 맞는 작품이 없습니다.
                  </p>
                )}
                {artworksError && (
                  <p className="mt-2 text-xs text-red-500">{artworksError}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-[color:var(--muted)]">
                좌측에서 모더레이션할 뮤지엄을 선택하세요.
              </p>
            )}
          </div>
        </div>
      </section>
      </Reveal>
    </PageShell>
  );
}
