"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import CinematicBottomNav from "../../components/CinematicBottomNav";
import ConfirmDialog from "../../components/ConfirmDialog";
import OverviewStyleHeader from "../../components/OverviewStyleHeader";
import { Skeleton } from "../../components/Skeleton";
import { getUserFromToken } from "../../lib/auth";
import {
  getGalleryModerationLabel,
  getGalleryModerationTone,
} from "../../lib/statusTheme";
import {
  createMyMuseum,
  createMyMuseumArtwork,
  deleteMyMuseum,
  deleteMyMuseumArtwork,
  getMyMuseumArtworks,
  getMyMuseums,
  updateMyMuseum,
} from "../../lib/museum";
import { uploadImage } from "../../lib/imageUpload";
import { APP_ROUTES } from "../../lib/router";
import { useAppDispatch } from "../../store/hooks";
import { showToast } from "../../store/uiSlice";
import { staggeredFadeUpMotion } from "../../lib/motion";

type MuseumFormState = {
  name: string;
  description: string;
  isPublic: boolean;
};

type ArtworkFormState = {
  title: string;
  description: string;
};

const emptyMuseumForm: MuseumFormState = {
  name: "",
  description: "",
  isPublic: false,
};

const emptyArtworkForm: ArtworkFormState = {
  title: "",
  description: "",
};

export default function MyMuseumClient() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = Boolean(prefersReducedMotion);
  const authUser = getUserFromToken();
  const isLoggedIn = !!authUser;
  const [selectedMuseumId, setSelectedMuseumId] = useState<number | null>(null);
  const [createForm, setCreateForm] = useState<MuseumFormState>(emptyMuseumForm);
  const [editDrafts, setEditDrafts] = useState<Record<number, MuseumFormState>>({});
  const [artworkForm, setArtworkForm] = useState<ArtworkFormState>(emptyArtworkForm);
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [uploadStage, setUploadStage] = useState<"idle" | "uploading" | "saving">("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [museumToDelete, setMuseumToDelete] = useState<number | null>(null);
  const [artworkToDelete, setArtworkToDelete] = useState<number | null>(null);

  const museumsQuery = useQuery({
    queryKey: ["my", "museums"],
    queryFn: getMyMuseums,
    enabled: isLoggedIn,
  });

  const museums = useMemo(
    () => museumsQuery.data?.data ?? [],
    [museumsQuery.data?.data],
  );
  const museumsError = museumsQuery.data?.error;
  const totalArtworkCount = useMemo(
    () => museums.reduce((sum, museum) => sum + museum.artworkCount, 0),
    [museums],
  );
  const publicMuseumCount = useMemo(
    () => museums.filter((museum) => museum.isPublic).length,
    [museums],
  );

  const activeSelectedMuseumId = useMemo(() => {
    if (museums.length === 0) {
      return null;
    }
    if (selectedMuseumId && museums.some((museum) => museum.museumId === selectedMuseumId)) {
      return selectedMuseumId;
    }
    return museums[0].museumId;
  }, [museums, selectedMuseumId]);

  const selectedMuseum = useMemo(
    () => museums.find((museum) => museum.museumId === activeSelectedMuseumId) ?? null,
    [activeSelectedMuseumId, museums],
  );

  const editForm = useMemo(() => {
    if (!selectedMuseum) {
      return emptyMuseumForm;
    }
    return (
      editDrafts[selectedMuseum.museumId] ?? {
      name: selectedMuseum.name,
      description: selectedMuseum.description ?? "",
      isPublic: selectedMuseum.isPublic,
      }
    );
  }, [editDrafts, selectedMuseum]);

  const updateEditFormField = (field: keyof MuseumFormState, value: string | boolean) => {
    if (!activeSelectedMuseumId || !selectedMuseum) {
      return;
    }
    setEditDrafts((prev) => ({
      ...prev,
      [activeSelectedMuseumId]: {
        name: prev[activeSelectedMuseumId]?.name ?? selectedMuseum.name,
        description:
          prev[activeSelectedMuseumId]?.description ?? selectedMuseum.description ?? "",
        isPublic: prev[activeSelectedMuseumId]?.isPublic ?? selectedMuseum.isPublic,
        [field]: value,
      },
    }));
  };

  const artworksQuery = useQuery({
    queryKey: ["my", "museums", activeSelectedMuseumId, "artworks"],
    queryFn: () => getMyMuseumArtworks(activeSelectedMuseumId as number),
    enabled: !!activeSelectedMuseumId && isLoggedIn,
  });

  const artworks = useMemo(
    () => artworksQuery.data?.data ?? [],
    [artworksQuery.data?.data],
  );
  const artworksError = artworksQuery.data?.error;
  const isUploading = uploadStage === "uploading" || uploadStage === "saving";

  const createMuseumMutation = useMutation({
    mutationFn: async () => {
      if (!createForm.name.trim()) {
        return { data: null, error: "뮤지엄 이름을 입력해주세요." };
      }
      return createMyMuseum({
        name: createForm.name.trim(),
        description: createForm.description.trim() || undefined,
      });
    },
    onSuccess: (result) => {
      if (result.error) {
        dispatch(showToast(result.error));
        return;
      }
      setCreateForm(emptyMuseumForm);
      queryClient.invalidateQueries({ queryKey: ["my", "museums"] });
      queryClient.invalidateQueries({ queryKey: ["gallery", "museums"] });
      if (result.data?.museumId) {
        setSelectedMuseumId(result.data.museumId);
      }
      dispatch(showToast("뮤지엄을 생성했습니다."));
    },
    onError: () => dispatch(showToast("뮤지엄 생성 중 오류가 발생했습니다.")),
  });

  const updateMuseumMutation = useMutation({
    mutationFn: async () => {
      if (!activeSelectedMuseumId) {
        return { data: null, error: "수정할 뮤지엄을 선택해주세요." };
      }
      if (!editForm.name.trim()) {
        return { data: null, error: "뮤지엄 이름을 입력해주세요." };
      }
      return updateMyMuseum(activeSelectedMuseumId, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
      });
    },
    onSuccess: (result) => {
      if (result.error) {
        dispatch(showToast(result.error));
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["my", "museums"] });
      queryClient.invalidateQueries({ queryKey: ["gallery", "museums"] });
      if (activeSelectedMuseumId) {
        setEditDrafts((prev) => {
          const next = { ...prev };
          delete next[activeSelectedMuseumId];
          return next;
        });
      }
      dispatch(showToast("뮤지엄 정보를 수정했습니다."));
    },
    onError: () => dispatch(showToast("뮤지엄 수정 중 오류가 발생했습니다.")),
  });

  const deleteMuseumMutation = useMutation({
    mutationFn: async (museumId: number) => deleteMyMuseum(museumId),
    onSuccess: (result) => {
      if (result.error) {
        dispatch(showToast(result.error));
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["my", "museums"] });
      queryClient.invalidateQueries({ queryKey: ["gallery", "museums"] });
      setMuseumToDelete(null);
      dispatch(showToast("뮤지엄을 삭제했습니다."));
    },
    onError: () => dispatch(showToast("뮤지엄 삭제 중 오류가 발생했습니다.")),
  });

  const createArtworkMutation = useMutation({
    mutationFn: async () => {
      if (!activeSelectedMuseumId) {
        return { data: null, error: "작품을 등록할 뮤지엄을 선택해주세요." };
      }
      if (!artworkForm.title.trim()) {
        return { data: null, error: "작품 제목을 입력해주세요." };
      }
      if (!artworkFile) {
        return { data: null, error: "작품 이미지를 선택해주세요." };
      }

      setUploadStage("uploading");
      setUploadProgress(0);
      const uploaded = await uploadImage(artworkFile, {
        onProgress: (percent) => setUploadProgress(percent),
      });
      if (!uploaded.imageUrl || !uploaded.fileName) {
        setUploadStage("idle");
        return { data: null, error: uploaded.error ?? "이미지 업로드에 실패했습니다." };
      }

      setUploadStage("saving");
      const result = await createMyMuseumArtwork(activeSelectedMuseumId, {
        title: artworkForm.title.trim(),
        description: artworkForm.description.trim() || undefined,
        fileName: uploaded.fileName,
      });
      setUploadStage("idle");
      return result;
    },
    onSuccess: (result) => {
      if (result.error) {
        dispatch(showToast(result.error));
        return;
      }
      setArtworkForm(emptyArtworkForm);
      setArtworkFile(null);
      setUploadProgress(0);
      queryClient.invalidateQueries({
        queryKey: ["my", "museums", activeSelectedMuseumId, "artworks"],
      });
      queryClient.invalidateQueries({ queryKey: ["my", "museums"] });
      queryClient.invalidateQueries({ queryKey: ["gallery", "museums"] });
      dispatch(showToast("작품 등록이 완료되었습니다. 현재 대기 상태입니다."));
    },
    onError: () => {
      setUploadStage("idle");
      dispatch(showToast("작품 등록 중 오류가 발생했습니다."));
    },
  });

  const deleteArtworkMutation = useMutation({
    mutationFn: async (museumArtworkId: number) => {
      if (!activeSelectedMuseumId) {
        return { error: "뮤지엄을 먼저 선택해주세요." };
      }
      return deleteMyMuseumArtwork(activeSelectedMuseumId, museumArtworkId);
    },
    onSuccess: (result) => {
      if (result.error) {
        dispatch(showToast(result.error));
        return;
      }
      queryClient.invalidateQueries({
        queryKey: ["my", "museums", activeSelectedMuseumId, "artworks"],
      });
      queryClient.invalidateQueries({ queryKey: ["my", "museums"] });
      queryClient.invalidateQueries({ queryKey: ["gallery", "museums"] });
      setArtworkToDelete(null);
      dispatch(showToast("작품을 삭제했습니다."));
    },
    onError: () => dispatch(showToast("작품 삭제 중 오류가 발생했습니다.")),
  });

  if (!isLoggedIn) {
    return (
      <section className="museum-grain relative min-h-screen overflow-x-hidden bg-[var(--canvas)] text-[color:var(--canvas-ink)]">
        <main id="main-content" tabIndex={-1} className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 pb-36 pt-10 md:px-8">
          <OverviewStyleHeader title="내 전시실" subtitle="Curator studio" headingAs="p" />
          <article className="museum-panel mt-12 max-w-4xl border-x-0 px-7 py-12 md:px-10">
            <p className="museum-kicker">Private curation</p>
            <h1 className="mt-4 font-[var(--font-display)] text-4xl md:text-5xl">로그인 후 전시를 시작하세요</h1>
            <p className="mt-5 max-w-2xl break-keep text-sm leading-7 text-[color:var(--muted)]">
              내 뮤지엄은 개인 전시관 생성, 작품 업로드, 공개 여부 설정을 관리하는 공간입니다.
              로그인 후 전시관을 구성해보세요.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="bg-[color:var(--accent)] px-6 py-3 text-sm text-white transition hover:brightness-95"
              >
                로그인 이동
              </button>
              <button
                type="button"
                onClick={() => router.push(APP_ROUTES.galleryLobby)}
                className="min-h-11 border border-[color:var(--line)] px-6 py-3 text-sm text-[color:var(--muted)] transition hover:border-[color:var(--line-strong)] hover:text-white"
              >
                갤러리 홈으로
              </button>
            </div>
          </article>
        </main>
        <CinematicBottomNav activeTab="gallery" layout="fixed" />
      </section>
    );
  }

  return (
    <section className="museum-grain relative min-h-screen overflow-x-hidden bg-[var(--canvas)] text-[color:var(--canvas-ink)]">
      <main id="main-content" tabIndex={-1} className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 pb-36 pt-10 md:px-8">
        <OverviewStyleHeader title="내 전시실" subtitle="Curator studio" />

        <section aria-label="전시실 현황" className="mt-8 grid grid-cols-3 border-y border-[color:var(--line)]">
          <article className="border-r border-[color:var(--line)] px-3 py-5 md:px-5">
            <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--muted)]">전시실</p>
            <p className="mt-2 font-[var(--font-display)] text-3xl">{museums.length}</p>
          </article>
          <article className="border-r border-[color:var(--line)] px-3 py-5 md:px-5">
            <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--muted)]">공개 중</p>
            <p className="mt-2 font-[var(--font-display)] text-3xl">{publicMuseumCount}</p>
          </article>
          <article className="px-3 py-5 md:px-5">
            <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--muted)]">소장 작품</p>
            <p className="mt-2 font-[var(--font-display)] text-3xl">{totalArtworkCount}</p>
          </article>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <article className="museum-panel p-5">
              <p className="museum-kicker">Exhibition rooms</p>
              <h2 className="mt-2 font-[var(--font-display)] text-3xl">전시실 선택</h2>
              {museumsQuery.isLoading ? (
                <div className="mt-4 space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-14 w-full bg-white/8" />
                  ))}
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {museums.map((museum, index) => (
                    <motion.button
                      type="button"
                      key={museum.museumId}
                      {...staggeredFadeUpMotion(index + 1, reduceMotion)}
                      onClick={() => setSelectedMuseumId(museum.museumId)}
                      className={`w-full border px-4 py-3 text-left text-sm transition ${
                        museum.museumId === activeSelectedMuseumId
                          ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-white"
                          : "border-[color:var(--line)] text-[color:var(--muted)] hover:border-[color:var(--line-strong)] hover:text-white"
                      }`}
                    >
                      <p className="font-medium">{museum.name}</p>
                      <p className="mt-1 text-xs text-[color:var(--muted)]">
                        작품 {museum.artworkCount}점 · {museum.isPublic ? "공개" : "비공개"}
                      </p>
                    </motion.button>
                  ))}
                  {museums.length === 0 && (
                    <p className="border border-dashed border-[color:var(--line)] px-4 py-4 text-sm text-[color:var(--muted)]">
                      아직 만든 뮤지엄이 없습니다.
                    </p>
                  )}
                  {museumsError ? <p className="text-xs text-rose-300">{museumsError}</p> : null}
                </div>
              )}
            </article>

            <article className="museum-panel p-5">
              <p className="museum-kicker">New room</p>
              <h2 className="mt-2 font-[var(--font-display)] text-2xl">새 전시실</h2>
              <div className="mt-4 space-y-3">
                <input
                  value={createForm.name}
                  aria-label="새 전시실 이름"
                  maxLength={100}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="뮤지엄 이름"
                  className="museum-field px-3 text-sm"
                />
                <textarea
                  value={createForm.description}
                  aria-label="새 전시실 설명"
                  maxLength={1000}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                  placeholder="뮤지엄 설명"
                  className="museum-field min-h-24 px-3 py-2 text-sm"
                />
                <p className="border-l border-[var(--accent)] pl-3 text-xs leading-5 text-[color:var(--muted)]">
                  전시실은 안전한 초안으로 생성됩니다. 작품 심사 후 큐레이션 스튜디오에서 공개하거나 오픈 일정을 예약하세요.
                </p>
                <button
                  type="button"
                  onClick={() => createMuseumMutation.mutate()}
                  disabled={createMuseumMutation.isPending}
                  className="museum-button-primary w-full px-4 py-3 text-sm"
                >
                  {createMuseumMutation.isPending ? "생성 중..." : "뮤지엄 생성"}
                </button>
              </div>
            </article>
          </aside>

          <div className="space-y-5">
            <article className="museum-panel p-6">
              {selectedMuseum ? (
                <>
                  <p className="museum-kicker">Room settings</p>
                  <h2 className="mt-2 font-[var(--font-display)] text-3xl">전시실 설정</h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <input
                      value={editForm.name}
                      aria-label="전시실 이름"
                      maxLength={100}
                      onChange={(event) => updateEditFormField("name", event.target.value)}
                      placeholder="뮤지엄 이름"
                      className="museum-field px-3 text-sm"
                    />
                    <div className="museum-field flex items-center px-3 text-sm text-[color:var(--muted)]">
                      공개 상태: {selectedMuseum.publishStatus === "SCHEDULED" ? "오픈 예정" : selectedMuseum.isPublic ? "공개" : "초안"}
                    </div>
                  </div>
                  <textarea
                    value={editForm.description}
                    aria-label="전시실 설명"
                    maxLength={1000}
                    onChange={(event) => updateEditFormField("description", event.target.value)}
                    placeholder="뮤지엄 설명"
                    className="museum-field mt-3 min-h-24 px-3 py-2 text-sm"
                  />
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/gallery/my/${selectedMuseum.museumId}/curate`}
                      className="border border-[var(--accent)] px-5 py-2 text-sm text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-[#111]"
                    >
                      큐레이션 스튜디오
                    </Link>
                    <button
                      type="button"
                      onClick={() => updateMuseumMutation.mutate()}
                      disabled={updateMuseumMutation.isPending}
                      className="museum-button-primary px-5 py-2 text-sm"
                    >
                      저장
                    </button>
                    <button
                      type="button"
                      onClick={() => setMuseumToDelete(activeSelectedMuseumId)}
                      disabled={deleteMuseumMutation.isPending}
                      className="border border-rose-300/40 bg-rose-300/15 px-4 py-2 text-sm text-rose-200 transition hover:brightness-95 disabled:opacity-60"
                    >
                      뮤지엄 삭제
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-300">
                  좌측에서 뮤지엄을 선택하거나 새로 생성하세요.
                </p>
              )}
            </article>

            <article className="museum-panel p-6">
              <p className="museum-kicker">Collection desk</p>
              <h2 className="mt-2 font-[var(--font-display)] text-3xl">작품 등록과 심사 상태</h2>
              {!activeSelectedMuseumId ? (
                <p className="mt-4 text-sm text-slate-300">
                  뮤지엄을 선택하면 작품을 업로드할 수 있습니다.
                </p>
              ) : (
                <>
                  <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <div className="border border-white/14 bg-white/8 p-3">
                      <p className="text-xs font-semibold text-slate-200">작품 제목</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">전시 리스트에 노출될 제목</p>
                      <input
                        value={artworkForm.title}
                        aria-label="작품 제목"
                        maxLength={200}
                        onChange={(event) =>
                          setArtworkForm((prev) => ({ ...prev, title: event.target.value }))
                        }
                        placeholder="작품 제목 입력"
                        className="museum-field mt-2 px-3 text-sm"
                      />
                    </div>

                    <div className="border border-white/14 bg-white/8 p-3">
                      <input
                        id="museum-artwork-file"
                        type="file"
                        accept="image/*"
                        onClick={(event) => {
                          event.currentTarget.value = "";
                        }}
                        onChange={(event) => setArtworkFile(event.target.files?.[0] ?? null)}
                        className="sr-only"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-slate-200">작품 이미지</p>
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            JPG/PNG 권장, 고해상도 업로드
                          </p>
                        </div>
                        <label
                          htmlFor="museum-artwork-file"
                          className="cursor-pointer border border-[color:var(--accent)] bg-[color:var(--accent-soft)] px-3 py-2 text-[11px] text-[color:var(--accent)] transition hover:bg-[color:var(--accent)] hover:text-[#111]"
                        >
                          파일 선택
                        </label>
                      </div>
                      <p className="mt-2 truncate border border-white/12 bg-white/8 px-3 py-2 text-[11px] text-slate-300">
                        {artworkFile
                          ? `${artworkFile.name} · ${(artworkFile.size / (1024 * 1024)).toFixed(2)} MB`
                          : "선택된 파일 없음"}
                      </p>
                    </div>
                  </div>
                  <textarea
                  value={artworkForm.description}
                  aria-label="작품 설명"
                  maxLength={2000}
                    onChange={(event) =>
                      setArtworkForm((prev) => ({ ...prev, description: event.target.value }))
                    }
                    placeholder="작품 설명"
                  className="museum-field mt-3 min-h-24 px-3 py-2 text-sm"
                  />
                  {isUploading ? (
                    <p className="mt-2 text-xs text-slate-300">
                      {uploadStage === "uploading"
                        ? `이미지 업로드 중... ${uploadProgress}%`
                        : "작품 정보 저장 중..."}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => createArtworkMutation.mutate()}
                    disabled={createArtworkMutation.isPending || isUploading}
                    className="museum-button-primary mt-3 px-5 py-2 text-sm"
                  >
                    작품 업로드
                  </button>

                  {artworksQuery.isLoading ? (
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <Skeleton key={index} className="h-56 w-full bg-white/8" />
                      ))}
                    </div>
                  ) : artworks.length > 0 ? (
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      {artworks.map((artwork, index) => (
                        <motion.article
                          key={artwork.museumArtworkId}
                          {...staggeredFadeUpMotion(index + 8, reduceMotion)}
                          className="overflow-hidden border border-[color:var(--line)] bg-[color:var(--canvas-raised)]"
                        >
                          <div className="relative h-40 w-full">
                            <Image
                              src={artwork.imageUrl}
                              alt={artwork.title}
                              fill
                              unoptimized
                              sizes="(max-width: 768px) 100vw, 50vw"
                              className="object-cover"
                            />
                          </div>
                          <div className="p-4">
                            <h4 className="font-medium text-slate-100">{artwork.title}</h4>
                            <div className="mt-1 flex items-center gap-2 text-xs">
                              <span className="text-slate-400">상태:</span>
                              <span
                                className={`border px-2 py-1 ${
                                  getGalleryModerationTone(artwork.moderationStatus).chipClass
                                }`}
                              >
                                {getGalleryModerationLabel(artwork.moderationStatus)}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setArtworkToDelete(artwork.museumArtworkId)}
                              disabled={deleteArtworkMutation.isPending}
                              className="mt-3 border border-rose-300/40 bg-rose-300/15 px-3 py-1 text-xs text-rose-200 transition hover:brightness-95 disabled:opacity-60"
                            >
                              삭제
                            </button>
                          </div>
                        </motion.article>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-5 border border-white/14 bg-white/8 px-4 py-5 text-sm text-slate-300">
                      등록된 작품이 없습니다.
                    </p>
                  )}
                  {artworksError ? <p className="mt-2 text-xs text-rose-300">{artworksError}</p> : null}
                </>
              )}
            </article>
          </div>
        </section>
      </main>
      <ConfirmDialog
        open={museumToDelete !== null}
        title="전시실을 삭제할까요?"
        description="전시실 안의 모든 작품과 공개 링크가 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다."
        busy={deleteMuseumMutation.isPending}
        onCancel={() => setMuseumToDelete(null)}
        onConfirm={() => {
          if (museumToDelete !== null) {
            deleteMuseumMutation.mutate(museumToDelete);
          }
        }}
      />
      <ConfirmDialog
        open={artworkToDelete !== null}
        title="작품을 삭제할까요?"
        description="전시실과 이미지 저장소에서 이 작품을 제거합니다. 심사 기록도 더 이상 표시되지 않습니다."
        busy={deleteArtworkMutation.isPending}
        onCancel={() => setArtworkToDelete(null)}
        onConfirm={() => {
          if (artworkToDelete !== null) {
            deleteArtworkMutation.mutate(artworkToDelete);
          }
        }}
      />
      <CinematicBottomNav activeTab="gallery" layout="fixed" />
    </section>
  );
}
