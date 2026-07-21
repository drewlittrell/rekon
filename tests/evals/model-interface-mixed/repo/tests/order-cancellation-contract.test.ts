import assert from "node:assert/strict";
import test from "node:test";

import { cancellationEvent } from "../apps/order-worker/src/cancellation-publisher.ts";

test("publishes operator cancellation events", () => {
  assert.deepEqual(cancellationEvent("order-1", "operator"), {
    type: "order.cancelled",
    orderId: "order-1",
    source: "operator",
  });
});

test("rejects unknown cancellation sources", () => {
  assert.throws(() => cancellationEvent("order-1", "unknown"), /invalid-cancellation-source/u);
});
