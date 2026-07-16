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
  assert.equal(baseline.corpus.pairCount, 28);
  assert.equal(baseline.corpus.caseCount, 66);
  assert.deepEqual(baseline.corpus.judgmentCoverage, {
    modelApiPairs: 10,
    agentSourceReviewPairs: 18,
  });
  assert.equal(baseline.model.appliesToPairs, 10);
  assert.equal(baseline.summary.usageScope, "model-api-pairs-only");
  assert.equal(baseline.summary.passedPairs, 28);
  assert.equal(baseline.summary.failedPairs, 0);
  assert.deepEqual(baseline.pairs.map((pair) => pair.problemClass).sort(), [
    "cache-integrity",
    "cache-integrity",
    "cache-integrity",
    "cache-integrity",
    "cleanup-completeness",
    "cleanup-completeness",
    "cleanup-completeness",
    "cleanup-completeness",
    "dependency-resolution",
    "dependency-resolution",
    "dependency-resolution",
    "dependency-resolution",
    "error-propagation",
    "error-propagation",
    "error-propagation",
    "error-propagation",
    "option-propagation",
    "option-propagation",
    "option-propagation",
    "option-propagation",
    "resource-lifetime",
    "resource-lifetime",
    "resource-lifetime",
    "resource-lifetime",
    "scope-resolution",
    "scope-resolution",
    "scope-resolution",
    "scope-resolution",
  ]);
  assert.deepEqual(baseline.classCoverage, [
    {
      ruleId: "semantic.cacheIntegrity",
      problemClass: "cache-integrity",
      positivePairs: 4,
      minimumAdjudications: 5,
      status: "insufficient-evidence",
    },
    {
      ruleId: "semantic.cleanupCompleteness",
      problemClass: "cleanup-completeness",
      positivePairs: 4,
      minimumAdjudications: 5,
      status: "insufficient-evidence",
    },
    {
      ruleId: "semantic.dependencyResolution",
      problemClass: "dependency-resolution",
      positivePairs: 4,
      minimumAdjudications: 5,
      status: "insufficient-evidence",
    },
    {
      ruleId: "semantic.errorPropagation",
      problemClass: "error-propagation",
      positivePairs: 4,
      minimumAdjudications: 5,
      status: "insufficient-evidence",
    },
    {
      ruleId: "semantic.optionPropagation",
      problemClass: "option-propagation",
      positivePairs: 4,
      minimumAdjudications: 5,
      status: "insufficient-evidence",
    },
    {
      ruleId: "semantic.resourceLifetime",
      problemClass: "resource-lifetime",
      positivePairs: 4,
      minimumAdjudications: 5,
      status: "insufficient-evidence",
    },
    {
      ruleId: "semantic.scopeResolution",
      problemClass: "scope-resolution",
      positivePairs: 4,
      minimumAdjudications: 5,
      status: "insufficient-evidence",
    },
  ]);
  const agentReviewed = baseline.pairs.filter((pair) => pair.judgmentMode === "agent-source-review");
  assert.deepEqual(agentReviewed.map((pair) => pair.pairId).sort(), [
    "automerge-superseded-effect-continuation",
    "babel-switch-discriminant-shadowing",
    "langfuse-derived-abort-signal-forwarding",
    "launchdarkly-fastly-rejected-promise-cache",
    "nest-resolve-each-candidate-bypass",
    "openclaw-cross-namespace-tab-reference",
    "playwright-abort-reason-propagation",
    "playwright-max-failures-teardown",
    "sentry-xhr-terminal-listener-retention",
    "tanstack-query-cancel-reason-propagation",
    "typescript-ambient-import-source-expansion",
    "undici-cache-key-path-normalization",
    "vite-rolldown-transform-target-precedence",
    "vite-rsc-shadowed-binding",
    "vitest-abort-listener-settlement-retention",
    "vitest-class-property-key-reference",
    "vscode-zipfile-error-forwarding",
    "webpack-falsy-option-defaults",
  ]);
  assert.ok(agentReviewed.every((pair) => pair.passed));
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
  assert.equal(payload.requests, 66);
  assert.equal(payload.sourceRetention, "none");
  assert.deepEqual(payload.pairs.map((pair) => pair.problemClass).sort(), [
    "cache-integrity",
    "cache-integrity",
    "cache-integrity",
    "cache-integrity",
    "cleanup-completeness",
    "cleanup-completeness",
    "cleanup-completeness",
    "cleanup-completeness",
    "dependency-resolution",
    "dependency-resolution",
    "dependency-resolution",
    "dependency-resolution",
    "error-propagation",
    "error-propagation",
    "error-propagation",
    "error-propagation",
    "option-propagation",
    "option-propagation",
    "option-propagation",
    "option-propagation",
    "resource-lifetime",
    "resource-lifetime",
    "resource-lifetime",
    "resource-lifetime",
    "scope-resolution",
    "scope-resolution",
    "scope-resolution",
    "scope-resolution",
  ]);
});

test("agent source review mode is credential-free and requires explicit structured pairs", () => {
  const selected = spawnSync(process.execPath, [
    "scripts/eval-semantic-problem-emitters.mjs",
    "--dry-run",
    "--judgment-mode",
    "agent-source-review",
    "--pair",
    "undici-cache-key-path-normalization",
  ], { cwd: root, encoding: "utf8", env: {} });
  assert.equal(selected.status, 0, selected.stderr);
  const payload = JSON.parse(selected.stdout);
  assert.equal(payload.model.id, "agent-source-review");
  assert.equal(payload.requests, 2);
  assert.deepEqual(payload.pairs, [{
    id: "undici-cache-key-path-normalization",
    problemClass: "cache-integrity",
  }]);

  const unbounded = spawnSync(process.execPath, [
    "scripts/eval-semantic-problem-emitters.mjs",
    "--dry-run",
    "--judgment-mode",
    "agent-source-review",
  ], { cwd: root, encoding: "utf8", env: {} });
  assert.notEqual(unbounded.status, 0);
  assert.match(unbounded.stderr, /requires explicit --pair selections/);
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
