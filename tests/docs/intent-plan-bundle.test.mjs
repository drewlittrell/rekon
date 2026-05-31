// Docs tests for the Intent Plan Bundle capability (slice 96).
//
// Gate the concept doc, CHANGELOG entry, and review packet. The CHANGELOG
// assertion fails until the bulk doc update lands the real entry.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (rel) => readFileSync(resolve(repoRoot, rel), "utf8");
const norm = (text) => text.replace(/[`*]/g, "").replace(/\s+/g, " ");

const concept = norm(read("docs/concepts/intent-plan-bundle.md"));
const changelog = norm(read("CHANGELOG.md"));
const packet = read(".rekon-dev/review-packets/intent-plan-bundle-agent-handoff-v1.md");

// ---------- 1 ----------
test("concept doc exists with title", () => {
  assert.match(concept, /Intent Plan Bundle/);
});

// ---------- 2 ----------
test("doc says the bundle is a projection, not canonical artifact truth", () => {
  assert.match(concept, /Intent plan bundle is a projection, not canonical artifact truth/);
});

// ---------- 3 ----------
test("doc says canonical source of truth remains .rekon/artifacts/", () => {
  assert.match(concept, /Canonical source of truth remains \.rekon\/artifacts\//);
});

// ---------- 4 ----------
test("doc says bundles live under .rekon/intent/plans/<intent-id>/ by default", () => {
  assert.match(concept, /Intent plan bundles live under \.rekon\/intent\/plans\/<intent-id>\/ by default/);
});

// ---------- 5 ----------
test("doc says agent handoff files live under agent/ inside the bundle", () => {
  assert.match(concept, /Agent handoff files live under agent\/ inside the bundle/);
});

// ---------- 6 ----------
test("doc says bundle generation must not execute commands", () => {
  assert.match(concept, /Bundle generation must not execute commands/);
});

// ---------- 7 ----------
test("doc says bundle generation must not write source files", () => {
  assert.match(concept, /Bundle generation must not write source files/);
});

// ---------- 8 ----------
test("doc says bundle generation must not implement intent:go", () => {
  assert.match(concept, /Bundle generation must not implement intent:go/);
});

// ---------- 9 ----------
test("doc says stale bundles must not be treated as current handoff", () => {
  assert.match(concept, /Stale bundles must not be treated as current handoff/);
});

// ---------- 10 ----------
test("CHANGELOG records the Intent Plan Bundle / Agent Handoff Implementation", () => {
  assert.match(changelog, /Intent Plan Bundle \/ Agent Handoff Implementation/);
  assert.match(changelog, /intent bundle write/);
});

// ---------- 11 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.match(packet, /PURPOSE PRESERVATION CHECK/);
});
