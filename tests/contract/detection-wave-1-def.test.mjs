// WO-14 Wave B behavioral tests.
// D: capability overlap fires only on declared systems; contract-declared
//    sharing exempts; no OwnershipMap -> inert.
// E: the {Entity}{Role} contract is archetype-tier (jurisdiction proven),
//    vocabulary nouns exempt entity-only names (counted), roles satisfy.
// F: declared-signal anti-patterns fire with correction pairs; tier-aware;
//    grammar-declared exceptions honored; signal table drift-guarded
//    against the ported pack rows.

import assert from "node:assert/strict";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const policy = await import(join(repoRoot, "packages/capability-policy/dist/index.js"));
const ontology = await import(join(repoRoot, "packages/capability-ontology/dist/grammar/index.js"));
const jsts = await import(join(repoRoot, "packages/capability-js-ts/dist/index.js"));

// ---- D: capability overlap ------------------------------------------------

const CAPS = [{ id: "cap-1", name: "Send Notifications", subjects: ["billing/notify.ts", "identity/notify.ts"] }];
const OWNERSHIP = [
  { path: "billing", ownerSystem: "billing" },
  { path: "identity", ownerSystem: "identity" },
];

test("D: two declared systems implementing one capability fire; declared sharing exempts with citation", () => {
  const fired = policy.evaluateCapabilityOverlap({ capabilities: CAPS, ownershipEntries: OWNERSHIP });

  assert.equal(fired.length, 1);
  assert.equal(fired[0].ruleId, "capability.overlap");
  assert.deepEqual(fired[0].payload.systems, ["billing", "identity"]);
  assert.match(fired[0].payload.citation, /§C capability_overlap/);

  const exempt = policy.evaluateCapabilityOverlap({
    capabilities: CAPS,
    ownershipEntries: OWNERSHIP,
    contractEntries: [{ id: "c-share", allowedSystems: ["billing", "identity"], capabilityRef: { name: "send notifications" } }],
  });

  assert.deepEqual(exempt, []);
});

test("D: no OwnershipMap means no overlap law (inert, honestly)", () => {
  assert.deepEqual(policy.evaluateCapabilityOverlap({ capabilities: CAPS }), []);
  // One system only never fires.
  assert.deepEqual(
    policy.evaluateCapabilityOverlap({
      capabilities: CAPS,
      ownershipEntries: [{ path: "billing", ownerSystem: "billing" }, { path: "identity", ownerSystem: "billing" }],
    }),
    [],
  );
  assert.deepEqual(
    policy.evaluateCapabilityOverlap({
      capabilities: CAPS,
      ownershipEntries: OWNERSHIP.map((entry) => ({ ...entry, basis: "inferred" })),
    }),
    [],
  );
});

test("D: policy evaluator consumes public CapabilityMap.entries and declares model inputs", async () => {
  const ref = (type, id) => ({ type, id, schemaVersion: "0.1.0" });
  const evidenceRef = ref("EvidenceGraph", "evidence-1");
  const capabilityRef = ref("CapabilityMap", "capability-map-1");
  const ownershipRef = ref("OwnershipMap", "ownership-map-1");
  const header = (artifactType, artifactId) => ({
    artifactType,
    artifactId,
    schemaVersion: "0.1.0",
    generatedAt: "2026-07-13T00:00:00.000Z",
    subject: { repoId: "fixture" },
    producer: { id: "@rekon/test", version: "1.0.0" },
    inputRefs: artifactType === "EvidenceGraph" ? [] : [evidenceRef],
  });
  const bodies = new Map([
    [evidenceRef.id, { header: header("EvidenceGraph", evidenceRef.id), facts: [] }],
    [capabilityRef.id, {
      header: header("CapabilityMap", capabilityRef.id),
      entries: [{
        capability: "send notifications",
        subjects: ["billing/notify.ts", "identity/notify.ts"],
        systems: ["billing", "identity"],
        confidence: 0.9,
        evidence: [evidenceRef],
      }],
    }],
    [ownershipRef.id, {
      header: header("OwnershipMap", ownershipRef.id),
      entries: [
        { path: "billing", ownerSystem: "billing", confidence: 0.9, evidence: [evidenceRef] },
        { path: "identity", ownerSystem: "identity", confidence: 0.9, evidence: [evidenceRef] },
      ],
    }],
  ]);
  const refs = [evidenceRef, capabilityRef, ownershipRef];
  const written = [];
  const artifacts = {
    list: async (type) => refs.filter((entry) => entry.type === type),
    read: async (artifactRef) => bodies.get(artifactRef.id),
    write: async (_type, report) => {
      written.push(report);
      return ref(report.header.artifactType, report.header.artifactId);
    },
  };

  await policy.policyEvaluator.evaluate({ artifacts, input: {} });

  const assessmentReport = written.find((report) => report.header.artifactType === "AssessmentReport");
  const overlap = assessmentReport.assessments.filter((assessment) => assessment.ruleId === "capability.overlap");
  assert.equal(overlap.length, 1);
  assert.deepEqual(overlap[0].files, ["billing/notify.ts", "identity/notify.ts"]);
  for (const type of ["CapabilityNormalizationReport", "CapabilityMap", "OwnershipMap", "CapabilityContract"]) {
    assert.ok(policy.default.manifest.consumes.includes(type), `manifest must declare ${type}`);
  }
});

test("D: policy overlap prefers stable normalized executable capabilities over CapabilityMap", async () => {
  const result = await evaluatePolicyOverlapArtifacts({
    normalizationCandidates: [
      normalizedCandidate("getUser", "get", "user", "alpha/get.ts"),
      normalizedCandidate("retrieveUser", "get", "user", "beta/get.ts"),
    ],
    mapEntries: [{
      capability: "noisy map capability",
      subjects: ["legacy/one.ts", "legacy/two.ts"],
      systems: ["legacy-one", "legacy-two"],
      confidence: 0.9,
      evidence: [],
    }],
    ownershipEntries: [
      { path: "alpha", ownerSystem: "alpha", basis: "declared", confidence: 0.9, evidence: [] },
      { path: "beta", ownerSystem: "beta", basis: "declared", confidence: 0.9, evidence: [] },
      { path: "legacy/one.ts", ownerSystem: "legacy-one", basis: "declared", confidence: 0.9, evidence: [] },
      { path: "legacy/two.ts", ownerSystem: "legacy-two", basis: "declared", confidence: 0.9, evidence: [] },
    ],
  });

  const overlap = result.assessments.filter((assessment) => assessment.ruleId === "capability.overlap");
  assert.equal(overlap.length, 1);
  assert.deepEqual(overlap[0].files, ["alpha/get.ts", "beta/get.ts"]);
  assert.ok(result.header.inputRefs.some((entry) => entry.type === "CapabilityNormalizationReport"));
  assert.equal(result.header.inputRefs.some((entry) => entry.type === "CapabilityMap"), false);
});

test("D: an available normalization report with no stable overlap does not fall back to CapabilityMap", async () => {
  const result = await evaluatePolicyOverlapArtifacts({
    normalizationCandidates: [
      normalizedCandidate("getUser", "get", "user", "alpha/get.ts", { confidence: "medium" }),
    ],
    mapEntries: [{
      capability: "noisy map capability",
      subjects: ["legacy/one.ts", "legacy/two.ts"],
      systems: ["legacy-one", "legacy-two"],
      confidence: 0.9,
      evidence: [],
    }],
    ownershipEntries: [
      { path: "legacy/one.ts", ownerSystem: "legacy-one", confidence: 0.9, evidence: [] },
      { path: "legacy/two.ts", ownerSystem: "legacy-two", confidence: 0.9, evidence: [] },
    ],
  });

  assert.equal(result.assessments.some((assessment) => assessment.ruleId === "capability.overlap"), false);
  assert.ok(result.header.inputRefs.some((entry) => entry.type === "CapabilityNormalizationReport"));
  assert.equal(result.header.inputRefs.some((entry) => entry.type === "CapabilityMap"), false);
});

async function evaluatePolicyOverlapArtifacts({ normalizationCandidates, mapEntries, ownershipEntries }) {
  const artifactRef = (type, id) => ({ type, id, schemaVersion: "0.1.0" });
  const evidenceRef = artifactRef("EvidenceGraph", "evidence-normalized");
  const normalizationRef = artifactRef("CapabilityNormalizationReport", "normalization-1");
  const capabilityRef = artifactRef("CapabilityMap", "capability-map-noisy");
  const ownershipRef = artifactRef("OwnershipMap", "ownership-normalized");
  const artifactHeader = (artifactType, artifactId) => ({
    artifactType,
    artifactId,
    schemaVersion: "0.1.0",
    generatedAt: "2026-07-13T00:00:00.000Z",
    subject: { repoId: "fixture" },
    producer: { id: "@rekon/test", version: "1.0.0" },
    inputRefs: artifactType === "EvidenceGraph" ? [] : [evidenceRef],
  });
  const bodies = new Map([
    [evidenceRef.id, { header: artifactHeader("EvidenceGraph", evidenceRef.id), facts: [] }],
    [normalizationRef.id, {
      header: artifactHeader("CapabilityNormalizationReport", normalizationRef.id),
      candidates: normalizationCandidates,
    }],
    [capabilityRef.id, {
      header: artifactHeader("CapabilityMap", capabilityRef.id),
      entries: mapEntries,
    }],
    [ownershipRef.id, {
      header: artifactHeader("OwnershipMap", ownershipRef.id),
      entries: ownershipEntries,
    }],
  ]);
  const refs = [evidenceRef, normalizationRef, capabilityRef, ownershipRef];
  const written = [];

  await policy.policyEvaluator.evaluate({
    artifacts: {
      list: async (type) => refs.filter((entry) => entry.type === type),
      read: async (ref) => bodies.get(ref.id),
      write: async (_type, report) => {
        written.push(report);
        return artifactRef(report.header.artifactType, report.header.artifactId);
      },
    },
    input: {},
  });

  return written.find((report) => report.header.artifactType === "AssessmentReport");
}

function normalizedCandidate(name, verb, noun, path, overrides = {}) {
  return {
    source: { kind: "symbol", path },
    raw: { name, splitConfidence: "high" },
    normalized: { verb, noun },
    confidence: "high",
    status: "normalized",
    ...overrides,
  };
}

// ---- E: naming contract ---------------------------------------------------

const ratifiedGrammar = ontology.compileEffectiveGrammar({
  ratifiedArchetypeIds: ontology.BUILTIN_GRAMMAR_ARCHETYPE_PACKS.map((p) => p.id),
});
const unratifiedGrammar = ontology.compileEffectiveGrammar({});
const file = (path) => ({ kind: "file", subject: path, value: {} });
const symbol = (path, name) => ({ kind: "symbol", subject: path, value: { name, exported: true, symbolKind: "class" } });

test("E: jurisdiction is structural - zero declared roles on unratified repos means silence", () => {
  const findings = policy.evaluateNamingContract({
    facts: [file("src/AdminNav.tsx")],
    grammar: unratifiedGrammar,
  });

  assert.deepEqual(findings, []);
});

test("E: exported role mismatch fires; declared file shapes and vocabulary nouns stay silent", () => {
  const stats = { vocabularyExemptions: 0 };
  const findings = policy.evaluateNamingContract({
    facts: [
      file("app/_components/AdminNav.tsx"), // Component file type declares .tsx -> satisfies
      file("src/UserService.ts"), // "Service" is a declared role -> satisfies
      file("services/User.ts"),
      symbol("services/User.ts", "UserService"), // exported role evidence + mismatched module -> fires
      file("domain/Ontology.ts"),
      { kind: "symbol", subject: "domain/Ontology.ts", value: { name: "clearOntologyCache", exported: true, symbolKind: "function" } },
      file("domain/ConductorRuntime.ts"),
      symbol("domain/ConductorRuntime.ts", "Logger"),
      symbol("domain/ConductorRuntime.ts", "ConductorRuntime"),
      file("infra/Client.ts"),
      symbol("infra/Client.ts", "HttpClientProvider"),
      file("src/User.ts"), // entity-only, "user" is a canonical noun -> exempt
      file("src/helpers.ts"), // camelCase: not an {Entity}{Role} declaration
      file("tests/FooBar.test.ts"), // non-production
    ],
    grammar: ratifiedGrammar,
    vocabularyNouns: new Set(["user"]),
    stats,
  });

  assert.deepEqual(findings.map((f) => f.files[0]), ["services/User.ts"]);
  assert.equal(findings[0].ruleId, "naming.contract");
  assert.equal(findings[0].payload.law.tier, "archetype");
  assert.deepEqual(findings[0].payload.declaredRoles, ["Service"]);
  assert.equal(stats.vocabularyExemptions, 1);
});

test("E: secondary role helpers do not redefine a module's primary declaration", () => {
  const findings = policy.evaluateNamingContract({
    facts: [
      file("infra/FooRuntime.ts"),
      symbol("infra/FooRuntime.ts", "FooRuntime"),
      symbol("infra/FooRuntime.ts", "FooRuntimeLogger"),
      file("infra/WidgetRepositoryTurso.ts"),
      symbol("infra/WidgetRepositoryTurso.ts", "WidgetRepositoryTurso"),
      symbol("infra/WidgetRepositoryTurso.ts", "WidgetRepositoryTursoConfig"),
      file("domain/MatchAttribution.ts"),
      { kind: "symbol", subject: "domain/MatchAttribution.ts", value: { name: "MatchAttributionEvidence", exported: true, symbolKind: "interface" } },
      { kind: "symbol", subject: "domain/MatchAttribution.ts", value: { name: "MatchAttributionContext", exported: true, symbolKind: "interface" } },
      file("domain/Billing.ts"),
      symbol("domain/Billing.ts", "BillingService"),
      { kind: "symbol", subject: "domain/Billing.ts", value: { name: "BillingContext", exported: true, symbolKind: "interface" } },
      file("infra/HalfDuplex.ts"),
      symbol("infra/HalfDuplex.ts", "HalfDuplexService"),
    ],
    grammar: ratifiedGrammar,
  });

  assert.deepEqual(findings.map((finding) => finding.files[0]), ["domain/Billing.ts", "infra/HalfDuplex.ts"]);
  assert.deepEqual(findings.map((finding) => finding.payload.declaredRoles), [["Service"], ["Service"]]);
});

// ---- F: anti-pattern pack ---------------------------------------------------

test("F: declared signals fire with correction pairs; grammar exceptions honored; non-prod silent", () => {
  const facts = [
    { kind: "content_signal", subject: "src/app.ts", value: { signal: "consoleLogging" } },
    { kind: "content_signal", subject: "handlers/render.ts", value: { signal: "consoleLogging" } },
    { kind: "entry_point", subject: "cli:commands/cli.ts", value: { path: "commands/cli.ts", entryKind: "cli" } },
    { kind: "content_signal", subject: "commands/cli.ts", value: { signal: "consoleLogging" } },
    { kind: "import_specifier", subject: "commands/cli.ts:handlers/render.ts:render", value: { source: "commands/cli.ts", resolvedTarget: "handlers/render.ts", name: "render" } },
    { kind: "content_signal", subject: "infra/logging/AppLogger.ts", value: { signal: "consoleLogging" } },
    { kind: "content_signal", subject: "tools/cli.ts", value: { signal: "consoleLogging" } }, // declared exception
    { kind: "content_signal", subject: "tests/x.test.ts", value: { signal: "consoleLogging" } }, // non-prod
    { kind: "content_signal", subject: "history/20260423.snapshot.mjs", value: { signal: "consoleLogging" } }, // archived source
  ];
  const findings = policy.evaluateAntiPatterns({ facts, grammar: unratifiedGrammar });

  assert.equal(findings.length, 1);
  assert.equal(findings[0].files[0], "src/app.ts");
  assert.equal(findings[0].payload.antiPatternId, "consoleLogging");
  assert.equal(findings[0].payload.law.tier, "base");
  // Classic's correction pair rides in the payload.
  assert.ok(findings[0].payload.correction.dont.length > 0);
  assert.ok(findings[0].payload.correction.do.length > 0);
});

test("F: archetype-bound anti-patterns are ratification-gated and layer-scoped", () => {
  const facts = [
    { kind: "file", subject: "services/userService.ts", value: {} },
    { kind: "file", subject: "app/api/x/route.ts", value: {} },
    { kind: "content_signal", subject: "services/userService.ts", value: { signal: "directDatabaseInService" } },
    { kind: "content_signal", subject: "app/api/x/route.ts", value: { signal: "directDatabaseInService" } },
  ];

  // Unratified: the archetype row is not findings-eligible -> silence.
  assert.deepEqual(policy.evaluateAntiPatterns({ facts, grammar: unratifiedGrammar }), []);

  // Ratified: fires on the service-layer file only (classic's evaluator scope).
  const fired = policy.evaluateAntiPatterns({ facts, grammar: ratifiedGrammar });

  assert.equal(fired.length, 1);
  assert.equal(fired[0].files[0], "services/userService.ts");
  assert.equal(fired[0].payload.law.tier, "archetype");
});

test("F: the provider signal table is drift-guarded against the ported pack rows", () => {
  const detectable = new Map(
    [...ratifiedGrammar.antiPatterns.values()]
      .filter((a) => a.details?.detectable === true && Array.isArray(a.details?.detectionRules))
      .map((a) => [a.id, a]),
  );

  // Every signal the provider emits maps to a detectable pack row.
  const sample = [
    ["consoleLogging", "console.log(x);"],
    ["businessLogicInService", "if (entity.phase === 'open') {}"],
    ["directDatabaseInService", "await supabase.from('users');"],
    ["conditionalHooks", "flag && useEffect(() => {});"],
  ];

  for (const [signal, content] of sample) {
    const facts = jsts.extractContentSignalFacts("src/x.ts", content);

    assert.ok(facts.some((f) => f.value.signal === signal), `${signal} extracts`);
    assert.ok(detectable.has(signal), `${signal} is a detectable pack row`);
  }

  // Prose-rule rows (the LLM remainder) have no provider signals.
  assert.deepEqual(jsts.extractContentSignalFacts("src/x.ts", "const calm = 1;"), []);
});
