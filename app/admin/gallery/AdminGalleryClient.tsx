"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import PageShell from "../../components/PageShell";
import TopNav from "../../components/TopNav";
import { Skeleton } from "../../components/Skeleton";
import {
  createAdminGalleryArtwork,
  createAdminGalleryCategory,
  deleteAdminGalleryArtwork,
  deleteAdminGalleryCategory,
  getAdminGalleryArtworks,
  getAdminGalleryCategories,
  getAdminGalleryHighlights,
  replaceAdminGalleryHighlights,
  updateAdminGalleryCategory,
} from "../../lib/gallery";
import { getUserFromToken, isAdminRole } from "../../lib/auth";
import { uploadImage } from "../../lib/imageUpload";
import { useAppDispatch } from "../../store/hooks";
import { showToast } from "../../store/uiSlice";

type CategoryForm = {
  title: string;
  description: string;
  itemCount: string;
};

const ALL_CATEGORY_KEY = "__ALL__";

type ArtworkForm = {
  title: string;
  artist: string;
  categoryKey: string;
  description: string;
  camera: string;
  lens: string;
  focalLength: string;
  aperture: string;
  shutterSpeed: string;
  iso: string;
  colorFrom: string;
  colorTo: string;
};

type CategoryCreateForm = {
  key: string;
  title: string;
  description: string;
};

const emptyForm: CategoryForm = {
  title: "",
  description: "",
  itemCount: "0",
};

const emptyArtworkForm: ArtworkForm = {
  title: "",
  artist: "",
  categoryKey: "",
  description: "",
  camera: "",
  lens: "",
  focalLength: "",
  aperture: "",
  shutterSpeed: "",
  iso: "",
  colorFrom: "",
  colorTo: "",
};

const emptyCategoryCreateForm: CategoryCreateForm = {
  key: "",
  title: "",
  description: "",
};

export default function AdminGalleryClient() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const role = getUserFromToken()?.role;
  const [selectedKey, setSelectedKey] = useState<string | null>(ALL_CATEGORY_KEY);
  const [categoryDrafts, setCategoryDrafts] = useState<Record<string, CategoryForm>>({});
  const [highlightDraftIds, setHighlightDraftIds] = useState<number[] | null>(null);
  const [artworkForm, setArtworkForm] = useState<ArtworkForm>(emptyArtworkForm);
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [artworkUploadStage, setArtworkUploadStage] = useState<"idle" | "uploading" | "saving">("idle");
  const [artworkUploadProgress, setArtworkUploadProgress] = useState(0);
  const [artworkUploadError, setArtworkUploadError] = useState<string | null>(null);
  const [deletingArtworkId, setDeletingArtworkId] = useState<number | null>(null);
  const [categoryCreateForm, setCategoryCreateForm] = useState<CategoryCreateForm>(emptyCategoryCreateForm);
  const [deletingCategoryKey, setDeletingCategoryKey] = useState<string | null>(null);

  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ["admin", "gallery", "categories"],
    queryFn: getAdminGalleryCategories,
  });
  const { data: highlightsData, isLoading: highlightsLoading } = useQuery({
    queryKey: ["admin", "gallery", "highlights"],
    queryFn: getAdminGalleryHighlights,
  });
  const { data: artworksData, isLoading: artworksLoading } = useQuery({
    queryKey: ["admin", "gallery", "artworks"],
    queryFn: getAdminGalleryArtworks,
  });

  const categories = useMemo(() => categoriesData?.data ?? [], [categoriesData?.data]);
  const categoriesError = categoriesData?.error;
  const highlights = useMemo(() => highlightsData?.data ?? [], [highlightsData?.data]);
  const highlightsError = highlightsData?.error;
  const artworks = useMemo(() => artworksData?.data ?? [], [artworksData?.data]);
  const artworksError = artworksData?.error;

  const activeSelectedKey = useMemo(() => {
    if (selectedKey === ALL_CATEGORY_KEY) {
      return ALL_CATEGORY_KEY;
    }
    if (categories.length === 0) {
      return null;
    }
    if (selectedKey && categories.some((category) => category.key === selectedKey)) {
      return selectedKey;
    }
    return categories[0].key;
  }, [categories, selectedKey]);
  const isAllSelected = activeSelectedKey === ALL_CATEGORY_KEY;

  const selectedCategory = useMemo(
    () => {
      if (!activeSelectedKey || activeSelectedKey === ALL_CATEGORY_KEY) {
        return null;
      }
      return categories.find((category) => category.key === activeSelectedKey) ?? null;
    },
    [categories, activeSelectedKey],
  );

  const form = useMemo(() => {
    if (!activeSelectedKey || !selectedCategory) {
      return emptyForm;
    }
    const draft = categoryDrafts[activeSelectedKey];
    if (draft) {
      return draft;
    }
    return {
      title: selectedCategory.title,
      description: selectedCategory.description ?? "",
      itemCount: String(selectedCategory.itemCount),
    };
  }, [activeSelectedKey, categoryDrafts, selectedCategory]);

  const syncedHighlightIds = useMemo(
    () => highlights.map((highlight) => highlight.artworkId),
    [highlights],
  );
  const effectiveHighlightIds = useMemo(
    () => highlightDraftIds ?? syncedHighlightIds,
    [highlightDraftIds, syncedHighlightIds],
  );
  const artworkMap = useMemo(
    () => new Map(artworks.map((artwork) => [artwork.artworkId, artwork])),
    [artworks],
  );
  const highlightIdSet = useMemo(
    () => new Set(effectiveHighlightIds),
    [effectiveHighlightIds],
  );
  const highlightedArtworks = useMemo(
    () =>
      effectiveHighlightIds.map((artworkId) => ({
        artworkId,
        artwork: artworkMap.get(artworkId) ?? null,
      })),
    [artworkMap, effectiveHighlightIds],
  );
  const isHighlightDirty = useMemo(() => {
    if (highlightDraftIds === null) {
      return false;
    }
    if (highlightDraftIds.length !== syncedHighlightIds.length) {
      return true;
    }
    return highlightDraftIds.some((id, index) => id !== syncedHighlightIds[index]);
  }, [highlightDraftIds, syncedHighlightIds]);
  const defaultArtworkCategoryKey = useMemo(() => {
    if (
      activeSelectedKey &&
      activeSelectedKey !== ALL_CATEGORY_KEY &&
      categories.some((category) => category.key === activeSelectedKey)
    ) {
      return activeSelectedKey;
    }
    return categories[0]?.key ?? "";
  }, [activeSelectedKey, categories]);
  const artworkCategoryKey = useMemo(
    () => artworkForm.categoryKey || defaultArtworkCategoryKey,
    [artworkForm.categoryKey, defaultArtworkCategoryKey],
  );
  const filteredArtworks = useMemo(() => {
    if (!activeSelectedKey || activeSelectedKey === ALL_CATEGORY_KEY) {
      return artworks;
    }
    return artworks.filter((artwork) => artwork.categoryKey === activeSelectedKey);
  }, [activeSelectedKey, artworks]);
  const isArtworkUploading = artworkUploadStage === "uploading" || artworkUploadStage === "saving";

  const updateFormField = (field: keyof CategoryForm, value: string) => {
    if (!activeSelectedKey || activeSelectedKey === ALL_CATEGORY_KEY) {
      return;
    }
    setCategoryDrafts((prev) => ({
      ...prev,
      [activeSelectedKey]: {
        ...form,
        [field]: value,
      },
    }));
  };

  const updateArtworkField = (field: keyof ArtworkForm, value: string) => {
    setArtworkForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateCategoryCreateField = (
    field: keyof CategoryCreateForm,
    value: string,
  ) => {
    setCategoryCreateForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const toggleHighlightArtwork = (artworkId: number) => {
    setHighlightDraftIds((prev) => {
      const base = prev ?? syncedHighlightIds;
      if (base.includes(artworkId)) {
        return base.filter((id) => id !== artworkId);
      }
      return [...base, artworkId];
    });
  };

  const moveHighlightArtwork = (artworkId: number, direction: -1 | 1) => {
    setHighlightDraftIds((prev) => {
      const base = [...(prev ?? syncedHighlightIds)];
      const currentIndex = base.indexOf(artworkId);
      if (currentIndex < 0) {
        return base;
      }
      const nextIndex = currentIndex + direction;
      if (nextIndex < 0 || nextIndex >= base.length) {
        return base;
      }
      [base[currentIndex], base[nextIndex]] = [base[nextIndex], base[currentIndex]];
      return base;
    });
  };

  const updateCategoryMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCategory) {
        return { data: null, error: "수정할 카테고리를 선택해주세요." };
      }
      return updateAdminGalleryCategory(selectedCategory.key, {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        itemCount: Number(form.itemCount),
      });
    },
    onSuccess: (result) => {
      if (result.error) {
        dispatch(showToast(result.error));
        return;
      }
      if (selectedCategory) {
        setCategoryDrafts((prev) => {
          const next = { ...prev };
          delete next[selectedCategory.key];
          return next;
        });
      }
      queryClient.invalidateQueries({ queryKey: ["admin", "gallery", "categories"] });
      queryClient.invalidateQueries({ queryKey: ["gallery", "lobby"] });
      dispatch(showToast("카테고리 수정 완료"));
    },
    onError: () => {
      dispatch(showToast("카테고리 수정 중 오류가 발생했습니다."));
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async () => {
      if (!categoryCreateForm.key.trim()) {
        return { data: null, error: "카테고리 키를 입력해주세요." };
      }
      if (!categoryCreateForm.title.trim()) {
        return { data: null, error: "카테고리 제목을 입력해주세요." };
      }
      return createAdminGalleryCategory({
        key: categoryCreateForm.key.trim(),
        title: categoryCreateForm.title.trim(),
        description: categoryCreateForm.description.trim() || undefined,
      });
    },
    onSuccess: (result) => {
      if (result.error) {
        dispatch(showToast(result.error));
        return;
      }
      const createdKey = result.data?.key ?? null;
      setCategoryCreateForm(emptyCategoryCreateForm);
      queryClient.invalidateQueries({ queryKey: ["admin", "gallery", "categories"] });
      queryClient.invalidateQueries({ queryKey: ["gallery"] });
      if (createdKey) {
        setSelectedKey(createdKey);
      }
      dispatch(showToast("카테고리 생성 완료"));
    },
    onError: () => {
      dispatch(showToast("카테고리 생성 중 오류가 발생했습니다."));
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (key: string) => {
      setDeletingCategoryKey(key);
      return deleteAdminGalleryCategory(key);
    },
    onSuccess: (result) => {
      if (result.error) {
        dispatch(showToast(result.error));
        return;
      }
      setSelectedKey(ALL_CATEGORY_KEY);
      queryClient.invalidateQueries({ queryKey: ["admin", "gallery", "categories"] });
      queryClient.invalidateQueries({ queryKey: ["gallery"] });
      dispatch(showToast("카테고리 삭제 완료"));
    },
    onError: () => {
      dispatch(showToast("카테고리 삭제 중 오류가 발생했습니다."));
    },
    onSettled: () => {
      setDeletingCategoryKey(null);
    },
  });

  const replaceHighlightsMutation = useMutation({
    mutationFn: async () => {
      if (effectiveHighlightIds.length === 0) {
        return { data: [], error: "하이라이트 작품을 최소 1개 선택해주세요." };
      }
      return replaceAdminGalleryHighlights(effectiveHighlightIds);
    },
    onSuccess: (result) => {
      if (result.error) {
        dispatch(showToast(result.error));
        return;
      }
      setHighlightDraftIds(result.data.map((highlight) => highlight.artworkId));
      queryClient.invalidateQueries({ queryKey: ["admin", "gallery", "highlights"] });
      queryClient.invalidateQueries({ queryKey: ["gallery", "lobby"] });
      dispatch(showToast("하이라이트 순서 수정 완료"));
    },
    onError: () => {
      dispatch(showToast("하이라이트 수정 중 오류가 발생했습니다."));
    },
  });

  const createArtworkMutation = useMutation({
    mutationFn: async () => {
      if (!artworkForm.title.trim()) {
        return { data: null, error: "작품 제목을 입력해주세요." };
      }
      if (!artworkForm.artist.trim()) {
        return { data: null, error: "작가명을 입력해주세요." };
      }
      if (!artworkCategoryKey) {
        return { data: null, error: "카테고리를 선택해주세요." };
      }
      if (!artworkFile) {
        return { data: null, error: "업로드할 이미지를 선택해주세요." };
      }

      setArtworkUploadStage("uploading");
      setArtworkUploadProgress(0);
      const uploadResult = await uploadImage(artworkFile, {
        onProgress: (percent) => setArtworkUploadProgress(percent),
      });
      if (!uploadResult.imageUrl) {
        return { data: null, error: uploadResult.error ?? "이미지 업로드에 실패했습니다." };
      }
      setArtworkUploadStage("saving");

      return createAdminGalleryArtwork({
        title: artworkForm.title.trim(),
        artist: artworkForm.artist.trim(),
        categoryKey: artworkCategoryKey,
        fileName: artworkFile.name,
        imageUrl: uploadResult.imageUrl,
        description: artworkForm.description.trim() || undefined,
        camera: artworkForm.camera.trim() || undefined,
        lens: artworkForm.lens.trim() || undefined,
        focalLength: artworkForm.focalLength.trim() || undefined,
        aperture: artworkForm.aperture.trim() || undefined,
        shutterSpeed: artworkForm.shutterSpeed.trim() || undefined,
        iso: artworkForm.iso.trim() || undefined,
        colorFrom: artworkForm.colorFrom.trim() || undefined,
        colorTo: artworkForm.colorTo.trim() || undefined,
      });
    },
    onSuccess: (result) => {
      if (result.error) {
        setArtworkUploadStage("idle");
        setArtworkUploadError(result.error);
        dispatch(showToast(result.error));
        return;
      }
      setArtworkForm({
        ...emptyArtworkForm,
        categoryKey: artworkCategoryKey,
      });
      setArtworkFile(null);
      setArtworkUploadError(null);
      setArtworkUploadStage("idle");
      setArtworkUploadProgress(0);
      queryClient.invalidateQueries({ queryKey: ["admin", "gallery", "artworks"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "gallery", "categories"] });
      queryClient.invalidateQueries({ queryKey: ["gallery"] });
      dispatch(showToast("작품 추가 완료"));
    },
    onError: () => {
      setArtworkUploadStage("idle");
      setArtworkUploadError("이미지 업로드 또는 작품 추가 중 오류가 발생했습니다.");
      dispatch(showToast("작품 추가 중 오류가 발생했습니다."));
    },
  });

  const deleteArtworkMutation = useMutation({
    mutationFn: async (artworkId: number) => {
      setDeletingArtworkId(artworkId);
      return deleteAdminGalleryArtwork(artworkId);
    },
    onSuccess: (result) => {
      if (result.error) {
        dispatch(showToast(result.error));
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["admin", "gallery", "artworks"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "gallery", "highlights"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "gallery", "categories"] });
      queryClient.invalidateQueries({ queryKey: ["gallery"] });
      dispatch(showToast("작품 삭제 완료"));
    },
    onError: () => {
      dispatch(showToast("작품 삭제 중 오류가 발생했습니다."));
    },
    onSettled: () => {
      setDeletingArtworkId(null);
    },
  });

  if (!isAdminRole(role)) {
    return (
      <PageShell>
        <TopNav />
        <section className="mt-10 rounded-[28px] border border-[color:var(--line)] bg-white/75 p-8 shadow-[var(--shadow)]">
          <p className="text-sm text-[color:var(--muted)]">관리자 권한이 필요합니다.</p>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <TopNav />
      <section className="mt-10 grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="rounded-[28px] border border-[color:var(--line)] bg-white/80 p-6 shadow-[var(--shadow)] xl:sticky xl:top-24 xl:max-h-[calc(100vh-8.5rem)] xl:overflow-y-auto">
          <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--accent)]">Admin</p>
          <h2 className="mt-2 font-[var(--font-display)] text-2xl">Gallery Categories</h2>

          {categoriesLoading ? (
            <div className="mt-6 grid gap-2">
              <Skeleton className="h-11 rounded-full" />
              <Skeleton className="h-11 rounded-full" />
              <Skeleton className="h-11 rounded-full" />
            </div>
          ) : (
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  isAllSelected
                    ? "border-[color:var(--accent)] bg-[color:var(--chip)] text-[color:var(--canvas-ink)]"
                    : "border-[color:var(--line)] bg-white/85 text-[color:var(--muted)] hover:border-[color:var(--accent)] hover:text-[color:var(--canvas-ink)]"
                }`}
                onClick={() => setSelectedKey(ALL_CATEGORY_KEY)}
              >
                ALL · 전체
              </button>
              {categories.map((category) => (
                <button
                  key={category.key}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    activeSelectedKey === category.key
                      ? "border-[color:var(--accent)] bg-[color:var(--chip)] text-[color:var(--canvas-ink)]"
                      : "border-[color:var(--line)] bg-white/85 text-[color:var(--muted)] hover:border-[color:var(--accent)] hover:text-[color:var(--canvas-ink)]"
                  }`}
                  onClick={() => setSelectedKey(category.key)}
                >
                  {category.title}
                </button>
              ))}
              {categories.length === 0 && (
                <p className="w-full rounded-[14px] border border-[color:var(--line)] bg-white/80 px-4 py-3 text-sm text-[color:var(--muted)]">
                  카테고리가 없습니다.
                </p>
              )}
            </div>
          )}

          {categoriesError && (
            <p className="mt-4 text-xs text-[color:var(--accent-2)]">카테고리 조회 실패: {categoriesError}</p>
          )}

        </aside>

        <div className="grid min-w-0 gap-6">
          <section className="min-w-0 rounded-[28px] border border-[color:var(--line)] bg-white/80 p-6 shadow-[var(--shadow)]">
            <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--accent)]">Category Edit</p>
            <h1 className="mt-2 font-[var(--font-display)] text-3xl">카테고리 수정</h1>
            {isAllSelected && (
              <p className="mt-2 text-sm text-[color:var(--muted)]">
                전체 선택 중입니다. 카테고리 편집은 개별 카테고리를 선택한 뒤 진행하세요.
              </p>
            )}

            <div className="mt-6 grid gap-4">
              <label className="grid gap-2 text-sm">
                <span>제목</span>
                <input
                  className="rounded-[14px] border border-[color:var(--line)] bg-white px-4 py-3"
                  value={form.title}
                  onChange={(event) => updateFormField("title", event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span>설명</span>
                <textarea
                  className="min-h-20 rounded-[14px] border border-[color:var(--line)] bg-white px-4 py-3"
                  value={form.description}
                  onChange={(event) => updateFormField("description", event.target.value)}
                />
              </label>
              <div className="grid gap-3">
                <label className="grid gap-2 text-sm">
                  <span>작품 수</span>
                  <input
                    readOnly
                    className="rounded-[14px] border border-[color:var(--line)] bg-[color:var(--chip)] px-4 py-3 text-[color:var(--muted)]"
                    value={form.itemCount}
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  className="w-fit rounded-full bg-[color:var(--accent)] px-6 py-3 text-sm text-white shadow-[var(--shadow)] disabled:opacity-60"
                  onClick={() => updateCategoryMutation.mutate()}
                  disabled={updateCategoryMutation.isPending || !selectedCategory}
                >
                  {updateCategoryMutation.isPending ? "저장 중..." : "카테고리 저장"}
                </button>
                <button
                  className="w-fit rounded-full border border-[color:var(--line)] px-6 py-3 text-sm text-[color:var(--muted)] transition hover:border-[color:var(--accent-2)] hover:text-[color:var(--accent-2)] disabled:opacity-60"
                  onClick={() => {
                    if (!selectedCategory) {
                      return;
                    }
                    deleteCategoryMutation.mutate(selectedCategory.key);
                  }}
                  disabled={
                    !selectedCategory ||
                    (deleteCategoryMutation.isPending &&
                      deletingCategoryKey === selectedCategory?.key)
                  }
                >
                  {deleteCategoryMutation.isPending &&
                  deletingCategoryKey === selectedCategory?.key
                    ? "삭제 중..."
                    : "카테고리 삭제"}
                </button>
              </div>
            </div>
          </section>

          <section className="min-w-0 rounded-[28px] border border-[color:var(--line)] bg-white/80 p-6 shadow-[var(--shadow)]">
            <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--accent)]">Category Create</p>
            <h2 className="mt-2 font-[var(--font-display)] text-2xl">카테고리 생성</h2>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              새 카테고리를 생성하면 좌측 카테고리 목록에 즉시 반영됩니다.
            </p>

            <div className="mt-4 grid gap-2">
              <input
                className="rounded-[12px] border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
                value={categoryCreateForm.key}
                onChange={(event) => updateCategoryCreateField("key", event.target.value)}
                placeholder="key (예: minimal)"
              />
              <input
                className="rounded-[12px] border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
                value={categoryCreateForm.title}
                onChange={(event) => updateCategoryCreateField("title", event.target.value)}
                placeholder="title"
              />
              <textarea
                className="min-h-16 rounded-[12px] border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
                value={categoryCreateForm.description}
                onChange={(event) => updateCategoryCreateField("description", event.target.value)}
                placeholder="description"
              />
              <button
                className="w-fit rounded-full bg-[color:var(--accent)] px-4 py-2 text-xs text-white shadow-[var(--shadow)] disabled:opacity-60"
                onClick={() => createCategoryMutation.mutate()}
                disabled={createCategoryMutation.isPending}
              >
                {createCategoryMutation.isPending ? "생성 중..." : "카테고리 생성"}
              </button>
            </div>
          </section>

          <section className="min-w-0 rounded-[28px] border border-[color:var(--line)] bg-white/80 p-6 shadow-[var(--shadow)]">
            <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--accent)]">Highlight Edit</p>
            <h2 className="mt-2 font-[var(--font-display)] text-2xl">하이라이트 순서 수정</h2>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              작품 목록에서 하이라이트를 직접 부여하고, 아래 목록에서 순서를 조정하세요.
            </p>

            {highlightsLoading ? (
              <div className="mt-4 grid gap-3">
                <Skeleton className="h-16 rounded-[12px]" />
                <Skeleton className="h-16 rounded-[12px]" />
              </div>
            ) : (
              <div className="mt-4 grid max-h-64 gap-2 overflow-y-auto pr-1 text-sm">
                {highlightedArtworks.map((item, index) => (
                  <div
                    key={`highlight-draft-${item.artworkId}-${index}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[color:var(--line)] bg-white/90 px-3 py-2"
                  >
                    <div className="text-sm">
                      <p className="font-semibold text-[color:var(--canvas-ink)]">
                        #{index + 1} · {item.artwork ? item.artwork.title : `작품 ${item.artworkId}`}
                      </p>
                      <p className="text-xs text-[color:var(--muted)]">
                        ID {item.artworkId}
                        {item.artwork ? ` · ${item.artwork.artist}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="rounded-full border border-[color:var(--line)] px-3 py-1 text-xs text-[color:var(--muted)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] disabled:opacity-60"
                        onClick={() => moveHighlightArtwork(item.artworkId, -1)}
                        disabled={index === 0}
                      >
                        위로
                      </button>
                      <button
                        className="rounded-full border border-[color:var(--line)] px-3 py-1 text-xs text-[color:var(--muted)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] disabled:opacity-60"
                        onClick={() => moveHighlightArtwork(item.artworkId, 1)}
                        disabled={index === highlightedArtworks.length - 1}
                      >
                        아래로
                      </button>
                      <button
                        className="rounded-full border border-[color:var(--line)] px-3 py-1 text-xs text-[color:var(--accent-2)] transition hover:border-[color:var(--accent-2)]"
                        onClick={() => toggleHighlightArtwork(item.artworkId)}
                      >
                        제거
                      </button>
                    </div>
                  </div>
                ))}
                {highlightedArtworks.length === 0 && (
                  <div className="rounded-[12px] border border-[color:var(--line)] bg-white/90 px-3 py-2 text-[color:var(--muted)]">
                    선택된 하이라이트가 없습니다.
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                className="rounded-full border border-[color:var(--line)] px-6 py-3 text-sm text-[color:var(--muted)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] disabled:opacity-60"
                onClick={() => setHighlightDraftIds(null)}
                disabled={replaceHighlightsMutation.isPending || !isHighlightDirty}
              >
                초기화
              </button>
              <button
                className="rounded-full bg-[color:var(--accent)] px-6 py-3 text-sm text-white shadow-[var(--shadow)] disabled:opacity-60"
                onClick={() => replaceHighlightsMutation.mutate()}
                disabled={replaceHighlightsMutation.isPending || !isHighlightDirty}
              >
                {replaceHighlightsMutation.isPending ? "적용 중..." : "하이라이트 저장"}
              </button>
            </div>

            {highlightsError && (
              <p className="mt-3 text-xs text-[color:var(--accent-2)]">하이라이트 조회 실패: {highlightsError}</p>
            )}
          </section>
          <section className="min-w-0 rounded-[28px] border border-[color:var(--line)] bg-white/80 p-6 shadow-[var(--shadow)]">
          <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--accent)]">Artwork Manage</p>
          <h2 className="mt-2 font-[var(--font-display)] text-2xl">작품 추가 / 삭제</h2>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            좌측에서 카테고리를 선택한 뒤 작품을 등록하고, 우측 목록에서 즉시 삭제할 수 있습니다.
          </p>
          <p className="mt-1 text-xs text-[color:var(--muted)]">
            현재 필터: {isAllSelected ? "전체" : (selectedCategory?.title ?? "전체")}
          </p>

          <div className="mt-6 grid gap-4">
            <div className="grid min-w-0 content-start gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm">
                  <span>제목</span>
                  <input
                    className="rounded-[14px] border border-[color:var(--line)] bg-white px-4 py-3"
                    value={artworkForm.title}
                    onChange={(event) => updateArtworkField("title", event.target.value)}
                    placeholder="작품 제목"
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  <span>작가</span>
                  <input
                    className="rounded-[14px] border border-[color:var(--line)] bg-white px-4 py-3"
                    value={artworkForm.artist}
                    onChange={(event) => updateArtworkField("artist", event.target.value)}
                    placeholder="작가명"
                  />
                </label>
              </div>

              <label className="grid gap-2 text-sm">
                <span>이미지 파일</span>
                <input
                  type="file"
                  accept="image/*"
                  className="rounded-[14px] border border-[color:var(--line)] bg-white px-4 py-3"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setArtworkFile(file);
                    setArtworkUploadError(null);
                    setArtworkUploadStage("idle");
                    setArtworkUploadProgress(0);
                  }}
                />
                {artworkFile && (
                  <p className="text-xs text-[color:var(--muted)]">
                    선택 파일: {artworkFile.name}
                  </p>
                )}
              </label>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="grid gap-2 text-sm">
                  <span>카테고리</span>
                  <select
                    className="rounded-[14px] border border-[color:var(--line)] bg-white px-4 py-3"
                    value={artworkCategoryKey}
                    onChange={(event) => updateArtworkField("categoryKey", event.target.value)}
                  >
                    <option value="">카테고리 선택</option>
                    {categories.map((category) => (
                      <option key={`artwork-category-${category.key}`} value={category.key}>
                        {category.title} ({category.key})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm">
                  <span>Color From</span>
                  <input
                    className="rounded-[14px] border border-[color:var(--line)] bg-white px-4 py-3"
                    value={artworkForm.colorFrom}
                    onChange={(event) => updateArtworkField("colorFrom", event.target.value)}
                    placeholder="#ffffff"
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  <span>Color To</span>
                  <input
                    className="rounded-[14px] border border-[color:var(--line)] bg-white px-4 py-3"
                    value={artworkForm.colorTo}
                    onChange={(event) => updateArtworkField("colorTo", event.target.value)}
                    placeholder="#000000"
                  />
                </label>
              </div>

              <label className="grid gap-2 text-sm">
                <span>설명</span>
                <textarea
                  className="min-h-20 rounded-[14px] border border-[color:var(--line)] bg-white px-4 py-3"
                  value={artworkForm.description}
                  onChange={(event) => updateArtworkField("description", event.target.value)}
                />
              </label>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="grid gap-2 text-sm">
                  <span>Camera</span>
                  <input
                    className="rounded-[14px] border border-[color:var(--line)] bg-white px-4 py-3"
                    value={artworkForm.camera}
                    onChange={(event) => updateArtworkField("camera", event.target.value)}
                    placeholder="Sony A7R V"
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  <span>Lens</span>
                  <input
                    className="rounded-[14px] border border-[color:var(--line)] bg-white px-4 py-3"
                    value={artworkForm.lens}
                    onChange={(event) => updateArtworkField("lens", event.target.value)}
                    placeholder="FE 50mm F1.2 GM"
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  <span>Focal Length</span>
                  <input
                    className="rounded-[14px] border border-[color:var(--line)] bg-white px-4 py-3"
                    value={artworkForm.focalLength}
                    onChange={(event) => updateArtworkField("focalLength", event.target.value)}
                    placeholder="50mm"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="grid gap-2 text-sm">
                  <span>Aperture</span>
                  <input
                    className="rounded-[14px] border border-[color:var(--line)] bg-white px-4 py-3"
                    value={artworkForm.aperture}
                    onChange={(event) => updateArtworkField("aperture", event.target.value)}
                    placeholder="f/2.0"
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  <span>Shutter Speed</span>
                  <input
                    className="rounded-[14px] border border-[color:var(--line)] bg-white px-4 py-3"
                    value={artworkForm.shutterSpeed}
                    onChange={(event) => updateArtworkField("shutterSpeed", event.target.value)}
                    placeholder="1/160s"
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  <span>ISO</span>
                  <input
                    className="rounded-[14px] border border-[color:var(--line)] bg-white px-4 py-3"
                    value={artworkForm.iso}
                    onChange={(event) => updateArtworkField("iso", event.target.value)}
                    placeholder="ISO 200"
                  />
                </label>
              </div>

              <button
                className="w-fit rounded-full bg-[color:var(--accent)] px-6 py-3 text-sm text-white shadow-[var(--shadow)] disabled:opacity-60"
                onClick={() => createArtworkMutation.mutate()}
                disabled={createArtworkMutation.isPending || isArtworkUploading}
              >
                {isArtworkUploading
                  ? artworkUploadStage === "uploading"
                    ? `업로드 중... ${artworkUploadProgress}%`
                    : "저장 중..."
                  : createArtworkMutation.isPending
                    ? "추가 중..."
                    : "작품 추가"}
              </button>
              {artworkUploadError && (
                <p className="text-xs text-[color:var(--accent-2)]">{artworkUploadError}</p>
              )}
            </div>

            <div className="min-w-0 rounded-[18px] border border-[color:var(--line)] bg-white/90 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">Current Artworks</p>
              <div className="mt-3 grid gap-2">
                {artworksLoading ? (
                  <div className="grid gap-2">
                    <Skeleton className="h-12 rounded-[12px]" />
                    <Skeleton className="h-12 rounded-[12px]" />
                  </div>
                ) : filteredArtworks.length === 0 ? (
                  <div className="rounded-[12px] border border-[color:var(--line)] bg-white px-4 py-3 text-sm text-[color:var(--muted)]">
                    해당 카테고리에 등록된 작품이 없습니다.
                  </div>
                ) : (
                  filteredArtworks.map((artwork) => {
                    const highlightOrder = effectiveHighlightIds.indexOf(artwork.artworkId);
                    const isHighlighted = highlightOrder >= 0;

                    return (
                      <div
                        key={`admin-artwork-${artwork.artworkId}`}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[color:var(--line)] bg-white px-4 py-3"
                      >
                      <div className="flex items-center gap-3 text-sm">
                        {artwork.imageUrl ? (
                          <img
                            src={artwork.imageUrl}
                            alt={artwork.title}
                            className="h-12 w-12 rounded-[10px] object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-[10px] border border-dashed border-[color:var(--line)] bg-white text-[10px] text-[color:var(--muted)]">
                            없음
                          </div>
                        )}
                        <div>
                          <p className="font-semibold">
                            #{artwork.artworkId} · {artwork.title}
                          </p>
                          <p className="text-xs text-[color:var(--muted)]">
                            {artwork.artist} · {artwork.categoryLabel} ({artwork.categoryKey})
                          </p>
                        </div>
                        {isHighlighted && (
                          <span className="rounded-full border border-[color:var(--accent)] bg-[color:var(--chip)] px-2 py-1 text-[10px] font-semibold text-[color:var(--accent)]">
                            Highlight #{highlightOrder + 1}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className={`rounded-full border px-4 py-2 text-xs transition disabled:opacity-60 ${
                            isHighlighted
                              ? "border-[color:var(--accent)] text-[color:var(--accent)] hover:bg-[color:var(--chip)]"
                              : "border-[color:var(--line)] text-[color:var(--muted)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                          }`}
                          onClick={() => toggleHighlightArtwork(artwork.artworkId)}
                        >
                          {isHighlighted ? "하이라이트 해제" : "하이라이트 추가"}
                        </button>
                        <button
                          className="rounded-full border border-[color:var(--line)] px-4 py-2 text-xs text-[color:var(--muted)] transition hover:border-[color:var(--accent-2)] hover:text-[color:var(--accent-2)] disabled:opacity-60"
                          onClick={() => deleteArtworkMutation.mutate(artwork.artworkId)}
                          disabled={
                            deleteArtworkMutation.isPending && deletingArtworkId === artwork.artworkId
                          }
                        >
                          {deleteArtworkMutation.isPending && deletingArtworkId === artwork.artworkId
                            ? "삭제 중..."
                            : "삭제"}
                        </button>
                      </div>
                    </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

            {artworksError && (
              <p className="mt-3 text-xs text-[color:var(--accent-2)]">작품 조회 실패: {artworksError}</p>
            )}
          </section>
        </div>
      </section>
    </PageShell>
  );
}
