// Contract tests for the capability ontology vocabulary
// expansion v1 slice (`CapabilityOntologySuggestionReport` +
// `rekon capability ontology suggestions` CLI command).
//
// The suggestion report is **preview-only**: it transforms
// `extend-ontology` decisions from the latest
// CapabilityNormalizationReviewLedger into a proposed config
// patch, but it NEVER mutates `.rekon/capability-ontology.json`,
// the ledger, the underlying CapabilityNormalizationReport, or
// CapabilityMap. Source files are never written.
//
// Tests pin:
//   - report validator accepts a populated report
//   - extend-ontology verb without suggestedCanonical → add-canonical-verb
//   - extend-ontology noun without suggestedCanonical → add-canonical-noun
//   - extend-ontology verb with suggestedCanonical → add-verb-alias
//   - extend-ontology noun with suggestedCanonical → add-noun-alias
//   - candidate-level extend decision is skipped with the v1 reason
//   - non-extend decisions are ignored
//   - duplicate suggestions are deduped
//   - existing config is included in the before/after preview
//   - .rekon/capability-ontology.json is not created automatically
//   - CLI writes a CapabilityOntologySuggestionReport
//   - CLI supports --ledger pinning
//   - CLI human output says "Config remains unchanged."
//   - CapabilityNormalizationReviewLedger is not mutated
//   - CapabilityNormalizationReport is not mutated
//   - CapabilityMap is not mutated (no new entries added)
//   - rekon artifacts validate stays clean

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cp,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  buildCapabilityOntologySuggestionReport,
  validateCapabilityOntologySuggestionReport,
} from "../../packages/capability-ontology/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- 1: report validator accepts a populated report ----------

test("validateCapabilityOntologySuggestionReport accepts a populated report", () => {
  const ledger = makeLedger([
    entry("noun", "demo", "extend-ontology"),
  ]);
  const report = buildCapabilityOntologySuggestionReport({
    header: makeReportHeader(),
    ledger,
    ledgerRef: makeLedgerRef(),
  });
  const result = validateCapabilityOntologySuggestionReport(report);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.report.summary.total, 1);
  }
});

// ---------- 2: extend-ontology verb without suggestedCanonical ----------

test("extend-ontology verb without suggestedCanonical becomes add-canonical-verb", () => {
  const ledger = makeLedger([entry("verb", "ensure", "extend-ontology")]);
  const report = buildCapabilityOntologySuggestionReport({
    header: makeReportHeader(),
    ledger,
    ledgerRef: makeLedgerRef(),
  });
  assert.equal(report.suggestions.length, 1);
  assert.equal(report.suggestions[0].kind, "add-canonical-verb");
  assert.equal(report.suggestions[0].canonical, undefined);
  assert.equal(report.summary.addCanonicalVerb, 1);
});

// ---------- 3: extend-ontology noun without suggestedCanonical ----------

test("extend-ontology noun without suggestedCanonical becomes add-canonical-noun", () => {
  const ledger = makeLedger([entry("noun", "schema", "extend-ontology")]);
  const report = buildCapabilityOntologySuggestionReport({
    header: makeReportHeader(),
    ledger,
    ledgerRef: makeLedgerRef(),
  });
  assert.equal(report.suggestions[0].kind, "add-canonical-noun");
  assert.equal(report.summary.addCanonicalNoun, 1);
});

// ---------- 4: extend-ontology verb with suggestedCanonical ----------

test("extend-ontology verb with suggestedCanonical becomes add-verb-alias", () => {
  const ledger = makeLedger([
    entry("verb", "ensure", "extend-ontology", { suggestedCanonical: "validate" }),
  ]);
  const report = buildCapabilityOntologySuggestionReport({
    header: makeReportHeader(),
    ledger,
    ledgerRef: makeLedgerRef(),
  });
  assert.equal(report.suggestions[0].kind, "add-verb-alias");
  assert.equal(report.suggestions[0].canonical, "validate");
  assert.equal(report.summary.addVerbAlias, 1);
});

// ---------- 5: extend-ontology noun with suggestedCanonical ----------

test("extend-ontology noun with suggestedCanonical becomes add-noun-alias", () => {
  const ledger = makeLedger([
    entry("noun", "receipt", "extend-ontology", { suggestedCanonical: "invoice" }),
  ]);
  const report = buildCapabilityOntologySuggestionReport({
    header: makeReportHeader(),
    ledger,
    ledgerRef: makeLedgerRef(),
  });
  assert.equal(report.suggestions[0].kind, "add-noun-alias");
  assert.equal(report.suggestions[0].canonical, "invoice");
  assert.equal(report.summary.addNounAlias, 1);
});

// ---------- 6: candidate-level extend decision is skipped ----------

test("candidate-level extend-ontology decision is skipped in v1", () => {
  const ledger = makeLedger([
    entry("candidate", "runtime", "extend-ontology"),
  ]);
  const report = buildCapabilityOntologySuggestionReport({
    header: makeReportHeader(),
    ledger,
    ledgerRef: makeLedgerRef(),
  });
  assert.equal(report.suggestions.length, 0);
  assert.equal(report.skipped.length, 1);
  assert.equal(report.skipped[0].reason, "candidate-level decisions require manual ontology editing.");
  assert.equal(report.summary.skipped, 1);
});

// ---------- 7: non-extend decisions are ignored ----------

test("non-extend-ontology decisions are ignored", () => {
  const ledger = makeLedger([
    entry("verb", "ensure", "rename-symbol"),
    entry("noun", "junk", "noise-filter"),
    entry("noun", "later", "defer"),
  ]);
  const report = buildCapabilityOntologySuggestionReport({
    header: makeReportHeader(),
    ledger,
    ledgerRef: makeLedgerRef(),
  });
  assert.equal(report.suggestions.length, 0);
  assert.equal(report.skipped.length, 0);
  assert.equal(report.summary.total, 0);
});

// ---------- 8: duplicate suggestions are deduped ----------

test("duplicate extend-ontology decisions produce one suggestion", () => {
  const ledger = makeLedger([
    entry("verb", "ensure", "extend-ontology", { suggestedCanonical: "validate" }),
    entry("verb", "Ensure", "extend-ontology", { suggestedCanonical: "validate" }),
    entry("verb", "ensure", "extend-ontology", { suggestedCanonical: "validate" }),
  ]);
  const report = buildCapabilityOntologySuggestionReport({
    header: makeReportHeader(),
    ledger,
    ledgerRef: makeLedgerRef(),
  });
  assert.equal(report.suggestions.length, 1, "duplicates should collapse");
  assert.equal(report.summary.addVerbAlias, 1);
});

// ---------- 9: existing config flows into preview before/after ----------

test("existing config is included in the before/after preview", () => {
  const ledger = makeLedger([entry("noun", "schema", "extend-ontology")]);
  const existingConfig = {
    version: "0.1.0",
    nouns: {
      canonical: ["invoice"],
    },
  };
  const report = buildCapabilityOntologySuggestionReport({
    header: makeReportHeader(),
    ledger,
    ledgerRef: makeLedgerRef(),
    existingConfig,
  });
  assert.ok(report.preview.patch, "preview should include a patch when suggestions exist");
  const beforeParsed = JSON.parse(report.preview.patch.before);
  const afterParsed = JSON.parse(report.preview.patch.after);
  assert.deepEqual(beforeParsed.nouns?.canonical, ["invoice"]);
  assert.ok(
    afterParsed.nouns.canonical.includes("invoice"),
    "after must keep existing canonical entries",
  );
  assert.ok(
    afterParsed.nouns.canonical.includes("schema"),
    "after must include the proposed canonical entry",
  );
});

// ---------- 10: .rekon/capability-ontology.json is not created ----------

test("rekon capability ontology suggestions does not create .rekon/capability-ontology.json", async () => {
  const work = await setupWorkspaceWithLedger("extend-ontology noun");
  try {
    runCli(work, ["capability", "ontology", "suggestions", "--json"]);
    const configPath = join(work, ".rekon/capability-ontology.json");
    assert.equal(
      existsSync(configPath),
      false,
      ".rekon/capability-ontology.json must not be created automatically",
    );
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 11: CLI writes a CapabilityOntologySuggestionReport ----------

test("rekon capability ontology suggestions writes a CapabilityOntologySuggestionReport", async () => {
  const work = await setupWorkspaceWithLedger("extend-ontology noun");
  try {
    const result = runCli(work, [
      "capability",
      "ontology",
      "suggestions",
      "--json",
    ]);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.artifact.type, "CapabilityOntologySuggestionReport");
    assert.equal(payload.summary.addCanonicalNoun, 1);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 12: CLI supports pinned --ledger ----------

test("rekon capability ontology suggestions supports --ledger <ref>", async () => {
  const work = await setupWorkspaceWithLedger("extend-ontology noun");
  try {
    const ledgerRef = runCli(work, [
      "artifacts",
      "latest",
      "--type",
      "CapabilityNormalizationReviewLedger",
      "--id-only",
    ]).stdout.trim();
    const result = runCli(work, [
      "capability",
      "ontology",
      "suggestions",
      "--ledger",
      ledgerRef,
      "--json",
    ]);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.ledgerRef.type, "CapabilityNormalizationReviewLedger");
    assert.equal(payload.ledgerRef.id, ledgerRef.split(":", 2)[1]);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 13: CLI human output says config remains unchanged ----------

test("rekon capability ontology suggestions human output says 'Config remains unchanged.'", async () => {
  const work = await setupWorkspaceWithLedger("extend-ontology noun");
  try {
    const result = runCli(work, ["capability", "ontology", "suggestions"]);
    assert.match(result.stdout, /Config remains unchanged\./);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 14: ledger is not mutated ----------

test("rekon capability ontology suggestions does not mutate the CapabilityNormalizationReviewLedger", async () => {
  const work = await setupWorkspaceWithLedger("extend-ontology noun");
  try {
    const ledgerRef = runCli(work, [
      "artifacts",
      "latest",
      "--type",
      "CapabilityNormalizationReviewLedger",
      "--id-only",
    ]).stdout.trim();
    const ledgerId = ledgerRef.split(":", 2)[1];
    const ledgerPath = join(
      work,
      ".rekon/artifacts/actions",
      `CapabilityNormalizationReviewLedger-${ledgerId}.json`,
    );
    const before = createHash("sha256")
      .update(await readFile(ledgerPath, "utf8"))
      .digest("hex");
    runCli(work, ["capability", "ontology", "suggestions", "--json"]);
    const after = createHash("sha256")
      .update(await readFile(ledgerPath, "utf8"))
      .digest("hex");
    assert.equal(before, after);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 15: CapabilityNormalizationReport is not mutated ----------

test("rekon capability ontology suggestions does not mutate CapabilityNormalizationReport", async () => {
  const work = await setupWorkspaceWithLedger("extend-ontology noun");
  try {
    const reportRef = runCli(work, [
      "artifacts",
      "latest",
      "--type",
      "CapabilityNormalizationReport",
      "--id-only",
    ]).stdout.trim();
    const reportId = reportRef.split(":", 2)[1];
    const reportPath = join(
      work,
      ".rekon/artifacts/projections",
      `CapabilityNormalizationReport-${reportId}.json`,
    );
    const before = createHash("sha256")
      .update(await readFile(reportPath, "utf8"))
      .digest("hex");
    runCli(work, ["capability", "ontology", "suggestions", "--json"]);
    const after = createHash("sha256")
      .update(await readFile(reportPath, "utf8"))
      .digest("hex");
    assert.equal(before, after);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 16: CapabilityMap is not mutated ----------

test("rekon capability ontology suggestions does not add a CapabilityMap artifact", async () => {
  const work = await setupWorkspaceWithLedger("extend-ontology noun");
  try {
    const indexPath = join(work, ".rekon/registry/artifacts.index.json");
    const beforeIndex = JSON.parse(await readFile(indexPath, "utf8"));
    const beforeMap = beforeIndex.filter((entry) => entry.type === "CapabilityMap");
    runCli(work, ["capability", "ontology", "suggestions", "--json"]);
    const afterIndex = JSON.parse(await readFile(indexPath, "utf8"));
    const afterMap = afterIndex.filter((entry) => entry.type === "CapabilityMap");
    assert.equal(
      afterMap.length,
      beforeMap.length,
      "suggestions must not change the CapabilityMap artifact count",
    );
    for (const entry of afterMap) {
      const beforeEntry = beforeMap.find((other) => other.id === entry.id);
      assert.ok(beforeEntry, "suggestions must not add new CapabilityMap entries");
      assert.equal(entry.digest, beforeEntry.digest);
    }
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 17: artifacts validate stays clean ----------

test("rekon artifacts validate stays clean after suggestions", async () => {
  const work = await setupWorkspaceWithLedger("extend-ontology noun");
  try {
    runCli(work, ["capability", "ontology", "suggestions", "--json"]);
    const validate = runCli(work, ["artifacts", "validate", "--json"]);
    const payload = JSON.parse(validate.stdout);
    assert.ok(Array.isArray(payload.issues));
    assert.equal(payload.issues.length, 0);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- Helpers ----------

function makeReportHeader() {
  return {
    artifactType: "CapabilityOntologySuggestionReport",
    artifactId: "suggestions-test",
    schemaVersion: "0.1.0",
    generatedAt: "2026-05-26T00:00:00Z",
    subject: { repoId: "/tmp/test" },
    producer: { id: "@rekon/cli", version: "0.1.0" },
    inputRefs: [],
    freshness: { status: "fresh" },
  };
}

function makeLedgerRef() {
  return {
    type: "CapabilityNormalizationReviewLedger",
    id: "ledger-test",
    schemaVersion: "0.1.0",
  };
}

function makeLedger(entries) {
  return {
    header: {
      artifactType: "CapabilityNormalizationReviewLedger",
      artifactId: "ledger-test",
      schemaVersion: "0.1.0",
      generatedAt: "2026-05-26T00:00:00Z",
      subject: { repoId: "/tmp/test" },
      producer: { id: "@rekon/cli", version: "0.1.0" },
      inputRefs: [],
      freshness: { status: "fresh" },
    },
    entries,
    summary: {
      total: entries.length,
      extendOntology: entries.filter((e) => e.decision === "extend-ontology").length,
      renameSymbol: entries.filter((e) => e.decision === "rename-symbol").length,
      noiseFilter: entries.filter((e) => e.decision === "noise-filter").length,
      defer: entries.filter((e) => e.decision === "defer").length,
    },
  };
}

function entry(termKind, term, decision, extras = {}) {
  return {
    id: `review-${decision}-${termKind}-${term.toLowerCase()}`,
    term,
    termKind,
    decision,
    reason: "test",
    createdAt: "2026-05-26T00:00:00Z",
    ...extras,
  };
}

async function setupWorkspaceWithLedger() {
  const work = await mkdtemp(join(tmpdir(), "rekon-suggestions-test-"));
  await cp(exampleRoot, work, { recursive: true });
  await rm(join(work, ".rekon"), { recursive: true, force: true });
  runCli(work, ["init"]);
  runCli(work, ["refresh", "--skip-publish", "--skip-freshness"]);
  runCli(work, ["capability", "ontology", "normalize", "--json"]);
  const reportRef = runCli(work, [
    "artifacts",
    "latest",
    "--type",
    "CapabilityNormalizationReport",
    "--id-only",
  ]).stdout.trim();
  // Mix of decisions: one extend-ontology (noun), one alias
  // (verb), one noise-filter (ignored), one candidate (skipped).
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
    "vocab gap",
    "--report",
    reportRef,
    "--json",
  ]);
  runCli(work, [
    "capability",
    "ontology",
    "review",
    "decide",
    "--term",
    "ensure",
    "--term-kind",
    "verb",
    "--decision",
    "extend-ontology",
    "--reason",
    "alias",
    "--suggested-canonical",
    "validate",
    "--report",
    reportRef,
    "--json",
  ]);
  runCli(work, [
    "capability",
    "ontology",
    "review",
    "decide",
    "--term",
    "junk",
    "--term-kind",
    "noun",
    "--decision",
    "noise-filter",
    "--reason",
    "noise",
    "--report",
    reportRef,
    "--json",
  ]);
  runCli(work, [
    "capability",
    "ontology",
    "review",
    "decide",
    "--term",
    "runtime",
    "--term-kind",
    "candidate",
    "--decision",
    "extend-ontology",
    "--reason",
    "single-token",
    "--report",
    reportRef,
    "--json",
  ]);
  return work;
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
