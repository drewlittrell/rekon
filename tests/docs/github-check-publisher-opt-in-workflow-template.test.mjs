// Docs contract tests for the opt-in GitHub Check send workflow
// template + operator-guide updates.
//
// Pins:
//   - the template's location, permissions, env, steps,
//     artifact upload, job summary, and canonical-truth
//     reminder
//   - the operator guide's new "Optional: publish a GitHub
//     Check" section
//   - CHANGELOG mention
//   - review-packet PURPOSE PRESERVATION CHECK

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
  "rekon-verification-check-send.yml",
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
  "github-check-publisher-opt-in-workflow-template.md",
);

function stripYamlComments(content) {
  return content
    .split("\n")
    .map((line) => {
      const hashIndex = line.indexOf("#");
      if (hashIndex === -1) return line;
      // Crude: ignore quoted-string corner cases for these docs
      // assertions. The validator's quote-aware stripper exists
      // for the real check; here we just want "does this token
      // appear in non-comment code".
      const before = line.slice(0, hashIndex);
      // If `#` is inside a `"..."` block, keep the line as-is.
      const dqOpens = (before.match(/"/g) ?? []).length;
      const sqOpens = (before.match(/'/g) ?? []).length;
      if (dqOpens % 2 === 1 || sqOpens % 2 === 1) return line;
      return before;
    })
    .join("\n");
}

// ---------- 1: opt-in workflow template exists ----------

test("opt-in workflow template exists", () => {
  assert.ok(existsSync(templatePath), `expected template at ${templatePath}`);
});

// ---------- 2: template is not under .github/workflows ----------

test("template is not under .github/workflows in the Rekon repo", () => {
  const activeWorkflows = join(repoRoot, ".github", "workflows");
  if (!existsSync(activeWorkflows)) return;
  const entries = readdirSync(activeWorkflows)
    .filter((name) => statSync(join(activeWorkflows, name)).isFile())
    .filter((name) => /\.ya?ml$/.test(name));
  for (const entry of entries) {
    assert.equal(
      /rekon-verification-check-send/.test(entry),
      false,
      `the opt-in send workflow must not be installed as an active workflow in the Rekon repo (found ${entry})`,
    );
  }
});

// ---------- 3: contents: read declared ----------

test("template declares permissions: contents: read", async () => {
  const content = await readFile(templatePath, "utf8");
  const stripped = stripYamlComments(content);
  assert.match(stripped, /^permissions:/m);
  assert.match(stripped, /^\s*contents:\s*read\b/m);
});

// ---------- 4: checks: write declared ----------

test("template declares permissions: checks: write", async () => {
  const content = await readFile(templatePath, "utf8");
  const stripped = stripYamlComments(content);
  assert.match(stripped, /^\s*checks:\s*write\b/m);
});

// ---------- 5: no pull_request_target ----------

test("template does NOT use pull_request_target", async () => {
  const content = await readFile(templatePath, "utf8");
  const stripped = stripYamlComments(content);
  assert.equal(stripped.includes("pull_request_target"), false);
});

// ---------- 6: no pull-requests: write ----------

test("template does NOT request pull-requests: write", async () => {
  const content = await readFile(templatePath, "utf8");
  const stripped = stripYamlComments(content);
  assert.equal(/pull-requests:\s*write/.test(stripped), false);
});

// ---------- 7: no contents: write ----------

test("template does NOT request contents: write", async () => {
  const content = await readFile(templatePath, "utf8");
  const stripped = stripYamlComments(content);
  assert.equal(/contents:\s*write/.test(stripped), false);
});

// ---------- 8: no id-token ----------

test("template does NOT request id-token (no OIDC writes)", async () => {
  const content = await readFile(templatePath, "utf8");
  const stripped = stripYamlComments(content);
  assert.equal(/id-token/.test(stripped), false);
});

// ---------- 9: REKON_GITHUB_CHECKS=1 set ----------

test("template sets REKON_GITHUB_CHECKS to enable the readiness gate", async () => {
  const content = await readFile(templatePath, "utf8");
  assert.match(content, /REKON_GITHUB_CHECKS:\s*["']?(?:1|true)["']?/i);
});

// ---------- 10: REKON_GITHUB_CHECKS_WRITE_CONFIRMED=1 set ----------

test("template sets REKON_GITHUB_CHECKS_WRITE_CONFIRMED to confirm checks-write", async () => {
  const content = await readFile(templatePath, "utf8");
  assert.match(content, /REKON_GITHUB_CHECKS_WRITE_CONFIRMED:\s*["']?(?:1|true)["']?/i);
});

// ---------- 11: runs publish github-check --dry-run ----------

test("template runs `publish github-check --dry-run` before the send call", async () => {
  const content = await readFile(templatePath, "utf8");
  const flat = content.replace(/\s+/g, " ");
  assert.match(flat, /publish github-check[^|]*--dry-run/);
});

// ---------- 12: runs publish github-check --send ----------

test("template runs `publish github-check --send`", async () => {
  const content = await readFile(templatePath, "utf8");
  const flat = content.replace(/\s+/g, " ");
  assert.match(flat, /publish github-check[^|]*--send/);
});

// ---------- 13: --confirm-checks-write passed to send ----------

test("template passes --confirm-checks-write to the send command", async () => {
  const content = await readFile(templatePath, "utf8");
  assert.match(content, /--confirm-checks-write\b/);
});

// ---------- 14: uploads .rekon/artifacts ----------

test("template uploads .rekon/artifacts", async () => {
  const content = await readFile(templatePath, "utf8");
  assert.match(content, /\.rekon\/artifacts\/\*\*/);
});

// ---------- 15: excludes .log files ----------

test("template excludes .log files from the upload", async () => {
  const content = await readFile(templatePath, "utf8");
  assert.match(content, /!\.rekon\/artifacts\/\*\*\/\*\.log/);
});

// ---------- 16: writes to $GITHUB_STEP_SUMMARY ----------

test("template writes to $GITHUB_STEP_SUMMARY", async () => {
  const content = await readFile(templatePath, "utf8");
  assert.match(content, /\$GITHUB_STEP_SUMMARY/);
});

// ---------- 17: canonical-truth reminder present ----------

test("template includes the canonical-truth reminder", async () => {
  const content = await readFile(templatePath, "utf8");
  assert.match(content, /GitHub status is not canonical truth/i);
  assert.match(content, /Rekon artifacts remain canonical/i);
});

// ---------- 18: operator guide mentions the opt-in send workflow ----------

test("operator guide mentions the opt-in send workflow template", async () => {
  const content = await readFile(operatorGuidePath, "utf8");
  assert.match(content, /rekon-verification-check-send\.yml/);
  assert.match(content, /## Optional: publish a GitHub Check/i);
});

// ---------- 19: operator guide says use read-only / dry-run first ----------

test("operator guide says to use read-only or dry-run templates first", async () => {
  const content = await readFile(operatorGuidePath, "utf8");
  const flat = content.replace(/\s+/g, " ");
  assert.match(
    flat,
    /(read-only|dry-run).{0,80}(first|before)|(start|begin|adopt).{0,40}(read-only|dry-run)/i,
    "operator guide must instruct adopting the read-only / dry-run templates before the send template",
  );
});

// ---------- 20: CHANGELOG mentions the slice ----------

test("CHANGELOG mentions the opt-in workflow template", async () => {
  const content = await readFile(changelogPath, "utf8");
  assert.match(
    content,
    /(opt-in.{0,40}workflow|rekon-verification-check-send|github-check-publisher-opt-in-workflow-template)/i,
    "CHANGELOG must mention the opt-in workflow template slice",
  );
});

// ---------- 21: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  assert.ok(existsSync(reviewPacketPath), `expected review packet at ${reviewPacketPath}`);
  const content = await readFile(reviewPacketPath, "utf8");
  assert.match(content, /## PURPOSE PRESERVATION CHECK/);
});
