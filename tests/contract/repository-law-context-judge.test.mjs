import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(new URL("../..", import.meta.url).pathname);

test("repository-law context judgments remain bound to the current selection", () => {
  const result = spawnSync(process.execPath, [resolve(root, "scripts/eval-repository-law-context-judge.mjs")], {
    cwd: root,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.passed, true);
  assert.equal(report.summary.modelCalls, 0);
  assert.equal(report.summary.cases, 3);
  assert.equal(report.summary.currentJudgments, 3);
  assert.equal(report.summary.accepted, 3);
  assert.equal(report.summary.issues, 0);
});
