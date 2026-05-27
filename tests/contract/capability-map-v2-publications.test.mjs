// Contract tests for the CapabilityMap v2 publication
// surfacing slice (thirtieth slice on the capability-
// ontology track). The architecture-summary publisher
// and agent-contract publisher both surface the additive
// `phraseBackedCapabilities` / `phraseBackedSummary` /
// `phraseSourceRef` projection that lives on the latest
// `CapabilityMap`. Both must be strictly read-only with
// respect to `CapabilityMap`, `CapabilityPhraseReport`,
// `CapabilityNormalizationReport`, and `EvidenceGraph`.
//
// Tests pin:
//   1.  architecture summary renders CapabilityMap v2 section
//       when phrase-backed capabilities exist.
//   2.  architecture summary renders summary counts.
//   3.  architecture summary renders bounded table.
//   4.  architecture summary says entries are projection
//       context, not CapabilityContract placement policy.
//   5.  architecture summary does not duplicate the full
//       CapabilityPhraseReport table inside the v2 section.
//   6.  agent contract renders CapabilityMap v2 section.
//   7.  agent contract says v2 phrase-backed capabilities are
//       stable capability projection.
//   8.  agent contract says they are not placement policy or
//       source-write authority.
//   9.  agent contract Do Not Do reminder covers
//       CapabilityContract policy / resolver routing /
//       architecture linting / verification requirements /
//       source-write permission.
//   10. publications do not create or mutate CapabilityMap.
//   11. publications do not mutate CapabilityPhraseReport.
//   12. publications do not mutate CapabilityNormalizationReport.
//   13. publications do not mutate EvidenceGraph.
//   14. proof report surfacing is absent or explicitly deferred
//       in publications.
//   15. rekon artifacts validate stays clean.

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

import { buildCapabilityMapV2PublicationSection } from "../../packages/capability-docs/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
// Use the js-ts-ast-evidence fixture because its source
// produces stable high-confidence phrases (verbs like
// `create` / `fetch` / `handle` on nouns like `user` /
// `request`) — the example/simple-js-ts fixture does not
// produce eligible phrases, so v2 fields would stay empty.
const exampleRoot = join(repoRoot, "tests/fixtures/js-ts-ast-evidence");

// ---------- 1: architecture-summary section renders ----------

test("architecture summary renders CapabilityMap v2 section when phrase-backed capabilities exist", () => {
  const capabilityMap = makeCapabilityMapV2(
    [
      v2Entry("build", "plan"),
      v2Entry("get", "user"),
    ],
  );
  const { lines } = buildCapabilityMapV2PublicationSection({
    capabilityMap,
    headingLevel: 2,
  });
  const text = lines.join("\n");
  assert.match(text, /^## CapabilityMap v2 Phrase-Backed Capabilities/m);
  assert.match(text, /Phrase-backed capabilities: 2/);
});

// ---------- 2: summary counts ----------

test("architecture summary renders summary counts (total / withDomain / withPattern / withLayer + top verbs / nouns)", () => {
  const capabilityMap = makeCapabilityMapV2(
    [
      v2Entry("build", "plan", { domain: "ops" }),
      v2Entry("get", "user", { pattern: "request-handler" }),
      v2Entry("get", "user", { layer: "src" }),
    ],
    {
      total: 3,
      byVerb: { build: 1, get: 2 },
      byNoun: { plan: 1, user: 2 },
      withDomain: 1,
      withPattern: 1,
      withLayer: 1,
    },
  );
  const { lines } = buildCapabilityMapV2PublicationSection({
    capabilityMap,
    headingLevel: 2,
  });
  const text = lines.join("\n");
  assert.match(text, /Phrase-backed capabilities: 3/);
  assert.match(text, /withDomain 1/);
  assert.match(text, /withPattern 1/);
  assert.match(text, /withLayer 1/);
  assert.match(text, /Top verbs: get \(2\), build \(1\)/);
  assert.match(text, /Top nouns: user \(2\), plan \(1\)/);
});

// ---------- 3: bounded table ----------

test("architecture summary renders a bounded phrase-backed table", () => {
  const capabilityMap = makeCapabilityMapV2(
    Array.from({ length: 25 }, (_, i) => v2Entry("build", `plan-${i}`)),
  );
  const { lines } = buildCapabilityMapV2PublicationSection({
    capabilityMap,
    headingLevel: 2,
    tableLimit: 10,
  });
  const text = lines.join("\n");
  assert.match(text, /\| Verb \| Noun \| Domain \| Pattern \| Layer \| Evidence \|/);
  const rows = lines.filter((l) => l.startsWith("| build |"));
  assert.equal(rows.length, 10, "exactly 10 phrase rows when limit is 10");
  assert.match(text, /15 additional phrase-backed capabilities omitted/);
});

// ---------- 4: projection-context boundary ----------

test("architecture summary says entries are projection context, not CapabilityContract placement policy", () => {
  const capabilityMap = makeCapabilityMapV2([v2Entry("build", "plan")]);
  const { lines } = buildCapabilityMapV2PublicationSection({
    capabilityMap,
    headingLevel: 2,
  });
  const text = lines.join("\n");
  assert.match(
    text,
    /These entries are projection context, not CapabilityContract placement policy\./,
  );
  assert.match(
    text,
    /does not imply placement policy, ownership policy, resolver routing, architecture linting, verification planning, or source writes/,
  );
});

// ---------- 5: does not duplicate full phrase table ----------

test("architecture summary does not duplicate the full CapabilityPhraseReport table inside the v2 section", () => {
  const capabilityMap = makeCapabilityMapV2([v2Entry("build", "plan")]);
  const { lines } = buildCapabilityMapV2PublicationSection({
    capabilityMap,
    headingLevel: 2,
  });
  const text = lines.join("\n");
  // The v2 table has six columns (Verb, Noun, Domain,
  // Pattern, Layer, Evidence). The CapabilityPhrase table
  // would have a `Status` column and a `Confidence` column.
  // The v2 section must not redundantly carry the phrase
  // table.
  assert.doesNotMatch(text, /\| Verb \| Noun \| Status \| Confidence \| Evidence \|/);
});

// ---------- 6: agent contract section renders ----------

test("agent contract publication renders ### CapabilityMap v2 subsection when phrase-backed capabilities exist", async () => {
  const work = await setupWorkspaceWithV2();
  try {
    runCli(work, ["publish", "agent-contract", "--json"]);
    const publication = await loadLatestPublication(work, "agent-contract");
    assert.match(publication.content, /### CapabilityMap v2 Phrase-Backed Capabilities/);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 7: agent contract says stable capability projection ----------

test("agent contract publication says CapabilityMap v2 phrase-backed capabilities are stable capability projection", async () => {
  const work = await setupWorkspaceWithV2();
  try {
    runCli(work, ["publish", "agent-contract", "--json"]);
    const publication = await loadLatestPublication(work, "agent-contract");
    assert.match(
      publication.content,
      /CapabilityMap v2 phrase-backed capabilities are stable capability projection/,
    );
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 8: agent contract says not placement policy or source-write authority ----------

test("agent contract publication says CapabilityMap v2 is not placement policy or source-write authority", async () => {
  const work = await setupWorkspaceWithV2();
  try {
    runCli(work, ["publish", "agent-contract", "--json"]);
    const publication = await loadLatestPublication(work, "agent-contract");
    assert.match(
      publication.content,
      /does not imply placement policy, ownership policy, resolver routing, architecture linting, verification planning, or source writes/,
    );
    assert.match(
      publication.content,
      /not placement policy, ownership policy, or source-write authority/,
    );
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 9: Do Not Do reminder covers all five surfaces ----------

test("agent contract Do Not Do reminder covers CapabilityContract policy / resolver routing / architecture linting / verification requirements / source-write permission", async () => {
  const work = await setupWorkspaceWithV2();
  try {
    runCli(work, ["publish", "agent-contract", "--json"]);
    const publication = await loadLatestPublication(work, "agent-contract");
    const reminder
      = /Do not treat CapabilityMap v2 phrase-backed capabilities as CapabilityContract policy, resolver routing authority, architecture lint findings, verification requirements, or source-write permission/;
    assert.match(publication.content, reminder);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 10: publications do not create or mutate CapabilityMap ----------

test("publication generation does not create or mutate CapabilityMap", async () => {
  const work = await setupWorkspaceWithV2();
  try {
    const indexPath = join(work, ".rekon/registry/artifacts.index.json");
    const before = JSON.parse(await readFile(indexPath, "utf8"));
    const beforeMaps = before.filter((e) => e.type === "CapabilityMap");
    runCli(work, ["publish", "architecture", "--json"]);
    runCli(work, ["publish", "agent-contract", "--json"]);
    const after = JSON.parse(await readFile(indexPath, "utf8"));
    const afterMaps = after.filter((e) => e.type === "CapabilityMap");
    assert.equal(afterMaps.length, beforeMaps.length, "no new CapabilityMap created");
    for (const entry of afterMaps) {
      const previous = beforeMaps.find((other) => other.id === entry.id);
      assert.ok(previous);
      assert.equal(entry.digest, previous.digest, "CapabilityMap digest unchanged");
    }
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 11: publications do not mutate CapabilityPhraseReport ----------

test("publication generation does not mutate CapabilityPhraseReport", async () => {
  const work = await setupWorkspaceWithV2();
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
      assert.ok(previous);
      assert.equal(entry.digest, previous.digest);
    }
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 12: publications do not mutate CapabilityNormalizationReport ----------

test("publication generation does not mutate CapabilityNormalizationReport", async () => {
  const work = await setupWorkspaceWithV2();
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

// ---------- 13: publications do not mutate EvidenceGraph ----------

test("publication generation does not mutate EvidenceGraph", async () => {
  const work = await setupWorkspaceWithV2();
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

// ---------- 14: proof report surfacing absent / deferred ----------

test("proof report does not render a CapabilityMap v2 phrase-backed section; the v2 section is explicitly deferred", async () => {
  const work = await setupWorkspaceWithV2();
  try {
    runCli(work, ["publish", "proof", "--json"]);
    const publication = await loadLatestPublication(work, "proof-report");
    assert.doesNotMatch(
      publication.content,
      /CapabilityMap v2 Phrase-Backed Capabilities/,
      "proof report must not render a CapabilityMap v2 phrase-backed section",
    );
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 14b: architecture summary block carries proof-deferral pin ----------

test("architecture summary block carries the proof-report-deferred pin for CapabilityMap v2", () => {
  const capabilityMap = makeCapabilityMapV2([v2Entry("build", "plan")]);
  const { lines } = buildCapabilityMapV2PublicationSection({
    capabilityMap,
    headingLevel: 2,
  });
  const text = lines.join("\n");
  assert.match(
    text,
    /Proof-report surfacing of CapabilityMap v2 is deferred\./,
  );
});

// ---------- 15: artifacts validate clean ----------

test("rekon artifacts validate stays clean after v2 publication surfacing", async () => {
  const work = await setupWorkspaceWithV2();
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

function v2Entry(verb, noun, overrides = {}) {
  return {
    id: `capability-phrase:phrase-${verb}-${noun}`,
    verb,
    noun,
    confidence: "high",
    status: "stable",
    evidenceRefs: [
      {
        type: "EvidenceGraph",
        id: "evidence-test-001",
        schemaVersion: "0.1.0",
      },
    ],
    sourceCandidateIds: [`candidate-${verb}-${noun}`],
    phraseRef: {
      report: {
        type: "CapabilityPhraseReport",
        id: "report-test",
        schemaVersion: "0.1.0",
      },
      phraseId: `phrase-${verb}-${noun}`,
    },
    ...overrides,
  };
}

function makeCapabilityMapV2(entries, summaryOverride = {}) {
  const summary = {
    total: typeof summaryOverride.total === "number"
      ? summaryOverride.total
      : entries.length,
    byVerb: summaryOverride.byVerb ?? {},
    byNoun: summaryOverride.byNoun ?? {},
    withDomain: summaryOverride.withDomain ?? entries.filter((e) => e.domain).length,
    withPattern: summaryOverride.withPattern ?? entries.filter((e) => e.pattern).length,
    withLayer: summaryOverride.withLayer ?? entries.filter((e) => e.layer).length,
  };
  return {
    header: {
      artifactType: "CapabilityMap",
      artifactId: "capability-map-test",
      schemaVersion: "0.1.0",
    },
    phraseSourceRef: {
      type: "CapabilityPhraseReport",
      id: "report-test",
      schemaVersion: "0.1.0",
    },
    phraseBackedSummary: summary,
    phraseBackedCapabilities: entries,
  };
}

async function setupWorkspaceWithV2() {
  const work = await mkdtemp(join(tmpdir(), "rekon-capmap-v2-pub-"));
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
  // Re-run refresh so the latest CapabilityMap consumes
  // the CapabilityPhraseReport and emits v2 fields.
  runCli(work, ["refresh", "--skip-publish", "--skip-freshness"]);
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
