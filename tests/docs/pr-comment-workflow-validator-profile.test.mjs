// Docs contract tests for the PR comment workflow / validator
// profile (step 7d of the CI / GitHub adapter implementation
// sequence pinned by
// docs/strategy/pr-comment-publisher-api-decision-gate.md).

import assert from "node:assert/strict";
import { existsSync, readdirSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const templatePath = join(
  repoRoot,
  "docs",
  "examples",
  "workflows",
  "rekon-pr-comment-send.yml",
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
  "pr-comment-workflow-validator-profile.md",
);

function stripYamlComments(content) {
  return content
    .split("\n")
    .map((line) => {
      const hashIndex = line.indexOf("#");
      if (hashIndex === -1) return line;
      const before = line.slice(0, hashIndex);
      const dq = (before.match(/"/g) ?? []).length;
      const sq = (before.match(/'/g) ?? []).length;
      if (dq % 2 === 1 || sq % 2 === 1) return line;
      return before;
    })
    .join("\n");
}

// ---------- 1: template exists ----------

test("PR comment workflow template exists", () => {
  assert.ok(existsSync(templatePath), `expected template at ${templatePath}`);
});

// ---------- 2: not under .github/workflows ----------

test("template is not installed under .github/workflows", () => {
  const activeWorkflows = join(repoRoot, ".github", "workflows");
  if (!existsSync(activeWorkflows)) return;
  const entries = readdirSync(activeWorkflows)
    .filter((name) => statSync(join(activeWorkflows, name)).isFile())
    .filter((name) => /\.ya?ml$/.test(name));
  for (const entry of entries) {
    assert.equal(
      /rekon-pr-comment-send/.test(entry),
      false,
      `the PR comment workflow must not be installed as an active workflow (found ${entry})`,
    );
  }
});

// ---------- 3: contents: read ----------

test("template declares permissions: contents: read", async () => {
  const content = await readFile(templatePath, "utf8");
  const stripped = stripYamlComments(content);
  assert.match(stripped, /^permissions:/m);
  assert.match(stripped, /^\s*contents:\s*read\b/m);
});

// ---------- 4: pull-requests: write ----------

test("template declares permissions: pull-requests: write", async () => {
  const content = await readFile(templatePath, "utf8");
  const stripped = stripYamlComments(content);
  assert.match(stripped, /^\s*pull-requests:\s*write\b/m);
});

// ---------- 5: no pull_request_target ----------

test("template does NOT use pull_request_target", async () => {
  const content = await readFile(templatePath, "utf8");
  const stripped = stripYamlComments(content);
  assert.equal(stripped.includes("pull_request_target"), false);
});

// ---------- 6: no pull_request trigger ----------

test("template does NOT include a pull_request trigger", async () => {
  const content = await readFile(templatePath, "utf8");
  const stripped = stripYamlComments(content);
  assert.equal(/^\s*pull_request:/m.test(stripped), false);
});

// ---------- 7: no checks: write ----------

test("template does NOT include checks: write", async () => {
  const content = await readFile(templatePath, "utf8");
  const stripped = stripYamlComments(content);
  assert.equal(/checks:\s*write/.test(stripped), false);
});

// ---------- 8: no contents: write ----------

test("template does NOT include contents: write", async () => {
  const content = await readFile(templatePath, "utf8");
  const stripped = stripYamlComments(content);
  assert.equal(/contents:\s*write/.test(stripped), false);
});

// ---------- 9: no issues: write ----------

test("template does NOT include issues: write", async () => {
  const content = await readFile(templatePath, "utf8");
  const stripped = stripYamlComments(content);
  assert.equal(/issues:\s*write/.test(stripped), false);
});

// ---------- 10: no id-token ----------

test("template does NOT include id-token", async () => {
  const content = await readFile(templatePath, "utf8");
  const stripped = stripYamlComments(content);
  assert.equal(/id-token/.test(stripped), false);
});

// ---------- 11: REKON_PR_COMMENTS ----------

test("template sets REKON_PR_COMMENTS opt-in", async () => {
  const content = await readFile(templatePath, "utf8");
  assert.match(content, /REKON_PR_COMMENTS:\s*["']?(?:1|true)["']?/i);
});

// ---------- 12: REKON_PR_COMMENTS_WRITE_CONFIRMED ----------

test("template sets REKON_PR_COMMENTS_WRITE_CONFIRMED", async () => {
  const content = await readFile(templatePath, "utf8");
  assert.match(content, /REKON_PR_COMMENTS_WRITE_CONFIRMED:\s*["']?(?:1|true)["']?/i);
});

// ---------- 13: publish pr-comment --dry-run ----------

test("template runs `publish pr-comment --dry-run`", async () => {
  const content = await readFile(templatePath, "utf8");
  const flat = content.replace(/\s+/g, " ");
  assert.match(flat, /publish pr-comment[^|]*--dry-run/);
});

// ---------- 14: runs publish pr-comment --send (added in step 7f) ----------

test("template runs `publish pr-comment --send` with --confirm-pr-comment-write", async () => {
  const content = await readFile(templatePath, "utf8");
  const stripped = stripYamlComments(content);
  const flat = stripped.replace(/\s+/g, " ");
  assert.match(
    flat,
    /publish pr-comment[\s\S]*?--send/,
    "PR comment template must include --send (step 7f shipped the writer)",
  );
  assert.match(
    flat,
    /--confirm-pr-comment-write/,
    "PR comment template must pass --confirm-pr-comment-write to the --send step",
  );
});

// ---------- 15: uploads .rekon/artifacts ----------

test("template uploads .rekon/artifacts", async () => {
  const content = await readFile(templatePath, "utf8");
  assert.match(content, /\.rekon\/artifacts\/\*\*/);
});

// ---------- 16: excludes .log files ----------

test("template excludes .log files from upload", async () => {
  const content = await readFile(templatePath, "utf8");
  assert.match(content, /!\.rekon\/artifacts\/\*\*\/\*\.log/);
});

// ---------- 17: GITHUB_STEP_SUMMARY ----------

test("template writes to $GITHUB_STEP_SUMMARY", async () => {
  const content = await readFile(templatePath, "utf8");
  assert.match(content, /\$GITHUB_STEP_SUMMARY/);
});

// ---------- 18: canonical-truth reminder ----------

test("template includes the canonical-truth reminder", async () => {
  const content = await readFile(templatePath, "utf8");
  assert.match(content, /GitHub comments are not canonical truth/i);
  assert.match(content, /Rekon artifacts remain canonical/i);
});

// ---------- 19: marker-not-proof reminder ----------

test("template includes the marker-not-proof reminder", async () => {
  const content = await readFile(templatePath, "utf8");
  assert.match(
    content,
    /(marker is an idempotency handle, not proof|marker is not proof)/i,
  );
});

// ---------- 20: operator guide mentions PR comment workflow profile ----------

test("operator guide mentions the PR comment workflow profile", async () => {
  const content = await readFile(operatorGuidePath, "utf8");
  assert.match(content, /rekon-pr-comment-send\.yml/);
  assert.match(content, /github-pr-comment-send/);
});

// ---------- 21: CHANGELOG ----------

test("CHANGELOG mentions the PR comment workflow profile slice", async () => {
  const content = await readFile(changelogPath, "utf8");
  assert.match(
    content,
    /(pr-comment-workflow-validator-profile|PR comment workflow.{0,40}(profile|template)|rekon-pr-comment-send|github-pr-comment-send)/i,
  );
});

// ---------- 22: review packet ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  assert.ok(
    existsSync(reviewPacketPath),
    `expected review packet at ${reviewPacketPath}`,
  );
  const content = await readFile(reviewPacketPath, "utf8");
  assert.match(content, /## PURPOSE PRESERVATION CHECK/);
});
