import { Suspense } from "react";
import PaymentSuccessClient from "./PaymentSuccessClient";

export default function PaymentSuccessPage() {
  return <Suspense fallback={<PaymentStatus text="결제 승인을 확인하고 있습니다." />}><PaymentSuccessClient /></Suspense>;
}

function PaymentStatus({ text }: { text: string }) {
  return <main className="museum-grain flex min-h-screen items-center justify-center bg-[var(--canvas)] px-6 text-[var(--canvas-ink)]"><p>{text}</p></main>;
}
