// Behavioral tests for the classic-parity-bench (Phase 0). All tests run
// against small synthetic fixtures committed under tests/fixtures/parity/ —
// never against the private real corpus (which is gated behind
// REKON_PARITY_CORPUS and lives outside the repository).

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { after, test } from "node:test";

import { loadClassicFindings, normalizeClassicIssuesV1, normalizePath } from "./normalize-classic.mjs";
import { buildBenchReport, classifyParity, computeWeightedRecall, validateRuleMap } from "./parity-core.mjs";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const benchPath = join(repoRoot, "tests/bench/classic-parity-bench.mjs");
const fixtureCorpus = join(repoRoot, "tests/fixtures/parity");

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

test("end-to-end: bench run on the fixture corpus emits a report and mutates nothing outside .rekon/", () => {
  const tempRoot = mkdtempSync(join(tmpdir(), "rekon-parity-bench-"));
  tempRoots.push(tempRoot);

  const corpusCopy = join(tempRoot, "corpus");
  cpSync(fixtureCorpus, corpusCopy, { recursive: true });

  const fixtureRepo = join(corpusCopy, "repos/parity-fixture");
  const before = hashTree(fixtureRepo, { exclude: [".rekon"] });

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
    ],
    { encoding: "utf8", env: { ...process.env, REKON_PARITY_CORPUS: "" } },
  );

  assert.equal(result.status, 0, `bench failed:\n${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /weighted recall/);

  const report = JSON.parse(readFileSync(join(outputDir, "report.json"), "utf8"));
  const sanitized = JSON.parse(readFileSync(join(outputDir, "report.sanitized.json"), "utf8"));
  const markdown = readFileSync(join(outputDir, "report.md"), "utf8");

  assert.equal(report.repos.length, 1);
  assert.equal(report.repos[0].id, "parity-fixture");
  assert.equal(report.repos[0].classicFindings, 3);
  assert.ok(["completed", "ok", "fresh", "unknown", "succeeded", "partial"].includes(report.repos[0].refresh.status) || report.repos[0].refresh.status !== "failed");

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

  // The bench must leave the fixture repo byte-identical outside `.rekon/`.
  const after = hashTree(fixtureRepo, { exclude: [".rekon"] });

  assert.deepEqual([...after.entries()].sort(), [...before.entries()].sort());
  assert.ok(statSync(join(fixtureRepo, ".rekon")).isDirectory(), "refresh should have produced .rekon/ in the corpus copy");
});
