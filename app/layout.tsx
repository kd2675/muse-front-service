import type { Metadata } from "next";
import "./globals.css";
import "swiper/css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Gallery Mode",
  description: "Contest + Gallery for curated photographic art.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
