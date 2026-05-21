// Docs contract tests for the GitHub Check publisher decision
// memo + gated skeleton (step 6a of the CI / GitHub adapter
// implementation sequence pinned by
// docs/strategy/verification-runner-ci-github-decision.md).

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const decisionDocPath = join(
  repoRoot,
  "docs",
  "strategy",
  "verification-runner-github-check-publisher-decision.md",
);
const changelogPath = join(repoRoot, "CHANGELOG.md");
const reviewPacketPath = join(
  repoRoot,
  ".rekon-dev",
  "review-packets",
  "verification-runner-github-check-publisher-decision.md",
);

// ---------- 1: decision doc exists ----------

test("decision memo exists", () => {
  assert.ok(
    existsSync(decisionDocPath),
    `expected decision memo at ${decisionDocPath}`,
  );
});

// ---------- 2: required headings present ----------

test("decision memo contains all 11 required headings", async () => {
  const content = await readFile(decisionDocPath, "utf8");
  const required = [
    "## Decision Summary",
    "## Problem",
    "## Current GitHub Workflow State",
    "## Options Considered",
    "## Recommendation",
    "## Canonical Artifact Boundary",
    "## Permission Model",
    "## Fork And Secret Safety",
    "## Check Payload Model",
    "## What This Does Not Do",
    "## Implementation Sequence",
    "## Tests Required For Implementation",
  ];
  for (const heading of required) {
    assert.ok(
      content.includes(heading),
      `decision memo missing required heading: ${heading}`,
    );
  }
});

// ---------- 3: recommends Option B (gated skeleton) ----------

test("decision memo recommends a gated GitHub Check publisher", async () => {
  const content = await readFile(decisionDocPath, "utf8");
  assert.match(content, /Option B/i);
  assert.match(content, /gated/i);
  assert.match(content, /GitHub Check publisher/i);
});

// ---------- 4: canonical-truth language ----------

test("decision memo says GitHub status is not canonical truth", async () => {
  const content = await readFile(decisionDocPath, "utf8");
  assert.match(content, /GitHub status is not canonical truth/i);
});

// ---------- 5: artifacts-canonical language ----------

test("decision memo says Rekon artifacts remain canonical", async () => {
  const content = await readFile(decisionDocPath, "utf8");
  assert.match(content, /Rekon artifacts remain canonical/i);
});

// ---------- 6: forked PRs not trusted by default ----------

test("decision memo says forked PRs are not trusted / allowed by default", async () => {
  const content = await readFile(decisionDocPath, "utf8");
  const flat = content.replace(/\s+/g, " ");
  assert.match(
    flat,
    /Forked.{0,40}(pull|PR).{0,80}(not|never).{0,40}(trusted|allowed).{0,40}default/i,
    "decision memo must say forked PRs are not trusted / allowed by default",
  );
});

// ---------- 7: no GitHub API call in this batch ----------

test("decision memo says no GitHub API call ships in this batch", async () => {
  const content = await readFile(decisionDocPath, "utf8");
  const flat = content.replace(/\s+/g, " ");
  assert.match(
    flat,
    /(no GitHub API call|never call.{0,40}GitHub|Makes no GitHub API call)/i,
    "decision memo must say no GitHub API call ships in this batch",
  );
});

// ---------- 8: mentions REKON_GITHUB_CHECKS ----------

test("decision memo mentions REKON_GITHUB_CHECKS", async () => {
  const content = await readFile(decisionDocPath, "utf8");
  assert.match(content, /REKON_GITHUB_CHECKS/);
});

// ---------- 9: mentions GITHUB_TOKEN ----------

test("decision memo mentions GITHUB_TOKEN", async () => {
  const content = await readFile(decisionDocPath, "utf8");
  assert.match(content, /GITHUB_TOKEN/);
});

// ---------- 10: mentions workflow_dispatch ----------

test("decision memo mentions workflow_dispatch", async () => {
  const content = await readFile(decisionDocPath, "utf8");
  assert.match(content, /workflow_dispatch/);
});

// ---------- 11: lists the conclusion mapping ----------

test("decision memo lists the conclusion mapping", async () => {
  const content = await readFile(decisionDocPath, "utf8");
  // The memo should mention every conclusion value the helper
  // can emit so reviewers can audit the mapping in one place.
  for (const token of [
    "success",
    "failure",
    "neutral",
    "timed_out",
    "action_required",
  ]) {
    assert.match(
      content,
      new RegExp(token),
      `decision memo must mention conclusion value: ${token}`,
    );
  }
});

// ---------- 12: CHANGELOG mentions the slice ----------

test("CHANGELOG mentions the decision / skeleton", async () => {
  const content = await readFile(changelogPath, "utf8");
  assert.match(
    content,
    /(github-check-publisher|GitHub Check publisher|verification-runner-github-check-publisher-decision)/i,
    "CHANGELOG must mention the GitHub Check publisher decision / skeleton slice",
  );
});

// ---------- 13: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  assert.ok(
    existsSync(reviewPacketPath),
    `expected review packet at ${reviewPacketPath}`,
  );
  const content = await readFile(reviewPacketPath, "utf8");
  assert.match(
    content,
    /## PURPOSE PRESERVATION CHECK/,
    "review packet must contain PURPOSE PRESERVATION CHECK section",
  );
});
