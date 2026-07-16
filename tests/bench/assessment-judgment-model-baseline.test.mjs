import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(new URL("../..", import.meta.url).pathname);

const baseline = JSON.parse(await readFile(
  new URL("./calibration/assessment-judgment-model-baseline.json", import.meta.url),
  "utf8",
));

test("assessment-judgment baseline stores aggregate decision evidence without source payloads", () => {
  assert.equal(baseline.schemaVersion, "1.0.0");
  assert.equal(baseline.corpus.sourceRetention, "none");
  assert.equal(baseline.corpus.caseCount, 18);
  assert.equal(baseline.emitterCoverage.emitterGapClasses.length, 7);
  assert.equal(Object.hasOwn(baseline, "runs"), false);

  const forbidden = new Set(["source", "sourceText", "prompt", "excerpt", "rationale", "runs"]);
  visit(baseline, (key) => assert.equal(forbidden.has(key), false, `baseline must not retain ${key}`));
});

test("selected judgment model is safer, more accurate, and cheaper on the paired corpus", () => {
  const selected = baseline.models.find((model) => model.id === baseline.selection.modelConfigId);
  const alternatives = baseline.models.filter((model) => model.id !== baseline.selection.modelConfigId);
  assert.ok(selected);
  assert.equal(selected.failures, 0);
  assert.equal(selected.unsafeDecisionRate, 0);
  for (const alternative of alternatives) {
    assert.ok(selected.expectationAccuracy > alternative.expectationAccuracy);
    assert.ok(selected.currentCostUsd < alternative.currentCostUsd);
    assert.ok(selected.latencyMs.p50 < alternative.latencyMs.p50);
  }
});

test("assessment-judgment eval dry run exposes cost and coverage without credentials", () => {
  const result = spawnSync(process.execPath, [
    "scripts/eval-assessment-judgment-models.mjs",
    "--dry-run",
  ], { cwd: root, encoding: "utf8", env: {} });
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.cases, 26);
  assert.equal(payload.requests, 52);
  assert.equal(payload.sourceRetention, "none");
  assert.deepEqual(payload.models.map((model) => model.id), [
    "gpt-5.6-luna@low",
    "claude-sonnet-5@low",
  ]);
  assert.deepEqual(payload.emitterGapClasses, []);
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
