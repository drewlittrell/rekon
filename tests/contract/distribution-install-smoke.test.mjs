import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(new URL("../..", import.meta.url).pathname);

test("canonical install smoke uses the local-tarball consumer flow", async () => {
  const entry = await read("scripts/install-smoke.mjs");
  const implementation = await read("scripts/install-tarball-smoke.mjs");

  assert.match(entry, /install-tarball-smoke\.mjs/);
  assert.match(implementation, /npm", \["pack"/);
  assert.match(implementation, /\["install", "--no-audit"/);
  assert.match(implementation, /node_modules\/\.bin\/rekon/);
  assert.match(implementation, /packagesImported/);
  assert.doesNotMatch(entry, /deferred|alpha/i);
});

test("distribution smoke is exposed to contributors and CI", async () => {
  const pkg = JSON.parse(await read("package.json"));
  const workflow = await read(".github/workflows/ci.yml");
  const contributing = await read("CONTRIBUTING.md");

  assert.equal(pkg.scripts["test:install"], "node scripts/install-smoke.mjs");
  assert.match(workflow, /npm run test:install/);
  assert.match(contributing, /npm run test:install/);
});

async function read(path) {
  return readFile(resolve(root, path), "utf8");
}
