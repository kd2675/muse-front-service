"use client";

import type { ReactNode } from "react";

import SiteNavigation from "./SiteNavigation";

type OverviewStyleHeaderProps = {
  title: string;
  subtitle?: string;
  className?: string;
  rightSlot?: ReactNode;
  headingAs?: "h1" | "p";
};

export default function OverviewStyleHeader({
  title,
  subtitle = "Museum Hub",
  className = "",
  rightSlot,
  headingAs = "h1",
}: OverviewStyleHeaderProps) {
  const Heading = headingAs;

  return (
    <header className={`w-full ${className}`}>
      <SiteNavigation action={rightSlot} />
      <div className="relative overflow-hidden border-b border-[var(--line)] py-6 md:py-9">
        <p className="museum-index absolute -bottom-2 right-0" aria-hidden="true">M</p>
        <p className="museum-kicker relative z-10">{subtitle}</p>
        <Heading className="relative z-10 mt-3 max-w-4xl font-[var(--font-display)] text-3xl font-normal leading-tight text-[var(--canvas-ink)] md:text-5xl lg:text-6xl">
          {title}
        </Heading>
      </div>
    </header>
  );
}
