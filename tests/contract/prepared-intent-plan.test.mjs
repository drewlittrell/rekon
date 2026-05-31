// Contract tests for PreparedIntentPlan v1 (eighty-first slice on the
// capability-ontology track).
//
// PreparedIntentPlan v1 is a read-only phase/gate preparation artifact
// generated from an IntentAssessmentReport plus the existing Rekon context
// spine. It is phase/gate preparation, not WorkOrder: it creates no WorkOrder /
// VerificationPlan, executes no commands, writes no source, and mutates
// nothing. Verification requirements are not VerificationPlan.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { buildPreparedIntentPlan } from "../../packages/capability-model/dist/index.js";
import { validatePreparedIntentPlan } from "../../packages/kernel-repo-model/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");

function baseHeader() {
  return {
    artifactType: "PreparedIntentPlan",
    artifactId: "prepared-intent-plan-test-1",
    schemaVersion: "0.1.0",
    generatedAt: "2026-05-30T00:00:00.000Z",
    subject: { repoId: "test" },
    producer: { id: "@rekon/test", version: "0.1.0" },
    inputRefs: [],
    freshness: { status: "fresh" },
    provenance: { confidence: 0.7 },
  };
}

const REF = (type, id) => ({ type, id, schemaVersion: "0.1.0" });
const ASSESSMENT_REF = REF("IntentAssessmentReport", "ia-1");

function assessment(over = {}) {
  return {
    request: {
      goal: "Fix create user flow",
      kind: "bug",
      scope: { paths: ["src/"], steps: ["s1"], systems: ["billing"], capabilities: ["create user"] },
    },
    readiness: { status: "ready-for-prepare", recommendedNextAction: "prepare-intent" },
    matchedContext: { systems: ["billing"], capabilities: ["create user"], steps: ["s1"], paths: ["src/app.ts"] },
    blockers: [],
    warnings: [],
    ...over,
  };
}

function build(over = {}, opts = {}) {
  return buildPreparedIntentPlan({
    header: baseHeader(),
    intentAssessmentReport: assessment(over),
    intentAssessmentReportRef: ASSESSMENT_REF,
    ...opts,
  });
}

const hasCategory = (list, category) => list.some((entry) => entry.category === category);

// ---------- 1 ----------
test("PreparedIntentPlan validates", () => {
  assert.equal(validatePreparedIntentPlan(build()).ok, true);
});

// ---------- 2 ----------
test("missing IntentAssessmentReport input fails clearly", () => {
  assert.throws(
    () => buildPreparedIntentPlan({ header: baseHeader(), intentAssessmentReport: assessment() }),
    /intentAssessmentReportRef/,
  );
  const invalid = validatePreparedIntentPlan({
    header: baseHeader(),
    source: {},
    request: { goal: "g", kind: "bug" },
    status: { value: "prepared", recommendedNextAction: "create-work-order" },
    phases: [],
    obligations: [],
    verificationRequirements: [],
    blockedReasons: [],
  });
  assert.equal(invalid.ok, false);
  assert.ok(invalid.issues.some((issue) => issue.path === "$.source.intentAssessmentReportRef"));
});

// ---------- 3 ----------
test("ready-for-prepare assessment yields prepared status", () => {
  assert.equal(build({ readiness: { status: "ready-for-prepare" } }).status.value, "prepared");
});

// ---------- 4 ----------
test("blocked assessment yields blocked status", () => {
  const plan = build({ readiness: { status: "blocked" }, blockers: [{ id: "b1", category: "missing-artifact", severity: "high", message: "missing spine" }] });
  assert.equal(plan.status.value, "blocked");
});

// ---------- 5 ----------
test("needs-review assessment yields needs-review status", () => {
  assert.equal(build({ readiness: { status: "needs-review" } }).status.value, "needs-review");
});

// ---------- 6 ----------
test("insufficient-context assessment yields insufficient-assessment status", () => {
  assert.equal(build({ readiness: { status: "insufficient-context" } }).status.value, "insufficient-assessment");
});

// ---------- 7 ----------
test("stale-context assessment yields stale-assessment status", () => {
  assert.equal(build({ readiness: { status: "stale-context" } }).status.value, "stale-assessment");
});

// ---------- 8 ----------
test("prepared status recommends create-work-order but does not create a WorkOrder", () => {
  const plan = build({ readiness: { status: "ready-for-prepare" } });
  assert.equal(plan.status.recommendedNextAction, "create-work-order");
  assert.equal(Object.prototype.hasOwnProperty.call(plan, "workOrder"), false);
});

// ---------- 9 ----------
test("blocked status recommends resolve-blockers", () => {
  assert.equal(build({ readiness: { status: "blocked" } }).status.recommendedNextAction, "resolve-blockers");
});

// ---------- 10 ----------
test("stale-assessment recommends refresh-context", () => {
  assert.equal(build({ readiness: { status: "stale-context" } }).status.recommendedNextAction, "refresh-context");
});

// ---------- 11 ----------
test("insufficient-assessment recommends run-assessment", () => {
  assert.equal(build({ readiness: { status: "insufficient-context" } }).status.recommendedNextAction, "run-assessment");
});

// ---------- 12 ----------
test("request goal / kind / scope copied from assessment", () => {
  const plan = build();
  assert.equal(plan.request.goal, "Fix create user flow");
  assert.equal(plan.request.kind, "bug");
  assert.ok(plan.request.scope?.paths?.includes("src/"));
});

// ---------- 13 ----------
test("matched context paths/systems/capabilities/steps propagate into phases", () => {
  const plan = build({ readiness: { status: "ready-for-prepare" } });
  assert.ok(plan.phases.length > 0);
  assert.ok(plan.phases.some((phase) => phase.paths.includes("src/app.ts")));
  assert.ok(plan.phases.some((phase) => phase.steps.includes("s1")));
  assert.ok(plan.phases.some((phase) => phase.systems.includes("billing")));
  assert.ok(plan.phases.some((phase) => phase.capabilities.includes("create user")));
});

// ---------- 14 ----------
test("prepared bug/feature/refactor/migration emits a verify phase", () => {
  for (const kind of ["bug", "feature", "refactor", "migration"]) {
    const plan = build({ readiness: { status: "ready-for-prepare" }, request: { goal: "g", kind } });
    assert.ok(plan.phases.some((phase) => phase.kind === "verify"), `expected verify phase for kind ${kind}`);
  }
});

// ---------- 15 ----------
test("refactor emits a refactor phase", () => {
  const plan = build({ readiness: { status: "ready-for-prepare" }, request: { goal: "g", kind: "refactor" } });
  assert.ok(plan.phases.some((phase) => phase.kind === "refactor"));
});

// ---------- 16 ----------
test("needs-review emits a review phase only", () => {
  const plan = build({ readiness: { status: "needs-review" } });
  assert.equal(plan.phases.length, 1);
  assert.equal(plan.phases[0].kind, "review");
});

// ---------- 17 ----------
test("blocked / stale / insufficient emit no implementation phases", () => {
  for (const status of ["blocked", "stale-context", "insufficient-context"]) {
    const plan = build({ readiness: { status } });
    assert.equal(plan.phases.length, 0, `expected no phases for ${status}`);
  }
});

// ---------- 18 ----------
test("source-write-boundary obligation always present", () => {
  for (const status of ["ready-for-prepare", "blocked", "needs-review", "stale-context", "insufficient-context"]) {
    const plan = build({ readiness: { status } });
    assert.ok(hasCategory(plan.obligations, "source-write-boundary"), `missing source-write-boundary for ${status}`);
  }
});

// ---------- 19 ----------
test("runtime drift blocker/warning creates a runtime-drift obligation", () => {
  const plan = build({ warnings: [{ id: "w1", category: "runtime-drift", severity: "medium", message: "drift" }] });
  assert.ok(hasCategory(plan.obligations, "runtime-drift"));
});

// ---------- 20 ----------
test("handoff coverage blocker/warning creates a handoff-preservation obligation", () => {
  const plan = build({ warnings: [{ id: "w2", category: "handoff-coverage", severity: "medium", message: "uncovered" }] });
  assert.ok(hasCategory(plan.obligations, "handoff-preservation"));
});

// ---------- 21 ----------
test("proof-missing creates a verification obligation", () => {
  const plan = build({ warnings: [{ id: "w3", category: "proof-missing", severity: "medium", message: "no proof" }] });
  assert.ok(hasCategory(plan.obligations, "verification"));
});

// ---------- 22 ----------
test("verification requirements are emitted but no VerificationPlan is created", () => {
  const plan = build({ readiness: { status: "ready-for-prepare" }, request: { goal: "g", kind: "bug" } });
  assert.equal(plan.verificationRequirements.length, 3);
  assert.ok(plan.verificationRequirements.every((requirement) => typeof requirement.id === "string"));
  assert.equal(Object.prototype.hasOwnProperty.call(plan, "verificationPlan"), false);
});

// ---------- CLI ----------
const cliRoot = await mkdtemp(join(tmpdir(), "rekon-intent-prepare-"));
await mkdir(join(cliRoot, "src"), { recursive: true });
await writeFile(join(cliRoot, "src", "app.ts"), "export const app = 1;\n", "utf8");

function runCli(args) {
  return spawnSync("node", [cliPath, ...args], { encoding: "utf8" });
}

function latestAssessmentRef() {
  const result = runCli(["artifacts", "latest", "--root", cliRoot, "--type", "IntentAssessmentReport", "--id-only"]);
  return result.stdout.trim();
}

// seed an assessment for the CLI tests
runCli(["intent", "assess", "--root", cliRoot, "--goal", "Prepare me", "--kind", "bug", "--path", "src/app.ts"]);

// ---------- 23 ----------
test("CLI writes a PreparedIntentPlan", () => {
  const ref = latestAssessmentRef();
  const result = runCli(["intent", "prepare", "--root", cliRoot, "--assessment", ref, "--json"]);
  assert.equal(result.status, 0);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.artifact.type, "PreparedIntentPlan");
  assert.ok(payload.status.value);
  assert.equal(typeof payload.phases, "number");
  assert.equal(typeof payload.obligations, "number");
  assert.equal(typeof payload.verificationRequirements, "number");
});

// ---------- 24 ----------
test("CLI requires --assessment", () => {
  const result = runCli(["intent", "prepare", "--root", cliRoot]);
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}${result.stderr}`, /requires --assessment/);
});

// ---------- 25 ----------
test("CLI does not create a WorkOrder", () => {
  const result = runCli(["artifacts", "latest", "--root", cliRoot, "--type", "WorkOrder", "--allow-missing", "--json"]);
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).artifact, null);
});

// ---------- 26 ----------
test("CLI does not create a VerificationPlan", () => {
  const result = runCli(["artifacts", "latest", "--root", cliRoot, "--type", "VerificationPlan", "--allow-missing", "--json"]);
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).artifact, null);
});

// ---------- 27 ----------
test("CLI does not create a VerificationRun", () => {
  const result = runCli(["artifacts", "latest", "--root", cliRoot, "--type", "VerificationRun", "--allow-missing", "--json"]);
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).artifact, null);
});

// ---------- 28 ----------
test("CLI does not write source files", async () => {
  const before = await readFile(join(cliRoot, "src", "app.ts"), "utf8");
  runCli(["intent", "prepare", "--root", cliRoot, "--assessment", latestAssessmentRef()]);
  const after = await readFile(join(cliRoot, "src", "app.ts"), "utf8");
  assert.equal(after, before);
});

// ---------- 29 ----------
test("artifacts validate remains clean after intent prepare", () => {
  runCli(["intent", "prepare", "--root", cliRoot, "--assessment", latestAssessmentRef()]);
  const result = runCli(["artifacts", "validate", "--root", cliRoot, "--json"]);
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).valid, true);
});
