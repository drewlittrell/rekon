import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(".");
const fixturePath = resolve(
  repoRoot,
  "tests/evals/model-interface-navigation-packet/cases.json",
);
const calibrationPath = resolve(
  repoRoot,
  "tests/evals/model-interface-navigation-packet/calibration.json",
);

test("navigation-only calibration stays bound to its normative fixture and payloads", () => {
  const calibration = readJson(calibrationPath);
  const fixture = readJson(fixturePath);
  const sourceFixturePath = resolve(dirname(fixturePath), fixture.contextFixture);
  const sourceFixture = readJson(sourceFixturePath);
  const dryRuns = Object.fromEntries(["full", "summary-aware", "navigation-only"].map((policy) => [
    policy,
    runDryGate(policy),
  ]));
  const navigation = dryRuns["navigation-only"];

  assert.equal(calibration.fixtureSha256, digest(readFileSync(fixturePath)));
  assert.equal(calibration.sourceFixtureSha256, digest(readFileSync(sourceFixturePath)));
  assert.equal(
    calibration.sourceCorpusSha256,
    digestCorpus(fixturePath, fixture, sourceFixture.repository.files),
  );
  assert.equal(calibration.selectionSha256, digest(JSON.stringify(navigation.contextSelections)));
  assert.equal(calibration.deliverySha256, navigation.contextDeliveryDigests[0].sha256);

  for (const [policy, key] of [
    ["full", "full"],
    ["summary-aware", "summaryAware"],
    ["navigation-only", "navigationOnly"],
  ]) {
    const recorded = calibration.payloadComparison[key];
    const current = dryRuns[policy];
    assert.equal(recorded.sha256, current.contextDeliveryDigests[0].sha256);
    assert.equal(recorded.estimatedTokens, current.contextDeliveryMetrics[0].estimatedTokens);
    assert.equal(recorded.utf8Bytes, current.contextDeliveryMetrics[0].utf8Bytes);
  }

  const selection = navigation.contextSelections[0];
  assert.deepEqual(selection.selectedPaths, [
    "core/logging/src/logger.ts",
    "test/logging/logger.test.ts",
  ]);
  assert.equal(selection.routePlan.pathlessSummaries, undefined);
  assert.equal(calibration.task.deliveredOptionalPaths, 0);
});

test("minimal navigation remains a routing-only result and is not promoted", () => {
  const calibration = readJson(calibrationPath);

  assert.equal(calibration.baseline.passes, calibration.baseline.runs);
  assert.equal(calibration.rekon.passes, calibration.rekon.runs);
  assert.equal(calibration.rekon.adoptionPasses, calibration.rekon.runs);
  assert.equal(calibration.comparison.candidatePairs, 3);
  assert.ok(calibration.comparison.explorationPathReduction > 0);
  assert.ok(calibration.comparison.payloadTokenReductionAgainstFull > 0);
  assert.ok(calibration.comparison.commandReduction < 0);
  assert.ok(calibration.comparison.reportedTokenReduction < 0);
  assert.ok(calibration.comparison.nonCachedInputTokenReduction < 0);
  assert.ok(calibration.comparison.visibleEstimatedTokenReduction < 0);
  assert.ok(
    calibration.rekon.implementationPathInspected
      > calibration.baseline.implementationPathInspected,
  );
  assert.equal(calibration.judgment.navigationReductionClaimAccepted, true);
  assert.equal(calibration.judgment.sourceReadReductionClaimAccepted, false);
  assert.equal(calibration.judgment.tokenSavingsClaimAccepted, false);
  assert.equal(calibration.judgment.promotionAccepted, false);
  assertSourceFree(calibration);
});

function runDryGate(policy) {
  const result = spawnSync(process.execPath, [
    "scripts/eval-model-interface-local-agent.mjs",
    "--corpus", "navigation-packet",
    "--delivery", "managed",
    "--condition", "rekon",
    "--context-policy", policy,
    "--dry-run",
    "--model", "gpt-5.6-sol",
    "--reasoning-effort", "xhigh",
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "" },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

function digestCorpus(currentFixturePath, fixture, files) {
  const corpusRoot = resolve(dirname(currentFixturePath), fixture.repository.root);
  const hash = createHash("sha256");
  for (const path of [...files].sort()) {
    hash.update(path);
    hash.update("\0");
    hash.update(readFileSync(join(corpusRoot, path)));
    hash.update("\0");
  }
  return hash.digest("hex");
}

function assertSourceFree(calibration) {
  const encoded = JSON.stringify(calibration);
  for (const forbidden of [
    "sourceBodies",
    "prompts",
    "diffs",
    "rawCommands",
    "mcpPayloads",
    "freeFormModelText",
  ]) {
    assert.equal(encoded.includes(`"${forbidden}"`), false);
  }
  assert.equal(encoded.includes(".rekon-dev"), false);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}
