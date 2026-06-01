// Docs tests for the fresh-repo intent readiness / proof-context fix.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (rel) => readFileSync(resolve(repoRoot, rel), "utf8");
const norm = (text) => text.replace(/[`*]/g, "").replace(/\s+/g, " ");

const readme = read("README.md");
const changelog = norm(read("CHANGELOG.md"));
const packet = read(".rekon-dev/review-packets/fresh-repo-intent-readiness-context.md");

// ---------- 1 ----------
test("README documents the fresh-repo intent context path", () => {
  assert.ok(readme.includes("rekon intent context prepare"), "README must mention rekon intent context prepare");
});

// ---------- 2 ----------
test("README notes the fresh-repo intent path requires the scan/context substrate", () => {
  const n = norm(readme);
  assert.ok(n.includes("scan") && n.includes("intent context prepare") && n.includes("intent assess"));
});

// ---------- 3 ----------
test("CHANGELOG mentions the fresh-repo intent readiness context fix", () => {
  assert.ok(changelog.includes("Fresh Repo Intent Readiness"));
});

// ---------- 4 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.match(packet, /PURPOSE PRESERVATION CHECK/);
});

// ---------- 5 ----------
test("review packet contains the ARTIFACT PRODUCER MAP", () => {
  assert.match(packet, /ARTIFACT PRODUCER MAP/);
  assert.match(packet, /\| Artifact \| Producer Command \| Exists \| In Help \| Fresh Repo Behavior \|/);
});

// ---------- 6 ----------
test("review packet records missing runtime/handoff context as honest not-evaluated", () => {
  assert.ok(packet.includes("not-evaluated"));
});

// ---------- 7 ----------
test("review packet records the phase-level verification finding as a follow-up", () => {
  assert.ok(packet.includes("PHASE-LEVEL VERIFICATION FINDING"));
  assert.ok(packet.includes("Intent Bundle Phase-Level Verification Policy / Implementation"));
});

// ---------- 8 ----------
test("docs say the fresh-repo path requires no manual artifact seeding", () => {
  assert.ok(packet.includes("without manual") || packet.includes("no manual"));
});
