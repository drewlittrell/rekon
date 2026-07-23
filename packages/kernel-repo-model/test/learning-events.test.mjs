import assert from "node:assert/strict";
import test from "node:test";

import { createSourceStateBinding } from "@rekon/kernel-artifacts";
import {
  createContextOutcomeEvaluationReport,
  createContextTaskIdentity,
  createContextUsageEvent,
  createOutcomeEvent,
  validateContextOutcomeEvaluationReport,
  validateContextUsageEvent,
  validateOutcomeEvent,
} from "../dist/index.js";

function ref(type, id) {
  return { type, id, schemaVersion: "0.1.0" };
}

function header(type, id, inputRefs = []) {
  return {
    artifactType: type,
    artifactId: id,
    schemaVersion: "0.1.0",
    generatedAt: "2026-07-22T20:00:00.000Z",
    subject: { repoId: "rekon", paths: ["src/index.ts"] },
    producer: { id: "@rekon/test", version: "1.0.0" },
    inputRefs,
    freshness: { status: "fresh" },
    provenance: { confidence: 1 },
  };
}

test("ContextUsageEvent normalizes task and delivered context identity", () => {
  const contextReportRef = ref("TaskContextReport", "context-1");
  const event = createContextUsageEvent({
    header: header("ContextUsageEvent", "usage-1", [contextReportRef]),
    task: createContextTaskIdentity(" modify bootstrap ", ["src/z.ts", "src/index.ts", "src/index.ts"]),
    contextReportRef,
    delivery: {
      channel: "mcp",
      deliveredAt: "2026-07-22T20:00:00.000Z",
      profile: "compact",
      projectionDigest: "projection-digest",
      itemIds: ["context:b", "context:a", "context:a"],
      sourceSpanKeys: [],
      constraintDigests: [],
      checkDigests: [],
      truncated: false,
    },
    claims: [],
  });

  assert.equal(event.task.text, "modify bootstrap");
  assert.deepEqual(event.task.paths, ["src/index.ts", "src/z.ts"]);
  assert.deepEqual(event.delivery.itemIds, ["context:a", "context:b"]);
  assert.equal(validateContextUsageEvent(event).ok, true);
  assert.equal(validateContextUsageEvent({ ...event, task: { ...event.task, fingerprint: "wrong" } }).ok, false);
});

test("OutcomeEvent binds repository proof to an exact source state", () => {
  const usageRef = ref("ContextUsageEvent", "usage-1");
  const proofRef = ref("ProofGateReport", "proof-1");
  const sourceState = createSourceStateBinding({
    baseRef: "a".repeat(40),
    files: [{
      path: "src/index.ts",
      status: "modified",
      beforeSha256: "b".repeat(64),
      afterSha256: "c".repeat(64),
    }],
  });
  const event = createOutcomeEvent({
    header: header("OutcomeEvent", "outcome-1", [usageRef, proofRef]),
    task: createContextTaskIdentity("modify bootstrap", ["src/index.ts"]),
    phase: "proof-gated-refresh",
    status: "accepted",
    grounding: "repository-proof",
    contextUsageRefs: [usageRef, usageRef],
    sourceState,
    proofGateRef: proofRef,
    verificationRefs: [],
    runtimeObservationRefs: [],
    externalEvidenceRefs: [],
    summary: {
      requiredObligations: 1,
      satisfied: 1,
      blocked: 0,
      unresolved: 0,
      contractViolations: 0,
      reworkAttempt: 0,
    },
    notes: [],
  });

  assert.deepEqual(event.contextUsageRefs, [usageRef]);
  assert.equal(validateOutcomeEvent(event).ok, true);
  assert.equal(validateOutcomeEvent({ ...event, status: "successful" }).ok, false);
});

test("ContextOutcomeEvaluationReport recomputes association summary", () => {
  const usageRef = ref("ContextUsageEvent", "usage-1");
  const outcomeRef = ref("OutcomeEvent", "outcome-1");
  const report = createContextOutcomeEvaluationReport({
    header: header("ContextOutcomeEvaluationReport", "evaluation-1", [usageRef, outcomeRef]),
    policyVersion: "1.0.0",
    items: [{
      subject: { kind: "context-item", id: "context:a" },
      status: "associated",
      contextUsageRefs: [usageRef],
      outcomeRefs: [outcomeRef],
      supportingRootKeys: ["ProofGateReport:proof-1:0.1.0"],
      refutingRootKeys: [],
      reasons: ["accepted repository outcome followed this delivery"],
    }],
    lineage: { complete: true, sharedRootKeys: [], issueCodes: [] },
  });

  assert.deepEqual(report.summary, {
    total: 1,
    unobserved: 0,
    associated: 1,
    suggestive: 0,
    corroborated: 0,
    refuted: 0,
  });
  assert.equal(validateContextOutcomeEvaluationReport(report).ok, true);
  assert.equal(validateContextOutcomeEvaluationReport({
    ...report,
    summary: { ...report.summary, associated: 2 },
  }).ok, false);
});
