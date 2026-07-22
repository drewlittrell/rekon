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
  "tests/evals/model-interface-optional-route/role-aware-calibration.json",
);

test("optional-route calibration remains reproducible and is historical after interface changes", () => {
  const calibration = readCalibration();
  const full = dryRun("full");
  const roleAware = dryRun("role-aware");
  const currentInstructionVersion = readFileSync(
    resolve(repoRoot, "packages/cli/src/agent-instructions.ts"),
    "utf8",
  ).match(/AGENT_INSTRUCTIONS_VERSION = "([^"]+)"/u)?.[1];

  assert.equal(calibration.status, "historical");
  assert.notEqual(calibration.instructionVersion, currentInstructionVersion);
  assert.match(calibration.revalidationReason, /proof-gated change workflow/iu);
  assert.equal(calibration.fixtureSha256, digest(readFileSync(fixturePath)));
  assert.equal(calibration.selectionSha256.full, digest(JSON.stringify(full.contextSelections)));
  assert.equal(
    calibration.selectionSha256.roleAware,
    digest(JSON.stringify(roleAware.contextSelections)),
  );
  assert.notDeepEqual(calibration.deliveryDigests.roleAware, roleAware.contextDeliveryDigests);
  assert.ok(calibration.deliveryDigests.full.every(({ sha256 }) => /^[a-f0-9]{64}$/u.test(sha256)));
  assert.ok(calibration.deliveryDigests.roleAware.every(({ sha256 }) => /^[a-f0-9]{64}$/u.test(sha256)));
  assert.match(calibration.batchReportSha256.full, /^[a-f0-9]{64}$/u);
  assert.match(calibration.batchReportSha256.roleAware, /^[a-f0-9]{64}$/u);
});

test("oracle-confirmed optional routes remain a negative role-aware result", () => {
  const calibration = readCalibration();

  assert.equal(calibration.status, "historical");
  assert.equal(calibration.productionDefault, "full");
  assert.equal(calibration.task.oracleRequiredPaths, 2);
  assert.equal(calibration.task.oracleOptionalPaths.length, 2);
  assert.equal(calibration.variants.full.passes, calibration.variants.full.runs);
  assert.equal(calibration.variants.roleAware.passes, calibration.variants.roleAware.runs);
  assert.equal(calibration.variants.full.adoptionPasses, calibration.variants.full.runs);
  assert.equal(calibration.variants.roleAware.adoptionPasses, calibration.variants.roleAware.runs);
  assert.equal(
    calibration.variants.roleAware.optionalRoutesUsed,
    calibration.variants.roleAware.optionalRoutesOffered,
  );
  assert.equal(calibration.variants.roleAware.optionalRoutesSkipped, 0);
  assert.ok(
    calibration.variants.roleAware.optionalRoutesUsed
      > calibration.variants.full.optionalRoutesUsed,
  );
  assert.equal(calibration.comparison.explorationPathReduction, 0);
  assert.ok(calibration.comparison.actualSelectedRouteUseReduction < 0);
  assert.ok(calibration.comparison.optionalRouteUseReduction < 0);
  assert.ok(calibration.comparison.reportedTokenReduction < 0);
  assert.ok(calibration.comparison.visibleEstimatedTokenReduction < 0);
  assert.equal(calibration.judgment.qualityClaimAccepted, true);
  assert.equal(calibration.judgment.managedAdoptionClaimAccepted, true);
  assert.equal(calibration.judgment.optionalRouteSkippingClaimAccepted, false);
  assert.equal(calibration.judgment.contextReadReductionClaimAccepted, false);
  assert.equal(calibration.judgment.tokenSavingsClaimAccepted, false);
  assert.equal(calibration.judgment.lazyRouteInvestmentAccepted, false);
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
    "--corpus", "optional-route",
    "--case", "batch-log-formatting",
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
