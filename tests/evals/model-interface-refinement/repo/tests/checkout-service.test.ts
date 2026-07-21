import assert from "node:assert/strict";
import test from "node:test";

import { CheckoutService } from "../src/checkout/checkout-service.ts";
import { OrderEventPublisher } from "../src/events/order-event-publisher.ts";

test("checkout persists the order and publishes the legacy event shape", async () => {
  const publisher = new OrderEventPublisher();
  const service = new CheckoutService({ async create(order) { return order; } }, publisher);

  await service.checkout({ orderId: "order-1", userId: "user-1", total: 42 });

  assert.deepEqual(publisher.published, [{
    orderId: "order-1",
    userId: "user-1",
    total: 42,
  }]);
});
