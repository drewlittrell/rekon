import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";
import {
  createFindingReport,
} from "../../packages/kernel-findings/dist/index.js";
import {
  buildCoherencyDelta,
  buildFindingFilterReport,
  buildFindingLifecycleReport,
  buildIssueAdjudicationReport,
  createLocalArtifactStore,
} from "../../packages/runtime/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- runtime-level tests ----------

test("buildFindingLifecycleReport prefers keptFindings from a current FindingFilterReport", async () => {
  await withInitFixture(async (root) => {
    const store = createLocalArtifactStore(root);
    await store.init();
    const { reportRef } = await seedReportWithFiltered(store);
    const filter = await buildFindingFilterReport(store);
    await store.write(filter, { category: "findings" });

    const lifecycle = await buildFindingLifecycleReport(store);
    const findingIds = lifecycle.findings.map((finding) => finding.id);

    assert.deepEqual(findingIds.sort(), ["ok"]);
    for (const finding of lifecycle.findings) {
      assert.notEqual(finding.id, "gen", "filtered finding must not be active in lifecycle");
    }
    assert.ok(
      lifecycle.header.inputRefs.some((ref) => ref.type === "FindingFilterReport"),
      "lifecycle must cite FindingFilterReport in inputRefs when using kept findings",
    );
    assert.ok(
      lifecycle.header.inputRefs.some((ref) => ref.type === "FindingReport"),
      "lifecycle must still cite the upstream FindingReport in inputRefs",
    );

    const stored = await readArtifactByRef(root, reportRef);
    assert.equal(stored.findings.length, 2, "raw FindingReport must keep both findings");
    assert.ok(
      stored.findings.some((finding) => finding.id === "gen"),
      "filtered finding must remain in raw FindingReport",
    );
  });
});

test("buildFindingLifecycleReport falls back to FindingReport when no FindingFilterReport exists", async () => {
  await withInitFixture(async (root) => {
    const store = createLocalArtifactStore(root);
    await store.init();
    await seedReportWithFiltered(store);

    const lifecycle = await buildFindingLifecycleReport(store);
    const findingIds = lifecycle.findings.map((finding) => finding.id).sort();
    assert.deepEqual(
      findingIds,
      ["gen", "ok"],
      "without a filter report, lifecycle must include all raw findings",
    );
    assert.ok(
      !lifecycle.header.inputRefs.some((ref) => ref.type === "FindingFilterReport"),
      "lifecycle must not cite a FindingFilterReport when none was used",
    );
  });
});

test("buildFindingLifecycleReport ignores a FindingFilterReport that does not cite the latest FindingReport (stale filter)", async () => {
  await withInitFixture(async (root) => {
    const store = createLocalArtifactStore(root);
    await store.init();
    // Seed an initial FindingReport + filter the seeded report.
    const first = createFindingReport({
      header: artifactHeader("FindingReport", "fr-stale-old"),
      findings: [
        finding("gen", { files: ["src/dist/x.ts"] }),
        finding("ok", { files: ["src/lib/x.ts"] }),
      ],
    });
    await store.write(first, { category: "findings" });
    const filterReport = await buildFindingFilterReport(store);
    await store.write(filterReport, { category: "findings" });

    // Now write a second FindingReport (the filter report no longer cites
    // the latest report). The lifecycle must fall back to the raw report
    // rather than trust the stale filter.
    await new Promise((resolveTimer) => setTimeout(resolveTimer, 10));
    const next = createFindingReport({
      header: artifactHeader("FindingReport", `fr-stale-new-${Date.now()}`),
      findings: [
        finding("gen", { files: ["src/dist/x.ts"] }),
        finding("ok", { files: ["src/lib/x.ts"] }),
      ],
    });
    await store.write(next, { category: "findings" });

    const lifecycle = await buildFindingLifecycleReport(store);
    const findingIds = lifecycle.findings.map((finding) => finding.id).sort();
    assert.deepEqual(
      findingIds,
      ["gen", "ok"],
      "stale filter must not suppress findings in the lifecycle latest set",
    );
    assert.ok(
      !lifecycle.header.inputRefs.some((ref) => ref.type === "FindingFilterReport"),
      "lifecycle must not cite a stale FindingFilterReport",
    );
  });
});

test("buildIssueAdjudicationReport only groups kept findings when a current filter report exists", async () => {
  await withInitFixture(async (root) => {
    const store = createLocalArtifactStore(root);
    await store.init();
    await seedReportWithFiltered(store);
    const filter = await buildFindingFilterReport(store);
    await store.write(filter, { category: "findings" });
    const lifecycle = await buildFindingLifecycleReport(store);
    await store.write(lifecycle, { category: "findings" });

    const adjudication = await buildIssueAdjudicationReport(store);
    const memberIds = adjudication.groups.flatMap((group) => group.memberFindingIds);
    assert.ok(memberIds.includes("ok"), "kept finding must appear as an issue group member");
    assert.ok(
      !memberIds.includes("gen"),
      "filtered finding must not appear as an issue group member",
    );
  });
});

test("buildCoherencyDelta excludes filtered findings from items and remediationQueue", async () => {
  await withInitFixture(async (root) => {
    const store = createLocalArtifactStore(root);
    await store.init();
    await seedReportWithFiltered(store);
    const filter = await buildFindingFilterReport(store);
    await store.write(filter, { category: "findings" });
    const lifecycle = await buildFindingLifecycleReport(store);
    await store.write(lifecycle, { category: "findings" });
    const adjudication = await buildIssueAdjudicationReport(store);
    await store.write(adjudication, { category: "findings" });

    const delta = await buildCoherencyDelta(store);
    const memberIds = delta.items.flatMap((item) => item.memberFindingIds ?? []);
    assert.ok(memberIds.includes("ok"));
    assert.ok(!memberIds.includes("gen"));
    const remediationFindings = delta.remediationQueue.map((step) => step.findingId);
    assert.ok(
      !remediationFindings.some((id) => id === "gen"),
      "remediation queue must not contain a filtered finding",
    );
  });
});

// ---------- end-to-end CLI tests ----------

test("end-to-end CLI flow (filter → lifecycle → adjudicate → coherency) yields a filter-aware governance chain", async () => {
  await withRefreshedFixture(async (root) => {
    // Refresh produced a baseline evidence chain over examples/simple-js-ts;
    // overlay a synthetic FindingReport that cites the latest EvidenceGraph
    // so freshness doesn't flag it as orphaned, then rebuild the
    // filter / lifecycle / adjudication / coherency chain manually.
    const store = createLocalArtifactStore(root);
    await store.init();
    await seedReportCitingEvidence(store);

    runCli(["findings", "filter", "--root", root, "--json"]);
    runCli(["findings", "lifecycle", "--root", root, "--json"]);
    runCli(["issues", "adjudicate", "--root", root, "--json"]);
    runCli(["coherency", "delta", "--root", root, "--json"]);

    const lifecycle = await readLatestArtifact(root, "FindingLifecycleReport");
    const findingIds = lifecycle.findings.map((finding) => finding.id);
    assert.ok(findingIds.includes("ok"));
    assert.ok(
      !findingIds.includes("gen"),
      "manual CLI rebuild must yield a filter-aware lifecycle",
    );
    assert.ok(
      lifecycle.header.inputRefs.some((ref) => ref.type === "FindingFilterReport"),
      "rebuilt lifecycle must cite the FindingFilterReport in inputRefs",
    );

    const adjudication = await readLatestArtifact(root, "IssueAdjudicationReport");
    const memberIds = adjudication.groups.flatMap((group) => group.memberFindingIds);
    assert.ok(memberIds.includes("ok"));
    assert.ok(!memberIds.includes("gen"));

    const coherency = await readLatestArtifact(root, "CoherencyDelta");
    const allMembers = coherency.items.flatMap((item) => item.memberFindingIds ?? []);
    assert.ok(allMembers.includes("ok"));
    assert.ok(!allMembers.includes("gen"));

    const validation = JSON.parse(
      runCli(["artifacts", "validate", "--root", root, "--json"]).stdout,
    );
    assert.equal(validation.valid, true);
    assert.deepEqual(validation.issues ?? [], []);
  });
});

test("rekon refresh on a clean fixture still produces filter-aware lifecycle / adjudication / coherency", async () => {
  await withInitFixture(async (root) => {
    // simple-js-ts has no rule-firing findings by default, so this
    // confirms the refresh pipeline still hangs together end-to-end
    // with the new filter-aware lifecycle behavior (lifecycle should
    // still cite the FindingFilterReport when the filter ran first).
    const result = JSON.parse(
      runCli(["refresh", "--root", root, "--json"]).stdout,
    );
    assert.equal(result.status, "passed");

    const types = new Set(result.artifacts.map((ref) => ref.type));
    assert.ok(types.has("FindingFilterReport"));
    assert.ok(types.has("FindingFilterHealthReport"));
    assert.ok(types.has("FindingLifecycleReport"));
    assert.ok(types.has("IssueAdjudicationReport"));
    assert.ok(types.has("CoherencyDelta"));

    const lifecycle = await readLatestArtifact(root, "FindingLifecycleReport");
    assert.ok(
      lifecycle.header.inputRefs.some((ref) => ref.type === "FindingFilterReport"),
      "refresh-built lifecycle must cite the FindingFilterReport",
    );

    const validation = JSON.parse(
      runCli(["artifacts", "validate", "--root", root, "--json"]).stdout,
    );
    assert.equal(validation.valid, true);
  });
});

// ---------- helpers ----------

async function seedReportWithFiltered(store) {
  const report = createFindingReport({
    header: artifactHeader("FindingReport", `fr-filt-${Date.now()}`),
    findings: [
      finding("gen", { files: ["src/dist/generated-thing.ts"] }),
      finding("ok", { files: ["src/lib/index.ts"] }),
    ],
  });
  const reportRef = await store.write(report, { category: "findings" });
  return { reportRef };
}

async function seedReportCitingEvidence(store) {
  // Pull the latest EvidenceGraph (and OwnershipMap, when present) so the
  // overlayed FindingReport has real upstream inputRefs and freshness is
  // happy with its lineage.
  const evidenceEntries = await store.list("EvidenceGraph");
  const evidenceRef = evidenceEntries
    .slice()
    .sort((left, right) => right.writtenAt.localeCompare(left.writtenAt))[0];
  const ownershipEntries = await store.list("OwnershipMap");
  const ownershipRef = ownershipEntries
    .slice()
    .sort((left, right) => right.writtenAt.localeCompare(left.writtenAt))[0];

  const header = artifactHeader("FindingReport", `fr-cli-${Date.now()}`);
  header.inputRefs = [];
  if (evidenceRef) {
    header.inputRefs.push({
      type: evidenceRef.type,
      id: evidenceRef.id,
      schemaVersion: evidenceRef.schemaVersion,
    });
  }
  if (ownershipRef) {
    header.inputRefs.push({
      type: ownershipRef.type,
      id: ownershipRef.id,
      schemaVersion: ownershipRef.schemaVersion,
    });
  }

  const report = createFindingReport({
    header,
    findings: [
      finding("gen", { files: ["src/dist/generated-thing.ts"] }),
      finding("ok", { files: ["src/lib/index.ts"] }),
    ],
  });
  return store.write(report, { category: "findings" });
}

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

async function readLatestArtifact(root, type) {
  const indexPath = join(root, ".rekon/registry/artifacts.index.json");
  const raw = JSON.parse(await readFile(indexPath, "utf8"));
  const entries = Array.isArray(raw) ? raw : Array.isArray(raw.artifacts) ? raw.artifacts : [];
  const sorted = entries
    .filter((entry) => entry.type === type)
    .sort((left, right) => right.writtenAt.localeCompare(left.writtenAt));
  if (sorted.length === 0) {
    throw new Error(`No ${type} indexed at ${indexPath}`);
  }
  return JSON.parse(await readFile(join(root, sorted[0].path), "utf8"));
}

async function readArtifactByRef(root, ref) {
  return JSON.parse(await readFile(join(root, ref.path), "utf8"));
}

async function withInitFixture(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-filter-aware-lifecycle-"));
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
