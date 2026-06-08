// Contract tests for IntentPlanActionabilityReport v1 (Intent Plan Actionability
// / Compiler, slice 129).
//
// `rekon intent plan review` reads a raw / semi-structured plan, normalizes it
// into executable phase drafts, evaluates actionability, and writes ONE
// IntentPlanActionabilityReport with findings + elicitation questions + a
// revision prompt. It is read/transform/report-only: it executes no commands,
// writes no source, and creates no PreparedIntentPlan / WorkOrder /
// VerificationPlan / VerificationRun / VerificationResult, runs no Circe, and
// does not implement intent:go.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  INTENT_PLAN_ACTIONABILITY_REPORT_ARTIFACT_ID_PREFIX,
  buildIntentPlanActionabilityReport,
} from "../../packages/capability-model/dist/index.js";
import {
  createIntentPlanActionabilityReport,
  validateIntentPlanActionabilityReport,
} from "../../packages/kernel-repo-model/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");

const STRUCTURED_PLAN = `# Add rate limiting

## Phase 1: Add token bucket middleware

### Objective
Add a token-bucket rate limiter to the API gateway.

### Deliverables
- Token bucket middleware module
- Wiring into the gateway request pipeline

### Acceptance Criteria
- Requests over the limit receive HTTP 429
- Limit is configurable per route

### Scope
- src/gateway/rate-limit.ts
- src/gateway/pipeline.ts

### Verification
- npm run test:gateway
- npm run lint

### Evidence
- artifacts/rate-limit-test-report.json
`;

const BRAIN_DUMP_PLAN = `# Make search better

Maybe we should speed up the search box and clean up the index.

TODO: decide whether we rebuild the index or just add a cache.
We also want fewer bugs.
`;

function build(planText, opts = {}) {
  return buildIntentPlanActionabilityReport({
    planText,
    planPath: opts.planPath ?? "plans/plan.md",
    planSha256: opts.planSha256 ?? "abc123",
    goal: opts.goal,
    kind: opts.kind,
    root: opts.root ?? "test-repo",
    semanticMode: opts.semanticMode,
    semanticNormalization: opts.semanticNormalization,
    generatedAt: opts.generatedAt ?? "2026-06-01T00:00:00.000Z",
  });
}

// --- 1. structured plan → actionable, validates, header correct ---
test("structured plan builds an actionable, schema-valid report", async () => {
  const report = await build(STRUCTURED_PLAN, { goal: "Rate limit", kind: "feature" });
  assert.equal(report.header.artifactType, "IntentPlanActionabilityReport");
  assert.ok(report.header.artifactId.startsWith(INTENT_PLAN_ACTIONABILITY_REPORT_ARTIFACT_ID_PREFIX));
  const v = validateIntentPlanActionabilityReport(report);
  assert.equal(v.ok, true);
  assert.equal(report.status.value, "actionable");
  assert.equal(report.findings.length, 0);
  assert.equal(report.elicitationQuestions.length, 0);
});

// --- 2. structured plan → request threaded, sourcePlan populated ---
test("request + sourcePlan metadata is threaded through", async () => {
  const report = await build(STRUCTURED_PLAN, { goal: "Rate limit", kind: "feature" });
  assert.equal(report.request.goal, "Rate limit");
  assert.equal(report.request.kind, "feature");
  assert.equal(report.sourcePlan.sourceShape, "structured-plan");
  assert.equal(report.sourcePlan.path, "plans/plan.md");
  assert.equal(report.sourcePlan.sha256, "abc123");
  assert.ok(report.sourcePlan.lineCount > 0);
});

// --- 3. structured plan → phase decomposition + evidence gate ---
test("structured plan decomposes into evaluated phases with evidence gates", async () => {
  const report = await build(STRUCTURED_PLAN);
  assert.equal(report.normalizedPhases.length, 1);
  const phase = report.normalizedPhases[0];
  assert.equal(phase.id, "phase-1");
  assert.equal(phase.order, 1);
  assert.equal(phase.kind, "modify");
  assert.equal(phase.actionability.status, "actionable");
  assert.ok(phase.touchedPaths.includes("src/gateway/rate-limit.ts"));
  assert.equal(report.evidenceGates.length, 1);
  assert.equal(report.evidenceGates[0].satisfied, true);
});

// --- 4. brain-dump → blocked with findings + questions ---
test("brain-dump plan is blocked with findings and questions", async () => {
  const report = await build(BRAIN_DUMP_PLAN);
  assert.equal(report.status.value, "blocked");
  assert.ok(report.findings.length > 0);
  assert.ok(report.elicitationQuestions.length > 0);
  assert.equal(report.sourcePlan.sourceShape, "brain-dump");
});

// --- 5. TODO is a critical ambiguity finding ---
test("TODO/open-question text yields a critical ambiguity-clearance finding", async () => {
  const report = await build(BRAIN_DUMP_PLAN);
  const critical = report.findings.find((f) => f.severity === "critical");
  assert.ok(critical, "expected a critical finding");
  assert.equal(critical.requirement, "ambiguity-clearance");
  assert.ok(critical.suggestedFix.length > 0);
});

// --- 6. boundaries are all false on a built report ---
test("boundaries are all false (read/transform/report-only)", async () => {
  const report = await build(BRAIN_DUMP_PLAN);
  assert.deepEqual(report.boundaries, {
    executedCommands: false,
    wroteSourceFiles: false,
    createdPreparedIntentPlan: false,
    createdWorkOrder: false,
    createdVerificationPlan: false,
    ranCirce: false,
    implementedIntentGo: false,
  });
});

// --- 7. summary counts are coherent ---
test("summary counts match the report contents", async () => {
  const report = await build(BRAIN_DUMP_PLAN);
  assert.equal(report.summary.totalPhases, report.normalizedPhases.length);
  assert.equal(report.summary.findings, report.findings.length);
  assert.equal(report.summary.questions, report.elicitationQuestions.length);
});

// --- 8. revision prompt is operator-or-llm facing with required changes ---
test("revision prompt targets operator-or-llm and lists required changes", async () => {
  const report = await build(BRAIN_DUMP_PLAN);
  assert.equal(report.revisionPrompt.targetAudience, "operator-or-llm");
  assert.ok(report.revisionPrompt.prompt.includes("Do not invent file paths"));
  assert.equal(report.revisionPrompt.requiredChanges.length, report.findings.length);
});

// --- 9. elicitation questions carry shape/priority/why ---
test("elicitation questions carry answerShape, priority, and rationale", async () => {
  const report = await build(BRAIN_DUMP_PLAN);
  const q = report.elicitationQuestions[0];
  assert.ok(["sentence", "bullets", "paths", "command-or-artifact"].includes(q.answerShape));
  assert.ok(["critical", "high", "medium"].includes(q.priority));
  assert.ok(q.whyAsked.length > 0);
  assert.ok(q.question.length > 0);
});

// --- 10. deterministic normalization trace when semantic off ---
test("normalization trace is deterministic + source-only when semantic off", async () => {
  const report = await build(STRUCTURED_PLAN);
  assert.equal(report.normalizationTrace.method, "deterministic");
  assert.equal(report.normalizationTrace.provenance, "source-only");
  assert.equal(report.normalizationTrace.invokedSemanticNormalization, false);
  assert.equal(report.normalizationTrace.warnings.length, 0);
});

// --- 11. semantic auto without adapter → deterministic-fallback + warning ---
test("semantic auto without a provider falls back deterministically with a warning", async () => {
  const report = await build(STRUCTURED_PLAN, { semanticMode: "auto" });
  assert.equal(report.normalizationTrace.method, "deterministic-fallback");
  assert.equal(report.normalizationTrace.invokedSemanticNormalization, false);
  assert.ok(report.normalizationTrace.warnings.length > 0);
});

// --- 12. semantic with adapter → semantic-llm provenance tagged ---
test("semantic adapter result is provenance-tagged semantic-llm", async () => {
  const adapter = () => ({
    phases: [
      {
        id: "p1",
        order: 1,
        title: "Implement",
        kind: "modify",
        objective: "Do the thing",
        deliverables: ["A module"],
        acceptanceCriteria: ["It works"],
        touchedPaths: ["src/app.ts"],
        verificationCommands: ["npm test"],
        evidenceArtifacts: [],
        constraints: [],
        sourceEvidence: [],
        actionability: { status: "actionable", satisfiedRequirements: [], missingRequirements: [] },
      },
    ],
    warnings: ["model paraphrased two bullets"],
    model: "test-model",
    provider: "test-provider",
  });
  const report = await build(BRAIN_DUMP_PLAN, { semanticMode: "required", semanticNormalization: adapter });
  assert.equal(report.normalizationTrace.method, "semantic-llm");
  assert.equal(report.normalizationTrace.provenance, "semantic-llm");
  assert.equal(report.normalizationTrace.invokedSemanticNormalization, true);
  assert.equal(report.normalizationTrace.model, "test-model");
  assert.equal(report.normalizationTrace.provider, "test-provider");
});

// --- 13. deterministic parser extracts literal paths, never invents scope ---
test("a phase with no paths is flagged for implementation-scope (no invention)", async () => {
  const noScope = `# Cleanup

## Phase 1: Tidy things

### Objective
Tidy up the codebase.

### Deliverables
- Remove dead code
`;
  const report = await build(noScope);
  const scopeFinding = report.findings.find((f) => f.requirement === "implementation-scope");
  assert.ok(scopeFinding, "expected an implementation-scope finding");
  assert.equal(report.normalizedPhases[0].touchedPaths.length, 0);
});

// --- 14. createIntentPlanActionabilityReport forces boundaries false ---
test("factory forces boundaries to false even if input asserts true", async () => {
  const built = await build(STRUCTURED_PLAN);
  const tampered = {
    ...built,
    boundaries: { ...built.boundaries, executedCommands: true, ranCirce: true },
  };
  const normalized = createIntentPlanActionabilityReport(tampered);
  assert.equal(normalized.boundaries.executedCommands, false);
  assert.equal(normalized.boundaries.ranCirce, false);
});

// --- 15. validator rejects boundary = true ---
test("validator rejects a report whose boundaries claim an executed command", async () => {
  const built = await build(STRUCTURED_PLAN);
  const bad = JSON.parse(JSON.stringify(built));
  bad.boundaries.executedCommands = true;
  const v = validateIntentPlanActionabilityReport(bad);
  assert.equal(v.ok, false);
  assert.ok(v.issues.some((i) => i.path.includes("boundaries")));
});

// --- 16. validator rejects bad status value ---
test("validator rejects an unknown status value", async () => {
  const built = await build(STRUCTURED_PLAN);
  const bad = JSON.parse(JSON.stringify(built));
  bad.status.value = "approved";
  const v = validateIntentPlanActionabilityReport(bad);
  assert.equal(v.ok, false);
});

// --- 17. validator rejects a missing header ---
test("validator rejects a report with no header", () => {
  const v = validateIntentPlanActionabilityReport({ status: { value: "blocked", reason: "x" } });
  assert.equal(v.ok, false);
  assert.ok(v.issues.length > 0);
});

// --- 18. CLI: brain-dump --json → blocked + nextAction revise-plan ---
test("CLI intent plan review --json reports blocked + revise-plan for a brain-dump", async () => {
  const dir = await mkdtemp(join(tmpdir(), "rekon-ipar-cli-"));
  await mkdir(join(dir, "plans"), { recursive: true });
  await writeFile(join(dir, "plans", "rough.md"), BRAIN_DUMP_PLAN, "utf8");
  const res = spawnSync(
    process.execPath,
    [cliPath, "intent", "plan", "review", "--plan", join(dir, "plans", "rough.md"), "--root", dir, "--json"],
    { encoding: "utf8" },
  );
  assert.equal(res.status, 0);
  const out = JSON.parse(res.stdout);
  assert.equal(out.status, "blocked");
  assert.equal(out.artifact.type, "IntentPlanActionabilityReport");
  assert.equal(out.nextAction, "revise-plan");
  assert.ok(out.summary.findings > 0);
});

// --- 19. CLI: writes exactly one IntentPlanActionabilityReport, no downstream ---
test("CLI writes exactly one report and no downstream artifacts", async () => {
  const dir = await mkdtemp(join(tmpdir(), "rekon-ipar-store-"));
  await mkdir(join(dir, "plans"), { recursive: true });
  await writeFile(join(dir, "plans", "p.md"), STRUCTURED_PLAN, "utf8");
  const res = spawnSync(
    process.execPath,
    [cliPath, "intent", "plan", "review", "--plan", join(dir, "plans", "p.md"), "--root", dir, "--json"],
    { encoding: "utf8" },
  );
  assert.equal(res.status, 0);
  const actionsDir = join(dir, ".rekon", "artifacts", "actions");
  const files = await readdir(actionsDir);
  assert.equal(files.filter((f) => f.startsWith("IntentPlanActionabilityReport-")).length, 1);
  for (const downstream of ["PreparedIntentPlan", "WorkOrder", "VerificationPlan", "VerificationRun", "VerificationResult"]) {
    assert.equal(files.some((f) => f.startsWith(`${downstream}-`)), false, `unexpected ${downstream}`);
  }
});

// --- 20. CLI: human output carries the boundary sentence ---
test("CLI human output states the no-downstream boundary", async () => {
  const dir = await mkdtemp(join(tmpdir(), "rekon-ipar-human-"));
  await mkdir(join(dir, "plans"), { recursive: true });
  await writeFile(join(dir, "plans", "p.md"), STRUCTURED_PLAN, "utf8");
  const res = spawnSync(
    process.execPath,
    [cliPath, "intent", "plan", "review", "--plan", join(dir, "plans", "p.md"), "--root", dir],
    { encoding: "utf8" },
  );
  assert.equal(res.status, 0);
  assert.match(res.stdout, /No PreparedIntentPlan, WorkOrder, VerificationPlan/);
  assert.match(res.stdout, /Status: actionable/);
});

// --- 21. CLI: missing --plan and bad --semantic error out ---
test("CLI errors on missing --plan and invalid --semantic", async () => {
  const dir = await mkdtemp(join(tmpdir(), "rekon-ipar-err-"));
  const missing = spawnSync(process.execPath, [cliPath, "intent", "plan", "review", "--root", dir], { encoding: "utf8" });
  assert.equal(missing.status, 1);
  await mkdir(join(dir, "plans"), { recursive: true });
  await writeFile(join(dir, "plans", "p.md"), STRUCTURED_PLAN, "utf8");
  const badSemantic = spawnSync(
    process.execPath,
    [cliPath, "intent", "plan", "review", "--plan", join(dir, "plans", "p.md"), "--semantic", "bogus", "--root", dir],
    { encoding: "utf8" },
  );
  assert.equal(badSemantic.status, 1);
});

const PLAN_WITH = (phaseBody) => `# Source-change classification

## Phase 1: ${phaseBody.title}

${phaseBody.body}
`;

// --- 22. implementation objective outranks verification wording ---
test("phase classification: modify objective plus verification commands is modify/required", async () => {
  const report = await build(PLAN_WITH({
    title: "Add tested utility",
    body: `Objective: Modify source by adding the math utility and regression tests.

### Deliverables
- src/math.ts implementation
- tests/math.test.ts coverage

### Acceptance Criteria
- double(2) returns 4

### Expected Changed Files
- src/math.ts
- tests/math.test.ts

### Verification Commands
- npm run typecheck
- npm test
`,
  }));
  const phase = report.normalizedPhases[0];
  assert.equal(phase.kind, "modify");
  assert.equal(phase.sourceChange, "required");
  assert.equal(phase.classification.source, "objective");
  assert.equal(report.status.value, "actionable");
});

// --- 23. expected changed files imply required source change even with "test" title ---
test("phase classification: expected changed files imply required source change despite test wording", async () => {
  const report = await build(PLAN_WITH({
    title: "Test regression coverage",
    body: `Objective: Cover the regression in the source tree.

### Deliverables
- Regression coverage

### Acceptance Criteria
- Regression is covered

### Expected Changed Files
- tests/regression.test.ts

### Verification Commands
- npm test
`,
  }));
  const phase = report.normalizedPhases[0];
  assert.equal(phase.kind, "modify");
  assert.equal(phase.sourceChange, "required");
  assert.equal(phase.classification.source, "expected_changed_files");
});

// --- 24. read-only final verification is verify/forbidden ---
test("phase classification: final verify with no source changes is verify/forbidden", async () => {
  const report = await build(PLAN_WITH({
    title: "Final verify",
    body: `Objective: Verify final tree. Do not change source files unless verification finds a real issue.

### Deliverables
- Verification notes

### Acceptance Criteria
- Final tree satisfies the plan

### Scope
- src/index.ts

### Verification Commands
- npm test
`,
  }));
  const phase = report.normalizedPhases[0];
  assert.equal(phase.kind, "verify");
  assert.equal(phase.sourceChange, "forbidden");
  assert.equal(phase.classification.source, "objective");
});

// --- 25. explicit Source Change required overrides verify/test wording ---
test("phase classification: explicit Source Change required overrides verify wording", async () => {
  const report = await build(PLAN_WITH({
    title: "Verify tested implementation",
    body: `Source Change: required
Objective: Verify and test the implementation by updating the source.

### Deliverables
- Implementation update

### Acceptance Criteria
- Updated behavior passes tests

### Scope
- src/index.ts

### Verification Commands
- npm test
`,
  }));
  const phase = report.normalizedPhases[0];
  assert.equal(phase.sourceChange, "required");
  assert.equal(phase.kind, "modify");
  assert.equal(phase.classification.source, "explicit_source_change");
});

// --- 26. explicit Source Change forbidden is preserved ---
test("phase classification: explicit Source Change forbidden is preserved", async () => {
  const report = await build(PLAN_WITH({
    title: "Review final state",
    body: `Phase Kind: review
Source Change: forbidden
Objective: Review the final source tree and do not change source files.

### Deliverables
- Review notes

### Acceptance Criteria
- Review decision is recorded

### Scope
- src/index.ts

### Verification Commands
- npm test
`,
  }));
  const phase = report.normalizedPhases[0];
  assert.equal(phase.kind, "review");
  assert.equal(phase.sourceChange, "forbidden");
});

// --- 27. ambiguous source-change intent is surfaced ---
test("phase classification: ambiguous source-change intent produces a finding", async () => {
  const report = await build(PLAN_WITH({
    title: "Update and inspect",
    body: `Objective: Modify source by adding coverage. Do not change source files.

### Deliverables
- tests/ambiguous.test.ts coverage

### Acceptance Criteria
- Coverage exists

### Expected Changed Files
- tests/ambiguous.test.ts

### Verification Commands
- npm test
`,
  }));
  assert.equal(report.status.value, "needs-revision");
  assert.ok(report.findings.some((f) => f.code === "phase_source_change_intent_ambiguous"));
  assert.ok(report.normalizedPhases[0].classification.warnings.includes("phase_source_change_intent_ambiguous"));
});

// --- 28. conflicting explicit metadata blocks preparation ---
test("phase classification: conflicting Phase Kind and Source Change produces a blocker", async () => {
  const report = await build(PLAN_WITH({
    title: "Verify but edit",
    body: `Phase Kind: verify
Source Change: required
Objective: Verify the source tree.

### Deliverables
- Verification notes

### Acceptance Criteria
- Verification decision is recorded

### Scope
- src/index.ts

### Verification Commands
- npm test
`,
  }));
  assert.equal(report.status.value, "blocked");
  assert.ok(report.findings.some((f) => f.code === "phase_kind_source_change_conflict" && f.severity === "critical"));
});

// --- 29. verification commands alone do not imply forbidden source change ---
test("phase classification: verification commands alone do not imply source-change forbidden", async () => {
  const report = await build(PLAN_WITH({
    title: "Document behavior",
    body: `Objective: Record the current behavior for operators.

### Deliverables
- Behavior notes

### Acceptance Criteria
- Notes describe the current behavior

### Scope
- src/index.ts

### Verification Commands
- npm test
`,
  }));
  const phase = report.normalizedPhases[0];
  assert.equal(phase.kind, "unknown");
  assert.equal(phase.sourceChange, "allowed");
});
