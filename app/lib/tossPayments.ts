export type TossPaymentWidgets = {
  setAmount(amount: { currency: "KRW"; value: number }): Promise<void>;
  renderPaymentMethods(options: { selector: string; variantKey: string }): Promise<unknown>;
  renderAgreement(options: { selector: string; variantKey: string }): Promise<unknown>;
  requestPayment(options: {
    orderId: string;
    orderName: string;
    successUrl: string;
    failUrl: string;
  }): Promise<void>;
};

type TossPaymentsFactory = (clientKey: string) => {
  widgets(options: { customerKey: string }): TossPaymentWidgets;
};

declare global {
  interface Window { TossPayments?: TossPaymentsFactory }
}

let loadingPromise: Promise<TossPaymentsFactory> | null = null;

export function loadTossPayments(): Promise<TossPaymentsFactory> {
  if (typeof window === "undefined") return Promise.reject(new Error("결제는 브라우저에서만 사용할 수 있습니다."));
  if (window.TossPayments) return Promise.resolve(window.TossPayments);
  if (loadingPromise) return loadingPromise;
  loadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://js.tosspayments.com/v2/standard";
    script.async = true;
    script.onload = () => window.TossPayments ? resolve(window.TossPayments) : reject(new Error("결제 SDK를 초기화하지 못했습니다."));
    script.onerror = () => reject(new Error("결제 SDK를 불러오지 못했습니다."));
    document.head.appendChild(script);
  });
  return loadingPromise;
}
