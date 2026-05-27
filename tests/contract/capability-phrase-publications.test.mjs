// Contract tests for the CapabilityPhraseReport publication
// surfacing slice. The architecture-summary publisher and
// agent-contract publisher both surface the latest
// CapabilityPhraseReport. Both must be strictly read-only
// with respect to the phrase report itself, the source
// CapabilityNormalizationReport, EvidenceGraph, and
// CapabilityMap.
//
// Tests pin:
//   1.  architecture summary block renders no-report guidance.
//   2.  architecture summary renders Capability Phrases section
//       when report exists.
//   3.  architecture summary renders summary counts.
//   4.  architecture summary renders bounded phrase table.
//   5.  architecture summary says CapabilityMap integration remains
//       deferred.
//   6.  architecture summary cites CapabilityPhraseReport in
//       header.inputRefs when present.
//   7.  agent contract renders Capability Phrases section when
//       report exists.
//   8.  agent contract says CapabilityPhraseReport is semantic
//       purpose projection.
//   9.  agent contract says CapabilityNormalizationReport remains
//       translation audit.
//   10. agent contract says CapabilityMap integration remains
//       deferred.
//   11. agent contract says phrases are not placement policy /
//       preservation contract.
//   12. agent contract cites CapabilityPhraseReport in
//       header.inputRefs when present.
//   13. publication generation does not write a new
//       CapabilityPhraseReport.
//   14. publication generation does not mutate the existing
//       CapabilityPhraseReport.
//   15. publication generation does not mutate
//       CapabilityNormalizationReport.
//   16. publication generation does not mutate CapabilityMap.
//   17. publication generation does not mutate EvidenceGraph.
//   18. rekon artifacts validate stays clean.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cp,
  mkdtemp,
  readFile,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { buildCapabilityPhrasePublicationSection } from "../../packages/capability-docs/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- 1: no-report guidance ----------

test("architecture summary block renders no-report guidance", () => {
  const { lines } = buildCapabilityPhrasePublicationSection({
    report: undefined,
    headingLevel: 2,
  });
  const text = lines.join("\n");
  assert.match(text, /^## Capability Phrases/m);
  assert.match(
    text,
    /No `CapabilityPhraseReport` found\./,
    "no-report block must tell operators how to produce one",
  );
  assert.match(text, /rekon capability phrase project --report/);
  assert.match(text, /CapabilityMap integration remains deferred/);
});

// ---------- 2: section present when report exists ----------

test("architecture summary block renders the Capability Phrases section when a report exists", () => {
  const report = makePhraseReport([phrase("get", "user")]);
  const { lines } = buildCapabilityPhrasePublicationSection({
    report,
    headingLevel: 2,
  });
  const text = lines.join("\n");
  assert.match(text, /^## Capability Phrases/m);
  assert.match(text, /Phrases: 1/);
});

// ---------- 3: summary counts ----------

test("architecture summary block renders summary counts (totalPhrases / stable / partial / lowConfidence / with*)", () => {
  const report = makePhraseReport([
    phrase("get", "user"),
    phrase("create", "session"),
  ], {
    summary: {
      totalPhrases: 2,
      stable: 2,
      partial: 0,
      lowConfidence: 0,
      withDomain: 1,
      withPattern: 1,
      withLayer: 1,
    },
  });
  const { lines } = buildCapabilityPhrasePublicationSection({
    report,
    headingLevel: 2,
  });
  const text = lines.join("\n");
  assert.match(text, /Phrases: 2 \(stable 2, partial 0, low-confidence 0\)/);
  assert.match(text, /withDomain 1/);
  assert.match(text, /withPattern 1/);
  assert.match(text, /withLayer 1/);
});

// ---------- 4: bounded table ----------

test("architecture summary block renders a bounded phrase table", () => {
  const report = makePhraseReport(
    Array.from({ length: 15 }, (_, i) => phrase("get", `entity-${i}`)),
  );
  const { lines } = buildCapabilityPhrasePublicationSection({
    report,
    headingLevel: 2,
    tableLimit: 5,
  });
  const text = lines.join("\n");
  assert.match(text, /\| Verb \| Noun \| Status \| Confidence \| Evidence \|/);
  const rows = lines.filter((l) => l.startsWith("| get |"));
  assert.equal(rows.length, 5, "exactly 5 phrase rows when limit is 5");
  assert.match(text, /10 additional phrase\(s\) omitted/);
});

// ---------- 5: CapabilityMap deferred pin ----------

test("architecture summary block says CapabilityMap integration remains deferred", () => {
  const report = makePhraseReport([phrase("get", "user")]);
  const { lines } = buildCapabilityPhrasePublicationSection({
    report,
    headingLevel: 2,
  });
  const text = lines.join("\n");
  assert.match(text, /CapabilityMap integration remains deferred/);
  assert.match(text, /semantic purpose projection/);
  assert.match(text, /translation audit/);
});

// ---------- 6: architecture publication cites phrase report in header.inputRefs ----------

test("architecture publication cites CapabilityPhraseReport in header.inputRefs when present", async () => {
  const work = await setupWorkspaceWithPhraseReport();
  try {
    runCli(work, ["publish", "architecture", "--json"]);
    const publication = await loadLatestPublication(work, "architecture-summary");
    const inputRefs = publication.header.inputRefs ?? [];
    const cite = inputRefs.find((ref) => ref.type === "CapabilityPhraseReport");
    assert.ok(cite, "architecture summary must cite CapabilityPhraseReport in header.inputRefs");
    assert.match(String(cite.id), /^capability-phrase-/);
    assert.match(publication.content, /## Capability Phrases/);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 7: agent contract section ----------

test("agent contract publication renders ### Capability Phrases subsection when a report exists", async () => {
  const work = await setupWorkspaceWithPhraseReport();
  try {
    runCli(work, ["publish", "agent-contract", "--json"]);
    const publication = await loadLatestPublication(work, "agent-contract");
    assert.match(publication.content, /### Capability Phrases/);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 8: agent contract says semantic purpose projection ----------

test("agent contract publication says CapabilityPhraseReport is semantic purpose projection", async () => {
  const work = await setupWorkspaceWithPhraseReport();
  try {
    runCli(work, ["publish", "agent-contract", "--json"]);
    const publication = await loadLatestPublication(work, "agent-contract");
    assert.match(publication.content, /semantic purpose projection/);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 9: agent contract says normalization remains translation audit ----------

test("agent contract publication says CapabilityNormalizationReport remains translation audit", async () => {
  const work = await setupWorkspaceWithPhraseReport();
  try {
    runCli(work, ["publish", "agent-contract", "--json"]);
    const publication = await loadLatestPublication(work, "agent-contract");
    assert.match(publication.content, /translation audit/);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 10: agent contract says CapabilityMap integration remains deferred ----------

test("agent contract publication says CapabilityMap integration remains deferred", async () => {
  const work = await setupWorkspaceWithPhraseReport();
  try {
    runCli(work, ["publish", "agent-contract", "--json"]);
    const publication = await loadLatestPublication(work, "agent-contract");
    assert.match(publication.content, /CapabilityMap integration remains deferred/);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 11: agent contract Do Not Do reminder for placement policy ----------

test("agent contract publication says phrases are not placement / preservation policy", async () => {
  const work = await setupWorkspaceWithPhraseReport();
  try {
    runCli(work, ["publish", "agent-contract", "--json"]);
    const publication = await loadLatestPublication(work, "agent-contract");
    assert.match(
      publication.content,
      /Do not treat CapabilityPhraseReport entries as CapabilityMap ownership or placement policy/,
      "agent contract must include the new Do Not Do reminder",
    );
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 12: agent contract cites phrase report in header.inputRefs ----------

test("agent contract publication cites CapabilityPhraseReport in header.inputRefs when present", async () => {
  const work = await setupWorkspaceWithPhraseReport();
  try {
    runCli(work, ["publish", "agent-contract", "--json"]);
    const publication = await loadLatestPublication(work, "agent-contract");
    const inputRefs = publication.header.inputRefs ?? [];
    const cite = inputRefs.find((ref) => ref.type === "CapabilityPhraseReport");
    assert.ok(cite, "agent contract must cite CapabilityPhraseReport in header.inputRefs");
    assert.match(String(cite.id), /^capability-phrase-/);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 13: publication generation does not write new phrase report ----------

test("publication generation does not write a new CapabilityPhraseReport", async () => {
  const work = await setupWorkspaceWithPhraseReport();
  try {
    const indexPath = join(work, ".rekon/registry/artifacts.index.json");
    const before = JSON.parse(await readFile(indexPath, "utf8"));
    const beforeReports = before.filter((e) => e.type === "CapabilityPhraseReport");
    runCli(work, ["publish", "architecture", "--json"]);
    runCli(work, ["publish", "agent-contract", "--json"]);
    const after = JSON.parse(await readFile(indexPath, "utf8"));
    const afterReports = after.filter((e) => e.type === "CapabilityPhraseReport");
    assert.equal(afterReports.length, beforeReports.length);
    for (const entry of afterReports) {
      const previous = beforeReports.find((other) => other.id === entry.id);
      assert.ok(previous, "publish must not add new phrase reports");
      assert.equal(entry.digest, previous.digest);
    }
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 14: publication generation does not mutate existing phrase report ----------

test("publication generation does not mutate the existing CapabilityPhraseReport", async () => {
  const work = await setupWorkspaceWithPhraseReport();
  try {
    const indexPath = join(work, ".rekon/registry/artifacts.index.json");
    const index = JSON.parse(await readFile(indexPath, "utf8"));
    const phraseEntry = index.find((e) => e.type === "CapabilityPhraseReport");
    assert.ok(phraseEntry, "fixture should have a CapabilityPhraseReport");
    const beforeContent = await readFile(join(work, phraseEntry.path), "utf8");
    runCli(work, ["publish", "architecture", "--json"]);
    runCli(work, ["publish", "agent-contract", "--json"]);
    const afterContent = await readFile(join(work, phraseEntry.path), "utf8");
    assert.equal(afterContent, beforeContent);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 15: publication does not mutate CapabilityNormalizationReport ----------

test("publication generation does not mutate CapabilityNormalizationReport", async () => {
  const work = await setupWorkspaceWithPhraseReport();
  try {
    const indexPath = join(work, ".rekon/registry/artifacts.index.json");
    const before = JSON.parse(await readFile(indexPath, "utf8"));
    const beforeReports = before.filter((e) => e.type === "CapabilityNormalizationReport");
    runCli(work, ["publish", "architecture", "--json"]);
    runCli(work, ["publish", "agent-contract", "--json"]);
    const after = JSON.parse(await readFile(indexPath, "utf8"));
    const afterReports = after.filter((e) => e.type === "CapabilityNormalizationReport");
    assert.equal(afterReports.length, beforeReports.length);
    for (const entry of afterReports) {
      const previous = beforeReports.find((other) => other.id === entry.id);
      assert.ok(previous);
      assert.equal(entry.digest, previous.digest);
    }
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 16: publication does not mutate CapabilityMap ----------

test("publication generation does not mutate CapabilityMap", async () => {
  const work = await setupWorkspaceWithPhraseReport();
  try {
    const indexPath = join(work, ".rekon/registry/artifacts.index.json");
    const before = JSON.parse(await readFile(indexPath, "utf8"));
    const beforeMaps = before.filter((e) => e.type === "CapabilityMap");
    runCli(work, ["publish", "architecture", "--json"]);
    runCli(work, ["publish", "agent-contract", "--json"]);
    const after = JSON.parse(await readFile(indexPath, "utf8"));
    const afterMaps = after.filter((e) => e.type === "CapabilityMap");
    assert.equal(afterMaps.length, beforeMaps.length);
    for (const entry of afterMaps) {
      const previous = beforeMaps.find((other) => other.id === entry.id);
      assert.ok(previous);
      assert.equal(entry.digest, previous.digest);
    }
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 17: publication does not mutate EvidenceGraph ----------

test("publication generation does not mutate EvidenceGraph", async () => {
  const work = await setupWorkspaceWithPhraseReport();
  try {
    const indexPath = join(work, ".rekon/registry/artifacts.index.json");
    const before = JSON.parse(await readFile(indexPath, "utf8"));
    const beforeGraphs = before.filter((e) => e.type === "EvidenceGraph");
    runCli(work, ["publish", "architecture", "--json"]);
    runCli(work, ["publish", "agent-contract", "--json"]);
    const after = JSON.parse(await readFile(indexPath, "utf8"));
    const afterGraphs = after.filter((e) => e.type === "EvidenceGraph");
    assert.equal(afterGraphs.length, beforeGraphs.length);
    for (const entry of afterGraphs) {
      const previous = beforeGraphs.find((other) => other.id === entry.id);
      assert.ok(previous);
      assert.equal(entry.digest, previous.digest);
    }
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 18: artifacts validate stays clean ----------

test("rekon artifacts validate stays clean after publication surfacing", async () => {
  const work = await setupWorkspaceWithPhraseReport();
  try {
    runCli(work, ["publish", "architecture", "--json"]);
    runCli(work, ["publish", "agent-contract", "--json"]);
    const validate = runCli(work, ["artifacts", "validate", "--json"]);
    const payload = JSON.parse(validate.stdout);
    assert.ok(Array.isArray(payload.issues));
    assert.equal(payload.issues.length, 0);
    assert.equal(payload.valid, true);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- Helpers ----------

function phrase(verb, noun, overrides = {}) {
  return {
    id: `phrase-${verb}-${noun}`,
    verb,
    noun,
    confidence: "high",
    status: "stable",
    sourceCandidateIds: [`candidate-${verb}-${noun}`],
    evidenceRefs: [],
    ...overrides,
  };
}

function makePhraseReport(phrases, overrides = {}) {
  const summary = overrides.summary ?? {
    totalPhrases: phrases.length,
    stable: phrases.filter((p) => p.status === "stable").length,
    partial: phrases.filter((p) => p.status === "partial").length,
    lowConfidence: phrases.filter((p) => p.status === "low-confidence").length,
    withDomain: 0,
    withPattern: 0,
    withLayer: 0,
  };
  return {
    header: {
      artifactType: "CapabilityPhraseReport",
      artifactId: "report-test",
      schemaVersion: "0.1.0",
      generatedAt: "2026-05-26T00:00:00Z",
      subject: { repoId: "/tmp/test" },
      producer: { id: "@rekon/cli", version: "0.1.0" },
      inputRefs: [],
      freshness: { status: "fresh" },
    },
    sourceNormalizationReportRef: {
      type: "CapabilityNormalizationReport",
      id: "norm-test",
      schemaVersion: "0.1.0",
    },
    summary,
    phrases,
  };
}

async function setupWorkspaceWithPhraseReport() {
  const work = await mkdtemp(join(tmpdir(), "rekon-phrase-pub-"));
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
  runCli(work, [
    "capability",
    "phrase",
    "project",
    "--report",
    reportRef,
    "--json",
  ]);
  return work;
}

async function loadLatestPublication(work, kind) {
  const indexPath = join(work, ".rekon/registry/artifacts.index.json");
  const index = JSON.parse(await readFile(indexPath, "utf8"));
  const entries = index.filter((entry) =>
    entry.type === "Publication" && typeof entry.path === "string"
    && entry.path.includes(`Publication-${kind}-`));
  if (entries.length === 0) {
    throw new Error(`no ${kind} publication found`);
  }
  const latest = entries.sort((a, b) => a.writtenAt.localeCompare(b.writtenAt)).at(-1);
  return JSON.parse(await readFile(join(work, latest.path), "utf8"));
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
