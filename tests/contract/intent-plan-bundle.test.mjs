// Contract tests for the Intent plan bundle renderer + `rekon intent bundle write`
// (slice 96).
//
// The renderer projects canonical intent artifacts into a regenerable human +
// LLM-agent handoff bundle under `.rekon/intent/plans/<intent-id>/`. It reads no
// files, writes no files, executes no commands, and mutates no input; the CLI
// persists the files under the bundle directory with path-traversal safety.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { buildIntentPlanBundle, isSafeBundleRelativePath, slugifyIntentId } from "../../packages/capability-docs/dist/index.js";
import { createLocalArtifactStore } from "../../packages/runtime/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");

const REF = (type, id) => ({ type, id, schemaVersion: "0.1.0", digest: `d-${id}` });
const PLAN_REF = REF("PreparedIntentPlan", "pip-1");
const STATUS_REF = REF("IntentStatusReport", "isr-1");
const WO_REF = REF("WorkOrder", "wo-1");
const VP_REF = REF("VerificationPlan", "vp-1");
const IA_REF = REF("IntentAssessmentReport", "ia-1");

function baseSource() {
  return {
    intentAssessmentReport: { request: { goal: "Fix create user flow" }, readiness: { value: "ready-for-prepare" } },
    intentAssessmentReportRef: IA_REF,
    preparedIntentPlan: {
      request: { goal: "Fix create user flow", scope: { capabilities: ["create-user"], steps: ["fixture.create-user"] } },
      status: { value: "prepared" },
      approval: { status: "approved" },
      phases: [
        {
          id: "phase:investigate",
          title: "Investigate",
          kind: "investigate",
          goal: "Investigate the create-user flow",
          paths: ["src/app.ts"],
          systems: ["billing"],
          constraints: ["Preserve the create-user contract."],
          obligations: ["obligation:x"],
          verificationRequirements: ["verify:typecheck"],
        },
        {
          id: "phase:modify",
          title: "Modify",
          kind: "modify",
          goal: "Modify the create-user flow",
          paths: ["src/app.ts"],
          systems: ["billing"],
          constraints: [],
          obligations: [],
          verificationRequirements: [],
        },
      ],
      obligations: [{ id: "obligation:x", message: "Preserve the create-user capability." }],
      verificationRequirements: [{ id: "verify:typecheck", command: "npm run typecheck", reason: "Type safety must hold." }],
      blockedReasons: [],
    },
    preparedIntentPlanRef: PLAN_REF,
    intentStatusReport: { status: { value: "work-ready" }, recommendedNextAction: "create-work-order", blockers: [], warnings: [], staleInputs: [], missingInputs: [] },
    intentStatusReportRef: STATUS_REF,
    workOrder: { goal: "Fix create user flow", paths: ["src/app.ts"], ownerSystems: ["billing"], riskNotes: ["Preserve the create-user capability."], markdown: "# Work order guidance", intentHandoff: { verificationRequirementIds: ["verify:typecheck"] } },
    workOrderRef: WO_REF,
    verificationPlan: { commands: ["npm run typecheck"], successCriteria: ["Types hold."], intentHandoff: { verificationRequirementIds: ["verify:typecheck"] } },
    verificationPlanRef: VP_REF,
  };
}

function build(extra = {}) {
  return buildIntentPlanBundle({ generatedAt: "2026-05-31T00:00:00.000Z", source: baseSource(), ...extra });
}

const fileByPath = (result, path) => result.files.find((f) => f.path === path)?.content;

const REQUIRED_PATHS = [
  "manifest.json",
  "README.md",
  "prepared-plan.md",
  "work-order.md",
  "verification-plan.md",
  "status.md",
  "agent/handoff.md",
  "agent/context.json",
  "agent/instructions.md",
  "agent/constraints.md",
  "agent/verification.json",
  "agent/source-refs.json",
];

// ---------- 1 ----------
test("helper renders all required files", () => {
  const result = build();
  for (const path of REQUIRED_PATHS) assert.ok(fileByPath(result, path) !== undefined, `missing ${path}`);
});

// ---------- 2 ----------
test("manifest includes schemaVersion / bundleKind / intentId / generatedAt", () => {
  const m = build().manifest;
  assert.equal(m.schemaVersion, "0.1.0");
  assert.equal(m.bundleKind, "intent-plan");
  assert.equal(m.intentId, "pip-1");
  assert.equal(m.generatedAt, "2026-05-31T00:00:00.000Z");
});

// ---------- 3 ----------
test("manifest includes source artifact refs", () => {
  const m = build().manifest;
  assert.equal(m.sourceArtifacts.preparedIntentPlan.ref, "PreparedIntentPlan:pip-1");
  assert.equal(m.sourceArtifacts.intentStatusReport.ref, "IntentStatusReport:isr-1");
  assert.equal(m.sourceArtifacts.workOrder.ref, "WorkOrder:wo-1");
});

// ---------- 4 ----------
test("manifest includes source artifact digests", () => {
  const m = build({ sourceDigests: { preparedIntentPlan: "digest-pip" } }).manifest;
  assert.equal(m.sourceArtifacts.preparedIntentPlan.digest, "digest-pip");
  assert.ok(typeof m.sourceArtifacts.intentStatusReport.digest === "string" && m.sourceArtifacts.intentStatusReport.digest.length > 0);
});

// ---------- 5 ----------
test("manifest boundaries set executesCommands false", () => {
  assert.equal(build().manifest.boundaries.executesCommands, false);
});

// ---------- 6 ----------
test("manifest boundaries set writesSourceFiles false", () => {
  assert.equal(build().manifest.boundaries.writesSourceFiles, false);
});

// ---------- 7 ----------
test("manifest boundaries set implementsIntentGo false", () => {
  assert.equal(build().manifest.boundaries.implementsIntentGo, false);
});

// ---------- 8 ----------
test("bundle path is .rekon/intent/plans/<intent-id>/", () => {
  assert.equal(build().rootDir, ".rekon/intent/plans/pip-1");
});

// ---------- 9 ----------
test("intent id is slug-safe", () => {
  assert.equal(slugifyIntentId("Fix Create User!!"), "fix-create-user");
  assert.equal(build({ intentId: "Fix Create User!!" }).intentId, "fix-create-user");
});

// ---------- 10 ----------
test("unsafe intent id cannot escape bundle root", () => {
  const result = build({ intentId: "../../etc/passwd" });
  assert.ok(!result.intentId.includes(".."));
  assert.ok(!result.rootDir.includes(".."));
  assert.equal(result.rootDir, ".rekon/intent/plans/etc-passwd");
});

// ---------- 11 ----------
test("unsafe renderer path is rejected", () => {
  assert.equal(isSafeBundleRelativePath("agent/handoff.md"), true);
  assert.equal(isSafeBundleRelativePath("manifest.json"), true);
  assert.equal(isSafeBundleRelativePath("../x"), false);
  assert.equal(isSafeBundleRelativePath("/etc/passwd"), false);
  assert.equal(isSafeBundleRelativePath("a/../b"), false);
});

// ---------- 12 ----------
test("README includes canonical truth reminder", () => {
  assert.match(fileByPath(build(), "README.md"), /\.rekon\/artifacts\//);
});

// ---------- 13 ----------
test("prepared-plan.md includes approval / phases / obligations", () => {
  const md = fileByPath(build(), "prepared-plan.md");
  assert.match(md, /approved/);
  assert.match(md, /Investigate/);
  assert.match(md, /Preserve the create-user capability/);
});

// ---------- 14 ----------
test("work-order.md includes traceability when WorkOrder has intentHandoff", () => {
  assert.match(fileByPath(build(), "work-order.md"), /PreparedIntentPlan:pip-1/);
});

// ---------- 15 ----------
test("verification-plan.md says commands are not executed", () => {
  assert.match(fileByPath(build(), "verification-plan.md"), /Commands are not executed/);
});

// ---------- 16 ----------
test("status.md includes IntentStatusReport status", () => {
  assert.match(fileByPath(build(), "status.md"), /work-ready/);
});

// ---------- 17 ----------
test("agent/handoff.md includes stop conditions", () => {
  assert.match(fileByPath(build(), "agent/handoff.md"), /Stop conditions/);
});

// ---------- 18 ----------
test("agent/context.json includes structured context", () => {
  const ctx = JSON.parse(fileByPath(build(), "agent/context.json"));
  assert.equal(ctx.intentId, "pip-1");
  assert.equal(ctx.goal, "Fix create user flow");
  assert.equal(ctx.status, "work-ready");
  assert.ok(Array.isArray(ctx.phases));
});

// ---------- 19 ----------
test("agent/constraints.md includes source-write boundary", () => {
  assert.match(fileByPath(build(), "agent/constraints.md"), /Source-write boundary/);
});

// ---------- 20 ----------
test("agent/verification.json has executesCommands false", () => {
  const v = JSON.parse(fileByPath(build(), "agent/verification.json"));
  assert.equal(v.executesCommands, false);
  assert.ok(v.commands.includes("npm run typecheck"));
});

// ---------- 21 ----------
test("agent/source-refs.json includes canonical refs / digests", () => {
  const refs = JSON.parse(fileByPath(build(), "agent/source-refs.json"));
  assert.equal(refs.canonicalTruth, ".rekon/artifacts");
  assert.equal(refs.sourceArtifacts.preparedIntentPlan.ref, "PreparedIntentPlan:pip-1");
});

// ---------- 28 (helper staleness) ----------
test("stale inputs mark manifest stale", () => {
  const result = build({
    source: { ...baseSource(), pathFreshnessReport: { status: "stale" }, pathFreshnessReportRef: REF("PathFreshnessReport", "pf-1") },
  });
  assert.equal(result.manifest.staleness.state, "stale");
  assert.ok(result.manifest.staleness.staleReasons.includes("freshness-stale"));
});

// ---------- CLI ----------
function runCli(args) {
  return spawnSync("node", [cliPath, ...args], { encoding: "utf8" });
}

function header(type, id) {
  return {
    artifactType: type,
    artifactId: id,
    schemaVersion: "0.1.0",
    generatedAt: "2026-05-31T00:00:00.000Z",
    subject: { repoId: "test" },
    producer: { id: "@rekon/test", version: "0.1.0" },
    inputRefs: [],
    freshness: { status: "fresh" },
    provenance: { confidence: 0.7 },
  };
}

const cliRoot = await mkdtemp(join(tmpdir(), "rekon-bundle-"));
await mkdir(join(cliRoot, "src"), { recursive: true });
await writeFile(join(cliRoot, "src", "app.ts"), "export const app = 1;\n", "utf8");
{
  const store = createLocalArtifactStore(cliRoot);
  await store.init();
  const src = baseSource();
  await store.write({ header: header("PreparedIntentPlan", "pip-seed"), ...src.preparedIntentPlan }, { category: "actions" });
  await store.write({ header: header("IntentStatusReport", "isr-seed"), ...src.intentStatusReport }, { category: "actions" });
}

const bundleDir = join(cliRoot, ".rekon", "intent", "plans", "pip-seed");

// ---------- 22 ----------
test("CLI writes bundle files under .rekon/intent/plans/<intent-id>/", () => {
  const result = runCli(["intent", "bundle", "write", "--root", cliRoot, "--prepared-plan", "PreparedIntentPlan:pip-seed", "--json"]);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.bundle.path, ".rekon/intent/plans/pip-seed/");
  assert.ok(payload.bundle.files >= 12);
});

// ---------- 23 ----------
test("CLI writes all required files inside the bundle directory", async () => {
  for (const path of REQUIRED_PATHS) {
    const s = await stat(join(bundleDir, ...path.split("/")));
    assert.ok(s.isFile(), `missing bundle file ${path}`);
  }
});

// ---------- 24 ----------
test("CLI does not create a canonical artifact (manifest not in .rekon/artifacts)", () => {
  // The bundle manifest is filesystem projection, never a registered artifact.
  const latest = runCli(["artifacts", "latest", "--root", cliRoot, "--type", "WorkOrder", "--allow-missing", "--json"]);
  assert.equal(JSON.parse(latest.stdout).artifact, null);
});

// ---------- 25 ----------
test("CLI does not create a VerificationRun", () => {
  const latest = runCli(["artifacts", "latest", "--root", cliRoot, "--type", "VerificationRun", "--allow-missing", "--json"]);
  assert.equal(JSON.parse(latest.stdout).artifact, null);
});

// ---------- 26 ----------
test("CLI does not write source files outside the bundle", async () => {
  const before = await readFile(join(cliRoot, "src", "app.ts"), "utf8");
  runCli(["intent", "bundle", "write", "--root", cliRoot, "--prepared-plan", "PreparedIntentPlan:pip-seed"]);
  const after = await readFile(join(cliRoot, "src", "app.ts"), "utf8");
  assert.equal(after, before);
});

// ---------- 27 ----------
test("CLI supports pinned refs", () => {
  const result = runCli([
    "intent", "bundle", "write", "--root", cliRoot,
    "--prepared-plan", "PreparedIntentPlan:pip-seed",
    "--intent-status", "IntentStatusReport:isr-seed",
    "--intent-id", "custom-id",
    "--json",
  ]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).bundle.intentId, "custom-id");
});

// ---------- 29 ----------
test("artifacts validate remains clean after bundle write", () => {
  const result = runCli(["artifacts", "validate", "--root", cliRoot, "--json"]);
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).valid, true);
});

// ===========================================================================
// Circe handoff projection (slice 99). The projection is grounded in the real
// Circe `rekon-circe-handoff` schema; per-phase WorkOrders / VerificationPlans
// use the canonical Rekon shapes Circe's normalizers accept.
// ===========================================================================

const circeJson = (result, rel) => JSON.parse(fileByPath(result, `circe/${rel}`));

// ---------- C1: helper renders circe/handoff.json ----------
test("circe: helper renders circe/handoff.json", () => {
  assert.ok(fileByPath(build(), "circe/handoff.json") !== undefined);
});

// ---------- C2: helper renders circe/phase-plan.json ----------
test("circe: helper renders circe/phase-plan.json", () => {
  assert.ok(fileByPath(build(), "circe/phase-plan.json") !== undefined);
});

// ---------- C3: per-phase WorkOrder JSON files ----------
test("circe: helper renders one WorkOrder JSON per phase", () => {
  const result = build();
  assert.ok(fileByPath(result, "circe/work-orders/phase-investigate.work-order.json") !== undefined);
  assert.ok(fileByPath(result, "circe/work-orders/phase-modify.work-order.json") !== undefined);
});

// ---------- C4: per-phase VerificationPlan JSON files when requirements exist ----------
test("circe: helper renders a VerificationPlan only for phases with requirements", () => {
  const result = build();
  assert.ok(fileByPath(result, "circe/verification-plans/phase-investigate.verification-plan.json") !== undefined);
  // phase:modify has no verification requirements -> no VerificationPlan file.
  assert.equal(fileByPath(result, "circe/verification-plans/phase-modify.verification-plan.json"), undefined);
});

// ---------- C5: handoff schemaVersion 1 ----------
test("circe: handoff.json has schemaVersion 1 (number)", () => {
  assert.strictEqual(circeJson(build(), "handoff.json").schemaVersion, 1);
});

// ---------- C6: handoff kind rekon-circe-handoff ----------
test("circe: handoff.json has kind rekon-circe-handoff", () => {
  assert.equal(circeJson(build(), "handoff.json").kind, "rekon-circe-handoff");
});

// ---------- C7: handoff producer.system rekon ----------
test("circe: handoff.json has producer.system rekon", () => {
  assert.equal(circeJson(build(), "handoff.json").producer.system, "rekon");
});

// ---------- C8: handoff status ready ----------
test("circe: handoff.json has status ready", () => {
  assert.equal(circeJson(build(), "handoff.json").status, "ready");
});

// ---------- C9: handoff references phase-plan.json ----------
test("circe: handoff.json references phase-plan.json", () => {
  assert.equal(circeJson(build(), "handoff.json").phasePlanPath, "phase-plan.json");
});

// ---------- C10: handoff artifact paths are relative to circe/ ----------
test("circe: handoff.json artifact paths are relative to circe/ (no leading circe/, no traversal)", () => {
  const handoff = circeJson(build(), "handoff.json");
  for (const ref of [...handoff.artifacts.workOrders, ...handoff.artifacts.verificationPlans]) {
    assert.ok(!ref.path.startsWith("/") && !ref.path.startsWith("circe/") && !ref.path.includes(".."), ref.path);
  }
  assert.equal(handoff.sourcePlanPath, "../prepared-plan.md");
});

// ---------- C11: phase-plan has one entry per PreparedIntentPlan phase ----------
test("circe: phase-plan.json has one entry per phase", () => {
  const pp = circeJson(build(), "phase-plan.json");
  assert.equal(pp.schemaVersion, 1);
  assert.equal(pp.phases.length, 2);
  assert.deepEqual(pp.phases.map((p) => p.phaseId), ["phase-investigate", "phase-modify"]);
});

// ---------- C12: phase ids are slug-safe ----------
test("circe: phase ids are slug-safe", () => {
  for (const phase of circeJson(build(), "phase-plan.json").phases) {
    assert.match(phase.phaseId, /^[a-z0-9-]+$/);
    assert.ok(!phase.phaseId.includes(".."));
  }
});

// ---------- C13: phase plan omits implementerProfile by default ----------
test("circe: phase plan omits implementerProfile by default", () => {
  for (const phase of circeJson(build(), "phase-plan.json").phases) {
    assert.ok(!("implementerProfile" in phase), "implementerProfile must be omitted by default");
  }
});

// ---------- C14: per-phase WorkOrder projection traces source phase id ----------
test("circe: per-phase WorkOrder traces its phase id and is the canonical Rekon WorkOrder shape", () => {
  const wo = circeJson(build(), "work-orders/phase-investigate.work-order.json");
  assert.equal(wo.header.artifactType, "WorkOrder");
  assert.match(wo.header.artifactId, /phase-investigate/);
  assert.ok(wo.goal.length > 0); // Circe requires a non-empty goal.
  assert.ok(Array.isArray(wo.remediationItems));
  assert.equal(wo.source, "intent-handoff");
  // handoff artifact ref ties back to the WorkOrder header artifactId by phase.
  const ref = circeJson(build(), "handoff.json").artifacts.workOrders.find((w) => w.phaseId === "phase-investigate");
  assert.equal(ref.artifactId, wo.header.artifactId);
});

// ---------- C15: per-phase VerificationPlan projection traces requirement ids ----------
test("circe: per-phase VerificationPlan traces the phase's verification requirements", () => {
  const vp = circeJson(build(), "verification-plans/phase-investigate.verification-plan.json");
  assert.equal(vp.header.artifactType, "VerificationPlan");
  assert.equal(vp.workOrderRef.id, "pip-1-phase-investigate.work-order");
  assert.ok(vp.commands.includes("npm run typecheck"));
  assert.ok(vp.successCriteria.includes("Type safety must hold."));
});

// ---------- C16: missing verification plan for a phase emits warning ----------
test("circe: a phase with no verification requirement emits a handoff warning", () => {
  const handoff = circeJson(build(), "handoff.json");
  assert.ok(handoff.warnings.some((w) => w.includes("phase-modify")));
});

// ---------- C17: manifest includes circe section ----------
test("circe: manifest includes a circe section", () => {
  const circe = build().manifest.circe;
  assert.equal(circe.handoff, "circe/handoff.json");
  assert.equal(circe.phasePlan, "circe/phase-plan.json");
  assert.equal(circe.schemaVersion, 1);
  assert.equal(circe.kind, "rekon-circe-handoff");
  assert.equal(circe.workOrders, 2);
  assert.equal(circe.verificationPlans, 1);
});

// ---------- C18: bundle generation runs no Circe / executes no commands ----------
test("circe: WorkOrder requiredChecks are plain command text, never executed", () => {
  const wo = circeJson(build(), "work-orders/phase-investigate.work-order.json");
  assert.ok(wo.requiredChecks.every((c) => typeof c === "string"));
  assert.equal(build().manifest.boundaries.executesCommands, false);
});

// ---------- C19: every circe file path is bundle-safe (no source write escape) ----------
test("circe: every circe projection path is bundle-safe", () => {
  const circeFiles = build().files.filter((f) => f.path.startsWith("circe/"));
  assert.ok(circeFiles.length >= 4);
  for (const f of circeFiles) assert.equal(isSafeBundleRelativePath(f.path), true);
});

// ---------- C20: unsafe phase id cannot escape via circe paths ----------
test("circe: an unsafe phase id is slugified so projection paths stay safe", () => {
  const src = baseSource();
  src.preparedIntentPlan.phases = [
    { id: "../../etc/passwd", title: "Escape", kind: "investigate", goal: "x", paths: [], verificationRequirements: [] },
  ];
  const result = build({ source: src });
  for (const f of result.files.filter((f) => f.path.startsWith("circe/"))) {
    assert.ok(!f.path.includes(".."), f.path);
    assert.equal(isSafeBundleRelativePath(f.path), true);
  }
});

// ---------- C21: fallback phase when the plan declares none ----------
test("circe: a plan with no phases yields a fallback phase and a warning", () => {
  const src = baseSource();
  src.preparedIntentPlan.phases = [];
  const handoff = circeJson(build({ source: src }), "handoff.json");
  assert.equal(handoff.artifacts.workOrders.length, 1);
  assert.ok(handoff.warnings.some((w) => /fallback phase/i.test(w)));
});

// ---------- C22: CLI writes circe projection files ----------
test("circe: CLI writes circe projection files inside the bundle", async () => {
  runCli(["intent", "bundle", "write", "--root", cliRoot, "--prepared-plan", "PreparedIntentPlan:pip-seed", "--json"]);
  for (const rel of ["circe/handoff.json", "circe/phase-plan.json", "circe/work-orders/phase-investigate.work-order.json"]) {
    const s = await stat(join(bundleDir, ...rel.split("/")));
    assert.ok(s.isFile(), `missing ${rel}`);
  }
});

// ---------- C23: CLI JSON includes circe paths / counts ----------
test("circe: CLI --json includes circe paths and counts", () => {
  const result = runCli([
    "intent", "bundle", "write", "--root", cliRoot, "--prepared-plan", "PreparedIntentPlan:pip-seed", "--json",
  ]);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.match(payload.circe.handoff, /circe\/handoff\.json$/);
  assert.match(payload.circe.phasePlan, /circe\/phase-plan\.json$/);
  assert.ok(payload.circe.workOrders >= 1);
  assert.equal(payload.boundaries.runsCirce, false);
});

// ---------- C24: CLI does not register the circe projection as an artifact ----------
test("circe: CLI does not register the projection as a canonical artifact", () => {
  runCli(["intent", "bundle", "write", "--root", cliRoot, "--prepared-plan", "PreparedIntentPlan:pip-seed"]);
  // The projection lives under the bundle, never as a registered WorkOrder / VerificationPlan artifact.
  const wo = runCli(["artifacts", "latest", "--root", cliRoot, "--type", "WorkOrder", "--allow-missing", "--json"]);
  assert.equal(JSON.parse(wo.stdout).artifact, null);
  const validate = runCli(["artifacts", "validate", "--root", cliRoot, "--json"]);
  assert.equal(JSON.parse(validate.stdout).valid, true);
});
