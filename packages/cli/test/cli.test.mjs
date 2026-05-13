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
      [
        { package: "@rekon/capability-js-ts" },
        { package: "@rekon/capability-model" },
        { package: "@rekon/capability-graph" },
        { package: "@rekon/capability-policy" },
        { package: "@rekon/capability-resolver" },
        { package: "@rekon/capability-docs" },
        { package: "@rekon/capability-memory" },
        { package: "@rekon/capability-intent" },
        { package: "@rekon/capability-reconcile" },
      ],
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

    const project = runCli(["project", "--root", root, "--json"]);
    assert.equal(project.status, 0, project.stderr);
    assert.deepEqual(
      JSON.parse(project.stdout).artifacts.map((artifact) => artifact.type).sort(),
      ["CapabilityMap", "GraphSlice", "GraphSlice", "GraphSlice", "ObservedRepo", "OwnershipMap"],
    );

    const evaluate = runCli(["evaluate", "--root", root, "--json"]);
    assert.equal(evaluate.status, 0, evaluate.stderr);
    assert.deepEqual(JSON.parse(evaluate.stdout).artifacts.map((artifact) => artifact.type), ["FindingReport"]);

    const show = runCli(["artifacts", "show", evidenceRef.id, "--root", root, "--json"]);
    assert.equal(show.status, 0, show.stderr);
    assert.equal(JSON.parse(show.stdout).artifact.header.artifactType, "EvidenceGraph");

    const memoryAdd = runCli([
      "memory",
      "add",
      "--root",
      root,
      "--instruction",
      "Preserve bootstrap behavior.",
      "--path",
      "src",
      "--json",
    ]);
    assert.equal(memoryAdd.status, 0, memoryAdd.stderr);
    assert.deepEqual(JSON.parse(memoryAdd.stdout).artifacts.map((artifact) => artifact.type), ["OperatorFeedbackEntry", "MemoryEvent"]);

    const memorySelect = runCli([
      "memory",
      "select",
      "--root",
      root,
      "--path",
      "src/index.ts",
      "--goal",
      "modify bootstrap",
      "--json",
    ]);
    assert.equal(memorySelect.status, 0, memorySelect.stderr);
    assert.equal(JSON.parse(memorySelect.stdout).artifact.type, "MemorySelection");

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
    assert.equal(preflightOutput.packet.applicableMemory[0].instruction, "Preserve bootstrap behavior.");

    const publish = runCli(["publish", "agents", "--root", root, "--json"]);
    assert.equal(publish.status, 0, publish.stderr);
    assert.deepEqual(JSON.parse(publish.stdout).artifacts.map((artifact) => artifact.type), ["Publication", "Publication"]);

    const intent = runCli([
      "intent",
      "work-order",
      "--root",
      root,
      "--path",
      "src/index.ts",
      "--goal",
      "modify bootstrap",
      "--json",
    ]);
    assert.equal(intent.status, 0, intent.stderr);
    assert.deepEqual(JSON.parse(intent.stdout).artifacts.map((artifact) => artifact.type), ["IntentMap", "WorkOrder", "VerificationPlan"]);

    const reconcile = runCli(["reconcile", "--root", root, "--operation", "docs_regeneration", "--json"]);
    assert.equal(reconcile.status, 0, reconcile.stderr);
    assert.deepEqual(JSON.parse(reconcile.stdout).artifacts.map((artifact) => artifact.type), ["ReconciliationPlan", "ReconciliationLog", "ActionLog"]);

    const artifacts = runCli(["artifacts", "list", "--root", root, "--json"]);
    assert.equal(artifacts.status, 0, artifacts.stderr);
    const artifactTypes = JSON.parse(artifacts.stdout).artifacts.map((artifact) => artifact.type);
    for (const type of [
      "CapabilityMap",
      "EvidenceGraph",
      "FindingReport",
      "GraphSlice",
      "IntelligenceSnapshot",
      "ObservedRepo",
      "OwnershipMap",
      "Publication",
      "ResolverPacket",
      "WorkOrder",
    ]) {
      assert.ok(artifactTypes.includes(type), `${type} should be listed`);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    encoding: "utf8",
  });
}
