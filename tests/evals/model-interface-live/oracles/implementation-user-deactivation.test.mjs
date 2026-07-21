import assert from "node:assert/strict";
import test from "node:test";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = process.env.REKON_EVAL_REPO_ROOT;
if (!repoRoot) {
  test("user-deactivation oracle runs only inside the isolated eval repository", {
    skip: "Run through eval:model-interface:local-agent.",
  });
} else {
  const { UserService } = await import(pathToFileURL(join(repoRoot, "src/domain/user-service.ts")));

  function fixture(options = {}) {
    const stored = { id: "user-1", active: true };
    const writes = [];
    const repository = {
      async findById() { return options.missing ? undefined : stored; },
      async setActive(userId, active) {
        writes.push({ userId, active });
        return { ...stored, active };
      },
    };
    const policy = { canManage: () => options.authorized !== false };
    return { service: new UserService(repository, policy), writes };
  }

  test("deactivate authorizes and persists inactive state", async () => {
    const { service, writes } = fixture();
    assert.deepEqual(await service.deactivate("admin-1", "user-1"), { id: "user-1", active: false });
    assert.deepEqual(writes, [{ userId: "user-1", active: false }]);
  });

  test("deactivate preserves authorization and avoids unauthorized writes", async () => {
    const { service, writes } = fixture({ authorized: false });
    await assert.rejects(service.deactivate("member-1", "user-1"), /not-authorized/u);
    assert.deepEqual(writes, []);
  });

  test("deactivate preserves missing-user behavior and avoids writes", async () => {
    const { service, writes } = fixture({ missing: true });
    await assert.rejects(service.deactivate("admin-1", "missing"), /user-not-found/u);
    assert.deepEqual(writes, []);
  });
}
