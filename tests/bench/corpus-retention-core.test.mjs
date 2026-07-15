import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  aggregateCalibrationHistory,
  assertOutputOutsideTemporaryRoot,
  assertPublicCalibrationRecords,
  scopeDefectAdjudicationsToPinnedPairs,
  scopeQualityAdjudicationsToPinnedSources,
  selectCatalogEntries,
} from "./corpus-retention-core.mjs";
import { validateDefectPairAdjudications, validateDefectPairCatalog } from "./defect-pair-core.mjs";
import { validateQualityAdjudications } from "./quality-core.mjs";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

function readJson(path) {
  return JSON.parse(readFileSync(join(repoRoot, path), "utf8"));
}

test("catalog selection limits ephemeral setup and rejects unknown selectors", () => {
  const entries = [{ id: "one" }, { id: "two" }];
  assert.deepEqual(selectCatalogEntries(entries, ["two"], "selection"), [{ id: "two" }]);
  assert.equal(selectCatalogEntries(entries, [], "selection"), entries);
  assert.throws(() => selectCatalogEntries(entries, ["missing"], "selection"), /unknown selector/);
});

test("public calibration rejects non-catalog repositories and local paths", () => {
  const publicIds = new Set(["public-one"]);
  assert.equal(assertPublicCalibrationRecords([{ repoId: "public-one" }], publicIds, "records").length, 1);
  assert.throws(
    () => assertPublicCalibrationRecords([{ repoId: "private-one" }], publicIds, "records"),
    /non-public repository/,
  );
  assert.throws(
    () => assertPublicCalibrationRecords([{ repoId: "public-one", path: "/Users/example/source.ts" }], publicIds, "records"),
    /local absolute path/,
  );
});

test("aggregate calibration history retains judgments without repository evidence", () => {
  const history = aggregateCalibrationHistory([
    {
      repoId: "private-one",
      recordType: "assessment",
      recordId: "assessment-1",
      ruleId: "rule.one",
      judgment: "useful",
      severity: "accurate",
      identityStable: true,
    },
    {
      repoId: "private-two",
      recordType: "assessment",
      recordId: "assessment-2",
      ruleId: "rule.one",
      judgment: "not_useful",
      severity: "overstated",
      identityStable: true,
    },
  ]);

  assert.equal(history.sourceRecords, 2);
  assert.deepEqual(history.rules["rule.one"].byJudgment, { useful: 1, not_useful: 1 });
  const serialized = JSON.stringify(history);
  assert.equal(serialized.includes("private-one"), false);
  assert.equal(serialized.includes("assessment-1"), false);
});

test("default public judgments require matching pinned source coordinates", () => {
  const records = [{ repoId: "public-one" }, { repoId: "public-two" }];
  const catalog = [
    { id: "public-one", url: "https://github.com/example/one.git", commit: "a".repeat(40) },
    { id: "public-two", url: "https://github.com/example/two.git", commit: "b".repeat(40) },
  ];
  const manifest = [
    { id: "public-one", source: { url: "https://github.com/example/one", commit: "a".repeat(40) } },
    { id: "public-two", source: { url: "https://github.com/other/two", commit: "b".repeat(40) } },
  ];

  assert.deepEqual(scopeQualityAdjudicationsToPinnedSources(records, manifest, catalog), [records[0]]);
});

test("default defect judgments require matching pinned revisions", () => {
  const records = [{ pairId: "pair-one" }, { pairId: "pair-two" }];
  const catalog = [
    { id: "pair-one", repository: "one", buggyCommit: "a", fixedCommit: "b" },
    { id: "pair-two", repository: "two", buggyCommit: "c", fixedCommit: "d" },
  ];
  const manifest = [
    { id: "pair-one", repository: "one", buggyCommit: "a", fixedCommit: "b" },
    { id: "pair-two", repository: "two", buggyCommit: "c", fixedCommit: "different" },
  ];

  assert.deepEqual(scopeDefectAdjudicationsToPinnedPairs(records, manifest, catalog), [records[0]]);
});

test("ephemeral output must survive temporary corpus cleanup", () => {
  assert.equal(
    assertOutputOutsideTemporaryRoot("/tmp/report", "/tmp/corpus", "output"),
    "/tmp/report",
  );
  assert.throws(
    () => assertOutputOutsideTemporaryRoot("/tmp/corpus/report", "/tmp/corpus", "output"),
    /outside the temporary corpus root/,
  );
});

test("ephemeral runner removes its corpus when setup fails", () => {
  const result = spawnSync(process.execPath, [
    join(repoRoot, "tests/bench/ephemeral-corpus-run.mjs"),
    "--kind", "public",
    "--repo", "missing-repository",
  ], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.notEqual(result.status, 0);
  const match = result.stdout.match(/removed temporary corpus (.+)\./);
  assert.ok(match, result.stdout || result.stderr);
  assert.equal(existsSync(match[1]), false);
});

test("checked-in public calibration records are valid and complete", () => {
  const publicCatalog = readJson("tests/bench/public-corpus.sources.json");
  const publicIds = new Set(publicCatalog.repositories.map((entry) => entry.id));
  const quality = readJson("tests/bench/calibration/public-quality-adjudications.json");
  const qualityRecords = validateQualityAdjudications(quality);
  assert.equal(qualityRecords.length, 56);
  assertPublicCalibrationRecords(qualityRecords, publicIds, "checked-in quality adjudications");

  const defectCatalog = validateDefectPairCatalog(readJson("tests/bench/public-defect-pairs.sources.json"));
  const defects = readJson("tests/bench/calibration/public-defect-pair-adjudications.json");
  assert.equal(validateDefectPairAdjudications(defects, defectCatalog), defects);
  assert.equal(defects.records.length, defectCatalog.pairs.length);
});
