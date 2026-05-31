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
        { id: "phase:investigate", title: "Investigate", kind: "investigate", paths: ["src/app.ts"] },
        { id: "phase:modify", title: "Modify", kind: "modify", paths: ["src/app.ts"] },
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
