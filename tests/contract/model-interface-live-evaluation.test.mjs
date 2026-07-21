import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  buildModelInterfacePrompt,
  compactModelInterfaceRun,
  compareModelInterfacePair,
  normalizeModelInterfaceRefinementResponse,
  rescoreModelInterfaceReport,
  scoreModelInterfaceRefinement,
  scoreModelInterfaceRun,
  summarizeModelInterfaceRefinementCalibration,
} from "../../scripts/lib/model-interface-live-eval.mjs";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const oracle = {
  requiredContextPaths: ["src/domain.ts", "src/repository.ts"],
  allowedContextPaths: ["src/domain.ts", "src/repository.ts", "tests/domain.test.ts"],
  requiredModifyPaths: ["src/domain.ts", "tests/domain.test.ts"],
  protectedPaths: ["src/controller.ts"],
  constraintFragments: ["public contract", "authorization"],
  commands: ["npm test"],
  planConcepts: [["deactivat"], ["repository", "persist"], ["test"]],
};

function successfulRun(overrides = {}) {
  const run = {
    modelConfigId: "model",
    provider: "provider",
    model: "model",
    caseId: "case",
    repeat: 1,
    condition: "rekon",
    status: "ok",
    turns: 2,
    requestedPaths: ["src/domain.ts", "src/repository.ts"],
    invalidRequestedPaths: [],
    final: {
      status: "final",
      paths: [],
      contextPaths: ["src/domain.ts", "src/repository.ts"],
      filesToModify: ["src/domain.ts", "tests/domain.test.ts"],
      constraints: ["Keep the public contract and authorization behavior stable."],
      checks: ["npm test"],
      changePlan: ["Add deactivation through the repository persistence path.", "Update the tests."],
      risks: [],
      confidence: 0.9,
    },
    usage: { inputTokens: 100, outputTokens: 20, totalTokens: 120 },
    latencyMs: 10,
    costUsd: 0.001,
    ...overrides,
  };
  run.score = scoreModelInterfaceRun(run, oracle);
  return run;
}

test("live model-interface scoring requires context, pact, checks, and plan recall", () => {
  const run = successfulRun();
  assert.equal(run.score.passed, true);
  assert.equal(run.score.qualityScore, 1);
  assert.deepEqual(run.score.pactViolations, []);
});

test("constraint scoring accepts ordered clarifying words without weakening literal identifiers", () => {
  const run = successfulRun();
  run.final.constraints = ["Keep the HTTP controller contract and authorization behavior stable."];
  const clarifiedOracle = { ...oracle, constraintFragments: ["http contract", "authorization"] };
  assert.equal(scoreModelInterfaceRun(run, clarifiedOracle).constraintRecall, 1);

  const literalOracle = { ...oracle, constraintFragments: ["order-not-found"] };
  assert.equal(scoreModelInterfaceRun(run, literalOracle).constraintRecall, 0);
});

test("protected-file modification is a hard failure", () => {
  const run = successfulRun();
  run.final.filesToModify.push("src/controller.ts");
  run.score = scoreModelInterfaceRun(run, oracle);
  assert.equal(run.score.passed, false);
  assert.equal(run.score.hardFailure, true);
  assert.deepEqual(run.score.pactViolations, ["src/controller.ts"]);
});

test("paired comparison marks a no-worse, lower-cost Rekon run as a candidate", () => {
  const baseline = successfulRun({
    condition: "baseline",
    turns: 3,
    requestedPaths: ["src/domain.ts", "src/repository.ts", "tests/domain.test.ts"],
    usage: { inputTokens: 180, outputTokens: 20, totalTokens: 200 },
  });
  baseline.score = scoreModelInterfaceRun(baseline, oracle);
  const rekon = successfulRun();
  assert.equal(compareModelInterfacePair(baseline, rekon).decision, "candidate");
});

test("compacted reports retain decisions but no prompt or source bodies", () => {
  const run = successfulRun({ prompt: "secret prompt", inspectedFiles: [{ path: "src/domain.ts", text: "secret source" }] });
  const compact = compactModelInterfaceRun(run);
  assert.equal("prompt" in compact, false);
  assert.equal("inspectedFiles" in compact, false);
  assert.equal(JSON.stringify(compact).includes("secret source"), false);
});

test("both conditions receive repository guidance without needing to request AGENTS.md", () => {
  const common = {
    contextPacket: { readFirst: ["src/domain.ts"], boundaryPaths: [] },
    finalTurn: false,
    inspectedFiles: [],
    maxFilesPerTurn: 4,
    repositoryFiles: ["AGENTS.md", "src/domain.ts"],
    repositoryGuidance: "Add or update tests for public behavior.",
    task: "Change the domain behavior.",
  };
  for (const condition of ["baseline", "rekon"]) {
    const prompt = buildModelInterfacePrompt({ ...common, condition });
    assert.match(prompt, /Add or update tests for public behavior\./u);
    assert.match(prompt, /already loaded; do not request AGENTS\.md/u);
  }
});

test("refinement prompts reserve symbolic resolution for the Rekon condition", () => {
  const common = {
    contextPacket: { readFirst: ["src/registry.ts"], boundaryPaths: [] },
    finalTurn: false,
    inspectedFiles: [],
    maxFilesPerTurn: 4,
    maxRefinementCalls: 2,
    refinementAvailable: true,
    refinementHistory: [],
    repositoryFiles: ["src/registry.ts", "src/handler.ts"],
    repositoryGuidance: "Preserve stable job ids.",
    task: "Change the registered cleanup job.",
  };
  const managed = buildModelInterfacePrompt({ ...common, condition: "rekon" });
  assert.match(managed, /bounded Rekon refinement action/u);
  assert.match(managed, /Use status refine only when inspected source names a task-required symbolic/u);
  assert.match(managed, /Before finalizing, use deterministic refinement/u);
  assert.match(managed, /Use refinement before repository-wide or symbol text search/u);
  assert.match(managed, /At most 2 refinement calls/u);
  assert.match(managed, /anchor the inspected file that contains the symbolic ID/u);
  assert.match(managed, /path#symbol, never for a business identifier/u);
  assert.match(managed, /Inspect every unread readNext path with status inspect/u);
  assert.match(managed, /same unresolved request must not be repeated/u);
  assert.match(managed, /Repository tree: not preloaded in the managed condition/u);
  assert.doesNotMatch(managed, /- src\/handler\.ts/u);

  const baseline = buildModelInterfacePrompt({ ...common, condition: "baseline" });
  assert.match(baseline, /baseline condition has no Rekon refinement action/u);
  assert.match(baseline, /- src\/handler\.ts/u);
});

test("refinement response normalization requires a relationship and anchor", () => {
  const common = {
    status: "refine",
    paths: [],
    refinementRelationship: "implementation",
    refinementAnchorPath: "src/registry.ts",
    refinementAnchorSymbol: "",
    contextPaths: [],
    filesToModify: [],
    constraints: [],
    checks: [],
    changePlan: [],
    risks: [],
    confidence: 0.8,
  };
  const normalized = normalizeModelInterfaceRefinementResponse(
    common,
    ["src/registry.ts", "src/handler.ts"],
    4,
  );
  assert.equal(normalized.ok, true);
  assert.equal(normalized.response.refinementRelationship, "implementation");
  assert.equal(normalized.response.refinementAnchorPath, "src/registry.ts");

  assert.deepEqual(
    normalizeModelInterfaceRefinementResponse(
      { ...common, refinementRelationship: "none" },
      ["src/registry.ts"],
      4,
    ),
    { ok: false, error: "invalid-refinement-request" },
  );
});

test("refinement scoring requires the intended route and refined path", () => {
  const expectations = {
    requireRefinement: true,
    maxRefinementCalls: 2,
    requiredRefinementRelationship: "implementation",
    requiredRefinementAnchorPath: "src/registry.ts",
  };
  const refinementOracle = { requiredRefinementPaths: ["src/handler.ts"] };
  const run = successfulRun({
    requestedPaths: ["src/registry.ts", "src/handler.ts"],
    refinementRequests: [{
      relationship: "implementation",
      anchorPath: "src/registry.ts",
      readNext: ["src/handler.ts"],
      unresolved: false,
    }],
  });
  assert.deepEqual(scoreModelInterfaceRefinement(run, expectations, refinementOracle), {
    required: true,
    passed: true,
    calls: 1,
    targetMatched: true,
    refinedPathRecall: 1,
    excessive: false,
    unresolvedCalls: 0,
  });

  const wrongRoute = {
    ...run,
    refinementRequests: [{
      relationship: "consumer",
      anchorPath: "src/registry.ts",
      readNext: ["src/handler.ts"],
      unresolved: false,
    }],
  };
  assert.equal(scoreModelInterfaceRefinement(wrongRoute, expectations, refinementOracle).passed, false);
});

test("refinement paths are required context for live outcome scoring", () => {
  const run = successfulRun();
  const refinementOracle = {
    ...oracle,
    requiredRefinementPaths: ["src/handler.ts"],
    allowedContextPaths: [...oracle.allowedContextPaths, "src/handler.ts"],
  };
  const missing = scoreModelInterfaceRun(run, refinementOracle);
  assert.ok(missing.inspectedContextRecall < 1);
  assert.equal(missing.passed, false);

  run.requestedPaths.push("src/handler.ts");
  run.final.contextPaths.push("src/handler.ts");
  assert.equal(scoreModelInterfaceRun(run, refinementOracle).passed, true);
});

test("proactively routed paths are required context without requiring refinement", () => {
  const run = successfulRun();
  const routedOracle = {
    ...oracle,
    requiredRoutedContextPaths: ["src/handler.ts"],
    allowedContextPaths: [...oracle.allowedContextPaths, "src/handler.ts"],
  };
  assert.equal(scoreModelInterfaceRun(run, routedOracle).passed, false);

  run.requestedPaths.push("src/handler.ts");
  run.final.contextPaths.push("src/handler.ts");
  assert.equal(scoreModelInterfaceRun(run, routedOracle).passed, true);
  assert.equal(scoreModelInterfaceRefinement(run, {
    requireRefinement: false,
    maxRefinementCalls: 0,
  }, routedOracle).passed, true);
});

test("an unnecessary refinement call fails a proactive routing run", () => {
  const run = successfulRun({
    refinementRequests: [{
      relationship: "implementation",
      anchorPath: "src/registry.ts",
      readNext: ["src/handler.ts"],
      unresolved: false,
    }],
  });
  const result = scoreModelInterfaceRefinement(run, {
    requireRefinement: false,
    maxRefinementCalls: 0,
  }, { requiredRoutedContextPaths: ["src/handler.ts"] });
  assert.equal(result.passed, false);
  assert.equal(result.calls, 1);
});

test("live scoring normalizes command prose without weakening command identity", () => {
  const run = successfulRun({
    final: {
      ...successfulRun().final,
      checks: ["Run npm test."],
    },
  });
  assert.equal(scoreModelInterfaceRun(run, oracle).commandRecall, 1);
});

test("retained source-free reports can be rescored without provider calls", () => {
  const baseline = successfulRun({ condition: "baseline" });
  const rekon = successfulRun({ condition: "rekon" });
  const rescored = rescoreModelInterfaceReport({
    options: { repeats: 3 },
    summary: {},
    pairs: [],
    runs: [baseline, rekon],
  }, [{ id: "case", oracle }]);
  assert.equal(rescored.runs.every((run) => run.score.passed), true);
  assert.equal(rescored.pairs.length, 1);
  assert.equal(rescored.summary.pairedRuns, 1);
});

test("refinement calibration summary retains aggregates without model text or paths", () => {
  const baseline = successfulRun({ condition: "baseline" });
  const rekon = successfulRun({
    condition: "rekon",
    refinement: {
      required: true,
      passed: true,
      calls: 1,
      targetMatched: true,
      refinedPathRecall: 1,
      excessive: false,
      unresolvedCalls: 0,
    },
  });
  const summary = summarizeModelInterfaceRefinementCalibration({
    generatedAt: "2026-07-18T00:00:00.000Z",
    pricingAsOf: "2026-07-15",
    fixture: { corpus: "refinement", cases: ["case"] },
    options: { repeats: 1 },
    models: [{ id: "model", provider: "provider", model: "model" }],
    pairs: [{ modelConfigId: "model", decision: "candidate" }],
    runs: [baseline, rekon],
  });
  assert.equal(summary.sourceRetention, "none");
  assert.equal(summary.routingPolicy, "proactive-deterministic-symbolic-with-bounded-refinement-fallback");
  assert.equal(summary.models[0].refinement.passedRuns, 1);
  assert.equal(summary.models[0].refinement.unnecessaryCalls, 0);
  assert.equal(summary.models[0].decisions.candidate, 1);
  const text = JSON.stringify(summary);
  assert.equal(text.includes("src/domain.ts"), false);
  assert.equal(text.includes("changePlan"), false);
  assert.equal(text.includes("constraints"), false);
});

test("live model-interface dry run is credential-free and bounded", () => {
  const result = spawnSync(process.execPath, [
    "scripts/eval-model-interface-live.mjs",
    "--dry-run",
    "--case",
    "implementation-user-deactivation",
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "" },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = JSON.parse(result.stdout);
  assert.equal(output.pairedRuns, 1);
  assert.equal(output.conditionRuns, 2);
  assert.equal(output.upperBoundProviderCalls, 8);
  assert.equal(output.sourceRetention, "none");
  assert.equal(output.promotionRequiresRepeats, 3);
});

test("refinement live dry run freezes three cases and two paired conditions", () => {
  const result = spawnSync(process.execPath, [
    "scripts/eval-model-interface-live.mjs",
    "--dry-run",
    "--corpus",
    "refinement",
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "" },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = JSON.parse(result.stdout);
  assert.equal(output.corpus, "refinement");
  assert.equal(output.cases.length, 3);
  assert.equal(output.pairedRuns, 3);
  assert.equal(output.conditionRuns, 6);
  assert.equal(output.upperBoundProviderCalls, 24);
  assert.equal(output.sourceRetention, "none");
});

test("positive refinement live dry run is credential-free and bounded to one case", () => {
  const result = spawnSync(process.execPath, [
    "scripts/eval-model-interface-live.mjs",
    "--dry-run",
    "--corpus",
    "refinement-positive",
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "" },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = JSON.parse(result.stdout);
  assert.equal(output.corpus, "refinement-positive");
  assert.deepEqual(output.cases, ["checkout-runtime-serializer-refinement"]);
  assert.equal(output.pairedRuns, 1);
  assert.equal(output.conditionRuns, 2);
  assert.equal(output.upperBoundProviderCalls, 8);
  assert.match(output.hypothesis, /one bounded deterministic refinement/u);
  assert.equal(output.sourceRetention, "none");
});

test("positive refinement provider calibration records the scoped low-effort failure without source", () => {
  const calibration = JSON.parse(readFileSync(
    resolve(repoRoot, "tests/evals/model-interface-refinement-positive/token-calibration.json"),
    "utf8",
  ));
  assert.equal(calibration.corpus, "refinement-positive");
  assert.equal(calibration.repeatsPerCase, 3);
  assert.equal(calibration.pairedRuns, 6);
  assert.equal(calibration.models.every((model) => model.decisions.discard === 3), true);
  assert.equal(calibration.models.every((model) => model.refinement.calls === 0), true);
  assert.equal(calibration.models.every((model) => model.rekon.averageQuality < model.baseline.averageQuality), true);
  const encoded = JSON.stringify(calibration);
  for (const forbidden of ["sourceBodies", "prompts", "credentials", "modelProse"]) {
    assert.equal(encoded.includes(`\"${forbidden}\"`), false);
  }
});

test("proactive symbolic calibration and judge record are source-free and digest-bound", () => {
  const calibrationText = readFileSync(
    resolve(repoRoot, "tests/evals/model-interface-refinement/proactive-token-calibration.json"),
    "utf8",
  );
  const calibration = JSON.parse(calibrationText);
  const judgment = JSON.parse(readFileSync(
    resolve(repoRoot, "tests/evals/model-interface-refinement/proactive-token-judgment.json"),
    "utf8",
  ));
  assert.equal(calibration.routingPolicy, "proactive-deterministic-symbolic-with-bounded-refinement-fallback");
  assert.equal(calibration.models.every((model) => model.refinement.calls === 0), true);
  assert.equal(calibration.models.find((model) => model.provider === "openai").relative.totalTokenReduction > 0, true);
  assert.equal(calibration.models.find((model) => model.provider === "anthropic").relative.totalTokenReduction > -0.1, true);
  assert.equal(judgment.judge.decision, "keep-proactive-routing");
  assert.equal(judgment.judge.acceptedManagedPlans, judgment.automated.managedRuns);
  assert.equal(
    judgment.subject.sha256,
    createHash("sha256").update(calibrationText).digest("hex"),
  );
  const encoded = JSON.stringify({ calibration, judgment });
  for (const forbidden of ["sourceBodies", "prompts", "credentials", "modelProse"]) {
    assert.equal(encoded.includes(`\"${forbidden}\"`), false);
  }
});

test("accepted token calibration is aggregate-only and records the measured advantage", () => {
  const calibration = JSON.parse(readFileSync(
    resolve(repoRoot, "tests/evals/model-interface-live/token-calibration.json"),
    "utf8",
  ));

  assert.equal(calibration.sourceRetention, "none");
  assert.equal(calibration.pairedRuns, 18);
  assert.equal(calibration.rekon.passes, 18);
  assert.ok(calibration.rekon.passes > calibration.baseline.passes);
  assert.ok(calibration.rekon.averageInspectedFiles < calibration.baseline.averageInspectedFiles);
  assert.ok(calibration.rekon.averageTurns < calibration.baseline.averageTurns);
  assert.ok(calibration.rekon.usage.totalTokens < calibration.baseline.usage.totalTokens);
  assert.ok(calibration.rekon.estimatedCostUsd < calibration.baseline.estimatedCostUsd);
  assert.equal("runs" in calibration, false);
  assert.equal("pairs" in calibration, false);
  assert.equal("prompts" in calibration, false);
  assert.equal("responses" in calibration, false);
});
