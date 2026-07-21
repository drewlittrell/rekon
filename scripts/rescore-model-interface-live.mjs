#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  rescoreModelInterfaceReport,
  summarizeModelInterfaceRefinementCalibration,
} from "./lib/model-interface-live-eval.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const options = parseArgs(process.argv.slice(2));
const fixturePath = resolve(root, corpusFixturePath(options.corpus));
const [fixture, report] = await Promise.all([
  readJson(fixturePath),
  readJson(resolve(root, options.input)),
]);
const rescored = rescoreModelInterfaceReport(report, fixture.cases);
await writeFile(resolve(root, options.output), `${JSON.stringify(rescored, null, 2)}\n`);
if (options.calibrationOutput) {
  await writeFile(
    resolve(root, options.calibrationOutput),
    `${JSON.stringify(summarizeModelInterfaceRefinementCalibration(rescored), null, 2)}\n`,
  );
}
process.stdout.write(`${JSON.stringify({
  input: options.input,
  output: options.output,
  calibrationOutput: options.calibrationOutput,
  pairedRuns: rescored.summary.pairedRuns,
  decisionCounts: rescored.summary.decisionCounts,
  sourceRetention: rescored.sourceRetention,
}, null, 2)}\n`);

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function parseArgs(args) {
  const parsed = { corpus: "live" };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--calibration-output") parsed.calibrationOutput = required(args, ++index, arg);
    else if (arg === "--corpus") parsed.corpus = required(args, ++index, arg);
    else if (arg === "--input") parsed.input = required(args, ++index, arg);
    else if (arg === "--output") parsed.output = required(args, ++index, arg);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!parsed.input || !parsed.output) throw new Error("--input and --output are required.");
  if (!["live", "refinement", "refinement-positive"].includes(parsed.corpus)) {
    throw new Error("--corpus must be live, refinement, or refinement-positive.");
  }
  return parsed;
}

function corpusFixturePath(corpus) {
  return {
    live: "tests/evals/model-interface-live/cases.json",
    refinement: "tests/evals/model-interface-refinement/cases.json",
    "refinement-positive": "tests/evals/model-interface-refinement-positive/cases.json",
  }[corpus];
}

function required(args, index, flag) {
  const value = args[index];
  if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value.`);
  return value;
}
