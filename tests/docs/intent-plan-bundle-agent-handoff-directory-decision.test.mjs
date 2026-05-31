// Docs tests for the Intent Plan Bundle / Agent Handoff Directory Decision
// (slice 95).
//
// Gate the decision memo's headings, selection, boundary statements, and tables,
// plus the CHANGELOG entry and review packet. The CHANGELOG assertion fails until
// the bulk doc update lands the real entry.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (rel) => readFileSync(resolve(repoRoot, rel), "utf8");
const norm = (text) => text.replace(/[`*]/g, "").replace(/\s+/g, " ");

const memoRaw = read("docs/strategy/intent-plan-bundle-agent-handoff-directory-decision.md");
const memo = norm(memoRaw);
const changelog = norm(read("CHANGELOG.md"));
const packet = read(".rekon-dev/review-packets/intent-plan-bundle-agent-handoff-directory-decision.md");

// ---------- 1 ----------
test("decision memo exists with title", () => {
  assert.match(memoRaw, /# Intent Plan Bundle \/ Agent Handoff Directory Decision/);
});

// ---------- 2 ----------
test("doc contains all required headings", () => {
  const headings = [
    "## Decision Summary",
    "## Why This Decision Exists",
    "## Current Boundary",
    "## Options Considered",
    "## Recommendation",
    "## Directory Model",
    "## Manifest Model",
    "## Human-Readable Files",
    "## Agent Handoff Files",
    "## Staleness And Provenance Model",
    "## Source Control Policy",
    "## Boundary Model",
    "## What This Does Not Do",
    "## Implementation Sequence",
  ];
  for (const heading of headings) assert.ok(memoRaw.includes(heading), `missing heading: ${heading}`);
});

// ---------- 3 ----------
test("doc selects the .rekon/intent/plans/<intent-id>/ bundle", () => {
  assert.match(memo, /selects the repo-local plan bundle directory \.rekon\/intent\/plans\/<intent-id>\//);
});

// ---------- 4 ----------
test("doc says the bundle is a projection, not canonical artifact truth", () => {
  assert.match(memo, /Intent plan bundle is a projection, not canonical artifact truth/);
});

// ---------- 5 ----------
test("doc says canonical source of truth remains .rekon/artifacts/", () => {
  assert.match(memo, /Canonical source of truth remains \.rekon\/artifacts\//);
});

// ---------- 6 ----------
test("doc says bundles live under .rekon/intent/plans/<intent-id>/ by default", () => {
  assert.match(memo, /Intent plan bundles live under \.rekon\/intent\/plans\/<intent-id>\/ by default/);
});

// ---------- 7 ----------
test("doc says agent handoff files live under agent/ inside the bundle", () => {
  assert.match(memo, /Agent handoff files live under agent\/ inside the bundle/);
});

// ---------- 8 ----------
test("doc says bundle generation must not execute commands", () => {
  assert.match(memo, /Bundle generation must not execute commands/);
});

// ---------- 9 ----------
test("doc says bundle generation must not write source files", () => {
  assert.match(memo, /Bundle generation must not write source files/);
});

// ---------- 10 ----------
test("doc says bundle generation must not implement intent:go", () => {
  assert.match(memo, /Bundle generation must not implement intent:go/);
});

// ---------- 11 ----------
test("doc says stale bundles must not be treated as current handoff", () => {
  assert.match(memo, /Stale bundles must not be treated as current handoff/);
});

// ---------- 12 ----------
test("doc includes the option table", () => {
  assert.match(memoRaw, /\| Option \| Decision \| Reason \|/);
});

// ---------- 13 ----------
test("doc includes the file table", () => {
  assert.match(memoRaw, /\| File \| Audience \| Purpose \|/);
});

// ---------- 14 ----------
test("doc includes the boundary table", () => {
  assert.match(memoRaw, /\| Boundary \| Decision \|/);
});

// ---------- 15 ----------
test("doc includes the staleness table", () => {
  assert.match(memoRaw, /\| Staleness Signal \| Bundle Behavior \|/);
});

// ---------- 16 ----------
test("CHANGELOG mentions the Intent Plan Bundle / Agent Handoff Directory Decision", () => {
  assert.match(changelog, /Intent Plan Bundle \/ Agent Handoff Directory Decision/);
});

// ---------- 17 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.match(packet, /PURPOSE PRESERVATION CHECK/);
});
