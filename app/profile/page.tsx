import type { Metadata } from "next";

import ProfileClient from "./ProfileClient";

export const metadata: Metadata = {
  title: "작가 기록",
  robots: { index: false, follow: false },
};

export default function ProfilePage() {
  return <ProfileClient />;
}
