import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { delimiter, join } from "node:path";
import test from "node:test";

const repoRoot = process.env.REKON_EVAL_REPO_ROOT;

if (!repoRoot) {
  test("export-redaction oracle runs only inside the isolated eval repository", {
    skip: "Run through eval:model-interface:mixed.",
  });
} else {
  test("exports only allowed fields without mutating stored data", () => {
    const script = String.raw`
from reporting.export_service import ExportService

record = {"id": "export-1", "name": "Ari", "ssn": "111-22-3333", "internal_note": "review"}
class Repository:
    def find_export(self, export_id):
        return None if export_id == "missing" else record
class Policy:
    def allowed_fields(self, actor_id, value):
        assert actor_id == "support-1"
        assert value is record
        return {"id", "name"}

service = ExportService(Repository(), Policy())
result = service.export("support-1", "export-1")
assert result == {"id": "export-1", "name": "Ari"}, result
assert result is not record
assert record == {"id": "export-1", "name": "Ari", "ssn": "111-22-3333", "internal_note": "review"}
try:
    service.export("support-1", "missing")
except ValueError as error:
    assert str(error) == "export-not-found"
else:
    raise AssertionError("missing export did not fail")
`;
    const result = spawnSync("python3", ["-c", script], {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        PYTHONPATH: [join(repoRoot, "services/reporting_py"), process.env.PYTHONPATH]
          .filter(Boolean)
          .join(delimiter),
      },
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
  });
}
