import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";
import {
  createFindingLifecycleReport,
  createFindingReport,
  createIssueAdjudicationReport,
  deriveFindingLifecycle,
  deriveIssueAdjudication,
} from "../../packages/kernel-findings/dist/index.js";
import {
  buildIssueAdjudicationReport,
  createLocalArtifactStore,
} from "../../packages/runtime/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- pure-helper tests ----------

test("deriveIssueAdjudication groups duplicate findings sharing type/rule/files/subjects", () => {
  const findings = [
    effective(
      finding("finding-1", {
        type: "import_boundary.parent_relative_import",
        ruleId: "import-boundaries.parent_relative_import",
        files: ["src/foo.ts"],
        subjects: ["src/foo.ts"],
      }),
      "new",
    ),
    effective(
      finding("finding-2", {
        type: "import_boundary.parent_relative_import",
        ruleId: "import-boundaries.parent_relative_import",
        files: ["src/foo.ts"],
        subjects: ["src/foo.ts"],
      }),
      "existing",
    ),
  ];

  const { groups, summary } = deriveIssueAdjudication({ findings });

  assert.equal(groups.length, 1);
  const [group] = groups;
  assert.equal(group.memberFindingIds.length, 2);
  assert.deepEqual(group.memberFindingIds, ["finding-1", "finding-2"]);
  assert.equal(group.status, "active");
  assert.equal(group.active, true);
  assert.ok(group.groupingReasons.includes("same-type"));
  assert.ok(group.groupingReasons.includes("same-rule"));
  assert.ok(group.groupingReasons.includes("same-files"));
  assert.equal(summary.totalGroups, 1);
  assert.equal(summary.activeGroups, 1);
  assert.equal(summary.totalFindings, 2);
  assert.equal(summary.groupedFindings, 2);
});

test("singleton finding produces a singleton group with singleton-no-grouping-key when files and subjects are empty", () => {
  const findings = [
    effective(
      finding("finding-3", {
        type: "design.no-location",
        files: [],
        subjects: [],
      }),
      "new",
    ),
  ];

  const { groups } = deriveIssueAdjudication({ findings });

  assert.equal(groups.length, 1);
  const [group] = groups;
  assert.deepEqual(group.memberFindingIds, ["finding-3"]);
  assert.ok(group.groupingReasons.includes("singleton-no-grouping-key"));
  assert.ok(!group.groupingReasons.includes("same-files"));
  assert.ok(!group.groupingReasons.includes("same-subjects"));
});

test("findings with subjects but no files group by subjects", () => {
  const findings = [
    effective(
      finding("finding-4", {
        type: "model.subject-shared",
        files: [],
        subjects: ["module:auth"],
      }),
      "new",
    ),
    effective(
      finding("finding-5", {
        type: "model.subject-shared",
        files: [],
        subjects: ["module:auth"],
      }),
      "new",
    ),
  ];

  const { groups } = deriveIssueAdjudication({ findings });

  assert.equal(groups.length, 1);
  const [group] = groups;
  assert.equal(group.memberFindingIds.length, 2);
  assert.ok(group.groupingReasons.includes("same-subjects"));
  assert.ok(!group.groupingReasons.includes("same-files"));
});

test("no findings are dropped", () => {
  const findings = [
    effective(finding("a", { type: "alpha", files: ["a.ts"] }), "new"),
    effective(finding("b", { type: "alpha", files: ["a.ts"] }), "new"),
    effective(finding("c", { type: "beta", files: ["b.ts"] }), "existing"),
  ];

  const { groups, summary } = deriveIssueAdjudication({ findings });
  const total = groups.reduce((sum, group) => sum + group.memberFindingIds.length, 0);

  assert.equal(total, findings.length);
  assert.equal(summary.groupedFindings, findings.length);
  assert.equal(summary.totalFindings, findings.length);
});

test("highest severity wins in a group", () => {
  const findings = [
    effective(
      finding("low", { type: "sev", files: ["x.ts"], severity: "low" }),
      "new",
    ),
    effective(
      finding("medium", { type: "sev", files: ["x.ts"], severity: "medium" }),
      "new",
    ),
    effective(
      finding("critical", { type: "sev", files: ["x.ts"], severity: "critical" }),
      "new",
    ),
    effective(
      finding("high", { type: "sev", files: ["x.ts"], severity: "high" }),
      "new",
    ),
  ];

  const { groups } = deriveIssueAdjudication({ findings });

  assert.equal(groups.length, 1);
  assert.equal(groups[0].severity, "critical");
  assert.equal(groups[0].canonicalFindingId, "critical");
});

test("accepted, ignored, and resolved statuses are preserved in statusBreakdown", () => {
  const findings = [
    effective(finding("a", { type: "mix", files: ["m.ts"] }), "accepted"),
    effective(finding("b", { type: "mix", files: ["m.ts"] }), "ignored"),
  ];
  const resolved = [
    effective(finding("c", { type: "mix", files: ["m.ts"] }), "resolved"),
  ];

  const { groups } = deriveIssueAdjudication({ findings, resolvedFindings: resolved });

  assert.equal(groups.length, 1);
  const [group] = groups;
  assert.equal(group.memberFindingIds.length, 3);
  assert.equal(group.statusBreakdown.accepted, 1);
  assert.equal(group.statusBreakdown.ignored, 1);
  assert.equal(group.statusBreakdown.resolved, 1);
  assert.equal(group.status, "mixed");
  assert.equal(group.active, false);
});

test("group with active + ignored member is active true and status mixed", () => {
  const findings = [
    effective(finding("a", { type: "mix", files: ["m.ts"] }), "new"),
    effective(finding("b", { type: "mix", files: ["m.ts"] }), "ignored"),
  ];

  const { groups, summary } = deriveIssueAdjudication({ findings });

  assert.equal(groups.length, 1);
  const [group] = groups;
  assert.equal(group.status, "mixed");
  assert.equal(group.active, true);
  assert.equal(group.canonicalFindingId, "a", "canonical should prefer the active member");
  assert.equal(summary.activeGroups, 0);
  assert.equal(summary.mixedGroups, 1);
});

test("createIssueAdjudicationReport produces a valid artifact with summary and groups", () => {
  const findings = [
    effective(finding("a", { type: "x", files: ["a.ts"] }), "new"),
    effective(finding("b", { type: "x", files: ["a.ts"] }), "new"),
  ];

  const report = createIssueAdjudicationReport({
    header: header("IssueAdjudicationReport", "issue-adjudication-1"),
    findings,
  });

  assert.equal(report.header.artifactType, "IssueAdjudicationReport");
  assert.equal(report.summary.totalGroups, 1);
  assert.equal(report.summary.totalFindings, 2);
  assert.equal(report.groups.length, 1);
});

// ---------- CLI tests ----------

test("rekon issues adjudicate writes an IssueAdjudicationReport with summary and groups", async () => {
  await withFixture(async (root) => {
    await seedTwoDuplicateFindings(root);

    const result = JSON.parse(
      runCli(["issues", "adjudicate", "--root", root, "--json"]).stdout,
    );

    assert.equal(result.artifact.type, "IssueAdjudicationReport");
    assert.ok(typeof result.artifact.id === "string" && result.artifact.id.startsWith("issue-adjudication-"));
    assert.ok(result.summary);
    assert.equal(result.summary.totalGroups, 1);
    assert.equal(result.summary.activeGroups, 1);
    assert.equal(result.summary.totalFindings, 2);
    assert.equal(result.groups.length, 1);
    assert.equal(result.groups[0].memberFindingIds.length, 2);
  });
});

test("rekon issues list returns the latest report's groups and accepts --status filtering", async () => {
  await withFixture(async (root) => {
    await seedTwoDuplicateFindings(root);

    runCli(["issues", "adjudicate", "--root", root, "--json"]);

    const list = JSON.parse(
      runCli(["issues", "list", "--root", root, "--json"]).stdout,
    );

    assert.equal(list.summary.totalGroups, 1);
    assert.equal(list.groups.length, 1);

    const filteredActive = JSON.parse(
      runCli(["issues", "list", "--root", root, "--status", "active", "--json"]).stdout,
    );
    assert.equal(filteredActive.groups.length, 1);

    const filteredResolved = JSON.parse(
      runCli(["issues", "list", "--root", root, "--status", "resolved", "--json"]).stdout,
    );
    assert.equal(filteredResolved.groups.length, 0);
  });
});

test("rekon issues list builds a fresh report if none exists yet", async () => {
  await withFixture(async (root) => {
    await seedTwoDuplicateFindings(root);

    const list = JSON.parse(
      runCli(["issues", "list", "--root", root, "--json"]).stdout,
    );

    assert.equal(list.artifact.type, "IssueAdjudicationReport");
    assert.equal(list.groups.length, 1);
  });
});

test("adjudication does not mutate FindingReport or FindingStatusLedger or FindingLifecycleReport", async () => {
  await withFixture(async (root) => {
    await seedTwoDuplicateFindings(root);

    const beforeReport = await readArtifactBody(root, "FindingReport");
    const beforeLifecycle = await readArtifactBody(root, "FindingLifecycleReport");

    runCli(["issues", "adjudicate", "--root", root, "--json"]);

    const afterReport = await readArtifactBody(root, "FindingReport");
    const afterLifecycle = await readArtifactBody(root, "FindingLifecycleReport");

    assert.deepEqual(afterReport, beforeReport, "FindingReport must not be mutated");
    assert.deepEqual(afterLifecycle, beforeLifecycle, "FindingLifecycleReport must not be mutated");
  });
});

test("artifacts freshness marks IssueAdjudicationReport stale after a newer FindingLifecycleReport", async () => {
  await withFixture(async (root) => {
    await seedTwoDuplicateFindings(root);

    const first = JSON.parse(
      runCli(["issues", "adjudicate", "--root", root, "--json"]).stdout,
    );
    const reportId = first.artifact.id;

    await new Promise((resolveTimer) => setTimeout(resolveTimer, 10));
    runCli(["findings", "lifecycle", "--root", root, "--json"]);

    const freshness = JSON.parse(
      runCli([
        "artifacts",
        "freshness",
        "--root",
        root,
        "--type",
        "IssueAdjudicationReport",
        "--id",
        reportId,
        "--json",
      ]).stdout,
    );

    const entry = freshness.artifacts.find((candidate) => candidate.id === reportId);
    assert.ok(entry, "expected a freshness entry for the adjudication report");
    assert.equal(entry.status, "stale");
    assert.ok(
      entry.issues.some(
        (issue) => issue.code === "newer-input-exists" && issue.inputType === "FindingLifecycleReport",
      ),
      `expected stale issue citing newer FindingLifecycleReport, got: ${JSON.stringify(entry.issues)}`,
    );
  });
});

test("artifacts validate stays clean after issues adjudicate writes a report", async () => {
  await withFixture(async (root) => {
    await seedTwoDuplicateFindings(root);
    runCli(["issues", "adjudicate", "--root", root, "--json"]);

    const validation = JSON.parse(
      runCli(["artifacts", "validate", "--root", root, "--json"]).stdout,
    );

    assert.equal(validation.valid, true);
    assert.deepEqual(validation.issues ?? [], []);
  });
});

test("runtime buildIssueAdjudicationReport carries lifecycle ref in inputRefs", async () => {
  await withFixture(async (root) => {
    await seedTwoDuplicateFindings(root);

    const store = createLocalArtifactStore(root);
    await store.init();

    const report = await buildIssueAdjudicationReport(store);

    assert.equal(report.header.artifactType, "IssueAdjudicationReport");
    assert.ok(
      report.header.inputRefs.some((ref) => ref.type === "FindingLifecycleReport"),
      "expected inputRefs to cite FindingLifecycleReport",
    );
  });
});

// ---------- helpers ----------

async function seedTwoDuplicateFindings(root) {
  const store = createLocalArtifactStore(root);
  await store.init();

  const report = createFindingReport({
    header: header("FindingReport", "finding-report-seed"),
    findings: [
      duplicateFinding("finding-alpha-1"),
      duplicateFinding("finding-alpha-2"),
    ],
  });

  await store.write(report, { category: "findings" });

  const lifecycle = deriveFindingLifecycle({ latestReport: report });
  const lifecycleArtifact = createFindingLifecycleReport({
    header: header("FindingLifecycleReport", "finding-lifecycle-seed"),
    findings: lifecycle.findings,
    resolvedFindings: lifecycle.resolvedFindings,
    decisions: lifecycle.decisions,
  });

  await store.write(lifecycleArtifact, { category: "findings" });
}

function duplicateFinding(id) {
  return {
    id,
    type: "import_boundary.parent_relative_import",
    severity: "medium",
    title: "Parent-relative import",
    description: "Imports starting with `../` should be replaced with explicit module imports.",
    subjects: ["src/foo.ts"],
    files: ["src/foo.ts"],
    ruleId: "import-boundaries.parent_relative_import",
  };
}

async function readArtifactBody(root, type) {
  const indexPath = join(root, ".rekon/registry/artifacts.index.json");
  const raw = JSON.parse(await readFile(indexPath, "utf8"));
  const entries = Array.isArray(raw) ? raw : Array.isArray(raw.artifacts) ? raw.artifacts : [];
  const sorted = entries
    .filter((entry) => entry.type === type)
    .sort((left, right) => right.id.localeCompare(left.id));
  const latest = sorted[0];
  if (!latest) {
    throw new Error(`expected to find ${type} in artifact index`);
  }
  return JSON.parse(await readFile(join(root, latest.path), "utf8"));
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
    evidence: overrides.evidence,
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
  const root = await mkdtemp(join(tmpdir(), "rekon-issue-adjudication-"));

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
