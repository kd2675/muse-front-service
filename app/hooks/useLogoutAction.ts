"use client";

import { useCallback, useState } from "react";
import { clearAccessToken, logout } from "../lib/auth";

type LogoutCallbacks = {
  onSuccess?: () => void;
  onError?: () => void;
  onSettled?: () => void;
};

export default function useLogoutAction() {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const signOut = useCallback(async (callbacks: LogoutCallbacks = {}) => {
    if (isSigningOut) {
      return false;
    }

    setIsSigningOut(true);
    try {
      await logout();
      callbacks.onSuccess?.();
      return true;
    } catch {
      callbacks.onError?.();
      return false;
    } finally {
      clearAccessToken();
      setIsSigningOut(false);
      callbacks.onSettled?.();
    }
  }, [isSigningOut]);

  return { isSigningOut, signOut };
}
