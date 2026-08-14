"use client";

import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { useDialogAccessibility } from "../hooks/useDialogAccessibility";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "삭제",
  busy = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const dialogRef = useDialogAccessibility(open, onCancel, !busy);
  useBodyScrollLock(open);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[140] grid place-items-center bg-black/75 px-5 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onCancel();
        }
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="museum-panel w-full max-w-md border-[color:var(--line-strong)] p-6 md:p-8"
      >
        <p className="museum-kicker">Irreversible action</p>
        <h2 id="confirm-dialog-title" className="mt-3 font-[var(--font-display)] text-3xl">
          {title}
        </h2>
        <p id="confirm-dialog-description" className="mt-4 break-keep text-sm leading-7 text-[color:var(--muted)]">
          {description}
        </p>
        <div className="mt-7 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="min-h-12 border border-[color:var(--line)] px-4 text-sm font-bold text-[color:var(--muted)] hover:border-[color:var(--line-strong)] hover:text-white disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="min-h-12 bg-[color:var(--danger)] px-4 text-sm font-black text-[#17100f] hover:brightness-110 disabled:cursor-wait disabled:opacity-50"
          >
            {busy ? "처리 중" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
