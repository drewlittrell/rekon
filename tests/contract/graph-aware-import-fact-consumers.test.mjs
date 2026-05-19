// Graph-aware import-fact consumers v4 — contract tests.
//
// Now that the import-helper compatibility implementation
// (cce837f) makes `listImportTargetsForFile` work against
// production legacy `subject = "<file>:<target>"` data, the
// three import-consuming graph-aware filters
// (`route-handler-with-service`,
// `route-http-middleware-only`,
// `external-api-comment-only`) deliberately prefer
// EvidenceGraph import facts over `Finding.details.imports`.
// Evidence strings now name the source explicitly so audit
// consumers can tell at a glance which branch fired.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";
import {
  applyFindingFilters,
  applyFindingGraphFilters,
  createFindingReport,
} from "../../packages/kernel-findings/dist/index.js";
import {
  createObservedRepo,
} from "../../packages/kernel-repo-model/dist/index.js";
import { createEvidenceGraph, createEvidenceFact } from "../../packages/kernel-evidence/dist/index.js";
import { createLocalArtifactStore } from "../../packages/runtime/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- Production-shaped legacy import fact ----------

function legacyImportFact(file, target) {
  // Mirrors what `@rekon/capability-js-ts.extractImportFacts`
  // emits: subject = "<file>:<target>", value carries source
  // + target + line.
  return {
    kind: "import",
    subject: `${file}:${target}`,
    value: { source: file, target, line: 1 },
  };
}

function graphContext(...facts) {
  return { evidenceGraph: { facts } };
}

// ---------- Test 1: route-handler fires from legacy EvidenceGraph imports ----------

test("route-handler-with-service fires from production-shaped legacy EvidenceGraph import facts", () => {
  const file = "src/api/widgets/route.ts";
  const finding = architecture("rh-graph-1", "routes.construct_and_inject_deps", {
    files: [file],
    details: {},
  });
  const decision = applyFindingGraphFilters({
    finding,
    graphContext: graphContext(legacyImportFact(file, "./handler")),
  });
  assert.ok(decision, "filter must fire via EvidenceGraph branch");
  assert.equal(decision.reason, "route-handler-with-service");
  assert.equal(decision.confidence, "high");
  assert.deepEqual(decision.usedArtifacts, ["EvidenceGraph"]);
});

// ---------- Test 2: route-handler evidence names EvidenceGraph ----------

test("route-handler-with-service evidence names EvidenceGraph import facts", () => {
  const file = "src/api/widgets/route.ts";
  const finding = architecture("rh-graph-2", "routes.construct_and_inject_deps", {
    files: [file],
    details: {},
  });
  const decision = applyFindingGraphFilters({
    finding,
    graphContext: graphContext(legacyImportFact(file, "./handler")),
  });
  assert.ok(decision);
  assert.match(decision.evidence, /EvidenceGraph import facts/i);
  assert.match(decision.evidence, /\.\/handler/);
});

// ---------- Test 3: EvidenceGraph facts override conflicting details.imports ----------

test("route-handler-with-service EvidenceGraph facts override conflicting details.imports", () => {
  const file = "src/api/widgets/route.ts";
  // Detector claims an unrelated import; EvidenceGraph proves
  // there IS a handler import. The graph-aware decision must
  // cite EvidenceGraph (not the detector), because graph
  // evidence is authoritative.
  const finding = architecture("rh-graph-3", "routes.construct_and_inject_deps", {
    files: [file],
    details: { imports: ["leftpad", "react"] },
  });
  const decision = applyFindingGraphFilters({
    finding,
    graphContext: graphContext(legacyImportFact(file, "./handler")),
  });
  assert.ok(decision);
  assert.equal(decision.reason, "route-handler-with-service");
  assert.match(decision.evidence, /EvidenceGraph import facts/i);
  assert.deepEqual(decision.usedArtifacts, ["EvidenceGraph"]);
});

// ---------- Test 4: details.imports fallback when no EvidenceGraph imports ----------

test("route-handler-with-service falls back to details.imports when EvidenceGraph imports are absent", () => {
  const file = "src/api/widgets/route.ts";
  const finding = architecture("rh-fallback-4", "routes.construct_and_inject_deps", {
    files: [file],
    details: { imports: ["./handler"] },
  });
  // No EvidenceGraph facts for this file; the detector
  // still surfaces the handler import.
  const decision = applyFindingGraphFilters({
    finding,
    graphContext: {},
  });
  assert.ok(decision);
  assert.equal(decision.reason, "route-handler-with-service");
  assert.match(decision.evidence, /Detector import details/i);
  assert.deepEqual(decision.usedArtifacts, []);
});

// ---------- Test 5: route-http-middleware-only fires from legacy EvidenceGraph imports ----------

test("route-http-middleware-only fires from production-shaped legacy EvidenceGraph import facts", () => {
  const file = "src/api/widgets/route.ts";
  const finding = architecture("rm-graph-5", "routes.construct_and_inject_deps", {
    files: [file],
    details: {},
  });
  const decision = applyFindingGraphFilters({
    finding,
    graphContext: graphContext(
      legacyImportFact(file, "/infra/http/middleware/logger"),
      legacyImportFact(file, "/infra/Identity/auth"),
    ),
  });
  assert.ok(decision);
  assert.equal(decision.reason, "route-http-middleware-only");
  assert.equal(decision.confidence, "high");
  assert.deepEqual(decision.usedArtifacts, ["EvidenceGraph"]);
});

// ---------- Test 6: route-http-middleware-only conservative with non-allowed infra ----------

test("route-http-middleware-only does not fire when EvidenceGraph imports include a non-allowed infra import", () => {
  const file = "src/api/widgets/route.ts";
  const finding = architecture("rm-mixed-6", "routes.construct_and_inject_deps", {
    files: [file],
    details: {},
  });
  const decision = applyFindingGraphFilters({
    finding,
    graphContext: graphContext(
      legacyImportFact(file, "/infra/http/middleware/logger"),
      legacyImportFact(file, "/infra/Database/pg"),
    ),
  });
  assert.equal(decision, null);
});

// ---------- Test 7: route-http-middleware-only evidence names source ----------

test("route-http-middleware-only evidence names EvidenceGraph import facts", () => {
  const file = "src/api/widgets/route.ts";
  const finding = architecture("rm-evidence-7", "routes.construct_and_inject_deps", {
    files: [file],
    details: {},
  });
  const decision = applyFindingGraphFilters({
    finding,
    graphContext: graphContext(
      legacyImportFact(file, "/infra/http/middleware/logger"),
    ),
  });
  assert.ok(decision);
  assert.match(decision.evidence, /EvidenceGraph import facts/i);
  assert.match(decision.evidence, /\/infra\/http\/middleware\/logger/);
});

// ---------- Test 8: external-api-comment-only fires from legacy EvidenceGraph imports ----------

test("external-api-comment-only fires from production-shaped legacy EvidenceGraph import facts with no external API packages", () => {
  const file = "src/api/widgets/util.ts";
  const finding = architecture("ea-graph-8", "external_apis.calls_go_through_providers", {
    files: [file],
    details: {},
  });
  const decision = applyFindingGraphFilters({
    finding,
    graphContext: graphContext(
      legacyImportFact(file, "leftpad"),
      legacyImportFact(file, "./helper"),
    ),
  });
  assert.ok(decision);
  assert.equal(decision.reason, "external-api-comment-only");
  assert.equal(decision.confidence, "high");
  assert.match(decision.evidence, /EvidenceGraph import facts/i);
  assert.deepEqual(decision.usedArtifacts, ["EvidenceGraph"]);
});

// ---------- Test 9: external-api-comment-only conservative with openai ----------

test("external-api-comment-only does not fire when EvidenceGraph imports include openai / openrouter", () => {
  const file = "src/api/widgets/util.ts";
  const finding = architecture("ea-openai-9", "external_apis.calls_go_through_providers", {
    files: [file],
    details: {},
  });
  const decision = applyFindingGraphFilters({
    finding,
    graphContext: graphContext(legacyImportFact(file, "openai")),
  });
  assert.equal(decision, null);
});

// ---------- Test 10: external-api-comment-only falls back to explicit empty details.imports ----------

test("external-api-comment-only falls back to explicit empty details.imports when EvidenceGraph imports are absent", () => {
  const file = "src/api/widgets/util.ts";
  const finding = architecture("ea-fallback-10", "external_apis.calls_go_through_providers", {
    files: [file],
    details: { imports: [] }, // explicit empty array
  });
  const decision = applyFindingGraphFilters({
    finding,
    graphContext: {},
  });
  assert.ok(decision);
  assert.equal(decision.reason, "external-api-comment-only");
  assert.equal(decision.confidence, "medium");
  assert.match(decision.evidence, /Detector import details/i);
  assert.match(decision.evidence, /explicitly empty/i);
  assert.deepEqual(decision.usedArtifacts, []);
});

// ---------- Test 11: FindingFilterReport inputRefs cite EvidenceGraph when used ----------

test("FindingFilterReport inputRefs include EvidenceGraph when import facts are used", async () => {
  await withSeededImportFactFixture(async ({ root }) => {
    runCli(["findings", "filter", "--root", root, "--json"]);
    const report = await readLatestArtifactJson(root, "FindingFilterReport");
    assert.ok(report);
    const matched = report.filteredFindings.find(
      (entry) => entry.findingId === "graph-import-consumer-v4",
    );
    assert.ok(matched, "seeded finding must be filtered via EvidenceGraph branch");
    assert.equal(matched.reason, "external-api-comment-only");
    assert.match(matched.evidence, /EvidenceGraph import facts/i);
    const refs = report.header.inputRefs ?? [];
    assert.ok(
      refs.some((ref) => ref.type === "EvidenceGraph"),
      "inputRefs must cite EvidenceGraph when the filter consulted it",
    );
  });
});

// ---------- Test 12: EvidenceGraph NOT cited when only details.imports fallback used ----------

test("EvidenceGraph is not cited when only details.imports fallback is used", () => {
  // Synthetic: graphContext has no EvidenceGraph facts for
  // the file. The filter falls back to details.imports.
  // `result.graphArtifactsUsed` must be empty.
  const file = "src/api/widgets/util.ts";
  const finding = architecture("ea-no-graph-12", "external_apis.calls_go_through_providers", {
    files: [file],
    details: { imports: ["leftpad"] },
  });
  const result = applyFindingFilters({
    findings: [finding],
    graphContext: { evidenceGraph: { facts: [] } },
  });
  assert.equal(result.filteredFindings.length, 1);
  assert.equal(result.filteredFindings[0].reason, "external-api-comment-only");
  assert.match(result.filteredFindings[0].evidence, /Detector import details/i);
  assert.deepEqual(result.graphArtifactsUsed, []);
});

// ---------- Test 13: raw FindingReport unchanged ----------

test("raw FindingReport remains unchanged after v4 graph-aware import-fact consumers run", async () => {
  await withSeededImportFactFixture(async ({ root }) => {
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

// ---------- Test 14: lifecycle / adjudication / coherency exclude graph-filtered finding ----------

test("lifecycle / adjudication / coherency exclude graph-aware import-fact-consumer finding + artifacts validate stays clean", async () => {
  await withSeededImportFactFixture(async ({ root }) => {
    runCli(["findings", "filter", "--root", root, "--json"]);
    runCli(["findings", "lifecycle", "--root", root, "--json"]);
    runCli(["issues", "adjudicate", "--root", root, "--json"]);
    runCli(["coherency", "delta", "--root", root, "--json"]);
    const lifecycle = await readLatestArtifactJson(root, "FindingLifecycleReport");
    const activeIds = (lifecycle?.activeFindings ?? []).map(
      (entry) => entry.findingId ?? entry.id ?? entry.finding?.id,
    );
    assert.ok(
      !activeIds.includes("graph-import-consumer-v4"),
      `graph-import-consumer-v4 must not be in active lifecycle; got ${JSON.stringify(activeIds)}`,
    );
    const validate = JSON.parse(
      runCli(["artifacts", "validate", "--root", root, "--json"]).stdout,
    );
    assert.equal(validate.valid, true);
    assert.deepEqual(validate.issues ?? [], []);
  });
});

// ---------- Test 15: artifacts validate clean against example repo after the v4 changes ----------

test("rekon artifacts validate stays clean on examples/simple-js-ts after v4 changes", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-graph-import-v4-validate-"));
  try {
    await cp(exampleRoot, root, {
      recursive: true,
      filter(source) {
        return !relative(exampleRoot, source).split(/[\\/]/).includes(".rekon");
      },
    });
    runCli(["init", "--root", root, "--json"]);
    runCli(["refresh", "--root", root, "--json"]);
    const result = JSON.parse(
      runCli(["artifacts", "validate", "--root", root, "--json"]).stdout,
    );
    assert.equal(result.valid, true);
    assert.deepEqual(result.issues ?? [], []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// ---------- helpers ----------

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

async function withFreshWorkspace(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-graph-import-v4-"));
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

async function withSeededImportFactFixture(callback) {
  // Seeds a minimal ObservedRepo, a synthetic EvidenceGraph
  // carrying a legacy-shape import fact (subject =
  // "<file>:<target>") proving the file imports `leftpad`
  // and `./helper` but NO external API SDK, and a
  // FindingReport whose external-API finding the
  // graph-aware filter will suppress via the EvidenceGraph
  // branch. After this, `rekon findings filter` produces a
  // FindingFilterReport whose inputRefs cite EvidenceGraph
  // and whose filteredFindings include
  // `graph-import-consumer-v4` with evidence naming
  // EvidenceGraph.
  await withFreshWorkspace(async ({ root }) => {
    runCli(["refresh", "--root", root, "--json"]);
    const store = createLocalArtifactStore(root);
    await store.init();

    const file = "src/api/widgets/util.ts";
    const observed = createObservedRepo({
      header: header("ObservedRepo"),
      repository: { id: "graph-import-v4", root: "." },
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
            pack: "graph-aware-import-fact-consumers-v4",
            file,
            extractorVersion: "0.1.0",
          },
        }),
        createEvidenceFact({
          id: "import-helper",
          kind: "import",
          subject: `${file}:./helper`,
          value: { source: file, target: "./helper" },
          confidence: 0.9,
          provenance: {
            source: "test-fixture",
            pack: "graph-aware-import-fact-consumers-v4",
            file,
            extractorVersion: "0.1.0",
          },
        }),
      ],
    });
    await store.write(graph, { category: "graphs" });

    const findingReport = createFindingReport({
      header: { ...header("FindingReport"), artifactId: `graph-import-v4-${Date.now()}` },
      findings: [
        {
          id: "graph-import-consumer-v4",
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
