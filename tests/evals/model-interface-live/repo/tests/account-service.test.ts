import assert from "node:assert/strict";
import test from "node:test";

import { AccountService } from "../src/accounts/account-service.ts";
import type { AccountPolicy } from "../src/accounts/account-policy.ts";
import type { AccountRepository, StoredAccount } from "../src/accounts/account-repository.ts";
import type { SecurityAudit } from "../src/audit/security-audit.ts";
import type { SessionRevoker } from "../src/auth/session-revoker.ts";

test("reactivate persists active status", async () => {
  const stored: StoredAccount = { id: "account-1", status: "suspended" };
  const repository: AccountRepository = {
    async findById() { return stored; },
    async setStatus(_accountId, status) { return { ...stored, status }; },
  };
  const policy: AccountPolicy = { canSuspend: () => true };
  const sessions: SessionRevoker = { async revokeForAccount() {} };
  const audit: SecurityAudit = { async record() {} };
  const service = new AccountService(repository, policy, sessions, audit);

  assert.equal((await service.reactivate("account-1")).status, "active");
});
