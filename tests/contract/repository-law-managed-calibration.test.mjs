import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(".");

test("repository-law Sol calibration retains digest-bound historical evidence after interface changes", () => {
  const calibration = JSON.parse(readFileSync(
    resolve(repoRoot, "tests/evals/model-interface-contracts/sol-managed-calibration.json"),
    "utf8",
  ));
  const fixtureBytes = readFileSync(resolve(
    repoRoot,
    "tests/evals/model-interface-contracts/cases.json",
  ));
  const contextFixtureBytes = readFileSync(resolve(
    repoRoot,
    "tests/fixtures/repository-law-context-eval/cases.json",
  ));
  const instructionSource = readFileSync(
    resolve(repoRoot, "packages/cli/src/agent-instructions.ts"),
    "utf8",
  );
  const currentInstructionVersion = instructionSource.match(
    /AGENT_INSTRUCTIONS_VERSION = "([^"]+)"/u,
  )?.[1];
  const dryRun = spawnSync(process.execPath, [
    "scripts/eval-model-interface-local-agent.mjs",
    "--corpus", "contracts",
    "--delivery", "managed",
    "--dry-run",
    "--model", "gpt-5.6-sol",
    "--reasoning-effort", "xhigh",
    "--repeats", "1",
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "" },
  });

  assert.equal(dryRun.status, 0, dryRun.stderr || dryRun.stdout);
  const selection = JSON.parse(dryRun.stdout).contextSelections.map(({
    caseId,
    selectedPaths,
    readFirstPaths,
    boundaryPaths,
    requiredContextRecall,
    selectedPathPrecision,
    constraintRecall,
    commandRecall,
  }) => ({
    caseId,
    selectedPaths,
    readFirstPaths,
    boundaryPaths,
    requiredContextRecall,
    selectedPathPrecision,
    constraintRecall,
    commandRecall,
  }));

  assert.equal(calibration.instructionVersion, "1.8.0");
  assert.notEqual(calibration.instructionVersion, currentInstructionVersion);
  assert.equal(calibration.status, "historical");
  assert.match(calibration.revalidationReason, /flow-stage responsibilities/iu);
  assert.equal(calibration.fixtureSha256, digest(fixtureBytes));
  assert.notEqual(calibration.contextFixtureSha256, digest(contextFixtureBytes));
  assert.equal(calibration.selectionSha256, digest(JSON.stringify(selection)));
  assert.match(calibration.contextFixtureSha256, /^[a-f0-9]{64}$/u);
  assert.match(calibration.selectionSha256, /^[a-f0-9]{64}$/u);
  assert.equal(calibration.batchReportSha256.length, 2);
  assert.ok(calibration.batchReportSha256.every((value) => /^[a-f0-9]{64}$/u.test(value)));
});

test("repository-law Sol calibration records quality gains without a token-savings claim", () => {
  const calibration = JSON.parse(readFileSync(
    resolve(repoRoot, "tests/evals/model-interface-contracts/sol-managed-calibration.json"),
    "utf8",
  ));

  assert.equal(calibration.summary.pairedRuns, 6);
  assert.equal(calibration.summary.candidatePairs, 6);
  assert.equal(calibration.summary.baselinePasses, 4);
  assert.equal(calibration.summary.rekonPasses, 6);
  assert.equal(calibration.summary.managedAdoptionRuns, 6);
  assert.equal(calibration.summary.managedFullReadFirstUseRuns, 6);
  assert.equal(calibration.summary.managedRefinementCalls, 0);
  assert.ok(calibration.summary.explorationPathReduction > 0.5);
  assert.ok(calibration.summary.tokenUsage.reportedTotalReduction < 0);
  assert.ok(calibration.summary.tokenUsage.visibleEstimatedReduction < 0);
  assert.equal(
    calibration.judgment.classification,
    "correctness-and-exploration-gain-token-overhead",
  );
  assert.equal(calibration.judgment.correctnessClaimAccepted, true);
  assert.equal(calibration.judgment.explorationClaimAccepted, true);
  assert.equal(calibration.judgment.managedAdoptionClaimAccepted, true);
  assert.equal(calibration.judgment.tokenSavingsClaimAccepted, false);
  assert.equal(calibration.judgment.lowerModelLiftClaimAccepted, false);
  assert.equal(calibration.judgment.crossRepositoryGeneralizationClaimAccepted, false);

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
