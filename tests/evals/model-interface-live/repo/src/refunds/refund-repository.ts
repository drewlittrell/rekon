export type StoredPayment = {
  id: string;
  status: "paid" | "refunded";
};

export interface RefundRepository {
  findPayment(paymentId: string): Promise<StoredPayment | undefined>;
  setStatus(paymentId: string, status: StoredPayment["status"]): Promise<StoredPayment>;
}
