"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { bootstrapAccessToken, getAccessToken } from "../lib/auth";

let bootstrapDone = false;

export default function AuthBootstrap() {
  const pathname = usePathname();

  useEffect(() => {
    if (bootstrapDone) {
      return;
    }
    if (pathname === "/login" || pathname === "/auth/callback") {
      return;
    }

    bootstrapDone = true;
    if (getAccessToken()) {
      return;
    }

    void bootstrapAccessToken();
  }, [pathname]);

  return null;
}
