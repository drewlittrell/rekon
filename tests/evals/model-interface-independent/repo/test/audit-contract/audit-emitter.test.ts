import assert from "node:assert/strict";
import test from "node:test";

import { emitAuditRecord } from "../../apps/admin-api/src/audit-emitter.ts";

test("emits the existing audit record shape", () => {
  assert.deepEqual(emitAuditRecord("user.updated", "user-1", "admin-1"), {
    action: "user.updated",
    subject: "user-1",
    actorId: "admin-1",
  });
});
