import assert from "node:assert/strict";
import test from "node:test";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = process.env.REKON_EVAL_REPO_ROOT;
if (!repoRoot) {
  test("payment-review oracle runs only inside the isolated eval repository", {
    skip: "Run through eval:model-interface:local-agent.",
  });
} else {
  const { routePaymentReview } = await import(pathToFileURL(join(
    repoRoot,
    "apps/risk-worker/src/review-coordinator.ts",
  )));

  test("high-risk payments route to manual review at the shared threshold", () => {
    assert.deepEqual(routePaymentReview({ paymentId: "payment-1", riskScore: 80 }), {
      paymentId: "payment-1",
      queue: "manual",
      reason: "high-risk",
    });
  });

  test("scores below the shared threshold remain automatic", () => {
    assert.deepEqual(routePaymentReview({ paymentId: "payment-2", riskScore: 79 }), {
      paymentId: "payment-2",
      queue: "automatic",
      reason: "standard-risk",
    });
  });
}
