// Intent Plan Semantic Normalization Quality Hardening (slice 142).
//
// Path B hardening: after provider phases pass the structural schema gate, a
// deterministic quality guard re-checks them against the SOURCE plan. A provider
// may not introduce unsupported touched paths or verification commands, and must
// preserve stated non-goals; violations become normalizationTrace warnings plus
// findings so a weak plan can't look actionable merely by filling fields. The
// guard runs ONLY on the semantic-llm path. Default tests are key-free (injected
// adapters / mock phases); the 4 live tests are gated on REKON_RUN_LIVE_LLM_TESTS
// + OPENAI_API_KEY and otherwise skip.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { buildIntentPlanActionabilityReport } from "../../packages/capability-model/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const cliSrc = readFileSync(resolve(repoRoot, "packages/cli/src/index.ts"), "utf8");

const LIVE = process.env.REKON_RUN_LIVE_LLM_TESTS === "1" && typeof process.env.OPENAI_API_KEY === "string" && process.env.OPENAI_API_KEY.trim().length > 0;
const liveOpts = LIVE ? {} : { skip: "set REKON_RUN_LIVE_LLM_TESTS=1 and OPENAI_API_KEY to run the live hardening checks" };
const LIVE_MODEL = process.env.REKON_LLM_MODEL && process.env.REKON_LLM_MODEL.trim().length > 0 ? process.env.REKON_LLM_MODEL.trim() : "gpt-4o-mini";

const PKG = JSON.stringify({ name: "semqh", version: "0.0.0", type: "module", scripts: { typecheck: "tsc --noEmit", test: "node --test", build: "echo build" } }, null, 2) + "\n";
const SRC = 'export const existing = "ok";\nexport function greet(name) { return `hello ${name}`; }\n';
const SCRIPTS = ["npm run typecheck", "npm test", "npm run build"];
const PLAN_NG = "# Add marker\n\nAdd a marker export to src/index.ts.\n\nDo not:\n- change greet behavior.\n- add runtime dependencies.\n";
const GOAL = "Add a marker export to src/index.ts.";

// A complete provider-shaped phase draft; override fields per case.
const phase = (over = {}) => ({
  id: "p1", order: 1, title: "Implement marker", kind: "modify",
  objective: "Add a marker export.", deliverables: ["marker export"], acceptanceCriteria: ["marker exported"],
  touchedPaths: [], verificationCommands: [], evidenceArtifacts: [], constraints: [],
  sourceEvidence: [{ excerpt: "Add a marker export to src/index.ts." }],
  actionability: { status: "actionable", satisfiedRequirements: [], missingRequirements: [] },
  ...over,
});
const buildSem = (ph, opts = {}) =>
  buildIntentPlanActionabilityReport({
    planText: opts.planText ?? PLAN_NG,
    goal: opts.goal ?? GOAL,
    semanticMode: "auto",
    semanticNormalization: async () => ({ phases: [ph], provider: "openai", model: "mock-model" }),
    packageScripts: SCRIPTS,
  });
const warns = (r, re) => r.normalizationTrace.warnings.some((w) => re.test(w));
const hasFinding = (r, re) => r.findings.some((f) => re.test(f.message));

// CLI helpers (no-key: scrub provider creds so the no-provider path is deterministic).
const noKeyEnv = () => {
  const env = { ...process.env };
  delete env.OPENAI_API_KEY; delete env.REKON_LLM_ENABLED; delete env.REKON_LLM_PROVIDER; delete env.REKON_LLM_MODEL; delete env.REKON_RUN_LIVE_LLM_TESTS;
  return env;
};
function makeRepo(plan = PLAN_NG) {
  const TMP = mkdtempSync(join(tmpdir(), "rekon-semqh-"));
  const ROOT = join(TMP, "repo");
  mkdirSync(join(ROOT, "plans"), { recursive: true });
  mkdirSync(join(ROOT, "src"), { recursive: true });
  writeFileSync(join(ROOT, "package.json"), PKG);
  writeFileSync(join(ROOT, "src/index.ts"), SRC);
  writeFileSync(join(ROOT, "plans/rough.md"), plan);
  return ROOT;
}
const cliNoKey = (ROOT, args) => spawnSync(process.execPath, [cliPath, ...args, "--root", ROOT], { encoding: "utf8", env: noKeyEnv() });
const reviewArgs = (ROOT, mode, extra = []) => ["intent", "plan", "review", "--plan", join(ROOT, "plans/rough.md"), "--goal", GOAL, "--semantic", mode, ...extra, "--json"];
const listCount = (ROOT, type) => {
  const out = spawnSync(process.execPath, [cliPath, "artifacts", "list", "--root", ROOT, "--type", type, "--json"], { encoding: "utf8", env: noKeyEnv() }).stdout;
  try { const j = JSON.parse(out); return Array.isArray(j.artifacts) ? j.artifacts.length : 0; } catch { return 0; }
};

// Run one live review once at module load (only when LIVE).
let L = null;
if (LIVE) {
  const ROOT = makeRepo("# Add marker export\n\nAdd a marker export to src/index.ts.\n\nDo not:\n- change greet behavior.\n- add runtime dependencies.\n- rename existing exports.\n");
  const planPath = join(ROOT, "plans/rough.md");
  const srcBefore = readFileSync(join(ROOT, "src/index.ts"), "utf8");
  const planBefore = readFileSync(planPath, "utf8");
  const res = spawnSync(process.execPath, [cliPath, "intent", "plan", "review", "--plan", planPath, "--goal", "Expose a marker export from src/index.ts while preserving greet behavior.", "--semantic", "required", "--llm-provider", "openai", "--llm-model", LIVE_MODEL, "--root", ROOT, "--json"], { encoding: "utf8", env: process.env });
  let json = null; try { json = JSON.parse(res.stdout); } catch { json = null; }
  const ref = spawnSync(process.execPath, [cliPath, "artifacts", "latest", "--root", ROOT, "--type", "IntentPlanActionabilityReport", "--id-only"], { encoding: "utf8", env: process.env }).stdout.trim();
  let report = null; try { report = JSON.parse(spawnSync(process.execPath, [cliPath, "artifacts", "show", "--root", ROOT, ref, "--json"], { encoding: "utf8", env: process.env }).stdout).artifact; } catch { report = null; }
  L = { res, json, report, srcUnchanged: readFileSync(join(ROOT, "src/index.ts"), "utf8") === srcBefore, planUnchanged: readFileSync(planPath, "utf8") === planBefore };
}

// ===========================================================================
// Default (key-free) tests
// ===========================================================================

test("1. provider output with an unsupported path produces a warning/finding", async () => {
  const r = await buildSem(phase({ touchedPaths: ["src/invented.ts"] }));
  assert.ok(warns(r, /touched path .* not supported/i) || hasFinding(r, /unsupported touched path/i));
});

test("2. provider output with an unsupported command produces a warning/finding", async () => {
  const r = await buildSem(phase({ verificationCommands: ["npm run bogus"] }));
  assert.ok(warns(r, /verification command .* not stated/i) || hasFinding(r, /unsupported verification command/i));
});

test("3. provider output that omits a source non-goal produces a warning/finding", async () => {
  const r = await buildSem(phase({ constraints: [] }));
  assert.ok(warns(r, /non-goal not preserved/i) || hasFinding(r, /dropped a stated non-goal/i));
});

test("4. provider output preserving non-goals does not trigger a lost-non-goal warning", async () => {
  const r = await buildSem(phase({ constraints: ["Do not change greet behavior.", "Do not add runtime dependencies."] }));
  assert.ok(!warns(r, /non-goal not preserved/i));
  assert.ok(!hasFinding(r, /dropped a stated non-goal/i));
});

test("5. provider output with a source-supported path is accepted (no unsupported-path finding)", async () => {
  const r = await buildSem(phase({ touchedPaths: ["src/index.ts"] }));
  assert.ok(!warns(r, /touched path .* not supported/i));
  assert.ok(!hasFinding(r, /unsupported touched path/i));
});

test("6. provider output with a source-supported command is accepted (no unsupported-command finding)", async () => {
  const r = await buildSem(phase({ verificationCommands: ["npm test"] }));
  assert.ok(!warns(r, /verification command .* not stated/i));
  assert.ok(!hasFinding(r, /unsupported verification command/i));
});

test("7. provider output cannot make a weak plan actionable by filling fields without source support", async () => {
  const r = await buildIntentPlanActionabilityReport({
    planText: "# Do the thing\n\nMake it work.\n",
    goal: "",
    semanticMode: "auto",
    semanticNormalization: async () => ({
      phases: [phase({ touchedPaths: ["src/invented.ts"], verificationCommands: ["npm run bogus"], sourceEvidence: [] })],
      provider: "openai", model: "mock-model",
    }),
  });
  assert.equal(r.normalizationTrace.method, "semantic-llm");
  assert.notEqual(r.status.value, "actionable");
});

test("8. the semantic prompt instructs the provider not to invent paths", () => {
  assert.match(cliSrc, /Do NOT invent touched paths/);
});

test("9. the semantic prompt instructs the provider not to invent commands", () => {
  assert.match(cliSrc, /Do NOT invent verification commands/);
});

test("10. the semantic prompt instructs the provider to preserve non-goals", () => {
  assert.match(cliSrc, /preserve non-goals/i);
});

test("11. CLI --json exposes the normalization method", () => {
  const ROOT = makeRepo();
  const j = JSON.parse(cliNoKey(ROOT, reviewArgs(ROOT, "auto", ["--llm-provider", "openai"])).stdout);
  assert.equal(typeof j.normalization.method, "string");
});

test("12. CLI --json exposes provider/model conditionally (omitted when no provider ran; live test confirms the populated case)", () => {
  const ROOT = makeRepo();
  const j = JSON.parse(cliNoKey(ROOT, reviewArgs(ROOT, "auto", ["--llm-provider", "openai"])).stdout);
  assert.equal(j.normalization.provider, undefined);
  assert.equal(j.normalization.model, undefined);
});

test("13. CLI --json exposes the normalization warnings array", () => {
  const ROOT = makeRepo();
  const j = JSON.parse(cliNoKey(ROOT, reviewArgs(ROOT, "auto", ["--llm-provider", "openai"])).stdout);
  assert.ok(Array.isArray(j.normalization.warnings));
});

test("14. semantic plan review creates no PreparedIntentPlan", () => {
  const ROOT = makeRepo();
  cliNoKey(ROOT, reviewArgs(ROOT, "auto", ["--llm-provider", "openai"]));
  assert.equal(listCount(ROOT, "PreparedIntentPlan"), 0);
});

test("15. semantic plan review creates no WorkOrder / VerificationPlan", () => {
  const ROOT = makeRepo();
  cliNoKey(ROOT, reviewArgs(ROOT, "auto", ["--llm-provider", "openai"]));
  assert.equal(listCount(ROOT, "WorkOrder"), 0);
  assert.equal(listCount(ROOT, "VerificationPlan"), 0);
});

test("16. semantic plan review executes no commands (no VerificationRun / VerificationResult)", () => {
  const ROOT = makeRepo();
  cliNoKey(ROOT, reviewArgs(ROOT, "auto", ["--llm-provider", "openai"]));
  assert.equal(listCount(ROOT, "VerificationRun"), 0);
  assert.equal(listCount(ROOT, "VerificationResult"), 0);
});

test("17. semantic plan review writes no source or plan files", () => {
  const ROOT = makeRepo();
  cliNoKey(ROOT, reviewArgs(ROOT, "required", ["--llm-provider", "openai"]));
  cliNoKey(ROOT, reviewArgs(ROOT, "auto", ["--llm-provider", "openai"]));
  assert.equal(readFileSync(join(ROOT, "src/index.ts"), "utf8"), SRC);
  assert.equal(readFileSync(join(ROOT, "plans/rough.md"), "utf8"), PLAN_NG);
});

// ===========================================================================
// Live tests (gated)
// ===========================================================================

test("18. live provider output has a semantic-llm trace with provider/model recorded", liveOpts, () => {
  assert.equal(L.report.normalizationTrace.method, "semantic-llm");
  assert.equal(L.json.normalization.method, "semantic-llm");
  assert.equal(L.json.normalization.provider, "openai");
  assert.ok(typeof L.json.normalization.model === "string" && L.json.normalization.model.length > 0);
});

test("19. live provider output preserves non-goals for the non-goals fixture", liveOpts, () => {
  assert.ok(!L.report.findings.some((f) => /dropped a stated non-goal/i.test(f.message)), "no dropped-non-goal finding");
  assert.ok(!L.report.normalizationTrace.warnings.some((w) => /non-goal not preserved/i.test(w)), "no lost-non-goal warning");
});

test("20. live provider output does not invent paths", liveOpts, () => {
  assert.ok(!L.report.findings.some((f) => /unsupported touched path/i.test(f.message)), JSON.stringify(L.report.normalizationTrace.warnings));
});

test("21. live provider output does not invent commands; source/plan unchanged", liveOpts, () => {
  assert.ok(!L.report.findings.some((f) => /unsupported verification command/i.test(f.message)), JSON.stringify(L.report.normalizationTrace.warnings));
  assert.equal(L.srcUnchanged, true);
  assert.equal(L.planUnchanged, true);
});
