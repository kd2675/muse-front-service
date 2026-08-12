import { fetchJson, postJson } from "./api";
import type { PaymentOrder } from "../types/payment";
import type { ResponseEnvelope } from "../types/response";

function errorOf(result: { error?: string; backendMapped?: string; backendMessage?: string }) {
  return result.backendMapped ?? result.backendMessage ?? result.error;
}

export async function createPaymentOrder(contestId: number) {
  const result = await postJson<ResponseEnvelope<PaymentOrder>>("/api/muse/v1/me/payments/orders", {
    contestId,
  });
  return result.data?.data
    ? { data: result.data.data, error: undefined }
    : { data: null, error: errorOf(result) };
}

export async function confirmPayment(payload: { paymentKey: string; orderId: string; amount: number }) {
  const result = await postJson<ResponseEnvelope<PaymentOrder>>("/api/muse/v1/me/payments/confirm", payload);
  return result.data?.data
    ? { data: result.data.data, error: undefined }
    : { data: null, error: errorOf(result) };
}

export async function getPayments() {
  const result = await fetchJson<ResponseEnvelope<PaymentOrder[]>>("/api/muse/v1/me/payments");
  return result.data?.data
    ? { data: result.data.data, error: undefined }
    : { data: [], error: errorOf(result) };
}

export async function cancelPayment(orderId: string, reason: string) {
  const result = await postJson<ResponseEnvelope<PaymentOrder>>(
    `/api/muse/v1/me/payments/${orderId}/cancel`,
    { reason },
  );
  return result.data?.data
    ? { data: result.data.data, error: undefined }
    : { data: null, error: errorOf(result) };
}
