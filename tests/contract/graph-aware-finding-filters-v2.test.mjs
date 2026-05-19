// Graph-aware finding filter provider v2 — file-existence /
// import-evidence strengthening contract tests.
//
// Covers the v2 strengthening of the five v1 graph-aware
// checks plus the new helpers (`findSiblingFile`,
// `listImportTargetsForFile`, ...) and the precise
// `graphArtifactsUsed` tracking used by the runtime to build
// `FindingFilterReport.header.inputRefs`. The v1 tests in
// `graph-aware-finding-filters.test.mjs` still pin the
// existing behavior; this file pins the *new* behavior so
// regressions show up immediately.

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
  findSiblingFile,
  fileImportsTargetMatching,
  listImportTargetsForFile,
  listObservedRepoFiles,
  normalizeRepoPath,
  observedRepoHasFile,
  sameRepoPath,
  siblingPath,
} from "../../packages/kernel-findings/dist/index.js";
import {
  createCapabilityMap,
  createObservedRepo,
  createOwnershipMap,
} from "../../packages/kernel-repo-model/dist/index.js";
import { createEvidenceGraph, createEvidenceFact } from "../../packages/kernel-evidence/dist/index.js";
import { createLocalArtifactStore } from "../../packages/runtime/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- Test 1: helpers ----------

test("v2 findSiblingFile + siblingPath normalize paths and find sibling handler.ts", () => {
  const ctx = {
    observedRepo: {
      files: [
        "src/api/widgets/handler.ts",
        "src/api/widgets/route.ts",
        "src/api/things/route.ts",
      ],
    },
  };
  // siblingPath resolves dir.
  assert.equal(siblingPath("./src/api/widgets/route.ts", "handler.ts"), "src/api/widgets/handler.ts");
  // findSiblingFile uses ObservedRepo, regardless of whether
  // the input path has a `./` prefix or backslashes.
  assert.equal(
    findSiblingFile(ctx, "./src/api/widgets/route.ts", "handler.ts"),
    "src/api/widgets/handler.ts",
  );
  assert.equal(
    findSiblingFile(ctx, "src\\api\\widgets\\route.ts", "handler.ts"),
    "src/api/widgets/handler.ts",
  );
  // Conservative: no match returns undefined.
  assert.equal(findSiblingFile(ctx, "src/api/orphans/route.ts", "handler.ts"), undefined);

  // Path safety: absolute / .rekon/ paths normalize to "".
  assert.equal(normalizeRepoPath("/abs/leak.ts"), "");
  assert.equal(normalizeRepoPath(".rekon/artifacts/findings/FindingReport.json"), "");
  assert.equal(normalizeRepoPath("./src/api/route.ts"), "src/api/route.ts");

  // sameRepoPath ignores `./` and backslashes.
  assert.equal(sameRepoPath("./src/api/route.ts", "src\\api\\route.ts"), true);

  // listObservedRepoFiles + observedRepoHasFile.
  assert.deepEqual(listObservedRepoFiles(ctx), [
    "src/api/things/route.ts",
    "src/api/widgets/handler.ts",
    "src/api/widgets/route.ts",
  ]);
  assert.equal(observedRepoHasFile(ctx, "./src/api/widgets/handler.ts"), true);
  assert.equal(observedRepoHasFile(ctx, "src/missing.ts"), false);

  // listImportTargetsForFile + fileImportsTargetMatching.
  const importCtx = {
    evidenceGraph: {
      facts: [
        { kind: "import", subject: "src/api/widgets/route.ts", value: { target: "./handler" } },
        { kind: "import", subject: "src/api/widgets/route.ts", value: { target: "/infra/http/middleware" } },
        { kind: "import", subject: "src/other.ts", value: { target: "leftpad" } },
      ],
    },
  };
  assert.deepEqual(listImportTargetsForFile(importCtx, "src/api/widgets/route.ts"), [
    "./handler",
    "/infra/http/middleware",
  ]);
  assert.deepEqual(
    fileImportsTargetMatching(
      importCtx,
      "src/api/widgets/route.ts",
      (target) => target.includes("/handler"),
    ),
    ["./handler"],
  );
});

// ---------- Test 2: route handler via ObservedRepo.files sibling ----------

test("v2 route handler check filters by ObservedRepo.files sibling handler when details.imports absent", () => {
  const finding = architecture("rh-sibling", "routes.construct_and_inject_deps", {
    files: ["src/api/widgets/route.ts"],
    details: {},
  });
  const decision = applyFindingGraphFilters({
    finding,
    graphContext: {
      observedRepo: {
        files: ["src/api/widgets/handler.ts", "src/api/widgets/route.ts"],
      },
    },
  });
  assert.ok(decision);
  assert.equal(decision.reason, "route-handler-with-service");
  assert.equal(decision.confidence, "high");
  assert.match(decision.evidence, /sibling handler file/i);
  assert.deepEqual(decision.usedArtifacts, ["ObservedRepo"]);
});

// ---------- Test 3: route handler via EvidenceGraph (v2 NEW) ----------

test("v2 route handler check filters by EvidenceGraph import fact when details.imports absent", () => {
  const finding = architecture("rh-evgraph", "routes.construct_and_inject_deps", {
    files: ["src/api/widgets/route.ts"],
    details: {},
  });
  const decision = applyFindingGraphFilters({
    finding,
    graphContext: {
      evidenceGraph: {
        facts: [
          {
            kind: "import",
            subject: "src/api/widgets/route.ts",
            value: { target: "./handler" },
          },
        ],
      },
    },
  });
  assert.ok(decision);
  assert.equal(decision.reason, "route-handler-with-service");
  assert.equal(decision.confidence, "high");
  assert.match(decision.evidence, /EvidenceGraph import fact/i);
  assert.deepEqual(decision.usedArtifacts, ["EvidenceGraph"]);
});

// ---------- Test 4: route handler conservative no-op ----------

test("v2 route handler check does not filter when no import evidence and no sibling file", () => {
  const finding = architecture("rh-noop", "routes.construct_and_inject_deps", {
    files: ["src/api/orphans/route.ts"],
    details: {},
  });
  const decision = applyFindingGraphFilters({
    finding,
    // ObservedRepo lacks any handler sibling; EvidenceGraph
    // has no import facts for this file.
    graphContext: {
      observedRepo: { files: ["src/api/orphans/route.ts", "src/api/other/handler.ts"] },
      evidenceGraph: { facts: [] },
    },
  });
  assert.equal(decision, null);
});

// ---------- Test 5: route HTTP middleware-only via EvidenceGraph ----------

test("v2 route HTTP middleware-only uses EvidenceGraph import facts and filters allowed infra imports", () => {
  const finding = architecture("rm-graph", "routes.construct_and_inject_deps", {
    files: ["src/api/widgets/route.ts"],
    details: {},
  });
  const decision = applyFindingGraphFilters({
    finding,
    graphContext: {
      evidenceGraph: {
        facts: [
          { kind: "import", subject: "src/api/widgets/route.ts", value: { target: "/infra/http/middleware/logger" } },
          { kind: "import", subject: "src/api/widgets/route.ts", value: { target: "/infra/Identity/auth" } },
        ],
      },
    },
  });
  assert.ok(decision);
  assert.equal(decision.reason, "route-http-middleware-only");
  assert.equal(decision.confidence, "high");
  assert.match(decision.evidence, /EvidenceGraph import facts/i);
  assert.deepEqual(decision.usedArtifacts, ["EvidenceGraph"]);
});

// ---------- Test 6: route HTTP middleware-only is conservative ----------

test("v2 route HTTP middleware-only does not filter when a non-allowed infra import exists (per EvidenceGraph)", () => {
  const finding = architecture("rm-mixed", "routes.construct_and_inject_deps", {
    files: ["src/api/widgets/route.ts"],
    details: {},
  });
  const decision = applyFindingGraphFilters({
    finding,
    graphContext: {
      evidenceGraph: {
        facts: [
          { kind: "import", subject: "src/api/widgets/route.ts", value: { target: "/infra/http/middleware/logger" } },
          { kind: "import", subject: "src/api/widgets/route.ts", value: { target: "/infra/Database/pg" } },
        ],
      },
    },
  });
  assert.equal(decision, null);
});

// ---------- Test 7: external-api-comment-only via EvidenceGraph ----------

test("v2 external API comment-only uses EvidenceGraph import facts to filter when no external API imports exist", () => {
  const finding = architecture("ea-graph", "external_apis.calls_go_through_providers", {
    files: ["src/api/widgets/util.ts"],
    details: {},
  });
  const decision = applyFindingGraphFilters({
    finding,
    graphContext: {
      evidenceGraph: {
        facts: [
          { kind: "import", subject: "src/api/widgets/util.ts", value: { target: "leftpad" } },
          { kind: "import", subject: "src/api/widgets/util.ts", value: { target: "./helper" } },
        ],
      },
    },
  });
  assert.ok(decision);
  assert.equal(decision.reason, "external-api-comment-only");
  assert.equal(decision.confidence, "high");
  assert.match(decision.evidence, /EvidenceGraph import facts/i);
  assert.deepEqual(decision.usedArtifacts, ["EvidenceGraph"]);
});

// ---------- Test 8: external-api-comment-only is conservative ----------

test("v2 external API comment-only does not filter when openai/openrouter import exists (per EvidenceGraph)", () => {
  const finding = architecture("ea-openai", "external_apis.calls_go_through_providers", {
    files: ["src/api/widgets/util.ts"],
    details: {},
  });
  const decision = applyFindingGraphFilters({
    finding,
    graphContext: {
      evidenceGraph: {
        facts: [
          { kind: "import", subject: "src/api/widgets/util.ts", value: { target: "openai" } },
        ],
      },
    },
  });
  assert.equal(decision, null);
});

// ---------- Test 9: factory file path evidence ----------

test("v2 factory file check evidence distinguishes path evidence (no graph artifacts used)", () => {
  const finding = architecture("f-path", "dependency_injection.services_must_not_call_factories", {
    files: ["src/init/serviceFactory.ts"],
    details: {},
  });
  const decision = applyFindingGraphFilters({
    finding,
    graphContext: {},
  });
  assert.ok(decision);
  assert.equal(decision.reason, "factory-file-creates-deps");
  assert.equal(decision.confidence, "high");
  assert.match(decision.evidence, /path-evidence/i);
  // Pure path-evidence — no graph artifact contributed.
  assert.deepEqual(decision.usedArtifacts, []);
});

// ---------- Test 10: module-gate GateEvaluator high confidence ----------

test("v2 module gate check prefers GateEvaluator high-confidence evidence", () => {
  const finding = architecture("mg-eval", "architecture.gates.must_have_production_caller", {
    files: ["src/auth/GateEvaluator.ts"],
    details: {},
  });
  const decision = applyFindingGraphFilters({
    finding,
    graphContext: {},
  });
  assert.ok(decision);
  assert.equal(decision.reason, "module-gate-verified-caller");
  assert.equal(decision.confidence, "high");
  assert.match(decision.evidence, /GateEvaluator|evaluator path/i);
  assert.deepEqual(decision.usedArtifacts, []);
});

// ---------- Test 11: module-gate ObservedSystem.kind ----------

test("v2 module gate check prefers ObservedSystem.kind = module over /modules/ path heuristic", () => {
  const filePath = "src/modules/auth/callerCheck.ts";
  const finding = architecture("mg-kind", "architecture.gates.modules_must_not_create_custom_scopes", {
    files: [filePath],
    details: {},
  });
  // File path includes `/modules/` (path heuristic could
  // match) AND OwnershipMap routes it to a module-kind
  // ObservedSystem. v2 should pick the kind-based evidence
  // because it's structural, not just path-shaped.
  const decision = applyFindingGraphFilters({
    finding,
    graphContext: {
      observedRepo: {
        systems: [{ id: "auth", kind: "module" }],
      },
      ownershipMap: {
        entries: [{ path: filePath, ownerSystem: "auth" }],
      },
    },
  });
  assert.ok(decision);
  assert.equal(decision.reason, "module-gate-verified-caller");
  assert.equal(decision.confidence, "medium");
  assert.match(decision.evidence, /kind\s+"?module"?/i);
  // Strengthened evidence consults OwnershipMap and the
  // ObservedRepo system list.
  assert.deepEqual([...decision.usedArtifacts].sort(), ["ObservedRepo", "OwnershipMap"]);
});

// ---------- Test 12: missing graph context conservative no-op ----------

test("v2 missing graph context remains conservative no-op across all strengthened checks", () => {
  const cases = [
    ["routes.construct_and_inject_deps", "src/api/route.ts"],
    ["external_apis.calls_go_through_providers", "src/api/util.ts"],
    ["architecture.gates.modules_must_not_create_custom_scopes", "src/notmodule/file.ts"],
  ];
  for (const [ruleId, file] of cases) {
    const decision = applyFindingGraphFilters({
      finding: architecture("noop", ruleId, { files: [file], details: {} }),
      graphContext: {},
    });
    assert.equal(decision, null, `Expected no-op for ${ruleId}`);
  }
});

// ---------- Test 13: applyFindingFilters returns graphArtifactsUsed ----------

test("v2 applyFindingFilters returns graphArtifactsUsed sorted + deduped", () => {
  const findings = [
    architecture("f-route-sibling", "routes.construct_and_inject_deps", {
      files: ["src/api/widgets/route.ts"],
      details: {},
    }),
    architecture("f-external-graph", "external_apis.calls_go_through_providers", {
      files: ["src/api/widgets/util.ts"],
      details: {},
    }),
  ];
  const result = applyFindingFilters({
    findings,
    graphContext: {
      observedRepo: {
        files: ["src/api/widgets/handler.ts", "src/api/widgets/route.ts"],
      },
      evidenceGraph: {
        facts: [
          { kind: "import", subject: "src/api/widgets/util.ts", value: { target: "leftpad" } },
        ],
      },
    },
  });
  assert.equal(result.filteredFindings.length, 2);
  // Sorted ascending by artifact type name.
  assert.deepEqual(result.graphArtifactsUsed, ["EvidenceGraph", "ObservedRepo"]);
});

// ---------- Test 14: FindingFilterReport inputRefs cite ObservedRepo ----------

test("v2 FindingFilterReport inputRefs include ObservedRepo when sibling-file evidence used", async () => {
  await withSeededSiblingFixture(async ({ root }) => {
    runCli(["findings", "filter", "--root", root, "--json"]);
    const report = await readLatestArtifactJson(root, "FindingFilterReport");
    assert.ok(report);
    const matched = report.filteredFindings.find((entry) => entry.findingId === "graph-route-v2-sibling");
    assert.ok(matched, "graph-route-v2-sibling must be filtered");
    assert.equal(matched.reason, "route-handler-with-service");
    const refs = report.header.inputRefs ?? [];
    assert.ok(
      refs.some((ref) => ref.type === "ObservedRepo"),
      "inputRefs must include ObservedRepo when sibling-file evidence used",
    );
    // EvidenceGraph was not consulted (the kernel found the
    // sibling first). v2 precise tracking should not cite
    // EvidenceGraph in this run.
    assert.equal(
      refs.filter((ref) => ref.type === "EvidenceGraph").length,
      0,
      "inputRefs must not cite EvidenceGraph when only sibling-file evidence was used",
    );
  });
});

// ---------- Test 15: FindingFilterReport inputRefs cite EvidenceGraph ----------

test("v2 FindingFilterReport inputRefs include EvidenceGraph when import-evidence used", async () => {
  await withSeededEvidenceGraphFixture(async ({ root }) => {
    runCli(["findings", "filter", "--root", root, "--json"]);
    const report = await readLatestArtifactJson(root, "FindingFilterReport");
    assert.ok(report);
    const matched = report.filteredFindings.find((entry) => entry.findingId === "graph-external-v2");
    assert.ok(matched, "graph-external-v2 must be filtered");
    assert.equal(matched.reason, "external-api-comment-only");
    const refs = report.header.inputRefs ?? [];
    assert.ok(
      refs.some((ref) => ref.type === "EvidenceGraph"),
      "inputRefs must include EvidenceGraph when import evidence was used",
    );
  });
});

// ---------- Test 16: raw FindingReport remains unchanged ----------

test("v2 raw FindingReport remains unchanged after strengthened graph-aware filtering", async () => {
  await withSeededSiblingFixture(async ({ root }) => {
    const findingsDir = join(root, ".rekon", "artifacts", "findings");
    const reportFiles = (await readdir(findingsDir))
      .filter((name) => name.startsWith("FindingReport-"))
      .sort();
    const target = join(findingsDir, reportFiles[reportFiles.length - 1]);
    const before = await readFile(target, "utf8");
    runCli(["findings", "filter", "--root", root, "--json"]);
    const after = await readFile(target, "utf8");
    assert.equal(after, before, "FindingReport must remain byte-identical");
  });
});

// ---------- Test 17: lifecycle / adjudication / coherency exclude strengthened graph-filtered findings ----------

test("v2 lifecycle / adjudication / coherency exclude strengthened graph-filtered findings + artifacts validate stays clean", async () => {
  await withSeededSiblingFixture(async ({ root }) => {
    runCli(["findings", "filter", "--root", root, "--json"]);
    runCli(["findings", "lifecycle", "--root", root, "--json"]);
    runCli(["issues", "adjudicate", "--root", root, "--json"]);
    runCli(["coherency", "delta", "--root", root, "--json"]);
    const lifecycle = await readLatestArtifactJson(root, "FindingLifecycleReport");
    const activeIds = (lifecycle?.activeFindings ?? []).map(
      (entry) => entry.findingId ?? entry.id ?? entry.finding?.id,
    );
    assert.ok(
      !activeIds.includes("graph-route-v2-sibling"),
      `graph-route-v2-sibling must not be in active lifecycle, got ${JSON.stringify(activeIds)}`,
    );
    const validate = JSON.parse(
      runCli(["artifacts", "validate", "--root", root, "--json"]).stdout,
    );
    assert.equal(validate.valid, true);
    assert.deepEqual(validate.issues ?? [], []);
  });
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
  const root = await mkdtemp(join(tmpdir(), "rekon-graph-filter-v2-"));
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

async function withSeededSiblingFixture(callback) {
  // Seeds a synthetic ObservedRepo with route.ts + handler.ts
  // sibling so the v2 route-handler-with-service check fires
  // via ObservedRepo.files (NOT details.imports, NOT
  // EvidenceGraph). Use this fixture to assert
  // ObservedRepo-only inputRefs precision.
  await withFreshWorkspace(async ({ root }) => {
    runCli(["refresh", "--root", root, "--json"]);

    const store = createLocalArtifactStore(root);
    await store.init();

    const observed = createObservedRepo({
      header: header("ObservedRepo"),
      repository: { id: "graph-v2-seed", root: "." },
      systems: [
        {
          id: "synthetic",
          paths: ["src/api/widgets/route.ts"],
          layers: [],
          capabilities: [],
          confidence: 0.9,
          evidence: [],
        },
      ],
      layers: [],
      capabilities: [],
      files: ["src/api/widgets/route.ts", "src/api/widgets/handler.ts"],
    });
    await store.write(observed, { category: "graphs" });

    const findingReport = createFindingReport({
      header: {
        ...header("FindingReport"),
        artifactId: `graph-v2-seed-${Date.now()}`,
      },
      findings: [
        {
          id: "graph-route-v2-sibling",
          type: "architecture",
          severity: "medium",
          title: "Route should construct deps",
          description: "Route construct and inject deps rule fired.",
          subjects: ["src/api/widgets/route.ts"],
          files: ["src/api/widgets/route.ts"],
          ruleId: "routes.construct_and_inject_deps",
        },
      ],
    });
    await store.write(findingReport, { category: "findings" });

    await callback({ root });
  });
}

async function withSeededEvidenceGraphFixture(callback) {
  // Seeds a synthetic EvidenceGraph with non-external-API
  // import facts so the v2 external-api-comment-only check
  // fires via EvidenceGraph (NOT details.imports). Use this
  // fixture to assert EvidenceGraph inputRefs precision.
  await withFreshWorkspace(async ({ root }) => {
    runCli(["refresh", "--root", root, "--json"]);

    const store = createLocalArtifactStore(root);
    await store.init();

    const graph = createEvidenceGraph({
      header: header("EvidenceGraph"),
      facts: [
        createEvidenceFact({
          id: "fact-v2-1",
          kind: "import",
          subject: "src/api/widgets/util.ts",
          value: { target: "leftpad" },
          confidence: 0.9,
          provenance: {
            source: "test-fixture",
            pack: "graph-aware-v2-tests",
            file: "src/api/widgets/util.ts",
            extractorVersion: "0.1.0",
          },
        }),
        createEvidenceFact({
          id: "fact-v2-2",
          kind: "import",
          subject: "src/api/widgets/util.ts",
          value: { target: "./helper" },
          confidence: 0.9,
          provenance: {
            source: "test-fixture",
            pack: "graph-aware-v2-tests",
            file: "src/api/widgets/util.ts",
            extractorVersion: "0.1.0",
          },
        }),
      ],
    });
    await store.write(graph, { category: "graphs" });

    const findingReport = createFindingReport({
      header: {
        ...header("FindingReport"),
        artifactId: `graph-v2-eg-seed-${Date.now()}`,
      },
      findings: [
        {
          id: "graph-external-v2",
          type: "architecture",
          severity: "medium",
          title: "External API call",
          description: "External API call should go through providers.",
          subjects: ["src/api/widgets/util.ts"],
          files: ["src/api/widgets/util.ts"],
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
