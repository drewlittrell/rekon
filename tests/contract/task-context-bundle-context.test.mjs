// Contract test for TaskContextReport Bundle Context Implementation (slice 183).
//
// `rekon intent bundle write --task-context-ref <TaskContextReport ref>` attaches a
// TaskContextReport to an intent plan bundle as OPTIONAL context — never proof,
// never required. This test replays the full operator path keyless against the
// built CLI, writes the bundle WITH an explicit task-context ref, and asserts the
// new surfaces:
//   - additive `manifest.context.taskContextReports[]` (role: optional-agent-context,
//     proof: false, markdown/agentJson sidecars)
//   - three `context/` sidecars (markdown brief, agent JSON with agentContext, refs)
//   - the markdown is framed as optional guidance, not proof
//   - the Circe handoff / phase-plan / rekon-proof projection is UNCHANGED and never
//     carries task context (proof boundary intact)
//   - WorkOrder / VerificationPlan gate files are unchanged by task context
//   - the bundle JSON reports the sidecars with proof: false
//   - a missing or wrong-type ref fails cleanly
//   - no source / plan write, no command execution, no intent:go
//   - a fresh bundle WITHOUT a task-context ref carries no `context/` sidecars
//   - `rekon help` lists the new flag and states it is not proof
//
// Keyless: no live provider is contacted.

import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const CLI = resolve(repoRoot, "packages/cli/dist/index.js");

const KEYLESS_ENV = { ...process.env };
for (const key of [
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "VOYAGE_API_KEY",
  "REKON_RUN_LIVE_LLM_TESTS",
  "REKON_RUN_LIVE_EMBEDDING_TESTS",
]) {
  delete KEYLESS_ENV[key];
}

function runCli(args, { cwd, allowFail = false } = {}) {
  try {
    const stdout = execFileSync("node", [CLI, ...args], {
      cwd: cwd ?? repoRoot,
      env: KEYLESS_ENV,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { stdout, status: 0 };
  } catch (error) {
    if (allowFail) return { stdout: error.stdout ?? "", stderr: error.stderr ?? "", status: error.status ?? 1 };
    throw new Error(`CLI failed: rekon ${args.join(" ")}\n${error.stdout ?? ""}\n${error.stderr ?? ""}`);
  }
}

const json = (text) => JSON.parse(text);
function latest(root, type) {
  return runCli(["artifacts", "latest", "--root", root, "--type", type, "--id-only"]).stdout.trim();
}
function latestOrEmpty(root, type) {
  const result = runCli(["artifacts", "latest", "--root", root, "--type", type, "--id-only"], { allowFail: true });
  if (result.status !== 0) return "";
  return result.stdout.trim();
}
function gitInit(root) {
  execFileSync("git", ["init", "-q"], { cwd: root });
  execFileSync("git", ["-c", "user.email=t@e.x", "-c", "user.name=t", "add", "-A"], { cwd: root });
  execFileSync("git", ["-c", "user.email=t@e.x", "-c", "user.name=t", "commit", "-qm", "init"], { cwd: root });
}
function porcelain(root, paths) {
  return execFileSync("git", ["status", "--porcelain", "--", ...paths], { cwd: root, encoding: "utf8" }).trim();
}
function readArtifact(root, ref) {
  const [type, id] = ref.split(":");
  const base = join(root, ".rekon", "artifacts");
  for (const cat of readdirSync(base)) {
    const f = join(base, cat, `${type}-${id}.json`);
    if (existsSync(f)) return json(readFileSync(f, "utf8"));
  }
  throw new Error(`artifact not found on disk: ${ref}`);
}

// ---------------------------------------------------------------------------
// Scenario WITH — full operator path, bundle write with an explicit task-context
// ref. Mirrors the task-context intent dogfood path through approve + work-ready.
// ---------------------------------------------------------------------------
function runWith() {
  const root = mkdtempSync(join(tmpdir(), "tcbc-with-"));
  mkdirSync(join(root, "src"), { recursive: true });
  mkdirSync(join(root, "plans"), { recursive: true });
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify(
      { name: "tcbc", version: "0.0.0", type: "module", scripts: { typecheck: "tsc --noEmit", test: "node --test", build: "echo build" } },
      null,
      2,
    ),
  );
  writeFileSync(join(root, "src", "index.ts"), 'export const existing = "ok";\n\nexport function greet(name: string): string {\n  return `hello ${name}`;\n}\n');
  writeFileSync(join(root, "plans", "rough.md"), "# Add marker export\n\nAdd a marker export to src/index.ts.\n\nDo not change greet behavior.\n\nVerify marker behavior.\n");
  gitInit(root);

  runCli(["scan", "--root", root, "--json"]);
  runCli(["intent", "context", "prepare", "--root", root, "--json"]);
  runCli(["capability", "graph", "build", "--root", root, "--json"]);
  runCli([
    "context", "task", "--root", root,
    "--task", "Add a marker export to src/index.ts. Do not change greet behavior. Verify marker behavior.",
    "--path", "src/index.ts", "--json",
  ]);
  const taskRef = latest(root, "TaskContextReport");

  runCli([
    "intent", "assess", "--root", root, "--goal", "Add a marker export to src/index.ts.",
    "--kind", "feature", "--path", "src/index.ts", "--task-context-ref", taskRef, "--json",
  ]);
  runCli([
    "intent", "plan", "review", "--root", root, "--plan", join(root, "plans", "rough.md"),
    "--goal", "Add a marker export to src/index.ts.", "--semantic", "off", "--task-context-ref", taskRef, "--json",
  ]);

  const reportRef = latest(root, "IntentPlanActionabilityReport");
  const reportArtifact = readArtifact(root, reportRef);
  const questions = (reportArtifact.elicitationQuestions ?? []).map((q) => q.id);
  const answerFor = (id) => {
    if (id.includes("objective")) return "Add an exported marker constant from src/index.ts.";
    if (id.includes("deliverables")) return "Exported marker constant; existing greet behavior preserved.";
    if (id.includes("acceptance")) return "Marker is exported from src/index.ts; greet output unchanged.";
    if (id.includes("verification")) return "npm run typecheck; npm test; npm run build.";
    if (id.includes("contract")) return "Objective: add marker export. Deliverables: marker constant. Acceptance: marker exported and greet unchanged.";
    if (id.includes("evidence")) return "Typecheck and tests pass and the marker export is present in src/index.ts.";
    return "Addressed.";
  };
  const answerArgs = questions.flatMap((id) => ["--answer", `${id}=${answerFor(id)}`]);
  runCli(["intent", "plan", "answer", "--root", root, "--report", reportRef, ...answerArgs, "--json"]);

  const answeredReportRef = latest(root, "IntentPlanActionabilityReport");
  const assessRef = latest(root, "IntentAssessmentReport");
  runCli(["intent", "prepare", "--root", root, "--assessment", assessRef, "--actionability-report", answeredReportRef, "--json"]);

  const preparedRef = latest(root, "PreparedIntentPlan");
  const preparedArtifact = readArtifact(root, preparedRef);
  const acceptedRisks = preparedArtifact.approval?.reasons ?? ["verification-proof-missing", "runtime-drift-unresolved"];

  runCli(["intent", "status", "--root", root, "--prepared-plan", preparedRef, "--json"]);
  const statusRef = latest(root, "IntentStatusReport");

  const acceptArgs = acceptedRisks.flatMap((r) => ["--accept", r]);
  runCli([
    "intent", "approve", "--root", root, "--prepared-plan", preparedRef, "--intent-status", statusRef,
    ...acceptArgs, "--reason", "Bundle-context test accepted known proof gaps for non-executing handoff.", "--accepted-by", "test", "--json",
  ]);
  const approvedRef = latest(root, "PreparedIntentPlan");

  runCli([
    "intent", "status", "transition", "--root", root, "--prepared-plan", approvedRef, "--previous-status", statusRef,
    "--to", "work-ready", "--reason", "Test operator accepted proof gaps; ready to generate handoff artifacts.", "--json",
  ]);
  const workReadyStatusRef = latest(root, "IntentStatusReport");

  runCli(["intent", "work-order", "generate", "--root", root, "--prepared-plan", approvedRef, "--intent-status", workReadyStatusRef, "--json"]);
  runCli(["intent", "verification-plan", "generate", "--root", root, "--prepared-plan", approvedRef, "--intent-status", workReadyStatusRef, "--json"]);

  const bundle = json(
    runCli([
      "intent", "bundle", "write", "--root", root, "--prepared-plan", approvedRef, "--intent-status", workReadyStatusRef,
      "--task-context-ref", taskRef, "--json",
    ]).stdout,
  );
  const validate = json(runCli(["artifacts", "validate", "--root", root, "--json"]).stdout);
  const dirty = porcelain(root, ["src/index.ts", "plans/rough.md"]);

  const bundleDir = join(root, bundle.bundlePath);
  const read = (rel) => readFileSync(join(bundleDir, rel), "utf8");
  const manifest = json(read("manifest.json"));
  const markdown = read("context/task-context.md");
  const agentJson = json(read("context/task-context.agent.json"));
  const refsJson = json(read("context/task-context.refs.json"));
  const circeHandoff = read("circe/handoff.json");
  const workOrderMd = read("work-order.md");
  const verificationPlanMd = read("verification-plan.md");

  return {
    root, taskRef, bundle, validate, dirty, bundleDir,
    manifest, markdown, agentJson, refsJson, circeHandoff, workOrderMd, verificationPlanMd, approvedRef,
  };
}

// ---------------------------------------------------------------------------
// Scenario WITHOUT — a fresh repo with no task-context lineage. A bundle written
// without `--task-context-ref` must carry no `context/` sidecars and no
// `manifest.context`.
// ---------------------------------------------------------------------------
function runWithout() {
  const root = mkdtempSync(join(tmpdir(), "tcbc-none-"));
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "tcbc-none", version: "0.0.0", type: "module" }, null, 2));
  writeFileSync(join(root, "src", "index.ts"), "export const x = 1;\n");
  gitInit(root);
  runCli(["capability", "graph", "build", "--root", root, "--json"]);
  const bundle = json(runCli(["intent", "bundle", "write", "--root", root, "--intent-id", "ctx-none", "--json"]).stdout);
  const bundleDir = join(root, bundle.bundlePath);
  const manifest = json(readFileSync(join(bundleDir, "manifest.json"), "utf8"));
  return { root, bundle, bundleDir, manifest };
}

const W = runWith();
const N = runWithout();

function helpText() {
  const help = spawnSync(process.execPath, [CLI, "help"], { cwd: repoRoot, encoding: "utf8" });
  return `${help.stdout}${help.stderr}`;
}
const HELP = helpText();

// ---------- 1 ----------
test("context task writes a TaskContextReport", () => {
  assert.match(W.taskRef, /^TaskContextReport:/);
});

// ---------- 2 ----------
test("bundle write WITH task context succeeds", () => {
  assert.equal(W.bundle.ok, true);
  assert.ok(typeof W.bundle.bundlePath === "string" && W.bundle.bundlePath.length > 0);
});

// ---------- 3 ----------
test("bundle JSON taskContext.included is true", () => {
  assert.equal(W.bundle.taskContext.included, true);
});

// ---------- 4 ----------
test("bundle JSON taskContext.count is 1 (explicit ref, deduped)", () => {
  assert.equal(W.bundle.taskContext.count, 1);
});

// ---------- 5 ----------
test("bundle JSON taskContext.refs lists the TaskContextReport ref", () => {
  assert.deepEqual(W.bundle.taskContext.refs, [W.taskRef]);
});

// ---------- 6 ----------
test("bundle JSON taskContext.sidecars lists the three context files", () => {
  assert.deepEqual(W.bundle.taskContext.sidecars, [
    "context/task-context.md",
    "context/task-context.agent.json",
    "context/task-context.refs.json",
  ]);
});

// ---------- 7 ----------
test("bundle JSON taskContext.proof is false", () => {
  assert.equal(W.bundle.taskContext.proof, false);
});

// ---------- 8 ----------
test("manifest.context.taskContextReports exists with one entry", () => {
  assert.ok(Array.isArray(W.manifest.context?.taskContextReports));
  assert.equal(W.manifest.context.taskContextReports.length, 1);
});

// ---------- 9 ----------
test("manifest.context entry role is optional-agent-context", () => {
  assert.equal(W.manifest.context.taskContextReports[0].role, "optional-agent-context");
});

// ---------- 10 ----------
test("manifest.context entry proof is false", () => {
  assert.equal(W.manifest.context.taskContextReports[0].proof, false);
});

// ---------- 11 ----------
test("manifest.context entry records markdown + agentJson sidecars", () => {
  const sc = W.manifest.context.taskContextReports[0].sidecars;
  assert.equal(sc.markdown, "context/task-context.md");
  assert.equal(sc.agentJson, "context/task-context.agent.json");
});

// ---------- 12 ----------
test("all three context/ sidecar files exist on disk", () => {
  for (const rel of ["context/task-context.md", "context/task-context.agent.json", "context/task-context.refs.json"]) {
    assert.ok(existsSync(join(W.bundleDir, rel)), `missing ${rel}`);
  }
});

// ---------- 13 ----------
test("markdown frames context as optional guidance, not proof", () => {
  assert.match(W.markdown, /optional guidance, not proof/i);
  assert.match(W.markdown, /Read This Before Editing/i);
});

// ---------- 14 ----------
test("markdown keeps do-not-touch as guidance and hints as not executed", () => {
  assert.match(W.markdown, /Do Not Touch/i);
  assert.match(W.markdown, /guidance, not enforced/i);
  assert.match(W.markdown, /Verification Hints/i);
  assert.match(W.markdown, /hint, not executed/i);
});

// ---------- 15 ----------
test("agent JSON carries agentContext and per-report proof: false", () => {
  const entry = W.agentJson.taskContextReports[0];
  assert.ok(entry.agentContext, "agentContext missing");
  assert.ok(entry.agentContext.task && entry.agentContext.boundaries, "agentContext shape incomplete");
  assert.equal(entry.proof, false);
});

// ---------- 16 ----------
test("agent JSON top-level boundaries are all false", () => {
  const b = W.agentJson.boundaries;
  assert.deepEqual(b, {
    proof: false,
    approvesPlans: false,
    executesCommands: false,
    writesSourceFiles: false,
    runsCirce: false,
    implementsIntentGo: false,
  });
});

// ---------- 17 ----------
test("refs sidecar marks the report optional-agent-context, proof false", () => {
  const entry = W.refsJson.taskContextReports[0];
  assert.equal(entry.role, "optional-agent-context");
  assert.equal(entry.proof, false);
  assert.equal(entry.ref.type, "TaskContextReport");
});

// ---------- 18 ----------
test("circe/handoff.json is present and carries NO task context (proof boundary)", () => {
  assert.ok(existsSync(join(W.bundleDir, "circe/handoff.json")));
  assert.ok(!/task-context|taskContext/i.test(W.circeHandoff), "Circe handoff leaked task context");
});

// ---------- 19 ----------
test("circe phase-plan + rekon-proof projection files remain present", () => {
  assert.ok(existsSync(join(W.bundleDir, "circe/phase-plan.json")));
  assert.ok(existsSync(join(W.bundleDir, "circe/rekon-proof.json")));
});

// ---------- 20 ----------
test("manifest.circe is present and free of task context", () => {
  assert.ok(W.manifest.circe, "manifest.circe missing");
  assert.ok(!/task-context|taskContext/i.test(JSON.stringify(W.manifest.circe)), "manifest.circe leaked task context");
});

// ---------- 21 ----------
test("WorkOrder + VerificationPlan gate files are unchanged by task context", () => {
  assert.ok(existsSync(join(W.bundleDir, "work-order.md")));
  assert.ok(existsSync(join(W.bundleDir, "verification-plan.md")));
  // Task context lives only under context/; gate files never reference the sidecars.
  assert.ok(!W.workOrderMd.includes("context/task-context"), "work-order.md referenced a task-context sidecar");
  assert.ok(!W.verificationPlanMd.includes("context/task-context"), "verification-plan.md referenced a task-context sidecar");
});

// ---------- 22 ----------
test("no source / plan write, no command execution, no intent:go", () => {
  assert.equal(W.dirty, "");
  assert.equal(latestOrEmpty(W.root, "VerificationRun"), "");
  assert.equal(latestOrEmpty(W.root, "IntentGoReport"), "");
});

// ---------- 23 ----------
test("artifacts validate clean after attaching task context", () => {
  assert.equal(W.validate.valid ?? W.validate.ok, true);
});

// ---------- 24 ----------
test("bundle WITHOUT a task-context ref carries no context sidecars", () => {
  assert.equal(N.bundle.ok, true);
  assert.equal(N.bundle.taskContext.included, false);
  assert.ok(!existsSync(join(N.bundleDir, "context")), "context/ dir present without a task-context ref");
  assert.equal(N.manifest.context, undefined);
});

// ---------- 25 ----------
test("unknown --task-context-ref fails cleanly", () => {
  const result = runCli(
    ["intent", "bundle", "write", "--root", W.root, "--intent-id", "fail-unknown", "--task-context-ref", "TaskContextReport:does-not-exist", "--json"],
    { allowFail: true },
  );
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}${result.stderr}`, /Artifact not found/i);
});

// ---------- 26 ----------
test("wrong-type --task-context-ref fails cleanly", () => {
  const result = runCli(
    ["intent", "bundle", "write", "--root", W.root, "--intent-id", "fail-type", "--task-context-ref", W.approvedRef, "--json"],
    { allowFail: true },
  );
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}${result.stderr}`, /must reference a TaskContextReport/i);
});

// ---------- 27 ----------
test("rekon help lists --task-context-ref and states it is not proof", () => {
  assert.ok(HELP.includes("--task-context-ref"), HELP);
  assert.match(HELP, /not proof/i);
});
