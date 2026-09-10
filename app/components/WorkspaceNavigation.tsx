"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/profile", label: "작가 기록" },
  { href: "/gallery/my", label: "전시 만들기" },
  { href: "/library", label: "저장·관람·결제" },
];

export default function WorkspaceNavigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="나의 작업 공간" className="muse-section-nav">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={
            pathname === item.href || pathname.startsWith(`${item.href}/`)
              ? "page"
              : undefined
          }
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
