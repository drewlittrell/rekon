// Factory / module-gate artifact evidence strengthening v1 —
// contract tests. Pins the new EvidenceGraph branches at the
// top of `graphFilterFactoryFileCreatesDeps` and
// `graphFilterModuleGateVerifiedCaller`: each fires above the
// existing path/system/capability branches and surfaces
// `evidenceSource: "EvidenceGraph"`. Also pins that the
// existing fallback branches still fire when artifact
// evidence is absent — path attribution remains
// `DetectorDetails`; ObservedSystem.kind="module" still
// surfaces as `ObservedRepo` when an OwnershipMap +
// ObservedRepo with `kind: "module"` is seeded.
//
// All scenarios copy the fixture to a tmpdir so committed
// fixture directories are never mutated.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { createFindingReport } from "../../packages/kernel-findings/dist/index.js";
import { createLocalArtifactStore } from "../../packages/runtime/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const fixturesRoot = join(repoRoot, "tests/fixtures/graph-aware-filters");

const FACTORY_RULE_ID = "dependency_injection.services_must_not_instantiate_infra";
const MODULE_GATE_RULE_ID = "architecture.gates.must_have_production_caller";

// ---------- Test 1: factory EvidenceGraph attribution ----------

test("factory-file fixture: EvidenceGraph symbol/export facts attribute the filter as EvidenceGraph", async () => {
  await withFixtureCopy("factory-file", async ({ root }) => {
    runCli(["refresh", "--root", root, "--json"]);
    const graph = await readLatest(root, "EvidenceGraph", "evidence");
    await seedFindingReport(root, graph, factoryFinding("factory-eg"));
    runCli(["findings", "filter", "--root", root, "--json"]);
    runCli(["findings", "filter-health", "--root", root, "--json"]);

    const filterReport = await readLatest(root, "FindingFilterReport", "findings");
    const entry = (filterReport.filteredFindings ?? []).find(
      (row) => row.findingId === "factory-eg",
    );
    assert.ok(entry, "factory-eg must appear in filteredFindings");
    assert.equal(entry.reason, "factory-file-creates-deps");
    assert.equal(entry.evidenceSource, "EvidenceGraph");
    // The decision's usedArtifacts isn't surfaced on
    // FilteredFinding (only `evidenceSource` is); we
    // verify the upstream contribution via
    // FindingFilterReport.header.inputRefs in test 9.
  });
});

// ---------- Test 2: factory evidence string names symbol/export ----------

test("factory-file evidence string names the createWidgetService symbol/export fact", async () => {
  await withFixtureCopy("factory-file", async ({ root }) => {
    runCli(["refresh", "--root", root, "--json"]);
    const graph = await readLatest(root, "EvidenceGraph", "evidence");
    await seedFindingReport(root, graph, factoryFinding("factory-evname"));
    runCli(["findings", "filter", "--root", root, "--json"]);

    const filterReport = await readLatest(root, "FindingFilterReport", "findings");
    const entry = (filterReport.filteredFindings ?? []).find(
      (row) => row.findingId === "factory-evname",
    );
    assert.ok(entry, "factory-evname must appear in filteredFindings");
    assert.match(entry.evidence, /EvidenceGraph/i);
    assert.match(entry.evidence, /createWidgetService/);
    assert.match(entry.evidence, /factory creator/i);
  });
});

// ---------- Test 3: factory path fallback when artifact evidence missing ----------

test("factory-file path fallback fires (DetectorDetails) when symbol/export names don't match", async () => {
  await withFixtureCopy("factory-file", async ({ root }) => {
    // Overwrite the factory source so its symbol/export name
    // doesn't contain "Factory" and doesn't start with
    // "create". Path still matches `Factory.ts`, so the
    // path-evidence branch must fire.
    await writeFile(
      join(root, "src/core/services/widgets/WidgetFactory.ts"),
      "export function helper() { return { ok: true }; }\n",
    );
    runCli(["refresh", "--root", root, "--json"]);
    const graph = await readLatest(root, "EvidenceGraph", "evidence");
    await seedFindingReport(root, graph, factoryFinding("factory-pathfb"));
    runCli(["findings", "filter", "--root", root, "--json"]);

    const filterReport = await readLatest(root, "FindingFilterReport", "findings");
    const entry = (filterReport.filteredFindings ?? []).find(
      (row) => row.findingId === "factory-pathfb",
    );
    assert.ok(entry, "factory-pathfb must appear in filteredFindings");
    assert.equal(entry.reason, "factory-file-creates-deps");
    assert.equal(entry.evidenceSource, "DetectorDetails");
    assert.match(entry.evidence, /path-evidence/);
  });
});

// ---------- Test 4: module-gate EvidenceGraph attribution ----------

test("module-gate fixture: EvidenceGraph symbol/export facts attribute the filter as EvidenceGraph", async () => {
  await withFixtureCopy("module-gate", async ({ root }) => {
    runCli(["refresh", "--root", root, "--json"]);
    const graph = await readLatest(root, "EvidenceGraph", "evidence");
    await seedFindingReport(root, graph, moduleGateFinding("modgate-eg"));
    runCli(["findings", "filter", "--root", root, "--json"]);
    runCli(["findings", "filter-health", "--root", root, "--json"]);

    const filterReport = await readLatest(root, "FindingFilterReport", "findings");
    const entry = (filterReport.filteredFindings ?? []).find(
      (row) => row.findingId === "modgate-eg",
    );
    assert.ok(entry, "modgate-eg must appear in filteredFindings");
    assert.equal(entry.reason, "module-gate-verified-caller");
    assert.equal(entry.evidenceSource, "EvidenceGraph");
  });
});

// ---------- Test 5: module-gate evidence string names symbol/export ----------

test("module-gate evidence string names the evaluatePaymentGate symbol/export fact", async () => {
  await withFixtureCopy("module-gate", async ({ root }) => {
    runCli(["refresh", "--root", root, "--json"]);
    const graph = await readLatest(root, "EvidenceGraph", "evidence");
    await seedFindingReport(root, graph, moduleGateFinding("modgate-evname"));
    runCli(["findings", "filter", "--root", root, "--json"]);

    const filterReport = await readLatest(root, "FindingFilterReport", "findings");
    const entry = (filterReport.filteredFindings ?? []).find(
      (row) => row.findingId === "modgate-evname",
    );
    assert.ok(entry, "modgate-evname must appear in filteredFindings");
    assert.match(entry.evidence, /EvidenceGraph/i);
    assert.match(entry.evidence, /evaluatePaymentGate/);
    assert.match(entry.evidence, /gate evaluator role/i);
  });
});

// ---------- Test 6: module-gate ObservedRepo branch (kind=module) ----------

test("module-gate with ObservedSystem.kind=module: ObservedRepo branch fires (ObservedRepo attribution)", async () => {
  await withFixtureCopy("module-gate", async ({ root }) => {
    // Rename + rewrite the source so neither the
    // GateEvaluator path signal nor the EvidenceGraph
    // symbol/export name fires. We want branch B
    // (ObservedSystem.kind=module via OwnershipMap) to
    // be the matching branch.
    await rm(join(root, "src/modules/payments/PaymentGateEvaluator.ts"), { force: true });
    await writeFile(
      join(root, "src/modules/payments/handler.ts"),
      "export function handler() { return { ok: true }; }\n",
    );
    runCli(["refresh", "--root", root, "--json"]);

    // Seed a synthetic OwnershipMap + ObservedRepo that
    // routes the file to a `kind: "module"` system. The
    // CLI's filter pipeline picks up the latest of each
    // type, so writing after refresh is sufficient.
    const file = "src/modules/payments/handler.ts";
    await seedModuleObservedRepo(root, file);

    const graph = await readLatest(root, "EvidenceGraph", "evidence");
    await seedFindingReport(root, graph, moduleGateFindingForFile("modgate-or", file));
    runCli(["findings", "filter", "--root", root, "--json"]);
    runCli(["findings", "filter-health", "--root", root, "--json"]);

    const filterReport = await readLatest(root, "FindingFilterReport", "findings");
    const entry = (filterReport.filteredFindings ?? []).find(
      (row) => row.findingId === "modgate-or",
    );
    assert.ok(entry, "modgate-or must appear in filteredFindings");
    assert.equal(entry.reason, "module-gate-verified-caller");
    assert.equal(entry.evidenceSource, "ObservedRepo");
  });
});

// ---------- Test 7: module-gate path fallback when artifact + ObservedRepo evidence missing ----------

test("module-gate path fallback fires (DetectorDetails) when artifact + ObservedRepo evidence is missing", async () => {
  await withFixtureCopy("module-gate", async ({ root }) => {
    // Same path-fallback scaffolding as test 6 minus the
    // synthetic ObservedRepo — file path includes
    // `/modules/` but doesn't include `GateEvaluator`
    // and the symbol name doesn't match `^evaluate.*Gate`.
    await rm(join(root, "src/modules/payments/PaymentGateEvaluator.ts"), { force: true });
    await writeFile(
      join(root, "src/modules/payments/handler.ts"),
      "export function handler() { return { ok: true }; }\n",
    );
    runCli(["refresh", "--root", root, "--json"]);

    const graph = await readLatest(root, "EvidenceGraph", "evidence");
    await seedFindingReport(
      root,
      graph,
      moduleGateFindingForFile("modgate-pathfb", "src/modules/payments/handler.ts"),
    );
    runCli(["findings", "filter", "--root", root, "--json"]);

    const filterReport = await readLatest(root, "FindingFilterReport", "findings");
    const entry = (filterReport.filteredFindings ?? []).find(
      (row) => row.findingId === "modgate-pathfb",
    );
    assert.ok(entry, "modgate-pathfb must appear in filteredFindings");
    assert.equal(entry.reason, "module-gate-verified-caller");
    assert.equal(entry.evidenceSource, "DetectorDetails");
    assert.match(entry.evidence, /path-only signal/i);
  });
});

// ---------- Test 8: fallback decisions don't cite EvidenceGraph in inputRefs ----------

test("path-fallback decisions do NOT cite EvidenceGraph in FindingFilterReport.header.inputRefs", async () => {
  await withFixtureCopy("factory-file", async ({ root }) => {
    await writeFile(
      join(root, "src/core/services/widgets/WidgetFactory.ts"),
      "export function helper() { return { ok: true }; }\n",
    );
    runCli(["refresh", "--root", root, "--json"]);
    const graph = await readLatest(root, "EvidenceGraph", "evidence");
    await seedFindingReport(root, graph, factoryFinding("factory-fb-norefs"));
    runCli(["findings", "filter", "--root", root, "--json"]);

    const filterReport = await readLatest(root, "FindingFilterReport", "findings");
    const refs = filterReport.header?.inputRefs ?? [];
    const hasEvidenceGraph = refs.some((ref) => ref.type === "EvidenceGraph");
    assert.equal(
      hasEvidenceGraph,
      false,
      `path-fallback filter must not cite EvidenceGraph; got ${JSON.stringify(refs)}`,
    );
  });
});

// ---------- Test 9: EvidenceGraph-backed decisions cite EvidenceGraph in inputRefs ----------

test("EvidenceGraph-backed factory + module-gate filters cite EvidenceGraph in FindingFilterReport.header.inputRefs", async () => {
  for (const { fixture, findingFactory, id } of [
    {
      fixture: "factory-file",
      findingFactory: factoryFinding,
      id: "factory-refs-eg",
    },
    {
      fixture: "module-gate",
      findingFactory: moduleGateFinding,
      id: "modgate-refs-eg",
    },
  ]) {
    await withFixtureCopy(fixture, async ({ root }) => {
      runCli(["refresh", "--root", root, "--json"]);
      const graph = await readLatest(root, "EvidenceGraph", "evidence");
      await seedFindingReport(root, graph, findingFactory(id));
      runCli(["findings", "filter", "--root", root, "--json"]);

      const filterReport = await readLatest(root, "FindingFilterReport", "findings");
      const refs = filterReport.header?.inputRefs ?? [];
      assert.ok(
        refs.some((ref) => ref.type === "EvidenceGraph"),
        `${fixture}: FindingFilterReport.header.inputRefs must include EvidenceGraph`,
      );
    });
  }
});

// ---------- Test 10: ObservedRepo-backed module-gate cites ObservedRepo in inputRefs ----------

test("ObservedRepo-backed module-gate filter cites ObservedRepo in FindingFilterReport.header.inputRefs", async () => {
  await withFixtureCopy("module-gate", async ({ root }) => {
    await rm(join(root, "src/modules/payments/PaymentGateEvaluator.ts"), { force: true });
    await writeFile(
      join(root, "src/modules/payments/handler.ts"),
      "export function handler() { return { ok: true }; }\n",
    );
    runCli(["refresh", "--root", root, "--json"]);
    const file = "src/modules/payments/handler.ts";
    await seedModuleObservedRepo(root, file);

    const graph = await readLatest(root, "EvidenceGraph", "evidence");
    await seedFindingReport(root, graph, moduleGateFindingForFile("modgate-refs-or", file));
    runCli(["findings", "filter", "--root", root, "--json"]);

    const filterReport = await readLatest(root, "FindingFilterReport", "findings");
    const refs = filterReport.header?.inputRefs ?? [];
    assert.ok(
      refs.some((ref) => ref.type === "ObservedRepo"),
      `module-gate ObservedRepo branch must cite ObservedRepo in inputRefs; got ${JSON.stringify(refs)}`,
    );
  });
});

// ---------- Test 11: raw FindingReport remains unchanged across every scenario ----------

test("raw FindingReport remains byte-preserved when artifact-backed filters fire", async () => {
  for (const { fixture, findingFactory, id } of [
    {
      fixture: "factory-file",
      findingFactory: factoryFinding,
      id: "factory-raw",
    },
    {
      fixture: "module-gate",
      findingFactory: moduleGateFinding,
      id: "modgate-raw",
    },
  ]) {
    await withFixtureCopy(fixture, async ({ root }) => {
      runCli(["refresh", "--root", root, "--json"]);
      const graph = await readLatest(root, "EvidenceGraph", "evidence");
      await seedFindingReport(root, graph, findingFactory(id));
      const before = await readLatest(root, "FindingReport", "findings");
      runCli(["findings", "filter", "--root", root, "--json"]);
      const after = await readLatest(root, "FindingReport", "findings");
      const beforeFinding = (before.findings ?? []).find((row) => row.id === id);
      const afterFinding = (after.findings ?? []).find((row) => row.id === id);
      assert.deepEqual(
        beforeFinding,
        afterFinding,
        `${fixture}: raw FindingReport finding must remain byte-equal across filter run`,
      );
    });
  }
});

// ---------- Test 12: lifecycle / adjudication / coherency exclude artifact-backed filtered findings ----------

test("lifecycle / adjudication / coherency exclude EvidenceGraph-backed filtered findings", async () => {
  for (const { fixture, findingFactory, id } of [
    {
      fixture: "factory-file",
      findingFactory: factoryFinding,
      id: "factory-lifecycle",
    },
    {
      fixture: "module-gate",
      findingFactory: moduleGateFinding,
      id: "modgate-lifecycle",
    },
  ]) {
    await withFixtureCopy(fixture, async ({ root }) => {
      runCli(["refresh", "--root", root, "--json"]);
      const graph = await readLatest(root, "EvidenceGraph", "evidence");
      await seedFindingReport(root, graph, findingFactory(id));
      runCli(["findings", "filter", "--root", root, "--json"]);
      runCli(["findings", "lifecycle", "--root", root, "--json"]);
      runCli(["issues", "adjudicate", "--root", root, "--json"]);
      runCli(["coherency", "delta", "--root", root, "--json"]);
      const lifecycle = await readLatest(root, "FindingLifecycleReport", "findings");
      const activeIds = (lifecycle?.activeFindings ?? []).map(
        (row) => row.findingId ?? row.id ?? row.finding?.id,
      );
      assert.ok(
        !activeIds.includes(id),
        `${fixture}: ${id} must not appear in active lifecycle; got ${JSON.stringify(activeIds)}`,
      );
    });
  }
});

// ---------- Test 13: filter-health graphAwareByEvidenceSource counts ----------

test("FindingFilterHealthSummary.graphAwareByEvidenceSource reflects attribution per scenario", async () => {
  // Scenario A: EvidenceGraph attribution (factory fixture as-is).
  await withFixtureCopy("factory-file", async ({ root }) => {
    runCli(["refresh", "--root", root, "--json"]);
    const graph = await readLatest(root, "EvidenceGraph", "evidence");
    await seedFindingReport(root, graph, factoryFinding("hs-eg"));
    runCli(["findings", "filter", "--root", root, "--json"]);
    runCli(["findings", "filter-health", "--root", root, "--json"]);
    const health = await readLatest(root, "FindingFilterHealthReport", "findings");
    const map = health.summary?.graphAwareByEvidenceSource ?? {};
    assert.ok(
      (map.EvidenceGraph ?? 0) >= 1,
      `EvidenceGraph attribution must be >= 1 for factory-file as-is; got ${JSON.stringify(map)}`,
    );
    const perReason = health.summary?.graphAwareReasonEvidenceSources?.["factory-file-creates-deps"] ?? {};
    assert.ok(
      (perReason.EvidenceGraph ?? 0) >= 1,
      `factory-file-creates-deps EvidenceGraph attribution must be >= 1; got ${JSON.stringify(perReason)}`,
    );
  });

  // Scenario B: ObservedRepo attribution (module-gate via
  // synthetic ObservedSystem.kind=module).
  await withFixtureCopy("module-gate", async ({ root }) => {
    await rm(join(root, "src/modules/payments/PaymentGateEvaluator.ts"), { force: true });
    await writeFile(
      join(root, "src/modules/payments/handler.ts"),
      "export function handler() { return { ok: true }; }\n",
    );
    runCli(["refresh", "--root", root, "--json"]);
    const file = "src/modules/payments/handler.ts";
    await seedModuleObservedRepo(root, file);
    const graph = await readLatest(root, "EvidenceGraph", "evidence");
    await seedFindingReport(root, graph, moduleGateFindingForFile("hs-or", file));
    runCli(["findings", "filter", "--root", root, "--json"]);
    runCli(["findings", "filter-health", "--root", root, "--json"]);
    const health = await readLatest(root, "FindingFilterHealthReport", "findings");
    const map = health.summary?.graphAwareByEvidenceSource ?? {};
    assert.ok(
      (map.ObservedRepo ?? 0) >= 1,
      `ObservedRepo attribution must be >= 1 for module-gate ObservedRepo scenario; got ${JSON.stringify(map)}`,
    );
  });

  // Scenario C: DetectorDetails attribution (factory path fallback).
  await withFixtureCopy("factory-file", async ({ root }) => {
    await writeFile(
      join(root, "src/core/services/widgets/WidgetFactory.ts"),
      "export function helper() { return { ok: true }; }\n",
    );
    runCli(["refresh", "--root", root, "--json"]);
    const graph = await readLatest(root, "EvidenceGraph", "evidence");
    await seedFindingReport(root, graph, factoryFinding("hs-dd"));
    runCli(["findings", "filter", "--root", root, "--json"]);
    runCli(["findings", "filter-health", "--root", root, "--json"]);
    const health = await readLatest(root, "FindingFilterHealthReport", "findings");
    const map = health.summary?.graphAwareByEvidenceSource ?? {};
    assert.ok(
      (map.DetectorDetails ?? 0) >= 1,
      `DetectorDetails attribution must be >= 1 for factory path fallback; got ${JSON.stringify(map)}`,
    );
  });
});

// ---------- Test 14: artifacts validate stays clean ----------

test("rekon artifacts validate stays clean across factory + module-gate v3 scenarios", async () => {
  for (const fixture of ["factory-file", "module-gate"]) {
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

// ---------- helpers ----------

async function withFixtureCopy(name, callback) {
  const source = join(fixturesRoot, name);
  const root = await mkdtemp(join(tmpdir(), `rekon-v3-${name}-`));
  try {
    await cp(source, root, { recursive: true });
    runCli(["init", "--root", root, "--json"]);
    await callback({ root });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function seedFindingReport(root, evidenceGraph, finding) {
  const store = createLocalArtifactStore(root);
  await store.init();
  const evidenceRef = evidenceGraph?.header
    ? {
      type: "EvidenceGraph",
      id: evidenceGraph.header.artifactId,
      schemaVersion: evidenceGraph.header.schemaVersion ?? "0.1.0",
    }
    : undefined;
  const report = createFindingReport({
    header: {
      artifactType: "FindingReport",
      artifactId: `v3-finding-report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      schemaVersion: "0.1.0",
      generatedAt: new Date().toISOString(),
      subject: { repoId: "factory-module-gate-v3" },
      producer: { id: "factory-module-gate-v3-test", version: "0.1.0" },
      inputRefs: evidenceRef ? [evidenceRef] : [],
      freshness: { status: "fresh" },
    },
    findings: [finding],
  });
  await store.write(report, { category: "findings" });
}

/**
 * Write a synthetic ObservedRepo + OwnershipMap that route
 * `file` to a `kind: "module"` system. Used by the
 * ObservedRepo-branch tests. Latest-of-type semantics in
 * the runtime mean these win over the model-projector's
 * artifacts.
 */
async function seedModuleObservedRepo(root, file) {
  const store = createLocalArtifactStore(root);
  await store.init();
  const now = new Date().toISOString();
  const baseHeader = {
    schemaVersion: "0.1.0",
    generatedAt: now,
    subject: { repoId: "factory-module-gate-v3" },
    producer: { id: "factory-module-gate-v3-test", version: "0.1.0" },
    inputRefs: [],
    freshness: { status: "fresh" },
  };
  const observedRepo = {
    header: {
      ...baseHeader,
      artifactType: "ObservedRepo",
      artifactId: `synthetic-observed-repo-${Date.now()}`,
    },
    repository: { id: "factory-module-gate-v3", root: "." },
    systems: [
      {
        id: "payments",
        paths: ["src/modules/payments"],
        layers: [],
        capabilities: [],
        confidence: 0.9,
        evidence: [],
        kind: "module",
      },
    ],
    layers: [],
    capabilities: [],
    files: [file],
  };
  const ownershipMap = {
    header: {
      ...baseHeader,
      artifactType: "OwnershipMap",
      artifactId: `synthetic-ownership-map-${Date.now() + 1}`,
    },
    entries: [
      {
        path: "src/modules/payments",
        ownerSystem: "payments",
        confidence: 0.9,
        evidence: [],
      },
    ],
  };
  await store.write(observedRepo, { category: "projections" });
  await store.write(ownershipMap, { category: "projections" });
}

function factoryFinding(id) {
  const file = "src/core/services/widgets/WidgetFactory.ts";
  return {
    id,
    type: "architecture",
    severity: "medium",
    title: "Service instantiates infra (DI)",
    description: `${FACTORY_RULE_ID} rule fired.`,
    subjects: [file],
    files: [file],
    ruleId: FACTORY_RULE_ID,
    details: {},
  };
}

function moduleGateFinding(id) {
  return moduleGateFindingForFile(id, "src/modules/payments/PaymentGateEvaluator.ts");
}

function moduleGateFindingForFile(id, file) {
  return {
    id,
    type: "architecture",
    severity: "medium",
    title: "Module gate must have production caller",
    description: `${MODULE_GATE_RULE_ID} rule fired.`,
    subjects: [file],
    files: [file],
    ruleId: MODULE_GATE_RULE_ID,
    details: {},
  };
}

async function readLatest(root, artifactType, category) {
  const dir = join(root, ".rekon", "artifacts", category);
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
    if (entry.isDirectory()) await walkDir(path, matches, artifactType);
    else if (entry.isFile() && entry.name.startsWith(`${artifactType}-`) && entry.name.endsWith(".json")) {
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
