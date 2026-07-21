import { routePaymentReview } from "../../apps/risk-worker/src/review-coordinator.ts";
import type { PaymentReviewRequest } from "../../packages/risk-contracts/src/payment-review.ts";

export function reviewPayment(request: PaymentReviewRequest): { queue: string } {
  return { queue: routePaymentReview(request).queue };
}
