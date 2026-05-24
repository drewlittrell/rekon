// Docs contract tests for the PathFreshnessReport
// artifact + `rekon paths freshness` slice.

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const artifactDocPath = join(repoRoot, "docs", "artifacts", "path-freshness-report.md");
const conceptDocPath = join(repoRoot, "docs", "concepts", "path-freshness.md");
const watcherMemoPath = join(
  repoRoot,
  "docs",
  "strategy",
  "watcher-path-freshness-policy-decision.md",
);
const reviewPacketPath = join(
  repoRoot,
  ".rekon-dev",
  "review-packets",
  "path-freshness-report.md",
);
const changelogPath = join(repoRoot, "CHANGELOG.md");

async function flatten(path) {
  return (await readFile(path, "utf8")).replace(/\s+/g, " ");
}

// ---------- 1: artifact doc exists ----------

test("PathFreshnessReport artifact doc exists", () => {
  assert.ok(existsSync(artifactDocPath), `expected ${artifactDocPath}`);
});

// ---------- 2: concept / strategy docs mention PathFreshnessReport ----------

test("concept + watcher memo mention PathFreshnessReport", async () => {
  assert.ok(existsSync(conceptDocPath), `expected ${conceptDocPath}`);
  const concept = await readFile(conceptDocPath, "utf8");
  const memo = await readFile(watcherMemoPath, "utf8");
  assert.ok(/PathFreshnessReport/.test(concept), "concept doc must mention PathFreshnessReport");
  assert.ok(/PathFreshnessReport/.test(memo), "watcher memo must mention PathFreshnessReport");
});

// ---------- 3: docs say no daemon ----------

test("docs say no daemon", async () => {
  const flat = await flatten(artifactDocPath);
  assert.ok(/no daemon/i.test(flat) || /no watcher daemon/i.test(flat),
    "artifact doc must pin: no daemon");
});

// ---------- 4: docs say no background refresh ----------

test("docs say no background refresh", async () => {
  const flat = await flatten(artifactDocPath);
  assert.ok(/no background refresh/i.test(flat),
    "artifact doc must pin: no background refresh");
});

// ---------- 5: docs say lineage ≠ working-tree freshness ----------

test("docs distinguish artifact lineage freshness from working-tree freshness", async () => {
  const flat = await flatten(artifactDocPath);
  assert.ok(
    /artifact lineage freshness is not working-tree freshness/i.test(flat)
      || /working-tree freshness is distinct from artifact lineage freshness/i.test(flat)
      || /lineage.*not.*working-tree/i.test(flat),
    "artifact doc must distinguish lineage vs working-tree freshness",
  );
});

// ---------- 6: docs say mtimes alone are not sufficient ----------

test("docs say file mtimes alone are not sufficient", async () => {
  const flat = await flatten(artifactDocPath);
  assert.ok(
    /mtime.*advisory/i.test(flat) || /mtimes? alone .*not/i.test(flat),
    "artifact doc must mark mtimes as advisory-only / not canonical",
  );
});

// ---------- 7: docs mention rekon paths freshness ----------

test("docs mention `rekon paths freshness`", async () => {
  const flat = await flatten(artifactDocPath);
  assert.ok(/rekon paths freshness/i.test(flat),
    "artifact doc must mention the rekon paths freshness CLI");
});

// ---------- 8: CHANGELOG mentions PathFreshnessReport ----------

test("CHANGELOG mentions PathFreshnessReport", async () => {
  const content = await readFile(changelogPath, "utf8");
  assert.ok(/PathFreshnessReport/.test(content),
    "CHANGELOG must include a PathFreshnessReport entry");
});

// ---------- 9: review packet exists and contains PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  assert.ok(existsSync(reviewPacketPath), `expected ${reviewPacketPath}`);
  const packet = await readFile(reviewPacketPath, "utf8");
  assert.ok(
    /## PURPOSE PRESERVATION CHECK/.test(packet),
    "review packet must contain PURPOSE PRESERVATION CHECK",
  );
  assert.ok(/path-freshness-report/.test(packet),
    "review packet must name the slice");
});
