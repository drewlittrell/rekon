// Contract tests for `rekon welcome` + `rekon setup` (slice 118).
//
// Welcome remains read-only. Setup additionally installs the bounded Rekon
// bootstrap in AGENTS.md while preserving its no-scan/no-.rekon boundary.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");

function runCli(args, env = {}) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

async function freshRepo() {
  const dir = await mkdtemp(join(tmpdir(), "rekon-welcome-setup-"));
  await writeFile(join(dir, "package.json"), JSON.stringify({ name: "fixture", version: "0.0.0" }), "utf8");
  await mkdir(join(dir, "src"), { recursive: true });
  await writeFile(join(dir, "src", "index.ts"), "export const marker = 1;\n", "utf8");
  return dir;
}

// ---------- 1 ----------
test("welcome exits 0", () => {
  assert.equal(runCli(["welcome"]).status, 0);
});

// ---------- 2 ----------
test("welcome human output includes Rekon / lifecycle", () => {
  const out = runCli(["welcome"]).stdout;
  assert.match(out, /Rekon/);
  assert.match(out, /Lifecycle/);
});

// ---------- 3 ----------
test("welcome human output includes rekon scan", () => {
  assert.match(runCli(["welcome"]).stdout, /rekon scan/);
});

// ---------- 4 ----------
test("welcome human output includes the intent workflow", () => {
  assert.match(runCli(["welcome"]).stdout, /rekon intent context prepare/);
});

// ---------- 5 ----------
test("welcome human output includes boundary statements", () => {
  const out = runCli(["welcome"]).stdout;
  assert.match(out, /Rekon does not run Circe\./);
  assert.match(out, /intent:go remains deferred\./);
});

// ---------- 6 ----------
test("welcome --json exits 0", () => {
  assert.equal(runCli(["welcome", "--json"]).status, 0);
});

// ---------- 7 ----------
test("welcome JSON includes command welcome", () => {
  assert.equal(JSON.parse(runCli(["welcome", "--json"]).stdout).command, "welcome");
});

// ---------- 8 ----------
test("welcome JSON includes lifecycle scan/snapshot/act", () => {
  assert.deepEqual(JSON.parse(runCli(["welcome", "--json"]).stdout).lifecycle, ["scan", "snapshot", "act"]);
});

// ---------- 9 ----------
test("welcome JSON includes no ASCII art / banner", () => {
  const out = runCli(["welcome", "--json"]).stdout;
  assert.ok(!out.includes("╔"), "no big banner in --json");
  assert.ok(!out.includes("┌─ Rekon"), "no compact mark in --json");
});

// ---------- 10 ----------
test("welcome JSON boundaries.runsCirce false", () => {
  assert.equal(JSON.parse(runCli(["welcome", "--json"]).stdout).boundaries.runsCirce, false);
});

// ---------- 11 ----------
test("welcome JSON boundaries.executesCommands false", () => {
  assert.equal(JSON.parse(runCli(["welcome", "--json"]).stdout).boundaries.executesCommands, false);
});

// ---------- 12 ----------
test("welcome JSON boundaries.writesSourceFiles false", () => {
  assert.equal(JSON.parse(runCli(["welcome", "--json"]).stdout).boundaries.writesSourceFiles, false);
});

// ---------- 13 ----------
test("welcome JSON boundaries.implementsIntentGo false", () => {
  assert.equal(JSON.parse(runCli(["welcome", "--json"]).stdout).boundaries.implementsIntentGo, false);
});

// ---------- 14 ----------
test("REKON_NO_BANNER=1 welcome omits big banner", () => {
  const out = runCli(["welcome"], { REKON_NO_BANNER: "1" }).stdout;
  assert.ok(!out.includes("╔"), "no big banner under REKON_NO_BANNER");
  assert.ok(!out.includes("┌─ Rekon"), "no compact mark under REKON_NO_BANNER");
  // The body still prints.
  assert.match(out, /Rekon builds local repository intelligence\./);
});

// ---------- 15 ----------
test("NO_COLOR=1 welcome emits no ANSI color", () => {
  const out = runCli(["welcome"], { NO_COLOR: "1" }).stdout;
  // eslint-disable-next-line no-control-regex
  assert.ok(!/\[/.test(out), "no ANSI escape sequences");
});

// ---------- 16 ----------
test("setup --json before .rekon reports not_initialized", async () => {
  const dir = await mkdtemp(join(tmpdir(), "rekon-setup-"));
  assert.equal(JSON.parse(runCli(["setup", "--root", dir, "--json"]).stdout).workspace.state, "not_initialized");
});

// ---------- 17 ----------
test("setup JSON recommends rekon scan", async () => {
  const dir = await mkdtemp(join(tmpdir(), "rekon-setup-"));
  const out = JSON.parse(runCli(["setup", "--root", dir, "--json"]).stdout);
  assert.ok(out.recommendedNextActions.some((a) => a.startsWith("rekon scan")));
});

// ---------- 18..25: setup JSON boundary booleans ----------
const SETUP_BOUNDARY_FALSE = [
  "runsScan",
  "createdDocs",
  "createdAgentHandoff",
  "createdCi",
  "createdVerificationPlan",
  "executesCommands",
  "implementsIntentGo",
];
for (const key of SETUP_BOUNDARY_FALSE) {
  test(`setup JSON boundaries.${key} false`, async () => {
    const dir = await mkdtemp(join(tmpdir(), "rekon-setup-"));
    assert.equal(JSON.parse(runCli(["setup", "--root", dir, "--json"]).stdout).boundaries[key], false);
  });
}

test("setup JSON reports its bounded AGENTS.md write", async () => {
  const dir = await mkdtemp(join(tmpdir(), "rekon-setup-"));
  const out = JSON.parse(runCli(["setup", "--root", dir, "--json"]).stdout);
  assert.equal(out.boundaries.writesSourceFiles, true);
  assert.equal(out.agentInstructions.target, "AGENTS.md");
  assert.equal(out.agentInstructions.status, "current");
});

test("setup installs the managed bootstrap without creating .rekon", async () => {
  const dir = await mkdtemp(join(tmpdir(), "rekon-setup-"));
  runCli(["setup", "--root", dir, "--json"]);
  const agents = await readFile(join(dir, "AGENTS.md"), "utf8");
  assert.match(agents, /rekon:agent-instructions:start/);
  assert.match(agents, /context_for_task/);
  await assert.rejects(stat(join(dir, ".rekon")), "setup must not create .rekon/ before scan");
});

// ---------- 26 ----------
test("setup human output before .rekon recommends rekon scan", async () => {
  const dir = await mkdtemp(join(tmpdir(), "rekon-setup-"));
  const out = runCli(["setup", "--root", dir]).stdout;
  assert.match(out, /Workspace: not_initialized/);
  assert.match(out, /rekon scan/);
});

// ---------- 27 ----------
test("setup after rekon scan reports snapshot_ready", async () => {
  const dir = await freshRepo();
  assert.equal(runCli(["scan", "--root", dir, "--json"]).status, 0);
  assert.equal(JSON.parse(runCli(["setup", "--root", dir, "--json"]).stdout).workspace.state, "snapshot_ready");
});

// ---------- 28 ----------
test("setup after scan recommends rekon intent context prepare", async () => {
  const dir = await freshRepo();
  runCli(["scan", "--root", dir, "--json"]);
  const out = JSON.parse(runCli(["setup", "--root", dir, "--json"]).stdout);
  assert.ok(out.recommendedNextActions.some((a) => a.startsWith("rekon intent context prepare")));
});

// ---------- 29 ----------
test("setup does not create .rekon/ when run before scan", async () => {
  const dir = await mkdtemp(join(tmpdir(), "rekon-setup-"));
  runCli(["setup", "--root", dir, "--json"]);
  await assert.rejects(stat(join(dir, ".rekon")), "setup must not create .rekon/ before scan");
});

// ---------- 30 ----------
test("rekon help lists welcome", () => {
  assert.match(runCli(["help"]).stdout, /rekon welcome/);
});

// ---------- 31 ----------
test("rekon help lists setup", () => {
  assert.match(runCli(["help"]).stdout, /rekon setup/);
});

// ---------- 32 ----------
test("rekon help does not list an intent:go command", () => {
  assert.ok(!runCli(["help"]).stdout.includes("rekon intent:go"));
});
