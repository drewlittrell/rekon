import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";

import {
  buildSemanticDebtJudgmentPrompt,
  coerceDebtConcerns,
  categorizeDebtPattern,
  evaluateSemanticDebtEligibility,
  shouldIncludeDebtConcern,
} from "../../packages/capability-model/dist/index.js";
import {
  BUILT_IN_POLICY_RULES,
  DEBT_SEMANTIC_RULE_ID,
  corroborateSemanticDebtClaims,
  evaluateSemanticDebt,
  evaluateSemanticDebtClaims,
} from "../../packages/capability-policy/dist/index.js";
import { evaluateFindingPromotion } from "../../packages/kernel-assessments/dist/index.js";
import { digestJson } from "../../packages/kernel-artifacts/dist/index.js";
import {
  createSemanticDebtJudgmentReport,
  validateSemanticDebtJudgmentReport,
} from "../../packages/kernel-repo-model/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");

const SRC = [
  "export function bootstrap() {",
  "  return 'ok';",
  "}",
  "",
].join("\n");

function noKeyEnv(extra = {}) {
  const env = { ...process.env, ...extra };
  delete env.OPENAI_API_KEY;
  delete env.REKON_SEMANTIC;
  delete env.REKON_LLM_ENABLED;
  delete env.REKON_LLM_PROVIDER;
  delete env.REKON_LLM_MODEL;
  delete env.REKON_SEMANTIC_DEBT_MODEL;
  delete env.REKON_SEMANTIC_DEBT_EFFORT;
  delete env.REKON_RUN_LIVE_LLM_TESTS;
  return { ...env, ...extra };
}

async function makeRepo(prefix = "rekon-semantic-debt-") {
  const tmp = await mkdtemp(join(tmpdir(), prefix));
  const root = join(tmp, "repo");
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "semantic-debt-fixture", type: "module" }) + "\n");
  writeFileSync(join(root, "src/index.ts"), SRC);
  return root;
}

function runCli(root, args, env = noKeyEnv()) {
  return spawnSync(process.execPath, [cliPath, ...args, "--root", root, "--json"], {
    encoding: "utf8",
    env,
  });
}

function parseStdout(result) {
  return JSON.parse(result.stdout);
}

function semanticDebtReports(root) {
  const dir = join(root, ".rekon", "artifacts", "actions");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => name.startsWith("SemanticDebtJudgmentReport-"));
}

function reportBase(root, over = {}) {
  return createSemanticDebtJudgmentReport({
    header: {
      artifactType: "SemanticDebtJudgmentReport",
      artifactId: over.artifactId ?? "semantic-debt-test-report",
      schemaVersion: "0.1.0",
      generatedAt: "2026-07-09T00:00:00.000Z",
      subject: { repoId: root },
      producer: { id: "@rekon/test.semantic-debt", version: "0.1.0" },
      inputRefs: [],
      freshness: { status: "fresh" },
      provenance: { confidence: 0.6 },
    },
    schemaVersion: "0.1.0",
    policy: {
      mode: "auto",
      provider: "openai",
      model: "test-model",
      effort: "low",
      promptVersion: "debt-judge-v3",
      coercionVersion: "debt-coercion-v3",
    },
    summary: { filesJudged: 1, filesWithDebt: 1, reused: 0, failed: 0, skipped: 0 },
    entries: [],
    boundaries: {
      executedCommands: false,
      wroteSourceFiles: false,
      createdPreparedIntentPlan: false,
      createdWorkOrder: false,
      createdVerificationPlan: false,
      generatedEmbeddings: false,
      ranCirce: false,
      implementedIntentGo: false,
    },
    ...over,
  });
}

function latestFindingReport(root) {
  const index = JSON.parse(readFileSync(join(root, ".rekon", "registry", "artifacts.index.json"), "utf8"));
  const reports = index
    .filter((entry) => entry.type === "FindingReport")
    .sort((a, b) => String(a.writtenAt).localeCompare(String(b.writtenAt)));
  assert.ok(reports.length > 0, "FindingReport indexed");
  const latest = reports.at(-1);
  return JSON.parse(readFileSync(join(root, latest.path), "utf8"));
}

function latestAssessmentReport(root) {
  const index = JSON.parse(readFileSync(join(root, ".rekon", "registry", "artifacts.index.json"), "utf8"));
  const reports = index
    .filter((entry) => entry.type === "AssessmentReport")
    .sort((a, b) => String(a.writtenAt).localeCompare(String(b.writtenAt)));
  assert.ok(reports.length > 0, "AssessmentReport indexed");
  const latest = reports.at(-1);
  return JSON.parse(readFileSync(join(root, latest.path), "utf8"));
}

function writeIndexedDebtReport(root, report) {
  const relPath = join(".rekon", "artifacts", "actions", `SemanticDebtJudgmentReport-${report.header.artifactId}.json`)
    .replace(/\\/g, "/");
  const absPath = join(root, relPath);
  mkdirSync(dirname(absPath), { recursive: true });
  writeFileSync(absPath, `${JSON.stringify(report, null, 2)}\n`);
  const indexPath = join(root, ".rekon", "registry", "artifacts.index.json");
  const index = JSON.parse(readFileSync(indexPath, "utf8"));
  index.push({
    type: "SemanticDebtJudgmentReport",
    id: report.header.artifactId,
    schemaVersion: report.header.schemaVersion,
    path: relPath,
    digest: digestJson(report),
    artifactType: "SemanticDebtJudgmentReport",
    artifactId: report.header.artifactId,
    writtenAt: new Date().toISOString(),
  });
  index.sort((left, right) => `${left.type}:${left.id}`.localeCompare(`${right.type}:${right.id}`));
  writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);
}

test("1. default auto keyless scan reports no provider and writes no judgment artifact", async () => {
  const root = await makeRepo();
  const result = runCli(root, ["scan"]);
  assert.equal(result.status, 0, result.stderr);
  const json = parseStdout(result);
  assert.equal(json.semanticFiles.mode, "auto");
  assert.equal(json.semanticFiles.providerAvailable, false);
  assert.equal(json.semanticDebt.mode, "auto");
  assert.equal(json.semanticDebt.providerAvailable, false);
  assert.equal(json.semanticDebt.judged, 0);
  assert.equal(json.semanticDebt.model, "gpt-5.6-luna");
  assert.equal(json.semanticDebt.effort, "low");
  assert.equal(semanticDebtReports(root).length, 0);
});

test("2. --no-semantic turns both semantic layers off", async () => {
  const root = await makeRepo();
  const result = runCli(root, [
    "scan",
    "--no-semantic",
    "--semantic-files",
    "required",
    "--semantic-debt",
    "required",
  ]);
  assert.equal(result.status, 0, result.stderr);
  const json = parseStdout(result);
  assert.equal(json.semanticFiles.mode, "off");
  assert.equal(json.semanticDebt.mode, "off");
});

test("3. --semantic-debt off turns only debt off", async () => {
  const root = await makeRepo();
  const result = runCli(root, ["scan", "--semantic-debt", "off"]);
  assert.equal(result.status, 0, result.stderr);
  const json = parseStdout(result);
  assert.equal(json.semanticFiles.mode, "auto");
  assert.equal(json.semanticDebt.mode, "off");
});

test("4. explicit --semantic-debt auto overrides REKON_SEMANTIC=off", async () => {
  const root = await makeRepo();
  const result = runCli(root, ["scan", "--semantic-debt", "auto"], noKeyEnv({ REKON_SEMANTIC: "off" }));
  assert.equal(result.status, 0, result.stderr);
  const json = parseStdout(result);
  assert.equal(json.semanticFiles.mode, "off");
  assert.equal(json.semanticDebt.mode, "auto");
  assert.equal(json.semanticDebt.providerAvailable, false);
  assert.equal(semanticDebtReports(root).length, 0);
});

test("5. REKON_LLM_ENABLED=false disables a fake key before any provider work", async () => {
  const root = await makeRepo();
  const env = noKeyEnv({ OPENAI_API_KEY: "sk-test-never-used", REKON_LLM_ENABLED: "false" });
  const result = runCli(root, ["scan", "--semantic-debt", "auto"], env);
  assert.equal(result.status, 0, result.stderr);
  const json = parseStdout(result);
  assert.equal(json.semanticDebt.providerAvailable, false);
  assert.equal(json.semanticDebt.judged, 0);
  assert.equal(semanticDebtReports(root).length, 0);
});

test("6. --semantic-debt required keyless exits non-zero", async () => {
  const root = await makeRepo();
  const result = runCli(root, ["scan", "--semantic-debt", "required"]);
  assert.notEqual(result.status, 0);
  assert.equal(semanticDebtReports(root).length, 0);
});

test("7. invalid --semantic-debt value exits non-zero", async () => {
  const root = await makeRepo();
  const result = runCli(root, ["scan", "--semantic-debt", "sometimes"]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--semantic-debt must be one of off, auto, required/);
});

test("8. debt-specific economy model defaults to none effort", async () => {
  const root = await makeRepo();
  const result = runCli(root, ["scan", "--semantic-debt-model", "gpt-5.4-nano"]);
  assert.equal(result.status, 0, result.stderr);
  const json = parseStdout(result);
  assert.equal(json.semanticFiles.model, undefined);
  assert.equal(json.semanticDebt.model, "gpt-5.4-nano");
  assert.equal(json.semanticDebt.effort, "none");
});

test("9. invalid --semantic-debt-effort value exits non-zero", async () => {
  const root = await makeRepo();
  const result = runCli(root, ["scan", "--semantic-debt-effort", "turbo"]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--semantic-debt-effort must be one of none, low, medium, high, xhigh, max/);
});

test("9a. --semantic-debt-file-path rejects paths outside the repository before provider work", async () => {
  const root = await makeRepo();
  const result = runCli(root, [
    "scan",
    "--semantic-files", "off",
    "--semantic-debt", "required",
    "--semantic-debt-file-path", "../outside.ts",
  ], noKeyEnv({ OPENAI_API_KEY: "test-key", REKON_LLM_ENABLED: "true" }));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /rekon scan --semantic-debt refuses to read paths outside --root/);
  assert.equal(semanticDebtReports(root).length, 0);
});

test("9b. semantic debt prompts number source lines and constrain unseen validation claims", () => {
  const prompt = buildSemanticDebtJudgmentPrompt({
    filePath: "src/example.ts",
    fileText: "export function parse(value: unknown) {\n  return value;\n}\n",
    language: "typescript",
  });
  assert.match(prompt, /Numbered file contents/);
  assert.match(prompt, /1 \| export function parse\(value: unknown\)/);
  assert.match(prompt, /2 \|   return value;/);
  assert.match(prompt, /typed database, repository, framework, or provider values/);
  assert.match(prompt, /copying its numeric prefix/);
});

test("10. kernel factory validates and normalizes a well-formed report", async () => {
  const root = await makeRepo();
  const report = reportBase(root, {
    entries: [
      {
        path: "src/index.ts",
        sha256: "abc",
        verdict: "bogus",
        reused: true,
        concerns: [{ severity: "bogus", description: "  unsafe fallback  ", included: true }],
      },
    ],
  });
  assert.equal(report.entries[0].verdict, "failed");
  assert.equal(report.entries[0].concerns[0].severity, "low");
  assert.equal(report.policy.effort, "low");
  assert.equal(validateSemanticDebtJudgmentReport(report).ok, true);
});

test("11. validator rejects an empty policy model", async () => {
  const root = await makeRepo();
  const report = reportBase(root);
  const result = validateSemanticDebtJudgmentReport({ ...report, policy: { ...report.policy, model: "" } });
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.path === "$.policy.model"));
});

test("12. validator rejects an invalid policy effort", async () => {
  const root = await makeRepo();
  const report = reportBase(root);
  const result = validateSemanticDebtJudgmentReport({ ...report, policy: { ...report.policy, effort: "turbo" } });
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.path === "$.policy.effort"));
});

test("12a. validator preserves historical reports without a coercion version", async () => {
  const root = await makeRepo();
  const report = reportBase(root);
  const policy = { ...report.policy };
  delete policy.coercionVersion;
  const result = validateSemanticDebtJudgmentReport({ ...report, policy });
  assert.equal(result.ok, true);
  assert.equal(result.value.policy.coercionVersion, undefined);
  const claims = evaluateSemanticDebtClaims({
    ...report,
    policy,
    entries: [{
      path: "src/index.ts",
      verdict: "debt",
      concerns: [{ severity: "high", description: "Hardcoded secret.", included: true }],
    }],
  }, { type: "SemanticDebtJudgmentReport", id: "historical", schemaVersion: "0.1.0" });
  assert.deepEqual(claims, []);
});

test("13. validator rejects duplicate entry paths", async () => {
  const root = await makeRepo();
  const report = reportBase(root);
  const duplicate = {
    ...report,
    entries: [
      { path: "src/index.ts", sha256: "a", verdict: "clean", concerns: [], reused: false },
      { path: "src/index.ts", sha256: "b", verdict: "clean", concerns: [], reused: false },
    ],
  };
  const result = validateSemanticDebtJudgmentReport(duplicate);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.path === "$.entries[1].path"));
});

test("14. include filter handles speculative and strong signals", () => {
  assert.equal(shouldIncludeDebtConcern({ severity: "medium", description: "Consider extracting this helper." }), false);
  assert.equal(shouldIncludeDebtConcern({ severity: "high", description: "This may indicate duplication." }), false);
  assert.equal(shouldIncludeDebtConcern({ severity: "low", description: "Small helper could be nicer." }), false);
  assert.equal(shouldIncludeDebtConcern({ severity: "low", description: "TODO must not ship." }), true);
  assert.equal(shouldIncludeDebtConcern({ severity: "medium", description: "Missing error handling around the provider." }), true);
  assert.equal(shouldIncludeDebtConcern({
    severity: "medium",
    description: "The database value is force-cast instead of being narrowed or validated.",
  }), false);
});

test("15. pattern tagger precedence returns expected tags and null", () => {
  assert.equal(categorizeDebtPattern("Hardcoded API key and as any type assertion"), "hardcoded_values");
  assert.equal(categorizeDebtPattern("Uses as any to bypass type checking"), "type_assertion");
  assert.equal(categorizeDebtPattern("The catch binding uses `any` for failures."), "type_assertion");
  assert.equal(categorizeDebtPattern("The throttle begins before any repository work."), null);
  assert.equal(categorizeDebtPattern("Missing error handling in catch flow"), "error_handling");
  assert.equal(categorizeDebtPattern("A comment says TODO later"), "todo_comments");
  assert.equal(categorizeDebtPattern("Plain refactor opportunity"), null);
});

test("16. coerceDebtConcerns preserves supported concern categories and applies filters/tags", () => {
  const concerns = coerceDebtConcerns({
    concerns: [
      { type: "architecture", severity: "high", description: "Imports cross the declared layer boundary.", line: 12 },
      { type: "tech_debt", severity: "bogus", description: " small cleanup " },
      { type: "tech_debt", severity: "low", description: "Hardcoded API key must not ship." },
      { type: "tech_debt", severity: "medium", description: "Consider extracting this abstraction." },
      { type: "dead_code", severity: "high", description: "This branch is unreachable after the preceding return." },
      { type: "lint", severity: "low", description: "Whitespace could be adjusted." },
      { type: "stub", severity: "medium", description: "This function returns placeholder data instead of using its input." },
      { type: "unsupported", severity: "high", description: "Ignored category." },
    ],
  });
  assert.equal(concerns.length, 7);
  assert.deepEqual(concerns.map((concern) => concern.type), [
    "architecture", "tech_debt", "tech_debt", "tech_debt", "dead_code", "lint", "stub",
  ]);
  assert.deepEqual(concerns.map((concern) => concern.included), [true, false, true, false, true, false, true]);
  assert.equal(concerns[0].line, 12);
  assert.equal(concerns[2].severity, "low");
  assert.equal(concerns[2].pattern, "hardcoded_values");
});

test("17. evaluator emits one semantic claim per included concern and no debt finding", async () => {
  const root = await makeRepo();
  let result = runCli(root, ["refresh"]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(latestFindingReport(root).findings.some((finding) => finding.ruleId === DEBT_SEMANTIC_RULE_ID), false);

  const report = reportBase(root, {
    artifactId: "semantic-debt-test-report",
    summary: { filesJudged: 4, filesWithDebt: 2, reused: 0, failed: 1, skipped: 0 },
    entries: [
      {
        path: "src/index.ts",
        sha256: createHash("sha256").update(SRC).digest("hex"),
        verdict: "debt",
        reused: false,
        concerns: [
          { type: "tech_debt", severity: "low", description: "Consider a different helper.", included: false },
          { type: "tech_debt", severity: "high", description: "Hardcoded API key must not be committed.", pattern: "hardcoded_values", included: true },
          { type: "architecture", severity: "medium", description: "This import crosses the declared layer boundary.", line: 8, included: true },
          { type: "dead_code", severity: "medium", description: "This branch is unreachable after return.", line: 12, included: true },
          { type: "lint", severity: "medium", description: "Unused import: Link is not referenced.", line: 2, included: true },
          { type: "stub", severity: "medium", description: "This function returns placeholder data.", line: 20, included: true },
        ],
      },
      { path: "src/clean.ts", sha256: "b", verdict: "clean", reused: false, concerns: [] },
      {
        path: "tests/debt.test.ts",
        sha256: "c",
        verdict: "debt",
        reused: false,
        concerns: [{ severity: "high", description: "Unsafe test shortcut.", included: true }],
      },
      { path: "src/failed.ts", sha256: "d", verdict: "failed", reused: false, concerns: [] },
    ],
  });
  writeIndexedDebtReport(root, report);

  result = runCli(root, ["refresh"]);
  assert.equal(result.status, 0, result.stderr);
  const semanticFindings = latestFindingReport(root).findings.filter((finding) => finding.ruleId === DEBT_SEMANTIC_RULE_ID);
  assert.equal(semanticFindings.length, 0);
  const claims = latestAssessmentReport(root).assessments.filter((assessment) => assessment.ruleId === DEBT_SEMANTIC_RULE_ID);
  assert.equal(claims.length, 4);
  assert.equal(claims.every((claim) => claim.kind === "semantic_claim"), true);
  assert.equal(claims.every((claim) => claim.confidence.verification === "unverified"), true);
  assert.deepEqual([...new Set(claims.flatMap((claim) => claim.files))], ["src/index.ts"]);
  assert.equal(claims[0].details.provider, "openai");
  assert.equal(claims[0].details.model, "test-model");
  assert.equal(claims[0].details.promptVersion, "debt-judge-v3");
  assert.equal(claims.some((claim) => claim.description.includes("Consider a different helper")), false);
  assert.deepEqual([...new Set(claims.map((claim) => claim.type))].sort(), ["architecture", "dead_code", "stub", "tech_debt"]);
  assert.equal(claims.find((claim) => claim.type === "architecture").details.line, 8);

  writeFileSync(join(root, "src/index.ts"), `${SRC}// source changed after semantic judgment\n`);
  result = runCli(root, ["refresh"]);
  assert.equal(result.status, 0, result.stderr);
  const staleClaims = latestAssessmentReport(root).assessments
    .filter((assessment) => assessment.ruleId === DEBT_SEMANTIC_RULE_ID);
  assert.deepEqual(staleClaims, []);
  assert.equal(
    latestAssessmentReport(root).header.inputRefs.some((ref) => ref.type === "SemanticDebtJudgmentReport"),
    false,
  );
});

test("18. evaluator drops filtered/failed entries and rule is registered", async () => {
  assert.ok(BUILT_IN_POLICY_RULES.includes(DEBT_SEMANTIC_RULE_ID));
  const obsolete = evaluateSemanticDebtClaims({
    policy: { provider: "openai", model: "m", promptVersion: "debt-judge-v2", coercionVersion: "debt-coercion-v1" },
    entries: [{
      path: "src/stale.ts",
      verdict: "debt",
      concerns: [{ severity: "high", description: "Hardcoded secret.", included: true }],
    }],
  }, { type: "SemanticDebtJudgmentReport", id: "obsolete", schemaVersion: "0.1.0" });
  assert.deepEqual(obsolete, []);
  const findings = evaluateSemanticDebt({
    policy: { provider: "openai", model: "m", promptVersion: "debt-judge-v3", coercionVersion: "debt-coercion-v3" },
    entries: [
      {
        path: "src/filtered.ts",
        verdict: "debt",
        concerns: [{ severity: "medium", description: "Consider extracting helper.", included: false }],
      },
      {
        path: "src/failed.ts",
        verdict: "failed",
        concerns: [{ severity: "high", description: "Hardcoded secret.", included: true }],
      },
    ],
  });
  assert.equal(findings.length, 0);
  const claims = evaluateSemanticDebtClaims({
    policy: { provider: "openai", model: "m", promptVersion: "debt-judge-v3", coercionVersion: "debt-coercion-v3" },
    entries: [{
      path: "src/failed.ts",
      verdict: "failed",
      concerns: [{ severity: "high", description: "Hardcoded secret.", included: true }],
    }],
  }, { type: "SemanticDebtJudgmentReport", id: "debt", schemaVersion: "0.1.0" });
  assert.equal(claims.length, 0);
});

test("19. semantic debt eligibility excludes non-production and generated inputs before judgment", () => {
  assert.equal(evaluateSemanticDebtEligibility({ path: "src/service.ts", content: "export const value = 1;\n" }).eligible, true);
  assert.deepEqual(
    evaluateSemanticDebtEligibility({ path: "tests/service.test.ts", content: "test('x', () => {});\n" }).reasons,
    ["non-production"],
  );
  assert.deepEqual(
    evaluateSemanticDebtEligibility({ path: "README.md", content: "# Repository\n" }).reasons,
    ["non-production"],
  );
  assert.deepEqual(
    evaluateSemanticDebtEligibility({ path: "src/generated.ts", content: "// Generated by schema tool\nexport const value = 1;\n" }).reasons,
    ["generated-file"],
  );
  assert.deepEqual(
    evaluateSemanticDebtEligibility({ path: ".figma-ds/audits/request.json", content: "{\"request\":true}\n" }).reasons,
    ["generated-file"],
  );
  assert.equal(
    evaluateSemanticDebtEligibility({ path: ".github/workflows/ci.yml", content: "name: CI\n" }).version,
    "debt-eligibility-v3",
  );
  assert.deepEqual(
    evaluateSemanticDebtEligibility({ path: "artifacts/runs/result.json", content: '{"status":"complete"}\n' }).reasons,
    ["data-artifact"],
  );
  assert.deepEqual(
    evaluateSemanticDebtEligibility({ path: "data/import/snapshot.yaml", content: "status: complete\n" }).reasons,
    ["data-artifact"],
  );
  assert.equal(
    evaluateSemanticDebtEligibility({ path: "src/data/loader.ts", content: "export const load = () => 1;\n" }).eligible,
    true,
  );
  assert.deepEqual(
    evaluateSemanticDebtEligibility({ path: "src/large.ts", content: "x".repeat(24001) }).reasons,
    ["prompt-truncated"],
  );
});

test("20. deterministic source evidence corroborates a semantic claim without promoting it", () => {
  const reportRef = { type: "SemanticDebtJudgmentReport", id: "debt", schemaVersion: "0.1.0" };
  const evidenceRef = { type: "EvidenceGraph", id: "evidence", schemaVersion: "0.1.0" };
  const claims = evaluateSemanticDebtClaims({
    policy: { provider: "openai", model: "m", promptVersion: "debt-judge-v3", coercionVersion: "debt-coercion-v3" },
    entries: [{
      path: "src/unsafe.ts",
      verdict: "debt",
      concerns: [{
        type: "tech_debt",
        severity: "medium",
        description: "An as any assertion bypasses validation.",
        line: 3,
        pattern: "type_assertion",
        included: true,
      }],
    }],
  }, reportRef);
  const corroborated = corroborateSemanticDebtClaims(claims, [{
    kind: "typescript:source-quality",
    subject: "src/unsafe.ts:3",
    value: { path: "src/unsafe.ts", signal: "as_any_assertion", line: 3 },
  }], evidenceRef);
  assert.equal(corroborated[0].confidence.basis, "mixed");
  assert.equal(corroborated[0].confidence.verification, "corroborated");
  assert.equal(corroborated[0].supportingSignals[0].signalType, "as_any_assertion");
  assert.equal(evaluateFindingPromotion(corroborated[0]).eligible, false);
});

test("21. semantic claim identity is anchored to source evidence rather than model wording", () => {
  const reportRef = { type: "SemanticDebtJudgmentReport", id: "debt", schemaVersion: "0.1.0" };
  const report = (description, line = 14) => ({
    policy: { provider: "openai", model: "m", promptVersion: "debt-judge-v3", coercionVersion: "debt-coercion-v3" },
    entries: [{
      path: "src/handler.ts",
      verdict: "debt",
      concerns: [{ type: "architecture", severity: "medium", description, line, included: true }],
    }],
  });

  const first = evaluateSemanticDebtClaims(report("The handler owns provider-specific work."), reportRef)[0];
  const reworded = evaluateSemanticDebtClaims(report("Provider-specific behavior is coupled to this handler."), reportRef)[0];
  const moved = evaluateSemanticDebtClaims(report("The handler owns provider-specific work.", 15), reportRef)[0];

  assert.equal(first.id, reworded.id);
  assert.equal(first.rootCauseKey, reworded.rootCauseKey);
  assert.equal(first.details.identityVersion, "semantic-claim-v2");
  assert.notEqual(first.id, moved.id);
});
