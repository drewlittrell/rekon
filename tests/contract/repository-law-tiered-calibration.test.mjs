import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(".");
const calibrationPath = resolve(
  repoRoot,
  "tests/evals/model-interface-contracts/tiered-delivery-calibration.json",
);

test("tiered delivery calibration is bound to current selection and delivery payloads", () => {
  const calibration = JSON.parse(readFileSync(calibrationPath, "utf8"));
  const fixtureBytes = readFileSync(resolve(
    repoRoot,
    "tests/evals/model-interface-contracts/cases.json",
  ));
  const contextFixtureBytes = readFileSync(resolve(
    repoRoot,
    "tests/fixtures/repository-law-context-eval/cases.json",
  ));
  const dryRun = spawnSync(process.execPath, [
    "scripts/eval-model-interface-local-agent.mjs",
    "--corpus", "contracts",
    "--delivery", "managed",
    "--condition", "rekon",
    "--context-policy", "tiered",
    "--dry-run",
    "--model", "gpt-5.6-sol",
    "--reasoning-effort", "xhigh",
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "" },
  });

  assert.equal(dryRun.status, 0, dryRun.stderr || dryRun.stdout);
  const output = JSON.parse(dryRun.stdout);
  const selection = output.contextSelections.map(({
    caseId,
    selectedPaths,
    readFirstPaths,
    supportingPaths,
    boundaryPaths,
    requiredContextRecall,
    selectedPathPrecision,
    constraintRecall,
    commandRecall,
  }) => ({
    caseId,
    selectedPaths,
    readFirstPaths,
    supportingPaths,
    boundaryPaths,
    requiredContextRecall,
    selectedPathPrecision,
    constraintRecall,
    commandRecall,
  }));

  assert.equal(calibration.fixtureSha256, digest(fixtureBytes));
  assert.equal(calibration.contextFixtureSha256, digest(contextFixtureBytes));
  assert.equal(calibration.selectionSha256, digest(JSON.stringify(selection)));
  assert.deepEqual(calibration.deliveryDigests, output.contextDeliveryDigests);
  assert.ok(calibration.batchReportSha256.every((value) => /^[a-f0-9]{64}$/u.test(value)));
});

test("tiered delivery remains non-default because it did not reduce source reads", () => {
  const calibration = JSON.parse(readFileSync(calibrationPath, "utf8"));

  assert.equal(calibration.status, "experimental-not-promoted");
  assert.equal(calibration.productionDefault, "full");
  assert.equal(calibration.summary.rekonPasses, calibration.summary.rekonRuns);
  assert.equal(calibration.summary.rekonAdoptionPasses, calibration.summary.rekonRuns);
  assert.equal(
    calibration.summary.supportingRoutesInspected,
    calibration.summary.supportingRoutesOffered,
  );
  assert.equal(calibration.summary.supportingRoutesSkipped, 0);
  assert.equal(calibration.judgment.qualityClaimAccepted, true);
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

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}
