import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";

import {
  coerceDebtConcerns,
  categorizeDebtPattern,
  shouldIncludeDebtConcern,
} from "../../packages/capability-model/dist/index.js";
import {
  BUILT_IN_POLICY_RULES,
  DEBT_SEMANTIC_RULE_ID,
  evaluateSemanticDebt,
} from "../../packages/capability-policy/dist/index.js";
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
      promptVersion: "debt-judge-v1",
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

test("8. kernel factory validates and normalizes a well-formed report", async () => {
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
  assert.equal(validateSemanticDebtJudgmentReport(report).ok, true);
});

test("9. validator rejects an empty policy model", async () => {
  const root = await makeRepo();
  const report = reportBase(root);
  const result = validateSemanticDebtJudgmentReport({ ...report, policy: { ...report.policy, model: "" } });
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.path === "$.policy.model"));
});

test("10. validator rejects duplicate entry paths", async () => {
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

test("11. include filter handles speculative and strong signals", () => {
  assert.equal(shouldIncludeDebtConcern({ severity: "medium", description: "Consider extracting this helper." }), false);
  assert.equal(shouldIncludeDebtConcern({ severity: "high", description: "This may indicate duplication." }), false);
  assert.equal(shouldIncludeDebtConcern({ severity: "low", description: "Small helper could be nicer." }), false);
  assert.equal(shouldIncludeDebtConcern({ severity: "low", description: "TODO must not ship." }), true);
  assert.equal(shouldIncludeDebtConcern({ severity: "medium", description: "Missing error handling around the provider." }), true);
});

test("12. pattern tagger precedence returns expected tags and null", () => {
  assert.equal(categorizeDebtPattern("Hardcoded API key and as any type assertion"), "hardcoded_values");
  assert.equal(categorizeDebtPattern("Uses as any to bypass type checking"), "type_assertion");
  assert.equal(categorizeDebtPattern("Missing error handling in catch flow"), "error_handling");
  assert.equal(categorizeDebtPattern("A comment says TODO later"), "todo_comments");
  assert.equal(categorizeDebtPattern("Plain refactor opportunity"), null);
});

test("13. coerceDebtConcerns keeps tech_debt concerns and applies filters/tags", () => {
  const concerns = coerceDebtConcerns({
    concerns: [
      { type: "architecture", severity: "high", description: "wrong layer" },
      { type: "tech_debt", severity: "bogus", description: " small cleanup " },
      { type: "tech_debt", severity: "low", description: "Hardcoded API key must not ship." },
      { type: "tech_debt", severity: "medium", description: "Consider extracting this abstraction." },
    ],
  });
  assert.equal(concerns.length, 3);
  assert.deepEqual(concerns.map((concern) => concern.included), [false, true, false]);
  assert.equal(concerns[1].severity, "low");
  assert.equal(concerns[1].pattern, "hardcoded_values");
});

test("14. evaluator lifts latest judgment artifact into one production debt finding", async () => {
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
        sha256: "a",
        verdict: "debt",
        reused: false,
        concerns: [
          { severity: "low", description: "Consider a different helper.", included: false },
          { severity: "high", description: "Hardcoded API key must not be committed.", pattern: "hardcoded_values", included: true },
          { severity: "medium", description: "Missing error handling around provider call.", pattern: "error_handling", included: true },
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
  assert.equal(semanticFindings.length, 1);
  const finding = semanticFindings[0];
  assert.equal(finding.type, "tech_debt");
  assert.equal(finding.severity, "high");
  assert.deepEqual(finding.files, ["src/index.ts"]);
  assert.equal(finding.details.provenance, "semantic-llm");
  assert.equal(finding.details.provider, "openai");
  assert.equal(finding.details.model, "test-model");
  assert.equal(finding.details.promptVersion, "debt-judge-v1");
  assert.equal(finding.details.concerns.length, 2);
  assert.ok(!finding.description.includes("Consider a different helper"));
});

test("15. evaluator drops filtered/failed entries and rule is registered", async () => {
  assert.ok(BUILT_IN_POLICY_RULES.includes(DEBT_SEMANTIC_RULE_ID));
  const findings = evaluateSemanticDebt({
    policy: { provider: "openai", model: "m", promptVersion: "debt-judge-v1" },
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
});
