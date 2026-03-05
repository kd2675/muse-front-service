"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getAccessToken, refreshAccessTokenOnBootstrap } from "../lib/auth";

let bootstrapDone = false;

export default function AuthBootstrap() {
  const pathname = usePathname();

  useEffect(() => {
    if (bootstrapDone) {
      return;
    }
    if (pathname === "/login") {
      return;
    }

    bootstrapDone = true;
    if (getAccessToken()) {
      return;
    }

    void refreshAccessTokenOnBootstrap();
  }, [pathname]);

  return null;
}
