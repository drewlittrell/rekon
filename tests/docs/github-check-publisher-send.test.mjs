// Docs contract tests for the GitHub Check publisher send mode
// (step 6c of the CI / GitHub adapter implementation sequence
// pinned by docs/strategy/verification-runner-ci-github-decision.md
// and docs/strategy/verification-runner-github-check-publisher-decision.md).

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
  "github-check-publisher-send.md",
);

async function flatDocs() {
  const memo = await readFile(decisionDocPath, "utf8");
  const guide = await readFile(operatorGuidePath, "utf8");
  return `${memo}\n${guide}`.replace(/\s+/g, " ");
}

// ---------- 1: docs mention --send ----------

test("docs mention `publish github-check --send`", async () => {
  const flat = await flatDocs();
  assert.match(flat, /publish github-check\s+--send/i);
});

// ---------- 2: docs say send requires REKON_GITHUB_CHECKS ----------

test("docs say --send requires REKON_GITHUB_CHECKS", async () => {
  const flat = await flatDocs();
  assert.match(flat, /REKON_GITHUB_CHECKS/);
});

// ---------- 3: docs say send requires GITHUB_TOKEN ----------

test("docs say --send requires GITHUB_TOKEN", async () => {
  const flat = await flatDocs();
  assert.match(flat, /GITHUB_TOKEN/);
});

// ---------- 4: docs say send requires checks-write confirmation ----------

test("docs say --send requires explicit checks-write confirmation", async () => {
  const flat = await flatDocs();
  assert.match(
    flat,
    /(--confirm-checks-write|REKON_GITHUB_CHECKS_WRITE_CONFIRMED|writePermissionConfirmed)/i,
    "docs must describe the checks-write confirmation flag / env",
  );
});

// ---------- 5: docs say pull_request_target is rejected ----------

test("docs say pull_request_target is rejected (unconditionally)", async () => {
  const flat = await flatDocs();
  assert.match(
    flat,
    /pull_request_target.{0,80}(reject|refus|deny|unconditional)/i,
    "docs must say pull_request_target is rejected",
  );
});

// ---------- 6: docs say forked PRs are rejected by default ----------

test("docs say forked PRs are rejected by default", async () => {
  const flat = await flatDocs();
  assert.match(
    flat,
    /Forked.{0,80}(reject|refus|untrusted|not.{0,20}trusted|not.{0,20}allow).{0,40}default/i,
  );
});

// ---------- 7: docs say GitHub status is not canonical truth ----------

test("docs say GitHub status is not canonical truth", async () => {
  const flat = await flatDocs();
  assert.match(flat, /GitHub status is not canonical truth/i);
});

// ---------- 8: docs say Rekon artifacts remain canonical ----------

test("docs say Rekon artifacts remain canonical", async () => {
  const flat = await flatDocs();
  assert.match(flat, /Rekon artifacts remain canonical/i);
});

// ---------- 9: CHANGELOG mentions GitHub Check send ----------

test("CHANGELOG mentions the GitHub Check send slice", async () => {
  const content = await readFile(changelogPath, "utf8");
  assert.match(
    content,
    /(GitHub Check publisher.{0,80}send|publish github-check --send|github-check-publisher-send)/i,
    "CHANGELOG must mention the GitHub Check send slice",
  );
});

// ---------- 10: review packet exists with PURPOSE PRESERVATION CHECK ----------

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
