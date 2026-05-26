// Contract tests for the capability ontology suggestion
// publication surfacing slice. The architecture-summary
// publisher and agent-contract publisher both surface the
// latest CapabilityOntologySuggestionReport. Both must be
// strictly read-only with respect to the ontology config,
// the ledger, the suggestion report itself, and
// CapabilityMap.
//
// Tests pin:
//   - architecture summary renders no-report guidance
//   - architecture summary renders suggestion summary counts
//   - architecture summary renders bounded suggestion table
//   - architecture summary says ontology config remains unchanged
//   - architecture summary cites suggestion report in inputRefs
//   - agent contract renders capability ontology suggestions section
//   - agent contract says suggestions are not applied vocabulary
//   - agent contract says candidate-level decisions require manual ontology editing when skipped entries exist
//   - agent contract cites suggestion report in inputRefs
//   - publication generation does not write a new CapabilityOntologySuggestionReport
//   - publication generation does not mutate .rekon/capability-ontology.json
//   - publication generation does not mutate CapabilityMap
//   - rekon artifacts validate stays clean

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cp,
  mkdtemp,
  readFile,
  rm,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { buildCapabilityOntologySuggestionPublicationSection } from "../../packages/capability-docs/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- 1: no-report guidance ----------

test("architecture summary block renders no-report guidance", () => {
  const { lines } = buildCapabilityOntologySuggestionPublicationSection({
    report: undefined,
    headingLevel: 2,
  });
  const text = lines.join("\n");
  assert.match(text, /^## Capability Ontology Suggestions/m);
  assert.match(
    text,
    /No `CapabilityNormalizationReviewLedger`-derived `CapabilityOntologySuggestionReport` found\./,
  );
  assert.match(text, /preview-only/);
});

// ---------- 2: summary counts ----------

test("architecture summary block renders suggestion summary counts", () => {
  const report = makeSuggestionReport([
    suggestion("add-canonical-noun", "demo"),
    suggestion("add-verb-alias", "ensure", "validate"),
  ]);
  const { lines } = buildCapabilityOntologySuggestionPublicationSection({
    report,
    headingLevel: 2,
  });
  const text = lines.join("\n");
  assert.match(text, /Suggestions: 2/);
  assert.match(text, /add-canonical-noun 1/);
  assert.match(text, /add-verb-alias 1/);
});

// ---------- 3: bounded table ----------

test("architecture summary block renders a bounded suggestion table", () => {
  const report = makeSuggestionReport(
    Array.from({ length: 15 }, (_, i) => suggestion("add-canonical-noun", `term-${i}`)),
  );
  const { lines } = buildCapabilityOntologySuggestionPublicationSection({
    report,
    headingLevel: 2,
    tableLimit: 5,
  });
  const text = lines.join("\n");
  assert.match(text, /\| Kind \| Term \| Canonical \| Reason \|/);
  const rows = lines.filter((l) => l.startsWith("| add-canonical-noun"));
  assert.equal(rows.length, 5, "exactly 5 suggestion rows when limit is 5");
  assert.match(text, /10 additional suggestion\(s\) omitted/);
});

// ---------- 4: config-remains-unchanged ----------

test("architecture summary block says ontology config remains unchanged", () => {
  const report = makeSuggestionReport([suggestion("add-canonical-noun", "demo")]);
  const { lines } = buildCapabilityOntologySuggestionPublicationSection({
    report,
    headingLevel: 2,
  });
  const text = lines.join("\n");
  assert.match(
    text,
    /`\.rekon\/capability-ontology\.json` remains unchanged/,
  );
});

// ---------- 5: architecture summary cites suggestion report in inputRefs ----------

test("architecture summary publication cites the suggestion report in header.inputRefs", async () => {
  const work = await setupWorkspaceWithSuggestion();
  try {
    runCli(work, ["publish", "architecture", "--json"]);
    const publication = await loadLatestPublication(work, "architecture-summary");
    const inputRefs = publication.header?.inputRefs ?? [];
    const hasRef = inputRefs.some((ref) =>
      ref.type === "CapabilityOntologySuggestionReport");
    assert.ok(
      hasRef,
      "architecture-summary inputRefs must include CapabilityOntologySuggestionReport",
    );
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 6: agent contract renders section ----------

test("agent contract publication renders the Capability Ontology Suggestions section", async () => {
  const work = await setupWorkspaceWithSuggestion();
  try {
    runCli(work, ["publish", "agent-contract", "--json"]);
    const publication = await loadLatestPublication(work, "agent-contract");
    assert.match(publication.content, /### Capability Ontology Suggestions/);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 7: agent contract says not applied vocabulary ----------

test("agent contract Do Not Do says suggestions are not applied vocabulary", async () => {
  const work = await setupWorkspaceWithSuggestion();
  try {
    runCli(work, ["publish", "agent-contract", "--json"]);
    const publication = await loadLatestPublication(work, "agent-contract");
    assert.match(
      publication.content,
      /Do not treat CapabilityOntologySuggestionReport entries as applied ontology config/,
    );
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 8: candidate-level decisions surface skipped guidance ----------

test("agent contract block surfaces candidate-level skipped guidance when skipped entries exist", () => {
  const report = makeSuggestionReport(
    [suggestion("add-canonical-noun", "demo")],
    {
      skipped: [
        {
          decisionId: "decision-x",
          term: "runtime",
          termKind: "candidate",
          reason: "candidate-level decisions require manual ontology editing.",
        },
      ],
      summary: { skipped: 1 },
    },
  );
  const { lines } = buildCapabilityOntologySuggestionPublicationSection({
    report,
    headingLevel: 3,
  });
  const text = lines.join("\n");
  assert.match(
    text,
    /candidate-level decisions require manual ontology editing/,
  );
  assert.match(text, /Skipped decisions \(v1\)/);
});

// ---------- 9: agent contract cites suggestion report in inputRefs ----------

test("agent contract publication cites the suggestion report in header.inputRefs", async () => {
  const work = await setupWorkspaceWithSuggestion();
  try {
    runCli(work, ["publish", "agent-contract", "--json"]);
    const publication = await loadLatestPublication(work, "agent-contract");
    const inputRefs = publication.header?.inputRefs ?? [];
    const hasRef = inputRefs.some((ref) =>
      ref.type === "CapabilityOntologySuggestionReport");
    assert.ok(
      hasRef,
      "agent-contract inputRefs must include CapabilityOntologySuggestionReport",
    );
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 10: publication generation does not create a new suggestion report ----------

test("publication generation does not write a new CapabilityOntologySuggestionReport", async () => {
  const work = await setupWorkspaceWithSuggestion();
  try {
    const indexPath = join(work, ".rekon/registry/artifacts.index.json");
    const before = JSON.parse(await readFile(indexPath, "utf8"));
    const beforeReports = before.filter(
      (e) => e.type === "CapabilityOntologySuggestionReport",
    );
    runCli(work, ["publish", "architecture", "--json"]);
    runCli(work, ["publish", "agent-contract", "--json"]);
    const after = JSON.parse(await readFile(indexPath, "utf8"));
    const afterReports = after.filter(
      (e) => e.type === "CapabilityOntologySuggestionReport",
    );
    assert.equal(afterReports.length, beforeReports.length);
    for (const entry of afterReports) {
      const previous = beforeReports.find((other) => other.id === entry.id);
      assert.ok(previous, "publish must not add new suggestion reports");
      assert.equal(entry.digest, previous.digest);
    }
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 11: publication does not mutate the config file ----------

test("publication generation does not create .rekon/capability-ontology.json", async () => {
  const work = await setupWorkspaceWithSuggestion();
  try {
    const configPath = join(work, ".rekon/capability-ontology.json");
    assert.equal(existsSync(configPath), false, "fixture should not have a config");
    runCli(work, ["publish", "architecture", "--json"]);
    runCli(work, ["publish", "agent-contract", "--json"]);
    assert.equal(
      existsSync(configPath),
      false,
      "publication must not create the config",
    );
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 12: publication does not mutate CapabilityMap ----------

test("publication generation does not add a new CapabilityMap artifact", async () => {
  const work = await setupWorkspaceWithSuggestion();
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

// ---------- 13: artifacts validate stays clean ----------

test("rekon artifacts validate stays clean after publication surfacing", async () => {
  const work = await setupWorkspaceWithSuggestion();
  try {
    runCli(work, ["publish", "architecture", "--json"]);
    runCli(work, ["publish", "agent-contract", "--json"]);
    const validate = runCli(work, ["artifacts", "validate", "--json"]);
    const payload = JSON.parse(validate.stdout);
    assert.ok(Array.isArray(payload.issues));
    assert.equal(payload.issues.length, 0);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- Helpers ----------

function suggestion(kind, term, canonical) {
  return {
    id: `suggestion-${kind}-${term}`,
    kind,
    term,
    ...(canonical ? { canonical } : {}),
    reason: "test",
    sourceDecisionId: `decision-${term}`,
  };
}

function makeSuggestionReport(suggestions, overrides = {}) {
  const summary = {
    total: suggestions.length,
    addCanonicalVerb: suggestions.filter((s) => s.kind === "add-canonical-verb").length,
    addCanonicalNoun: suggestions.filter((s) => s.kind === "add-canonical-noun").length,
    addVerbAlias: suggestions.filter((s) => s.kind === "add-verb-alias").length,
    addNounAlias: suggestions.filter((s) => s.kind === "add-noun-alias").length,
    skipped: 0,
    ...(overrides.summary ?? {}),
  };
  return {
    header: {
      artifactType: "CapabilityOntologySuggestionReport",
      artifactId: "report-test",
      schemaVersion: "0.1.0",
      generatedAt: "2026-05-26T00:00:00Z",
      subject: { repoId: "/tmp/test" },
      producer: { id: "@rekon/cli", version: "0.1.0" },
      inputRefs: [],
      freshness: { status: "fresh" },
    },
    summary,
    suggestions,
    skipped: overrides.skipped ?? [],
    preview: { configPath: ".rekon/capability-ontology.json", message: "" },
  };
}

async function setupWorkspaceWithSuggestion() {
  const work = await mkdtemp(join(tmpdir(), "rekon-pub-test-"));
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
  runCli(work, ["capability", "ontology", "suggestions", "--json"]);
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
