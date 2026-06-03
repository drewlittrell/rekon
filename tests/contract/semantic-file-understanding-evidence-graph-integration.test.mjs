// Contract tests for the Semantic File Understanding -> Evidence Graph
// Integration Implementation (slice 156).
//
// Verifies that `buildCapabilityEvidenceGraph` + `selectSemanticReportsForGraph`
// + `rekon capability graph build --semantic-file-reports / --semantic-file-report-ref`:
//   - stay deterministic-only with no semantic flags (no llm claims, no
//     llm_extraction evidence),
//   - fold a SemanticFileUnderstandingReport in as `llm_extraction` evidence and
//     `llm` / `inference` claims (NEVER facts, NEVER proof),
//   - map purpose/responsibilities/touchedConcepts/capabilitySignals/findings to
//     the right predicates with confidence low/medium/high -> 0.25/0.5/0.75,
//   - keep deterministic facts authoritative (semantic export/import not backed
//     by a deterministic fact -> conflicted; deterministic capability nodes are
//     never overwritten),
//   - never consume a stale / boundary-invalid / unmatched report silently
//     (each becomes a needs-review claim),
//   - keep every graph boundary false (incl. usedLlm) and validate clean,
//   - expose the flags on the CLI, surface a semanticFileReports summary, fail
//     cleanly on an unresolved ref, and leave source files untouched.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  buildCapabilityEvidenceGraph,
  selectSemanticReportsForGraph,
} from "../../packages/capability-model/dist/index.js";
import { validateCapabilityEvidenceGraph } from "../../packages/kernel-repo-model/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");

// Keyless env: the committed suite must never depend on a live key. The graph
// build reads stored artifacts and calls no provider, but strip keys anyway.
const noKeyEnv = { ...process.env };
delete noKeyEnv.OPENAI_API_KEY;
delete noKeyEnv.ANTHROPIC_API_KEY;
delete noKeyEnv.VOYAGE_API_KEY;
delete noKeyEnv.REKON_RUN_LIVE_LLM_TESTS;

const GENERATED_AT = "2026-02-02T00:00:00.000Z";

const FILES = [
  {
    path: "src/index.ts",
    sha256: "sha-current",
    text: `import { join } from "node:path";
export function getUser(id) { return id; }
export const createOrder = (order) => order;
`,
  },
];

const CLEAN_BOUNDARIES = {
  executedCommands: false,
  wroteSourceFiles: false,
  createdPreparedIntentPlan: false,
  createdWorkOrder: false,
  createdVerificationPlan: false,
  generatedEmbeddings: false,
  ranCirce: false,
  implementedIntentGo: false,
};

const REF = { type: "SemanticFileUnderstandingReport", id: "sfu-1", schemaVersion: "0.1.0" };

function richReport(overrides = {}) {
  return {
    file: { path: "src/index.ts", sha256: "sha-current" },
    status: { value: "understood" },
    normalizationTrace: {
      method: "semantic-llm",
      provider: "openai",
      model: "gpt-test",
      provenance: "semantic-llm",
      warnings: [],
    },
    summary: {
      purpose: "Coordinates user and order access.",
      responsibilities: ["Resolve users", "Create orders"],
      publicExports: ["getUser", "createOrder", "phantomExport"],
      imports: ["node:path", "node:crypto"],
      touchedConcepts: ["users", "orders"],
    },
    capabilitySignals: [
      { id: "sig-high", label: "delete account", confidence: "high", sourceEvidence: [{ lineStart: 2, lineEnd: 2, excerpt: "delete" }] },
      { id: "sig-medium", label: "load session", confidence: "medium", sourceEvidence: [{ lineStart: 3, excerpt: "load" }] },
      { id: "sig-low", label: "find token", confidence: "low", sourceEvidence: [{ excerpt: "find" }] },
      { id: "sig-noverb", label: "User Authentication", confidence: "high", sourceEvidence: [{ excerpt: "auth" }] },
      { id: "sig-noevidence", label: "save record", confidence: "high", sourceEvidence: [] },
    ],
    findings: [
      { id: "find-1", severity: "high", message: "Mixed responsibilities.", sourceEvidence: ["lines 2-3"] },
    ],
    boundaries: { ...CLEAN_BOUNDARIES },
    ...overrides,
  };
}

function build(reports) {
  return buildCapabilityEvidenceGraph({
    root: ".",
    files: FILES,
    generatedAt: GENERATED_AT,
    ...(reports ? { semanticFileUnderstandingReports: reports } : {}),
  });
}

// --------------------------------------------------------------------------
// Helper-level: deterministic-only default
// --------------------------------------------------------------------------

test("default build (no semantic reports) is deterministic-only", () => {
  const graph = build();
  assert.equal(graph.claims.some((c) => c.source === "llm"), false, "no llm claims by default");
  assert.equal(graph.evidence.some((e) => e.source === "llm_extraction"), false, "no llm_extraction evidence by default");
  assert.equal(validateCapabilityEvidenceGraph(graph).ok, true, "deterministic graph validates");
});

test("passing an empty semantic report array changes nothing vs deterministic-only", () => {
  const det = build();
  const empty = build([]);
  assert.equal(empty.claims.length, det.claims.length);
  assert.equal(empty.evidence.length, det.evidence.length);
});

// --------------------------------------------------------------------------
// Helper-level: semantic mapping
// --------------------------------------------------------------------------

test("a semantic report adds llm_extraction evidence", () => {
  const graph = build([{ report: richReport(), ref: REF }]);
  assert.ok(graph.evidence.some((e) => e.source === "llm_extraction"), "has llm_extraction evidence");
  const base = graph.evidence.find((e) => e.source === "llm_extraction");
  assert.equal(base.artifactRef?.id, "sfu-1", "evidence carries the report artifactRef");
});

test("a semantic report adds llm inference claims (never facts)", () => {
  const graph = build([{ report: richReport(), ref: REF }]);
  const llmClaims = graph.claims.filter((c) => c.source === "llm");
  assert.ok(llmClaims.length > 0, "has llm claims");
  assert.ok(llmClaims.every((c) => c.claimType === "inference"), "every llm claim is an inference, not a fact");
});

test("summary.purpose maps to a has_purpose claim", () => {
  const graph = build([{ report: richReport(), ref: REF }]);
  const claim = graph.claims.find((c) => c.predicate === "has_purpose");
  assert.ok(claim, "has_purpose claim present");
  assert.equal(claim.object, "Coordinates user and order access.");
  assert.equal(claim.status, "accepted");
});

test("summary.responsibilities map to has_responsibility claims", () => {
  const graph = build([{ report: richReport(), ref: REF }]);
  assert.equal(graph.claims.filter((c) => c.predicate === "has_responsibility").length, 2);
});

test("summary.touchedConcepts map to touches_concept claims", () => {
  const graph = build([{ report: richReport(), ref: REF }]);
  assert.equal(graph.claims.filter((c) => c.predicate === "touches_concept").length, 2);
});

test("derivable capabilitySignal with evidence becomes a capability node", () => {
  const graph = build([{ report: richReport(), ref: REF }]);
  // "delete account" derives cap:delete:account (not a deterministic capability).
  const cap = graph.capabilities.find((c) => c.id === "cap:delete:account");
  assert.ok(cap, "semantic capability node created");
  assert.equal(cap.verb, "delete");
  assert.equal(cap.noun, "account");
  assert.ok(graph.claims.some((c) => c.predicate === "implements_capability"), "implements_capability claim present");
});

test("confidence enum low/medium/high maps to 0.25/0.5/0.75", () => {
  const graph = build([{ report: richReport(), ref: REF }]);
  const high = graph.capabilities.find((c) => c.id === "cap:delete:account");
  const medium = graph.capabilities.find((c) => c.id === "cap:load:session");
  const low = graph.capabilities.find((c) => c.id === "cap:find:token");
  assert.equal(high.confidence, 0.75, "high -> 0.75");
  assert.equal(medium.confidence, 0.5, "medium -> 0.5");
  assert.equal(low.confidence, 0.25, "low -> 0.25");
  assert.ok(graph.capabilities.every((c) => c.confidence < 1), "semantic confidence is never 1.0");
});

test("capabilitySignal without sourceEvidence becomes a needs-review claim, not a node", () => {
  const graph = build([{ report: richReport(), ref: REF }]);
  assert.equal(graph.capabilities.some((c) => c.id === "cap:save:record"), false, "no node for evidence-less signal");
  const claim = graph.claims.find((c) => c.predicate === "has_capability_signal" && c.object.includes("save record"));
  assert.ok(claim, "needs-review claim for the evidence-less signal");
  assert.equal(claim.status, "needs-review");
});

test("capabilitySignal with no derivable verb/noun becomes a needs-review claim, not a node", () => {
  const graph = build([{ report: richReport(), ref: REF }]);
  const claim = graph.claims.find((c) => c.predicate === "has_capability_signal" && c.object === "User Authentication");
  assert.ok(claim, "needs-review claim for the non-derivable signal");
  assert.equal(claim.status, "needs-review");
  assert.equal(graph.capabilities.some((c) => c.noun === "authentication"), false, "no node for non-derivable signal");
});

test("findings map to has_semantic_finding needs-review claims", () => {
  const graph = build([{ report: richReport(), ref: REF }]);
  const claim = graph.claims.find((c) => c.predicate === "has_semantic_finding");
  assert.ok(claim, "has_semantic_finding claim present");
  assert.equal(claim.status, "needs-review");
  assert.equal(claim.object, "Mixed responsibilities.");
});

// --------------------------------------------------------------------------
// Helper-level: conflict model (deterministic facts win)
// --------------------------------------------------------------------------

test("deterministic imports remain fact claims", () => {
  const graph = build([{ report: richReport(), ref: REF }]);
  const importFact = graph.claims.find((c) => c.predicate === "imports" && c.object === "node:path");
  assert.ok(importFact, "node:path import claim present");
  assert.equal(importFact.claimType, "fact");
  assert.equal(importFact.source, "deterministic");
});

test("deterministic exports remain fact claims", () => {
  const graph = build([{ report: richReport(), ref: REF }]);
  const exposeFact = graph.claims.find((c) => c.predicate === "exposes" && c.claimType === "fact");
  assert.ok(exposeFact, "exposes fact present");
  assert.equal(exposeFact.source, "deterministic");
});

test("a semantic export with no deterministic fact becomes a conflicted claim", () => {
  const graph = build([{ report: richReport(), ref: REF }]);
  const conflict = graph.claims.find((c) => c.predicate === "claims_export" && c.object === "phantomExport");
  assert.ok(conflict, "phantomExport conflicted claim present");
  assert.equal(conflict.status, "conflicted");
  assert.equal(conflict.claimType, "inference");
});

test("a semantic import with no deterministic fact becomes a conflicted claim", () => {
  const graph = build([{ report: richReport(), ref: REF }]);
  const conflict = graph.claims.find((c) => c.predicate === "claims_import" && c.object === "node:crypto");
  assert.ok(conflict, "node:crypto conflicted claim present");
  assert.equal(conflict.status, "conflicted");
});

test("semantic signals never overwrite a deterministic capability node", () => {
  // "get user" corroborates the deterministic cap:get:user; the node keeps the
  // deterministic confidence (0.5), and the semantic evidence is appended.
  const report = richReport({
    capabilitySignals: [
      { id: "sig-getuser", label: "get user", confidence: "high", sourceEvidence: [{ excerpt: "getUser" }] },
    ],
  });
  const graph = build([{ report, ref: REF }]);
  const cap = graph.capabilities.find((c) => c.id === "cap:get:user");
  assert.ok(cap, "deterministic cap:get:user present");
  assert.equal(cap.confidence, 0.5, "deterministic confidence preserved (not raised to 0.75)");
});

// --------------------------------------------------------------------------
// Helper-level: staleness (never silent)
// --------------------------------------------------------------------------

test("a sha-mismatched report is not consumed and becomes a needs-review stale claim", () => {
  const stale = richReport({ file: { path: "src/index.ts", sha256: "sha-OLD" } });
  const graph = build([{ report: stale, ref: REF }]);
  assert.equal(graph.claims.some((c) => c.predicate === "has_purpose"), false, "stale purpose not consumed");
  const staleClaim = graph.claims.find((c) => c.predicate === "semantic_report_stale");
  assert.ok(staleClaim, "semantic_report_stale claim present");
  assert.equal(staleClaim.status, "needs-review");
});

test("a stale report contributes no accepted llm claims", () => {
  const stale = richReport({ file: { path: "src/index.ts", sha256: "sha-OLD" } });
  const graph = build([{ report: stale, ref: REF }]);
  assert.equal(graph.claims.filter((c) => c.source === "llm" && c.status === "accepted").length, 0);
});

test("a boundary-invalid report is treated as stale and not consumed", () => {
  const invalid = richReport({ boundaries: { ...CLEAN_BOUNDARIES, executedCommands: true } });
  const graph = build([{ report: invalid, ref: REF }]);
  assert.equal(graph.claims.some((c) => c.predicate === "has_purpose"), false, "invalid report not consumed");
  assert.ok(graph.claims.some((c) => c.predicate === "semantic_report_stale"), "surfaced as stale (never silent)");
});

test("an unmatched-path report becomes a needs-review unmatched claim", () => {
  const unmatched = richReport({ file: { path: "src/other.ts", sha256: "x" } });
  const graph = build([{ report: unmatched, ref: REF }]);
  assert.equal(graph.claims.some((c) => c.predicate === "has_purpose"), false, "unmatched report not consumed");
  const claim = graph.claims.find((c) => c.predicate === "semantic_report_unmatched");
  assert.ok(claim, "semantic_report_unmatched claim present");
  assert.equal(claim.status, "needs-review");
});

// --------------------------------------------------------------------------
// Helper-level: boundaries + validation + selection
// --------------------------------------------------------------------------

test("the graph validates with semantic reports folded in", () => {
  const graph = build([{ report: richReport(), ref: REF }]);
  const result = validateCapabilityEvidenceGraph(graph);
  assert.equal(result.ok, true, JSON.stringify(result.issues));
});

test("no embeddings are generated and usedLlm stays false", () => {
  const graph = build([{ report: richReport(), ref: REF }]);
  assert.equal(graph.boundaries.generatedEmbeddings, false);
  assert.equal(graph.boundaries.usedLlm, false, "graph build reads a stored artifact; it calls no provider");
  assert.equal(graph.evidence.some((e) => e.source === "embedding_similarity"), false, "no embedding evidence");
});

test("selectSemanticReportsForGraph reports requested/used/stale/missing counts", () => {
  const selection = selectSemanticReportsForGraph({
    files: FILES,
    reports: [
      { report: richReport(), ref: REF },
      { report: richReport({ file: { path: "src/index.ts", sha256: "sha-OLD" } }), ref: REF },
      { report: richReport({ file: { path: "src/missing.ts", sha256: "x" } }), ref: REF },
    ],
  });
  assert.equal(selection.requested, 3);
  assert.equal(selection.usable.length, 1);
  assert.equal(selection.stale.length, 1);
  assert.equal(selection.missing.length, 1);
  assert.ok(selection.warnings.length >= 2, "warnings surfaced for stale + missing");
});

// --------------------------------------------------------------------------
// CLI-level: selection / plumbing / safety
// --------------------------------------------------------------------------

function runCli(args, root) {
  return spawnSync(process.execPath, [cliPath, ...args, "--root", root], {
    cwd: root,
    env: noKeyEnv,
    encoding: "utf8",
  });
}

async function makeRepo() {
  const root = await mkdtemp(join(tmpdir(), "rekon-s156-"));
  await mkdir(join(root, "src"), { recursive: true });
  await writeFile(join(root, "package.json"), JSON.stringify({ name: "fx", version: "0.0.0", type: "module" }, null, 2));
  await writeFile(join(root, "src", "index.ts"), "export function getUser(id) {\n  return id;\n}\n");
  return root;
}

async function readGraphArtifact(root) {
  const dir = join(root, ".rekon", "artifacts", "graphs");
  const names = (await readdir(dir)).filter((n) => n.endsWith(".json"));
  let latest;
  for (const name of names) {
    const parsed = JSON.parse(await readFile(join(dir, name), "utf8"));
    if (parsed?.header?.artifactType === "CapabilityEvidenceGraph") latest = parsed;
  }
  return latest;
}

test("CLI: --semantic-file-report-ref consumes the report (semanticFileReports.used = 1)", async () => {
  const root = await makeRepo();
  try {
    const understand = runCli(["semantic", "file", "understand", "--path", "src/index.ts", "--semantic", "off", "--json"], root);
    assert.equal(understand.status, 0, understand.stderr);
    const latest = runCli(["artifacts", "latest", "--type", "SemanticFileUnderstandingReport", "--id-only"], root);
    assert.equal(latest.status, 0, latest.stderr);
    const semRef = latest.stdout.trim();
    assert.ok(semRef.length > 0, "got a semantic report id");

    const detOnly = runCli(["capability", "graph", "build", "--json"], root);
    const detSummary = JSON.parse(detOnly.stdout);
    assert.equal(detSummary.semanticFileReports, undefined, "no semanticFileReports without flags");

    const result = runCli(["capability", "graph", "build", "--semantic-file-report-ref", semRef, "--json"], root);
    assert.equal(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.semanticFileReports.used, 1, "report consumed");
    assert.equal(payload.semanticFileReports.stale, 0);
    assert.ok(payload.summary.inferences > detSummary.summary.inferences, "semantic inferences added");
    assert.equal(payload.boundaries.usedLlm, false);

    const graph = await readGraphArtifact(root);
    assert.ok(graph.evidence.some((e) => e.source === "llm_extraction"), "llm_extraction evidence written");
    assert.ok(graph.claims.some((c) => c.source === "llm" && c.claimType === "inference"), "llm inference claim written");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("CLI: --semantic-file-reports latest selects the matching report", async () => {
  const root = await makeRepo();
  try {
    const understand = runCli(["semantic", "file", "understand", "--path", "src/index.ts", "--semantic", "off", "--json"], root);
    assert.equal(understand.status, 0, understand.stderr);
    const result = runCli(["capability", "graph", "build", "--semantic-file-reports", "latest", "--json"], root);
    assert.equal(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.semanticFileReports.used, 1, "latest selected the matching report");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("CLI: an unresolved --semantic-file-report-ref fails cleanly", async () => {
  const root = await makeRepo();
  try {
    const result = runCli(["capability", "graph", "build", "--semantic-file-report-ref", "does-not-exist", "--json"], root);
    assert.notEqual(result.status, 0, "non-zero exit on unresolved ref");
    assert.match(result.stderr + result.stdout, /could not resolve/i, "clean blocker message");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("CLI: the graph validates and leaves source files untouched", async () => {
  const root = await makeRepo();
  try {
    const before = await readFile(join(root, "src", "index.ts"), "utf8");
    runCli(["semantic", "file", "understand", "--path", "src/index.ts", "--semantic", "off", "--json"], root);
    const latest = runCli(["artifacts", "latest", "--type", "SemanticFileUnderstandingReport", "--id-only"], root);
    const build = runCli(["capability", "graph", "build", "--semantic-file-report-ref", latest.stdout.trim(), "--json"], root);
    assert.equal(build.status, 0, build.stderr);
    const validate = runCli(["artifacts", "validate", "--json"], root);
    assert.equal(validate.status, 0, validate.stderr);
    const after = await readFile(join(root, "src", "index.ts"), "utf8");
    assert.equal(after, before, "source file unchanged");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("CLI help lists the --semantic-file-reports and --semantic-file-report-ref flags", () => {
  const result = spawnSync(process.execPath, [cliPath], { env: noKeyEnv, encoding: "utf8" });
  const text = (result.stdout || "") + (result.stderr || "");
  assert.match(text, /--semantic-file-reports latest/, "help lists --semantic-file-reports");
  assert.match(text, /--semantic-file-report-ref <ref>/, "help lists --semantic-file-report-ref");
});
