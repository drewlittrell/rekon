// Verification runner v1 decision — docs contract
// tests. Pins the memo's structure + key
// recommendations so future contributors cannot
// quietly drop a required section, flip the
// recommendation, weaken the safety contract, lose
// the artifact-model decision, or lose a
// cross-reference from a supporting doc.

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const strategyDir = join(repoRoot, "docs", "strategy");
const memoPath = join(strategyDir, "verification-runner-v1-decision.md");
const changelogPath = join(repoRoot, "CHANGELOG.md");
const reviewPacketPath = join(
  repoRoot,
  ".rekon-dev",
  "review-packets",
  "verification-runner-v1-decision.md",
);

const REQUIRED_HEADINGS = [
  "## Decision Summary",
  "## Problem",
  "## Current Rekon Proof Loop",
  "## Classic Workflow Guarantee",
  "## Options Considered",
  "## Recommendation",
  "## Artifact Model",
  "## Safety Contract",
  "## Permission Boundary",
  "## CLI Shape",
  "## Log And Secret Handling",
  "## Timeout And Process Model",
  "## Retry Policy",
  "## Implementation Sequence",
  "## What This Does Not Do",
  "## Tests Required For Implementation",
];

// ---------- Test 1: memo exists ----------

test("verification-runner-v1-decision.md exists", () => {
  assert.ok(existsSync(memoPath), `expected memo at ${memoPath}`);
});

// ---------- Test 2: required headings in order ----------

test("memo contains every required heading in order", async () => {
  const text = await readFile(memoPath, "utf8");
  let cursor = 0;
  for (const heading of REQUIRED_HEADINGS) {
    const idx = text.indexOf(heading, cursor);
    assert.notEqual(
      idx,
      -1,
      `expected heading '${heading}' after position ${cursor} in ${memoPath}`,
    );
    cursor = idx + heading.length;
  }
});

// ---------- Test 3: recommends Option C / hybrid opt-in runner ----------

test("memo recommends Option C / hybrid opt-in runner", async () => {
  const text = await readFile(memoPath, "utf8");
  const stripped = text.replace(/\*\*/g, "").replace(/`/g, "");
  const summary = sectionBody(stripped, "## Decision Summary");
  assert.match(
    summary,
    /option\s*c/i,
    "Decision Summary must reference Option C",
  );
  assert.match(
    summary,
    /hybrid opt-in/i,
    "Decision Summary must describe the hybrid opt-in runner",
  );
  const recommendation = sectionBody(stripped, "## Recommendation");
  assert.match(
    recommendation,
    /option\s*c/i,
    "Recommendation must reference Option C",
  );
});

// ---------- Test 4: manual `rekon verify record` remains supported ----------

test("memo says manual `rekon verify record` remains supported", async () => {
  const text = await readFile(memoPath, "utf8");
  const collapsed = text.replace(/[\s>*`]+/g, " ");
  assert.match(
    collapsed,
    /rekon verify record .*(remains|stays|continues|preserves|kept)/i,
    "memo must say manual `rekon verify record` is preserved",
  );
});

// ---------- Test 5: memo recommends new VerificationRun artifact ----------

test("memo recommends a new VerificationRun sibling artifact", async () => {
  const text = await readFile(memoPath, "utf8");
  assert.match(
    text,
    /VerificationRun/,
    "memo must reference VerificationRun",
  );
  const artifactSection = sectionBody(text, "## Artifact Model");
  assert.match(
    artifactSection,
    /VerificationRun/,
    "Artifact Model section must mention VerificationRun",
  );
  assert.match(
    artifactSection,
    /sibling/i,
    "Artifact Model section must describe VerificationRun as a sibling artifact",
  );
});

// ---------- Test 6: memo says VerificationResult remains proof summary ----------

test("memo says VerificationResult remains the proof summary", async () => {
  const text = await readFile(memoPath, "utf8");
  const collapsed = text.replace(/[\s>*`]+/g, " ");
  assert.match(
    collapsed,
    /VerificationResult remains the proof summary/i,
    "memo must explicitly say VerificationResult remains the proof summary",
  );
});

// ---------- Test 7: no execution during `rekon refresh` ----------

test("memo says no command execution during `rekon refresh`", async () => {
  const text = await readFile(memoPath, "utf8");
  const collapsed = text.replace(/[\s>*`]+/g, " ");
  assert.match(
    collapsed,
    /no (command )?execution (occurs )?during rekon refresh/i,
    "memo must explicitly forbid execution during `rekon refresh`",
  );
});

// ---------- Test 8: execution requires explicit `--execute` ----------

test("memo says execution requires explicit `--execute`", async () => {
  const text = await readFile(memoPath, "utf8");
  assert.match(
    text,
    /--execute/,
    "memo must mention the `--execute` flag",
  );
  const safetySection = sectionBody(text, "## Safety Contract");
  assert.match(
    safetySection,
    /--execute/,
    "Safety Contract must require `--execute` for execution",
  );
});

// ---------- Test 9: no auto-resolution / no auto-apply ----------

test("memo says no auto-resolution and no auto-apply", async () => {
  const text = await readFile(memoPath, "utf8");
  const collapsed = text.replace(/[\s>*`]+/g, " ");
  assert.match(
    collapsed,
    /(no auto-resolution|does not auto-resolve|never auto-resolve)/i,
    "memo must say no auto-resolution",
  );
  assert.match(
    collapsed,
    /(no auto-apply|does not (auto-)?apply|never applies reconciliation)/i,
    "memo must say no auto-apply",
  );
});

// ---------- Test 10: mentions @rekon/capability-verify ----------

test("memo mentions @rekon/capability-verify package", async () => {
  const text = await readFile(memoPath, "utf8");
  assert.match(
    text,
    /@rekon\/capability-verify/,
    "memo must mention the @rekon/capability-verify package",
  );
});

// ---------- Test 11: mentions execute:verification permission ----------

test("memo mentions execute:verification permission", async () => {
  const text = await readFile(memoPath, "utf8");
  assert.match(
    text,
    /execute:verification/,
    "memo must mention the execute:verification permission",
  );
});

// ---------- Test 12: mentions log redaction ----------

test("memo mentions log redaction policy", async () => {
  const text = await readFile(memoPath, "utf8");
  const collapsed = text.replace(/[\s>*`]+/g, " ");
  assert.match(
    collapsed,
    /redact/i,
    "memo must mention redaction",
  );
  const logSection = sectionBody(text, "## Log And Secret Handling");
  assert.ok(logSection.length > 0, "Log And Secret Handling section must exist");
  assert.match(
    logSection,
    /redact/i,
    "Log And Secret Handling section must describe redaction",
  );
});

// ---------- Test 13: mentions stdout/stderr digests ----------

test("memo mentions stdout/stderr digests", async () => {
  const text = await readFile(memoPath, "utf8");
  assert.match(
    text,
    /stdout(Digest)?/i,
    "memo must mention stdout / stdoutDigest",
  );
  assert.match(
    text,
    /stderr(Digest)?/i,
    "memo must mention stderr / stderrDigest",
  );
});

// ---------- Test 14: mentions timeout / killed / process tree ----------

test("memo mentions timeout / killed / process tree", async () => {
  const text = await readFile(memoPath, "utf8");
  const collapsed = text.replace(/[\s>*`]+/g, " ");
  const timeoutSection = sectionBody(text, "## Timeout And Process Model");
  assert.ok(timeoutSection.length > 0, "Timeout And Process Model section must exist");
  for (const fragment of [
    /timeout/i,
    /killed/i,
    /process tree/i,
  ]) {
    assert.match(
      timeoutSection,
      fragment,
      `Timeout And Process Model section must reference ${fragment}`,
    );
  }
  assert.match(
    collapsed,
    /SIGTERM/,
    "memo must mention SIGTERM",
  );
  assert.match(
    collapsed,
    /SIGKILL/,
    "memo must mention SIGKILL",
  );
});

// ---------- Test 15: no automatic retries in v1 ----------

test("memo says no automatic retries in v1", async () => {
  const text = await readFile(memoPath, "utf8");
  const collapsed = text.replace(/[\s>*`]+/g, " ");
  assert.match(
    collapsed,
    /no automatic retries in v1/i,
    "memo must say `No automatic retries in v1`",
  );
});

// ---------- Test 16: implementation sequence listed ----------

test("memo lists the implementation sequence with numbered steps", async () => {
  const text = await readFile(memoPath, "utf8");
  const sequenceSection = sectionBody(text, "## Implementation Sequence");
  assert.ok(sequenceSection.length > 0, "Implementation Sequence section must exist");
  for (const step of ["1.", "2.", "3.", "4.", "5.", "6.", "7."]) {
    assert.ok(
      sequenceSection.includes(step),
      `Implementation Sequence must include step '${step}'`,
    );
  }
  // Step content checks — verifies the major
  // sequence beats are present.
  assert.match(
    sequenceSection,
    /VerificationRun`?\s*artifact type/i,
    "step 1 must describe adding the VerificationRun artifact type",
  );
  assert.match(
    sequenceSection,
    /@rekon\/capability-verify/i,
    "Implementation Sequence must reference @rekon/capability-verify",
  );
  assert.match(
    sequenceSection,
    /dry-run/i,
    "Implementation Sequence must describe a dry-run step",
  );
  assert.match(
    sequenceSection,
    /opt-in execution/i,
    "Implementation Sequence must describe opt-in execution",
  );
});

// ---------- Test 17: CHANGELOG mentions the decision ----------

test("CHANGELOG mentions the verification runner v1 decision", async () => {
  const text = await readFile(changelogPath, "utf8");
  assert.match(
    text,
    /verification runner v1 decision|verification-runner-v1-decision/i,
    "CHANGELOG must include the verification runner v1 decision entry",
  );
});

// ---------- Test 18: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  assert.ok(
    existsSync(reviewPacketPath),
    `expected review packet at ${reviewPacketPath}`,
  );
  const text = await readFile(reviewPacketPath, "utf8");
  assert.match(
    text,
    /## PURPOSE PRESERVATION CHECK/,
    "review packet must include the PURPOSE PRESERVATION CHECK heading",
  );
});

// ---------- helpers ----------

function sectionBody(text, heading) {
  const start = text.indexOf(heading);
  if (start === -1) return "";
  const afterHeading = start + heading.length;
  const nextHeadingMatch = text.slice(afterHeading).search(/\n## [^\n]/);
  if (nextHeadingMatch === -1) return text.slice(afterHeading);
  return text.slice(afterHeading, afterHeading + nextHeadingMatch);
}
