import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";
import {
  applyIssueMergeDecisionsToCandidates,
  assertIssueMergeDecisionLedger,
  createIssueMergeDecisionLedger,
  findLatestIssueMergeDecision,
  validateIssueMergeDecisionLedger,
} from "../../packages/kernel-findings/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- pure-helper tests ----------

test("IssueMergeDecisionLedger validates an accepted decision with a note", () => {
  const ledger = createIssueMergeDecisionLedger({
    header: artifactHeader("IssueMergeDecisionLedger", "ledger-1"),
    decisions: [
      decision({
        id: "d1",
        candidateId: "merge-candidate:issue-a:issue-b",
        decision: "accepted",
        note: "Same boundary violation surfaced under two rules.",
        reason: "same-root-cause",
        groupIds: ["issue-a", "issue-b"],
        memberFindingIds: ["a1", "b1"],
      }),
    ],
  });

  assert.equal(ledger.decisions.length, 1);
  assert.equal(ledger.decisions[0].decision, "accepted");
  assert.equal(ledger.decisions[0].note, "Same boundary violation surfaced under two rules.");
});

test("IssueMergeDecisionLedger rejects a decision without a note", () => {
  const validation = validateIssueMergeDecisionLedger({
    header: artifactHeader("IssueMergeDecisionLedger", "ledger-bad"),
    decisions: [
      {
        id: "d1",
        candidateId: "merge-candidate:x:y",
        decision: "accepted",
        note: "",
        groupIds: ["x", "y"],
        memberFindingIds: [],
        decidedAt: "2026-05-14T00:00:00Z",
        source: "operator",
      },
    ],
  });

  assert.equal(validation.ok, false);
  assert.ok(
    validation.issues.some((issue) => issue.path.endsWith(".note")),
    `expected note validation error, got ${JSON.stringify(validation.issues)}`,
  );
});

test("findLatestIssueMergeDecision returns the most-recent decision for a candidate", () => {
  const ledger = createIssueMergeDecisionLedger({
    header: artifactHeader("IssueMergeDecisionLedger", "ledger-2"),
    decisions: [
      decision({
        id: "d1",
        candidateId: "merge-candidate:issue-a:issue-b",
        decision: "accepted",
        note: "Initial accept.",
        decidedAt: "2026-05-14T00:00:00.000Z",
      }),
      decision({
        id: "d2",
        candidateId: "merge-candidate:issue-a:issue-b",
        decision: "rejected",
        note: "On reflection these are separate.",
        decidedAt: "2026-05-14T01:00:00.000Z",
      }),
      decision({
        id: "d3",
        candidateId: "merge-candidate:other",
        decision: "accepted",
        note: "Unrelated.",
        decidedAt: "2026-05-14T00:30:00.000Z",
      }),
    ],
  });

  const latest = findLatestIssueMergeDecision(ledger, "merge-candidate:issue-a:issue-b");
  assert.ok(latest);
  assert.equal(latest.id, "d2");
  assert.equal(latest.decision, "rejected");
});

test("applyIssueMergeDecisionsToCandidates annotates candidates with decision metadata", () => {
  const candidates = [
    {
      id: "merge-candidate:issue-a:issue-b",
      groupIds: ["issue-a", "issue-b"],
      memberFindingIds: ["a1", "b1"],
      strength: "strong",
      reasons: ["same-file", "same-severity"],
      confidence: 0.85,
      status: "candidate",
      note: "Cross-rule overlap.",
    },
    {
      id: "merge-candidate:issue-c:issue-d",
      groupIds: ["issue-c", "issue-d"],
      memberFindingIds: ["c1", "d1"],
      strength: "medium",
      reasons: ["same-file", "same-severity"],
      confidence: 0.55,
      status: "candidate",
      note: "Different rules, same file.",
    },
  ];
  const ledger = createIssueMergeDecisionLedger({
    header: artifactHeader("IssueMergeDecisionLedger", "ledger-3"),
    decisions: [
      decision({
        id: "d1",
        candidateId: "merge-candidate:issue-a:issue-b",
        decision: "accepted",
        note: "Same root cause.",
        reason: "same-root-cause",
        decidedBy: "drew",
      }),
    ],
  });

  const annotated = applyIssueMergeDecisionsToCandidates(candidates, ledger);
  assert.equal(annotated[0].decision, "accepted");
  assert.equal(annotated[0].decisionReason, "same-root-cause");
  assert.equal(annotated[0].decisionDecidedBy, "drew");
  assert.equal(annotated[1].decision, undefined);

  // Original input is not mutated.
  assert.equal(candidates[0].decision, undefined);
});

// ---------- CLI tests ----------

test("rekon issues merge candidates returns annotated candidates", async () => {
  await withCrossRuleFixture(async (root) => {
    const initial = JSON.parse(
      runCli(["issues", "merge", "candidates", "--root", root, "--json"]).stdout,
    );

    assert.equal(initial.mergeCandidates.length, 1);
    assert.equal(initial.mergeCandidates[0].decision, undefined);
    assert.equal(initial.ledger, null);
  });
});

test("rekon issues merge decide writes a ledger artifact and records the decision", async () => {
  await withCrossRuleFixture(async (root) => {
    const candidates = JSON.parse(
      runCli(["issues", "merge", "candidates", "--root", root, "--json"]).stdout,
    );
    const candidateId = candidates.mergeCandidates[0].id;

    const result = JSON.parse(
      runCli([
        "issues",
        "merge",
        "decide",
        candidateId,
        "--root",
        root,
        "--decision",
        "accepted",
        "--note",
        "Same boundary; consolidate.",
        "--reason",
        "same-root-cause",
        "--decided-by",
        "drew",
        "--json",
      ]).stdout,
    );

    assert.equal(result.artifact.type, "IssueMergeDecisionLedger");
    assert.ok(result.artifact.id.startsWith("issue-merge-decision-ledger-"));
    assert.equal(result.decision.candidateId, candidateId);
    assert.equal(result.decision.decision, "accepted");
    assert.equal(result.decision.reason, "same-root-cause");
    assert.equal(result.decision.decidedBy, "drew");
    assert.equal(result.decision.note, "Same boundary; consolidate.");
    assert.equal(result.decision.source, "operator");
    assert.ok(Array.isArray(result.decision.groupIds));
    assert.ok(Array.isArray(result.decision.memberFindingIds));
  });
});

test("rekon issues merge decide rejects unknown candidate ids with a helpful listing", async () => {
  await withCrossRuleFixture(async (root) => {
    const failure = runCliExpectFailure([
      "issues",
      "merge",
      "decide",
      "no-such-candidate",
      "--root",
      root,
      "--decision",
      "accepted",
      "--note",
      "Trying.",
      "--json",
    ]);

    assert.ok(
      failure.stderr.includes("Merge candidate not found"),
      `expected unknown-candidate error, got: ${failure.stderr}`,
    );
    assert.ok(
      failure.stderr.includes("merge-candidate:issue-a1:issue-b1"),
      "expected available candidate ids in the error message",
    );
  });
});

test("rekon issues merge decide requires --note", async () => {
  await withCrossRuleFixture(async (root) => {
    const candidates = JSON.parse(
      runCli(["issues", "merge", "candidates", "--root", root, "--json"]).stdout,
    );
    const candidateId = candidates.mergeCandidates[0].id;

    const failure = runCliExpectFailure([
      "issues",
      "merge",
      "decide",
      candidateId,
      "--root",
      root,
      "--decision",
      "accepted",
      "--json",
    ]);

    assert.ok(
      failure.stderr.includes("rekon issues merge decide requires --note"),
      `expected missing-note error, got: ${failure.stderr}`,
    );
  });
});

test("rekon issues merge decisions returns the latest ledger", async () => {
  await withCrossRuleFixture(async (root) => {
    const empty = JSON.parse(
      runCli(["issues", "merge", "decisions", "--root", root, "--json"]).stdout,
    );
    assert.equal(empty.ledger, null);
    assert.equal(empty.decisions.length, 0);

    const candidates = JSON.parse(
      runCli(["issues", "merge", "candidates", "--root", root, "--json"]).stdout,
    );
    const candidateId = candidates.mergeCandidates[0].id;

    runCli([
      "issues",
      "merge",
      "decide",
      candidateId,
      "--root",
      root,
      "--decision",
      "accepted",
      "--note",
      "Accepted.",
      "--json",
    ]);

    const populated = JSON.parse(
      runCli(["issues", "merge", "decisions", "--root", root, "--json"]).stdout,
    );
    assert.ok(populated.ledger);
    assert.equal(populated.decisions.length, 1);
    assert.equal(populated.decisions[0].candidateId, candidateId);
    assert.equal(populated.decisions[0].decision, "accepted");
  });
});

test("rekon issues list includes annotated mergeCandidates after a decision", async () => {
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
      "--root",
      root,
      "--decision",
      "accepted",
      "--note",
      "Same boundary.",
      "--reason",
      "same-root-cause",
      "--json",
    ]);

    const list = JSON.parse(
      runCli(["issues", "list", "--root", root, "--json"]).stdout,
    );
    const annotated = list.mergeCandidates[0];
    assert.equal(annotated.id, candidateId);
    assert.equal(annotated.decision, "accepted");
    assert.equal(annotated.decisionReason, "same-root-cause");
  });
});

test("accepted decision does not mutate IssueAdjudicationReport groups (CoherencyDelta v3 merges them in the projection)", async () => {
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
      "--root",
      root,
      "--decision",
      "accepted",
      "--note",
      "Same boundary.",
      "--json",
    ]);

    const adj = JSON.parse(
      runCli(["issues", "list", "--root", root, "--json"]).stdout,
    );
    assert.equal(
      adj.summary.totalGroups,
      2,
      "adjudication still reports two groups (no mutation of upstream artifact)",
    );

    // CoherencyDelta v3 collapses accepted-merged groups into a single rollup
    // item / remediation step, while raw group ids stay traceable on the item.
    const delta = JSON.parse(
      runCli(["coherency", "delta", "--root", root, "--json"]).stdout,
    );
    assert.equal(delta.summary.total, 1, "accepted decision should produce one merged delta item");
    assert.equal(delta.summary.active, 1);
    assert.equal(delta.remediationQueue.length, 1);
    assert.ok(
      delta.remediationQueue[0].id.startsWith("remediation:merged:"),
      `expected merged remediation id, got ${delta.remediationQueue[0].id}`,
    );
  });
});

test("rejected decision keeps the candidate visible with rejected annotation", async () => {
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
      "--root",
      root,
      "--decision",
      "rejected",
      "--note",
      "Distinct concerns despite the file overlap.",
      "--reason",
      "separate-issues",
      "--json",
    ]);

    const list = JSON.parse(
      runCli(["issues", "list", "--root", root, "--json"]).stdout,
    );
    assert.equal(list.mergeCandidates.length, 1, "candidate must remain visible after rejection");
    assert.equal(list.mergeCandidates[0].id, candidateId);
    assert.equal(list.mergeCandidates[0].decision, "rejected");
    assert.equal(list.mergeCandidates[0].decisionReason, "separate-issues");
  });
});

test("IssueMergeDecisionLedger is treated as canonical input by freshness (no lineage.unknown)", async () => {
  await withCrossRuleFixture(async (root) => {
    const candidates = JSON.parse(
      runCli(["issues", "merge", "candidates", "--root", root, "--json"]).stdout,
    );
    const candidateId = candidates.mergeCandidates[0].id;

    const decideResult = JSON.parse(
      runCli([
        "issues",
        "merge",
        "decide",
        candidateId,
        "--root",
        root,
        "--decision",
        "accepted",
        "--note",
        "Accepted.",
        "--json",
      ]).stdout,
    );
    const ledgerId = decideResult.artifact.id;

    const freshness = JSON.parse(
      runCli([
        "artifacts",
        "freshness",
        "--root",
        root,
        "--type",
        "IssueMergeDecisionLedger",
        "--id",
        ledgerId,
        "--json",
      ]).stdout,
    );

    const entry = freshness.artifacts.find((candidate) => candidate.id === ledgerId);
    assert.ok(entry);
    const hasLineageUnknown = (entry.issues ?? []).some(
      (issue) => issue.code === "lineage.unknown",
    );
    assert.equal(
      hasLineageUnknown,
      false,
      `expected no lineage.unknown for IssueMergeDecisionLedger, got: ${JSON.stringify(entry.issues)}`,
    );
  });
});

test("artifacts validate stays clean after a merge decision is recorded", async () => {
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
      "--root",
      root,
      "--decision",
      "accepted",
      "--note",
      "Accepted.",
      "--json",
    ]);

    const validation = JSON.parse(
      runCli(["artifacts", "validate", "--root", root, "--json"]).stdout,
    );
    assert.equal(validation.valid, true);
  });
});

// ---------- helpers ----------

async function withCrossRuleFixture(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-merge-decision-"));

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
  const runtimeModule = await import(`${repoRoot}/packages/runtime/dist/index.js`);
  const findingsModule = await import(`${repoRoot}/packages/kernel-findings/dist/index.js`);
  const { createLocalArtifactStore, buildIssueAdjudicationReport, buildCoherencyDelta } = runtimeModule;
  const { createFindingReport, createFindingLifecycleReport, deriveFindingLifecycle } = findingsModule;

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

  const delta = await buildCoherencyDelta(store);
  await store.write(delta, { category: "findings" });
}

function decision(overrides) {
  return {
    id: overrides.id ?? "decision-x",
    candidateId: overrides.candidateId ?? "merge-candidate:x:y",
    decision: overrides.decision ?? "accepted",
    note: overrides.note ?? "Default note.",
    reason: overrides.reason,
    groupIds: overrides.groupIds ?? ["issue-a", "issue-b"],
    memberFindingIds: overrides.memberFindingIds ?? ["a1", "b1"],
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

function runCli(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}

function runCliExpectFailure(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0, `expected non-zero exit, stdout: ${result.stdout}`);
  return result;
}
