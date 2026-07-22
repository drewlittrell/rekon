import assert from "node:assert/strict";
import test from "node:test";
import {
  createProofGateReport,
  evaluateProofGate,
  validateProofGateReport,
  validateProofObligation,
  validateProofResult,
} from "../dist/index.js";

const ref = (type, id) => ({ type, id, schemaVersion: "1.0.0" });

const obligation = (overrides = {}) => ({
  id: "handoff:request-to-handler:payload",
  subject: {
    kind: "flow-handoff",
    id: "request-to-handler",
    ref: ref("FlowContract", "checkout"),
    paths: ["src/handler.ts", "src/request.ts"],
  },
  assertion: "The handler receives requestId and accountId.",
  requiredEvidence: ["static", "test"],
  acceptancePolicy: "all-required",
  required: true,
  sourceRefs: [ref("FlowContract", "checkout")],
  ...overrides,
});

const result = (method, verdict, overrides = {}) => ({
  obligationId: "handoff:request-to-handler:payload",
  method,
  verdict,
  evidenceRefs: verdict === "supported" ? [ref("VerificationResult", `proof-${method}`)] : [],
  counterEvidenceRefs: verdict === "refuted" ? [ref("VerificationResult", `counter-${method}`)] : [],
  explanation: `${method} proof is ${verdict}.`,
  verifier: {
    kind: method === "test" ? "test" : method === "model-judgment" ? "model" : "deterministic",
    id: `verifier:${method}`,
    version: "1.0.0",
  },
  ...overrides,
});

test("proof obligation and result validators accept typed evidence", () => {
  assert.equal(validateProofObligation(obligation()).ok, true);
  assert.equal(validateProofResult(result("static", "supported")).ok, true);
});

test("all-required proof remains incomplete until every method is supported", () => {
  const incomplete = evaluateProofGate([obligation()], [result("static", "supported")]);
  assert.equal(incomplete.status, "incomplete");
  assert.deepEqual(incomplete.decisions[0].missingMethods, ["test"]);

  const complete = evaluateProofGate(
    [obligation()],
    [result("static", "supported"), result("test", "supported")],
  );
  assert.equal(complete.status, "satisfied");
  assert.equal(complete.decisions[0].verdict, "satisfied");
});

test("counterevidence blocks a required edge even when another verifier supports it", () => {
  const evaluation = evaluateProofGate(
    [obligation()],
    [result("static", "supported"), result("test", "refuted")],
  );
  assert.equal(evaluation.status, "blocked");
  assert.equal(evaluation.decisions[0].verdict, "blocked");
  assert.deepEqual(evaluation.decisions[0].refutedMethods, ["test"]);
});

test("model judgment alone does not satisfy any-authoritative when stronger methods are allowed", () => {
  const candidate = obligation({
    requiredEvidence: ["static", "model-judgment"],
    acceptancePolicy: "any-authoritative",
  });
  assert.equal(evaluateProofGate([candidate], [result("model-judgment", "supported")]).status, "incomplete");
  assert.equal(evaluateProofGate([candidate], [result("static", "supported")]).status, "satisfied");
});

test("model judgment can satisfy an explicitly semantic-only obligation", () => {
  const semantic = obligation({
    id: "repository-law:user-outcome",
    subject: { kind: "repository-law", id: "user-outcome" },
    requiredEvidence: ["model-judgment"],
    acceptancePolicy: "any-authoritative",
  });
  const judgment = result("model-judgment", "supported", { obligationId: semantic.id });
  assert.equal(evaluateProofGate([semantic], [judgment]).status, "satisfied");
});

test("any-supported edge accepts model judgment while retaining stronger evidence methods", () => {
  const edge = obligation({
    requiredEvidence: ["test", "runtime", "model-judgment"],
    acceptancePolicy: "any-supported",
  });
  const judgment = result("model-judgment", "supported");
  assert.equal(evaluateProofGate([edge], [judgment]).status, "satisfied");
});

test("unsupported proof methods cannot satisfy or refute an obligation", () => {
  const semantic = obligation({
    requiredEvidence: ["model-judgment"],
    acceptancePolicy: "any-authoritative",
  });
  const unsupported = result("static", "refuted");
  const evaluation = evaluateProofGate([semantic], [unsupported]);
  assert.equal(evaluation.status, "incomplete");
  assert.deepEqual(evaluation.decisions[0].refutedMethods, []);
  assert.equal(evaluation.decisions[0].resultCount, 0);
});

test("later counterevidence from the same verifier is retained and blocks", () => {
  const report = createProofGateReport({
    header: {
      artifactType: "ProofGateReport",
      artifactId: "proof-gate-counterevidence",
      schemaVersion: "1.0.0",
      generatedAt: "2026-07-21T12:00:00.000Z",
      subject: { repoId: "repo" },
      producer: { id: "@rekon/test", version: "1.0.0" },
      inputRefs: [],
    },
    task: { text: "Preserve the edge.", paths: ["src/request.ts"] },
    obligations: [obligation({ requiredEvidence: ["test"] })],
    results: [
      result("test", "supported", { evidenceRefs: [ref("VerificationResult", "pass")] }),
      result("test", "refuted", { counterEvidenceRefs: [ref("VerificationResult", "fail")] }),
    ],
  });
  assert.equal(report.results.length, 2);
  assert.equal(report.evaluation.status, "blocked");
});

test("proof gate report normalizes content and rejects a stale evaluation", () => {
  const report = createProofGateReport({
    header: {
      artifactType: "ProofGateReport",
      artifactId: "proof-gate-checkout",
      schemaVersion: "1.0.0",
      generatedAt: "2026-07-21T12:00:00.000Z",
      subject: { repoId: "repo", paths: ["src/request.ts", "src/handler.ts"] },
      producer: { id: "@rekon/capability-model", version: "1.0.0" },
      inputRefs: [ref("FlowContract", "checkout")],
      provenance: { confidence: 1, notes: ["derived proof gate"] },
    },
    task: {
      text: "Preserve checkout request identity.",
      paths: ["src/request.ts", "src/handler.ts", "src/request.ts"],
    },
    sourceState: {
      baseRef: "HEAD",
      files: [
        { path: "src/request.ts", status: "modified", beforeSha256: "a".repeat(64), afterSha256: "b".repeat(64) },
        { path: "src/request.ts", status: "modified", beforeSha256: "a".repeat(64), afterSha256: "b".repeat(64) },
      ],
    },
    obligations: [obligation(), obligation()],
    results: [result("static", "supported"), result("test", "supported")],
  });

  assert.equal(report.evaluation.status, "satisfied");
  assert.deepEqual(report.task.paths, ["src/handler.ts", "src/request.ts"]);
  assert.deepEqual(report.sourceState.files.map((file) => file.path), ["src/request.ts"]);
  assert.equal(validateProofGateReport(report).ok, true);
  assert.equal(validateProofGateReport({
    ...report,
    evaluation: { ...report.evaluation, status: "blocked" },
  }).ok, false);
});

test("proof gate reports reject unsafe paths and non-digest source state", () => {
  const base = {
    header: {
      artifactType: "ProofGateReport",
      artifactId: "proof-gate-unsafe",
      schemaVersion: "1.0.0",
      generatedAt: "2026-07-21T12:00:00.000Z",
      subject: { repoId: "repo" },
      producer: { id: "@rekon/test", version: "1.0.0" },
      inputRefs: [],
    },
    task: { text: "Preserve source.", paths: ["src/request.ts"] },
    obligations: [],
    results: [],
    evaluation: evaluateProofGate([], []),
  };
  assert.equal(validateProofGateReport({
    ...base,
    sourceState: {
      baseRef: "HEAD",
      files: [{ path: "../outside.ts", status: "modified", beforeSha256: "before", afterSha256: "after" }],
    },
  }).ok, false);
});

test("proof gate reports orphan results without treating them as evidence", () => {
  const evaluation = evaluateProofGate(
    [obligation({ required: false })],
    [result("static", "supported", { obligationId: "missing-obligation" })],
  );
  assert.equal(evaluation.status, "satisfied");
  assert.deepEqual(evaluation.orphanResultIds, ["missing-obligation"]);
  assert.equal(evaluation.decisions[0].verdict, "not-required");
});
