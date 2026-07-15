#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { selectCatalogEntries } from "./corpus-retention-core.mjs";
import { validateDefectPairCatalog } from "./defect-pair-core.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const catalogPath = join(repoRoot, "tests/bench/public-defect-pairs.sources.json");

function parseArgs(argv) {
  const flags = { pairs: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") flags.root = argv[(index += 1)];
    else if (arg === "--pair") flags.pairs.push(argv[(index += 1)]);
    else throw new Error(`setup-defect-pair-corpus: unknown argument "${arg}".`);
  }
  const root = flags.root ?? process.env.REKON_DEFECT_PAIR_CORPUS_ROOT;
  if (!root) {
    throw new Error(
      "setup-defect-pair-corpus: pass --root <path> or set REKON_DEFECT_PAIR_CORPUS_ROOT.",
    );
  }
  return { root: resolve(root), pairs: flags.pairs };
}

function git(args, cwd) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  }).trim();
}

function ensureSource(root, repository) {
  const sourceRoot = join(root, "sources", repository.directory);
  if (!existsSync(sourceRoot)) {
    mkdirSync(dirname(sourceRoot), { recursive: true });
    git(["clone", "--filter=blob:none", "--no-checkout", repository.url, sourceRoot], root);
  }

  const actualRemote = git(["remote", "get-url", "origin"], sourceRoot);
  const expectedRemote = repository.url.replace(/\.git$/, "");
  if (actualRemote.replace(/\.git$/, "") !== expectedRemote) {
    throw new Error(
      `setup-defect-pair-corpus: ${repository.id} origin is ${actualRemote}; expected ${repository.url}.`,
    );
  }
  return sourceRoot;
}

function fetchPair(sourceRoot, pair) {
  git(["fetch", "--depth", "8", "origin", pair.fixedCommit], sourceRoot);
  try {
    git(["cat-file", "-e", `${pair.buggyCommit}^{commit}`], sourceRoot);
  } catch {
    git(["fetch", "--depth", "1", "origin", pair.buggyCommit], sourceRoot);
  }

  const fixed = git(["rev-parse", `${pair.fixedCommit}^{commit}`], sourceRoot);
  const buggy = git(["rev-parse", `${pair.buggyCommit}^{commit}`], sourceRoot);
  if (fixed !== pair.fixedCommit || buggy !== pair.buggyCommit) {
    throw new Error(`setup-defect-pair-corpus: ${pair.id} did not resolve to its pinned commits.`);
  }

  try {
    git(["merge-base", "--is-ancestor", pair.buggyCommit, pair.fixedCommit], sourceRoot);
  } catch {
    throw new Error(
      `setup-defect-pair-corpus: ${pair.id} buggy commit is not an ancestor of its fixed commit.`,
    );
  }
}

function ensureWorktree(sourceRoot, worktreeRoot, commit, label) {
  if (!existsSync(worktreeRoot)) {
    mkdirSync(dirname(worktreeRoot), { recursive: true });
    git(["worktree", "add", "--detach", worktreeRoot, commit], sourceRoot);
  }
  const actual = git(["rev-parse", "HEAD"], worktreeRoot);
  if (actual !== commit) {
    throw new Error(`setup-defect-pair-corpus: ${label} is at ${actual}; expected ${commit}.`);
  }
}

const flags = parseArgs(process.argv.slice(2));
const root = flags.root;
const catalog = validateDefectPairCatalog(JSON.parse(readFileSync(catalogPath, "utf8")));
const selectedPairs = selectCatalogEntries(catalog.pairs, flags.pairs, "setup-defect-pair-corpus");
const selectedRepositoryIds = new Set(selectedPairs.map((pair) => pair.repository));
const selectedRepositories = catalog.repositories.filter((repository) => selectedRepositoryIds.has(repository.id));
mkdirSync(root, { recursive: true });

const repositories = new Map(catalog.repositories.map((repository) => [repository.id, repository]));
const sourceRoots = new Map();
for (const repository of selectedRepositories) {
  sourceRoots.set(repository.id, ensureSource(root, repository));
}

const pairs = [];
for (const pair of selectedPairs) {
  const repository = repositories.get(pair.repository);
  const sourceRoot = sourceRoots.get(pair.repository);
  if (!repository || !sourceRoot) throw new Error(`setup-defect-pair-corpus: missing source for ${pair.id}.`);

  fetchPair(sourceRoot, pair);
  const beforeRoot = join(root, "pairs", pair.id, "before");
  const afterRoot = join(root, "pairs", pair.id, "after");
  ensureWorktree(sourceRoot, beforeRoot, pair.buggyCommit, `${pair.id} before`);
  ensureWorktree(sourceRoot, afterRoot, pair.fixedCommit, `${pair.id} after`);

  pairs.push({
    ...pair,
    beforeRoot: `./pairs/${pair.id}/before`,
    afterRoot: `./pairs/${pair.id}/after`,
  });
}

const manifest = {
  version: catalog.version,
  generatedFrom: "tests/bench/public-defect-pairs.sources.json",
  repositories: selectedRepositories,
  pairs,
};
const output = join(root, "defect-pairs.json");
writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
process.stdout.write(
  `setup-defect-pair-corpus: verified ${pairs.length} pairs across ${selectedRepositories.length} repositories and wrote ${relative(process.cwd(), output)}.\n`,
);
