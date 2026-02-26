"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import PageShell from "../../components/PageShell";
import TopNav from "../../components/TopNav";
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
import { useAppDispatch } from "../../store/hooks";
import { showToast } from "../../store/uiSlice";
import Reveal from "../../components/motion/Reveal";
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
      <PageShell>
        <TopNav />
        <section className="mt-10 rounded-[28px] border border-[color:var(--line)] bg-white/75 p-8 text-center shadow-[var(--shadow)]">
          <h2 className="font-[var(--font-display)] text-3xl">로그인이 필요합니다</h2>
          <p className="mt-3 text-sm text-[color:var(--muted)]">
            내 뮤지엄을 만들고 관리하려면 로그인하세요.
          </p>
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="mt-6 rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm text-white cursor-pointer transition hover:brightness-95"
          >
            로그인 이동
          </button>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <TopNav />
      <Reveal index={0} className="mt-8">
      <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <article className="rounded-[24px] border border-[color:var(--line)] bg-white/80 p-5 shadow-[var(--shadow)]">
            <h2 className="font-[var(--font-display)] text-2xl">내 뮤지엄</h2>
            {museumsQuery.isLoading ? (
              <div className="mt-4 space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton
                    key={index}
                    className="h-14 w-full rounded-[14px]"
                  />
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
                    className={`w-full rounded-[14px] border px-4 py-3 text-left text-sm cursor-pointer transition hover:brightness-95 ${
                      museum.museumId === activeSelectedMuseumId
                        ? "border-[color:var(--accent)] bg-[color:var(--chip)] text-[color:var(--accent)]"
                        : "border-[color:var(--line)] bg-white text-[color:var(--muted)] hover:border-[color:var(--accent)]"
                    }`}
                  >
                    <p className="font-medium text-[color:var(--canvas-ink)]">{museum.name}</p>
                    <p className="mt-1 text-xs text-[color:var(--muted)]">
                      작품 {museum.artworkCount}점 · {museum.isPublic ? "공개" : "비공개"}
                    </p>
                  </motion.button>
                ))}
                {museums.length === 0 && (
                  <p className="rounded-[14px] border border-[color:var(--line)] bg-white px-4 py-4 text-sm text-[color:var(--muted)]">
                    아직 만든 뮤지엄이 없습니다.
                  </p>
                )}
                {museumsError && (
                  <p className="text-xs text-red-500">{museumsError}</p>
                )}
              </div>
            )}
          </article>

          <article className="rounded-[24px] border border-[color:var(--line)] bg-white/80 p-5 shadow-[var(--shadow)]">
            <h3 className="font-semibold">뮤지엄 생성</h3>
            <div className="mt-3 space-y-3">
              <input
                value={createForm.name}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="뮤지엄 이름"
                className="h-11 w-full rounded-[12px] border border-[color:var(--line)] bg-white px-3 text-sm outline-none focus:border-[color:var(--accent)]"
              />
              <textarea
                value={createForm.description}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="뮤지엄 설명"
                className="min-h-24 w-full rounded-[12px] border border-[color:var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[color:var(--accent)]"
              />
              <label className="flex items-center gap-2 text-xs text-[color:var(--muted)]">
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
                className="w-full rounded-full bg-[color:var(--accent)] px-4 py-3 text-sm text-white cursor-pointer transition hover:brightness-95 disabled:cursor-pointer disabled:hover:brightness-95 disabled:opacity-60"
              >
                {createMuseumMutation.isPending ? "생성 중..." : "뮤지엄 생성"}
              </button>
            </div>
          </article>
        </aside>

        <div className="space-y-5">
          <article className="rounded-[24px] border border-[color:var(--line)] bg-white/80 p-6 shadow-[var(--shadow)]">
            {selectedMuseum ? (
              <>
                <h3 className="font-[var(--font-display)] text-2xl">뮤지엄 설정</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input
                    value={editForm.name}
                    onChange={(event) => updateEditFormField("name", event.target.value)}
                    placeholder="뮤지엄 이름"
                    className="h-11 rounded-[12px] border border-[color:var(--line)] bg-white px-3 text-sm outline-none focus:border-[color:var(--accent)]"
                  />
                  <label className="flex items-center gap-2 rounded-[12px] border border-[color:var(--line)] bg-white px-3 text-sm text-[color:var(--muted)]">
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
                  className="mt-3 min-h-24 w-full rounded-[12px] border border-[color:var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[color:var(--accent)]"
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => updateMuseumMutation.mutate()}
                    disabled={updateMuseumMutation.isPending}
                    className="rounded-full bg-[color:var(--accent)] px-4 py-2 text-sm text-white cursor-pointer transition hover:brightness-95 disabled:cursor-pointer disabled:hover:brightness-95 disabled:opacity-60"
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
                    className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 cursor-pointer transition hover:brightness-95 disabled:cursor-pointer disabled:hover:brightness-95 disabled:opacity-60"
                  >
                    뮤지엄 삭제
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-[color:var(--muted)]">
                좌측에서 뮤지엄을 선택하거나 새로 생성하세요.
              </p>
            )}
          </article>

          <article className="rounded-[24px] border border-[color:var(--line)] bg-white/80 p-6 shadow-[var(--shadow)]">
            <h3 className="font-[var(--font-display)] text-2xl">작품 관리</h3>
            {!activeSelectedMuseumId ? (
              <p className="mt-4 text-sm text-[color:var(--muted)]">
                뮤지엄을 선택하면 작품을 업로드할 수 있습니다.
              </p>
            ) : (
              <>
                <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="h-full rounded-[12px] border border-[color:var(--line)] bg-white/95 p-3">
                    <p className="text-xs font-semibold text-[color:var(--canvas-ink)]">작품 제목</p>
                    <p className="mt-0.5 text-[11px] text-[color:var(--muted)]">
                      전시 리스트에 노출될 제목
                    </p>
                    <input
                      value={artworkForm.title}
                      onChange={(event) =>
                        setArtworkForm((prev) => ({ ...prev, title: event.target.value }))
                      }
                      placeholder="작품 제목 입력"
                      className="mt-2 h-11 w-full rounded-[10px] border border-[color:var(--line)] bg-white px-3 text-sm outline-none focus:border-[color:var(--accent)]"
                    />
                  </div>

                  <div className="h-full rounded-[12px] border border-[color:var(--line)] bg-white/95 p-3">
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
                        <p className="text-xs font-semibold text-[color:var(--canvas-ink)]">작품 이미지</p>
                        <p className="mt-0.5 text-[11px] text-[color:var(--muted)]">
                          JPG/PNG 권장, 고해상도 업로드
                        </p>
                      </div>
                      <label
                        htmlFor="museum-artwork-file"
                        className="cursor-pointer rounded-full border border-[color:var(--accent)] bg-[rgba(11,91,91,0.08)] px-3 py-1.5 text-[11px] text-[color:var(--accent)] transition hover:bg-[rgba(11,91,91,0.14)]"
                      >
                        파일 선택
                      </label>
                    </div>
                    <p className="mt-2 truncate rounded-[10px] border border-[color:var(--line)] bg-[color:var(--chip)] px-3 py-2 text-[11px] text-[color:var(--muted)]">
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
                  className="mt-3 min-h-24 w-full rounded-[12px] border border-[color:var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[color:var(--accent)]"
                />
                {isUploading && (
                  <p className="mt-2 text-xs text-[color:var(--muted)]">
                    {uploadStage === "uploading"
                      ? `이미지 업로드 중... ${uploadProgress}%`
                      : "작품 정보 저장 중..."}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => createArtworkMutation.mutate()}
                  disabled={createArtworkMutation.isPending || isUploading}
                  className="mt-3 rounded-full bg-[color:var(--accent)] px-4 py-2 text-sm text-white cursor-pointer transition hover:brightness-95 disabled:cursor-pointer disabled:hover:brightness-95 disabled:opacity-60"
                >
                  작품 업로드
                </button>

                {artworksQuery.isLoading ? (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton
                        key={index}
                        className="h-56 w-full rounded-[16px]"
                      />
                    ))}
                  </div>
                ) : artworks.length > 0 ? (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {artworks.map((artwork, index) => (
                      <motion.article
                        key={artwork.museumArtworkId}
                        {...staggeredFadeUpMotion(index + 8, reduceMotion)}
                        className="overflow-hidden rounded-[16px] border border-[color:var(--line)] bg-white"
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
                          <h4 className="font-medium">{artwork.title}</h4>
                          <div className="mt-1 flex items-center gap-2 text-xs">
                            <span className="text-[color:var(--muted)]">상태:</span>
                            <span
                              className={`rounded-full border px-2 py-1 ${
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
                            className="mt-3 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs text-red-600 cursor-pointer transition hover:brightness-95 disabled:cursor-pointer disabled:hover:brightness-95 disabled:opacity-60"
                          >
                            삭제
                          </button>
                        </div>
                      </motion.article>
                    ))}
                  </div>
                ) : (
                  <p className="mt-5 rounded-[14px] border border-[color:var(--line)] bg-white px-4 py-5 text-sm text-[color:var(--muted)]">
                    등록된 작품이 없습니다.
                  </p>
                )}
                {artworksError && (
                  <p className="mt-2 text-xs text-red-500">{artworksError}</p>
                )}
              </>
            )}
          </article>
        </div>
      </section>
      </Reveal>
    </PageShell>
  );
}
