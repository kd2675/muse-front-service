"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import CinematicBottomNav from "../components/CinematicBottomNav";
import ConfirmDialog from "../components/ConfirmDialog";
import WorkspaceNavigation from "../components/WorkspaceNavigation";
import OverviewStyleHeader from "../components/OverviewStyleHeader";
import { getBookmarks, getViewHistory, setBookmark } from "../lib/discovery";
import { cancelPayment, getPayments } from "../lib/payment";
import { useAppDispatch } from "../store/hooks";
import { showToast } from "../store/uiSlice";

export default function LibraryClient({ initialTab = "bookmarks" }: { initialTab?: string }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [view, setView] = useState(initialTab);
  const [bookmarkError, setBookmarkError] = useState("");
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const bookmarks = useQuery({ queryKey: ["library", "bookmarks"], queryFn: getBookmarks, enabled: view === "bookmarks" });
  const history = useQuery({ queryKey: ["library", "history"], queryFn: getViewHistory, enabled: view === "history" });
  const payments = useQuery({ queryKey: ["library", "payments"], queryFn: getPayments, enabled: view === "payments" });
  const bookmarkMutation = useMutation({
    mutationFn: (museumId: number) => setBookmark(museumId, false),
    onSuccess: (result) => {
      if (!result.data || result.error) { setBookmarkError("저장을 해제하지 못했습니다. 다시 시도해 주세요."); return; }
      setBookmarkError("");
      void queryClient.invalidateQueries({ queryKey: ["library", "bookmarks"] });
      void queryClient.invalidateQueries({ queryKey: ["gallery", "museum", result.data.museumId, "bookmark"] });
    },
    onError: () => setBookmarkError("저장을 해제하지 못했습니다."),
  });
  const cancelMutation = useMutation({
    mutationFn: (orderId: string) => cancelPayment(orderId, "사용하지 않은 출품권 환불"),
    onSuccess: (result) => {
      if (!result.data || result.error) {
        dispatch(showToast(result.error ?? "결제를 취소하지 못했습니다."));
        return;
      }
      setCancelOrderId(null);
      void queryClient.invalidateQueries({ queryKey: ["library", "payments"] });
      void queryClient.invalidateQueries({ queryKey: ["contest"] });
      dispatch(showToast("결제 취소와 출품권 회수가 완료되었습니다."));
    },
    onError: () => dispatch(showToast("결제 취소 중 오류가 발생했습니다.")),
  });
  return (
    <div className="museum-grain min-h-screen bg-[var(--canvas)] text-[var(--canvas-ink)]">
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-6xl px-6 pb-40 pt-8 md:px-8">
        <OverviewStyleHeader title="나의 관람 기록" subtitle="저장한 전시와 나의 활동" />
        <WorkspaceNavigation />
        <nav aria-label="관람 기록 종류" className="mt-6 flex flex-wrap gap-2">{[["bookmarks", "저장한 전시"], ["history", "이어 보기"], ["payments", "결제 내역"]].map(([value, label]) => <button key={value} type="button" aria-pressed={view === value} onClick={() => { setView(value); router.replace(`/library?tab=${value}`, { scroll: false }); }} className={`min-h-11 px-5 text-sm ${view === value ? "bg-[var(--accent)] text-[#111]" : "border border-[var(--line)] text-[var(--muted)]"}`}>{label}</button>)}</nav>
        {view === "bookmarks" ? <LibrarySection title="저장한 전시">
          <QueryState retry={() => void bookmarks.refetch()} pending={bookmarks.isPending} error={bookmarks.data?.error} empty={!bookmarks.isPending && !bookmarks.data?.error && (bookmarks.data?.data.length ?? 0) === 0} emptyMessage="아직 저장한 전시가 없습니다." />
          {bookmarkError ? <p role="alert" className="my-4 text-sm text-[var(--danger)]">{bookmarkError}</p> : null}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(bookmarks.data?.data ?? []).map((item) => (
              <article key={item.museumId}><Link href={`/gallery/museums/${item.museumId}`} className="group block border-t border-[var(--line)] pt-4">
                {item.coverImageUrl ? <div className="relative aspect-[4/3]"><Image src={item.coverImageUrl} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" /></div> : null}
                <strong className="mt-3 block font-[var(--font-display)] text-xl">{item.name}</strong><span className="text-xs text-[var(--muted)]">{item.ownerName}</span>
              </Link><button type="button" disabled={bookmarkMutation.isPending} onClick={() => bookmarkMutation.mutate(item.museumId)} className="mt-2 min-h-11 text-xs text-[var(--muted)]">저장 해제</button></article>
            ))}
          </div>
        </LibrarySection> : null}
        {view === "history" ? <LibrarySection title="이어 보기">
          <QueryState retry={() => void history.refetch()} pending={history.isPending} error={history.data?.error} empty={!history.isPending && !history.data?.error && (history.data?.data.length ?? 0) === 0} emptyMessage="관람을 시작하면 이어 볼 위치가 기록됩니다." />
          <div className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {(history.data?.data ?? []).map((item) => (
              <Link key={item.museumId} href={`/gallery/museums/${item.museumId}${item.lastArtworkId ? `?artworkId=${item.lastArtworkId}` : ""}`} className="grid gap-3 py-5 md:grid-cols-[1fr_180px] md:items-center">
                <span><strong className="block">{item.name}</strong><small className="text-[var(--muted)]">{item.ownerName}</small></span>
                <span role="progressbar" aria-label={`${item.name} 관람 진행률`} aria-valuenow={item.progressPercent} aria-valuemin={0} aria-valuemax={100} className="h-1 bg-white/10"><span className="block h-full bg-[var(--accent)]" style={{ width: `${item.progressPercent}%` }} /></span>
              </Link>
            ))}
          </div>
        </LibrarySection> : null}
        {view === "payments" ? <LibrarySection title="결제와 영수증">
          <QueryState retry={() => void payments.refetch()} pending={payments.isPending} error={payments.data?.error} empty={!payments.isPending && !payments.data?.error && (payments.data?.data.length ?? 0) === 0} emptyMessage="결제 내역이 없습니다." />
          <div className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {(payments.data?.data ?? []).map((item) => (
              <div key={item.orderId} className="grid gap-2 py-5 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
                <span><strong className="block">{item.orderName}</strong><small className="break-all text-[var(--muted)]">{item.orderId}</small></span>
                <span>{item.amount.toLocaleString("ko-KR")}원 · {paymentStatusLabel(item.status)}</span>
                {item.receiptUrl ? <a href={item.receiptUrl} target="_blank" rel="noreferrer" className="text-sm text-[var(--accent)]">영수증</a> : null}
                {item.status === "DONE" ? <button type="button" onClick={() => setCancelOrderId(item.orderId)} className="text-left text-sm text-rose-200 md:text-right">미사용 출품권 환불</button> : null}
              </div>
            ))}
          </div>
        </LibrarySection> : null}
      </main>
      <CinematicBottomNav activeTab="profile" layout="fixed" />
      <ConfirmDialog
        open={cancelOrderId !== null}
        title="결제를 취소할까요?"
        description="같은 공모전의 미사용 출품권이 남아 있는 경우 전액 취소됩니다. 출품권 1개가 즉시 회수되며, 최종 가능 여부는 서버에서 확인합니다."
        confirmLabel="결제 취소"
        busy={cancelMutation.isPending}
        onCancel={() => setCancelOrderId(null)}
        onConfirm={() => cancelOrderId && cancelMutation.mutate(cancelOrderId)}
      />
    </div>
  );
}

function LibrarySection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-12"><h2 className="mb-5 font-[var(--font-display)] text-3xl">{title}</h2>{children}</section>;
}

function QueryState({ pending, error, empty, emptyMessage, retry }: { pending: boolean; error?: string; empty: boolean; emptyMessage: string; retry: () => void }) {
  if (pending) return <p className="mb-5 text-sm text-[var(--muted)]" aria-live="polite">기록을 불러오는 중입니다.</p>;
  if (error) return <p className="mb-5 text-sm text-rose-200" role="alert">기록을 불러오지 못했습니다. <button type="button" onClick={retry} className="ml-2 min-h-11 underline">다시 시도</button></p>;
  if (empty) return <p className="mb-5 border-l border-[var(--accent)] pl-3 text-sm text-[var(--muted)]">{emptyMessage} <Link href="/gallery" className="mt-3 block min-h-11 py-3 text-[var(--accent)]">전시 둘러보기 →</Link></p>;
  return null;
}

function paymentStatusLabel(status: string) {
  if (status === "DONE") return "결제 완료";
  if (status === "CANCELED") return "취소 완료";
  if (status === "FAILED") return "승인 실패";
  return "결제 대기";
}
