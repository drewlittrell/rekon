// Issue merge decision operator ergonomics v1 —
// contract tests. Pin the new CLI surfaces and
// publication renderers end-to-end:
//   • `issues merge candidates --undecided / --decision / --stale / --superseded`
//   • `issues merge candidate <id>` detail
//   • `issues merge decide` previousDecision + changedDecision + recommendedNextCommands
//   • architecture summary "## Merge Candidate Decisions" section
//   • agent contract "### Merge Candidate Decisions" subsection
//   • `Do Not Do` reminder against assuming candidates are accepted
//   • commands are read-only except `issues merge decide`
//   • artifacts validate stays clean.
//
// All fixtures copy `examples/simple-js-ts` to mkdtemp
// so the committed example stays untouched.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- 1: --undecided returns only undecided ----------

test("`issues merge candidates --undecided` returns only undecided candidates", async () => {
  await withTwoCandidateFixture(async ({ root, candidates }) => {
    // Accept the first candidate so it leaves the
    // undecided bucket; the second stays undecided.
    runCli([
      "issues",
      "merge",
      "decide",
      candidates[0].id,
      "--root", root,
      "--decision", "accepted",
      "--note", "Same root cause.",
      "--json",
    ]);
    runCli(["coherency", "delta", "--root", root, "--json"]);
    const result = JSON.parse(
      runCli(["issues", "merge", "candidates", "--root", root, "--undecided", "--json"]).stdout,
    );
    const ids = result.mergeCandidateViews.map((view) => view.candidate.id);
    assert.deepEqual(ids.sort(), [candidates[1].id].sort());
    assert.equal(result.summary.undecided, 1);
    assert.equal(result.summary.accepted, 1);
    assert.equal(result.summary.rejected, 0);
  });
});

// ---------- 2: --decision accepted returns only accepted ----------

test("`issues merge candidates --decision accepted` returns only accepted candidates", async () => {
  await withTwoCandidateFixture(async ({ root, candidates }) => {
    runCli([
      "issues", "merge", "decide",
      candidates[0].id,
      "--root", root,
      "--decision", "accepted",
      "--note", "Accepted.",
      "--json",
    ]);
    const result = JSON.parse(
      runCli([
        "issues", "merge", "candidates",
        "--root", root,
        "--decision", "accepted",
        "--json",
      ]).stdout,
    );
    const ids = result.mergeCandidateViews.map((view) => view.candidate.id);
    assert.deepEqual(ids, [candidates[0].id]);
    assert.equal(result.summary.accepted, 1);
  });
});

// ---------- 3: --decision rejected returns only rejected ----------

test("`issues merge candidates --decision rejected` returns only rejected candidates", async () => {
  await withTwoCandidateFixture(async ({ root, candidates }) => {
    runCli([
      "issues", "merge", "decide",
      candidates[0].id,
      "--root", root,
      "--decision", "rejected",
      "--note", "Distinct issues.",
      "--reason", "separate-issues",
      "--json",
    ]);
    const result = JSON.parse(
      runCli([
        "issues", "merge", "candidates",
        "--root", root,
        "--decision", "rejected",
        "--json",
      ]).stdout,
    );
    const ids = result.mergeCandidateViews.map((view) => view.candidate.id);
    assert.deepEqual(ids, [candidates[0].id]);
    assert.equal(result.summary.rejected, 1);
  });
});

// ---------- 4: --decision none equals --undecided ----------

test("`issues merge candidates --decision none` returns the same set as --undecided", async () => {
  await withTwoCandidateFixture(async ({ root, candidates }) => {
    runCli([
      "issues", "merge", "decide",
      candidates[0].id,
      "--root", root,
      "--decision", "accepted",
      "--note", "Accepted.",
      "--json",
    ]);
    const noneResult = JSON.parse(
      runCli([
        "issues", "merge", "candidates",
        "--root", root,
        "--decision", "none",
        "--json",
      ]).stdout,
    );
    const undecidedResult = JSON.parse(
      runCli([
        "issues", "merge", "candidates",
        "--root", root,
        "--undecided",
        "--json",
      ]).stdout,
    );
    const noneIds = noneResult.mergeCandidateViews.map((view) => view.candidate.id).sort();
    const undecidedIds = undecidedResult.mergeCandidateViews.map((view) => view.candidate.id).sort();
    assert.deepEqual(noneIds, undecidedIds);
  });
});

// ---------- 5: candidate detail returns groups + memberFindingIds + files ----------

test("`issues merge candidate <id>` returns candidate details with member groups, findings, and files", async () => {
  await withTwoCandidateFixture(async ({ root, candidates }) => {
    const result = JSON.parse(
      runCli([
        "issues", "merge", "candidate",
        candidates[0].id,
        "--root", root,
        "--json",
      ]).stdout,
    );
    assert.equal(result.candidate.id, candidates[0].id);
    assert.ok(result.groups.length >= 1, "expected at least one member group");
    assert.ok(result.memberFindingIds.length >= 2, `expected >= 2 memberFindingIds, got ${result.memberFindingIds.length}`);
    assert.ok(Array.isArray(result.files));
    assert.ok(Array.isArray(result.recommendedCommands) && result.recommendedCommands.length > 0);
    assert.match(
      result.recommendedCommands[0],
      new RegExp(`rekon issues merge decide ${candidates[0].id} --decision accepted`),
    );
  });
});

// ---------- 6: candidate detail includes latest decision + decisionHistory ----------

test("candidate detail includes latest decision and decisionHistory", async () => {
  await withTwoCandidateFixture(async ({ root, candidates }) => {
    runCli([
      "issues", "merge", "decide",
      candidates[0].id,
      "--root", root,
      "--decision", "accepted",
      "--note", "First decision.",
      "--json",
    ]);
    // Re-decide to build decisionHistory length > 1.
    runCli([
      "issues", "merge", "decide",
      candidates[0].id,
      "--root", root,
      "--decision", "rejected",
      "--note", "Second decision.",
      "--reason", "separate-issues",
      "--json",
    ]);
    const result = JSON.parse(
      runCli([
        "issues", "merge", "candidate",
        candidates[0].id,
        "--root", root,
        "--json",
      ]).stdout,
    );
    assert.equal(result.decisionState, "rejected");
    assert.equal(result.decision.decision, "rejected");
    assert.equal(result.decisionHistory.length, 2);
    assert.equal(result.decisionHistory[0].decision, "rejected"); // newest first
    assert.equal(result.decisionHistory[1].decision, "accepted"); // older
  });
});

// ---------- 7: candidate detail includes rollup when accepted ----------

test("candidate detail includes rollup when an accepted decision produced a CoherencyDelta roll-up", async () => {
  await withTwoCandidateFixture(async ({ root, candidates }) => {
    runCli([
      "issues", "merge", "decide",
      candidates[0].id,
      "--root", root,
      "--decision", "accepted",
      "--note", "Accepted.",
      "--json",
    ]);
    runCli(["coherency", "delta", "--root", root, "--json"]);
    const result = JSON.parse(
      runCli([
        "issues", "merge", "candidate",
        candidates[0].id,
        "--root", root,
        "--json",
      ]).stdout,
    );
    assert.ok(result.rollup, "expected rollup when accepted decision has been delta-projected");
    assert.ok(
      (result.rollup.mergedIssueGroupIds ?? []).length > 1,
      "rollup item must carry mergedIssueGroupIds",
    );
  });
});

// ---------- 8: candidate detail warns when superseded ----------

test("candidate detail warns when candidate decision is superseded", async () => {
  await withTwoCandidateFixture(async ({ root, candidates }) => {
    runCli([
      "issues", "merge", "decide",
      candidates[0].id,
      "--root", root,
      "--decision", "accepted",
      "--note", "Accepted.",
      "--json",
    ]);
    runCli(["coherency", "delta", "--root", root, "--json"]);
    // Re-decide as rejected; CoherencyDelta still has
    // the old accepted roll-up cited.
    runCli([
      "issues", "merge", "decide",
      candidates[0].id,
      "--root", root,
      "--decision", "rejected",
      "--note", "Reversed.",
      "--reason", "separate-issues",
      "--json",
    ]);
    const result = JSON.parse(
      runCli([
        "issues", "merge", "candidate",
        candidates[0].id,
        "--root", root,
        "--json",
      ]).stdout,
    );
    assert.equal(result.superseded, true, "expected superseded:true after reversing an accepted decision without rebuilding the delta");
    assert.ok(
      result.warnings.some((warning) => warning.includes("not the decision currently reflected in CoherencyDelta")),
      `expected a superseded warning, got ${JSON.stringify(result.warnings)}`,
    );
  });
});

// ---------- 9: decide output reports previousDecision + changedDecision when re-deciding ----------

test("`issues merge decide` output includes previousDecision and changedDecision when re-deciding", async () => {
  await withTwoCandidateFixture(async ({ root, candidates }) => {
    const firstResult = JSON.parse(
      runCli([
        "issues", "merge", "decide",
        candidates[0].id,
        "--root", root,
        "--decision", "accepted",
        "--note", "First.",
        "--json",
      ]).stdout,
    );
    assert.equal(firstResult.previousDecision, null);
    assert.equal(firstResult.changedDecision, false);

    const reverseResult = JSON.parse(
      runCli([
        "issues", "merge", "decide",
        candidates[0].id,
        "--root", root,
        "--decision", "rejected",
        "--note", "Second.",
        "--reason", "separate-issues",
        "--json",
      ]).stdout,
    );
    assert.ok(reverseResult.previousDecision, "previousDecision should be populated on re-decide");
    assert.equal(reverseResult.previousDecision.decision, "accepted");
    assert.equal(reverseResult.changedDecision, true);

    const noChangeResult = JSON.parse(
      runCli([
        "issues", "merge", "decide",
        candidates[0].id,
        "--root", root,
        "--decision", "rejected",
        "--note", "Confirmed.",
        "--reason", "separate-issues",
        "--json",
      ]).stdout,
    );
    assert.equal(noChangeResult.previousDecision.decision, "rejected");
    assert.equal(noChangeResult.changedDecision, false);
  });
});

// ---------- 10: decide output includes recommendedNextCommands ----------

test("`issues merge decide` output includes recommendedNextCommands", async () => {
  await withTwoCandidateFixture(async ({ root, candidates }) => {
    const result = JSON.parse(
      runCli([
        "issues", "merge", "decide",
        candidates[0].id,
        "--root", root,
        "--decision", "accepted",
        "--note", "Accepted.",
        "--json",
      ]).stdout,
    );
    assert.ok(Array.isArray(result.recommendedNextCommands));
    assert.ok(result.recommendedNextCommands.some((command) => command.includes("rekon coherency delta")));
    assert.ok(result.recommendedNextCommands.some((command) => command.includes("rekon publish architecture")));
    assert.ok(result.recommendedNextCommands.some((command) => command.includes("rekon publish agent-contract")));
  });
});

// ---------- 11: architecture summary shows decision counts ----------

test("architecture summary renders Merge Candidate Decisions counts", async () => {
  await withTwoCandidateFixture(async ({ root, candidates }) => {
    runCli([
      "issues", "merge", "decide",
      candidates[0].id,
      "--root", root,
      "--decision", "accepted",
      "--note", "Accepted.",
      "--json",
    ]);
    runCli(["coherency", "delta", "--root", root, "--json"]);
    runCli(["publish", "architecture", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "architecture-summary");
    assert.ok(publication.content.includes("## Merge Candidate Decisions"));
    assert.match(publication.content, /- Total: 2/);
    assert.match(publication.content, /- Accepted: 1/);
    assert.match(publication.content, /- Undecided: 1/);
  });
});

// ---------- 12: architecture summary recommends --undecided when undecided exist ----------

test("architecture summary recommends `issues merge candidates --undecided` when undecided candidates exist", async () => {
  await withTwoCandidateFixture(async ({ root }) => {
    runCli(["publish", "architecture", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "architecture-summary");
    assert.match(
      publication.content,
      /rekon issues merge candidates --undecided --json/,
    );
  });
});

// ---------- 13: agent contract shows decision counts ----------

test("agent contract renders Merge Candidate Decisions counts and command when undecided exist", async () => {
  await withTwoCandidateFixture(async ({ root }) => {
    runCli(["publish", "agent-contract", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "agent-contract");
    assert.ok(publication.content.includes("### Merge Candidate Decisions"));
    assert.match(publication.content, /Merge candidate decisions:/);
    assert.match(publication.content, /- Undecided: 2/);
    assert.match(
      publication.content,
      /Ask the operator to review undecided candidates before treating merge roll-ups as final\./,
    );
    assert.match(
      publication.content,
      /rekon issues merge candidates --undecided --json/,
    );
  });
});

// ---------- 14: agent contract Do Not Do warns against assuming candidates are accepted ----------

test("agent contract Do Not Do reminds agents not to assume merge candidates are accepted", async () => {
  await withTwoCandidateFixture(async ({ root }) => {
    runCli(["publish", "agent-contract", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "agent-contract");
    assert.match(
      publication.content,
      /Do not assume advisory merge candidates are accepted; check IssueMergeDecisionLedger or run `rekon issues merge candidates --undecided`\./,
    );
  });
});

// ---------- 15: commands are read-only except `decide` ----------

test("read commands (`candidates`, `candidate`) do not mutate any artifact", async () => {
  await withTwoCandidateFixture(async ({ root, candidates }) => {
    const baselineSet = await artifactSet(root);
    runCli(["issues", "merge", "candidates", "--root", root, "--json"]);
    runCli(["issues", "merge", "candidates", "--root", root, "--undecided", "--json"]);
    runCli([
      "issues", "merge", "candidate",
      candidates[0].id,
      "--root", root, "--json",
    ]);
    const afterReadsSet = await artifactSet(root);
    assert.deepEqual(
      afterReadsSet.sort(),
      baselineSet.sort(),
      "read commands must not change the artifact directory listing",
    );

    runCli([
      "issues", "merge", "decide",
      candidates[0].id,
      "--root", root,
      "--decision", "accepted",
      "--note", "Accepted.",
      "--json",
    ]);
    const afterDecideSet = await artifactSet(root);
    const newArtifacts = afterDecideSet.filter((path) => !baselineSet.includes(path));
    assert.ok(
      newArtifacts.some((path) => path.includes("IssueMergeDecisionLedger")),
      `decide must write a new IssueMergeDecisionLedger; new artifacts = ${JSON.stringify(newArtifacts)}`,
    );
  });
});

// ---------- 16: artifacts validate stays clean ----------

test("artifacts validate stays clean across all operator-ergonomics scenarios", async () => {
  await withTwoCandidateFixture(async ({ root, candidates }) => {
    runCli([
      "issues", "merge", "decide",
      candidates[0].id,
      "--root", root,
      "--decision", "accepted",
      "--note", "Accepted.",
      "--json",
    ]);
    runCli(["coherency", "delta", "--root", root, "--json"]);
    runCli(["publish", "architecture", "--root", root, "--json"]);
    runCli(["publish", "agent-contract", "--root", root, "--json"]);
    const result = JSON.parse(
      runCli(["artifacts", "validate", "--root", root, "--json"]).stdout,
    );
    assert.equal(result.valid, true, `validate must be valid; got ${JSON.stringify(result.issues)}`);
    assert.deepEqual(result.issues ?? [], []);
  });
});

// ---------- helpers ----------

async function withTwoCandidateFixture(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-merge-ergo-"));
  try {
    await cp(exampleRoot, root, {
      recursive: true,
      filter(source) {
        return !relative(exampleRoot, source).split(/[\\/]/).includes(".rekon");
      },
    });
    runCli(["init", "--root", root, "--json"]);
    runCli(["refresh", "--root", root, "--json"]);
    await seedTwoCrossRuleCandidates(root);
    runCli(["issues", "adjudicate", "--root", root, "--json"]);
    runCli(["coherency", "delta", "--root", root, "--json"]);
    const candidatesResult = JSON.parse(
      runCli(["issues", "merge", "candidates", "--root", root, "--json"]).stdout,
    );
    const candidates = candidatesResult.mergeCandidates ?? [];
    assert.ok(
      candidates.length >= 2,
      `expected at least 2 merge candidates after seeding, got ${candidates.length}`,
    );
    await callback({ root, candidates });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

/**
 * Seed two distinct cross-rule pairs sharing the same
 * file. The exact-grouping pass treats each file+severity
 * pair separately, so the merge-candidate generator
 * emits two candidates (one per file).
 */
async function seedTwoCrossRuleCandidates(root) {
  const runtime = await import(`${repoRoot}/packages/runtime/dist/index.js`);
  const findings = await import(`${repoRoot}/packages/kernel-findings/dist/index.js`);
  const { createLocalArtifactStore, buildIssueAdjudicationReport } = runtime;
  const { createFindingReport, createFindingLifecycleReport, deriveFindingLifecycle } = findings;
  const store = createLocalArtifactStore(root);
  await store.init();

  const report = createFindingReport({
    header: artifactHeader("FindingReport", "fr-two-candidate"),
    findings: [
      // Pair 1: src/foo.ts — two rules, same file → one merge candidate
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
      // Pair 2: src/bar.ts — same two rules, different file → second merge candidate
      {
        id: "a2",
        type: "import_boundary.parent_relative_import",
        severity: "medium",
        title: "Parent-relative import",
        description: "Replace ../ imports.",
        subjects: ["src/bar.ts"],
        files: ["src/bar.ts"],
        ruleId: "import-boundaries.parent_relative_import",
        suggestedAction: "Convert parent-relative import to absolute",
      },
      {
        id: "b2",
        type: "import_boundary.generated_output_import",
        severity: "medium",
        title: "Generated output import",
        description: "Imports referencing dist/ should be replaced.",
        subjects: ["src/bar.ts"],
        files: ["src/bar.ts"],
        ruleId: "import-boundaries.generated_output_import",
        suggestedAction: "Re-target import away from generated output",
      },
    ],
  });
  const reportRef = await store.write(report, { category: "findings" });

  const lc = deriveFindingLifecycle({ latestReport: report });
  const lcHeader = artifactHeader("FindingLifecycleReport", "fl-two-candidate");
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

async function readLatestPublicationOfKind(root, kind) {
  const indexPath = join(root, ".rekon/registry/artifacts.index.json");
  const raw = JSON.parse(await readFile(indexPath, "utf8"));
  const entries = Array.isArray(raw) ? raw : Array.isArray(raw.artifacts) ? raw.artifacts : [];
  const publications = entries.filter((entry) => entry.type === "Publication");
  publications.sort((left, right) => right.writtenAt.localeCompare(left.writtenAt));
  for (const candidate of publications) {
    const body = JSON.parse(await readFile(join(root, candidate.path), "utf8"));
    if (body.kind === kind) return body;
  }
  throw new Error(`No Publication of kind ${kind} found.`);
}

async function artifactSet(root) {
  const out = [];
  async function walk(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile() && entry.name.endsWith(".json")) out.push(relative(root, path));
    }
  }
  await walk(join(root, ".rekon", "artifacts"));
  return out;
}

function runCli(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}
