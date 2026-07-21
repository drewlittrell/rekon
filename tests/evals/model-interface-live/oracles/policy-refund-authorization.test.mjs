import assert from "node:assert/strict";
import test from "node:test";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = process.env.REKON_EVAL_REPO_ROOT;
if (!repoRoot) {
  test("refund-authorization oracle runs only inside the isolated eval repository", {
    skip: "Run through eval:model-interface:local-agent.",
  });
} else {
  const { RefundService } = await import(pathToFileURL(join(repoRoot, "src/refunds/refund-service.ts")));

  function fixture(options = {}) {
    const payment = { id: "payment-1", status: "paid" };
    const writes = [];
    const repository = {
      async findPayment() { return options.missing ? undefined : payment; },
      async setStatus(paymentId, status) {
        writes.push({ paymentId, status });
        return { ...payment, status };
      },
    };
    const policy = { canRefund: () => options.authorized !== false };
    return { service: new RefundService(repository, policy), writes };
  }

  test("unauthorized refunds fail before persistence", async () => {
    const { service, writes } = fixture({ authorized: false });
    await assert.rejects(service.refund("member-1", "payment-1"), /not-authorized/u);
    assert.deepEqual(writes, []);
  });

  test("authorized refunds persist and missing payments preserve the domain error", async () => {
    const authorized = fixture();
    assert.equal((await authorized.service.refund("admin-1", "payment-1")).status, "refunded");
    assert.deepEqual(authorized.writes, [{ paymentId: "payment-1", status: "refunded" }]);

    const missing = fixture({ missing: true });
    await assert.rejects(missing.service.refund("admin-1", "missing"), /payment-not-found/u);
    assert.deepEqual(missing.writes, []);
  });
}
