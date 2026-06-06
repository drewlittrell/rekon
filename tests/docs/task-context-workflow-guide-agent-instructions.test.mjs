// Docs tests for the TaskContextReport Workflow Guide / Agent Instructions
// (slice 180). Locks in the context-first workflow product surface: a human
// workflow guide and an agent instruction set that teach context-before-editing
// while preserving every proof / approval / execution / source-write / bundle /
// intent:go boundary.

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (relativePath) => readFileSync(resolve(repoRoot, relativePath), "utf8");
const exists = (relativePath) => existsSync(resolve(repoRoot, relativePath));
const norm = (text) =>
  text
    .replace(/^>\s?/gm, "")
    .toLowerCase()
    .replace(/[`*]/g, "")
    .replace(/\s+/g, " ");

const GUIDE = "docs/guides/task-context-workflow.md";
const AGENT = "docs/guides/agent-context-instructions.md";
const NOTE = "docs/strategy/task-context-workflow-guide-agent-instructions.md";
const PACKET = ".rekon-dev/review-packets/task-context-workflow-guide-agent-instructions.md";

const guideRaw = read(GUIDE);
const agentRaw = read(AGENT);
const noteRaw = read(NOTE);
const combinedRaw = `${guideRaw}\n${agentRaw}\n${noteRaw}`;
const combined = norm(combinedRaw);
const packet = exists(PACKET) ? read(PACKET) : "";
const changelog = norm(read("CHANGELOG.md"));

// 1
test("task context workflow guide exists", () => {
  assert.ok(exists(GUIDE) && guideRaw.includes("# Task Context Workflow"));
});

// 2
test("agent context instructions guide exists", () => {
  assert.ok(exists(AGENT) && agentRaw.includes("# Agent Context Instructions"));
});

// 3
test("implementation note exists", () => {
  assert.ok(exists(NOTE) && noteRaw.includes("# TaskContextReport Workflow Guide / Agent Instructions"));
});

// 4
test("docs say TaskContextReport is the standard pre-work context substrate, not a proof artifact", () => {
  assert.ok(combined.includes("taskcontextreport is the standard pre-work context substrate, not a proof artifact"));
});

// 5
test("docs say context-first means context before planning or editing, not context as approval", () => {
  assert.ok(combined.includes("context-first means context before planning or editing, not context as approval"));
});

// 6
test("docs say humans should read the TaskContextReport markdown before editing", () => {
  assert.ok(combined.includes("humans should read the taskcontextreport markdown before editing"));
});

// 7
test("docs say agents should consume agentContext before editing", () => {
  assert.ok(combined.includes("agents should consume agentcontext before editing"));
});

// 8
test("docs say TaskContextReport must not approve plans", () => {
  assert.ok(combined.includes("taskcontextreport must not approve plans"));
});

// 9
test("docs say TaskContextReport must not execute commands", () => {
  assert.ok(combined.includes("taskcontextreport must not execute commands"));
});

// 10
test("docs say TaskContextReport must not write source files", () => {
  assert.ok(combined.includes("taskcontextreport must not write source files"));
});

// 11
test("docs say TaskContextReport must not create WorkOrder or VerificationPlan", () => {
  assert.ok(combined.includes("taskcontextreport must not create workorder or verificationplan"));
});

// 12
test("docs say verification hints remain hints, not executed commands", () => {
  assert.ok(combined.includes("verification hints remain hints, not executed commands"));
});

// 13
test("docs say do-not-touch zones remain guidance/context, not enforcement", () => {
  assert.ok(combined.includes("do-not-touch zones remain guidance/context, not enforcement"));
});

// 14
test("docs say TaskContextReport consumption remains explicit unless a future decision changes it", () => {
  assert.ok(combined.includes("taskcontextreport consumption remains explicit unless a future decision changes it"));
});

// 15
test("docs say prepare / approve / status / handoff remain separately gated", () => {
  assert.ok(combined.includes("prepare / approve / status / handoff remain separately gated"));
});

// 16
test("docs say TaskContextReport may be included in bundles only as optional context, not proof", () => {
  assert.ok(combined.includes("taskcontextreport may be included in bundles only as optional context, not proof"));
});

// 17
test("docs say intent:go remains deferred", () => {
  assert.ok(combined.includes("intent:go remains deferred"));
});

// 18
test("docs include workflow table", () => {
  assert.ok(combinedRaw.includes("| Step | Command / Action | Purpose |"));
});

// 19
test("docs include human/agent table", () => {
  assert.ok(combinedRaw.includes("| Consumer | Reads | Uses For |"));
});

// 20
test("docs include boundary table", () => {
  assert.ok(combinedRaw.includes("| Boundary | Decision |"));
});

// 21
test("CHANGELOG mentions TaskContextReport Workflow Guide / Agent Instructions", () => {
  assert.ok(changelog.includes("taskcontextreport workflow guide / agent instructions"));
});

// 22
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(packet.length > 0);
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
});
