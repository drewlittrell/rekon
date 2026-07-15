import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  buildAssessmentJudgmentPrompt,
  coerceAssessmentJudgment,
  selectAssessmentJudgmentCandidates,
} from "../dist/assessment-judgment.js";

const evidence = { type: "EvidenceGraph", id: "evidence-1", schemaVersion: "0.1.0" };
const sourceText = [
  "export function remove(target, type, listener) {",
  "  target.addEventListener(type, listener);",
  "}",
].join("\n");
const source = {
  path: "src/listener.ts",
  text: sourceText,
  sha256: createHash("sha256").update(sourceText).digest("hex"),
};
const assessment = {
  id: "risk:listener",
  kind: "risk",
  type: "events.inverseListenerDelegation",
  impact: "high",
  title: "Listener cleanup registers another listener",
  description: "A removal wrapper delegates to addEventListener.",
  subjects: [source.path],
  files: [source.path],
  evidence: [evidence],
  rootCauseKey: "events:listener-cleanup",
  confidence: { score: 0.8, basis: "deterministic", verification: "unverified" },
  details: { line: 2 },
};

test("candidate selection prioritizes high-impact unresolved risks and excludes completed states", () => {
  const selected = selectAssessmentJudgmentCandidates([
    { ...assessment, id: "low", impact: "low" },
    { ...assessment, id: "confirmed", confidence: { ...assessment.confidence, verification: "independently_confirmed" } },
    { ...assessment, id: "high" },
    { ...assessment, id: "opportunity", kind: "opportunity" },
  ], 1);

  assert.deepEqual(selected.map((entry) => entry.id), ["high"]);
});

test("judgment prompt is bounded, source-numbered, and explicit about non-speculative verdicts", () => {
  const prompt = buildAssessmentJudgmentPrompt({ assessment, sources: [source], maxSourceChars: 2000 });
  assert.match(prompt, /Judge one Rekon assessment/);
  assert.match(prompt, /verification_required/);
  assert.match(prompt, /2 \|   target\.addEventListener/);
  assert.ok(prompt.length < 5000);
});

test("coercion accepts exact source evidence and derives canonical line coordinates", () => {
  const judgment = coerceAssessmentJudgment({
    assessment,
    sources: [source],
    result: {
      verdict: "confirmed",
      rationale: "The removal wrapper calls the registration API.",
      confidence: 0.96,
      evidence: [{ path: source.path, excerpt: "target.addEventListener(type, listener);" }],
      recommendedVerification: ["Add a listener-removal regression test."],
    },
  });

  assert.equal(judgment.verdict, "confirmed");
  assert.equal(judgment.evidence[0].lineStart, 2);
  assert.equal(judgment.evidence[0].sha256, source.sha256);
});

test("coercion downgrades invented evidence and low-confidence decisive verdicts", () => {
  const invented = coerceAssessmentJudgment({
    assessment,
    sources: [source],
    result: {
      verdict: "rejected",
      rationale: "The code is safe.",
      confidence: 0.95,
      evidence: [{ path: source.path, excerpt: "target.removeEventListener(type, listener);" }],
      recommendedVerification: [],
    },
  });
  assert.equal(invented.verdict, "insufficient_evidence");
  assert.deepEqual(invented.evidence, []);
  assert.ok(invented.warnings.includes("decisive-verdict-missing-current-source-evidence"));

  const lowConfidence = coerceAssessmentJudgment({
    assessment,
    sources: [source],
    result: {
      verdict: "confirmed",
      rationale: "Possibly wrong.",
      confidence: 0.5,
      evidence: [{ path: source.path, excerpt: "target.addEventListener(type, listener);" }],
      recommendedVerification: [],
    },
  });
  assert.equal(lowConfidence.verdict, "insufficient_evidence");
  assert.ok(lowConfidence.warnings.includes("decisive-verdict-below-confidence-floor"));
});
