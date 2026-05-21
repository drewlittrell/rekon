// Docs tests for the GitHub Actions workflow template after
// the `rekon artifacts latest` helper landed (P1.1
// artifacts-latest-cli-helper).
//
// Pins that the workflow template now uses the helper instead
// of inline Node snippets for latest-artifact id resolution.

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const workflowPath = join(
  repoRoot,
  "docs",
  "examples",
  "workflows",
  "rekon-verification.yml",
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
  "artifacts-latest-cli-helper.md",
);

// ---------- 1: workflow uses artifacts latest --type VerificationPlan ----------

test("workflow uses `artifacts latest --type VerificationPlan`", async () => {
  const content = await readFile(workflowPath, "utf8");
  // Normalize whitespace so multi-line bash continuations match.
  const flat = content.replace(/\s+/g, " ");
  assert.match(
    flat,
    /artifacts latest [^|]*--type VerificationPlan/,
    "workflow must invoke `artifacts latest --type VerificationPlan`",
  );
});

// ---------- 2: workflow uses artifacts latest --type VerificationRun ----------

test("workflow uses `artifacts latest --type VerificationRun`", async () => {
  const content = await readFile(workflowPath, "utf8");
  const flat = content.replace(/\s+/g, " ");
  assert.match(
    flat,
    /artifacts latest [^|]*--type VerificationRun/,
    "workflow must invoke `artifacts latest --type VerificationRun`",
  );
});

// ---------- 3: workflow resolves VerificationResult correctly ----------

test("workflow resolves VerificationResult lookup correctly", async () => {
  const content = await readFile(workflowPath, "utf8");
  // Either invokes `artifacts latest --type VerificationResult`
  // directly OR clearly explains why no direct VerificationResult
  // lookup is needed (the existing workflow chains plan → run →
  // from-run, so the result id is implicit in the from-run step).
  const directLookup = /artifacts latest [^|]*--type VerificationResult/.test(
    content.replace(/\s+/g, " "),
  );
  const explanationPresent = /verify result from-run/.test(content);
  assert.ok(
    directLookup || explanationPresent,
    "workflow must either use `artifacts latest --type VerificationResult` or chain through verify result from-run",
  );
});

// ---------- 4: workflow uses artifacts latest --type Publication --kind proof-report ----------

test("workflow uses `artifacts latest --type Publication --kind proof-report`", async () => {
  const content = await readFile(workflowPath, "utf8");
  const flat = content.replace(/\s+/g, " ");
  assert.match(
    flat,
    /artifacts latest [^|]*--type Publication [^|]*--kind proof-report/,
    "workflow must invoke `artifacts latest --type Publication --kind proof-report`",
  );
});

// ---------- 5: workflow no longer uses inline `node - <<'NODE'` for id resolution ----------

test("workflow no longer uses inline `node - <<'NODE'` snippets for id resolution", async () => {
  const content = await readFile(workflowPath, "utf8");
  assert.equal(
    content.includes("node - <<'NODE'"),
    false,
    "workflow must not contain inline `node - <<'NODE'` snippets after the latest-helper slice",
  );
});

// ---------- 6: docs mention rekon artifacts latest ----------

test("operator guide mentions `rekon artifacts latest`", async () => {
  const content = await readFile(guidePath, "utf8");
  assert.match(
    content,
    /rekon artifacts latest/,
    "operator guide must mention `rekon artifacts latest`",
  );
});

// ---------- 7: docs say the helper is read-only ----------

test("operator guide says the helper is read-only", async () => {
  const content = await readFile(guidePath, "utf8");
  const flat = content.replace(/\s+/g, " ");
  assert.match(
    flat,
    /read-only/i,
    "operator guide must say the helper is read-only",
  );
});

// ---------- 8: CHANGELOG mentions latest-artifact helper ----------

test("CHANGELOG mentions the latest-artifact CLI helper", async () => {
  const content = await readFile(changelogPath, "utf8");
  assert.match(
    content,
    /artifacts latest|latest-artifact CLI helper|latest artifact CLI helper/i,
    "CHANGELOG must mention the latest-artifact helper slice",
  );
});

// ---------- 9: review packet exists and contains PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  assert.ok(existsSync(reviewPacketPath), `expected review packet at ${reviewPacketPath}`);

  const content = await readFile(reviewPacketPath, "utf8");
  assert.match(
    content,
    /## PURPOSE PRESERVATION CHECK/,
    "review packet must contain PURPOSE PRESERVATION CHECK section",
  );
});
