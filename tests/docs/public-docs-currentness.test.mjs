import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const docs = {
  readme: "../../README.md",
  docsReadme: "../../docs/README.md",
  demo: "../../docs/demo/task-context-to-handoff.md",
  strategyReadme: "../../docs/strategy/README.md",
  currentGuide: "../../docs/guides/task-context-workflow.md",
  historicalDecision: "../../docs/strategy/intent-bundle-handoff-reading-order-broader-workflow-decision.md",
  changelog: "../../CHANGELOG.md",
  reviewPacket: "../../.rekon-dev/review-packets/public-docs-currentness-reviewer-path-polish.md",
};

test("public docs expose the current reviewer path", async () => {
  await exists(docs.readme);
  await exists(docs.docsReadme);
  await exists(docs.demo);

  const readme = await read(docs.readme);
  assert.match(readme, /evidence-backed AI handoff system/i);
  includes(readme, "[docs/README.md](docs/README.md)");
  includes(readme, "docs/demo/task-context-to-handoff.md");
  includes(readme, "For Reviewers And Decision Makers");
  assert.doesNotMatch(readme, /Circe/i);
  includes(readme, "not Rekon requirements or headline features");

  const docsReadme = await read(docs.docsReadme);
  assert.match(docsReadme, /## Start Here/i);
  assert.match(docsReadme, /## Run The Demo/i);
  includes(docsReadme, "demo/task-context-to-handoff.md");
  assert.match(docsReadme, /Current Guides And Workflows/i);
  assert.match(docsReadme, /Strategy And Historical Decisions/i);
  assert.match(docsReadme, /Historical strategy snapshots/i);
});

test("demo doc keeps runnable commands and explicit boundaries", async () => {
  const demo = await read(docs.demo);

  for (const command of [
    "npm install",
    "npm run build",
    "node packages/cli/dist/index.js scan --root /tmp/rekon-demo --json",
    "node packages/cli/dist/index.js capability graph build --root /tmp/rekon-demo --json",
    'node packages/cli/dist/index.js context task --root /tmp/rekon-demo --task "Modify the greeting in src/index.ts" --path src/index.ts --provider mock --json',
    'node packages/cli/dist/index.js resolve preflight --root /tmp/rekon-demo --path src/index.ts --goal "Modify the greeting" --json',
    "node packages/cli/dist/index.js publish agent-contract --root /tmp/rekon-demo --json",
    "node packages/cli/dist/index.js artifacts validate --root /tmp/rekon-demo --json",
  ]) {
    includes(demo, command);
  }

  assert.match(demo, /What Rekon Does Not Do/i);
  assert.match(demo, /does not write source files/i);
  assert.match(demo, /Troubleshooting/i);
});

test("strategy index and labels separate current docs from history", async () => {
  await exists(docs.strategyReadme);

  const strategy = await read(docs.strategyReadme);
  includes(strategy, "start at `README.md` and `docs/README.md`");
  assert.match(strategy, /design decisions, safety reviews, implementation notes/i);
  assert.match(strategy, /not the public\s+getting-started path/i);

  const currentGuide = await read(docs.currentGuide);
  assert.match(currentGuide, /Status: Current workflow guide/i);

  const historicalDecision = await read(docs.historicalDecision);
  assert.match(historicalDecision, /Status: Historical decision memo/i);
});

test("changelog and review packet record this public docs batch", async () => {
  const changelog = await read(docs.changelog);
  includes(changelog, "Public Docs Currentness / Reviewer Path Polish");

  const packet = await read(docs.reviewPacket);
  for (const heading of [
    "CHANGES MADE",
    "PURPOSE PRESERVATION CHECK",
    "DOCS INDEX DECISION",
    "TESTS / VERIFICATION",
  ]) {
    includes(packet, `## ${heading}`);
  }
});

async function exists(relativePath) {
  await access(new URL(relativePath, import.meta.url));
}

async function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

function includes(content, expected) {
  assert.ok(content.includes(expected), `Expected docs to include: ${expected}`);
}
