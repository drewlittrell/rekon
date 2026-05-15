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
  deriveFindingLifecycle,
  rollupIssueGroupsByAcceptedMergeDecisions,
} from "../../packages/kernel-findings/dist/index.js";
import {
  buildCoherencyDelta,
  buildIssueAdjudicationReport,
  createLocalArtifactStore,
  recordIssueMergeDecision,
} from "../../packages/runtime/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- pure-helper tests ----------

test("rollupIssueGroupsByAcceptedMergeDecisions collapses two groups when latest decision is accepted", () => {
  const groups = [group("issue-a"), group("issue-b"), group("issue-c")];
  const candidates = [
    candidate("merge-candidate:issue-a:issue-b", ["issue-a", "issue-b"]),
  ];
  const decisions = [
    decision({
      id: "d1",
      candidateId: "merge-candidate:issue-a:issue-b",
      decision: "accepted",
      groupIds: ["issue-a", "issue-b"],
      decidedAt: "2026-05-14T01:00:00.000Z",
    }),
  ];

  const rollups = rollupIssueGroupsByAcceptedMergeDecisions({
    groups,
    mergeCandidates: candidates,
    decisions,
  });

  assert.equal(rollups.length, 2);
  const merged = rollups.find((rollup) => rollup.groups.length > 1);
  const lone = rollups.find((rollup) => rollup.groups.length === 1);
  assert.ok(merged, "expected one merged rollup");
  assert.ok(lone, "expected one singleton rollup");
  assert.deepEqual(merged.groupIds, ["issue-a", "issue-b"]);
  assert.equal(merged.id, "merged:issue-a+issue-b");
  assert.deepEqual(merged.decisionIds, ["d1"]);
  assert.deepEqual(merged.candidateIds, ["merge-candidate:issue-a:issue-b"]);
  assert.equal(lone.id, "issue-c");
});

test("rollup respects latest rejected decision over older accepted decision", () => {
  const groups = [group("issue-a"), group("issue-b")];
  const candidates = [
    candidate("merge-candidate:issue-a:issue-b", ["issue-a", "issue-b"]),
  ];
  const decisions = [
    decision({
      id: "d-old",
      candidateId: "merge-candidate:issue-a:issue-b",
      decision: "accepted",
      groupIds: ["issue-a", "issue-b"],
      decidedAt: "2026-05-14T00:00:00.000Z",
    }),
    decision({
      id: "d-new",
      candidateId: "merge-candidate:issue-a:issue-b",
      decision: "rejected",
      groupIds: ["issue-a", "issue-b"],
      decidedAt: "2026-05-14T05:00:00.000Z",
    }),
  ];

  const rollups = rollupIssueGroupsByAcceptedMergeDecisions({
    groups,
    mergeCandidates: candidates,
    decisions,
  });

  assert.equal(rollups.length, 2, "rejected latest decision must keep groups separate");
  for (const rollup of rollups) {
    assert.equal(rollup.groups.length, 1);
    assert.deepEqual(rollup.decisionIds, []);
  }
});

test("rollup is transitive: accepted A-B and B-C merge into one rollup A-B-C", () => {
  const groups = [group("issue-a"), group("issue-b"), group("issue-c")];
  const candidates = [
    candidate("merge-candidate:issue-a:issue-b", ["issue-a", "issue-b"]),
    candidate("merge-candidate:issue-b:issue-c", ["issue-b", "issue-c"]),
  ];
  const decisions = [
    decision({
      id: "d1",
      candidateId: "merge-candidate:issue-a:issue-b",
      decision: "accepted",
      groupIds: ["issue-a", "issue-b"],
      decidedAt: "2026-05-14T01:00:00.000Z",
    }),
    decision({
      id: "d2",
      candidateId: "merge-candidate:issue-b:issue-c",
      decision: "accepted",
      groupIds: ["issue-b", "issue-c"],
      decidedAt: "2026-05-14T02:00:00.000Z",
    }),
  ];

  const rollups = rollupIssueGroupsByAcceptedMergeDecisions({
    groups,
    mergeCandidates: candidates,
    decisions,
  });

  assert.equal(rollups.length, 1);
  const [only] = rollups;
  assert.deepEqual(only.groupIds, ["issue-a", "issue-b", "issue-c"]);
  assert.deepEqual(only.decisionIds, ["d1", "d2"]);
  assert.deepEqual(
    only.candidateIds.sort(),
    [
      "merge-candidate:issue-a:issue-b",
      "merge-candidate:issue-b:issue-c",
    ].sort(),
  );
});

test("createCoherencyDelta merges two issue groups when an accepted decision links them", () => {
  const groups = [
    group("issue-a", {
      title: "Parent-relative import",
      severity: "medium",
      files: ["src/foo.ts"],
      memberFindingIds: ["finding-a-1", "finding-a-2"],
    }),
    group("issue-b", {
      title: "Layered import boundary",
      severity: "high",
      files: ["src/bar.ts"],
      memberFindingIds: ["finding-b-1"],
    }),
  ];
  const candidates = [
    candidate("merge-candidate:issue-a:issue-b", ["issue-a", "issue-b"]),
  ];
  const decisions = [
    decision({
      id: "d1",
      candidateId: "merge-candidate:issue-a:issue-b",
      decision: "accepted",
      groupIds: ["issue-a", "issue-b"],
      memberFindingIds: ["finding-a-1", "finding-b-1"],
      decidedAt: "2026-05-14T01:00:00.000Z",
    }),
  ];

  const delta = createCoherencyDelta({
    header: artifactHeader("CoherencyDelta", "delta-1"),
    issueGroups: groups,
    mergeCandidates: candidates,
    mergeDecisions: decisions,
    systemsForIssueGroup: () => ["app"],
  });

  assert.equal(delta.items.length, 1);
  const [item] = delta.items;
  assert.equal(item.id, "coherency:rollup:merged:issue-a+issue-b");
  assert.deepEqual(item.mergedIssueGroupIds, ["issue-a", "issue-b"]);
  assert.deepEqual(item.mergeDecisionIds, ["d1"]);
  assert.deepEqual(item.mergeCandidateIds, ["merge-candidate:issue-a:issue-b"]);
  assert.deepEqual(
    [...item.memberFindingIds].sort(),
    ["finding-a-1", "finding-a-2", "finding-b-1"].sort(),
  );
  assert.equal(item.severity, "high", "merged item must use worst severity");
  assert.ok(
    item.groupingReasons.includes("operator-accepted-merge"),
    "groupingReasons must include operator-accepted-merge",
  );
  assert.ok(item.active);
  assert.equal(item.status, "existing");
  assert.equal(item.issueGroupId, "issue-b", "canonical = highest-severity-active");
});

test("merged active rollup gets one merged remediation step", () => {
  const groups = [
    group("issue-a", { severity: "medium" }),
    group("issue-b", { severity: "high" }),
  ];
  const decisions = [
    decision({
      id: "d1",
      candidateId: "merge-candidate:issue-a:issue-b",
      decision: "accepted",
      groupIds: ["issue-a", "issue-b"],
      decidedAt: "2026-05-14T01:00:00.000Z",
    }),
  ];
  const candidates = [
    candidate("merge-candidate:issue-a:issue-b", ["issue-a", "issue-b"]),
  ];

  const delta = createCoherencyDelta({
    header: artifactHeader("CoherencyDelta", "delta-rem"),
    issueGroups: groups,
    mergeCandidates: candidates,
    mergeDecisions: decisions,
  });

  assert.equal(delta.remediationQueue.length, 1);
  const [step] = delta.remediationQueue;
  assert.equal(step.id, "remediation:merged:issue-a+issue-b");
  assert.equal(step.severity, "high");
  assert.equal(step.priority, "p0");
});

test("rejected decision keeps groups as separate CoherencyDelta items", () => {
  const groups = [group("issue-a"), group("issue-b")];
  const candidates = [
    candidate("merge-candidate:issue-a:issue-b", ["issue-a", "issue-b"]),
  ];
  const decisions = [
    decision({
      id: "d1",
      candidateId: "merge-candidate:issue-a:issue-b",
      decision: "rejected",
      groupIds: ["issue-a", "issue-b"],
      decidedAt: "2026-05-14T01:00:00.000Z",
    }),
  ];

  const delta = createCoherencyDelta({
    header: artifactHeader("CoherencyDelta", "delta-rej"),
    issueGroups: groups,
    mergeCandidates: candidates,
    mergeDecisions: decisions,
  });

  assert.equal(delta.items.length, 2);
  for (const item of delta.items) {
    assert.equal(item.mergedIssueGroupIds, undefined);
    assert.equal(item.mergeDecisionIds, undefined);
  }
  assert.equal(delta.remediationQueue.length, 2);
});

test("groups without any decisions stay singleton items (v2 behavior preserved)", () => {
  const groups = [group("issue-a"), group("issue-b")];

  const withoutDecisions = createCoherencyDelta({
    header: artifactHeader("CoherencyDelta", "delta-v2"),
    issueGroups: groups,
  });
  const withEmptyDecisions = createCoherencyDelta({
    header: artifactHeader("CoherencyDelta", "delta-v2b"),
    issueGroups: groups,
    mergeDecisions: [],
  });

  for (const delta of [withoutDecisions, withEmptyDecisions]) {
    assert.equal(delta.items.length, 2);
    for (const item of delta.items) {
      assert.equal(item.mergedIssueGroupIds, undefined);
      assert.ok(item.id.startsWith("coherency:group:"));
    }
  }
});

test("inactive-only merged rollup is not active and not in remediation queue", () => {
  const groups = [
    group("issue-a", { status: "accepted", active: false }),
    group("issue-b", { status: "accepted", active: false }),
  ];
  const candidates = [
    candidate("merge-candidate:issue-a:issue-b", ["issue-a", "issue-b"]),
  ];
  const decisions = [
    decision({
      id: "d1",
      candidateId: "merge-candidate:issue-a:issue-b",
      decision: "accepted",
      groupIds: ["issue-a", "issue-b"],
      decidedAt: "2026-05-14T01:00:00.000Z",
    }),
  ];

  const delta = createCoherencyDelta({
    header: artifactHeader("CoherencyDelta", "delta-inactive"),
    issueGroups: groups,
    mergeCandidates: candidates,
    mergeDecisions: decisions,
  });

  assert.equal(delta.items.length, 1);
  const [item] = delta.items;
  assert.equal(item.active, false);
  assert.equal(item.status, "accepted");
  assert.deepEqual(item.mergedIssueGroupIds, ["issue-a", "issue-b"]);
  assert.equal(delta.remediationQueue.length, 0);
});

// ---------- end-to-end runtime tests ----------

test("buildCoherencyDelta cites IssueMergeDecisionLedger in inputRefs and merges groups when accepted", async () => {
  await withCrossRuleFixture(async (root) => {
    const candidates = JSON.parse(
      runCli(["issues", "merge", "candidates", "--root", root, "--json"]).stdout,
    );
    assert.ok(candidates.mergeCandidates && candidates.mergeCandidates.length > 0);
    const candidateId = candidates.mergeCandidates[0].id;

    runCli([
      "issues",
      "merge",
      "decide",
      candidateId,
      "--decision",
      "accepted",
      "--note",
      "Same root cause for the test.",
      "--root",
      root,
      "--json",
    ]);

    const deltaResult = JSON.parse(
      runCli(["coherency", "delta", "--root", root, "--json"]).stdout,
    );
    const delta = JSON.parse(await readFile(join(root, deltaResult.artifact.path), "utf8"));

    const inputTypes = (delta.header.inputRefs ?? []).map((ref) => ref.type);
    assert.ok(
      inputTypes.includes("IssueMergeDecisionLedger"),
      `expected IssueMergeDecisionLedger in inputRefs; got ${JSON.stringify(inputTypes)}`,
    );
    assert.ok(
      inputTypes.includes("IssueAdjudicationReport"),
      "expected IssueAdjudicationReport to remain in inputRefs",
    );

    const mergedItem = delta.items.find(
      (candidate) =>
        Array.isArray(candidate.mergedIssueGroupIds) && candidate.mergedIssueGroupIds.length > 1,
    );
    assert.ok(mergedItem, "expected at least one merged rollup item");
    assert.ok(
      mergedItem.id.startsWith("coherency:rollup:merged:"),
      `expected merged rollup id prefix, got ${mergedItem.id}`,
    );
    assert.ok(Array.isArray(mergedItem.mergeDecisionIds) && mergedItem.mergeDecisionIds.length > 0);
    assert.ok(Array.isArray(mergedItem.mergeCandidateIds) && mergedItem.mergeCandidateIds.length > 0);
    assert.ok(
      mergedItem.groupingReasons.includes("operator-accepted-merge"),
      "merged item must carry operator-accepted-merge in groupingReasons",
    );

    const mergedRemediation = delta.remediationQueue.find((step) =>
      step.id.startsWith("remediation:merged:"),
    );
    assert.ok(mergedRemediation, "expected one merged remediation step");
  });
});

test("CoherencyDelta freshness goes stale after a newer IssueMergeDecisionLedger", async () => {
  await withCrossRuleFixture(async (root) => {
    const candidates = JSON.parse(
      runCli(["issues", "merge", "candidates", "--root", root, "--json"]).stdout,
    );
    const candidateId = candidates.mergeCandidates[0].id;

    runCli([
      "issues",
      "merge",
      "decide",
      candidateId,
      "--decision",
      "accepted",
      "--note",
      "Initial accept.",
      "--root",
      root,
      "--json",
    ]);
    const deltaResult = JSON.parse(
      runCli(["coherency", "delta", "--root", root, "--json"]).stdout,
    );
    const coherencyId = deltaResult.artifact.id;

    await new Promise((resolveTimer) => setTimeout(resolveTimer, 20));
    runCli([
      "issues",
      "merge",
      "decide",
      candidateId,
      "--decision",
      "rejected",
      "--note",
      "Reconsidered.",
      "--root",
      root,
      "--json",
    ]);

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
    assert.ok(entry, "expected freshness entry for the older CoherencyDelta");
    assert.equal(entry.status, "stale");
    assert.ok(
      entry.issues.some(
        (issue) => issue.code === "newer-input-exists" && issue.inputType === "IssueMergeDecisionLedger",
      ),
      `expected stale issue citing newer IssueMergeDecisionLedger, got ${JSON.stringify(entry.issues)}`,
    );
  });
});

test("artifacts validate stays clean after merge-decision-aware CoherencyDelta", async () => {
  await withCrossRuleFixture(async (root) => {
    const candidates = JSON.parse(
      runCli(["issues", "merge", "candidates", "--root", root, "--json"]).stdout,
    );
    const candidateId = candidates.mergeCandidates[0].id;

    runCli([
      "issues",
      "merge",
      "decide",
      candidateId,
      "--decision",
      "accepted",
      "--note",
      "Validation smoke.",
      "--root",
      root,
      "--json",
    ]);
    runCli(["coherency", "delta", "--root", root, "--json"]);

    const validation = JSON.parse(
      runCli(["artifacts", "validate", "--root", root, "--json"]).stdout,
    );
    assert.equal(validation.valid, true);
    assert.deepEqual(validation.issues ?? [], []);
  });
});

test("buildCoherencyDelta without decisions preserves v2 group-mode behavior", async () => {
  await withCrossRuleFixture(async (root) => {
    const deltaResult = JSON.parse(
      runCli(["coherency", "delta", "--root", root, "--json"]).stdout,
    );
    const delta = JSON.parse(await readFile(join(root, deltaResult.artifact.path), "utf8"));

    const inputTypes = (delta.header.inputRefs ?? []).map((ref) => ref.type);
    assert.ok(
      !inputTypes.includes("IssueMergeDecisionLedger"),
      "should not cite IssueMergeDecisionLedger when no decisions exist yet",
    );
    for (const item of delta.items) {
      assert.equal(item.mergedIssueGroupIds, undefined);
      assert.equal(item.mergeDecisionIds, undefined);
      assert.equal(item.mergeCandidateIds, undefined);
    }
  });
});

// ---------- helpers ----------

function group(id, overrides = {}) {
  return {
    id,
    canonicalFindingId: overrides.canonicalFindingId ?? `${id}-canonical`,
    memberFindingIds: overrides.memberFindingIds ?? [`${id}-1`],
    type: overrides.type ?? "test.example",
    ruleId: overrides.ruleId,
    severity: overrides.severity ?? "medium",
    status: overrides.status ?? "active",
    active: overrides.active ?? true,
    title: overrides.title ?? `Issue ${id}`,
    description: overrides.description ?? `Description for ${id}`,
    files: overrides.files ?? [`src/${id}.ts`],
    subjects: overrides.subjects ?? [`src/${id}.ts`],
    systems: overrides.systems,
    suggestedAction: overrides.suggestedAction,
    evidence: overrides.evidence,
    groupingKey: overrides.groupingKey ?? `${id}-key`,
    groupingReasons: overrides.groupingReasons ?? ["same-type", "same-files"],
    statusBreakdown: overrides.statusBreakdown ?? { new: 1 },
  };
}

function candidate(id, groupIds, overrides = {}) {
  return {
    id,
    groupIds,
    memberFindingIds: overrides.memberFindingIds ?? groupIds.map((gid) => `${gid}-1`),
    strength: overrides.strength ?? "strong",
    reasons: overrides.reasons ?? ["same-file", "same-severity"],
    confidence: overrides.confidence ?? 0.85,
    status: "candidate",
    note: overrides.note ?? "Test merge candidate.",
  };
}

function decision(overrides) {
  return {
    id: overrides.id ?? "decision-x",
    candidateId: overrides.candidateId ?? "merge-candidate:issue-a:issue-b",
    decision: overrides.decision ?? "accepted",
    note: overrides.note ?? "Default note.",
    reason: overrides.reason,
    groupIds: overrides.groupIds ?? ["issue-a", "issue-b"],
    memberFindingIds: overrides.memberFindingIds ?? ["a-1", "b-1"],
    decidedAt: overrides.decidedAt ?? "2026-05-14T00:00:00.000Z",
    decidedBy: overrides.decidedBy,
    source: overrides.source ?? "operator",
    evidence: overrides.evidence,
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

async function withCrossRuleFixture(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-coherency-v3-"));
  try {
    await cp(exampleRoot, root, {
      recursive: true,
      filter(source) {
        return !relative(exampleRoot, source).split(/[\\/]/).includes(".rekon");
      },
    });
    runCli(["init", "--root", root, "--json"]);
    runCli(["refresh", "--root", root, "--json"]);
    await seedCrossRuleFindings(root);
    await callback(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function seedCrossRuleFindings(root) {
  const store = createLocalArtifactStore(root);
  await store.init();

  const report = createFindingReport({
    header: artifactHeader("FindingReport", "fr-cross"),
    findings: [
      {
        id: "a1",
        type: "import_boundary.parent_relative_import",
        severity: "medium",
        title: "Parent-relative import",
        description: "Replace ../ imports.",
        subjects: ["src/foo.ts"],
        files: ["src/foo.ts"],
        ruleId: "import-boundaries.parent_relative_import",
        suggestedAction: "Convert parent-relative import to absolute",
      },
      {
        id: "b1",
        type: "import_boundary.generated_output_import",
        severity: "medium",
        title: "Generated output import",
        description: "Imports referencing dist/ should be replaced.",
        subjects: ["src/foo.ts"],
        files: ["src/foo.ts"],
        ruleId: "import-boundaries.generated_output_import",
        suggestedAction: "Re-target import away from generated output",
      },
    ],
  });
  const reportRef = await store.write(report, { category: "findings" });

  const lc = deriveFindingLifecycle({ latestReport: report });
  const lcHeader = artifactHeader("FindingLifecycleReport", "fl-cross");
  lcHeader.inputRefs = [reportRef];
  const lifecycle = createFindingLifecycleReport({
    header: lcHeader,
    findings: lc.findings,
    resolvedFindings: lc.resolvedFindings,
    decisions: lc.decisions,
  });
  await store.write(lifecycle, { category: "findings" });

  const adjudication = await buildIssueAdjudicationReport(store);
  await store.write(adjudication, { category: "findings" });
}

function runCli(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}
