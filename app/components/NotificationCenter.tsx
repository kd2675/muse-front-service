"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "../lib/discovery";

export default function NotificationCenter() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
    refetchInterval: open ? 30_000 : false,
  });
  const data = query.data?.data;
  const readMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const readAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent | PointerEvent) => {
      if (event instanceof KeyboardEvent && event.key === "Escape") {
        setOpen(false);
      } else if (event instanceof PointerEvent && !containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", close);
    window.addEventListener("pointerdown", close);
    return () => {
      window.removeEventListener("keydown", close);
      window.removeEventListener("pointerdown", close);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={`알림${data?.unreadCount ? ` ${data.unreadCount}개` : ""}`}
        aria-expanded={open}
        aria-controls="notification-center-panel"
        onClick={() => setOpen((value) => !value)}
        className="relative min-h-10 px-2 text-xs text-[var(--muted)] transition hover:text-white"
      >
        알림
        {data?.unreadCount ? (
          <span className="absolute right-0 top-1 min-w-4 bg-[var(--accent)] px-1 text-[10px] text-[#111]">
            {Math.min(data.unreadCount, 99)}
          </span>
        ) : null}
      </button>
      {open ? (
        <section id="notification-center-panel" aria-label="관람 알림 목록" className="absolute right-0 top-12 z-[70] w-[min(88vw,380px)] border border-[var(--line)] bg-[#111312] p-4 text-left shadow-2xl">
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
            <h2 className="font-[var(--font-display)] text-xl">관람 알림</h2>
            <button
              type="button"
              onClick={() => readAllMutation.mutate()}
              className="text-xs text-[var(--muted)] hover:text-white"
            >
              모두 읽음
            </button>
          </div>
          <div className="max-h-[55vh] overflow-y-auto">
            {data?.items.length ? data.items.map((item) => (
              <button
                key={item.notificationId}
                type="button"
                onClick={() => {
                  if (!item.read) readMutation.mutate(item.notificationId);
                  setOpen(false);
                  if (item.href) router.push(item.href);
                }}
                className={`block w-full border-b border-[var(--line)] py-4 text-left ${item.read ? "opacity-60" : ""}`}
              >
                <span className="text-sm text-white">{item.title}</span>
                <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">{item.message}</span>
              </button>
            )) : (
              <p className="py-8 text-center text-sm text-[var(--muted)]">새 알림이 없습니다.</p>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
