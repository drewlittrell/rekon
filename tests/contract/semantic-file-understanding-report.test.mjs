// Semantic File Understanding v1 (slice 144).
//
// Per-file semantic understanding. The deterministic structural extraction
// (language, line/byte counts, imports, public exports, responsibilities) is
// always on and authoritative for imports/exports (the hallucination guard);
// an injected adapter optionally adds a semantic purpose / capability signals /
// findings. Provider output is shape-coerced and deterministically re-checked.
// All tests here are key-free: the lib tests inject adapters; the CLI tests scrub
// provider creds so the no-provider path is deterministic.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { buildSemanticFileUnderstandingReport } from "../../packages/capability-model/dist/index.js";
import { validateSemanticFileUnderstandingReport } from "../../packages/kernel-repo-model/dist/index.js";
import {
  SEMANTIC_FILE_UNDERSTANDING_JSON_SCHEMA,
  buildSemanticFileUnderstandingPrompt,
} from "../../packages/cli/dist/semantic-file-understanding.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");

const TS_SRC =
  [
    "// Greeter utility module.",
    'import path from "node:path";',
    'import { readFile } from "node:fs/promises";',
    'export const existing = "ok";',
    "export function greet(name) { return `hello ${name}`; }",
    "export class Greeter {}",
    "function internalHelper() { return readFile; }",
    'export function joinName(name) { return path.join("names", name); }',
  ].join("\n") + "\n";

const FILE = "src/index.ts";
const base = (over = {}) => ({ filePath: FILE, fileText: TS_SRC, fileSha256: "deadbeef", root: ".", ...over });
const goodAdapter = async () => ({
  summary: { purpose: "Greeter utilities.", responsibilities: ["greet users"], touchedConcepts: ["greeting"] },
  capabilitySignals: [{ id: "cap:greet", label: "greets a user", confidence: "high", sourceEvidence: [{ excerpt: "greet(name)", lineStart: 5 }] }],
  findings: [],
  provider: "openai",
  model: "mock-model",
});
const garbageAdapter = async () => ({ nonsense: true, capabilitySignals: "not-an-array" });

// --- 1-17: lib-level (deterministic + injected adapters) --------------------

test("1. deterministic helper creates a SemanticFileUnderstandingReport", async () => {
  const r = await buildSemanticFileUnderstandingReport(base());
  assert.equal(r.header.artifactType, "SemanticFileUnderstandingReport");
  assert.equal(r.header.supersession.key, `file:${FILE}`);
  assert.equal(r.schemaVersion, "0.1.0");
  assert.equal(r.normalizationTrace.method, "deterministic");
  assert.equal(r.status.value, "understood");
});

test("2. factory forces all boundary booleans false", async () => {
  const r = await buildSemanticFileUnderstandingReport(base());
  for (const v of Object.values(r.boundaries)) assert.equal(v, false);
  assert.equal(Object.keys(r.boundaries).length, 8);
});

test("3. validator rejects a non-false boundary", async () => {
  const r = await buildSemanticFileUnderstandingReport(base());
  const tampered = { ...r, boundaries: { ...r.boundaries, generatedEmbeddings: true } };
  const result = validateSemanticFileUnderstandingReport(tampered);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((i) => i.path === "$.boundaries.generatedEmbeddings"));
});

test("4. deterministic report extracts imports from a TS file", async () => {
  const r = await buildSemanticFileUnderstandingReport(base());
  assert.deepEqual([...r.summary.imports].sort(), ["node:fs/promises", "node:path"]);
});

test("5. deterministic report extracts public exports (not unexported internals)", async () => {
  const r = await buildSemanticFileUnderstandingReport(base());
  assert.deepEqual([...r.summary.publicExports].sort(), ["Greeter", "existing", "greet", "joinName"]);
  assert.ok(!r.summary.publicExports.includes("internalHelper"));
});

test("6. deterministic report lineCount / byteLength are correct", async () => {
  const r = await buildSemanticFileUnderstandingReport(base());
  assert.equal(r.file.lineCount, TS_SRC.split(/\r?\n/).length);
  assert.equal(r.file.byteLength, Buffer.byteLength(TS_SRC, "utf8"));
  assert.equal(r.file.language, "typescript");
});

test("7. semantic auto with no adapter falls back to a deterministic report + warning", async () => {
  const r = await buildSemanticFileUnderstandingReport(base({ semanticMode: "auto" }));
  assert.equal(r.normalizationTrace.method, "deterministic-fallback");
  assert.equal(r.normalizationTrace.invokedSemanticUnderstanding, true);
  assert.equal(r.status.value, "provider-unavailable");
  assert.ok(r.normalizationTrace.warnings.length > 0);
});

test("8. semantic required with no adapter blocks (throws, no report)", async () => {
  await assert.rejects(() => buildSemanticFileUnderstandingReport(base({ semanticMode: "required" })), /required/i);
});

test("9. a usable mock semantic adapter produces a semantic-llm report", async () => {
  const r = await buildSemanticFileUnderstandingReport(base({ semanticMode: "auto", semanticUnderstanding: goodAdapter }));
  assert.equal(r.normalizationTrace.method, "semantic-llm");
  assert.equal(r.normalizationTrace.provenance, "semantic-llm");
  assert.equal(r.summary.purpose, "Greeter utilities.");
  assert.equal(r.capabilitySignals.length, 1);
});

test("10. semantic provider/model are recorded on the trace", async () => {
  const r = await buildSemanticFileUnderstandingReport(base({ semanticMode: "auto", semanticUnderstanding: goodAdapter }));
  assert.equal(r.normalizationTrace.provider, "openai");
  assert.equal(r.normalizationTrace.model, "mock-model");
});

test("11. invalid semantic adapter output falls back in auto", async () => {
  const r = await buildSemanticFileUnderstandingReport(base({ semanticMode: "auto", semanticUnderstanding: garbageAdapter }));
  assert.equal(r.normalizationTrace.method, "deterministic-fallback");
  assert.equal(r.status.value, "provider-unavailable");
});

test("12. invalid semantic adapter output blocks in required", async () => {
  await assert.rejects(
    () => buildSemanticFileUnderstandingReport(base({ semanticMode: "required", semanticUnderstanding: garbageAdapter })),
    /required/i,
  );
});

test("13. provider output is shape-checked (bad signal coerced/dropped)", async () => {
  const adapter = async () => ({
    summary: { purpose: "P" },
    capabilitySignals: [
      { id: "ok", label: "fine", confidence: "bogus", sourceEvidence: [] },
      { label: "no id — dropped", confidence: "high" },
    ],
    findings: [{ id: "f1", severity: "nope", message: "m", sourceEvidence: [] }],
  });
  const r = await buildSemanticFileUnderstandingReport(base({ semanticMode: "auto", semanticUnderstanding: adapter }));
  assert.equal(r.capabilitySignals.length, 1);
  assert.equal(r.capabilitySignals[0].confidence, "low"); // bogus -> low
  assert.equal(r.findings[0].severity, "low"); // nope -> low
  assert.equal(validateSemanticFileUnderstandingReport(r).ok, true);
});

test("14. report creates no PreparedIntentPlan", async () => {
  const r = await buildSemanticFileUnderstandingReport(base());
  assert.equal(r.boundaries.createdPreparedIntentPlan, false);
});

test("15. report creates no WorkOrder", async () => {
  const r = await buildSemanticFileUnderstandingReport(base());
  assert.equal(r.boundaries.createdWorkOrder, false);
});

test("16. report creates no VerificationPlan", async () => {
  const r = await buildSemanticFileUnderstandingReport(base());
  assert.equal(r.boundaries.createdVerificationPlan, false);
});

test("17. report generates no embeddings", async () => {
  const r = await buildSemanticFileUnderstandingReport(base({ semanticMode: "auto", semanticUnderstanding: goodAdapter }));
  assert.equal(r.boundaries.generatedEmbeddings, false);
});

// --- 18-24: CLI (no-key) ----------------------------------------------------

const noKeyEnv = () => {
  const env = { ...process.env };
  delete env.OPENAI_API_KEY;
  delete env.REKON_LLM_ENABLED;
  delete env.REKON_LLM_PROVIDER;
  delete env.REKON_LLM_MODEL;
  delete env.REKON_RUN_LIVE_LLM_TESTS;
  return env;
};
function makeRepo() {
  const TMP = mkdtempSync(join(tmpdir(), "rekon-sfu-"));
  const ROOT = join(TMP, "repo");
  mkdirSync(join(ROOT, "src"), { recursive: true });
  writeFileSync(join(ROOT, "package.json"), JSON.stringify({ name: "sfu", version: "0.0.0", type: "module" }) + "\n");
  writeFileSync(join(ROOT, FILE), TS_SRC);
  return ROOT;
}
const understandPath = (ROOT, path, mode, extra = []) =>
  spawnSync(process.execPath, [cliPath, "semantic", "file", "understand", "--path", path, "--semantic", mode, ...extra, "--root", ROOT, "--json"], {
    encoding: "utf8",
    env: noKeyEnv(),
  });
const understand = (ROOT, mode, extra = []) => understandPath(ROOT, FILE, mode, extra);
const countReports = (ROOT) => {
  const out = spawnSync(process.execPath, [cliPath, "artifacts", "list", "--root", ROOT, "--type", "SemanticFileUnderstandingReport", "--json"], {
    encoding: "utf8",
    env: noKeyEnv(),
  }).stdout;
  try {
    const j = JSON.parse(out);
    return Array.isArray(j.artifacts) ? j.artifacts.length : 0;
  } catch {
    return 0;
  }
};

test("18. CLI --semantic off writes exactly one report", () => {
  const ROOT = makeRepo();
  const res = understand(ROOT, "off");
  assert.equal(res.status, 0, res.stderr);
  const json = JSON.parse(res.stdout);
  assert.equal(json.artifact.type, "SemanticFileUnderstandingReport");
  assert.equal(json.normalization.method, "deterministic");
  assert.equal(countReports(ROOT), 1);
});

test("19. CLI --semantic auto with no provider falls back and writes one report", () => {
  const ROOT = makeRepo();
  const res = understand(ROOT, "auto", ["--llm-provider", "openai", "--llm-model", "test-model"]);
  assert.equal(res.status, 0, res.stderr);
  const json = JSON.parse(res.stdout);
  assert.equal(json.normalization.method, "deterministic-fallback");
  assert.equal(json.status, "provider-unavailable");
  assert.equal(countReports(ROOT), 1);
});

test("20. CLI --semantic required with no provider exits non-zero and writes no report", () => {
  const ROOT = makeRepo();
  const res = understand(ROOT, "required", ["--llm-provider", "openai", "--llm-model", "test-model"]);
  assert.notEqual(res.status, 0);
  assert.equal(countReports(ROOT), 0);
});

test("21. CLI help lists `semantic file understand`", () => {
  const res = spawnSync(process.execPath, [cliPath], { encoding: "utf8", env: noKeyEnv() });
  assert.match(res.stdout + res.stderr, /semantic file understand/);
});

test("22. written report validates clean via artifacts validate", () => {
  const ROOT = makeRepo();
  understand(ROOT, "off");
  const res = spawnSync(process.execPath, [cliPath, "artifacts", "validate", "--root", ROOT, "--json"], { encoding: "utf8", env: noKeyEnv() });
  const json = JSON.parse(res.stdout);
  assert.equal(json.valid, true);
});

test("23. the source file is never modified", () => {
  const ROOT = makeRepo();
  const before = readFileSync(join(ROOT, FILE), "utf8");
  understand(ROOT, "auto", ["--llm-provider", "openai", "--llm-model", "test-model"]);
  const after = readFileSync(join(ROOT, FILE), "utf8");
  assert.equal(after, before);
});

test("24. CLI refuses semantic file paths outside --root before reading", () => {
  const ROOT = makeRepo();
  const outsideRoot = mkdtempSync(join(tmpdir(), "rekon-sfu-outside-"));
  const outsideFile = join(outsideRoot, "outside.ts");
  writeFileSync(outsideFile, "export const outside = true;\n");

  const res = understandPath(ROOT, outsideFile, "auto", ["--llm-provider", "openai", "--llm-model", "test-model"]);

  assert.notEqual(res.status, 0);
  assert.match(res.stderr, /outside --root/);
  assert.equal(countReports(ROOT), 0);
});

test("25. semantic problem classes survive coercion while unknown classes remain generic", async () => {
  const adapter = async () => ({
    summary: { purpose: "P" },
    findings: [
      {
        id: "dependency-precedence",
        problemClass: "dependency-resolution",
        severity: "high",
        message: "A later match can replace an earlier match.",
        sourceEvidence: ["export const existing = \"ok\";"],
      },
      {
        id: "unknown-class",
        problemClass: "invented-class",
        severity: "low",
        message: "Unknown classes must not acquire built-in meaning.",
        sourceEvidence: ["export const existing = \"ok\";"],
      },
    ],
  });
  const report = await buildSemanticFileUnderstandingReport(base({ semanticMode: "auto", semanticUnderstanding: adapter }));

  assert.equal(report.findings[0].problemClass, "dependency-resolution");
  assert.equal(report.findings[1].problemClass, undefined);
  assert.equal(validateSemanticFileUnderstandingReport(report).ok, true);
  const tampered = {
    ...report,
    findings: [{ ...report.findings[0], problemClass: "invented-class" }],
  };
  assert.equal(validateSemanticFileUnderstandingReport(tampered).ok, false);
});

test("26. production semantic prompt and schema define bounded problem classes", () => {
  const prompt = buildSemanticFileUnderstandingPrompt({ filePath: FILE, fileText: TS_SRC, language: "typescript" });
  assert.match(prompt, /dependency-resolution/);
  assert.match(prompt, /cache-integrity/);
  assert.match(prompt, /not proven defects/);
  const findingSchema = SEMANTIC_FILE_UNDERSTANDING_JSON_SCHEMA.properties.findings.items;
  assert.deepEqual(findingSchema.properties.problemClass.enum, ["dependency-resolution", "cache-integrity", "other"]);
  assert.ok(findingSchema.required.includes("problemClass"));
});
