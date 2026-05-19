// Graph-aware import evidence publication diagnostics —
// contract tests.
//
// Verifies per-FilteredFinding `evidenceSource` attribution,
// `FindingFilterHealthSummary` byEvidenceSource maps, three
// new fallback-dominance health alerts, and architecture
// summary + agent contract surfacing of evidence-source
// breakdowns.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";
import {
  applyFindingFilters,
  buildFindingFilterHealth,
  createFindingReport,
  createFindingFilterReport,
} from "../../packages/kernel-findings/dist/index.js";
import {
  createObservedRepo,
} from "../../packages/kernel-repo-model/dist/index.js";
import { createEvidenceGraph, createEvidenceFact } from "../../packages/kernel-evidence/dist/index.js";
import { createLocalArtifactStore } from "../../packages/runtime/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- Helpers ----------

function legacyImportFact(file, target) {
  return {
    kind: "import",
    subject: `${file}:${target}`,
    value: { source: file, target, line: 1 },
  };
}

function graphContext(...facts) {
  return { evidenceGraph: { facts } };
}

function architecture(id, ruleId, overrides = {}) {
  return {
    id,
    type: "architecture",
    severity: overrides.severity ?? "medium",
    title: overrides.title ?? `Architecture ${id}`,
    description: overrides.description ?? `Architecture finding ${id}`,
    subjects: overrides.subjects ?? overrides.files ?? [],
    files: overrides.files,
    ruleId,
    details: overrides.details,
  };
}

function header(artifactType) {
  return {
    artifactType,
    artifactId: `synthetic-${artifactType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    schemaVersion: "0.1.0",
    generatedAt: new Date().toISOString(),
    subject: { repoId: "synthetic" },
    producer: { id: "test-harness", version: "0.1.0" },
    inputRefs: [],
    freshness: { status: "fresh" },
  };
}

// Build a synthetic FindingFilterReport from FilteredFinding
// rows so we can test `buildFindingFilterHealth` directly.
function syntheticFilterReport(filteredFindings, options = {}) {
  return createFindingFilterReport({
    header: { ...header("FindingFilterReport"), artifactId: `synth-${Date.now()}-${Math.random()}` },
    keptFindings: [],
    filteredFindings,
    policyUsage: options.policyUsage,
    policyFingerprint: options.policyFingerprint,
  });
}

function syntheticFilteredFinding({ id, reason, evidenceSource, source = "system", policyId, confidence = "high" }) {
  return {
    findingId: id,
    finding: architecture(id, "architecture.foo.bar", { files: [`src/${id}.ts`], details: {} }),
    reason,
    evidence: "test evidence",
    confidence,
    filteredAt: new Date().toISOString(),
    source,
    policyId,
    evidenceSource,
  };
}

// ---------- Test 1: EvidenceGraph attribution ----------

test("EvidenceGraph graph-aware decision records evidenceSource EvidenceGraph", () => {
  const file = "src/api/widgets/route.ts";
  const finding = architecture("eg-1", "routes.construct_and_inject_deps", {
    files: [file],
    details: {},
  });
  const result = applyFindingFilters({
    findings: [finding],
    graphContext: graphContext(legacyImportFact(file, "./handler")),
  });
  assert.equal(result.filteredFindings.length, 1);
  assert.equal(result.filteredFindings[0].evidenceSource, "EvidenceGraph");
});

// ---------- Test 2: DetectorDetails attribution ----------

test("details.imports fallback records evidenceSource DetectorDetails", () => {
  const file = "src/api/widgets/route.ts";
  const finding = architecture("dd-2", "routes.construct_and_inject_deps", {
    files: [file],
    details: { imports: ["./handler"] },
  });
  // No EvidenceGraph; graph-aware filter falls back to
  // details.imports inside its DetectorDetails branch.
  const result = applyFindingFilters({ findings: [finding] });
  assert.equal(result.filteredFindings.length, 1);
  assert.equal(result.filteredFindings[0].evidenceSource, "DetectorDetails");
});

// ---------- Test 3: ObservedRepo attribution ----------

test("ObservedRepo sibling-file decision records evidenceSource ObservedRepo", () => {
  const file = "src/api/widgets/route.ts";
  const finding = architecture("or-3", "routes.construct_and_inject_deps", {
    files: [file],
    details: {},
  });
  const result = applyFindingFilters({
    findings: [finding],
    graphContext: {
      observedRepo: { files: [file, "src/api/widgets/handler.ts"] },
    },
  });
  assert.equal(result.filteredFindings.length, 1);
  assert.equal(result.filteredFindings[0].evidenceSource, "ObservedRepo");
});

// ---------- Test 4: Policy attribution ----------

test("policy filter records evidenceSource Policy", () => {
  const finding = architecture("po-4", "architecture.foo.bar", {
    files: ["src/api/widgets/route.ts"],
    details: {},
  });
  const result = applyFindingFilters({
    findings: [finding],
    policies: [
      {
        id: "test-policy",
        reason: "policy-exception",
        evidence: "test policy",
        confidence: "high",
        pathPattern: "src/**",
      },
    ],
  });
  assert.equal(result.filteredFindings.length, 1);
  assert.equal(result.filteredFindings[0].source, "policy");
  assert.equal(result.filteredFindings[0].evidenceSource, "Policy");
});

// ---------- Test 5: ResultFilter attribution ----------

test("result filter records evidenceSource ResultFilter", () => {
  const finding = architecture("rf-5", "architecture.foo.bar", {
    files: ["src/api/widgets/util.ts"],
    severity: "low",
    details: {},
  });
  const result = applyFindingFilters({
    findings: [finding],
    resultFilters: { severity: "high" },
  });
  assert.equal(result.filteredFindings.length, 1);
  assert.equal(result.filteredFindings[0].evidenceSource, "ResultFilter");
});

// ---------- Test 6: BuiltIn attribution (path filter) ----------

test("built-in path filter records evidenceSource BuiltIn", () => {
  const finding = architecture("bi-6", "architecture.foo.bar", {
    files: ["src/feature.test.ts"],
    details: {},
  });
  const result = applyFindingFilters({ findings: [finding] });
  assert.equal(result.filteredFindings.length, 1);
  assert.equal(result.filteredFindings[0].reason, "test-file");
  assert.equal(result.filteredFindings[0].evidenceSource, "BuiltIn");
});

// ---------- Test 7: filter-health summary includes byEvidenceSource ----------

test("filter-health summary includes byEvidenceSource (per source totals across the run)", () => {
  const report = syntheticFilterReport([
    syntheticFilteredFinding({ id: "a", reason: "route-handler-with-service", evidenceSource: "EvidenceGraph" }),
    syntheticFilteredFinding({ id: "b", reason: "route-handler-with-service", evidenceSource: "ObservedRepo" }),
    syntheticFilteredFinding({ id: "c", reason: "external-api-comment-only", evidenceSource: "DetectorDetails" }),
    syntheticFilteredFinding({ id: "d", reason: "test-file", evidenceSource: "BuiltIn" }),
  ], { policyUsage: undefined });
  const { summary } = buildFindingFilterHealth({ filterReport: report });
  assert.deepEqual(summary.byEvidenceSource, {
    EvidenceGraph: 1,
    ObservedRepo: 1,
    DetectorDetails: 1,
    BuiltIn: 1,
  });
});

// ---------- Test 8: filter-health summary includes graphAwareByEvidenceSource ----------

test("filter-health summary includes graphAwareByEvidenceSource (graph-aware bucket only)", () => {
  const report = syntheticFilterReport([
    syntheticFilteredFinding({ id: "a", reason: "route-handler-with-service", evidenceSource: "EvidenceGraph" }),
    syntheticFilteredFinding({ id: "b", reason: "route-handler-with-service", evidenceSource: "EvidenceGraph" }),
    syntheticFilteredFinding({ id: "c", reason: "external-api-comment-only", evidenceSource: "DetectorDetails" }),
    // BuiltIn entries (path filters) must NOT be in graphAwareByEvidenceSource.
    syntheticFilteredFinding({ id: "d", reason: "test-file", evidenceSource: "BuiltIn" }),
  ]);
  const { summary } = buildFindingFilterHealth({ filterReport: report });
  assert.deepEqual(summary.graphAwareByEvidenceSource, {
    EvidenceGraph: 2,
    DetectorDetails: 1,
  });
});

// ---------- Test 9: graphAwareReasonEvidenceSources per-reason map ----------

test("filter-health summary includes graphAwareReasonEvidenceSources (per reason × per source)", () => {
  const report = syntheticFilterReport([
    syntheticFilteredFinding({ id: "a", reason: "route-handler-with-service", evidenceSource: "EvidenceGraph" }),
    syntheticFilteredFinding({ id: "b", reason: "route-handler-with-service", evidenceSource: "ObservedRepo" }),
    syntheticFilteredFinding({ id: "c", reason: "external-api-comment-only", evidenceSource: "EvidenceGraph" }),
    syntheticFilteredFinding({ id: "d", reason: "external-api-comment-only", evidenceSource: "DetectorDetails" }),
  ]);
  const { summary } = buildFindingFilterHealth({ filterReport: report });
  assert.deepEqual(summary.graphAwareReasonEvidenceSources, {
    "route-handler-with-service": { EvidenceGraph: 1, ObservedRepo: 1 },
    "external-api-comment-only": { EvidenceGraph: 1, DetectorDetails: 1 },
  });
});

// ---------- Test 10: dominantGraphAwareEvidenceSource ----------

test("dominantGraphAwareEvidenceSource is deterministic + alphabetic tiebreak", () => {
  // EvidenceGraph: 3, DetectorDetails: 1, ObservedRepo: 1
  const reportA = syntheticFilterReport([
    syntheticFilteredFinding({ id: "a", reason: "route-handler-with-service", evidenceSource: "EvidenceGraph" }),
    syntheticFilteredFinding({ id: "b", reason: "route-handler-with-service", evidenceSource: "EvidenceGraph" }),
    syntheticFilteredFinding({ id: "c", reason: "external-api-comment-only", evidenceSource: "EvidenceGraph" }),
    syntheticFilteredFinding({ id: "d", reason: "external-api-comment-only", evidenceSource: "DetectorDetails" }),
    syntheticFilteredFinding({ id: "e", reason: "route-handler-with-service", evidenceSource: "ObservedRepo" }),
  ]);
  const a = buildFindingFilterHealth({ filterReport: reportA });
  assert.deepEqual(a.summary.dominantGraphAwareEvidenceSource, {
    source: "EvidenceGraph",
    count: 3,
    rate: 0.6,
  });

  // Tie: 2 EvidenceGraph + 2 ObservedRepo + 1 DetectorDetails.
  // Alphabetic tiebreak → DetectorDetails? No — sort by count
  // desc first, then alpha; the two tied counts (2, 2) break
  // alphabetically: DetectorDetails < EvidenceGraph <
  // ObservedRepo. But there are TWO ties at 2, so the
  // dominant is the alphabetically-first count-2 entry?
  // Actually: counts are 2 / 2 / 1 → tied top-two are
  // EvidenceGraph(2) and ObservedRepo(2). Alphabetic
  // tiebreak picks EvidenceGraph (< ObservedRepo).
  const reportB = syntheticFilterReport([
    syntheticFilteredFinding({ id: "x1", reason: "route-handler-with-service", evidenceSource: "EvidenceGraph" }),
    syntheticFilteredFinding({ id: "x2", reason: "route-handler-with-service", evidenceSource: "EvidenceGraph" }),
    syntheticFilteredFinding({ id: "y1", reason: "route-handler-with-service", evidenceSource: "ObservedRepo" }),
    syntheticFilteredFinding({ id: "y2", reason: "route-handler-with-service", evidenceSource: "ObservedRepo" }),
    syntheticFilteredFinding({ id: "z1", reason: "external-api-comment-only", evidenceSource: "DetectorDetails" }),
  ]);
  const b = buildFindingFilterHealth({ filterReport: reportB });
  assert.equal(b.summary.dominantGraphAwareEvidenceSource.source, "EvidenceGraph");
  assert.equal(b.summary.dominantGraphAwareEvidenceSource.count, 2);
});

// ---------- Test 11: graph-aware-details-fallback-dominance alert ----------

test("graph-aware-details-fallback-dominance alert fires when DetectorDetails >= 50% of graph-aware", () => {
  // 4 DetectorDetails, 1 EvidenceGraph → 80% DetectorDetails.
  // Triggers details-fallback-dominance AND
  // evidencegraph-low-usage (1/5 = 20% < 25%).
  const filtered = [
    syntheticFilteredFinding({ id: "d1", reason: "route-handler-with-service", evidenceSource: "DetectorDetails" }),
    syntheticFilteredFinding({ id: "d2", reason: "route-handler-with-service", evidenceSource: "DetectorDetails" }),
    syntheticFilteredFinding({ id: "d3", reason: "external-api-comment-only", evidenceSource: "DetectorDetails" }),
    syntheticFilteredFinding({ id: "d4", reason: "external-api-comment-only", evidenceSource: "DetectorDetails" }),
    syntheticFilteredFinding({ id: "g1", reason: "route-handler-with-service", evidenceSource: "EvidenceGraph" }),
  ];
  const report = syntheticFilterReport(filtered);
  const { alerts } = buildFindingFilterHealth({ filterReport: report });
  const codes = alerts.map((alert) => alert.code);
  assert.ok(
    codes.includes("graph-aware-details-fallback-dominance"),
    `expected graph-aware-details-fallback-dominance; got ${codes.join(", ")}`,
  );
});

// ---------- Test 12: graph-aware-observedrepo-fallback-dominance alert ----------

test("graph-aware-observedrepo-fallback-dominance alert fires when ObservedRepo >= 50%", () => {
  const filtered = [
    syntheticFilteredFinding({ id: "o1", reason: "route-handler-with-service", evidenceSource: "ObservedRepo" }),
    syntheticFilteredFinding({ id: "o2", reason: "route-handler-with-service", evidenceSource: "ObservedRepo" }),
    syntheticFilteredFinding({ id: "o3", reason: "route-handler-with-service", evidenceSource: "ObservedRepo" }),
    syntheticFilteredFinding({ id: "g1", reason: "route-handler-with-service", evidenceSource: "EvidenceGraph" }),
    syntheticFilteredFinding({ id: "d1", reason: "external-api-comment-only", evidenceSource: "DetectorDetails" }),
  ];
  const report = syntheticFilterReport(filtered);
  const { alerts } = buildFindingFilterHealth({ filterReport: report });
  const codes = alerts.map((alert) => alert.code);
  assert.ok(
    codes.includes("graph-aware-observedrepo-fallback-dominance"),
    `expected graph-aware-observedrepo-fallback-dominance; got ${codes.join(", ")}`,
  );
});

// ---------- Test 13: graph-aware-evidencegraph-low-usage alert ----------

test("graph-aware-evidencegraph-low-usage alert fires when EvidenceGraph < 25% of graph-aware", () => {
  // 4 DetectorDetails, 1 EvidenceGraph → 20% EvidenceGraph
  // < 25% threshold.
  const filtered = [
    syntheticFilteredFinding({ id: "d1", reason: "route-handler-with-service", evidenceSource: "DetectorDetails" }),
    syntheticFilteredFinding({ id: "d2", reason: "route-handler-with-service", evidenceSource: "DetectorDetails" }),
    syntheticFilteredFinding({ id: "d3", reason: "external-api-comment-only", evidenceSource: "DetectorDetails" }),
    syntheticFilteredFinding({ id: "d4", reason: "external-api-comment-only", evidenceSource: "DetectorDetails" }),
    syntheticFilteredFinding({ id: "g1", reason: "route-handler-with-service", evidenceSource: "EvidenceGraph" }),
  ];
  const report = syntheticFilterReport(filtered);
  const { alerts } = buildFindingFilterHealth({ filterReport: report });
  const codes = alerts.map((alert) => alert.code);
  assert.ok(
    codes.includes("graph-aware-evidencegraph-low-usage"),
    `expected graph-aware-evidencegraph-low-usage; got ${codes.join(", ")}`,
  );
});

// ---------- Test 14: architecture summary renders Graph-Aware Evidence Sources ----------

test("architecture summary renders Graph-Aware Evidence Sources table when graph-aware filtering exists", async () => {
  await withSeededEvidenceSourceFixture(async ({ root }) => {
    runCli(["findings", "filter", "--root", root, "--json"]);
    runCli(["findings", "filter-health", "--root", root, "--json"]);
    runCli(["publish", "architecture", "--root", root, "--json"]);
    const pub = await readLatestArchitectureSummary(root);
    assert.ok(pub?.content, "architecture-summary publication must exist");
    assert.match(pub.content, /### Graph-Aware Evidence Sources/);
    assert.match(pub.content, /\| EvidenceGraph \|/);
  });
});

// ---------- Test 15: architecture summary per-reason evidence-source breakdown ----------

test("architecture summary renders per-reason evidence-source table when graph-aware filtering exists", async () => {
  await withSeededEvidenceSourceFixture(async ({ root }) => {
    runCli(["findings", "filter", "--root", root, "--json"]);
    runCli(["findings", "filter-health", "--root", root, "--json"]);
    runCli(["publish", "architecture", "--root", root, "--json"]);
    const pub = await readLatestArchitectureSummary(root);
    assert.ok(pub?.content);
    assert.match(
      pub.content,
      /\| Reason \| EvidenceGraph \| Detector Details \| ObservedRepo \| Other \|/,
    );
    // The seeded finding fires via the EvidenceGraph branch
    // of external-api-comment-only.
    assert.match(pub.content, /\| external-api-comment-only \|/);
  });
});

// ---------- Test 16: agent contract renders evidence-source summary ----------

test("agent contract renders graph-aware evidence-source summary when graph-aware filtering exists", async () => {
  await withSeededEvidenceSourceFixture(async ({ root }) => {
    runCli(["findings", "filter", "--root", root, "--json"]);
    runCli(["findings", "filter-health", "--root", root, "--json"]);
    runCli(["publish", "agent-contract", "--root", root, "--json"]);
    const pub = await readLatestAgentContract(root);
    assert.ok(pub?.content, "agent-contract publication must exist");
    assert.match(pub.content, /Graph-aware evidence sources:/);
    assert.match(pub.content, /- EvidenceGraph: \d+/);
  });
});

// ---------- Test 17: agent contract Do Not Do includes detector-detail fallback warning ----------

test("agent contract Do Not Do includes detector-detail fallback warning", async () => {
  await withSeededEvidenceSourceFixture(async ({ root }) => {
    runCli(["findings", "filter", "--root", root, "--json"]);
    runCli(["findings", "filter-health", "--root", root, "--json"]);
    runCli(["publish", "agent-contract", "--root", root, "--json"]);
    const pub = await readLatestAgentContract(root);
    assert.ok(pub?.content, "agent-contract publication must exist");
    assert.match(
      pub.content,
      /Do not treat detector-detail fallback filtering as equivalent to EvidenceGraph-backed structural evidence/i,
    );
  });
});

// ---------- Test 18: raw FindingReport unchanged ----------

test("raw FindingReport remains unchanged after evidence-source diagnostics run", async () => {
  await withSeededEvidenceSourceFixture(async ({ root }) => {
    const findingsDir = join(root, ".rekon", "artifacts", "findings");
    const files = (await readdir(findingsDir))
      .filter((name) => name.startsWith("FindingReport-"))
      .sort();
    const target = join(findingsDir, files[files.length - 1]);
    const before = await readFile(target, "utf8");
    runCli(["findings", "filter", "--root", root, "--json"]);
    const after = await readFile(target, "utf8");
    assert.equal(after, before, "FindingReport must remain byte-identical");
  });
});

// ---------- Test 19: artifacts validate remains clean ----------

test("rekon artifacts validate stays clean after evidence-source diagnostics run", async () => {
  await withSeededEvidenceSourceFixture(async ({ root }) => {
    runCli(["findings", "filter", "--root", root, "--json"]);
    runCli(["findings", "filter-health", "--root", root, "--json"]);
    const validate = JSON.parse(
      runCli(["artifacts", "validate", "--root", root, "--json"]).stdout,
    );
    assert.equal(validate.valid, true);
    assert.deepEqual(validate.issues ?? [], []);
  });
});

// ---------- helpers ----------

async function withFreshWorkspace(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-evidence-source-diag-"));
  try {
    await cp(exampleRoot, root, {
      recursive: true,
      filter(source) {
        return !relative(exampleRoot, source).split(/[\\/]/).includes(".rekon");
      },
    });
    runCli(["init", "--root", root, "--json"]);
    await callback({ root });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function withSeededEvidenceSourceFixture(callback) {
  await withFreshWorkspace(async ({ root }) => {
    runCli(["refresh", "--root", root, "--json"]);
    const store = createLocalArtifactStore(root);
    await store.init();

    const file = "src/api/widgets/util.ts";

    const observed = createObservedRepo({
      header: header("ObservedRepo"),
      repository: { id: "evidence-source-diag", root: "." },
      systems: [
        {
          id: "synthetic",
          paths: [file],
          layers: [],
          capabilities: [],
          confidence: 0.9,
          evidence: [],
        },
      ],
      layers: [],
      capabilities: [],
      files: [file],
    });
    await store.write(observed, { category: "graphs" });

    // Seed an EvidenceGraph carrying a legacy-shape import
    // fact proving the file imports `leftpad` (no external
    // API SDK). The external-api-comment-only graph-aware
    // filter will fire via the EvidenceGraph branch.
    const graph = createEvidenceGraph({
      header: header("EvidenceGraph"),
      facts: [
        createEvidenceFact({
          id: "import-leftpad",
          kind: "import",
          subject: `${file}:leftpad`,
          value: { source: file, target: "leftpad" },
          confidence: 0.9,
          provenance: {
            source: "test-fixture",
            pack: "graph-aware-import-evidence-diagnostics",
            file,
            extractorVersion: "0.1.0",
          },
        }),
      ],
    });
    await store.write(graph, { category: "graphs" });

    const findingReport = createFindingReport({
      header: { ...header("FindingReport"), artifactId: `evidence-source-diag-${Date.now()}` },
      findings: [
        {
          id: "diag-graph-finding",
          type: "architecture",
          severity: "medium",
          title: "External API call",
          description: "external_apis.calls_go_through_providers rule fired.",
          subjects: [file],
          files: [file],
          ruleId: "external_apis.calls_go_through_providers",
          details: {},
        },
      ],
    });
    await store.write(findingReport, { category: "findings" });

    await callback({ root });
  });
}

async function readLatestArtifactJson(root, artifactType) {
  const artifactsDir = join(root, ".rekon", "artifacts");
  const matches = [];
  await walkDir(artifactsDir, matches, artifactType);
  if (matches.length === 0) return undefined;
  matches.sort();
  return JSON.parse(await readFile(matches[matches.length - 1], "utf8"));
}

async function readLatestArchitectureSummary(root) {
  return readLatestPublicationByPrefix(root, "Publication-architecture-summary-");
}

async function readLatestAgentContract(root) {
  return readLatestPublicationByPrefix(root, "Publication-agent-contract-");
}

async function readLatestPublicationByPrefix(root, prefix) {
  const artifactsDir = join(root, ".rekon", "artifacts");
  const matches = [];
  await walkPublicationDir(artifactsDir, matches, prefix);
  if (matches.length === 0) return undefined;
  matches.sort();
  return JSON.parse(await readFile(matches[matches.length - 1], "utf8"));
}

async function walkPublicationDir(dir, matches, prefix) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkPublicationDir(path, matches, prefix);
    } else if (entry.isFile() && entry.name.startsWith(prefix) && entry.name.endsWith(".json")) {
      matches.push(path);
    }
  }
}

async function walkDir(dir, matches, artifactType) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkDir(path, matches, artifactType);
    } else if (
      entry.isFile()
      && entry.name.startsWith(`${artifactType}-`)
      && entry.name.endsWith(".json")
    ) {
      matches.push(path);
    }
  }
}

function runCli(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}
