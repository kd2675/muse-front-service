"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import CinematicBottomNav from "../../components/CinematicBottomNav";
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
  isPublic: true,
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
        isPublic: createForm.isPublic,
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
        isPublic: editForm.isPublic,
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
      if (!uploaded.imageUrl) {
        setUploadStage("idle");
        return { data: null, error: uploaded.error ?? "이미지 업로드에 실패했습니다." };
      }

      setUploadStage("saving");
      const result = await createMyMuseumArtwork(activeSelectedMuseumId, {
        title: artworkForm.title.trim(),
        description: artworkForm.description.trim() || undefined,
        fileName: artworkFile.name,
        imageUrl: uploaded.imageUrl,
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
      dispatch(showToast("작품을 삭제했습니다."));
    },
    onError: () => dispatch(showToast("작품 삭제 중 오류가 발생했습니다.")),
  });

  if (!isLoggedIn) {
    return (
      <section className="relative min-h-screen overflow-x-hidden bg-[#121212] text-slate-100">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(84,90,111,0.26),transparent_36%),radial-gradient(circle_at_80%_20%,rgba(73,108,115,0.2),transparent_40%),radial-gradient(circle_at_52%_88%,rgba(120,86,64,0.16),transparent_44%)]" />
        <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 pb-36 pt-10 md:px-8">
          <OverviewStyleHeader title="My Museum" subtitle="Creator Studio" />
          <article className="mt-12 border border-white/16 bg-[rgba(255,255,255,0.05)] px-8 py-10 shadow-[0_18px_52px_rgba(0,0,0,0.35)]">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Private Curation</p>
            <h2 className="mt-3 font-[var(--font-display)] text-4xl italic">로그인이 필요합니다</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300/86">
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
                className="border border-white/24 bg-white/6 px-6 py-3 text-sm text-slate-200 transition hover:border-white/44 hover:bg-white/12"
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
    <section className="relative min-h-screen overflow-x-hidden bg-[#121212] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_10%,rgba(84,90,111,0.24),transparent_34%),radial-gradient(circle_at_86%_20%,rgba(73,108,115,0.18),transparent_40%),radial-gradient(circle_at_52%_84%,rgba(120,86,64,0.14),transparent_42%)]" />
      <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 pb-36 pt-10 md:px-8">
        <OverviewStyleHeader title="My Museum" subtitle="Creator Studio" />

        <section className="mt-7 grid gap-3 sm:grid-cols-3">
          <article className="border border-white/12 bg-white/6 px-4 py-4">
            <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Museums</p>
            <p className="mt-2 text-2xl font-semibold text-slate-100">{museums.length}</p>
          </article>
          <article className="border border-white/12 bg-white/6 px-4 py-4">
            <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Public</p>
            <p className="mt-2 text-2xl font-semibold text-slate-100">{publicMuseumCount}</p>
          </article>
          <article className="border border-white/12 bg-white/6 px-4 py-4">
            <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Artworks</p>
            <p className="mt-2 text-2xl font-semibold text-slate-100">{totalArtworkCount}</p>
          </article>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <article className="border border-white/16 bg-[rgba(255,255,255,0.05)] p-5 shadow-[0_12px_34px_rgba(0,0,0,0.22)]">
              <h2 className="font-[var(--font-display)] text-2xl italic">내 뮤지엄</h2>
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
                          ? "border-[color:var(--accent)] bg-[rgba(11,91,91,0.2)] text-white"
                          : "border-white/14 bg-white/6 text-slate-300 hover:border-white/34 hover:bg-white/10"
                      }`}
                    >
                      <p className="font-medium">{museum.name}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        작품 {museum.artworkCount}점 · {museum.isPublic ? "공개" : "비공개"}
                      </p>
                    </motion.button>
                  ))}
                  {museums.length === 0 && (
                    <p className="border border-white/14 bg-white/6 px-4 py-4 text-sm text-slate-300">
                      아직 만든 뮤지엄이 없습니다.
                    </p>
                  )}
                  {museumsError ? <p className="text-xs text-rose-300">{museumsError}</p> : null}
                </div>
              )}
            </article>

            <article className="border border-white/16 bg-[rgba(255,255,255,0.05)] p-5 shadow-[0_12px_34px_rgba(0,0,0,0.22)]">
              <h3 className="text-sm uppercase tracking-[0.24em] text-slate-400">Create Museum</h3>
              <div className="mt-4 space-y-3">
                <input
                  value={createForm.name}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="뮤지엄 이름"
                  className="h-11 w-full border border-white/16 bg-white/10 px-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-[color:var(--accent)]"
                />
                <textarea
                  value={createForm.description}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                  placeholder="뮤지엄 설명"
                  className="min-h-24 w-full border border-white/16 bg-white/10 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-[color:var(--accent)]"
                />
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={createForm.isPublic}
                    onChange={(event) =>
                      setCreateForm((prev) => ({ ...prev, isPublic: event.target.checked }))
                    }
                  />
                  공개 뮤지엄으로 생성
                </label>
                <button
                  type="button"
                  onClick={() => createMuseumMutation.mutate()}
                  disabled={createMuseumMutation.isPending}
                  className="w-full bg-[color:var(--accent)] px-4 py-3 text-sm text-white transition hover:brightness-95 disabled:opacity-60"
                >
                  {createMuseumMutation.isPending ? "생성 중..." : "뮤지엄 생성"}
                </button>
              </div>
            </article>
          </aside>

          <div className="space-y-5">
            <article className="border border-white/16 bg-[rgba(255,255,255,0.05)] p-6 shadow-[0_14px_36px_rgba(0,0,0,0.26)]">
              {selectedMuseum ? (
                <>
                  <h3 className="font-[var(--font-display)] text-3xl italic">뮤지엄 설정</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <input
                      value={editForm.name}
                      onChange={(event) => updateEditFormField("name", event.target.value)}
                      placeholder="뮤지엄 이름"
                      className="h-11 border border-white/16 bg-white/10 px-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-[color:var(--accent)]"
                    />
                    <label className="flex items-center gap-2 border border-white/16 bg-white/10 px-3 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={editForm.isPublic}
                        onChange={(event) => updateEditFormField("isPublic", event.target.checked)}
                      />
                      공개 뮤지엄
                    </label>
                  </div>
                  <textarea
                    value={editForm.description}
                    onChange={(event) => updateEditFormField("description", event.target.value)}
                    placeholder="뮤지엄 설명"
                    className="mt-3 min-h-24 w-full border border-white/16 bg-white/10 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-[color:var(--accent)]"
                  />
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => updateMuseumMutation.mutate()}
                      disabled={updateMuseumMutation.isPending}
                      className="bg-[color:var(--accent)] px-4 py-2 text-sm text-white transition hover:brightness-95 disabled:opacity-60"
                    >
                      저장
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!activeSelectedMuseumId) {
                          return;
                        }
                        if (!window.confirm("뮤지엄과 작품이 함께 삭제됩니다. 진행할까요?")) {
                          return;
                        }
                        deleteMuseumMutation.mutate(activeSelectedMuseumId);
                      }}
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

            <article className="border border-white/16 bg-[rgba(255,255,255,0.05)] p-6 shadow-[0_14px_36px_rgba(0,0,0,0.26)]">
              <h3 className="font-[var(--font-display)] text-3xl italic">작품 관리</h3>
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
                        onChange={(event) =>
                          setArtworkForm((prev) => ({ ...prev, title: event.target.value }))
                        }
                        placeholder="작품 제목 입력"
                        className="mt-2 h-11 w-full border border-white/16 bg-white/10 px-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-[color:var(--accent)]"
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
                          className="cursor-pointer border border-[color:var(--accent)] bg-[rgba(11,91,91,0.2)] px-3 py-1.5 text-[11px] text-teal-100 transition hover:bg-[rgba(11,91,91,0.34)]"
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
                    onChange={(event) =>
                      setArtworkForm((prev) => ({ ...prev, description: event.target.value }))
                    }
                    placeholder="작품 설명"
                    className="mt-3 min-h-24 w-full border border-white/16 bg-white/10 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-[color:var(--accent)]"
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
                    className="mt-3 bg-[color:var(--accent)] px-4 py-2 text-sm text-white transition hover:brightness-95 disabled:opacity-60"
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
                          className="overflow-hidden border border-white/14 bg-white/8"
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
                              onClick={() => {
                                if (!window.confirm("이 작품을 삭제할까요?")) {
                                  return;
                                }
                                deleteArtworkMutation.mutate(artwork.museumArtworkId);
                              }}
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
      <CinematicBottomNav activeTab="gallery" layout="fixed" />
    </section>
  );
}
