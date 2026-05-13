import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import test from "node:test";

const cliPath = new URL("../dist/index.js", import.meta.url).pathname;

test("CLI init, observe, snapshot, and artifact list work on a simple TS project", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-cli-"));

  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "index.ts"), "export const value = 1;\n", "utf8");

    const init = runCli(["init", "--root", root, "--json"]);
    assert.equal(init.status, 0, init.stderr);
    assert.equal(JSON.parse(init.stdout).config, ".rekon/config.json");
    assert.deepEqual(
      JSON.parse(await readFile(join(root, ".rekon", "config.json"), "utf8")).capabilities,
      [{ package: "@rekon/capability-js-ts" }],
    );

    const capabilities = runCli(["capabilities", "list", "--root", root, "--json"]);
    assert.equal(capabilities.status, 0, capabilities.stderr);
    assert.equal(JSON.parse(capabilities.stdout).capabilities[0].id, "@rekon/capability-js-ts");

    const observe = runCli(["observe", "--root", root, "--json"]);
    assert.equal(observe.status, 0, observe.stderr);
    const evidenceRef = JSON.parse(observe.stdout).artifact;
    assert.equal(evidenceRef.type, "EvidenceGraph");
    assert.match(evidenceRef.path, /\.rekon\/artifacts\/evidence\//);

    const snapshot = runCli(["snapshot", "--root", root, "--json"]);
    assert.equal(snapshot.status, 0, snapshot.stderr);
    assert.equal(JSON.parse(snapshot.stdout).artifact.type, "IntelligenceSnapshot");

    const artifacts = runCli(["artifacts", "list", "--root", root, "--json"]);
    assert.equal(artifacts.status, 0, artifacts.stderr);
    assert.equal(JSON.parse(artifacts.stdout).artifacts.length, 2);

    const show = runCli(["artifacts", "show", evidenceRef.id, "--root", root, "--json"]);
    assert.equal(show.status, 0, show.stderr);
    assert.equal(JSON.parse(show.stdout).artifact.header.artifactType, "EvidenceGraph");

    const preflight = runCli([
      "resolve",
      "preflight",
      "--root",
      root,
      "--path",
      "src/index.ts",
      "--goal",
      "modify bootstrap",
      "--json",
    ]);
    assert.equal(preflight.status, 0, preflight.stderr);
    const preflightOutput = JSON.parse(preflight.stdout);
    assert.equal(preflightOutput.artifact.type, "ResolverPacket");
    assert.deepEqual(preflightOutput.packet.ownerSystems, ["src"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    encoding: "utf8",
  });
}
