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
  assert.equal(baseline.corpus.pairCount, 2);
  assert.equal(baseline.summary.passedPairs, 2);
  assert.equal(baseline.summary.failedPairs, 0);
  assert.deepEqual(baseline.pairs.map((pair) => pair.problemClass).sort(), [
    "cache-integrity",
    "dependency-resolution",
  ]);
  assert.ok(baseline.pairs.every((pair) => pair.buggyDefectEmitted && !pair.fixedDefectEmitted && pair.passed));
  assert.equal(
    baseline.pairs.find((pair) => pair.problemClass === "cache-integrity").fixedSameClassCandidate,
    true,
  );

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
  assert.equal(payload.requests, 4);
  assert.equal(payload.sourceRetention, "none");
  assert.deepEqual(payload.pairs.map((pair) => pair.problemClass).sort(), [
    "cache-integrity",
    "dependency-resolution",
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
