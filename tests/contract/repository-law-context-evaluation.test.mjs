import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(new URL("../..", import.meta.url).pathname);

test("repository-law context improves task recall without leaking unrelated law", () => {
  const result = spawnSync(process.execPath, [resolve(root, "scripts/eval-repository-law-context.mjs")], {
    cwd: root,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.passed, true);
  assert.equal(report.summary.modelCalls, 0);
  assert.equal(report.summary.cases, 3);
  assert.equal(report.summary.failed, 0);
  assert.equal(report.summary.averageRekonPathRecall, 1);
  assert.ok(report.summary.averageRekonPathPrecision >= 0.95);
  assert.ok(report.summary.averagePathRecallLift > 0.25);
  assert.ok(report.summary.averageConstraintRecallLift > 0.6);
  assert.ok(report.summary.maxProjectedTokens <= 700);

  const unrelated = report.cases.find((entry) => entry.id === "unrelated-runbook-update");
  assert.deepEqual(unrelated.contracts.systems, []);
  assert.deepEqual(unrelated.contracts.flows, []);
  assert.equal(unrelated.metrics.rekonConstraintRecall, 1);
  assert.equal(unrelated.selection.irrelevantPaths.length, 0);
});
