"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const SHOW_THRESHOLD_PX = 180;
const MIN_SCROLLABLE_DELTA_PX = 24;

function isScrollablePage(): boolean {
  const root = document.documentElement;
  return root.scrollHeight - window.innerHeight > MIN_SCROLLABLE_DELTA_PX;
}

export default function GlobalScrollTopButton() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let rafId: number | null = null;

    const updateVisibility = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      rafId = window.requestAnimationFrame(() => {
        const shouldShow = isScrollablePage() && window.scrollY > SHOW_THRESHOLD_PX;
        setIsVisible((prev) => (prev === shouldShow ? prev : shouldShow));
      });
    };

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
    };
  }, [pathname]);

  if (!isVisible) {
    return null;
  }

  return (
    <button
      type="button"
      aria-label="맨 위로 이동"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed right-5 z-40 h-11 w-11 border border-[var(--line)] bg-[rgba(9,10,10,0.86)] text-[var(--muted)] shadow-[0_10px_24px_rgba(0,0,0,0.32)] backdrop-blur transition hover:-translate-y-0.5 hover:border-[var(--accent)] hover:text-white active:translate-y-0 md:right-7 md:h-12 md:w-12"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 92px)" }}
    >
      <span className="text-lg" aria-hidden>↑</span>
    </button>
  );
}
