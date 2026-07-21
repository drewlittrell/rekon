// Behavioral tests for the classic-parity-bench (Phase 0). All tests run
// against small synthetic fixtures committed under tests/fixtures/parity/ —
// never against the private real corpus (which is gated behind
// REKON_PARITY_CORPUS and lives outside the repository).

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { after, test } from "node:test";

import { loadClassicFindings, normalizeClassicIssuesV1, normalizePath } from "./normalize-classic.mjs";
import {
  evidenceInputArtifactType,
  evidenceInputCliArgs,
  validateCorpusEvidenceInputs,
} from "./corpus-evidence-inputs.mjs";
import {
  createCorpusEvidenceVerificationPlan,
  diffProtectedCorpusTrees,
  isAcceptablePartialRefresh,
  snapshotProtectedCorpusTree,
  validateCorpusEvidenceCapture,
} from "./corpus-evidence-capture.mjs";
import {
  buildBenchReport,
  classifyParity,
  computeWeightedRecall,
  computeWeightedSignalCoverage,
  validateParityEquivalences,
  validateRuleMap,
} from "./parity-core.mjs";
import { gapReviewId } from "./gap-judge-core.mjs";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const benchPath = join(repoRoot, "tests/bench/classic-parity-bench.mjs");
const fixtureCorpus = join(repoRoot, "tests/fixtures/parity");
const publicCorpusCatalog = JSON.parse(readFileSync(join(repoRoot, "tests/bench/public-corpus.sources.json"), "utf8"));

const tempRoots = [];

after(() => {
  for (const tempRoot of tempRoots) {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

function classicFinding(overrides = {}) {
  return {
    id: "classic-1",
    ruleId: "classic.rule",
    file: "src/a.ts",
    files: ["src/a.ts"],
    subjects: ["core"],
    severity: "medium",
    title: "classic finding",
    fireCount: 1,
    ...overrides,
  };
}

function rekonFinding(overrides = {}) {
  return {
    id: "rekon-1",
    type: "imports",
    severity: "medium",
    title: "rekon finding",
    description: "rekon finding",
    subjects: ["src/a.ts"],
    files: ["src/a.ts"],
    ruleId: "rekon.rule",
    ...overrides,
  };
}

function rekonAssessment(overrides = {}) {
  return {
    id: "assessment-1",
    kind: "risk",
    type: "tech_debt",
    subjects: ["src/a.ts"],
    files: ["src/a.ts"],
    ruleId: "rekon.rule",
    ...overrides,
  };
}

test("quality-only public corpus catalog pins reproducible source provenance", () => {
  assert.equal(publicCorpusCatalog.version, "1.0.0");
  assert.equal(publicCorpusCatalog.repositories.length, 9);
  assert.equal(new Set(publicCorpusCatalog.repositories.map((repo) => repo.id)).size, 9);
  const expectedLicenses = new Map([
    ["public-eslint", "MIT"],
    ["public-fastify", "MIT"],
    ["public-nest", "MIT"],
    ["public-nextjs", "MIT"],
    ["public-playwright", "Apache-2.0"],
    ["public-pnpm", "MIT"],
    ["public-redux-toolkit", "MIT"],
    ["public-vite", "MIT"],
    ["public-vitest", "MIT"],
  ]);
  for (const repo of publicCorpusCatalog.repositories) {
    assert.match(repo.id, /^public-/);
    assert.match(repo.url, /^https:\/\/github\.com\//);
    assert.match(repo.commit, /^[0-9a-f]{40}$/);
    assert.equal(repo.license, expectedLicenses.get(repo.id));
    assert.equal(typeof repo.role, "string");
    assert.ok(repo.role.length > 0);
  }
});

test("matched: ported rule with same rekon rule + normalized file", () => {
  const { rows, newFindings } = classifyParity({
    classicFindings: [classicFinding({ files: ["./src/a.ts"], file: "src/a.ts" })],
    rekonFindings: [rekonFinding()],
    ruleMap: { "classic.rule": { status: "ported", rekonRuleId: "rekon.rule" } },
  });

  assert.equal(rows[0].classification, "matched");
  assert.deepEqual(rows[0].matchedRekonIds, ["rekon-1"]);
  assert.equal(newFindings.length, 0);
});

test("matched: subject fallback when classic carries no file", () => {
  const { rows } = classifyParity({
    classicFindings: [classicFinding({ files: [], file: "", subjects: ["payments"] })],
    rekonFindings: [rekonFinding({ files: [], subjects: ["payments"] })],
    ruleMap: { "classic.rule": { status: "ported", rekonRuleId: "rekon.rule" } },
  });

  assert.equal(rows[0].classification, "matched");
});

test("missed-gap: unported rule and ported rule with no match", () => {
  const { rows } = classifyParity({
    classicFindings: [
      classicFinding({ id: "classic-1", ruleId: "classic.unported" }),
      classicFinding({ id: "classic-2", ruleId: "classic.rule", files: ["src/other.ts"] }),
    ],
    rekonFindings: [rekonFinding()],
    ruleMap: {
      "classic.unported": { status: "unported" },
      "classic.rule": { status: "ported", rekonRuleId: "rekon.rule" },
    },
  });

  assert.equal(rows[0].classification, "missed-gap");
  assert.equal(rows[1].classification, "missed-gap");
});

test("missed-intentional: filter suppression cites reason and policy id", () => {
  const { rows } = classifyParity({
    classicFindings: [classicFinding()],
    rekonFindings: [],
    filteredFindings: [
      {
        findingId: "rekon-1",
        finding: rekonFinding(),
        reason: "below-min-severity",
        evidence: "policy threshold",
        confidence: "high",
        filteredAt: "2026-06-01T00:00:00.000Z",
        source: "policy",
        policyId: "min-severity-medium",
      },
    ],
    ruleMap: { "classic.rule": { status: "ported", rekonRuleId: "rekon.rule" } },
  });

  assert.equal(rows[0].classification, "missed-intentional");
  assert.equal(rows[0].citation, "FindingFilterReport:below-min-severity:policy=min-severity-medium");
});

test("rejected: cited rule leaves the denominator entirely", () => {
  const { rows } = classifyParity({
    classicFindings: [
      classicFinding({ id: "classic-1", ruleId: "classic.rejected", fireCount: 7 }),
      classicFinding({ id: "classic-2", ruleId: "classic.unported", fireCount: 3 }),
    ],
    rekonFindings: [],
    ruleMap: {
      "classic.rejected": { status: "rejected", citation: "docs/strategy/detection-quality.md#naming-and-anti-patterns" },
      "classic.unported": { status: "unported" },
    },
  });

  assert.equal(rows[0].classification, "rejected");
  assert.equal(rows[0].citation, "docs/strategy/detection-quality.md#naming-and-anti-patterns");

  const recall = computeWeightedRecall(rows);

  assert.equal(recall.totalWeight, 3, "rejected weight must not count in the denominator");
  assert.equal(recall.rejectedWeight, 7);
  assert.equal(recall.creditedWeight, 0);
});

test("redesigned: pinned-but-unlanded rule classifies missed-redesigned with citation, uncredited", () => {
  const { rows } = classifyParity({
    classicFindings: [classicFinding({ ruleId: "classic.redesigned", fireCount: 5 })],
    rekonFindings: [],
    ruleMap: {
      "classic.redesigned": { status: "redesigned", citation: "docs/strategy/detection-quality.md#declared-architecture" },
    },
  });

  assert.equal(rows[0].classification, "missed-redesigned");
  assert.equal(rows[0].citation, "docs/strategy/detection-quality.md#declared-architecture");

  const recall = computeWeightedRecall(rows);

  assert.equal(recall.totalWeight, 5, "redesigned misses stay in the denominator");
  assert.equal(recall.creditedWeight, 0, "redesigned misses are not credited");
});

test("redesigned: with a rekonRuleId, a live match still classifies matched", () => {
  const { rows } = classifyParity({
    classicFindings: [classicFinding()],
    rekonFindings: [rekonFinding()],
    ruleMap: {
      "classic.rule": {
        status: "redesigned",
        citation: "docs/strategy/detection-quality.md#declared-architecture",
        rekonRuleId: "rekon.rule",
      },
    },
  });

  assert.equal(rows[0].classification, "matched");
});

test("coverage-scored redesign reports assessment visibility without inflating finding recall", () => {
  const { rows, coverage } = classifyParity({
    classicFindings: [classicFinding({ fireCount: 5 })],
    rekonAssessments: [rekonAssessment()],
    ruleMap: {
      "classic.rule": {
        status: "redesigned",
        citation: "docs/strategy/detection-quality.md#debt-and-semantic-judgment",
        rekonRuleId: "rekon.rule",
        scoring: "coverage",
      },
    },
  });

  assert.equal(rows[0].classification, "matched-assessment");
  assert.deepEqual(rows[0].matchedRekonAssessmentIds, ["assessment-1"]);
  assert.equal(computeWeightedRecall(rows).creditedWeight, 0);
  assert.equal(computeWeightedSignalCoverage(rows).creditedWeight, 5);
  assert.equal(coverage[0].findingCoveredFiles, 0);
  assert.equal(coverage[0].assessmentCoveredFiles, 1);
  assert.equal(coverage[0].coveredFiles, 1);
});

test("coverage-scored redesign accepts an adjudicated alternate assessment rule", () => {
  const { rows } = classifyParity({
    classicFindings: [classicFinding()],
    rekonAssessments: [rekonAssessment({ ruleId: "typescript.placeholderImplementation" })],
    ruleMap: {
      "classic.rule": {
        status: "redesigned",
        citation: "docs/strategy/detection-quality.md#debt-and-semantic-judgment",
        rekonRuleId: "debt.markers",
        rekonRuleIds: ["debt.markers", "typescript.placeholderImplementation"],
        scoring: "coverage",
      },
    },
  });

  assert.equal(rows[0].classification, "matched-assessment");
  assert.deepEqual(rows[0].matchedRekonAssessmentIds, ["assessment-1"]);
});

test("a per-finding adjudicated equivalence matches a different assessment identity", () => {
  const repoId = "fixture-repo";
  const classic = classicFinding({ id: "classic-complexity" });
  const assessment = rekonAssessment({
    id: "assessment:typescript.functionComplexity:src/a.ts:work",
    ruleId: "typescript.functionComplexity",
  });
  const reviewId = gapReviewId(repoId, classic.id);
  const equivalences = validateParityEquivalences({
    schemaVersion: "1.0.0",
    records: [{
      repoId,
      classicId: classic.id,
      recordType: "assessment",
      recordId: assessment.id,
      judgmentRef: `judgments.json#${reviewId}`,
    }],
  }, (path) => path === "judgments.json"
    ? JSON.stringify({
        schemaVersion: "1.0.0",
        records: [{
          reviewId,
          verdict: "covered-different-identity",
          action: "matching-gap",
        }],
      })
    : null);

  const { rows } = classifyParity({
    repoId,
    classicFindings: [classic],
    rekonAssessments: [assessment],
    ruleMap: {
      "classic.rule": {
        status: "redesigned",
        citation: "docs/strategy/detection-quality.md#debt-and-semantic-judgment",
        rekonRuleId: "debt.semantic",
        scoring: "coverage",
      },
    },
    equivalences,
  });

  assert.equal(rows[0].classification, "matched-assessment");
  assert.deepEqual(rows[0].matchedRekonAssessmentIds, [assessment.id]);
  assert.equal(rows[0].equivalenceRef, `judgments.json#${reviewId}`);
});

test("equivalences reject judgments that did not identify a matching gap", () => {
  const reviewId = gapReviewId("fixture-repo", "classic-1");
  assert.throws(
    () => validateParityEquivalences({
      schemaVersion: "1.0.0",
      records: [{
        repoId: "fixture-repo",
        classicId: "classic-1",
        recordType: "assessment",
        recordId: "assessment-1",
        judgmentRef: `judgments.json#${reviewId}`,
      }],
    }, () => JSON.stringify({
      schemaVersion: "1.0.0",
      records: [{ reviewId, verdict: "classic-noise", action: "no-change" }],
    })),
    /requires a covered-different-identity judgment/,
  );
});

test("ported finding contracts are not satisfied by assessments", () => {
  const { rows } = classifyParity({
    classicFindings: [classicFinding()],
    rekonAssessments: [rekonAssessment()],
    ruleMap: { "classic.rule": { status: "ported", rekonRuleId: "rekon.rule" } },
  });

  assert.equal(rows[0].classification, "missed-gap");
});

test("deferred: classifies missed-deferred with citation and stays out of the gap queue", () => {
  const { rows } = classifyParity({
    classicFindings: [classicFinding({ ruleId: "classic.deferred" })],
    rekonFindings: [],
    ruleMap: {
      "classic.deferred": { status: "deferred", citation: "docs/strategy/detection-quality.md#reachability-and-overlap" },
    },
  });

  assert.equal(rows[0].classification, "missed-deferred");
  assert.equal(rows[0].citation, "docs/strategy/detection-quality.md#reachability-and-overlap");

  const report = buildBenchReport({
    generatedAt: "2026-06-10T00:00:00.000Z",
    corpusRoot: "/tmp/corpus",
    repos: [{ id: "fixture", refresh: { status: "skipped" }, rows, rekonFindingCount: 0, newFindings: [] }],
  });

  assert.equal(report.gapQueue.length, 0, "deferred rules must not appear in the gap queue");
  assert.equal(report.deferred.length, 1);
  assert.equal(report.deferred[0].ruleId, "classic.deferred");
});

test("redesigned and deferred rows without a citation are rejected", () => {
  assert.throws(
    () => validateRuleMap({ "classic.x": { status: "redesigned" } }),
    /must carry a citation/,
  );
  assert.throws(
    () => validateRuleMap({ "classic.x": { status: "deferred", citation: "" } }),
    /must carry a citation/,
  );
});

test("checked-in rule-map citations resolve to current documentation", () => {
  const ruleMap = JSON.parse(readFileSync(join(repoRoot, "tests/bench/rule-map.json"), "utf8"));
  for (const [ruleId, row] of Object.entries(ruleMap)) {
    if (!row.citation) continue;
    const [path, fragment] = row.citation.split("#", 2);
    const absolutePath = join(repoRoot, path);
    assert.equal(existsSync(absolutePath), true, `${ruleId} cites missing ${path}`);
    if (!fragment) continue;
    const anchors = readFileSync(absolutePath, "utf8")
      .split("\n")
      .filter((line) => /^#{1,6}\s+/u.test(line))
      .map((line) => line.replace(/^#{1,6}\s+/u, "").trim().toLowerCase().replace(/[^a-z0-9\s-]/gu, "").replace(/\s+/gu, "-"));
    assert.equal(anchors.includes(fragment), true, `${ruleId} cites missing #${fragment} in ${path}`);
  }
});

test("file-less filter suppression does not credit a file-bearing classic finding", () => {
  const { rows } = classifyParity({
    classicFindings: [classicFinding()],
    rekonFindings: [],
    filteredFindings: [
      {
        findingId: "rekon-x",
        finding: rekonFinding({ files: [], subjects: [] }),
        reason: "below-min-severity",
        evidence: "",
        confidence: "low",
        filteredAt: "2026-06-01T00:00:00.000Z",
        source: "system",
      },
    ],
    ruleMap: { "classic.rule": { status: "ported", rekonRuleId: "rekon.rule" } },
  });

  assert.equal(rows[0].classification, "missed-gap");
});

test("new: rekon findings classic never produced", () => {
  const { rows, newFindings } = classifyParity({
    classicFindings: [classicFinding()],
    rekonFindings: [rekonFinding(), rekonFinding({ id: "rekon-2", ruleId: "other.rule", files: ["src/b.ts"] })],
    ruleMap: { "classic.rule": { status: "ported", rekonRuleId: "rekon.rule" } },
  });

  assert.equal(rows[0].classification, "matched");
  assert.equal(newFindings.length, 1);
  assert.equal(newFindings[0].id, "rekon-2");
});

test("intentional without a citation is rejected", () => {
  assert.throws(
    () => validateRuleMap({ "classic.rejected": { status: "rejected" } }),
    /must carry a citation/,
  );
  assert.throws(
    () => validateRuleMap({ "classic.rejected": { status: "rejected", citation: "" } }),
    /must carry a citation/,
  );
});

test("ported row without rekonRuleId and unknown status are rejected", () => {
  assert.throws(() => validateRuleMap({ "classic.x": { status: "ported" } }), /rekonRuleId/);
  assert.throws(() => validateRuleMap({ "classic.x": { status: "maybe" } }), /unknown status/);
});

test("unmapped classic rule fails the run loudly", () => {
  assert.throws(
    () =>
      classifyParity({
        classicFindings: [classicFinding({ ruleId: "classic.unmapped" })],
        rekonFindings: [],
        ruleMap: { "classic.rule": { status: "unported" } },
      }),
    /unmapped classic rule id\(s\): classic\.unmapped/,
  );
});

test("weighted recall math on a known fixture", () => {
  const rows = [
    { classic: classicFinding({ fireCount: 3 }), classification: "matched" },
    { classic: classicFinding({ fireCount: 1 }), classification: "missed-intentional" },
    { classic: classicFinding({ fireCount: 6 }), classification: "missed-gap" },
  ];
  const recall = computeWeightedRecall(rows);

  assert.equal(recall.totalWeight, 10);
  assert.equal(recall.creditedWeight, 4);
  assert.equal(recall.recall, 0.4);
});

test("classic-v1 normalizer maps type/files/system and defaults fireCount", () => {
  const findings = loadClassicFindings({
    classicOutputDir: join(fixtureCorpus, "classic/parity-fixture"),
    classicFormat: "classic-v1",
  });

  assert.equal(findings.length, 3);
  assert.equal(findings[0].ruleId, "fixture.dist_import");
  assert.deepEqual(findings[0].files, ["src/uses-dist.ts"]);
  assert.deepEqual(findings[0].subjects, ["core"]);
  assert.equal(findings[0].fireCount, 1);
  assert.equal(normalizePath(".\\src\\a.ts"), "src/a.ts");
  assert.throws(() => normalizeClassicIssuesV1({ nope: true }), /classic-v1/);
  assert.throws(
    () => loadClassicFindings({ classicOutputDir: ".", classicFormat: "classic-v2" }),
    /Unsupported classicFormat/,
  );
});

test("missing REKON_PARITY_CORPUS skips the real-corpus run cleanly", () => {
  const env = { ...process.env };
  delete env.REKON_PARITY_CORPUS;

  const result = spawnSync(process.execPath, [benchPath], { encoding: "utf8", env });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /skipping the real-corpus run/);
});

test("quality-only corpus entries contribute emissions without requiring or changing a parity baseline", () => {
  const tempRoot = mkdtempSync(join(tmpdir(), "rekon-quality-corpus-"));
  tempRoots.push(tempRoot);
  const corpusCopy = join(tempRoot, "corpus");
  cpSync(fixtureCorpus, corpusCopy, { recursive: true });
  writeFileSync(join(corpusCopy, "corpus.json"), `${JSON.stringify({
    repos: [{
      id: "public-quality-fixture",
      root: "./repos/parity-fixture",
      benchmarkMode: "quality-only",
      source: {
        url: "https://github.com/example/public-quality-fixture",
        commit: "0123456789abcdef0123456789abcdef01234567",
      },
    }],
  }, null, 2)}\n`);
  const outputDir = join(tempRoot, "output");
  const result = spawnSync(process.execPath, [
    benchPath,
    "--corpus", corpusCopy,
    "--rule-map", join(corpusCopy, "rule-map.fixture.json"),
    "--output", outputDir,
  ], { encoding: "utf8", env: { ...process.env, REKON_PARITY_CORPUS: "" } });

  assert.equal(result.status, 0, `quality-only bench failed:\n${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /0 parity and 1 quality-only repo/);
  const report = JSON.parse(readFileSync(join(outputDir, "report.json"), "utf8"));
  const sanitized = JSON.parse(readFileSync(join(outputDir, "report.sanitized.json"), "utf8"));
  assert.equal(report.aggregate.totalWeight, 0);
  assert.equal(report.aggregate.newFindings, 0);
  assert.equal(report.aggregate.qualityOnlyRepositories, 1);
  assert.equal(report.repos[0].benchmarkMode, "quality-only");
  assert.equal(report.repos[0].classicFindings, null);
  assert.equal(report.repos[0].recall, null);
  assert.equal(report.repos[0].newFindings, null);
  assert.equal(report.quality.records > 0, true);
  assert.equal(sanitized.parityRepositoryCount, 0);
  assert.equal(sanitized.qualityOnlyRepositoryCount, 1);
});

test("corpus evidence inputs map supported native reports to existing CLI ingestion commands", () => {
  const inputs = validateCorpusEvidenceInputs([
    { kind: "junit", path: "./reports/junit.xml" },
    { kind: "npm-audit", path: "reports/npm-audit.json", packageLock: "package-lock.json" },
    {
      kind: "istanbul-coverage",
      path: "coverage/coverage-final.json",
      testPath: "tests/index.test.ts",
      verificationRun: "VerificationRun:verification-run-1",
    },
  ]);

  assert.deepEqual(inputs[0], { kind: "junit", path: "reports/junit.xml" });
  assert.deepEqual(evidenceInputCliArgs(inputs[0], "/repo"), [
    "checks", "ingest", "--junit", "reports/junit.xml", "--root", "/repo", "--json",
  ]);
  assert.deepEqual(evidenceInputCliArgs(inputs[1], "/repo"), [
    "security", "ingest", "--npm-audit", "reports/npm-audit.json",
    "--package-lock", "package-lock.json", "--root", "/repo", "--json",
  ]);
  assert.deepEqual(evidenceInputCliArgs(inputs[2], "/repo"), [
    "runtime", "graph", "observe", "--istanbul-coverage", "coverage/coverage-final.json",
    "--test-path", "tests/index.test.ts", "--verification-run", "VerificationRun:verification-run-1",
    "--root", "/repo", "--json",
  ]);
  assert.equal(evidenceInputArtifactType("junit"), "TestReport");
  assert.equal(evidenceInputArtifactType("sarif"), "SecurityScanReport");
  assert.equal(evidenceInputArtifactType("osv"), "DependencyAuditReport");
  assert.equal(evidenceInputArtifactType("lcov-coverage"), "RuntimeGraphObservationReport");

  const captured = validateCorpusEvidenceInputs([
    { kind: "junit", path: "reports/junit.xml", verificationRun: "$capture" },
  ])[0];
  assert.deepEqual(evidenceInputCliArgs(captured, "/repo", {
    captureVerificationRun: "VerificationRun:verification-run-capture",
  }), [
    "checks", "ingest", "--junit", "reports/junit.xml",
    "--verification-run", "VerificationRun:verification-run-capture",
    "--root", "/repo", "--json",
  ]);
});

test("corpus evidence inputs reject ambiguous, unsafe, and unverified report declarations", () => {
  assert.throws(
    () => validateCorpusEvidenceInputs([{ kind: "junit", path: "../outside.xml" }]),
    /must stay inside the corpus repository/,
  );
  assert.throws(
    () => validateCorpusEvidenceInputs([{ kind: "sarif", path: "/tmp/report.sarif" }]),
    /must stay inside the corpus repository/,
  );
  assert.throws(
    () => validateCorpusEvidenceInputs([{ kind: "junit", path: "reports/junit.xml", packageLock: "package-lock.json" }]),
    /unknown field\(s\): packageLock/,
  );
  assert.throws(
    () => validateCorpusEvidenceInputs([{
      kind: "lcov-coverage",
      path: "coverage/lcov.info",
      testPath: "tests/index.test.ts",
    }]),
    /explicit VerificationRun:<id> ref/,
  );
  assert.throws(
    () => validateCorpusEvidenceInputs([
      { kind: "osv", path: "reports/osv.json" },
      { kind: "osv", path: "reports/osv.json" },
    ]),
    /duplicates an earlier evidence input/,
  );
  assert.throws(
    () => evidenceInputCliArgs(
      validateCorpusEvidenceInputs([{ kind: "junit", path: "reports/junit.xml", verificationRun: "$capture" }])[0],
      "/repo",
    ),
    /requires --capture-evidence/,
  );
});

test("corpus evidence capture validates plans and protects source snapshots", () => {
  const capture = validateCorpusEvidenceCapture({
    commands: ["node --test tests/native-check.test.mjs"],
    allowedWrites: ["reports/junit.xml"],
    repetitions: 2,
    commandTimeoutMs: 30_000,
  });
  const plan = createCorpusEvidenceVerificationPlan({
    repoId: "fixture",
    capture,
    generatedAt: "2026-07-14T00:00:00.000Z",
  });

  assert.deepEqual(plan.commands, ["node --test tests/native-check.test.mjs"]);
  assert.equal(capture.repetitions, 2);
  assert.equal(plan.header.artifactType, "VerificationPlan");
  assert.equal(plan.source, "detection-quality-calibration");
  assert.throws(
    () => validateCorpusEvidenceCapture({ commands: [] }),
    /commands must be a non-empty array/,
  );
  assert.throws(
    () => validateCorpusEvidenceCapture({ commands: ["node --test"], allowedWrites: ["../src"] }),
    /must stay inside the corpus repository/,
  );
  assert.throws(
    () => validateCorpusEvidenceCapture({ commands: ["node --test"], repetitions: 0 }),
    /integer from 1 through 3/,
  );
  assert.throws(
    () => validateCorpusEvidenceCapture({ commands: ["node --test"], repetitions: 4 }),
    /integer from 1 through 3/,
  );

  const before = snapshotProtectedCorpusTree(join(fixtureCorpus, "repos/parity-fixture"), {
    evidenceInputs: [{ path: "reports/junit.xml" }],
  });
  const after = snapshotProtectedCorpusTree(join(fixtureCorpus, "repos/parity-fixture"), {
    evidenceInputs: [{ path: "reports/junit.xml" }],
  });
  assert.equal(before.digest, after.digest);
  assert.deepEqual(diffProtectedCorpusTrees(before, after), []);

  assert.equal(isAcceptablePartialRefresh({
    validation: { valid: true, issues: [] },
    freshness: { status: "partial" },
    steps: [{ id: "observe", status: "passed" }, {
      id: "artifacts.freshness",
      status: "failed",
      summary: { status: "partial" },
    }],
  }), true);
  assert.equal(isAcceptablePartialRefresh({
    validation: { valid: false },
    freshness: { status: "partial" },
    steps: [{ id: "artifacts.freshness", status: "failed", summary: { status: "partial" } }],
  }), false);
  assert.equal(isAcceptablePartialRefresh({
    validation: { valid: true },
    freshness: { status: "partial" },
    steps: [{ id: "evaluate", status: "failed" }, {
      id: "artifacts.freshness",
      status: "failed",
      summary: { status: "partial" },
    }],
  }), false);
});

function hashTree(root, { exclude = [] } = {}) {
  const hashes = new Map();

  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const entryPath = join(dir, entry.name);
      const rel = relative(root, entryPath);

      if (exclude.some((name) => rel === name || rel.startsWith(`${name}/`))) {
        continue;
      }

      if (entry.isDirectory()) {
        walk(entryPath);
      } else if (entry.isFile()) {
        hashes.set(rel, createHash("sha256").update(readFileSync(entryPath)).digest("hex"));
      }
    }
  };

  walk(root);
  return hashes;
}

test("end-to-end: bench capture emits a report and preserves protected repository files", () => {
  const tempRoot = mkdtempSync(join(tmpdir(), "rekon-parity-bench-"));
  tempRoots.push(tempRoot);

  const corpusCopy = join(tempRoot, "corpus");
  cpSync(fixtureCorpus, corpusCopy, { recursive: true });

  const fixtureRepo = join(corpusCopy, "repos/parity-fixture");
  const before = hashTree(fixtureRepo, { exclude: [".rekon", "AGENTS.md", "reports/junit.xml"] });

  const outputDir = join(tempRoot, "output");
  const result = spawnSync(
    process.execPath,
    [
      benchPath,
      "--corpus",
      corpusCopy,
      "--rule-map",
      join(corpusCopy, "rule-map.fixture.json"),
      "--output",
      outputDir,
      "--capture-evidence",
    ],
    { encoding: "utf8", env: { ...process.env, REKON_PARITY_CORPUS: "" } },
  );

  assert.equal(result.status, 0, `bench failed:\n${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /weighted finding recall/);
  assert.match(result.stdout, /observable signal coverage/);

  const report = JSON.parse(readFileSync(join(outputDir, "report.json"), "utf8"));
  const sanitized = JSON.parse(readFileSync(join(outputDir, "report.sanitized.json"), "utf8"));
  const markdown = readFileSync(join(outputDir, "report.md"), "utf8");

  assert.equal(report.repos.length, 1);
  assert.equal(report.repos[0].id, "parity-fixture");
  assert.equal(report.repos[0].classicFindings, 3);
  assert.equal(report.repos[0].refresh.evidenceCapture.status, "captured");
  assert.equal(report.repos[0].refresh.evidenceCapture.verificationStatus, "failed");
  assert.equal(report.repos[0].refresh.evidenceCapture.artifact.type, "VerificationRun");
  assert.equal(report.repos[0].refresh.evidenceCapture.commands, 1);
  assert.equal(report.repos[0].refresh.evidenceCapture.executions, 1);
  assert.equal(report.repos[0].refresh.evidenceCapture.artifacts.length, 1);
  assert.match(report.repos[0].refresh.evidenceCapture.protectedSourceDigest, /^[a-f0-9]{64}$/u);
  assert.equal(report.repos[0].refresh.evidenceInputs.status, "ingested");
  assert.equal(report.repos[0].refresh.evidenceInputs.count, 3);
  assert.deepEqual(
    report.repos[0].refresh.evidenceInputs.artifacts.map(({ kind, type }) => ({ kind, type })),
    [
      { kind: "junit", type: "TestReport" },
      { kind: "sarif", type: "SecurityScanReport" },
      { kind: "osv", type: "DependencyAuditReport" },
    ],
  );
  assert.equal(
    report.repos[0].refresh.evidenceInputs.artifacts.every((artifact) => typeof artifact.id === "string" && artifact.id.length > 0),
    true,
  );
  assert.ok(["completed", "ok", "fresh", "unknown", "succeeded", "partial"].includes(report.repos[0].refresh.status) || report.repos[0].refresh.status !== "failed");

  const index = JSON.parse(readFileSync(join(fixtureRepo, ".rekon/registry/artifacts.index.json"), "utf8"));
  const assessmentEntry = index
    .filter((entry) => entry.type === "AssessmentReport")
    .sort((left, right) => right.writtenAt.localeCompare(left.writtenAt))[0];
  const findingEntry = index
    .filter((entry) => entry.type === "FindingReport")
    .sort((left, right) => right.writtenAt.localeCompare(left.writtenAt))[0];
  const assessmentReport = JSON.parse(readFileSync(join(fixtureRepo, assessmentEntry.path), "utf8"));
  const findingReport = JSON.parse(readFileSync(join(fixtureRepo, findingEntry.path), "utf8"));
  const testReportEntry = index
    .filter((entry) => entry.type === "TestReport")
    .sort((left, right) => right.writtenAt.localeCompare(left.writtenAt))[0];
  const testReport = JSON.parse(readFileSync(join(fixtureRepo, testReportEntry.path), "utf8"));
  const assessmentRules = new Set(assessmentReport.assessments.map((assessment) => assessment.ruleId));

  assert.equal(assessmentRules.has("repository.checkFailure"), true);
  assert.equal(assessmentRules.has("security.scannerResult"), true);
  assert.equal(assessmentRules.has("security.dependencyVulnerability"), true);
  assert.equal(testReport.header.inputRefs.some((ref) => ref.type === "VerificationRun"), true);
  assert.equal(
    findingReport.findings.some((finding) =>
      finding.ruleId === "security.scannerResult" || finding.ruleId === "security.dependencyVulnerability"),
    false,
    "scanner and advisory evidence must remain assessments rather than automatic findings",
  );

  const byId = new Map(report.repos[0].rows.map((row) => [row.classicId, row]));

  // The unported fixture rule is always a gap; the rejected fixture rule
  // leaves the denominator with its citation. The ported fixture rule lands
  // matched when the live built-in emitter fires on the fixture, otherwise it
  // is a gap — classification correctness for matched is covered by the pure
  // core tests above.
  assert.equal(byId.get("fixture-issue-2").classification, "missed-gap");
  assert.equal(byId.get("fixture-issue-3").classification, "rejected");
  assert.equal(byId.get("fixture-issue-3").citation, "docs/strategy/detection-quality.md#naming-and-anti-patterns");
  assert.ok(["matched", "missed-gap"].includes(byId.get("fixture-issue-1").classification));

  const sanitizedText = JSON.stringify(sanitized);
  assert.equal(sanitized.repositoryCount, 1);
  assert.equal("corpusRoot" in sanitized, false);
  assert.equal("repos" in sanitized, false);
  assert.equal(sanitizedText.includes("parity-fixture"), false);
  assert.equal(sanitizedText.includes("fixture-issue-1"), false);
  assert.equal(sanitizedText.includes("src/uses-dist.ts"), false);
  assert.ok(sanitized.quality.findingQuality);
  assert.ok(sanitized.quality.assessmentUtility);

  assert.match(markdown, /# Classic Parity Bench Report/);
  assert.match(markdown, /Gap queue \(undecided, by fireCount\)/);
  assert.match(markdown, /Rejected \(out of denominator, with citations\)/);
  assert.match(markdown, /fixture\.unported_rule/);
  assert.match(markdown, /docs\/strategy\/detection-quality\.md#naming-and-anti-patterns/);

  // The bench may replace declared native reports and refresh Rekon's bounded
  // AGENTS.md block, but all other protected repository files stay identical.
  const after = hashTree(fixtureRepo, { exclude: [".rekon", "AGENTS.md", "reports/junit.xml"] });

  assert.deepEqual([...after.entries()].sort(), [...before.entries()].sort());
  assert.match(
    readFileSync(join(fixtureRepo, "AGENTS.md"), "utf8"),
    /<!-- rekon:agent-instructions:start version="1\.9\.1" -->/u,
  );
  assert.ok(statSync(join(fixtureRepo, ".rekon")).isDirectory(), "refresh should have produced .rekon/ in the corpus copy");

  const artifactIndexPath = join(fixtureRepo, ".rekon/registry/artifacts.index.json");
  const artifactIndexBeforeSkip = readFileSync(artifactIndexPath, "utf8");
  const skipOutputDir = join(tempRoot, "skip-output");
  const skipped = spawnSync(
    process.execPath,
    [
      benchPath,
      "--corpus",
      corpusCopy,
      "--rule-map",
      join(corpusCopy, "rule-map.fixture.json"),
      "--output",
      skipOutputDir,
      "--skip-refresh",
    ],
    { encoding: "utf8", env: { ...process.env, REKON_PARITY_CORPUS: "" } },
  );

  assert.equal(skipped.status, 0, `skip-refresh bench failed:\n${skipped.stdout}\n${skipped.stderr}`);
  const skippedReport = JSON.parse(readFileSync(join(skipOutputDir, "report.json"), "utf8"));
  assert.equal(skippedReport.repos[0].refresh.status, "skipped");
  assert.equal(skippedReport.repos[0].refresh.evidenceCapture.status, "skipped");
  assert.equal(skippedReport.repos[0].refresh.evidenceInputs.status, "skipped");
  assert.equal(skippedReport.repos[0].refresh.evidenceInputs.count, 3);
  assert.equal(readFileSync(artifactIndexPath, "utf8"), artifactIndexBeforeSkip);
});
