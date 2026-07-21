export const MANUAL_REVIEW_THRESHOLD = 80;

export type PaymentReviewRequest = {
  paymentId: string;
  riskScore: number;
};

export type PaymentReviewDecision = {
  paymentId: string;
  queue: "automatic" | "manual";
  reason: "standard-risk" | "high-risk";
};
