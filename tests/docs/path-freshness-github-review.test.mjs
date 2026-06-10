// Docs contract tests for the path-freshness GitHub
// review surfacing slice.

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const conceptDocPath = join(repoRoot, "docs", "concepts", "path-freshness.md");
const artifactDocPath = join(repoRoot, "docs", "artifacts", "path-freshness-report.md");
// The watcher-memo assertion was removed by WO-5: the memo is archived
// (superseded by rekon-system-model.md delta D2) and archived memos need no
// content guards; the prose-assertion pattern is retired.
const triageMemoPath = join(
  repoRoot,
  "docs",
  "strategy",
  "post-beta-dogfood-evidence-triage.md",
);
const operatorGuidePath = join(
  repoRoot,
  "docs",
  "examples",
  "github-actions-verification-runner.md",
);
const reviewPacketPath = join(
  repoRoot,
  ".rekon-dev",
  "review-packets",
  "path-freshness-github-review-surfacing.md",
);
const changelogPath = join(repoRoot, "CHANGELOG.md");

async function flat(path) {
  return (await readFile(path, "utf8")).replace(/\s+/g, " ");
}

// ---------- 1: GitHub Check surfacing ----------

test("docs mention GitHub Check path freshness surfacing", async () => {
  const concept = await flat(conceptDocPath);
  const artifact = await flat(artifactDocPath);
  const guide = await flat(operatorGuidePath);
  const text = [concept, artifact, guide].join(" ");
  assert.ok(
    /GitHub Check.{0,80}(path|working-tree) freshness/i.test(text)
      || /Working-tree freshness.{0,160}GitHub Check/i.test(text)
      || /github-check.{0,160}(PathFreshnessReport|path freshness)/i.test(text),
    "expected docs to mention GitHub Check path freshness surfacing",
  );
});

// ---------- 2: PR comment surfacing ----------

test("docs mention PR comment path freshness surfacing", async () => {
  const concept = await flat(conceptDocPath);
  const artifact = await flat(artifactDocPath);
  const guide = await flat(operatorGuidePath);
  const text = [concept, artifact, guide].join(" ");
  assert.ok(
    /PR comment.{0,80}(path|working-tree) freshness/i.test(text)
      || /(path|working-tree) freshness.{0,160}PR comment/i.test(text)
      || /pr-comment.{0,160}(PathFreshnessReport|path freshness)/i.test(text),
    "expected docs to mention PR comment path freshness surfacing",
  );
});

// ---------- 4: GitHub review surfaces read latest PathFreshnessReport ----------

test("docs say GitHub review surfaces read the latest PathFreshnessReport", async () => {
  const concept = await flat(conceptDocPath);
  const artifact = await flat(artifactDocPath);
  const text = [concept, artifact].join(" ");
  assert.ok(
    /(GitHub Check|PR comment|GitHub review).{0,160}read .{0,80}latest .{0,80}PathFreshnessReport/i.test(text)
      || /latest .{0,80}PathFreshnessReport.{0,160}(GitHub Check|PR comment|GitHub review)/i.test(text),
    "expected docs to say GitHub review surfaces read the latest PathFreshnessReport",
  );
});

// ---------- 5: GitHub review surfaces do not run refresh ----------

test("docs say GitHub review surfaces do not run rekon refresh", async () => {
  const concept = await flat(conceptDocPath);
  const artifact = await flat(artifactDocPath);
  const text = [concept, artifact].join(" ");
  assert.ok(
    /(GitHub Check|PR comment|GitHub review).{0,160}(do not|never).{0,40}run.{0,40}rekon refresh/i.test(text)
      || /(GitHub Check|PR comment|GitHub review).{0,160}(do not|never).{0,80}refresh/i.test(text),
    "expected docs to say GitHub review surfaces do not run rekon refresh",
  );
});

// ---------- 6: no daemon / no background refresh ----------

test("docs say no daemon and no background refresh", async () => {
  const concept = await flat(conceptDocPath);
  const artifact = await flat(artifactDocPath);
  assert.ok(
    /no (watcher )?daemon/i.test(concept) || /no (watcher )?daemon/i.test(artifact),
    "expected: no daemon",
  );
  assert.ok(
    /no background refresh/i.test(concept) || /no background refresh/i.test(artifact),
    "expected: no background refresh",
  );
});

// ---------- 7: GitHub status/comments are not canonical truth ----------

test("docs say GitHub status/comments are not canonical truth", async () => {
  const concept = await flat(conceptDocPath);
  const artifact = await flat(artifactDocPath);
  const text = [concept, artifact].join(" ");
  assert.ok(
    /GitHub.{0,80}(status|comments?).{0,80}(not|never).{0,40}canonical/i.test(text)
      || /(not|never) canonical.{0,80}GitHub/i.test(text),
    "expected docs to pin: GitHub status/comments are not canonical truth",
  );
});

// ---------- 8: CHANGELOG entry ----------

test("CHANGELOG mentions path freshness GitHub review surfacing", async () => {
  const content = await readFile(changelogPath, "utf8");
  // Flatten to tolerate intra-heading line wraps.
  const flat = content.replace(/\s+/g, " ");
  assert.ok(
    /path freshness GitHub review surfacing/i.test(flat),
    "expected CHANGELOG entry for path freshness GitHub review surfacing",
  );
});

// ---------- 9: review packet ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  assert.ok(existsSync(reviewPacketPath), `expected ${reviewPacketPath}`);
  const packet = await readFile(reviewPacketPath, "utf8");
  assert.ok(
    /## PURPOSE PRESERVATION CHECK/.test(packet),
    "expected review packet to contain PURPOSE PRESERVATION CHECK",
  );
  assert.ok(
    /path-freshness-github-review-surfacing/.test(packet),
    "expected review packet to name the slice",
  );
  assert.ok(
    /## CONCLUSION POLICY/.test(packet),
    "expected review packet to contain a CONCLUSION POLICY section",
  );
});
