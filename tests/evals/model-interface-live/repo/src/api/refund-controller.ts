import { RefundService } from "../refunds/refund-service.ts";

export class RefundController {
  constructor(private readonly refunds: RefundService) {}

  async refund(request: { actorId: string; paymentId: string }): Promise<{ status: string }> {
    return this.refunds.refund(request.actorId, request.paymentId);
  }
}
