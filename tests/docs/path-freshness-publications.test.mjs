// Docs contract tests for the path-freshness
// publication surfacing slice.

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const conceptDocPath = join(repoRoot, "docs", "concepts", "path-freshness.md");
const artifactDocPath = join(repoRoot, "docs", "artifacts", "path-freshness-report.md");
const archPubDocPath = join(
  repoRoot,
  "docs",
  "artifacts",
  "architecture-summary-publication.md",
);
const agentPubDocPath = join(
  repoRoot,
  "docs",
  "artifacts",
  "agent-contract-publication.md",
);
const proofPubDocPath = join(
  repoRoot,
  "docs",
  "artifacts",
  "proof-report-publication.md",
);
const reviewPacketPath = join(
  repoRoot,
  ".rekon-dev",
  "review-packets",
  "path-freshness-publication-surfacing.md",
);
const changelogPath = join(repoRoot, "CHANGELOG.md");

async function flat(path) {
  return (await readFile(path, "utf8")).replace(/\s+/g, " ");
}

// ---------- 1: architecture summary docs mention surfacing ----------

test("architecture summary doc mentions path freshness surfacing", async () => {
  assert.ok(existsSync(archPubDocPath), `expected ${archPubDocPath}`);
  const f = await flat(archPubDocPath);
  assert.match(f, /PathFreshnessReport/);
  assert.match(f, /Working Tree Path Freshness/);
});

// ---------- 2: agent contract docs mention surfacing ----------

test("agent contract doc mentions path freshness surfacing", async () => {
  assert.ok(existsSync(agentPubDocPath), `expected ${agentPubDocPath}`);
  const f = await flat(agentPubDocPath);
  assert.match(f, /PathFreshnessReport/);
  assert.match(f, /Working Tree Path Freshness/);
});

// ---------- 3: proof report docs mention surfacing or deferral ----------

test("proof report doc mentions surfacing OR documented deferral", async () => {
  assert.ok(existsSync(proofPubDocPath), `expected ${proofPubDocPath}`);
  const f = await flat(proofPubDocPath);
  // This slice ships proof-report surfacing, so we expect the
  // doc to mention PathFreshnessReport. If a future slice
  // decided to defer instead, the doc could carry an explicit
  // deferral statement — accept either.
  assert.ok(
    /PathFreshnessReport/.test(f) || /defer/i.test(f),
    "expected proof-report doc to mention PathFreshnessReport surfacing or an explicit deferral",
  );
});

// ---------- 4: docs say publications read latest PathFreshnessReport ----------

test("docs say publications read the latest PathFreshnessReport", async () => {
  const concept = await flat(conceptDocPath);
  const artifact = await flat(artifactDocPath);
  assert.ok(
    /latest .{0,80}PathFreshnessReport/i.test(concept)
      || /latest .{0,80}PathFreshnessReport/i.test(artifact),
    "expected docs to say publications read the latest PathFreshnessReport",
  );
});

// ---------- 5: docs say publications do not run refresh ----------

test("docs say publications do not run rekon refresh", async () => {
  const concept = await flat(conceptDocPath);
  const artifact = await flat(artifactDocPath);
  assert.ok(
    /publications? .{0,120}(do not|never) .{0,40}(run|invoke) .{0,40}rekon refresh/i.test(concept)
      || /publications? .{0,120}(do not|never) .{0,40}(run|invoke) .{0,40}rekon refresh/i.test(artifact)
      || /publications? .{0,120}(do not|never) .{0,80}refresh/i.test(concept)
      || /publications? .{0,120}(do not|never) .{0,80}refresh/i.test(artifact),
    "expected docs to say publications do not run rekon refresh",
  );
});

// ---------- 6: docs say no daemon / no background refresh ----------

test("docs say no daemon and no background refresh", async () => {
  const concept = await flat(conceptDocPath);
  const artifact = await flat(artifactDocPath);
  assert.ok(
    /no (watcher )?daemon/i.test(concept) || /no (watcher )?daemon/i.test(artifact),
    "expected: no daemon (or no watcher daemon)",
  );
  assert.ok(
    /no background refresh/i.test(concept) || /no background refresh/i.test(artifact),
    "expected: no background refresh",
  );
});

// ---------- 7: docs distinguish lineage from working-tree freshness ----------

test("docs say artifact lineage freshness is not working-tree freshness", async () => {
  const concept = await flat(conceptDocPath);
  const artifact = await flat(artifactDocPath);
  const archPub = await flat(archPubDocPath);
  const agentPub = await flat(agentPubDocPath);
  const text = [concept, artifact, archPub, agentPub].join(" ");
  assert.ok(
    /artifact lineage freshness is not working-tree freshness/i.test(text)
      || /working-tree freshness is distinct from artifact lineage freshness/i.test(text)
      || /lineage.{0,40}not.{0,40}working-tree/i.test(text),
    "expected docs to distinguish lineage from working-tree freshness",
  );
});

// ---------- 8: CHANGELOG entry ----------

test("CHANGELOG mentions path freshness publication surfacing", async () => {
  const content = await readFile(changelogPath, "utf8");
  assert.ok(
    /path freshness publication surfacing/i.test(content),
    "expected CHANGELOG entry for path freshness publication surfacing",
  );
});

// ---------- 9: review packet exists and contains PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  assert.ok(existsSync(reviewPacketPath), `expected ${reviewPacketPath}`);
  const packet = await readFile(reviewPacketPath, "utf8");
  assert.ok(
    /## PURPOSE PRESERVATION CHECK/.test(packet),
    "expected review packet to contain PURPOSE PRESERVATION CHECK",
  );
  assert.ok(
    /path-freshness-publication-surfacing/.test(packet),
    "expected review packet to name the slice",
  );
});
