import assert from "node:assert/strict";
import test from "node:test";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = process.env.REKON_EVAL_REPO_ROOT;
if (!repoRoot) {
  test("order-review oracle runs only inside the isolated eval repository", {
    skip: "Run through eval:model-interface:local-agent.",
  });
} else {
  const { OrderService } = await import(pathToFileURL(join(repoRoot, "src/orders/order-service.ts")));

  function fixture(options = {}) {
    const stored = { id: "order-1", status: "pending" };
    const writes = [];
    const repository = {
      async findById() { return options.missing ? undefined : stored; },
      async setStatus(orderId, status) {
        writes.push({ orderId, status });
        return { ...stored, status };
      },
    };
    const policy = { canReview: () => options.authorized !== false };
    return { service: new OrderService(repository, policy), writes };
  }

  test("approve and reject preserve their public behavior", async () => {
    const approved = fixture();
    assert.equal((await approved.service.approve("reviewer-1", "order-1")).status, "approved");
    assert.deepEqual(approved.writes, [{ orderId: "order-1", status: "approved" }]);
    const rejected = fixture();
    assert.equal((await rejected.service.reject("reviewer-1", "order-1")).status, "rejected");
    assert.deepEqual(rejected.writes, [{ orderId: "order-1", status: "rejected" }]);
  });

  test("review transitions preserve missing-order and authorization errors", async () => {
    const missing = fixture({ missing: true });
    await assert.rejects(missing.service.approve("reviewer-1", "missing"), /order-not-found/u);
    assert.deepEqual(missing.writes, []);
    const unauthorized = fixture({ authorized: false });
    await assert.rejects(unauthorized.service.reject("member-1", "order-1"), /not-authorized/u);
    assert.deepEqual(unauthorized.writes, []);
  });
}
