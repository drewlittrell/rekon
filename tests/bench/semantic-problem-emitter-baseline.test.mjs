import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(new URL("../..", import.meta.url).pathname);
const baseline = JSON.parse(await readFile(
  new URL("./calibration/semantic-problem-emitter-baseline.json", import.meta.url),
  "utf8",
));

test("semantic problem emitter baseline retains paired outcomes without source payloads", () => {
  assert.equal(baseline.schemaVersion, "1.0.0");
  assert.equal(baseline.corpus.sourceRetention, "none");
  assert.equal(baseline.corpus.minimumChangedLineCoverage, 0.2);
  assert.equal(baseline.corpus.minimumUsefulnessAdjudications, 5);
  assert.equal(baseline.corpus.semanticPromptVersion, "semantic-file-understanding-v4");
  assert.equal(baseline.corpus.judgmentPromptVersion, "assessment-judge-v6");
  assert.equal(baseline.corpus.judgmentCoercionVersion, "assessment-judgment-v2");
  assert.equal(baseline.corpus.pairCount, 9);
  assert.equal(baseline.corpus.caseCount, 24);
  assert.equal(baseline.summary.passedPairs, 9);
  assert.equal(baseline.summary.failedPairs, 0);
  assert.deepEqual(baseline.pairs.map((pair) => pair.problemClass).sort(), [
    "cache-integrity",
    "cache-integrity",
    "cleanup-completeness",
    "dependency-resolution",
    "error-propagation",
    "option-propagation",
    "resource-lifetime",
    "resource-lifetime",
    "scope-resolution",
  ]);
  assert.deepEqual(baseline.classCoverage, [
    {
      ruleId: "semantic.cacheIntegrity",
      problemClass: "cache-integrity",
      positivePairs: 2,
      minimumAdjudications: 5,
      status: "insufficient-evidence",
    },
    {
      ruleId: "semantic.cleanupCompleteness",
      problemClass: "cleanup-completeness",
      positivePairs: 1,
      minimumAdjudications: 5,
      status: "insufficient-evidence",
    },
    {
      ruleId: "semantic.dependencyResolution",
      problemClass: "dependency-resolution",
      positivePairs: 1,
      minimumAdjudications: 5,
      status: "insufficient-evidence",
    },
    {
      ruleId: "semantic.errorPropagation",
      problemClass: "error-propagation",
      positivePairs: 1,
      minimumAdjudications: 5,
      status: "insufficient-evidence",
    },
    {
      ruleId: "semantic.optionPropagation",
      problemClass: "option-propagation",
      positivePairs: 1,
      minimumAdjudications: 5,
      status: "insufficient-evidence",
    },
    {
      ruleId: "semantic.resourceLifetime",
      problemClass: "resource-lifetime",
      positivePairs: 2,
      minimumAdjudications: 5,
      status: "insufficient-evidence",
    },
    {
      ruleId: "semantic.scopeResolution",
      problemClass: "scope-resolution",
      positivePairs: 1,
      minimumAdjudications: 5,
      status: "insufficient-evidence",
    },
  ]);
  assert.ok(baseline.pairs.every((pair) =>
    pair.buggyDefectPaths === pair.requiredBuggyPaths
      && pair.buggyRetainedPaths === pair.requiredBuggyPaths
      && pair.fixedEvaluatedPaths === pair.requiredBuggyPaths
      && pair.fixedUnclearedPaths === 0
      && pair.passed));
  assert.ok(baseline.pairs.every((pair) => pair.fixedDefectPaths === 0 && pair.fixedUnclearedPaths === 0));

  const forbidden = new Set(["source", "sourceText", "prompt", "excerpt", "rationale", "runs"]);
  visit(baseline, (key) => assert.equal(forbidden.has(key), false, `baseline must not retain ${key}`));
});

test("semantic problem emitter eval dry run exposes bounded work without credentials", () => {
  const result = spawnSync(process.execPath, [
    "scripts/eval-semantic-problem-emitters.mjs",
    "--dry-run",
  ], { cwd: root, encoding: "utf8", env: {} });
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.requests, 24);
  assert.equal(payload.sourceRetention, "none");
  assert.deepEqual(payload.pairs.map((pair) => pair.problemClass).sort(), [
    "cache-integrity",
    "cache-integrity",
    "cleanup-completeness",
    "dependency-resolution",
    "error-propagation",
    "option-propagation",
    "resource-lifetime",
    "resource-lifetime",
    "scope-resolution",
  ]);
});

function visit(value, inspect) {
  if (Array.isArray(value)) {
    for (const entry of value) visit(entry, inspect);
    return;
  }
  if (typeof value !== "object" || value === null) return;
  for (const [key, entry] of Object.entries(value)) {
    inspect(key);
    visit(entry, inspect);
  }
}
