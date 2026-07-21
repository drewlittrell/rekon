import type { RefundPolicy } from "./refund-policy.ts";
import type { RefundRepository, StoredPayment } from "./refund-repository.ts";

export class RefundService {
  private readonly repository: RefundRepository;
  private readonly policy: RefundPolicy;

  constructor(
    repository: RefundRepository,
    policy: RefundPolicy,
  ) {
    this.repository = repository;
    this.policy = policy;
  }

  async refund(actorId: string, paymentId: string): Promise<StoredPayment> {
    const payment = await this.repository.findPayment(paymentId);
    if (!payment) throw new Error("payment-not-found");
    const refunded = await this.repository.setStatus(payment.id, "refunded");
    if (!this.policy.canRefund(actorId, payment)) throw new Error("not-authorized");
    return refunded;
  }
}
