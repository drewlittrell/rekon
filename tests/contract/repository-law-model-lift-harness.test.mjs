import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(new URL("../..", import.meta.url).pathname);
const runner = resolve(root, "scripts/eval-model-interface-local-agent.mjs");

test("repository-law corpus is ready for paired direct and managed model runs", () => {
  for (const delivery of ["direct", "managed"]) {
    const result = spawnSync(process.execPath, [
      runner,
      "--corpus", "contracts",
      "--delivery", delivery,
      "--dry-run",
      "--repeats", "1",
    ], { cwd: root, encoding: "utf8" });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const report = JSON.parse(result.stdout);
    assert.equal(report.corpus, "contracts");
    assert.equal(report.delivery, delivery);
    assert.equal(report.isolatedRuns, 4);
    assert.deepEqual(report.cases, ["atomic-experience-composition", "checkout-baton-preservation"]);
    assert.ok(report.contextSelections.every((entry) => entry.requiredContextRecall === 1));
    assert.ok(report.contextSelections.every((entry) => entry.constraintRecall === 1));
  }
});
