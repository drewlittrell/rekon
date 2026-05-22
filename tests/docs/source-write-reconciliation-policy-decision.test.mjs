// Docs contract tests for the Source-Write Reconciliation
// Policy Decision Memo — first of three beta blockers
// identified by the beta-readiness review.

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
  "source-write-reconciliation-policy-decision.md",
);
const changelogPath = join(repoRoot, "CHANGELOG.md");
const reviewPacketPath = join(
  repoRoot,
  ".rekon-dev",
  "review-packets",
  "source-write-reconciliation-policy-decision.md",
);

async function readMemo() {
  return readFile(memoPath, "utf8");
}

async function readMemoFlat() {
  const content = await readFile(memoPath, "utf8");
  return content.replace(/\s+/g, " ");
}

// ---------- 1: memo exists ----------

test("source-write reconciliation policy decision memo exists", () => {
  assert.ok(existsSync(memoPath), `expected memo at ${memoPath}`);
});

// ---------- 2: required headings ----------

test("source-write memo contains all required headings", async () => {
  const content = await readMemo();
  const required = [
    "## Decision Summary",
    "## Why This Decision Exists",
    "## Current Reconciliation Model",
    "## Classic Goal Reviewed",
    "## Options Considered",
    "## Recommendation",
    "## Source-Write Boundary",
    "## Preview Requirement",
    "## Operator Confirmation Requirement",
    "## Verification Requirement",
    "## Rollback Requirement",
    "## Artifact Trail",
    "## Permission Model",
    "## What This Does Not Do",
    "## Implementation Sequence",
  ];
  for (const heading of required) {
    assert.ok(
      content.includes(heading),
      `source-write memo missing required heading: ${heading}`,
    );
  }
});

// ---------- 3: pinned reminder — apply not required for beta, boundary is ----------

test("memo pins: source-write apply is not required for beta, but the policy boundary is", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /Source-write apply is not required for beta, but the policy boundary is required for beta/i,
  );
});

// ---------- 4: pinned reminder — no agent-autonomous source writes ----------

test("memo pins: no agent-autonomous source writes", async () => {
  const flat = await readMemoFlat();
  assert.match(flat, /No agent-autonomous source writes/i);
});

// ---------- 5: pinned reminder — preview + explicit confirmation ----------

test("memo pins: every future source-write apply must be preceded by exact diff preview and explicit operator confirmation", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /Every future source-write apply must be preceded by exact diff preview and explicit operator confirmation/i,
  );
});

// ---------- 6: pinned reminder — successful apply does not auto-resolve findings ----------

test("memo pins: a successful apply must not automatically resolve findings", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /successful apply must not automatically resolve findings[\s\S]{0,200}lifecycle ?\/ ?status updates remain explicit artifacts/i,
  );
});

// ---------- 7: Option C is recommended ----------

test("memo recommends Option C (preview-first, apply deferred post-beta)", async () => {
  const content = await readMemo();
  assert.match(
    content,
    /Option C[\s\S]{0,400}recommended/i,
  );
  assert.match(
    content,
    /Recommendation:[\s\S]{0,200}Option C/i,
  );
});

// ---------- 8: policy diagnostic table ----------

test("memo includes the policy diagnostic table", async () => {
  const content = await readMemo();
  for (const row of [
    /\|\s*Policy Area\s*\|\s*Decision\s*\|/,
    /Beta source-write apply\s*\|\s*deferred/i,
    /Preview\s*\|\s*exact diff required/i,
    /Confirmation\s*\|\s*explicit operator command required/i,
    /Verification\s*\|\s*post-apply mandatory/i,
    /Rollback\s*\|\s*required before implementation/i,
    /Artifact trail\s*\|\s*ReconciliationApplyReport reserved/i,
    /Permission\s*\|\s*source:write reserved/i,
    /Agent autonomy\s*\|\s*no autonomous source writes/i,
  ]) {
    assert.match(
      content,
      row,
      `policy diagnostic table missing row matching ${row}`,
    );
  }
});

// ---------- 9: operation-class diagnostic table ----------

test("memo includes the operation-class diagnostic table", async () => {
  const content = await readMemo();
  for (const row of [
    /\|\s*Operation Class\s*\|\s*Beta Decision\s*\|/,
    /artifact-only reconciliation\s*\|\s*allowed/i,
    /deterministic source patch\s*\|\s*preview only/i,
    /generated file creation\s*\|\s*preview only/i,
    /command execution\s*\|\s*verification runner only/i,
    /ambiguous ?\/ ?manual remediation\s*\|\s*manual only/i,
  ]) {
    assert.match(
      content,
      row,
      `operation-class diagnostic table missing row matching ${row}`,
    );
  }
});

// ---------- 10: risk diagnostic table ----------

test("memo includes the risk diagnostic table", async () => {
  const content = await readMemo();
  for (const row of [
    /\|\s*Risk\s*\|\s*Guardrail\s*\|/,
    /corrupting source\s*\|\s*preview \+ explicit confirmation \+ rollback/i,
    /hidden agent writes\s*\|\s*no autonomous source writes/i,
    /failed verification\s*\|\s*post-apply VerificationResult required/i,
    /false resolution\s*\|\s*no automatic status change/i,
    /irreversible patch\s*\|\s*apply forbidden until rollback model exists/i,
  ]) {
    assert.match(
      content,
      row,
      `risk diagnostic table missing row matching ${row}`,
    );
  }
});

// ---------- 11: ReconciliationApplyReport artifact name reserved ----------

test("memo reserves the ReconciliationApplyReport artifact name", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /Reserved artifact name[\s\S]{0,80}ReconciliationApplyReport/i,
  );
});

// ---------- 12: source:write permission name reserved ----------

test("memo reserves the source:write permission name", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /Reserved permission name[\s\S]{0,80}source:write/i,
  );
});

// ---------- 13: implementation sequence with correct ordering ----------

test("memo includes the implementation sequence with the correct ordering", async () => {
  const content = await readMemo();
  for (const row of [
    /\|\s*Step\s*\|\s*Slice\s*\|\s*Status\s*\|/,
    /\|\s*1\s*\|[\s\S]{0,200}policy decision memo[\s\S]{0,80}Shipped/i,
    /\|\s*2\s*\|[\s\S]{0,200}Watcher ?\/ ?path freshness/i,
    /\|\s*3\s*\|[\s\S]{0,200}release readiness checklist/i,
    /\|\s*4\s*\|[\s\S]{0,200}[Bb]eta release execution/i,
    /\|\s*5\s*\|[\s\S]{0,200}[Pp]atch preview/i,
    /\|\s*6\s*\|[\s\S]{0,200}[Aa]pply permission/i,
    /\|\s*7\s*\|[\s\S]{0,200}[Aa]pply implementation/i,
    /\|\s*8\s*\|[\s\S]{0,200}[Ss]ource-write safety review/i,
  ]) {
    assert.match(
      content,
      row,
      `implementation sequence missing row matching ${row}`,
    );
  }
});

// ---------- 14: next slice is watcher / path freshness ----------

test("memo says the next slice is the watcher / path freshness policy decision memo", async () => {
  const flat = await readMemoFlat();
  assert.match(
    flat,
    /next slice is the watcher ?\/ ?path freshness policy decision memo/i,
  );
});

// ---------- 15: "what this does not do" lists the right exclusions ----------

test("memo's What This Does Not Do section lists source-write, apply, permission, and artifact-type exclusions", async () => {
  const content = await readMemo();
  const notDoSection = content.split("## What This Does Not Do")[1] ?? "";
  assert.ok(
    notDoSection.length > 0,
    "What This Does Not Do section not found",
  );
  for (const phrase of [
    /Implement source writes/i,
    /reconcile apply/i,
    /source:write/i,
    /ReconciliationApplyReport/i,
    /Auto-resolve findings/i,
    /Auto-apply reconciliation operations/i,
  ]) {
    assert.match(
      notDoSection,
      phrase,
      `What This Does Not Do section missing exclusion matching ${phrase}`,
    );
  }
});

// ---------- 16: classic goal preservation ----------

test("memo preserves the classic remediation goal as the future apply contract", async () => {
  const flat = await readMemoFlat();
  assert.match(flat, /codebase-intel-classic/i);
  assert.match(flat, /PlanExecutorService/i);
  assert.match(
    flat,
    /controlled movement from diagnosis to safe remediation with traceability/i,
  );
});

// ---------- 17: CHANGELOG mention ----------

test("CHANGELOG mentions the source-write reconciliation policy decision", async () => {
  const content = await readFile(changelogPath, "utf8");
  assert.match(
    content,
    /(source-write-reconciliation-policy-decision|Source-Write Reconciliation Policy Decision|source-write reconciliation policy)/i,
  );
});

// ---------- 18: review packet PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  assert.ok(
    existsSync(reviewPacketPath),
    `expected review packet at ${reviewPacketPath}`,
  );
  const content = await readFile(reviewPacketPath, "utf8");
  assert.match(content, /## PURPOSE PRESERVATION CHECK/);
});
