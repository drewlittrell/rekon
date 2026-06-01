// Docs tests for Rekon Setup / Welcome UI Implementation (slice 118).

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (rel) => readFileSync(resolve(repoRoot, rel), "utf8");
const norm = (text) => text.replace(/[`*]/g, "").replace(/\s+/g, " ");

const doc = norm(read("docs/concepts/rekon-setup-welcome.md"));
const changelog = norm(read("CHANGELOG.md"));
const packet = read(".rekon-dev/review-packets/rekon-setup-welcome-ui-v1.md");

// ---------- 1 ----------
test("docs say rekon welcome introduces Scan → Snapshot → Act", () => {
  assert.ok(doc.includes("rekon welcome introduces the Scan → Snapshot → Act lifecycle."));
});

// ---------- 2 ----------
test("docs say rekon setup is deterministic and non-interactive", () => {
  assert.ok(doc.includes("rekon setup is deterministic and non-interactive."));
});

// ---------- 3 ----------
test("docs say setup does not run scan", () => {
  assert.ok(doc.includes("rekon setup does not run scan."));
});

// ---------- 4 ----------
test("docs say setup does not generate docs / agent / CI before first scan", () => {
  assert.ok(doc.includes("rekon setup does not generate docs, agent context, or CI before the first scan."));
});

// ---------- 5 ----------
test("docs say ASCII art never appears in --json", () => {
  assert.ok(doc.includes("ASCII art never appears in --json output."));
});

// ---------- 6 ----------
test("docs say NO_COLOR disables color", () => {
  assert.ok(doc.includes("NO_COLOR disables color."));
});

// ---------- 7 ----------
test("docs say REKON_NO_BANNER disables banner", () => {
  assert.ok(doc.includes("REKON_NO_BANNER disables the banner."));
});

// ---------- 8 ----------
test("docs say non-TTY setup must not prompt", () => {
  assert.ok(doc.includes("Non-TTY setup must not prompt."));
});

// ---------- 9 ----------
test("docs say onboarding does not imply Rekon runs Circe", () => {
  assert.ok(doc.includes("Onboarding does not imply Rekon runs Circe."));
});

// ---------- 10 ----------
test("docs say intent:go remains deferred", () => {
  assert.ok(doc.includes("intent:go remains deferred."));
});

// ---------- 11 ----------
test("CHANGELOG mentions Rekon Setup / Welcome UI Implementation", () => {
  assert.ok(changelog.includes("Rekon Setup / Welcome UI Implementation"));
});

// ---------- 12 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.match(packet, /PURPOSE PRESERVATION CHECK/);
});
