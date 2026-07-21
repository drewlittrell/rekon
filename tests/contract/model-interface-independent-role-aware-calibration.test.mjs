import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(".");
const calibrationPath = resolve(
  repoRoot,
  "tests/evals/model-interface-independent/role-aware-delivery-calibration.json",
);

test("independent role-aware calibration is bound to both current delivery policies", () => {
  const calibration = readCalibration();
  const fixtureBytes = readFileSync(resolve(
    repoRoot,
    "tests/evals/model-interface-independent/cases.json",
  ));
  const full = dryRun("full");
  const roleAware = dryRun("role-aware");

  assert.equal(calibration.fixtureSha256, digest(fixtureBytes));
  assert.equal(calibration.selectionSha256.full, digest(JSON.stringify(full.contextSelections)));
  assert.equal(calibration.selectionSha256.roleAware, digest(JSON.stringify(roleAware.contextSelections)));
  assert.deepEqual(calibration.deliveryDigests.full, full.contextDeliveryDigests);
  assert.deepEqual(calibration.deliveryDigests.roleAware, roleAware.contextDeliveryDigests);
  assert.match(calibration.batchReportSha256.full, /^[a-f0-9]{64}$/u);
  assert.match(calibration.batchReportSha256.roleAware, /^[a-f0-9]{64}$/u);
});

test("role-aware remains non-default after preserving quality without reducing reads", () => {
  const calibration = readCalibration();

  assert.equal(calibration.status, "experimental-not-promoted");
  assert.equal(calibration.productionDefault, "full");
  assert.equal(calibration.variants.full.passes, calibration.variants.full.runs);
  assert.equal(calibration.variants.roleAware.passes, calibration.variants.roleAware.runs);
  assert.equal(calibration.variants.full.adoptionPasses, calibration.variants.full.runs);
  assert.equal(calibration.variants.roleAware.adoptionPasses, calibration.variants.roleAware.runs);
  assert.equal(
    calibration.variants.roleAware.conditionalRoutesInspected,
    calibration.variants.roleAware.conditionalRoutesOffered,
  );
  assert.equal(calibration.variants.roleAware.conditionalRoutesSkipped, 0);
  assert.equal(calibration.comparison.actualSelectedRouteReadReduction, 0);
  assert.equal(calibration.comparison.explorationPathReduction, 0);
  assert.ok(calibration.comparison.reportedTokenReduction < 0);
  assert.ok(calibration.comparison.visibleEstimatedTokenReduction < 0);
  assert.equal(calibration.judgment.qualityClaimAccepted, true);
  assert.equal(calibration.judgment.managedAdoptionClaimAccepted, true);
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

function dryRun(policy) {
  const result = spawnSync(process.execPath, [
    "scripts/eval-model-interface-local-agent.mjs",
    "--corpus", "independent",
    "--case", "configured-region-failover",
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

function readCalibration() {
  return JSON.parse(readFileSync(calibrationPath, "utf8"));
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}
