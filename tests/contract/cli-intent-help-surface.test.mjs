// Contract tests for the top-level `rekon help` intent-workflow surface
// (CLI Intent Help Surface Alignment).
//
// The shipped rich intent workflow (assess → prepare → status → work-order
// generate → verification-plan generate → bundle write) must be discoverable
// from top-level help, with the Rekon → Circe boundary stated and without
// implying an `intent go` command exists. This is a help/discoverability
// surface only — no command behavior is exercised here.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");

function runHelp() {
  return spawnSync(process.execPath, [cliPath, "help"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

const help = runHelp();
const helpText = `${help.stdout}${help.stderr}`;

// ---------- 1 ----------
test("rekon help exits 0", () => {
  assert.equal(help.status, 0, help.stderr || help.stdout);
});

// ---------- 2 ----------
test("help includes intent assess", () => {
  assert.ok(helpText.includes("intent assess"), helpText);
});

// ---------- 3 ----------
test("help includes intent prepare", () => {
  assert.ok(helpText.includes("intent prepare"), helpText);
});

// ---------- 4 ----------
test("help includes intent status", () => {
  assert.ok(helpText.includes("intent status"), helpText);
});

// ---------- 5 ----------
test("help includes intent work-order generate", () => {
  assert.ok(helpText.includes("intent work-order generate"), helpText);
});

// ---------- 6 ----------
test("help includes intent verification-plan generate", () => {
  assert.ok(helpText.includes("intent verification-plan generate"), helpText);
});

// ---------- 7 ----------
test("help includes intent bundle write", () => {
  assert.ok(helpText.includes("intent bundle write"), helpText);
});

// ---------- 8 ----------
test("help mentions the Circe handoff (validate/routes/import)", () => {
  assert.ok(helpText.includes("circe rekon-handoff validate/routes/import"), helpText);
});

// ---------- 9 ----------
test("help says Rekon does not run Circe", () => {
  assert.ok(helpText.includes("does not run Circe"), helpText);
});

// ---------- 10 ----------
test("help says Rekon does not execute commands", () => {
  assert.ok(helpText.includes("does not execute commands"), helpText);
});

// ---------- 11 ----------
test("help says Rekon does not write source files", () => {
  assert.ok(helpText.includes("does not write source files"), helpText);
});

// ---------- 12 ----------
test("help does not list `intent go` as a shipped command", () => {
  // `intent:go` (the deferred boundary) may be mentioned, but no `intent go`
  // command line may appear.
  assert.ok(!helpText.includes("intent go"), helpText);
  assert.ok(!/^\s*rekon intent go\b/m.test(helpText), helpText);
});
