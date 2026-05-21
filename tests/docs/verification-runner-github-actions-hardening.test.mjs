// GitHub Actions workflow hardening v2 — docs contract
// tests (P1.1 verification-runner-github-actions-hardening-v2).
//
// Pins the dry-run workflow template's safety contract, the
// execute workflow's hardening, both workflows' adoption of
// the latest-artifact helper, the job-summary surface, and
// the operator guide's adoption + troubleshooting sections.

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const executeWorkflowPath = join(
  repoRoot,
  "docs",
  "examples",
  "workflows",
  "rekon-verification.yml",
);
const dryRunWorkflowPath = join(
  repoRoot,
  "docs",
  "examples",
  "workflows",
  "rekon-verification-dry-run.yml",
);
const guidePath = join(
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
  "verification-runner-github-actions-hardening-v2.md",
);

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

// ---------- 1: dry-run workflow exists ----------

test("dry-run workflow template exists", () => {
  assert.ok(existsSync(dryRunWorkflowPath), `expected dry-run YAML at ${dryRunWorkflowPath}`);
});

// ---------- 2: dry-run workflow has permissions: contents: read ----------

test("dry-run workflow has `permissions: contents: read`", async () => {
  const content = await readFile(dryRunWorkflowPath, "utf8");
  assert.match(content, /^permissions:/m);
  assert.match(content, /^\s*contents:\s*read/m);
});

// ---------- 3: dry-run workflow does not use pull_request_target ----------

test("dry-run workflow does NOT use pull_request_target", async () => {
  const content = await readFile(dryRunWorkflowPath, "utf8");
  const stripped = stripYamlComments(content);
  assert.equal(stripped.includes("pull_request_target"), false);
});

// ---------- 4: dry-run workflow has no GitHub write permissions ----------

test("dry-run workflow has no GitHub write permissions", async () => {
  const content = await readFile(dryRunWorkflowPath, "utf8");
  const stripped = stripYamlComments(content);
  assert.equal(/pull-requests:\s*write/.test(stripped), false);
  assert.equal(/checks:\s*write/.test(stripped), false);
  assert.equal(/contents:\s*write/.test(stripped), false);
  assert.equal(/id-token/.test(stripped), false);
});

// ---------- 5: dry-run workflow uses verify run --dry-run ----------

test("dry-run workflow uses `verify run --dry-run`", async () => {
  const content = await readFile(dryRunWorkflowPath, "utf8");
  const flat = content.replace(/\s+/g, " ");
  assert.match(flat, /verify run [^|]*--dry-run/);
});

// ---------- 6: dry-run workflow does not use --execute ----------

test("dry-run workflow does NOT use `--execute`", async () => {
  const content = await readFile(dryRunWorkflowPath, "utf8");
  const stripped = stripYamlComments(content);
  assert.equal(stripped.includes("--execute"), false);
});

// ---------- 7: execute workflow still has permissions: contents: read ----------

test("execute workflow still has `permissions: contents: read`", async () => {
  const content = await readFile(executeWorkflowPath, "utf8");
  assert.match(content, /^permissions:/m);
  assert.match(content, /^\s*contents:\s*read/m);
});

// ---------- 8: execute workflow still has no GitHub write permissions ----------

test("execute workflow still has no GitHub write permissions", async () => {
  const content = await readFile(executeWorkflowPath, "utf8");
  const stripped = stripYamlComments(content);
  assert.equal(/pull-requests:\s*write/.test(stripped), false);
  assert.equal(/checks:\s*write/.test(stripped), false);
  assert.equal(/contents:\s*write/.test(stripped), false);
  assert.equal(/id-token/.test(stripped), false);
});

// ---------- 9: execute workflow uses verify run --execute ----------

test("execute workflow uses `verify run --execute`", async () => {
  const content = await readFile(executeWorkflowPath, "utf8");
  const flat = content.replace(/\s+/g, " ");
  assert.match(flat, /verify run [^|]*--execute/);
});

// ---------- 10: both workflows use artifacts latest ----------

test("both workflows use `artifacts latest`", async () => {
  for (const path of [executeWorkflowPath, dryRunWorkflowPath]) {
    const content = await readFile(path, "utf8");
    assert.match(
      content,
      /artifacts latest/,
      `${path} must use \`rekon artifacts latest\``,
    );
  }
});

// ---------- 11: both workflows upload .rekon/artifacts ----------

test("both workflows upload `.rekon/artifacts`", async () => {
  for (const path of [executeWorkflowPath, dryRunWorkflowPath]) {
    const content = await readFile(path, "utf8");
    assert.match(
      content,
      /\.rekon\/artifacts\/\*\*/,
      `${path} must upload .rekon/artifacts`,
    );
  }
});

// ---------- 12: both workflows exclude .log files ----------

test("both workflows exclude `.log` files from the upload", async () => {
  for (const path of [executeWorkflowPath, dryRunWorkflowPath]) {
    const content = await readFile(path, "utf8");
    assert.match(
      content,
      /!\.rekon\/artifacts\/\*\*\/\*\.log/,
      `${path} must exclude .log files`,
    );
  }
});

// ---------- 13: both workflows set retention-days: 7 ----------

test("both workflows set `retention-days: 7`", async () => {
  for (const path of [executeWorkflowPath, dryRunWorkflowPath]) {
    const content = await readFile(path, "utf8");
    assert.match(
      content,
      /retention-days:\s*7\b/,
      `${path} must set retention-days: 7`,
    );
  }
});

// ---------- 14: both workflows write to $GITHUB_STEP_SUMMARY ----------

test("both workflows write to `$GITHUB_STEP_SUMMARY`", async () => {
  for (const path of [executeWorkflowPath, dryRunWorkflowPath]) {
    const content = await readFile(path, "utf8");
    assert.match(
      content,
      /\$GITHUB_STEP_SUMMARY/,
      `${path} must append to $GITHUB_STEP_SUMMARY`,
    );
  }
});

// ---------- 15: operator guide mentions dry-run adoption first ----------

test("operator guide says to adopt dry-run workflow first", async () => {
  const content = await readFile(guidePath, "utf8");
  const flat = content.replace(/\s+/g, " ");
  assert.match(
    flat,
    /dry-run.*(first|before)/i,
    "operator guide must instruct adopting the dry-run workflow first",
  );
});

// ---------- 16: operator guide says GitHub status is not canonical truth ----------

test("operator guide says GitHub status is not canonical truth", async () => {
  const content = await readFile(guidePath, "utf8");
  assert.match(content, /GitHub status is not canonical truth/i);
});

// ---------- 17: operator guide says Rekon artifacts remain canonical ----------

test("operator guide says Rekon artifacts remain canonical", async () => {
  const content = await readFile(guidePath, "utf8");
  const flat = content.replace(/\s+/g, " ");
  assert.match(
    flat,
    /Rekon.{0,80}artifacts.{0,40}(remain|are).{0,40}canonical/i,
  );
});

// ---------- 18: operator guide says forked PRs must not receive secret-bearing execution ----------

test("operator guide says forked PRs must not receive secret-bearing execution by default", async () => {
  const content = await readFile(guidePath, "utf8");
  const flat = content.replace(/^\s*>\s?/gm, "").replace(/\s+/g, " ");
  assert.match(
    flat,
    /Forked PRs must not receive secret-bearing execution by default/i,
  );
});

// ---------- 19: troubleshooting covers no VerificationPlan ----------

test("operator guide troubleshooting covers `No VerificationPlan found`", async () => {
  const content = await readFile(guidePath, "utf8");
  assert.match(
    content,
    /No VerificationPlan found/i,
    "troubleshooting must cover the no-plan case",
  );
});

// ---------- 20: troubleshooting covers failed verification command ----------

test("operator guide troubleshooting covers `Verification command failed`", async () => {
  const content = await readFile(guidePath, "utf8");
  assert.match(
    content,
    /Verification command failed/i,
    "troubleshooting must cover the failed-command case",
  );
});

// ---------- 21: troubleshooting covers forked PR secrets ----------

test("operator guide troubleshooting covers `Forked PR needs secrets`", async () => {
  const content = await readFile(guidePath, "utf8");
  assert.match(
    content,
    /Forked PR needs secrets/i,
    "troubleshooting must cover the forked-PR-secrets case",
  );
});

// ---------- 22: CHANGELOG mentions hardening v2 ----------

test("CHANGELOG mentions workflow hardening v2", async () => {
  const content = await readFile(changelogPath, "utf8");
  assert.match(
    content,
    /workflow hardening v2|verification-runner-github-actions-hardening-v2|dry-run workflow template/i,
    "CHANGELOG must mention the workflow hardening v2 slice",
  );
});

// ---------- 23: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  assert.ok(existsSync(reviewPacketPath), `expected review packet at ${reviewPacketPath}`);

  const content = await readFile(reviewPacketPath, "utf8");
  assert.match(
    content,
    /## PURPOSE PRESERVATION CHECK/,
    "review packet must contain PURPOSE PRESERVATION CHECK section",
  );
});

// ---------- Workflow validation helper assertions (P1.1
// github-workflow-safety-validator). The validator is read-only
// and lives at `rekon verify github-workflow validate`.

test("operator guide mentions `rekon verify github-workflow validate`", async () => {
  const content = await readFile(guidePath, "utf8");
  assert.match(
    content,
    /rekon\s+(?:verify\s+)?github-workflow\s+validate|verify github-workflow validate/i,
    "operator guide must mention the workflow validator command",
  );
});

test("both workflow templates include validate-command comment", async () => {
  for (const path of [executeWorkflowPath, dryRunWorkflowPath]) {
    const content = await readFile(path, "utf8");
    assert.match(
      content,
      /verify\s+github-workflow\s+validate/i,
      `${path} must include the validate-command comment`,
    );
  }
});

test("CHANGELOG mentions the workflow validation helper", async () => {
  const content = await readFile(changelogPath, "utf8");
  assert.match(
    content,
    /github-workflow-safety-validator|workflow validation helper|verify github-workflow validate/i,
    "CHANGELOG must mention the workflow validation helper slice",
  );
});
