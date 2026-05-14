import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";
import { issueResolver } from "../../packages/capability-resolver/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- direct resolver tests against a synthetic harness ----------

test("resolve.issue exact group id returns issueGroup with memberFindingIds", async () => {
  const harness = buildAdjudicatedHarness({
    ownershipMap: ownershipMapFor([{ path: "src", ownerSystem: "src", confidence: 0.9 }]),
    groups: [duplicateGroup({ active: true })],
  });

  const [ref] = await issueResolver.resolve({
    artifacts: harness.artifacts,
    input: { snapshotRef: harness.snapshotRef, issue: "issue-alpha" },
  });

  const packet = harness.writes.get(ref.id);

  assert.equal(packet.matchSource, "IssueAdjudicationReport");
  assert.equal(packet.issueGroup.id, "issue-alpha");
  assert.deepEqual(packet.issueGroup.memberFindingIds, ["finding-1", "finding-2"]);
  assert.equal(packet.issue.id, "finding-1");
  assert.equal(packet.nextRequiredResolver, "resolve.preflight");
  assertTraceStep(packet, "issue.match", "IssueAdjudicationReport", "used");
});

test("resolve.issue canonicalFindingId returns the group", async () => {
  const harness = buildAdjudicatedHarness({
    ownershipMap: ownershipMapFor([{ path: "src", ownerSystem: "src", confidence: 0.9 }]),
    groups: [duplicateGroup({ active: true })],
  });

  const [ref] = await issueResolver.resolve({
    artifacts: harness.artifacts,
    input: { snapshotRef: harness.snapshotRef, issue: "finding-1" },
  });

  const packet = harness.writes.get(ref.id);
  assert.equal(packet.matchSource, "IssueAdjudicationReport");
  assert.equal(packet.issueGroup.id, "issue-alpha");
  assert.equal(packet.issueGroup.canonicalFindingId, "finding-1");
});

test("resolve.issue memberFindingId returns the same group", async () => {
  const harness = buildAdjudicatedHarness({
    ownershipMap: ownershipMapFor([{ path: "src", ownerSystem: "src", confidence: 0.9 }]),
    groups: [duplicateGroup({ active: true })],
  });

  const [ref] = await issueResolver.resolve({
    artifacts: harness.artifacts,
    input: { snapshotRef: harness.snapshotRef, issue: "finding-2" },
  });

  const packet = harness.writes.get(ref.id);
  assert.equal(packet.matchSource, "IssueAdjudicationReport");
  assert.equal(packet.issueGroup.id, "issue-alpha");
  assert.deepEqual(packet.issueGroup.memberFindingIds, ["finding-1", "finding-2"]);
});

test("ambiguous group fragment warns and does not silently choose", async () => {
  const harness = buildAdjudicatedHarness({
    ownershipMap: ownershipMapFor([{ path: "src", ownerSystem: "src", confidence: 0.9 }]),
    groups: [
      { ...duplicateGroup({ active: true }), id: "issue-alpha", canonicalFindingId: "alpha-1", memberFindingIds: ["alpha-1", "alpha-2"], files: ["src/alpha.ts"] },
      { ...duplicateGroup({ active: true }), id: "issue-beta", canonicalFindingId: "beta-1", memberFindingIds: ["beta-1"], files: ["src/beta.ts"] },
    ],
  });

  const [ref] = await issueResolver.resolve({
    artifacts: harness.artifacts,
    input: { snapshotRef: harness.snapshotRef, issue: "import_boundary" },
  });

  const packet = harness.writes.get(ref.id);
  assert.equal(packet.matchSource, "IssueAdjudicationReport");
  assert.equal(packet.issueGroup, undefined);
  assert.equal(packet.issue, undefined);
  assert.ok(packet.warnings.some((w) => w.includes("matched 2 adjudicated groups")));
  const matchTrace = packet.resolutionTrace.find((t) => t.step === "issue.match" && t.sourceType === "IssueAdjudicationReport");
  assert.equal(matchTrace.status, "warning");
  assert.deepEqual(matchTrace.details.matchedGroupIds.sort(), ["issue-alpha", "issue-beta"]);
});

test("no adjudication report falls back to raw FindingReport behavior", async () => {
  const harness = buildLifecycleOnlyHarness({
    ownershipMap: ownershipMapFor([{ path: "src", ownerSystem: "src", confidence: 0.9 }]),
    findingReport: findingReportWith([
      { id: "finding-x", type: "boundary.violation", severity: "medium", title: "Edge", description: "Edge case", files: ["src/index.ts"] },
    ]),
  });

  const [ref] = await issueResolver.resolve({
    artifacts: harness.artifacts,
    input: { snapshotRef: harness.snapshotRef, issue: "finding-x" },
  });

  const packet = harness.writes.get(ref.id);
  assert.equal(packet.matchSource, "FindingReport");
  assert.equal(packet.issueGroup, undefined);
  assert.equal(packet.issue.id, "finding-x");
  const fallbackTrace = packet.resolutionTrace.find(
    (t) => t.step === "issue.match" && t.sourceType === "Fallback" && t.status === "missing",
  );
  assert.ok(fallbackTrace, "expected a missing-adjudication-report trace entry");
});

test("adjudication report exists but no group match falls back to raw findings", async () => {
  const harness = buildAdjudicatedHarness({
    ownershipMap: ownershipMapFor([{ path: "src", ownerSystem: "src", confidence: 0.9 }]),
    groups: [duplicateGroup({ active: true })],
    findingReport: findingReportWith([
      { id: "lonesome-finding", type: "unrelated", severity: "low", title: "Unrelated", description: "Unrelated finding", files: ["src/index.ts"] },
    ]),
  });

  const [ref] = await issueResolver.resolve({
    artifacts: harness.artifacts,
    input: { snapshotRef: harness.snapshotRef, issue: "lonesome-finding" },
  });

  const packet = harness.writes.get(ref.id);
  assert.equal(packet.matchSource, "FindingReport");
  assert.equal(packet.issueGroup, undefined);
  assert.equal(packet.issue.id, "lonesome-finding");
  const fallbackTrace = packet.resolutionTrace.find(
    (t) => t.step === "issue.match" && t.sourceType === "IssueAdjudicationReport" && t.status === "fallback",
  );
  assert.ok(fallbackTrace, "expected a fallback trace citing the adjudication report");
});

test("group.files ownership produces ownerSystems", async () => {
  const harness = buildAdjudicatedHarness({
    ownershipMap: ownershipMapFor([{ path: "src", ownerSystem: "src", confidence: 0.9 }]),
    groups: [duplicateGroup({ active: true })],
  });

  const [ref] = await issueResolver.resolve({
    artifacts: harness.artifacts,
    input: { snapshotRef: harness.snapshotRef, issue: "issue-alpha" },
  });

  const packet = harness.writes.get(ref.id);
  assert.deepEqual(packet.ownerSystems, ["src"]);
});

test("multi-owner group sets nextRequiredResolver to resolve.seam", async () => {
  const harness = buildAdjudicatedHarness({
    ownershipMap: ownershipMapFor([
      { path: "src", ownerSystem: "src", confidence: 0.9 },
      { path: "packages/runtime", ownerSystem: "runtime", confidence: 0.9 },
    ]),
    groups: [
      {
        ...duplicateGroup({ active: true }),
        files: ["src/index.ts", "packages/runtime/src/index.ts"],
      },
    ],
  });

  const [ref] = await issueResolver.resolve({
    artifacts: harness.artifacts,
    input: { snapshotRef: harness.snapshotRef, issue: "issue-alpha" },
  });

  const packet = harness.writes.get(ref.id);
  assert.equal(packet.nextRequiredResolver, "resolve.seam");
  assert.deepEqual([...packet.ownerSystems].sort(), ["runtime", "src"]);
});

test("accepted group status adds a status warning", async () => {
  const harness = buildAdjudicatedHarness({
    ownershipMap: ownershipMapFor([{ path: "src", ownerSystem: "src", confidence: 0.9 }]),
    groups: [{ ...duplicateGroup({ active: false }), status: "accepted" }],
  });

  const [ref] = await issueResolver.resolve({
    artifacts: harness.artifacts,
    input: { snapshotRef: harness.snapshotRef, issue: "issue-alpha" },
  });

  const packet = harness.writes.get(ref.id);
  assert.ok(packet.warnings.some((w) => w.includes("accepted risk/debt")));
});

test("ignored group status adds a status warning", async () => {
  const harness = buildAdjudicatedHarness({
    ownershipMap: ownershipMapFor([{ path: "src", ownerSystem: "src", confidence: 0.9 }]),
    groups: [{ ...duplicateGroup({ active: false }), status: "ignored" }],
  });

  const [ref] = await issueResolver.resolve({
    artifacts: harness.artifacts,
    input: { snapshotRef: harness.snapshotRef, issue: "issue-alpha" },
  });

  const packet = harness.writes.get(ref.id);
  assert.ok(packet.warnings.some((w) => w.includes("ignored")));
});

test("resolved group status adds a status warning", async () => {
  const harness = buildAdjudicatedHarness({
    ownershipMap: ownershipMapFor([{ path: "src", ownerSystem: "src", confidence: 0.9 }]),
    groups: [{ ...duplicateGroup({ active: false }), status: "resolved" }],
  });

  const [ref] = await issueResolver.resolve({
    artifacts: harness.artifacts,
    input: { snapshotRef: harness.snapshotRef, issue: "issue-alpha" },
  });

  const packet = harness.writes.get(ref.id);
  assert.ok(packet.warnings.some((w) => w.includes("resolved")));
});

test("group.systems contradiction with OwnershipMap warns", async () => {
  const harness = buildAdjudicatedHarness({
    ownershipMap: ownershipMapFor([{ path: "src", ownerSystem: "src", confidence: 0.9 }]),
    groups: [
      {
        ...duplicateGroup({ active: true }),
        systems: ["legacy-system"],
      },
    ],
  });

  const [ref] = await issueResolver.resolve({
    artifacts: harness.artifacts,
    input: { snapshotRef: harness.snapshotRef, issue: "issue-alpha" },
  });

  const packet = harness.writes.get(ref.id);
  assert.ok(
    packet.warnings.some((w) =>
      w.includes("Issue group systems differ from ownership resolution"),
    ),
  );
  assert.ok(packet.ownerSystems.includes("legacy-system"));
  assert.ok(packet.ownerSystems.includes("src"));
});

test("resolutionTrace includes issue.match with IssueAdjudicationReport sourceType", async () => {
  const harness = buildAdjudicatedHarness({
    ownershipMap: ownershipMapFor([{ path: "src", ownerSystem: "src", confidence: 0.9 }]),
    groups: [duplicateGroup({ active: true })],
  });

  const [ref] = await issueResolver.resolve({
    artifacts: harness.artifacts,
    input: { snapshotRef: harness.snapshotRef, issue: "issue-alpha" },
  });

  const packet = harness.writes.get(ref.id);
  const matchTrace = packet.resolutionTrace.find(
    (t) => t.step === "issue.match" && t.sourceType === "IssueAdjudicationReport",
  );
  assert.ok(matchTrace);
  assert.equal(matchTrace.status, "used");
  assert.equal(matchTrace.details.groupId, "issue-alpha");
  assert.deepEqual(matchTrace.details.memberFindingIds, ["finding-1", "finding-2"]);
});

test("verificationByFinding aggregates one entry per member finding", async () => {
  const harness = buildAdjudicatedHarness({
    ownershipMap: ownershipMapFor([{ path: "src", ownerSystem: "src", confidence: 0.9 }]),
    groups: [duplicateGroup({ active: true })],
  });

  const [ref] = await issueResolver.resolve({
    artifacts: harness.artifacts,
    input: { snapshotRef: harness.snapshotRef, issue: "issue-alpha" },
  });

  const packet = harness.writes.get(ref.id);
  assert.ok(Array.isArray(packet.verificationByFinding));
  assert.equal(packet.verificationByFinding.length, 2);
  assert.deepEqual(
    packet.verificationByFinding.map((entry) => entry.findingId).sort(),
    ["finding-1", "finding-2"],
  );
  // No verification artifacts seeded → every member is "missing".
  for (const entry of packet.verificationByFinding) {
    assert.equal(entry.status, "missing");
  }
});

// ---------- CLI tests ----------

test("rekon resolve issue against an adjudicated repo returns issueGroup", async () => {
  await withFixture(async (root) => {
    await seedDuplicates(root);
    runCli(["issues", "adjudicate", "--root", root, "--json"]);

    const result = JSON.parse(
      runCli(["resolve", "issue", "--root", root, "--issue", "finding-alpha-1", "--json"]).stdout,
    );

    assert.equal(result.packet.matchSource, "IssueAdjudicationReport");
    assert.equal(result.packet.issueGroup.canonicalFindingId, "finding-alpha-1");
    assert.deepEqual(
      result.packet.issueGroup.memberFindingIds,
      ["finding-alpha-1", "finding-alpha-2"],
    );
  });
});

test("rekon resolve run resolve.issue dispatches the same group-aware handler", async () => {
  await withFixture(async (root) => {
    await seedDuplicates(root);
    runCli(["issues", "adjudicate", "--root", root, "--json"]);

    const result = JSON.parse(
      runCli([
        "resolve",
        "run",
        "resolve.issue",
        "--root",
        root,
        "--input-json",
        JSON.stringify({ issue: "finding-alpha-2" }),
        "--json",
      ]).stdout,
    );

    const packetRef = result.artifacts.find((ref) => ref.type === "ResolverPacket");
    assert.ok(packetRef);
    const body = JSON.parse(await readFile(join(root, packetRef.path), "utf8"));
    assert.equal(body.matchSource, "IssueAdjudicationReport");
    assert.equal(body.issueGroup.canonicalFindingId, "finding-alpha-1");
  });
});

test("rekon resolve issue against an unrelated query falls back to raw with adjudication-fallback trace", async () => {
  await withFixture(async (root) => {
    await seedDuplicates(root);
    runCli(["issues", "adjudicate", "--root", root, "--json"]);

    const result = JSON.parse(
      runCli(["resolve", "issue", "--root", root, "--issue", "no-such-issue", "--json"]).stdout,
    );

    assert.equal(result.packet.matchSource, undefined);
    const fallbackTrace = result.packet.resolutionTrace.find(
      (t) => t.step === "issue.match" && t.sourceType === "IssueAdjudicationReport" && t.status === "fallback",
    );
    assert.ok(fallbackTrace);
  });
});

// ---------- helpers ----------

async function seedDuplicates(root) {
  const { createLocalArtifactStore, buildIssueAdjudicationReport } = await import(
    `${repoRoot}/packages/runtime/dist/index.js`
  );
  const { createFindingReport, createFindingLifecycleReport, deriveFindingLifecycle } = await import(
    `${repoRoot}/packages/kernel-findings/dist/index.js`
  );

  const store = createLocalArtifactStore(root);
  await store.init();

  const report = createFindingReport({
    header: artifactHeader("FindingReport", "fr-seed"),
    findings: [duplicateFinding("finding-alpha-1"), duplicateFinding("finding-alpha-2")],
  });
  const reportRef = await store.write(report, { category: "findings" });

  const lc = deriveFindingLifecycle({ latestReport: report });
  const lcHeader = artifactHeader("FindingLifecycleReport", "fl-seed");
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

function duplicateGroup({ active }) {
  return {
    id: "issue-alpha",
    canonicalFindingId: "finding-1",
    memberFindingIds: ["finding-1", "finding-2"],
    type: "import_boundary.parent_relative_import",
    ruleId: "import-boundaries.parent_relative_import",
    severity: "medium",
    status: active ? "active" : "accepted",
    active,
    title: "Parent-relative import",
    description: "Imports starting with `../` should be replaced.",
    files: ["src/index.ts"],
    subjects: ["src/index.ts"],
    groupingKey: "k",
    groupingReasons: ["same-type", "same-rule", "same-files"],
    statusBreakdown: active ? { new: 2 } : { accepted: 2 },
  };
}

function findingReportWith(findings) {
  return {
    header: artifactHeader("FindingReport", "finding-report-1"),
    summary: { total: findings.length, bySeverity: {}, byType: {} },
    findings: findings.map((entry) => ({
      ...entry,
      subjects: entry.files ?? [],
      status: "new",
    })),
  };
}

function ownershipMapFor(entries) {
  return {
    header: artifactHeader("OwnershipMap", "ownership-map-1"),
    entries: entries.map((entry) => ({
      path: entry.path,
      ownerSystem: entry.ownerSystem,
      confidence: entry.confidence,
    })),
  };
}

function adjudicationReportWith(groups) {
  return {
    header: artifactHeader("IssueAdjudicationReport", "issue-adjudication-1"),
    summary: {
      totalGroups: groups.length,
      activeGroups: groups.filter((g) => g.active).length,
      acceptedGroups: 0,
      ignoredGroups: 0,
      resolvedGroups: 0,
      mixedGroups: 0,
      totalFindings: groups.reduce((sum, g) => sum + g.memberFindingIds.length, 0),
      groupedFindings: groups.reduce((sum, g) => sum + g.memberFindingIds.length, 0),
      bySeverity: {},
      byType: {},
    },
    groups,
  };
}

function buildAdjudicatedHarness(options) {
  const writes = new Map();
  const reads = new Map();
  const snapshotRef = { type: "IntelligenceSnapshot", id: "snapshot-1", schemaVersion: "0.1.0" };
  const snapshot = {
    header: artifactHeader("IntelligenceSnapshot", "snapshot-1"),
    repo: { id: "synthetic", root: "/synthetic" },
    inputs: { EvidenceGraph: [] },
    projections: {},
    evaluations: {},
    publications: {},
    actions: {},
    status: { freshness: "fresh", warnings: [], blockedReasons: [] },
  };

  if (options.ownershipMap) {
    const ref = registerArtifact(options.ownershipMap, "OwnershipMap", "ownership-map-1", reads);
    snapshot.projections.OwnershipMap = [ref];
  }
  if (options.findingReport) {
    const ref = registerArtifact(options.findingReport, "FindingReport", "finding-report-1", reads);
    snapshot.evaluations.FindingReport = [ref];
  }
  if (options.groups) {
    const report = adjudicationReportWith(options.groups);
    registerArtifact(report, "IssueAdjudicationReport", "issue-adjudication-1", reads);
  }

  reads.set(`${snapshotRef.type}:${snapshotRef.id}`, snapshot);

  const artifacts = {
    async list(type) {
      return [...reads.keys()]
        .map((key) => {
          const value = reads.get(key);
          if (!value?.header) return null;
          return {
            type: value.header.artifactType,
            id: value.header.artifactId,
            schemaVersion: value.header.schemaVersion,
            path: `.rekon/artifacts/${value.header.artifactType}.json`,
            digest: "stub",
            writtenAt: value.header.generatedAt ?? new Date().toISOString(),
          };
        })
        .filter((entry) => entry !== null && (type === undefined || entry.type === type));
    },
    async read(ref) {
      const value = reads.get(`${ref.type}:${ref.id}`);
      if (!value) throw new Error(`Synthetic harness has no artifact ${ref.type}:${ref.id}`);
      return value;
    },
    async write(type, artifact) {
      const ref = { type, id: artifact.header.artifactId, schemaVersion: artifact.header.schemaVersion };
      writes.set(ref.id, artifact);
      reads.set(`${type}:${ref.id}`, artifact);
      return ref;
    },
  };

  return { snapshotRef, artifacts, writes };
}

function buildLifecycleOnlyHarness(options) {
  return buildAdjudicatedHarness({ ...options, groups: undefined });
}

function registerArtifact(artifact, type, id, reads) {
  reads.set(`${type}:${id}`, artifact);
  return { type, id, schemaVersion: "0.1.0" };
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

function assertTraceStep(packet, step, sourceType, status) {
  const entry = packet.resolutionTrace.find(
    (t) => t.step === step && t.sourceType === sourceType && t.status === status,
  );
  assert.ok(entry, `expected trace entry ${step}/${sourceType}/${status}, got ${JSON.stringify(packet.resolutionTrace.map((t) => `${t.step}/${t.sourceType}/${t.status}`))}`);
}

async function withFixture(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-issue-v2-"));

  try {
    await cp(exampleRoot, root, {
      recursive: true,
      filter(source) {
        return !relative(exampleRoot, source).split(/[\\/]/).includes(".rekon");
      },
    });
    runCli(["init", "--root", root, "--json"]);
    runCli(["refresh", "--root", root, "--json"]);
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
