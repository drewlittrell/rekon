import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const strategyDir = join(repoRoot, "docs", "strategy");
const auditPath = join(strategyDir, "classic-guarantees-audit.md");
const regressionPath = join(strategyDir, "classic-guarantee-regression-plan.md");
const purposeMapPath = join(strategyDir, "classic-subsystem-purpose-map.md");
const agentsPath = join(repoRoot, "AGENTS.md");
const contributingPath = join(repoRoot, "CONTRIBUTING.md");

const SUBSYSTEM_HEADINGS = [
  "## 1. Full Scan / Refresh Orchestration",
  "## 2. Evidence And Repo Observation",
  "## 3. Deterministic + Semantic Analysis",
  "## 4. Graph Intelligence",
  "## 5. Rule Engine / Compiled Invariants",
  "## 6. Issue Detection And Adjudication",
  "## 7. Coherency Delta And Remediation Roll-Up",
  "## 8. Resolver / Context / Preflight",
  "## 9. Generated Docs / Agent Docs",
  "## 10. Operator Feedback And Memory",
  "## 11. Intent Preparation / Proof Gates",
  "## 12. Reconciliation / Deterministic Operations",
  "## 13. Watcher / Freshness / Live Context Trust",
  "## 14. GitHub / CI / PR Surfaces",
  "## 15. SaaS / Dashboard Surfaces",
];

const REQUIRED_P0_GUARANTEES = [
  "P0.1 One command can produce a coherent repo-intelligence state",
  "P0.2 Findings preserve lifecycle and status across runs",
  "P0.3 Resolver / preflight can explain ownership and next steps",
  "P0.4 Publications cite inputs and do not become canonical truth",
  "P0.5 Work orders require proof and anti-gaming guardrails",
  "P0.6 Reconciliation suggestions do not silently source-write",
  "P0.7 Freshness distinguishes valid from current",
];

const REQUIRED_P1_GUARANTEES = [
  "P1.1 Issue adjudication / dedupe / false-positive handling",
  "P1.2 Memory ranking / curation",
  "P1.3 Agent-operating-contract publication",
  "P1.4 Path / event freshness",
  "P1.5 Richer graph slices when consumed",
  "P1.6 Rulebook / compiled invariant migration",
];

const REQUIRED_P2_GUARANTEES = [
  "P2.1 Deterministic source-write reconciliation",
  "P2.2 Watcher daemon",
  "P2.3 GitHub / CI surfaces",
  "P2.4 SaaS / dashboard",
  "P2.5 Semantic augmentation / LLM review layers",
];

test("classic-guarantees-audit.md exists", () => {
  assert.ok(existsSync(auditPath), `expected file: ${auditPath}`);
});

test("classic-guarantee-regression-plan.md exists", () => {
  assert.ok(existsSync(regressionPath), `expected file: ${regressionPath}`);
});

test("classic-subsystem-purpose-map.md exists", () => {
  assert.ok(existsSync(purposeMapPath), `expected file: ${purposeMapPath}`);
});

test("classic-guarantees-audit.md contains all 15 subsystem headings", async () => {
  const contents = await readFile(auditPath, "utf8");

  for (const heading of SUBSYSTEM_HEADINGS) {
    assert.ok(
      contents.includes(heading),
      `audit doc must include heading: ${heading}`,
    );
  }
});

test("classic-guarantees-audit.md contains 'Classic workflow guarantee'", async () => {
  const contents = await readFile(auditPath, "utf8");
  assert.ok(
    contents.includes("Classic workflow guarantee"),
    "audit doc must mention the Classic workflow guarantee structure",
  );
});

test("classic-guarantees-audit.md contains 'What Rekon may be discounting'", async () => {
  const contents = await readFile(auditPath, "utf8");
  assert.ok(
    contents.includes("What Rekon may be discounting"),
    "audit doc must mention the discounting structure",
  );
});

test("classic-guarantees-audit.md contains 'Regression test needed'", async () => {
  const contents = await readFile(auditPath, "utf8");
  assert.ok(
    contents.includes("Regression test needed"),
    "audit doc must mention the regression test structure",
  );
});

test("classic-guarantees-audit.md emphasizes coupling vs guarantee distinction", async () => {
  const contents = await readFile(auditPath, "utf8");
  assert.ok(
    contents.includes("Implementation coupling may be simplified")
      && contents.includes("Workflow guarantees must be preserved"),
    "audit doc must make the coupling-vs-guarantee distinction explicit",
  );
});

test("classic-guarantee-regression-plan.md contains P0/P1/P2 sections", async () => {
  const contents = await readFile(regressionPath, "utf8");

  assert.ok(contents.includes("## P0 Guarantees"));
  assert.ok(contents.includes("## P1 Guarantees"));
  assert.ok(contents.includes("## P2 Guarantees"));
});

test("classic-guarantee-regression-plan.md lists every required P0 guarantee", async () => {
  const contents = await readFile(regressionPath, "utf8");

  for (const title of REQUIRED_P0_GUARANTEES) {
    assert.ok(
      contents.includes(title),
      `regression plan must list P0 guarantee: ${title}`,
    );
  }
});

test("classic-guarantee-regression-plan.md lists every required P1 guarantee", async () => {
  const contents = await readFile(regressionPath, "utf8");

  for (const title of REQUIRED_P1_GUARANTEES) {
    assert.ok(
      contents.includes(title),
      `regression plan must list P1 guarantee: ${title}`,
    );
  }
});

test("classic-guarantee-regression-plan.md lists every required P2 guarantee", async () => {
  const contents = await readFile(regressionPath, "utf8");

  for (const title of REQUIRED_P2_GUARANTEES) {
    assert.ok(
      contents.includes(title),
      `regression plan must list P2 guarantee: ${title}`,
    );
  }
});

test("classic-subsystem-purpose-map.md is a real table with the required columns", async () => {
  const contents = await readFile(purposeMapPath, "utf8");

  for (const column of [
    "Classic subsystem",
    "Original problem",
    "Classic guarantee",
    "Rekon equivalent today",
    "Gap",
    "Priority",
    "Next slice",
  ]) {
    assert.ok(
      contents.includes(column),
      `purpose map must include column: ${column}`,
    );
  }
});

test("AGENTS.md contains the PURPOSE PRESERVATION CHECK requirement", async () => {
  const contents = await readFile(agentsPath, "utf8");
  assert.ok(
    contents.includes("PURPOSE PRESERVATION CHECK"),
    "AGENTS.md must require PURPOSE PRESERVATION CHECK",
  );
  assert.ok(
    contents.includes("Original problem")
      && contents.includes("Classic workflow guarantee")
      && contents.includes("Regression test for the original problem"),
    "AGENTS.md must list the required fields under PURPOSE PRESERVATION CHECK",
  );
});

test("AGENTS.md contains the orchestration-weight rule", async () => {
  const contents = await readFile(agentsPath, "utf8");
  assert.ok(
    contents.includes(
      "Do not call classic orchestration \"weight\" unless the work order identifies which guarantee is preserved elsewhere.",
    ),
    "AGENTS.md must include the explicit no-weight rule",
  );
});

test("AGENTS.md cross-references the audit, regression plan, and purpose map", async () => {
  const contents = await readFile(agentsPath, "utf8");
  assert.ok(contents.includes("classic-guarantees-audit.md"));
  assert.ok(contents.includes("classic-guarantee-regression-plan.md"));
  assert.ok(contents.includes("classic-subsystem-purpose-map.md"));
});

test("CONTRIBUTING.md contains the migrated-subsystem guarantee requirement", async () => {
  const contents = await readFile(contributingPath, "utf8");
  assert.ok(
    contents.includes("Preserving Classic Workflow Guarantees"),
    "CONTRIBUTING.md must have the Preserving Classic Workflow Guarantees section",
  );
  assert.ok(
    contents.includes("A contribution that recreates a feature but loses the guarantee is incomplete."),
    "CONTRIBUTING.md must explicitly say a feature without its guarantee is incomplete",
  );
});

test("CONTRIBUTING.md cross-references the audit triple", async () => {
  const contents = await readFile(contributingPath, "utf8");
  assert.ok(contents.includes("classic-guarantees-audit.md"));
  assert.ok(contents.includes("classic-guarantee-regression-plan.md"));
  assert.ok(contents.includes("classic-subsystem-purpose-map.md"));
});

test("classic-refactor-principles.md keeps the new workflow-guarantee rule", async () => {
  const contents = await readFile(
    join(strategyDir, "classic-refactor-principles.md"),
    "utf8",
  );
  assert.ok(
    contents.includes("Preserve The Workflow Guarantee, Not Just The Feature"),
    "classic-refactor-principles.md must add the workflow-guarantee rule",
  );
});

test("classic-behavior-roadmap.md marks the guarantees audit as shipped", async () => {
  const contents = await readFile(
    join(strategyDir, "classic-behavior-roadmap.md"),
    "utf8",
  );
  assert.ok(
    contents.includes("Classic guarantees audit"),
    "classic-behavior-roadmap.md must record the audit in Phase B",
  );
});
