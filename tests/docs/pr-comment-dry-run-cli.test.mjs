// Docs contract tests for the PR comment dry-run CLI (step 7b
// of the CI / GitHub adapter implementation sequence pinned by
// docs/strategy/pr-comment-publisher-decision.md).

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const memoPath = join(
  repoRoot,
  "docs",
  "strategy",
  "pr-comment-publisher-decision.md",
);
const operatorGuidePath = join(
  repoRoot,
  "docs",
  "examples",
  "github-actions-verification-runner.md",
);
const changelogPath = join(repoRoot, "CHANGELOG.md");
const reviewPacketPath = join(
  repoRoot,
  ".rekon-dev",
  "review-packets",
  "pr-comment-dry-run-cli.md",
);

async function flatDocs() {
  const memo = await readFile(memoPath, "utf8");
  const guide = await readFile(operatorGuidePath, "utf8");
  return `${memo}\n${guide}`.replace(/\s+/g, " ");
}

// ---------- 1: docs mention --dry-run command ----------

test("docs mention `publish pr-comment --dry-run`", async () => {
  const flat = await flatDocs();
  assert.match(flat, /publish pr-comment\s+--dry-run/i);
});

// ---------- 2: dry-run makes no GitHub API calls ----------

test("docs say dry-run makes no GitHub API calls", async () => {
  const flat = await flatDocs();
  assert.match(
    flat,
    /(No GitHub API call|never call.{0,40}GitHub|never calls? GitHub)/i,
  );
});

// ---------- 3: no PR comment posted ----------

test("docs say no PR comment is posted by the dry-run", async () => {
  const flat = await flatDocs();
  assert.match(
    flat,
    /(No PR comment was posted|never posts? a comment|never posts a PR comment|posts? no comment|posting.{0,40}defer)/i,
  );
});

// ---------- 4: marker is not proof ----------

test("docs say the marker is not proof", async () => {
  const flat = await flatDocs();
  assert.match(flat, /marker is not proof|marker.{0,40}not proof/i);
});

// ---------- 5: GitHub comments not canonical truth ----------

test("docs say GitHub comments are not canonical truth", async () => {
  const flat = await flatDocs();
  assert.match(
    flat,
    /GitHub comments are not canonical truth|GitHub status.{0,40}comments are not canonical truth/i,
  );
});

// ---------- 6: Rekon artifacts canonical ----------

test("docs say Rekon artifacts remain canonical", async () => {
  const flat = await flatDocs();
  assert.match(flat, /Rekon artifacts remain canonical/i);
});

// ---------- 7: actual posting remains future work ----------

test("docs say actual posting remains future work", async () => {
  const flat = await flatDocs();
  assert.match(
    flat,
    /(actual.{0,40}post.{0,80}(defer|future)|API write.{0,40}(defer|future)|posting.{0,40}(defer|future))/i,
  );
});

// ---------- 8: CHANGELOG mentions PR comment dry-run ----------

test("CHANGELOG mentions the PR comment dry-run helper / CLI", async () => {
  const content = await readFile(changelogPath, "utf8");
  assert.match(
    content,
    /(pr-comment-dry-run|PR comment.{0,40}dry-run|publish pr-comment.{0,40}--dry-run)/i,
  );
});

// ---------- 9: review packet ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  assert.ok(
    existsSync(reviewPacketPath),
    `expected review packet at ${reviewPacketPath}`,
  );
  const content = await readFile(reviewPacketPath, "utf8");
  assert.match(content, /## PURPOSE PRESERVATION CHECK/);
});
