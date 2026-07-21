import assert from "node:assert/strict";
import test from "node:test";

import { createCheckoutMessage } from "../src/checkout/checkout-service.ts";
import { processCheckout } from "../src/worker/checkout-worker.ts";

test("preserves checkout identity through receipt publication", () => {
  const message = createCheckoutMessage({ requestId: "req-1", orderId: "order-1" });
  assert.deepEqual(processCheckout(message), { requestId: "req-1", orderId: "order-1" });
});
