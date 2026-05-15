import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- stale chain tests ----------

test("architecture summary warns when IssueAdjudicationReport is older than the latest FindingLifecycleReport", async () => {
  await withStaleChain(async (root) => {
    runCli(["publish", "architecture", "--root", root, "--json"]);
    const content = await readLatestPublicationContent(root, "architecture-summary");

    assert.ok(content.includes("## Input Freshness Warnings"));
    assert.ok(
      content.includes("IssueAdjudicationReport") && content.includes("may be stale"),
      "expected adjudication staleness warning",
    );
    assert.ok(content.includes("Recommended command: `rekon refresh`"));
  });
});

test("architecture summary warns when CoherencyDelta is transitively stale", async () => {
  await withStaleChain(async (root) => {
    runCli(["publish", "architecture", "--root", root, "--json"]);
    const content = await readLatestPublicationContent(root, "architecture-summary");

    assert.ok(
      content.includes("CoherencyDelta") && content.includes("may be transitively stale"),
      "expected CoherencyDelta transitive staleness warning",
    );
  });
});

test("agent contract Governance Freshness subsection reports stale adjudication and stale coherency", async () => {
  await withStaleChain(async (root) => {
    runCli(["publish", "agent-contract", "--root", root, "--json"]);
    const content = await readLatestPublicationContent(root, "agent-contract");

    assert.ok(content.includes("### Governance Freshness"));
    assert.ok(content.includes("- Issue adjudication: stale"));
    assert.ok(content.includes("- Coherency delta: stale"));
    assert.ok(content.includes("> Input freshness warnings:"));
    assert.ok(
      content.includes(
        "Do not treat governed issue counts as current until `rekon refresh`",
      ),
    );
    assert.ok(content.includes("Recommended command: `rekon refresh`"));
  });
});

test("resolve.issue group mode emits stale-adjudication warning and issue.freshness trace", async () => {
  await withStaleChain(async (root) => {
    const result = JSON.parse(
      runCli(["resolve", "issue", "--root", root, "--issue", "issue-f1", "--json"]).stdout,
    );

    assert.equal(result.packet.matchSource, "IssueAdjudicationReport");
    assert.ok(
      result.packet.warnings.some((w) =>
        w.includes("IssueAdjudicationReport may be stale"),
      ),
      `expected stale-adjudication warning, got: ${JSON.stringify(result.packet.warnings)}`,
    );
    const freshnessTrace = result.packet.resolutionTrace.find(
      (t) => t.step === "issue.freshness",
    );
    assert.ok(freshnessTrace);
    assert.equal(freshnessTrace.status, "warning");
    assert.equal(freshnessTrace.sourceType, "IssueAdjudicationReport");
    assert.ok(freshnessTrace.message.includes("FindingLifecycleReport"));
  });
});

test("warnings consistently recommend `rekon refresh` for stale chains", async () => {
  await withStaleChain(async (root) => {
    runCli(["publish", "architecture", "--root", root, "--json"]);
    const arch = await readLatestPublicationContent(root, "architecture-summary");
    assert.ok(arch.includes("Recommended command: `rekon refresh`"));

    runCli(["publish", "agent-contract", "--root", root, "--json"]);
    const contract = await readLatestPublicationContent(root, "agent-contract");
    assert.ok(contract.includes("Recommended command: `rekon refresh`"));

    const issue = JSON.parse(
      runCli(["resolve", "issue", "--root", root, "--issue", "issue-f1", "--json"]).stdout,
    );
    assert.ok(
      issue.packet.warnings.some((w) =>
        w.includes("rekon issues adjudicate") || w.includes("rekon refresh"),
      ),
    );
  });
});

// ---------- fresh chain tests ----------

test("clean refresh path does not show stale warnings in either publication", async () => {
  await withFreshChain(async (root) => {
    runCli(["publish", "architecture", "--root", root, "--json"]);
    const arch = await readLatestPublicationContent(root, "architecture-summary");
    assert.ok(!arch.includes("## Input Freshness Warnings"), "fresh chain should not surface freshness warnings section");

    runCli(["publish", "agent-contract", "--root", root, "--json"]);
    const contract = await readLatestPublicationContent(root, "agent-contract");
    assert.ok(contract.includes("### Governance Freshness"));
    assert.ok(contract.includes("- Issue adjudication: fresh"));
    assert.ok(contract.includes("- Coherency delta: fresh"));
    assert.ok(!contract.includes("> Input freshness warnings:"), "fresh chain should not surface freshness warning callout");
  });
});

test("resolve.issue group mode emits a fresh issue.freshness trace and no stale warning when the chain is fresh", async () => {
  await withFreshChain(async (root) => {
    const result = JSON.parse(
      runCli(["resolve", "issue", "--root", root, "--issue", "issue-f1", "--json"]).stdout,
    );

    assert.equal(result.packet.matchSource, "IssueAdjudicationReport");
    assert.ok(
      !result.packet.warnings.some((w) =>
        w.includes("IssueAdjudicationReport may be stale"),
      ),
      "fresh chain should not surface stale-adjudication warning",
    );

    const freshnessTrace = result.packet.resolutionTrace.find(
      (t) => t.step === "issue.freshness",
    );
    assert.ok(freshnessTrace, "expected an issue.freshness trace entry");
    assert.equal(freshnessTrace.status, "used");
  });
});

// ---------- mode-mismatch test ----------

test("agent contract warns when CoherencyDelta was built from lifecycle but an IssueAdjudicationReport now exists", async () => {
  await withLifecycleOnlyDelta(async (root) => {
    runCli(["publish", "agent-contract", "--root", root, "--json"]);
    const content = await readLatestPublicationContent(root, "agent-contract");

    assert.ok(content.includes("- Coherency delta: stale"));
    assert.ok(
      content.includes("was built from raw FindingLifecycleReport but an IssueAdjudicationReport"),
      "expected lifecycle→adjudication mode mismatch warning",
    );
  });
});

// ---------- regression: artifacts validate stays clean + existing publishers still work ----------

test("artifacts validate stays clean after stale-chain publications", async () => {
  await withStaleChain(async (root) => {
    runCli(["publish", "architecture", "--root", root, "--json"]);
    runCli(["publish", "agent-contract", "--root", root, "--json"]);
    const validation = JSON.parse(
      runCli(["artifacts", "validate", "--root", root, "--json"]).stdout,
    );
    assert.equal(validation.valid, true);
  });
});

test("existing publications (agents, proof, architecture, agent-contract) still work after freshness guardrails", async () => {
  await withFreshChain(async (root) => {
    const agents = JSON.parse(runCli(["publish", "agents", "--root", root, "--json"]).stdout);
    assert.ok(agents.artifacts.some((ref) => ref.type === "Publication"));

    const proof = JSON.parse(runCli(["publish", "proof", "--root", root, "--json"]).stdout);
    assert.ok(proof.artifacts.some((ref) => ref.type === "Publication"));

    const arch = JSON.parse(runCli(["publish", "architecture", "--root", root, "--json"]).stdout);
    assert.ok(arch.artifacts.some((ref) => ref.type === "Publication"));

    const contract = JSON.parse(runCli(["publish", "agent-contract", "--root", root, "--json"]).stdout);
    assert.ok(contract.artifacts.some((ref) => ref.type === "Publication"));
  });
});

// ---------- helpers ----------

async function readLatestPublicationContent(root, kind) {
  const indexPath = join(root, ".rekon/registry/artifacts.index.json");
  const raw = JSON.parse(await readFile(indexPath, "utf8"));
  const entries = Array.isArray(raw) ? raw : Array.isArray(raw.artifacts) ? raw.artifacts : [];
  const publications = entries.filter((entry) => entry.type === "Publication");
  publications.sort((left, right) => right.writtenAt.localeCompare(left.writtenAt));

  for (const candidate of publications) {
    const body = JSON.parse(await readFile(join(root, candidate.path), "utf8"));
    if (body.kind === kind) {
      return body.content;
    }
  }

  throw new Error(`No Publication of kind ${kind} found.`);
}

async function withFixture(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-fresh-guardrails-"));

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

async function withFreshChain(callback) {
  await withFixture(async (root) => {
    runCli(["refresh", "--root", root, "--json"]);
    await seedFreshGroup(root);
    await callback(root);
  });
}

async function withStaleChain(callback) {
  await withFixture(async (root) => {
    runCli(["refresh", "--root", root, "--json"]);
    await seedFreshGroup(root);
    // Now write a NEWER FindingLifecycleReport to make the adjudication stale.
    await seedNewerLifecycle(root);
    await callback(root);
  });
}

async function withLifecycleOnlyDelta(callback) {
  await withFixture(async (root) => {
    // Skip refresh on purpose — refresh now seeds an
    // IssueAdjudicationReport, which would force `buildCoherencyDelta`
    // into group mode. We want to exercise the "delta was built from
    // raw lifecycle, but adjudication now exists" mode-mismatch path,
    // so we set up the store by hand.
    const { createLocalArtifactStore, buildCoherencyDelta, buildIssueAdjudicationReport } = await import(
      `${repoRoot}/packages/runtime/dist/index.js`
    );
    const { createFindingReport, createFindingLifecycleReport, deriveFindingLifecycle } = await import(
      `${repoRoot}/packages/kernel-findings/dist/index.js`
    );
    const store = createLocalArtifactStore(root);
    await store.init();

    // Phase 1: write FindingReport + FindingLifecycleReport ONLY.
    const report = createFindingReport({
      header: header("FindingReport", "fr-mode"),
      findings: [duplicateFinding("m1"), duplicateFinding("m2")],
    });
    const reportRef = await store.write(report, { category: "findings" });
    const lc = deriveFindingLifecycle({ latestReport: report });
    const lcHeader = header("FindingLifecycleReport", "fl-mode");
    lcHeader.inputRefs = [reportRef];
    const lifecycle = createFindingLifecycleReport({
      header: lcHeader,
      findings: lc.findings,
      resolvedFindings: lc.resolvedFindings,
      decisions: lc.decisions,
    });
    await store.write(lifecycle, { category: "findings" });

    // Phase 2: build a CoherencyDelta NOW (no IssueAdjudicationReport
    // is in the store yet, so it falls through to lifecycle mode).
    const lifecycleDelta = await buildCoherencyDelta(store);
    await store.write(lifecycleDelta, { category: "findings" });

    // Phase 3: NOW write an IssueAdjudicationReport. The publication's
    // freshness detector should observe that the latest CoherencyDelta
    // was built from raw lifecycle while an IssueAdjudicationReport
    // exists, and emit the mode-mismatch warning. The agent contract
    // also needs an IntelligenceSnapshot to run, so run snapshot too.
    const adj = await buildIssueAdjudicationReport(store);
    await store.write(adj, { category: "findings" });

    // Snapshot is required by the agent-contract publisher.
    runCli(["init", "--root", root, "--json"]);
    runCli(["observe", "--root", root, "--json"]);
    runCli(["project", "--root", root, "--json"]);
    runCli(["snapshot", "--root", root, "--json"]);

    await callback(root);
  });
}

async function seedFreshGroup(root) {
  const { createLocalArtifactStore, buildIssueAdjudicationReport, buildCoherencyDelta } = await import(
    `${repoRoot}/packages/runtime/dist/index.js`
  );
  const { createFindingReport, createFindingLifecycleReport, deriveFindingLifecycle } = await import(
    `${repoRoot}/packages/kernel-findings/dist/index.js`
  );
  const store = createLocalArtifactStore(root);
  await store.init();

  const report = createFindingReport({
    header: header("FindingReport", "fr-seed"),
    findings: [duplicateFinding("f1"), duplicateFinding("f2")],
  });
  const reportRef = await store.write(report, { category: "findings" });
  const lc = deriveFindingLifecycle({ latestReport: report });
  const lcHeader = header("FindingLifecycleReport", "fl-A");
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

async function seedNewerLifecycle(root) {
  const { createLocalArtifactStore } = await import(
    `${repoRoot}/packages/runtime/dist/index.js`
  );
  const { createFindingReport, createFindingLifecycleReport, deriveFindingLifecycle } = await import(
    `${repoRoot}/packages/kernel-findings/dist/index.js`
  );
  const store = createLocalArtifactStore(root);
  await store.init();

  const report = createFindingReport({
    header: header("FindingReport", "fr-newer"),
    findings: [duplicateFinding("f1"), duplicateFinding("f2"), duplicateFinding("f3")],
  });
  const reportRef = await store.write(report, { category: "findings" });
  await new Promise((r) => setTimeout(r, 10));
  const lc = deriveFindingLifecycle({ latestReport: report });
  const lcHeader = header("FindingLifecycleReport", "fl-Z-newer");
  lcHeader.inputRefs = [reportRef];
  const lifecycle = createFindingLifecycleReport({
    header: lcHeader,
    findings: lc.findings,
    resolvedFindings: lc.resolvedFindings,
    decisions: lc.decisions,
  });
  await store.write(lifecycle, { category: "findings" });
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

function header(type, id) {
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
