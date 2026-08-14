import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "로그인 확인",
  robots: { index: false, follow: false },
};

export default function AuthCallbackLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
