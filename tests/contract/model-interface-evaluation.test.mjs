import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(new URL("../..", import.meta.url).pathname);

test("model interface deterministic evaluation passes without model calls", () => {
  const result = spawnSync(process.execPath, [resolve(root, "scripts/eval-model-interface.mjs")], {
    cwd: root,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.passed, true);
  assert.equal(report.summary.modelCalls, 0);
  assert.equal(report.summary.cases, 17);
  assert.equal(report.summary.failed, 0);
  assert.equal(report.summary.averageEvidenceRecall, 1);
  assert.equal(report.summary.averagePathRecall, 1);
  assert.ok(report.summary.averagePathPrecision >= 0.95);
  assert.ok(report.summary.averageIrrelevantPathRate <= 0.05);
  assert.equal(report.summary.averageCommandRecall, 1);
  assert.equal(report.summary.averageConstraintRecall, 1);
  assert.ok(report.summary.averageProjectedTokens <= 120);
  assert.ok(report.summary.maxProjectedTokens <= 200);
  assert.ok(report.summary.maxProjectedTokens < report.summary.maxEstimatedTokens);
  assert.ok(report.summary.maxEstimatedTokens <= 2400);
});
