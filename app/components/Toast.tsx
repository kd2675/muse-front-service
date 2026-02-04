"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { hideToast } from "../store/uiSlice";

export default function Toast() {
  const dispatch = useAppDispatch();
  const { isToastOpen, toastMessage } = useAppSelector((state) => state.ui);

  useEffect(() => {
    if (!isToastOpen) {
      return;
    }
    const timer = window.setTimeout(() => {
      dispatch(hideToast());
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [dispatch, isToastOpen]);

  if (!isToastOpen || !toastMessage) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 rounded-2xl border border-[color:var(--line)] bg-white/90 px-4 py-3 text-xs text-[color:var(--canvas-ink)] shadow-[var(--shadow)] backdrop-blur">
      {toastMessage}
    </div>
  );
}
