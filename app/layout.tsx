/* eslint-disable @next/next/no-page-custom-font */
import type { Metadata } from "next";
import "./globals.css";
import "swiper/css";
import Providers from "./providers";
import GlobalScrollTopButton from "./components/GlobalScrollTopButton";

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
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
        <GlobalScrollTopButton />
      </body>
    </html>
  );
}
