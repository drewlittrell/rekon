// Docs tests for the Rekon First-Run Scan Implementation.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (rel) => readFileSync(resolve(repoRoot, rel), "utf8");
const norm = (text) => text.replace(/[`*]/g, "").replace(/\s+/g, " ");

const readme = read("README.md");
const memo = norm(read("docs/strategy/rekon-first-run-scan-onboarding-decision.md"));
const changelog = norm(read("CHANGELOG.md"));
const packet = read(".rekon-dev/review-packets/rekon-first-run-scan-v1.md");

// ---------- 1 ----------
test("README mentions rekon scan", () => {
  assert.ok(readme.includes("rekon scan"));
});

// ---------- 2 ----------
test("README no longer says scan is not implemented", () => {
  assert.ok(!readme.includes("not yet implemented"), "README must not say scan is not yet implemented");
  assert.ok(!readme.includes("decided but not implemented"));
});

// ---------- 3 ----------
test("docs say first-run onboarding starts with scan, not refresh", () => {
  assert.ok(memo.includes("First-run onboarding must start with scan, not refresh."));
});

// ---------- 4 ----------
test("docs say docs generation is not offered before the first scan", () => {
  assert.ok(memo.includes("Docs generation is not offered before the first scan."));
});

// ---------- 5 ----------
test("docs say agent handoff generation is not offered before the first scan", () => {
  assert.ok(memo.includes("Agent handoff generation is not offered before the first scan."));
});

// ---------- 6 ----------
test("docs say verification planning is not offered before the first scan", () => {
  assert.ok(memo.includes("Verification planning is not offered before the first scan."));
});

// ---------- 7 ----------
test("docs say refresh remains an expert / compatibility term", () => {
  assert.ok(memo.includes("refresh remains an expert or compatibility term, not the first-run UX."));
});

// ---------- 8 ----------
test("CHANGELOG mentions Rekon First-Run Scan Implementation", () => {
  assert.ok(changelog.includes("Rekon First-Run Scan Implementation"));
});

// ---------- 9 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.match(packet, /PURPOSE PRESERVATION CHECK/);
});
