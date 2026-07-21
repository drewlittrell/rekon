import assert from "node:assert/strict";
import test from "node:test";

import type { StoredUser, UserRepository } from "../src/data/user-repository.ts";
import { UserService } from "../src/domain/user-service.ts";
import type { UserPolicy } from "../src/policy/user-policy.ts";

test("activate authorizes and persists the lifecycle change", async () => {
  const stored: StoredUser = { id: "user-1", active: false };
  const writes: boolean[] = [];
  const repository: UserRepository = {
    async findById() { return stored; },
    async setActive(_userId, active) {
      writes.push(active);
      return { ...stored, active };
    },
  };
  const policy: UserPolicy = { canManage: () => true };
  const service = new UserService(repository, policy);

  assert.deepEqual(await service.activate("admin-1", "user-1"), { id: "user-1", active: true });
  assert.deepEqual(writes, [true]);
});
