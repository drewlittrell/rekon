// Contract tests for capability ontology candidate-quality
// improvements v1.
//
// Candidate-quality v1 confirms the canon-pack covers
// frequently-appearing partial-only verb/noun pairs and
// sharpens the lexical splitter to (a) classify path-shaped
// candidates as `ignored` rather than `unknown` and (b)
// detect single-token known nouns without inventing a verb.
// The stable phrase threshold and the CapabilityMap
// boundary are unchanged.

import assert from "node:assert/strict";
import test from "node:test";

import {
  basePack,
  buildCapabilityPhraseReport,
  compileEffectiveCapabilityOntology,
  extractCapabilityCandidates,
  monorepoPack,
  nextjsAppPack,
  libraryPackagePack,
  normalizeCapabilityCandidates,
  splitCapabilityName,
} from "../../packages/capability-ontology/dist/index.js";

function evidenceFact(kind, subject, value) {
  return {
    id: `${kind}:${subject}:${value.name ?? "fact"}`,
    kind,
    subject,
    value,
    confidence: 1,
    provenance: {
      source: "test",
      pack: "test",
      extractorVersion: "1.0.0",
    },
  };
}

const ALL_PACKS = [basePack, nextjsAppPack, libraryPackagePack, monorepoPack];

function ontology() {
  return compileEffectiveCapabilityOntology({
    overlayPackIds: ["nextjs-app", "library-package", "monorepo"],
  });
}

function candidate(name, overrides = {}) {
  const split = splitCapabilityName(name);
  return {
    id: `cand-${name}`,
    raw: {
      name,
      verb: split.verb,
      noun: split.noun,
      splitConfidence: split.confidence,
      splitKind: split.kind,
    },
    source: { path: name, kind: "symbol", ...overrides.source },
    ...overrides,
  };
}

function normalize(name) {
  return normalizeCapabilityCandidates({
    candidates: [candidate(name)],
    ontology: ontology(),
  })[0];
}

// ---------- 1: canon packs include schema/request/response/plan ----------

test("base canon pack includes the four target nouns (schema, request, response, plan)", () => {
  const nouns = basePack.nouns.canonical.map((n) => n.canonical);
  for (const noun of ["schema", "request", "response", "plan"]) {
    assert.ok(nouns.includes(noun), `base canon pack must include noun "${noun}"`);
  }
});

// ---------- 2: duplicate canonical terms are not introduced ----------

test("no canon pack introduces duplicate canonical terms (verbs or nouns) within the pack", () => {
  for (const pack of ALL_PACKS) {
    const verbNames = pack.verbs?.canonical?.map((v) => v.canonical) ?? [];
    const nounNames = pack.nouns?.canonical?.map((n) => n.canonical) ?? [];
    const verbSet = new Set(verbNames);
    const nounSet = new Set(nounNames);
    assert.equal(
      verbNames.length,
      verbSet.size,
      `pack ${pack.id} must not duplicate canonical verbs`,
    );
    assert.equal(
      nounNames.length,
      nounSet.size,
      `pack ${pack.id} must not duplicate canonical nouns`,
    );
  }
});

// ---------- 3: observed pairs normalize ----------

test("observed pairs save:schema / save:request / get:response / build:plan normalize with verb+noun form", () => {
  const cases = [
    ["saveSchema", "save", "schema"],
    ["saveRequest", "save", "request"],
    ["getResponse", "get", "response"],
    ["buildPlan", "build", "plan"],
  ];
  for (const [name, verb, noun] of cases) {
    const outcome = normalize(name);
    assert.equal(outcome.status, "normalized", `${name} must normalize, got ${outcome.status}`);
    assert.equal(outcome.normalized.verb, verb);
    assert.equal(outcome.normalized.noun, noun);
    assert.equal(outcome.confidence, "high");
  }
});

// ---------- 4: path-shaped candidate is ignored, not unknown ----------

test("path-shaped candidate src/index.ts is classified as ignored, not unknown", () => {
  const outcome = normalize("src/index.ts");
  assert.equal(outcome.status, "ignored");
  assert.match(outcome.message ?? "", /path-shaped|path|capability identifier/i);
});

// ---------- 5: file-extension fragments are ignored/noise-classified ----------

test("bare file-extension fragment .tsx is classified as ignored, not unknown", () => {
  const outcome = normalize(".tsx");
  assert.equal(outcome.status, "ignored");
});

// ---------- 6: noun-only Schema is not projected as normalized phrase ----------

test("noun-only Schema is not projected as a normalized capability phrase", () => {
  const outcome = normalize("Schema");
  assert.notEqual(outcome.status, "normalized", "single-token Schema must not normalize");
  // Should fall into the noun-only known-term branch.
  assert.equal(outcome.status, "low-confidence");
  assert.match(outcome.message ?? "", /known noun.+without a verb/i);
});

// ---------- 7: FigmaSchema does not invent figma as a canonical verb ----------

test("FigmaSchema does not invent figma as a canonical verb", () => {
  const outcome = normalize("FigmaSchema");
  // figma is not a canonical verb; the candidate should land in
  // unknown-verb with the canonical noun normalized.
  assert.equal(outcome.status, "unknown-verb");
  assert.equal(outcome.normalized?.noun, "schema");
  // figma is preserved as the raw verb attempt but NEVER mapped
  // onto a canonical verb.
  assert.equal(outcome.normalized?.verbAliasApplied, undefined);
});

// ---------- 8-11: known suffix patterns are recognized as noun context ----------

for (const suffix of ["Schema", "Request", "Response", "Plan"]) {
  test(`known suffix ${suffix} (single-token) is recognized as noun context, not a verb`, () => {
    const outcome = normalize(suffix);
    assert.equal(outcome.status, "low-confidence");
    assert.ok(
      outcome.normalized?.noun,
      `single-token ${suffix} must surface the canonical noun in normalized.noun`,
    );
    assert.equal(outcome.normalized.noun, suffix.toLowerCase());
  });
}

// ---------- 12: stable phrase threshold remains unchanged ----------

test("stable phrase threshold remains unchanged (status=normalized + confidence=high + split=high)", () => {
  const outcome = normalize("saveSchema");
  assert.equal(outcome.status, "normalized");
  assert.equal(outcome.confidence, "high");
  assert.equal(outcome.candidate.raw.splitConfidence, "high");
});

test("filesystem path is not a universal alias for route", () => {
  const outcome = normalize("normalizePath");

  assert.equal(outcome.status, "unknown-noun");
  assert.equal(outcome.normalized.noun, "path");
});

test("URL normalization remains distinct from route normalization", () => {
  const outcome = normalize("normalizeUrl");

  assert.equal(outcome.status, "normalized");
  assert.equal(outcome.normalized.noun, "url");
  assert.equal(outcome.normalized.nounAliasApplied, undefined);
});

test("candidate extraction keeps executable declarations and drops classified data/type declarations", () => {
  const graph = {
    header: {
      artifactType: "EvidenceGraph",
      artifactId: "candidate-quality",
      schemaVersion: "0.1.0",
      generatedAt: "2026-07-13T00:00:00.000Z",
      subject: { repoId: "candidate-quality" },
      producer: { id: "test", version: "1.0.0" },
      inputRefs: [],
    },
    facts: [
      evidenceFact("symbol", "src/service.ts", { name: "getUser", symbolKind: "function" }),
      evidenceFact("symbol", "src/service.ts", { name: "saveUser", symbolKind: "method" }),
      evidenceFact("symbol", "src/types.ts", { name: "RequestContext", symbolKind: "class" }),
      evidenceFact("symbol", "src/types.ts", { name: "RequestSchema", symbolKind: "const" }),
      evidenceFact("symbol", "src/types.ts", { name: "RenderContext", symbolKind: "interface" }),
      evidenceFact("export", "src/service.ts", { name: "createUser", kind: "function" }),
      evidenceFact("export", "src/types.ts", { name: "ResponseSchema", kind: "const" }),
      evidenceFact("export", "src/types.ts", { name: "UserRecord", kind: "type" }),
    ],
  };

  assert.deepEqual(
    extractCapabilityCandidates(graph).map((entry) => entry.raw.name),
    ["getUser", "saveUser", "createUser"],
  );
});

test("candidate extraction keeps unclassified community symbol/export facts for compatibility", () => {
  const graph = {
    header: {
      artifactType: "EvidenceGraph",
      artifactId: "candidate-compatibility",
      schemaVersion: "0.1.0",
      generatedAt: "2026-07-13T00:00:00.000Z",
      subject: { repoId: "candidate-quality" },
      producer: { id: "test", version: "1.0.0" },
      inputRefs: [],
    },
    facts: [
      evidenceFact("symbol", "src/community.ts", { name: "getAccount" }),
      evidenceFact("export", "src/community.ts", { name: "saveAccount" }),
    ],
  };

  assert.deepEqual(
    extractCapabilityCandidates(graph).map((entry) => entry.raw.name),
    ["getAccount", "saveAccount"],
  );
});

// ---------- 13: CapabilityPhraseReport emits stable only for high-confidence normalized candidates ----------

test("CapabilityPhraseReport emits stable only for status=normalized + confidence=high candidates", () => {
  const stableCandidate = candidate("saveSchema");
  const mediumCandidate = {
    ...candidate("saveSchema"),
    id: "cand-medium",
    raw: { ...candidate("saveSchema").raw, splitConfidence: "medium" },
  };
  const candidates = [stableCandidate, mediumCandidate];
  const outcomes = normalizeCapabilityCandidates({
    candidates,
    ontology: ontology(),
  });
  const normalizationReport = {
    header: {
      artifactType: "CapabilityNormalizationReport",
      artifactId: "norm-cq-test",
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
      normalized: outcomes.filter((o) => o.status === "normalized").length,
      unknownVerb: 0,
      unknownNoun: 0,
      unknown: 0,
      ignored: 0,
      aliasApplied: 0,
      lowConfidence: 0,
    },
    candidates: outcomes.map((o) => ({
      id: o.candidate.id,
      source: { ...o.candidate.source, artifactRef: undefined, factId: "fact-0", path: o.candidate.source.path },
      raw: o.candidate.raw,
      normalized: o.normalized,
      confidence: o.confidence,
      status: o.status,
      message: o.message,
    })),
  };
  const phraseReport = buildCapabilityPhraseReport({
    header: {
      artifactType: "CapabilityPhraseReport",
      artifactId: "phrase-cq-test",
      schemaVersion: "0.1.0",
      generatedAt: "2026-05-27T00:00:00.000Z",
      subject: { repoId: "test" },
      producer: { id: "test", version: "0.1.0" },
      inputRefs: [],
      freshness: { status: "fresh" },
    },
    normalizationReport,
    normalizationReportRef: {
      type: "CapabilityNormalizationReport",
      id: "norm-cq-test",
      path: ".rekon/artifacts/projections/CapabilityNormalizationReport-norm-cq-test.json",
      digest: "fake",
      schemaVersion: "0.1.0",
    },
  });
  const stable = phraseReport.phrases.filter((p) => p.status === "stable");
  // Both candidates have the same name (saveSchema), but only the
  // high-confidence one meets the stable threshold. The medium one
  // can only emit as partial, and only when enrichment exists.
  assert.equal(stable.length, 1, "exactly one stable phrase expected");
  assert.equal(stable[0].confidence, "high");
});

// ---------- 14: CapabilityMap is not mutated by normalization / phrase projection ----------

test("CapabilityMap is not mutated by candidate normalization or phrase projection", () => {
  // The helpers used in this test do not have access to a
  // CapabilityMap and do not export one. The contract is
  // structural: normalizeCapabilityCandidates returns outcomes
  // only, buildCapabilityPhraseReport returns a phrase report
  // only — neither writes a CapabilityMap. This test pins the
  // helper return shapes.
  const outcomes = normalizeCapabilityCandidates({
    candidates: [candidate("saveSchema")],
    ontology: ontology(),
  });
  assert.ok(Array.isArray(outcomes));
  for (const outcome of outcomes) {
    assert.ok(!("capabilityMap" in outcome));
  }
});

// ---------- 15: EvidenceGraph is not mutated by normalization ----------

test("EvidenceGraph is not mutated by normalization", () => {
  const cand = candidate("saveSchema");
  const before = JSON.stringify(cand);
  normalizeCapabilityCandidates({
    candidates: [cand],
    ontology: ontology(),
  });
  assert.equal(JSON.stringify(cand), before, "input candidate must not mutate");
});

// ---------- 16: artifacts validate remains clean (smoke) ----------

test("normalization helper still emits well-formed outcomes for all candidate-kind branches", () => {
  const inputs = [
    candidate("saveSchema"),
    candidate("Schema"),
    candidate("src/index.ts"),
    candidate(".tsx"),
    candidate("FigmaSchema"),
  ];
  const outcomes = normalizeCapabilityCandidates({
    candidates: inputs,
    ontology: ontology(),
  });
  assert.equal(outcomes.length, inputs.length);
  const statuses = new Set(outcomes.map((o) => o.status));
  // expected distribution:
  // - normalized: saveSchema
  // - low-confidence: Schema
  // - ignored: src/index.ts, .tsx
  // - unknown-verb: FigmaSchema
  assert.ok(statuses.has("normalized"));
  assert.ok(statuses.has("low-confidence"));
  assert.ok(statuses.has("ignored"));
  assert.ok(statuses.has("unknown-verb"));
});
