import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

test("architecture summary cites IssueAdjudicationReport in inputRefs when available", async () => {
  await withSeededFixture(async (root) => {
    runCli(["publish", "architecture", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "architecture-summary");
    assert.ok(
      publication.header.inputRefs.some((ref) => ref.type === "IssueAdjudicationReport"),
      "expected IssueAdjudicationReport in architecture summary inputRefs",
    );
  });
});

test("architecture summary includes Governed Issue Groups section with group counts and members", async () => {
  await withSeededFixture(async (root) => {
    runCli(["publish", "architecture", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "architecture-summary");
    const content = publication.content;

    assert.ok(content.includes("## Governed Issue Groups"));
    assert.ok(content.includes("Total groups: 1"));
    assert.ok(content.includes("Active groups: 1"));
    assert.ok(content.includes("Total member findings: 2"));
    assert.ok(content.includes("issue-f1"));
    assert.ok(content.includes("2: f1, f2"));
    assert.ok(content.includes("rekon resolve issue --issue <group-id>"));
  });
});

test("architecture summary Coherency Summary distinguishes governed groups from raw findings", async () => {
  await withSeededFixture(async (root) => {
    runCli(["publish", "architecture", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "architecture-summary");
    const content = publication.content;

    assert.ok(content.includes("Counts reflect adjudicated issue groups"));
    assert.ok(content.includes("Active governed issue groups:"));
  });
});

test("agent contract cites IssueAdjudicationReport in inputRefs when available", async () => {
  await withSeededFixture(async (root) => {
    runCli(["publish", "agent-contract", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "agent-contract");
    assert.ok(
      publication.header.inputRefs.some((ref) => ref.type === "IssueAdjudicationReport"),
      "expected IssueAdjudicationReport in agent contract inputRefs",
    );
  });
});

test("agent contract includes Governed Issue Groups subsection with active groups and member counts", async () => {
  await withSeededFixture(async (root) => {
    runCli(["publish", "agent-contract", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "agent-contract");
    const content = publication.content;

    assert.ok(content.includes("### Governed Issue Groups"));
    assert.ok(content.includes("Active governed groups: 1"));
    assert.ok(content.includes("Total groups: 1 covering 2 member findings."));
    assert.ok(content.includes("`issue-f1`"));
    assert.ok(content.includes("members: 2"));
  });
});

test("agent contract tells agents to use resolve.issue by group id", async () => {
  await withSeededFixture(async (root) => {
    runCli(["publish", "agent-contract", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "agent-contract");
    assert.ok(
      publication.content.includes("Use `rekon resolve issue --issue <group-id>` for adjudicated issue context."),
    );
  });
});

test("agent contract Do Not Do warns not to treat raw finding count as governed issue count", async () => {
  await withSeededFixture(async (root) => {
    runCli(["publish", "agent-contract", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "agent-contract");
    assert.ok(
      publication.content.includes(
        "Do not treat raw finding count as governed issue count when an IssueAdjudicationReport exists",
      ),
    );
  });
});

test("architecture summary guidance hint when no IssueAdjudicationReport is indexed", async () => {
  await withFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli(["observe", "--root", root, "--json"]);
    runCli(["project", "--root", root, "--json"]);
    runCli(["snapshot", "--root", root, "--json"]);

    // publish architecture without running findings.lifecycle/issues.adjudicate
    runCli(["publish", "architecture", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "architecture-summary");

    assert.ok(publication.content.includes("## Governed Issue Groups"));
    assert.ok(
      publication.content.includes("No IssueAdjudicationReport found."),
      `expected no-report guidance in architecture summary, got: ${publication.content.slice(0, 500)}`,
    );
    assert.ok(publication.content.includes("rekon issues adjudicate"));
  });
});

test("agent contract guidance hint when no IssueAdjudicationReport is indexed", async () => {
  await withFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli(["observe", "--root", root, "--json"]);
    runCli(["project", "--root", root, "--json"]);
    runCli(["snapshot", "--root", root, "--json"]);

    runCli(["publish", "agent-contract", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "agent-contract");

    assert.ok(publication.content.includes("### Governed Issue Groups"));
    assert.ok(publication.content.includes("No IssueAdjudicationReport found."));
    assert.ok(publication.content.includes("rekon refresh"));
  });
});

test("artifacts freshness marks architecture summary stale after a newer IssueAdjudicationReport", async () => {
  await withSeededFixture(async (root) => {
    const first = JSON.parse(
      runCli(["publish", "architecture", "--root", root, "--json"]).stdout,
    );
    const publicationId = first.artifacts.find((ref) => ref.type === "Publication").id;

    await new Promise((resolveTimer) => setTimeout(resolveTimer, 10));
    runCli(["issues", "adjudicate", "--root", root, "--json"]);

    const freshness = JSON.parse(
      runCli([
        "artifacts",
        "freshness",
        "--root",
        root,
        "--type",
        "Publication",
        "--id",
        publicationId,
        "--json",
      ]).stdout,
    );

    const entry = freshness.artifacts.find((candidate) => candidate.id === publicationId);
    assert.ok(entry);
    assert.equal(entry.status, "stale");
    assert.ok(
      entry.issues.some(
        (issue) => issue.code === "newer-input-exists" && issue.inputType === "IssueAdjudicationReport",
      ),
    );
  });
});

test("rekon publish agents and publish proof still work after adjudication wiring", async () => {
  await withSeededFixture(async (root) => {
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

async function withFixture(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-pub-adj-"));

  try {
    await cp(exampleRoot, root, {
      recursive: true,
      filter(source) {
        return !relative(exampleRoot, source).split(/[\\/]/).includes(".rekon");
      },
    });
    await callback(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function withSeededFixture(callback) {
  await withFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli(["refresh", "--root", root, "--json"]);
    await seedDuplicates(root);
    await callback(root);
  });
}

async function seedDuplicates(root) {
  const runtimePath = `${repoRoot}/packages/runtime/dist/index.js`;
  const findingsPath = `${repoRoot}/packages/kernel-findings/dist/index.js`;
  const { createLocalArtifactStore, buildIssueAdjudicationReport, buildCoherencyDelta } = await import(
    runtimePath
  );
  const { createFindingReport, createFindingLifecycleReport, deriveFindingLifecycle } = await import(
    findingsPath
  );

  const store = createLocalArtifactStore(root);
  await store.init();

  const finding = (id) => ({
    id,
    type: "import_boundary.parent_relative_import",
    severity: "medium",
    title: "Parent-relative import",
    description: "Imports starting with `../` should be replaced.",
    subjects: ["src/foo.ts"],
    files: ["src/foo.ts"],
    ruleId: "import-boundaries.parent_relative_import",
  });

  const report = createFindingReport({
    header: testHeader("FindingReport", "fr-seed"),
    findings: [finding("f1"), finding("f2")],
  });
  const reportRef = await store.write(report, { category: "findings" });

  const lc = deriveFindingLifecycle({ latestReport: report });
  const lcHeader = testHeader("FindingLifecycleReport", "fl-seed");
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

function testHeader(type, id) {
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
