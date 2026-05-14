import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";
import {
  createCoherencyDelta,
  createFindingLifecycleReport,
  createFindingReport,
  createIssueAdjudicationReport,
  deriveFindingLifecycle,
} from "../../packages/kernel-findings/dist/index.js";
import {
  buildCoherencyDelta,
  buildIssueAdjudicationReport,
  createLocalArtifactStore,
} from "../../packages/runtime/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- pure-helper tests ----------

test("createCoherencyDelta in group mode emits one item for a duplicate group", () => {
  const groups = [
    {
      id: "issue-alpha",
      canonicalFindingId: "finding-1",
      memberFindingIds: ["finding-1", "finding-2"],
      type: "import_boundary.parent_relative_import",
      ruleId: "import-boundaries.parent_relative_import",
      severity: "medium",
      status: "active",
      active: true,
      title: "Parent-relative import",
      description: "Imports starting with `../` should be replaced.",
      files: ["src/foo.ts"],
      subjects: ["src/foo.ts"],
      groupingKey: "k",
      groupingReasons: ["same-type", "same-rule", "same-files"],
      statusBreakdown: { new: 2 },
    },
  ];

  const delta = createCoherencyDelta({
    header: header("CoherencyDelta", "delta-1"),
    issueGroups: groups,
    systemsForIssueGroup: () => ["app"],
  });

  assert.equal(delta.items.length, 1);
  const [item] = delta.items;
  assert.equal(item.id, "coherency:group:issue-alpha");
  assert.equal(item.findingId, "finding-1");
  assert.equal(item.issueGroupId, "issue-alpha");
  assert.equal(item.canonicalFindingId, "finding-1");
  assert.deepEqual(item.memberFindingIds, ["finding-1", "finding-2"]);
  assert.deepEqual(item.groupingReasons, ["same-type", "same-rule", "same-files"]);
  assert.equal(item.status, "existing");
  assert.equal(item.active, true);
  assert.deepEqual(item.files, ["src/foo.ts"]);
  assert.deepEqual(item.systems, ["app"]);
});

test("group-mode createCoherencyDelta emits exactly one remediation step per active group", () => {
  const groups = [
    {
      id: "issue-alpha",
      canonicalFindingId: "finding-1",
      memberFindingIds: ["finding-1", "finding-2", "finding-3"],
      type: "x",
      severity: "medium",
      status: "active",
      active: true,
      title: "T",
      description: "D",
      files: ["src/foo.ts"],
      subjects: ["src/foo.ts"],
      groupingKey: "k",
      groupingReasons: ["same-type", "same-files"],
      statusBreakdown: { new: 3 },
    },
  ];

  const delta = createCoherencyDelta({
    header: header("CoherencyDelta", "delta-1"),
    issueGroups: groups,
  });

  assert.equal(delta.remediationQueue.length, 1);
  assert.equal(delta.remediationQueue[0].id, "remediation:group:issue-alpha");
  assert.equal(delta.remediationQueue[0].findingId, "finding-1");
});

test("accepted / ignored / resolved groups are not active and not in remediationQueue", () => {
  const groups = [
    {
      id: "issue-accepted",
      canonicalFindingId: "f-acc",
      memberFindingIds: ["f-acc"],
      type: "x",
      severity: "medium",
      status: "accepted",
      active: false,
      title: "T",
      description: "D",
      files: ["a.ts"],
      subjects: ["a.ts"],
      groupingKey: "k1",
      groupingReasons: ["same-type", "same-files"],
      statusBreakdown: { accepted: 1 },
    },
    {
      id: "issue-ignored",
      canonicalFindingId: "f-ign",
      memberFindingIds: ["f-ign"],
      type: "x",
      severity: "medium",
      status: "ignored",
      active: false,
      title: "T",
      description: "D",
      files: ["b.ts"],
      subjects: ["b.ts"],
      groupingKey: "k2",
      groupingReasons: ["same-type", "same-files"],
      statusBreakdown: { ignored: 1 },
    },
    {
      id: "issue-resolved",
      canonicalFindingId: "f-res",
      memberFindingIds: ["f-res"],
      type: "x",
      severity: "medium",
      status: "resolved",
      active: false,
      title: "T",
      description: "D",
      files: ["c.ts"],
      subjects: ["c.ts"],
      groupingKey: "k3",
      groupingReasons: ["same-type", "same-files"],
      statusBreakdown: { resolved: 1 },
    },
  ];

  const delta = createCoherencyDelta({
    header: header("CoherencyDelta", "delta-2"),
    issueGroups: groups,
  });

  for (const item of delta.items) {
    assert.equal(item.active, false);
  }
  assert.equal(delta.remediationQueue.length, 0);
  assert.equal(delta.summary.active, 0);
  assert.equal(delta.summary.accepted, 1);
  assert.equal(delta.summary.ignored, 1);
  assert.equal(delta.summary.resolved, 1);
});

test("mixed group with at least one active member becomes an active item", () => {
  const groups = [
    {
      id: "issue-mixed",
      canonicalFindingId: "f-active",
      memberFindingIds: ["f-active", "f-ignored"],
      type: "x",
      severity: "high",
      status: "mixed",
      active: true,
      title: "T",
      description: "D",
      files: ["d.ts"],
      subjects: ["d.ts"],
      groupingKey: "k",
      groupingReasons: ["same-type", "same-files"],
      statusBreakdown: { new: 1, ignored: 1 },
    },
  ];

  const delta = createCoherencyDelta({
    header: header("CoherencyDelta", "delta-3"),
    issueGroups: groups,
  });

  assert.equal(delta.items.length, 1);
  const [item] = delta.items;
  assert.equal(item.active, true);
  assert.equal(item.status, "existing");
  assert.equal(delta.remediationQueue.length, 1);
});

test("createCoherencyDelta with no issueGroups still uses lifecycle findings (legacy path)", () => {
  const findings = [
    effective(finding("f-legacy", { files: ["legacy.ts"] }), "new"),
  ];

  const delta = createCoherencyDelta({
    header: header("CoherencyDelta", "delta-4"),
    findings,
    resolvedFindings: [],
    systemsForFinding: () => ["app"],
  });

  assert.equal(delta.items.length, 1);
  const [item] = delta.items;
  assert.equal(item.id, "coherency:f-legacy");
  assert.equal(item.findingId, "f-legacy");
  assert.equal(item.issueGroupId, undefined);
  assert.equal(item.memberFindingIds, undefined);
  assert.deepEqual(item.systems, ["app"]);
});

// ---------- runtime helper tests ----------

test("buildCoherencyDelta prefers IssueAdjudicationReport when one exists", async () => {
  await withFixture(async (root) => {
    await seedDuplicateFindings(root);
    await seedAdjudicationReport(root);

    const store = createLocalArtifactStore(root);
    await store.init();

    const delta = await buildCoherencyDelta(store);

    assert.equal(delta.items.length, 1);
    const [item] = delta.items;
    assert.equal(item.issueGroupId, "issue-finding-alpha-1");
    assert.deepEqual(item.memberFindingIds, ["finding-alpha-1", "finding-alpha-2"]);
    assert.ok(delta.header.inputRefs.some((ref) => ref.type === "IssueAdjudicationReport"));
  });
});

test("buildCoherencyDelta falls back to FindingLifecycleReport when no IssueAdjudicationReport exists", async () => {
  await withFixture(async (root) => {
    await seedDuplicateFindings(root);

    const store = createLocalArtifactStore(root);
    await store.init();

    const delta = await buildCoherencyDelta(store);

    // legacy fallback: two distinct lifecycle items, not one group item
    assert.equal(delta.items.length, 2);
    for (const item of delta.items) {
      assert.equal(item.issueGroupId, undefined);
    }
    assert.ok(delta.header.inputRefs.some((ref) => ref.type === "FindingLifecycleReport"));
    assert.ok(!delta.header.inputRefs.some((ref) => ref.type === "IssueAdjudicationReport"));
  });
});

// ---------- CLI tests ----------

test("rekon coherency delta after issues adjudicate emits group-aware items", async () => {
  await withFixture(async (root) => {
    await seedDuplicateFindings(root);
    runCli(["issues", "adjudicate", "--root", root, "--json"]);

    const result = JSON.parse(
      runCli(["coherency", "delta", "--root", root, "--json"]).stdout,
    );

    assert.equal(result.summary.total, 1);
    assert.equal(result.summary.active, 1);
    assert.equal(result.remediationQueue.length, 1);
    assert.equal(result.remediationQueue[0].id, "remediation:group:issue-finding-alpha-1");
  });
});

test("rekon refresh runs issues.adjudicate between findings.lifecycle and coherency.delta", async () => {
  await withFixture(async (root) => {
    const result = JSON.parse(
      runCli(["refresh", "--root", root, "--json"]).stdout,
    );

    const stepIds = result.steps.map((step) => step.id);
    assert.deepEqual(
      stepIds,
      [
        "init",
        "config.validate",
        "observe",
        "project",
        "snapshot",
        "evaluate",
        "findings.lifecycle",
        "issues.adjudicate",
        "coherency.delta",
        "publish.architecture",
        "artifacts.validate",
        "artifacts.freshness",
      ],
    );

    const adjudicateStep = result.steps.find((step) => step.id === "issues.adjudicate");
    assert.ok(adjudicateStep);
    assert.equal(adjudicateStep.status, "passed");
    assert.ok(adjudicateStep.summary);

    const lifecycleIdx = stepIds.indexOf("findings.lifecycle");
    const adjudicateIdx = stepIds.indexOf("issues.adjudicate");
    const coherencyIdx = stepIds.indexOf("coherency.delta");
    assert.ok(lifecycleIdx < adjudicateIdx);
    assert.ok(adjudicateIdx < coherencyIdx);

    const types = new Set(result.artifacts.map((ref) => ref.type));
    assert.ok(types.has("IssueAdjudicationReport"));
    assert.ok(types.has("CoherencyDelta"));

    assert.equal(result.status, "passed");
    assert.ok(result.freshness);
    assert.ok(
      result.freshness.latestMajor.some((entry) => entry.type === "IssueAdjudicationReport"),
      "expected IssueAdjudicationReport in latest-major freshness summary",
    );
  });
});

test("CoherencyDelta freshness goes stale after a newer IssueAdjudicationReport", async () => {
  await withFixture(async (root) => {
    await seedDuplicateFindings(root);
    runCli(["issues", "adjudicate", "--root", root, "--json"]);
    const coherency = JSON.parse(
      runCli(["coherency", "delta", "--root", root, "--json"]).stdout,
    );
    const coherencyId = coherency.artifact.id;

    await new Promise((resolveTimer) => setTimeout(resolveTimer, 10));
    runCli(["issues", "adjudicate", "--root", root, "--json"]);

    const freshness = JSON.parse(
      runCli([
        "artifacts",
        "freshness",
        "--root",
        root,
        "--type",
        "CoherencyDelta",
        "--id",
        coherencyId,
        "--json",
      ]).stdout,
    );

    const entry = freshness.artifacts.find((candidate) => candidate.id === coherencyId);
    assert.ok(entry);
    assert.equal(entry.status, "stale");
    assert.ok(
      entry.issues.some(
        (issue) => issue.code === "newer-input-exists" && issue.inputType === "IssueAdjudicationReport",
      ),
      `expected stale issue citing newer IssueAdjudicationReport, got: ${JSON.stringify(entry.issues)}`,
    );
  });
});

test("artifacts validate stays clean with adjudicated CoherencyDelta in the store", async () => {
  await withFixture(async (root) => {
    await seedDuplicateFindings(root);
    runCli(["issues", "adjudicate", "--root", root, "--json"]);
    runCli(["coherency", "delta", "--root", root, "--json"]);

    const validation = JSON.parse(
      runCli(["artifacts", "validate", "--root", root, "--json"]).stdout,
    );

    assert.equal(validation.valid, true);
    assert.deepEqual(validation.issues ?? [], []);
  });
});

// ---------- helpers ----------

async function seedDuplicateFindings(root) {
  const store = createLocalArtifactStore(root);
  await store.init();

  const report = createFindingReport({
    header: header("FindingReport", "finding-report-seed"),
    findings: [
      duplicateFinding("finding-alpha-1"),
      duplicateFinding("finding-alpha-2"),
    ],
  });
  const reportRef = await store.write(report, { category: "findings" });

  const lifecycle = deriveFindingLifecycle({ latestReport: report });
  const lifecycleHeader = header("FindingLifecycleReport", "finding-lifecycle-seed");
  lifecycleHeader.inputRefs = [reportRef];
  const artifact = createFindingLifecycleReport({
    header: lifecycleHeader,
    findings: lifecycle.findings,
    resolvedFindings: lifecycle.resolvedFindings,
    decisions: lifecycle.decisions,
  });
  await store.write(artifact, { category: "findings" });
}

async function seedAdjudicationReport(root) {
  const store = createLocalArtifactStore(root);
  await store.init();
  const adjudication = await buildIssueAdjudicationReport(store);
  await store.write(adjudication, { category: "findings" });
}

function duplicateFinding(id) {
  return {
    id,
    type: "import_boundary.parent_relative_import",
    severity: "medium",
    title: "Parent-relative import",
    description: "Imports starting with `../` should be replaced.",
    subjects: ["src/foo.ts"],
    files: ["src/foo.ts"],
    ruleId: "import-boundaries.parent_relative_import",
  };
}

function effective(base, effectiveStatus) {
  return {
    ...base,
    effectiveStatus,
    statusSource: "derived",
    lifecycle: {
      firstSeenReportId: "finding-report-1",
      lastSeenReportId: "finding-report-1",
      presentInLatestReport: effectiveStatus !== "resolved",
    },
  };
}

function finding(id, overrides = {}) {
  return {
    id,
    type: overrides.type ?? "test.example",
    severity: overrides.severity ?? "medium",
    title: overrides.title ?? `Finding ${id}`,
    description: overrides.description ?? `Description for ${id}`,
    subjects: overrides.subjects ?? [],
    files: overrides.files,
    ruleId: overrides.ruleId,
    suggestedAction: overrides.suggestedAction,
  };
}

function header(artifactType, artifactId) {
  return {
    artifactType,
    artifactId,
    schemaVersion: "0.1.0",
    generatedAt: new Date().toISOString(),
    subject: { repoId: "synthetic" },
    producer: { id: "test-harness", version: "0.1.0" },
    inputRefs: [],
    freshness: { status: "fresh" },
  };
}

async function withFixture(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-coherency-v2-"));

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

function runCli(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}
