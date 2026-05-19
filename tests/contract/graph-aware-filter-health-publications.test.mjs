import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";
import {
  buildFindingFilterHealth,
  createFindingReport,
  isGraphAwareFiltered,
  isClassicContentFiltered,
  isPolicyFiltered,
} from "../../packages/kernel-findings/dist/index.js";
import {
  createObservedRepo,
} from "../../packages/kernel-repo-model/dist/index.js";
import { createLocalArtifactStore } from "../../packages/runtime/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

const GRAPH_AWARE_REASONS = [
  "route-handler-with-service",
  "route-http-middleware-only",
  "external-api-comment-only",
  "factory-file-creates-deps",
  "module-gate-verified-caller",
];

// ---------- classifier tests ----------

test("isGraphAwareFiltered returns true for the five graph-aware reasons", () => {
  for (const reason of GRAPH_AWARE_REASONS) {
    const entry = filteredEntry("g", reason, "system");
    assert.equal(
      isGraphAwareFiltered(entry),
      true,
      `expected ${reason} to classify as graph-aware`,
    );
  }
});

test("policy-filtered entries with graph-aware reason classify as policy, not graph-aware", () => {
  const entry = filteredEntry("p", "route-handler-with-service", "policy", {
    policyId: "operator-rule",
  });
  assert.equal(isPolicyFiltered(entry), true);
  assert.equal(isGraphAwareFiltered(entry), false);
  // Also confirm content classifier doesn't claim it either.
  assert.equal(isClassicContentFiltered(entry), false);
});

test("contentFiltered no longer includes graph-aware reasons", () => {
  // A system-source entry with a graph-aware reason should NOT
  // be classified as content. The five graph-aware reasons used
  // to live in the classic content set pre-surfacing.
  for (const reason of GRAPH_AWARE_REASONS) {
    const entry = filteredEntry("c", reason, "system");
    assert.equal(
      isClassicContentFiltered(entry),
      false,
      `expected ${reason} to NOT classify as classic content`,
    );
  }
});

// ---------- health summary tests ----------

test("filter-health summary includes graphAwareFiltered count", () => {
  const report = makeFilterReport({
    kept: 1,
    filtered: [
      filteredEntry("a", "route-handler-with-service", "system"),
      filteredEntry("b", "module-gate-verified-caller", "system"),
      filteredEntry("c", "empty-constructor-stub", "system"),
    ],
  });
  const { summary } = buildFindingFilterHealth({ filterReport: report });
  assert.equal(summary.graphAwareFiltered, 2);
});

test("bucket counts sum to totalFiltered", () => {
  const report = makeFilterReport({
    kept: 0,
    filtered: [
      filteredEntry("p1", "policy-exception", "policy", { policyId: "p" }),
      filteredEntry("g1", "route-handler-with-service", "system"),
      filteredEntry("c1", "empty-constructor-stub", "system"),
      filteredEntry("r1", "below-min-confidence", "system"),
      filteredEntry("b1", "generated-file", "system"),
    ],
    byPolicy: { p: 1 },
  });
  const { summary } = buildFindingFilterHealth({ filterReport: report });
  const total
    = summary.policyFiltered
    + summary.graphAwareFiltered
    + summary.contentFiltered
    + summary.resultFiltered
    + summary.builtInPathFiltered;
  assert.equal(total, summary.totalFiltered);
  assert.equal(summary.policyFiltered, 1);
  assert.equal(summary.graphAwareFiltered, 1);
  assert.equal(summary.contentFiltered, 1);
  assert.equal(summary.resultFiltered, 1);
  assert.equal(summary.builtInPathFiltered, 1);
});

test("filterRateByGraphAwareReason is populated", () => {
  const report = makeFilterReport({
    kept: 1,
    filtered: [
      filteredEntry("a", "route-handler-with-service", "system"),
      filteredEntry("b", "route-handler-with-service", "system"),
      filteredEntry("c", "external-api-comment-only", "system"),
    ],
  });
  const { summary } = buildFindingFilterHealth({ filterReport: report });
  assert.ok(summary.filterRateByGraphAwareReason);
  // 2/4 = 0.5; 1/4 = 0.25.
  assert.equal(summary.filterRateByGraphAwareReason["route-handler-with-service"], 0.5);
  assert.equal(summary.filterRateByGraphAwareReason["external-api-comment-only"], 0.25);
});

test("byGraphAwareReason carries integer counts (not inflated by policy entries sharing a reason)", () => {
  const report = makeFilterReport({
    kept: 0,
    filtered: [
      filteredEntry("a", "route-handler-with-service", "system"),
      filteredEntry("b", "route-handler-with-service", "system"),
      filteredEntry("c", "route-handler-with-service", "policy", { policyId: "ops" }),
    ],
    byPolicy: { ops: 1 },
  });
  const { summary } = buildFindingFilterHealth({ filterReport: report });
  // Only the two system entries should count toward graph-aware.
  assert.equal(summary.byGraphAwareReason["route-handler-with-service"], 2);
  // byReason (whole report) still shows all 3.
  assert.equal(summary.byReason["route-handler-with-service"], 3);
});

test("dominantGraphAwareReason is populated when applicable + alphabetic tiebreak", () => {
  const report = makeFilterReport({
    kept: 0,
    filtered: [
      filteredEntry("a", "factory-file-creates-deps", "system"),
      filteredEntry("b", "factory-file-creates-deps", "system"),
      filteredEntry("c", "external-api-comment-only", "system"),
      filteredEntry("d", "external-api-comment-only", "system"),
    ],
  });
  const { summary } = buildFindingFilterHealth({ filterReport: report });
  assert.ok(summary.dominantGraphAwareReason);
  // Tie 2-2 → alphabetic tiebreak picks the lexicographically earlier reason.
  assert.equal(summary.dominantGraphAwareReason.reason, "external-api-comment-only");
  assert.equal(summary.dominantGraphAwareReason.count, 2);
});

// ---------- alert tests ----------

test("graph-aware-filter-dominance alert fires when graph-aware bucket >= 50% AND total >= 5", () => {
  const report = makeFilterReport({
    kept: 1,
    filtered: [
      ...times(4, (index) =>
        filteredEntry(`g-${index}`, "route-handler-with-service", "system"),
      ),
      filteredEntry("noise", "external-file", "system"),
    ],
  });
  const { alerts, summary } = buildFindingFilterHealth({ filterReport: report });
  const codes = alerts.map((alert) => alert.code);
  assert.ok(
    codes.includes("graph-aware-filter-dominance"),
    `expected graph-aware-filter-dominance, got ${codes.join(", ")}`,
  );
  assert.ok(summary.graphAwareFiltered >= 4);
});

test("graph-aware-reason-dominance alert fires when one reason crosses 50% AND total >= 5", () => {
  const report = makeFilterReport({
    kept: 1,
    filtered: [
      ...times(3, (index) =>
        filteredEntry(`g-${index}`, "module-gate-verified-caller", "system"),
      ),
      filteredEntry("g-extra", "module-gate-verified-caller", "system"),
      filteredEntry("noise", "external-file", "system"),
    ],
  });
  const { alerts, summary } = buildFindingFilterHealth({ filterReport: report });
  const codes = alerts.map((alert) => alert.code);
  assert.ok(
    codes.includes("graph-aware-reason-dominance"),
    `expected graph-aware-reason-dominance, got ${codes.join(", ")}`,
  );
  assert.equal(summary.dominantGraphAwareReason?.reason, "module-gate-verified-caller");
});

test("no graph-aware alerts when total < 5 (minimum corpus)", () => {
  const report = makeFilterReport({
    kept: 0,
    filtered: [
      filteredEntry("a", "route-handler-with-service", "system"),
      filteredEntry("b", "route-handler-with-service", "system"),
    ],
  });
  const { alerts } = buildFindingFilterHealth({ filterReport: report });
  const codes = alerts.map((alert) => alert.code);
  assert.equal(codes.includes("graph-aware-filter-dominance"), false);
  assert.equal(codes.includes("graph-aware-reason-dominance"), false);
});

// ---------- publication tests ----------

test("architecture summary surfaces graph-aware filtered count + Graph-Aware Filter Reasons table", async () => {
  await withSeededFixture(async ({ root }) => {
    runCli(["findings", "filter", "--root", root, "--json"]);
    runCli(["findings", "filter-health", "--root", root, "--json"]);
    runCli(["publish", "architecture", "--root", root, "--json"]);
    const body = await readLatestPublicationBody(root, "architecture-summary");
    assert.match(body, /Graph-aware filtered findings:\s+\d+/);
    assert.match(body, /### Graph-Aware Filter Reasons/);
    assert.match(body, /route-handler-with-service/);
    // Audit pointer language.
    assert.match(
      body,
      /Graph-aware filtered findings are structurally justified suppressions/,
    );
  });
});

test("agent contract surfaces graph-aware filtered count + audit instruction", async () => {
  await withSeededFixture(async ({ root }) => {
    runCli(["findings", "filter", "--root", root, "--json"]);
    runCli(["findings", "filter-health", "--root", root, "--json"]);
    runCli(["publish", "agent-contract", "--root", root, "--json"]);
    const body = await readLatestPublicationBody(root, "agent-contract");
    assert.match(body, /Graph-aware filtered findings:\s+\d+/);
    assert.match(
      body,
      /If graph-aware filtering is high, inspect `FindingFilterReport\.filteredFindings`/,
    );
  });
});

test("agent contract Do Not Do includes the graph-aware filtering warning", async () => {
  await withSeededFixture(async ({ root }) => {
    runCli(["findings", "filter", "--root", root, "--json"]);
    runCli(["findings", "filter-health", "--root", root, "--json"]);
    runCli(["publish", "agent-contract", "--root", root, "--json"]);
    const body = await readLatestPublicationBody(root, "agent-contract");
    assert.match(
      body,
      /Do not treat graph-aware filtering as proof that the underlying issue never existed/,
    );
  });
});

test("filter-health alert codes (graph-aware-filter-dominance etc.) appear in publication alert tables when present", async () => {
  await withDominantGraphAwareFixture(async ({ root }) => {
    runCli(["findings", "filter", "--root", root, "--json"]);
    runCli(["findings", "filter-health", "--root", root, "--json"]);
    runCli(["publish", "architecture", "--root", root, "--json"]);
    const body = await readLatestPublicationBody(root, "architecture-summary");
    assert.ok(
      body.includes("graph-aware-filter-dominance")
        || body.includes("graph-aware-reason-dominance"),
      "architecture summary must surface at least one graph-aware dominance alert",
    );
  });
});

test("rekon artifacts validate stays clean after publishing graph-aware surfaces", async () => {
  await withSeededFixture(async ({ root }) => {
    runCli(["findings", "filter", "--root", root, "--json"]);
    runCli(["findings", "filter-health", "--root", root, "--json"]);
    runCli(["publish", "architecture", "--root", root, "--json"]);
    runCli(["publish", "agent-contract", "--root", root, "--json"]);
    const result = JSON.parse(
      runCli(["artifacts", "validate", "--root", root, "--json"]).stdout,
    );
    assert.equal(result.valid, true);
    assert.deepEqual(result.issues ?? [], []);
  });
});

// ---------- helpers ----------

function filteredEntry(id, reason, source, overrides = {}) {
  return {
    findingId: id,
    finding: {
      id,
      type: "issue",
      severity: "medium",
      title: `Finding ${id}`,
      description: `Synthetic finding ${id}`,
      subjects: [overrides.filePath ?? `src/${id}.ts`],
      files: [overrides.filePath ?? `src/${id}.ts`],
    },
    reason,
    evidence: overrides.evidence ?? `Synthetic filter evidence for ${id}`,
    filePath: overrides.filePath ?? `src/${id}.ts`,
    confidence: overrides.confidence ?? "high",
    filteredAt: "2026-05-17T00:00:00.000Z",
    source,
    policyId: overrides.policyId,
  };
}

function makeFilterReport({ kept, filtered, byPolicy }) {
  const byReason = {};
  const byConfidence = {};
  const byType = {};
  const bySeverity = {};
  for (const entry of filtered) {
    byReason[entry.reason] = (byReason[entry.reason] ?? 0) + 1;
    byConfidence[entry.confidence] = (byConfidence[entry.confidence] ?? 0) + 1;
    const type = entry.finding.type;
    byType[type] = (byType[type] ?? 0) + 1;
    const severity = entry.finding.severity;
    bySeverity[severity] = (bySeverity[severity] ?? 0) + 1;
  }
  const summary = {
    totalFiltered: filtered.length,
    kept,
    byReason,
    byConfidence,
    byType,
    bySeverity,
  };
  if (byPolicy) summary.byPolicy = byPolicy;
  return {
    header: {
      artifactType: "FindingFilterReport",
      artifactId: `synthetic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      schemaVersion: "0.1.0",
      generatedAt: new Date().toISOString(),
      subject: { repoId: "synthetic" },
      producer: { id: "test-harness", version: "0.1.0" },
      inputRefs: [],
      freshness: { status: "fresh" },
    },
    summary,
    keptFindings: times(kept, (i) => ({
      id: `kept-${i}`,
      type: "issue",
      severity: "low",
      title: `Kept ${i}`,
      description: "kept",
      subjects: ["src/kept.ts"],
      files: ["src/kept.ts"],
    })),
    filteredFindings: filtered,
  };
}

function times(n, fn) {
  return Array.from({ length: n }, (_, index) => fn(index));
}

async function withFreshWorkspace(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-graph-aware-surfacing-"));
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

/**
 * Seed a workspace where a single graph-aware filter fires
 * (route-handler-with-service via ObservedRepo.files). After
 * the seeded refresh, callers can run findings filter +
 * filter-health + publish and assert the publication renders
 * the graph-aware surfaces.
 */
async function withSeededFixture(callback) {
  await withFreshWorkspace(async ({ root }) => {
    runCli(["refresh", "--root", root, "--json"]);

    const store = createLocalArtifactStore(root);
    await store.init();

    const observed = createObservedRepo({
      header: {
        artifactType: "ObservedRepo",
        artifactId: `seeded-observed-${Date.now()}`,
        schemaVersion: "0.1.0",
        generatedAt: new Date().toISOString(),
        subject: { repoId: "graph-aware-surfacing" },
        producer: { id: "test-harness", version: "0.1.0" },
        inputRefs: [],
        freshness: { status: "fresh" },
      },
      repository: { id: "graph-aware-surfacing", root: "." },
      systems: [],
      layers: [],
      capabilities: [],
      files: ["src/api/widgets/route.ts", "src/api/widgets/handler.ts"],
    });
    await store.write(observed, { category: "graphs" });

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
        artifactType: "FindingReport",
        artifactId: `seeded-${Date.now()}`,
        schemaVersion: "0.1.0",
        generatedAt: new Date().toISOString(),
        subject: { repoId: "graph-aware-surfacing" },
        producer: { id: "test-harness", version: "0.1.0" },
        inputRefs,
        freshness: { status: "fresh" },
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

/**
 * Seed a workspace with >= 5 graph-aware findings so the
 * dominance alerts fire. Used for the alert-rendering test.
 */
async function withDominantGraphAwareFixture(callback) {
  await withFreshWorkspace(async ({ root }) => {
    runCli(["refresh", "--root", root, "--json"]);

    const store = createLocalArtifactStore(root);
    await store.init();

    const routePaths = times(6, (index) => `src/api/widgets-${index}/route.ts`);
    const handlerPaths = times(6, (index) => `src/api/widgets-${index}/handler.ts`);

    const observed = createObservedRepo({
      header: {
        artifactType: "ObservedRepo",
        artifactId: `dom-observed-${Date.now()}`,
        schemaVersion: "0.1.0",
        generatedAt: new Date().toISOString(),
        subject: { repoId: "graph-aware-dom" },
        producer: { id: "test-harness", version: "0.1.0" },
        inputRefs: [],
        freshness: { status: "fresh" },
      },
      repository: { id: "graph-aware-dom", root: "." },
      systems: [],
      layers: [],
      capabilities: [],
      files: [...routePaths, ...handlerPaths],
    });
    await store.write(observed, { category: "graphs" });

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
        artifactType: "FindingReport",
        artifactId: `dom-${Date.now()}`,
        schemaVersion: "0.1.0",
        generatedAt: new Date().toISOString(),
        subject: { repoId: "graph-aware-dom" },
        producer: { id: "test-harness", version: "0.1.0" },
        inputRefs,
        freshness: { status: "fresh" },
      },
      findings: routePaths.map((path, index) => ({
        id: `graph-dom-${index}`,
        type: "architecture",
        severity: "medium",
        title: `Route ${index} dep`,
        description: `Route construct and inject deps rule fired for route-${index}.`,
        subjects: [path],
        files: [path],
        ruleId: "routes.construct_and_inject_deps",
      })),
    });
    await store.write(findingReport, { category: "findings" });

    await callback({ root });
  });
}

async function readLatestPublicationBody(root, kindPrefix) {
  const pubDir = join(root, ".rekon", "artifacts", "publications");
  const files = (await readdir(pubDir))
    .filter((name) => name.startsWith(`Publication-${kindPrefix}-`))
    .sort();
  if (files.length === 0) throw new Error(`no ${kindPrefix} publication under ${pubDir}`);
  const pub = JSON.parse(await readFile(join(pubDir, files[files.length - 1]), "utf8"));
  return pub.content ?? "";
}

function runCli(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}
