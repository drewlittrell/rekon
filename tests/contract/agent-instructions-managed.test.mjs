import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");

function runCli(args, expectedStatus = 0) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(result.status, expectedStatus, result.stderr || result.stdout);
  return result;
}

test("setup preserves project guidance and installs one managed block", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-agent-instructions-"));
  const original = "# Project guidance\n\nKeep the public API stable.\n";
  await writeFile(join(root, "AGENTS.md"), original, "utf8");

  const result = JSON.parse(runCli(["setup", "--root", root, "--json"]).stdout);
  const content = await readFile(join(root, "AGENTS.md"), "utf8");

  assert.equal(result.agentInstructions.changed, true);
  assert.ok(content.startsWith(original));
  assert.equal(content.match(/rekon:agent-instructions:start/g)?.length, 1);
  assert.match(content, /`context_for_task`/);
  assert.match(content, /`resolve_source_target`/);
  assert.match(content, /--profile compact/);
  assert.match(content, /--model-context/);
  assert.match(content, /Before the first repository command/);
  assert.match(content, /After context compaction or restart/);
  assert.match(content, /whenever the task goal or path scope changes/);
  assert.match(content, /Do not probe for the CLI first/);
  assert.match(content, /Read every `readFirst` path before planning or editing/);
  assert.match(content, /batch those file reads into one command when practical/);
  assert.match(content, /inspected source names a task-required symbol, type, or call/);
  assert.match(content, /absent from `readFirst` and `boundaryPaths`/);
  assert.match(content, /Pact text and preservation-only constraints do not create targets/);
  assert.match(content, /use `resolve_source_target` with that exact target before broad or text search/i);
  assert.match(content, /read every `readNext` path/i);
  assert.match(content, /Never use this tool for completeness, analogues, or more tests/);
  assert.match(content, /does not authorize broad search/);
  assert.match(content, /pact constraints and required checks as acceptance criteria/i);
  assert.ok(Buffer.byteLength(content, "utf8") < 3_600, "managed bootstrap should stay bounded");
});

test("sync is idempotent and check reports current", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-agent-instructions-"));
  runCli(["setup", "--root", root, "--json"]);
  const before = await readFile(join(root, "AGENTS.md"), "utf8");
  const sync = JSON.parse(runCli(["agent-instructions", "sync", "--root", root, "--json"]).stdout);
  const check = JSON.parse(runCli(["agent-instructions", "check", "--root", root, "--json"]).stdout);
  const after = await readFile(join(root, "AGENTS.md"), "utf8");

  assert.equal(sync.changed, false);
  assert.equal(check.status, "current");
  assert.equal(after, before);
});

test("sync replaces stale managed content but preserves surrounding bytes", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-agent-instructions-"));
  const content = [
    "# Before",
    "",
    '<!-- rekon:agent-instructions:start version="0.0.1" -->',
    "stale content",
    "<!-- rekon:agent-instructions:end -->",
    "",
    "# After",
    "",
  ].join("\n");
  await writeFile(join(root, "AGENTS.md"), content, "utf8");

  runCli(["agent-instructions", "sync", "--root", root, "--json"]);
  const updated = await readFile(join(root, "AGENTS.md"), "utf8");

  assert.ok(updated.startsWith("# Before\n\n"));
  assert.ok(updated.endsWith("\n\n# After\n"));
  assert.ok(!updated.includes("stale content"));
  assert.match(updated, /version="1\.8\.1"/);
});

test("malformed markers fail closed without changing AGENTS.md", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-agent-instructions-"));
  const malformed = "# Instructions\n\n<!-- rekon:agent-instructions:start version=\"1.0.0\" -->\n";
  await writeFile(join(root, "AGENTS.md"), malformed, "utf8");

  const result = runCli(["agent-instructions", "sync", "--root", root, "--json"], 1);
  assert.match(result.stderr, /malformed|unclosed/i);
  assert.equal(await readFile(join(root, "AGENTS.md"), "utf8"), malformed);
});

test("remove deletes only the Rekon-managed block", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-agent-instructions-"));
  await writeFile(join(root, "AGENTS.md"), "# Project\n\nProject-owned rule.\n", "utf8");
  runCli(["agent-instructions", "sync", "--root", root, "--json"]);
  const result = JSON.parse(runCli(["agent-instructions", "remove", "--root", root, "--json"]).stdout);
  const content = await readFile(join(root, "AGENTS.md"), "utf8");

  assert.equal(result.changed, true);
  assert.match(content, /Project-owned rule/);
  assert.ok(!content.includes("rekon:agent-instructions"));
});

test("remove preserves every byte outside the managed markers", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-agent-instructions-"));
  const before = "# Project\n\nKeep this spacing.  \n\n";
  const block = [
    '<!-- rekon:agent-instructions:start version="0.9.0" -->',
    "stale",
    "<!-- rekon:agent-instructions:end -->",
  ].join("\n");
  const after = "\n\n## Local rules\n\nDo not rewrite this.\n";
  await writeFile(join(root, "AGENTS.md"), `${before}${block}${after}`, "utf8");

  runCli(["agent-instructions", "remove", "--root", root, "--json"]);

  assert.equal(await readFile(join(root, "AGENTS.md"), "utf8"), `${before}${after}`);
});

test("symlink targets are rejected", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-agent-instructions-"));
  const outside = join(root, "outside.md");
  await writeFile(outside, "outside\n", "utf8");
  await symlink(outside, join(root, "AGENTS.md"));

  const result = runCli(["agent-instructions", "sync", "--root", root, "--json"], 1);
  assert.match(result.stderr, /regular, non-symlink file/);
  assert.equal(await readFile(outside, "utf8"), "outside\n");
});

test("init enables managed instructions in config and writes the bootstrap", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-agent-instructions-"));
  const result = JSON.parse(runCli(["init", "--root", root, "--json"]).stdout);
  const config = JSON.parse(await readFile(join(root, ".rekon", "config.json"), "utf8"));
  const agents = await readFile(join(root, "AGENTS.md"), "utf8");

  assert.equal(result.agentInstructions.status, "current");
  assert.deepEqual(config.agentInstructions, { enabled: true, target: "AGENTS.md", sync: "on-refresh" });
  assert.match(agents, /rekon:agent-instructions:start/);
});

test("setup honors an existing agent-instruction opt-out", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-agent-instructions-"));
  await writeFile(join(root, "AGENTS.md"), "# Project\n", "utf8");
  runCli(["init", "--root", root, "--json"]);
  const configPath = join(root, ".rekon", "config.json");
  const config = JSON.parse(await readFile(configPath, "utf8"));
  config.agentInstructions.enabled = false;
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  runCli(["agent-instructions", "remove", "--root", root, "--json"]);
  const before = await readFile(join(root, "AGENTS.md"), "utf8");

  const result = JSON.parse(runCli(["setup", "--root", root, "--json"]).stdout);

  assert.equal(result.agentInstructions.status, "disabled");
  assert.equal(await readFile(join(root, "AGENTS.md"), "utf8"), before);
});

test("refresh replaces a stale managed block when on-refresh sync is enabled", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-agent-instructions-"));
  runCli(["init", "--root", root, "--json"]);
  const agentsPath = join(root, "AGENTS.md");
  const current = await readFile(agentsPath, "utf8");
  await writeFile(
    agentsPath,
    current.replace(
      /<!-- rekon:agent-instructions:start[\s\S]*<!-- rekon:agent-instructions:end -->/,
      '<!-- rekon:agent-instructions:start version="0.9.0" -->\nstale\n<!-- rekon:agent-instructions:end -->',
    ),
    "utf8",
  );

  const result = JSON.parse(
    runCli(["refresh", "--root", root, "--skip-publish", "--skip-freshness", "--json"]).stdout,
  );
  const syncStep = result.steps.find((step) => step.id === "agent-instructions.sync");
  const updated = await readFile(agentsPath, "utf8");

  assert.equal(syncStep.status, "passed");
  assert.equal(syncStep.summary.changed, true);
  assert.match(updated, /version="1\.8\.1"/);
  assert.ok(!updated.includes("\nstale\n"));
});
