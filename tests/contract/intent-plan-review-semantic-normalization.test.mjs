// Intent Plan Compiler Semantic Normalization (slice 139).
//
// CLI-level: --semantic off|auto|required with the real OpenAI-compatible
// provider registered but with NO API key (off → deterministic; auto+openai →
// deterministic-fallback report; required+openai → non-zero exit and NO report).
// Helper-level: the router + the real createOpenAiLlmProvider (injected fetch,
// no network) produces a semantic-llm normalizationTrace that is then
// deterministically re-checked; invalid provider output falls back (auto) or
// blocks (required). Provider output is a proposal, not proof — it never writes
// source, executes commands, or creates downstream artifacts.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { buildIntentPlanActionabilityReport } from "../../packages/capability-model/dist/index.js";
import { RekonLlmRouter, coercePhaseDrafts, createOpenAiLlmProvider } from "../../packages/llm-provider/dist/index.js";

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
  objective: "Export a marker constant from src/index.ts while preserving existing behavior.",
  deliverables: ["A marker export"],
  acceptanceCriteria: ["existing behavior unchanged"],
  touchedPaths: ["src/index.ts"],
  verificationCommands: ["npm test"],
  evidenceArtifacts: [],
  constraints: [],
  sourceEvidence: [],
  actionability: { status: "actionable", satisfiedRequirements: [], missingRequirements: [] },
});

function makeRepo() {
  const TMP = mkdtempSync(join(tmpdir(), "rekon-semnorm-"));
  const ROOT = join(TMP, "repo");
  mkdirSync(join(ROOT, "plans"), { recursive: true });
  mkdirSync(join(ROOT, "src"), { recursive: true });
  writeFileSync(
    join(ROOT, "package.json"),
    JSON.stringify({ name: "repo", version: "0.0.0", type: "module", scripts: { typecheck: "tsc --noEmit", test: "node --test", build: "echo build" } }, null, 2) + "\n",
  );
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

// A fake fetch returning a canned OpenAI chat-completions envelope (no network).
const okFetch = (data, model = "gpt-x") => async () => ({
  ok: true,
  status: 200,
  async text() {
    return JSON.stringify({ model, choices: [{ message: { content: JSON.stringify(data) } }], usage: { prompt_tokens: 3, completion_tokens: 4 } });
  },
});
const keyedOpenAi = (data) => createOpenAiLlmProvider({ apiKey: "test-key", fetchImpl: okFetch(data) });

test("1. --semantic off stays deterministic and writes a report", () => {
  const ROOT = makeRepo();
  const res = cli(ROOT, reviewArgs(ROOT, ["--semantic", "off"]));
  assert.equal(res.status, 0, res.stderr);
  assert.equal(listCount(ROOT, "IntentPlanActionabilityReport"), 1);
  const report = body(ROOT, latestRef(ROOT, "IntentPlanActionabilityReport"));
  assert.notEqual(report.normalizationTrace.method, "semantic-llm");
  assert.equal(report.normalizationTrace.invokedSemanticNormalization, false);
});

test("2. --semantic auto with the real provider but no key falls back and writes a report", () => {
  const ROOT = makeRepo();
  const res = cli(ROOT, reviewArgs(ROOT, ["--semantic", "auto", "--llm-provider", "openai"]));
  assert.equal(res.status, 0, res.stderr);
  assert.equal(listCount(ROOT, "IntentPlanActionabilityReport"), 1);
  const report = body(ROOT, latestRef(ROOT, "IntentPlanActionabilityReport"));
  assert.equal(report.normalizationTrace.method, "deterministic-fallback");
  assert.ok(report.normalizationTrace.warnings.length > 0);
});

test("3. --semantic required with the real provider but no key exits non-zero and writes no report", () => {
  const ROOT = makeRepo();
  const res = cli(ROOT, reviewArgs(ROOT, ["--semantic", "required", "--llm-provider", "openai"]));
  assert.notEqual(res.status, 0);
  assert.equal(listCount(ROOT, "IntentPlanActionabilityReport"), 0);
});

test("4. --llm-provider openai is honored (parsed, routed, run completes)", () => {
  const ROOT = makeRepo();
  const res = cli(ROOT, reviewArgs(ROOT, ["--semantic", "auto", "--llm-provider", "openai"]));
  assert.equal(res.status, 0, res.stderr);
  assert.equal(listCount(ROOT, "IntentPlanActionabilityReport"), 1);
});

test("5. --llm-model is accepted alongside --llm-provider", () => {
  const ROOT = makeRepo();
  const res = cli(ROOT, reviewArgs(ROOT, ["--semantic", "auto", "--llm-provider", "openai", "--llm-model", "gpt-test"]));
  assert.equal(res.status, 0, res.stderr);
  assert.equal(listCount(ROOT, "IntentPlanActionabilityReport"), 1);
});

test("6. the real OpenAI provider (injected fetch) produces a semantic-llm trace", async () => {
  const router = new RekonLlmRouter({ providers: [keyedOpenAi({ phases: [draft("phase:1")] })] });
  const report = await buildIntentPlanActionabilityReport({ planText: PLAN, goal: GOAL, semanticMode: "auto", semanticNormalization: makeAdapter(router, "auto", { provider: "openai" }) });
  assert.equal(report.normalizationTrace.method, "semantic-llm");
  assert.equal(report.normalizationTrace.provider, "openai");
  assert.equal(report.normalizationTrace.model, "gpt-x");
});

test("7. provider phases are deterministically re-checked into actionability findings", async () => {
  const router = new RekonLlmRouter({ providers: [keyedOpenAi({ phases: [draft("phase:1")] })] });
  const report = await buildIntentPlanActionabilityReport({ planText: PLAN, goal: GOAL, semanticMode: "auto", semanticNormalization: makeAdapter(router, "auto", { provider: "openai" }) });
  assert.ok(Array.isArray(report.normalizedPhases) && report.normalizedPhases.length > 0);
  assert.ok(Array.isArray(report.findings));
  assert.ok(["actionable", "needs-revision", "blocked"].includes(report.status.value));
});

test("8. invalid provider output falls back to deterministic parsing in auto mode", async () => {
  const router = new RekonLlmRouter({ providers: [keyedOpenAi({ nope: true })] });
  const report = await buildIntentPlanActionabilityReport({ planText: PLAN, goal: GOAL, semanticMode: "auto", semanticNormalization: makeAdapter(router, "auto", { provider: "openai" }) });
  assert.equal(report.normalizationTrace.method, "deterministic-fallback");
});

test("9. invalid provider output blocks the build in required mode", async () => {
  const router = new RekonLlmRouter({ providers: [keyedOpenAi({ nope: true })] });
  await assert.rejects(() =>
    buildIntentPlanActionabilityReport({ planText: PLAN, goal: GOAL, semanticMode: "required", semanticNormalization: makeAdapter(router, "required", { provider: "openai" }) }),
  );
});

test("10. semantic plan review creates no PreparedIntentPlan", () => {
  const ROOT = makeRepo();
  cli(ROOT, reviewArgs(ROOT, ["--semantic", "auto", "--llm-provider", "openai"]));
  assert.equal(listCount(ROOT, "PreparedIntentPlan"), 0);
});

test("11. semantic plan review creates no WorkOrder / VerificationPlan", () => {
  const ROOT = makeRepo();
  cli(ROOT, reviewArgs(ROOT, ["--semantic", "auto", "--llm-provider", "openai"]));
  assert.equal(listCount(ROOT, "WorkOrder"), 0);
  assert.equal(listCount(ROOT, "VerificationPlan"), 0);
});

test("12. semantic plan review executes no commands: no VerificationRun / VerificationResult", () => {
  const ROOT = makeRepo();
  cli(ROOT, reviewArgs(ROOT, ["--semantic", "auto", "--llm-provider", "openai"]));
  assert.equal(listCount(ROOT, "VerificationRun"), 0);
  assert.equal(listCount(ROOT, "VerificationResult"), 0);
});

test("13. semantic plan review writes no source or plan files", () => {
  const ROOT = makeRepo();
  cli(ROOT, reviewArgs(ROOT, ["--semantic", "required", "--llm-provider", "openai"]));
  cli(ROOT, reviewArgs(ROOT, ["--semantic", "auto", "--llm-provider", "openai"]));
  assert.equal(readFileSync(join(ROOT, "src/index.ts"), "utf8"), SRC);
  assert.equal(readFileSync(join(ROOT, "plans/rough.md"), "utf8"), PLAN);
});
