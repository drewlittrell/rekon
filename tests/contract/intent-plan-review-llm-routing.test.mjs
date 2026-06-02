// Intent Plan Review × LLM Provider Routing (slice 138).
//
// CLI-level: --semantic off|auto|required behavior with no live provider
// registered (off → deterministic, auto+missing → deterministic-fallback with a
// report, required+missing → non-zero exit and NO report). Helper-level: the
// router + mock provider produce a semantic-llm trace, schema-invalid output is
// rejected to fallback, and provider output is re-checked into actionability
// findings. Provider output is a proposal, not proof.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { buildIntentPlanActionabilityReport } from "../../packages/capability-model/dist/index.js";
import { RekonLlmRouter, createMockLlmProvider, coercePhaseDrafts } from "../../packages/llm-provider/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");

const SRC = 'export const existing = "ok";\n';
const PLAN = "# Add marker export\n\nMaybe add a marker export somewhere.\n\nTODO: decide the file and verification.\n";
const GOAL = "Add a marker export to src/index.ts.";

// A complete IntentPlanPhaseDraft, as a semantic provider would return.
const draft = (id) => ({
  id,
  order: 1,
  title: "Add marker export",
  kind: "modify",
  objective: "Export a marker constant from src/index.ts while preserving greet.",
  deliverables: ["A marker export"],
  acceptanceCriteria: ["greet behavior unchanged"],
  touchedPaths: ["src/index.ts"],
  verificationCommands: ["npm test"],
  evidenceArtifacts: [],
  constraints: [],
  sourceEvidence: [],
  actionability: { status: "actionable", satisfiedRequirements: [], missingRequirements: [] },
});

function makeRepo() {
  const TMP = mkdtempSync(join(tmpdir(), "rekon-llm-routing-"));
  const ROOT = join(TMP, "repo");
  mkdirSync(join(ROOT, "plans"), { recursive: true });
  mkdirSync(join(ROOT, "src"), { recursive: true });
  writeFileSync(join(ROOT, "package.json"), JSON.stringify({ name: "repo", version: "0.0.0", type: "module", scripts: { typecheck: "tsc --noEmit", test: "node --test", build: "echo build" } }, null, 2) + "\n");
  writeFileSync(join(ROOT, "src/index.ts"), SRC);
  writeFileSync(join(ROOT, "plans/rough.md"), PLAN);
  return ROOT;
}
const cli = (ROOT, args) => spawnSync(process.execPath, [cliPath, ...args, "--root", ROOT], { encoding: "utf8" });
const reviewArgs = (ROOT, extra) => ["intent", "plan", "review", "--plan", join(ROOT, "plans/rough.md"), "--goal", GOAL, "--json", ...extra];
const listCount = (ROOT, type) => {
  const out = spawnSync(process.execPath, [cliPath, "artifacts", "list", "--root", ROOT, "--type", type, "--json"], { encoding: "utf8" }).stdout;
  try { const j = JSON.parse(out); return Array.isArray(j.artifacts) ? j.artifacts.length : Array.isArray(j) ? j.length : 0; } catch { return 0; }
};
const latestRef = (ROOT, type) => spawnSync(process.execPath, [cliPath, "artifacts", "latest", "--root", ROOT, "--type", type, "--id-only"], { encoding: "utf8" }).stdout.trim();
const body = (ROOT, ref) => JSON.parse(spawnSync(process.execPath, [cliPath, "artifacts", "show", "--root", ROOT, ref, "--json"], { encoding: "utf8" }).stdout).artifact;
// Minimal router-bound adapter mirroring the CLI bridge, for helper-level tests.
function makeAdapter(router, mode, override = {}) {
  return async ({ planText, goal }) => {
    const routed = await router.completeJson({ task: "plan.semantic-normalize", schemaName: "IntentPlanSemanticNormalizationResult", prompt: `${goal}\n${planText}` }, { ...override, mode });
    if (!routed.ok) { if (mode === "required") throw new Error(routed.error); return { phases: [] }; }
    const phases = coercePhaseDrafts(routed.result.data);
    if (!phases) { if (mode === "required") throw new Error("no usable phases"); return { phases: [] }; }
    return { phases, ...(routed.result.provider ? { provider: routed.result.provider } : {}), ...(routed.result.model ? { model: routed.result.model } : {}) };
  };
}

test("1. --semantic off writes a deterministic report", () => {
  const ROOT = makeRepo();
  const res = cli(ROOT, reviewArgs(ROOT, ["--semantic", "off"]));
  assert.equal(res.status, 0, res.stderr);
  assert.equal(listCount(ROOT, "IntentPlanActionabilityReport"), 1);
});

test("2. --semantic auto + missing provider falls back deterministically and writes a report with a warning", () => {
  const ROOT = makeRepo();
  const res = cli(ROOT, reviewArgs(ROOT, ["--semantic", "auto", "--llm-provider", "missing"]));
  assert.equal(res.status, 0, res.stderr);
  assert.equal(listCount(ROOT, "IntentPlanActionabilityReport"), 1);
  const report = body(ROOT, latestRef(ROOT, "IntentPlanActionabilityReport"));
  assert.equal(report.normalizationTrace.method, "deterministic-fallback");
  assert.ok(report.normalizationTrace.warnings.length > 0);
});

test("3. --semantic required + missing provider exits non-zero and writes no report", () => {
  const ROOT = makeRepo();
  const res = cli(ROOT, reviewArgs(ROOT, ["--semantic", "required", "--llm-provider", "missing"]));
  assert.notEqual(res.status, 0);
  assert.equal(listCount(ROOT, "IntentPlanActionabilityReport"), 0);
});

test("4. CLI help lists --llm-provider", () => {
  const res = spawnSync(process.execPath, [cliPath, "help"], { encoding: "utf8" });
  assert.ok(`${res.stdout}${res.stderr}`.includes("--llm-provider"));
});

test("5. CLI help lists --llm-model", () => {
  const res = spawnSync(process.execPath, [cliPath, "help"], { encoding: "utf8" });
  assert.ok(`${res.stdout}${res.stderr}`.includes("--llm-model"));
});

test("6. router + mock integration produces a semantic-llm trace (helper level)", async () => {
  const router = new RekonLlmRouter({ providers: [createMockLlmProvider({ id: "mock", model: "mock-1", data: { phases: [draft("phase:1")] } })] });
  const report = await buildIntentPlanActionabilityReport({ planText: PLAN, goal: GOAL, semanticMode: "auto", semanticNormalization: makeAdapter(router, "auto", { provider: "mock" }) });
  assert.equal(report.normalizationTrace.method, "semantic-llm");
  assert.equal(report.normalizationTrace.provider, "mock");
  assert.equal(report.normalizationTrace.model, "mock-1");
});

test("7. schema-invalid provider output is rejected to deterministic-fallback (helper level)", async () => {
  const router = new RekonLlmRouter({ providers: [createMockLlmProvider({ id: "mock", data: { nope: true } })] });
  const report = await buildIntentPlanActionabilityReport({ planText: PLAN, goal: GOAL, semanticMode: "auto", semanticNormalization: makeAdapter(router, "auto", { provider: "mock" }) });
  assert.equal(report.normalizationTrace.method, "deterministic-fallback");
});

test("8. provider output is re-checked into normal actionability findings (helper level)", async () => {
  const router = new RekonLlmRouter({ providers: [createMockLlmProvider({ id: "mock", data: { phases: [draft("phase:1")] } })] });
  const report = await buildIntentPlanActionabilityReport({ planText: PLAN, goal: GOAL, semanticMode: "auto", semanticNormalization: makeAdapter(router, "auto", { provider: "mock" }) });
  assert.ok(Array.isArray(report.normalizedPhases) && report.normalizedPhases.length > 0);
  assert.ok(Array.isArray(report.findings));
  assert.ok(["actionable", "needs-revision", "blocked"].includes(report.status.value));
});

test("9. semantic plan review creates no PreparedIntentPlan", () => {
  const ROOT = makeRepo();
  cli(ROOT, reviewArgs(ROOT, ["--semantic", "auto", "--llm-provider", "missing"]));
  assert.equal(listCount(ROOT, "PreparedIntentPlan"), 0);
});

test("10. semantic plan review creates no WorkOrder / VerificationPlan", () => {
  const ROOT = makeRepo();
  cli(ROOT, reviewArgs(ROOT, ["--semantic", "auto", "--llm-provider", "missing"]));
  assert.equal(listCount(ROOT, "WorkOrder"), 0);
  assert.equal(listCount(ROOT, "VerificationPlan"), 0);
});

test("11. no commands are executed: no VerificationRun / VerificationResult", () => {
  const ROOT = makeRepo();
  cli(ROOT, reviewArgs(ROOT, ["--semantic", "auto", "--llm-provider", "missing"]));
  assert.equal(listCount(ROOT, "VerificationRun"), 0);
  assert.equal(listCount(ROOT, "VerificationResult"), 0);
});

test("12. no source files are written by semantic plan review", () => {
  const ROOT = makeRepo();
  cli(ROOT, reviewArgs(ROOT, ["--semantic", "auto", "--llm-provider", "missing"]));
  cli(ROOT, reviewArgs(ROOT, ["--semantic", "off"]));
  assert.equal(readFileSync(join(ROOT, "src/index.ts"), "utf8"), SRC);
  assert.equal(readFileSync(join(ROOT, "plans/rough.md"), "utf8"), PLAN);
});
