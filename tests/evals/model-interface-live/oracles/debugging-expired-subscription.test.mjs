import assert from "node:assert/strict";
import test from "node:test";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = process.env.REKON_EVAL_REPO_ROOT;
if (!repoRoot) {
  test("expired-subscription oracle runs only inside the isolated eval repository", {
    skip: "Run through eval:model-interface:local-agent.",
  });
} else {
  const { SubscriptionService } = await import(pathToFileURL(join(repoRoot, "src/billing/subscription-service.ts")));

  function fixture(options = {}) {
    const stored = { id: "subscription-1", status: options.status ?? "active" };
    const writes = [];
    const repository = {
      async findById() { return options.missing ? undefined : stored; },
      async setStatus(subscriptionId, status) {
        writes.push({ subscriptionId, status });
        return { ...stored, status };
      },
    };
    const policy = { canRenew: () => options.authorized !== false };
    return { service: new SubscriptionService(repository, policy), writes };
  }

  test("expired subscriptions cannot be renewed or persisted", async () => {
    const { service, writes } = fixture({ status: "expired" });
    await assert.rejects(service.renew("admin-1", "subscription-1"), /subscription-expired/u);
    assert.deepEqual(writes, []);
  });

  test("active renewal preserves authorization", async () => {
    const { service, writes } = fixture({ authorized: false });
    await assert.rejects(service.renew("member-1", "subscription-1"), /not-authorized/u);
    assert.deepEqual(writes, []);
  });

  test("active renewal still persists active status", async () => {
    const { service, writes } = fixture();
    assert.equal((await service.renew("admin-1", "subscription-1")).status, "active");
    assert.deepEqual(writes, [{ subscriptionId: "subscription-1", status: "active" }]);
  });
}
