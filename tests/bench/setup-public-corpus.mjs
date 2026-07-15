#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { selectCatalogEntries } from "./corpus-retention-core.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const catalogPath = join(repoRoot, "tests/bench/public-corpus.sources.json");

function parseArgs(argv) {
  const flags = { repos: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") flags.root = argv[(index += 1)];
    else if (arg === "--repo") flags.repos.push(argv[(index += 1)]);
    else throw new Error(`setup-public-corpus: unknown argument "${arg}".`);
  }
  const root = flags.root ?? process.env.REKON_PUBLIC_CORPUS_ROOT;
  if (!root) throw new Error("setup-public-corpus: pass --root <path> or set REKON_PUBLIC_CORPUS_ROOT.");
  return { root: resolve(root), repos: flags.repos };
}

function git(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }).trim();
}

const flags = parseArgs(process.argv.slice(2));
const root = flags.root;
const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
const selected = selectCatalogEntries(catalog.repositories, flags.repos, "setup-public-corpus");
mkdirSync(join(root, "repos"), { recursive: true });

for (const source of selected) {
  const checkout = join(root, "repos", source.directory);
  if (!existsSync(checkout)) {
    git(["clone", "--depth", "1", "--filter=blob:none", "--no-checkout", source.url, checkout], root);
    git(["fetch", "--depth", "1", "origin", source.commit], checkout);
    git(["checkout", "--detach", source.commit], checkout);
  }
  const actual = git(["rev-parse", "HEAD"], checkout);
  if (actual !== source.commit) {
    throw new Error(`setup-public-corpus: ${source.id} is at ${actual}; expected ${source.commit}.`);
  }
}

const manifest = {
  repos: selected.map((source) => ({
    id: source.id,
    root: `./repos/${source.directory}`,
    benchmarkMode: "quality-only",
    source: {
      url: source.url,
      commit: source.commit,
      license: source.license,
      role: source.role,
    },
  })),
};
const output = join(root, "corpus.json");
writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
process.stdout.write(`setup-public-corpus: verified ${manifest.repos.length} repositories and wrote ${relative(process.cwd(), output)}.\n`);
