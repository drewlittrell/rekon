import type { StoredPayment } from "./refund-repository.ts";

export interface RefundPolicy {
  canRefund(actorId: string, payment: StoredPayment): boolean;
}
