// Contract tests for CapabilityPhraseReport v1.
//
// CapabilityPhraseReport is the semantic-purpose-projection
// artifact (Layer 5b) that consumes the latest
// CapabilityNormalizationReport and emits high-confidence
// CapabilityPhrase entries. The translation audit
// (CapabilityNormalizationReport) is never mutated.
// CapabilityMap remains untouched.
//
// Tests pin:
//   1.  CapabilityPhraseReport validates.
//   2.  high-confidence normalized candidate -> stable phrase.
//   3.  unknown-verb candidate is not projected.
//   4.  unknown-noun candidate is not projected.
//   5.  ignored candidate is not projected.
//   6.  low-confidence candidate is not projected.
//   7.  phrase id is deterministic.
//   8.  phrase ordering is deterministic.
//   9.  phrase cites source candidate id.
//   10. phrase carries evidence refs.
//   11. report header cites CapabilityNormalizationReport.
//   12. report header cites EvidenceGraph when source cites it.
//   13. summary counts total / stable / partial / lowConfidence.
//   14. CLI requires --report.
//   15. CLI writes CapabilityPhraseReport.
//   16. CLI output says CapabilityMap remains unchanged.
//   17. CLI does not mutate CapabilityNormalizationReport.
//   18. CLI does not mutate EvidenceGraph.
//   19. CLI does not mutate CapabilityMap.
//   20. artifacts validate remains clean.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cp,
  mkdtemp,
  readFile,
  readdir,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  buildCapabilityPhraseReport,
  validateCapabilityPhraseReport,
} from "../../packages/capability-ontology/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- helpers ----------

function makeReportHeader(id = "phrase-report-test") {
  return {
    artifactType: "CapabilityPhraseReport",
    artifactId: id,
    schemaVersion: "0.1.0",
    generatedAt: "2026-05-26T00:00:00.000Z",
    subject: { repoId: "test" },
    producer: { id: "test", version: "0.1.0" },
    inputRefs: [],
    freshness: { status: "fresh" },
  };
}

function makeReportRef(id = "norm-test") {
  return {
    type: "CapabilityNormalizationReport",
    id,
    path: `.rekon/artifacts/projections/CapabilityNormalizationReport-${id}.json`,
    digest: "fake-digest",
    schemaVersion: "0.1.0",
  };
}

function makeEvidenceRef(id = "evidence-test") {
  return {
    type: "EvidenceGraph",
    id,
    path: `.rekon/artifacts/evidence/EvidenceGraph-${id}.json`,
    digest: "fake-evidence-digest",
    schemaVersion: "0.1.0",
  };
}

function makeCandidate(overrides = {}) {
  return {
    id: "candidate-0000",
    source: {
      artifactRef: makeEvidenceRef(),
      factId: "fact-0",
      path: "src/users.ts",
      symbol: "getUser",
      kind: "symbol",
    },
    raw: {
      name: "getUser",
      verb: "get",
      noun: "user",
      splitConfidence: "high",
    },
    normalized: {
      verb: "get",
      noun: "user",
    },
    confidence: "high",
    status: "normalized",
    ...overrides,
  };
}

function makeNormalizationReport(candidates, options = {}) {
  return {
    header: {
      artifactType: "CapabilityNormalizationReport",
      artifactId: "norm-test",
      schemaVersion: "0.1.0",
      generatedAt: "2026-05-26T00:00:00.000Z",
      subject: { repoId: "test" },
      producer: { id: "test", version: "0.1.0" },
      inputRefs: options.cited
        ? [makeEvidenceRef(options.evidenceId ?? "evidence-test")]
        : [],
      freshness: { status: "fresh" },
    },
    ontology: {
      source: "builtin",
      effectiveHash: "abc123",
    },
    summary: {
      totalCandidates: candidates.length,
      normalized: candidates.filter((c) => c.status === "normalized").length,
      unknownVerb: candidates.filter((c) => c.status === "unknown-verb").length,
      unknownNoun: candidates.filter((c) => c.status === "unknown-noun").length,
      unknown: candidates.filter((c) => c.status === "unknown").length,
      ignored: candidates.filter((c) => c.status === "ignored").length,
      aliasApplied: 0,
      lowConfidence: candidates.filter((c) => c.status === "low-confidence").length,
    },
    candidates,
  };
}

function buildSimpleReport(candidates, options = {}) {
  const normalizationReport = makeNormalizationReport(candidates, options);
  const normalizationReportRef = makeReportRef();
  return buildCapabilityPhraseReport({
    header: makeReportHeader(),
    normalizationReport,
    normalizationReportRef,
  });
}

// ---------- 1: validator accepts populated report ----------

test("validateCapabilityPhraseReport accepts a populated report", () => {
  const report = buildSimpleReport([makeCandidate()]);
  const result = validateCapabilityPhraseReport(report);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.report.summary.totalPhrases, 1);
  }
});

// ---------- 2: high-confidence normalized -> stable phrase ----------

test("high-confidence normalized candidate becomes a stable phrase", () => {
  const report = buildSimpleReport([makeCandidate()]);
  assert.equal(report.phrases.length, 1);
  const phrase = report.phrases[0];
  assert.equal(phrase.verb, "get");
  assert.equal(phrase.noun, "user");
  assert.equal(phrase.status, "stable");
  assert.equal(phrase.confidence, "high");
});

// ---------- 3: unknown-verb candidate not projected ----------

test("unknown-verb candidate is not projected", () => {
  const candidate = makeCandidate({
    id: "candidate-unknown-verb",
    status: "unknown-verb",
    normalized: { verb: "ensure", noun: "user" },
  });
  const report = buildSimpleReport([candidate]);
  assert.equal(report.phrases.length, 0);
});

// ---------- 4: unknown-noun candidate not projected ----------

test("unknown-noun candidate is not projected", () => {
  const candidate = makeCandidate({
    id: "candidate-unknown-noun",
    status: "unknown-noun",
    normalized: { verb: "get", noun: "invoice" },
  });
  const report = buildSimpleReport([candidate]);
  assert.equal(report.phrases.length, 0);
});

// ---------- 5: ignored candidate not projected ----------

test("ignored candidate is not projected", () => {
  const candidate = makeCandidate({
    id: "candidate-ignored",
    status: "ignored",
    normalized: undefined,
  });
  const report = buildSimpleReport([candidate]);
  assert.equal(report.phrases.length, 0);
});

// ---------- 6: low-confidence candidate not projected ----------

test("low-confidence candidate is not projected", () => {
  const candidate = makeCandidate({
    id: "candidate-low",
    confidence: "low",
    status: "normalized",
    raw: {
      name: "save",
      verb: "save",
      noun: undefined,
      splitConfidence: "low",
    },
  });
  const report = buildSimpleReport([candidate]);
  assert.equal(report.phrases.length, 0);
});

// ---------- 7: deterministic phrase id ----------

test("phrase id is deterministic across runs", () => {
  const a = buildSimpleReport([makeCandidate()]);
  const b = buildSimpleReport([makeCandidate()]);
  assert.equal(a.phrases[0].id, b.phrases[0].id);
  assert.match(a.phrases[0].id, /^phrase-candidate-0000-get-user$/);
});

// ---------- 8: deterministic ordering ----------

test("phrase ordering is deterministic by path / verb / noun", () => {
  const candidates = [
    makeCandidate({
      id: "candidate-0001",
      source: {
        artifactRef: makeEvidenceRef(),
        path: "src/zeta.ts",
        symbol: "createOrder",
        kind: "symbol",
      },
      raw: { name: "createOrder", verb: "create", noun: "order", splitConfidence: "high" },
      normalized: { verb: "create", noun: "order" },
    }),
    makeCandidate({
      id: "candidate-0002",
      source: {
        artifactRef: makeEvidenceRef(),
        path: "src/alpha.ts",
        symbol: "getUser",
        kind: "symbol",
      },
      raw: { name: "getUser", verb: "get", noun: "user", splitConfidence: "high" },
      normalized: { verb: "get", noun: "user" },
    }),
  ];
  const report = buildSimpleReport(candidates);
  // alphabetic order by path: alpha < zeta
  assert.equal(report.phrases[0].sourceCandidateIds[0], "candidate-0002");
  assert.equal(report.phrases[1].sourceCandidateIds[0], "candidate-0001");
});

// ---------- 9: phrase cites source candidate id ----------

test("phrase cites source candidate id", () => {
  const report = buildSimpleReport([makeCandidate()]);
  assert.deepEqual(report.phrases[0].sourceCandidateIds, ["candidate-0000"]);
});

// ---------- 10: phrase carries evidence refs ----------

test("phrase carries evidence refs", () => {
  const report = buildSimpleReport([makeCandidate()]);
  const refs = report.phrases[0].evidenceRefs;
  assert.ok(refs.length >= 1, "phrase must cite at least one evidence ref");
  assert.equal(refs[0].type, "EvidenceGraph");
});

// ---------- 11: report header cites CapabilityNormalizationReport ----------

test("report header cites CapabilityNormalizationReport", () => {
  const report = buildSimpleReport([makeCandidate()]);
  const cite = report.header.inputRefs.find(
    (ref) => ref.type === "CapabilityNormalizationReport",
  );
  assert.ok(cite, "header.inputRefs must cite CapabilityNormalizationReport");
  assert.equal(report.sourceNormalizationReportRef.type, "CapabilityNormalizationReport");
});

// ---------- 12: report header cites EvidenceGraph when source cites it ----------

test("report header cites EvidenceGraph when normalization report cites EvidenceGraph", () => {
  const report = buildSimpleReport([makeCandidate()], { cited: true });
  const cite = report.header.inputRefs.find(
    (ref) => ref.type === "EvidenceGraph",
  );
  assert.ok(cite, "header.inputRefs must cite EvidenceGraph when upstream cites it");
});

// ---------- 13: summary counts total / stable / partial / lowConfidence ----------

test("summary counts total / stable / partial / lowConfidence", () => {
  const candidates = [
    makeCandidate({ id: "candidate-a" }),
    makeCandidate({
      id: "candidate-b",
      source: {
        artifactRef: makeEvidenceRef(),
        path: "src/b.ts",
        symbol: "saveToken",
        kind: "symbol",
      },
      raw: { name: "saveToken", verb: "save", noun: "token", splitConfidence: "high" },
      normalized: { verb: "save", noun: "token" },
    }),
  ];
  const report = buildSimpleReport(candidates);
  assert.equal(report.summary.totalPhrases, 2);
  assert.equal(report.summary.stable, 2);
  assert.equal(report.summary.partial, 0);
  assert.equal(report.summary.lowConfidence, 0);
});

// ---------- 14: CLI requires --report ----------

test("rekon capability phrase project requires --report", async () => {
  const work = await mkdtemp(join(tmpdir(), "rekon-phrase-cli-report-"));
  try {
    await cp(exampleRoot, work, { recursive: true });
    spawnSync("node", [cliPath, "refresh", "--root", work, "--json"], { encoding: "utf8" });
    const result = spawnSync(
      "node",
      [cliPath, "capability", "phrase", "project", "--root", work, "--json"],
      { encoding: "utf8" },
    );
    assert.notEqual(result.status, 0, "CLI must fail without --report");
    const stderr = result.stderr ?? "";
    assert.match(
      stderr,
      /--report <CapabilityNormalizationReport-id\|type:id>/,
      "stderr must mention required --report flag",
    );
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 15: CLI writes CapabilityPhraseReport ----------

test("rekon capability phrase project writes a CapabilityPhraseReport", async () => {
  const work = await mkdtemp(join(tmpdir(), "rekon-phrase-cli-write-"));
  try {
    await cp(exampleRoot, work, { recursive: true });
    spawnSync("node", [cliPath, "refresh", "--root", work, "--json"], { encoding: "utf8" });
    spawnSync(
      "node",
      [cliPath, "capability", "ontology", "normalize", "--root", work, "--json"],
      { encoding: "utf8" },
    );
    const latest = spawnSync(
      "node",
      [
        cliPath,
        "artifacts",
        "latest",
        "--root",
        work,
        "--type",
        "CapabilityNormalizationReport",
        "--id-only",
      ],
      { encoding: "utf8" },
    );
    const reportRef = (latest.stdout ?? "").trim();
    assert.ok(reportRef.startsWith("CapabilityNormalizationReport:"), reportRef);

    const projectResult = spawnSync(
      "node",
      [
        cliPath,
        "capability",
        "phrase",
        "project",
        "--root",
        work,
        "--report",
        reportRef,
        "--json",
      ],
      { encoding: "utf8" },
    );
    assert.equal(projectResult.status, 0, projectResult.stderr || "project failed");
    const out = JSON.parse(projectResult.stdout);
    assert.equal(out.artifact.type, "CapabilityPhraseReport");

    const projDir = join(work, ".rekon/artifacts/projections");
    const files = await readdir(projDir);
    const phraseFile = files.find((f) => f.startsWith("CapabilityPhraseReport-"));
    assert.ok(phraseFile, "expected a CapabilityPhraseReport artifact on disk");
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 16: CLI output says CapabilityMap remains unchanged ----------

test("rekon capability phrase project human output says CapabilityMap remains unchanged", async () => {
  const work = await mkdtemp(join(tmpdir(), "rekon-phrase-cli-human-"));
  try {
    await cp(exampleRoot, work, { recursive: true });
    spawnSync("node", [cliPath, "refresh", "--root", work, "--json"], { encoding: "utf8" });
    spawnSync(
      "node",
      [cliPath, "capability", "ontology", "normalize", "--root", work, "--json"],
      { encoding: "utf8" },
    );
    const latest = spawnSync(
      "node",
      [
        cliPath,
        "artifacts",
        "latest",
        "--root",
        work,
        "--type",
        "CapabilityNormalizationReport",
        "--id-only",
      ],
      { encoding: "utf8" },
    );
    const reportRef = (latest.stdout ?? "").trim();
    const projectResult = spawnSync(
      "node",
      [
        cliPath,
        "capability",
        "phrase",
        "project",
        "--root",
        work,
        "--report",
        reportRef,
      ],
      { encoding: "utf8" },
    );
    assert.equal(projectResult.status, 0);
    assert.match(projectResult.stdout, /CapabilityMap remains unchanged\./);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 17: CLI does not mutate CapabilityNormalizationReport ----------

test("rekon capability phrase project does not mutate CapabilityNormalizationReport", async () => {
  const work = await mkdtemp(join(tmpdir(), "rekon-phrase-cli-norm-"));
  try {
    await cp(exampleRoot, work, { recursive: true });
    spawnSync("node", [cliPath, "refresh", "--root", work, "--json"], { encoding: "utf8" });
    spawnSync(
      "node",
      [cliPath, "capability", "ontology", "normalize", "--root", work, "--json"],
      { encoding: "utf8" },
    );
    const projDir = join(work, ".rekon/artifacts/projections");
    const before = (await readdir(projDir)).filter((f) =>
      f.startsWith("CapabilityNormalizationReport-"),
    );
    const beforeContents = await Promise.all(
      before.map((f) => readFile(join(projDir, f), "utf8")),
    );

    const latest = spawnSync(
      "node",
      [
        cliPath,
        "artifacts",
        "latest",
        "--root",
        work,
        "--type",
        "CapabilityNormalizationReport",
        "--id-only",
      ],
      { encoding: "utf8" },
    );
    const reportRef = (latest.stdout ?? "").trim();
    spawnSync(
      "node",
      [
        cliPath,
        "capability",
        "phrase",
        "project",
        "--root",
        work,
        "--report",
        reportRef,
        "--json",
      ],
      { encoding: "utf8" },
    );

    const after = (await readdir(projDir)).filter((f) =>
      f.startsWith("CapabilityNormalizationReport-"),
    );
    const afterContents = await Promise.all(
      after.map((f) => readFile(join(projDir, f), "utf8")),
    );

    assert.deepEqual(after, before, "no new CapabilityNormalizationReport artifacts");
    assert.deepEqual(afterContents, beforeContents, "CapabilityNormalizationReport contents unchanged");
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 18: CLI does not mutate EvidenceGraph ----------

test("rekon capability phrase project does not mutate EvidenceGraph", async () => {
  const work = await mkdtemp(join(tmpdir(), "rekon-phrase-cli-evidence-"));
  try {
    await cp(exampleRoot, work, { recursive: true });
    spawnSync("node", [cliPath, "refresh", "--root", work, "--json"], { encoding: "utf8" });
    spawnSync(
      "node",
      [cliPath, "capability", "ontology", "normalize", "--root", work, "--json"],
      { encoding: "utf8" },
    );
    const evidenceDir = join(work, ".rekon/artifacts/evidence");
    const before = await readdir(evidenceDir);
    const beforeContents = await Promise.all(
      before.map((f) => readFile(join(evidenceDir, f), "utf8")),
    );

    const latest = spawnSync(
      "node",
      [
        cliPath,
        "artifacts",
        "latest",
        "--root",
        work,
        "--type",
        "CapabilityNormalizationReport",
        "--id-only",
      ],
      { encoding: "utf8" },
    );
    const reportRef = (latest.stdout ?? "").trim();
    spawnSync(
      "node",
      [
        cliPath,
        "capability",
        "phrase",
        "project",
        "--root",
        work,
        "--report",
        reportRef,
        "--json",
      ],
      { encoding: "utf8" },
    );

    const after = await readdir(evidenceDir);
    const afterContents = await Promise.all(
      after.map((f) => readFile(join(evidenceDir, f), "utf8")),
    );

    assert.deepEqual(after, before, "no new EvidenceGraph artifacts");
    assert.deepEqual(afterContents, beforeContents, "EvidenceGraph contents unchanged");
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 19: CLI does not mutate CapabilityMap ----------

test("rekon capability phrase project does not mutate CapabilityMap", async () => {
  const work = await mkdtemp(join(tmpdir(), "rekon-phrase-cli-capmap-"));
  try {
    await cp(exampleRoot, work, { recursive: true });
    spawnSync("node", [cliPath, "refresh", "--root", work, "--json"], { encoding: "utf8" });
    spawnSync(
      "node",
      [cliPath, "capability", "ontology", "normalize", "--root", work, "--json"],
      { encoding: "utf8" },
    );
    const projDir = join(work, ".rekon/artifacts/projections");
    const before = (await readdir(projDir)).filter((f) => f.startsWith("CapabilityMap-"));
    const beforeContents = await Promise.all(
      before.map((f) => readFile(join(projDir, f), "utf8")),
    );

    const latest = spawnSync(
      "node",
      [
        cliPath,
        "artifacts",
        "latest",
        "--root",
        work,
        "--type",
        "CapabilityNormalizationReport",
        "--id-only",
      ],
      { encoding: "utf8" },
    );
    const reportRef = (latest.stdout ?? "").trim();
    spawnSync(
      "node",
      [
        cliPath,
        "capability",
        "phrase",
        "project",
        "--root",
        work,
        "--report",
        reportRef,
        "--json",
      ],
      { encoding: "utf8" },
    );

    const after = (await readdir(projDir)).filter((f) => f.startsWith("CapabilityMap-"));
    const afterContents = await Promise.all(
      after.map((f) => readFile(join(projDir, f), "utf8")),
    );

    assert.deepEqual(after, before, "no new CapabilityMap artifacts");
    assert.deepEqual(afterContents, beforeContents, "CapabilityMap contents unchanged");
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 20: artifacts validate remains clean ----------

test("rekon artifacts validate remains clean after a phrase projection run", async () => {
  const work = await mkdtemp(join(tmpdir(), "rekon-phrase-cli-validate-"));
  try {
    await cp(exampleRoot, work, { recursive: true });
    spawnSync("node", [cliPath, "refresh", "--root", work, "--json"], { encoding: "utf8" });
    spawnSync(
      "node",
      [cliPath, "capability", "ontology", "normalize", "--root", work, "--json"],
      { encoding: "utf8" },
    );
    const latest = spawnSync(
      "node",
      [
        cliPath,
        "artifacts",
        "latest",
        "--root",
        work,
        "--type",
        "CapabilityNormalizationReport",
        "--id-only",
      ],
      { encoding: "utf8" },
    );
    const reportRef = (latest.stdout ?? "").trim();
    spawnSync(
      "node",
      [
        cliPath,
        "capability",
        "phrase",
        "project",
        "--root",
        work,
        "--report",
        reportRef,
        "--json",
      ],
      { encoding: "utf8" },
    );

    const validateResult = spawnSync(
      "node",
      [cliPath, "artifacts", "validate", "--root", work, "--json"],
      { encoding: "utf8" },
    );
    assert.equal(validateResult.status, 0, validateResult.stderr || "validate failed");
    const validate = JSON.parse(validateResult.stdout);
    assert.equal(validate.valid, true, JSON.stringify(validate.issues ?? []));
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});
