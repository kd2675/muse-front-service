"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import Link from "next/link";
import PageShell from "../../components/PageShell";
import TopNav from "../../components/TopNav";
import { Skeleton, SkeletonText } from "../../components/Skeleton";
import {
  getContestDetail,
  getContestEntries,
  getContestRanking,
  getMyEntryCredits,
  purchaseEntryCredit,
  submitContestEntry,
  voteContestEntry,
} from "../../lib/contest";
import { uploadImage, type ImageUploadResult } from "../../lib/imageUpload";
import { getAccessToken } from "../../lib/auth";
import { useBodyScrollLock } from "../../lib/useBodyScrollLock";
import { useAppDispatch } from "../../store/hooks";
import { setPendingPath, showToast } from "../../store/uiSlice";

type ContestDetailClientProps = {
  id: number;
};

type ContestPhaseKey = "UPCOMING" | "SUBMISSION" | "REVIEW" | "VOTING" | "ENDED";
type EntryRenderMode = ContestPhaseKey;
type PhasePlaybookItem = {
  kicker: string;
  title: string;
  description: string;
};
type PhasePanelMeta = {
  kicker: string;
  title: string;
  description: string;
};
type PhaseTone = {
  titleClass: string;
  leadClass: string;
  primaryButtonClass: string;
  secondaryButtonClass: string;
};

const formatNumber = (value: number) => value.toLocaleString("ko-KR");
const MIN_IMAGE_RESOLUTION_PX = 3000;
const MAX_UPLOAD_SIZE_BYTES = 100 * 1024 * 1024;

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

const entryStatusLabel: Record<string, string> = {
  SUBMITTED: "제출 완료",
  REVIEWING: "검토 중",
  APPROVED: "승인",
  REJECTED: "반려",
};

const phaseMeta: Record<ContestPhaseKey, { label: string; title: string; note: string }> = {
  UPCOMING: {
    label: "출품 대기",
    title: "오픈 전 프리뷰",
    note: "시작 전 단계입니다. 규칙과 일정을 확인하고 작품을 준비하세요.",
  },
  SUBMISSION: {
    label: "출품 진행 중",
    title: "출품 스튜디오",
    note: "출품권 결제 후 작품을 등록할 수 있습니다.",
  },
  REVIEW: {
    label: "심사 중",
    title: "심사 큐 운영",
    note: "출품이 마감되었습니다. 전시 공개 전 심사 상태를 확정하는 단계입니다.",
  },
  VOTING: {
    label: "전시 중",
    title: "전시 & 투표 아레나",
    note: "공개된 작품을 감상하고 원하는 출품작에 투표하세요.",
  },
  ENDED: {
    label: "종료",
    title: "결과 아카이브",
    note: "콘테스트가 종료되었습니다. 최종 랭킹과 아카이브를 확인하세요.",
  },
};

const phaseActionBoard: Record<ContestPhaseKey, PhasePlaybookItem[]> = {
  UPCOMING: [
    {
      kicker: "CHECK",
      title: "규칙 확인",
      description: "해상도, 보정 제한, 제출 형식 등 탈락 사유를 먼저 체크하세요.",
    },
    {
      kicker: "SCOUT",
      title: "컨셉 시뮬레이션",
      description: "예상 전시 흐름을 기준으로 시선이 머무는 핵심 컷을 정리하세요.",
    },
    {
      kicker: "QUEUE",
      title: "출품 동선 준비",
      description: "출품권 결제와 업로드 시퀀스를 사전에 점검해 오픈 직후 바로 제출하세요.",
    },
  ],
  SUBMISSION: [
    {
      kicker: "PAY",
      title: "출품권 확보",
      description: "해당 콘테스트 출품권 1개당 1회 제출됩니다. 제출 수량에 맞게 먼저 결제하세요.",
    },
    {
      kicker: "UPLOAD",
      title: "작품 등록",
      description: "제목, 설명, 썸네일 품질까지 점검한 뒤 최종 이미지를 업로드하세요.",
    },
    {
      kicker: "VERIFY",
      title: "등록 상태 확인",
      description: "등록 후 상태값(제출 완료/검토 중)을 확인하고 마감 전 보완하세요.",
    },
  ],
  REVIEW: [
    {
      kicker: "LOCK",
      title: "출품 마감",
      description: "새로운 출품은 마감되었습니다. 기존 접수작의 심사를 진행합니다.",
    },
    {
      kicker: "REVIEW",
      title: "상태 확정",
      description: "미선택/검토중 출품을 승인 또는 반려로 확정해 전시 노출 대상을 정리하세요.",
    },
    {
      kicker: "READY",
      title: "전시 준비",
      description: "심사가 완료되면 전시 기간에 맞춰 공개 및 투표가 활성화됩니다.",
    },
  ],
  VOTING: [
    {
      kicker: "BROWSE",
      title: "전시 탐색",
      description: "출품작들을 비교해 주제 적합도와 완성도를 빠르게 스크리닝하세요.",
    },
    {
      kicker: "PICK",
      title: "작품 선택 투표",
      description: "A/B가 아닌 출품작별 선택 투표입니다. 선호 작품에 직접 투표하세요.",
    },
    {
      kicker: "TRACK",
      title: "순위 추적",
      description: "투표 이후 랭킹 변화를 확인해 경쟁 구도의 흐름을 파악하세요.",
    },
  ],
  ENDED: [
    {
      kicker: "FINAL",
      title: "최종 결과 검토",
      description: "상위권 작품의 공통점과 심사 관점을 다음 시즌 전략에 반영하세요.",
    },
    {
      kicker: "ARCHIVE",
      title: "작품 리서치",
      description: "종료된 전시를 아카이브로 활용해 기준작 품질을 반복 학습하세요.",
    },
    {
      kicker: "RESET",
      title: "다음 시즌 준비",
      description: "다음 공모의 주제와 촬영 플랜을 미리 준비해 리드 타임을 확보하세요.",
    },
  ],
};

const phaseSubmitMeta: Record<ContestPhaseKey, PhasePanelMeta> = {
  UPCOMING: {
    kicker: "Submission Prep",
    title: "출품 준비 데스크",
    description: "출품 시작 전 단계입니다. 제출 포맷과 작품 설명을 미리 준비하세요.",
  },
  SUBMISSION: {
    kicker: "Submission Live",
    title: "출품 등록 데스크",
    description: "지금 출품이 열려 있습니다. 결제 후 작품 등록을 완료하세요.",
  },
  REVIEW: {
    kicker: "Review Live",
    title: "심사 진행 데스크",
    description: "출품이 마감되었습니다. 관리자 심사 확정 후 전시가 공개됩니다.",
  },
  VOTING: {
    kicker: "Submission Closed",
    title: "출품 마감 데스크",
    description: "출품은 마감되었습니다. 전시 작품 감상과 투표에 집중하는 단계입니다.",
  },
  ENDED: {
    kicker: "Submission Ended",
    title: "출품 종료 아카이브",
    description: "이번 시즌 출품은 종료되었습니다. 결과 분석 후 다음 시즌을 준비하세요.",
  },
};

const phaseTone: Record<ContestPhaseKey, PhaseTone> = {
  UPCOMING: {
    titleClass: "font-[var(--font-display)] tracking-[0.002em]",
    leadClass: "text-sm leading-relaxed text-[color:var(--muted)]",
    primaryButtonClass:
      "rounded-full border border-[rgba(194,123,77,0.35)] bg-[rgba(194,123,77,0.1)] px-5 py-3 text-sm text-[color:var(--accent-2)] transition hover:bg-[rgba(194,123,77,0.16)]",
    secondaryButtonClass:
      "rounded-full border border-[color:var(--line)] bg-white/85 px-5 py-3 text-sm text-[color:var(--muted)] transition hover:border-[rgba(194,123,77,0.35)] hover:text-[color:var(--accent-2)]",
  },
  SUBMISSION: {
    titleClass: "font-[var(--font-display)] tracking-[0.002em]",
    leadClass: "text-sm leading-relaxed text-[color:var(--muted)]",
    primaryButtonClass:
      "rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm text-white shadow-[var(--shadow)] transition hover:brightness-110 disabled:opacity-60",
    secondaryButtonClass:
      "rounded-full border border-[rgba(11,91,91,0.35)] bg-white/90 px-5 py-3 text-sm text-[color:var(--accent)] transition hover:bg-[rgba(11,91,91,0.08)]",
  },
  REVIEW: {
    titleClass: "font-[var(--font-display)] tracking-[0.002em]",
    leadClass: "text-sm leading-relaxed text-[color:var(--muted)]",
    primaryButtonClass:
      "rounded-full border border-[rgba(153,127,48,0.34)] bg-[rgba(255,244,208,0.9)] px-5 py-3 text-sm text-[#6c560f] transition hover:bg-[rgba(247,229,169,0.95)]",
    secondaryButtonClass:
      "rounded-full border border-[rgba(153,127,48,0.3)] bg-white/90 px-5 py-3 text-sm text-[#7b6118] transition hover:bg-[rgba(255,248,222,0.95)]",
  },
  VOTING: {
    titleClass: "font-[var(--font-display)] tracking-[0.002em]",
    leadClass: "text-sm leading-relaxed text-[color:var(--muted)]",
    primaryButtonClass:
      "rounded-full border border-[rgba(123,91,52,0.36)] bg-[rgba(255,245,228,0.92)] px-5 py-3 text-sm text-[#6f4f2d] shadow-[var(--shadow)] transition hover:bg-[rgba(250,236,211,0.95)]",
    secondaryButtonClass:
      "rounded-full border border-[rgba(123,91,52,0.3)] bg-white/92 px-5 py-3 text-sm text-[#7f5c34] transition hover:bg-[rgba(255,248,237,0.95)]",
  },
  ENDED: {
    titleClass: "font-[var(--font-display)] tracking-[0.002em]",
    leadClass: "text-sm leading-relaxed text-[color:var(--muted)]",
    primaryButtonClass:
      "rounded-full bg-[#7b5b34] px-5 py-3 text-sm text-white shadow-[var(--shadow)] transition hover:brightness-110",
    secondaryButtonClass:
      "rounded-full border border-[rgba(123,91,52,0.32)] bg-white/90 px-5 py-3 text-sm text-[#7b5b34] transition hover:bg-[rgba(123,91,52,0.08)]",
  },
};

export default function ContestDetailClient({ id }: ContestDetailClientProps) {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

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
  const [uploadStage, setUploadStage] = useState<"idle" | "uploading" | "saving" | "done">("idle");
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [pendingVoteEntryId, setPendingVoteEntryId] = useState<string | null>(null);
  const [paymentStep, setPaymentStep] = useState<"closed" | "payment" | "processing" | "confirm">("closed");
  const [paymentMethod, setPaymentMethod] = useState("card");

  useBodyScrollLock(paymentStep !== "closed");

  const { data, isLoading } = useQuery({
    queryKey: ["contest", id],
    queryFn: () => getContestDetail(id),
  });

  const hasToken = Boolean(getAccessToken());

  const { data: creditData } = useQuery({
    queryKey: ["contest", id, "entryCredits"],
    queryFn: () => getMyEntryCredits(id),
    enabled: hasToken,
  });

  const { data: entriesData, isLoading: entriesLoading } = useQuery({
    queryKey: ["contest", id, "entries"],
    queryFn: () => getContestEntries(id),
  });

  const { data: rankingData, isLoading: rankingLoading } = useQuery({
    queryKey: ["contest", id, "ranking"],
    queryFn: () => getContestRanking(id),
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

  const contest = data?.data;
  const error = data?.error;
  const entries = entriesData?.data ?? [];
  const entriesError = entriesData?.error;
  const ranking = rankingData?.data ?? [];
  const rankingError = rankingData?.error;

  const phase = (contest?.phase ?? "UPCOMING") as ContestPhaseKey;
  const phaseInfo = phaseMeta[phase];
  const tone = phaseTone[phase];
  const submitMeta = phaseSubmitMeta[phase];

  const credits = creditData?.data?.credits ?? 0;

  const isUpcomingPhase = phase === "UPCOMING";
  const isSubmissionPhase = phase === "SUBMISSION";
  const isReviewPhase = phase === "REVIEW";
  const isVotingPhase = phase === "VOTING";

  const canSubmit = hasToken && isSubmissionPhase && credits > 0;
  const needsCredit = hasToken && isSubmissionPhase && credits <= 0;
  const canVote = hasToken && isVotingPhase;

  const voteCountMap = new Map(ranking.map((item) => [item.entryId, item.voteCount]));
  const rankMap = new Map(ranking.map((item) => [item.entryId, item.rank]));
  const topWinners = ranking.slice(0, 3);
  const submissionOpenCountdown = formatCountdown(contest?.submissionStartAt);
  const votingOpenCountdown = formatCountdown(contest?.votingStartAt);
  const submissionProgress = calculatePeriodProgress(contest?.submissionStartAt, contest?.submissionEndAt);
  const reviewProgress = calculatePeriodProgress(contest?.submissionEndAt, contest?.votingStartAt);
  const votingProgress = calculatePeriodProgress(contest?.votingStartAt, contest?.votingEndAt);
  const totalVotes = ranking.reduce((acc, item) => acc + item.voteCount, 0);

  const openPayment = () => {
    if (!hasToken) {
      dispatch(setPendingPath(`/contest/${id}`));
      dispatch(showToast("로그인 후 결제할 수 있습니다."));
      return;
    }
    if (!isSubmissionPhase) {
      dispatch(showToast("출품 진행 중 단계에서만 결제할 수 있습니다."));
      return;
    }
    setPaymentStep("payment");
  };

  const scrollToSection = (sectionId: string) => {
    if (typeof window === "undefined") {
      return;
    }
    const section = document.getElementById(sectionId);
    if (!section) {
      return;
    }
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const renderEntryGrid = (
    mode: EntryRenderMode,
    emptyMessage: string,
    limit?: number,
    options?: { compact?: boolean },
  ) => {
    const isVotingMode = mode === "VOTING";
    const compact = options?.compact ?? false;
    if (entriesLoading) {
      return (
        <div className={`mt-5 grid gap-4 ${compact ? "md:grid-cols-3" : "sm:grid-cols-2"}`}>
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className={`rounded-[18px] border p-4 ${
                isVotingMode
                  ? "border-[rgba(123,157,212,0.3)] bg-[rgba(246,251,255,0.94)]"
                  : "border-[color:var(--line)] bg-white/90"
              }`}
            >
              <Skeleton className="h-44 w-full rounded-[14px]" />
              <Skeleton className="mt-3 h-4 w-2/3 rounded-full" />
            </div>
          ))}
        </div>
      );
    }

    if (entriesError) {
      return (
        <div
          className={`mt-4 rounded-[16px] border px-4 py-2 text-xs ${
            isVotingMode
              ? "border-[rgba(123,157,212,0.3)] bg-[rgba(246,251,255,0.94)] text-[#557199]"
              : "border-[color:var(--line)] bg-white/80 text-[color:var(--muted)]"
          }`}
        >
          출품 목록을 불러오지 못했습니다.
          {entriesError ? ` (${entriesError})` : ""}
        </div>
      );
    }

    if (entries.length === 0) {
      return (
        <div
          className={`mt-4 rounded-[16px] border px-4 py-3 text-sm ${
            isVotingMode
              ? "border-[rgba(123,157,212,0.3)] bg-[rgba(246,251,255,0.94)] text-[#557199]"
              : "border-[color:var(--line)] bg-white/80 text-[color:var(--muted)]"
          }`}
        >
          {emptyMessage}
        </div>
      );
    }

    const visibleEntries = typeof limit === "number" ? entries.slice(0, limit) : entries;

    if (isVotingMode) {
      return (
        <div className="mt-6 overflow-hidden rounded-[22px] border border-[rgba(123,91,52,0.28)] bg-[rgba(255,252,247,0.97)]">
          {visibleEntries.map((entry, index) => {
            const isVotingEntry = pendingVoteEntryId === entry.entryId;
            const focusGalleryHref = `/contest/${id}/gallery?tab=contest&entryId=${entry.entryId}`;
            return (
              <article
                key={entry.entryId}
                className={`phase-voting-card grid gap-0 md:grid-cols-[1.15fr_0.85fr] ${
                  index === 0 ? "" : "border-t border-[rgba(123,91,52,0.2)]"
                }`}
              >
                <Link
                  href={focusGalleryHref}
                  className="group block border-b border-[rgba(123,91,52,0.2)] md:border-r md:border-b-0"
                >
                  <div className="relative h-64 md:h-full md:min-h-[360px]">
                    {entry.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={entry.imageUrl}
                        alt={entry.title ?? "contest entry"}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[color:var(--chip)] text-sm text-[color:var(--muted)]">
                        이미지 없음
                      </div>
                    )}
                    <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(29,19,11,0.42)_0%,rgba(29,19,11,0.08)_58%)]" />
                    <div className="absolute right-4 bottom-4 left-4 flex items-end justify-between gap-3">
                      <p className="text-[10px] uppercase tracking-[0.28em] text-[#f5e7ce]">
                        EXHIBIT {String(index + 1).padStart(2, "0")}
                      </p>
                    </div>
                  </div>
                </Link>

                <div className="px-5 py-5 md:px-6 md:py-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-[var(--font-display)] text-3xl leading-tight text-[#3f2a17]">
                        {entry.title ?? "Untitled"}
                      </h3>
                      <p className="mt-2 text-sm text-[#7a6042]">
                        {entry.artistName}
                      </p>
                      <p className="mt-1 text-xs text-[#8b6d4b]">
                        접수 시각 {entry.submittedAt}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-[rgba(123,91,52,0.18)] pt-4">
                    <p className="text-[10px] uppercase tracking-[0.26em] text-[#8b6742]">
                      Exhibition Record
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-[#6e5639]">
                      전시 기록 순번 {String(index + 1).padStart(2, "0")}번 작품입니다.
                      감상 후 집중 갤러리로 이동하거나 바로 투표할 수 있습니다.
                    </p>
                  </div>

                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    <Link
                      href={focusGalleryHref}
                      className="rounded-full border border-[rgba(123,91,52,0.32)] bg-white/92 px-3 py-2 text-center text-xs text-[#7f5c34] transition hover:bg-[rgba(255,247,233,0.95)]"
                    >
                      집중 감상으로 이동
                    </Link>
                    <button
                      className="rounded-full border border-[rgba(123,91,52,0.36)] bg-[rgba(255,245,228,0.9)] px-3 py-2 text-sm text-[#6f4f2d] transition hover:bg-[rgba(250,236,211,0.95)] disabled:opacity-60"
                      onClick={() => voteMutation.mutate(entry.entryId)}
                      disabled={Boolean(pendingVoteEntryId) || !canVote}
                    >
                      {!canVote ? "로그인 후 투표 가능" : isVotingEntry ? "투표 중..." : "이 작품에 투표"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      );
    }

    return (
      <div className={`mt-5 grid gap-4 ${compact ? "md:grid-cols-3" : "sm:grid-cols-2"}`}>
        {visibleEntries.map((entry) => {
          const isPrivateBeforeExhibition = mode === "UPCOMING" || mode === "SUBMISSION" || mode === "REVIEW";
          const showVoteCountBadge = mode === "ENDED";
          const currentRank = rankMap.get(entry.entryId);
          const isTopThree = mode === "ENDED" && currentRank !== undefined && currentRank <= 3;
          const cardClass =
            mode === "UPCOMING"
                ? "border-dashed border-[rgba(194,123,77,0.3)] bg-[rgba(255,250,245,0.9)]"
                : mode === "REVIEW"
                  ? "border-[rgba(153,127,48,0.3)] bg-[rgba(255,250,232,0.92)]"
                : mode === "ENDED"
                  ? "border-[rgba(123,91,52,0.28)] bg-[rgba(252,248,241,0.92)]"
                  : "border-[rgba(11,91,91,0.26)] bg-[rgba(245,252,251,0.92)]";
          const motionClass =
            mode === "UPCOMING"
              ? "phase-upcoming-card transition duration-300 hover:-translate-y-0.5"
              : mode === "SUBMISSION"
                ? "phase-submission-card transition duration-250 hover:-translate-y-0.5"
                : mode === "REVIEW"
                  ? "phase-upcoming-card transition duration-250 hover:-translate-y-0.5"
                  : "phase-ended-card transition duration-300 hover:-translate-y-0.5";

          return (
            <article key={entry.entryId} className={`overflow-hidden rounded-[18px] border ${cardClass} ${motionClass}`}>
              {isPrivateBeforeExhibition ? null : (
                <div className="relative">
                  {entry.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={entry.imageUrl}
                      alt={entry.title ?? "contest entry"}
                      className="h-44 w-full object-cover"
                    />
                  ) : (
                    <div className="h-44 w-full bg-[color:var(--chip)]" />
                  )}
                  {isTopThree && (
                    <div className="absolute left-3 top-3 rounded-full bg-[rgba(123,91,52,0.88)] px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-white">
                      #{currentRank}
                    </div>
                  )}
                </div>
              )}
              <div className="p-4">
                <p className="truncate text-base font-semibold text-[color:var(--canvas-ink)]">
                  {isPrivateBeforeExhibition ? entry.artistName : entry.title ?? "Untitled"}
                </p>
                <p className="mt-1 text-xs text-[color:var(--muted)]">
                  {isPrivateBeforeExhibition ? `접수 시각 ${entry.submittedAt}` : `${entry.artistName} · ${entry.submittedAt}`}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className="rounded-full bg-[color:var(--chip)] px-2 py-1 text-[color:var(--accent)]"
                  >
                    {entryStatusLabel[entry.status] ?? entry.status}
                  </span>
                  {showVoteCountBadge && (
                    <span className="rounded-full border border-[color:var(--line)] px-2 py-1 text-[color:var(--muted)]">
                      득표 {voteCountMap.get(entry.entryId) ?? 0}
                    </span>
                  )}
                </div>
                <div className="mt-4 rounded-full border border-[color:var(--line)] px-3 py-2 text-center text-xs text-[color:var(--muted)]">
                  {mode === "UPCOMING"
                    ? "전시 시작 전 비공개"
                    : mode === "SUBMISSION"
                      ? "전시 시작 후 공개"
                      : mode === "REVIEW"
                        ? "심사 진행 중 비공개"
                      : "전시 아카이브"}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    );
  };

  const renderRankingPanel = (
    title: string,
    description: string,
    variant: "light" | "dark" | "studio" | "archive" = "light",
  ) => {
    const isDark = variant === "dark";
    const panelClass =
      variant === "dark"
        ? "border-[rgba(123,157,212,0.35)] bg-[rgba(14,24,38,0.8)]"
        : variant === "studio"
          ? "border-[rgba(11,91,91,0.22)] bg-[rgba(245,252,251,0.9)]"
          : variant === "archive"
            ? "border-[rgba(123,91,52,0.22)] bg-[rgba(252,248,241,0.9)]"
            : "border-[color:var(--line)] bg-white/90";

    return (
      <div className={`rounded-[28px] border p-8 shadow-[var(--shadow)] ${panelClass}`}>
        <h2 className={`font-[var(--font-display)] text-2xl ${isDark ? "text-[#ecf3ff]" : ""}`}>{title}</h2>
        <p className={`mt-2 text-sm ${isDark ? "text-[#b7c8e5]" : "text-[color:var(--muted)]"}`}>{description}</p>

        {rankingLoading ? (
          <div className="mt-4 grid gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full rounded-[12px]" />
            ))}
          </div>
        ) : (
          <>
            {rankingError && (
              <div
                className={`mt-4 rounded-[16px] border px-4 py-2 text-xs ${
                  isDark
                    ? "border-[rgba(123,157,212,0.3)] bg-[rgba(17,28,44,0.7)] text-[#b7c8e5]"
                    : "border-[color:var(--line)] bg-white/80 text-[color:var(--muted)]"
                }`}
              >
                랭킹을 불러오지 못했습니다.
                {rankingError ? ` (${rankingError})` : ""}
              </div>
            )}

            {ranking.length === 0 ? (
              <div
                className={`mt-4 rounded-[16px] border px-4 py-3 text-sm ${
                  isDark
                    ? "border-[rgba(123,157,212,0.3)] bg-[rgba(17,28,44,0.7)] text-[#b7c8e5]"
                    : "border-[color:var(--line)] bg-white/80 text-[color:var(--muted)]"
                }`}
              >
                랭킹 데이터가 없습니다.
              </div>
            ) : (
              <div className="mt-4 grid gap-2">
                {ranking.map((item) => (
                  <div
                    key={item.entryId}
                    className={`flex items-center justify-between rounded-[14px] border px-3 py-2 ${
                      isDark
                        ? "border-[rgba(123,157,212,0.3)] bg-[rgba(17,28,44,0.65)]"
                        : "border-[color:var(--line)] bg-white/80"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-8 text-sm font-semibold ${isDark ? "text-[#d5e6ff]" : "text-[color:var(--accent)]"}`}>
                        {item.rank}위
                      </span>
                      <div>
                        <p className={`text-sm font-medium ${isDark ? "text-[#ecf3ff]" : "text-[color:var(--canvas-ink)]"}`}>
                          {item.title ?? "Untitled"}
                        </p>
                        <p className={`text-xs ${isDark ? "text-[#b7c8e5]" : "text-[color:var(--muted)]"}`}>{item.artistName}</p>
                      </div>
                    </div>
                    <span className={`text-xs ${isDark ? "text-[#b7c8e5]" : "text-[color:var(--muted)]"}`}>{item.voteCount}표</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderSubmissionStudio = () => (
    <div
      id="submission-studio"
      className="rounded-[28px] border border-[rgba(11,91,91,0.24)] bg-[rgba(245,252,251,0.92)] p-8 shadow-[var(--shadow)]"
    >
      <p className="text-[10px] uppercase tracking-[0.32em] text-[color:var(--accent)]">{submitMeta.kicker}</p>
      <h2 className="mt-2 font-[var(--font-display)] text-3xl">{submitMeta.title}</h2>
      <p className="mt-2 text-sm text-[color:var(--muted)]">{submitMeta.description} JPEG/PNG, 최대 100MB.</p>

      {!canSubmit && hasToken && (
        <div className="mt-4 rounded-[16px] border border-[color:var(--line)] bg-[color:var(--chip)] px-4 py-2 text-xs text-[color:var(--muted)]">
          출품권 결제 후 출품이 가능합니다.
        </div>
      )}

      {needsCredit && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-[color:var(--line)] bg-white/80 px-4 py-3 text-xs text-[color:var(--muted)]">
          <div>해당 콘테스트 출품권이 없습니다. 결제 1회당 이 콘테스트 출품권 1개가 추가됩니다.</div>
          <button
            className="rounded-full border border-[color:var(--accent)] px-4 py-2 text-xs text-[color:var(--accent)] transition hover:bg-[color:var(--accent)] hover:text-white"
            onClick={openPayment}
          >
            출품권 결제하기
          </button>
        </div>
      )}

      {!hasToken && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-[color:var(--line)] bg-white/80 px-4 py-3 text-xs text-[color:var(--muted)]">
          <div>로그인 후 결제 및 출품을 진행할 수 있습니다.</div>
          <Link
            href="/login"
            className="rounded-full border border-[color:var(--line)] px-4 py-2 text-xs text-[color:var(--muted)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
          >
            로그인하러 가기
          </Link>
        </div>
      )}

      <div className="mt-5 grid gap-3">
        <input
          className="h-11 rounded-[16px] border border-[color:var(--line)] bg-white px-4 text-sm text-[color:var(--canvas-ink)] focus:border-[color:var(--accent)] focus:outline-none"
          placeholder="작품 제목"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          disabled={!canSubmit}
        />
        <textarea
          className="min-h-[90px] rounded-[16px] border border-[color:var(--line)] bg-white px-4 py-3 text-sm text-[color:var(--canvas-ink)] focus:border-[color:var(--accent)] focus:outline-none"
          placeholder="작품 설명"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={!canSubmit}
        />
        <div className="rounded-[16px] border border-[color:var(--line)] bg-white/85 p-4">
          <input
            id="contest-entry-file"
            type="file"
            accept="image/jpeg,image/png,image/jpg"
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
            className="sr-only"
            disabled={!canSubmit}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-[color:var(--canvas-ink)]">출품 파일 선택</p>
              <p className="mt-1 text-[11px] text-[color:var(--muted)]">
                JPEG/PNG, 최대 100MB, 최소 3000px 해상도
              </p>
            </div>
            <label
              htmlFor="contest-entry-file"
              className={`rounded-full px-4 py-2 text-xs transition ${
                canSubmit
                  ? "cursor-pointer border border-[color:var(--accent)] bg-[rgba(11,91,91,0.08)] text-[color:var(--accent)] hover:bg-[rgba(11,91,91,0.14)]"
                  : "cursor-not-allowed border border-[color:var(--line)] bg-[color:var(--chip)] text-[color:var(--muted)]"
              }`}
            >
              파일 선택
            </label>
          </div>
          <div className="mt-3 rounded-[12px] border border-[color:var(--line)] bg-white px-3 py-2 text-xs text-[color:var(--muted)]">
            {file
              ? `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)${
                fileMeta ? ` · ${fileMeta.width} x ${fileMeta.height}px` : ""
              }`
              : "선택된 파일 없음"}
          </div>
        </div>

        {uploadStatusLabel && (
          <div className="rounded-[16px] border border-[color:var(--line)] bg-white/80 px-4 py-2 text-xs text-[color:var(--muted)]">
            {uploadStatusLabel}
            {uploadStage === "uploading" && (
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[color:var(--line)]">
                <div
                  className="h-full rounded-full bg-[color:var(--accent)] transition-[width] duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>
        )}

        {uploadError && (
          <div className="rounded-[16px] border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
            {uploadError}
          </div>
        )}

        {uploadedImageUrl && (
          <div className="rounded-[16px] border border-[color:var(--line)] bg-white/80 p-3">
            <p className="text-xs text-[color:var(--muted)]">업로드된 이미지 미리보기</p>
            <div className="mt-2 overflow-hidden rounded-[14px] border border-[color:var(--line)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={uploadedImageUrl} alt="업로드 미리보기" className="h-40 w-full object-cover" />
            </div>
          </div>
        )}

        <button
          className="mt-2 rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm text-white shadow-[var(--shadow)] disabled:opacity-60"
          onClick={() => uploadMutation.mutate()}
          disabled={!canSubmit || !file || uploadMutation.isPending || isUploading}
        >
          {!canSubmit ? "결제 후 출품 가능" : uploadMutation.isPending || isUploading ? "업로드 중..." : "출품하기"}
        </button>
      </div>
    </div>
  );

  const renderPhaseLayout = () => {
    if (isUpcomingPhase) {
      return (
        <>
          <section className="phase-upcoming-page phase-upcoming-enter relative mt-10 overflow-hidden rounded-[34px] p-6 md:p-10">
            <div className="relative z-10 grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
              <article className="rounded-[28px] border border-[rgba(181,119,76,0.22)] bg-[rgba(255,252,247,0.94)] p-6 shadow-[0_16px_32px_rgba(92,66,37,0.09)] md:p-8">
                <p className="inline-flex rounded-full border border-[rgba(181,119,76,0.35)] bg-white px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-[#825735]">
                  SEASON PREVIEW
                </p>
                <h1 className={`mt-5 text-4xl leading-tight text-[#26180f] md:text-5xl ${tone.titleClass}`}>{contest?.theme}</h1>
                <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[#5d4532]">
                  {contest?.description ?? "콘테스트 설명이 아직 등록되지 않았습니다."}
                </p>
                <p className="mt-3 text-sm text-[#7d5838]">{phaseInfo.note}</p>
                <div className="mt-7 grid gap-3 sm:grid-cols-3">
                  {phaseActionBoard.UPCOMING.map((item) => (
                    <article key={`upcoming-head-${item.kicker}`} className="rounded-[16px] border border-[rgba(181,119,76,0.2)] bg-white/90 p-4">
                      <p className="text-[10px] uppercase tracking-[0.26em] text-[#9b6a3e]">{item.kicker}</p>
                      <p className="mt-1 text-sm font-semibold text-[#3f2c1c]">{item.title}</p>
                      <p className="mt-1 text-xs text-[#715640]">{item.description}</p>
                    </article>
                  ))}
                </div>
              </article>

              <aside className="grid gap-4">
                <article className="rounded-[24px] border border-[rgba(181,119,76,0.22)] bg-[rgba(255,250,244,0.92)] p-6 shadow-[0_14px_30px_rgba(92,66,37,0.08)]">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-[#8d623c]">Open Countdown</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[14px] border border-[rgba(181,119,76,0.2)] bg-white/92 p-4">
                      <p className="text-xs text-[#7b5c44]">출품 시작</p>
                      <p className="mt-1 text-3xl font-semibold text-[#2a1d13]">{submissionOpenCountdown}</p>
                    </div>
                    <div className="rounded-[14px] border border-[rgba(181,119,76,0.2)] bg-white/92 p-4">
                      <p className="text-xs text-[#7b5c44]">전시 시작</p>
                      <p className="mt-1 text-3xl font-semibold text-[#2a1d13]">{votingOpenCountdown}</p>
                    </div>
                  </div>
                </article>
                <article className="rounded-[24px] border border-[rgba(181,119,76,0.22)] bg-[rgba(255,250,244,0.9)] p-6 shadow-[0_14px_30px_rgba(92,66,37,0.08)]">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-[#8d623c]">Release Timeline</p>
                  <ol className="mt-3 grid gap-2 text-sm text-[#6a503a]">
                    <li>출품 시작: {formatSchedule(contest?.submissionStartAt)}</li>
                    <li>출품 마감: {formatSchedule(contest?.submissionEndAt)}</li>
                    <li>전시 시작: {formatSchedule(contest?.votingStartAt)}</li>
                    <li>전시 종료: {formatSchedule(contest?.votingEndAt)}</li>
                  </ol>
                </article>
                <div className="flex flex-wrap gap-3">
                  <button className={tone.primaryButtonClass} onClick={() => scrollToSection("upcoming-rulebook")}>
                    규칙 확인
                  </button>
                  <button className={tone.secondaryButtonClass} onClick={() => scrollToSection("upcoming-preview-grid")}>
                    프리뷰 월 이동
                  </button>
                </div>
              </aside>
            </div>
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
            <article
              id="upcoming-rulebook"
              className="rounded-[30px] border border-[rgba(181,119,76,0.24)] bg-[rgba(255,250,244,0.9)] p-8 shadow-[var(--shadow)]"
            >
              <h2 className="font-[var(--font-display)] text-3xl text-[#2a1d13]">Preparation Packet</h2>
              <p className="mt-2 text-sm text-[#715640]">오픈 전 단계에서 탈락 요소를 선제적으로 제거하세요.</p>
              <ul className="mt-5 grid gap-2 text-sm text-[#6e553f]">
                {(contest?.rules ?? []).map((rule) => (
                  <li key={rule} className="rounded-[14px] border border-[rgba(181,119,76,0.2)] bg-white/88 px-4 py-3">
                    {rule}
                  </li>
                ))}
              </ul>
            </article>

            <article
              id="upcoming-preview-grid"
              className="rounded-[30px] border border-[rgba(181,119,76,0.2)] bg-[rgba(255,253,249,0.94)] p-8 shadow-[var(--shadow)]"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-[var(--font-display)] text-3xl text-[#2a1d13]">Private Queue</h2>
                <span className="rounded-full border border-[rgba(181,119,76,0.24)] bg-white/90 px-3 py-1 text-xs text-[#806042]">Private</span>
              </div>
              <p className="mt-2 text-sm text-[#715640]">전시 시작 전까지 출품작 썸네일과 정보는 비공개로 유지됩니다.</p>
              {renderEntryGrid("UPCOMING", "비공개 대기 중인 출품작이 없습니다.", 6, { compact: true })}
            </article>
          </section>
        </>
      );
    }

    if (isSubmissionPhase) {
      return (
        <>
          <section className="phase-submission-page phase-submission-enter relative mt-10 overflow-hidden rounded-[34px] p-6 md:p-10">
            <div className="relative z-10">
              <header className="rounded-[26px] border border-[rgba(12,105,97,0.24)] bg-[rgba(244,255,252,0.92)] p-6 shadow-[0_16px_32px_rgba(12,75,71,0.1)] md:p-8">
                <p className="inline-flex rounded-full border border-[rgba(12,105,97,0.32)] bg-white px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-[#0b5f58]">
                  SUBMISSION CONSOLE
                </p>
                <h1 className={`mt-4 text-4xl leading-tight text-[#103f3b] md:text-5xl ${tone.titleClass}`}>{contest?.theme}</h1>
                <p className="mt-3 text-sm leading-relaxed text-[#2a615a]">{phaseInfo.note}</p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button className={`${tone.primaryButtonClass} phase-submission-button`} onClick={openPayment} disabled={purchaseMutation.isPending}>
                    {purchaseMutation.isPending ? "결제 처리 중..." : "출품권 결제"}
                  </button>
                  <button className={tone.secondaryButtonClass} onClick={() => scrollToSection("submission-studio")}>
                    출품 폼 이동
                  </button>
                  {hasToken && (
                    <span className="rounded-full border border-[rgba(12,105,97,0.24)] bg-white px-3 py-1 text-xs text-[#29635d]">
                      이 콘테스트 보유 출품권 {credits}개
                    </span>
                  )}
                </div>
              </header>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <article className="rounded-[18px] border border-[rgba(12,105,97,0.2)] bg-[rgba(250,255,254,0.9)] p-4">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-[#2b6c64]">Submission Progress</p>
                  <p className="mt-2 text-3xl font-semibold text-[#103f3b]">{submissionProgress}%</p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[rgba(12,105,97,0.14)]">
                    <div className="h-full rounded-full bg-[#0d7469] transition-[width] duration-500" style={{ width: `${submissionProgress}%` }} />
                  </div>
                </article>
                <article className="rounded-[18px] border border-[rgba(12,105,97,0.2)] bg-[rgba(250,255,254,0.9)] p-4">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-[#2b6c64]">Submission Window</p>
                  <p className="mt-2 text-xs text-[#2f6f68]">{formatSchedule(contest?.submissionStartAt)}</p>
                  <p className="text-xs text-[#2f6f68]">~ {formatSchedule(contest?.submissionEndAt)}</p>
                </article>
                <article className="rounded-[18px] border border-[rgba(12,105,97,0.2)] bg-[rgba(250,255,254,0.9)] p-4">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-[#2b6c64]">Queue Size</p>
                  <p className="mt-2 text-3xl font-semibold text-[#103f3b]">{formatNumber(entries.length)}</p>
                  <p className="mt-1 text-xs text-[#2f6f68]">등록/검토 대상 작품</p>
                </article>
                <article className="rounded-[18px] border border-[rgba(12,105,97,0.2)] bg-[rgba(250,255,254,0.9)] p-4">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-[#2b6c64]">Entry Fee</p>
                  <p className="mt-2 text-3xl font-semibold text-[#103f3b]">{formatNumber(contest?.entryFee ?? 0)}원</p>
                  <p className="mt-1 text-xs text-[#2f6f68]">해당 콘테스트 출품권 1개 = 해당 콘테스트 출품 1회</p>
                </article>
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-6 2xl:grid-cols-[0.86fr_1.18fr_0.96fr]">
            <article className="rounded-[30px] border border-[rgba(12,105,97,0.22)] bg-[rgba(244,255,252,0.9)] p-8 shadow-[var(--shadow)]">
              <h2 className="font-[var(--font-display)] text-3xl text-[#103f3b]">Operations Queue</h2>
              <p className="mt-2 text-sm text-[#2f6f68]">제출부터 공개 대기까지 운영 흐름을 체크하세요.</p>
              <div className="mt-5 grid gap-3">
                {phaseActionBoard.SUBMISSION.map((item) => (
                  <article key={`submission-ops-${item.kicker}`} className="phase-submission-card rounded-[16px] border border-[rgba(12,105,97,0.22)] bg-white/90 p-4">
                    <p className="text-[10px] uppercase tracking-[0.26em] text-[#0d7469]">{item.kicker}</p>
                    <p className="mt-1 text-sm font-semibold text-[#1b4d48]">{item.title}</p>
                    <p className="mt-1 text-xs text-[#3d756f]">{item.description}</p>
                  </article>
                ))}
              </div>
            </article>

            {renderSubmissionStudio()}

            <aside className="grid gap-6">
              {renderRankingPanel("전시 전 랭킹", "전시 시작 후 실시간 랭킹이 활성화됩니다.", "studio")}
              <article className="rounded-[30px] border border-[rgba(12,105,97,0.2)] bg-[rgba(244,255,252,0.9)] p-8 shadow-[var(--shadow)]">
                <h2 className="font-[var(--font-display)] text-2xl text-[#103f3b]">Submission Queue</h2>
                <p className="mt-2 text-sm text-[#2f6f68]">출품 기간에는 작품이 비공개로 접수되며 전시 시작 후 공개됩니다.</p>
                {renderEntryGrid("SUBMISSION", "접수된 출품작이 아직 없습니다.", 4)}
              </article>
            </aside>
          </section>
        </>
      );
    }

    if (isReviewPhase) {
      return (
        <>
          <section className="phase-submission-page phase-submission-enter relative mt-10 overflow-hidden rounded-[34px] p-6 md:p-10">
            <div className="relative z-10">
              <header className="rounded-[26px] border border-[rgba(153,127,48,0.26)] bg-[rgba(255,251,237,0.93)] p-6 shadow-[0_16px_32px_rgba(104,82,22,0.1)] md:p-8">
                <p className="inline-flex rounded-full border border-[rgba(153,127,48,0.34)] bg-white px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-[#6f5714]">
                  REVIEW CONSOLE
                </p>
                <h1 className={`mt-4 text-4xl leading-tight text-[#4f3d0d] md:text-5xl ${tone.titleClass}`}>{contest?.theme}</h1>
                <p className="mt-3 text-sm leading-relaxed text-[#6e5b26]">{phaseInfo.note}</p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-[rgba(153,127,48,0.28)] bg-white px-3 py-1 text-xs text-[#6e5b26]">
                    출품 마감 · 심사 진행
                  </span>
                  <span className="rounded-full border border-[rgba(153,127,48,0.28)] bg-white px-3 py-1 text-xs text-[#6e5b26]">
                    심사 기간 진행률 {reviewProgress ?? 0}%
                  </span>
                </div>
              </header>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <article className="rounded-[18px] border border-[rgba(153,127,48,0.24)] bg-[rgba(255,251,240,0.94)] p-4">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-[#7a6420]">Review Progress</p>
                  <p className="mt-2 text-3xl font-semibold text-[#4f3d0d]">{reviewProgress}%</p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[rgba(153,127,48,0.16)]">
                    <div className="h-full rounded-full bg-[#8a6b19] transition-[width] duration-500" style={{ width: `${reviewProgress}%` }} />
                  </div>
                </article>
                <article className="rounded-[18px] border border-[rgba(153,127,48,0.24)] bg-[rgba(255,251,240,0.94)] p-4">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-[#7a6420]">Review Window</p>
                  <p className="mt-2 text-xs text-[#6b5620]">{formatSchedule(contest?.submissionEndAt)}</p>
                  <p className="text-xs text-[#6b5620]">~ {formatSchedule(contest?.votingStartAt)}</p>
                </article>
                <article className="rounded-[18px] border border-[rgba(153,127,48,0.24)] bg-[rgba(255,251,240,0.94)] p-4">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-[#7a6420]">Queue Size</p>
                  <p className="mt-2 text-3xl font-semibold text-[#4f3d0d]">{formatNumber(entries.length)}</p>
                  <p className="mt-1 text-xs text-[#6b5620]">심사 대상 작품</p>
                </article>
                <article className="rounded-[18px] border border-[rgba(153,127,48,0.24)] bg-[rgba(255,251,240,0.94)] p-4">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-[#7a6420]">Exhibition Open</p>
                  <p className="mt-2 text-3xl font-semibold text-[#4f3d0d]">{votingOpenCountdown}</p>
                  <p className="mt-1 text-xs text-[#6b5620]">전시 시작 카운트다운</p>
                </article>
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
            <article className="rounded-[30px] border border-[rgba(153,127,48,0.24)] bg-[rgba(255,251,240,0.92)] p-8 shadow-[var(--shadow)]">
              <h2 className="font-[var(--font-display)] text-3xl text-[#4f3d0d]">Review Checklist</h2>
              <p className="mt-2 text-sm text-[#6b5620]">전시 공개 전 심사 상태를 확정하세요.</p>
              <div className="mt-5 grid gap-3">
                {phaseActionBoard.REVIEW.map((item) => (
                  <article key={`review-ops-${item.kicker}`} className="rounded-[16px] border border-[rgba(153,127,48,0.22)] bg-white/92 p-4">
                    <p className="text-[10px] uppercase tracking-[0.26em] text-[#866a1d]">{item.kicker}</p>
                    <p className="mt-1 text-sm font-semibold text-[#5f4910]">{item.title}</p>
                    <p className="mt-1 text-xs text-[#7a6428]">{item.description}</p>
                  </article>
                ))}
              </div>
            </article>

            <aside className="grid gap-6">
              {renderRankingPanel("전시 전 랭킹", "심사 확정 후 전시가 공개되면 투표 랭킹이 활성화됩니다.", "studio")}
              <article className="rounded-[30px] border border-[rgba(153,127,48,0.24)] bg-[rgba(255,251,240,0.92)] p-8 shadow-[var(--shadow)]">
                <h2 className="font-[var(--font-display)] text-2xl text-[#4f3d0d]">Review Queue</h2>
                <p className="mt-2 text-sm text-[#6b5620]">심사 단계에서는 작품 이미지가 비공개 상태로 유지됩니다.</p>
                {renderEntryGrid("REVIEW", "심사 대기 작품이 없습니다.", 6)}
              </article>
            </aside>
          </section>
        </>
      );
    }

    if (isVotingPhase) {
      return (
        <>
          <section className="phase-voting-page phase-voting-enter relative mt-10 overflow-hidden rounded-[34px] p-6 md:p-10">
            <div className="relative z-10">
              <header
                id="voting-gallery"
                className="overflow-hidden rounded-[28px] border border-[rgba(123,91,52,0.3)] bg-[linear-gradient(180deg,rgba(255,252,247,0.97)_0%,rgba(250,244,234,0.95)_100%)] shadow-[0_18px_34px_rgba(94,68,39,0.12)]"
              >
                <div className="border-b border-[rgba(123,91,52,0.2)] px-6 py-6 md:px-8 md:py-7">
                  <p className="inline-flex rounded-full border border-[rgba(123,91,52,0.38)] bg-[rgba(255,246,230,0.9)] px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-[#6f4f2d]">
                    EXHIBITION HALL
                  </p>
                  <h1 className={`mt-5 text-4xl leading-tight text-[#352614] md:text-5xl ${tone.titleClass}`}>{contest?.theme}</h1>
                  <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#75593c]">{phaseInfo.note}</p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button className={`${tone.primaryButtonClass} phase-voting-button`} onClick={() => scrollToSection("voting-gallery-grid")}>
                      작품 바로 보기
                    </button>
                    <button className={tone.secondaryButtonClass} onClick={() => scrollToSection("voting-guide")}>
                      전시 안내 이동
                    </button>
                    <Link
                      href={`/contest/${id}/gallery?tab=contest`}
                      className="rounded-full border border-[rgba(123,91,52,0.34)] bg-[rgba(255,246,230,0.9)] px-5 py-3 text-sm text-[#7f5c34] transition hover:bg-[rgba(250,236,211,0.95)]"
                    >
                      집중 갤러리
                    </Link>
                  </div>
                </div>

                <div className="grid gap-3 px-6 py-5 md:grid-cols-2 md:px-8">
                  <article className="rounded-[14px] border border-[rgba(123,91,52,0.25)] bg-white/90 p-4">
                    <p className="text-xs text-[#7c5e3f]">전시 기간</p>
                    <p className="mt-1 text-sm text-[#5f4428]">
                      {formatSchedule(contest?.votingStartAt)} ~ {formatSchedule(contest?.votingEndAt)}
                    </p>
                  </article>
                  <article className="rounded-[14px] border border-[rgba(123,91,52,0.25)] bg-white/90 p-4">
                    <p className="text-xs text-[#7c5e3f]">전시 진행률</p>
                    <p className="mt-1 text-2xl font-semibold text-[#5f4428]">{votingProgress}%</p>
                  </article>
                </div>
              </header>

              <section id="voting-guide" className="mt-6">
                <article className="rounded-[24px] border border-[rgba(123,91,52,0.28)] bg-[rgba(255,251,244,0.92)] p-6 shadow-[0_14px_30px_rgba(94,68,39,0.1)]">
                  <h2 className="font-[var(--font-display)] text-2xl text-[#4f3621]">Exhibition Notes</h2>
                  <ul className="mt-4 grid gap-2 text-sm text-[#7a6042]">
                    {(contest?.rules ?? []).map((rule) => (
                      <li key={rule} className="rounded-[12px] border border-[rgba(123,91,52,0.25)] bg-white/92 px-3 py-2">
                        {rule}
                      </li>
                    ))}
                  </ul>
                  {!hasToken && (
                    <div className="mt-4 flex items-center justify-between gap-3 rounded-[14px] border border-[rgba(123,91,52,0.25)] bg-white/92 px-3 py-3 text-xs text-[#7a6042]">
                      <span>투표는 로그인 후 가능합니다.</span>
                      <Link
                        href="/login"
                        className="rounded-full border border-[rgba(123,91,52,0.34)] bg-[rgba(255,246,230,0.9)] px-3 py-1.5 text-[#7f5c34] transition hover:bg-[rgba(250,236,211,0.95)]"
                      >
                        로그인
                      </Link>
                    </div>
                  )}
                </article>
              </section>

              <section id="voting-gallery-grid" className="mt-8">
                <div className="mb-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.26em] text-[#8b6742]">Exhibition Records</p>
                    <h2 className="mt-1 font-[var(--font-display)] text-2xl text-[#4f3621]">전시관 기록전</h2>
                  </div>
                  <span className="rounded-full border border-[rgba(123,91,52,0.3)] bg-white/90 px-3 py-1 text-xs text-[#7a6042]">
                    총 {formatNumber(entries.length)} 작품
                  </span>
                </div>
                {renderEntryGrid("VOTING", "전시 중인 출품작이 없습니다.")}
              </section>
            </div>
          </section>
        </>
      );
    }

    const winnerShowcase = topWinners.length > 0 ? topWinners : ranking.slice(0, 3);
    return (
      <>
        <section className="phase-ended-page phase-ended-enter relative mt-10 overflow-hidden rounded-[34px] p-6 md:p-10">
          <div className="relative z-10">
            <header className="rounded-[26px] border border-[rgba(120,88,52,0.24)] bg-[rgba(252,248,241,0.92)] p-6 shadow-[0_16px_32px_rgba(74,53,30,0.1)] md:p-8">
              <p className="inline-flex rounded-full border border-[rgba(120,88,52,0.34)] bg-white px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-[#6f4f2d]">
                FINAL REPORT
              </p>
              <h1 className={`mt-4 text-4xl leading-tight text-[#352614] md:text-5xl ${tone.titleClass}`}>{contest?.theme}</h1>
              <p className="mt-3 text-sm leading-relaxed text-[#634a31]">{phaseInfo.note}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button className={`${tone.primaryButtonClass} phase-ended-button`} onClick={() => scrollToSection("ended-winners")}>
                  수상작 보기
                </button>
                <Link href="/contest?tab=contest" className={tone.secondaryButtonClass}>
                  다음 시즌 보기
                </Link>
              </div>
            </header>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-[18px] border border-[rgba(120,88,52,0.2)] bg-[rgba(255,252,246,0.9)] p-4">
                <p className="text-[10px] uppercase tracking-[0.24em] text-[#7a5a37]">Total Entries</p>
                <p className="mt-2 text-3xl font-semibold text-[#352614]">{formatNumber(entries.length)}</p>
              </article>
              <article className="rounded-[18px] border border-[rgba(120,88,52,0.2)] bg-[rgba(255,252,246,0.9)] p-4">
                <p className="text-[10px] uppercase tracking-[0.24em] text-[#7a5a37]">Total Votes</p>
                <p className="mt-2 text-3xl font-semibold text-[#352614]">{formatNumber(totalVotes)}</p>
              </article>
              <article className="rounded-[18px] border border-[rgba(120,88,52,0.2)] bg-[rgba(255,252,246,0.9)] p-4">
                <p className="text-[10px] uppercase tracking-[0.24em] text-[#7a5a37]">1st Place</p>
                <p className="mt-2 text-sm font-semibold text-[#352614]">{winnerShowcase[0]?.title ?? "미집계"}</p>
              </article>
              <article className="rounded-[18px] border border-[rgba(120,88,52,0.2)] bg-[rgba(255,252,246,0.9)] p-4">
                <p className="text-[10px] uppercase tracking-[0.24em] text-[#7a5a37]">Season Status</p>
                <p className="mt-2 text-sm font-semibold text-[#352614]">결과 확정 / 아카이브 공개</p>
              </article>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
          <article className="rounded-[30px] border border-[rgba(120,88,52,0.24)] bg-[rgba(252,248,241,0.92)] p-8 shadow-[var(--shadow)]">
            <h2 className="font-[var(--font-display)] text-3xl text-[#352614]">Archive Gallery</h2>
            <p className="mt-2 text-sm text-[#634a31]">종료된 콘테스트 작품과 최종 결과를 보관합니다.</p>
            {renderEntryGrid("ENDED", "아카이브 작품이 없습니다.", 6, { compact: true })}
          </article>

          <aside className="grid gap-6">
            <article id="ended-winners" className="rounded-[30px] border border-[rgba(120,88,52,0.24)] bg-[rgba(252,248,241,0.92)] p-8 shadow-[var(--shadow)]">
              <h2 className="font-[var(--font-display)] text-2xl text-[#352614]">Winner Snapshot</h2>
              <div className="mt-4 grid gap-3">
                {winnerShowcase.map((winner) => (
                  <div key={winner.entryId} className="rounded-[14px] border border-[rgba(120,88,52,0.2)] bg-white/90 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7d5e3d]">{winner.rank}위</p>
                    <p className="mt-1 text-sm font-semibold text-[#352614]">{winner.title ?? "Untitled"}</p>
                    <p className="mt-1 text-xs text-[#6f573e]">{winner.artistName} · {winner.voteCount}표</p>
                  </div>
                ))}
                {winnerShowcase.length === 0 && (
                  <div className="rounded-[14px] border border-[rgba(120,88,52,0.2)] bg-white/90 px-4 py-3 text-sm text-[#6f573e]">
                    아직 최종 수상작 데이터가 없습니다.
                  </div>
                )}
              </div>
            </article>

            {renderRankingPanel("Final Ranking", "최종 집계 기준 랭킹입니다.", "archive")}

            <article className="rounded-[30px] border border-[rgba(120,88,52,0.24)] bg-[rgba(252,248,241,0.92)] p-8 shadow-[var(--shadow)]">
              <h2 className="font-[var(--font-display)] text-2xl text-[#352614]">Post Season Notes</h2>
              <ul className="mt-4 grid gap-2 text-sm text-[#634a31]">
                {phaseActionBoard.ENDED.map((item) => (
                  <li key={`ended-${item.kicker}`} className="rounded-[12px] border border-[rgba(120,88,52,0.2)] bg-white/90 px-3 py-2">
                    {item.title} - {item.description}
                  </li>
                ))}
              </ul>
            </article>
          </aside>
        </section>
      </>
    );
  };

  return (
    <PageShell>
      <TopNav />

      {isLoading ? (
        <section className="mt-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[28px] border border-[color:var(--line)] bg-white/70 p-8 shadow-[var(--shadow)]">
            <Skeleton className="h-5 w-28 rounded-full" />
            <Skeleton className="mt-4 h-10 w-2/3 rounded-[16px]" />
            <SkeletonText className="mt-4" lines={3} />
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-12 rounded-[14px]" />
              <Skeleton className="h-12 rounded-[14px]" />
              <Skeleton className="h-12 rounded-[14px]" />
              <Skeleton className="h-12 rounded-[14px]" />
            </div>
          </div>
          <div className="rounded-[28px] border border-[color:var(--line)] bg-white/70 p-8 shadow-[var(--shadow)]">
            <Skeleton className="h-7 w-40 rounded-[14px]" />
            <SkeletonText className="mt-4" lines={5} />
          </div>
        </section>
      ) : (
        <>
          {contest && <>{renderPhaseLayout()}</>}

          {!contest && (
            <div className="mt-10 rounded-[28px] border border-[color:var(--line)] bg-white/75 px-6 py-6 text-sm text-[color:var(--muted)] shadow-[var(--shadow)]">
              콘테스트 정보를 불러오지 못했습니다.
              {error ? ` (${error})` : ""}
            </div>
          )}
        </>
      )}

      {paymentStep !== "closed" && contest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-[28px] border border-[color:var(--line)] bg-white p-8 shadow-[var(--shadow)]">
            {paymentStep === "payment" && (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--accent)]">
                      Test Payment
                    </p>
                    <h2 className="mt-2 font-[var(--font-display)] text-2xl">출품권 결제</h2>
                    <p className="mt-2 text-sm text-[color:var(--muted)]">
                      실제 결제는 진행되지 않으며, 테스트 UI입니다.
                    </p>
                  </div>
                  <button
                    className="rounded-full border border-[color:var(--line)] px-3 py-1 text-xs text-[color:var(--muted)] transition hover:border-red-300 hover:text-red-500"
                    onClick={() => setPaymentStep("closed")}
                  >
                    닫기
                  </button>
                </div>

                <div className="mt-6 grid gap-4">
                  <div className="rounded-[18px] border border-[color:var(--line)] bg-[color:var(--chip)] px-4 py-3 text-sm text-[color:var(--canvas-ink)]">
                    참가 콘테스트: <strong>{contest.theme}</strong>
                  </div>

                <div className="rounded-[18px] border border-[color:var(--line)] bg-[color:var(--chip)] px-4 py-3 text-sm text-[color:var(--canvas-ink)]">
                  참가비 <strong>{formatNumber(contest.entryFee)}원</strong>
                </div>
                <div className="rounded-[18px] border border-[color:var(--line)] bg-white/80 px-4 py-3 text-xs text-[color:var(--muted)]">
                  출품권은 결제한 콘테스트에서만 사용할 수 있으며, 다른 콘테스트로 이동되지 않습니다.
                </div>

                  <div className="grid gap-2">
                    <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                      Payment Method
                    </p>
                    <div className="flex flex-wrap gap-3 text-sm text-[color:var(--muted)]">
                      {[
                        { id: "card", label: "카드 결제" },
                        { id: "account", label: "계좌 이체" },
                        { id: "simple", label: "간편 결제" },
                      ].map((method) => (
                        <button
                          key={method.id}
                          className={`rounded-full border px-4 py-2 transition ${
                            paymentMethod === method.id
                              ? "border-[color:var(--accent)] text-[color:var(--accent)]"
                              : "border-[color:var(--line)] text-[color:var(--muted)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                          }`}
                          onClick={() => setPaymentMethod(method.id)}
                        >
                          {method.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    className="flex-1 rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm text-white shadow-[var(--shadow)]"
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
                    className="flex-1 rounded-full border border-[color:var(--line)] px-5 py-3 text-sm text-[color:var(--muted)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                    onClick={() => setPaymentStep("closed")}
                  >
                    취소
                  </button>
                </div>
              </>
            )}

            {paymentStep === "processing" && (
              <>
                <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--accent)]">Processing</p>
                <h2 className="mt-3 font-[var(--font-display)] text-2xl">결제를 처리하고 있습니다.</h2>
                <p className="mt-2 text-sm text-[color:var(--muted)]">잠시만 기다려주세요.</p>
                <div className="mt-6 flex items-center gap-3 text-xs text-[color:var(--muted)]">
                  <div className="spinner" />
                  <span>출품권을 발급 중입니다.</span>
                </div>
              </>
            )}

            {paymentStep === "confirm" && (
              <>
                <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--accent)]">Payment Complete</p>
                <h2 className="mt-3 font-[var(--font-display)] text-2xl">출품권 결제가 완료되었습니다.</h2>
                <p className="mt-2 text-sm text-[color:var(--muted)]">
                  테스트 결제이므로 실제 승인/청구는 발생하지 않습니다.
                </p>
                <div className="mt-6 rounded-[18px] border border-[color:var(--line)] bg-white/80 px-4 py-3 text-sm text-[color:var(--muted)]">
                  {contest.theme} 출품권이 추가되었습니다.
                </div>
                <div className="mt-3 rounded-[18px] border border-[color:var(--line)] bg-[color:var(--chip)] px-4 py-3 text-sm text-[color:var(--canvas-ink)]">
                  현재 이 콘테스트 출품권: <strong>{credits}개</strong>
                </div>
                <button
                  className="mt-6 w-full rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm text-white shadow-[var(--shadow)] disabled:opacity-60"
                  onClick={() => setPaymentStep("closed")}
                >
                  확인
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .phase-upcoming-page,
        .phase-submission-page,
        .phase-voting-page,
        .phase-ended-page {
          border: 1px solid rgba(27, 22, 16, 0.09);
          box-shadow: 0 20px 48px rgba(17, 14, 11, 0.08);
          isolation: isolate;
        }

        .phase-upcoming-page::before,
        .phase-submission-page::before,
        .phase-voting-page::before,
        .phase-ended-page::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: inherit;
          z-index: 0;
        }

        .phase-upcoming-page {
          background: #faf6ef;
          border-color: rgba(181, 119, 76, 0.22);
        }
        .phase-upcoming-page::before {
          background-image:
            radial-gradient(circle at 12% 14%, rgba(181, 119, 76, 0.16) 0%, rgba(181, 119, 76, 0) 36%),
            radial-gradient(circle at 90% 88%, rgba(200, 162, 118, 0.12) 0%, rgba(200, 162, 118, 0) 32%),
            linear-gradient(120deg, rgba(145, 101, 62, 0.05) 0%, rgba(145, 101, 62, 0) 42%);
        }

        .phase-submission-page {
          background: #eef9f6;
          border-color: rgba(12, 105, 97, 0.22);
        }
        .phase-submission-page::before {
          background-image:
            linear-gradient(rgba(12, 105, 97, 0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(12, 105, 97, 0.08) 1px, transparent 1px),
            radial-gradient(circle at 88% 10%, rgba(77, 159, 151, 0.18) 0%, rgba(77, 159, 151, 0) 30%);
          background-size: 24px 24px, 24px 24px, auto;
          opacity: 0.62;
        }

        .phase-voting-page {
          background: #f6efe4;
          border-color: rgba(123, 91, 52, 0.24);
        }
        .phase-voting-page::before {
          background-image:
            radial-gradient(circle at 6% 8%, rgba(123, 91, 52, 0.15) 0%, rgba(123, 91, 52, 0) 36%),
            radial-gradient(circle at 94% 92%, rgba(161, 126, 85, 0.14) 0%, rgba(161, 126, 85, 0) 34%),
            linear-gradient(180deg, rgba(255, 252, 247, 0.88) 0%, rgba(255, 252, 247, 0.44) 100%);
        }

        .phase-ended-page {
          background: #f4ede2;
          border-color: rgba(120, 88, 52, 0.24);
        }
        .phase-ended-page::before {
          background-image:
            radial-gradient(circle at 90% 8%, rgba(120, 88, 52, 0.18) 0%, rgba(120, 88, 52, 0) 40%),
            radial-gradient(circle at 10% 88%, rgba(158, 121, 84, 0.16) 0%, rgba(158, 121, 84, 0) 32%),
            linear-gradient(140deg, rgba(148, 113, 77, 0.06) 0%, rgba(148, 113, 77, 0) 34%);
          opacity: 0.9;
        }

        .phase-upcoming-enter {
          animation: upcoming-enter 520ms ease both;
        }
        .phase-upcoming-card {
          animation: upcoming-card 360ms ease both;
        }
        .phase-upcoming-button {
          box-shadow: 0 6px 16px rgba(194, 123, 77, 0.14);
        }

        .phase-submission-enter {
          animation: submission-enter 360ms ease both;
        }
        .phase-submission-card {
          animation: submission-card 280ms ease both;
        }
        .phase-submission-button {
          transform-origin: center;
        }
        .phase-submission-button:hover {
          transform: translateY(-1px) scale(1.01);
        }

        .phase-voting-enter {
          animation: voting-enter 320ms ease both;
        }
        .phase-voting-card {
          animation: voting-card 240ms ease both;
        }
        .phase-voting-button:hover {
          box-shadow: 0 8px 20px rgba(108, 77, 43, 0.2);
        }

        .phase-ended-enter {
          animation: ended-enter 560ms ease both;
        }
        .phase-ended-card {
          animation: ended-card 420ms ease both;
        }
        .phase-ended-button:hover {
          filter: brightness(1.05);
        }

        @keyframes upcoming-enter {
          from {
            opacity: 0;
            transform: translateY(10px);
            filter: blur(2px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }
        @keyframes upcoming-card {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes submission-enter {
          from {
            opacity: 0;
            transform: translateX(-6px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes submission-card {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes voting-enter {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes voting-card {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes ended-enter {
          from {
            opacity: 0;
            transform: translateY(8px);
            filter: saturate(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0);
            filter: saturate(1);
          }
        }
        @keyframes ended-card {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .phase-upcoming-enter,
          .phase-upcoming-card,
          .phase-submission-enter,
          .phase-submission-card,
          .phase-voting-enter,
          .phase-voting-card,
          .phase-ended-enter,
          .phase-ended-card {
            animation: none !important;
          }
        }
      `}</style>
    </PageShell>
  );
}

function formatSchedule(value?: string | null): string {
  if (!value) {
    return "미정";
  }
  return value.replace("T", " ").slice(0, 16);
}

function formatCountdown(value?: string | null): string {
  if (!value) {
    return "D-?";
  }
  const target = new Date(value).getTime();
  if (Number.isNaN(target)) {
    return "D-?";
  }
  const diff = Math.ceil((target - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff > 0) {
    return `D-${diff}`;
  }
  if (diff === 0) {
    return "D-Day";
  }
  return `D+${Math.abs(diff)}`;
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
