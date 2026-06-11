// WO-10 behavioral tests: agent scratch trees (.claude/, .codex/) produce
// zero facts at the file-walk level by default; the operator override in
// .rekon/scan-scope.json replaces the default list (so a directory an
// operator declares as real source is never silently swallowed).

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, test } from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const pkg = await import(join(repoRoot, "packages/capability-js-ts/dist/index.js"));

let fixtureRoot;

before(() => {
  fixtureRoot = mkdtempSync(join(tmpdir(), "rekon-scratch-scope-"));
  mkdirSync(join(fixtureRoot, "src"), { recursive: true });
  writeFileSync(join(fixtureRoot, "src/app.ts"), "export const real = 1;\n");

  // Embedded agent scratch trees: full duplicate source, the WO-9
  // contamination shape.
  mkdirSync(join(fixtureRoot, ".claude/worktrees/agent-1/src"), { recursive: true });
  writeFileSync(join(fixtureRoot, ".claude/worktrees/agent-1/src/app.ts"), "export const dup = 1;\n");
  mkdirSync(join(fixtureRoot, ".codex/scratch"), { recursive: true });
  writeFileSync(join(fixtureRoot, ".codex/scratch/tool.ts"), "export const tool = 1;\n");
});

after(() => rmSync(fixtureRoot, { recursive: true, force: true }));

test("default: scratch trees produce zero facts of any kind", async () => {
  const facts = await pkg.jsTsProvider.extract({ repoRoot: fixtureRoot });
  const scratchFacts = facts.filter(
    (fact) =>
      fact.subject.startsWith(".claude/")
      || fact.subject.startsWith(".codex/")
      || (typeof fact.value.source === "string" && fact.value.source.startsWith(".claude/"))
      || (fact.provenance.file ?? "").startsWith(".claude/")
      || (fact.provenance.file ?? "").startsWith(".codex/"),
  );

  assert.deepEqual(scratchFacts, []);
  assert.ok(facts.some((fact) => fact.kind === "file" && fact.subject === "src/app.ts"), "real source still scanned");
  // WO-17 Part 6 added .agents (third agent-scratch class observed in the wild).
  assert.deepEqual([...pkg.DEFAULT_AGENT_SCRATCH_SEGMENTS], [".claude", ".codex", ".agents"]);
});

test("override: an explicit scan-scope list replaces the default (operator declares scratch as source)", async () => {
  mkdirSync(join(fixtureRoot, ".rekon"), { recursive: true });
  writeFileSync(
    join(fixtureRoot, pkg.SCAN_SCOPE_CONFIG_PATH.split("/").at(-1) === "scan-scope.json" ? ".rekon/scan-scope.json" : pkg.SCAN_SCOPE_CONFIG_PATH),
    JSON.stringify({ agentScratchSegments: [".codex"] }),
  );

  try {
    const facts = await pkg.jsTsProvider.extract({ repoRoot: fixtureRoot });

    // .claude is no longer excluded (operator's list replaced the default)...
    assert.ok(
      facts.some((fact) => fact.kind === "file" && fact.subject === ".claude/worktrees/agent-1/src/app.ts"),
      "operator-declared directory is scanned",
    );
    // ...while .codex stays excluded per the operator's list.
    assert.ok(!facts.some((fact) => fact.subject.startsWith(".codex/")));
  } finally {
    rmSync(join(fixtureRoot, ".rekon"), { recursive: true, force: true });
  }
});

test("override: an empty list disables agent-scratch exclusion entirely; malformed config falls back to default", async () => {
  mkdirSync(join(fixtureRoot, ".rekon"), { recursive: true });

  try {
    writeFileSync(join(fixtureRoot, ".rekon/scan-scope.json"), JSON.stringify({ agentScratchSegments: [] }));
    const open = await pkg.jsTsProvider.extract({ repoRoot: fixtureRoot });
    assert.ok(open.some((fact) => fact.subject.startsWith(".claude/")));
    assert.ok(open.some((fact) => fact.subject.startsWith(".codex/")));

    writeFileSync(join(fixtureRoot, ".rekon/scan-scope.json"), "{not json");
    const fallback = await pkg.jsTsProvider.extract({ repoRoot: fixtureRoot });
    assert.ok(!fallback.some((fact) => fact.subject.startsWith(".claude/")), "malformed config ships the default on");
  } finally {
    rmSync(join(fixtureRoot, ".rekon"), { recursive: true, force: true });
  }
});

test("core ignores stay non-negotiable regardless of override", async () => {
  mkdirSync(join(fixtureRoot, "node_modules/dep"), { recursive: true });
  writeFileSync(join(fixtureRoot, "node_modules/dep/index.ts"), "export const nm = 1;\n");
  mkdirSync(join(fixtureRoot, ".rekon"), { recursive: true });
  writeFileSync(join(fixtureRoot, ".rekon/scan-scope.json"), JSON.stringify({ agentScratchSegments: [] }));

  try {
    const facts = await pkg.jsTsProvider.extract({ repoRoot: fixtureRoot });
    assert.ok(!facts.some((fact) => fact.subject.startsWith("node_modules/")));
  } finally {
    rmSync(join(fixtureRoot, ".rekon"), { recursive: true, force: true });
    rmSync(join(fixtureRoot, "node_modules"), { recursive: true, force: true });
  }
});
