import { useEffect } from "react";
import { lockBodyScroll, unlockBodyScroll } from "../lib/scrollLock";

export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) {
      return;
    }
    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, [locked]);
}
