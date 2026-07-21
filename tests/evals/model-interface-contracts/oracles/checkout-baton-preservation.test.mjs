import assert from "node:assert/strict";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const repoRoot = process.env.REKON_EVAL_REPO_ROOT;

if (!repoRoot) {
  test("checkout-baton oracle runs only inside the isolated eval repository", {
    skip: "Run through eval:model-interface:contracts:adoption.",
  });
} else {
  test("optional campaign metadata and request identity cross the full flow", async () => {
    const service = await import(pathToFileURL(join(repoRoot, "src/checkout/checkout-service.ts")));
    const worker = await import(pathToFileURL(join(repoRoot, "src/worker/checkout-worker.ts")));

    const withCampaign = worker.processCheckout(service.createCheckoutMessage({
      requestId: "req-campaign",
      orderId: "order-1",
      campaignId: "summer",
    }));
    assert.deepEqual(withCampaign, {
      requestId: "req-campaign",
      orderId: "order-1",
      campaignId: "summer",
    });

    const withoutCampaign = worker.processCheckout(service.createCheckoutMessage({
      requestId: "req-plain",
      orderId: "order-2",
    }));
    assert.deepEqual(withoutCampaign, { requestId: "req-plain", orderId: "order-2" });
    assert.equal(Object.hasOwn(withoutCampaign, "campaignId"), false);
  });
}
