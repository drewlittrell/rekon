import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

const docs = {
  distillation: "docs/strategy/classic-behavior-distillation.md",
  wins: "docs/strategy/classic-wins.md",
  translation: "docs/strategy/classic-to-rekon-translation.md",
  refactor: "docs/strategy/classic-refactor-principles.md",
  roadmap: "docs/strategy/classic-behavior-roadmap.md",
  alignmentMap: "docs/strategy/classic-alignment-map.md",
  classicMigration: "docs/strategy/codebase-intel-classic-migration.md",
};

test("classic behavior distillation docs exist", async () => {
  for (const docPath of Object.values(docs)) {
    assert.ok(
      existsSync(resolve(repoRoot, docPath)),
      `${docPath} must exist`,
    );
  }
});

test("classic-behavior-distillation.md covers every required behavior family", async () => {
  const text = await read(docs.distillation);

  for (const header of [
    "## 1. Evidence And Repo Observation",
    "## 2. Deterministic + LLM Hybrid Analysis",
    "## 3. Graph Intelligence",
    "## 4. Rule Engine And Governance",
    "## 5. Issue Detection And Coherency Delta",
    "## 6. Resolver And Preflight Context",
    "## 7. Publications And Generated Docs",
    "## 8. Operator Feedback And Memory",
    "## 9. Intent And Work Orders",
    "## 10. Reconciliation",
    "## 11. Watcher And Freshness",
    "## 12. GitHub / SaaS / Surfaces",
  ]) {
    assert.ok(text.includes(header), `distillation must contain header: ${header}`);
  }

  for (const field of [
    "Classic capability:",
    "Classic source areas:",
    "Goal:",
    "What is good:",
    "What is accidental:",
    "Rekon reinterpretation:",
    "Keep:",
    "Simplify:",
    "Defer:",
    "Migration path:",
  ]) {
    assert.ok(text.includes(field), `distillation must use field: ${field}`);
  }
});

test("classic-wins.md contains the durable principles", async () => {
  const text = await read(docs.wins);

  for (const phrase of [
    "Evidence Before Opinion",
    "Deterministic Before Semantic",
    "Provenance On Every Claim",
    "Generated Docs Are Publications, Not Truth",
    "Rules Should Be Executable, Not Just Prose",
    "Issues Are Governance Artifacts, Not Lint Noise",
    "Graphs Reveal Relationships That File Summaries Miss",
    "Resolver Output Should Explain Itself",
    "Memory Must Be Scoped, Verified, And Fresh",
    "Agents Need Proof Gates, Not Confidence Narratives",
    "Reconciliation Should Be Deterministic-First And Defer Risky Operations",
    "Freshness Must Be Explicit",
    "Capabilities Should Declare Inputs, Outputs, Permissions, And Invalidation",
  ]) {
    assert.ok(text.includes(phrase), `wins must include: ${phrase}`);
  }
});

test("classic-to-rekon-translation.md contains examples for every required role", async () => {
  const text = await read(docs.translation);

  for (const example of [
    "Classic `RuleEvaluatorProvider` Entry → Rekon Evaluator Capability",
    "Classic `GraphBuildProvider` Producer → Rekon Projector Producing `GraphSlice`",
    "Classic `ContextHandler` Output → Rekon Resolver + Publisher",
    "Classic `OperatorFeedback` Entry → Rekon Learner Producing `MemorySelection`",
    "Classic `PlanExecutor` Deterministic Operation → Rekon Actuator Producing `ReconciliationLog`",
  ]) {
    assert.ok(text.includes(example), `translation must include example: ${example}`);
  }
});

test("classic-refactor-principles.md states the durable refactor rules", async () => {
  const text = await read(docs.refactor);

  for (const rule of [
    "Preserve The Goal, Not The File Structure",
    "Preserve The Artifact Contract, Not The Cache Location",
    "Preserve Evaluator Semantics, Not Evaluator Registry Sprawl",
    "Preserve Graph Relationships, Not Graph-Builder Coupling",
    "Preserve Resolver Phases, Not Old CLI Branching",
    "Preserve Memory Ranking Principles, Not Every Curation Heuristic",
    "Preserve Anti-Gaming Gates, Not Every Phase-Prep Implementation Detail",
    "Preserve Deterministic Reconciliation, Not Auto-Apply Breadth",
    "Port Only When Consumes / Produces / Permissions / Provenance Are Clear",
    "If The Classic Behavior Cannot Be Expressed As A Rekon Capability/Artifact, Pause And Define The Missing Substrate First",
  ]) {
    assert.ok(text.includes(rule), `refactor principles must include rule: ${rule}`);
  }
});

test("classic-behavior-roadmap.md describes phases A through D", async () => {
  const text = await read(docs.roadmap);

  for (const phaseHeader of [
    "## Phase A — Already Represented In Rekon",
    "## Phase B — Next Distillations",
    "## Phase C — Later Maturity",
    "## Phase D — Deferred Surfaces",
  ]) {
    assert.ok(text.includes(phaseHeader), `roadmap must include: ${phaseHeader}`);
  }
});

test("classic-alignment-map.md lists every behavior family", async () => {
  const text = await read(docs.alignmentMap);

  for (const cell of [
    "Repo observation",
    "Deterministic + LLM analysis",
    "Graph slices",
    "Rule engine and governance",
    "Issue detection / coherency delta",
    "Resolver / preflight context",
    "Generated docs / publications",
    "Operator feedback / memory",
    "Intent and work orders",
    "Reconciliation",
    "Watcher / freshness",
    "GitHub / SaaS / surfaces",
  ]) {
    assert.ok(text.includes(cell), `alignment map must include row: ${cell}`);
  }
});

test("AGENTS.md requires a CODEBASE-INTEL ALIGNMENT section for major capability work", async () => {
  const text = await read("AGENTS.md");

  assert.ok(text.includes("CODEBASE-INTEL ALIGNMENT"));
  assert.ok(text.includes("Classic capability or failure mode"));
  assert.ok(text.includes("classic files/systems"));
  assert.ok(text.includes("docs/strategy/classic-behavior-roadmap.md"));
});

test("CONTRIBUTING.md links the classic behavior docs", async () => {
  const text = await read("CONTRIBUTING.md");

  for (const link of [
    "docs/strategy/classic-alignment-map.md",
    "docs/strategy/classic-behavior-distillation.md",
    "docs/strategy/classic-wins.md",
    "docs/strategy/classic-to-rekon-translation.md",
    "docs/strategy/classic-refactor-principles.md",
    "docs/strategy/classic-behavior-roadmap.md",
  ]) {
    assert.ok(text.includes(link), `CONTRIBUTING must link: ${link}`);
  }
});

async function read(relativePath) {
  return readFile(resolve(repoRoot, relativePath), "utf8");
}
