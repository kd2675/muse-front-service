"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CinematicBottomNav from "../../components/CinematicBottomNav";
import OverviewStyleHeader from "../../components/OverviewStyleHeader";
import { Skeleton, SkeletonText } from "../../components/Skeleton";
import {
  getContestDetail,
  getContestEntriesPage,
  getContestRanking,
  getMyEntryCredits,
  purchaseEntryCredit,
  submitContestEntry,
  voteContestEntry,
} from "../../lib/contest";
import { getAccessToken } from "../../lib/auth";
import { uploadImage, type ImageUploadResult } from "../../lib/imageUpload";
import { overlayFadeMotion, popInMotion, staggeredFadeUpMotion } from "../../lib/motion";
import { navigateBack } from "../../lib/navigation";
import {
  getContestEntryStatusLabel,
  getContestPhaseLabel,
  getContestPhaseTone,
} from "../../lib/statusTheme";
import { useBodyScrollLock } from "../../lib/useBodyScrollLock";
import { useAppDispatch } from "../../store/hooks";
import { setPendingPath, showToast } from "../../store/uiSlice";
import type { ContestPhase } from "../../types/contest";

type ContestDetailClientProps = {
  id: number;
};

const MIN_IMAGE_RESOLUTION_PX = 3000;
const MAX_UPLOAD_SIZE_BYTES = 100 * 1024 * 1024;
const ENTRY_PAGE_SIZE = 10;
const DETAIL_VIEW_STATE_STORAGE_PREFIX = "muse:contest:detail:view-state:";
const DETAIL_VIEW_STATE_MAX_AGE_MS = 1000 * 60 * 60 * 6;
const AI_DISCLOSURE_NOTICE = {
  title: "AI 활용 고지 안내",
  summary:
    "「인공지능 발전과 신뢰 기반 조성 등에 관한 기본법」 및 시행령(2026.01.22 시행) 취지에 따라, 생성형 AI를 활용한 결과물은 AI 활용 사실을 이용자가 명확히 인지할 수 있도록 표시·고지가 필요합니다.",
  guide: "AI를 사용한 경우 작품 설명에 사용 도구와 활용 범위를 함께 적어주세요.",
};

type ContestDetailViewState = {
  page: number;
  scrollY: number;
  updatedAt: number;
};

const phaseKicker: Record<ContestPhase, string> = {
  UPCOMING: "Scheduled",
  SUBMISSION: "Submission Live",
  REVIEW: "Curator Review",
  VOTING: "Exhibition Hall",
  ENDED: "Archive Closed",
};

const phaseNote: Record<ContestPhase, string> = {
  UPCOMING: "출품 시작 전 단계입니다. 일정과 규칙을 확인하고 작품을 준비하세요.",
  SUBMISSION: "해당 콘테스트 출품권 결제 후 작품 등록이 가능합니다.",
  REVIEW: "출품 마감 후 심사 단계입니다. 전시 시작 전까지 작품이 비공개로 유지됩니다.",
  VOTING: "전시 공개 단계입니다. 출품작을 감상하고 원하는 작품에 투표할 수 있습니다.",
  ENDED: "콘테스트가 종료되었습니다. 작품 기록과 최종 랭킹을 확인하세요.",
};

async function readImageMeta(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      URL.revokeObjectURL(objectUrl);
      resolve({ width, height });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("이미지 해상도를 확인할 수 없습니다."));
    };
    image.src = objectUrl;
  });
}

function formatNumber(value: number) {
  return value.toLocaleString("ko-KR");
}

function formatSchedule(value?: string | null): string {
  if (!value) {
    return "미정";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.replace("T", " ").slice(0, 16);
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function calculatePeriodProgress(startAt?: string | null, endAt?: string | null): number {
  if (!startAt || !endAt) {
    return 0;
  }
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return 0;
  }
  const now = Date.now();
  if (now <= start) {
    return 0;
  }
  if (now >= end) {
    return 100;
  }
  return Math.round(((now - start) / (end - start)) * 100);
}

function countDaysLeft(endAt?: string | null): number | null {
  if (!endAt) {
    return null;
  }
  const end = new Date(endAt).getTime();
  if (Number.isNaN(end)) {
    return null;
  }
  const diff = Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
}

function resolveUploadError(result: ImageUploadResult): string {
  if (result.errorKind === "TIMEOUT") {
    return "업로드 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.";
  }
  if (result.errorKind === "NETWORK") {
    return "네트워크 연결이 불안정합니다. 연결을 확인해주세요.";
  }
  if (result.errorKind === "HTTP") {
    if (result.status === 413) {
      return "파일 용량이 서버 제한을 초과했습니다.";
    }
    if (result.status === 415) {
      return "지원하지 않는 파일 형식입니다.";
    }
    if (result.status && result.status >= 500) {
      return "이미지 서버 오류가 발생했습니다.";
    }
  }
  return result.error ?? "이미지 업로드에 실패했습니다.";
}

function buildPaginationTokens(totalPages: number, currentPage: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis", totalPages];
  }
  if (currentPage >= totalPages - 3) {
    return [
      1,
      "ellipsis",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }
  return [
    1,
    "ellipsis",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis",
    totalPages,
  ];
}

function readContestDetailViewState(id: number): ContestDetailViewState | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(`${DETAIL_VIEW_STATE_STORAGE_PREFIX}${id}`);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<ContestDetailViewState>;
    if (
      typeof parsed.page !== "number" ||
      typeof parsed.scrollY !== "number" ||
      typeof parsed.updatedAt !== "number"
    ) {
      return null;
    }
    if (Date.now() - parsed.updatedAt > DETAIL_VIEW_STATE_MAX_AGE_MS) {
      return null;
    }
    return {
      page: parsed.page,
      scrollY: parsed.scrollY,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

function writeContestDetailViewState(id: number, state: ContestDetailViewState): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(`${DETAIL_VIEW_STATE_STORAGE_PREFIX}${id}`, JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
}

export default function ContestDetailClient({ id }: ContestDetailClientProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = Boolean(prefersReducedMotion);

  const hasToken = Boolean(getAccessToken());

  const [paymentStep, setPaymentStep] = useState<
    "closed" | "payment" | "processing" | "confirm"
  >("closed");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [pendingVoteEntryId, setPendingVoteEntryId] = useState<string | null>(null);
  const [page, setPage] = useState(() => readContestDetailViewState(id)?.page ?? 1);
  const restoredScrollRef = useRef(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileMeta, setFileMeta] = useState<{
    width: number;
    height: number;
    sizeBytes: number;
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<"idle" | "uploading" | "saving" | "done">(
    "idle",
  );
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  useBodyScrollLock(paymentStep !== "closed");

  const { data: contestData, isLoading: contestLoading } = useQuery({
    queryKey: ["contest", id],
    queryFn: () => getContestDetail(id),
  });
  const contest = contestData?.data;
  const contestError = contestData?.error;

  const { data: creditData } = useQuery({
    queryKey: ["contest", id, "entryCredits"],
    queryFn: () => getMyEntryCredits(id),
    enabled: hasToken,
  });

  const pagedEntriesQuery = useQuery({
    queryKey: ["contest", id, "entries", "submitted", page, ENTRY_PAGE_SIZE],
    queryFn: () =>
      getContestEntriesPage(id, {
        mode: "SUBMITTED_ASC",
        page,
        size: ENTRY_PAGE_SIZE,
      }),
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const activeEntriesData = pagedEntriesQuery.data;
  const entries = useMemo(() => activeEntriesData?.data.items ?? [], [activeEntriesData?.data.items]);
  const entriesError = activeEntriesData?.error;
  const entriesLoading = pagedEntriesQuery.isLoading;
  const totalEntryCount = activeEntriesData?.data.totalElements ?? 0;
  const showEntrySkeleton = entriesLoading && entries.length === 0 && totalEntryCount === 0;
  const totalPages = Math.max(activeEntriesData?.data.totalPages ?? 1, 1);
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const paginationTokens = useMemo(
    () => buildPaginationTokens(totalPages, currentPage),
    [currentPage, totalPages],
  );

  const { data: rankingData, isLoading: rankingLoading } = useQuery({
    queryKey: ["contest", id, "ranking"],
    queryFn: () => getContestRanking(id),
  });
  const ranking = useMemo(() => rankingData?.data ?? [], [rankingData?.data]);
  const rankingError = rankingData?.error;

  const phase = (contest?.phase ?? "UPCOMING") as ContestPhase;
  const phaseTone = getContestPhaseTone(phase);
  const credits = creditData?.data?.credits ?? 0;
  const isSubmissionPhase = phase === "SUBMISSION";
  const isReviewPhase = phase === "REVIEW";
  const isVotingPhase = phase === "VOTING";
  const isEndedPhase = phase === "ENDED";
  const hideArtworkByPhase = phase === "UPCOMING" || phase === "REVIEW";
  const canSubmit = hasToken && isSubmissionPhase && credits > 0;
  const needsCredit = hasToken && isSubmissionPhase && credits <= 0;

  const progressValue = useMemo(() => {
    if (!contest) {
      return 0;
    }
    if (phase === "UPCOMING") {
      return calculatePeriodProgress(contest.submissionStartAt, contest.submissionEndAt);
    }
    if (phase === "SUBMISSION") {
      return calculatePeriodProgress(contest.submissionStartAt, contest.submissionEndAt);
    }
    if (phase === "REVIEW") {
      return calculatePeriodProgress(contest.submissionEndAt, contest.votingStartAt);
    }
    if (phase === "VOTING") {
      return calculatePeriodProgress(contest.votingStartAt, contest.votingEndAt);
    }
    return 100;
  }, [contest, phase]);

  const progressLabel = useMemo(() => {
    if (phase === "UPCOMING") {
      return "Submission Window";
    }
    if (phase === "SUBMISSION") {
      return "Submission Period";
    }
    if (phase === "REVIEW") {
      return "Review Period";
    }
    if (phase === "VOTING") {
      return "전시 기간";
    }
    return "Season Closed";
  }, [phase]);

  const daysLeft = useMemo(() => {
    if (!contest) {
      return null;
    }
    if (phase === "UPCOMING") {
      return countDaysLeft(contest.submissionStartAt);
    }
    if (phase === "SUBMISSION") {
      return countDaysLeft(contest.submissionEndAt);
    }
    if (phase === "REVIEW") {
      return countDaysLeft(contest.votingStartAt);
    }
    if (phase === "VOTING") {
      return countDaysLeft(contest.votingEndAt);
    }
    return 0;
  }, [contest, phase]);

  const rankMap = useMemo(() => new Map(ranking.map((item) => [item.entryId, item.rank])), [ranking]);
  const voteCountMap = useMemo(
    () => new Map(ranking.map((item) => [item.entryId, item.voteCount])),
    [ranking],
  );
  const displayedEntries = entries;
  const topRanking = ranking.slice(0, 3);

  const persistDetailViewState = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    writeContestDetailViewState(id, {
      page,
      scrollY: window.scrollY,
      updatedAt: Date.now(),
    });
  }, [id, page]);

  useEffect(() => {
    if (contestLoading || entriesLoading || restoredScrollRef.current) {
      return;
    }
    const saved = readContestDetailViewState(id);
    if (saved) {
      window.scrollTo({ top: saved.scrollY, behavior: "auto" });
    }
    restoredScrollRef.current = true;
  }, [contestLoading, entriesLoading, id]);

  useEffect(() => {
    if (!restoredScrollRef.current) {
      return;
    }
    persistDetailViewState();
  }, [page, persistDetailViewState]);

  useEffect(() => {
    return () => {
      persistDetailViewState();
    };
  }, [persistDetailViewState]);

  const uploadStatusLabel = useMemo(() => {
    if (uploadStage === "uploading") {
      return `이미지 업로드 중 ${uploadProgress}%`;
    }
    if (uploadStage === "saving") {
      return "출품 정보를 저장 중입니다.";
    }
    if (uploadStage === "done") {
      return "출품 등록이 완료되었습니다.";
    }
    return null;
  }, [uploadProgress, uploadStage]);

  const isUploading = uploadStage === "uploading" || uploadStage === "saving";

  const purchaseMutation = useMutation({
    mutationFn: () => purchaseEntryCredit(id),
    onSuccess: (result) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: ["contest", id, "entryCredits"] });
        setPaymentStep("confirm");
      } else {
        setPaymentStep("payment");
      }
      dispatch(
        showToast(
          result.error
            ? `결제 요청은 되었지만 오류가 있습니다. (${result.error})`
            : "출품권 결제가 완료되었습니다.",
        ),
      );
    },
    onError: () => {
      setPaymentStep("payment");
      dispatch(showToast("출품권 결제에 실패했습니다."));
    },
  });

  const voteMutation = useMutation({
    mutationFn: (entryId: string) => voteContestEntry(id, { entryId }),
    onMutate: (entryId) => {
      setPendingVoteEntryId(entryId);
    },
    onSuccess: (result) => {
      if (result.error || !result.data) {
        dispatch(showToast(result.error ?? "투표에 실패했습니다."));
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["contest", id, "ranking"] });
      dispatch(showToast("투표가 반영되었습니다."));
    },
    onError: () => {
      dispatch(showToast("투표 중 오류가 발생했습니다."));
    },
    onSettled: () => {
      setPendingVoteEntryId(null);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) {
        throw new Error("파일을 선택해주세요.");
      }
      if (!fileMeta) {
        throw new Error("파일 정보를 확인한 뒤 다시 시도해주세요.");
      }
      setUploadStage("uploading");
      setUploadProgress(0);
      const uploadResult = await uploadImage(file, {
        onProgress: (percent) => setUploadProgress(percent),
      });
      if (!uploadResult.imageUrl) {
        throw new Error(resolveUploadError(uploadResult));
      }
      setUploadedImageUrl(uploadResult.imageUrl);
      setUploadStage("saving");
      return submitContestEntry(id, {
        title,
        description,
        fileName: file.name,
        imageUrl: uploadResult.imageUrl,
        fileSizeBytes: fileMeta.sizeBytes,
        imageWidthPx: fileMeta.width,
        imageHeightPx: fileMeta.height,
      });
    },
    onMutate: () => {
      setUploadError(null);
      setUploadStage("uploading");
    },
    onSuccess: (result) => {
      if (result.error || !result.data) {
        const message = result.error ?? "출품 정보 저장에 실패했습니다.";
        setUploadStage("idle");
        setUploadError(message);
        dispatch(showToast(`출품 등록에 실패했습니다. (${message})`));
        return;
      }

      setUploadError(null);
      setUploadStage("done");
      queryClient.invalidateQueries({ queryKey: ["contest", id, "entryCredits"] });
      queryClient.invalidateQueries({ queryKey: ["contest", id, "entries"] });
      dispatch(showToast("콘테스트 출품이 완료되었습니다."));
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "출품 업로드에 실패했습니다.";
      setUploadError(message);
      setUploadStage("idle");
      dispatch(showToast("출품 업로드에 실패했습니다."));
    },
  });

  const goBackToContestList = () => {
    navigateBack(router, "/contest?tab=contest");
  };

  const openPayment = () => {
    if (!hasToken) {
      dispatch(setPendingPath(`/contest/${id}?tab=contest`));
      dispatch(showToast("로그인 후 결제할 수 있습니다."));
      router.push("/login");
      return;
    }
    if (!isSubmissionPhase) {
      dispatch(showToast("출품 진행 중 단계에서만 결제할 수 있습니다."));
      return;
    }
    setPaymentStep("payment");
  };

  const handleVote = (entryId: string) => {
    if (!isVotingPhase) {
      dispatch(showToast("전시 중 단계에서만 투표할 수 있습니다."));
      return;
    }
    if (!hasToken) {
      dispatch(setPendingPath(`/contest/${id}?tab=contest`));
      dispatch(showToast("로그인 후 투표할 수 있습니다."));
      router.push("/login");
      return;
    }
    voteMutation.mutate(entryId);
  };

  const scrollTo = (targetId: string) => {
    const section = document.getElementById(targetId);
    if (!section) {
      return;
    }
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const renderSubmissionPagination = (keyPrefix: string) => (
    <div className="flex flex-wrap items-center justify-center gap-2 border border-white/16 bg-white/[0.03] px-3 py-3">
      <button
        type="button"
        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
        disabled={currentPage <= 1}
        className="border border-white/20 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/10 disabled:opacity-40"
      >
        이전
      </button>
      {paginationTokens.map((token, index) => {
        if (token === "ellipsis") {
          return (
            <span key={`${keyPrefix}-ellipsis-${index}`} className="px-1 text-xs text-slate-500">
              ...
            </span>
          );
        }
        const isActive = currentPage === token;
        return (
          <button
            key={`${keyPrefix}-page-${token}`}
            type="button"
            onClick={() => setPage(token)}
            className={`min-w-8 border px-3 py-1.5 text-xs transition ${
              isActive
                ? "border-[#c0a062]/45 bg-[#c0a062]/18 text-[#f8e6be]"
                : "border-white/20 text-slate-300 hover:bg-white/10"
            }`}
          >
            {token}
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
        disabled={currentPage >= totalPages}
        className="border border-white/20 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/10 disabled:opacity-40"
      >
        다음
      </button>
    </div>
  );

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#121212] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_8%,rgba(110,132,162,0.2),transparent_36%),radial-gradient(circle_at_85%_16%,rgba(157,128,82,0.18),transparent_40%),radial-gradient(circle_at_52%_78%,rgba(90,87,84,0.2),transparent_40%)]" />

      <main className="relative mx-auto w-full max-w-[1120px] px-6 pb-44 pt-10">
        <motion.div className="mb-6" {...staggeredFadeUpMotion(0, reduceMotion)}>
          <OverviewStyleHeader title="The Contest" />
        </motion.div>

        <motion.div
          className="mb-7 flex items-center gap-3"
          {...staggeredFadeUpMotion(1, reduceMotion)}
        >
          <button
            type="button"
            onClick={goBackToContestList}
            className="flex h-10 w-10 items-center justify-center  border border-white/14 text-slate-400 transition hover:border-white/28 hover:text-white"
            aria-label="목록으로 돌아가기"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>

          <div
            className={` border px-3 py-1 text-[10px] uppercase tracking-[0.2em] ${phaseTone.chipClass}`}
          >
            {phaseKicker[phase]}
          </div>
        </motion.div>

        {contestLoading ? (
          <section className="space-y-6">
            <div className="border border-white/14 bg-white/6 p-8">
              <Skeleton className="h-10 w-3/5 " />
              <SkeletonText className="mt-4 max-w-lg" lines={2} />
              <Skeleton className="mt-6 h-2 w-full " />
            </div>
            <div className="border border-white/14 bg-white/6 p-6">
              <Skeleton className="h-6 w-40 " />
              <SkeletonText className="mt-4" lines={4} />
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="border border-white/14 bg-white/6 p-5">
                  <Skeleton className="h-[320px] w-full " />
                  <Skeleton className="mt-4 h-6 w-1/2 " />
                </div>
              ))}
            </div>
          </section>
        ) : contest ? (
          <>
            <motion.section
              className="border border-white/16 bg-[rgba(18,18,18,0.78)] p-8 shadow-[0_24px_56px_rgba(0,0,0,0.34)] backdrop-blur-md md:p-10"
              {...staggeredFadeUpMotion(1, reduceMotion)}
            >
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="font-[var(--font-display)] text-5xl leading-[1.06] text-slate-100 md:text-6xl">
                  {contest.theme}
                </h1>
                <span className="text-sm text-slate-500">{getContestPhaseLabel(phase)}</span>
              </div>

              <div className="mt-7 h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />

              <div className="mt-7 space-y-3">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.16em] text-slate-400">
                  <span>{progressLabel}</span>
                  <span>
                    {phase === "REVIEW"
                      ? `${formatSchedule(contest.submissionEndAt)} - ${formatSchedule(contest.votingStartAt)}`
                      : phase === "VOTING"
                        ? `${formatSchedule(contest.votingStartAt)} - ${formatSchedule(contest.votingEndAt)}`
                        : `${formatSchedule(contest.submissionStartAt)} - ${formatSchedule(contest.submissionEndAt)}`}
                  </span>
                </div>
                <div className="h-1 w-full overflow-hidden bg-white/14">
                  <div
                    className={`h-full ${phaseTone.progressBarClass}`}
                    style={{ width: `${progressValue}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>{progressValue}% Completed</span>
                  <span>
                    {daysLeft === null ? "기간 미정" : daysLeft > 0 ? `${daysLeft}일 남음` : "종료 또는 시작됨"}
                  </span>
                </div>
              </div>

              <article className="mt-7 border border-white/14 bg-white/[0.03] p-6">
                <h3 className="border-b border-white/10 pb-2 text-xs uppercase tracking-[0.24em] text-[#c0a062]">
                  Exhibition Notes
                </h3>
                <ul className="mt-3 grid gap-2">
                  {(contest.rules ?? []).map((rule) => (
                    <li key={rule} className="flex items-start gap-3 text-sm text-slate-300/88">
                      <span className="mt-2 h-1 w-1  bg-slate-400" />
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm text-slate-400">{phaseNote[phase]}</p>
              </article>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  className="border border-white/18 bg-slate-100 px-4 py-3 text-sm font-medium tracking-[0.08em] text-black transition hover:bg-white"
                  onClick={() => scrollTo("contest-artworks")}
                >
                  작품 보기
                </button>
                {phase === "SUBMISSION" ? (
                  <button
                    type="button"
                    className="border border-cyan-300/35 bg-cyan-300/12 px-4 py-3 text-sm tracking-[0.08em] text-cyan-100 transition hover:bg-cyan-300/20"
                    onClick={openPayment}
                  >
                    출품권 결제
                  </button>
                ) : phase === "VOTING" ? (
                  <Link
                    href={`/contest/${id}/gallery?tab=contest`}
                    className="border border-[#c0a062]/35 bg-[#c0a062]/12 px-4 py-3 text-center text-sm tracking-[0.08em] text-[#f3dba5] transition hover:bg-[#c0a062]/20"
                  >
                    집중 갤러리
                  </Link>
                ) : (
                  <Link
                    href="/contest?tab=contest"
                    className="border border-white/20 px-4 py-3 text-center text-sm tracking-[0.08em] text-slate-200 transition hover:bg-white/8"
                  >
                    목록으로 이동
                  </Link>
                )}
              </div>
            </motion.section>

            {isSubmissionPhase && (
              <motion.section
                className="mt-10 border border-cyan-300/24 bg-[rgba(12,34,38,0.74)] p-7 backdrop-blur-md md:p-9"
                {...staggeredFadeUpMotion(2, reduceMotion)}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-[var(--font-display)] text-4xl italic text-cyan-50">Submission Studio</h2>
                  <span className=" border border-cyan-300/30 bg-cyan-300/14 px-3 py-1 text-xs text-cyan-100">
                    보유 출품권 {credits}개
                  </span>
                </div>

                <div className="mt-4  border border-amber-300/35 bg-amber-300/10 px-4 py-3">
                  <p className="text-xs font-semibold tracking-[0.08em] text-amber-100">
                    {AI_DISCLOSURE_NOTICE.title}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-amber-50/90">
                    {AI_DISCLOSURE_NOTICE.summary}
                  </p>
                  <p className="mt-2 text-xs text-amber-100">{AI_DISCLOSURE_NOTICE.guide}</p>
                </div>

                {!hasToken && (
                  <div className="mt-4  border border-white/14 bg-white/8 px-4 py-3 text-xs text-slate-300">
                    로그인 후 결제 및 출품이 가능합니다.
                  </div>
                )}
                {needsCredit && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3  border border-cyan-300/26 bg-cyan-300/10 px-4 py-3 text-xs text-cyan-100">
                    <span>해당 콘테스트 출품권이 없습니다.</span>
                    <button
                      type="button"
                      onClick={openPayment}
                      className=" border border-cyan-300/35 bg-cyan-300/16 px-3 py-1.5 text-xs transition hover:bg-cyan-300/24"
                    >
                      출품권 결제
                    </button>
                  </div>
                )}

                <div className="mt-5 grid gap-3">
                  <input
                    className="h-12 border border-white/18 bg-black/20 px-4 text-sm text-slate-100 focus:border-cyan-300/45 focus:outline-none"
                    placeholder="작품 제목"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    disabled={!canSubmit}
                  />
                  <textarea
                    className="min-h-[100px] border border-white/18 bg-black/20 px-4 py-3 text-sm text-slate-100 focus:border-cyan-300/45 focus:outline-none"
                    placeholder="작품 설명"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    disabled={!canSubmit}
                  />

                    <div className="border border-white/16 bg-black/16 p-4">
                    <input
                      id="contest-entry-file"
                      type="file"
                      accept="image/jpeg,image/png,image/jpg"
                      className="sr-only"
                      disabled={!canSubmit}
                      onClick={(event) => {
                        event.currentTarget.value = "";
                      }}
                      onChange={(event) => {
                        const selected = event.target.files ? event.target.files[0] : null;
                        if (!selected) {
                          setFile(null);
                          setUploadError(null);
                          setUploadProgress(0);
                          setUploadStage("idle");
                          setFileMeta(null);
                          setUploadedImageUrl(null);
                          return;
                        }
                        const allowed = ["image/jpeg", "image/png", "image/jpg"];
                        if (!allowed.includes(selected.type)) {
                          setFile(null);
                          setFileMeta(null);
                          setUploadError("JPEG/PNG 파일만 업로드 가능합니다.");
                          setUploadStage("idle");
                          setUploadProgress(0);
                          setUploadedImageUrl(null);
                          return;
                        }
                        if (selected.size > MAX_UPLOAD_SIZE_BYTES) {
                          setFile(null);
                          setFileMeta(null);
                          setUploadError("파일 용량은 100MB 이하만 가능합니다.");
                          setUploadStage("idle");
                          setUploadProgress(0);
                          setUploadedImageUrl(null);
                          return;
                        }
                        setFile(null);
                        setFileMeta(null);
                        setUploadError("이미지 해상도를 확인 중입니다.");
                        setUploadProgress(0);
                        setUploadStage("idle");
                        setUploadedImageUrl(null);
                        void (async () => {
                          try {
                            const imageMeta = await readImageMeta(selected);
                            if (
                              imageMeta.width < MIN_IMAGE_RESOLUTION_PX ||
                              imageMeta.height < MIN_IMAGE_RESOLUTION_PX
                            ) {
                              setFile(null);
                              setFileMeta(null);
                              setUploadError(
                                `이미지 해상도는 최소 ${MIN_IMAGE_RESOLUTION_PX}px x ${MIN_IMAGE_RESOLUTION_PX}px 이상이어야 합니다.`,
                              );
                              return;
                            }
                            setFile(selected);
                            setFileMeta({
                              width: imageMeta.width,
                              height: imageMeta.height,
                              sizeBytes: selected.size,
                            });
                            setUploadError(null);
                          } catch (metaError) {
                            const message =
                              metaError instanceof Error
                                ? metaError.message
                                : "이미지 해상도를 확인할 수 없습니다.";
                            setFile(null);
                            setFileMeta(null);
                            setUploadError(message);
                          }
                        })();
                      }}
                    />

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-100">출품 파일 선택</p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          JPEG/PNG, 최대 100MB, 최소 3000px
                        </p>
                      </div>
                      <label
                        htmlFor="contest-entry-file"
                        className={` px-4 py-2 text-xs transition ${
                          canSubmit
                            ? "cursor-pointer border border-cyan-300/35 bg-cyan-300/14 text-cyan-100 hover:bg-cyan-300/24"
                            : "cursor-not-allowed border border-white/14 bg-white/6 text-slate-500"
                        }`}
                      >
                        파일 선택
                      </label>
                    </div>

                    <div className="mt-3 border border-white/14 bg-black/24 px-3 py-2 text-xs text-slate-300">
                      {file
                        ? `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)}MB)${
                          fileMeta ? ` · ${fileMeta.width} x ${fileMeta.height}px` : ""
                        }`
                        : "선택된 파일 없음"}
                    </div>
                  </div>

                  {uploadStatusLabel && (
                    <div className="border border-white/16 bg-white/8 px-4 py-2 text-xs text-slate-300">
                      {uploadStatusLabel}
                      {uploadStage === "uploading" && (
                        <div className="mt-2 h-2 overflow-hidden bg-white/10">
                          <div
                            className="h-full  bg-cyan-300 transition-[width] duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {uploadError && (
                    <div className="border border-rose-300/35 bg-rose-300/14 px-4 py-2 text-xs text-rose-100">
                      {uploadError}
                    </div>
                  )}

                  {uploadedImageUrl && (
                    <div className="border border-white/16 bg-black/24 p-3">
                      <p className="text-xs text-slate-400">업로드된 이미지 미리보기</p>
                      <div className="mt-2 overflow-hidden border border-white/14">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={uploadedImageUrl} alt="업로드 미리보기" className="h-40 w-full object-cover" />
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    className="border border-cyan-300/35 bg-cyan-300/18 px-5 py-3 text-sm tracking-[0.08em] text-cyan-50 transition hover:bg-cyan-300/28 disabled:opacity-60"
                    onClick={() => uploadMutation.mutate()}
                    disabled={!canSubmit || !file || uploadMutation.isPending || isUploading}
                  >
                    {!canSubmit ? "결제 후 출품 가능" : uploadMutation.isPending || isUploading ? "업로드 중..." : "출품하기"}
                  </button>
                </div>
              </motion.section>
            )}

            {isEndedPhase && (
              <motion.section
                className="mt-10 border border-white/16 bg-[rgba(18,18,18,0.7)] p-7 backdrop-blur-md md:p-9"
                {...staggeredFadeUpMotion(3, reduceMotion)}
              >
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-[var(--font-display)] text-3xl text-slate-100">Ranking Board</h2>
                  <span className="border border-white/20 bg-white/8 px-3 py-1 text-xs text-slate-300">
                    Top 3
                  </span>
                </div>

                {rankingLoading ? (
                  <div className="grid gap-2">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <Skeleton key={index} className="h-11 w-full " />
                    ))}
                  </div>
                ) : rankingError ? (
                  <div className="border border-rose-300/35 bg-rose-300/12 px-3 py-2 text-xs text-rose-100">
                    랭킹을 불러오지 못했습니다. {rankingError}
                  </div>
                ) : topRanking.length === 0 ? (
                  <div className="border border-white/16 bg-white/8 px-3 py-2 text-sm text-slate-300">
                    랭킹 데이터가 없습니다.
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {topRanking.map((item) => (
                      <div
                        key={item.entryId}
                        className="flex items-center justify-between border border-white/14 bg-white/[0.04] px-4 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm text-slate-100">
                            {item.rank}위 · {item.title ?? "Untitled"}
                          </p>
                          <p className="text-xs text-slate-400">{item.artistName}</p>
                        </div>
                        <span className="text-xs text-[#c0a062]">{item.voteCount}표</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.section>
            )}

            {phase !== "VOTING" && (
              <motion.section
                id="contest-guide"
                className="mt-10 border border-white/16 bg-[rgba(18,18,18,0.7)] p-7 backdrop-blur-md md:p-8"
                {...staggeredFadeUpMotion(4, reduceMotion)}
              >
                <h3 className="font-[var(--font-display)] text-2xl text-slate-100">Timeline</h3>
                <div className="mt-4 grid gap-2 text-sm text-slate-300/82 md:grid-cols-2">
                  <p>출품 시작: {formatDateTime(contest.submissionStartAt)}</p>
                  <p>출품 종료: {formatDateTime(contest.submissionEndAt)}</p>
                  <p>전시 시작: {formatDateTime(contest.votingStartAt)}</p>
                  <p>전시 종료: {formatDateTime(contest.votingEndAt)}</p>
                </div>
              </motion.section>
            )}

            <section id="contest-artworks" className="mt-14 space-y-12">
              <motion.div
                className="border-b border-white/16 pb-4"
                {...staggeredFadeUpMotion(5, reduceMotion)}
              >
                <h2 className="font-[var(--font-display)] text-3xl text-slate-100">Exhibition Records</h2>
              </motion.div>

              {totalEntryCount > 0 && (
                <motion.div
                  className="border border-white/16 bg-[linear-gradient(155deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] px-5 py-5 backdrop-blur-md md:px-6"
                  {...staggeredFadeUpMotion(6, reduceMotion)}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">정렬 방식: 제출순</p>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="border border-white/20 bg-white/[0.03] px-3 py-1.5 text-slate-300">
                        전체 {formatNumber(totalEntryCount)}개
                      </span>
                      <span className="border border-white/20 bg-white/[0.03] px-3 py-1.5 text-slate-300">
                        페이지당 {ENTRY_PAGE_SIZE}개
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/16 pt-4">
                    <p className="text-xs text-slate-400">
                      제출 시각 오름차순 정렬입니다. 가장 먼저 제출한 작품이 1번으로 표시됩니다.
                    </p>
                    <span className="text-xs text-slate-500">Page {currentPage} / {totalPages}</span>
                  </div>
                </motion.div>
              )}

              {totalEntryCount > 0 && (
                <motion.div {...staggeredFadeUpMotion(7, reduceMotion)}>
                  {renderSubmissionPagination("top")}
                </motion.div>
              )}

              {showEntrySkeleton ? (
                <div className="grid gap-8 md:grid-cols-2">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <article key={index} className="border border-white/14 bg-white/[0.04] p-5">
                      <Skeleton className="h-[340px] w-full " />
                      <Skeleton className="mt-4 h-6 w-2/5 " />
                      <SkeletonText className="mt-3" lines={2} />
                    </article>
                  ))}
                </div>
              ) : entriesError ? (
                <div className="border border-rose-300/35 bg-rose-300/12 px-4 py-3 text-sm text-rose-100">
                  출품 목록을 불러오지 못했습니다. {entriesError}
                </div>
              ) : entries.length === 0 ? (
                <div className="border border-white/16 bg-white/8 px-4 py-3 text-sm text-slate-300">
                  출품작이 아직 없습니다.
                </div>
              ) : (
                displayedEntries.map((entry, index) => {
                  const focusGalleryHref = `/contest/${id}/gallery?tab=contest&entryId=${entry.entryId}`;
                  const currentRank = rankMap.get(entry.entryId);
                  const voteCount = voteCountMap.get(entry.entryId) ?? 0;
                  const displayOrder = (currentPage - 1) * ENTRY_PAGE_SIZE + index + 1;

                  return (
                    <motion.article
                      key={entry.entryId}
                      {...staggeredFadeUpMotion(index + 8, reduceMotion)}
                      className="group flex flex-col gap-4"
                    >
                      <div className="mb-1 flex items-baseline justify-between border-b border-white/14 pb-2">
                        <span className="font-[var(--font-display)] text-3xl font-light italic text-white/20">
                          {String(displayOrder).padStart(2, "0")}
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="material-symbols-outlined text-lg text-slate-400 transition hover:text-white"
                            aria-label="북마크"
                          >
                            bookmark_border
                          </button>
                          <button
                            type="button"
                            className="material-symbols-outlined text-lg text-slate-400 transition hover:text-white"
                            aria-label="공유"
                          >
                            share
                          </button>
                        </div>
                      </div>

                      {!(isSubmissionPhase || isReviewPhase) && (
                        <Link
                          href={focusGalleryHref}
                          onClick={persistDetailViewState}
                          className="relative block overflow-hidden border border-white/14 bg-slate-900"
                        >
                          {hideArtworkByPhase ? (
                            <div className="flex aspect-[4/5] w-full items-center justify-center border border-white/10 bg-[linear-gradient(160deg,rgba(34,34,37,0.9),rgba(24,24,26,0.92))] text-sm text-slate-500">
                              전시 시작 전 비공개
                            </div>
                          ) : entry.imageUrl ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={entry.imageUrl}
                                alt={entry.title ?? "contest entry"}
                                className="h-[56vh] min-h-[360px] max-h-[620px] w-full object-cover opacity-90 transition duration-700 group-hover:scale-[1.03] group-hover:opacity-100"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent opacity-65" />
                              <div className="absolute right-4 bottom-4 flex items-center gap-1 border border-white/14 bg-black/45 px-3 py-1 text-[10px] text-white">
                                <span className="material-symbols-outlined text-sm">visibility</span>
                                <span>{formatNumber(voteCount)}</span>
                              </div>
                              {isEndedPhase && currentRank && currentRank <= 3 && (
                                <div className="absolute left-4 top-4 border border-[#c0a062]/40 bg-[#c0a062]/18 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#f8e6be]">
                                  #{currentRank}
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="flex h-[56vh] min-h-[360px] max-h-[620px] w-full items-center justify-center border border-white/10 bg-[linear-gradient(160deg,rgba(32,32,34,0.9),rgba(24,24,26,0.92))] text-sm text-slate-500">
                              이미지 없음
                            </div>
                          )}
                        </Link>
                      )}

                      <div className="space-y-2">
                        <h3 className="truncate text-2xl text-slate-100">
                          {hideArtworkByPhase ? entry.artistName : entry.title ?? "Untitled"}
                        </h3>
                        <p className="truncate text-xs uppercase tracking-[0.18em] text-[#c0a062]">
                          {hideArtworkByPhase ? getContestEntryStatusLabel(entry.status) : `by ${entry.artistName}`}
                        </p>
                        <p className="text-sm leading-relaxed text-slate-400">
                          접수 시각 {formatDateTime(entry.submittedAt)}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <Link
                          href={focusGalleryHref}
                          onClick={persistDetailViewState}
                          className="flex items-center justify-center gap-2 border border-white/16 px-4 py-3 text-xs uppercase tracking-[0.16em] text-slate-300 transition hover:bg-white/8"
                        >
                          <span className="material-symbols-outlined text-lg">fullscreen</span>
                          <span>Immersive</span>
                        </Link>
                        {isVotingPhase ? (
                          <button
                            type="button"
                            onClick={() => handleVote(entry.entryId)}
                            disabled={Boolean(pendingVoteEntryId)}
                            className="flex items-center justify-center gap-2 border border-[#c0a062]/40 bg-[#c0a062]/14 px-4 py-3 text-xs uppercase tracking-[0.16em] text-[#f3dba5] transition hover:bg-[#c0a062]/22 disabled:opacity-60"
                          >
                            <span className="material-symbols-outlined text-lg">how_to_vote</span>
                            <span>
                              {!hasToken
                                ? "Login to Vote"
                                : pendingVoteEntryId === entry.entryId
                                  ? "Voting..."
                                  : "Vote Entry"}
                            </span>
                          </button>
                        ) : (
                          <div className="flex items-center justify-center border border-white/14 px-4 py-3 text-xs uppercase tracking-[0.16em] text-slate-500">
                            {isEndedPhase ? `득표 ${formatNumber(voteCount)}` : "비공개 상태"}
                          </div>
                        )}
                      </div>
                    </motion.article>
                  );
                })
              )}

              {totalEntryCount > 0 && (
                renderSubmissionPagination("bottom")
              )}
            </section>
          </>
        ) : (
          <section className="border border-rose-300/35 bg-rose-300/10 px-5 py-4 text-sm text-rose-100">
            콘테스트 정보를 불러오지 못했습니다. {contestError ?? ""}
          </section>
        )}
      </main>

      <CinematicBottomNav activeTab="contest" layout="fixed" />

      <AnimatePresence>
        {paymentStep !== "closed" && contest && (
          <motion.div
            {...overlayFadeMotion(reduceMotion)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4"
          >
            <motion.div
              {...popInMotion(reduceMotion)}
              className="w-full max-w-lg border border-white/18 bg-[rgba(14,14,18,0.98)] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
            >
              {paymentStep === "payment" && (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.32em] text-[#c0a062]/86">Test Payment</p>
                      <h2 className="mt-2 font-[var(--font-display)] text-3xl text-slate-100">출품권 결제</h2>
                      <p className="mt-2 text-sm text-slate-300/74">
                        실제 결제는 진행되지 않으며 테스트 UI입니다.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPaymentStep("closed")}
                      className="border border-white/20 px-3 py-1 text-xs text-slate-300 transition hover:bg-white/10"
                    >
                      닫기
                    </button>
                  </div>

                  <div className="mt-6 grid gap-3">
                    <div className="border border-white/14 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
                      참가 콘테스트: <strong>{contest.theme}</strong>
                    </div>
                    <div className="border border-white/14 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
                      참가비 <strong>{formatNumber(contest.entryFee)}원</strong>
                    </div>
                    <div className="border border-white/14 bg-white/[0.04] px-4 py-3 text-xs text-slate-300">
                      출품권은 결제한 해당 콘테스트에서만 사용할 수 있습니다.
                    </div>

                    <div className="grid gap-2">
                      <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Payment Method</p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: "card", label: "카드 결제" },
                          { id: "account", label: "계좌 이체" },
                          { id: "simple", label: "간편 결제" },
                        ].map((method) => (
                          <button
                            key={method.id}
                            type="button"
                            className={` border px-4 py-2 text-xs transition ${
                              paymentMethod === method.id
                                ? "border-[#c0a062]/45 bg-[#c0a062]/18 text-[#f8e6be]"
                                : "border-white/18 bg-transparent text-slate-300 hover:bg-white/10"
                            }`}
                            onClick={() => setPaymentMethod(method.id)}
                          >
                            {method.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      className="border border-[#c0a062]/45 bg-[#c0a062]/18 px-4 py-3 text-sm tracking-[0.08em] text-[#f8e6be] transition hover:bg-[#c0a062]/26"
                      onClick={() => {
                        if (purchaseMutation.isPending) {
                          return;
                        }
                        setPaymentStep("processing");
                        purchaseMutation.mutate();
                      }}
                    >
                      {purchaseMutation.isPending ? "결제 처리 중..." : "테스트 결제 진행"}
                    </button>
                    <button
                      type="button"
                      className="border border-white/20 px-4 py-3 text-sm tracking-[0.08em] text-slate-300 transition hover:bg-white/10"
                      onClick={() => setPaymentStep("closed")}
                    >
                      취소
                    </button>
                  </div>
                </>
              )}

              {paymentStep === "processing" && (
                <>
                  <p className="text-xs uppercase tracking-[0.32em] text-[#c0a062]/86">Processing</p>
                  <h2 className="mt-3 font-[var(--font-display)] text-3xl text-slate-100">결제를 처리하고 있습니다.</h2>
                  <p className="mt-2 text-sm text-slate-300/74">잠시만 기다려주세요.</p>
                </>
              )}

              {paymentStep === "confirm" && (
                <>
                  <p className="text-xs uppercase tracking-[0.32em] text-[#c0a062]/86">Payment Complete</p>
                  <h2 className="mt-3 font-[var(--font-display)] text-3xl text-slate-100">출품권 결제가 완료되었습니다.</h2>
                  <p className="mt-2 text-sm text-slate-300/74">
                    테스트 결제이므로 실제 승인/청구는 발생하지 않습니다.
                  </p>
                  <div className="mt-5 border border-white/14 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
                    {contest.theme} 출품권이 추가되었습니다. 현재 {credits}개
                  </div>
                  <button
                    type="button"
                    className="mt-6 w-full border border-[#c0a062]/45 bg-[#c0a062]/18 px-5 py-3 text-sm tracking-[0.08em] text-[#f8e6be] transition hover:bg-[#c0a062]/24"
                    onClick={() => setPaymentStep("closed")}
                  >
                    확인
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
