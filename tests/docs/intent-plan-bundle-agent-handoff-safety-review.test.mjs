// Docs tests for the Intent Plan Bundle / Agent Handoff Safety Review (slice 97).
//
// Gate the safety-review memo's required headings, boundary statements, and
// tables, plus the CHANGELOG entry and review packet. The CHANGELOG assertion
// fails until the bulk doc update lands the real entry.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (rel) => readFileSync(resolve(repoRoot, rel), "utf8");
const norm = (text) => text.replace(/[`*]/g, "").replace(/\s+/g, " ");

const memoRaw = read("docs/strategy/intent-plan-bundle-agent-handoff-safety-review.md");
const memo = norm(memoRaw);
const changelog = norm(read("CHANGELOG.md"));
const packet = read(".rekon-dev/review-packets/intent-plan-bundle-agent-handoff-safety-review.md");

// ---------- 1 ----------
test("safety review doc exists with title", () => {
  assert.match(memoRaw, /# Intent Plan Bundle \/ Agent Handoff Safety Review/);
});

// ---------- 2 ----------
test("doc contains all required headings", () => {
  const headings = [
    "## Decision Summary",
    "## Why This Review Exists",
    "## Helper And CLI Reviewed",
    "## Directory Boundary Review",
    "## Path Safety Review",
    "## Manifest Review",
    "## Human-Readable File Review",
    "## Agent Handoff File Review",
    "## Staleness / Provenance Review",
    "## Canonical Artifact Boundary Review",
    "## Command / Source-Write Boundary Review",
    "## Intent Go Boundary Review",
    "## Options Considered",
    "## Recommendation",
    "## What This Does Not Do",
    "## Follow-Up Work",
  ];
  for (const heading of headings) assert.ok(memoRaw.includes(heading), `missing heading: ${heading}`);
});

// ---------- 3 ----------
test("doc says the bundle is a projection, not canonical artifact truth", () => {
  assert.match(memo, /Intent plan bundle is a projection, not canonical artifact truth/);
});

// ---------- 4 ----------
test("doc says canonical source of truth remains .rekon/artifacts/", () => {
  assert.match(memo, /Canonical source of truth remains \.rekon\/artifacts\//);
});

// ---------- 5 ----------
test("doc says bundles live under .rekon/intent/plans/<intent-id>/ by default", () => {
  assert.match(memo, /Intent plan bundles live under \.rekon\/intent\/plans\/<intent-id>\/ by default/);
});

// ---------- 6 ----------
test("doc says agent handoff files live under agent/ inside the bundle", () => {
  assert.match(memo, /Agent handoff files live under agent\/ inside the bundle/);
});

// ---------- 7 ----------
test("doc says bundle generation writes only under .rekon/intent/plans/<intent-id>/", () => {
  assert.match(memo, /Bundle generation writes only under \.rekon\/intent\/plans\/<intent-id>\//);
});

// ---------- 8 ----------
test("doc says bundle generation does not create canonical artifacts", () => {
  assert.match(memo, /Bundle generation does not create canonical artifacts/);
});

// ---------- 9 ----------
test("doc says bundle generation does not execute commands", () => {
  assert.match(memo, /Bundle generation does not execute commands/);
});

// ---------- 10 ----------
test("doc says bundle generation does not write source files", () => {
  assert.match(memo, /Bundle generation does not write source files/);
});

// ---------- 11 ----------
test("doc says bundle generation does not implement intent:go", () => {
  assert.match(memo, /Bundle generation does not implement intent:go/);
});

// ---------- 12 ----------
test("doc says stale bundles must not be treated as current handoff", () => {
  assert.match(memo, /Stale bundles must not be treated as current handoff/);
});

// ---------- 13 ----------
test("doc says VerificationRun and VerificationResult are optional proof context", () => {
  assert.match(memo, /VerificationRun and VerificationResult are optional proof context, not prerequisites for bundle generation/);
});

// ---------- 14 ----------
test("doc includes the surface table", () => {
  assert.match(memoRaw, /\| Surface \| Status \| Boundary \|/);
});

// ---------- 15 ----------
test("doc includes the file table", () => {
  assert.match(memoRaw, /\| File \| Status \| Safety Review \|/);
});

// ---------- 16 ----------
test("doc includes the boundary table", () => {
  assert.match(memoRaw, /\| Boundary \| Decision \|/);
});

// ---------- 17 ----------
test("doc includes the path safety table", () => {
  assert.match(memoRaw, /\| Path Risk \| V1 Safety \|/);
});

// ---------- 18 ----------
test("doc includes the option table", () => {
  assert.match(memoRaw, /\| Option \| Decision \| Reason \|/);
});

// ---------- 19 ----------
test("CHANGELOG mentions the Intent Plan Bundle / Agent Handoff Safety Review", () => {
  assert.match(changelog, /Intent Plan Bundle \/ Agent Handoff Safety Review/);
});

// ---------- 20 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.match(packet, /PURPOSE PRESERVATION CHECK/);
});
