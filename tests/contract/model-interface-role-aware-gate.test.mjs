import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(".");
const calibrationPath = resolve(
  repoRoot,
  "tests/evals/model-interface-live/role-aware-delivery-gate.json",
);

test("role-aware delivery gate is bound to the current fixture, selection, and payloads", () => {
  const calibration = readCalibration();
  const fixtureBytes = readFileSync(resolve(
    repoRoot,
    "tests/evals/model-interface-live/cases.json",
  ));
  const full = dryRun("full");
  const roleAware = dryRun("role-aware");
  const selection = compactSelection(roleAware.contextSelections);

  assert.equal(calibration.fixtureSha256, digest(fixtureBytes));
  assert.equal(calibration.selectionSha256, digest(JSON.stringify(selection)));
  assert.deepEqual(calibration.fullDeliveryDigests, full.contextDeliveryDigests);
  assert.deepEqual(calibration.roleAwareDeliveryDigests, roleAware.contextDeliveryDigests);
});

test("role-aware deterministic gate reduces only the mandatory initial set", () => {
  const calibration = readCalibration();
  const full = compactSelection(dryRun("full").contextSelections);
  const roleAware = compactSelection(dryRun("role-aware").contextSelections);
  const fullMandatory = totalPaths(full, "readFirstPaths");
  const roleAwareMandatory = totalPaths(roleAware, "readFirstPaths");
  const conditional = roleAware.reduce(
    (total, entry) => total + entry.routePlan.conditionalPaths.length,
    0,
  );
  const roleCounts = {};
  for (const entry of roleAware) {
    for (const [role, paths] of Object.entries(entry.routePlan.byRole)) {
      roleCounts[role] = (roleCounts[role] ?? 0) + paths.length;
    }
  }

  assert.equal(calibration.status, "deterministic-ready-not-model-tested");
  assert.equal(calibration.productionDefault, "full");
  assert.equal(calibration.modelRuns, 0);
  assert.equal(calibration.summary.cases, roleAware.length);
  assert.equal(calibration.summary.selectedPaths, totalPaths(roleAware, "selectedPaths"));
  assert.equal(calibration.summary.fullMandatoryPaths, fullMandatory);
  assert.equal(calibration.summary.roleAwareMandatoryPaths, roleAwareMandatory);
  assert.equal(calibration.summary.roleAwareConditionalPaths, conditional);
  assert.equal(
    calibration.summary.mandatoryPathReduction,
    Number((1 - roleAwareMandatory / fullMandatory).toFixed(4)),
  );
  assert.ok(roleAware.every((entry) => entry.requiredContextRecall === 1));
  assert.ok(roleAware.every((entry) => entry.selectedPathPrecision === 1));
  assert.ok(roleAware.every((entry) => entry.constraintRecall === 1));
  assert.ok(roleAware.every((entry) => entry.commandRecall === 1));
  assert.deepEqual({
    "task-target": roleCounts["task-target"] ?? 0,
    "repository-law": roleCounts["repository-law"] ?? 0,
    implementation: roleCounts.implementation ?? 0,
    handoff: roleCounts.handoff ?? 0,
    verification: roleCounts.verification ?? 0,
    dependency: roleCounts.dependency ?? 0,
    compatibility: roleCounts.compatibility ?? 0,
    supporting: roleCounts.supporting ?? 0,
  }, calibration.roles);
  assert.equal(calibration.judgment.selectionCoverageAccepted, true);
  assert.equal(calibration.judgment.routeExplainabilityAccepted, true);
  assert.equal(calibration.judgment.actualSourceReadReductionAccepted, false);
  assert.equal(calibration.judgment.correctnessClaimAccepted, false);
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
    "--corpus", "live",
    "--delivery", "managed",
    "--condition", "rekon",
    "--context-policy", policy,
    "--dry-run",
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "" },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

function compactSelection(selections) {
  return selections.map(({
    caseId,
    selectedPaths,
    readFirstPaths,
    supportingPaths,
    routePlan,
    requiredContextRecall,
    selectedPathPrecision,
    constraintRecall,
    commandRecall,
    missingRequiredPaths,
    avoidableSelectedPaths,
  }) => ({
    caseId,
    selectedPaths,
    readFirstPaths,
    supportingPaths,
    routePlan,
    requiredContextRecall,
    selectedPathPrecision,
    constraintRecall,
    commandRecall,
    missingRequiredPaths,
    avoidableSelectedPaths,
  }));
}

function totalPaths(entries, key) {
  return entries.reduce((total, entry) => total + entry[key].length, 0);
}

function readCalibration() {
  return JSON.parse(readFileSync(calibrationPath, "utf8"));
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}
