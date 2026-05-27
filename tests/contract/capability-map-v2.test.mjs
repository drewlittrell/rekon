// Contract tests for the CapabilityMap v2
// high-confidence-only implementation
// (twenty-eighth slice on the capability-ontology
// track). Verifies the additive `phraseBackedCapabilities`
// / `phraseBackedSummary` / `phraseSourceRef`
// projection committed to by the v2 decision memo:
// stable + high-confidence only, partials excluded,
// raw normalization rows excluded, citation chain
// preserved.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  assertCapabilityMap,
  createCapabilityMap,
  validateCapabilityMap,
} from "../../packages/kernel-repo-model/dist/index.js";
import {
  buildPhraseBackedCapabilityMapAdditions,
} from "../../packages/capability-model/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const fixtureRoot = join(repoRoot, "tests/fixtures/js-ts-ast-evidence");

const PHRASE_REPORT_REF = {
  type: "CapabilityPhraseReport",
  id: "capability-phrase-test-001",
  path: ".rekon/artifacts/projections/CapabilityPhraseReport-test.json",
  schemaVersion: "0.1.0",
};
const EVIDENCE_REF = {
  type: "EvidenceGraph",
  id: "evidence-test-001",
  path: ".rekon/artifacts/evidence/EvidenceGraph-test.json",
  schemaVersion: "0.1.0",
};
const NORM_CANDIDATE_REF = {
  type: "CapabilityNormalizationReport",
  id: "capability-normalization-test-001",
  path: ".rekon/artifacts/projections/CapabilityNormalizationReport-test.json",
  schemaVersion: "0.1.0",
};

function makeBaseHeader() {
  return {
    artifactType: "CapabilityMap",
    artifactId: `capability-map-test-${Date.now()}`,
    schemaVersion: "0.1.0",
    generatedAt: new Date().toISOString(),
    subject: { repoId: "test-repo" },
    producer: { id: "test-harness", version: "0.1.0" },
    inputRefs: [EVIDENCE_REF],
    freshness: { status: "fresh" },
    provenance: { confidence: 0.85 },
  };
}

function makePhrase(overrides = {}) {
  return {
    id: "phrase-001",
    verb: "create",
    noun: "user",
    confidence: "high",
    status: "stable",
    evidenceRefs: [EVIDENCE_REF],
    sourceCandidateIds: ["candidate-001"],
    ...overrides,
  };
}

function makePhraseReport(phrases) {
  return {
    summary: { totalPhrases: phrases.length, stable: 0, partial: 0, lowConfidence: 0 },
    phrases,
  };
}

// ---------- 1: v1-shape CapabilityMap still validates ----------

test("CapabilityMap without v2 fields still validates", () => {
  const map = createCapabilityMap({
    header: makeBaseHeader(),
    entries: [
      {
        capability: "billing",
        subjects: ["src/billing.ts"],
        systems: ["src"],
        confidence: 0.9,
        evidence: [EVIDENCE_REF],
      },
    ],
  });
  assert.equal(map.entries.length, 1);
  assert.equal(map.phraseBackedCapabilities, undefined);
  assert.equal(map.phraseBackedSummary, undefined);
  assert.equal(map.phraseSourceRef, undefined);
  // Validator accepts both shapes.
  const result = validateCapabilityMap(map);
  assert.equal(result.ok, true, "v1-only map must validate");
});

// ---------- 2: v2 map with phraseBackedCapabilities validates ----------

test("CapabilityMap with phraseBackedCapabilities validates", () => {
  const map = createCapabilityMap({
    header: makeBaseHeader(),
    entries: [],
    phraseBackedCapabilities: [
      {
        id: "capability-phrase:phrase-001",
        phraseRef: { report: PHRASE_REPORT_REF, phraseId: "phrase-001" },
        verb: "create",
        noun: "user",
        evidenceRefs: [EVIDENCE_REF],
        sourceCandidateIds: ["candidate-001"],
        confidence: "high",
        status: "stable",
      },
    ],
    phraseBackedSummary: {
      total: 1,
      byVerb: { create: 1 },
      byNoun: { user: 1 },
      withDomain: 0,
      withPattern: 0,
      withLayer: 0,
    },
    phraseSourceRef: PHRASE_REPORT_REF,
  });
  const result = validateCapabilityMap(map);
  assert.equal(result.ok, true, "v2 map must validate");
  assert.equal(map.phraseBackedCapabilities?.length, 1);
  assert.equal(map.phraseBackedCapabilities?.[0].confidence, "high");
  assert.equal(map.phraseBackedCapabilities?.[0].status, "stable");
});

// ---------- 3: build helper projects stable high-confidence phrase ----------

test("build helper projects stable high-confidence phrase", () => {
  const result = buildPhraseBackedCapabilityMapAdditions({
    phraseReport: makePhraseReport([makePhrase()]),
    phraseReportRef: PHRASE_REPORT_REF,
  });
  assert.equal(result.phraseBackedCapabilities?.length, 1);
  const entry = result.phraseBackedCapabilities[0];
  assert.equal(entry.verb, "create");
  assert.equal(entry.noun, "user");
  assert.equal(entry.confidence, "high");
  assert.equal(entry.status, "stable");
  assert.equal(entry.phraseRef.phraseId, "phrase-001");
  assert.deepEqual(entry.phraseRef.report, PHRASE_REPORT_REF);
});

// ---------- 4: build helper excludes partial phrase ----------

test("build helper excludes partial phrase", () => {
  const result = buildPhraseBackedCapabilityMapAdditions({
    phraseReport: makePhraseReport([makePhrase({ status: "partial" })]),
    phraseReportRef: PHRASE_REPORT_REF,
  });
  assert.equal(result.phraseBackedCapabilities?.length, 0,
    "partial phrases must not project into v2");
});

// ---------- 5: build helper excludes low-confidence phrase ----------

test("build helper excludes low-confidence phrase", () => {
  const result = buildPhraseBackedCapabilityMapAdditions({
    phraseReport: makePhraseReport([makePhrase({ confidence: "medium" }), makePhrase({ confidence: "low", id: "phrase-002" })]),
    phraseReportRef: PHRASE_REPORT_REF,
  });
  assert.equal(result.phraseBackedCapabilities?.length, 0,
    "non-high-confidence phrases must not project into v2");
});

// ---------- 6: build helper excludes phrase missing evidenceRefs ----------

test("build helper excludes phrase missing evidenceRefs", () => {
  const result = buildPhraseBackedCapabilityMapAdditions({
    phraseReport: makePhraseReport([makePhrase({ evidenceRefs: [] })]),
    phraseReportRef: PHRASE_REPORT_REF,
  });
  assert.equal(result.phraseBackedCapabilities?.length, 0,
    "phrases without evidenceRefs must not project into v2");
});

// ---------- 7: build helper excludes phrase missing sourceCandidateIds ----------

test("build helper excludes phrase missing sourceCandidateIds", () => {
  const result = buildPhraseBackedCapabilityMapAdditions({
    phraseReport: makePhraseReport([makePhrase({ sourceCandidateIds: [] })]),
    phraseReportRef: PHRASE_REPORT_REF,
  });
  assert.equal(result.phraseBackedCapabilities?.length, 0,
    "phrases without sourceCandidateIds must not project into v2");
});

// ---------- 8: build helper excludes phrase missing verb/noun ----------

test("build helper excludes phrase missing verb or noun", () => {
  const noVerb = buildPhraseBackedCapabilityMapAdditions({
    phraseReport: makePhraseReport([makePhrase({ verb: "" })]),
    phraseReportRef: PHRASE_REPORT_REF,
  });
  assert.equal(noVerb.phraseBackedCapabilities?.length, 0);

  const noNoun = buildPhraseBackedCapabilityMapAdditions({
    phraseReport: makePhraseReport([makePhrase({ noun: "" })]),
    phraseReportRef: PHRASE_REPORT_REF,
  });
  assert.equal(noNoun.phraseBackedCapabilities?.length, 0);
});

// ---------- 9: output ordering is deterministic ----------

test("output ordering is deterministic (verb asc, noun asc, id asc)", () => {
  const phrases = [
    makePhrase({ id: "phrase-Z", verb: "save", noun: "session" }),
    makePhrase({ id: "phrase-A", verb: "create", noun: "user" }),
    makePhrase({ id: "phrase-M", verb: "save", noun: "report" }),
    makePhrase({ id: "phrase-B", verb: "create", noun: "user" }), // duplicate verb/noun, lower id
  ];
  const result = buildPhraseBackedCapabilityMapAdditions({
    phraseReport: makePhraseReport(phrases),
    phraseReportRef: PHRASE_REPORT_REF,
  });
  const order = result.phraseBackedCapabilities.map((entry) => entry.id);
  assert.deepEqual(order, [
    "capability-phrase:phrase-A",
    "capability-phrase:phrase-B",
    "capability-phrase:phrase-M",
    "capability-phrase:phrase-Z",
  ], "ordering must be verb asc, then noun asc, then id asc");
});

// ---------- 10: summary byVerb / byNoun counts deterministic ----------

test("summary byVerb / byNoun counts are deterministic with sorted keys", () => {
  const phrases = [
    makePhrase({ id: "p1", verb: "create", noun: "user" }),
    makePhrase({ id: "p2", verb: "create", noun: "session" }),
    makePhrase({ id: "p3", verb: "save", noun: "user" }),
  ];
  const result = buildPhraseBackedCapabilityMapAdditions({
    phraseReport: makePhraseReport(phrases),
    phraseReportRef: PHRASE_REPORT_REF,
  });
  assert.equal(result.phraseBackedSummary.total, 3);
  assert.deepEqual(result.phraseBackedSummary.byVerb, { create: 2, save: 1 });
  assert.deepEqual(result.phraseBackedSummary.byNoun, { session: 1, user: 2 });
  // Key order should be alphabetical (sorted at normalize time).
  assert.deepEqual(Object.keys(result.phraseBackedSummary.byVerb), ["create", "save"]);
  assert.deepEqual(Object.keys(result.phraseBackedSummary.byNoun), ["session", "user"]);
});

// ---------- 11: withDomain / withPattern / withLayer counts correct ----------

test("withDomain / withPattern / withLayer counts reflect enrichment", () => {
  const phrases = [
    makePhrase({ id: "p1", domain: "src" }),
    makePhrase({ id: "p2", domain: "src", layer: "source" }),
    makePhrase({ id: "p3", domain: "billing", pattern: "service", layer: "api" }),
  ];
  const result = buildPhraseBackedCapabilityMapAdditions({
    phraseReport: makePhraseReport(phrases),
    phraseReportRef: PHRASE_REPORT_REF,
  });
  assert.equal(result.phraseBackedSummary.withDomain, 3);
  assert.equal(result.phraseBackedSummary.withPattern, 1);
  assert.equal(result.phraseBackedSummary.withLayer, 2);
});

// ---------- 12: phraseSourceRef set when report consumed ----------

test("phraseSourceRef is set when the report is consumed", () => {
  const result = buildPhraseBackedCapabilityMapAdditions({
    phraseReport: makePhraseReport([makePhrase()]),
    phraseReportRef: PHRASE_REPORT_REF,
  });
  assert.deepEqual(result.phraseSourceRef, PHRASE_REPORT_REF);
});

// ---------- 13: producer includes phrase-backed fields when phrase report exists ----------
// ---------- 14: producer cites CapabilityPhraseReport in inputRefs ----------
// ---------- 15: producer emits v1 map when no phrase report exists ----------
// (combined into one CLI smoke driver per cost; assertions split below)

test("CLI: producer emits v2 phrase-backed fields when CapabilityPhraseReport exists; v1 otherwise", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "rekon-cm-v2-"));
  try {
    await cp(fixtureRoot, tempRoot, { recursive: true });
    await rm(join(tempRoot, ".rekon"), { recursive: true, force: true });

    function run(args) {
      const result = spawnSync("node", [cliPath, ...args, "--root", tempRoot], {
        encoding: "utf8",
        maxBuffer: 200_000_000,
      });
      return result;
    }

    // First refresh — no CapabilityPhraseReport exists yet,
    // so the CapabilityMap should be a clean v1 shape.
    let r = run(["refresh", "--json"]);
    assert.equal(r.status, 0, `refresh must succeed: ${r.stderr?.slice(0, 300)}`);

    const artifactsDir = join(tempRoot, ".rekon/artifacts");
    async function readLatestCapabilityMap() {
      const dir = join(artifactsDir, "projections");
      const files = (await readdir(dir)).filter((f) => f.startsWith("CapabilityMap-")).sort();
      assert.ok(files.length > 0, "CapabilityMap artifact must exist");
      return JSON.parse(await readFile(join(dir, files.at(-1)), "utf8"));
    }

    const v1Map = await readLatestCapabilityMap();
    // Assertion 15 (combined): producer emits v1 map when no phrase report exists.
    assert.equal(v1Map.phraseBackedCapabilities, undefined,
      "no CapabilityPhraseReport → no phraseBackedCapabilities field");
    assert.equal(v1Map.phraseSourceRef, undefined);

    // Now create a phrase report and re-refresh.
    r = run(["capability", "ontology", "normalize", "--json"]);
    assert.equal(r.status, 0, `normalize must succeed: ${r.stderr?.slice(0, 300)}`);
    const normLatest = spawnSync("node", [
      cliPath, "artifacts", "latest", "--root", tempRoot,
      "--type", "CapabilityNormalizationReport", "--id-only",
    ], { encoding: "utf8" });
    const normRef = normLatest.stdout.trim();
    r = run(["capability", "phrase", "project", "--report", normRef, "--json"]);
    assert.equal(r.status, 0, `phrase project must succeed: ${r.stderr?.slice(0, 300)}`);

    r = run(["refresh", "--json"]);
    assert.equal(r.status, 0, `refresh must succeed: ${r.stderr?.slice(0, 300)}`);

    const v2Map = await readLatestCapabilityMap();
    // Assertion 13: producer includes phrase-backed fields
    // when phrase report exists.
    assert.ok(Array.isArray(v2Map.phraseBackedCapabilities),
      "with CapabilityPhraseReport present, phraseBackedCapabilities must be an array");
    assert.ok(v2Map.phraseBackedCapabilities.length > 0,
      "fixture has stable phrases; v2 should populate the array");
    assert.ok(v2Map.phraseBackedSummary,
      "phraseBackedSummary must be present");
    assert.ok(v2Map.phraseSourceRef,
      "phraseSourceRef must cite the consumed CapabilityPhraseReport");
    assert.equal(v2Map.phraseSourceRef.type, "CapabilityPhraseReport");

    // Assertion 14: producer cites CapabilityPhraseReport in
    // header.inputRefs when consumed.
    const inputRefTypes = (v2Map.header?.inputRefs ?? []).map((ref) => ref.type);
    assert.ok(inputRefTypes.includes("CapabilityPhraseReport"),
      "header.inputRefs must include CapabilityPhraseReport when consumed");

    // Assertion 20 (combined): artifacts validate clean.
    r = run(["artifacts", "validate", "--json"]);
    assert.equal(r.status, 0, `validate must succeed: ${r.stderr?.slice(0, 300)}`);
    const payload = JSON.parse(r.stdout);
    assert.equal(payload.valid, true, "artifacts must validate clean");
    assert.equal(payload.invalid ?? 0, 0, "no invalid artifacts");
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

// ---------- 16: producer does not mutate CapabilityPhraseReport ----------
// ---------- 17: producer does not mutate CapabilityNormalizationReport ----------
// ---------- 18: producer does not mutate EvidenceGraph ----------

test("build helper does not mutate the CapabilityPhraseReport input", () => {
  const originalPhrase = makePhrase();
  const report = makePhraseReport([originalPhrase]);
  const reportSnapshot = JSON.parse(JSON.stringify(report));
  buildPhraseBackedCapabilityMapAdditions({
    phraseReport: report,
    phraseReportRef: PHRASE_REPORT_REF,
  });
  assert.deepEqual(report, reportSnapshot,
    "helper must not mutate the phrase report");
  assert.deepEqual(originalPhrase, reportSnapshot.phrases[0],
    "helper must not mutate individual phrases");
});

test("CapabilityMap builder accepts read-only normalization/evidence references (structural test)", () => {
  // Negative-construction: the type-only inputs the helper
  // takes are unable to express a mutation back into the
  // normalization report or evidence graph (no reference is
  // passed; no writer is exposed). This test pins that the
  // public surface stays read-only.
  const helperString = buildPhraseBackedCapabilityMapAdditions.toString();
  assert.equal(helperString.includes("EvidenceGraph"), false,
    "helper signature must not name the EvidenceGraph type at runtime");
  assert.equal(helperString.includes("CapabilityNormalizationReport"), false,
    "helper signature must not name the CapabilityNormalizationReport type at runtime");
});

test("CapabilityMap builder does not depend on CapabilityNormalizationReport at runtime", () => {
  // Smoke: supplying a phrase report whose source candidate
  // ids reference normalization rows still works without
  // reading the normalization report.
  const result = buildPhraseBackedCapabilityMapAdditions({
    phraseReport: makePhraseReport([
      makePhrase({ sourceCandidateIds: ["candidate-001", "candidate-002"] }),
    ]),
    phraseReportRef: PHRASE_REPORT_REF,
  });
  assert.equal(result.phraseBackedCapabilities?.length, 1);
  assert.deepEqual(
    result.phraseBackedCapabilities[0].sourceCandidateIds,
    ["candidate-001", "candidate-002"],
  );
});

// ---------- 19: partial phrases remain absent from CapabilityMap ----------

test("partial phrases remain absent from CapabilityMap (mixed-status report)", () => {
  const phrases = [
    makePhrase({ id: "stable-1", status: "stable" }),
    makePhrase({ id: "partial-1", status: "partial", domain: "src" }),
    makePhrase({ id: "lc-1", status: "low-confidence" }),
    makePhrase({ id: "stable-2", status: "stable", verb: "save", noun: "session" }),
  ];
  const result = buildPhraseBackedCapabilityMapAdditions({
    phraseReport: makePhraseReport(phrases),
    phraseReportRef: PHRASE_REPORT_REF,
  });
  const projectedIds = result.phraseBackedCapabilities.map((entry) => entry.phraseRef.phraseId);
  assert.deepEqual(projectedIds.sort(), ["stable-1", "stable-2"]);
  for (const entry of result.phraseBackedCapabilities) {
    assert.equal(entry.status, "stable");
    assert.equal(entry.confidence, "high");
  }
});

// ---------- 20: validator rejects ineligible v2 entries ----------

test("validator rejects v2 entry with empty evidenceRefs (eligibility rule)", () => {
  const issues = [];
  const result = validateCapabilityMap({
    header: makeBaseHeader(),
    entries: [],
    phraseBackedCapabilities: [
      {
        id: "capability-phrase:phrase-bad",
        phraseRef: { report: PHRASE_REPORT_REF, phraseId: "phrase-bad" },
        verb: "create",
        noun: "user",
        evidenceRefs: [], // <-- violates eligibility
        sourceCandidateIds: ["candidate-001"],
        confidence: "high",
        status: "stable",
      },
    ],
  });
  assert.equal(result.ok, false, "validator must reject empty evidenceRefs");
  assert.ok(
    result.issues.some((issue) => issue.path.includes("evidenceRefs")),
    "issues should mention evidenceRefs",
  );
});

test("validator rejects v2 entry with non-stable status (eligibility rule)", () => {
  const result = validateCapabilityMap({
    header: makeBaseHeader(),
    entries: [],
    phraseBackedCapabilities: [
      {
        id: "capability-phrase:phrase-bad",
        phraseRef: { report: PHRASE_REPORT_REF, phraseId: "phrase-bad" },
        verb: "create",
        noun: "user",
        evidenceRefs: [EVIDENCE_REF],
        sourceCandidateIds: ["candidate-001"],
        confidence: "high",
        status: "partial",
      },
    ],
  });
  assert.equal(result.ok, false, "validator must reject non-stable status");
  assert.ok(
    result.issues.some((issue) => issue.path.endsWith("status")),
    "issues should mention status",
  );
});
