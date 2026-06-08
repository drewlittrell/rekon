// Contract tests for Intent Prepare Integration With Actionability Report
// (slice 131).
//
// `rekon intent prepare` now RESPECTS an IntentPlanActionabilityReport when one is
// supplied: a non-actionable report BLOCKS preparation (no PreparedIntentPlan is
// written) with explicit revision guidance; an actionable report feeds the prepared
// phases + verification requirements. Approval/status policy is unchanged — the
// report informs structure, never approval. No auto-approval; downstream WorkOrder /
// VerificationPlan generation still require explicit approval. No commands, no source
// writes, no Circe, no intent:go.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  buildIntentPlanActionabilityReport,
  buildPreparedIntentPlan,
} from "../../packages/capability-model/dist/index.js";
import { validatePreparedIntentPlan } from "../../packages/kernel-repo-model/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");

const REF = (type, id) => ({ type, id, schemaVersion: "0.1.0" });

function header(type, id) {
  return {
    artifactType: type,
    artifactId: id,
    schemaVersion: "0.1.0",
    generatedAt: "2026-06-02T00:00:00.000Z",
    subject: { repoId: "test" },
    producer: { id: "@rekon/test", version: "0.1.0" },
    inputRefs: [],
    freshness: { status: "fresh" },
    provenance: { confidence: 0.7 },
  };
}

// A needs-review, implementation-bearing assessment so the plan is an
// implementation-bearing DRAFT (approval stays needs-review — never auto-approved).
const needsReviewAssessment = {
  request: { goal: "Add marker", kind: "feature" },
  readiness: { status: "needs-review" },
  matchedContext: { paths: ["src/index.ts"], systems: [], capabilities: [], steps: [] },
  blockers: [],
  warnings: [],
};

// Hand-built ACTIONABLE report with three ordered phases of distinct kinds.
const actionableReport = {
  status: { value: "actionable" },
  summary: { findings: 0, questions: 0 },
  revisionPrompt: { prompt: "" },
  normalizedPhases: [
    {
      title: "Add token bucket",
      kind: "modify",
      objective: "Add a token-bucket limiter.",
      deliverables: ["middleware module"],
      acceptanceCriteria: ["429 over limit"],
      touchedPaths: ["src/gateway/rate-limit.ts"],
      verificationCommands: ["npm run test:gateway"],
      evidenceArtifacts: [],
      constraints: [],
      sourceChange: "required",
      classification: { source: "explicit_source_change", signals: ["explicit_source_change:required"], warnings: [] },
    },
    { title: "Refactor pipeline", kind: "refactor", objective: "Refactor the request pipeline.", deliverables: ["cleaner pipeline"], acceptanceCriteria: ["pipeline simplified"], touchedPaths: ["src/gateway/pipeline.ts"], verificationCommands: ["npm run lint"], evidenceArtifacts: [], constraints: [] },
    { title: "Verify limits", kind: "verify", objective: "Verify the limits hold.", deliverables: [], acceptanceCriteria: [], touchedPaths: [], verificationCommands: ["npm run test:limits"], evidenceArtifacts: ["artifacts/limit-report.json"], constraints: [] },
  ],
};

function buildPlanWithReport(report) {
  const assessmentRef = REF("IntentAssessmentReport", "ia-1");
  const reportRef = REF("IntentPlanActionabilityReport", "ipar-1");
  return buildPreparedIntentPlan({
    header: header("PreparedIntentPlan", "prepared-intent-plan-test-1"),
    intentAssessmentReport: needsReviewAssessment,
    intentAssessmentReportRef: assessmentRef,
    intentPlanActionabilityReport: report,
    intentPlanActionabilityReportRef: reportRef,
    availableScripts: ["typecheck", "test", "build"],
  });
}

// ===== Helper-level: actionable report drives prepared phases =====

test("a brain-dump plan reviews as non-actionable", async () => {
  const report = await buildIntentPlanActionabilityReport({ planText: "# X\n\nMaybe do something.\n\nTODO: decide.\n", generatedAt: "2026-06-02T00:00:00.000Z" });
  assert.notEqual(report.status.value, "actionable");
});

test("a structured plan reviews as actionable", async () => {
  const planText = "# Add marker\n\n## Objective\nAdd a marker export to src/index.ts.\n\n## Deliverables\n- Export a marker constant.\n\n## Acceptance Criteria\n- src/index.ts exports marker.\n\n## Touched Paths\n- src/index.ts\n\n## Verification Commands\n- npm run typecheck\n";
  const report = await buildIntentPlanActionabilityReport({ planText, generatedAt: "2026-06-02T00:00:00.000Z" });
  assert.equal(report.status.value, "actionable");
});

test("prepared phases preserve normalized phase order", () => {
  const plan = buildPlanWithReport(actionableReport);
  assert.deepEqual(plan.phases.map((p) => p.title), ["Add token bucket", "Refactor pipeline", "Verify limits"]);
});

test("prepared phases preserve normalized phase kind", () => {
  const plan = buildPlanWithReport(actionableReport);
  assert.deepEqual(plan.phases.map((p) => p.kind), ["modify", "refactor", "verify"]);
});

test("prepared phases preserve touched paths", () => {
  const plan = buildPlanWithReport(actionableReport);
  assert.ok(plan.phases[0].paths.includes("src/gateway/rate-limit.ts"));
  assert.ok(plan.phases[1].paths.includes("src/gateway/pipeline.ts"));
});

test("prepared verificationRequirements reflect report verification commands", () => {
  const plan = buildPlanWithReport(actionableReport);
  const commands = plan.verificationRequirements.map((r) => r.command).filter(Boolean);
  assert.ok(commands.includes("npm run test:gateway"));
  assert.ok(commands.includes("npm run lint"));
});

test("prepared plan carries the actionability report ref in phase sourceRefs", () => {
  const plan = buildPlanWithReport(actionableReport);
  const hasRef = plan.phases[0].sourceRefs.some((r) => r.type === "IntentPlanActionabilityReport");
  assert.ok(hasRef, "expected the report ref in phase sourceRefs");
});

test("prepared phases preserve source-change classification evidence", () => {
  const plan = buildPlanWithReport(actionableReport);
  assert.equal(plan.phases[0].sourceChange, "required");
  assert.equal(plan.phases[0].classification.source, "explicit_source_change");
  assert.ok(plan.phases[0].classification.signals.includes("explicit_source_change:required"));
  assert.equal(plan.phases[2].sourceChange, "forbidden");
});

test("prepared plan from an actionable report is not auto-approved and validates clean", () => {
  const plan = buildPlanWithReport(actionableReport);
  assert.notEqual(plan.approval.status, "approved");
  const v = validatePreparedIntentPlan(plan);
  assert.equal(v.ok, true);
});

test("phase goal falls back to the request goal when a draft has no objective", () => {
  const report = { status: { value: "actionable" }, normalizedPhases: [{ title: "Untitled work", kind: "unknown", objective: "", touchedPaths: [] }] };
  const plan = buildPlanWithReport(report);
  // unknown maps to modify (implementation-bearing); a verify phase is synthesized so
  // the prepared plan is a valid implementation-bearing plan (slice 135 loop closure).
  assert.equal(plan.phases.length, 2);
  assert.equal(plan.phases[0].kind, "modify");
  assert.equal(plan.phases[1].kind, "verify");
  assert.ok(plan.phases[0].goal.length > 0);
});

// ===== CLI: end-to-end integration =====

async function setUpRepo() {
  const dir = await mkdtemp(join(tmpdir(), "rekon-prep-ai-"));
  await mkdir(join(dir, "plans"), { recursive: true });
  await mkdir(join(dir, "src"), { recursive: true });
  await writeFile(join(dir, "package.json"), JSON.stringify({ name: "ai", version: "0.0.0", type: "module", scripts: { typecheck: "tsc --noEmit", test: "node --test", build: "echo build" } }, null, 2), "utf8");
  await writeFile(join(dir, "src", "index.ts"), 'export const existing = "ok";\n', "utf8");
  await writeFile(join(dir, "plans", "rough.md"), "# Add marker export\n\nMaybe add a marker export somewhere.\n\nTODO: decide the file and verification.\n", "utf8");
  await writeFile(
    join(dir, "plans", "structured.md"),
    "# Add marker export\n\n## Objective\nAdd a marker export to src/index.ts.\n\n## Deliverables\n- Export a marker constant from src/index.ts.\n\n## Acceptance Criteria\n- src/index.ts exports marker.\n\n## Touched Paths\n- src/index.ts\n\n## Verification Commands\n- npm run typecheck\n- npm test\n\n## Non-goals\n- Do not add dependencies.\n",
    "utf8",
  );
  const cli = (...args) => spawnSync(process.execPath, [cliPath, ...args, "--root", dir], { encoding: "utf8" });
  cli("scan", "--json");
  cli("intent", "context", "prepare", "--json");
  cli("intent", "assess", "--goal", "Add a marker export to src/index.ts.", "--kind", "feature", "--path", "src/index.ts", "--json");
  const latest = (type) => spawnSync(process.execPath, [cliPath, "artifacts", "latest", "--root", dir, "--type", type, "--id-only"], { encoding: "utf8" }).stdout.trim();
  return { dir, cli, latest };
}

async function countArtifacts(dir, prefix) {
  let total = 0;
  const base = join(dir, ".rekon", "artifacts");
  for (const category of await readdir(base)) {
    let files;
    try {
      files = await readdir(join(base, category));
    } catch {
      continue;
    }
    total += files.filter((f) => f.startsWith(`${prefix}-`)).length;
  }
  return total;
}

test("CLI: prepare with a non-actionable report blocks (exit 1) and writes no PreparedIntentPlan", async () => {
  const { dir, cli, latest } = await setUpRepo();
  const assessment = latest("IntentAssessmentReport");
  cli("intent", "plan", "review", "--plan", join(dir, "plans", "rough.md"), "--goal", "Add marker", "--semantic", "off", "--json");
  const roughReport = latest("IntentPlanActionabilityReport");
  const res = cli("intent", "prepare", "--assessment", assessment, "--actionability-report", roughReport, "--json");
  assert.equal(res.status, 1);
  const out = JSON.parse(res.stdout);
  assert.equal(out.status, "blocked");
  assert.match(out.reason, /^plan-actionability-/);
  assert.equal(out.actionabilityReport.type, "IntentPlanActionabilityReport");
  assert.equal(typeof out.summary.findings, "number");
  assert.ok(out.summary.findings > 0);
  assert.equal(typeof out.summary.questions, "number");
  assert.ok(out.summary.questions > 0);
  assert.ok(typeof out.revisionPrompt === "string" && out.revisionPrompt.length > 0);
  assert.equal(out.boundaries.createdPreparedIntentPlan, false);
  assert.equal(out.boundaries.executedCommands, false);
  assert.equal(out.boundaries.wroteSourceFiles, false);
  assert.equal(out.boundaries.ranCirce, false);
  assert.equal(out.boundaries.implementedIntentGo, false);
  assert.equal(await countArtifacts(dir, "PreparedIntentPlan"), 0);
});

test("CLI: prepare with an actionable report writes one PreparedIntentPlan that is not auto-approved", async () => {
  const { dir, cli, latest } = await setUpRepo();
  const assessment = latest("IntentAssessmentReport");
  cli("intent", "plan", "review", "--plan", join(dir, "plans", "structured.md"), "--goal", "Add marker", "--semantic", "off", "--json");
  const report = latest("IntentPlanActionabilityReport");
  const res = cli("intent", "prepare", "--assessment", assessment, "--actionability-report", report, "--json");
  assert.equal(res.status ?? 0, 0);
  assert.equal(await countArtifacts(dir, "PreparedIntentPlan"), 1);

  const planFile = (await readdir(join(dir, ".rekon", "artifacts", "actions"))).find((f) => f.startsWith("PreparedIntentPlan-"));
  const plan = JSON.parse(await readFile(join(dir, ".rekon", "artifacts", "actions", planFile), "utf8"));
  assert.notEqual(plan.approval.status, "approved");
  assert.ok(plan.header.inputRefs.some((r) => r.type === "IntentPlanActionabilityReport"), "plan inputRefs must cite the report");
  assert.ok(plan.phases.length >= 1);
  assert.ok(plan.phases.some((p) => p.paths.includes("src/index.ts")), "a phase must preserve the touched path");
  assert.ok(plan.verificationRequirements.some((r) => r.command === "npm run typecheck"));

  // Downstream handoff still requires explicit approval: WorkOrder generation
  // creates no WorkOrder from a needs-review plan.
  const planRef = latest("PreparedIntentPlan");
  cli("intent", "work-order", "generate", "--prepared-plan", planRef, "--json");
  assert.equal(await countArtifacts(dir, "WorkOrder"), 0);
  assert.equal(await countArtifacts(dir, "VerificationPlan"), 0);
  assert.equal(await countArtifacts(dir, "VerificationRun"), 0);
  assert.equal(await countArtifacts(dir, "VerificationResult"), 0);

  // Source + plan files are unchanged.
  assert.equal(await readFile(join(dir, "src", "index.ts"), "utf8"), 'export const existing = "ok";\n');
  assert.match(await readFile(join(dir, "plans", "structured.md"), "utf8"), /## Objective/);

  // Artifacts validate clean.
  const validate = cli("artifacts", "validate", "--json");
  assert.equal(validate.status ?? 0, 0);
});

test("CLI: prepare without a report keeps existing assessment-only behavior", async () => {
  const { dir, cli, latest } = await setUpRepo();
  const assessment = latest("IntentAssessmentReport");
  const res = cli("intent", "prepare", "--assessment", assessment, "--json");
  assert.equal(res.status ?? 0, 0);
  assert.equal(await countArtifacts(dir, "PreparedIntentPlan"), 1);
});

test("CLI: prepare rejects a non-IntentPlanActionabilityReport for --actionability-report", async () => {
  const { dir, cli, latest } = await setUpRepo();
  const assessment = latest("IntentAssessmentReport");
  const res = cli("intent", "prepare", "--assessment", assessment, "--actionability-report", assessment, "--json");
  assert.equal(res.status, 1);
});

test("help lists --actionability-report on intent prepare", () => {
  const help = spawnSync(process.execPath, [cliPath, "help"], { encoding: "utf8" }).stdout;
  assert.match(help, /intent prepare[^\n]*--actionability-report/);
});
