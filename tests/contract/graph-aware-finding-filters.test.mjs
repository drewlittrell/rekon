import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";
import {
  applyFindingFilters,
  applyFindingGraphFilters,
  createFindingReport,
} from "../../packages/kernel-findings/dist/index.js";
import {
  createCapabilityMap,
  createObservedRepo,
  createOwnershipMap,
} from "../../packages/kernel-repo-model/dist/index.js";
import { createLocalArtifactStore } from "../../packages/runtime/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- repo-model projection tests ----------

test("ObservedRepo.files is populated and sorted from createObservedRepo input", () => {
  const observed = createObservedRepo({
    header: header("ObservedRepo"),
    repository: { id: "synthetic", root: "." },
    systems: [],
    layers: [],
    capabilities: [],
    files: ["src/zeta.ts", "src/alpha.ts", "src/middle.ts"],
  });
  assert.deepEqual(observed.files, [
    "src/alpha.ts",
    "src/middle.ts",
    "src/zeta.ts",
  ]);
});

test("ObservedRepo.files excludes `.rekon/` artifact paths and absolute paths", () => {
  const observed = createObservedRepo({
    header: header("ObservedRepo"),
    repository: { id: "synthetic", root: "." },
    systems: [],
    layers: [],
    capabilities: [],
    files: [
      "src/keep.ts",
      ".rekon/artifacts/findings/FindingReport.json",
      "/absolute/path/leak.ts",
      "src/another.ts",
    ],
  });
  assert.deepEqual(observed.files, ["src/another.ts", "src/keep.ts"]);
});

test("ObservedSystem.kind is optional and survives normalization", () => {
  const observed = createObservedRepo({
    header: header("ObservedRepo"),
    repository: { id: "synthetic", root: "." },
    systems: [
      {
        id: "auth",
        paths: ["src/auth/handler.ts"],
        layers: [],
        capabilities: [],
        confidence: 0.9,
        evidence: [],
        kind: "module",
      },
    ],
    layers: [],
    capabilities: [],
  });
  assert.equal(observed.systems[0].kind, "module");
});

test("OwnershipMap + CapabilityMap accept synthetic entries via existing creators", () => {
  const ownership = createOwnershipMap({
    header: header("OwnershipMap"),
    entries: [
      {
        path: "src/auth/handler.ts",
        ownerSystem: "auth",
        confidence: 0.9,
        evidence: [],
      },
    ],
  });
  assert.equal(ownership.entries.length, 1);

  const capabilities = createCapabilityMap({
    header: header("CapabilityMap"),
    entries: [
      {
        capability: "factory.init",
        subjects: ["src/init/serviceFactory.ts"],
        systems: ["init"],
        confidence: 0.8,
        evidence: [],
      },
    ],
  });
  assert.equal(capabilities.entries.length, 1);
});

// ---------- graph filter pure-helper tests ----------

test("A: route.ts with sibling handler.ts filters route-handler-with-service via ObservedRepo.files", () => {
  const finding = architecture("rh-1", "routes.construct_and_inject_deps", {
    files: ["src/api/widgets/route.ts"],
    details: {},
  });
  const observedRepo = {
    files: [
      "src/api/widgets/handler.ts",
      "src/api/widgets/route.ts",
    ],
  };
  const decision = applyFindingGraphFilters({
    finding,
    graphContext: { observedRepo },
  });
  assert.ok(decision);
  assert.equal(decision.reason, "route-handler-with-service");
  assert.match(decision.evidence, /sibling handler file/i);
});

test("A: route.ts importing /handler filters route-handler-with-service via details.imports", () => {
  const finding = architecture("rh-2", "routes.construct_and_inject_deps", {
    files: ["src/api/widgets/route.ts"],
    details: { imports: ["./handler"] },
  });
  const decision = applyFindingGraphFilters({
    finding,
    graphContext: {},
  });
  assert.ok(decision);
  assert.equal(decision.reason, "route-handler-with-service");
  assert.match(decision.evidence, /import/i);
});

test("B: route.ts importing only infra/http and Identity filters route-http-middleware-only", () => {
  const finding = architecture("rh-3", "routes.construct_and_inject_deps", {
    files: ["src/api/widgets/route.ts"],
    details: {
      imports: ["src/infra/http/middleware", "src/infra/Identity"],
    },
  });
  const decision = applyFindingGraphFilters({
    finding,
    graphContext: {},
  });
  assert.ok(decision);
  assert.equal(decision.reason, "route-http-middleware-only");
});

test("C: external-API comment-only filters when graph imports lack openai-family SDKs", () => {
  const filePath = "src/notes/openai-mention.ts";
  const finding = architecture("ext-1", "external_apis.calls_go_through_providers", {
    files: [filePath],
    details: { imports: [] },
  });
  const evidenceGraph = {
    facts: [
      { kind: "import", subject: filePath, value: { target: "./helpers" } },
      { kind: "import", subject: filePath, value: { target: "src/lib/string-utils" } },
    ],
  };
  const decision = applyFindingGraphFilters({
    finding,
    graphContext: { evidenceGraph },
  });
  assert.ok(decision);
  assert.equal(decision.reason, "external-api-comment-only");
});

test("D: factory file filters factory-file-creates-deps via path evidence", () => {
  const finding = architecture("f-1", "dependency_injection.services_must_not_call_factories", {
    files: ["src/services/UserFactory.ts"],
    details: {},
  });
  const decision = applyFindingGraphFilters({
    finding,
    graphContext: {},
  });
  assert.ok(decision);
  assert.equal(decision.reason, "factory-file-creates-deps");
});

test("D: factory file filters factory-file-creates-deps via CapabilityMap evidence (medium confidence)", () => {
  const finding = architecture(
    "f-2",
    "dependency_injection.services_must_not_instantiate_infra",
    {
      files: ["src/init/serviceLoader.ts"],
      details: {},
    },
  );
  const capabilityMap = {
    entries: [
      {
        capability: "factory.init",
        subjects: ["src/init/serviceLoader.ts"],
        systems: ["init"],
      },
    ],
  };
  const decision = applyFindingGraphFilters({
    finding,
    graphContext: { capabilityMap },
  });
  assert.ok(decision);
  assert.equal(decision.reason, "factory-file-creates-deps");
  assert.equal(decision.confidence, "medium");
});

test("E: module GateEvaluator path filters module-gate-verified-caller (high confidence)", () => {
  const finding = architecture(
    "m-1",
    "architecture.gates.must_have_production_caller",
    {
      files: ["src/auth/GateEvaluator.ts"],
      details: {},
    },
  );
  const decision = applyFindingGraphFilters({
    finding,
    graphContext: {},
  });
  assert.ok(decision);
  assert.equal(decision.reason, "module-gate-verified-caller");
  assert.equal(decision.confidence, "high");
});

test("E: module gate filters when OwnershipMap routes to a module-kind ObservedSystem", () => {
  const filePath = "src/auth/callerCheck.ts";
  const finding = architecture(
    "m-2",
    "architecture.gates.modules_must_not_create_custom_scopes",
    {
      files: [filePath],
      details: {},
    },
  );
  const decision = applyFindingGraphFilters({
    finding,
    graphContext: {
      observedRepo: {
        systems: [{ id: "auth", kind: "module" }],
      },
      ownershipMap: {
        entries: [
          { path: filePath, ownerSystem: "auth" },
        ],
      },
    },
  });
  assert.ok(decision);
  assert.equal(decision.reason, "module-gate-verified-caller");
});

test("graph filters are conservative no-op when graphContext is empty", () => {
  const finding = architecture("nope-1", "routes.construct_and_inject_deps", {
    files: ["src/api/widgets/route.ts"],
    details: {},
  });
  const decision = applyFindingGraphFilters({
    finding,
    graphContext: {},
  });
  assert.equal(decision, null);
});

test("applyFindingFilters with graphContext records sibling-handler match in filteredFindings", () => {
  const finding = architecture("rh-pipe", "routes.construct_and_inject_deps", {
    files: ["src/api/widgets/route.ts"],
    details: {},
  });
  const result = applyFindingFilters({
    findings: [finding],
    graphContext: {
      observedRepo: {
        files: ["src/api/widgets/handler.ts", "src/api/widgets/route.ts"],
      },
    },
  });
  assert.equal(result.keptFindings.length, 0);
  assert.equal(result.filteredFindings.length, 1);
  const entry = result.filteredFindings[0];
  assert.equal(entry.reason, "route-handler-with-service");
  assert.equal(entry.source, "system");
  assert.ok(typeof entry.evidence === "string" && entry.evidence.length > 0);
  assert.equal(entry.confidence, "high");
  assert.ok(typeof entry.filteredAt === "string");
});

test("applyFindingFilters without graphContext leaves graph-applicable findings active", () => {
  const finding = architecture("rh-noop", "routes.construct_and_inject_deps", {
    files: ["src/api/widgets/route.ts"],
    details: {},
  });
  const result = applyFindingFilters({ findings: [finding] });
  assert.equal(result.filteredFindings.length, 0);
  assert.equal(result.keptFindings.length, 1);
});

// ---------- end-to-end CLI tests ----------

test("rekon refresh produces ObservedRepo with a populated files projection", async () => {
  await withFreshWorkspace(async ({ root }) => {
    runCli(["refresh", "--root", root, "--json"]);
    const observed = await readLatestArtifactJson(root, "ObservedRepo");
    assert.ok(observed, "ObservedRepo must exist after refresh");
    assert.ok(Array.isArray(observed.files), "ObservedRepo.files must be present");
    assert.ok(observed.files.length > 0, "ObservedRepo.files must not be empty");
    assert.ok(
      observed.files.every((path) => !path.includes("/.rekon/") && !path.startsWith(".rekon/")),
      "ObservedRepo.files must not include .rekon paths",
    );
  });
});

test("rekon findings filter cites ObservedRepo when a sibling-handler match fires", async () => {
  await withSeededFixture(async ({ root }) => {
    runCli(["findings", "filter", "--root", root, "--json"]);
    const report = await readLatestArtifactJson(root, "FindingFilterReport");
    assert.ok(report, "FindingFilterReport must exist");
    const matched = report.filteredFindings.find(
      (entry) => entry.findingId === "graph-route-1",
    );
    assert.ok(matched, "graph-route-1 must appear in filteredFindings");
    assert.equal(matched.reason, "route-handler-with-service");
    const observedRefs = (report.header.inputRefs ?? []).filter(
      (ref) => ref.type === "ObservedRepo",
    );
    assert.ok(
      observedRefs.length > 0,
      "FindingFilterReport.header.inputRefs must include ObservedRepo when a graph-aware match used it",
    );
  });
});

test("lifecycle / adjudication / coherency exclude graph-filtered findings", async () => {
  await withSeededFixture(async ({ root }) => {
    runCli(["findings", "filter", "--root", root, "--json"]);
    runCli(["findings", "lifecycle", "--root", root, "--json"]);
    runCli(["issues", "adjudicate", "--root", root, "--json"]);
    runCli(["coherency", "delta", "--root", root, "--json"]);
    const lifecycle = await readLatestArtifactJson(root, "FindingLifecycleReport");
    const activeIds = (lifecycle?.activeFindings ?? []).map((entry) =>
      entry.findingId ?? entry.id ?? entry.finding?.id,
    );
    assert.ok(
      !activeIds.includes("graph-route-1"),
      `graph-route-1 must not be in active lifecycle, got ${JSON.stringify(activeIds)}`,
    );
  });
});

test("raw FindingReport remains unchanged after graph-aware filtering", async () => {
  await withSeededFixture(async ({ root }) => {
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

test("rekon artifacts validate stays clean after graph-aware filtering", async () => {
  await withSeededFixture(async ({ root }) => {
    runCli(["findings", "filter", "--root", root, "--json"]);
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
  const root = await mkdtemp(join(tmpdir(), "rekon-graph-filter-v1-"));
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

async function withSeededFixture(callback) {
  await withFreshWorkspace(async ({ root }) => {
    runCli(["refresh", "--root", root, "--json"]);

    const store = createLocalArtifactStore(root);
    await store.init();

    // Seed an `ObservedRepo` that includes synthetic
    // route.ts + sibling handler.ts so the graph-aware
    // sibling check has something to fire on. We overlay
    // on top of the just-refreshed ObservedRepo by writing
    // a new one — the runtime reads the latest.
    const observed = createObservedRepo({
      header: header("ObservedRepo"),
      repository: { id: "graph-seed", root: "." },
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

    // Seed a FindingReport with one architecture finding
    // that should match the route-handler-with-service
    // graph filter (no `details.imports` so only the
    // sibling-file path can prove it).
    const ev = (await store.list("EvidenceGraph"))
      .slice()
      .sort((left, right) => right.writtenAt.localeCompare(left.writtenAt))[0];
    const om = (await store.list("OwnershipMap"))
      .slice()
      .sort((left, right) => right.writtenAt.localeCompare(left.writtenAt))[0];
    const inputRefs = [];
    if (ev) inputRefs.push({ type: ev.type, id: ev.id, schemaVersion: ev.schemaVersion });
    if (om) inputRefs.push({ type: om.type, id: om.id, schemaVersion: om.schemaVersion });

    const findingReport = createFindingReport({
      header: {
        ...header("FindingReport"),
        artifactId: `graph-seed-${Date.now()}`,
        inputRefs,
      },
      findings: [
        {
          id: "graph-route-1",
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

async function readLatestArtifactJson(root, artifactType) {
  // Walk the workspace `.rekon/artifacts` tree (categories vary)
  // and find the most recent matching file.
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
