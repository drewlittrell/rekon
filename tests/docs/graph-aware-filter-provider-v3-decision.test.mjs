// Graph-aware filter provider v3 decision memo — docs
// contract tests. Pins the structure + key assertions of
// the v3 memo so future contributors don't quietly drop a
// required section or weaken the rejection list.

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const strategyDir = join(repoRoot, "docs", "strategy");
const memoPath = join(strategyDir, "graph-aware-filter-provider-v3-decision.md");
const adrPath = join(strategyDir, "issue-governance-architecture-decision.md");
const changelogPath = join(repoRoot, "CHANGELOG.md");

const REQUIRED_HEADINGS = [
  "## Decision Summary",
  "## What v1/v2 Already Cover",
  "## Remaining Classic Checks",
  "## Product Decision Criteria",
  "## Candidate Checks To Port Now",
  "## Candidate Checks That Need Missing Projections First",
  "## Checks To Defer",
  "## Checks To Reject",
  "## Required Artifact Projections",
  "## Implementation Options",
  "## Recommended Next Implementation",
  "## Future Regression Tests",
];

// The work order requires the memo to evaluate ten
// specific remaining classic checks. The wording in the
// memo can vary; these fragments uniquely identify each
// candidate.
const REQUIRED_REMAINING_CHECKS = [
  "UI HTTP provider abstraction",
  "UI hook uses HTTP not DB",
  "Hardcoded config not DDE",
  "Module gate verified caller", // beyond current kind/path
  "Framework-specific route segment config",
  "Factory by capability",
  "Provider boundary",
  "Runtime truth graph",
  "policy-owner",
  "Test / generated / external",
];

test("graph-aware-filter-provider-v3-decision.md exists", () => {
  assert.ok(existsSync(memoPath), `expected v3 memo at ${memoPath}`);
});

test("v3 memo contains every required heading in order", async () => {
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

test("v3 memo Decision Summary names the recommendation", async () => {
  const text = await readFile(memoPath, "utf8");
  const summary = sectionBody(text, "## Decision Summary");
  assert.match(
    summary,
    /do not port a broad v3 catalog/i,
    "Decision Summary must explicitly recommend NOT porting a broad v3 catalog",
  );
  assert.match(
    summary,
    /export.*symbol.*facts/i,
    "Decision Summary must name the export / symbol facts projection as the recommended substrate",
  );
});

test("v3 memo What v1/v2 Already Cover summarizes both slices", async () => {
  const text = await readFile(memoPath, "utf8");
  const section = sectionBody(text, "## What v1/v2 Already Cover");
  // Strip markdown backticks so the fragment match doesn't
  // care whether the memo wraps `EvidenceGraph` in code
  // ticks or not.
  const stripped = section.replace(/`/g, "");
  for (const fragment of [
    "ObservedRepo.files",
    "ObservedSystem.kind",
    "applyFindingGraphFilters",
    "graphContext",
    "route-handler-with-service",
    "route-http-middleware-only",
    "external-api-comment-only",
    "factory-file-creates-deps",
    "module-gate-verified-caller",
    "EvidenceGraph import facts",
    "usedArtifacts",
  ]) {
    assert.ok(
      stripped.includes(fragment),
      `What v1/v2 Already Cover must reference '${fragment}'`,
    );
  }
});

test("v3 memo Remaining Classic Checks evaluates all ten required candidates", async () => {
  const text = await readFile(memoPath, "utf8");
  const section = sectionBody(text, "## Remaining Classic Checks");
  for (const fragment of REQUIRED_REMAINING_CHECKS) {
    assert.ok(
      new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(section),
      `Remaining Classic Checks must evaluate '${fragment}'`,
    );
  }
});

test("v3 memo Product Decision Criteria covers required criteria", async () => {
  const text = await readFile(memoPath, "utf8");
  const section = sectionBody(text, "## Product Decision Criteria");
  for (const fragment of [
    "User value",
    "Evidence quality",
    "Auditability",
    "Scope",
    "Safety",
    "Implementation complexity",
    "Extensibility",
  ]) {
    assert.ok(
      section.includes(fragment),
      `Product Decision Criteria must include '${fragment}'`,
    );
  }
});

test("v3 memo Candidate Checks To Port Now is conservative", async () => {
  const text = await readFile(memoPath, "utf8");
  const section = sectionBody(text, "## Candidate Checks To Port Now");
  // The memo should not endorse aggressive porting. It must
  // either pick zero or at most two candidates that pass the
  // criteria. Anything more is overreach.
  assert.match(
    section,
    /(zero|no graph-aware check ports|at most two)/i,
    "Candidate Checks To Port Now must be conservative (zero or at most two)",
  );
});

test("v3 memo Candidate Checks That Need Missing Projections First names the substrate", async () => {
  const text = await readFile(memoPath, "utf8");
  const section = sectionBody(
    text,
    "## Candidate Checks That Need Missing Projections First",
  );
  assert.match(
    section,
    /export.*symbol.*facts/i,
    "must call out export / symbol facts as a required projection",
  );
});

test("v3 memo Checks To Defer covers deferred candidates", async () => {
  const text = await readFile(memoPath, "utf8");
  const section = sectionBody(text, "## Checks To Defer");
  for (const fragment of [
    "runtime truth graph",
    "capability role",
    "call-graph",
  ]) {
    assert.ok(
      new RegExp(fragment, "i").test(section),
      `Checks To Defer must discuss '${fragment}'`,
    );
  }
});

test("v3 memo Checks To Reject reaffirms permanent rejections", async () => {
  const text = await readFile(memoPath, "utf8");
  const section = sectionBody(text, "## Checks To Reject");
  for (const fragment of [
    /monolithic.*GraphOntologyValidator/i,
    /source-reading/i,
    /(LLM|semantic|fuzzy|embedding)/i,
    /policy-owner/i,
  ]) {
    assert.ok(
      fragment.test(section),
      `Checks To Reject must reaffirm '${fragment}'`,
    );
  }
});

test("v3 memo Required Artifact Projections lists three priority candidates", async () => {
  const text = await readFile(memoPath, "utf8");
  const section = sectionBody(text, "## Required Artifact Projections");
  for (const fragment of [
    /export.*symbol.*facts/i,
    /capability.*role/i,
    /(call-graph|referrer)/i,
  ]) {
    assert.ok(
      fragment.test(section),
      `Required Artifact Projections must include '${fragment}'`,
    );
  }
});

test("v3 memo Implementation Options evaluates all four options", async () => {
  const text = await readFile(memoPath, "utf8");
  const section = sectionBody(text, "## Implementation Options");
  // Options A/B/C/D — kernel helper, built-in capability,
  // external rule pack, wait-for-projections.
  for (const fragment of [
    /A\.\s/,
    /B\.\s/,
    /C\.\s/,
    /D\.\s/,
    /kernel-findings/i,
    /capability/i,
    /external.*rule.*pack/i,
  ]) {
    assert.ok(
      fragment.test(section),
      `Implementation Options must evaluate option matching '${fragment}'`,
    );
  }
});

test("v3 memo Recommended Next Implementation is concrete + justified", async () => {
  const text = await readFile(memoPath, "utf8");
  const section = sectionBody(text, "## Recommended Next Implementation");
  assert.match(
    section,
    /export.*symbol.*facts.*projection.*v1/i,
    "Recommended Next Implementation must explicitly name the export / symbol facts projection v1",
  );
  // The memo must justify the substrate-first decision.
  assert.match(
    section,
    /(substrate|unblocks|projection)/i,
    "Recommended Next Implementation must justify the substrate-first decision",
  );
});

test("v3 memo says NOT to port a monolithic GraphOntologyValidator", async () => {
  const text = await readFile(memoPath, "utf8");
  assert.ok(
    /(do not port|never port|reject)[\s\S]*?monolithic[\s\S]*?GraphOntologyValidator/i.test(text)
      || /monolithic[\s\S]*?GraphOntologyValidator[\s\S]*?(reject|never port|do not port)/i.test(text),
    "memo must explicitly state we do not port GraphOntologyValidator as a monolithic service",
  );
});

test("ADR Implementation Order references the v3 decision memo", async () => {
  const text = await readFile(adrPath, "utf8");
  // Allow whitespace (including newlines) inside the phrase
  // — the ADR wraps long entries across lines.
  assert.ok(
    /Graph-aware filter provider v3\s+decision memo/.test(text),
    "ADR must reference the v3 decision memo",
  );
  assert.ok(
    /\(shipped\)[\s\S]*?Graph-aware filter provider v3\s+decision memo/.test(text),
    "ADR must mark the v3 decision memo as shipped",
  );
  assert.match(
    text,
    /export[\s\S]*?symbol[\s\S]*?facts[\s\S]*?projection/i,
    "ADR must queue the export / symbol facts projection as the next substrate step",
  );
});

test("CHANGELOG mentions the v3 decision memo", async () => {
  const text = await readFile(changelogPath, "utf8");
  assert.match(
    text,
    /graph-aware filter provider v3 decision memo/i,
    "CHANGELOG must include the v3 decision memo entry",
  );
  // CHANGELOG should preserve the rejection list.
  assert.match(
    text,
    /GraphOntologyValidator/,
    "CHANGELOG entry must reaffirm the monolithic-validator rejection context",
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
