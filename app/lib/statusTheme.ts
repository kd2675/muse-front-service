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
    chipClass: "border-cyan-300/34 bg-cyan-300/14 text-cyan-100",
    dotClass: "bg-cyan-300",
    cardClass: "border-cyan-300/30 bg-cyan-300/12 hover:border-cyan-200/55",
    badgeClass: "border-cyan-300/40 bg-cyan-300/18 text-cyan-100",
    progressBarClass: "bg-cyan-300",
  },
  REVIEW: {
    label: "심사",
    chipClass: "border-amber-300/34 bg-amber-300/14 text-amber-100",
    dotClass: "bg-amber-300",
    cardClass: "border-amber-300/32 bg-amber-300/14 hover:border-amber-200/55",
    badgeClass: "border-amber-300/42 bg-amber-300/18 text-amber-100",
    progressBarClass: "bg-amber-300",
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
    chipClass: "border-sky-300/35 bg-sky-300/16 text-sky-100",
    dotClass: "bg-sky-300",
  },
  APPROVED: {
    label: "승인",
    chipClass: "border-emerald-300/35 bg-emerald-300/16 text-emerald-100",
    dotClass: "bg-emerald-300",
  },
  REJECTED: {
    label: "반려",
    chipClass: "border-rose-300/35 bg-rose-300/16 text-rose-100",
    dotClass: "bg-rose-300",
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
