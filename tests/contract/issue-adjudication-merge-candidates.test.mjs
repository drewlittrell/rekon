import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";
import {
  deriveIssueAdjudication,
  deriveMergeCandidates,
} from "../../packages/kernel-findings/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- pure-helper tests ----------

test("related cross-rule findings sharing file/subject/severity emit one merge candidate", () => {
  const findings = [
    effective(
      finding("a1", {
        type: "import_boundary.parent_relative_import",
        ruleId: "import-boundaries.parent_relative_import",
        files: ["src/foo.ts"],
        subjects: ["src/foo.ts"],
        suggestedAction: "Convert parent-relative import to absolute",
      }),
      "new",
    ),
    effective(
      finding("b1", {
        type: "import_boundary.generated_output_import",
        ruleId: "import-boundaries.generated_output_import",
        files: ["src/foo.ts"],
        subjects: ["src/foo.ts"],
        suggestedAction: "Re-target import away from generated output",
      }),
      "new",
    ),
  ];

  const { groups, mergeCandidates, summary } = deriveIssueAdjudication({ findings });

  assert.equal(groups.length, 2, "different types should remain separate groups");
  assert.equal(mergeCandidates.length, 1, "should emit exactly one merge candidate");
  assert.equal(summary.mergeCandidates, 1);

  const [candidate] = mergeCandidates;
  assert.equal(candidate.status, "candidate");
  assert.deepEqual(candidate.groupIds.slice().sort(), ["issue-a1", "issue-b1"]);
  assert.deepEqual(candidate.memberFindingIds.slice().sort(), ["a1", "b1"]);
  assert.ok(candidate.id.startsWith("merge-candidate:"));
});

test("merge candidate includes deterministic reasons", () => {
  const findings = [
    effective(
      finding("a", {
        type: "import_boundary.parent_relative_import",
        files: ["src/foo.ts"],
        subjects: ["src/foo.ts"],
        suggestedAction: "Convert parent-relative import to absolute",
      }),
      "new",
    ),
    effective(
      finding("b", {
        type: "import_boundary.generated_output_import",
        files: ["src/foo.ts"],
        subjects: ["src/foo.ts"],
        suggestedAction: "Re-target import away from generated output",
      }),
      "new",
    ),
  ];
  const { mergeCandidates } = deriveIssueAdjudication({ findings });

  assert.equal(mergeCandidates.length, 1);
  const reasons = mergeCandidates[0].reasons;
  assert.ok(reasons.includes("same-file"));
  assert.ok(reasons.includes("same-subject"));
  assert.ok(reasons.includes("same-severity"));
  assert.ok(reasons.includes("related-type-prefix"));
  assert.ok(reasons.includes("same-suggested-action"));
});

test("candidate confidence and strength are deterministic", () => {
  const findings = [
    effective(
      finding("a", {
        type: "import_boundary.parent_relative_import",
        files: ["src/foo.ts"],
        subjects: ["src/foo.ts"],
        suggestedAction: "Convert parent-relative import to absolute",
      }),
      "new",
    ),
    effective(
      finding("b", {
        type: "import_boundary.generated_output_import",
        files: ["src/foo.ts"],
        subjects: ["src/foo.ts"],
        suggestedAction: "Re-target import away from generated output",
      }),
      "new",
    ),
  ];

  const first = deriveIssueAdjudication({ findings }).mergeCandidates[0];
  const second = deriveIssueAdjudication({ findings }).mergeCandidates[0];

  assert.equal(first.confidence, second.confidence);
  assert.equal(first.strength, second.strength);
  assert.equal(first.id, second.id);
  // Same-file + same-subject + same-severity + related-prefix + same-action
  // = 0.35 + 0.30 + 0.10 + 0.15 + 0.15 = 1.05 → capped at 1.
  assert.equal(first.confidence, 1);
  assert.equal(first.strength, "strong");
});

test("unrelated findings do not produce a merge candidate", () => {
  const findings = [
    effective(
      finding("alpha", {
        type: "alpha.rule",
        files: ["alpha.ts"],
        subjects: ["alpha.ts"],
        severity: "critical",
        suggestedAction: "Refactor module ownership",
      }),
      "new",
    ),
    effective(
      finding("beta", {
        type: "beta.rule",
        files: ["beta.ts"],
        subjects: ["beta.ts"],
        severity: "low",
        suggestedAction: "Update README documentation",
      }),
      "new",
    ),
  ];

  const { groups, mergeCandidates } = deriveIssueAdjudication({ findings });

  assert.equal(groups.length, 2);
  assert.equal(mergeCandidates.length, 0);
});

test("exact duplicates still group normally and do not produce a candidate between duplicate members", () => {
  const findings = [
    effective(
      finding("d1", {
        type: "import_boundary.parent_relative_import",
        ruleId: "import-boundaries.parent_relative_import",
        files: ["src/foo.ts"],
        subjects: ["src/foo.ts"],
      }),
      "new",
    ),
    effective(
      finding("d2", {
        type: "import_boundary.parent_relative_import",
        ruleId: "import-boundaries.parent_relative_import",
        files: ["src/foo.ts"],
        subjects: ["src/foo.ts"],
      }),
      "new",
    ),
  ];

  const { groups, mergeCandidates } = deriveIssueAdjudication({ findings });
  assert.equal(groups.length, 1);
  assert.equal(groups[0].memberFindingIds.length, 2);
  assert.equal(mergeCandidates.length, 0);
});

test("two inactive groups do not produce a merge candidate", () => {
  const findings = [
    effective(
      finding("a", {
        type: "import_boundary.parent_relative_import",
        files: ["src/foo.ts"],
        subjects: ["src/foo.ts"],
        suggestedAction: "Convert parent-relative import to absolute",
      }),
      "accepted",
    ),
    effective(
      finding("b", {
        type: "import_boundary.generated_output_import",
        files: ["src/foo.ts"],
        subjects: ["src/foo.ts"],
        suggestedAction: "Re-target import away from generated output",
      }),
      "resolved",
    ),
  ];

  const { mergeCandidates } = deriveIssueAdjudication({ findings });
  assert.equal(mergeCandidates.length, 0);
});

test("one active + one inactive candidate only emits when strong", () => {
  // Build two groups with confidence < strong threshold and mixed activity.
  // Same-severity (0.10) + same-suggested-action (0.15) → 0.25, below 0.45 floor.
  const weakMixed = deriveIssueAdjudication({
    findings: [
      effective(
        finding("active", {
          type: "alpha.rule",
          files: ["a.ts"],
          subjects: ["a"],
          severity: "medium",
          suggestedAction: "Update README documentation",
        }),
        "new",
      ),
      effective(
        finding("inactive", {
          type: "beta.rule",
          files: ["b.ts"],
          subjects: ["b"],
          severity: "medium",
          suggestedAction: "Update README documentation",
        }),
        "accepted",
      ),
    ],
  });
  assert.equal(weakMixed.mergeCandidates.length, 0, "mixed-activity below strong threshold should not emit");

  // Build two groups with confidence well above 0.70 across mixed activity.
  // Same-file (0.35) + same-subject (0.30) + same-severity (0.10)
  //   + related-type-prefix (0.15) = 0.90 → strong; should emit.
  const strongMixed = deriveIssueAdjudication({
    findings: [
      effective(
        finding("alpha-active", {
          type: "import_boundary.parent_relative_import",
          files: ["src/foo.ts"],
          subjects: ["src/foo.ts"],
          suggestedAction: "Refactor parent-relative import",
        }),
        "new",
      ),
      effective(
        finding("beta-accepted", {
          type: "import_boundary.generated_output_import",
          files: ["src/foo.ts"],
          subjects: ["src/foo.ts"],
          suggestedAction: "Avoid generated output reference",
        }),
        "accepted",
      ),
    ],
  });
  assert.equal(strongMixed.mergeCandidates.length, 1, "strong mixed-activity pair should emit");
  assert.equal(strongMixed.mergeCandidates[0].strength, "strong");
  assert.ok(
    strongMixed.mergeCandidates[0].note.includes(
      "One or more candidate groups are accepted, ignored, or resolved",
    ),
    "note should mention the inactive context",
  );
});

test("deriveMergeCandidates is exported and exposes the same deterministic shape", () => {
  const findings = [
    effective(
      finding("a", {
        type: "import_boundary.parent_relative_import",
        files: ["src/foo.ts"],
        subjects: ["src/foo.ts"],
        suggestedAction: "Convert parent-relative import",
      }),
      "new",
    ),
    effective(
      finding("b", {
        type: "import_boundary.generated_output_import",
        files: ["src/foo.ts"],
        subjects: ["src/foo.ts"],
        suggestedAction: "Re-target generated output import",
      }),
      "new",
    ),
  ];
  const { groups } = deriveIssueAdjudication({ findings });
  const candidates = deriveMergeCandidates(groups);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].id, "merge-candidate:issue-a:issue-b");
});

// ---------- CLI tests ----------

test("rekon issues adjudicate JSON includes mergeCandidates", async () => {
  await withCrossRuleFixture(async (root) => {
    const result = JSON.parse(
      runCli(["issues", "adjudicate", "--root", root, "--json"]).stdout,
    );

    assert.equal(result.summary.totalGroups, 2);
    assert.equal(result.summary.mergeCandidates, 1);
    assert.equal(result.mergeCandidates.length, 1);
    assert.equal(result.mergeCandidates[0].status, "candidate");
    assert.ok(result.mergeCandidates[0].reasons.includes("same-file"));
  });
});

test("rekon issues list JSON exposes mergeCandidates from the latest report", async () => {
  await withCrossRuleFixture(async (root) => {
    runCli(["issues", "adjudicate", "--root", root, "--json"]);

    const list = JSON.parse(
      runCli(["issues", "list", "--root", root, "--json"]).stdout,
    );

    assert.equal(list.mergeCandidates.length, 1);
    assert.equal(list.mergeCandidates[0].groupIds.length, 2);
    assert.deepEqual(
      list.mergeCandidates[0].groupIds.slice().sort(),
      ["issue-a1", "issue-b1"],
    );
  });
});

test("CoherencyDelta does not count merge candidates as merged groups", async () => {
  await withCrossRuleFixture(async (root) => {
    runCli(["issues", "adjudicate", "--root", root, "--json"]);
    const result = JSON.parse(
      runCli(["coherency", "delta", "--root", root, "--json"]).stdout,
    );

    // Two cross-rule findings → 2 separate groups → 2 delta items.
    // Merge candidate is advisory only.
    assert.equal(result.summary.total, 2);
    assert.equal(result.summary.active, 2);
    assert.equal(result.remediationQueue.length, 2);
  });
});

test("artifacts validate stays clean with merge candidates in the report", async () => {
  await withCrossRuleFixture(async (root) => {
    runCli(["issues", "adjudicate", "--root", root, "--json"]);
    const validation = JSON.parse(
      runCli(["artifacts", "validate", "--root", root, "--json"]).stdout,
    );
    assert.equal(validation.valid, true);
    assert.deepEqual(validation.issues ?? [], []);
  });
});

// ---------- helpers ----------

async function withCrossRuleFixture(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-merge-candidates-"));

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
  const { createLocalArtifactStore, buildIssueAdjudicationReport, buildCoherencyDelta } = await import(
    `${repoRoot}/packages/runtime/dist/index.js`
  );
  const { createFindingReport, createFindingLifecycleReport, deriveFindingLifecycle } = await import(
    `${repoRoot}/packages/kernel-findings/dist/index.js`
  );
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

function effective(base, effectiveStatus) {
  return {
    ...base,
    effectiveStatus,
    statusSource: "derived",
    lifecycle: {
      firstSeenReportId: "fr-test",
      lastSeenReportId: "fr-test",
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
