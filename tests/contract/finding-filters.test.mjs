import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";
import {
  applyFindingFilters,
  assertFindingFilterHealthReport,
  assertFindingFilterReport,
  buildFindingFilterHealth,
  createFindingFilterHealthReport,
  createFindingFilterReport,
  createFindingReport,
  validateFindingFilterHealthReport,
  validateFindingFilterReport,
} from "../../packages/kernel-findings/dist/index.js";
import {
  buildFindingFilterHealthReport,
  buildFindingFilterReport,
  createLocalArtifactStore,
} from "../../packages/runtime/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- pure-helper tests ----------

test("applyFindingFilters filters generated-file findings with high confidence", () => {
  const { keptFindings, filteredFindings } = applyFindingFilters({
    findings: [
      finding("gen", { files: ["src/dist/bundle.ts"] }),
      finding("ok", { files: ["src/lib/index.ts"] }),
    ],
  });
  assert.equal(keptFindings.length, 1);
  assert.equal(keptFindings[0].id, "ok");
  assert.equal(filteredFindings.length, 1);
  assert.equal(filteredFindings[0].findingId, "gen");
  assert.equal(filteredFindings[0].reason, "generated-file");
  assert.equal(filteredFindings[0].confidence, "high");
  assert.equal(filteredFindings[0].filePath, "src/dist/bundle.ts");
  assert.equal(filteredFindings[0].source, "system");
});

test("applyFindingFilters filters test-file findings with high confidence", () => {
  const { keptFindings, filteredFindings } = applyFindingFilters({
    findings: [
      finding("t1", { files: ["tests/foo.test.ts"] }),
      finding("t2", { files: ["src/lib/foo.spec.ts"] }),
      finding("ok", { files: ["src/lib/foo.ts"] }),
    ],
  });
  assert.equal(keptFindings.length, 1);
  assert.equal(keptFindings[0].id, "ok");
  assert.equal(filteredFindings.length, 2);
  for (const entry of filteredFindings) {
    assert.equal(entry.reason, "test-file");
    assert.equal(entry.confidence, "high");
  }
});

test("applyFindingFilters filters external-file findings with high confidence", () => {
  const { keptFindings, filteredFindings } = applyFindingFilters({
    findings: [
      finding("ext", { files: ["node_modules/leftpad/index.js"] }),
      finding("vendor", { files: ["src/vendor/lib.ts"] }),
      finding("ok", { files: ["src/lib/index.ts"] }),
    ],
  });
  assert.equal(keptFindings.length, 1);
  assert.equal(filteredFindings.length, 2);
  for (const entry of filteredFindings) {
    assert.equal(entry.reason, "external-file");
    assert.equal(entry.confidence, "high");
  }
});

test("applyFindingFilters keeps normal source findings", () => {
  const { keptFindings, filteredFindings } = applyFindingFilters({
    findings: [
      finding("k1", { files: ["src/lib/index.ts"] }),
      finding("k2", { files: ["src/components/button.tsx"] }),
    ],
  });
  assert.equal(keptFindings.length, 2);
  assert.equal(filteredFindings.length, 0);
});

test("applyFindingFilters honors reason priority: generated > external > test > canary", () => {
  const { filteredFindings } = applyFindingFilters({
    findings: [
      finding("gen-test", { files: ["src/dist/foo.test.ts"] }),
      finding("ext-test", { files: ["node_modules/pkg/foo.test.ts"] }),
    ],
  });
  const byId = new Map(filteredFindings.map((entry) => [entry.findingId, entry]));
  assert.equal(byId.get("gen-test").reason, "generated-file");
  assert.equal(byId.get("ext-test").reason, "external-file");
});

test("applyFindingFilters retains the full finding payload in filteredFindings", () => {
  const original = finding("g1", {
    files: ["src/dist/foo.ts"],
    title: "Some issue",
    severity: "high",
  });
  const { filteredFindings } = applyFindingFilters({ findings: [original] });
  assert.equal(filteredFindings.length, 1);
  assert.equal(filteredFindings[0].finding.id, "g1");
  assert.equal(filteredFindings[0].finding.title, "Some issue");
  assert.equal(filteredFindings[0].finding.severity, "high");
});

test("createFindingFilterReport summary counts kept + filtered + byReason", () => {
  const report = createFindingFilterReport({
    header: artifactHeader("FindingFilterReport", "filter-1"),
    keptFindings: [finding("k1"), finding("k2")],
    filteredFindings: [
      {
        findingId: "g1",
        finding: finding("g1", { files: ["src/dist/x.ts"] }),
        reason: "generated-file",
        evidence: "generated",
        filePath: "src/dist/x.ts",
        confidence: "high",
        filteredAt: "2026-05-14T00:00:00Z",
        source: "system",
      },
    ],
  });
  assert.equal(report.summary.kept, 2);
  assert.equal(report.summary.totalFiltered, 1);
  assert.equal(report.summary.byReason["generated-file"], 1);
  assert.equal(report.summary.byConfidence["high"], 1);
});

test("validateFindingFilterReport rejects an entry with unknown reason", () => {
  const result = validateFindingFilterReport({
    header: artifactHeader("FindingFilterReport", "bad"),
    summary: { totalFiltered: 1, kept: 0, byReason: {}, byConfidence: {}, byType: {}, bySeverity: {} },
    keptFindings: [],
    filteredFindings: [
      {
        findingId: "x",
        finding: finding("x"),
        reason: "made-up-reason",
        evidence: "n/a",
        confidence: "high",
        filteredAt: "2026-05-14T00:00:00Z",
        source: "system",
      },
    ],
  });
  assert.equal(result.ok, false);
  assert.ok(
    result.issues.some((issue) => issue.path.endsWith(".reason")),
    `expected reason validation error, got ${JSON.stringify(result.issues)}`,
  );
});

test("buildFindingFilterHealth emits high-filter-rate alert when filterRate > 0.8", () => {
  const filtered = Array.from({ length: 9 }, (_, i) => ({
    findingId: `g${i}`,
    finding: finding(`g${i}`, { files: ["src/dist/x.ts"] }),
    reason: "generated-file",
    evidence: "gen",
    confidence: "high",
    filteredAt: "2026-05-14T00:00:00Z",
    source: "system",
  }));
  const filterReport = createFindingFilterReport({
    header: artifactHeader("FindingFilterReport", "fr-h"),
    keptFindings: [finding("k1")],
    filteredFindings: filtered,
  });
  const { summary, alerts } = buildFindingFilterHealth({ filterReport });
  assert.equal(summary.totalFindings, 10);
  assert.equal(summary.totalFiltered, 9);
  assert.ok(summary.filterRate > 0.8);
  assert.ok(
    alerts.some((alert) => alert.code === "high-filter-rate"),
    `expected high-filter-rate alert, got ${JSON.stringify(alerts)}`,
  );
});

test("buildFindingFilterHealth emits low-confidence-filtered alert when any low-confidence entry exists", () => {
  const filterReport = createFindingFilterReport({
    header: artifactHeader("FindingFilterReport", "fr-low"),
    keptFindings: [finding("k1"), finding("k2"), finding("k3")],
    filteredFindings: [
      {
        findingId: "g1",
        finding: finding("g1"),
        reason: "other",
        evidence: "manual",
        confidence: "low",
        filteredAt: "2026-05-14T00:00:00Z",
        source: "system",
      },
    ],
  });
  const { alerts } = buildFindingFilterHealth({ filterReport });
  assert.ok(
    alerts.some((alert) => alert.code === "low-confidence-filtered"),
    `expected low-confidence-filtered alert, got ${JSON.stringify(alerts)}`,
  );
});

test("createFindingFilterHealthReport produces a valid artifact", () => {
  const filterReport = createFindingFilterReport({
    header: artifactHeader("FindingFilterReport", "fr-h2"),
    keptFindings: [finding("k1")],
    filteredFindings: [],
  });
  const health = createFindingFilterHealthReport({
    header: artifactHeader("FindingFilterHealthReport", "fh-1"),
    filterReport,
  });
  const result = validateFindingFilterHealthReport(health);
  assert.equal(result.ok, true, JSON.stringify(result.issues));
});

// ---------- end-to-end runtime + CLI tests ----------

test("buildFindingFilterReport rejects when no FindingReport exists", async () => {
  await withInitFixture(async (root) => {
    const store = createLocalArtifactStore(root);
    await store.init();
    await assert.rejects(
      buildFindingFilterReport(store),
      /requires at least one FindingReport/,
    );
  });
});

test("CLI rekon findings filter writes a FindingFilterReport", async () => {
  await withRefreshedFixture(async (root) => {
    const result = JSON.parse(
      runCli(["findings", "filter", "--root", root, "--json"]).stdout,
    );
    assert.equal(result.artifact.type, "FindingFilterReport");
    assert.equal(typeof result.summary.kept, "number");
    assert.equal(typeof result.summary.totalFiltered, "number");
  });
});

test("CLI rekon findings filter-health writes a FindingFilterHealthReport", async () => {
  await withRefreshedFixture(async (root) => {
    const result = JSON.parse(
      runCli(["findings", "filter-health", "--root", root, "--json"]).stdout,
    );
    assert.equal(result.artifact.type, "FindingFilterHealthReport");
    assert.equal(typeof result.summary.filterRate, "number");
    assert.ok(Array.isArray(result.alerts));
  });
});

test("rekon refresh includes findings.filter and findings.filter-health steps with artifacts", async () => {
  await withInitFixture(async (root) => {
    const result = JSON.parse(
      runCli(["refresh", "--root", root, "--json"]).stdout,
    );
    const stepIds = result.steps.map((step) => step.id);
    const filterIdx = stepIds.indexOf("findings.filter");
    const filterHealthIdx = stepIds.indexOf("findings.filter-health");
    const lifecycleIdx = stepIds.indexOf("findings.lifecycle");
    assert.ok(filterIdx >= 0, "findings.filter step must exist");
    assert.ok(filterHealthIdx >= 0, "findings.filter-health step must exist");
    assert.ok(filterIdx < filterHealthIdx, "filter must come before filter-health");
    assert.ok(filterHealthIdx < lifecycleIdx, "filter-health must come before findings.lifecycle");

    const filterStep = result.steps[filterIdx];
    assert.equal(filterStep.status, "passed");
    assert.ok(Array.isArray(filterStep.artifacts) && filterStep.artifacts.length > 0);
    assert.equal(filterStep.artifacts[0].type, "FindingFilterReport");

    const filterHealthStep = result.steps[filterHealthIdx];
    assert.equal(filterHealthStep.status, "passed");
    assert.ok(Array.isArray(filterHealthStep.artifacts) && filterHealthStep.artifacts.length > 0);
    assert.equal(filterHealthStep.artifacts[0].type, "FindingFilterHealthReport");

    const types = new Set(result.artifacts.map((ref) => ref.type));
    assert.ok(types.has("FindingFilterReport"));
    assert.ok(types.has("FindingFilterHealthReport"));
  });
});

test("FindingReport is not mutated by filtering", async () => {
  await withInitFixture(async (root) => {
    const store = createLocalArtifactStore(root);
    await store.init();
    const before = createFindingReport({
      header: artifactHeader("FindingReport", "fr-before"),
      findings: [
        finding("gen", { files: ["src/dist/x.ts"] }),
        finding("ok", { files: ["src/lib/x.ts"] }),
      ],
    });
    const beforeRef = await store.write(before, { category: "findings" });
    const beforeOnDisk = JSON.parse(
      await readFile(join(root, beforeRef.path), "utf8"),
    );

    await buildFindingFilterReport(store);

    const afterOnDisk = JSON.parse(
      await readFile(join(root, beforeRef.path), "utf8"),
    );
    assert.deepEqual(afterOnDisk, beforeOnDisk, "FindingReport must not be rewritten by filtering");
  });
});

test("freshness marks FindingFilterReport stale after a newer FindingReport", async () => {
  await withInitFixture(async (root) => {
    const store = createLocalArtifactStore(root);
    await store.init();
    const first = createFindingReport({
      header: artifactHeader("FindingReport", "fr-old"),
      findings: [finding("k1")],
    });
    await store.write(first, { category: "findings" });

    const filter = await buildFindingFilterReport(store);
    const filterRef = await store.write(filter, { category: "findings" });
    const filterId = filterRef.id;

    await new Promise((resolveTimer) => setTimeout(resolveTimer, 10));
    const next = createFindingReport({
      header: artifactHeader("FindingReport", `fr-new-${Date.now()}`),
      findings: [finding("k1"), finding("k2")],
    });
    await store.write(next, { category: "findings" });

    const freshness = JSON.parse(
      runCli([
        "artifacts",
        "freshness",
        "--root",
        root,
        "--type",
        "FindingFilterReport",
        "--id",
        filterId,
        "--json",
      ]).stdout,
    );
    const entry = freshness.artifacts.find((candidate) => candidate.id === filterId);
    assert.ok(entry, `expected freshness entry for ${filterId}`);
    assert.equal(entry.status, "stale");
    assert.ok(
      entry.issues.some(
        (issue) => issue.code === "newer-input-exists" && issue.inputType === "FindingReport",
      ),
      `expected stale issue citing newer FindingReport, got ${JSON.stringify(entry.issues)}`,
    );
  });
});

test("artifacts validate remains clean with filter + health artifacts in the store", async () => {
  await withRefreshedFixture(async (root) => {
    const validation = JSON.parse(
      runCli(["artifacts", "validate", "--root", root, "--json"]).stdout,
    );
    assert.equal(validation.valid, true);
    assert.deepEqual(validation.issues ?? [], []);
  });
});

// ---------- helpers ----------

function finding(id, overrides = {}) {
  return {
    id,
    type: overrides.type ?? "test.example",
    severity: overrides.severity ?? "medium",
    title: overrides.title ?? `Finding ${id}`,
    description: overrides.description ?? `Description for ${id}`,
    subjects: overrides.subjects ?? [`src/${id}.ts`],
    files: overrides.files,
    ruleId: overrides.ruleId,
    suggestedAction: overrides.suggestedAction,
  };
}

function artifactHeader(type, id) {
  return {
    artifactType: type,
    artifactId: id,
    schemaVersion: "0.1.0",
    generatedAt: new Date().toISOString(),
    subject: { repoId: "synthetic" },
    producer: { id: "test-harness", version: "0.1.0" },
    inputRefs: [],
    freshness: { status: "fresh" },
  };
}

async function withInitFixture(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-filters-"));
  try {
    await cp(exampleRoot, root, {
      recursive: true,
      filter(source) {
        return !relative(exampleRoot, source).split(/[\\/]/).includes(".rekon");
      },
    });
    runCli(["init", "--root", root, "--json"]);
    await callback(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function withRefreshedFixture(callback) {
  await withInitFixture(async (root) => {
    runCli(["refresh", "--root", root, "--json"]);
    await callback(root);
  });
}

function runCli(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}
