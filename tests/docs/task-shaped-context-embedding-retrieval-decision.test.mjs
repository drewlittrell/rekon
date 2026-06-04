// Docs tests for the Task-Shaped Context / Embedding Retrieval Decision
// (slice 165). Pins the decision memo's required headings, verbatim boundary
// statements, decision tables, the CHANGELOG mention, and the review packet's
// PURPOSE PRESERVATION CHECK — so task-shaped context stays proposal/context,
// not proof, and the first retrieval consumer is decided before it is built.

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

const MEMO = resolve(repoRoot, "docs/strategy/task-shaped-context-embedding-retrieval-decision.md");
const REVIEW_PACKET = resolve(repoRoot, ".rekon-dev/review-packets/task-shaped-context-embedding-retrieval-decision.md");
const CHANGELOG = resolve(repoRoot, "CHANGELOG.md");

const norm = (text) =>
  text
    .replace(/^>\s?/gm, "")
    .toLowerCase()
    .replace(/[`*]/g, "")
    .replace(/\s+/g, " ");

function read(path) {
  return existsSync(path) ? norm(readFileSync(path, "utf8")) : "";
}

const memo = read(MEMO);
const packet = read(REVIEW_PACKET);
const changelog = read(CHANGELOG);

const HEADINGS = [
  "# Task-Shaped Context / Embedding Retrieval Decision",
  "## Decision Summary",
  "## Why This Decision Exists",
  "## Current Retrieval Surface",
  "## Options Considered",
  "## Recommendation",
  "## TaskContextReport Shape",
  "## Selection Policy",
  "## Human And Agent Output",
  "## Evidence And Graph Expansion",
  "## Boundary Model",
  "## What This Does Not Do",
  "## Implementation Sequence",
];

const STATEMENTS = [
  "Task-shaped context is proposal/context, not proof.",
  "Embedding retrieval is proposal/context, not proof.",
  "CapabilityEvidenceGraph remains the evidence substrate.",
  "Deterministic graph facts outrank embedding similarity.",
  "Task context must not approve plans.",
  "Task context must not execute commands.",
  "Task context must not write source files.",
  "Task context must not create WorkOrder or VerificationPlan.",
  "Task context must not run Circe.",
  "Task context must preserve evidence refs.",
  "Task context should include do-not-touch zones when evidence supports them.",
  "Task context should include verification hints as hints, not executed commands.",
  "Duplicate detection remains deferred.",
  "Canonical recommendations remain deferred.",
  "intent:go remains deferred.",
];

// Each table is asserted by a distinctive header row + a distinctive cell.
const TABLES = [
  { name: "option table", needles: ["| option | decision | reason |", "raw embeddings query only"] },
  { name: "input table", needles: ["| input | decision |", "optional but high priority"] },
  { name: "selection table", needles: ["| candidate source | role |", "exclude by default"] },
  { name: "output table", needles: ["| output | decision |", "structured json"] },
  { name: "boundary table", needles: ["| boundary | decision |", "task context vs command execution"] },
];

// 1
test("decision memo exists", () => {
  assert.ok(existsSync(MEMO), "expected docs/strategy/task-shaped-context-embedding-retrieval-decision.md");
});

// 2
test("memo contains all required headings", () => {
  for (const heading of HEADINGS) {
    assert.ok(memo.includes(norm(heading)), `memo missing heading: "${heading}"`);
  }
});

// 3-17
for (const statement of STATEMENTS) {
  test(`memo states verbatim: ${statement}`, () => {
    assert.ok(memo.includes(norm(statement)), `memo missing verbatim statement: "${statement}"`);
  });
}

// 18-22
for (const { name, needles } of TABLES) {
  test(`memo includes ${name}`, () => {
    for (const needle of needles) {
      assert.ok(memo.includes(norm(needle)), `memo ${name} missing: "${needle}"`);
    }
  });
}

// 23
test("CHANGELOG mentions Task-Shaped Context / Embedding Retrieval Decision", () => {
  assert.ok(changelog.includes(norm("Task-Shaped Context / Embedding Retrieval Decision")));
});

// 24
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(REVIEW_PACKET), "review packet should exist");
  assert.ok(packet.includes(norm("PURPOSE PRESERVATION CHECK")));
});
