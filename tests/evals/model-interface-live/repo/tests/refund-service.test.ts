import assert from "node:assert/strict";
import test from "node:test";

import type { RefundPolicy } from "../src/refunds/refund-policy.ts";
import type { RefundRepository, StoredPayment } from "../src/refunds/refund-repository.ts";
import { RefundService } from "../src/refunds/refund-service.ts";

test("authorized refunds persist refunded status", async () => {
  const stored: StoredPayment = { id: "payment-1", status: "paid" };
  const repository: RefundRepository = {
    async findPayment() { return stored; },
    async setStatus(_paymentId, status) { return { ...stored, status }; },
  };
  const policy: RefundPolicy = { canRefund: () => true };
  const service = new RefundService(repository, policy);

  assert.equal((await service.refund("admin-1", "payment-1")).status, "refunded");
});
