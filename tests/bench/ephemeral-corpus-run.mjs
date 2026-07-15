#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { assertOutputOutsideTemporaryRoot } from "./corpus-retention-core.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function parseArgs(argv) {
  const flags = { repos: [], pairs: [], full: false, captureEvidence: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--kind") flags.kind = argv[(index += 1)];
    else if (arg === "--repo") flags.repos.push(argv[(index += 1)]);
    else if (arg === "--pair") flags.pairs.push(argv[(index += 1)]);
    else if (arg === "--output") flags.output = argv[(index += 1)];
    else if (arg === "--full") flags.full = true;
    else if (arg === "--capture-evidence") flags.captureEvidence = true;
    else throw new Error(`ephemeral-corpus-run: unknown argument "${arg}".`);
  }
  if (flags.kind !== "public" && flags.kind !== "defect-pairs") {
    throw new Error('ephemeral-corpus-run: --kind must be "public" or "defect-pairs".');
  }
  if (flags.kind === "public" && flags.pairs.length > 0) {
    throw new Error("ephemeral-corpus-run: --pair is only valid for defect-pairs.");
  }
  if (flags.kind === "defect-pairs" && (flags.repos.length > 0 || flags.captureEvidence)) {
    throw new Error("ephemeral-corpus-run: --repo and --capture-evidence are only valid for public corpora.");
  }
  return flags;
}

function run(script, args, label) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`ephemeral-corpus-run: ${label} failed with exit ${result.status}.`);
  }
}

const flags = parseArgs(process.argv.slice(2));
const temporaryRoot = mkdtempSync(join(tmpdir(), `rekon-${flags.kind}-`));
const defaultOutput = flags.kind === "public"
  ? join(repoRoot, "tests/bench/output/public-corpus")
  : join(repoRoot, "tests/bench/output/public-defect-pairs");
const output = assertOutputOutsideTemporaryRoot(flags.output ?? defaultOutput, temporaryRoot, "ephemeral-corpus-run");

try {
  if (flags.kind === "public") {
    const setupArgs = ["--root", temporaryRoot];
    const benchArgs = ["--corpus", temporaryRoot, "--output", output];
    for (const repo of flags.repos) {
      setupArgs.push("--repo", repo);
      benchArgs.push("--repo", repo);
    }
    if (flags.captureEvidence) benchArgs.push("--capture-evidence");
    run(join(repoRoot, "tests/bench/setup-public-corpus.mjs"), setupArgs, "public corpus setup");
    run(join(repoRoot, "tests/bench/classic-parity-bench.mjs"), benchArgs, "public corpus benchmark");
  } else {
    const setupArgs = ["--root", temporaryRoot];
    const benchArgs = ["--corpus", temporaryRoot, "--output", output];
    for (const pair of flags.pairs) {
      setupArgs.push("--pair", pair);
      benchArgs.push("--pair", pair);
    }
    if (flags.full) benchArgs.push("--full");
    run(join(repoRoot, "tests/bench/setup-defect-pair-corpus.mjs"), setupArgs, "defect-pair corpus setup");
    run(join(repoRoot, "tests/bench/defect-pair-bench.mjs"), benchArgs, "defect-pair benchmark");
  }
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
  process.stdout.write(`ephemeral-corpus-run: removed temporary corpus ${temporaryRoot}.\n`);
}
