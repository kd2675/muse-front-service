import Link from "next/link";
import type { ReactNode } from "react";

type QueryStateProps = {
  title: string;
  description?: string;
  kind?: "loading" | "error" | "empty";
  retry?: () => void;
  retrying?: boolean;
  action?: { href: string; label: string };
  children?: ReactNode;
};

/** Keep a failed request distinct from a successful empty collection. */
export default function QueryState({
  title,
  description,
  kind = "empty",
  retry,
  retrying,
  action,
  children,
}: QueryStateProps) {
  return (
    <section
      className="museum-state"
      role={kind === "error" ? "alert" : "status"}
      aria-busy={kind === "loading" || retrying}
    >
      <span className="museum-kicker">
        {kind === "loading"
          ? "불러오는 중"
          : kind === "error"
            ? "연결 확인"
            : "다음 기록의 시작"}
      </span>
      <h2 className="mt-3 text-balance font-[var(--font-display)] text-2xl md:text-3xl">
        {title}
      </h2>
      {description ? (
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--muted)]">
          {description}
        </p>
      ) : null}
      {retry || action ? (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {retry ? (
            <button
              type="button"
              onClick={retry}
              disabled={retrying}
              className="museum-button-secondary px-5 py-3 text-sm"
            >
              {retrying ? "다시 불러오는 중" : "다시 시도"}
            </button>
          ) : null}
          {action ? (
            <Link
              href={action.href}
              className="museum-button-primary px-5 py-3 text-sm"
            >
              {action.label}
            </Link>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
