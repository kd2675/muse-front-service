import type { Metadata } from "next";
import "./globals.css";
import "swiper/css";
import Providers from "./providers";
import GlobalScrollTopButton from "./components/GlobalScrollTopButton";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "MUSE — 사진이 전시가 되는 곳",
    template: "%s | MUSE",
  },
  description: "사진 공모전에 참여하고, 선정된 작품과 작가의 기록을 영구 전시하는 온라인 뮤지엄입니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        <a
          href="#main-content"
          className="fixed left-4 top-4 z-[100] -translate-y-24 bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-black transition focus:translate-y-0"
        >
          본문으로 건너뛰기
        </a>
        <Providers>{children}</Providers>
        <GlobalScrollTopButton />
      </body>
    </html>
  );
}
