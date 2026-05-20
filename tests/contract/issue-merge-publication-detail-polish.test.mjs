// Issue merge decision publication / detail polish v2
// — contract tests. Pin the human-readable CLI
// output (candidate detail, candidates list,
// decisions summary), the new proof-report Issue
// Merge Decision Context section, and the tighter
// architecture-summary + agent-contract command
// guidance.
//
// All fixtures copy `examples/simple-js-ts` to a
// mkdtemp tmpdir so the committed example stays
// untouched.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- 1: candidate detail non-JSON output ----------

test("`issues merge candidate <id>` non-JSON output includes candidate id, decision state, groups, member ids, files, and recommended commands", async () => {
  await withTwoCandidateFixture(async ({ root, candidates }) => {
    const output = runCli([
      "issues",
      "merge",
      "candidate",
      candidates[0].id,
      "--root",
      root,
    ]).stdout;
    assert.match(output, new RegExp(`Merge Candidate: ${escapeRegex(candidates[0].id)}`));
    assert.match(output, /Decision: none/);
    assert.match(output, /Strength: /);
    assert.match(output, /Groups:/);
    assert.match(output, /Member finding ids: /);
    assert.match(output, /Files: /);
    assert.match(output, /Recommended commands:/);
    assert.match(
      output,
      new RegExp(`rekon issues merge decide ${escapeRegex(candidates[0].id)} --decision accepted`),
    );
  });
});

// ---------- 2: undecided candidate says "Decision: none" ----------

test("undecided candidate detail says Decision: none", async () => {
  await withTwoCandidateFixture(async ({ root, candidates }) => {
    const output = runCli([
      "issues",
      "merge",
      "candidate",
      candidates[0].id,
      "--root",
      root,
    ]).stdout;
    assert.match(output, /Decision: none/);
    assert.ok(
      !output.includes("Latest Decision:"),
      "no Latest Decision block should render on the undecided path",
    );
  });
});

// ---------- 3: stale/superseded candidate detail surfaces warnings + rekon refresh ----------

test("stale/superseded candidate detail surfaces warnings and recommends `rekon refresh`", async () => {
  await withTwoCandidateFixture(async ({ root, candidates }) => {
    runCli([
      "issues",
      "merge",
      "decide",
      candidates[0].id,
      "--root",
      root,
      "--decision",
      "accepted",
      "--note",
      "Accepted.",
      "--json",
    ]);
    runCli(["coherency", "delta", "--root", root, "--json"]);
    runCli([
      "issues",
      "merge",
      "decide",
      candidates[0].id,
      "--root",
      root,
      "--decision",
      "rejected",
      "--note",
      "Reversed.",
      "--reason",
      "separate-issues",
      "--json",
    ]);
    const output = runCli([
      "issues",
      "merge",
      "candidate",
      candidates[0].id,
      "--root",
      root,
    ]).stdout;
    assert.match(output, /Warnings:/);
    assert.match(output, /Recommended command: rekon refresh/);
  });
});

// ---------- 4: candidates list non-JSON renders summary + table ----------

test("`issues merge candidates` non-JSON renders summary line and table", async () => {
  await withTwoCandidateFixture(async ({ root }) => {
    const output = runCli(["issues", "merge", "candidates", "--root", root]).stdout;
    assert.match(output, /Merge candidates: 2 total, 2 undecided, 0 accepted, 0 rejected/);
    assert.match(output, /\| Candidate \| Decision \| Strength \| Confidence \| Groups \| Reasons \|/);
  });
});

// ---------- 5: candidates list non-JSON shows applied filters ----------

test("candidates list non-JSON shows applied filters line", async () => {
  await withTwoCandidateFixture(async ({ root }) => {
    const output = runCli([
      "issues",
      "merge",
      "candidates",
      "--root",
      root,
      "--undecided",
    ]).stdout;
    assert.match(output, /Filters: decision=none/);
  });
});

// ---------- 6: candidates list non-JSON empty-state ----------

test("candidates list non-JSON renders empty-state text when filters return zero matches", async () => {
  await withTwoCandidateFixture(async ({ root }) => {
    const output = runCli([
      "issues",
      "merge",
      "candidates",
      "--root",
      root,
      "--decision",
      "accepted",
    ]).stdout;
    assert.match(output, /No issue merge candidates match the requested filters\./);
  });
});

// ---------- 7: proof report cites adjudication + ledger + delta when present ----------

test("proof report cites IssueAdjudicationReport, IssueMergeDecisionLedger, and CoherencyDelta in inputRefs when present", async () => {
  await withTwoCandidateFixture(async ({ root, candidates }) => {
    runCli([
      "issues", "merge", "decide", candidates[0].id, "--root", root,
      "--decision", "accepted", "--note", "Accepted.", "--json",
    ]);
    runCli(["coherency", "delta", "--root", root, "--json"]);
    runCli(["publish", "proof", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "proof-report");
    const types = publication.header.inputRefs.map((ref) => ref.type);
    assert.ok(types.includes("IssueAdjudicationReport"));
    assert.ok(types.includes("IssueMergeDecisionLedger"));
    assert.ok(types.includes("CoherencyDelta"));
  });
});

// ---------- 8: proof report includes Issue Merge Decision Context section ----------

test("proof report renders `## Issue Merge Decision Context` section", async () => {
  await withTwoCandidateFixture(async ({ root }) => {
    runCli(["publish", "proof", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "proof-report");
    assert.ok(publication.content.includes("## Issue Merge Decision Context"));
  });
});

// ---------- 9: proof report shows accepted/rejected/undecided counts ----------

test("proof report renders accepted/rejected/undecided counts", async () => {
  await withTwoCandidateFixture(async ({ root, candidates }) => {
    runCli([
      "issues", "merge", "decide", candidates[0].id, "--root", root,
      "--decision", "accepted", "--note", "Accepted.", "--json",
    ]);
    runCli(["coherency", "delta", "--root", root, "--json"]);
    runCli(["publish", "proof", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "proof-report");
    assert.match(publication.content, /- Merge candidates: 2/);
    assert.match(publication.content, /- Accepted: 1/);
    assert.match(publication.content, /- Rejected: 0/);
    assert.match(publication.content, /- Undecided: 1/);
  });
});

// ---------- 10: proof report shows accepted roll-up table when present ----------

test("proof report renders accepted roll-up table when accepted decisions exist", async () => {
  await withTwoCandidateFixture(async ({ root, candidates }) => {
    runCli([
      "issues", "merge", "decide", candidates[0].id, "--root", root,
      "--decision", "accepted", "--note", "Accepted.", "--json",
    ]);
    runCli(["coherency", "delta", "--root", root, "--json"]);
    runCli(["publish", "proof", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "proof-report");
    assert.match(publication.content, /- Accepted roll-ups in CoherencyDelta: 1/);
    assert.match(
      publication.content,
      /\| Roll-up \| Groups \| Decision IDs \| Member Findings \| Freshness \|/,
    );
  });
});

// ---------- 11: proof report recommends --undecided when undecided exist ----------

test("proof report recommends `issues merge candidates --undecided --json` when undecided exist", async () => {
  await withTwoCandidateFixture(async ({ root }) => {
    runCli(["publish", "proof", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "proof-report");
    assert.match(publication.content, /rekon issues merge candidates --undecided --json/);
  });
});

// ---------- 12: proof report recommends --superseded when freshness warns ----------

test("proof report recommends `issues merge candidates --superseded --json` when superseded candidates exist", async () => {
  await withTwoCandidateFixture(async ({ root, candidates }) => {
    runCli([
      "issues", "merge", "decide", candidates[0].id, "--root", root,
      "--decision", "accepted", "--note", "Accepted.", "--json",
    ]);
    runCli(["coherency", "delta", "--root", root, "--json"]);
    runCli([
      "issues", "merge", "decide", candidates[0].id, "--root", root,
      "--decision", "rejected", "--note", "Reversed.", "--reason", "separate-issues", "--json",
    ]);
    runCli(["publish", "proof", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "proof-report");
    assert.match(publication.content, /rekon issues merge candidates --superseded --json/);
  });
});

// ---------- 13: architecture summary command guidance ----------

test("architecture summary includes both --undecided and --decision accepted guidance when both apply", async () => {
  await withTwoCandidateFixture(async ({ root, candidates }) => {
    runCli([
      "issues", "merge", "decide", candidates[0].id, "--root", root,
      "--decision", "accepted", "--note", "Accepted.", "--json",
    ]);
    runCli(["coherency", "delta", "--root", root, "--json"]);
    runCli(["publish", "architecture", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "architecture-summary");
    assert.match(publication.content, /rekon issues merge candidates --undecided --json/);
    assert.match(publication.content, /rekon issues merge candidates --decision accepted --json/);
  });
});

// ---------- 14: agent contract command guidance ----------

test("agent contract includes accepted-audit command when accepted candidates exist", async () => {
  await withTwoCandidateFixture(async ({ root, candidates }) => {
    runCli([
      "issues", "merge", "decide", candidates[0].id, "--root", root,
      "--decision", "accepted", "--note", "Accepted.", "--json",
    ]);
    runCli(["coherency", "delta", "--root", root, "--json"]);
    runCli(["publish", "agent-contract", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "agent-contract");
    assert.match(publication.content, /rekon issues merge candidates --decision accepted --json/);
  });
});

// ---------- 15: `issues merge decisions --json` includes summary current/superseded ----------

test("`issues merge decisions --json` includes summary current/superseded/accepted/rejected counts", async () => {
  await withTwoCandidateFixture(async ({ root, candidates }) => {
    runCli([
      "issues", "merge", "decide", candidates[0].id, "--root", root,
      "--decision", "accepted", "--note", "Accepted.", "--json",
    ]);
    runCli([
      "issues", "merge", "decide", candidates[0].id, "--root", root,
      "--decision", "rejected", "--note", "Reversed.", "--reason", "separate-issues", "--json",
    ]);
    runCli([
      "issues", "merge", "decide", candidates[1].id, "--root", root,
      "--decision", "accepted", "--note", "Other accepted.", "--json",
    ]);
    const result = JSON.parse(
      runCli(["issues", "merge", "decisions", "--root", root, "--json"]).stdout,
    );
    assert.equal(result.summary.total, 3);
    assert.equal(result.summary.current, 2); // one per candidateId
    assert.equal(result.summary.superseded, 1);
    assert.equal(result.summary.accepted, 1);
    assert.equal(result.summary.rejected, 1);
    const supersededEntries = result.decisions.filter((entry) => entry.current === false);
    assert.equal(supersededEntries.length, 1);
    assert.equal(supersededEntries[0].decision, "accepted");
    assert.equal(supersededEntries[0].candidateId, candidates[0].id);
  });
});

// ---------- 16: `issues merge decisions` non-JSON renders table ----------

test("`issues merge decisions` non-JSON renders summary + readable table", async () => {
  await withTwoCandidateFixture(async ({ root, candidates }) => {
    runCli([
      "issues", "merge", "decide", candidates[0].id, "--root", root,
      "--decision", "accepted", "--note", "First.", "--json",
    ]);
    runCli([
      "issues", "merge", "decide", candidates[0].id, "--root", root,
      "--decision", "rejected", "--note", "Reversed.", "--reason", "separate-issues", "--json",
    ]);
    const output = runCli(["issues", "merge", "decisions", "--root", root]).stdout;
    assert.match(output, /Merge decisions: 2 total, 1 current, 1 superseded/);
    assert.match(output, /\| Candidate \| Decision \| Current \| Decided At \| Note \|/);
  });
});

// ---------- 17: artifacts validate stays clean ----------

test("artifacts validate stays clean across publication/detail polish scenarios", async () => {
  await withTwoCandidateFixture(async ({ root, candidates }) => {
    runCli([
      "issues", "merge", "decide", candidates[0].id, "--root", root,
      "--decision", "accepted", "--note", "Accepted.", "--json",
    ]);
    runCli(["coherency", "delta", "--root", root, "--json"]);
    runCli(["publish", "proof", "--root", root, "--json"]);
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

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function withTwoCandidateFixture(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-merge-polish-"));
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

async function seedTwoCrossRuleCandidates(root) {
  const runtime = await import(`${repoRoot}/packages/runtime/dist/index.js`);
  const findings = await import(`${repoRoot}/packages/kernel-findings/dist/index.js`);
  const { createLocalArtifactStore, buildIssueAdjudicationReport } = runtime;
  const { createFindingReport, createFindingLifecycleReport, deriveFindingLifecycle } = findings;
  const store = createLocalArtifactStore(root);
  await store.init();
  const report = createFindingReport({
    header: artifactHeader("FindingReport", "fr-polish"),
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
  const lcHeader = artifactHeader("FindingLifecycleReport", "fl-polish");
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
