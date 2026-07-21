import assert from "node:assert/strict";
import test from "node:test";

import type { StoredOrder, OrderRepository } from "../src/orders/order-repository.ts";
import type { OrderPolicy } from "../src/orders/order-policy.ts";
import { OrderService } from "../src/orders/order-service.ts";

function fixture() {
  const stored: StoredOrder = { id: "order-1", status: "pending" };
  const writes: string[] = [];
  const repository: OrderRepository = {
    async findById() { return stored; },
    async setStatus(_orderId, status) {
      writes.push(status);
      return { ...stored, status };
    },
  };
  const policy: OrderPolicy = { canReview: () => true };
  return { service: new OrderService(repository, policy), writes };
}

test("approve preserves the review transition", async () => {
  const { service, writes } = fixture();
  assert.equal((await service.approve("reviewer-1", "order-1")).status, "approved");
  assert.deepEqual(writes, ["approved"]);
});

test("reject preserves the review transition", async () => {
  const { service, writes } = fixture();
  assert.equal((await service.reject("reviewer-1", "order-1")).status, "rejected");
  assert.deepEqual(writes, ["rejected"]);
});
