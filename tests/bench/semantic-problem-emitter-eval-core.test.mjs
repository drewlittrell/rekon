import assert from "node:assert/strict";
import test from "node:test";

import {
  MIN_DEFECT_EVIDENCE_CHANGED_LINE_COVERAGE,
  assessmentChangedLineCoverage,
  assessmentMatchesDefectEvidence,
  assessmentOverlapsChangedLines,
  changedLineNumbers,
  summarizePairEmission,
} from "../../scripts/lib/semantic-problem-emitter-eval.mjs";

test("changed-line matching distinguishes the repaired statement from unchanged nearby cache code", () => {
  const buggy = [
    "const code = read(codePath);",
    "write(dataPath, data);",
    "write(codePath, code);",
  ].join("\n");
  const fixed = [
    "const code = readVerified(codePath);",
    "write(dataPath, data);",
    "writeVerified(codePath, code);",
  ].join("\n");
  const changed = changedLineNumbers(fixed, buggy);

  assert.deepEqual([...changed], [1, 3]);
  assert.equal(assessmentOverlapsChangedLines({
    details: { sourceEvidence: [{ lineStart: 2, lineEnd: 2 }] },
  }, changed), false);
  assert.equal(assessmentOverlapsChangedLines({
    details: { sourceEvidence: [{ lineStart: 3, lineEnd: 3 }] },
  }, changed), true);
});

test("changed-line matching accounts for deleted control flow in the buggy revision", () => {
  const buggy = ["selected = candidate;", "if (!resolved) {", "  break;", "}", "return selected;"].join("\n");
  const fixed = ["selected = candidate;", "break;", "return selected;"].join("\n");
  const changed = changedLineNumbers(buggy, fixed);

  assert.ok(changed.has(2));
  assert.equal(assessmentOverlapsChangedLines({
    details: { sourceEvidence: [{ lineStart: 2, lineEnd: 4 }] },
  }, changed), true);
});

test("defect identity requires changed lines to be material rather than incidental context", () => {
  const fixedSidecarCandidate = {
    details: {
      sourceEvidence: [
        { lineStart: 152, lineEnd: 152 },
        { lineStart: 153, lineEnd: 153 },
        { lineStart: 165, lineEnd: 166 },
        { lineStart: 167, lineEnd: 168 },
      ],
    },
  };
  const buggyCacheCandidate = {
    details: {
      sourceEvidence: [
        { lineStart: 131, lineEnd: 133 },
        { lineStart: 144, lineEnd: 145 },
        { lineStart: 146, lineEnd: 147 },
        { lineStart: 148, lineEnd: 148 },
      ],
    },
  };
  const cleanupCandidate = {
    details: {
      sourceEvidence: [
        { lineStart: 57, lineEnd: 59 },
        { lineStart: 61, lineEnd: 67 },
      ],
    },
  };

  assert.equal(assessmentChangedLineCoverage(fixedSidecarCandidate, new Set([152])), 1 / 6);
  assert.ok(
    assessmentChangedLineCoverage(fixedSidecarCandidate, new Set([152]))
      < MIN_DEFECT_EVIDENCE_CHANGED_LINE_COVERAGE,
  );
  assert.equal(assessmentChangedLineCoverage(buggyCacheCandidate, new Set([131, 132, 148])), 3 / 8);
  assert.ok(
    assessmentChangedLineCoverage(buggyCacheCandidate, new Set([131, 132, 148]))
      >= MIN_DEFECT_EVIDENCE_CHANGED_LINE_COVERAGE,
  );
  assert.equal(assessmentChangedLineCoverage(cleanupCandidate, new Set([57, 61])), 0.2);
  assert.ok(
    assessmentChangedLineCoverage(cleanupCandidate, new Set([57, 61]))
      >= MIN_DEFECT_EVIDENCE_CHANGED_LINE_COVERAGE,
  );
});

test("error-propagation defect identity accepts a cited changed compound guard without lowering the generic threshold", () => {
  const assessment = {
    details: {
      sourceEvidence: [
        { lineStart: 10, lineEnd: 10 },
        { lineStart: 20, lineEnd: 24 },
      ],
    },
  };
  const changedLines = new Set([10]);
  const compoundFlow = [{
    errorIdentity: "ConditionError",
    guards: [{ terms: ["conditionFailed", "signal.aborted"], location: { line: 10 } }],
  }];

  assert.ok(assessmentChangedLineCoverage(assessment, changedLines) < MIN_DEFECT_EVIDENCE_CHANGED_LINE_COVERAGE);
  assert.equal(assessmentMatchesDefectEvidence({
    assessment,
    changedLines,
    problemClass: "error-propagation",
    errorControlFlow: compoundFlow,
  }), true);
  assert.equal(assessmentMatchesDefectEvidence({
    assessment,
    changedLines,
    problemClass: "cache-integrity",
    errorControlFlow: compoundFlow,
  }), false);
  assert.equal(assessmentMatchesDefectEvidence({
    assessment,
    changedLines,
    problemClass: "error-propagation",
    errorControlFlow: [{
      errorIdentity: "ConditionError",
      guards: [{ terms: ["conditionFailed"], location: { line: 10 } }],
    }],
  }), false);
});

test("resource-lifetime defect identity accepts structured cross-file retention when the fix only adds release code", () => {
  const assessment = {
    details: {
      problemClass: "resource-lifetime",
      retentionEvidence: [{ path: "lib/route.js", line: 589, resource: "socket._meta" }],
      sourceEvidence: [{ path: "lib/route.js", lineStart: 589, lineEnd: 589 }],
    },
  };
  assert.equal(assessmentChangedLineCoverage(assessment, new Set()), 0);
  assert.equal(assessmentMatchesDefectEvidence({
    assessment,
    changedLines: new Set(),
    problemClass: "resource-lifetime",
  }), true);
  assert.equal(assessmentMatchesDefectEvidence({
    assessment: { details: { problemClass: "resource-lifetime", retentionEvidence: [] } },
    changedLines: new Set(),
    problemClass: "resource-lifetime",
  }), false);
});

test("scope-resolution defect identity accepts a cited structured classifier anchor", () => {
  const assessment = {
    details: {
      sourceEvidence: [
        { lineStart: 40, lineEnd: 40 },
        { lineStart: 10, lineEnd: 15 },
      ],
    },
  };
  const scopeResolution = [{
    unmodeledLexicalBoundaries: ["SwitchStatement"],
    location: { line: 40, column: 7 },
  }];
  assert.equal(assessmentMatchesDefectEvidence({
    assessment,
    changedLines: new Set([40]),
    problemClass: "scope-resolution",
    scopeResolution,
  }), true);
  assert.equal(assessmentMatchesDefectEvidence({
    assessment,
    changedLines: new Set([40]),
    problemClass: "scope-resolution",
    scopeResolution: [{ ...scopeResolution[0], unmodeledLexicalBoundaries: [] }],
  }), false);
});

test("paired emission requires defect evidence in every affected buggy path", () => {
  const pair = {
    id: "cleanup-pair",
    claim: { category: "cleanup-completeness" },
    affectedPaths: ["before.ts", "after.ts"],
  };
  const partial = summarizePairEmission(pair, [
    { pairId: pair.id, path: "before.ts", revision: "buggy", status: "ok", defectEmitted: true, defectRetained: true },
    { pairId: pair.id, path: "after.ts", revision: "buggy", status: "ok", defectEmitted: false, defectRetained: false },
  ]);
  assert.equal(partial.buggyDefectPaths, 1);
  assert.equal(partial.requiredBuggyPaths, 2);
  assert.equal(partial.fixedEvaluatedPaths, 0);
  assert.equal(partial.fixedCleared, false);
  assert.equal(partial.passed, false);

  const complete = summarizePairEmission(pair, [
    { pairId: pair.id, path: "before.ts", revision: "buggy", status: "ok", defectEmitted: true, defectRetained: true },
    { pairId: pair.id, path: "after.ts", revision: "buggy", status: "ok", defectEmitted: true, defectRetained: true },
    { pairId: pair.id, path: "before.ts", revision: "fixed", status: "ok", defectEmitted: true, defectCleared: true, classCandidateEmitted: true },
    { pairId: pair.id, path: "after.ts", revision: "fixed", status: "ok", defectEmitted: false, defectCleared: true, classCandidateEmitted: false },
  ]);
  assert.equal(complete.buggyDefectPaths, 2);
  assert.equal(complete.fixedEvaluatedPaths, 2);
  assert.equal(complete.fixedDefectPaths, 1);
  assert.equal(complete.fixedUnclearedPaths, 0);
  assert.equal(complete.fixedSameClassCandidate, true);
  assert.equal(complete.buggyRetained, true);
  assert.equal(complete.fixedCleared, true);
  assert.equal(complete.passed, true);
});
