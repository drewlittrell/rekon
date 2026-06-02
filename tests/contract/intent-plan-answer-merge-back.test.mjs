// Contract tests for Plan Actionability Answer / Merge-Back (slice 134).
//
// `rekon intent plan answer` reads an existing IntentPlanActionabilityReport,
// merges operator/agent answers (tied to that report's elicitation questions by
// question id) deterministically into COPIES of the normalized phase drafts,
// re-runs actionability, and writes exactly ONE new IntentPlanActionabilityReport
// revision. It never mutates the source report, never writes the source plan
// file, executes no commands, and creates no PreparedIntentPlan / WorkOrder /
// VerificationPlan / VerificationRun / VerificationResult, runs no Circe, and
// does not implement intent:go.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readdir, readFile, writeFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { buildIntentPlanActionabilityReport, buildAnsweredIntentPlanActionabilityReport } from "../../packages/capability-model/dist/index.js";
import { validateIntentPlanActionabilityReport } from "../../packages/kernel-repo-model/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");

const ROUGH_PLAN = "# Add marker export\n\nMaybe add a marker export somewhere.\n\nTODO: decide the file and verification.\n";

const answerForShape = (shape) =>
  shape === "sentence"
    ? "Add a marker export to src/index.ts."
    : shape === "bullets"
      ? "- Export a marker constant from src/index.ts.\n- Keep existing exports unchanged."
      : shape === "paths"
        ? "src/index.ts"
        : "npm run typecheck\nnpm test\nnpm run build";

async function buildSource() {
  const report = await buildIntentPlanActionabilityReport({ planText: ROUGH_PLAN, planPath: "plan.md", root: ".", goal: "add marker export" });
  const ref = { type: "IntentPlanActionabilityReport", id: report.header.artifactId, path: "actions/source.json", digest: "sha256:src", schemaVersion: "0.1.0" };
  return { report, ref };
}

function answersFor(report) {
  return report.elicitationQuestions.map((q) => ({ questionId: q.id, answer: answerForShape(q.answerShape) }));
}

// ---------------------------------------------------------------------------
// Helper: merge / blockers / trace
// ---------------------------------------------------------------------------

test("helper merges complete answers into one new actionable report", async () => {
  const { report, ref } = await buildSource();
  assert.equal(report.status.value, "blocked"); // brain-dump with TODO starts blocked
  const result = buildAnsweredIntentPlanActionabilityReport({ report, reportRef: ref, answers: answersFor(report), answeredBy: "drew" });
  assert.equal(result.status, "merged");
  assert.ok(result.report);
  assert.equal(result.report.status.value, "actionable");
  assert.notEqual(result.report.header.artifactId, report.header.artifactId);
  assert.ok(result.appliedAnswers >= 7);
  assert.equal(result.report.summary.findings, 0);
});

test("helper does not mutate the source report", async () => {
  const { report, ref } = await buildSource();
  const before = JSON.stringify(report);
  buildAnsweredIntentPlanActionabilityReport({ report, reportRef: ref, answers: answersFor(report) });
  assert.equal(JSON.stringify(report), before);
  assert.equal(report.normalizedPhases[0].objective, ""); // source phase objective stays empty
  assert.equal(report.answerTrace, undefined);
});

test("answerTrace records deterministic merge provenance", async () => {
  const { report, ref } = await buildSource();
  const result = buildAnsweredIntentPlanActionabilityReport({ report, reportRef: ref, answers: answersFor(report), answeredBy: "drew" });
  assert.equal(result.status, "merged");
  const trace = result.report.answerTrace;
  assert.ok(trace);
  assert.equal(trace.method, "deterministic");
  assert.equal(trace.sourceReportRef.id, ref.id);
  assert.equal(trace.answers.length, report.elicitationQuestions.length);
  assert.ok(trace.appliedRequirements.includes("objective"));
  assert.ok(Array.isArray(trace.unappliedAnswers));
  assert.equal(trace.answers[0].answeredBy, "drew");
});

test("merged report keeps every boundary false and validates", async () => {
  const { report, ref } = await buildSource();
  const result = buildAnsweredIntentPlanActionabilityReport({ report, reportRef: ref, answers: answersFor(report) });
  assert.equal(result.status, "merged");
  assert.equal(Object.keys(result.report.boundaries).length, 7);
  assert.ok(Object.values(result.report.boundaries).every((v) => v === false));
  assert.ok(validateIntentPlanActionabilityReport(result.report).ok);
});

test("a report without answerTrace still validates (additive field)", async () => {
  const { report } = await buildSource();
  assert.equal(report.answerTrace, undefined);
  assert.ok(validateIntentPlanActionabilityReport(report).ok);
});

test("helper blocks an unknown question id", async () => {
  const { report, ref } = await buildSource();
  const result = buildAnsweredIntentPlanActionabilityReport({ report, reportRef: ref, answers: [{ questionId: "question-does-not-exist", answer: "x" }] });
  assert.equal(result.status, "blocked");
  assert.equal(result.report, null);
  assert.equal(result.blockers[0].category, "unknown-question");
  assert.equal(result.blockers[0].severity, "blocker");
});

test("helper blocks an empty answer", async () => {
  const { report, ref } = await buildSource();
  const qid = report.elicitationQuestions[0].id;
  const result = buildAnsweredIntentPlanActionabilityReport({ report, reportRef: ref, answers: [{ questionId: qid, answer: "   " }] });
  assert.equal(result.status, "blocked");
  assert.equal(result.blockers[0].category, "empty-answer");
});

test("helper blocks a duplicate question answer", async () => {
  const { report, ref } = await buildSource();
  const qid = report.elicitationQuestions[0].id;
  const result = buildAnsweredIntentPlanActionabilityReport({ report, reportRef: ref, answers: [{ questionId: qid, answer: "one" }, { questionId: qid, answer: "two" }] });
  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.some((b) => b.category === "duplicate-answer"));
});

test("helper blocks a phase-scoped answer when the phase is missing", async () => {
  const { report, ref } = await buildSource();
  const orphaned = JSON.parse(JSON.stringify(report));
  const qid = orphaned.elicitationQuestions[0].id;
  orphaned.normalizedPhases = []; // drop every phase
  const result = buildAnsweredIntentPlanActionabilityReport({ report: orphaned, reportRef: ref, answers: [{ questionId: qid, answer: "x" }] });
  assert.equal(result.status, "blocked");
  assert.equal(result.blockers[0].category, "no-applicable-phase");
});

test("helper blocks a missing source report", () => {
  const result = buildAnsweredIntentPlanActionabilityReport({ report: null, reportRef: { type: "IntentPlanActionabilityReport", id: "x", schemaVersion: "0.1.0" }, answers: [{ questionId: "q", answer: "a" }] });
  assert.equal(result.status, "blocked");
  assert.equal(result.blockers[0].category, "missing-report");
});

test("helper blocks a missing source report ref", async () => {
  const { report } = await buildSource();
  const result = buildAnsweredIntentPlanActionabilityReport({ report, reportRef: null, answers: answersFor(report) });
  assert.equal(result.status, "blocked");
  assert.equal(result.blockers[0].category, "missing-report-ref");
});

test("helper blocks an answer whose shape is unusable (paths)", async () => {
  const { report, ref } = await buildSource();
  const scopeQ = report.elicitationQuestions.find((q) => q.requirement === "implementation-scope");
  const result = buildAnsweredIntentPlanActionabilityReport({ report, reportRef: ref, answers: [{ questionId: scopeQ.id, answer: "no slashes present" }] });
  assert.equal(result.status, "blocked");
  assert.equal(result.blockers[0].category, "invalid-answer-shape");
});

test("helper reports multiple blockers together", async () => {
  const { report, ref } = await buildSource();
  const result = buildAnsweredIntentPlanActionabilityReport({ report, reportRef: ref, answers: [{ questionId: "nope", answer: "x" }, { questionId: "also-nope", answer: "  " }] });
  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.length >= 2);
});

test("merge fills objective / deliverables / scope / verification fields", async () => {
  const { report, ref } = await buildSource();
  const wanted = new Set(["objective", "deliverables", "implementation-scope", "verification-evidence"]);
  const answers = report.elicitationQuestions.filter((q) => wanted.has(q.requirement)).map((q) => ({ questionId: q.id, answer: answerForShape(q.answerShape) }));
  const result = buildAnsweredIntentPlanActionabilityReport({ report, reportRef: ref, answers });
  assert.equal(result.status, "merged");
  const phase = result.report.normalizedPhases[0];
  assert.ok(phase.objective.length > 0);
  assert.ok(phase.deliverables.length > 0);
  assert.ok(phase.touchedPaths.includes("src/index.ts"));
  assert.ok(phase.verificationCommands.length > 0);
});

test("an ambiguity-clearance answer clears the ambiguity finding", async () => {
  const { report, ref } = await buildSource();
  const ambQ = report.elicitationQuestions.find((q) => q.requirement === "ambiguity-clearance");
  const result = buildAnsweredIntentPlanActionabilityReport({ report, reportRef: ref, answers: [{ questionId: ambQ.id, answer: "Add a marker export to src/index.ts." }] });
  assert.equal(result.status, "merged");
  assert.ok(result.report.normalizedPhases[0].constraints.some((c) => /^clarification:/i.test(c)));
  assert.ok(!result.report.findings.some((f) => f.requirement === "ambiguity-clearance"));
});

test("merge preserves source evidence and existing constraints", async () => {
  const { report, ref } = await buildSource();
  const result = buildAnsweredIntentPlanActionabilityReport({ report, reportRef: ref, answers: answersFor(report) });
  const srcPhase = report.normalizedPhases[0];
  const newPhase = result.report.normalizedPhases[0];
  assert.deepEqual(newPhase.sourceEvidence, srcPhase.sourceEvidence);
  for (const c of srcPhase.constraints) assert.ok(newPhase.constraints.includes(c));
});

test("merge records unappliedAnswers for redundant content", async () => {
  const { report, ref } = await buildSource();
  // verification-evidence and evidence-gates take the same command-or-artifact answer,
  // so the second one adds nothing new -> recorded as unapplied.
  const result = buildAnsweredIntentPlanActionabilityReport({ report, reportRef: ref, answers: answersFor(report) });
  assert.equal(result.status, "merged");
  assert.ok(result.unappliedAnswers.length >= 1);
  assert.ok(result.unappliedAnswers[0].reason.length > 0);
});

test("answeredAt defaults to a timestamp when not provided", async () => {
  const { report, ref } = await buildSource();
  const result = buildAnsweredIntentPlanActionabilityReport({ report, reportRef: ref, answers: [answersFor(report)[0]] });
  assert.equal(result.status, "merged");
  assert.ok(typeof result.report.answerTrace.answers[0].answeredAt === "string");
  assert.ok(result.report.answerTrace.answers[0].answeredAt.length > 0);
});

// ---------------------------------------------------------------------------
// CLI: rekon intent plan answer
// ---------------------------------------------------------------------------

function runCli(dir, args) {
  return spawnSync(process.execPath, [cliPath, ...args], { cwd: dir, encoding: "utf8" });
}

async function walkJson(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walkJson(p)));
    else if (p.endsWith(".json")) out.push(p);
  }
  return out;
}

async function reviewToReport(dir) {
  await writeFile(join(dir, "plan.md"), ROUGH_PLAN);
  const review = runCli(dir, ["intent", "plan", "review", "--plan", "plan.md", "--json"]);
  assert.equal(review.status, 0, review.stderr);
  const out = JSON.parse(review.stdout);
  const files = await walkJson(join(dir, ".rekon"));
  for (const f of files) {
    try {
      const j = JSON.parse(await readFile(f, "utf8"));
      if (j?.header?.artifactType === "IntentPlanActionabilityReport" && j.header.artifactId === out.artifact.id) return { id: out.artifact.id, file: f, report: j };
    } catch {}
  }
  throw new Error("source report not found on disk");
}

test("CLI merges --answer flags and writes one new report", async () => {
  const dir = await mkdtemp(join(tmpdir(), "rekon-s134cli-"));
  const { id, report } = await reviewToReport(dir);
  const flags = report.elicitationQuestions.flatMap((q) => ["--answer", `${q.id}=${answerForShape(q.answerShape)}`]);
  const res = runCli(dir, ["intent", "plan", "answer", "--report", `IntentPlanActionabilityReport:${id}`, ...flags, "--json"]);
  assert.equal(res.status, 0, res.stderr);
  const out = JSON.parse(res.stdout);
  assert.equal(out.status, "actionable");
  assert.notEqual(out.artifact.id, id);
  assert.equal(out.sourceReport.id, id);
});

test("CLI merges --answers JSON array form", async () => {
  const dir = await mkdtemp(join(tmpdir(), "rekon-s134cli-"));
  const { id, report } = await reviewToReport(dir);
  await writeFile(join(dir, "answers.json"), JSON.stringify(answersFor(report)));
  const res = runCli(dir, ["intent", "plan", "answer", "--report", `IntentPlanActionabilityReport:${id}`, "--answers", "answers.json", "--json"]);
  assert.equal(res.status, 0, res.stderr);
  assert.equal(JSON.parse(res.stdout).status, "actionable");
});

test("CLI merges --answers object form { answers: [...] }", async () => {
  const dir = await mkdtemp(join(tmpdir(), "rekon-s134cli-"));
  const { id, report } = await reviewToReport(dir);
  await writeFile(join(dir, "answers.json"), JSON.stringify({ answers: answersFor(report) }));
  const res = runCli(dir, ["intent", "plan", "answer", "--report", `IntentPlanActionabilityReport:${id}`, "--answers", "answers.json", "--json"]);
  assert.equal(res.status, 0, res.stderr);
  assert.equal(JSON.parse(res.stdout).status, "actionable");
});

test("CLI blocks an unknown question id with a non-zero exit and writes no report", async () => {
  const dir = await mkdtemp(join(tmpdir(), "rekon-s134cli-"));
  const { id } = await reviewToReport(dir);
  const before = (await walkJson(join(dir, ".rekon"))).length;
  const res = runCli(dir, ["intent", "plan", "answer", "--report", `IntentPlanActionabilityReport:${id}`, "--answer", "question-nope=whatever", "--json"]);
  assert.notEqual(res.status, 0);
  const out = JSON.parse(res.stdout);
  assert.equal(out.status, "blocked");
  assert.equal(out.blockers[0].category, "unknown-question");
  const after = (await walkJson(join(dir, ".rekon"))).length;
  assert.equal(after, before); // no new report written
});

test("CLI rejects a --report of the wrong artifact type", async () => {
  const dir = await mkdtemp(join(tmpdir(), "rekon-s134cli-"));
  await reviewToReport(dir);
  const res = runCli(dir, ["intent", "plan", "answer", "--report", "CapabilityMap:whatever", "--answer", "q=a", "--json"]);
  assert.notEqual(res.status, 0);
});

test("CLI JSON success carries a 9-field all-false boundary block", async () => {
  const dir = await mkdtemp(join(tmpdir(), "rekon-s134cli-"));
  const { id, report } = await reviewToReport(dir);
  await writeFile(join(dir, "answers.json"), JSON.stringify(answersFor(report)));
  const res = runCli(dir, ["intent", "plan", "answer", "--report", `IntentPlanActionabilityReport:${id}`, "--answers", "answers.json", "--json"]);
  const out = JSON.parse(res.stdout);
  assert.equal(Object.keys(out.boundaries).length, 9);
  assert.ok(Object.values(out.boundaries).every((v) => v === false));
});

test("CLI human output states the source is unchanged and no downstream artifacts were created", async () => {
  const dir = await mkdtemp(join(tmpdir(), "rekon-s134cli-"));
  const { id, report, file } = await reviewToReport(dir);
  const srcBefore = await readFile(file, "utf8");
  await writeFile(join(dir, "answers.json"), JSON.stringify(answersFor(report)));
  const res = runCli(dir, ["intent", "plan", "answer", "--report", `IntentPlanActionabilityReport:${id}`, "--answers", "answers.json"]);
  assert.equal(res.status, 0, res.stderr);
  assert.ok(res.stdout.includes("left unchanged"));
  assert.ok(res.stdout.includes("No PreparedIntentPlan"));
  const srcAfter = await readFile(file, "utf8");
  assert.equal(srcAfter, srcBefore); // source report file byte-identical
});
