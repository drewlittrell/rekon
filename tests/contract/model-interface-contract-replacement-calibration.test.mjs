import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(".");

test("exact visible-route contract calibration remains bound and non-promotable", () => {
  const paths = calibrationPaths("model-interface-contract-backed-route");
  const calibration = readJson(paths.calibration);
  const fixture = readJson(paths.fixture);
  const sourceFixturePath = resolve(dirname(paths.fixture), fixture.contextFixture);
  const sourceFixture = readJson(sourceFixturePath);
  const dryRun = runDryGate("contract-backed-route");

  assert.equal(calibration.fixtureSha256, digest(readFileSync(paths.fixture)));
  assert.equal(calibration.sourceFixtureSha256, digest(readFileSync(sourceFixturePath)));
  assert.equal(calibration.sourceCorpusSha256, digestCorpus(sourceFixturePath, sourceFixture));
  assert.equal(calibration.selectionSha256, digest(JSON.stringify(dryRun.contextSelections)));
  assert.equal(calibration.deliverySha256, dryRun.contextDeliveryDigests[0].sha256);
  assert.equal(calibration.treatment.passes, calibration.treatment.runs);
  assert.equal(calibration.treatment.adoptionPasses, calibration.treatment.runs);
  assert.equal(
    calibration.treatment.optionalRoutesInspected,
    calibration.treatment.optionalRoutes,
  );
  assert.equal(calibration.comparison.optionalRouteInspectionReduction, 0);
  assert.ok(calibration.comparison.commandReduction < 0);
  assert.ok(calibration.comparison.nonCachedInputTokenReduction < 0);
  assert.equal(calibration.judgment.sourceReplacementClaimAccepted, false);
  assert.equal(calibration.judgment.tokenSavingsClaimAccepted, false);
  assert.equal(calibration.judgment.promotionAccepted, false);
  assertSourceFree(calibration);
});

test("symbol-contract calibration records navigation gain without source replacement", () => {
  const paths = calibrationPaths("model-interface-symbol-contract-route");
  const calibration = readJson(paths.calibration);
  const fixture = readJson(paths.fixture);
  const dryRun = runDryGate("symbol-contract-route");

  assert.equal(calibration.fixtureSha256, digest(readFileSync(paths.fixture)));
  assert.equal(calibration.sourceCorpusSha256, digestCorpus(paths.fixture, fixture));
  assert.equal(calibration.selectionSha256, digest(JSON.stringify(dryRun.contextSelections)));
  assert.equal(calibration.deliverySha256, dryRun.contextDeliveryDigests[0].sha256);
  assert.equal(calibration.baseline.passes, calibration.baseline.runs);
  assert.equal(calibration.rekon.passes, calibration.rekon.runs);
  assert.equal(calibration.rekon.adoptionPasses, calibration.rekon.runs);
  assert.equal(calibration.comparison.candidatePairs, 3);
  assert.ok(calibration.comparison.explorationPathReduction > 0);
  assert.ok(calibration.comparison.commandReduction > 0);
  assert.equal(calibration.comparison.optionalRouteInspectionReduction, 0);
  assert.ok(calibration.comparison.reportedTokenReduction < 0);
  assert.ok(calibration.comparison.visibleEstimatedTokenReduction < 0);
  assert.equal(calibration.judgment.navigationReductionClaimAccepted, true);
  assert.equal(calibration.judgment.sourceReplacementClaimAccepted, false);
  assert.equal(calibration.judgment.tokenSavingsClaimAccepted, false);
  assert.equal(calibration.judgment.promotionAccepted, false);
  assertSourceFree(calibration);
});

function calibrationPaths(directory) {
  const base = resolve(repoRoot, "tests/evals", directory);
  return {
    fixture: join(base, "cases.json"),
    calibration: join(base, "calibration.json"),
  };
}

function runDryGate(corpus) {
  const result = spawnSync(process.execPath, [
    "scripts/eval-model-interface-local-agent.mjs",
    "--corpus", corpus,
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

function digestCorpus(fixturePath, fixture) {
  const corpusRoot = resolve(dirname(fixturePath), fixture.repository.root);
  const hash = createHash("sha256");
  for (const path of [...fixture.repository.files].sort()) {
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
    assert.equal(encoded.includes(`\"${forbidden}\"`), false);
  }
  assert.equal(encoded.includes(".rekon-dev"), false);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}
