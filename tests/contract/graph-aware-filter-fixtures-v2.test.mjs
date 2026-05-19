// Graph-aware filter fixtures v2 — contract tests that
// complete fixture coverage for the remaining graph-aware
// reasons (route-http-middleware-only,
// factory-file-creates-deps, module-gate-verified-caller).
// Tests the actual current attribution model: route-http
// imports its allowed infra so the EvidenceGraph branch
// fires; factory + module-gate fire via path-evidence and
// attribute as DetectorDetails (path-only matches set
// `usedArtifacts: []`, which the evidence-source
// classifier maps to DetectorDetails). Tests do NOT force
// EvidenceGraph attribution where the current filter
// design does not use graph evidence.
//
// All tests copy the fixture to a tmpdir so the committed
// fixture directories are never mutated.

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

// ---------- Fixture 4: route-http-middleware-only (positive) ----------

test("fixture 4 (route-http positive): allowed /infra/http + /infra/Identity imports filter via EvidenceGraph", async () => {
  await withFixtureCopy("route-http-middleware-only", async ({ root }) => {
    runCli(["refresh", "--root", root, "--json"]);

    const graph = await readLatestArtifactJson(root, "EvidenceGraph", "evidence");
    assert.ok(graph, "EvidenceGraph must exist after refresh");
    const sessionImports = graph.facts
      .filter((fact) =>
        fact.kind === "import"
        && fact.value?.source === "src/api/session/route.ts",
      )
      .map((fact) => fact.value?.target)
      .sort();
    assert.deepEqual(
      sessionImports,
      ["../../infra/Identity/session", "../../infra/http/auth"],
      "EvidenceGraph must list the route's allowed infra imports",
    );

    await seedFindingReport(root, graph, [
      {
        id: "rhttp-positive",
        type: "architecture",
        severity: "medium",
        title: "Route constructs and injects deps",
        description: "routes.construct_and_inject_deps rule fired.",
        subjects: ["src/api/session/route.ts"],
        files: ["src/api/session/route.ts"],
        ruleId: "routes.construct_and_inject_deps",
        details: {},
      },
    ]);

    runCli(["findings", "filter", "--root", root, "--json"]);
    runCli(["findings", "filter-health", "--root", root, "--json"]);
    await assertGraphAwareMatch({
      root,
      findingId: "rhttp-positive",
      expectedReason: "route-http-middleware-only",
      expectedSource: "EvidenceGraph",
      expectInputRef: true,
    });
    await assertLifecycleExcludes(root, "rhttp-positive");
  });
});

// ---------- Fixture 4: route-http-middleware-only (negative) ----------

test("fixture 4 (route-http negative): /infra/Database import keeps the finding ACTIVE (no graph-aware filter fires)", async () => {
  await withFixtureCopy("route-http-middleware-only", async ({ root }) => {
    runCli(["refresh", "--root", root, "--json"]);

    const graph = await readLatestArtifactJson(root, "EvidenceGraph", "evidence");
    const badImports = graph.facts
      .filter((fact) =>
        fact.kind === "import"
        && fact.value?.source === "src/api/bad/route.ts",
      )
      .map((fact) => fact.value?.target);
    assert.deepEqual(
      badImports,
      ["../../infra/Database/client"],
      "bad/route.ts must import only the disallowed Database client",
    );

    // Seed ONLY the negative-case finding so we can pin
    // that it is kept, not filtered, even when graph
    // evidence is available.
    await seedFindingReport(root, graph, [
      {
        id: "rhttp-negative",
        type: "architecture",
        severity: "medium",
        title: "Route constructs and injects deps (bad)",
        description: "routes.construct_and_inject_deps rule fired against /infra/Database import.",
        subjects: ["src/api/bad/route.ts"],
        files: ["src/api/bad/route.ts"],
        ruleId: "routes.construct_and_inject_deps",
        details: {},
      },
    ]);

    runCli(["findings", "filter", "--root", root, "--json"]);
    const filterReport = await readLatestArtifactJson(
      root,
      "FindingFilterReport",
      "findings",
    );
    const kept = (filterReport?.keptFindings ?? []).find(
      (row) => row.id === "rhttp-negative",
    );
    assert.ok(kept, "rhttp-negative must appear in keptFindings (NOT filtered)");
    const filteredEntry = (filterReport?.filteredFindings ?? []).find(
      (row) => row.findingId === "rhttp-negative",
    );
    assert.equal(filteredEntry, undefined, "rhttp-negative must NOT be filtered");
    // Belt-and-suspenders: even if the entry existed,
    // it must not carry the route-http-middleware-only
    // reason.
    const middlewareHits = (filterReport?.filteredFindings ?? []).filter(
      (row) => row.reason === "route-http-middleware-only",
    );
    assert.deepEqual(
      middlewareHits,
      [],
      "no filtered entry should carry route-http-middleware-only when only Database import is present",
    );
  });
});

// ---------- Fixture 5: factory-file-creates-deps ----------

test("fixture 5 (factory-file): path-evidence branch fires as factory-file-creates-deps with DetectorDetails attribution", async () => {
  await withFixtureCopy("factory-file", async ({ root }) => {
    runCli(["refresh", "--root", root, "--json"]);

    const graph = await readLatestArtifactJson(root, "EvidenceGraph", "evidence");
    assert.ok(graph, "EvidenceGraph must exist after refresh");
    // Confirm the factory file is in the graph's file
    // facts; the v2 graph-aware check still uses path
    // evidence (not file-fact evidence) for its decision.
    const fileFact = graph.facts.find(
      (fact) =>
        fact.kind === "file"
        && fact.subject === "src/core/services/widgets/WidgetFactory.ts",
    );
    assert.ok(fileFact, "WidgetFactory.ts must appear as a file fact");

    await seedFindingReport(root, graph, [
      {
        id: "factory-1",
        type: "architecture",
        severity: "medium",
        title: "Service instantiates infra",
        description: "dependency_injection.services_must_not_instantiate_infra rule fired.",
        subjects: ["src/core/services/widgets/WidgetFactory.ts"],
        files: ["src/core/services/widgets/WidgetFactory.ts"],
        ruleId: "dependency_injection.services_must_not_instantiate_infra",
        details: {},
      },
    ]);

    runCli(["findings", "filter", "--root", root, "--json"]);
    runCli(["findings", "filter-health", "--root", root, "--json"]);
    // The factory check uses path heuristics (Factory.ts /
    // factory.ts / core/services/**/init/**). Its decision
    // sets `usedArtifacts: []`, which the
    // evidence-source classifier maps to
    // `DetectorDetails`. The work order specifies that
    // the test asserts CURRENT attribution accurately and
    // does NOT force EvidenceGraph attribution where the
    // current filter design does not use graph evidence.
    await assertGraphAwareMatch({
      root,
      findingId: "factory-1",
      expectedReason: "factory-file-creates-deps",
      expectedSource: "DetectorDetails",
      expectInputRef: false,
      expectEvidenceText: /path-evidence/i,
    });
    await assertLifecycleExcludes(root, "factory-1");
  });
});

// ---------- Fixture 6: module-gate-verified-caller ----------

test("fixture 6 (module-gate): GateEvaluator path signal fires as module-gate-verified-caller with DetectorDetails attribution", async () => {
  await withFixtureCopy("module-gate", async ({ root }) => {
    runCli(["refresh", "--root", root, "--json"]);

    const graph = await readLatestArtifactJson(root, "EvidenceGraph", "evidence");
    assert.ok(graph, "EvidenceGraph must exist after refresh");
    const fileFact = graph.facts.find(
      (fact) =>
        fact.kind === "file"
        && fact.subject === "src/modules/payments/PaymentGateEvaluator.ts",
    );
    assert.ok(fileFact, "PaymentGateEvaluator.ts must appear as a file fact");

    await seedFindingReport(root, graph, [
      {
        id: "modgate-1",
        type: "architecture",
        severity: "medium",
        title: "Module gate must have production caller",
        description: "architecture.gates.must_have_production_caller rule fired.",
        subjects: ["src/modules/payments/PaymentGateEvaluator.ts"],
        files: ["src/modules/payments/PaymentGateEvaluator.ts"],
        ruleId: "architecture.gates.must_have_production_caller",
        details: {},
      },
    ]);

    runCli(["findings", "filter", "--root", root, "--json"]);
    runCli(["findings", "filter-health", "--root", root, "--json"]);
    // The module-gate check uses path heuristics
    // (GateEvaluator path or /modules/ path). Its
    // decision sets `usedArtifacts: []`, which the
    // evidence-source classifier maps to
    // `DetectorDetails`. The OwnershipMap + kind="module"
    // branch (which DOES set `usedArtifacts:
    // ["OwnershipMap", "ObservedRepo"]`) is exercised by
    // synthetic test cases in
    // `graph-aware-finding-filters-v2.test.mjs`; this
    // fixture pins the GateEvaluator path signal which
    // is the strongest single signal.
    await assertGraphAwareMatch({
      root,
      findingId: "modgate-1",
      expectedReason: "module-gate-verified-caller",
      expectedSource: "DetectorDetails",
      expectInputRef: false,
      expectEvidenceText: /GateEvaluator/i,
    });
    await assertLifecycleExcludes(root, "modgate-1");
  });
});

// ---------- Publication-rendering test ----------

test("v2 fixtures + publications: route-http fixture surfaces EvidenceGraph evidence-source attribution in architecture summary + agent contract", async () => {
  await withFixtureCopy("route-http-middleware-only", async ({ root }) => {
    runCli(["refresh", "--root", root, "--json"]);
    const graph = await readLatestArtifactJson(root, "EvidenceGraph", "evidence");
    await seedFindingReport(root, graph, [
      {
        id: "rhttp-pub",
        type: "architecture",
        severity: "medium",
        title: "Route constructs and injects deps",
        description: "routes.construct_and_inject_deps rule fired.",
        subjects: ["src/api/session/route.ts"],
        files: ["src/api/session/route.ts"],
        ruleId: "routes.construct_and_inject_deps",
        details: {},
      },
    ]);
    runCli(["findings", "filter", "--root", root, "--json"]);
    runCli(["findings", "filter-health", "--root", root, "--json"]);
    runCli(["publish", "architecture", "--root", root, "--json"]);
    runCli(["publish", "agent-contract", "--root", root, "--json"]);

    const arch = await readLatestPublicationByPrefix(
      root,
      "Publication-architecture-summary-",
    );
    assert.ok(arch?.content, "architecture-summary publication must exist");
    assert.match(arch.content, /### Graph-Aware Evidence Sources/);
    assert.match(arch.content, /\| EvidenceGraph \|/);
    assert.match(arch.content, /route-http-middleware-only/);

    const agent = await readLatestPublicationByPrefix(
      root,
      "Publication-agent-contract-",
    );
    assert.ok(agent?.content, "agent-contract publication must exist");
    assert.match(agent.content, /Graph-aware evidence sources:/);
    assert.match(agent.content, /EvidenceGraph/);
  });
});

// ---------- Smoke: rekon artifacts validate stays clean across all v2 fixtures ----------

test("rekon artifacts validate stays clean for every v2 fixture after the graph-aware flow", async () => {
  for (const fixture of [
    "route-http-middleware-only",
    "factory-file",
    "module-gate",
  ]) {
    await withFixtureCopy(fixture, async ({ root }) => {
      runCli(["refresh", "--root", root, "--json"]);
      const validate = JSON.parse(
        runCli(["artifacts", "validate", "--root", root, "--json"]).stdout,
      );
      assert.equal(validate.valid, true, `${fixture}: validate must return valid:true`);
      assert.deepEqual(
        validate.issues ?? [],
        [],
        `${fixture}: validate.issues must be empty`,
      );
    });
  }
});

// ---------- Reusable assertion: graph-aware match with explicit source ----------

async function assertGraphAwareMatch({
  root,
  findingId,
  expectedReason,
  expectedSource,
  expectInputRef,
  expectEvidenceText,
}) {
  // 1. FindingFilterReport entry matches the expected
  //    reason + evidence source. If expectInputRef ===
  //    true, header.inputRefs must include EvidenceGraph;
  //    if false (e.g. path-evidence branch), it must NOT
  //    include EvidenceGraph (precise inputRefs from the
  //    v2 graph-aware filter provider).
  const filterReport = await readLatestArtifactJson(
    root,
    "FindingFilterReport",
    "findings",
  );
  assert.ok(filterReport, "FindingFilterReport must exist after `findings filter`");
  const entry = (filterReport.filteredFindings ?? []).find(
    (row) => row.findingId === findingId,
  );
  assert.ok(entry, `${findingId} must appear in filteredFindings`);
  assert.equal(entry.reason, expectedReason);
  assert.equal(entry.evidenceSource, expectedSource);
  if (expectEvidenceText) {
    assert.match(entry.evidence, expectEvidenceText);
  }
  const refs = filterReport.header?.inputRefs ?? [];
  const hasEvidenceGraphRef = refs.some((ref) => ref.type === "EvidenceGraph");
  if (expectInputRef) {
    assert.ok(
      hasEvidenceGraphRef,
      "FindingFilterReport.header.inputRefs must include EvidenceGraph when the EvidenceGraph branch fired",
    );
  } else {
    assert.equal(
      hasEvidenceGraphRef,
      false,
      "FindingFilterReport.header.inputRefs must NOT include EvidenceGraph for path-evidence-only decisions",
    );
  }

  // 2. Raw FindingReport still contains the finding.
  const findingReport = await readLatestArtifactJson(root, "FindingReport", "findings");
  assert.ok(findingReport, "FindingReport must exist");
  const stillThere = (findingReport.findings ?? []).find(
    (row) => row.id === findingId,
  );
  assert.ok(stillThere, `${findingId} must still appear in the raw FindingReport`);

  // 3. FindingFilterHealthReport shows the expected
  //    evidence source for the matched reason.
  const health = await readLatestArtifactJson(
    root,
    "FindingFilterHealthReport",
    "findings",
  );
  assert.ok(health, "FindingFilterHealthReport must exist after `findings filter-health`");
  const summary = health.summary ?? {};
  const gaSrc = summary.graphAwareByEvidenceSource ?? {};
  assert.ok(
    (gaSrc[expectedSource] ?? 0) >= 1,
    `graphAwareByEvidenceSource.${expectedSource} must be >= 1; got ${JSON.stringify(gaSrc)}`,
  );
  const perReason
    = (summary.graphAwareReasonEvidenceSources ?? {})[expectedReason] ?? {};
  assert.ok(
    (perReason[expectedSource] ?? 0) >= 1,
    `graphAwareReasonEvidenceSources[${expectedReason}].${expectedSource} must be >= 1; got ${JSON.stringify(perReason)}`,
  );
}

// ---------- Reusable assertion: lifecycle / adjudication / coherency exclude ----------

async function assertLifecycleExcludes(root, findingId) {
  runCli(["findings", "lifecycle", "--root", root, "--json"]);
  runCli(["issues", "adjudicate", "--root", root, "--json"]);
  runCli(["coherency", "delta", "--root", root, "--json"]);
  const lifecycle = await readLatestArtifactJson(
    root,
    "FindingLifecycleReport",
    "findings",
  );
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
  const root = await mkdtemp(join(tmpdir(), `rekon-fixture-v2-${name}-`));
  try {
    await cp(source, root, { recursive: true });
    runCli(["init", "--root", root, "--json"]);
    await callback({ root });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function seedFindingReport(root, evidenceGraph, findings) {
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
      artifactId: `fixture-v2-finding-report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      schemaVersion: "0.1.0",
      generatedAt: new Date().toISOString(),
      subject: { repoId: "graph-aware-filter-fixture-v2" },
      producer: { id: "graph-aware-filter-fixtures-v2-test", version: "0.1.0" },
      inputRefs: headerInputRefs,
      freshness: { status: "fresh" },
    },
    findings,
  });
  await store.write(report, { category: "findings" });
}

async function readLatestArtifactJson(root, artifactType, category) {
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
