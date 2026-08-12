import type { ContestPhase } from "../types/contest";

export type ContestPhaseTone = {
  label: string;
  chipClass: string;
  dotClass: string;
  cardClass: string;
  badgeClass: string;
  progressBarClass: string;
};

const contestPhaseTheme: Record<ContestPhase, ContestPhaseTone> = {
  UPCOMING: {
    label: "출품 대기",
    chipClass: "border-slate-300/28 bg-slate-300/10 text-slate-200",
    dotClass: "bg-slate-400",
    cardClass: "border-slate-300/22 bg-slate-300/10 hover:border-slate-200/45",
    badgeClass: "border-slate-300/32 bg-slate-300/16 text-slate-100",
    progressBarClass: "bg-slate-300",
  },
  SUBMISSION: {
    label: "출품 진행",
    chipClass: "border-[#c5a875]/45 bg-[#c5a875]/12 text-[#e8d5ae]",
    dotClass: "bg-[#c5a875]",
    cardClass: "border-[#c5a875]/30 bg-[#c5a875]/10 hover:border-[#c5a875]/60",
    badgeClass: "border-[#c5a875]/40 bg-[#c5a875]/14 text-[#e8d5ae]",
    progressBarClass: "bg-[#c5a875]",
  },
  REVIEW: {
    label: "심사",
    chipClass: "border-[#b8a68d]/40 bg-[#b8a68d]/12 text-[#ddd2c1]",
    dotClass: "bg-[#b8a68d]",
    cardClass: "border-[#b8a68d]/28 bg-[#b8a68d]/10 hover:border-[#b8a68d]/55",
    badgeClass: "border-[#b8a68d]/38 bg-[#b8a68d]/14 text-[#ddd2c1]",
    progressBarClass: "bg-[#b8a68d]",
  },
  VOTING: {
    label: "전시",
    chipClass: "border-[#c0a062]/45 bg-[#c0a062]/18 text-[#f8e6be]",
    dotClass: "bg-[#d4b478]",
    cardClass: "border-[#c0a062]/30 bg-[#c0a062]/12 hover:border-[#d4b478]/55",
    badgeClass: "border-[#c0a062]/40 bg-[#c0a062]/18 text-[#f8e6be]",
    progressBarClass: "bg-[#c0a062]",
  },
  ENDED: {
    label: "종료",
    chipClass: "border-slate-500/34 bg-slate-700/24 text-slate-300",
    dotClass: "bg-slate-500",
    cardClass: "border-slate-300/22 bg-slate-300/10 hover:border-slate-200/45",
    badgeClass: "border-slate-300/32 bg-slate-300/16 text-slate-100",
    progressBarClass: "bg-slate-500",
  },
};

export const contestPhaseOrder: Record<ContestPhase, number> = {
  VOTING: 0,
  SUBMISSION: 1,
  REVIEW: 2,
  UPCOMING: 3,
  ENDED: 4,
};

export function getContestPhaseTone(phase: ContestPhase): ContestPhaseTone {
  return contestPhaseTheme[phase] ?? contestPhaseTheme.UPCOMING;
}

export function getContestPhaseLabel(phase: ContestPhase): string {
  return getContestPhaseTone(phase).label;
}

type EntryReviewStatus = "SUBMITTED" | "APPROVED" | "REJECTED";
type GalleryModerationStatus = "REVIEWING" | "VISIBLE" | "REMOVED";

type ModerationTone = {
  label: string;
  chipClass: string;
  dotClass: string;
};

const moderationTheme: Record<EntryReviewStatus, ModerationTone> = {
  SUBMITTED: {
    label: "대기",
    chipClass: "border-[#b8a68d]/40 bg-[#b8a68d]/12 text-[#ddd2c1]",
    dotClass: "bg-[#b8a68d]",
  },
  APPROVED: {
    label: "승인",
    chipClass: "border-[#9caf91]/40 bg-[#9caf91]/12 text-[#cddac6]",
    dotClass: "bg-[#9caf91]",
  },
  REJECTED: {
    label: "반려",
    chipClass: "border-[#d08d84]/40 bg-[#d08d84]/12 text-[#efc2bc]",
    dotClass: "bg-[#d08d84]",
  },
};

const galleryStatusToReviewStatus: Record<GalleryModerationStatus, EntryReviewStatus> = {
  REVIEWING: "SUBMITTED",
  VISIBLE: "APPROVED",
  REMOVED: "REJECTED",
};

export function getContestEntryStatusLabel(status?: string | null): string {
  if (!status) {
    return "대기";
  }
  const normalized = status as EntryReviewStatus;
  return moderationTheme[normalized]?.label ?? status;
}

export function getContestEntryStatusTone(status?: string | null): ModerationTone {
  if (!status) {
    return moderationTheme.SUBMITTED;
  }
  const normalized = status as EntryReviewStatus;
  return moderationTheme[normalized] ?? moderationTheme.SUBMITTED;
}

export function getGalleryModerationLabel(status?: string | null): string {
  if (!status) {
    return moderationTheme.SUBMITTED.label;
  }
  const normalized = status as GalleryModerationStatus;
  const mapped = galleryStatusToReviewStatus[normalized];
  return mapped ? moderationTheme[mapped].label : status;
}

export function getGalleryModerationTone(status?: string | null): ModerationTone {
  if (!status) {
    return moderationTheme.SUBMITTED;
  }
  const normalized = status as GalleryModerationStatus;
  const mapped = galleryStatusToReviewStatus[normalized];
  if (!mapped) {
    return moderationTheme.SUBMITTED;
  }
  return moderationTheme[mapped];
}
