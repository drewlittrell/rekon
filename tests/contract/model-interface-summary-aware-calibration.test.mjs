import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(".");
const fixturePath = resolve(
  repoRoot,
  "tests/evals/model-interface-optional-route/cases.json",
);
const calibrationPath = resolve(
  repoRoot,
  "tests/evals/model-interface-optional-route/summary-aware-calibration.json",
);

test("summary-aware calibration is bound to the current fixture, selection, and payload", () => {
  const calibration = readCalibration();
  const dryRun = runDryGate();

  assert.equal(calibration.fixtureSha256, digest(readFileSync(fixturePath)));
  assert.equal(
    calibration.selectionSha256,
    digest(JSON.stringify(dryRun.contextSelections)),
  );
  assert.equal(
    calibration.deliverySha256.summaryAwareV2,
    dryRun.contextDeliveryDigests[0].sha256,
  );
  assert.match(calibration.deliverySha256.summaryAwareV1, /^[a-f0-9]{64}$/u);
  assert.match(calibration.batchReportSha256.summaryAwareV1, /^[a-f0-9]{64}$/u);
  assert.match(calibration.batchReportSha256.summaryAwareV2, /^[a-f0-9]{64}$/u);

  const selection = dryRun.contextSelections[0];
  assert.deepEqual(selection.readFirstPaths, [
    "core/logging/src/logger.ts",
    "test/logging/logger.test.ts",
  ]);
  assert.deepEqual(selection.supportingPaths, []);
  assert.deepEqual(selection.boundaryPaths, []);
  assert.deepEqual(selection.routePlan.pathlessSummaries, {
    totalRoutes: 2,
    byRole: { compatibility: 1, dependency: 1 },
  });
});

test("pathless summaries remain a negative source-use result", () => {
  const calibration = readCalibration();

  assert.equal(calibration.status, "experimental-not-promoted");
  assert.equal(calibration.productionDefault, "full");
  for (const variant of [
    calibration.variants.summaryAwareV1,
    calibration.variants.summaryAwareV2,
  ]) {
    assert.equal(variant.passes, variant.runs);
    assert.equal(variant.adoptionPasses, variant.runs);
    assert.equal(variant.optionalRoutesInspected, variant.optionalRoutesOffered);
    assert.equal(variant.optionalRoutesUsed, variant.optionalRoutesOffered);
    assert.equal(variant.optionalRoutesSkipped, 0);
  }
  assert.equal(calibration.comparisonsAgainstFull.summaryAwareV1.explorationPathReduction, 0);
  assert.equal(calibration.comparisonsAgainstFull.summaryAwareV2.explorationPathReduction, 0);
  assert.ok(calibration.comparisonsAgainstFull.summaryAwareV1.optionalRouteUseReduction < 0);
  assert.ok(calibration.comparisonsAgainstFull.summaryAwareV2.optionalRouteUseReduction < 0);
  assert.ok(calibration.comparisonsAgainstFull.summaryAwareV2.nonCachedInputTokenReduction < 0);
  assert.ok(calibration.comparisonsAgainstFull.summaryAwareV2.visibleEstimatedTokenReduction < 0);
  assert.equal(calibration.judgment.qualityClaimAccepted, true);
  assert.equal(calibration.judgment.pathOmissionClaimAccepted, true);
  assert.equal(calibration.judgment.optionalRouteSkippingClaimAccepted, false);
  assert.equal(calibration.judgment.contextReadReductionClaimAccepted, false);
  assert.equal(calibration.judgment.tokenSavingsClaimAccepted, false);
  assert.equal(calibration.judgment.promotionAccepted, false);

  const encoded = JSON.stringify(calibration);
  for (const forbidden of [
    "sourceBodies",
    "prompts",
    "diffs",
    "rawCommands",
    "mcpPayloads",
    "freeFormModelText",
  ]) {
    assert.equal(encoded.includes(`\"${forbidden}\"`), false);
  }
  assert.equal(encoded.includes(".rekon-dev"), false);
});

function runDryGate() {
  const result = spawnSync(process.execPath, [
    "scripts/eval-model-interface-local-agent.mjs",
    "--corpus", "optional-route",
    "--case", "batch-log-formatting",
    "--delivery", "managed",
    "--condition", "rekon",
    "--context-policy", "summary-aware",
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

function readCalibration() {
  return JSON.parse(readFileSync(calibrationPath, "utf8"));
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}
