import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const strategyDocs = {
  northStar: "../../docs/strategy/north-star.md",
  capabilityModel: "../../docs/strategy/capability-model.md",
  roadmap: "../../docs/strategy/roadmap.md",
  classicMigration: "../../docs/strategy/codebase-intel-classic-migration.md",
};

const supportingDocs = {
  releaseChecklist: "../../docs/release/alpha-release-checklist.md",
  stability: "../../docs/concepts/stability.md",
};

const repoDocs = {
  readme: "../../README.md",
  agents: "../../AGENTS.md",
  contributing: "../../CONTRIBUTING.md",
};

test("strategy docs exist and declare NorthStar essentials", async () => {
  const northStar = await read(strategyDocs.northStar);

  for (const phrase of [
    "Rekon is an open-source intelligence substrate for codebases",
    "Observe -> Normalize -> Model -> Govern -> Resolve -> Publish -> Act -> Learn -> Reconcile",
    "Lower layers may feed upper layers",
    "Docs Are Publications",
    "publications, not canonical truth",
    "Memory Enriches",
    "Reconciliation Is Permissioned",
    "Current Alpha Scope",
    "Future Direction",
  ]) {
    includes(northStar, phrase);
  }
});

test("capability model doc describes the seven roles and manifest contract", async () => {
  const model = await read(strategyDocs.capabilityModel);

  for (const phrase of [
    "evidence-provider",
    "projector",
    "evaluator",
    "resolver",
    "publisher",
    "learner",
    "actuator",
    "CapabilityManifest",
    "consumes",
    "produces",
    "permissions",
    "invalidation",
    "compatibility",
    "Community Extension Model",
    "Trust And Security",
  ]) {
    includes(model, phrase);
  }
});

test("roadmap distinguishes completed alpha spine, committed direction, and future expansions", async () => {
  const roadmap = await read(strategyDocs.roadmap);

  for (const phrase of [
    "Completed Alpha Spine",
    "Committed Direction",
    "Future Expansions",
    "Alpha Release Readiness",
    "Publish Dry-Run",
    "Package Export Audit",
    "Install-From-Build",
    "Stability Labels",
    "Watcher And Freshness Engine",
    "GitHub / CI Surface",
  ]) {
    includes(roadmap, phrase);
  }
});

test("codebase-intel-classic migration doc enumerates role mapping", async () => {
  const migration = await read(strategyDocs.classicMigration);

  for (const phrase of [
    "codebase-intel-classic",
    "Migration Mapping",
    "Porting Criteria",
    "Dogfood Strategy",
    "What Not To Do",
    "evidence-provider",
    "projector",
    "evaluator",
    "resolver",
    "publisher",
    "learner",
    "actuator",
  ]) {
    includes(migration, phrase);
  }

  notIncludes(migration, "import from `codebase-intel-classic`");
});

test("README links strategy docs and the alpha release checklist", async () => {
  const readme = await read(repoDocs.readme);

  for (const phrase of [
    "Strategy Docs",
    "docs/strategy/north-star.md",
    "docs/strategy/capability-model.md",
    "docs/strategy/roadmap.md",
    "docs/strategy/codebase-intel-classic-migration.md",
    "docs/release/alpha-release-checklist.md",
  ]) {
    includes(readme, phrase);
  }
});

test("AGENTS instructs reading the NorthStar for major work", async () => {
  const agents = await read(repoDocs.agents);

  includes(agents, "docs/strategy/north-star.md");
  includes(agents, "docs/strategy/roadmap.md");
});

test("CONTRIBUTING links the NorthStar and capability model", async () => {
  const contributing = await read(repoDocs.contributing);

  includes(contributing, "docs/strategy/north-star.md");
  includes(contributing, "docs/strategy/capability-model.md");
});

test("alpha release checklist names the required checks", async () => {
  const checklist = await read(supportingDocs.releaseChecklist);

  for (const phrase of [
    "0.1.0-alpha.1",
    "npm run typecheck",
    "npm run test",
    "npm run build",
    "git diff --check",
    "audit-package-exports",
    "publish-dry-run",
    "install-smoke",
    "audit-license",
    "Do Not Publish Until",
    "Rollback Notes",
    "Known Limitations",
  ]) {
    includes(checklist, phrase);
  }
});

test("stability concept doc declares the four labels", async () => {
  const stability = await read(supportingDocs.stability);

  for (const phrase of ["`stable`", "`experimental`", "`internal`", "`deprecated`"]) {
    includes(stability, phrase);
  }
});

async function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

function includes(content, expected) {
  assert.ok(content.includes(expected), `Expected docs to include: ${expected}`);
}

function notIncludes(content, forbidden) {
  assert.ok(
    !content.includes(forbidden),
    `Expected docs to not include: ${forbidden}`,
  );
}
