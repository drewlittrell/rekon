import assert from "node:assert/strict";
import test from "node:test";

import { routePaymentReview } from "../apps/risk-worker/src/review-coordinator.ts";

test("standard-risk payments remain automatic", () => {
  assert.deepEqual(routePaymentReview({ paymentId: "payment-1", riskScore: 40 }), {
    paymentId: "payment-1",
    queue: "automatic",
    reason: "standard-risk",
  });
});
