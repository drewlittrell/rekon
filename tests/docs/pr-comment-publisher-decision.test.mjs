// Docs contract tests for the PR Comment Publisher Decision
// memo (step 7a of the CI / GitHub adapter implementation
// sequence pinned by
// docs/strategy/verification-runner-ci-github-decision.md).

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
const changelogPath = join(repoRoot, "CHANGELOG.md");
const reviewPacketPath = join(
  repoRoot,
  ".rekon-dev",
  "review-packets",
  "pr-comment-publisher-decision.md",
);

async function readMemo() {
  return readFile(memoPath, "utf8");
}

async function readMemoFlat() {
  const content = await readFile(memoPath, "utf8");
  return content.replace(/\s+/g, " ");
}

// ---------- 1: memo exists ----------

test("PR comment publisher decision doc exists", () => {
  assert.ok(existsSync(memoPath), `expected memo at ${memoPath}`);
});

// ---------- 2: required headings ----------

test("decision memo contains all required headings", async () => {
  const content = await readMemo();
  const required = [
    "## Decision Summary",
    "## Problem",
    "## Current GitHub Review Surfaces",
    "## GitHub Permission Context",
    "## Options Considered",
    "## Recommendation",
    "## Comment Content Model",
    "## Idempotency And Noise Control",
    "## Fork And Secret Safety",
    "## Canonical Artifact Boundary",
    "## What This Does Not Do",
    "## Implementation Sequence",
    "## Future PR Comment Publisher",
  ];
  for (const heading of required) {
    assert.ok(
      content.includes(heading),
      `decision memo missing required heading: ${heading}`,
    );
  }
});

// ---------- 3: recommends Option B now ----------

test("decision memo recommends Option B now", async () => {
  const content = await readMemo();
  assert.match(content, /Option B/);
  assert.match(content, /Recommendation: Option B now|Adopt Option B|Recommended.*Option B|\*\*Recommended\.\*\*/);
});

// ---------- 4: actual posting deferred ----------

test("decision memo says actual PR comment posting is deferred", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /(defer|deferred).{0,80}(PR comment posting|posting|actual.{0,40}post|API write|API call)/i,
  );
});

// ---------- 5: PR comments not required for beta ----------

test("decision memo says PR comments are not required for beta if Checks + artifacts are sufficient", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /PR comments are not required for beta.{0,160}Checks.{0,40}artifacts.{0,40}sufficient/i,
  );
});

// ---------- 6: permission requirement ----------

test("decision memo says creating/updating PR comments requires Issues or Pull requests write permission", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /Creating or updating PR timeline comments requires Issues or Pull requests write permission/i,
  );
});

// ---------- 7: forked PRs default-deny ----------

test("decision memo says forked PRs must not receive secret-bearing comment publishing by default", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /Forked PRs must not receive secret-bearing comment publishing by default/i,
  );
});

// ---------- 8: future comments must be opt-in ----------

test("decision memo says future comments must be opt-in", async () => {
  const flat = await readMemoFlat();
  assert.match(flat, /opt-in/i);
  assert.match(
    flat,
    /(must be opt-in|opt-in.{0,200}by default|Disabled by default)/i,
  );
});

// ---------- 9: same-repo / trusted-context only ----------

test("decision memo says future comments must be same-repo / trusted-context only", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /same-repo\s*\/\s*trusted-context only|trusted-context only/i,
  );
});

// ---------- 10: update-in-place ----------

test("decision memo says future comments must update in place", async () => {
  const flat = await readMemoFlat();
  assert.match(flat, /update[ -]in[ -]place/i);
});

// ---------- 11: marker present ----------

test("decision memo includes <!-- rekon:pr-comment:v1 -->", async () => {
  const content = await readMemo();
  assert.ok(
    content.includes("<!-- rekon:pr-comment:v1 -->"),
    "decision memo must include the idempotency marker `<!-- rekon:pr-comment:v1 -->`",
  );
});

// ---------- 12: marker is not proof ----------

test("decision memo says the marker is not proof", async () => {
  const flat = await readMemoFlat();
  assert.match(flat, /(marker is not proof|marker.{0,40}not proof)/i);
});

// ---------- 13: GitHub status / comments not canonical truth ----------

test("decision memo says GitHub status / comments are not canonical truth", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /(GitHub status[\s\S]{0,40}comments[\s\S]{0,40}are not canonical truth|GitHub status is not canonical truth)/i,
  );
});

// ---------- 14: Rekon artifacts canonical ----------

test("decision memo says Rekon artifacts remain canonical", async () => {
  const flat = await readMemoFlat();
  assert.match(flat, /Rekon artifacts remain canonical/i);
});

// ---------- 15: no raw logs / secrets / full stdout/stderr ----------

test("decision memo says no raw logs / secrets / full stdout/stderr", async () => {
  const flat = await readMemoFlat();
  for (const phrase of [/Raw\s+stdout\s*\/\s*stderr|raw logs/i, /Secrets/i, /full stdout\s*\/\s*stderr/i]) {
    assert.match(flat, phrase);
  }
});

// ---------- 16: implementation sequence listed ----------

test("decision memo lists the implementation sequence", async () => {
  const content = await readMemo();
  assert.match(content, /## Implementation Sequence/);
  const flat = content.replace(/\s+/g, " ");
  // Sequence should mention: decision memo, dry-run helper / CLI,
  // validator / docs, API write.
  assert.match(flat, /dry-run/i);
  assert.match(flat, /CLI/);
  assert.match(flat, /(validator|profile)/i);
  assert.match(flat, /(API write|API call|send)/i);
});

// ---------- 17: CHANGELOG mentions decision ----------

test("CHANGELOG mentions the PR comment publisher decision", async () => {
  const content = await readFile(changelogPath, "utf8");
  assert.match(
    content,
    /(pr-comment-publisher-decision|PR comment publisher decision|PR Comment Publisher Decision)/i,
    "CHANGELOG must mention the PR comment publisher decision",
  );
});

// ---------- 18: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  assert.ok(
    existsSync(reviewPacketPath),
    `expected review packet at ${reviewPacketPath}`,
  );
  const content = await readFile(reviewPacketPath, "utf8");
  assert.match(content, /## PURPOSE PRESERVATION CHECK/);
});
