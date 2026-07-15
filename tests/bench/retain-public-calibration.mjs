#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  aggregateCalibrationHistory,
  assertPublicCalibrationRecords,
} from "./corpus-retention-core.mjs";
import { validateDefectPairAdjudications, validateDefectPairCatalog } from "./defect-pair-core.mjs";
import { validateQualityAdjudications } from "./quality-core.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const publicCatalogPath = join(repoRoot, "tests/bench/public-corpus.sources.json");
const defectCatalogPath = join(repoRoot, "tests/bench/public-defect-pairs.sources.json");

function parseArgs(argv) {
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--quality") flags.quality = argv[(index += 1)];
    else if (arg === "--defects") flags.defects = argv[(index += 1)];
    else if (arg === "--aggregate") flags.aggregate = argv[(index += 1)];
    else if (arg === "--output") flags.output = argv[(index += 1)];
    else throw new Error(`retain-public-calibration: unknown argument "${arg}".`);
  }
  if (!flags.quality || !flags.defects) {
    throw new Error("retain-public-calibration: --quality and --defects are required.");
  }
  return flags;
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(resolve(path), "utf8"));
  } catch (error) {
    throw new Error(`${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function sortQualityRecords(records) {
  return [...records].sort((left, right) => [
    left.repoId,
    left.recordType,
    left.ruleId,
    left.recordId,
  ].join(":").localeCompare([
    right.repoId,
    right.recordType,
    right.ruleId,
    right.recordId,
  ].join(":")));
}

const flags = parseArgs(process.argv.slice(2));
const outputRoot = resolve(flags.output ?? join(repoRoot, "tests/bench/calibration"));
const publicCatalog = readJson(publicCatalogPath, "public corpus catalog");
const publicRepoIds = new Set(publicCatalog.repositories.map((entry) => entry.id));
const qualityInput = readJson(flags.quality, "quality adjudications");
const qualityRecords = sortQualityRecords(validateQualityAdjudications(qualityInput));
assertPublicCalibrationRecords(qualityRecords, publicRepoIds, "quality adjudications");

const defectCatalog = validateDefectPairCatalog(readJson(defectCatalogPath, "defect-pair catalog"));
const defectInput = readJson(flags.defects, "defect-pair adjudications");
validateDefectPairAdjudications(defectInput, defectCatalog);
const pairOrder = new Map(defectCatalog.pairs.map((pair, index) => [pair.id, index]));
const defectRecords = [...defectInput.records].sort(
  (left, right) => pairOrder.get(left.pairId) - pairOrder.get(right.pairId),
);

const aggregateRecords = flags.aggregate
  ? validateQualityAdjudications(readJson(flags.aggregate, "aggregate adjudications"))
  : qualityRecords;

mkdirSync(outputRoot, { recursive: true });
writeFileSync(join(outputRoot, "public-quality-adjudications.json"), `${JSON.stringify({
  schemaVersion: "1.0.0",
  judge: qualityInput.judge ?? "source-grounded-agent-review",
  records: qualityRecords,
}, null, 2)}\n`);
writeFileSync(join(outputRoot, "public-defect-pair-adjudications.json"), `${JSON.stringify({
  schemaVersion: "1.0.0",
  records: defectRecords,
}, null, 2)}\n`);
writeFileSync(join(outputRoot, "aggregate-quality-history.json"), `${JSON.stringify(
  aggregateCalibrationHistory(aggregateRecords),
  null,
  2,
)}\n`);

process.stdout.write(
  `retain-public-calibration: retained ${qualityRecords.length} public quality judgments, `
    + `${defectRecords.length} defect-pair judgments, and ${aggregateRecords.length} aggregate history records.\n`,
);
