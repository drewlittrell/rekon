// Docs contract tests for `rekon publish pr-comment --send`
// (step 7f of the CI / GitHub adapter implementation sequence
// pinned by docs/strategy/verification-runner-ci-github-decision.md
// and docs/strategy/pr-comment-api-writer-go-no-go-review.md).

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const goNoGoMemoPath = join(repoRoot, "docs", "strategy", "pr-comment-api-writer-go-no-go-review.md");
const apiDecisionGatePath = join(repoRoot, "docs", "strategy", "pr-comment-publisher-api-decision-gate.md");
const publisherDecisionPath = join(repoRoot, "docs", "strategy", "pr-comment-publisher-decision.md");
const operatorGuidePath = join(repoRoot, "docs", "examples", "github-actions-verification-runner.md");
const workflowTemplatePath = join(repoRoot, "docs", "examples", "workflows", "rekon-pr-comment-send.yml");
const changelogPath = join(repoRoot, "CHANGELOG.md");
const reviewPacketPath = join(
  repoRoot,
  ".rekon-dev",
  "review-packets",
  "pr-comment-send-cli.md",
);

async function readAll(paths) {
  const chunks = await Promise.all(paths.map((p) => readFile(p, "utf8")));
  return chunks.join("\n\n----\n\n");
}

async function readAllFlat(paths) {
  const content = await readAll(paths);
  return content.replace(/\s+/g, " ");
}

const SHIPPED_DOC_PATHS = [
  goNoGoMemoPath,
  apiDecisionGatePath,
  publisherDecisionPath,
  operatorGuidePath,
  workflowTemplatePath,
];

// ---------- 1: docs mention publish pr-comment --send ----------

test("docs mention `publish pr-comment --send`", async () => {
  const flat = await readAllFlat(SHIPPED_DOC_PATHS);
  assert.match(flat, /publish pr-comment[\s\S]{0,40}--send/i);
});

// ---------- 2: docs say send uses issue comments ----------

test("docs say PR comment send uses GitHub issue comments", async () => {
  const flat = await readAllFlat(SHIPPED_DOC_PATHS);
  assert.match(flat, /issue[- ]comments?/i);
  assert.match(
    flat,
    /\/repos\/\{owner\}\/\{repo\}\/issues\/\{[^}]+\}\/comments/,
  );
});

// ---------- 3: docs say update-in-place by marker ----------

test("docs say update-in-place by marker", async () => {
  const flat = await readAllFlat(SHIPPED_DOC_PATHS);
  assert.match(flat, /update[- ]in[- ]place/i);
  assert.match(flat, /<!--\s*rekon:pr-comment:v1\s*-->/);
});

// ---------- 4: docs say marker is not proof ----------

test("docs say the idempotency marker is not proof", async () => {
  const flat = await readAllFlat(SHIPPED_DOC_PATHS);
  assert.match(
    flat,
    /(idempotency )?marker is not proof|marker.{0,60}not proof|marker is an idempotency handle, not proof/i,
  );
});

// ---------- 5: docs say PR comments are not canonical truth ----------

test("docs say PR comments are not canonical truth", async () => {
  const flat = await readAllFlat(SHIPPED_DOC_PATHS);
  assert.match(
    flat,
    /(PR|GitHub) comments are not canonical truth/i,
  );
});

// ---------- 6: docs say Rekon artifacts remain canonical ----------

test("docs say Rekon artifacts remain canonical", async () => {
  const flat = await readAllFlat(SHIPPED_DOC_PATHS);
  assert.match(flat, /Rekon artifacts remain canonical/i);
});

// ---------- 7: docs say forked PRs rejected by default ----------

test("docs say forked PRs are rejected by default", async () => {
  const flat = await readAllFlat(SHIPPED_DOC_PATHS);
  assert.match(
    flat,
    /(Forked PRs (remain |must not |are not |are )?(denied|rejected|untrusted) by default|forked .{0,40}rejected by default|denies write tokens to forked-PR)/i,
  );
});

// ---------- 8: CHANGELOG mentions PR comment send ----------

test("CHANGELOG mentions PR comment API writer / `publish pr-comment --send`", async () => {
  const content = await readFile(changelogPath, "utf8");
  assert.match(
    content,
    /(pr-comment-send-cli|publish pr-comment --send|PR comment API writer)/i,
  );
});

// ---------- 9: review packet exists + PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  assert.ok(
    existsSync(reviewPacketPath),
    `expected review packet at ${reviewPacketPath}`,
  );
  const content = await readFile(reviewPacketPath, "utf8");
  assert.match(content, /## PURPOSE PRESERVATION CHECK/);
});
