// Graph-aware filter fixtures — contract tests that prove
// the EvidenceGraph-backed graph-aware filter branches fire
// end-to-end against real source files (not synthetic graph
// data). The operator review at `2d6dc50` recorded that no
// available local fixture exercised these branches; this
// batch adds three small fixtures (route-handler /
// external-comment / nextjs-route) and pins their behavior.
//
// Each test copies its fixture to a tmpdir so the committed
// fixture directories are never mutated by `rekon refresh`.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { createFindingReport } from "../../packages/kernel-findings/dist/index.js";
import { createLocalArtifactStore } from "../../packages/runtime/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const fixturesRoot = join(repoRoot, "tests/fixtures/graph-aware-filters");

// ---------- Fixture 1: route-handler ----------

test("fixture 1 (route-handler): EvidenceGraph emits import + sibling-file facts; graph-aware filter cites EvidenceGraph", async () => {
  await withFixtureCopy("route-handler", async ({ root }) => {
    runCli(["refresh", "--root", root, "--json"]);

    // The provider must emit a `route.ts → ./handler` import
    // fact plus the sibling-file index entry. Inspect the
    // raw EvidenceGraph to make the assertion explicit (this
    // catches producer regressions earlier than the filter
    // pipeline would).
    const graph = await readLatestArtifactJson(root, "EvidenceGraph", "evidence");
    assert.ok(graph, "EvidenceGraph must exist after refresh");
    const importFact = graph.facts.find(
      (fact) => fact.kind === "import"
        && fact.value?.source === "src/api/widgets/route.ts"
        && fact.value?.target === "./handler",
    );
    assert.ok(importFact, "EvidenceGraph must include the route.ts → ./handler import fact");

    // Seed a synthetic FindingReport whose finding the
    // graph-aware route-handler-with-service check should
    // suppress via the EvidenceGraph import branch (the
    // detector mimic surfaces no `details.imports`, so the
    // filter must rely on the EvidenceGraph branch — not the
    // detector-imports fallback).
    await seedFindingReport(root, graph, [
      {
        id: "rh-fixture",
        type: "architecture",
        severity: "medium",
        title: "Route delegates work to a handler",
        description: "routes.construct_and_inject_deps rule fired.",
        subjects: ["src/api/widgets/route.ts"],
        files: ["src/api/widgets/route.ts"],
        ruleId: "routes.construct_and_inject_deps",
        details: {},
      },
    ]);

    runCli(["findings", "filter", "--root", root, "--json"]);
    runCli(["findings", "filter-health", "--root", root, "--json"]);
    await assertGraphAwareEvidenceGraphMatch({
      root,
      findingId: "rh-fixture",
      expectedReason: "route-handler-with-service",
    });
    await assertLifecycleExcludes(root, "rh-fixture");
  });
});

// ---------- Fixture 2: external-comment ----------

test("fixture 2 (external-comment): EvidenceGraph emits non-external-API import fact; graph-aware external-api-comment-only cites EvidenceGraph", async () => {
  await withFixtureCopy("external-comment", async ({ root }) => {
    runCli(["refresh", "--root", root, "--json"]);

    const graph = await readLatestArtifactJson(root, "EvidenceGraph", "evidence");
    assert.ok(graph);
    const importFact = graph.facts.find(
      (fact) => fact.kind === "import"
        && fact.value?.source === "src/api/util.ts"
        && fact.value?.target === "leftpad",
    );
    assert.ok(importFact, "EvidenceGraph must include the util.ts → leftpad import fact");
    // Make sure no openai/openrouter/@openai/* import slipped
    // into the graph — that would void the filter's premise.
    const externalApiImport = graph.facts.find(
      (fact) => fact.kind === "import"
        && fact.value?.source === "src/api/util.ts"
        && typeof fact.value?.target === "string"
        && /\b(openai|openrouter|@openai\/)/i.test(fact.value.target),
    );
    assert.equal(externalApiImport, undefined, "fixture must not import any external API SDK");

    await seedFindingReport(root, graph, [
      {
        id: "ext-fixture",
        type: "architecture",
        severity: "medium",
        title: "External API call without provider",
        description: "external_apis.calls_go_through_providers rule fired.",
        subjects: ["src/api/util.ts"],
        files: ["src/api/util.ts"],
        ruleId: "external_apis.calls_go_through_providers",
        details: {},
      },
    ]);

    runCli(["findings", "filter", "--root", root, "--json"]);
    runCli(["findings", "filter-health", "--root", root, "--json"]);
    await assertGraphAwareEvidenceGraphMatch({
      root,
      findingId: "ext-fixture",
      expectedReason: "external-api-comment-only",
    });
    await assertLifecycleExcludes(root, "ext-fixture");
  });
});

// ---------- Fixture 3: nextjs-route ----------

test("fixture 3 (nextjs-route): EvidenceGraph emits segment-config export facts; graph-aware nextjs-route-convention cites EvidenceGraph", async () => {
  await withFixtureCopy("nextjs-route", async ({ root }) => {
    runCli(["refresh", "--root", root, "--json"]);

    const graph = await readLatestArtifactJson(root, "EvidenceGraph", "evidence");
    assert.ok(graph);
    const exportNames = graph.facts
      .filter((fact) => fact.kind === "export" && fact.subject === "src/app/api/route.ts")
      .map((fact) => fact.value?.name)
      .sort();
    assert.deepEqual(
      exportNames,
      ["GET", "dynamic", "runtime"],
      `EvidenceGraph must include route.ts exports GET/dynamic/runtime; got ${JSON.stringify(exportNames)}`,
    );

    await seedFindingReport(root, graph, [
      {
        id: "nx-fixture",
        type: "architecture",
        severity: "medium",
        title: "Route exports extra handler symbols",
        description: "routes.single_http_handler_export rule fired.",
        subjects: ["src/app/api/route.ts"],
        files: ["src/app/api/route.ts"],
        ruleId: "routes.single_http_handler_export",
        details: { otherExports: ["runtime", "dynamic"] },
      },
    ]);

    runCli(["findings", "filter", "--root", root, "--json"]);
    runCli(["findings", "filter-health", "--root", root, "--json"]);
    await assertGraphAwareEvidenceGraphMatch({
      root,
      findingId: "nx-fixture",
      expectedReason: "nextjs-route-convention",
    });
    await assertLifecycleExcludes(root, "nx-fixture");
  });
});

// ---------- Publication-rendering test ----------

test("fixture 1 + publications: architecture summary and agent contract surface EvidenceGraph attribution from the fixture flow", async () => {
  // Uses the route-handler fixture because it produces the
  // cleanest single graph-aware match. Asserts that the
  // end-to-end pipeline reaches the user-facing publication
  // surfaces with EvidenceGraph attribution intact.
  await withFixtureCopy("route-handler", async ({ root }) => {
    runCli(["refresh", "--root", root, "--json"]);
    const graph = await readLatestArtifactJson(root, "EvidenceGraph", "evidence");
    await seedFindingReport(root, graph, [
      {
        id: "rh-pub-fixture",
        type: "architecture",
        severity: "medium",
        title: "Route delegates work to a handler",
        description: "routes.construct_and_inject_deps rule fired.",
        subjects: ["src/api/widgets/route.ts"],
        files: ["src/api/widgets/route.ts"],
        ruleId: "routes.construct_and_inject_deps",
        details: {},
      },
    ]);
    runCli(["findings", "filter", "--root", root, "--json"]);
    runCli(["findings", "filter-health", "--root", root, "--json"]);
    runCli(["publish", "architecture", "--root", root, "--json"]);
    runCli(["publish", "agent-contract", "--root", root, "--json"]);

    const arch = await readLatestPublicationByPrefix(root, "Publication-architecture-summary-");
    assert.ok(arch?.content, "architecture-summary publication must exist");
    assert.match(arch.content, /### Graph-Aware Evidence Sources/);
    assert.match(arch.content, /EvidenceGraph/);

    const agent = await readLatestPublicationByPrefix(root, "Publication-agent-contract-");
    assert.ok(agent?.content, "agent-contract publication must exist");
    assert.match(agent.content, /Graph-aware evidence sources:/);
    assert.match(agent.content, /EvidenceGraph/);
  });
});

// ---------- Smoke: rekon artifacts validate stays clean across all fixtures ----------

test("rekon artifacts validate stays clean for every fixture after the graph-aware flow", async () => {
  for (const fixture of ["route-handler", "external-comment", "nextjs-route"]) {
    await withFixtureCopy(fixture, async ({ root }) => {
      runCli(["refresh", "--root", root, "--json"]);
      const validate = JSON.parse(
        runCli(["artifacts", "validate", "--root", root, "--json"]).stdout,
      );
      assert.equal(validate.valid, true, `${fixture}: validate must return valid:true`);
      assert.deepEqual(validate.issues ?? [], [], `${fixture}: validate.issues must be empty`);
    });
  }
});

// ---------- Reusable assertion: graph-aware EvidenceGraph match ----------

async function assertGraphAwareEvidenceGraphMatch({ root, findingId, expectedReason }) {
  // 1. FindingFilterReport entry: matches the expected
  //    reason, evidenceSource === EvidenceGraph, evidence
  //    string mentions EvidenceGraph, and the report cites
  //    EvidenceGraph in its inputRefs.
  const filterReport = await readLatestArtifactJson(root, "FindingFilterReport", "findings");
  assert.ok(filterReport, "FindingFilterReport must exist after `findings filter`");
  const entry = (filterReport.filteredFindings ?? []).find((row) => row.findingId === findingId);
  assert.ok(entry, `${findingId} must appear in filteredFindings`);
  assert.equal(entry.reason, expectedReason);
  assert.equal(entry.evidenceSource, "EvidenceGraph");
  assert.match(entry.evidence, /EvidenceGraph/i);
  const refs = filterReport.header?.inputRefs ?? [];
  assert.ok(
    refs.some((ref) => ref.type === "EvidenceGraph"),
    "FindingFilterReport.header.inputRefs must include EvidenceGraph",
  );

  // 2. Raw FindingReport still contains the finding
  //    (artifact-first invariant: filters never mutate the
  //    raw report).
  const findingReport = await readLatestArtifactJson(root, "FindingReport", "findings");
  assert.ok(findingReport, "FindingReport must exist");
  const stillThere = (findingReport.findings ?? []).find((row) => row.id === findingId);
  assert.ok(stillThere, `${findingId} must still appear in the raw FindingReport`);

  // 3. FindingFilterHealthReport shows EvidenceGraph
  //    attribution: at least one EvidenceGraph entry in
  //    graphAwareByEvidenceSource AND in
  //    graphAwareReasonEvidenceSources[expectedReason].
  const health = await readLatestArtifactJson(root, "FindingFilterHealthReport", "findings");
  assert.ok(health, "FindingFilterHealthReport must exist after `findings filter-health`");
  const summary = health.summary ?? {};
  const gaSrc = summary.graphAwareByEvidenceSource ?? {};
  assert.ok(
    (gaSrc.EvidenceGraph ?? 0) >= 1,
    `graphAwareByEvidenceSource.EvidenceGraph must be >= 1; got ${JSON.stringify(gaSrc)}`,
  );
  const perReason = (summary.graphAwareReasonEvidenceSources ?? {})[expectedReason] ?? {};
  assert.ok(
    (perReason.EvidenceGraph ?? 0) >= 1,
    `graphAwareReasonEvidenceSources[${expectedReason}].EvidenceGraph must be >= 1; got ${JSON.stringify(perReason)}`,
  );
}

// ---------- Reusable assertion: lifecycle / adjudication / coherency exclude ----------

async function assertLifecycleExcludes(root, findingId) {
  runCli(["findings", "lifecycle", "--root", root, "--json"]);
  runCli(["issues", "adjudicate", "--root", root, "--json"]);
  runCli(["coherency", "delta", "--root", root, "--json"]);
  const lifecycle = await readLatestArtifactJson(root, "FindingLifecycleReport", "findings");
  const activeIds = (lifecycle?.activeFindings ?? []).map(
    (row) => row.findingId ?? row.id ?? row.finding?.id,
  );
  assert.ok(
    !activeIds.includes(findingId),
    `${findingId} must not appear in active lifecycle; got ${JSON.stringify(activeIds)}`,
  );
}

// ---------- Fixture / artifact helpers ----------

async function withFixtureCopy(name, callback) {
  const source = join(fixturesRoot, name);
  const root = await mkdtemp(join(tmpdir(), `rekon-fixture-${name}-`));
  try {
    await cp(source, root, { recursive: true });
    // Initialize the workspace inside the temp copy so the
    // committed fixture stays untouched. `init` is
    // idempotent.
    runCli(["init", "--root", root, "--json"]);
    await callback({ root });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function seedFindingReport(root, evidenceGraph, findings) {
  // Write a synthetic FindingReport that cites the latest
  // EvidenceGraph in its inputRefs. Mirrors what a detector
  // would produce: realistic lineage, files, reason ids; no
  // structural details we don't need.
  const store = createLocalArtifactStore(root);
  await store.init();
  const evidenceRef = evidenceGraph?.header
    ? {
      type: "EvidenceGraph",
      id: evidenceGraph.header.artifactId,
      schemaVersion: evidenceGraph.header.schemaVersion ?? "0.1.0",
    }
    : undefined;
  const headerInputRefs = evidenceRef ? [evidenceRef] : [];
  const report = createFindingReport({
    header: {
      artifactType: "FindingReport",
      artifactId: `fixture-finding-report-${Date.now()}`,
      schemaVersion: "0.1.0",
      generatedAt: new Date().toISOString(),
      subject: { repoId: "graph-aware-filter-fixture" },
      producer: { id: "graph-aware-filter-fixture-test", version: "0.1.0" },
      inputRefs: headerInputRefs,
      freshness: { status: "fresh" },
    },
    findings,
  });
  await store.write(report, { category: "findings" });
}

async function readLatestArtifactJson(root, artifactType, category) {
  // When `category` is provided, restrict the scan to that
  // sub-directory under `.rekon/artifacts` for determinism;
  // otherwise walk the whole tree.
  const dir = category
    ? join(root, ".rekon", "artifacts", category)
    : join(root, ".rekon", "artifacts");
  const matches = [];
  await walkDir(dir, matches, artifactType);
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

async function readLatestPublicationByPrefix(root, prefix) {
  const dir = join(root, ".rekon", "artifacts", "publications");
  let entries;
  try {
    entries = await readdir(dir);
  } catch {
    return undefined;
  }
  const matches = entries
    .filter((name) => name.startsWith(prefix) && name.endsWith(".json"))
    .map((name) => join(dir, name));
  if (matches.length === 0) return undefined;
  matches.sort();
  return JSON.parse(await readFile(matches[matches.length - 1], "utf8"));
}

function runCli(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}
