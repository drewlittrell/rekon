import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { delimiter, join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const repoRoot = process.env.REKON_EVAL_REPO_ROOT;

if (!repoRoot) {
  test("audit-source-ip oracle runs only inside the isolated eval repository", {
    skip: "Run through eval:model-interface:independent.",
  });
} else {
  test("optional sourceIp remains compatible across schema, producer, and archive consumer", async () => {
    const schema = JSON.parse(readFileSync(join(repoRoot, "contracts/audit-record.schema.json"), "utf8"));
    assert.deepEqual(schema.properties.sourceIp, { type: "string" });
    assert.equal(schema.required.includes("sourceIp"), false);
    assert.equal(schema.additionalProperties, false);

    const { emitAuditRecord } = await import(pathToFileURL(join(
      repoRoot,
      "apps/admin-api/src/audit-emitter.ts",
    )));
    assert.deepEqual(emitAuditRecord("user.updated", "user-1", "admin-1"), {
      action: "user.updated",
      subject: "user-1",
      actorId: "admin-1",
    });
    assert.deepEqual(emitAuditRecord("user.updated", "user-1", "admin-1", "203.0.113.8"), {
      action: "user.updated",
      subject: "user-1",
      actorId: "admin-1",
      sourceIp: "203.0.113.8",
    });

    const script = String.raw`
from audit_archive.record_reader import read_record

legacy = {"action": "user.updated", "subject": "user-1", "actorId": "admin-1"}
assert read_record(legacy) == legacy
current = {**legacy, "sourceIp": "203.0.113.8"}
assert read_record(current) == current
try:
    read_record({**legacy, "unexpected": True})
except ValueError as error:
    assert str(error) == "unknown-audit-field"
else:
    raise AssertionError("unknown field did not fail")
`;
    const result = spawnSync("python3", ["-c", script], {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        PYTHONPATH: [join(repoRoot, "services/audit_archive_py"), process.env.PYTHONPATH]
          .filter(Boolean)
          .join(delimiter),
      },
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
  });
}
