import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("root naming contract is documented", async () => {
  const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");

  assert.match(readme, /Rekon/);
  assert.match(readme, /`rekon`/);
  assert.match(readme, /`\.rekon\/`/);
  assert.match(readme, /`REKON_`/);
  assert.match(readme, /`@rekon\/\*`/);
});

test("root AGENTS instructions prohibit private reference imports", async () => {
  const agents = await readFile(new URL("../AGENTS.md", import.meta.url), "utf8");

  assert.match(agents, /Do not import from private reference repositories/);
});

test("root AGENTS instructions require managed downstream agent guidance", async () => {
  const agents = await readFile(new URL("../AGENTS.md", import.meta.url), "utf8");

  assert.match(agents, /Rekon-owned instruction block/);
  assert.match(agents, /repositories it manages/);
  assert.match(agents, /Model-facing CLI commands, MCP\s+tools, generated instructions/);
});
