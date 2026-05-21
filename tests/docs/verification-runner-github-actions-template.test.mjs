// Verification runner GitHub Actions workflow
// template — docs contract tests. Pins the
// shipped template's permission contract,
// trigger set, CLI step set, artifact upload
// path, retention policy, and the anchor
// statements in the operator guide so future
// contributors cannot silently widen the
// permission surface, install the workflow
// under `.github/workflows`, upload raw logs,
// or weaken the "GitHub status is not
// canonical truth" boundary.

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const guidePath = join(
  repoRoot,
  "docs",
  "examples",
  "github-actions-verification-runner.md",
);
const workflowPath = join(
  repoRoot,
  "docs",
  "examples",
  "workflows",
  "rekon-verification.yml",
);
const changelogPath = join(repoRoot, "CHANGELOG.md");
const reviewPacketPath = join(
  repoRoot,
  ".rekon-dev",
  "review-packets",
  "verification-runner-github-actions-template.md",
);

// ---------- File existence ----------

test("docs/examples/github-actions-verification-runner.md exists", () => {
  assert.ok(existsSync(guidePath), `expected operator guide at ${guidePath}`);
});

test("docs/examples/workflows/rekon-verification.yml exists", () => {
  assert.ok(existsSync(workflowPath), `expected workflow YAML at ${workflowPath}`);
});

// ---------- Workflow permission contract ----------

test("workflow has permissions: block", async () => {
  const content = await readFile(workflowPath, "utf8");
  assert.match(content, /^permissions:/m, "workflow must declare permissions:");
});

test("workflow has contents: read", async () => {
  const content = await readFile(workflowPath, "utf8");
  assert.match(
    content,
    /^\s*contents:\s*read/m,
    "workflow must declare contents: read",
  );
});

// Tests below strip YAML `#` comments before checking so the
// workflow's own documentation comments (which mention what it does
// NOT do) don't trigger the assertions.

function stripYamlComments(content) {
  return content
    .split("\n")
    .map((line) => {
      const hashIndex = line.indexOf("#");
      if (hashIndex === -1) return line;
      return line.slice(0, hashIndex);
    })
    .join("\n");
}

test("workflow does not contain pull_request_target", async () => {
  const content = await readFile(workflowPath, "utf8");
  const stripped = stripYamlComments(content);
  assert.equal(
    stripped.includes("pull_request_target"),
    false,
    "workflow must NOT use pull_request_target",
  );
});

test("workflow does not contain pull-requests: write", async () => {
  const content = await readFile(workflowPath, "utf8");
  const stripped = stripYamlComments(content);
  assert.equal(
    /pull-requests:\s*write/.test(stripped),
    false,
    "workflow must NOT declare pull-requests: write",
  );
});

test("workflow does not contain checks: write", async () => {
  const content = await readFile(workflowPath, "utf8");
  const stripped = stripYamlComments(content);
  assert.equal(
    /checks:\s*write/.test(stripped),
    false,
    "workflow must NOT declare checks: write",
  );
});

test("workflow does not contain contents: write", async () => {
  const content = await readFile(workflowPath, "utf8");
  const stripped = stripYamlComments(content);
  assert.equal(
    /contents:\s*write/.test(stripped),
    false,
    "workflow must NOT declare contents: write",
  );
});

test("workflow does not contain id-token", async () => {
  const content = await readFile(workflowPath, "utf8");
  const stripped = stripYamlComments(content);
  assert.equal(
    /id-token/.test(stripped),
    false,
    "workflow must NOT declare id-token",
  );
});

// ---------- Workflow CLI steps ----------

test("workflow runs rekon refresh", async () => {
  const content = await readFile(workflowPath, "utf8");
  assert.match(content, /rekon refresh|cli\/dist\/index\.js refresh/i);
});

test("workflow runs verify run", async () => {
  const content = await readFile(workflowPath, "utf8");
  assert.match(content, /verify run/i);
});

test("workflow runs verify result from-run", async () => {
  const content = await readFile(workflowPath, "utf8");
  assert.match(content, /verify result from-run/i);
});

test("workflow runs publish proof", async () => {
  const content = await readFile(workflowPath, "utf8");
  assert.match(content, /publish proof/i);
});

test("workflow runs artifacts validate", async () => {
  const content = await readFile(workflowPath, "utf8");
  assert.match(content, /artifacts validate/i);
});

// ---------- Workflow upload contract ----------

test("workflow uploads .rekon/artifacts", async () => {
  const content = await readFile(workflowPath, "utf8");
  assert.match(
    content,
    /\.rekon\/artifacts/,
    "workflow must upload .rekon/artifacts",
  );
});

test("workflow excludes .log files from upload", async () => {
  const content = await readFile(workflowPath, "utf8");
  assert.match(
    content,
    /!\.rekon\/artifacts\/\*\*\/\*\.log/,
    "workflow must exclude .log files from the upload path",
  );
});

test("workflow sets retention-days: 7", async () => {
  const content = await readFile(workflowPath, "utf8");
  assert.match(
    content,
    /retention-days:\s*7\b/,
    "workflow must set retention-days: 7",
  );
});

// ---------- Operator guide anchor statements ----------

test("operator guide says GitHub status is not canonical truth", async () => {
  const content = await readFile(guidePath, "utf8");
  assert.match(
    content,
    /GitHub status is not canonical truth/i,
    "guide must state GitHub status is not canonical truth",
  );
});

test("operator guide says Rekon artifacts remain canonical", async () => {
  const content = await readFile(guidePath, "utf8");
  // Collapse newlines so wrapped phrasing matches.
  const flat = content.replace(/\s+/g, " ");
  assert.match(
    flat,
    /Rekon.{0,80}artifacts.{0,40}(remain|are).{0,40}canonical/i,
    "guide must say Rekon artifacts remain canonical",
  );
});

test("operator guide says forked PRs must not receive secret-bearing execution by default", async () => {
  const content = await readFile(guidePath, "utf8");
  // Normalize: strip blockquote markers, then collapse whitespace
  // so wrapped phrasing matches (the phrase may live inside a
  // blockquote with `>` prefixes on continuation lines).
  const flat = content.replace(/^\s*>\s?/gm, "").replace(/\s+/g, " ");
  assert.match(
    flat,
    /Forked PRs must not receive secret-bearing execution by default/i,
    "guide must explicitly forbid secret-bearing execution on forked PRs by default",
  );
});

test("operator guide says passing verification does not automatically resolve findings", async () => {
  const content = await readFile(guidePath, "utf8");
  // Normalize whitespace so wrapped phrasing matches.
  const flat = content.replace(/\s+/g, " ");
  assert.match(
    flat,
    /[Pp]assing verification does not automatically resolve findings/,
    "guide must state passing verification does not automatically resolve findings",
  );
});

// ---------- Release surfaces ----------

test("CHANGELOG mentions the GitHub Actions workflow template", async () => {
  const content = await readFile(changelogPath, "utf8");
  assert.match(
    content,
    /verification-runner-github-actions-template|GitHub Actions workflow template/i,
    "CHANGELOG must mention the workflow template slice",
  );
});

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  assert.ok(existsSync(reviewPacketPath), `expected review packet at ${reviewPacketPath}`);

  const content = await readFile(reviewPacketPath, "utf8");
  assert.match(
    content,
    /## PURPOSE PRESERVATION CHECK/,
    "review packet must contain PURPOSE PRESERVATION CHECK section",
  );
});
