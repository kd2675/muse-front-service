"use client";

import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type AdminActionVariant =
  | "primary"
  | "admin"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "neutral";

type AdminActionSize = "sm" | "md";

type AdminActionButtonProps = PropsWithChildren<
  {
    variant?: AdminActionVariant;
    size?: AdminActionSize;
    fullWidth?: boolean;
    active?: boolean;
  } & ButtonHTMLAttributes<HTMLButtonElement>
>;

function joinClassNames(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

export default function AdminActionButton({
  children,
  variant = "secondary",
  size = "md",
  fullWidth = false,
  active = false,
  className,
  ...props
}: AdminActionButtonProps) {
  const base =
    " border transition disabled:cursor-not-allowed disabled:opacity-60";
  const sized =
    size === "sm"
      ? "px-3 py-1.5 text-xs"
      : "px-4 py-2 text-xs font-semibold";

  const toneByVariant: Record<AdminActionVariant, string> = {
    primary:
      "border-cyan-300/45 bg-cyan-300/20 text-cyan-50 hover:bg-cyan-300/30 hover:border-cyan-300/60",
    admin:
      "border-blue-300/50 bg-blue-500/24 text-blue-100 hover:bg-blue-500/34 hover:border-blue-300/70",
    secondary:
      "border-[color:var(--line)] bg-white/8 text-[color:var(--muted)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]",
    success:
      "border-emerald-300/45 bg-emerald-300/18 text-emerald-100 hover:bg-emerald-300/28",
    warning:
      "border-amber-300/45 bg-amber-300/20 text-amber-100 hover:bg-amber-300/30",
    danger:
      "border-rose-300/45 bg-rose-300/20 text-rose-100 hover:bg-rose-300/30",
    neutral:
      "border-slate-300/35 bg-slate-300/16 text-slate-100 hover:bg-slate-300/24",
  };

  const activeClass = active ? "ring-2 ring-cyan-300/30" : undefined;

  return (
    <button
      type="button"
      className={joinClassNames(
        base,
        sized,
        toneByVariant[variant],
        fullWidth && "w-full",
        activeClass,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
