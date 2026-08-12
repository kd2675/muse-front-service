"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import CinematicBottomNav from "../components/CinematicBottomNav";
import ConfirmDialog from "../components/ConfirmDialog";
import OverviewStyleHeader from "../components/OverviewStyleHeader";
import { getBookmarks, getViewHistory } from "../lib/discovery";
import { cancelPayment, getPayments } from "../lib/payment";
import { useAppDispatch } from "../store/hooks";
import { showToast } from "../store/uiSlice";

export default function LibraryClient() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const bookmarks = useQuery({ queryKey: ["library", "bookmarks"], queryFn: getBookmarks });
  const history = useQuery({ queryKey: ["library", "history"], queryFn: getViewHistory });
  const payments = useQuery({ queryKey: ["library", "payments"], queryFn: getPayments });
  const cancelMutation = useMutation({
    mutationFn: (orderId: string) => cancelPayment(orderId, "사용하지 않은 출품권 환불"),
    onSuccess: (result) => {
      if (!result.data || result.error) {
        dispatch(showToast(result.error ?? "결제를 취소하지 못했습니다."));
        return;
      }
      setCancelOrderId(null);
      queryClient.invalidateQueries({ queryKey: ["library", "payments"] });
      dispatch(showToast("결제 취소와 출품권 회수가 완료되었습니다."));
    },
    onError: () => dispatch(showToast("결제 취소 중 오류가 발생했습니다.")),
  });
  return (
    <div className="museum-grain min-h-screen bg-[var(--canvas)] text-[var(--canvas-ink)]">
      <main className="mx-auto w-full max-w-6xl px-6 pb-40 pt-8 md:px-8">
        <OverviewStyleHeader title="나의 관람 기록" subtitle="Private collection" />
        <LibrarySection title="저장한 전시">
          <QueryState pending={bookmarks.isPending} error={bookmarks.data?.error} empty={!bookmarks.isPending && !bookmarks.data?.error && (bookmarks.data?.data.length ?? 0) === 0} emptyMessage="아직 저장한 전시가 없습니다." />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(bookmarks.data?.data ?? []).map((item) => (
              <Link key={item.museumId} href={`/gallery/museums/${item.museumId}`} className="group border-t border-[var(--line)] pt-4">
                {item.coverImageUrl ? <div className="relative aspect-[4/3]"><Image src={item.coverImageUrl} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" /></div> : null}
                <strong className="mt-3 block font-[var(--font-display)] text-xl">{item.name}</strong><span className="text-xs text-[var(--muted)]">{item.ownerName}</span>
              </Link>
            ))}
          </div>
        </LibrarySection>
        <LibrarySection title="이어 보기">
          <QueryState pending={history.isPending} error={history.data?.error} empty={!history.isPending && !history.data?.error && (history.data?.data.length ?? 0) === 0} emptyMessage="관람을 시작하면 이어 볼 위치가 기록됩니다." />
          <div className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {(history.data?.data ?? []).map((item) => (
              <Link key={item.museumId} href={`/gallery/museums/${item.museumId}`} className="grid gap-3 py-5 md:grid-cols-[1fr_180px] md:items-center">
                <span><strong className="block">{item.name}</strong><small className="text-[var(--muted)]">{item.ownerName}</small></span>
                <span className="h-1 bg-white/10"><span className="block h-full bg-[var(--accent)]" style={{ width: `${item.progressPercent}%` }} /></span>
              </Link>
            ))}
          </div>
        </LibrarySection>
        <LibrarySection title="결제와 영수증">
          <QueryState pending={payments.isPending} error={payments.data?.error} empty={!payments.isPending && !payments.data?.error && (payments.data?.data.length ?? 0) === 0} emptyMessage="결제 내역이 없습니다." />
          <div className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {(payments.data?.data ?? []).map((item) => (
              <div key={item.orderId} className="grid gap-2 py-5 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
                <span><strong className="block">{item.orderName}</strong><small className="text-[var(--muted)]">{item.orderId}</small></span>
                <span>{item.amount.toLocaleString("ko-KR")}원 · {paymentStatusLabel(item.status)}</span>
                {item.receiptUrl ? <a href={item.receiptUrl} target="_blank" rel="noreferrer" className="text-sm text-[var(--accent)]">영수증</a> : null}
                {item.status === "DONE" ? <button type="button" onClick={() => setCancelOrderId(item.orderId)} className="text-left text-sm text-rose-200 md:text-right">미사용 출품권 환불</button> : null}
              </div>
            ))}
          </div>
        </LibrarySection>
      </main>
      <CinematicBottomNav activeTab="profile" layout="fixed" />
      <ConfirmDialog
        open={cancelOrderId !== null}
        title="결제를 취소할까요?"
        description="이 주문으로 받은 출품권을 아직 사용하지 않은 경우에만 전액 취소됩니다. 취소한 출품권은 즉시 회수됩니다."
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

function QueryState({ pending, error, empty, emptyMessage }: { pending: boolean; error?: string; empty: boolean; emptyMessage: string }) {
  if (pending) return <p className="mb-5 text-sm text-[var(--muted)]" aria-live="polite">기록을 불러오는 중입니다.</p>;
  if (error) return <p className="mb-5 text-sm text-rose-200" role="alert">{error}</p>;
  if (empty) return <p className="mb-5 border-l border-[var(--accent)] pl-3 text-sm text-[var(--muted)]">{emptyMessage}</p>;
  return null;
}

function paymentStatusLabel(status: string) {
  if (status === "DONE") return "결제 완료";
  if (status === "CANCELED") return "취소 완료";
  if (status === "FAILED") return "승인 실패";
  return "결제 대기";
}
