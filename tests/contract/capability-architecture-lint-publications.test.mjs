// Contract tests for the CapabilityArchitectureLintReport
// publication surfacing slice (fortieth slice on the
// capability-ontology track).
//
// The architecture-summary publisher and agent-contract
// publisher both surface the latest
// CapabilityArchitectureLintReport. Both surfaces are
// **strictly read-only**: never run `rekon capability
// lint architecture`, never mutate the lint report,
// CapabilityContract, CapabilityMap, FindingReport,
// FindingFilterReport, FindingLifecycleReport, or
// CoherencyDelta. findingCandidate stays preview-only.
//
// Tests pin assertions 1–20 from the work order.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { buildCapabilityArchitectureLintPublicationSection } from "../../packages/capability-docs/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

const CAPABILITY_CONTRACT_REF = {
  type: "CapabilityContract",
  id: "capability-contract-test-001",
  path: ".rekon/artifacts/actions/CapabilityContract-test.json",
  schemaVersion: "0.1.0",
};
const CAPABILITY_MAP_REF = {
  type: "CapabilityMap",
  id: "capability-map-test-001",
  path: ".rekon/artifacts/projections/CapabilityMap-test.json",
  schemaVersion: "0.1.0",
};

// ---------- 1: no-report guidance ----------

test("architecture summary block renders no-lint-report guidance when no report exists", () => {
  const { lines } = buildCapabilityArchitectureLintPublicationSection({
    report: undefined,
    headingLevel: 2,
  });
  const text = lines.join("\n");
  assert.match(text, /^## Capability Architecture Linting/m);
  assert.match(text, /No `CapabilityArchitectureLintReport` found\./);
  assert.match(text, /rekon capability lint architecture --json/);
  assert.match(
    text,
    /this publication does not write findings, mutate lifecycle state, route resolvers, generate verification plans, or write source files/,
  );
});

// ---------- 2: section present when report exists ----------

test("architecture summary block renders the Capability Architecture Linting section when a report exists", () => {
  const report = makeLintReport([
    lintRow({ status: "violation", rule: "forbidden-layer" }),
  ]);
  const { lines } = buildCapabilityArchitectureLintPublicationSection({
    report,
    headingLevel: 2,
  });
  const text = lines.join("\n");
  assert.match(text, /^## Capability Architecture Linting/m);
  assert.match(text, /Rows: 1/);
});

// ---------- 3: summary counts ----------

test("architecture summary block renders summary counts (violations / passes / not-evaluated)", () => {
  const report = makeLintReport(
    [
      lintRow({ status: "violation", rule: "forbidden-layer" }),
      lintRow({ status: "pass", rule: "allowed-layer", id: "r2" }),
      lintRow({ status: "not-evaluated", rule: "allowed-system", id: "r3" }),
    ],
    {
      summary: {
        total: 3,
        violations: 1,
        passes: 1,
        notEvaluated: 1,
        byRule: { "allowed-layer": 1, "allowed-system": 1, "forbidden-layer": 1 },
        bySeverity: { high: 1, low: 2 },
      },
    },
  );
  const { lines } = buildCapabilityArchitectureLintPublicationSection({
    report,
    headingLevel: 2,
  });
  const text = lines.join("\n");
  assert.match(text, /Rows: 3 \(violations 1, passes 1, not-evaluated 1\)/);
  assert.match(text, /By rule:/);
  assert.match(text, /By severity:/);
});

// ---------- 4: bounded lint row table ----------

test("architecture summary block renders a bounded lint row table", () => {
  const rows = [];
  for (let index = 0; index < 25; index++) {
    rows.push(
      lintRow({
        id: `row-${index}`,
        status: "pass",
        rule: "allowed-layer",
        contractId: `fixture.entity-${index}`,
      }),
    );
  }
  const report = makeLintReport(rows, {
    summary: {
      total: 25,
      violations: 0,
      passes: 25,
      notEvaluated: 0,
      byRule: { "allowed-layer": 25 },
      bySeverity: { low: 25 },
    },
  });
  const { lines } = buildCapabilityArchitectureLintPublicationSection({
    report,
    headingLevel: 2,
  });
  const text = lines.join("\n");
  assert.match(
    text,
    /\| Status \| Rule \| Contract \| Capability \| Severity \| Confidence \| Message \|/,
  );
  assert.match(text, /5 additional lint row\(s\) omitted/);
});

// ---------- 5: boundary statement ----------

test("architecture summary block states publication does not write findings / mutate lifecycle / route / plan / write source files", () => {
  const report = makeLintReport([lintRow({ status: "violation", rule: "forbidden-layer" })]);
  const { lines } = buildCapabilityArchitectureLintPublicationSection({
    report,
    headingLevel: 2,
  });
  const text = lines.join("\n");
  assert.match(
    text,
    /CapabilityArchitectureLintReport is evaluation visibility only; this publication does not write findings, mutate lifecycle state, route resolvers, generate verification plans, or write source files\./,
  );
});

// ---------- 6: architecture summary cites lint report in header.inputRefs ----------

test("architecture summary publication cites CapabilityArchitectureLintReport in header.inputRefs when present", async () => {
  const work = await setupWorkspaceWithLintReport();
  try {
    runCli(work, ["publish", "architecture", "--json"]);
    const publication = await loadLatestPublication(work, "architecture-summary");
    const inputRefs = publication.header.inputRefs ?? [];
    const cite = inputRefs.find((ref) => ref.type === "CapabilityArchitectureLintReport");
    assert.ok(cite, "architecture summary must cite CapabilityArchitectureLintReport in header.inputRefs");
    assert.match(String(cite.id), /^capability-architecture-lint-/);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 7: agent contract renders section ----------

test("agent contract publication renders Capability Architecture Linting section", async () => {
  const work = await setupWorkspaceWithLintReport();
  try {
    runCli(work, ["publish", "agent-contract", "--json"]);
    const publication = await loadLatestPublication(work, "agent-contract");
    const content = String(publication.content ?? "");
    assert.match(content, /^### Capability Architecture Linting/m);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 8: agent contract says evaluation, not enforcement ----------

test("agent contract publication says CapabilityArchitectureLintReport is evaluation, not enforcement", async () => {
  const work = await setupWorkspaceWithLintReport();
  try {
    runCli(work, ["publish", "agent-contract", "--json"]);
    const publication = await loadLatestPublication(work, "agent-contract");
    const content = String(publication.content ?? "");
    assert.match(
      content,
      /CapabilityArchitectureLintReport is evaluation, not enforcement/i,
    );
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 9: agent contract says findingCandidate is preview-only ----------

test("agent contract publication says findingCandidate is preview-only", async () => {
  const work = await setupWorkspaceWithLintReport();
  try {
    runCli(work, ["publish", "agent-contract", "--json"]);
    const publication = await loadLatestPublication(work, "agent-contract");
    const content = String(publication.content ?? "");
    assert.match(content, /findingCandidate is preview-only/i);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 10: agent contract explains not-evaluated rows ----------

test("agent contract publication explains not-evaluated rows", async () => {
  const work = await setupWorkspaceWithLintReport();
  try {
    runCli(work, ["publish", "agent-contract", "--json"]);
    const publication = await loadLatestPublication(work, "agent-contract");
    const content = String(publication.content ?? "");
    assert.match(
      content,
      /`?not-evaluated`? rows mean Rekon lacks deterministic context/i,
    );
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 11: agent contract says surfacing does not write/mutate/route/plan/write source ----------

test("agent contract publication says surfacing does not write findings / mutate lifecycle / route / plan / write source files", async () => {
  const work = await setupWorkspaceWithLintReport();
  try {
    runCli(work, ["publish", "agent-contract", "--json"]);
    const publication = await loadLatestPublication(work, "agent-contract");
    const content = String(publication.content ?? "");
    assert.match(
      content,
      /this publication does not write findings, mutate lifecycle state, route resolvers, generate verification plans, or write source files/i,
    );
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 12: agent contract Do Not Do reminder ----------

test("agent contract Do Not Do reminder covers FindingReport mutation, lifecycle mutation, CoherencyDelta remediation, resolver routing, verification planning, RefactorPreservationContract, and source-write permission", async () => {
  const work = await setupWorkspaceWithLintReport();
  try {
    runCli(work, ["publish", "agent-contract", "--json"]);
    const publication = await loadLatestPublication(work, "agent-contract");
    const content = String(publication.content ?? "");
    assert.match(
      content,
      /Do not treat CapabilityArchitectureLintReport publication surfacing as FindingReport mutation, lifecycle mutation, CoherencyDelta remediation, resolver routing, verification planning, RefactorPreservationContract, or source-write permission\./,
    );
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 13: publication does not create or mutate CapabilityArchitectureLintReport ----------

test("publication generation does not create or mutate CapabilityArchitectureLintReport", async () => {
  const work = await setupWorkspaceWithLintReport();
  try {
    const indexPath = join(work, ".rekon/registry/artifacts.index.json");
    const before = JSON.parse(await readFile(indexPath, "utf8"));
    const beforeLint = before.filter((e) => e.type === "CapabilityArchitectureLintReport");
    runCli(work, ["publish", "architecture", "--json"]);
    runCli(work, ["publish", "agent-contract", "--json"]);
    const after = JSON.parse(await readFile(indexPath, "utf8"));
    const afterLint = after.filter((e) => e.type === "CapabilityArchitectureLintReport");
    assert.equal(afterLint.length, beforeLint.length);
    for (const entry of afterLint) {
      const previous = beforeLint.find((other) => other.id === entry.id);
      assert.ok(previous, "publish must not add new CapabilityArchitectureLintReport artifacts");
      assert.equal(entry.digest, previous.digest);
    }
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 14: publication does not mutate CapabilityContract ----------

test("publication generation does not mutate CapabilityContract", async () => {
  const work = await setupWorkspaceWithLintReport();
  try {
    const indexPath = join(work, ".rekon/registry/artifacts.index.json");
    const before = JSON.parse(await readFile(indexPath, "utf8"));
    const beforeContracts = before.filter((e) => e.type === "CapabilityContract");
    runCli(work, ["publish", "architecture", "--json"]);
    runCli(work, ["publish", "agent-contract", "--json"]);
    const after = JSON.parse(await readFile(indexPath, "utf8"));
    const afterContracts = after.filter((e) => e.type === "CapabilityContract");
    assert.equal(afterContracts.length, beforeContracts.length);
    for (const entry of afterContracts) {
      const previous = beforeContracts.find((other) => other.id === entry.id);
      assert.ok(previous);
      assert.equal(entry.digest, previous.digest);
    }
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 15: publication does not mutate CapabilityMap ----------

test("publication generation does not mutate CapabilityMap", async () => {
  const work = await setupWorkspaceWithLintReport();
  try {
    const indexPath = join(work, ".rekon/registry/artifacts.index.json");
    const before = JSON.parse(await readFile(indexPath, "utf8"));
    const beforeMaps = before.filter((e) => e.type === "CapabilityMap");
    runCli(work, ["publish", "architecture", "--json"]);
    runCli(work, ["publish", "agent-contract", "--json"]);
    const after = JSON.parse(await readFile(indexPath, "utf8"));
    const afterMaps = after.filter((e) => e.type === "CapabilityMap");
    assert.equal(afterMaps.length, beforeMaps.length);
    for (const entry of afterMaps) {
      const previous = beforeMaps.find((other) => other.id === entry.id);
      assert.ok(previous);
      assert.equal(entry.digest, previous.digest);
    }
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 16: publication does not mutate FindingReport ----------

test("publication generation does not mutate FindingReport", async () => {
  const work = await setupWorkspaceWithLintReport();
  try {
    const indexPath = join(work, ".rekon/registry/artifacts.index.json");
    const before = JSON.parse(await readFile(indexPath, "utf8"));
    const beforeFindings = before.filter((e) => e.type === "FindingReport");
    runCli(work, ["publish", "architecture", "--json"]);
    runCli(work, ["publish", "agent-contract", "--json"]);
    const after = JSON.parse(await readFile(indexPath, "utf8"));
    const afterFindings = after.filter((e) => e.type === "FindingReport");
    assert.equal(afterFindings.length, beforeFindings.length);
    for (const entry of afterFindings) {
      const previous = beforeFindings.find((other) => other.id === entry.id);
      assert.ok(previous);
      assert.equal(entry.digest, previous.digest);
    }
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 17: publication does not mutate FindingLifecycleReport ----------

test("publication generation does not mutate FindingLifecycleReport", async () => {
  const work = await setupWorkspaceWithLintReport();
  try {
    const indexPath = join(work, ".rekon/registry/artifacts.index.json");
    const before = JSON.parse(await readFile(indexPath, "utf8"));
    const beforeLifecycle = before.filter((e) => e.type === "FindingLifecycleReport");
    runCli(work, ["publish", "architecture", "--json"]);
    runCli(work, ["publish", "agent-contract", "--json"]);
    const after = JSON.parse(await readFile(indexPath, "utf8"));
    const afterLifecycle = after.filter((e) => e.type === "FindingLifecycleReport");
    assert.equal(afterLifecycle.length, beforeLifecycle.length);
    for (const entry of afterLifecycle) {
      const previous = beforeLifecycle.find((other) => other.id === entry.id);
      assert.ok(previous);
      assert.equal(entry.digest, previous.digest);
    }
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 18: publication does not mutate CoherencyDelta ----------

test("publication generation does not mutate CoherencyDelta", async () => {
  const work = await setupWorkspaceWithLintReport();
  try {
    const indexPath = join(work, ".rekon/registry/artifacts.index.json");
    const before = JSON.parse(await readFile(indexPath, "utf8"));
    const beforeDelta = before.filter((e) => e.type === "CoherencyDelta");
    runCli(work, ["publish", "architecture", "--json"]);
    runCli(work, ["publish", "agent-contract", "--json"]);
    const after = JSON.parse(await readFile(indexPath, "utf8"));
    const afterDelta = after.filter((e) => e.type === "CoherencyDelta");
    assert.equal(afterDelta.length, beforeDelta.length);
    for (const entry of afterDelta) {
      const previous = beforeDelta.find((other) => other.id === entry.id);
      assert.ok(previous);
      assert.equal(entry.digest, previous.digest);
    }
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 19: proof-report deferral documented ----------

test("proof report surfacing is explicitly deferred in docs", async () => {
  const candidates = [
    join(repoRoot, "docs/concepts/capability-aware-architecture-linting.md"),
    join(repoRoot, "docs/artifacts/capability-architecture-lint-report.md"),
    join(repoRoot, "docs/concepts/proof-report-publication.md"),
    join(repoRoot, "docs/artifacts/proof-report-publication.md"),
  ];
  const normalise = (text) => text.replace(/\s+/g, " ").toLowerCase();
  let found = false;
  for (const path of candidates) {
    let raw;
    try {
      raw = await readFile(path, "utf8");
    } catch {
      continue;
    }
    const text = normalise(raw);
    if (
      /proof[- ]?report[^.]*defer|defer[^.]*proof[- ]?report/.test(text)
      && /capabilityarchitecturelintreport/.test(text)
    ) {
      found = true;
      break;
    }
  }
  assert.ok(
    found,
    "at least one publication-surfacing doc must explicitly defer proof-report surfacing of CapabilityArchitectureLintReport",
  );
});

// ---------- 20: artifacts validate clean ----------

test("rekon artifacts validate stays clean after lint publication surfacing", async () => {
  const work = await setupWorkspaceWithLintReport();
  try {
    runCli(work, ["publish", "architecture", "--json"]);
    runCli(work, ["publish", "agent-contract", "--json"]);
    const validate = runCli(work, ["artifacts", "validate", "--json"]);
    const payload = JSON.parse(validate.stdout);
    assert.ok(Array.isArray(payload.issues));
    assert.equal(payload.issues.length, 0);
    assert.equal(payload.valid, true);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- Helpers ----------

function lintRow(overrides = {}) {
  const status = overrides.status ?? "pass";
  const row = {
    id: overrides.id ?? `${overrides.contractId ?? "fixture.create-user"}:${overrides.rule ?? "allowed-layer"}`,
    contractId: overrides.contractId ?? "fixture.create-user",
    phraseCapabilityId: overrides.phraseCapabilityId ?? "capability-phrase:phrase-001",
    rule: overrides.rule ?? "allowed-layer",
    status,
    severity: overrides.severity ?? (status === "violation" ? "high" : "low"),
    confidence: overrides.confidence ?? (status === "not-evaluated" ? "low" : "high"),
    message: overrides.message ?? "Lint row message.",
    evidenceRefs: [CAPABILITY_MAP_REF],
  };
  if (status === "violation") {
    row.findingCandidate = {
      title: "Capability placement violation.",
      category: "capability_architecture_policy",
      severity: "high",
    };
  }
  return row;
}

function makeLintReport(rows, overrides = {}) {
  const summary = overrides.summary ?? {
    total: rows.length,
    violations: rows.filter((r) => r.status === "violation").length,
    passes: rows.filter((r) => r.status === "pass").length,
    notEvaluated: rows.filter((r) => r.status === "not-evaluated").length,
    byRule: {},
    bySeverity: {},
  };
  return {
    header: {
      artifactType: "CapabilityArchitectureLintReport",
      artifactId: "capability-architecture-lint-test",
      schemaVersion: "0.1.0",
      generatedAt: "2026-05-28T00:00:00Z",
      subject: { repoId: "/tmp/test" },
      producer: { id: "@rekon/capability-model", version: "0.1.0" },
      inputRefs: [],
      freshness: { status: "fresh" },
    },
    source: {
      capabilityContractRef: CAPABILITY_CONTRACT_REF,
      capabilityMapRef: CAPABILITY_MAP_REF,
    },
    summary,
    rows,
  };
}

async function setupWorkspaceWithLintReport() {
  const work = await mkdtemp(join(tmpdir(), "rekon-lint-pub-"));
  await cp(exampleRoot, work, { recursive: true });
  await rm(join(work, ".rekon"), { recursive: true, force: true });
  runCli(work, ["init"]);
  runCli(work, ["refresh", "--skip-publish", "--skip-freshness"]);
  runCli(work, ["capability", "ontology", "normalize", "--json"]);
  const reportRef = runCli(work, [
    "artifacts",
    "latest",
    "--type",
    "CapabilityNormalizationReport",
    "--id-only",
  ]).stdout.trim();
  runCli(work, [
    "capability",
    "phrase",
    "project",
    "--report",
    reportRef,
    "--json",
  ]);
  runCli(work, ["refresh", "--skip-publish", "--skip-freshness"]);
  await mkdir(join(work, ".rekon"), { recursive: true });
  await writeFile(
    join(work, ".rekon/capability-contracts.json"),
    JSON.stringify(
      {
        version: "0.1.0",
        contracts: [
          {
            id: "fixture.create-user",
            match: { verb: "create", noun: "user" },
            allowedLayers: ["domain"],
            forbiddenLayers: ["route"],
            requiredChecks: ["npm run test"],
            preservationRules: ["Preserve create-user behavior."],
          },
        ],
      },
      null,
      2,
    ),
  );
  runCli(work, ["capability", "contract", "generate", "--json"]);
  runCli(work, ["capability", "lint", "architecture", "--json"]);
  return work;
}

async function loadLatestPublication(work, kind) {
  const indexPath = join(work, ".rekon/registry/artifacts.index.json");
  const index = JSON.parse(await readFile(indexPath, "utf8"));
  const entries = index.filter((entry) =>
    entry.type === "Publication" && typeof entry.path === "string"
    && entry.path.includes(`Publication-${kind}-`));
  if (entries.length === 0) {
    throw new Error(`no ${kind} publication found`);
  }
  const latest = entries.sort((a, b) => a.writtenAt.localeCompare(b.writtenAt)).at(-1);
  return JSON.parse(await readFile(join(work, latest.path), "utf8"));
}

function runCli(cwd, args, { allowFailure = false } = {}) {
  const result = spawnSync(process.execPath, [cliPath, "--root", cwd, ...args], {
    cwd,
    encoding: "utf8",
  });
  if (!allowFailure && result.status !== 0) {
    throw new Error(
      `CLI failed: ${args.join(" ")}\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`,
    );
  }
  return result;
}
