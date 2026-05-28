// Contract tests for the CapabilityArchitectureLintReport
// v1 artifact (thirty-eighth slice on the capability-
// ontology track).
//
// Verifies that the new evaluation artifact:
//   - registers cleanly in the SDK + runtime,
//   - validates as a "CapabilityArchitectureLintReport"
//     with summary re-derived from rows,
//   - evaluates configured CapabilityContract rows only
//     against the matched phrase-backed
//     CapabilityMap entry,
//   - emits pass / violation / not-evaluated rows for
//     the four v1 placement rules (allowed-layer,
//     forbidden-layer, allowed-system,
//     forbidden-system),
//   - emits not-evaluated rows for system rules until
//     a deterministic system field exists on
//     phrase-backed capabilities,
//   - reserves `findingCandidate` for violation rows
//     as a preview payload only — never writes
//     FindingReport,
//   - never mutates CapabilityContract,
//     CapabilityMap, FindingReport,
//     FindingLifecycleReport, or CoherencyDelta,
//   - exposes itself via the
//     `rekon capability lint architecture` CLI.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  assertCapabilityArchitectureLintReport,
  validateCapabilityArchitectureLintReport,
} from "../../packages/kernel-repo-model/dist/index.js";
import {
  buildCapabilityArchitectureLintReport,
  buildCapabilityContract,
  CAPABILITY_ARCHITECTURE_LINT_FINDING_CATEGORY,
} from "../../packages/capability-model/dist/index.js";
import { createRuntime } from "../../packages/runtime/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const fixtureRoot = join(repoRoot, "tests/fixtures/js-ts-ast-evidence");

const CAPABILITY_MAP_REF = {
  type: "CapabilityMap",
  id: "capability-map-test-001",
  path: ".rekon/artifacts/projections/CapabilityMap-test.json",
  schemaVersion: "0.1.0",
};
const CAPABILITY_CONTRACT_REF = {
  type: "CapabilityContract",
  id: "capability-contract-test-001",
  path: ".rekon/artifacts/actions/CapabilityContract-test.json",
  schemaVersion: "0.1.0",
};
const PHRASE_REPORT_REF = {
  type: "CapabilityPhraseReport",
  id: "capability-phrase-test-001",
  path: ".rekon/artifacts/projections/CapabilityPhraseReport-test.json",
  schemaVersion: "0.1.0",
};
const EVIDENCE_REF = {
  type: "EvidenceGraph",
  id: "evidence-test-001",
  path: ".rekon/artifacts/evidence/EvidenceGraph-test.json",
  schemaVersion: "0.1.0",
};

function makePhraseBackedCapability(overrides = {}) {
  return {
    id: "capability-phrase:phrase-001",
    phraseRef: { report: PHRASE_REPORT_REF, phraseId: "phrase-001" },
    verb: "compute",
    noun: "invoice-preview",
    domain: "billing",
    evidenceRefs: [EVIDENCE_REF],
    sourceCandidateIds: ["candidate-001"],
    confidence: "high",
    status: "stable",
    ...overrides,
  };
}

function makeCapabilityMap(phraseBacked) {
  return {
    header: {
      artifactType: "CapabilityMap",
      artifactId: "capability-map-test-001",
      schemaVersion: "0.1.0",
      generatedAt: new Date().toISOString(),
      subject: { repoId: "test-repo" },
      producer: { id: "test-harness", version: "0.1.0" },
      inputRefs: [EVIDENCE_REF, PHRASE_REPORT_REF],
      freshness: { status: "fresh" },
      provenance: { confidence: 0.85 },
    },
    entries: [],
    phraseBackedCapabilities: phraseBacked,
    phraseSourceRef: PHRASE_REPORT_REF,
  };
}

function makeContractFor(map, configContracts) {
  return buildCapabilityContract({
    capabilityMap: map,
    capabilityMapRef: CAPABILITY_MAP_REF,
    config: { version: "0.1.0", contracts: configContracts },
    configPath: ".rekon/capability-contracts.json",
    generatedAt: "2026-05-27T00:00:00.000Z",
  });
}

// ---------- 1: artifact validates ----------

test("CapabilityArchitectureLintReport validates", () => {
  const map = makeCapabilityMap([makePhraseBackedCapability({ layer: "domain" })]);
  const contract = makeContractFor(map, [
    {
      id: "rule.invoice",
      match: { verb: "compute", noun: "invoice-preview" },
      allowedLayers: ["domain"],
    },
  ]);
  const report = buildCapabilityArchitectureLintReport({
    capabilityContract: contract,
    capabilityContractRef: CAPABILITY_CONTRACT_REF,
    capabilityMap: map,
    capabilityMapRef: CAPABILITY_MAP_REF,
    generatedAt: "2026-05-27T01:00:00.000Z",
  });
  const result = validateCapabilityArchitectureLintReport(report);
  assert.equal(result.ok, true, JSON.stringify(result.issues));
  assert.equal(report.header.artifactType, "CapabilityArchitectureLintReport");
});

// ---------- 2: allowedLayer match -> pass ----------

test("configured contract with matching allowedLayer emits pass", () => {
  const map = makeCapabilityMap([makePhraseBackedCapability({ layer: "domain" })]);
  const contract = makeContractFor(map, [
    {
      id: "rule.allow.match",
      match: { verb: "compute", noun: "invoice-preview" },
      allowedLayers: ["domain"],
    },
  ]);
  const report = buildCapabilityArchitectureLintReport({
    capabilityContract: contract,
    capabilityContractRef: CAPABILITY_CONTRACT_REF,
    capabilityMap: map,
    capabilityMapRef: CAPABILITY_MAP_REF,
  });
  const row = report.rows.find((r) => r.rule === "allowed-layer");
  assert.ok(row, "expected an allowed-layer row");
  assert.equal(row.status, "pass");
  assert.equal(row.findingCandidate, undefined);
});

// ---------- 3: allowedLayer non-match -> violation ----------

test("configured contract with non-matching allowedLayer emits violation", () => {
  const map = makeCapabilityMap([makePhraseBackedCapability({ layer: "route" })]);
  const contract = makeContractFor(map, [
    {
      id: "rule.allow.violate",
      match: { verb: "compute", noun: "invoice-preview" },
      allowedLayers: ["domain"],
    },
  ]);
  const report = buildCapabilityArchitectureLintReport({
    capabilityContract: contract,
    capabilityContractRef: CAPABILITY_CONTRACT_REF,
    capabilityMap: map,
    capabilityMapRef: CAPABILITY_MAP_REF,
  });
  const row = report.rows.find((r) => r.rule === "allowed-layer");
  assert.ok(row, "expected an allowed-layer row");
  assert.equal(row.status, "violation");
  assert.equal(row.severity, "high");
  assert.equal(row.confidence, "high");
  assert.ok(row.findingCandidate, "violation rows include findingCandidate");
  assert.equal(row.findingCandidate.category, CAPABILITY_ARCHITECTURE_LINT_FINDING_CATEGORY);
});

// ---------- 4: forbiddenLayer match -> violation ----------

test("configured contract with matching forbiddenLayer emits violation", () => {
  const map = makeCapabilityMap([makePhraseBackedCapability({ layer: "route" })]);
  const contract = makeContractFor(map, [
    {
      id: "rule.forbid.violate",
      match: { verb: "compute", noun: "invoice-preview" },
      forbiddenLayers: ["route"],
    },
  ]);
  const report = buildCapabilityArchitectureLintReport({
    capabilityContract: contract,
    capabilityContractRef: CAPABILITY_CONTRACT_REF,
    capabilityMap: map,
    capabilityMapRef: CAPABILITY_MAP_REF,
  });
  const row = report.rows.find((r) => r.rule === "forbidden-layer");
  assert.ok(row, "expected a forbidden-layer row");
  assert.equal(row.status, "violation");
  assert.ok(row.findingCandidate);
});

// ---------- 5: forbiddenLayer non-match -> pass ----------

test("configured contract with non-matching forbiddenLayer emits pass", () => {
  const map = makeCapabilityMap([makePhraseBackedCapability({ layer: "domain" })]);
  const contract = makeContractFor(map, [
    {
      id: "rule.forbid.pass",
      match: { verb: "compute", noun: "invoice-preview" },
      forbiddenLayers: ["route"],
    },
  ]);
  const report = buildCapabilityArchitectureLintReport({
    capabilityContract: contract,
    capabilityContractRef: CAPABILITY_CONTRACT_REF,
    capabilityMap: map,
    capabilityMapRef: CAPABILITY_MAP_REF,
  });
  const row = report.rows.find((r) => r.rule === "forbidden-layer");
  assert.ok(row, "expected a forbidden-layer row");
  assert.equal(row.status, "pass");
});

// ---------- 6: phrase-backed without layer -> not-evaluated ----------

test("configured contract without phrase-backed layer emits not-evaluated for layer rules", () => {
  const map = makeCapabilityMap([makePhraseBackedCapability({ layer: undefined })]);
  const contract = makeContractFor(map, [
    {
      id: "rule.no-layer",
      match: { verb: "compute", noun: "invoice-preview" },
      allowedLayers: ["domain"],
      forbiddenLayers: ["route"],
    },
  ]);
  const report = buildCapabilityArchitectureLintReport({
    capabilityContract: contract,
    capabilityContractRef: CAPABILITY_CONTRACT_REF,
    capabilityMap: map,
    capabilityMapRef: CAPABILITY_MAP_REF,
  });
  const allowed = report.rows.find((r) => r.rule === "allowed-layer");
  const forbidden = report.rows.find((r) => r.rule === "forbidden-layer");
  assert.equal(allowed.status, "not-evaluated");
  assert.equal(forbidden.status, "not-evaluated");
  assert.equal(allowed.confidence, "low");
});

// ---------- 7: allowedSystems -> not-evaluated (no system field) ----------

test("allowedSystems emits not-evaluated if no deterministic system field exists", () => {
  const map = makeCapabilityMap([makePhraseBackedCapability({ layer: "domain" })]);
  const contract = makeContractFor(map, [
    {
      id: "rule.sys.allow",
      match: { verb: "compute", noun: "invoice-preview" },
      allowedSystems: ["billing"],
    },
  ]);
  const report = buildCapabilityArchitectureLintReport({
    capabilityContract: contract,
    capabilityContractRef: CAPABILITY_CONTRACT_REF,
    capabilityMap: map,
    capabilityMapRef: CAPABILITY_MAP_REF,
  });
  const row = report.rows.find((r) => r.rule === "allowed-system");
  assert.ok(row, "expected an allowed-system row");
  assert.equal(row.status, "not-evaluated");
  assert.match(row.message, /No deterministic system field/);
});

// ---------- 8: forbiddenSystems -> not-evaluated (no system field) ----------

test("forbiddenSystems emits not-evaluated if no deterministic system field exists", () => {
  const map = makeCapabilityMap([makePhraseBackedCapability({ layer: "domain" })]);
  const contract = makeContractFor(map, [
    {
      id: "rule.sys.forbid",
      match: { verb: "compute", noun: "invoice-preview" },
      forbiddenSystems: ["billing"],
    },
  ]);
  const report = buildCapabilityArchitectureLintReport({
    capabilityContract: contract,
    capabilityContractRef: CAPABILITY_CONTRACT_REF,
    capabilityMap: map,
    capabilityMapRef: CAPABILITY_MAP_REF,
  });
  const row = report.rows.find((r) => r.rule === "forbidden-system");
  assert.ok(row, "expected a forbidden-system row");
  assert.equal(row.status, "not-evaluated");
});

// ---------- 9: unmatched contract rows are not evaluated ----------

test("unmatched contract rows are not evaluated", () => {
  const map = makeCapabilityMap([makePhraseBackedCapability({ layer: "domain" })]);
  // Build a contract with one matched + one unmatched row.
  const contract = makeContractFor(map, [
    {
      id: "rule.match",
      match: { verb: "compute", noun: "invoice-preview" },
      allowedLayers: ["domain"],
    },
    {
      id: "rule.unmatched",
      match: { verb: "ship", noun: "rocket" },
      allowedLayers: ["domain"],
    },
  ]);
  const report = buildCapabilityArchitectureLintReport({
    capabilityContract: contract,
    capabilityContractRef: CAPABILITY_CONTRACT_REF,
    capabilityMap: map,
    capabilityMapRef: CAPABILITY_MAP_REF,
  });
  // Confirm no rows reference the unmatched contract id.
  assert.ok(
    report.rows.every((row) => row.contractId !== "rule.unmatched"),
    "unmatched contract rows must not appear in lint rows",
  );
  // The matched row should produce a pass.
  const match = report.rows.find((r) => r.contractId === "rule.match");
  assert.equal(match.status, "pass");
});

// ---------- 10: missing phrase-backed -> not-evaluated ----------

test("missing phrase-backed capability emits not-evaluated", () => {
  // Build a contract row referencing a phrase-backed
  // capability, then evaluate against a CapabilityMap
  // with no phrase-backed entries. The contract row
  // becomes `unmatched` automatically, so the lint
  // report stays empty. We then assert that explicitly.
  const baseMap = makeCapabilityMap([makePhraseBackedCapability({ layer: "domain" })]);
  const contract = makeContractFor(baseMap, [
    {
      id: "rule.match",
      match: { verb: "compute", noun: "invoice-preview" },
      allowedLayers: ["domain"],
    },
  ]);
  // Replace the map with one missing the phrase-backed
  // entry, simulating a stale capabilityMapRef.
  const emptyMap = makeCapabilityMap([]);
  const report = buildCapabilityArchitectureLintReport({
    capabilityContract: contract,
    capabilityContractRef: CAPABILITY_CONTRACT_REF,
    capabilityMap: emptyMap,
    capabilityMapRef: CAPABILITY_MAP_REF,
  });
  const row = report.rows.find((r) => r.rule === "allowed-layer");
  assert.ok(row, "expected an allowed-layer row");
  assert.equal(row.status, "not-evaluated");
  assert.equal(row.confidence, "low");
});

// ---------- 11: violation rows include findingCandidate but no FindingReport ----------

test("violation rows include findingCandidate but do not write FindingReport", async () => {
  const map = makeCapabilityMap([makePhraseBackedCapability({ layer: "route" })]);
  const contract = makeContractFor(map, [
    {
      id: "rule.violate",
      match: { verb: "compute", noun: "invoice-preview" },
      allowedLayers: ["domain"],
    },
  ]);
  const report = buildCapabilityArchitectureLintReport({
    capabilityContract: contract,
    capabilityContractRef: CAPABILITY_CONTRACT_REF,
    capabilityMap: map,
    capabilityMapRef: CAPABILITY_MAP_REF,
  });
  const violation = report.rows.find((r) => r.status === "violation");
  assert.ok(violation, "expected a violation row");
  assert.ok(violation.findingCandidate);
  assert.equal(typeof violation.findingCandidate.title, "string");
  assert.equal(violation.findingCandidate.category, CAPABILITY_ARCHITECTURE_LINT_FINDING_CATEGORY);
  // The artifact header artifactType is the lint report,
  // never FindingReport.
  assert.equal(report.header.artifactType, "CapabilityArchitectureLintReport");
});

// ---------- 12: summary counts violations / passes / notEvaluated ----------

test("summary counts violations / passes / notEvaluated", () => {
  const map = makeCapabilityMap([
    makePhraseBackedCapability({ id: "capability-phrase:domain", layer: "domain" }),
    makePhraseBackedCapability({
      id: "capability-phrase:route",
      layer: "route",
      verb: "render",
      noun: "page",
    }),
  ]);
  const contract = makeContractFor(map, [
    {
      id: "rule.pass",
      match: { verb: "compute", noun: "invoice-preview" },
      allowedLayers: ["domain"],
    },
    {
      id: "rule.violate",
      match: { verb: "render", noun: "page" },
      allowedLayers: ["domain"],
    },
    {
      id: "rule.sys.skip",
      match: { verb: "render", noun: "page" },
      allowedSystems: ["ui"],
    },
  ]);
  const report = buildCapabilityArchitectureLintReport({
    capabilityContract: contract,
    capabilityContractRef: CAPABILITY_CONTRACT_REF,
    capabilityMap: map,
    capabilityMapRef: CAPABILITY_MAP_REF,
  });
  assert.equal(report.summary.violations, 1);
  assert.equal(report.summary.passes, 1);
  assert.equal(report.summary.notEvaluated, 1);
  assert.equal(
    report.summary.total,
    report.summary.violations + report.summary.passes + report.summary.notEvaluated,
  );
});

// ---------- 13: byRule and bySeverity counts are deterministic ----------

test("byRule and bySeverity counts are deterministic", () => {
  const map = makeCapabilityMap([
    makePhraseBackedCapability({ id: "capability-phrase:a", layer: "domain" }),
  ]);
  const contract = makeContractFor(map, [
    {
      id: "rule.layer.pass",
      match: { verb: "compute", noun: "invoice-preview" },
      allowedLayers: ["domain"],
    },
    {
      id: "rule.sys.skip",
      match: { verb: "compute", noun: "invoice-preview" },
      allowedSystems: ["billing"],
    },
  ]);
  const report = buildCapabilityArchitectureLintReport({
    capabilityContract: contract,
    capabilityContractRef: CAPABILITY_CONTRACT_REF,
    capabilityMap: map,
    capabilityMapRef: CAPABILITY_MAP_REF,
  });
  // Deterministic: identical input -> identical output.
  const report2 = buildCapabilityArchitectureLintReport({
    capabilityContract: contract,
    capabilityContractRef: CAPABILITY_CONTRACT_REF,
    capabilityMap: map,
    capabilityMapRef: CAPABILITY_MAP_REF,
    generatedAt: report.header.generatedAt,
  });
  // Replace artifactId for diff comparison (timestamps differ).
  assert.deepEqual(report.summary.byRule, report2.summary.byRule);
  assert.deepEqual(report.summary.bySeverity, report2.summary.bySeverity);
  assert.ok(report.summary.byRule["allowed-layer"] >= 1);
  // Keys are sorted ascending.
  const keys = Object.keys(report.summary.byRule);
  assert.deepEqual(keys, [...keys].sort());
});

// ---------- 14: CLI writes a CapabilityArchitectureLintReport ----------

test("rekon capability lint architecture writes a lint report", async () => {
  const work = await mkdtemp(join(tmpdir(), "rekon-lint-arch-"));
  try {
    await cp(fixtureRoot, work, { recursive: true });
    const refresh = spawnSync("node", [cliPath, "refresh", "--root", work, "--json"], { encoding: "utf8" });
    assert.equal(refresh.status, 0, refresh.stderr || refresh.stdout);
    const normalize = spawnSync(
      "node",
      [cliPath, "capability", "ontology", "normalize", "--root", work, "--json"],
      { encoding: "utf8" },
    );
    assert.equal(normalize.status, 0, normalize.stderr || normalize.stdout);
    const normReport = JSON.parse(normalize.stdout).artifact;
    const phraseProject = spawnSync(
      "node",
      [cliPath, "capability", "phrase", "project", "--root", work, "--report", `${normReport.type}:${normReport.id}`, "--json"],
      { encoding: "utf8" },
    );
    assert.equal(phraseProject.status, 0, phraseProject.stderr || phraseProject.stdout);
    const refresh2 = spawnSync("node", [cliPath, "refresh", "--root", work, "--json"], { encoding: "utf8" });
    assert.equal(refresh2.status, 0, refresh2.stderr || refresh2.stdout);

    await mkdir(join(work, ".rekon"), { recursive: true });
    await writeFile(
      join(work, ".rekon", "capability-contracts.json"),
      JSON.stringify(
        {
          version: "0.1.0",
          contracts: [
            {
              id: "rule.unmatched",
              match: { verb: "ship", noun: "rocket" },
              allowedLayers: ["domain"],
            },
          ],
        },
        null,
        2,
      ),
    );
    const generate = spawnSync(
      "node",
      [cliPath, "capability", "contract", "generate", "--root", work, "--json"],
      { encoding: "utf8" },
    );
    assert.equal(generate.status, 0, generate.stderr || generate.stdout);

    const lint = spawnSync(
      "node",
      [cliPath, "capability", "lint", "architecture", "--root", work, "--json"],
      { encoding: "utf8" },
    );
    assert.equal(lint.status, 0, lint.stderr || lint.stdout);
    const payload = JSON.parse(lint.stdout);
    assert.equal(payload.artifact.type, "CapabilityArchitectureLintReport");
    assert.ok(payload.summary);
    assert.ok(payload.source.capabilityContractRef);
    assert.ok(payload.source.capabilityMapRef);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 15: CLI supports pinned CapabilityContract / CapabilityMap ----------

test("rekon capability lint architecture supports pinned --capability-contract and --capability-map", async () => {
  const work = await mkdtemp(join(tmpdir(), "rekon-lint-arch-pin-"));
  try {
    await cp(fixtureRoot, work, { recursive: true });
    const refresh = spawnSync("node", [cliPath, "refresh", "--root", work, "--json"], { encoding: "utf8" });
    assert.equal(refresh.status, 0, refresh.stderr || refresh.stdout);
    const normalize = spawnSync(
      "node",
      [cliPath, "capability", "ontology", "normalize", "--root", work, "--json"],
      { encoding: "utf8" },
    );
    assert.equal(normalize.status, 0);
    const normReport = JSON.parse(normalize.stdout).artifact;
    const phraseProject = spawnSync(
      "node",
      [cliPath, "capability", "phrase", "project", "--root", work, "--report", `${normReport.type}:${normReport.id}`, "--json"],
      { encoding: "utf8" },
    );
    assert.equal(phraseProject.status, 0);
    const refresh2 = spawnSync("node", [cliPath, "refresh", "--root", work, "--json"], { encoding: "utf8" });
    assert.equal(refresh2.status, 0);
    const generate = spawnSync(
      "node",
      [cliPath, "capability", "contract", "generate", "--root", work, "--json"],
      { encoding: "utf8" },
    );
    assert.equal(generate.status, 0, generate.stderr || generate.stdout);
    const contractArtifact = JSON.parse(generate.stdout).artifact;

    // Now find a CapabilityMap ref via artifacts latest.
    const latestMap = spawnSync(
      "node",
      [cliPath, "artifacts", "latest", "--root", work, "--type", "CapabilityMap", "--json"],
      { encoding: "utf8" },
    );
    assert.equal(latestMap.status, 0, latestMap.stderr || latestMap.stdout);
    const mapArtifact = JSON.parse(latestMap.stdout).artifact;

    const lint = spawnSync(
      "node",
      [
        cliPath,
        "capability",
        "lint",
        "architecture",
        "--root",
        work,
        "--capability-contract",
        `${contractArtifact.type}:${contractArtifact.id}`,
        "--capability-map",
        `${mapArtifact.type}:${mapArtifact.id}`,
        "--json",
      ],
      { encoding: "utf8" },
    );
    assert.equal(lint.status, 0, lint.stderr || lint.stdout);
    const payload = JSON.parse(lint.stdout);
    assert.equal(payload.source.capabilityContractRef.id, contractArtifact.id);
    assert.equal(payload.source.capabilityMapRef.id, mapArtifact.id);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 16: CLI says no findings were written ----------

test("rekon capability lint architecture human output says no findings were written", async () => {
  const work = await mkdtemp(join(tmpdir(), "rekon-lint-arch-human-"));
  try {
    await cp(fixtureRoot, work, { recursive: true });
    const refresh = spawnSync("node", [cliPath, "refresh", "--root", work], { encoding: "utf8" });
    assert.equal(refresh.status, 0, refresh.stderr || refresh.stdout);
    const generate = spawnSync(
      "node",
      [cliPath, "capability", "contract", "generate", "--root", work],
      { encoding: "utf8" },
    );
    assert.equal(generate.status, 0, generate.stderr || generate.stdout);
    const lint = spawnSync(
      "node",
      [cliPath, "capability", "lint", "architecture", "--root", work],
      { encoding: "utf8" },
    );
    assert.equal(lint.status, 0, lint.stderr || lint.stdout);
    assert.match(lint.stdout, /No findings were written\./);
    assert.match(lint.stdout, /Evaluation only/i);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 17: CLI does not mutate CapabilityContract ----------

test("rekon capability lint architecture does not mutate CapabilityContract", async () => {
  const work = await mkdtemp(join(tmpdir(), "rekon-lint-arch-pure-contract-"));
  try {
    await cp(fixtureRoot, work, { recursive: true });
    const refresh = spawnSync("node", [cliPath, "refresh", "--root", work, "--json"], { encoding: "utf8" });
    assert.equal(refresh.status, 0);
    const generate = spawnSync(
      "node",
      [cliPath, "capability", "contract", "generate", "--root", work, "--json"],
      { encoding: "utf8" },
    );
    assert.equal(generate.status, 0, generate.stderr || generate.stdout);
    const actionsDir = join(work, ".rekon", "artifacts", "actions");
    const actionsBefore = await readdir(actionsDir).catch(() => []);
    const contractFile = actionsBefore.find((name) => name.startsWith("CapabilityContract-"));
    assert.ok(contractFile, "expected a pre-lint CapabilityContract");
    const contractBefore = await readFile(join(actionsDir, contractFile), "utf8");
    const lint = spawnSync(
      "node",
      [cliPath, "capability", "lint", "architecture", "--root", work, "--json"],
      { encoding: "utf8" },
    );
    assert.equal(lint.status, 0, lint.stderr || lint.stdout);
    const contractAfter = await readFile(join(actionsDir, contractFile), "utf8");
    assert.equal(contractAfter, contractBefore);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 18: CLI does not mutate CapabilityMap ----------

test("rekon capability lint architecture does not mutate CapabilityMap", async () => {
  const work = await mkdtemp(join(tmpdir(), "rekon-lint-arch-pure-map-"));
  try {
    await cp(fixtureRoot, work, { recursive: true });
    const refresh = spawnSync("node", [cliPath, "refresh", "--root", work, "--json"], { encoding: "utf8" });
    assert.equal(refresh.status, 0);
    const generate = spawnSync(
      "node",
      [cliPath, "capability", "contract", "generate", "--root", work, "--json"],
      { encoding: "utf8" },
    );
    assert.equal(generate.status, 0);
    const projectionsDir = join(work, ".rekon", "artifacts", "projections");
    const before = await readdir(projectionsDir).catch(() => []);
    const mapFile = before.find((name) => name.startsWith("CapabilityMap-"));
    assert.ok(mapFile, "expected a pre-lint CapabilityMap");
    const mapBefore = await readFile(join(projectionsDir, mapFile), "utf8");
    const lint = spawnSync(
      "node",
      [cliPath, "capability", "lint", "architecture", "--root", work, "--json"],
      { encoding: "utf8" },
    );
    assert.equal(lint.status, 0);
    const mapAfter = await readFile(join(projectionsDir, mapFile), "utf8");
    assert.equal(mapAfter, mapBefore);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 19: CLI does not mutate FindingReport ----------

test("rekon capability lint architecture does not mutate FindingReport", async () => {
  const work = await mkdtemp(join(tmpdir(), "rekon-lint-arch-pure-findings-"));
  try {
    await cp(fixtureRoot, work, { recursive: true });
    const refresh = spawnSync("node", [cliPath, "refresh", "--root", work, "--json"], { encoding: "utf8" });
    assert.equal(refresh.status, 0);
    const generate = spawnSync(
      "node",
      [cliPath, "capability", "contract", "generate", "--root", work, "--json"],
      { encoding: "utf8" },
    );
    assert.equal(generate.status, 0);
    const findingsDir = join(work, ".rekon", "artifacts", "findings");
    const before = await readdir(findingsDir).catch(() => []);
    const findingFiles = before.filter((name) => name.startsWith("FindingReport-"));
    const findingHashes = new Map();
    for (const file of findingFiles) {
      findingHashes.set(file, await readFile(join(findingsDir, file), "utf8"));
    }
    const lint = spawnSync(
      "node",
      [cliPath, "capability", "lint", "architecture", "--root", work, "--json"],
      { encoding: "utf8" },
    );
    assert.equal(lint.status, 0);
    const after = await readdir(findingsDir).catch(() => []);
    const findingFilesAfter = after.filter((name) => name.startsWith("FindingReport-"));
    assert.deepEqual(findingFilesAfter, findingFiles, "FindingReport file list must be unchanged");
    for (const file of findingFiles) {
      assert.equal(
        await readFile(join(findingsDir, file), "utf8"),
        findingHashes.get(file),
        `FindingReport ${file} bytes must be unchanged`,
      );
    }
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 20: CLI does not mutate FindingLifecycleReport ----------

test("rekon capability lint architecture does not mutate FindingLifecycleReport", async () => {
  const work = await mkdtemp(join(tmpdir(), "rekon-lint-arch-pure-lifecycle-"));
  try {
    await cp(fixtureRoot, work, { recursive: true });
    const refresh = spawnSync("node", [cliPath, "refresh", "--root", work, "--json"], { encoding: "utf8" });
    assert.equal(refresh.status, 0);
    const generate = spawnSync(
      "node",
      [cliPath, "capability", "contract", "generate", "--root", work, "--json"],
      { encoding: "utf8" },
    );
    assert.equal(generate.status, 0);
    const findingsDir = join(work, ".rekon", "artifacts", "findings");
    const before = await readdir(findingsDir).catch(() => []);
    const lifecycleFiles = before.filter((name) => name.startsWith("FindingLifecycleReport-"));
    const lifecycleHashes = new Map();
    for (const file of lifecycleFiles) {
      lifecycleHashes.set(file, await readFile(join(findingsDir, file), "utf8"));
    }
    const lint = spawnSync(
      "node",
      [cliPath, "capability", "lint", "architecture", "--root", work, "--json"],
      { encoding: "utf8" },
    );
    assert.equal(lint.status, 0);
    const after = await readdir(findingsDir).catch(() => []);
    const lifecycleAfter = after.filter((name) => name.startsWith("FindingLifecycleReport-"));
    assert.deepEqual(lifecycleAfter, lifecycleFiles);
    for (const file of lifecycleFiles) {
      assert.equal(
        await readFile(join(findingsDir, file), "utf8"),
        lifecycleHashes.get(file),
      );
    }
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 21: CLI does not mutate CoherencyDelta ----------

test("rekon capability lint architecture does not mutate CoherencyDelta", async () => {
  const work = await mkdtemp(join(tmpdir(), "rekon-lint-arch-pure-delta-"));
  try {
    await cp(fixtureRoot, work, { recursive: true });
    const refresh = spawnSync("node", [cliPath, "refresh", "--root", work, "--json"], { encoding: "utf8" });
    assert.equal(refresh.status, 0);
    const generate = spawnSync(
      "node",
      [cliPath, "capability", "contract", "generate", "--root", work, "--json"],
      { encoding: "utf8" },
    );
    assert.equal(generate.status, 0);
    const findingsDir = join(work, ".rekon", "artifacts", "findings");
    const before = await readdir(findingsDir).catch(() => []);
    const deltaFiles = before.filter((name) => name.startsWith("CoherencyDelta-"));
    const deltaHashes = new Map();
    for (const file of deltaFiles) {
      deltaHashes.set(file, await readFile(join(findingsDir, file), "utf8"));
    }
    const lint = spawnSync(
      "node",
      [cliPath, "capability", "lint", "architecture", "--root", work, "--json"],
      { encoding: "utf8" },
    );
    assert.equal(lint.status, 0);
    const after = await readdir(findingsDir).catch(() => []);
    const deltaAfter = after.filter((name) => name.startsWith("CoherencyDelta-"));
    assert.deepEqual(deltaAfter, deltaFiles);
    for (const file of deltaFiles) {
      assert.equal(
        await readFile(join(findingsDir, file), "utf8"),
        deltaHashes.get(file),
      );
    }
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 22: artifacts validate remains clean ----------

test("artifacts validate remains clean after writing a CapabilityArchitectureLintReport", async () => {
  const work = await mkdtemp(join(tmpdir(), "rekon-lint-arch-validate-"));
  try {
    await cp(fixtureRoot, work, { recursive: true });
    const refresh = spawnSync("node", [cliPath, "refresh", "--root", work, "--json"], { encoding: "utf8" });
    assert.equal(refresh.status, 0);
    const generate = spawnSync(
      "node",
      [cliPath, "capability", "contract", "generate", "--root", work, "--json"],
      { encoding: "utf8" },
    );
    assert.equal(generate.status, 0);
    const lint = spawnSync(
      "node",
      [cliPath, "capability", "lint", "architecture", "--root", work, "--json"],
      { encoding: "utf8" },
    );
    assert.equal(lint.status, 0, lint.stderr || lint.stdout);
    const validate = spawnSync(
      "node",
      [cliPath, "artifacts", "validate", "--root", work, "--json"],
      { encoding: "utf8" },
    );
    assert.equal(validate.status, 0, validate.stderr || validate.stdout);
    const payload = JSON.parse(validate.stdout);
    assert.equal(payload.valid, true, JSON.stringify(payload.issues, null, 2));
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- Bonus: runtime registry accepts the new artifact type ----------

test("createRuntime registers CapabilityArchitectureLintReport as a known artifact type", async () => {
  const runtimeRoot = await mkdtemp(join(tmpdir(), "rekon-runtime-lint-arch-"));
  try {
    const runtime = await createRuntime({ repoRoot: runtimeRoot });
    const types = runtime.registry.artifactTypes.map((entry) => entry.type);
    assert.ok(
      types.includes("CapabilityArchitectureLintReport"),
      "expected CapabilityArchitectureLintReport in runtime registry",
    );
  } finally {
    await rm(runtimeRoot, { recursive: true, force: true });
  }
});
