// Docs tests for the Intent Planning UX / Context Quality Fix (slice 175).
// Locks in the boundary statements: implicit embedding-provider failure degrades
// to graph + lexical context (or a clear warning), explicit failure stays strict,
// and task context remains proposal/context — never proof, no writes, no commands.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (relativePath) => readFileSync(resolve(repoRoot, relativePath), "utf8");
const norm = (text) =>
  text
    .replace(/^>\s?/gm, "")
    .toLowerCase()
    .replace(/[`*]/g, "")
    .replace(/\s+/g, " ");

const MEMO = "docs/strategy/intent-planning-ux-context-quality-fix.md";
const PACKET = ".rekon-dev/review-packets/intent-planning-ux-context-quality-fix.md";

const memoRaw = read(MEMO);
const memo = norm(memoRaw);
const packet = read(PACKET);
const changelog = norm(read("CHANGELOG.md"));

// 1
test("UX fix doc exists", () => {
  assert.ok(memoRaw.length > 0);
});

// 2
test("doc says implicit embedding-provider failure degrades to graph + lexical context or a clear warning", () => {
  assert.ok(
    memo.includes("implicit embedding-provider failure degrades to graph + lexical context or a clear warning"),
  );
});

// 3
test("doc says explicit provider failure remains visible and strict", () => {
  assert.ok(memo.includes("explicit provider failure remains visible and strict"));
});

// 4
test("doc says task context remains proposal/context, not proof", () => {
  assert.ok(memo.includes("task context remains proposal/context, not proof"));
});

// 5
test("doc says verification hints remain hints, not executed commands", () => {
  assert.ok(memo.includes("verification hints remain hints, not executed commands"));
});

// 6
test("doc says source files are not written", () => {
  assert.ok(memo.includes("source files are not written"));
});

// 7
test("doc says no commands are executed", () => {
  assert.ok(memo.includes("no commands are executed"));
});

// 8
test("doc says no WorkOrder or VerificationPlan is created", () => {
  assert.ok(memo.includes("no workorder or verificationplan is created"));
});

// 9
test("doc says no Circe is run", () => {
  assert.ok(memo.includes("no circe is run"));
});

// 10
test("doc says intent:go remains deferred", () => {
  assert.ok(memo.includes("intent:go remains deferred"));
});

// 11
test("CHANGELOG mentions Intent Planning UX / Context Quality Fix", () => {
  assert.ok(changelog.includes("intent planning ux / context quality fix"));
});

// 12
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(packet.length > 0);
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
});
