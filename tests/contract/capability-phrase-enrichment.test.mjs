// Contract tests for Phrase Enrichment v1.
//
// Phrase Enrichment v1 adds deterministic domain / pattern
// / layer enrichment from ObservedRepo + OwnershipMap to
// the CapabilityPhraseReport builder. The stable threshold
// is unchanged; `partial` phrases only emit when there is
// real deterministic enrichment context.
//
// Tests pin:
//   1.  high-confidence normalized -> stable phrase (unchanged).
//   2.  medium-confidence normalized + domain enrichment -> partial.
//   3.  medium-confidence normalized + pattern enrichment -> partial.
//   4.  medium-confidence normalized + layer enrichment -> partial.
//   5.  medium-confidence normalized + no enrichment -> not emitted.
//   6.  unknown-verb candidate is never projected.
//   7.  unknown-noun candidate is never projected.
//   8.  ignored candidate is never projected.
//   9.  low-confidence candidate is never projected.
//  10.  stable threshold is unchanged by enrichment context.
//  11.  summary counts stable / partial / withDomain / withPattern / withLayer correctly.
//  12.  header.inputRefs cites ObservedRepo when enrichment consumes it.
//  13.  header.inputRefs cites OwnershipMap when enrichment consumes it.
//  14.  CLI reads ObservedRepo / OwnershipMap when present.
//  15.  CLI succeeds when ObservedRepo / OwnershipMap are missing.
//  16.  CLI writes CapabilityPhraseReport only.
//  17.  CLI does not mutate CapabilityMap.
//  18.  CLI does not mutate CapabilityNormalizationReport.
//  19.  CLI does not mutate EvidenceGraph.
//  20.  architecture summary phrase section shows partial count.
//  21.  agent contract phrase section shows partial count.
//  22.  artifacts validate remains clean.

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
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { buildCapabilityPhraseReport } from "../../packages/capability-ontology/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- helpers ----------

function makeReportHeader(id = "phrase-report-test") {
  return {
    artifactType: "CapabilityPhraseReport",
    artifactId: id,
    schemaVersion: "0.1.0",
    generatedAt: "2026-05-27T00:00:00.000Z",
    subject: { repoId: "test" },
    producer: { id: "test", version: "0.1.0" },
    inputRefs: [],
    freshness: { status: "fresh" },
  };
}

function makeReportRef(id = "norm-test") {
  return {
    type: "CapabilityNormalizationReport",
    id,
    path: `.rekon/artifacts/projections/CapabilityNormalizationReport-${id}.json`,
    digest: "fake-digest",
    schemaVersion: "0.1.0",
  };
}

function makeEvidenceRef(id = "evidence-test") {
  return {
    type: "EvidenceGraph",
    id,
    path: `.rekon/artifacts/evidence/EvidenceGraph-${id}.json`,
    digest: "fake-evidence-digest",
    schemaVersion: "0.1.0",
  };
}

function makeObservedRepoRef(id = "observed-repo-test") {
  return {
    type: "ObservedRepo",
    id,
    path: `.rekon/artifacts/projections/ObservedRepo-${id}.json`,
    digest: "fake-observed-digest",
    schemaVersion: "0.1.0",
  };
}

function makeOwnershipMapRef(id = "ownership-map-test") {
  return {
    type: "OwnershipMap",
    id,
    path: `.rekon/artifacts/projections/OwnershipMap-${id}.json`,
    digest: "fake-ownership-digest",
    schemaVersion: "0.1.0",
  };
}

function makeCandidate(overrides = {}) {
  return {
    id: "candidate-0000",
    source: {
      artifactRef: makeEvidenceRef(),
      factId: "fact-0",
      path: "src/users.ts",
      symbol: "getUser",
      kind: "symbol",
    },
    raw: {
      name: "getUser",
      verb: "get",
      noun: "user",
      splitConfidence: "high",
    },
    normalized: {
      verb: "get",
      noun: "user",
    },
    confidence: "high",
    status: "normalized",
    ...overrides,
  };
}

function makeNormalizationReport(candidates) {
  return {
    header: {
      artifactType: "CapabilityNormalizationReport",
      artifactId: "norm-test",
      schemaVersion: "0.1.0",
      generatedAt: "2026-05-27T00:00:00.000Z",
      subject: { repoId: "test" },
      producer: { id: "test", version: "0.1.0" },
      inputRefs: [],
      freshness: { status: "fresh" },
    },
    ontology: { source: "builtin", effectiveHash: "abc" },
    summary: {
      totalCandidates: candidates.length,
      normalized: candidates.filter((c) => c.status === "normalized").length,
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

function makeObservedRepo(systems) {
  return {
    header: {
      artifactType: "ObservedRepo",
      artifactId: "observed-repo-test",
      schemaVersion: "0.1.0",
      generatedAt: "2026-05-27T00:00:00.000Z",
      subject: { repoId: "test" },
      producer: { id: "test", version: "0.1.0" },
      inputRefs: [],
      freshness: { status: "fresh" },
    },
    repository: { id: "test", root: "/tmp/test" },
    systems,
    layers: [],
    capabilities: [],
  };
}

function makeOwnershipMap(entries) {
  return {
    header: {
      artifactType: "OwnershipMap",
      artifactId: "ownership-map-test",
      schemaVersion: "0.1.0",
      generatedAt: "2026-05-27T00:00:00.000Z",
      subject: { repoId: "test" },
      producer: { id: "test", version: "0.1.0" },
      inputRefs: [],
      freshness: { status: "fresh" },
    },
    entries,
  };
}

function build(input) {
  return buildCapabilityPhraseReport({
    header: makeReportHeader(),
    normalizationReportRef: makeReportRef(),
    ...input,
  });
}

// ---------- 1: high-confidence normalized -> stable ----------

test("high-confidence normalized candidate becomes a stable phrase (threshold unchanged)", () => {
  const report = build({
    normalizationReport: makeNormalizationReport([makeCandidate()]),
  });
  assert.equal(report.phrases.length, 1);
  assert.equal(report.phrases[0].status, "stable");
  assert.equal(report.phrases[0].confidence, "high");
});

// ---------- 2: medium-confidence + domain -> partial ----------

test("medium-confidence normalized + OwnershipMap domain -> partial phrase", () => {
  const candidate = makeCandidate({
    id: "candidate-med-domain",
    confidence: "medium",
    raw: { name: "saveOrder", verb: "save", noun: "order", splitConfidence: "medium" },
    normalized: { verb: "save", noun: "order" },
    source: {
      artifactRef: makeEvidenceRef(),
      path: "src/checkout/order.ts",
      symbol: "saveOrder",
      kind: "symbol",
    },
  });
  const ownershipMap = makeOwnershipMap([
    { path: "src/checkout", ownerSystem: "checkout", confidence: 1, evidence: [] },
  ]);
  const report = build({
    normalizationReport: makeNormalizationReport([candidate]),
    ownershipMap,
    ownershipMapRef: makeOwnershipMapRef(),
  });
  assert.equal(report.phrases.length, 1, "expected exactly one partial phrase");
  const phrase = report.phrases[0];
  assert.equal(phrase.status, "partial");
  assert.equal(phrase.confidence, "medium");
  assert.equal(phrase.domain, "checkout");
});

// ---------- 3: medium-confidence + pattern -> partial ----------

test("medium-confidence normalized + ObservedRepo system kind -> partial phrase with pattern", () => {
  const candidate = makeCandidate({
    id: "candidate-med-pattern",
    confidence: "medium",
    raw: { name: "handleRequest", verb: "handle", noun: "request", splitConfidence: "high" },
    normalized: { verb: "handle", noun: "request" },
    source: {
      artifactRef: makeEvidenceRef(),
      path: "app/api/users/route.ts",
      symbol: "GET",
      kind: "symbol",
    },
  });
  const observedRepo = makeObservedRepo([
    {
      id: "api",
      paths: ["app/api"],
      layers: [],
      capabilities: [],
      confidence: 1,
      evidence: [],
      kind: "route",
    },
  ]);
  const report = build({
    normalizationReport: makeNormalizationReport([candidate]),
    observedRepo,
    observedRepoRef: makeObservedRepoRef(),
  });
  assert.equal(report.phrases.length, 1);
  const phrase = report.phrases[0];
  assert.equal(phrase.status, "partial");
  assert.equal(phrase.pattern, "route-handler");
});

// ---------- 4: medium-confidence + layer -> partial ----------

test("medium-confidence normalized + OwnershipMap layer -> partial phrase with layer", () => {
  const candidate = makeCandidate({
    id: "candidate-med-layer",
    confidence: "medium",
    raw: { name: "renderPage", verb: "render", noun: "page", splitConfidence: "medium" },
    normalized: { verb: "render", noun: "page" },
    source: {
      artifactRef: makeEvidenceRef(),
      path: "app/dashboard/page.tsx",
      symbol: "default",
      kind: "symbol",
    },
  });
  const ownershipMap = makeOwnershipMap([
    {
      path: "app/dashboard",
      ownerSystem: "dashboard",
      layer: "ui",
      confidence: 1,
      evidence: [],
    },
  ]);
  const report = build({
    normalizationReport: makeNormalizationReport([candidate]),
    ownershipMap,
    ownershipMapRef: makeOwnershipMapRef(),
  });
  assert.equal(report.phrases.length, 1);
  const phrase = report.phrases[0];
  assert.equal(phrase.status, "partial");
  assert.equal(phrase.layer, "ui");
});

// ---------- 5: medium-confidence + no enrichment -> not emitted ----------

test("medium-confidence normalized without deterministic enrichment is not emitted as partial", () => {
  const candidate = makeCandidate({
    id: "candidate-med-no-enrichment",
    confidence: "medium",
    raw: { name: "saveOrder", verb: "save", noun: "order", splitConfidence: "medium" },
    normalized: { verb: "save", noun: "order" },
    source: {
      artifactRef: makeEvidenceRef(),
      path: "unmatched/path.ts",
      symbol: "saveOrder",
      kind: "symbol",
    },
  });
  const report = build({
    normalizationReport: makeNormalizationReport([candidate]),
    // No ObservedRepo / OwnershipMap supplied at all.
  });
  assert.equal(report.phrases.length, 0);
});

// ---------- 6: unknown-verb candidate is never projected ----------

test("unknown-verb candidate is never projected even with enrichment", () => {
  const candidate = makeCandidate({
    id: "candidate-unknown-verb",
    status: "unknown-verb",
    confidence: "medium",
    normalized: { verb: "ensure", noun: "user" },
  });
  const ownershipMap = makeOwnershipMap([
    { path: "src/users.ts", ownerSystem: "users", confidence: 1, evidence: [] },
  ]);
  const report = build({
    normalizationReport: makeNormalizationReport([candidate]),
    ownershipMap,
    ownershipMapRef: makeOwnershipMapRef(),
  });
  assert.equal(report.phrases.length, 0);
});

// ---------- 7: unknown-noun candidate is never projected ----------

test("unknown-noun candidate is never projected even with enrichment", () => {
  const candidate = makeCandidate({
    id: "candidate-unknown-noun",
    status: "unknown-noun",
    confidence: "medium",
    normalized: { verb: "get", noun: "invoice" },
  });
  const ownershipMap = makeOwnershipMap([
    { path: "src/users.ts", ownerSystem: "users", confidence: 1, evidence: [] },
  ]);
  const report = build({
    normalizationReport: makeNormalizationReport([candidate]),
    ownershipMap,
    ownershipMapRef: makeOwnershipMapRef(),
  });
  assert.equal(report.phrases.length, 0);
});

// ---------- 8: ignored candidate is never projected ----------

test("ignored candidate is never projected even with enrichment", () => {
  const candidate = makeCandidate({
    id: "candidate-ignored",
    status: "ignored",
    confidence: "medium",
    normalized: undefined,
  });
  const ownershipMap = makeOwnershipMap([
    { path: "src/users.ts", ownerSystem: "users", confidence: 1, evidence: [] },
  ]);
  const report = build({
    normalizationReport: makeNormalizationReport([candidate]),
    ownershipMap,
    ownershipMapRef: makeOwnershipMapRef(),
  });
  assert.equal(report.phrases.length, 0);
});

// ---------- 9: low-confidence candidate is never projected ----------

test("low-confidence candidate is never projected even with enrichment", () => {
  const candidate = makeCandidate({
    id: "candidate-low",
    confidence: "low",
    raw: { name: "save", verb: "save", noun: undefined, splitConfidence: "low" },
    normalized: { verb: "save", noun: "thing" },
  });
  const ownershipMap = makeOwnershipMap([
    { path: "src/users.ts", ownerSystem: "users", confidence: 1, evidence: [] },
  ]);
  const report = build({
    normalizationReport: makeNormalizationReport([candidate]),
    ownershipMap,
    ownershipMapRef: makeOwnershipMapRef(),
  });
  assert.equal(report.phrases.length, 0);
});

// ---------- 10: stable threshold is unchanged by enrichment context ----------

test("stable threshold is unchanged when ObservedRepo/OwnershipMap are present", () => {
  const candidate = makeCandidate({
    source: {
      artifactRef: makeEvidenceRef(),
      path: "src/users.ts",
      symbol: "getUser",
      kind: "symbol",
    },
  });
  const ownershipMap = makeOwnershipMap([
    {
      path: "src",
      ownerSystem: "core",
      layer: "domain",
      confidence: 1,
      evidence: [],
    },
  ]);
  const observedRepo = makeObservedRepo([
    {
      id: "core",
      paths: ["src"],
      layers: ["domain"],
      capabilities: [],
      confidence: 1,
      evidence: [],
      kind: "service",
    },
  ]);
  const report = build({
    normalizationReport: makeNormalizationReport([candidate]),
    observedRepo,
    observedRepoRef: makeObservedRepoRef(),
    ownershipMap,
    ownershipMapRef: makeOwnershipMapRef(),
  });
  assert.equal(report.phrases.length, 1);
  const phrase = report.phrases[0];
  assert.equal(phrase.status, "stable");
  assert.equal(phrase.confidence, "high");
  // Enrichment added on top of stable.
  assert.equal(phrase.domain, "core");
  assert.equal(phrase.layer, "domain");
  assert.equal(phrase.pattern, "service");
});

// ---------- 11: summary counts stable / partial / withDomain / withPattern / withLayer ----------

test("summary counts stable / partial / withDomain / withPattern / withLayer correctly", () => {
  const stableCandidate = makeCandidate({
    id: "candidate-stable",
    source: {
      artifactRef: makeEvidenceRef(),
      path: "src/payments/charge.ts",
      symbol: "chargeCard",
      kind: "symbol",
    },
    raw: { name: "chargeCard", verb: "charge", noun: "card", splitConfidence: "high" },
    normalized: { verb: "charge", noun: "card" },
  });
  const partialCandidate = makeCandidate({
    id: "candidate-partial",
    confidence: "medium",
    source: {
      artifactRef: makeEvidenceRef(),
      path: "src/refund/refund.ts",
      symbol: "issueRefund",
      kind: "symbol",
    },
    raw: { name: "issueRefund", verb: "issue", noun: "refund", splitConfidence: "medium" },
    normalized: { verb: "issue", noun: "refund" },
  });
  const ownershipMap = makeOwnershipMap([
    {
      path: "src/payments",
      ownerSystem: "payments",
      layer: "domain",
      confidence: 1,
      evidence: [],
    },
    {
      path: "src/refund",
      ownerSystem: "refunds",
      layer: "domain",
      confidence: 1,
      evidence: [],
    },
  ]);
  const observedRepo = makeObservedRepo([
    {
      id: "payments",
      paths: ["src/payments"],
      layers: ["domain"],
      capabilities: [],
      confidence: 1,
      evidence: [],
      kind: "service",
    },
    {
      id: "refunds",
      paths: ["src/refund"],
      layers: ["domain"],
      capabilities: [],
      confidence: 1,
      evidence: [],
      kind: "service",
    },
  ]);
  const report = build({
    normalizationReport: makeNormalizationReport([stableCandidate, partialCandidate]),
    observedRepo,
    observedRepoRef: makeObservedRepoRef(),
    ownershipMap,
    ownershipMapRef: makeOwnershipMapRef(),
  });
  assert.equal(report.summary.totalPhrases, 2);
  assert.equal(report.summary.stable, 1);
  assert.equal(report.summary.partial, 1);
  assert.equal(report.summary.lowConfidence, 0);
  assert.equal(report.summary.withDomain, 2);
  assert.equal(report.summary.withLayer, 2);
  assert.equal(report.summary.withPattern, 2);
});

// ---------- 12: header.inputRefs cites ObservedRepo when consumed ----------

test("header.inputRefs cites ObservedRepo when enrichment consumes it", () => {
  const candidate = makeCandidate({
    confidence: "medium",
    raw: { name: "handleRequest", verb: "handle", noun: "request", splitConfidence: "high" },
    normalized: { verb: "handle", noun: "request" },
    source: {
      artifactRef: makeEvidenceRef(),
      path: "app/api/users/route.ts",
      symbol: "GET",
      kind: "symbol",
    },
  });
  const observedRepo = makeObservedRepo([
    {
      id: "api",
      paths: ["app/api"],
      layers: [],
      capabilities: [],
      confidence: 1,
      evidence: [],
      kind: "route",
    },
  ]);
  const report = build({
    normalizationReport: makeNormalizationReport([candidate]),
    observedRepo,
    observedRepoRef: makeObservedRepoRef(),
  });
  const cite = report.header.inputRefs.find((ref) => ref.type === "ObservedRepo");
  assert.ok(cite, "header.inputRefs must cite ObservedRepo when consumed");
});

// ---------- 13: header.inputRefs cites OwnershipMap when consumed ----------

test("header.inputRefs cites OwnershipMap when enrichment consumes it", () => {
  const candidate = makeCandidate({
    confidence: "medium",
    raw: { name: "saveOrder", verb: "save", noun: "order", splitConfidence: "medium" },
    normalized: { verb: "save", noun: "order" },
    source: {
      artifactRef: makeEvidenceRef(),
      path: "src/checkout/order.ts",
      symbol: "saveOrder",
      kind: "symbol",
    },
  });
  const ownershipMap = makeOwnershipMap([
    { path: "src/checkout", ownerSystem: "checkout", confidence: 1, evidence: [] },
  ]);
  const report = build({
    normalizationReport: makeNormalizationReport([candidate]),
    ownershipMap,
    ownershipMapRef: makeOwnershipMapRef(),
  });
  const cite = report.header.inputRefs.find((ref) => ref.type === "OwnershipMap");
  assert.ok(cite, "header.inputRefs must cite OwnershipMap when consumed");
});

// ---------- CLI tests ----------

async function setupCliTarget() {
  const work = await mkdtemp(join(tmpdir(), "rekon-phrase-enrich-cli-"));
  await cp(exampleRoot, work, { recursive: true });
  spawnSync("node", [cliPath, "refresh", "--root", work, "--json"], { encoding: "utf8" });
  spawnSync(
    "node",
    [cliPath, "capability", "ontology", "normalize", "--root", work, "--json"],
    { encoding: "utf8" },
  );
  const latest = spawnSync(
    "node",
    [cliPath, "artifacts", "latest", "--root", work, "--type", "CapabilityNormalizationReport", "--id-only"],
    { encoding: "utf8" },
  );
  const reportRef = (latest.stdout ?? "").trim();
  return { work, reportRef };
}

// ---------- 14: CLI reads ObservedRepo / OwnershipMap when present ----------

test("rekon capability phrase project reads ObservedRepo / OwnershipMap when present", async () => {
  const { work, reportRef } = await setupCliTarget();
  try {
    const result = spawnSync(
      "node",
      [cliPath, "capability", "phrase", "project", "--root", work, "--report", reportRef, "--json"],
      { encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr || "project failed");
    const out = JSON.parse(result.stdout);
    // refresh creates ObservedRepo + OwnershipMap on the fixture
    // store; the CLI surfaces them as consumed context refs.
    assert.ok(
      out.contextRefs?.observedRepo,
      "contextRefs.observedRepo should be present when the fixture has an ObservedRepo and at least one candidate path matches a system",
    );
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 15: CLI succeeds when ObservedRepo / OwnershipMap are missing ----------

test("rekon capability phrase project succeeds when ObservedRepo and OwnershipMap are absent", async () => {
  const { work, reportRef } = await setupCliTarget();
  try {
    // Remove projection artifacts that aren't the normalization report.
    const projDir = join(work, ".rekon/artifacts/projections");
    const files = await readdir(projDir);
    for (const file of files) {
      if (file.startsWith("ObservedRepo-") || file.startsWith("OwnershipMap-")) {
        await rm(join(projDir, file));
      }
    }
    // Rewrite index to drop the deleted entries.
    const indexPath = join(work, ".rekon/registry/artifacts.index.json");
    const raw = JSON.parse(await readFile(indexPath, "utf8"));
    const filtered = Array.isArray(raw)
      ? raw.filter((entry) => entry.type !== "ObservedRepo" && entry.type !== "OwnershipMap")
      : raw;
    await writeFile(indexPath, JSON.stringify(filtered, null, 2));
    const result = spawnSync(
      "node",
      [cliPath, "capability", "phrase", "project", "--root", work, "--report", reportRef, "--json"],
      { encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr || "project failed without enrichment context");
    const out = JSON.parse(result.stdout);
    assert.equal(out.artifact.type, "CapabilityPhraseReport");
    assert.deepEqual(out.contextRefs, {});
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 16: CLI writes CapabilityPhraseReport only ----------

test("rekon capability phrase project writes only CapabilityPhraseReport (no new categories)", async () => {
  const { work, reportRef } = await setupCliTarget();
  try {
    const projDirBefore = await readdir(join(work, ".rekon/artifacts/projections"));
    spawnSync(
      "node",
      [cliPath, "capability", "phrase", "project", "--root", work, "--report", reportRef, "--json"],
      { encoding: "utf8" },
    );
    const projDirAfter = await readdir(join(work, ".rekon/artifacts/projections"));
    const newArtifacts = projDirAfter.filter((f) => !projDirBefore.includes(f));
    for (const file of newArtifacts) {
      assert.ok(
        file.startsWith("CapabilityPhraseReport-"),
        `unexpected new artifact ${file} from phrase projection`,
      );
    }
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 17: CLI does not mutate CapabilityMap ----------

test("rekon capability phrase project does not mutate CapabilityMap", async () => {
  const { work, reportRef } = await setupCliTarget();
  try {
    const projDir = join(work, ".rekon/artifacts/projections");
    const capMapsBefore = (await readdir(projDir)).filter((f) =>
      f.startsWith("CapabilityMap-"),
    );
    const beforeContents = await Promise.all(
      capMapsBefore.map(async (f) => [f, await readFile(join(projDir, f), "utf8")]),
    );
    spawnSync(
      "node",
      [cliPath, "capability", "phrase", "project", "--root", work, "--report", reportRef, "--json"],
      { encoding: "utf8" },
    );
    const capMapsAfter = (await readdir(projDir)).filter((f) =>
      f.startsWith("CapabilityMap-"),
    );
    assert.deepEqual(capMapsAfter.sort(), capMapsBefore.sort(), "CapabilityMap filenames must not change");
    for (const [name, content] of beforeContents) {
      const afterContent = await readFile(join(projDir, name), "utf8");
      assert.equal(afterContent, content, `CapabilityMap ${name} content must not change`);
    }
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 18: CLI does not mutate CapabilityNormalizationReport ----------

test("rekon capability phrase project does not mutate CapabilityNormalizationReport", async () => {
  const { work, reportRef } = await setupCliTarget();
  try {
    const projDir = join(work, ".rekon/artifacts/projections");
    const normsBefore = (await readdir(projDir)).filter((f) =>
      f.startsWith("CapabilityNormalizationReport-"),
    );
    const beforeContents = await Promise.all(
      normsBefore.map(async (f) => [f, await readFile(join(projDir, f), "utf8")]),
    );
    spawnSync(
      "node",
      [cliPath, "capability", "phrase", "project", "--root", work, "--report", reportRef, "--json"],
      { encoding: "utf8" },
    );
    for (const [name, content] of beforeContents) {
      const afterContent = await readFile(join(projDir, name), "utf8");
      assert.equal(afterContent, content, `CapabilityNormalizationReport ${name} content must not change`);
    }
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 19: CLI does not mutate EvidenceGraph ----------

test("rekon capability phrase project does not mutate EvidenceGraph", async () => {
  const { work, reportRef } = await setupCliTarget();
  try {
    const evidenceDir = join(work, ".rekon/artifacts/evidence");
    const beforeFiles = await readdir(evidenceDir);
    const beforeContents = await Promise.all(
      beforeFiles.map(async (f) => [f, await readFile(join(evidenceDir, f), "utf8")]),
    );
    spawnSync(
      "node",
      [cliPath, "capability", "phrase", "project", "--root", work, "--report", reportRef, "--json"],
      { encoding: "utf8" },
    );
    const afterFiles = await readdir(evidenceDir);
    assert.deepEqual(afterFiles.sort(), beforeFiles.sort());
    for (const [name, content] of beforeContents) {
      const afterContent = await readFile(join(evidenceDir, name), "utf8");
      assert.equal(afterContent, content, `EvidenceGraph ${name} content must not change`);
    }
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 20: architecture summary phrase section shows partial count ----------

test("architecture summary phrase section surfaces partial count", async () => {
  const { work, reportRef } = await setupCliTarget();
  try {
    spawnSync(
      "node",
      [cliPath, "capability", "phrase", "project", "--root", work, "--report", reportRef, "--json"],
      { encoding: "utf8" },
    );
    spawnSync(
      "node",
      [cliPath, "publish", "architecture", "--root", work, "--json"],
      { encoding: "utf8" },
    );
    const pubDir = join(work, ".rekon/artifacts/publications");
    const archFiles = (await readdir(pubDir)).filter((f) =>
      f.startsWith("Publication-architecture-summary-"),
    );
    archFiles.sort();
    const latest = archFiles[archFiles.length - 1];
    const pub = JSON.parse(await readFile(join(pubDir, latest), "utf8"));
    const content = pub.content ?? pub.body ?? pub.markdown ?? "";
    assert.match(content, /Capability Phrases/);
    assert.match(content, /partial \d+/, "architecture summary must surface partial count");
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 21: agent contract phrase section shows partial count ----------

test("agent contract phrase section surfaces partial count", async () => {
  const { work, reportRef } = await setupCliTarget();
  try {
    spawnSync(
      "node",
      [cliPath, "capability", "phrase", "project", "--root", work, "--report", reportRef, "--json"],
      { encoding: "utf8" },
    );
    spawnSync(
      "node",
      [cliPath, "publish", "agent-contract", "--root", work, "--json"],
      { encoding: "utf8" },
    );
    const pubDir = join(work, ".rekon/artifacts/publications");
    const agentFiles = (await readdir(pubDir)).filter((f) =>
      f.startsWith("Publication-agent-contract-"),
    );
    agentFiles.sort();
    const latest = agentFiles[agentFiles.length - 1];
    const pub = JSON.parse(await readFile(join(pubDir, latest), "utf8"));
    const content = pub.content ?? pub.body ?? pub.markdown ?? "";
    assert.match(content, /Capability Phrases/);
    assert.match(content, /partial \d+/, "agent contract must surface partial count");
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 22: artifacts validate remains clean ----------

test("artifacts validate remains clean after phrase projection with enrichment", async () => {
  const { work, reportRef } = await setupCliTarget();
  try {
    spawnSync(
      "node",
      [cliPath, "capability", "phrase", "project", "--root", work, "--report", reportRef, "--json"],
      { encoding: "utf8" },
    );
    const validateResult = spawnSync(
      "node",
      [cliPath, "artifacts", "validate", "--root", work, "--json"],
      { encoding: "utf8" },
    );
    assert.equal(validateResult.status, 0, validateResult.stderr);
    const out = JSON.parse(validateResult.stdout);
    assert.equal(out.valid, true, `artifacts validate must remain clean: ${JSON.stringify(out.issues)}`);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});
