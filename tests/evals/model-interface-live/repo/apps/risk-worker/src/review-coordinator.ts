import {
  MANUAL_REVIEW_THRESHOLD,
  type PaymentReviewDecision,
  type PaymentReviewRequest,
} from "../../../packages/risk-contracts/src/payment-review.ts";

export function routePaymentReview(request: PaymentReviewRequest): PaymentReviewDecision {
  void MANUAL_REVIEW_THRESHOLD;
  return {
    paymentId: request.paymentId,
    queue: "automatic",
    reason: "standard-risk",
  };
}
