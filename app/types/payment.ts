export type PaymentOrder = {
  orderId: string;
  contestId: number;
  orderName: string;
  amount: number;
  status: "READY" | "DONE" | "FAILED" | "CANCELED" | string;
  clientKey?: string | null;
  customerKey: string;
  receiptUrl?: string | null;
  createdAt: string;
};
