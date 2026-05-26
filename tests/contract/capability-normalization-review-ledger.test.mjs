// Contract tests for the capability ontology unknown-term
// operator review surface (CapabilityNormalizationReviewLedger
// + suggestions / decide / decisions CLI subcommands).
//
// The review surface is **append-only**: deciding a term writes
// a new entry into the ledger, but never mutates the underlying
// `CapabilityNormalizationReport`, the operator-supplied
// ontology config, or `CapabilityMap`. Source files are never
// touched.
//
// Tests pin:
//   - ledger validator accepts a populated ledger
//   - ledger validator accepts an empty ledger
//   - summary counts decisions by kind
//   - suggestions aggregates unknown verbs
//   - suggestions aggregates unknown nouns
//   - suggestions aggregates low-confidence candidates
//   - suggestions excludes already-decided terms by default
//   - suggestions includes decided terms with --include-decided
//   - decide creates a ledger when none exists
//   - decide appends to an existing ledger
//   - decide cites the source CapabilityNormalizationReport
//   - decisions command lists the latest ledger
//   - invalid --decision is rejected
//   - decide requires --reason
//   - decide does not mutate CapabilityNormalizationReport
//   - decide does not mutate .rekon/capability-ontology.json
//   - decide does not write a CapabilityMap artifact
//   - rekon artifacts validate stays clean after decide

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cp,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";

import {
  appendCapabilityNormalizationReviewDecision,
  buildDecidedKeySet,
  suggestUnknownTerms,
  summarizeCapabilityNormalizationReviewLedger,
  validateCapabilityNormalizationReviewLedger,
} from "../../packages/capability-ontology/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- 1: validator accepts a populated ledger ----------

test("validateCapabilityNormalizationReviewLedger accepts a populated ledger", () => {
  const ledger = makeLedger([
    { id: "review-001", term: "demo", termKind: "noun", decision: "defer", reason: "smoke" },
  ]);
  const result = validateCapabilityNormalizationReviewLedger(ledger);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.ledger.entries.length, 1);
  }
});

// ---------- 2: validator accepts an empty ledger ----------

test("validateCapabilityNormalizationReviewLedger accepts an empty ledger", () => {
  const ledger = makeLedger([]);
  const result = validateCapabilityNormalizationReviewLedger(ledger);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.ledger.summary.total, 0);
  }
});

// ---------- 3: summary counts decisions by kind ----------

test("summarizeCapabilityNormalizationReviewLedger counts decisions", () => {
  const summary = summarizeCapabilityNormalizationReviewLedger([
    { id: "a", term: "x", termKind: "verb", decision: "extend-ontology", reason: "r", createdAt: "2026-05-26T00:00:00Z" },
    { id: "b", term: "y", termKind: "noun", decision: "rename-symbol", reason: "r", createdAt: "2026-05-26T00:00:01Z" },
    { id: "c", term: "z", termKind: "noun", decision: "noise-filter", reason: "r", createdAt: "2026-05-26T00:00:02Z" },
    { id: "d", term: "w", termKind: "candidate", decision: "defer", reason: "r", createdAt: "2026-05-26T00:00:03Z" },
    { id: "e", term: "v", termKind: "verb", decision: "extend-ontology", reason: "r", createdAt: "2026-05-26T00:00:04Z" },
  ]);
  assert.deepEqual(summary, {
    total: 5,
    extendOntology: 2,
    renameSymbol: 1,
    noiseFilter: 1,
    defer: 1,
  });
});

// ---------- 4: suggestions aggregates unknown verbs ----------

test("suggestUnknownTerms aggregates unknown verbs", () => {
  const report = makeReport([
    candidate("c0", "fetchUser", "unknown-verb", "fetch", "user"),
    candidate("c1", "fetchToken", "unknown-verb", "fetch", "token"),
  ]);
  const suggestions = suggestUnknownTerms(report);
  const verbEntry = suggestions.find((s) => s.term === "fetch" && s.termKind === "verb");
  assert.ok(verbEntry, "fetch verb should be aggregated");
  assert.equal(verbEntry.count, 2);
});

// ---------- 5: suggestions aggregates unknown nouns ----------

test("suggestUnknownTerms aggregates unknown nouns", () => {
  const report = makeReport([
    candidate("c0", "getSchema", "unknown-noun", "get", "schema"),
    candidate("c1", "createSchema", "unknown-noun", "create", "schema"),
  ]);
  const suggestions = suggestUnknownTerms(report);
  const nounEntry = suggestions.find((s) => s.term === "schema" && s.termKind === "noun");
  assert.ok(nounEntry, "schema noun should be aggregated");
  assert.equal(nounEntry.count, 2);
});

// ---------- 6: suggestions aggregates low-confidence candidates ----------

test("suggestUnknownTerms aggregates low-confidence single-token candidates", () => {
  const report = makeReport([
    candidate("c0", "runtime", "low-confidence", "runtime", undefined),
    candidate("c1", "runtime", "low-confidence", "runtime", undefined),
    candidate("c2", "dynamic", "low-confidence", "dynamic", undefined),
  ]);
  const suggestions = suggestUnknownTerms(report);
  const runtimeEntry = suggestions.find(
    (s) => s.term === "runtime" && s.termKind === "candidate",
  );
  assert.ok(runtimeEntry, "runtime should be aggregated as a candidate");
  assert.equal(runtimeEntry.count, 2);
});

// ---------- 7: suggestions excludes decided terms by default ----------

test("suggestUnknownTerms excludes already-decided terms by default", () => {
  const report = makeReport([
    candidate("c0", "fetchUser", "unknown-verb", "fetch", "user"),
    candidate("c1", "saveUser", "unknown-verb", "save-once", "user"),
  ]);
  const ledger = makeLedger([
    {
      id: "review-001",
      term: "fetch",
      termKind: "verb",
      decision: "extend-ontology",
      reason: "smoke",
    },
  ]);
  const excluded = buildDecidedKeySet(ledger);
  const suggestions = suggestUnknownTerms(report, { excludeDecidedKeys: excluded });
  const fetchEntry = suggestions.find((s) => s.term === "fetch");
  assert.equal(fetchEntry, undefined, "fetch should be excluded once decided");
});

// ---------- 8: suggestions includes decided terms with override ----------

test("suggestUnknownTerms includes decided terms when override is empty", () => {
  const report = makeReport([
    candidate("c0", "fetchUser", "unknown-verb", "fetch", "user"),
  ]);
  const suggestions = suggestUnknownTerms(report, { excludeDecidedKeys: new Set() });
  const fetchEntry = suggestions.find((s) => s.term === "fetch");
  assert.ok(fetchEntry, "fetch should appear when no terms are excluded");
});

// ---------- 9: decide creates a ledger when none exists (CLI) ----------

test("rekon capability ontology review decide creates a ledger when none exists", async () => {
  const work = await setupWorkspace();
  try {
    const reportRef = await runNormalize(work);
    const decided = runCli(work, [
      "capability",
      "ontology",
      "review",
      "decide",
      "--term",
      "demo",
      "--term-kind",
      "noun",
      "--decision",
      "defer",
      "--reason",
      "smoke decision",
      "--report",
      reportRef,
      "--json",
    ]);
    const payload = JSON.parse(decided.stdout);
    assert.equal(payload.artifact.type, "CapabilityNormalizationReviewLedger");
    assert.equal(payload.summary.total, 1);
    assert.equal(payload.entry.term, "demo");
    assert.equal(payload.entry.decision, "defer");
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 10: decide appends to an existing ledger ----------

test("rekon capability ontology review decide appends to an existing ledger", async () => {
  const work = await setupWorkspace();
  try {
    const reportRef = await runNormalize(work);
    runCli(work, [
      "capability",
      "ontology",
      "review",
      "decide",
      "--term",
      "demo",
      "--term-kind",
      "noun",
      "--decision",
      "defer",
      "--reason",
      "first",
      "--report",
      reportRef,
      "--json",
    ]);
    const second = runCli(work, [
      "capability",
      "ontology",
      "review",
      "decide",
      "--term",
      "fetch",
      "--term-kind",
      "verb",
      "--decision",
      "extend-ontology",
      "--reason",
      "second",
      "--report",
      reportRef,
      "--json",
    ]);
    const payload = JSON.parse(second.stdout);
    assert.equal(payload.summary.total, 2);
    assert.equal(payload.summary.extendOntology, 1);
    assert.equal(payload.summary.defer, 1);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 11: decide cites the source report ----------

test("rekon capability ontology review decide cites the source report", async () => {
  const work = await setupWorkspace();
  try {
    const reportRef = await runNormalize(work);
    const decided = runCli(work, [
      "capability",
      "ontology",
      "review",
      "decide",
      "--term",
      "demo",
      "--term-kind",
      "noun",
      "--decision",
      "defer",
      "--reason",
      "smoke",
      "--report",
      reportRef,
      "--json",
    ]);
    const payload = JSON.parse(decided.stdout);
    assert.equal(
      payload.entry.sourceReportRef.type,
      "CapabilityNormalizationReport",
    );
    assert.equal(payload.entry.sourceReportRef.id, reportRef.split(":", 2)[1]);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 12: decisions command lists latest ledger ----------

test("rekon capability ontology review decisions lists the latest ledger", async () => {
  const work = await setupWorkspace();
  try {
    const reportRef = await runNormalize(work);
    runCli(work, [
      "capability",
      "ontology",
      "review",
      "decide",
      "--term",
      "demo",
      "--term-kind",
      "noun",
      "--decision",
      "defer",
      "--reason",
      "smoke",
      "--report",
      reportRef,
      "--json",
    ]);
    const decisions = runCli(work, [
      "capability",
      "ontology",
      "review",
      "decisions",
      "--json",
    ]);
    const payload = JSON.parse(decisions.stdout);
    assert.equal(payload.kind, "rekon.capability-ontology.review.decisions");
    assert.equal(payload.summary.total, 1);
    assert.equal(payload.entries.length, 1);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 13: invalid --decision is rejected ----------

test("rekon capability ontology review decide rejects invalid --decision", async () => {
  const work = await setupWorkspace();
  try {
    const reportRef = await runNormalize(work);
    const result = runCli(work, [
      "capability",
      "ontology",
      "review",
      "decide",
      "--term",
      "demo",
      "--term-kind",
      "noun",
      "--decision",
      "delete",
      "--reason",
      "smoke",
      "--report",
      reportRef,
      "--json",
    ], { allowFailure: true });
    assert.notEqual(result.status, 0, "decide should refuse an invalid --decision");
    assert.match(
      result.stderr + result.stdout,
      /--decision must be one of/i,
    );
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 14: decide requires --reason ----------

test("rekon capability ontology review decide requires --reason", async () => {
  const work = await setupWorkspace();
  try {
    const reportRef = await runNormalize(work);
    const result = runCli(work, [
      "capability",
      "ontology",
      "review",
      "decide",
      "--term",
      "demo",
      "--term-kind",
      "noun",
      "--decision",
      "defer",
      "--report",
      reportRef,
      "--json",
    ], { allowFailure: true });
    assert.notEqual(result.status, 0, "decide should refuse without --reason");
    assert.match(result.stderr + result.stdout, /--reason/);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 15: decide does not mutate CapabilityNormalizationReport ----------

test("rekon capability ontology review decide does not mutate CapabilityNormalizationReport", async () => {
  const work = await setupWorkspace();
  try {
    const reportRef = await runNormalize(work);
    const reportPath = join(
      work,
      ".rekon/artifacts/projections",
      `CapabilityNormalizationReport-${reportRef.split(":", 2)[1]}.json`,
    );
    const before = createHash("sha256")
      .update(await readFile(reportPath, "utf8"))
      .digest("hex");
    runCli(work, [
      "capability",
      "ontology",
      "review",
      "decide",
      "--term",
      "demo",
      "--term-kind",
      "noun",
      "--decision",
      "defer",
      "--reason",
      "smoke",
      "--report",
      reportRef,
      "--json",
    ]);
    const after = createHash("sha256")
      .update(await readFile(reportPath, "utf8"))
      .digest("hex");
    assert.equal(before, after);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 16: decide does not mutate ontology config ----------

test("rekon capability ontology review decide does not mutate .rekon/capability-ontology.json", async () => {
  const work = await setupWorkspace();
  try {
    const reportRef = await runNormalize(work);
    const configPath = join(work, ".rekon/capability-ontology.json");
    runCli(work, [
      "capability",
      "ontology",
      "review",
      "decide",
      "--term",
      "demo",
      "--term-kind",
      "noun",
      "--decision",
      "extend-ontology",
      "--reason",
      "smoke",
      "--report",
      reportRef,
      "--json",
    ]);
    assert.equal(
      existsSync(configPath),
      false,
      ".rekon/capability-ontology.json must not be created automatically",
    );
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 17: decide does not write a CapabilityMap artifact ----------

test("rekon capability ontology review decide does not write a new CapabilityMap artifact", async () => {
  const work = await setupWorkspace();
  try {
    const reportRef = await runNormalize(work);
    const indexPath = join(work, ".rekon/registry/artifacts.index.json");
    // `refresh` already writes a CapabilityMap during `project`.
    // Capture the count before `decide` runs; the decide step must
    // not add another one.
    const beforeIndex = JSON.parse(await readFile(indexPath, "utf8"));
    const beforeMap = beforeIndex.filter((entry) => entry.type === "CapabilityMap");
    runCli(work, [
      "capability",
      "ontology",
      "review",
      "decide",
      "--term",
      "demo",
      "--term-kind",
      "noun",
      "--decision",
      "extend-ontology",
      "--reason",
      "smoke",
      "--report",
      reportRef,
      "--json",
    ]);
    const afterIndex = JSON.parse(await readFile(indexPath, "utf8"));
    const afterMap = afterIndex.filter((entry) => entry.type === "CapabilityMap");
    assert.equal(
      afterMap.length,
      beforeMap.length,
      "decide must not change the CapabilityMap artifact count",
    );
    for (const entry of afterMap) {
      const beforeEntry = beforeMap.find((other) => other.id === entry.id);
      assert.ok(beforeEntry, "decide must not add new CapabilityMap entries");
      assert.equal(
        entry.digest,
        beforeEntry.digest,
        "decide must not change existing CapabilityMap digests",
      );
    }
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 18: artifacts validate stays clean ----------

test("rekon artifacts validate stays clean after a review decision", async () => {
  const work = await setupWorkspace();
  try {
    const reportRef = await runNormalize(work);
    runCli(work, [
      "capability",
      "ontology",
      "review",
      "decide",
      "--term",
      "demo",
      "--term-kind",
      "noun",
      "--decision",
      "defer",
      "--reason",
      "smoke",
      "--report",
      reportRef,
      "--json",
    ]);
    const validate = runCli(work, ["artifacts", "validate", "--json"]);
    const payload = JSON.parse(validate.stdout);
    assert.ok(Array.isArray(payload.issues), "validate must include issues array");
    assert.equal(payload.issues.length, 0);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- Test helpers ----------

function makeHeader(extra = {}) {
  return {
    artifactType: "CapabilityNormalizationReviewLedger",
    artifactId: "ledger-test",
    schemaVersion: "0.1.0",
    generatedAt: "2026-05-26T00:00:00Z",
    subject: { repoId: "/tmp/test" },
    producer: {
      id: "@rekon/cli.capability-ontology-review",
      version: "0.1.0",
    },
    inputRefs: [],
    freshness: { status: "fresh" },
    ...extra,
  };
}

function makeLedger(entries) {
  const fullEntries = entries.map((entry, i) => ({
    createdAt: `2026-05-26T00:00:${String(i).padStart(2, "0")}Z`,
    ...entry,
  }));
  return {
    header: makeHeader(),
    entries: fullEntries,
    summary: summarizeCapabilityNormalizationReviewLedger(fullEntries),
  };
}

function makeReport(candidates) {
  return {
    header: {
      artifactType: "CapabilityNormalizationReport",
      artifactId: "report-test",
      schemaVersion: "0.1.0",
      generatedAt: "2026-05-26T00:00:00Z",
      subject: { repoId: "/tmp/test" },
      producer: { id: "@rekon/cli", version: "0.1.0" },
      inputRefs: [],
      freshness: { status: "fresh" },
    },
    ontology: {
      source: "builtin",
      effectiveHash: "test-hash",
    },
    summary: {
      totalCandidates: candidates.length,
      normalized: 0,
      unknownVerb: 0,
      unknownNoun: 0,
      unknown: 0,
      ignored: 0,
      aliasApplied: 0,
      lowConfidence: 0,
    },
    candidates,
  };
}

function candidate(id, name, status, verb, noun) {
  return {
    id,
    source: { kind: "symbol", path: "src/test.ts", symbol: name },
    raw: {
      name,
      verb,
      noun,
      splitConfidence: verb && noun ? "medium" : "low",
    },
    confidence: verb && noun ? "medium" : "low",
    status,
  };
}

async function setupWorkspace() {
  const work = await mkdtemp(join(tmpdir(), "rekon-review-test-"));
  await cp(exampleRoot, work, { recursive: true });
  await rm(join(work, ".rekon"), { recursive: true, force: true });
  runCli(work, ["init"]);
  runCli(work, ["refresh", "--skip-publish", "--skip-freshness"]);
  return work;
}

async function runNormalize(work) {
  const normalized = runCli(work, [
    "capability",
    "ontology",
    "normalize",
    "--json",
  ]);
  const payload = JSON.parse(normalized.stdout);
  return `CapabilityNormalizationReport:${payload.artifact.id}`;
}

function runCli(cwd, args, { allowFailure = false } = {}) {
  const result = spawnSync(process.execPath, [cliPath, "--root", cwd, ...args], {
    cwd,
    encoding: "utf8",
  });
  if (!allowFailure && result.status !== 0) {
    throw new Error(
      `CLI failed: ${args.join(" ")}\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`,
    );
  }
  return result;
}
