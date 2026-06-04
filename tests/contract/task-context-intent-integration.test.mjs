// Contract tests for TaskContextReport intent integration (slice 171). Exercises
// the pure `selectTaskContextReports` selector, the assess + plan-review builder
// enrichment, and the `rekon intent assess` / `rekon intent plan review`
// `--task-context` CLI surface. Task context is proposal/context, not proof: it
// enriches matched context / revision grounding / warnings but never flips
// readiness, never suppresses a deterministic blocker, never makes a weak plan
// actionable, never executes a hint, and never creates a PreparedIntentPlan /
// WorkOrder / VerificationPlan or writes source.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import test from "node:test";

import {
  selectTaskContextReports,
  buildIntentAssessmentReport,
  buildIntentPlanActionabilityReport,
} from "@rekon/capability-model";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const CLI = resolve(repoRoot, "packages/cli/dist/index.js");

const ALL_FALSE = {
  retrievalIsProof: false,
  approvedPlans: false,
  executedCommands: false,
  wroteSourceFiles: false,
  createdPreparedIntentPlan: false,
  createdWorkOrder: false,
  createdVerificationPlan: false,
  ranCirce: false,
  implementedIntentGo: false,
};
const REF = (id) => ({ type: "TaskContextReport", id, path: `.rekon/${id}.json`, digest: "sha256:abc", schemaVersion: "0.1.0" });
const makeReport = (over = {}) => ({
  task: { text: "Add a marker export to src/index.ts", paths: ["src/index.ts"] },
  selection: { provider: "mock", model: "mock-embedding", topK: 8 },
  contextItems: [{ path: "src/index.ts", capabilityId: "cap:get:user", source: "deterministic_graph", reason: "exposes marker" }],
  doNotTouch: [{ reason: "Do not change greet behavior." }],
  verificationHints: [{ artifact: "manual-verification", reason: "verify marker behavior" }],
  summary: { embeddingNeighbors: 0, contextItems: 1 },
  boundaries: { ...ALL_FALSE },
  ...over,
});

const ASSESS_HEADER = {
  artifactType: "IntentAssessmentReport",
  artifactId: "intent-assessment-report-test",
  schemaVersion: "0.1.0",
  generatedAt: "2026-01-01T00:00:00.000Z",
  subject: { repoId: "." },
  producer: { id: "test", version: "0" },
  inputRefs: [],
  freshness: { status: "fresh" },
};
const assessWith = (selection, request = { goal: "Add a marker export to src/index.ts", kind: "feature", scope: {} }) =>
  buildIntentAssessmentReport({ header: ASSESS_HEADER, request, taskContext: selection });

// ---- selector (1-5) ----

// 1
test("selection helper uses explicit ref", () => {
  const sel = selectTaskContextReports({ reports: [{ report: makeReport(), ref: REF("a") }], mode: "explicit", goal: "marker export" });
  assert.equal(sel.usedReports.length, 1);
  assert.equal(sel.usedReports[0].ref.id, "a");
});

// 2
test("selection helper can select latest relevant report", () => {
  const sel = selectTaskContextReports({
    reports: [{ report: makeReport(), ref: REF("a") }, { report: makeReport(), ref: REF("b") }],
    mode: "latest",
    goal: "marker export",
    planText: "src/index.ts",
    requestedPaths: ["src/index.ts"],
  });
  assert.equal(sel.usedReports.length, 1);
});

// 3
test("boundary-invalid report is rejected (warned/skipped)", () => {
  const sel = selectTaskContextReports({
    reports: [{ report: makeReport({ boundaries: { ...ALL_FALSE, executedCommands: true } }), ref: REF("a") }],
    mode: "explicit",
    goal: "marker",
  });
  assert.equal(sel.usedReports.length, 0);
  assert.ok(sel.staleReports.some((s) => s.reason === "boundaries-not-clean"));
});

// 4
test("irrelevant report is warned/skipped", () => {
  const sel = selectTaskContextReports({
    reports: [{ report: makeReport({ task: { text: "qqq www eee", paths: ["src/other.ts"] } }), ref: REF("a") }],
    mode: "latest",
    goal: "alpha beta gamma",
    planText: "delta epsilon zeta",
    requestedPaths: ["src/elsewhere.ts"],
  });
  assert.equal(sel.usedReports.length, 0);
  assert.ok(sel.staleReports.some((s) => s.reason === "not-relevant"));
  assert.ok(sel.warnings.length > 0);
});

// 5
test("empty-context report warns but does not fail", () => {
  const sel = selectTaskContextReports({
    reports: [{ report: makeReport({ contextItems: [], summary: { embeddingNeighbors: 0, contextItems: 0 } }), ref: REF("a") }],
    mode: "explicit",
    goal: "marker export src/index.ts",
  });
  assert.equal(sel.usedReports.length, 1);
  assert.ok(sel.warnings.some((w) => /no context items/i.test(w)));
});

// ---- assess builder (8b/9/10/11/12) ----

const builderSelection = selectTaskContextReports({
  reports: [{ report: makeReport(), ref: REF("tcr-1") }],
  mode: "explicit",
  goal: "Add a marker export to src/index.ts",
  requestedPaths: ["src/index.ts"],
});

// 9
test("intent assess matchedContext includes task context path + capability", () => {
  const report = assessWith(builderSelection);
  assert.ok(report.matchedContext.paths.includes("src/index.ts"));
  assert.ok(report.matchedContext.capabilities.includes("cap:get:user"));
});

// 10
test("intent assess readiness is not made ready solely by task context", () => {
  const report = assessWith(builderSelection); // missing spine → blocked
  assert.notEqual(report.readiness.status, "ready-for-prepare");
  assert.equal(report.readiness.status, "blocked");
});

// 11
test("intent assess does not suppress deterministic blockers", () => {
  const withoutContext = assessWith(undefined);
  const withContext = assessWith(builderSelection);
  assert.ok(withContext.blockers.length >= withoutContext.blockers.length);
  assert.ok(withContext.blockers.length > 0);
});

// 12
test("intent assess surfaces retrieval-low-signal as warning", () => {
  const report = assessWith(builderSelection);
  assert.ok(report.warnings.some((w) => w.message.includes("retrieval-low-signal")));
});

// ---- plan review builder (15-19, 24) ----

const reviewWith = async (selection) =>
  buildIntentPlanActionabilityReport({
    planText: "# Add marker\n\nAdd a marker export to src/index.ts.\n",
    goal: "Add a marker export to src/index.ts",
    taskContext: selection,
  });

// 15
test("intent plan review revisionPrompt includes task-context grounding", async () => {
  const report = await reviewWith(builderSelection);
  assert.ok(report.revisionPrompt.prompt.includes("Task context (proposal/context, not proof)"));
  assert.ok(report.revisionPrompt.prompt.includes("src/index.ts"));
});

// 16
test("intent plan review revisionPrompt includes do-not-touch guidance", async () => {
  const report = await reviewWith(builderSelection);
  assert.match(report.revisionPrompt.prompt, /do-not-touch/i);
  assert.ok(report.revisionPrompt.prompt.includes("Do not change greet behavior."));
});

// 17
test("intent plan review revisionPrompt includes verification hint guidance", async () => {
  const report = await reviewWith(builderSelection);
  assert.ok(report.revisionPrompt.prompt.includes("verification hints"));
  assert.ok(report.revisionPrompt.prompt.includes("manual-verification"));
});

// 18
test("intent plan review does not become actionable solely because task context exists", async () => {
  const withoutContext = await reviewWith(undefined);
  const withContext = await reviewWith(builderSelection);
  assert.equal(withContext.status.value, withoutContext.status.value);
  assert.notEqual(withContext.status.value, "actionable");
});

// 19
test("manual-verification hint is not converted into a command requirement", async () => {
  const report = await reviewWith(builderSelection);
  assert.ok(!report.findings.some((f) => String(f.suggestedFix ?? "").includes("manual-verification")));
  assert.ok(report.revisionPrompt.prompt.includes("hint, not an executed command"));
});

// 24
test("no commands are executed (boundaries stay false)", async () => {
  const report = await reviewWith(builderSelection);
  assert.equal(report.boundaries.executedCommands, false);
  assert.equal(report.boundaries.ranCirce, false);
});

// ---- CLI end-to-end (6,7,8,13,14,20,21,22,23,25,26,27,28) ----

function runCli(args, { cwd } = {}) {
  try {
    const stdout = execFileSync("node", [CLI, ...args], {
      cwd: cwd ?? repoRoot,
      encoding: "utf8",
      env: { ...process.env, VOYAGE_API_KEY: "", OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "" },
    });
    return { status: 0, stdout, stderr: "" };
  } catch (error) {
    return { status: error.status ?? 1, stdout: error.stdout ?? "", stderr: error.stderr ?? "" };
  }
}

function rekonArtifactTypes(root) {
  const types = new Set();
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".json")) {
        try {
          const type = JSON.parse(readFileSync(full, "utf8"))?.header?.artifactType;
          if (typeof type === "string") types.add(type);
        } catch {
          /* ignore */
        }
      }
    }
  };
  const rekonDir = join(root, ".rekon");
  if (existsSync(rekonDir)) walk(rekonDir);
  return types;
}

function setupFixture() {
  const dir = mkdtempSync(join(tmpdir(), "rekon-task-context-intent-"));
  const root = join(dir, "fixture");
  mkdirSync(join(root, "src"), { recursive: true });
  mkdirSync(join(root, "plans"), { recursive: true });
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({ name: "fx", version: "0.0.0", type: "module", scripts: { typecheck: "tsc --noEmit", test: "node --test" } }, null, 2),
  );
  writeFileSync(
    join(root, "src", "index.ts"),
    'export const existing = "ok";\nexport function greet(name) { return `hello ${name}`; }\nexport function marker() { return "marker"; }\n',
  );
  writeFileSync(join(root, "plans", "rough.md"), "# Add marker export\n\nAdd a marker export to src/index.ts.\n\nDo not change greet behavior.\n\nVerify marker behavior.\n");
  execFileSync("git", ["init", "-q"], { cwd: root });
  execFileSync("git", ["-c", "user.email=t@e.x", "-c", "user.name=t", "add", "-A"], { cwd: root });
  execFileSync("git", ["-c", "user.email=t@e.x", "-c", "user.name=t", "commit", "-qm", "init"], { cwd: root });
  runCli(["capability", "graph", "build", "--root", root, "--json"]);
  runCli(["context", "task", "--root", root, "--task", "Add a marker export to src/index.ts. Do not change greet behavior. Verify marker behavior.", "--path", "src/index.ts", "--json"]);
  return root;
}

const cliRoot = setupFixture();
const taskRef = runCli(["artifacts", "latest", "--root", cliRoot, "--type", "TaskContextReport", "--id-only"]).stdout.trim();
const assessResult = runCli(["intent", "assess", "--root", cliRoot, "--goal", "Add a marker export to src/index.ts.", "--kind", "feature", "--path", "src/index.ts", "--task-context-ref", taskRef, "--json"]);
const assessJson = JSON.parse(assessResult.stdout);
const reviewResult = runCli(["intent", "plan", "review", "--root", cliRoot, "--plan", join(cliRoot, "plans", "rough.md"), "--goal", "Add a marker export to src/index.ts.", "--semantic", "off", "--task-context-ref", taskRef, "--json"]);
const reviewJson = JSON.parse(reviewResult.stdout);
const cliTypes = rekonArtifactTypes(cliRoot);

// 6
test("intent assess with task-context ref succeeds", () => {
  assert.equal(assessResult.status, 0);
  assert.equal(assessJson.artifact.type, "IntentAssessmentReport");
});

// 7
test("intent assess JSON reports taskContext.used", () => {
  assert.ok(assessJson.taskContext);
  assert.equal(assessJson.taskContext.used, 1);
});

// 8
test("intent assess matchedContext includes task context path (CLI)", () => {
  assert.ok(assessJson.matchedContext.paths.includes("src/index.ts"));
});

// 13
test("intent plan review with task-context ref succeeds", () => {
  assert.equal(reviewResult.status, 0);
  assert.equal(reviewJson.artifact.type, "IntentPlanActionabilityReport");
});

// 14
test("intent plan review JSON reports taskContext.used", () => {
  assert.ok(reviewJson.taskContext);
  assert.equal(reviewJson.taskContext.used, 1);
});

// 20
test("missing task-context ref fails cleanly", () => {
  const result = runCli(["intent", "assess", "--root", cliRoot, "--goal", "x", "--task-context-ref", "does-not-exist", "--json"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr || result.stdout, /could not resolve --task-context-ref/);
});

// 21
test("no PreparedIntentPlan is created by context consumption", () => {
  assert.ok(!cliTypes.has("PreparedIntentPlan"));
});

// 22
test("no WorkOrder is created", () => {
  assert.ok(!cliTypes.has("WorkOrder"));
});

// 23
test("no VerificationPlan is created", () => {
  assert.ok(!cliTypes.has("VerificationPlan"));
});

// 25
test("no source files are written", () => {
  const changed = execFileSync("git", ["status", "--porcelain"], { cwd: cliRoot, encoding: "utf8" })
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !line.includes(".rekon/"));
  assert.deepEqual(changed, []);
});

// 26
test("artifacts validate clean", () => {
  const validate = JSON.parse(runCli(["artifacts", "validate", "--root", cliRoot, "--json"]).stdout);
  assert.equal(validate.valid, true);
});

// 27
test("help lists --task-context", () => {
  assert.ok(runCli(["--help"]).stdout.includes("--task-context "));
});

// 28
test("help lists --task-context-ref", () => {
  assert.ok(runCli(["--help"]).stdout.includes("--task-context-ref"));
});
