import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const repoRoot = process.env.REKON_EVAL_REPO_ROOT;

if (!repoRoot) {
  test("checkout-channel oracle runs only inside the isolated eval repository", {
    skip: "Run through eval:model-interface:refinement:adoption.",
  });
} else {
  test("checkout channel reaches the event payload without changing legacy payloads", async () => {
    const { CheckoutService } = await import(pathToFileURL(join(
      repoRoot,
      "src/checkout/checkout-service.ts",
    )));
    const { OrderEventPublisher } = await import(pathToFileURL(join(
      repoRoot,
      "src/events/order-event-publisher.ts",
    )));
    const { serializeOrderCreated } = await import(pathToFileURL(join(
      repoRoot,
      "src/events/order-event-serializer.ts",
    )));

    const publisher = new OrderEventPublisher();
    const service = new CheckoutService({ async create(order) { return order; } }, publisher);
    await service.checkout({
      orderId: "order-2",
      userId: "user-2",
      total: 84,
      channel: "mobile",
    });
    assert.deepEqual(publisher.published, [{
      orderId: "order-2",
      userId: "user-2",
      total: 84,
      channel: "mobile",
    }]);
    assert.deepEqual(serializeOrderCreated({
      orderId: "order-3",
      userId: "user-3",
      total: 21,
    }), {
      orderId: "order-3",
      userId: "user-3",
      total: 21,
    });
    assert.equal(Object.hasOwn(serializeOrderCreated({
      orderId: "order-3",
      userId: "user-3",
      total: 21,
    }), "channel"), false);

    const regression = readFileSync(join(repoRoot, "tests/checkout-service.test.ts"), "utf8");
    assert.match(regression, /channel/u, "public regression coverage must exercise channel behavior");
  });
}
