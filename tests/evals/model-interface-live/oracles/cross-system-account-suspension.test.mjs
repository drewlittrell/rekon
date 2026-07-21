import assert from "node:assert/strict";
import test from "node:test";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = process.env.REKON_EVAL_REPO_ROOT;
if (!repoRoot) {
  test("account-suspension oracle runs only inside the isolated eval repository", {
    skip: "Run through eval:model-interface:local-agent.",
  });
} else {
  const { AccountService } = await import(pathToFileURL(join(repoRoot, "src/accounts/account-service.ts")));

  function fixture(options = {}) {
    const account = { id: "account-1", status: "active" };
    const sideEffects = [];
    const repository = {
      async findById() { return options.missing ? undefined : account; },
      async setStatus(accountId, status) {
        sideEffects.push({ type: "persist", accountId, status });
        return { ...account, status };
      },
    };
    const policy = { canSuspend: () => options.authorized !== false };
    const sessions = {
      async revokeForAccount(accountId) {
        sideEffects.push({ type: "sessions", accountId });
      },
    };
    const audit = {
      async record(event) {
        sideEffects.push({ type: "audit", event });
      },
    };
    return {
      service: new AccountService(repository, policy, sessions, audit),
      sideEffects,
    };
  }

  test("suspension coordinates sessions, persistence, and audit in repository order", async () => {
    const { service, sideEffects } = fixture();
    assert.deepEqual(await service.suspend("admin-1", "account-1"), {
      id: "account-1",
      status: "suspended",
    });
    assert.deepEqual(sideEffects, [
      { type: "sessions", accountId: "account-1" },
      { type: "persist", accountId: "account-1", status: "suspended" },
      {
        type: "audit",
        event: { type: "account.suspended", actorId: "admin-1", accountId: "account-1" },
      },
    ]);
  });

  test("unauthorized and missing accounts produce no side effects", async () => {
    const unauthorized = fixture({ authorized: false });
    await assert.rejects(unauthorized.service.suspend("member-1", "account-1"), /not-authorized/u);
    assert.deepEqual(unauthorized.sideEffects, []);

    const missing = fixture({ missing: true });
    await assert.rejects(missing.service.suspend("admin-1", "missing"), /account-not-found/u);
    assert.deepEqual(missing.sideEffects, []);
  });
}
