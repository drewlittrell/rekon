import assert from "node:assert/strict";
import test from "node:test";

import {
  createContractAdoptionReport,
  createContractCandidateReport,
  createContractJudgmentReport,
  validateContractCandidateReport,
  validateContractJudgmentReport,
} from "../dist/index.js";

function header(type) {
  return {
    artifactType: type,
    artifactId: `${type}-1`,
    schemaVersion: "1.0.0",
    generatedAt: "2026-07-20T20:00:00.000Z",
    subject: { repoId: "example" },
    producer: { id: "@rekon/capability-model", version: "1.0.0" },
    inputRefs: [],
  };
}

const evidenceRef = { type: "ObservedRepo", id: "repo-1", schemaVersion: "1.0.0" };

test("candidate report retains inferred system proposals without adopting them", () => {
  const report = createContractCandidateReport({
    header: header("ContractCandidateReport"),
    candidates: [{
      id: "candidate:system:intelligence",
      kind: "system",
      targetId: "intelligence",
      confidence: 0.86,
      rationale: "Ownership and capability evidence agree on the boundary.",
      evidenceRefs: [evidenceRef],
      proposed: {
        id: "intelligence",
        systemId: "intelligence",
        scope: { paths: ["packages/intelligence/**"] },
        purpose: "Provide repository intelligence.",
        invariants: [{ id: "evidence-first", statement: "Derived claims cite evidence." }],
      },
    }],
    unresolved: [],
  });

  assert.equal(report.summary.systems, 1);
  assert.equal(report.candidates[0].kind, "system");
  assert.equal("authority" in report.candidates[0], false);
});

test("candidate report validates an evidence inventory without requiring it on older reports", () => {
  const report = createContractCandidateReport({
    header: header("ContractCandidateReport"),
    evidenceInventory: {
      status: "complete",
      topologyBasis: "structural",
      structural: { artifactTypes: ["GraphSlice"], graphClaims: 4, runtimeClaims: 0 },
      verification: {
        adoptedFlowContracts: 0,
        runtimeObservationReports: { indexed: 0, validated: 0 },
        isolatedCoverageRecords: 0,
      },
      issues: [],
      notes: ["No runtime evidence was available."],
    },
    candidates: [],
    unresolved: [],
  });

  assert.equal(validateContractCandidateReport(report).ok, true);
  const invalid = structuredClone(report);
  invalid.evidenceInventory.verification.runtimeObservationReports.validated = 2;
  assert.equal(validateContractCandidateReport(invalid).ok, false);
});

test("accepted agent judgments require current source citations or artifact evidence", () => {
  const candidateReportRef = { type: "ContractCandidateReport", id: "candidates-1", schemaVersion: "1.0.0" };
  const report = createContractJudgmentReport({
    header: { ...header("ContractJudgmentReport"), inputRefs: [candidateReportRef] },
    candidateReportRef,
    judge: { id: "codex", version: "1.0.0", mode: "agent" },
    judgments: [{
      candidateId: "candidate:system:intelligence",
      decision: "accept",
      confidence: 0.9,
      rationale: "Source and tests corroborate the invariant.",
      citations: [{ path: "packages/intelligence/src/index.ts", digest: "a".repeat(64), lineStart: 10, lineEnd: 14 }],
      evidenceRefs: [],
      proposed: {
        id: "intelligence",
        systemId: "intelligence",
        scope: { paths: ["packages/intelligence/**"] },
        purpose: "Provide repository intelligence.",
        invariants: [{ id: "evidence-first", statement: "Derived claims cite evidence." }],
      },
    }],
  });

  assert.equal(report.summary.accepted, 1);
  const invalid = structuredClone(report);
  invalid.judgments[0].citations = [];
  assert.equal(validateContractJudgmentReport(invalid).ok, false);
});

test("provider judgments require model identity", () => {
  const candidateReportRef = { type: "ContractCandidateReport", id: "candidates-1", schemaVersion: "1.0.0" };
  const result = validateContractJudgmentReport({
    header: header("ContractJudgmentReport"),
    candidateReportRef,
    judge: { id: "provider", version: "1.0.0", mode: "provider" },
    judgments: [],
    summary: { total: 0, accepted: 0, rejected: 0, uncertain: 0 },
  });

  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.path === "$.judge.model"));
});

test("adoption report distinguishes applied, skipped, and blocked candidates", () => {
  const candidateReportRef = { type: "ContractCandidateReport", id: "candidates-1", schemaVersion: "1.0.0" };
  const judgmentReportRef = { type: "ContractJudgmentReport", id: "judgments-1", schemaVersion: "1.0.0" };
  const report = createContractAdoptionReport({
    header: { ...header("ContractAdoptionReport"), inputRefs: [candidateReportRef, judgmentReportRef] },
    candidateReportRef,
    judgmentReportRef,
    mode: "apply",
    operations: [
      { candidateId: "candidate:system:a", contractType: "SystemContract", contractId: "a", status: "adopted", reason: "Accepted.", sourcePath: "rekon/contracts/systems/a.json", sourceDigest: "a".repeat(64) },
      { candidateId: "candidate:flow:b", contractType: "FlowContract", contractId: "b", status: "skipped", reason: "Rejected." },
      { candidateId: "candidate:flow:c", contractType: "FlowContract", contractId: "c", status: "blocked", reason: "Stale citation." },
    ],
  });

  assert.deepEqual(report.summary, { total: 3, planned: 0, adopted: 1, skipped: 1, blocked: 1 });
});
