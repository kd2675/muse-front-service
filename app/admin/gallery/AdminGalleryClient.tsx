"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "motion/react";
import AdminShell from "../../components/AdminShell";
import AdminActionButton from "../../components/AdminActionButton";
import { Skeleton } from "../../components/Skeleton";
import Reveal from "../../components/motion/Reveal";
import { getUserFromToken, isAdminRole } from "../../lib/auth";
import { staggeredFadeUpMotion } from "../../lib/motion";
import {
  getGalleryModerationLabel,
  getGalleryModerationTone,
} from "../../lib/statusTheme";
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
      <AdminShell
        section="gallery-manage"
        title="Gallery Admin"
        description="뮤지엄 공개/메인 노출/작품 모더레이션을 운영합니다."
      >
        <section className=" border border-[color:var(--line)] bg-[rgba(34,34,40,0.72)] p-8 text-center shadow-[var(--shadow)]">
          <h2 className="font-[var(--font-display)] text-3xl">관리자 권한이 필요합니다</h2>
          <p className="mt-3 text-sm text-[color:var(--muted)]">
            갤러리 어드민은 모더레이션/메인 노출 관리를 위한 전용 페이지입니다.
          </p>
        </section>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      section="gallery-manage"
      title="Gallery Admin"
      description="뮤지엄 단위 큐와 작품 상태를 기준으로 전시 품질을 관리합니다."
    >
      <Reveal index={0}>
      <section className="border border-[color:var(--line)] bg-[rgba(22,22,28,0.8)] p-7 shadow-[var(--shadow)] md:p-8">
        <h2 className="border-b border-[color:var(--line)] pb-4 font-[var(--font-display)] text-4xl italic">
          Gallery Admin Moderation
        </h2>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          유저 업로드 작품은 기본 대기 상태이며, 어드민 승인 후에만 노출됩니다.
        </p>

        <div className="mt-7 grid gap-7 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="border border-[color:var(--line)] bg-[rgba(18,18,24,0.9)] p-5">
            <div className="space-y-3">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="뮤지엄/작가/ID 검색"
                className="h-10 w-full border border-[color:var(--line)] bg-[rgba(12,12,18,0.82)] px-3 text-sm outline-none focus:border-[color:var(--accent)]"
              />
              <select
                value={museumFilter}
                onChange={(event) => setMuseumFilter(event.target.value as MuseumFilter)}
                className="h-10 w-full border border-[color:var(--line)] bg-[rgba(12,12,18,0.82)] px-3 text-sm outline-none focus:border-[color:var(--accent)]"
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
                    className="h-28 w-full "
                  />
                ))}
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {filteredMuseums.map((museum, index) => (
                  <motion.article
                    key={museum.museumId}
                    {...staggeredFadeUpMotion(index + 1, reduceMotion)}
                    className={`border p-4 ${
                      museum.museumId === activeSelectedMuseumId
                        ? "border-[color:var(--accent)] bg-[color:var(--chip)]"
                        : "border-[color:var(--line)] bg-[rgba(12,12,18,0.82)]"
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
                        대기 {museum.reviewingArtworkCount} / 승인 {museum.visibleArtworkCount} / 반려 {museum.removedArtworkCount}
                      </p>
                    </button>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <AdminActionButton
                        variant={museum.isFeatured ? "primary" : "secondary"}
                        size="sm"
                        onClick={() => updateFeaturedMutation.mutate(museum.museumId)}
                        disabled={processingMuseumId === museum.museumId}
                      >
                        {museum.isFeatured ? "메인 노출 중" : "메인 노출 해제"}
                      </AdminActionButton>
                      <AdminActionButton
                        variant={museum.isPublic ? "success" : "warning"}
                        size="sm"
                        onClick={() => updateVisibilityMutation.mutate(museum.museumId)}
                        disabled={processingMuseumId === museum.museumId}
                      >
                        {museum.isPublic ? "공개" : "비공개"}
                      </AdminActionButton>
                    </div>
                  </motion.article>
                ))}

                {filteredMuseums.length === 0 && (
                  <p className="border border-[color:var(--line)] bg-[rgba(12,12,18,0.82)] px-4 py-5 text-sm text-[color:var(--muted)]">
                    조건에 맞는 뮤지엄이 없습니다.
                  </p>
                )}
                {museumsError && (
                  <p className="text-xs text-red-500">{museumsError}</p>
                )}
              </div>
            )}
          </aside>

          <div className="border border-[color:var(--line)] bg-[rgba(18,18,24,0.9)] p-6">
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
                    className="h-10 border border-[color:var(--line)] bg-[rgba(12,12,18,0.82)] px-3 text-sm outline-none focus:border-[color:var(--accent)]"
                  >
                    <option value="all">작품 상태: 전체</option>
                    <option value="REVIEWING">작품 상태: 대기</option>
                    <option value="VISIBLE">작품 상태: 승인</option>
                    <option value="REMOVED">작품 상태: 반려</option>
                  </select>
                </div>

                {artworksQuery.isLoading ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <Skeleton
                        key={index}
                        className="h-64 w-full "
                      />
                    ))}
                  </div>
                ) : filteredArtworks.length > 0 ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredArtworks.map((artwork, index) => (
                      <motion.article
                        key={artwork.museumArtworkId}
                        {...staggeredFadeUpMotion(index + 8, reduceMotion)}
                        className="overflow-hidden border border-[color:var(--line)] bg-[rgba(12,12,18,0.82)]"
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
                          <div className="mt-1 flex items-center gap-2 text-xs">
                            <span className="text-[color:var(--muted)]">상태:</span>
                            <span
                              className={` border px-2 py-1 ${
                                getGalleryModerationTone(artwork.moderationStatus).chipClass
                              }`}
                            >
                              {getGalleryModerationLabel(artwork.moderationStatus)}
                            </span>
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            <AdminActionButton
                              variant="neutral"
                              size="sm"
                              onClick={() =>
                                updateArtworkModerationMutation.mutate({
                                  museumId: selectedMuseum.museumId,
                                  museumArtworkId: artwork.museumArtworkId,
                                  moderationStatus: "REVIEWING",
                                })
                              }
                              disabled={processingArtworkId === artwork.museumArtworkId}
                              className="text-[11px]"
                            >
                              대기
                            </AdminActionButton>
                            <AdminActionButton
                              variant="success"
                              size="sm"
                              onClick={() =>
                                updateArtworkModerationMutation.mutate({
                                  museumId: selectedMuseum.museumId,
                                  museumArtworkId: artwork.museumArtworkId,
                                  moderationStatus: "VISIBLE",
                                })
                              }
                              disabled={processingArtworkId === artwork.museumArtworkId}
                              className="text-[11px]"
                            >
                              승인
                            </AdminActionButton>
                            <AdminActionButton
                              variant="warning"
                              size="sm"
                              onClick={() =>
                                updateArtworkModerationMutation.mutate({
                                  museumId: selectedMuseum.museumId,
                                  museumArtworkId: artwork.museumArtworkId,
                                  moderationStatus: "REMOVED",
                                })
                              }
                              disabled={processingArtworkId === artwork.museumArtworkId}
                              className="text-[11px]"
                            >
                              반려
                            </AdminActionButton>
                          </div>
                          <AdminActionButton
                            variant="danger"
                            size="sm"
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
                            fullWidth
                            className="mt-2 text-[11px]"
                          >
                            삭제
                          </AdminActionButton>
                        </div>
                      </motion.article>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 border border-[color:var(--line)] bg-[rgba(12,12,18,0.82)] px-4 py-6 text-sm text-[color:var(--muted)]">
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
    </AdminShell>
  );
}
