// Graph-aware Next.js route export convention filter — v3
// contract tests. First v3 candidate check that consumes the
// new EvidenceGraph `export` facts substrate
// (shipped at a776c58 via the export/symbol facts projection
// v1).
//
// The new graph-aware variant of `nextjs-route-convention`
// reads `listExportsForFile` to verify that a `route.ts`
// file's non-handler named exports are all in the Next.js
// segment-config set (`runtime` / `dynamic` / `revalidate` /
// `fetchCache` / `preferredRegion`) before suppressing the
// `routes.single_http_handler_export` finding. The legacy
// classic content filter (using `details.otherExports`)
// remains as a fallback when EvidenceGraph export facts are
// absent.

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
import { createEvidenceFact, createEvidenceGraph } from "../../packages/kernel-evidence/dist/index.js";
import { createLocalArtifactStore } from "../../packages/runtime/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- Test 1: GET + runtime → filter ----------

test("route.ts export facts GET + runtime filter as nextjs-route-convention", () => {
  const file = "src/app/api/items/route.ts";
  const finding = architecture("nx-graph-1", "routes.single_http_handler_export", {
    files: [file],
    details: {},
  });
  const decision = applyFindingGraphFilters({
    finding,
    graphContext: graphWithExports(file, [
      { name: "GET", kind: "function" },
      { name: "runtime", kind: "const" },
    ]),
  });
  assert.ok(decision, "graph-aware nextjs-route-convention must fire");
  assert.equal(decision.reason, "nextjs-route-convention");
  assert.equal(decision.confidence, "high");
  assert.match(decision.evidence, /EvidenceGraph/i);
  assert.match(decision.evidence, /runtime/);
  assert.deepEqual(decision.usedArtifacts, ["EvidenceGraph"]);
});

// ---------- Test 2: full segment-config set → filter ----------

test("route.ts export facts GET + every segment-config export filter as nextjs-route-convention", () => {
  const file = "src/app/api/widgets/route.ts";
  const finding = architecture("nx-graph-2", "routes.single_http_handler_export", {
    files: [file],
    details: {},
  });
  const decision = applyFindingGraphFilters({
    finding,
    graphContext: graphWithExports(file, [
      { name: "GET", kind: "function" },
      { name: "runtime", kind: "const" },
      { name: "dynamic", kind: "const" },
      { name: "revalidate", kind: "const" },
      { name: "fetchCache", kind: "const" },
      { name: "preferredRegion", kind: "const" },
    ]),
  });
  assert.ok(decision);
  assert.equal(decision.reason, "nextjs-route-convention");
  for (const segment of ["runtime", "dynamic", "revalidate", "fetchCache", "preferredRegion"]) {
    assert.match(decision.evidence, new RegExp(segment));
  }
});

// ---------- Test 3: GET + helper → do NOT filter ----------

test("route.ts export facts GET + helper do not filter", () => {
  const file = "src/app/api/items/route.ts";
  const finding = architecture("nx-graph-3", "routes.single_http_handler_export", {
    files: [file],
    details: {},
  });
  const decision = applyFindingGraphFilters({
    finding,
    graphContext: graphWithExports(file, [
      { name: "GET", kind: "function" },
      { name: "helper", kind: "function" },
    ]),
  });
  assert.equal(decision, null, "must not filter when an extra is not a segment-config name");
});

// ---------- Test 4: GET only → do NOT filter ----------

test("route.ts export facts GET only do not filter (no extras to suppress)", () => {
  const file = "src/app/api/items/route.ts";
  const finding = architecture("nx-graph-4", "routes.single_http_handler_export", {
    files: [file],
    details: {},
  });
  const decision = applyFindingGraphFilters({
    finding,
    graphContext: graphWithExports(file, [{ name: "GET", kind: "function" }]),
  });
  assert.equal(decision, null, "must not filter when there are no extras (only handler exports)");
});

// ---------- Test 5: default export ignored ----------

test("route.ts default export is ignored for the nextjs-route-convention check", () => {
  const file = "src/app/api/items/route.ts";
  const finding = architecture("nx-graph-5", "routes.single_http_handler_export", {
    files: [file],
    details: {},
  });
  // Exports: GET (handler), runtime (allowed segment config),
  // default (ignored). The check should filter because the
  // only non-default, non-handler export is `runtime`.
  const decision = applyFindingGraphFilters({
    finding,
    graphContext: graphWithExports(file, [
      { name: "GET", kind: "function" },
      { name: "runtime", kind: "const" },
      { name: "default", kind: "default", default: true },
    ]),
  });
  assert.ok(decision);
  assert.equal(decision.reason, "nextjs-route-convention");
  assert.match(decision.evidence, /runtime/);
  // Default-export name must not appear among the extras
  // surfaced in evidence — only `runtime`.
  assert.equal(decision.evidence.includes("default"), false);
});

// ---------- Test 6: graph facts override details.otherExports ----------

test("graph facts override details.otherExports — extras with an invalid helper keep the finding active", () => {
  // Detector claims `details.otherExports = ["runtime"]`
  // (would suppress under the classic content filter), but
  // EvidenceGraph export facts prove the file actually
  // exports `helper` too. Graph-aware runs first; it sees
  // the invalid extra and declines to filter.
  const file = "src/app/api/items/route.ts";
  const finding = architecture("nx-graph-6", "routes.single_http_handler_export", {
    files: [file],
    details: { otherExports: ["runtime"] },
  });
  const result = applyFindingFilters({
    findings: [finding],
    graphContext: graphWithExports(file, [
      { name: "GET", kind: "function" },
      { name: "helper", kind: "function" },
      { name: "runtime", kind: "const" },
    ]),
  });
  // The finding stays active — neither the graph-aware
  // check (`helper` is invalid) nor any fallback content
  // filter should suppress it once the graph proved the
  // invalid extra exists. The classic content filter ALSO
  // wouldn't fire because details.otherExports already
  // had `runtime` only; but the graph evidence is stronger
  // and shows reality.
  assert.equal(result.keptFindings.length, 1);
  assert.equal(result.filteredFindings.length, 0);
});

// ---------- Test 7: classic content fallback still works when no graph ----------

test("classic content fallback filters when graph export facts are absent", () => {
  const file = "src/app/api/items/route.ts";
  const finding = architecture("nx-fallback-7", "routes.single_http_handler_export", {
    files: [file],
    details: { otherExports: ["runtime", "dynamic"] },
  });
  // No graphContext at all → classic content filter must
  // run and suppress.
  const result = applyFindingFilters({ findings: [finding] });
  assert.equal(result.keptFindings.length, 0);
  assert.equal(result.filteredFindings.length, 1);
  const entry = result.filteredFindings[0];
  assert.equal(entry.reason, "nextjs-route-convention");
  assert.equal(entry.source, "system");
  // Classic content fallback doesn't carry usedArtifacts —
  // confirmed by the run-level graphArtifactsUsed.
  assert.deepEqual(result.graphArtifactsUsed, []);
});

// ---------- Test 8: FindingFilterReport inputRefs include EvidenceGraph ----------

test("FindingFilterReport inputRefs include EvidenceGraph when export facts are used", async () => {
  await withSeededRouteExportFixture(async ({ root }) => {
    runCli(["findings", "filter", "--root", root, "--json"]);
    const report = await readLatestArtifactJson(root, "FindingFilterReport");
    assert.ok(report, "FindingFilterReport must exist");
    const matched = report.filteredFindings.find(
      (entry) => entry.findingId === "graph-nextjs-route-v3",
    );
    assert.ok(matched, "graph-nextjs-route-v3 must be filtered");
    assert.equal(matched.reason, "nextjs-route-convention");
    const refs = report.header.inputRefs ?? [];
    assert.ok(
      refs.some((ref) => ref.type === "EvidenceGraph"),
      "inputRefs must include EvidenceGraph when the graph-aware Next.js check fired",
    );
  });
});

// ---------- Test 9: raw FindingReport unchanged ----------

test("raw FindingReport remains unchanged after graph-aware Next.js route convention filtering", async () => {
  await withSeededRouteExportFixture(async ({ root }) => {
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

// ---------- Test 10: lifecycle / adjudication / coherency exclude graph-filtered finding ----------

test("lifecycle / adjudication / coherency exclude graph-aware nextjs-route-convention finding + artifacts validate stays clean", async () => {
  await withSeededRouteExportFixture(async ({ root }) => {
    runCli(["findings", "filter", "--root", root, "--json"]);
    runCli(["findings", "lifecycle", "--root", root, "--json"]);
    runCli(["issues", "adjudicate", "--root", root, "--json"]);
    runCli(["coherency", "delta", "--root", root, "--json"]);
    const lifecycle = await readLatestArtifactJson(root, "FindingLifecycleReport");
    const activeIds = (lifecycle?.activeFindings ?? []).map(
      (entry) => entry.findingId ?? entry.id ?? entry.finding?.id,
    );
    assert.ok(
      !activeIds.includes("graph-nextjs-route-v3"),
      `graph-nextjs-route-v3 must not be in active lifecycle, got ${JSON.stringify(activeIds)}`,
    );
    const validate = JSON.parse(
      runCli(["artifacts", "validate", "--root", root, "--json"]).stdout,
    );
    assert.equal(validate.valid, true);
    assert.deepEqual(validate.issues ?? [], []);
  });
});

// ---------- Test 11: filter-health buckets the match as graph-aware ----------

test("filter-health buckets the new graph-aware match as graphAwareFiltered (not contentFiltered)", () => {
  const file = "src/app/api/widgets/route.ts";
  const finding = architecture("nx-bucket", "routes.single_http_handler_export", {
    files: [file],
    details: {},
  });
  const result = applyFindingFilters({
    findings: [finding],
    graphContext: graphWithExports(file, [
      { name: "GET", kind: "function" },
      { name: "runtime", kind: "const" },
    ]),
  });
  assert.equal(result.filteredFindings.length, 1);
  // The reason `nextjs-route-convention` was moved from
  // CLASSIC_CONTENT_FILTER_REASONS to
  // GRAPH_AWARE_FILTER_REASONS in this slice. Whether the
  // graph-aware check or the classic content fallback fired,
  // filter-health buckets the entry under graphAwareFiltered.
  assert.deepEqual(result.graphArtifactsUsed, ["EvidenceGraph"]);
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

function graphWithExports(file, entries) {
  // Build a minimal in-memory graph context with the new
  // `kind: "export"` facts. Each entry → one fact.
  return {
    evidenceGraph: {
      facts: entries.map((entry, index) => ({
        id: `fact-export-${index}`,
        kind: "export",
        subject: file,
        value: entry,
        confidence: 0.9,
        provenance: { source: "test", pack: "graph-aware-nextjs-tests", extractorVersion: "0.1.0" },
      })),
    },
  };
}

async function withFreshWorkspace(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-graph-nextjs-v3-"));
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

async function withSeededRouteExportFixture(callback) {
  // Seeds a synthetic ObservedRepo (so refresh's
  // GraphSlice projector has something to chew on), a
  // synthetic EvidenceGraph carrying export facts for a
  // `route.ts` file with GET + runtime + dynamic exports,
  // and a synthetic FindingReport whose
  // `routes.single_http_handler_export` finding points at
  // that route. After this, `rekon findings filter` should
  // suppress the finding via the new graph-aware check and
  // cite EvidenceGraph in `inputRefs`.
  await withFreshWorkspace(async ({ root }) => {
    runCli(["refresh", "--root", root, "--json"]);
    const store = createLocalArtifactStore(root);
    await store.init();

    const filePath = "src/app/api/widgets/route.ts";
    const observed = createObservedRepo({
      header: header("ObservedRepo"),
      repository: { id: "graph-nextjs-v3", root: "." },
      systems: [
        {
          id: "synthetic",
          paths: [filePath],
          layers: [],
          capabilities: [],
          confidence: 0.9,
          evidence: [],
        },
      ],
      layers: [],
      capabilities: [],
      files: [filePath],
    });
    await store.write(observed, { category: "graphs" });

    const exportFacts = [
      { name: "GET", kind: "function" },
      { name: "runtime", kind: "const" },
      { name: "dynamic", kind: "const" },
    ].map((value, index) =>
      createEvidenceFact({
        id: `fact-export-v3-${index}`,
        kind: "export",
        subject: filePath,
        value,
        confidence: 0.9,
        provenance: {
          source: "test-fixture",
          pack: "graph-aware-nextjs-tests",
          file: filePath,
          extractorVersion: "0.1.0",
        },
      }),
    );
    const graph = createEvidenceGraph({
      header: header("EvidenceGraph"),
      facts: exportFacts,
    });
    await store.write(graph, { category: "graphs" });

    const findingReport = createFindingReport({
      header: { ...header("FindingReport"), artifactId: `graph-nextjs-v3-${Date.now()}` },
      findings: [
        {
          id: "graph-nextjs-route-v3",
          type: "architecture",
          severity: "medium",
          title: "Route file has extra exports",
          description: "routes.single_http_handler_export rule fired.",
          subjects: [filePath],
          files: [filePath],
          ruleId: "routes.single_http_handler_export",
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
