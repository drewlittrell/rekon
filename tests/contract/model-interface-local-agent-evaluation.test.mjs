import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  assessRekonContextUse,
  classifyBenchmarkModifiedPaths,
  compactLocalAgentRun,
  compareManagedLocalAgentPair,
  compareLocalAgentPair,
  estimateVisibleTokenUsage,
  mergeAgentCommands,
  parseCodexJsonl,
  parseGitStatusPaths,
  scoreLocalAgentOutcome,
  summarizeCodexExploration,
  summarizeContextSelection,
  summarizeContextUse,
  summarizeCodexTokenUsage,
  summarizeLocalAgentRuns,
  summarizeRekonAdoption,
  summarizeRekonProductLoop,
} from "../../scripts/lib/model-interface-local-agent-eval.mjs";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const repositoryFiles = [
  "AGENTS.md",
  "src/domain/user-service.ts",
  "src/data/user-repository.ts",
  "src/notifications/user-notifier.ts",
  "tests/user-service.test.ts",
];
const oracle = {
  requiredModifyPaths: ["src/domain/user-service.ts", "tests/user-service.test.ts"],
  allowedModifyPaths: ["src/domain/user-service.ts", "tests/user-service.test.ts"],
  protectedPaths: ["src/api/user-controller.ts"],
  commands: ["npm test"],
};

function successfulRun(overrides = {}) {
  const run = {
    runner: "codex-subscription",
    model: "default",
    caseId: "case",
    repeat: 1,
    condition: "rekon",
    status: "ok",
    final: {
      status: "complete",
      contextPaths: ["src/domain/user-service.ts", "src/data/user-repository.ts"],
      filesModified: ["src/domain/user-service.ts", "tests/user-service.test.ts"],
      checks: ["npm test"],
      summary: ["Implemented deactivation."],
      risks: [],
      confidence: 0.9,
    },
    modifiedPaths: ["src/domain/user-service.ts", "tests/user-service.test.ts"],
    agentCommands: ["/bin/zsh -lc 'npm test'"],
    requiredChecks: [{ command: "npm test", exitCode: 0 }],
    oracleChecks: [{ command: "hidden:deactivation", exitCode: 0 }],
    exploration: {
      commandCount: 2,
      discoveryCommands: 0,
      readCommands: 1,
      verificationCommands: 1,
      failedCommands: 0,
      discoveredPaths: [],
      inspectedPaths: ["src/domain/user-service.ts", "src/data/user-repository.ts"],
      searchedPaths: [],
    },
    elapsedMs: 10,
    ...overrides,
  };
  run.score = scoreLocalAgentOutcome(run, oracle);
  return run;
}

function completeProductLoopArtifactEvidence() {
  return {
    newArtifactCounts: {
      ContextUsageEvent: 2,
      VerificationPlan: 1,
      VerificationRun: 1,
      VerificationResult: 1,
      ProofGateReport: 1,
      OutcomeEvent: 2,
      EvidenceGraph: 1,
    },
    deliveryRecorded: true,
    contextClaimReceiptRecorded: true,
    contextClaimCoverage: 1,
    verificationPlanRecorded: true,
    verificationRunPassed: true,
    verificationSourceStable: true,
    verificationResultPassed: true,
    verificationLineageComplete: true,
    proofGateSatisfied: true,
    proofGateLinkedVerification: true,
    validationOutcomeVerified: true,
    proofLineageComplete: true,
    refreshOutcomeAccepted: true,
    refreshOutcomeLinkedProof: true,
    refreshedEvidenceLinkedProof: true,
    refreshLineageComplete: true,
    refreshCompleted: true,
    managedInstructionsCurrent: true,
    refs: {
      proofGate: {
        type: "ProofGateReport",
        id: "proof",
        schemaVersion: "0.1.0",
      },
    },
  };
}

test("Codex JSONL parsing ignores runner diagnostics and summarizes bounded exploration", () => {
  const text = [
    "runner warning",
    JSON.stringify({ type: "turn.started" }),
    JSON.stringify({
      type: "item.completed",
      item: {
        type: "command_execution",
        command: "/bin/zsh -lc \"rg -n 'UserService' src tests\"",
        aggregated_output: "src/domain/user-service.ts:1:export class UserService",
        exit_code: 0,
      },
    }),
    JSON.stringify({
      type: "item.completed",
      item: {
        type: "command_execution",
        command: "/bin/zsh -lc 'npm test'",
        aggregated_output: "ok",
        exit_code: 0,
      },
    }),
    JSON.stringify({ type: "turn.completed", usage: { input_tokens: 999 } }),
  ].join("\n");
  const parsed = parseCodexJsonl(text);
  const summary = summarizeCodexExploration(parsed.events, repositoryFiles);
  assert.equal(parsed.ignoredLines.length, 1);
  assert.equal(summary.readCommands, 1);
  assert.equal(summary.verificationCommands, 1);
  assert.deepEqual(summary.inspectedPaths, ["src/domain/user-service.ts"]);
  assert.deepEqual(summary.searchedPaths, [
    "src/data/user-repository.ts",
    "src/domain/user-service.ts",
    "src/notifications/user-notifier.ts",
    "tests/user-service.test.ts",
  ]);
});

test("Codex subscription usage retains aggregate counts without payloads", () => {
  const usage = summarizeCodexTokenUsage([
    {
      type: "turn.completed",
      usage: {
        input_tokens: 1_200,
        cached_input_tokens: 800,
        output_tokens: 300,
        reasoning_output_tokens: 75,
        secret: "must-not-be-retained",
      },
    },
  ]);

  assert.deepEqual(usage, {
    source: "codex-turn-completed",
    available: true,
    turns: 1,
    inputTokens: 1_200,
    cachedInputTokens: 800,
    outputTokens: 300,
    reasoningOutputTokens: 75,
    nonCachedInputTokens: 400,
    totalTokens: 1_500,
  });
  assert.equal(JSON.stringify(usage).includes("must-not-be-retained"), false);
});

test("visible token estimates count model-visible categories without retaining content", () => {
  const estimate = estimateVisibleTokenUsage([
    {
      type: "item.completed",
      item: {
        type: "command_execution",
        command: "cat src/secret.ts",
        aggregated_output: "sensitive source body",
      },
    },
    {
      type: "item.completed",
      item: {
        type: "mcp_tool_call",
        arguments: { goal: "sensitive task" },
        result: { content: "sensitive context" },
      },
    },
    {
      type: "item.completed",
      item: { type: "agent_message", text: "sensitive final answer" },
    },
  ], "sensitive prompt");

  assert.equal(estimate.method, "utf8-bytes-divided-by-four");
  assert.ok(estimate.promptTokens > 0);
  assert.ok(estimate.commandOutputTokens > 0);
  assert.ok(estimate.mcpOutputTokens > 0);
  assert.ok(estimate.modelActionTokens > 0);
  assert.ok(estimate.finalResponseTokens > 0);
  assert.equal(JSON.stringify(estimate).includes("sensitive"), false);
});

test("managed-interface adoption requires successful context before exploration and required tools", () => {
  const adopted = summarizeRekonAdoption([
    { type: "item.completed", item: { type: "mcp_tool_call", server: "rekon", tool: "orientation", status: "completed", arguments: { secret: "discard" } } },
    { type: "item.completed", item: { type: "mcp_tool_call", server: "rekon", tool: "context_for_task", status: "completed", result: { source: "discard" } } },
    { type: "item.completed", item: { type: "mcp_tool_call", server: "rekon", tool: "where_does_this_belong", status: "completed" } },
    { type: "item.completed", item: { type: "command_execution", command: "rg -n review src", exit_code: 0 } },
  ], { requirePlacement: true });

  assert.equal(adopted.status, "adopted");
  assert.equal(adopted.passed, true);
  assert.equal(adopted.contextBeforeExploration, true);
  assert.deepEqual(adopted.toolCalls, [
    { order: 1, tool: "orientation", status: "completed" },
    { order: 2, tool: "context_for_task", status: "completed" },
    { order: 3, tool: "where_does_this_belong", status: "completed" },
  ]);
  assert.equal(JSON.stringify(adopted).includes("secret"), false);
  assert.equal(JSON.stringify(adopted).includes("source"), false);
});

test("managed product-loop scoring requires ordered proof-gated maintenance and linked artifacts", () => {
  const artifactEvidence = completeProductLoopArtifactEvidence();
  const events = [
    {
      type: "item.completed",
      item: {
        type: "mcp_tool_call",
        server: "rekon",
        tool: "context_for_task",
        status: "completed",
      },
    },
    {
      type: "item.completed",
      item: {
        type: "command_execution",
        command: "sed -n 1,120p src/domain/user-service.ts tests/user-service.test.ts",
        aggregated_output: "",
        exit_code: 0,
      },
    },
    {
      type: "item.completed",
      item: { type: "file_change", changes: [{ path: "src/domain/user-service.ts" }] },
    },
    {
      type: "item.completed",
      item: {
        type: "mcp_tool_call",
        server: "rekon",
        tool: "validate_change",
        status: "completed",
        arguments: {
          task: "deactivate user",
          changedPaths: ["src/domain/user-service.ts"],
          contextUsageRef: "ContextUsageEvent:usage",
          contextClaims: { "src/domain/user-service.ts": "applied" },
        },
      },
    },
    {
      type: "item.completed",
      item: {
        type: "command_execution",
        command: "rekon context validate-change --task change --changed-path src/domain/user-service.ts --prepare-verification --json",
        aggregated_output: "{}",
        exit_code: 0,
      },
    },
    {
      type: "item.completed",
      item: {
        type: "command_execution",
        command: "rekon verify run --plan VerificationPlan:plan --execute --json",
        aggregated_output: "{}",
        exit_code: 0,
      },
    },
    {
      type: "item.completed",
      item: {
        type: "command_execution",
        command: "rekon verify result from-run --run VerificationRun:run --json",
        aggregated_output: "{}",
        exit_code: 0,
      },
    },
    {
      type: "item.completed",
      item: {
        type: "mcp_tool_call",
        server: "rekon",
        tool: "validate_change",
        status: "completed",
        arguments: {
          task: "deactivate user",
          changedPaths: ["src/domain/user-service.ts"],
          verificationResults: ["VerificationResult:result"],
          judgments: [],
        },
      },
    },
    {
      type: "item.completed",
      item: {
        type: "command_execution",
        command: "rekon context validate-change --task change --changed-path src/domain/user-service.ts --verification-result VerificationResult:result --record-proof --json",
        aggregated_output: "{}",
        exit_code: 0,
      },
    },
    {
      type: "item.completed",
      item: {
        type: "command_execution",
        command: "rekon refresh --proof-gate ProofGateReport:proof --json",
        aggregated_output: JSON.stringify({
          status: "passed",
          freshness: {
            latestMajor: [
              { type: "EvidenceGraph", id: "evidence", status: "fresh" },
              { type: "IntelligenceSnapshot", id: "snapshot", status: "fresh" },
            ],
          },
          steps: [
            { id: "agent-instructions.sync", status: "passed" },
            { id: "proof-gate.preaccept", status: "passed" },
            { id: "outcome.record", status: "passed" },
            { id: "artifacts.freshness", status: "passed" },
            { id: "proof-gate.revalidate", status: "passed" },
          ],
        }),
        exit_code: 0,
      },
    },
  ];

  const loop = summarizeRekonProductLoop(events, artifactEvidence, { required: true });
  assert.equal(loop.required, true);
  assert.equal(loop.passed, true);
  assert.deepEqual(loop.missing, []);
  assert.equal(loop.validationCalls, 4);
  assert.equal(loop.checks.contextBeforeEdit, true);
  assert.equal(loop.checks.verificationOrderValid, true);
  assert.equal(loop.checks.proofOrderValid, true);
  assert.equal(loop.checks.refreshOrderValid, true);
  assert.ok(loop.phaseMetrics.context.events > 0);
  assert.ok(loop.phaseMetrics.verification.commandCount > 0);
  assert.ok(loop.phaseMetrics.maintenance.visibleTokens > 0);
  assert.equal(JSON.stringify(loop).includes("src/domain/user-service.ts"), false);
});

test("managed product-loop scoring exposes missing proof and refresh without weakening outcome scoring", () => {
  const events = [
    { type: "item.completed", item: { type: "mcp_tool_call", server: "rekon", tool: "context_for_task", status: "completed" } },
    { type: "item.completed", item: { type: "file_change", changes: [] } },
    {
      type: "item.completed",
      item: {
        type: "mcp_tool_call",
        server: "rekon",
        tool: "validate_change",
        status: "completed",
        arguments: {
          contextUsageRef: "ContextUsageEvent:usage",
          contextClaims: { item: "applied" },
        },
      },
    },
  ];
  const incomplete = summarizeRekonProductLoop(events, {
    deliveryRecorded: true,
    contextClaimReceiptRecorded: true,
  }, { required: true });
  assert.equal(incomplete.passed, false);
  assert.ok(incomplete.missing.includes("verificationPrepared"));
  assert.ok(incomplete.missing.includes("proofGateSatisfied"));
  assert.ok(incomplete.missing.includes("refreshOutcomeAccepted"));

  const correctDiff = successfulRun({
    productLoop: incomplete,
  });
  assert.equal(correctDiff.score.passed, true, "independent correctness remains separate");
  const baseline = successfulRun({ condition: "baseline" });
  const comparison = compareManagedLocalAgentPair(baseline, correctDiff);
  assert.equal(comparison.decision, "discard");
  assert.match(comparison.reasons.join("\n"), /did not complete the required product loop/u);
});

test("managed product-loop scoring requires the latest refresh and terminal status to pass", () => {
  const artifactEvidence = completeProductLoopArtifactEvidence();
  const successfulRefresh = {
    status: "passed",
    freshness: {
      latestMajor: [{ type: "EvidenceGraph", id: "evidence", status: "fresh" }],
    },
    steps: [
      { id: "agent-instructions.sync", status: "passed" },
      { id: "proof-gate.preaccept", status: "passed" },
      { id: "outcome.record", status: "passed" },
      { id: "artifacts.freshness", status: "passed" },
      { id: "proof-gate.revalidate", status: "passed" },
    ],
  };
  const events = [
    {
      type: "item.completed",
      item: {
        type: "mcp_tool_call",
        server: "rekon",
        tool: "context_for_task",
        status: "completed",
      },
    },
    { type: "item.completed", item: { type: "file_change", changes: [] } },
    {
      type: "item.completed",
      item: {
        type: "mcp_tool_call",
        server: "rekon",
        tool: "validate_change",
        status: "completed",
        arguments: {
          contextUsageRef: "ContextUsageEvent:usage",
          contextClaims: { item: "applied" },
        },
      },
    },
    {
      type: "item.completed",
      item: {
        type: "command_execution",
        command: "rekon context validate-change --prepare-verification",
        aggregated_output: JSON.stringify({
          verificationPlan: { type: "VerificationPlan", id: "plan" },
        }),
        exit_code: 0,
      },
    },
    {
      type: "item.completed",
      item: {
        type: "command_execution",
        command: "rekon verify run --plan VerificationPlan:plan --execute --json",
        aggregated_output: JSON.stringify({
          verificationRun: { header: { artifactType: "VerificationRun" } },
        }),
        exit_code: 0,
      },
    },
    {
      type: "item.completed",
      item: {
        type: "command_execution",
        command: "rekon verify result from-run --run VerificationRun:run --json",
        aggregated_output: JSON.stringify({
          verificationResult: { header: { artifactType: "VerificationResult" } },
        }),
        exit_code: 0,
      },
    },
    {
      type: "item.completed",
      item: {
        type: "command_execution",
        command: "rekon context validate-change --verification-result VerificationResult:result --record-proof --json",
        aggregated_output: JSON.stringify({
          proofArtifact: { type: "ProofGateReport", id: "proof" },
        }),
        exit_code: 0,
      },
    },
    {
      type: "item.completed",
      item: {
        type: "command_execution",
        command: "rekon refresh --proof-gate ProofGateReport:proof --json",
        aggregated_output: JSON.stringify(successfulRefresh),
        exit_code: 0,
      },
    },
    {
      type: "item.completed",
      item: {
        type: "command_execution",
        command: "rekon refresh --proof-gate ProofGateReport:proof --json",
        aggregated_output: JSON.stringify({
          status: "failed",
          freshness: {
            latestMajor: [{ type: "EvidenceGraph", id: "evidence", status: "stale" }],
          },
          steps: [{ id: "artifacts.freshness", status: "failed" }],
        }),
        exit_code: 1,
      },
    },
  ];

  const loop = summarizeRekonProductLoop(events, artifactEvidence, {
    required: true,
    terminalStatus: "blocked",
  });
  assert.equal(loop.passed, false);
  assert.equal(loop.checks.terminalStatusComplete, false);
  assert.equal(loop.checks.refreshCommandPassed, false);
  assert.equal(loop.checks.refreshLatestMajorFresh, false);
  assert.equal(loop.checks.refreshRequiredStepsPassed, false);
  assert.ok(loop.missing.includes("terminalStatusComplete"));
  assert.ok(loop.missing.includes("refreshCommandPassed"));
});

test("managed product-loop scoring recognizes typed lifecycle output behind shell aliases", () => {
  const artifactEvidence = completeProductLoopArtifactEvidence();
  const events = [
    {
      type: "item.completed",
      item: {
        type: "mcp_tool_call",
        server: "rekon",
        tool: "context_for_task",
        status: "completed",
      },
    },
    { type: "item.completed", item: { type: "file_change", changes: [] } },
    {
      type: "item.completed",
      item: {
        type: "mcp_tool_call",
        server: "rekon",
        tool: "validate_change",
        status: "completed",
        arguments: {
          contextUsageRef: "ContextUsageEvent:usage",
          contextClaims: { item: "applied" },
        },
      },
    },
    {
      type: "item.completed",
      item: {
        type: "command_execution",
        command: "$CLI --prepare-verification",
        aggregated_output: JSON.stringify({
          status: "needs-judgment",
          proofGate: { evaluation: { status: "incomplete" } },
          verificationPlan: { type: "VerificationPlan", id: "plan" },
        }),
        exit_code: 0,
      },
    },
    {
      type: "item.completed",
      item: {
        type: "command_execution",
        command: "$CLI_RUN",
        aggregated_output: JSON.stringify({
          verificationRun: {
            header: { artifactType: "VerificationRun" },
            status: "passed",
          },
        }),
        exit_code: 0,
      },
    },
    {
      type: "item.completed",
      item: {
        type: "command_execution",
        command: "$CLI_RESULT",
        aggregated_output: JSON.stringify({
          verificationResult: {
            header: { artifactType: "VerificationResult" },
            status: "passed",
          },
        }),
        exit_code: 0,
      },
    },
    {
      type: "item.completed",
      item: {
        type: "command_execution",
        command: "$CLI_RECORD",
        aggregated_output: JSON.stringify({
          status: "passed",
          proofGate: { evaluation: { status: "satisfied" } },
          proofArtifact: { type: "ProofGateReport", id: "proof" },
        }),
        exit_code: 0,
      },
    },
    {
      type: "item.completed",
      item: {
        type: "command_execution",
        command: "$CLI_REFRESH",
        aggregated_output: JSON.stringify({
          status: "passed",
          freshness: {
            latestMajor: [{ type: "EvidenceGraph", id: "evidence", status: "fresh" }],
          },
          steps: [
            { id: "agent-instructions.sync", status: "passed" },
            { id: "proof-gate.preaccept", status: "passed" },
            { id: "outcome.record", status: "passed" },
            { id: "artifacts.freshness", status: "passed" },
            { id: "proof-gate.revalidate", status: "passed" },
          ],
        }),
        exit_code: 0,
      },
    },
  ];

  const loop = summarizeRekonProductLoop(events, artifactEvidence, { required: true });
  assert.equal(loop.passed, true);
  assert.equal(loop.checks.verificationOrderValid, true);
  assert.equal(loop.checks.refreshRequiredStepsPassed, true);
});

test("managed-interface adoption reports exploration before context and missing preflight", () => {
  const partial = summarizeRekonAdoption([
    { type: "item.completed", item: { type: "command_execution", command: "rg --files", exit_code: 0 } },
    { type: "item.completed", item: { type: "mcp_tool_call", server: "rekon", tool: "orientation", status: "completed" } },
    { type: "item.completed", item: { type: "mcp_tool_call", server: "rekon", tool: "context_for_task", status: "completed" } },
  ], { requirePreflight: true });

  assert.equal(partial.status, "partial");
  assert.equal(partial.passed, false);
  assert.equal(partial.explorationBeforeContext, true);
  assert.deepEqual(partial.missingRequiredTools, ["preflight_change"]);
});

test("managed-interface adoption accepts a successful CLI context fallback", () => {
  const adopted = summarizeRekonAdoption([
    { type: "item.completed", item: { type: "command_execution", command: "rekon context task --task change --path src/a.ts --json", exit_code: 0 } },
    { type: "item.completed", item: { type: "command_execution", command: "sed -n 1,80p src/a.ts", exit_code: 0 } },
  ]);

  assert.equal(adopted.status, "adopted");
  assert.equal(adopted.interface, "cli");
  assert.equal(adopted.cliFallbackAttempted, true);
  assert.equal(adopted.cliFallbackUsed, true);
  assert.deepEqual(adopted.missingRequiredTools, []);
});

test("managed-interface adoption does not require orientation for grounded path work", () => {
  const events = [
    { type: "item.completed", item: { type: "mcp_tool_call", server: "rekon", tool: "context_for_task", status: "completed" } },
    { type: "item.completed", item: { type: "command_execution", command: "sed -n 1,80p src/a.ts", exit_code: 0 } },
  ];

  assert.equal(summarizeRekonAdoption(events).status, "adopted");
  const ungrounded = summarizeRekonAdoption(events, { requireOrientation: true });
  assert.equal(ungrounded.status, "partial");
  assert.deepEqual(ungrounded.missingRequiredTools, ["orientation"]);
});

test("managed-interface adoption rejects unnecessary or premature refinement", () => {
  const unnecessary = summarizeRekonAdoption([
    { type: "item.completed", item: { type: "mcp_tool_call", server: "rekon", tool: "context_for_task", status: "completed" } },
    { type: "item.completed", item: { type: "mcp_tool_call", server: "rekon", tool: "refine_task_context", status: "completed" } },
  ]);
  assert.equal(unnecessary.status, "partial");
  assert.equal(unnecessary.unexpectedRefinement, true);
  assert.equal(unnecessary.refinementCalls, 1);

  const allowed = summarizeRekonAdoption([
    { type: "item.completed", item: { type: "mcp_tool_call", server: "rekon", tool: "context_for_task", status: "completed" } },
    { type: "item.completed", item: { type: "mcp_tool_call", server: "rekon", tool: "refine_task_context", status: "completed" } },
  ], { requireRefinement: true });
  assert.equal(allowed.status, "adopted");
  assert.equal(allowed.unexpectedRefinement, false);

  const excessive = summarizeRekonAdoption([
    { type: "item.completed", item: { type: "mcp_tool_call", server: "rekon", tool: "context_for_task", status: "completed" } },
    { type: "item.completed", item: { type: "mcp_tool_call", server: "rekon", tool: "refine_task_context", status: "completed" } },
    { type: "item.completed", item: { type: "mcp_tool_call", server: "rekon", tool: "refine_task_context", status: "completed" } },
  ], { requireRefinement: true, maxRefinementCalls: 1 });
  assert.equal(excessive.status, "partial");
  assert.equal(excessive.passed, false);
  assert.equal(excessive.maxRefinementCalls, 1);
  assert.equal(excessive.excessiveRefinement, true);

  const wrongTarget = summarizeRekonAdoption([
    { type: "item.completed", item: { type: "mcp_tool_call", server: "rekon", tool: "context_for_task", status: "completed" } },
    {
      type: "item.completed",
      item: {
        type: "mcp_tool_call",
        server: "rekon",
        tool: "resolve_source_target",
        status: "completed",
        arguments: {
          target: "ServiceDependency",
          relationship: "dependent",
          anchorPath: "src/service.ts",
          question: "discard",
        },
      },
    },
  ], {
    requireRefinement: true,
    requiredRefinementRelationship: "test",
    requiredRefinementAnchorPath: "package.json",
  });
  assert.equal(wrongTarget.status, "partial");
  assert.equal(wrongTarget.refinementTargetMatched, false);
  assert.deepEqual(wrongTarget.missingRequiredTools, ["resolve_source_target:test@package.json"]);
  assert.deepEqual(wrongTarget.toolCalls[1], {
    order: 2,
    tool: "resolve_source_target",
    status: "completed",
    relationship: "dependent",
    anchorPath: "src/service.ts",
  });
  assert.equal(JSON.stringify(wrongTarget).includes("discard"), false);

  const premature = summarizeRekonAdoption([
    { type: "item.completed", item: { type: "mcp_tool_call", server: "rekon", tool: "refine_task_context", status: "completed" } },
    { type: "item.completed", item: { type: "mcp_tool_call", server: "rekon", tool: "context_for_task", status: "completed" } },
  ], { allowRefinement: true });
  assert.equal(premature.status, "partial");
  assert.equal(premature.refinementBeforeContext, true);

  const beforeReadFirst = summarizeRekonAdoption([
    { type: "item.completed", item: { type: "mcp_tool_call", server: "rekon", tool: "context_for_task", status: "completed" } },
    { type: "item.completed", item: { type: "command_execution", command: "sed -n 1,80p src/service.ts", aggregated_output: "src/service.ts", exit_code: 0 } },
    { type: "item.completed", item: { type: "mcp_tool_call", server: "rekon", tool: "refine_task_context", status: "completed" } },
  ], {
    requireRefinement: true,
    readFirstPaths: ["src/service.ts", "tests/service.test.ts"],
  });
  assert.equal(beforeReadFirst.status, "partial");
  assert.equal(beforeReadFirst.refinementBeforeReadFirst, true);
  assert.deepEqual(beforeReadFirst.missingReadFirstBeforeRefinement, ["tests/service.test.ts"]);

  const afterReadFirst = summarizeRekonAdoption([
    { type: "item.completed", item: { type: "mcp_tool_call", server: "rekon", tool: "context_for_task", status: "completed" } },
    { type: "item.completed", item: { type: "command_execution", command: "sed -n 1,80p src/service.ts tests/service.test.ts", aggregated_output: "", exit_code: 0 } },
    { type: "item.completed", item: { type: "mcp_tool_call", server: "rekon", tool: "refine_task_context", status: "completed" } },
  ], {
    requireRefinement: true,
    readFirstPaths: ["src/service.ts", "tests/service.test.ts"],
  });
  assert.equal(afterReadFirst.status, "adopted");
  assert.equal(afterReadFirst.refinementBeforeReadFirst, false);
  assert.deepEqual(afterReadFirst.missingReadFirstBeforeRefinement, []);
});

test("managed adoption requires use of every selected readFirst path", () => {
  const interfaceAdoption = summarizeRekonAdoption([
    { type: "item.completed", item: { type: "mcp_tool_call", server: "rekon", tool: "context_for_task", status: "completed" } },
  ]);
  const partial = assessRekonContextUse(interfaceAdoption, {
    selectedPaths: ["src/service.ts", "tests/service.test.ts"],
    readFirstPaths: ["src/service.ts", "tests/service.test.ts"],
  }, {
    selectedPathsInspected: ["src/service.ts"],
    selectedPathsReported: ["src/service.ts"],
  });
  assert.equal(partial.status, "partial");
  assert.equal(partial.passed, false);
  assert.equal(partial.readFirstRecall, 0.5);
  assert.deepEqual(partial.missingReadFirstPaths, ["tests/service.test.ts"]);

  const adopted = assessRekonContextUse(interfaceAdoption, {
    selectedPaths: ["src/service.ts", "tests/service.test.ts"],
    readFirstPaths: ["src/service.ts", "tests/service.test.ts"],
  }, {
    selectedPathsInspected: ["src/service.ts"],
    selectedPathsReported: ["tests/service.test.ts"],
  });
  assert.equal(adopted.status, "adopted");
  assert.equal(adopted.passed, true);
  assert.equal(adopted.readFirstRecall, 1);
  assert.deepEqual(adopted.missingReadFirstPaths, []);
});

test("managed adoption requiring refinement consumes every expected readNext path", () => {
  const interfaceAdoption = summarizeRekonAdoption([
    { type: "item.completed", item: { type: "mcp_tool_call", server: "rekon", tool: "context_for_task", status: "completed" } },
    { type: "item.completed", item: { type: "mcp_tool_call", server: "rekon", tool: "refine_task_context", status: "completed" } },
  ], { requireRefinement: true });
  const selection = {
    selectedPaths: ["src/service.ts"],
    readFirstPaths: ["src/service.ts"],
    refinementExpectedPaths: ["src/serializer.ts"],
  };

  const partial = assessRekonContextUse(interfaceAdoption, selection, {
    selectedPathsInspected: ["src/service.ts"],
    selectedPathsReported: [],
    refinementPathsInspected: [],
    refinementPathsModified: [],
    refinementPathsReported: ["src/serializer.ts"],
  });
  assert.equal(partial.status, "partial");
  assert.equal(partial.refinementRecall, 0);
  assert.deepEqual(partial.missingRefinementPaths, ["src/serializer.ts"]);

  const adopted = assessRekonContextUse(interfaceAdoption, selection, {
    selectedPathsInspected: ["src/service.ts"],
    selectedPathsReported: [],
    refinementPathsInspected: ["src/serializer.ts"],
    refinementPathsModified: [],
    refinementPathsReported: [],
  });
  assert.equal(adopted.status, "adopted");
  assert.equal(adopted.refinementRecall, 1);
  assert.deepEqual(adopted.missingRefinementPaths, []);

  const adoptedThroughModification = assessRekonContextUse(interfaceAdoption, selection, {
    selectedPathsInspected: ["src/service.ts"],
    selectedPathsReported: [],
    refinementPathsInspected: [],
    refinementPathsModified: ["src/serializer.ts"],
    refinementPathsReported: [],
  });
  assert.equal(adoptedThroughModification.status, "adopted");
  assert.equal(adoptedThroughModification.refinementRecall, 1);
});

test("managed adoption does not require incoming compatibility boundaries", () => {
  const interfaceAdoption = summarizeRekonAdoption([
    { type: "item.completed", item: { type: "mcp_tool_call", server: "rekon", tool: "context_for_task", status: "completed" } },
  ]);
  const adopted = assessRekonContextUse(interfaceAdoption, {
    selectedPaths: ["src/service.ts", "src/api/controller.ts"],
    readFirstPaths: ["src/service.ts"],
    boundaryPaths: ["src/api/controller.ts"],
  }, {
    selectedPathsInspected: ["src/service.ts"],
    selectedPathsReported: ["src/service.ts"],
  });
  assert.equal(adopted.status, "adopted");
  assert.equal(adopted.readFirstRecall, 1);
  assert.deepEqual(adopted.missingReadFirstPaths, []);
});

test("git status parsing preserves the first path character", () => {
  assert.deepEqual(parseGitStatusPaths(" M src/domain/user-service.ts\n?? tests/new.test.ts\n"), [
    "src/domain/user-service.ts",
    "tests/new.test.ts",
  ]);
});

test("benchmark source scope excludes Rekon-generated workspace changes without hiding source", () => {
  const classified = classifyBenchmarkModifiedPaths([
    ".rekon/registry/artifacts.index.json",
    ".rekon-dev/evals/run.json",
    "src/domain/user-service.ts",
    "tests/user-service.test.ts",
  ]);
  assert.deepEqual(classified, {
    sourcePaths: ["src/domain/user-service.ts", "tests/user-service.test.ts"],
    generatedPaths: [
      ".rekon-dev/evals/run.json",
      ".rekon/registry/artifacts.index.json",
    ],
  });

  const run = successfulRun({
    modifiedPaths: [
      ".rekon/registry/artifacts.index.json",
      "src/domain/user-service.ts",
      "tests/user-service.test.ts",
    ],
    sourceModifiedPaths: classified.sourcePaths,
    generatedModifiedPaths: [".rekon/registry/artifacts.index.json"],
  });
  run.score = scoreLocalAgentOutcome(run, oracle);
  assert.equal(run.score.passed, true);
  assert.deepEqual(run.score.unexpectedModifiedPaths, []);
});

test("local-agent outcome scoring requires behavior, exact scope, and agent verification", () => {
  const run = successfulRun();
  assert.equal(run.score.passed, true);
  assert.equal(run.score.qualityScore, 1);

  const unsafe = successfulRun({ modifiedPaths: [...run.modifiedPaths, "src/api/user-controller.ts"] });
  unsafe.score = scoreLocalAgentOutcome(unsafe, oracle);
  assert.equal(unsafe.score.passed, false);
  assert.equal(unsafe.score.hardFailure, true);
});

test("local-agent scoring treats npm test and npm run test as equivalent", () => {
  const run = successfulRun({ agentCommands: ["/bin/zsh -lc 'npm run test'"] });
  run.score = scoreLocalAgentOutcome(run, oracle);
  assert.equal(run.score.agentCheckRecall, 1);
  assert.equal(run.score.passed, true);
});

test("local-agent scoring accepts a passed typed verification command behind a shell alias", () => {
  const run = successfulRun({
    agentCommands: mergeAgentCommands(["$CHECK"], ["npm test"]),
  });
  run.score = scoreLocalAgentOutcome(run, oracle);
  assert.equal(run.score.agentCheckRecall, 1);
  assert.equal(run.score.passed, true);
});

test("paired local-agent comparison rewards equal correctness with narrower exploration", () => {
  const baseline = successfulRun({
    condition: "baseline",
    exploration: {
      ...successfulRun().exploration,
      commandCount: 3,
      searchedPaths: repositoryFiles,
    },
  });
  baseline.score = scoreLocalAgentOutcome(baseline, oracle);
  const rekon = successfulRun();
  assert.equal(compareLocalAgentPair(baseline, rekon).decision, "candidate");
});

test("managed comparison records command overhead without rejecting narrower correct work", () => {
  const baseline = successfulRun({
    condition: "baseline",
    exploration: {
      ...successfulRun().exploration,
      commandCount: 3,
      searchedPaths: repositoryFiles,
    },
  });
  baseline.score = scoreLocalAgentOutcome(baseline, oracle);
  const rekon = successfulRun({
    exploration: { ...successfulRun().exploration, commandCount: 6 },
  });
  rekon.score = scoreLocalAgentOutcome(rekon, oracle);

  const comparison = compareManagedLocalAgentPair(baseline, rekon);
  assert.equal(comparison.decision, "candidate");
  assert.match(comparison.reasons.join("\n"), /shell commands 3 -> 6/u);
});

test("paired comparison counts paths exposed by broad discovery", () => {
  const baseline = successfulRun({ condition: "baseline" });
  const rekon = successfulRun({
    exploration: {
      ...successfulRun().exploration,
      discoveredPaths: repositoryFiles,
    },
  });
  assert.equal(compareLocalAgentPair(baseline, rekon).decision, "no-advantage");
  assert.match(
    compareLocalAgentPair(baseline, rekon).reasons.join("\n"),
    /search breadth 2 -> 5/u,
  );
});

test("paired comparison does not blame Rekon when both conditions fail behavior", () => {
  const baseline = successfulRun({
    condition: "baseline",
    oracleChecks: [{ command: "hidden:behavior", exitCode: 1 }],
  });
  baseline.score = scoreLocalAgentOutcome(baseline, oracle);
  const rekon = successfulRun({
    oracleChecks: [{ command: "hidden:behavior", exitCode: 1 }],
  });
  rekon.score = scoreLocalAgentOutcome(rekon, oracle);
  const comparison = compareLocalAgentPair(baseline, rekon);
  assert.equal(comparison.decision, "no-advantage");
  assert.match(comparison.reasons.join("\n"), /both conditions failed/u);
});

test("aggregate local-agent summaries compare outcomes, exploration, and source-free usage", () => {
  const baseline = successfulRun({
    condition: "baseline",
    elapsedMs: 20,
    tokenUsage: summarizeCodexTokenUsage([{
      type: "turn.completed",
      usage: { input_tokens: 1_000, cached_input_tokens: 400, output_tokens: 200 },
    }]),
    visibleTokenEstimate: estimateVisibleTokenUsage([], "a".repeat(400)),
  });
  const rekon = successfulRun({
    condition: "rekon",
    elapsedMs: 10,
    tokenUsage: summarizeCodexTokenUsage([{
      type: "turn.completed",
      usage: { input_tokens: 700, cached_input_tokens: 300, output_tokens: 100 },
    }]),
    visibleTokenEstimate: estimateVisibleTokenUsage([], "b".repeat(200)),
  });
  const summary = summarizeLocalAgentRuns([baseline, rekon]);
  assert.equal(summary.baseline.passes, 1);
  assert.equal(summary.rekon.passes, 1);
  assert.equal(summary.rekon.averageElapsedMs, 10);
  assert.equal(summary.baseline.tokenUsage.totalTokens, 1_200);
  assert.equal(summary.rekon.tokenUsage.totalTokens, 800);
  assert.equal(summary.rekon.tokenUsage.measuredRuns, 1);
  assert.equal(summary.rekon.tokenUsage.missingRuns, 0);
  assert.equal(summary.rekon.visibleTokenEstimate.totalTokens, 50);
});

test("aggregate local-agent summaries score oracle-declared optional route use", () => {
  const summary = summarizeLocalAgentRuns([successfulRun({
    contextUse: {
      optionalPathsOffered: [
        "src/data/user-repository.ts",
        "src/notifications/user-notifier.ts",
      ],
      optionalPathsInspected: ["src/data/user-repository.ts"],
      optionalPathsReported: ["src/data/user-repository.ts"],
      optionalPathsUsed: ["src/data/user-repository.ts"],
      optionalPathsSkipped: ["src/notifications/user-notifier.ts"],
    },
  })]);

  assert.deepEqual(summary.rekon.optionalContext, {
    routesOffered: 2,
    routesInspected: 1,
    routesReported: 1,
    routesUsed: 1,
    routesSkipped: 1,
    inspectionRate: 0.5,
    useRate: 0.5,
    runsSkippingAtLeastOne: 1,
  });
  assert.equal("optionalContext" in summary.baseline, false);
});

test("context selection reports required recall and avoidable refs without source bodies", () => {
  const selection = summarizeContextSelection({
    paths: ["src/domain/user-service.ts"],
    coreContext: [
      { ref: "src/data/user-repository.ts" },
      { ref: "src/notifications/user-notifier.ts" },
    ],
    supportingContext: [],
  }, {
    requiredContextPaths: ["src/domain/user-service.ts", "src/data/user-repository.ts"],
    optionalContextPaths: ["src/data/user-repository.ts"],
    allowedContextPaths: ["src/domain/user-service.ts", "src/data/user-repository.ts"],
  }, repositoryFiles);
  assert.equal(selection.requiredContextRecall, 1);
  assert.deepEqual(selection.avoidableSelectedPaths, ["src/notifications/user-notifier.ts"]);
  assert.equal(selection.selectedPathPrecision, 0.6667);
  assert.deepEqual(selection.supportingPaths, []);
  assert.deepEqual(selection.optionalContextPaths, ["src/data/user-repository.ts"]);
});

test("tiered repository-law dry run preserves selection while reducing mandatory reads", () => {
  const result = spawnSync(process.execPath, [
    "scripts/eval-model-interface-local-agent.mjs",
    "--corpus",
    "contracts",
    "--delivery",
    "managed",
    "--condition",
    "rekon",
    "--context-policy",
    "tiered",
    "--dry-run",
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "" },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = JSON.parse(result.stdout);
  assert.equal(output.contextPolicy, "tiered");
  assert.match(output.rekonInterface, /tiered context delivery/u);
  assert.equal(output.contextSelections.length, 2);
  assert.equal(output.contextDeliveryDigests.length, 2);
  assert.ok(output.contextDeliveryDigests.every((entry) => /^[a-f0-9]{64}$/u.test(entry.sha256)));
  for (const selection of output.contextSelections) {
    assert.equal(selection.requiredContextRecall, 1);
    assert.equal(selection.selectedPathPrecision, 1);
    assert.ok(selection.readFirstPaths.length < selection.selectedPaths.length);
    assert.ok(selection.supportingPaths.length > 0);
    assert.ok(selection.readFirstPaths.every((path) => selection.selectedPaths.includes(path)));
  }
});

test("role-aware dry run separates required routes from conditional graph context", () => {
  const result = spawnSync(process.execPath, [
    "scripts/eval-model-interface-local-agent.mjs",
    "--corpus",
    "live",
    "--delivery",
    "managed",
    "--condition",
    "rekon",
    "--context-policy",
    "role-aware",
    "--dry-run",
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "" },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = JSON.parse(result.stdout);
  assert.equal(output.contextPolicy, "role-aware");
  assert.match(output.rekonInterface, /role-aware context delivery/u);
  assert.equal(output.contextSelections.length, 6);
  assert.ok(output.contextSelections.every((selection) => selection.requiredContextRecall === 1));
  assert.ok(output.contextSelections.every((selection) => selection.selectedPathPrecision === 1));
  assert.ok(output.contextSelections.some((selection) =>
    selection.routePlan.conditionalPaths.length > 0
    && selection.readFirstPaths.length < selection.selectedPaths.length));
  assert.ok(output.contextSelections.every((selection) =>
    selection.routePlan.requiredPaths.every((path) => selection.readFirstPaths.includes(path))));
  assert.ok(output.contextSelections.some((selection) =>
    Array.isArray(selection.routePlan.byRole.compatibility)
    && selection.routePlan.byRole.compatibility.length > 0));
});

test("optional-route dry run can replace oracle-confirmed optional paths with pathless summaries", () => {
  const run = (policy) => {
    const result = spawnSync(process.execPath, [
      "scripts/eval-model-interface-local-agent.mjs",
      "--corpus",
      "optional-route",
      "--delivery",
      "managed",
      "--condition",
      "rekon",
      "--context-policy",
      policy,
      "--dry-run",
    ], {
      cwd: repoRoot,
      encoding: "utf8",
      env: { ...process.env, OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "" },
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    return JSON.parse(result.stdout);
  };

  const full = run("full").contextSelections[0];
  const roleAware = run("role-aware").contextSelections[0];
  const summaryAware = run("summary-aware").contextSelections[0];
  const optionalPaths = [
    "apps/api/src/request-logger.ts",
    "extensions/log-redaction/src/sanitize.ts",
  ];

  for (const selection of [full, roleAware, summaryAware]) {
    assert.equal(selection.requiredContextRecall, 1);
    assert.equal(selection.selectedPathPrecision, 1);
    assert.deepEqual(selection.missingRequiredPaths, []);
    assert.deepEqual(selection.avoidableSelectedPaths, []);
    assert.deepEqual(selection.optionalContextPaths, optionalPaths);
    assert.equal(selection.constraintRecall, 1);
    assert.equal(selection.commandRecall, 1);
  }
  assert.equal(full.readFirstPaths.includes("extensions/log-redaction/src/sanitize.ts"), true);
  assert.equal(full.boundaryPaths.includes("apps/api/src/request-logger.ts"), true);
  assert.deepEqual(roleAware.readFirstPaths, [
    "core/logging/src/logger.ts",
    "test/logging/logger.test.ts",
  ]);
  assert.deepEqual(roleAware.supportingPaths, optionalPaths);
  assert.deepEqual(roleAware.routePlan.conditionalPaths, optionalPaths);
  assert.deepEqual(roleAware.routePlan.byRole.compatibility, ["apps/api/src/request-logger.ts"]);
  assert.deepEqual(roleAware.routePlan.byRole.dependency, [
    "extensions/log-redaction/src/sanitize.ts",
  ]);
  assert.deepEqual(summaryAware.readFirstPaths, [
    "core/logging/src/logger.ts",
    "test/logging/logger.test.ts",
  ]);
  assert.deepEqual(summaryAware.supportingPaths, []);
  assert.deepEqual(summaryAware.boundaryPaths, []);
  assert.deepEqual(summaryAware.routePlan.conditionalPaths, []);
  assert.deepEqual(summaryAware.routePlan.pathlessSummaries, {
    totalRoutes: 2,
    byRole: {
      compatibility: 1,
      dependency: 1,
    },
  });
});

test("contract-backed route dry run supplies exact repository law without exposing optional paths", () => {
  const result = spawnSync(process.execPath, [
    "scripts/eval-model-interface-local-agent.mjs",
    "--corpus",
    "contract-backed-route",
    "--delivery",
    "managed",
    "--condition",
    "rekon",
    "--context-policy",
    "summary-aware",
    "--dry-run",
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "" },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = JSON.parse(result.stdout);
  const selection = output.contextSelections[0];

  assert.equal(output.corpus, "contract-backed-route");
  assert.equal(selection.requiredContextRecall, 1);
  assert.equal(selection.selectedPathPrecision, 1);
  assert.equal(selection.constraintRecall, 1);
  assert.equal(selection.commandRecall, 1);
  assert.deepEqual(selection.readFirstPaths, [
    "core/logging/src/logger.ts",
    "test/logging/logger.test.ts",
  ]);
  assert.deepEqual(selection.supportingPaths, []);
  assert.deepEqual(selection.boundaryPaths, []);
  assert.deepEqual(selection.routePlan.pathlessSummaries, {
    totalRoutes: 2,
    byRole: {
      compatibility: 1,
      dependency: 1,
    },
  });
});

test("symbol-contract route dry run supplies declared behavior without exposing the implementation path", () => {
  const result = spawnSync(process.execPath, [
    "scripts/eval-model-interface-local-agent.mjs",
    "--corpus",
    "symbol-contract-route",
    "--delivery",
    "managed",
    "--context-policy",
    "summary-aware",
    "--dry-run",
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "" },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = JSON.parse(result.stdout);
  const selection = output.contextSelections[0];

  assert.equal(output.corpus, "symbol-contract-route");
  assert.equal(selection.requiredContextRecall, 1);
  assert.equal(selection.selectedPathPrecision, 1);
  assert.equal(selection.constraintRecall, 1);
  assert.equal(selection.commandRecall, 1);
  assert.deepEqual(selection.readFirstPaths, [
    "core/logging/src/logger.ts",
    "test/logging/logger.test.ts",
  ]);
  assert.deepEqual(selection.supportingPaths, []);
  assert.deepEqual(selection.boundaryPaths, []);
  assert.deepEqual(selection.routePlan.pathlessSummaries, {
    totalRoutes: 1,
    byRole: { dependency: 1 },
  });
});

test("navigation packet dry run supplies normative law without conditional routes or summaries", () => {
  const result = spawnSync(process.execPath, [
    "scripts/eval-model-interface-local-agent.mjs",
    "--corpus",
    "navigation-packet",
    "--delivery",
    "managed",
    "--condition",
    "rekon",
    "--context-policy",
    "navigation-only",
    "--dry-run",
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "" },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = JSON.parse(result.stdout);
  const selection = output.contextSelections[0];

  assert.equal(output.corpus, "navigation-packet");
  assert.equal(output.contextPolicy, "navigation-only");
  assert.equal(output.contextDeliveryMetrics.length, 1);
  assert.ok(output.contextDeliveryMetrics[0].estimatedTokens > 0);
  assert.ok(output.contextDeliveryMetrics[0].utf8Bytes > 0);
  assert.deepEqual(selection.selectedPaths, [
    "core/logging/src/logger.ts",
    "test/logging/logger.test.ts",
  ]);
  assert.equal(selection.requiredContextRecall, 1);
  assert.equal(selection.selectedPathPrecision, 1);
  assert.equal(selection.constraintRecall, 1);
  assert.equal(selection.commandRecall, 1);
  assert.deepEqual(selection.readFirstPaths, [
    "core/logging/src/logger.ts",
    "test/logging/logger.test.ts",
  ]);
  assert.deepEqual(selection.supportingPaths, []);
  assert.deepEqual(selection.boundaryPaths, []);
  assert.deepEqual(selection.routePlan.conditionalPaths, []);
  assert.equal(selection.routePlan.pathlessSummaries, undefined);
});

test("context use separates inspected selected refs from expansion outside the packet", () => {
  const use = summarizeContextUse({
    selectedPaths: ["src/domain/user-service.ts", "src/data/user-repository.ts"],
    optionalContextPaths: ["src/data/user-repository.ts"],
  }, {
    discoveredPaths: ["src/domain/user-service.ts", "tests/user-service.test.ts"],
    inspectedPaths: ["src/domain/user-service.ts", "src/notifications/user-notifier.ts"],
    searchedPaths: ["src/domain/user-service.ts", "tests/user-service.test.ts"],
  }, {
    contextPaths: ["src/domain/user-service.ts", "src/data/user-repository.ts"],
  });
  assert.deepEqual(use.selectedPathsInspected, ["src/domain/user-service.ts"]);
  assert.deepEqual(use.selectedPathsReported, [
    "src/data/user-repository.ts",
    "src/domain/user-service.ts",
  ]);
  assert.deepEqual(use.discoveredOutsideSelection, ["tests/user-service.test.ts"]);
  assert.deepEqual(use.inspectedOutsideSelection, ["src/notifications/user-notifier.ts"]);
  assert.deepEqual(use.searchedOutsideSelection, ["tests/user-service.test.ts"]);
  assert.deepEqual(use.optionalPathsOffered, ["src/data/user-repository.ts"]);
  assert.deepEqual(use.optionalPathsInspected, []);
  assert.deepEqual(use.optionalPathsReported, ["src/data/user-repository.ts"]);
  assert.deepEqual(use.optionalPathsUsed, ["src/data/user-repository.ts"]);
  assert.deepEqual(use.optionalPathsSkipped, []);
  assert.equal(use.optionalInspectionRate, 0);
  assert.equal(use.optionalUseRate, 1);
});

test("compacted local-agent reports omit raw commands and free-form model text", () => {
  const compact = compactLocalAgentRun(successfulRun({
    tokenUsage: summarizeCodexTokenUsage([{
      type: "turn.completed",
      usage: { input_tokens: 100, output_tokens: 25 },
    }]),
    visibleTokenEstimate: estimateVisibleTokenUsage([], "secret prompt"),
  }));
  assert.equal("agentCommands" in compact, false);
  assert.equal("summary" in compact.final, false);
  assert.equal("risks" in compact.final, false);
  assert.equal("checks" in compact.final, false);
  assert.equal(JSON.stringify(compact).includes("Implemented deactivation"), false);
  assert.equal(compact.tokenUsage.totalTokens, 125);
  assert.equal(compact.visibleTokenEstimate.promptTokens, 4);
  assert.equal(JSON.stringify(compact).includes("secret prompt"), false);
});

test("local-agent dry run requires no provider key or Codex invocation", () => {
  const result = spawnSync(process.execPath, [
    "scripts/eval-model-interface-local-agent.mjs",
    "--dry-run",
    "--case",
    "implementation-user-deactivation",
    "--model",
    "gpt-5.6-sol",
    "--reasoning-effort",
    "xhigh",
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "" },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = JSON.parse(result.stdout);
  assert.equal(output.isolatedRuns, 2);
  assert.equal(output.runner, "codex-subscription");
  assert.equal(output.model, "gpt-5.6-sol");
  assert.equal(output.reasoningEffort, "xhigh");
  assert.equal(output.tokenUsage.status, "available-after-executed-runs");
  assert.match(output.tokenUsage.subscriptionReported, /turn.completed/u);
  assert.match(output.sourceRetention, /no source/u);
});

test("local-agent dry run lexically grounds the pathless placement case", () => {
  const result = spawnSync(process.execPath, [
    "scripts/eval-model-interface-local-agent.mjs",
    "--dry-run",
    "--case",
    "placement-payment-review",
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "" },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = JSON.parse(result.stdout);
  assert.equal(output.contextSelections.length, 1);
  assert.equal(output.contextSelections[0].requiredContextRecall, 1);
  assert.equal(output.contextSelections[0].avoidableSelectedPaths.length, 0);
  assert.ok(output.contextSelections[0].selectedPaths.includes(
    "apps/risk-worker/src/review-coordinator.ts",
  ));
});

test("managed local-agent dry run can isolate the Rekon adoption condition", () => {
  const result = spawnSync(process.execPath, [
    "scripts/eval-model-interface-local-agent.mjs",
    "--delivery",
    "managed",
    "--condition",
    "rekon",
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
  assert.deepEqual(output.conditions, ["rekon"]);
  assert.equal(output.isolatedRuns, 1);
  assert.equal(output.delivery, "managed");
  assert.match(output.rekonInterface, /no prompt-injected context/u);
});

test("product-loop dry run records a reproducible campaign without invoking a model", () => {
  const result = spawnSync(process.execPath, [
    "scripts/eval-model-interface-local-agent.mjs",
    "--delivery",
    "managed",
    "--product-loop",
    "--condition",
    "rekon",
    "--dry-run",
    "--case",
    "implementation-user-deactivation",
    "--model",
    "gpt-5.6-sol",
    "--reasoning-effort",
    "xhigh",
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "" },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = JSON.parse(result.stdout);
  assert.equal(output.schemaVersion, "1.1.0");
  assert.equal(output.productLoop.required, true);
  assert.equal(output.productLoop.condition, "rekon");
  assert.equal(output.campaign.model, "gpt-5.6-sol");
  assert.equal(output.campaign.reasoningEffort, "xhigh");
  assert.match(output.campaign.corpusDigest, /^[a-f0-9]{64}$/u);
  assert.match(output.campaign.interface.digest, /^[a-f0-9]{64}$/u);
  assert.equal(output.campaign.interface.managedInstructionsVersion, "2.0.4");
  assert.equal(output.campaign.environment.node, process.version);
  assert.equal(output.isolatedRuns, 1);
  assert.equal(output.productLoop.timeoutMs, 900_000);
});

test("mixed-layout dry runs keep direct and managed context selections complete and precise", () => {
  for (const delivery of ["direct", "managed"]) {
    const result = spawnSync(process.execPath, [
      "scripts/eval-model-interface-local-agent.mjs",
      "--corpus",
      "mixed",
      "--delivery",
      delivery,
      "--dry-run",
    ], {
      cwd: repoRoot,
      encoding: "utf8",
      env: { ...process.env, OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "" },
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const output = JSON.parse(result.stdout);
    assert.equal(output.corpus, "mixed");
    assert.equal(output.contextSelections.length, 3);
    assert.ok(output.contextSelections.every((entry) => (
      entry.requiredContextRecall === 1
        && entry.selectedPathPrecision === 1
        && entry.missingRequiredPaths.length === 0
        && entry.avoidableSelectedPaths.length === 0
    )));
  }
});

test("independent-layout dry runs keep new task shapes complete and precise", () => {
  for (const delivery of ["direct", "managed"]) {
    const result = spawnSync(process.execPath, [
      "scripts/eval-model-interface-local-agent.mjs",
      "--corpus",
      "independent",
      "--delivery",
      delivery,
      "--dry-run",
    ], {
      cwd: repoRoot,
      encoding: "utf8",
      env: { ...process.env, OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "" },
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const output = JSON.parse(result.stdout);
    assert.equal(output.corpus, "independent");
    assert.deepEqual(output.cases, [
      "configured-region-failover",
      "plugin-bearer-redaction",
      "audit-source-ip-compatibility",
    ]);
    assert.ok(output.contextSelections.every((entry) => (
      entry.requiredContextRecall === 1
        && entry.selectedPathPrecision === 1
        && entry.missingRequiredPaths.length === 0
        && entry.avoidableSelectedPaths.length === 0
    )));
  }
});

test("symbolic routing dry run places each deterministic second-hop target in the initial packet", () => {
  const result = spawnSync(process.execPath, [
    "scripts/eval-model-interface-local-agent.mjs",
    "--corpus",
    "refinement",
    "--delivery",
    "managed",
    "--condition",
    "rekon",
    "--dry-run",
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "" },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = JSON.parse(result.stdout);
  assert.equal(output.corpus, "refinement");
  assert.equal(output.contextSelections.length, 3);
  const calibration = JSON.parse(readFileSync(
    resolve(repoRoot, "tests/evals/model-interface-refinement/proactive-adoption-calibration.json"),
    "utf8",
  ));
  const selectionDigestInput = output.contextSelections.map(({
    caseId,
    selectedPaths,
    readFirstPaths,
    boundaryPaths,
  }) => ({ caseId, selectedPaths, readFirstPaths, boundaryPaths }));
  assert.equal(
    calibration.selectionSha256,
    createHash("sha256").update(JSON.stringify(selectionDigestInput)).digest("hex"),
  );
  const expected = new Map([
    ["job-symbolic-implementation-refinement", "src/jobs/cleanup-expired-sessions.ts"],
    ["user-event-symbolic-consumer-refinement", "src/profiles/profile-event-consumer.ts"],
    ["report-symbolic-producer-refinement", "src/reports/report-exporter.ts"],
  ]);
  for (const selection of output.contextSelections) {
    const routedPath = expected.get(selection.caseId);
    assert.ok(routedPath, `unexpected symbolic routing case ${selection.caseId}`);
    assert.equal(selection.requiredContextRecall, 1);
    assert.equal(selection.selectedPathPrecision, 1);
    assert.equal(selection.selectedPaths.includes(routedPath), true);
    assert.equal(selection.readFirstPaths.includes(routedPath), true);
    assert.deepEqual(selection.refinementExpectedPaths, []);
    assert.deepEqual(selection.avoidableSelectedPaths, []);
  }
});

test("positive refinement dry run leaves one runtime-bound implementation for a bounded delta", () => {
  const result = spawnSync(process.execPath, [
    "scripts/eval-model-interface-local-agent.mjs",
    "--corpus",
    "refinement-positive",
    "--delivery",
    "managed",
    "--condition",
    "rekon",
    "--dry-run",
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "" },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = JSON.parse(result.stdout);
  assert.equal(output.corpus, "refinement-positive");
  assert.deepEqual(output.cases, ["checkout-runtime-serializer-refinement"]);
  assert.equal(output.isolatedRuns, 1);
  assert.equal(output.contextSelections.length, 1);

  const selection = output.contextSelections[0];
  assert.equal(selection.requiredContextRecall, 1);
  assert.equal(selection.selectedPathPrecision, 1);
  assert.deepEqual(selection.missingRequiredPaths, []);
  assert.deepEqual(selection.avoidableSelectedPaths, []);
  assert.equal(selection.readFirstPaths.includes("src/events/order-event-publisher.ts"), true);
  assert.equal(selection.selectedPaths.includes("src/events/order-event-serializer.ts"), false);
  assert.equal(selection.readFirstPaths.includes("src/events/order-event-serializer.ts"), false);
  assert.equal(selection.boundaryPaths.includes("src/events/order-event-serializer.ts"), false);
  assert.deepEqual(selection.refinementExpectedPaths, [
    "src/events/order-event-serializer.ts",
  ]);
});

test("accepted local-agent calibration stays source-free and covers every live case", () => {
  const fixture = JSON.parse(readFileSync(
    resolve(repoRoot, "tests/evals/model-interface-live/cases.json"),
    "utf8",
  ));
  const calibration = JSON.parse(readFileSync(
    resolve(repoRoot, "tests/evals/model-interface-live/calibration.json"),
    "utf8",
  ));
  assert.deepEqual(
    calibration.cases.map((entry) => entry.id).sort(),
    fixture.cases.map((entry) => entry.id).sort(),
  );
  assert.equal(calibration.summary.pairedRuns, fixture.cases.length * calibration.repeatsPerCase);
  assert.equal(calibration.summary.baselinePasses, calibration.summary.pairedRuns);
  assert.equal(calibration.summary.rekonPasses, calibration.summary.pairedRuns);
  assert.equal(calibration.tokenUsage, "not-collected-until-api-phase");
  assert.match(calibration.sourceRetention, /source-free/u);
});

test("accepted managed-interface calibration proves adoption without retaining payloads", () => {
  const fixture = JSON.parse(readFileSync(
    resolve(repoRoot, "tests/evals/model-interface-live/cases.json"),
    "utf8",
  ));
  const calibration = JSON.parse(readFileSync(
    resolve(repoRoot, "tests/evals/model-interface-adoption/calibration.json"),
    "utf8",
  ));

  assert.deepEqual(
    calibration.cases.map((entry) => entry.id).sort(),
    fixture.cases.map((entry) => entry.id).sort(),
  );
  assert.equal(calibration.summary.managedPasses, calibration.summary.cases);
  assert.equal(calibration.summary.managedAdoptionPasses, calibration.summary.cases);
  assert.equal(calibration.summary.managedFullReadFirstUsePasses, calibration.summary.cases);
  assert.equal(calibration.summary.managedRefinementCalls, 0);
  assert.equal(calibration.summary.managedUnexpectedRefinementCalls, 0);
  assert.ok(
    calibration.summary.managedAverageExplorationPaths
      < calibration.summary.baselineAverageExplorationPaths,
  );
  assert.ok(calibration.summary.managedAverageShellCommands <= calibration.summary.baselineAverageShellCommands);
  assert.equal(calibration.tokenUsage, "not-collected-until-api-phase");
  assert.ok(calibration.cases.every((entry) => (
    entry.managed.interface === "mcp"
      && entry.managed.tools.includes("context_for_task")
      && entry.managed.contextBeforeExploration
      && entry.managed.contextBeforeEdit
      && entry.managed.readFirstRecall === 1
      && entry.managed.refinementCalls === 0
      && entry.managed.unexpectedRefinement === false
  )));
  const encoded = JSON.stringify(calibration);
  for (const forbidden of ["sourceBodies", "prompts", "mcpPayloads", "diffs", "rawCommands", "freeFormModelText"]) {
    assert.equal(encoded.includes(`\"${forbidden}\"`), false);
  }
});

test("Sol subscription token calibration records exploration gain without claiming token savings", () => {
  const fixtureBytes = readFileSync(
    resolve(repoRoot, "tests/evals/model-interface-live/cases.json"),
  );
  const calibration = JSON.parse(readFileSync(
    resolve(repoRoot, "tests/evals/model-interface-adoption/sol-token-calibration.json"),
    "utf8",
  ));

  assert.equal(calibration.runner.model, "gpt-5.6-sol");
  assert.equal(calibration.runner.reasoningEffort, "xhigh");
  assert.equal(
    calibration.fixtureSha256,
    createHash("sha256").update(fixtureBytes).digest("hex"),
  );
  assert.equal(calibration.primary.baselinePasses, calibration.primary.pairedRuns);
  assert.equal(calibration.primary.rekonPasses, calibration.primary.pairedRuns);
  assert.ok(calibration.primary.relative.explorationPathReduction > 0.8);
  assert.ok(calibration.primary.relative.subscriptionReportedTokenReduction < 0.05);
  assert.ok(calibration.primary.relative.visibleEstimatedTokenReduction <= 0);
  assert.equal(calibration.decision.tokenSavingsClaimAccepted, false);
  assert.equal(
    calibration.selectiveRepeats.patterns.find((entry) => (
      entry.caseId === "cross-system-account-suspension"
    )).unexpectedRefinementRuns,
    2,
  );
  const encoded = JSON.stringify(calibration);
  for (const forbidden of ["sourceBodies", "prompts", "diffs", "rawCommands", "mcpPayloads", "freeFormModelText"]) {
    assert.equal(encoded.includes(`\"${forbidden}\"`), false);
  }
});

test("Sol product-loop canary records complete proof-gated execution without making benchmark claims", () => {
  const fixture = JSON.parse(readFileSync(
    resolve(repoRoot, "tests/evals/model-interface-contracts/cases.json"),
    "utf8",
  ));
  const canary = JSON.parse(readFileSync(
    resolve(repoRoot, "tests/evals/model-interface-contracts/sol-product-loop-canary.json"),
    "utf8",
  ));

  assert.equal(canary.status, "canary");
  assert.equal(canary.runner.model, "gpt-5.6-sol");
  assert.equal(canary.campaign.managedInstructionsVersion, "2.0.4");
  assert.equal(
    canary.campaign.corpusDigest,
    createHash("sha256").update(JSON.stringify(fixture)).digest("hex"),
  );
  assert.equal(canary.outcome.passed, true);
  assert.equal(canary.outcome.hiddenOraclePassed, true);
  assert.equal(canary.outcome.qualityScore, 1);
  assert.equal(canary.adoption.passed, true);
  assert.equal(canary.productLoop.passed, true);
  assert.equal(canary.productLoop.verificationSourceStable, true);
  assert.equal(canary.productLoop.proofGateSatisfied, true);
  assert.equal(canary.productLoop.refreshOutcomeAccepted, true);
  assert.equal(canary.observerCorrection.postCorrectionPassed, true);
  assert.ok(canary.limitations.some((entry) => /one managed run/iu.test(entry)));
  assert.ok(canary.limitations.some((entry) => /reliability is not established/iu.test(entry)));
  assert.ok(canary.limitations.some((entry) => /does not support token/iu.test(entry)));
  const encoded = JSON.stringify(canary);
  for (const forbidden of ["sourceBodies", "prompts", "diffs", "rawCommands", "mcpPayloads", "freeFormModelText"]) {
    assert.equal(encoded.includes(`\"${forbidden}\"`), false);
  }
});

test("paired Sol product-loop calibration preserves the negative reliability result", () => {
  const calibration = JSON.parse(readFileSync(
    resolve(
      repoRoot,
      "tests/evals/model-interface-contracts/sol-product-loop-paired-calibration.json",
    ),
    "utf8",
  ));

  assert.equal(calibration.status, "calibration-negative");
  assert.equal(calibration.runner.model, "gpt-5.6-sol");
  assert.equal(calibration.campaign.dirty, false);
  assert.equal(calibration.campaign.repeats, 2);
  assert.equal(calibration.outcome.baselinePasses, 2);
  assert.equal(calibration.outcome.rekonPasses, 0);
  assert.equal(calibration.adoption.passed, 2);
  assert.equal(calibration.productLoop.preCorrectionPasses, 2);
  assert.equal(calibration.productLoop.terminalPasses, 1);
  assert.equal(calibration.decision.productLoopReliabilityEstablished, false);
  assert.equal(calibration.decision.outcomeBenefitAccepted, false);
  assert.equal(calibration.decision.tokenSavingsClaimAccepted, false);
  assert.equal(calibration.observerCorrection.postCorrectionProductLoopPasses, 1);
  assert.ok(calibration.limitations.some((entry) => /do not establish cross-task reliability/iu.test(entry)));
  const encoded = JSON.stringify(calibration);
  for (const forbidden of ["sourceBodies", "prompts", "diffs", "rawCommands", "mcpPayloads", "freeFormModelText"]) {
    assert.equal(encoded.includes(`\"${forbidden}\"`), false);
  }
});

test("edge-verifier Sol calibration preserves wrong-placement and terminal-refresh failures", () => {
  const calibration = JSON.parse(readFileSync(
    resolve(
      repoRoot,
      "tests/evals/model-interface-contracts/sol-product-loop-edge-verifier-calibration.json",
    ),
    "utf8",
  ));

  assert.equal(calibration.status, "calibration-negative");
  assert.equal(calibration.runner.model, "gpt-5.6-sol");
  assert.equal(calibration.campaign.gitCommit, "24b1e0d0cf06c7f9cd8b1e0f6e4a32630e7c074a");
  assert.equal(calibration.campaign.dirty, false);
  assert.equal(calibration.campaign.repeats, 2);
  assert.equal(calibration.outcome.baselinePasses, 2);
  assert.equal(calibration.outcome.rekonPasses, 0);
  assert.equal(calibration.outcome.hiddenOraclePasses.rekon, 1);
  assert.equal(calibration.adoption.passed, 2);
  assert.equal(calibration.verifier.requiredEvidencePathChanged, 2);
  assert.equal(calibration.verifier.exactTestPassed, 2);
  assert.equal(calibration.verifier.proofGateSatisfied, 2);
  assert.equal(calibration.verifier.wrongPlacementPrevented, false);
  assert.equal(calibration.productLoop.passed, 0);
  assert.equal(calibration.productLoop.terminalComplete, 0);
  assert.equal(calibration.productLoop.acceptedRefreshOutcome, 1);
  assert.equal(calibration.productLoop.terminalRefreshPassed, 0);
  assert.equal(calibration.decision.productLoopReliabilityEstablished, false);
  assert.equal(calibration.decision.outcomeBenefitAccepted, false);
  assert.equal(calibration.decision.timeSavingsClaimAccepted, false);
  assert.equal(calibration.decision.tokenSavingsClaimAccepted, false);
  assert.equal(calibration.decision.costSavingsClaimAccepted, false);
  assert.ok(calibration.limitations.some((entry) => /one case and two paired repeats/iu.test(entry)));
  const encoded = JSON.stringify(calibration);
  for (const forbidden of ["sourceBodies", "prompts", "diffs", "rawCommands", "mcpPayloads", "freeFormModelText"]) {
    assert.equal(encoded.includes(`\"${forbidden}\"`), false);
  }
});

test("accepted mixed-layout calibration proves quality and scope gains without retained source", () => {
  const fixture = JSON.parse(readFileSync(
    resolve(repoRoot, "tests/evals/model-interface-mixed/cases.json"),
    "utf8",
  ));
  const calibration = JSON.parse(readFileSync(
    resolve(repoRoot, "tests/evals/model-interface-mixed/calibration.json"),
    "utf8",
  ));
  const adoption = JSON.parse(readFileSync(
    resolve(repoRoot, "tests/evals/model-interface-mixed/adoption-calibration.json"),
    "utf8",
  ));

  assert.deepEqual(
    calibration.cases.map((entry) => entry.id).sort(),
    fixture.cases.map((entry) => entry.id).sort(),
  );
  assert.deepEqual(
    adoption.cases.map((entry) => entry.id).sort(),
    fixture.cases.map((entry) => entry.id).sort(),
  );
  assert.equal(calibration.summary.rekonPasses, calibration.summary.pairedRuns);
  assert.ok(calibration.summary.rekonPasses > calibration.summary.baselinePasses);
  assert.ok(
    calibration.summary.rekonAverageExploredPaths
      < calibration.summary.baselineAverageExploredPaths,
  );
  assert.equal(adoption.summary.managedPasses, adoption.summary.cases);
  assert.equal(adoption.summary.managedAdoptionPasses, adoption.summary.cases);
  assert.equal(adoption.summary.managedFullReadFirstUsePasses, adoption.summary.cases);
  assert.equal(adoption.summary.managedRefinementCalls, 0);
  assert.equal(adoption.summary.managedUnexpectedRefinementCalls, 0);
  assert.ok(adoption.cases.every((entry) => (
    entry.managed.interface === "mcp"
      && entry.managed.tools.includes("context_for_task")
      && entry.managed.contextBeforeExploration
      && entry.managed.contextBeforeEdit
      && entry.managed.readFirstRecall === 1
      && entry.managed.refinementCalls === 0
      && entry.managed.unexpectedRefinement === false
  )));
  assert.equal(calibration.tokenUsage, "not-collected-until-api-phase");
  assert.equal(adoption.tokenUsage, "not-collected-until-api-phase");
  const encoded = JSON.stringify({ calibration, adoption });
  for (const forbidden of ["sourceBodies", "prompts", "mcpPayloads", "diffs", "rawCommands", "freeFormModelText"]) {
    assert.equal(encoded.includes(`\"${forbidden}\"`), false);
  }
});

test("Sol mixed-layout canary records correctness gains and token overhead", () => {
  const fixtureBytes = readFileSync(
    resolve(repoRoot, "tests/evals/model-interface-mixed/cases.json"),
  );
  const calibration = JSON.parse(readFileSync(
    resolve(repoRoot, "tests/evals/model-interface-mixed/sol-token-calibration.json"),
    "utf8",
  ));

  assert.equal(calibration.runner.model, "gpt-5.6-sol");
  assert.equal(calibration.runner.reasoningEffort, "xhigh");
  assert.equal(
    calibration.fixtureSha256,
    createHash("sha256").update(fixtureBytes).digest("hex"),
  );
  assert.equal(calibration.summary.cases, 3);
  assert.equal(calibration.summary.rekonPasses, calibration.summary.pairedRuns);
  assert.ok(calibration.summary.rekonPasses > calibration.summary.baselinePasses);
  assert.ok(calibration.summary.relative.explorationPathReduction > 0.6);
  assert.ok(calibration.summary.relative.shellCommandReduction > 0.2);
  assert.ok(calibration.summary.relative.subscriptionReportedTokenReduction < 0);
  assert.ok(calibration.summary.relative.visibleEstimatedTokenReduction < 0);
  assert.equal(calibration.equalCorrectnessPair.baselinePassed, true);
  assert.equal(calibration.equalCorrectnessPair.rekonPassed, true);
  assert.ok(calibration.equalCorrectnessPair.subscriptionReportedTokenReduction < 0);
  assert.equal(calibration.decision.tokenSavingsClaimAccepted, false);
  assert.equal(calibration.decision.promotionEligible, false);
  assert.ok(calibration.cases.every((entry) => (
    entry.rekon.adopted
      && entry.rekon.tools.length === 1
      && entry.rekon.tools[0] === "context_for_task"
  )));
  const encoded = JSON.stringify(calibration);
  for (const forbidden of ["sourceBodies", "prompts", "mcpPayloads", "diffs", "rawCommands", "freeFormModelText"]) {
    assert.equal(encoded.includes(`\"${forbidden}\"`), false);
  }
});

test("accepted independent-layout calibrations cover every case and retain no source", () => {
  const fixture = JSON.parse(readFileSync(
    resolve(repoRoot, "tests/evals/model-interface-independent/cases.json"),
    "utf8",
  ));
  const calibration = JSON.parse(readFileSync(
    resolve(repoRoot, "tests/evals/model-interface-independent/calibration.json"),
    "utf8",
  ));
  const adoption = JSON.parse(readFileSync(
    resolve(repoRoot, "tests/evals/model-interface-independent/adoption-calibration.json"),
    "utf8",
  ));

  for (const accepted of [calibration, adoption]) {
    assert.deepEqual(
      accepted.cases.map((entry) => entry.id).sort(),
      fixture.cases.map((entry) => entry.id).sort(),
    );
    assert.equal(accepted.tokenUsage, "not-collected-until-api-phase");
  }
  assert.equal(calibration.summary.rekonPasses, calibration.summary.pairedRuns);
  assert.ok(calibration.summary.rekonPasses > calibration.summary.baselinePasses);
  assert.equal(calibration.summary.candidatePairs, calibration.summary.pairedRuns);
  assert.ok(
    calibration.summary.rekonAverageExploredPaths
      < calibration.summary.baselineAverageExploredPaths,
  );
  assert.equal(adoption.summary.managedPasses, adoption.summary.cases);
  assert.equal(adoption.summary.managedAdoptionPasses, adoption.summary.cases);
  assert.equal(adoption.summary.managedFullReadFirstUsePasses, adoption.summary.cases);
  assert.equal(adoption.summary.managedRefinementCalls, 0);
  assert.equal(adoption.summary.managedUnexpectedRefinementCalls, 0);
  assert.ok(adoption.cases.every((entry) => (
    entry.managed.interface === "mcp"
      && entry.managed.tools.includes("context_for_task")
      && entry.managed.contextBeforeExploration
      && entry.managed.contextBeforeEdit
      && entry.managed.readFirstRecall === 1
      && entry.managed.refinementCalls === 0
      && entry.managed.unexpectedRefinement === false
  )));
  const encoded = JSON.stringify({ calibration, adoption });
  for (const forbidden of ["sourceBodies", "prompts", "mcpPayloads", "diffs", "rawCommands", "freeFormModelText"]) {
    assert.equal(encoded.includes(`\"${forbidden}\"`), false);
  }
});

test("historical refinement calibration preserves the round-trip evidence that motivated proactive routing", () => {
  const fixture = JSON.parse(readFileSync(
    resolve(repoRoot, "tests/evals/model-interface-refinement/cases.json"),
    "utf8",
  ));
  const calibration = JSON.parse(readFileSync(
    resolve(repoRoot, "tests/evals/model-interface-refinement/adoption-calibration.json"),
    "utf8",
  ));

  assert.deepEqual(calibration.cases.map((entry) => entry.id).sort(), fixture.cases.map((entry) => entry.id).sort());
  assert.equal(calibration.summary.baselineRuns, calibration.summary.managedRuns);
  assert.ok(calibration.summary.baselinePasses < calibration.summary.managedPasses);
  assert.equal(calibration.summary.managedPasses, calibration.summary.managedRuns);
  assert.equal(calibration.summary.managedAdoptionPasses, calibration.summary.managedRuns);
  assert.equal(calibration.summary.managedFullReadFirstUsePasses, calibration.summary.managedRuns);
  assert.equal(calibration.summary.managedFullRefinementUsePasses, calibration.summary.managedRuns);
  assert.equal(
    calibration.summary.managedStrictOrderingAuditPasses,
    calibration.summary.managedStrictOrderingAuditRuns,
  );
  assert.ok(calibration.summary.managedRefinementCalls >= calibration.summary.managedRuns);
  assert.ok(calibration.summary.managedRefinementCalls <= calibration.summary.managedRuns * 2);
  assert.equal(
    calibration.summary.managedRefinementTargetPasses,
    calibration.summary.managedRuns,
  );
  assert.equal(calibration.summary.managedExcessiveRefinementCalls, 0);
  assert.equal(calibration.summary.managedUnexpectedRefinementCalls, 0);
  assert.equal(calibration.summary.managedBroadSearchRuns, 0);
  assert.ok(
    calibration.summary.managedAverageExplorationPaths
      < calibration.summary.baselineAverageExplorationPaths,
  );
  assert.ok(calibration.cases.every((entry) => (
    entry.requiredRelationship
      && entry.requiredAnchorPath
      && entry.managed.interface === "mcp"
      && entry.managed.tools.includes("context_for_task")
      && entry.managed.tools.includes("refine_task_context")
      && entry.managed.adoptionPasses === entry.managed.runs
      && entry.managed.fullRefinementUsePasses === entry.managed.runs
      && entry.managed.refinementTargetPasses === entry.managed.runs
      && entry.managed.strictOrderingAuditPasses === entry.managed.strictOrderingAuditRuns
      && entry.managed.requiredPathModificationPasses === entry.managed.runs
      && entry.managed.refinementCalls >= entry.managed.runs
      && entry.managed.refinementCalls <= entry.managed.runs * entry.managed.maxRefinementCallsPerRun
      && entry.managed.excessiveRefinementRuns === 0
      && entry.managed.broadSearchRuns === 0
  )));
  assert.equal(calibration.tokenUsage, "not-collected-until-api-phase");
  const encoded = JSON.stringify(calibration);
  for (const forbidden of ["sourceBodies", "prompts", "mcpPayloads", "diffs", "rawCommands", "freeFormModelText"]) {
    assert.equal(encoded.includes(`\"${forbidden}\"`), false);
  }
});

test("managed calibrations distinguish historical evidence from later instructions", () => {
  const source = readFileSync(
    resolve(repoRoot, "packages/cli/src/agent-instructions.ts"),
    "utf8",
  );
  const currentVersion = source.match(/AGENT_INSTRUCTIONS_VERSION = "([^"]+)"/u)?.[1];
  assert.ok(currentVersion);
  for (const relativePath of [
    "tests/evals/model-interface-adoption/calibration.json",
    "tests/evals/model-interface-mixed/adoption-calibration.json",
    "tests/evals/model-interface-independent/adoption-calibration.json",
  ]) {
    const calibration = JSON.parse(readFileSync(resolve(repoRoot, relativePath), "utf8"));
    assert.equal(calibration.instructionVersion, "1.6.0");
  }

  const fixtureBytes = readFileSync(
    resolve(repoRoot, "tests/evals/model-interface-refinement/cases.json"),
  );
  const calibration = JSON.parse(readFileSync(
    resolve(repoRoot, "tests/evals/model-interface-refinement/proactive-adoption-calibration.json"),
    "utf8",
  ));
  assert.equal(calibration.instructionVersion, "1.7.1");
  assert.equal(
    calibration.fixtureSha256,
    createHash("sha256").update(fixtureBytes).digest("hex"),
  );
  assert.equal(calibration.summary.managedRuns, calibration.summary.cases);
  assert.equal(calibration.summary.managedPasses, calibration.summary.managedRuns);
  assert.equal(calibration.summary.managedAdoptionPasses, calibration.summary.managedRuns);
  assert.equal(calibration.summary.managedFullReadFirstUsePasses, calibration.summary.managedRuns);
  assert.equal(calibration.summary.managedRefinementCalls, 0);
  assert.equal(calibration.summary.managedUnexpectedRefinementCalls, 0);
  assert.ok(calibration.cases.every((entry) => (
    entry.managed.interface === "mcp"
      && entry.managed.tools.includes("context_for_task")
      && entry.managed.contextBeforeExploration
      && entry.managed.contextBeforeEdit
      && entry.managed.readFirstRecall === 1
      && entry.managed.refinementCalls === 0
      && entry.managed.unexpectedRefinement === false
  )));
  const encoded = JSON.stringify(calibration);
  for (const forbidden of ["sourceBodies", "prompts", "mcpPayloads", "diffs", "rawCommands", "freeFormModelText"]) {
    assert.equal(encoded.includes(`\"${forbidden}\"`), false);
  }
});

test("historical positive refinement calibration proves one bounded runtime-binding delta", () => {
  const source = readFileSync(
    resolve(repoRoot, "packages/cli/src/agent-instructions.ts"),
    "utf8",
  );
  const currentVersion = source.match(/AGENT_INSTRUCTIONS_VERSION = "([^"]+)"/u)?.[1];
  assert.ok(currentVersion);
  const fixtureBytes = readFileSync(
    resolve(repoRoot, "tests/evals/model-interface-refinement-positive/cases.json"),
  );
  const calibration = JSON.parse(readFileSync(
    resolve(repoRoot, "tests/evals/model-interface-refinement-positive/adoption-calibration.json"),
    "utf8",
  ));
  const dryRun = spawnSync(process.execPath, [
    "scripts/eval-model-interface-local-agent.mjs",
    "--corpus",
    "refinement-positive",
    "--delivery",
    "managed",
    "--condition",
    "rekon",
    "--dry-run",
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "" },
  });
  assert.equal(dryRun.status, 0, dryRun.stderr || dryRun.stdout);
  const selectionDigestInput = JSON.parse(dryRun.stdout).contextSelections.map(({
    caseId,
    selectedPaths,
    readFirstPaths,
    boundaryPaths,
  }) => ({ caseId, selectedPaths, readFirstPaths, boundaryPaths }));

  assert.equal(calibration.instructionVersion, "1.7.3");
  assert.notEqual(
    calibration.instructionVersion,
    currentVersion,
    "historical model evidence must not be relabeled as a current-instruction run",
  );
  assert.equal(
    calibration.fixtureSha256,
    createHash("sha256").update(fixtureBytes).digest("hex"),
  );
  assert.equal(
    calibration.selectionSha256,
    createHash("sha256").update(JSON.stringify(selectionDigestInput)).digest("hex"),
  );
  assert.equal(calibration.summary.cases, 1);
  assert.equal(calibration.summary.managedPasses, 1);
  assert.equal(calibration.summary.managedAdoptionPasses, 1);
  assert.equal(calibration.summary.managedFullReadFirstUsePasses, 1);
  assert.equal(calibration.summary.managedFullRefinementUsePasses, 1);
  assert.equal(calibration.summary.managedRefinementTargetPasses, 1);
  assert.equal(calibration.summary.managedBehaviorOraclePasses, 1);
  assert.equal(calibration.summary.managedRefinementCalls, 1);
  assert.equal(calibration.summary.managedBroadSearchRuns, 0);
  assert.equal(calibration.cases[0].requiredRelationship, "implementation");
  assert.equal(calibration.cases[0].requiredAnchorPath, "src/events/order-event-publisher.ts");
  assert.deepEqual(calibration.cases[0].requiredRefinementPaths, [
    "src/events/order-event-serializer.ts",
  ]);
  assert.deepEqual(calibration.cases[0].managed.tools, [
    "context_for_task",
    "resolve_source_target",
  ]);
  assert.equal(calibration.cases[0].managed.refinementCalls, 1);
  assert.equal(calibration.cases[0].managed.refinementTargetMatched, true);
  assert.equal(calibration.cases[0].managed.behaviorOraclePassed, true);
  assert.equal(calibration.tuningHistory.filter((entry) => entry.accepted).length, 1);
  const encoded = JSON.stringify(calibration);
  for (const forbidden of ["sourceBodies", "prompts", "mcpPayloads", "diffs", "rawCommands", "freeFormModelText"]) {
    assert.equal(encoded.includes(`\"${forbidden}\"`), false);
  }
});

test("historical Sol interface optimization retains the narrow overhead result without claiming general savings", () => {
  const source = readFileSync(
    resolve(repoRoot, "packages/cli/src/agent-instructions.ts"),
    "utf8",
  );
  const currentVersion = source.match(/AGENT_INSTRUCTIONS_VERSION = "([^"]+)"/u)?.[1];
  const calibration = JSON.parse(readFileSync(
    resolve(repoRoot, "tests/evals/model-interface-adoption/sol-interface-optimization.json"),
    "utf8",
  ));
  const fixtureBytes = readFileSync(
    resolve(repoRoot, "tests/evals/model-interface-live/cases.json"),
  );

  assert.equal(calibration.instructionVersion, "1.7.3");
  assert.notEqual(
    calibration.instructionVersion,
    currentVersion,
    "historical model evidence must not be relabeled as a current-instruction run",
  );
  assert.equal(
    calibration.fixtureSha256,
    createHash("sha256").update(fixtureBytes).digest("hex"),
  );
  assert.deepEqual(calibration.changes.advertisedTools, [
    "context_for_task",
    "resolve_source_target",
  ]);
  assert.ok(
    calibration.changes.advertisedToolSchemaBytes.after
      < calibration.changes.advertisedToolSchemaBytes.before,
  );
  assert.ok(
    calibration.changes.managedMcpStepBytes.after
      < calibration.changes.managedMcpStepBytes.before,
  );
  assert.equal(calibration.affectedCrossSystemCase.passed, true);
  assert.equal(calibration.affectedCrossSystemCase.adopted, true);
  assert.equal(calibration.affectedCrossSystemCase.refinementCalls, 0);
  assert.equal(calibration.affectedCrossSystemCase.unexpectedRefinement, false);
  assert.equal(calibration.affectedCrossSystemCase.readCommands, 1);
  assert.deepEqual(calibration.affectedCrossSystemCase.tools, ["context_for_task"]);
  assert.equal(calibration.positiveRuntimeBindingCase.passed, true);
  assert.equal(calibration.positiveRuntimeBindingCase.adopted, true);
  assert.equal(calibration.positiveRuntimeBindingCase.refinementCalls, 1);
  assert.equal(calibration.positiveRuntimeBindingCase.refinementTargetMatched, true);
  assert.deepEqual(calibration.positiveRuntimeBindingCase.tools, [
    "context_for_task",
    "resolve_source_target",
  ]);
  assert.equal(calibration.decision.tokenSavingsClaimAccepted, false);
  const encoded = JSON.stringify(calibration);
  for (const forbidden of ["sourceBodies", "prompts", "mcpPayloads", "diffs", "rawCommands", "freeFormModelText"]) {
    assert.equal(encoded.includes(`\"${forbidden}\"`), false);
  }
});
