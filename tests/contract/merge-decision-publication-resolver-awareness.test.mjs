import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- architecture summary ----------

test("architecture summary includes Accepted Issue Merge Roll-ups section after an accepted decision", async () => {
  await withAcceptedFixture(async ({ root, candidate, rollup }) => {
    runCli(["publish", "architecture", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "architecture-summary");
    const content = publication.content;

    assert.ok(content.includes("## Accepted Issue Merge Roll-ups"));
    for (const groupId of rollup.groupIds) {
      assert.ok(content.includes(groupId), `expected ${groupId} in architecture summary`);
    }
    assert.ok(
      content.includes(rollup.decisionId),
      `expected decision id ${rollup.decisionId} in architecture summary`,
    );
    assert.ok(
      content.includes("Roll-ups reflect operator-accepted merge decisions"),
      "expected merge roll-up explanatory paragraph",
    );
  });
});

test("architecture summary says no accepted roll-ups when no decisions exist", async () => {
  await withCrossRuleFixture(async (root) => {
    runCli(["publish", "architecture", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "architecture-summary");
    const content = publication.content;
    assert.ok(content.includes("## Accepted Issue Merge Roll-ups"));
    assert.ok(content.includes("No accepted issue merge roll-ups in latest CoherencyDelta."));
  });
});

test("architecture summary still cites IssueAdjudicationReport after merge-aware update", async () => {
  await withAcceptedFixture(async ({ root }) => {
    runCli(["publish", "architecture", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "architecture-summary");
    assert.ok(
      publication.header.inputRefs.some((ref) => ref.type === "IssueAdjudicationReport"),
      "architecture summary must still cite IssueAdjudicationReport",
    );
    assert.ok(
      publication.header.inputRefs.some((ref) => ref.type === "CoherencyDelta"),
      "architecture summary must still cite CoherencyDelta",
    );
  });
});

// ---------- agent contract ----------

test("agent contract includes Accepted Issue Merge Roll-ups subsection after an accepted decision", async () => {
  await withAcceptedFixture(async ({ root, rollup }) => {
    runCli(["publish", "agent-contract", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "agent-contract");
    const content = publication.content;

    assert.ok(content.includes("### Accepted Issue Merge Roll-ups"));
    for (const groupId of rollup.groupIds) {
      assert.ok(content.includes(groupId), `expected ${groupId} in agent contract`);
    }
    assert.ok(
      content.includes("inspect every member group"),
      "agent contract must instruct agents to inspect member groups",
    );
  });
});

test("agent contract Do Not Do warns roll-ups do not mutate raw issue groups", async () => {
  await withAcceptedFixture(async ({ root }) => {
    runCli(["publish", "agent-contract", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "agent-contract");
    assert.ok(
      publication.content.includes(
        "Do not treat accepted merge roll-ups as automatic mutation of raw issue groups",
      ),
    );
  });
});

test("agent contract no-rollup branch when no decisions exist", async () => {
  await withCrossRuleFixture(async (root) => {
    runCli(["publish", "agent-contract", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "agent-contract");
    const content = publication.content;
    assert.ok(content.includes("### Accepted Issue Merge Roll-ups"));
    assert.ok(content.includes("No accepted issue merge roll-ups in latest CoherencyDelta."));
  });
});

// ---------- resolve.issue ----------

test("resolve.issue includes mergeRollup + CoherencyDelta inputRef when matched group is in an accepted rollup", async () => {
  await withAcceptedFixture(async ({ root, rollup }) => {
    const [memberGroupId] = rollup.groupIds;
    const result = JSON.parse(
      runCli(["resolve", "issue", "--root", root, "--issue", memberGroupId, "--json"]).stdout,
    );

    const packet = result.packet;
    assert.equal(packet.matchSource, "IssueAdjudicationReport");
    assert.equal(packet.issueGroup.id, memberGroupId);
    assert.ok(packet.mergeRollup, "expected mergeRollup on packet");
    assert.deepEqual([...packet.mergeRollup.mergedIssueGroupIds].sort(), rollup.groupIds.slice().sort());
    assert.ok(packet.mergeRollup.mergeDecisionIds.includes(rollup.decisionId));
    assert.ok(packet.mergeRollup.memberFindingIds.length >= rollup.groupIds.length);

    assert.ok(
      packet.warnings.some((warning) =>
        warning.includes("operator-accepted merged roll-up") && warning.includes(memberGroupId === rollup.groupIds[0] ? rollup.groupIds[1] : rollup.groupIds[0]),
      ),
      `expected warning mentioning operator-accepted merged roll-up + sibling group, got ${JSON.stringify(packet.warnings)}`,
    );

    const trace = packet.resolutionTrace.find(
      (entry) => entry.step === "issue.merge" && entry.sourceType === "CoherencyDelta" && entry.status === "used",
    );
    assert.ok(trace, `expected issue.merge trace entry, got ${JSON.stringify(packet.resolutionTrace.map((t) => `${t.step}/${t.sourceType}/${t.status}`))}`);

    assert.ok(
      packet.header.inputRefs.some((ref) => ref.type === "CoherencyDelta"),
      "expected CoherencyDelta ref in packet inputRefs",
    );
    assert.ok(
      packet.header.inputRefs.some((ref) => ref.type === "IssueAdjudicationReport"),
      "expected IssueAdjudicationReport ref to remain in packet inputRefs",
    );
  });
});

test("resolve.issue does not attach mergeRollup when the latest decision is rejected", async () => {
  await withRejectedFixture(async ({ root, groupId }) => {
    const result = JSON.parse(
      runCli(["resolve", "issue", "--root", root, "--issue", groupId, "--json"]).stdout,
    );

    const packet = result.packet;
    assert.equal(packet.matchSource, "IssueAdjudicationReport");
    assert.equal(packet.mergeRollup, undefined, "rejected decisions must not produce a mergeRollup");
    for (const warning of packet.warnings) {
      assert.ok(
        !warning.includes("operator-accepted merged roll-up"),
        `did not expect operator-accepted merged roll-up warning, got ${warning}`,
      );
    }
    for (const entry of packet.resolutionTrace) {
      assert.ok(
        !(entry.step === "issue.merge" && entry.sourceType === "CoherencyDelta"),
        "did not expect issue.merge trace entry when decision is rejected",
      );
    }
  });
});

test("resolve.issue raw fallback still works without an IssueAdjudicationReport", async () => {
  await withRawFixture(async (root) => {
    const result = JSON.parse(
      runCli([
        "resolve",
        "issue",
        "--root",
        root,
        "--issue",
        "no-such-issue",
        "--json",
      ]).stdout,
    );
    const packet = result.packet;
    assert.equal(packet.mergeRollup, undefined);
    // Either no matchSource (when nothing matched) or FindingReport fallback.
    assert.notEqual(packet.matchSource, "IssueAdjudicationReport");
  });
});

test("rekon publish agents and publish proof still work after merge awareness wiring", async () => {
  await withAcceptedFixture(async ({ root }) => {
    const agentsResult = JSON.parse(
      runCli(["publish", "agents", "--root", root, "--json"]).stdout,
    );
    assert.ok(
      agentsResult.artifacts.some((ref) => ref.type === "Publication"),
      "publish agents should still emit a Publication",
    );

    const proofResult = JSON.parse(
      runCli(["publish", "proof", "--root", root, "--json"]).stdout,
    );
    assert.ok(
      proofResult.artifacts.some((ref) => ref.type === "Publication"),
      "publish proof should still emit a Publication",
    );
  });
});

// ---------- helpers ----------

async function withCrossRuleFixture(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-merge-aware-"));
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
    // Rebuild adjudication + delta so the seeded findings flow through
    // governed groups before tests assert publication / resolver output.
    runCli(["issues", "adjudicate", "--root", root, "--json"]);
    runCli(["coherency", "delta", "--root", root, "--json"]);
    await callback(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function withAcceptedFixture(callback) {
  await withCrossRuleFixture(async (root) => {
    const candidates = JSON.parse(
      runCli(["issues", "merge", "candidates", "--root", root, "--json"]).stdout,
    );
    assert.ok(candidates.mergeCandidates && candidates.mergeCandidates.length > 0,
      "expected at least one merge candidate after cross-rule seeding");
    const candidate = candidates.mergeCandidates[0];

    const decideResult = JSON.parse(
      runCli([
        "issues",
        "merge",
        "decide",
        candidate.id,
        "--root",
        root,
        "--decision",
        "accepted",
        "--note",
        "Same root cause for the test.",
        "--json",
      ]).stdout,
    );
    runCli(["coherency", "delta", "--root", root, "--json"]);

    const rollup = {
      groupIds: candidate.groupIds,
      candidateId: candidate.id,
      decisionId:
        decideResult.decision?.id
        ?? decideResult.ledger?.decisions?.[decideResult.ledger.decisions.length - 1]?.id
        ?? decideResult.artifact?.id,
    };
    assert.ok(rollup.decisionId, "decide CLI must return a decision id we can search for");

    await callback({ root, candidate, rollup });
  });
}

async function withRejectedFixture(callback) {
  await withCrossRuleFixture(async (root) => {
    const candidates = JSON.parse(
      runCli(["issues", "merge", "candidates", "--root", root, "--json"]).stdout,
    );
    const candidate = candidates.mergeCandidates[0];

    runCli([
      "issues",
      "merge",
      "decide",
      candidate.id,
      "--root",
      root,
      "--decision",
      "rejected",
      "--note",
      "Distinct issues.",
      "--reason",
      "separate-issues",
      "--json",
    ]);
    runCli(["coherency", "delta", "--root", root, "--json"]);

    await callback({ root, groupId: candidate.groupIds[0] });
  });
}

async function withRawFixture(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-merge-aware-raw-"));
  try {
    await cp(exampleRoot, root, {
      recursive: true,
      filter(source) {
        return !relative(exampleRoot, source).split(/[\\/]/).includes(".rekon");
      },
    });
    runCli(["init", "--root", root, "--json"]);
    runCli(["observe", "--root", root, "--json"]);
    runCli(["project", "--root", root, "--json"]);
    runCli(["snapshot", "--root", root, "--json"]);
    await callback(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function seedCrossRuleFindings(root) {
  const runtimeModule = await import(`${repoRoot}/packages/runtime/dist/index.js`);
  const findingsModule = await import(`${repoRoot}/packages/kernel-findings/dist/index.js`);
  const { createLocalArtifactStore, buildIssueAdjudicationReport } = runtimeModule;
  const { createFindingReport, createFindingLifecycleReport, deriveFindingLifecycle } = findingsModule;

  const store = createLocalArtifactStore(root);
  await store.init();

  const report = createFindingReport({
    header: artifactHeader("FindingReport", "fr-cross-aware"),
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
  const lcHeader = artifactHeader("FindingLifecycleReport", "fl-cross-aware");
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
    if (body.kind === kind) {
      return body;
    }
  }

  throw new Error(`No Publication of kind ${kind} found.`);
}

function runCli(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}
