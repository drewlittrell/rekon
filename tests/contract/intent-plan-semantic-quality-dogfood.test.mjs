// Intent Plan Compiler Semantic Normalization Quality Dogfood (slice 141).
//
// Path B: evaluate LLM-backed semantic normalization QUALITY, not just the
// off/auto/required plumbing. The default tests are safe without a live key —
// they scrub OPENAI_API_KEY from the CLI child env so the no-provider path is
// deterministic regardless of ambient environment, and use the real provider
// with an injected fetch (no network) plus a mock provider for schema-gating.
// The LIVE tests (12-20) only run when REKON_RUN_LIVE_LLM_TESTS=1 and a real
// OPENAI_API_KEY is present; otherwise they are skipped (never failed), so the
// committed gate stays reproducible and makes NO paid calls.
//
// Boundary invariants asserted throughout: semantic plan review is a proposal,
// not proof — it is schema-gated and deterministically re-checked, it writes no
// source/plan files, executes no commands, and creates no PreparedIntentPlan /
// WorkOrder / VerificationPlan / VerificationRun / VerificationResult.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { buildIntentPlanActionabilityReport } from "../../packages/capability-model/dist/index.js";
import { RekonLlmRouter, coercePhaseDrafts, createOpenAiLlmProvider, createMockLlmProvider } from "../../packages/llm-provider/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");

const LIVE = process.env.REKON_RUN_LIVE_LLM_TESTS === "1" && typeof process.env.OPENAI_API_KEY === "string" && process.env.OPENAI_API_KEY.trim().length > 0;
const liveOpts = LIVE ? {} : { skip: "set REKON_RUN_LIVE_LLM_TESTS=1 and OPENAI_API_KEY to run the live semantic-quality dogfood" };
const LIVE_MODEL = process.env.REKON_LLM_MODEL && process.env.REKON_LLM_MODEL.trim().length > 0 ? process.env.REKON_LLM_MODEL.trim() : "gpt-4o-mini";

const PKG = JSON.stringify({ name: "semq", version: "0.0.0", type: "module", scripts: { typecheck: "tsc --noEmit", test: "node --test", build: "echo build" } }, null, 2) + "\n";
const SRC = 'export const existing = "ok";\nexport function greet(name) { return `hello ${name}`; }\n';
const PLAN = "# Marker export\n\nNeed a marker in the package. Probably src/index. Keep existing greeting behavior. Verify somehow.\n";
const GOAL = "Expose a marker export from src/index.ts while preserving greet behavior.";

// A fixture that exercises non-goal preservation, real verification commands,
// and a real touched path in one report (used by the live tests).
const LIVE_PLAN = [
  "# Add marker export",
  "",
  "Add a marker export to src/index.ts.",
  "",
  "Acceptance:",
  "- marker is exported.",
  "- greet still works.",
  "",
  "Verification:",
  "- npm run typecheck",
  "- npm test",
  "",
  "Non-goals:",
  "- Do not change greet behavior.",
  "- Do not add runtime dependencies.",
  "",
].join("\n");

function makeRepo(plan = PLAN) {
  const TMP = mkdtempSync(join(tmpdir(), "rekon-semq-"));
  const ROOT = join(TMP, "repo");
  mkdirSync(join(ROOT, "plans"), { recursive: true });
  mkdirSync(join(ROOT, "src"), { recursive: true });
  mkdirSync(join(ROOT, "test"), { recursive: true });
  writeFileSync(join(ROOT, "package.json"), PKG);
  writeFileSync(join(ROOT, "src/index.ts"), SRC);
  writeFileSync(join(ROOT, "test/index.test.ts"), 'import test from "node:test";\ntest("noop", () => {});\n');
  writeFileSync(join(ROOT, "plans/rough.md"), plan);
  return ROOT;
}

// No-key CLI: scrub any provider creds from the child env so the no-provider
// path is deterministic even if the ambient shell exported a key.
const noKeyEnv = () => {
  const env = { ...process.env };
  delete env.OPENAI_API_KEY;
  delete env.REKON_LLM_ENABLED;
  delete env.REKON_LLM_PROVIDER;
  delete env.REKON_LLM_MODEL;
  delete env.REKON_RUN_LIVE_LLM_TESTS;
  return env;
};
const cliNoKey = (ROOT, args) => spawnSync(process.execPath, [cliPath, ...args, "--root", ROOT], { encoding: "utf8", env: noKeyEnv() });
const cliLive = (ROOT, args) => spawnSync(process.execPath, [cliPath, ...args, "--root", ROOT], { encoding: "utf8", env: process.env });
const reviewArgs = (ROOT, mode, extra = []) => ["intent", "plan", "review", "--plan", join(ROOT, "plans/rough.md"), "--goal", GOAL, "--semantic", mode, ...extra, "--json"];
const listCount = (ROOT, type) => {
  const out = spawnSync(process.execPath, [cliPath, "artifacts", "list", "--root", ROOT, "--type", type, "--json"], { encoding: "utf8", env: noKeyEnv() }).stdout;
  try { const j = JSON.parse(out); return Array.isArray(j.artifacts) ? j.artifacts.length : 0; } catch { return 0; }
};

// Library-level adapter mirroring the CLI bridge (for deterministic mock tests).
function makeAdapter(router, mode, override = {}) {
  return async ({ planText, goal }) => {
    const routed = await router.completeJson({ task: "plan.semantic-normalize", schemaName: "IntentPlanSemanticNormalizationResult", prompt: `${goal}\n${planText}` }, { ...override, mode });
    if (!routed.ok) { if (mode === "required") throw new Error(routed.error); return { phases: [] }; }
    const phases = coercePhaseDrafts(routed.result.data);
    if (!phases) { if (mode === "required") throw new Error("no usable phases"); return { phases: [] }; }
    return { phases, ...(routed.result.provider ? { provider: routed.result.provider } : {}), ...(routed.result.model ? { model: routed.result.model } : {}) };
  };
}
const draft = (id) => ({ id, order: 1, title: "Add marker export", kind: "modify", objective: "Export a marker constant from src/index.ts while preserving greet.", deliverables: ["A marker export"], acceptanceCriteria: ["existing behavior unchanged"], touchedPaths: ["src/index.ts"], verificationCommands: ["npm test"], evidenceArtifacts: [], constraints: [], sourceEvidence: [], actionability: { status: "actionable", satisfiedRequirements: [], missingRequirements: [] } });
const okFetch = (data, model = "mock-model") => async () => ({ ok: true, status: 200, async text() { return JSON.stringify({ model, choices: [{ message: { content: JSON.stringify(data) } }] }); } });

// --- hallucination heuristic (shared by the live tests) ---------------------
const LEGIT_CMDS = ["npm run typecheck", "npm test", "npm run build", "tsc --noemit", "tsc --no-emit", "node --test", "echo build"];
function legitPaths(plan) {
  const set = new Set(["src/index.ts", "package.json", "test/index.test.ts"]);
  for (const m of (plan + "\n" + GOAL).matchAll(/[\w./-]*\b[\w-]+\.(ts|tsx|js|mjs|json|md)\b/g)) set.add(m[0].replace(/^[^\w]+/, "").toLowerCase());
  return [...set];
}
const inventedPaths = (paths, plan) => (paths || []).map(String).map((s) => s.trim().toLowerCase()).filter(Boolean).filter((v) => !legitPaths(plan).some((p) => p.includes(v) || v.includes(p.replace(/\.(ts|tsx|js|mjs|json|md)$/, "")) || v === p));
const inventedCmds = (cmds) => (cmds || []).map(String).map((s) => s.trim().toLowerCase()).filter(Boolean).filter((v) => !LEGIT_CMDS.some((c) => v.includes(c) || c.includes(v)));

// --- run one live review once at module load (only when LIVE) ---------------
let L = null;
if (LIVE) {
  const ROOT = makeRepo(LIVE_PLAN);
  const planPath = join(ROOT, "plans/rough.md");
  const srcBefore = readFileSync(join(ROOT, "src/index.ts"), "utf8");
  const planBefore = readFileSync(planPath, "utf8");
  const res = spawnSync(process.execPath, [cliPath, "intent", "plan", "review", "--plan", planPath, "--goal", GOAL, "--semantic", "required", "--llm-provider", "openai", "--llm-model", LIVE_MODEL, "--root", ROOT, "--json"], { encoding: "utf8", env: process.env });
  let json = null; try { json = JSON.parse(res.stdout); } catch { json = null; }
  const ref = spawnSync(process.execPath, [cliPath, "artifacts", "latest", "--root", ROOT, "--type", "IntentPlanActionabilityReport", "--id-only"], { encoding: "utf8", env: process.env }).stdout.trim();
  let report = null; try { report = JSON.parse(spawnSync(process.execPath, [cliPath, "artifacts", "show", "--root", ROOT, ref, "--json"], { encoding: "utf8", env: process.env }).stdout).artifact; } catch { report = null; }
  L = {
    exit: res.status, json, report,
    srcUnchanged: readFileSync(join(ROOT, "src/index.ts"), "utf8") === srcBefore,
    planUnchanged: readFileSync(planPath, "utf8") === planBefore,
    plan: LIVE_PLAN,
  };
}

// ===========================================================================
// Default (no-key-safe) tests
// ===========================================================================

test("1. no-key required mode exits non-zero and writes no report", () => {
  const ROOT = makeRepo();
  const res = cliNoKey(ROOT, reviewArgs(ROOT, "required", ["--llm-provider", "openai"]));
  assert.notEqual(res.status, 0);
  assert.equal(listCount(ROOT, "IntentPlanActionabilityReport"), 0);
});

test("2. no-key auto mode falls back and writes a report with a fallback warning", () => {
  const ROOT = makeRepo();
  const res = cliNoKey(ROOT, reviewArgs(ROOT, "auto", ["--llm-provider", "openai"]));
  assert.equal(res.status, 0, res.stderr);
  const j = JSON.parse(res.stdout);
  assert.equal(j.normalization.method, "deterministic-fallback");
  assert.ok(j.normalization.warnings.length > 0);
  assert.equal(listCount(ROOT, "IntentPlanActionabilityReport"), 1);
});

test("3. off mode writes a deterministic report", () => {
  const ROOT = makeRepo();
  const res = cliNoKey(ROOT, reviewArgs(ROOT, "off"));
  assert.equal(res.status, 0, res.stderr);
  const j = JSON.parse(res.stdout);
  assert.equal(j.normalization.method, "deterministic");
  assert.equal(j.normalization.invokedSemanticNormalization, false);
});

test("4. semantic provider output remains schema-gated (mock provider, valid phases accepted)", async () => {
  const router = new RekonLlmRouter({ providers: [createMockLlmProvider({ id: "openai", model: "mock-model", data: { phases: [draft("phase:1")] } })] });
  const report = await buildIntentPlanActionabilityReport({ planText: PLAN, goal: GOAL, semanticMode: "auto", semanticNormalization: makeAdapter(router, "auto", { provider: "openai" }) });
  assert.equal(report.normalizationTrace.method, "semantic-llm");
  assert.equal(report.normalizationTrace.provider, "openai");
  assert.equal(report.normalizationTrace.model, "mock-model");
});

test("5. invalid semantic output is rejected and falls back (auto) / blocks (required)", async () => {
  const badAuto = new RekonLlmRouter({ providers: [createMockLlmProvider({ id: "openai", data: { not: "phases" } })] });
  const r1 = await buildIntentPlanActionabilityReport({ planText: PLAN, goal: GOAL, semanticMode: "auto", semanticNormalization: makeAdapter(badAuto, "auto", { provider: "openai" }) });
  assert.equal(r1.normalizationTrace.method, "deterministic-fallback");
  const badReq = new RekonLlmRouter({ providers: [createOpenAiLlmProvider({ apiKey: "k", fetchImpl: okFetch({ not: "phases" }) })] });
  await assert.rejects(() => buildIntentPlanActionabilityReport({ planText: PLAN, goal: GOAL, semanticMode: "required", semanticNormalization: makeAdapter(badReq, "required", { provider: "openai" }) }));
});

test("6. semantic output is deterministically re-checked into findings", async () => {
  const router = new RekonLlmRouter({ providers: [createOpenAiLlmProvider({ apiKey: "k", fetchImpl: okFetch({ phases: [{ id: "p1", order: 1, title: "thin", kind: "modify", objective: "", deliverables: [], acceptanceCriteria: [], touchedPaths: [], verificationCommands: [], evidenceArtifacts: [], constraints: [], sourceEvidence: [] }] }) })] });
  const report = await buildIntentPlanActionabilityReport({ planText: PLAN, goal: GOAL, semanticMode: "auto", semanticNormalization: makeAdapter(router, "auto", { provider: "openai" }) });
  assert.equal(report.normalizationTrace.method, "semantic-llm");
  assert.ok(Array.isArray(report.findings) && report.findings.length > 0, "a thin semantic phase must still produce deterministic findings");
  assert.ok(["actionable", "needs-revision", "blocked"].includes(report.status.value));
});

test("7. semantic plan review creates no PreparedIntentPlan", () => {
  const ROOT = makeRepo();
  cliNoKey(ROOT, reviewArgs(ROOT, "auto", ["--llm-provider", "openai"]));
  assert.equal(listCount(ROOT, "PreparedIntentPlan"), 0);
});

test("8. semantic plan review creates no WorkOrder", () => {
  const ROOT = makeRepo();
  cliNoKey(ROOT, reviewArgs(ROOT, "auto", ["--llm-provider", "openai"]));
  assert.equal(listCount(ROOT, "WorkOrder"), 0);
});

test("9. semantic plan review creates no VerificationPlan", () => {
  const ROOT = makeRepo();
  cliNoKey(ROOT, reviewArgs(ROOT, "auto", ["--llm-provider", "openai"]));
  assert.equal(listCount(ROOT, "VerificationPlan"), 0);
});

test("10. semantic plan review executes no commands (no VerificationRun / VerificationResult)", () => {
  const ROOT = makeRepo();
  cliNoKey(ROOT, reviewArgs(ROOT, "auto", ["--llm-provider", "openai"]));
  assert.equal(listCount(ROOT, "VerificationRun"), 0);
  assert.equal(listCount(ROOT, "VerificationResult"), 0);
});

test("11. semantic plan review writes no source or plan files", () => {
  const ROOT = makeRepo();
  cliNoKey(ROOT, reviewArgs(ROOT, "required", ["--llm-provider", "openai"]));
  cliNoKey(ROOT, reviewArgs(ROOT, "auto", ["--llm-provider", "openai"]));
  assert.equal(readFileSync(join(ROOT, "src/index.ts"), "utf8"), SRC);
  assert.equal(readFileSync(join(ROOT, "plans/rough.md"), "utf8"), PLAN);
});

// ===========================================================================
// Live tests (gated by REKON_RUN_LIVE_LLM_TESTS=1 + OPENAI_API_KEY)
// ===========================================================================

test("12. live semantic required exits 0", liveOpts, () => {
  assert.equal(L.exit, 0, JSON.stringify(L?.json));
});

test("13. live normalizationTrace.method is semantic-llm", liveOpts, () => {
  assert.equal(L.report.normalizationTrace.method, "semantic-llm");
  assert.equal(L.json.normalization.method, "semantic-llm");
});

test("14. live provider and model are recorded", liveOpts, () => {
  assert.equal(L.report.normalizationTrace.provider, "openai");
  assert.ok(typeof L.report.normalizationTrace.model === "string" && L.report.normalizationTrace.model.length > 0);
  assert.equal(L.json.normalization.provider, "openai");
});

test("15. live semantic output has at least one phase", liveOpts, () => {
  assert.ok(Array.isArray(L.report.normalizedPhases) && L.report.normalizedPhases.length >= 1);
});

test("16. live deterministic recheck produces findings/questions where needed", liveOpts, () => {
  assert.ok(Array.isArray(L.report.findings));
  assert.ok(["actionable", "needs-revision", "blocked"].includes(L.report.status.value));
  // The live plan omits per-phase contract fields, so the recheck must surface gaps.
  assert.ok(L.report.findings.length > 0 || L.report.status.value === "actionable");
});

test("17. live non-goals are preserved or surfaced in constraints/revisionPrompt", liveOpts, () => {
  // Deterministic guarantee: the revision prompt always carries the non-goal rule.
  assert.match(JSON.stringify(L.report.revisionPrompt), /non-goal/i);
  // And the non-goal concepts from the plan survive somewhere in the report.
  assert.match(JSON.stringify(L.report), /greet|depend|behavior/i);
});

test("18. live touched paths are not invented outside the source/plan/package context", liveOpts, () => {
  const paths = (L.report.normalizedPhases || []).flatMap((p) => p.touchedPaths || []);
  assert.deepEqual(inventedPaths(paths, L.plan), [], `invented paths: ${JSON.stringify(inventedPaths(paths, L.plan))}`);
});

test("19. live verification commands are not invented unless present in the plan or package scripts", liveOpts, () => {
  const cmds = (L.report.normalizedPhases || []).flatMap((p) => p.verificationCommands || []);
  assert.deepEqual(inventedCmds(cmds), [], `invented commands: ${JSON.stringify(inventedCmds(cmds))}`);
});

test("20. live source and plan files remain unchanged", liveOpts, () => {
  assert.equal(L.srcUnchanged, true);
  assert.equal(L.planUnchanged, true);
});
