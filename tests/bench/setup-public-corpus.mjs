#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const catalogPath = join(repoRoot, "tests/bench/public-corpus.sources.json");

function parseRoot(argv) {
  const index = argv.indexOf("--root");
  const value = index >= 0 ? argv[index + 1] : process.env.REKON_PUBLIC_CORPUS_ROOT;
  if (!value) throw new Error("setup-public-corpus: pass --root <path> or set REKON_PUBLIC_CORPUS_ROOT.");
  return resolve(value);
}

function git(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }).trim();
}

const root = parseRoot(process.argv.slice(2));
const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
mkdirSync(join(root, "repos"), { recursive: true });

for (const source of catalog.repositories) {
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
  repos: catalog.repositories.map((source) => ({
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
