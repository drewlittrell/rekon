// Issue merge decision freshness guardrails (v1) —
// contract tests. Pin the freshness predicate's
// detection rules end-to-end through architecture
// summary, agent contract, and resolve.issue, plus
// the unit-level helper behavior.
//
// All fixtures copy `examples/simple-js-ts` to a
// mkdtemp tmpdir and run the full CLI flow so the
// committed example stays untouched.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";
import { detectIssueMergeRollupFreshness } from "../../packages/kernel-findings/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- Test 1: clean accepted roll-up — no architecture-summary warning ----------

test("architecture summary: clean accepted merge roll-up produces no freshness warning", async () => {
  await withAcceptedFixture(async ({ root }) => {
    runCli(["publish", "architecture", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "architecture-summary");
    assert.ok(publication.content.includes("### Merge Roll-up Freshness"));
    assert.ok(publication.content.includes("Accepted merge roll-up lineage is fresh."));
    assert.ok(
      !publication.content.includes("Do not rely on accepted merge roll-ups until `rekon refresh`"),
      "fresh path must not render the stale callout",
    );
  });
});

// ---------- Test 2: newer ledger exists — merge-ledger-stale ----------

test("architecture summary: warns merge-ledger-stale when a newer IssueMergeDecisionLedger exists", async () => {
  await withSupersededLedgerFixture(async ({ root }) => {
    runCli(["publish", "architecture", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "architecture-summary");
    assert.ok(publication.content.includes("### Merge Roll-up Freshness"));
    assert.ok(publication.content.includes("- Status: stale"));
    assert.match(publication.content, /merge-ledger-stale/);
    assert.match(publication.content, /Do not rely on accepted merge roll-ups/);
  });
});

// ---------- Test 3: merged roll-ups but no ledger inputRef — merge-ledger-missing ----------

test("architecture summary: warns merge-ledger-missing when CoherencyDelta has merged roll-ups but no IssueMergeDecisionLedger inputRef", async () => {
  await withAcceptedFixture(async ({ root }) => {
    // Surgically strip the IssueMergeDecisionLedger
    // ref from the latest CoherencyDelta so the
    // helper sees a roll-up with no cited ledger.
    await stripCoherencyDeltaInputRef(root, "IssueMergeDecisionLedger");

    runCli(["publish", "architecture", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "architecture-summary");
    assert.match(publication.content, /merge-ledger-missing/);
    assert.ok(publication.content.includes("- Status: stale"));
  });
});

// ---------- Test 4: newer adjudication exists — adjudication-stale ----------

test("architecture summary: warns adjudication-stale when a newer IssueAdjudicationReport exists", async () => {
  await withAcceptedFixture(async ({ root }) => {
    // Force a newer IssueAdjudicationReport whose
    // artifactId differs from the one CoherencyDelta
    // cited. The simplest deterministic way is to
    // re-run `rekon issues adjudicate` (a new
    // adjudication is written with a fresh
    // artifactId) while leaving the existing
    // CoherencyDelta in place.
    runCli(["issues", "adjudicate", "--root", root, "--json"]);

    runCli(["publish", "architecture", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "architecture-summary");
    assert.match(publication.content, /adjudication-stale/);
    assert.ok(publication.content.includes("- Status: stale"));
  });
});

// ---------- Test 5: newer lifecycle exists — lifecycle-stale ----------

test("architecture summary: warns lifecycle-stale when adjudication is stale relative to a newer FindingLifecycleReport", async () => {
  await withAcceptedFixture(async ({ root }) => {
    // Re-run lifecycle (fresh artifactId), then
    // re-run adjudication so the latest adjudication
    // is the one referenced by CoherencyDelta — but
    // a NEWER lifecycle exists that the adjudication
    // doesn't cite. We achieve this by writing a
    // fresh lifecycle artifact AFTER the existing
    // adjudication+delta were produced.
    await writeFreshLifecycleArtifact(root);

    runCli(["publish", "architecture", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "architecture-summary");
    assert.match(publication.content, /lifecycle-stale/);
    assert.ok(publication.content.includes("- Status: stale"));
  });
});

// ---------- Test 6: latest decision supersedes the roll-up decision ----------

test("architecture summary: warns merge-decision-superseded when latest decision differs from the roll-up decision", async () => {
  await withSupersededLedgerFixture(async ({ root }) => {
    // withSupersededLedgerFixture already added a
    // newer rejected decision for the same candidate,
    // so the latest decision differs from the
    // roll-up's decisionId AND its status is no
    // longer "accepted".
    runCli(["publish", "architecture", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "architecture-summary");
    assert.match(publication.content, /merge-decision-superseded/);
  });
});

// ---------- Test 7: agent contract renders stale merge decision callout ----------

test("agent contract: renders stale merge decision callout when ledger is superseded", async () => {
  await withSupersededLedgerFixture(async ({ root }) => {
    runCli(["publish", "agent-contract", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "agent-contract");
    assert.ok(publication.content.includes("### Merge Decision Freshness"));
    assert.match(
      publication.content,
      /Do not rely on accepted merge roll-ups until `rekon refresh`/,
    );
    assert.match(publication.content, /- Merge decisions: stale/);
    assert.match(
      publication.content,
      /Do not rely on accepted merge roll-ups after merge decisions, adjudication, or lifecycle artifacts change until `rekon refresh` has run\./,
    );
  });
});

// ---------- Test 8: agent contract clean path renders fresh status block ----------

test("agent contract: clean path renders fresh merge decision status with no callout", async () => {
  await withAcceptedFixture(async ({ root }) => {
    runCli(["publish", "agent-contract", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "agent-contract");
    assert.ok(publication.content.includes("### Merge Decision Freshness"));
    assert.match(publication.content, /- Merge decisions: fresh/);
    assert.match(publication.content, /- Adjudication: fresh/);
    assert.match(publication.content, /- Lifecycle: fresh/);
    assert.ok(
      !publication.content.includes("Do not rely on accepted merge roll-ups until `rekon refresh`"),
      "fresh path must not render the stale callout",
    );
  });
});

// ---------- Test 9: resolve.issue includes freshness warning when ledger is stale ----------

test("resolve.issue: appends freshness warning when latest decision supersedes the roll-up", async () => {
  await withSupersededLedgerFixture(async ({ root, rollup }) => {
    const [memberGroupId] = rollup.groupIds;
    const result = JSON.parse(
      runCli(["resolve", "issue", "--root", root, "--issue", memberGroupId, "--json"]).stdout,
    );
    const packet = result.packet;
    assert.ok(
      packet.warnings.some((warning) =>
        warning.includes("Accepted merge roll-up may be stale; run `rekon refresh`")),
      `expected freshness warning, got ${JSON.stringify(packet.warnings)}`,
    );
  });
});

// ---------- Test 10: resolve.issue resolutionTrace includes issue.merge.freshness ----------

test("resolve.issue: resolutionTrace includes issue.merge.freshness step", async () => {
  await withSupersededLedgerFixture(async ({ root, rollup }) => {
    const [memberGroupId] = rollup.groupIds;
    const result = JSON.parse(
      runCli(["resolve", "issue", "--root", root, "--issue", memberGroupId, "--json"]).stdout,
    );
    const packet = result.packet;
    const trace = packet.resolutionTrace.find(
      (entry) => entry.step === "issue.merge.freshness",
    );
    assert.ok(trace, `expected issue.merge.freshness trace entry, got ${JSON.stringify(packet.resolutionTrace.map((t) => t.step))}`);
    assert.equal(trace.status, "warning");
    assert.ok(
      Array.isArray(trace.details?.codes) && trace.details.codes.includes("merge-decision-superseded"),
      `trace details must include merge-decision-superseded code; got ${JSON.stringify(trace.details)}`,
    );
    // Resolver should cite the ledger / adjudication /
    // lifecycle artifacts it read for the freshness
    // check.
    const headerTypes = packet.header.inputRefs.map((ref) => ref.type);
    for (const t of ["IssueMergeDecisionLedger", "IssueAdjudicationReport", "FindingLifecycleReport"]) {
      assert.ok(
        headerTypes.includes(t),
        `expected ${t} in inputRefs after freshness check; got ${JSON.stringify(headerTypes)}`,
      );
    }
  });
});

// ---------- Test 11: resolve.issue clean path does not warn ----------

test("resolve.issue: clean accepted roll-up emits a `used` trace and no freshness warning", async () => {
  await withAcceptedFixture(async ({ root, rollup }) => {
    const [memberGroupId] = rollup.groupIds;
    const result = JSON.parse(
      runCli(["resolve", "issue", "--root", root, "--issue", memberGroupId, "--json"]).stdout,
    );
    const packet = result.packet;
    for (const warning of packet.warnings) {
      assert.ok(
        !warning.includes("Accepted merge roll-up may be stale; run `rekon refresh`"),
        `did not expect freshness warning, got ${warning}`,
      );
    }
    const trace = packet.resolutionTrace.find(
      (entry) => entry.step === "issue.merge.freshness",
    );
    assert.ok(trace, "expected issue.merge.freshness trace even on the clean path");
    assert.equal(trace.status, "used");
    assert.match(trace.message, /Accepted merge roll-up lineage is fresh\./);
  });
});

// ---------- Test 12: helper ignores CoherencyDelta without accepted merge roll-ups ----------

test("freshness helper: returns status `missing` when CoherencyDelta has no merged roll-ups", () => {
  const result = detectIssueMergeRollupFreshness({
    coherencyDelta: makeSyntheticDelta([]),
  });
  assert.equal(result.status, "missing");
  assert.deepEqual(result.warnings, []);
});

test("freshness helper: returns status `missing` when CoherencyDelta is absent", () => {
  const result = detectIssueMergeRollupFreshness({});
  assert.equal(result.status, "missing");
  assert.deepEqual(result.warnings, []);
});

test("freshness helper: fires Rule A (merge-ledger-missing) when merged items exist but no ledger ref is cited", () => {
  const delta = makeSyntheticDelta([
    {
      id: "rollup-1",
      mergedIssueGroupIds: ["g-a", "g-b"],
      mergeDecisionIds: ["d-1"],
      mergeCandidateIds: ["c-1"],
    },
  ]);
  // inputRefs intentionally empty of any
  // IssueMergeDecisionLedger.
  const result = detectIssueMergeRollupFreshness({ coherencyDelta: delta });
  assert.equal(result.status, "stale");
  assert.equal(result.warnings.length, 1);
  assert.equal(result.warnings[0].code, "merge-ledger-missing");
});

// ---------- Test 13: artifacts validate stays clean ----------

test("artifacts validate stays clean across all freshness-guardrails scenarios", async () => {
  for (const scenario of [withAcceptedFixture, withSupersededLedgerFixture]) {
    await scenario(async ({ root }) => {
      const result = JSON.parse(
        runCli(["artifacts", "validate", "--root", root, "--json"]).stdout,
      );
      assert.equal(result.valid, true, `validate must be valid: ${JSON.stringify(result.issues)}`);
      assert.deepEqual(result.issues ?? [], []);
    });
  }
});

// ---------- End-to-end-ish: accepted → newer rejected → publish + resolve warn ----------

test("end-to-end: accepted decision → newer rejected decision → publish + resolve both surface merge-decision-superseded", async () => {
  await withSupersededLedgerFixture(async ({ root, rollup }) => {
    runCli(["publish", "architecture", "--root", root, "--json"]);
    const arch = await readLatestPublicationOfKind(root, "architecture-summary");
    assert.match(arch.content, /merge-decision-superseded/);

    runCli(["publish", "agent-contract", "--root", root, "--json"]);
    const agent = await readLatestPublicationOfKind(root, "agent-contract");
    assert.match(
      agent.content,
      /Do not rely on accepted merge roll-ups until `rekon refresh`/,
    );

    const [memberGroupId] = rollup.groupIds;
    const result = JSON.parse(
      runCli(["resolve", "issue", "--root", root, "--issue", memberGroupId, "--json"]).stdout,
    );
    const trace = result.packet.resolutionTrace.find(
      (entry) => entry.step === "issue.merge.freshness",
    );
    assert.ok(
      Array.isArray(trace?.details?.codes) && trace.details.codes.includes("merge-decision-superseded"),
      `expected merge-decision-superseded code in trace, got ${JSON.stringify(trace)}`,
    );
  });
});

// ---------- helpers ----------

function makeSyntheticDelta(items) {
  return {
    header: {
      artifactType: "CoherencyDelta",
      artifactId: "synthetic-delta-1",
      schemaVersion: "0.1.0",
      generatedAt: new Date().toISOString(),
      subject: { repoId: "synthetic" },
      producer: { id: "test-harness", version: "0.1.0" },
      inputRefs: [],
      freshness: { status: "fresh" },
    },
    summary: {
      total: items.length,
      active: items.length,
      resolved: 0,
      accepted: 0,
      ignored: 0,
      bySeverity: {},
      byType: {},
      bySystem: {},
      topPaths: [],
    },
    items: items.map((item) => ({
      id: item.id,
      findingId: item.findingId ?? `${item.id}-finding`,
      type: item.type ?? "test",
      severity: item.severity ?? "medium",
      title: item.title ?? item.id,
      description: item.description ?? `${item.id} description`,
      files: item.files ?? [],
      systems: item.systems ?? [],
      status: item.status ?? "new",
      active: item.active ?? true,
      issueGroupId: item.issueGroupId,
      mergedIssueGroupIds: item.mergedIssueGroupIds,
      mergeDecisionIds: item.mergeDecisionIds,
      mergeCandidateIds: item.mergeCandidateIds,
      memberFindingIds: item.memberFindingIds,
    })),
    remediationQueue: [],
  };
}

async function withCrossRuleFixture(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-merge-freshness-"));
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
    assert.ok(
      candidates.mergeCandidates && candidates.mergeCandidates.length > 0,
      "expected at least one merge candidate after cross-rule seeding",
    );
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
        "Same root cause for the freshness test.",
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

/**
 * Accepted decision → newer rejected decision for the
 * same candidate. The CoherencyDelta still cites the
 * older ledger; the latest ledger has a superseding
 * rejected entry. Triggers Rule B (ledger stale) plus
 * Rule E (decision superseded).
 */
async function withSupersededLedgerFixture(callback) {
  await withAcceptedFixture(async ({ root, candidate, rollup }) => {
    // Add a newer rejected decision for the SAME
    // candidate. This produces a fresh
    // IssueMergeDecisionLedger artifact with a new
    // artifactId; the CoherencyDelta was built before
    // this write, so it still cites the older ledger.
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
      "Actually separate after re-review.",
      "--reason",
      "separate-issues",
      "--json",
    ]);
    // Do NOT re-run `coherency delta` here — that
    // would refresh CoherencyDelta to the new ledger
    // and erase the staleness we want to assert on.
    await callback({ root, candidate, rollup });
  });
}

/**
 * Read the latest CoherencyDelta from the local index,
 * strip every inputRef of the given type, then write
 * the modified delta to a NEW timestamped artifact id
 * so it wins the "latest" race. Used by Rule A
 * (merge-ledger-missing).
 */
async function stripCoherencyDeltaInputRef(root, refType) {
  const runtime = await import(`${repoRoot}/packages/runtime/dist/index.js`);
  const store = runtime.createLocalArtifactStore(root);
  await store.init();
  const list = await store.list("CoherencyDelta");
  assert.ok(list.length > 0, "no CoherencyDelta to mutate");
  const sorted = [...list].sort((left, right) => right.id.localeCompare(left.id));
  const latest = sorted[0];
  const delta = await store.read(latest);
  const stripped = {
    ...delta,
    header: {
      ...delta.header,
      artifactId: `${delta.header.artifactId}-stripped-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      inputRefs: (delta.header.inputRefs ?? []).filter((ref) => ref.type !== refType),
    },
  };
  await store.write(stripped, { category: "findings" });
}

/**
 * Write a fresh FindingLifecycleReport artifact AFTER
 * the existing adjudication so the adjudication that
 * CoherencyDelta cites is now stale relative to the
 * latest lifecycle. Used by Rule D.
 */
async function writeFreshLifecycleArtifact(root) {
  const runtime = await import(`${repoRoot}/packages/runtime/dist/index.js`);
  const findings = await import(`${repoRoot}/packages/kernel-findings/dist/index.js`);
  const store = runtime.createLocalArtifactStore(root);
  await store.init();
  const list = await store.list("FindingLifecycleReport");
  assert.ok(list.length > 0, "no FindingLifecycleReport to clone");
  const sorted = [...list].sort((left, right) => right.id.localeCompare(left.id));
  const latest = sorted[0];
  const lifecycle = await store.read(latest);
  // Write a new lifecycle artifact with a fresh
  // artifactId; same findings, same decisions.
  const cloned = findings.createFindingLifecycleReport({
    header: {
      artifactType: "FindingLifecycleReport",
      artifactId: `${lifecycle.header.artifactId}-fresh-${Date.now()}`,
      schemaVersion: lifecycle.header.schemaVersion ?? "0.1.0",
      generatedAt: new Date().toISOString(),
      subject: lifecycle.header.subject,
      producer: lifecycle.header.producer ?? { id: "test-harness", version: "0.1.0" },
      inputRefs: lifecycle.header.inputRefs ?? [],
      freshness: { status: "fresh" },
    },
    findings: lifecycle.findings,
    resolvedFindings: lifecycle.resolvedFindings ?? [],
    decisions: lifecycle.decisions ?? [],
  });
  await store.write(cloned, { category: "findings" });
}

async function seedCrossRuleFindings(root) {
  const runtime = await import(`${repoRoot}/packages/runtime/dist/index.js`);
  const findings = await import(`${repoRoot}/packages/kernel-findings/dist/index.js`);
  const { createLocalArtifactStore, buildIssueAdjudicationReport } = runtime;
  const { createFindingReport, createFindingLifecycleReport, deriveFindingLifecycle } = findings;
  const store = createLocalArtifactStore(root);
  await store.init();

  const report = createFindingReport({
    header: artifactHeader("FindingReport", "fr-freshness"),
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
  const lcHeader = artifactHeader("FindingLifecycleReport", "fl-freshness");
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

function runCli(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}
