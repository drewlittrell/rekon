import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";
import { digestJson } from "../../packages/kernel-artifacts/dist/index.js";
import {
  createLocalArtifactStore,
  validateArtifactIndex,
} from "../../packages/runtime/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

test("CLI smoke flow writes trustworthy indexed artifacts", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-artifact-contract-"));

  try {
    await cp(exampleRoot, root, {
      recursive: true,
      filter(source) {
        return !relative(exampleRoot, source).split(/[\\/]/).includes(".rekon");
      },
    });

    runCli(["init", "--root", root, "--json"]);
    runCli(["observe", "--root", root, "--json"]);
    runCli(["project", "--root", root, "--json"]);
    runCli(["snapshot", "--root", root, "--json"]);
    runCli(["evaluate", "--root", root, "--json"]);
    runCli([
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
    runCli(["publish", "agents", "--root", root, "--json"]);
    runCli([
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
    runCli(["memory", "list", "--root", root, "--json"]);
    runCli([
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
    runCli([
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
    runCli(["reconcile", "--root", root, "--operation", "docs_regeneration", "--json"]);
    runCli(["artifacts", "validate", "--root", root, "--json"]);

    const workspaceRoot = join(root, ".rekon");
    const indexPath = join(workspaceRoot, "registry/artifacts.index.json");
    const index = JSON.parse(await readFile(indexPath, "utf8"));
    const store = createLocalArtifactStore(root);
    const validation = await validateArtifactIndex(store);

    assert.equal(validation.valid, true, JSON.stringify(validation.issues, null, 2));

    assert.ok(Array.isArray(index), "artifact index must be an array");
    assert.ok(index.length > 0, "artifact index must include emitted artifacts");

    const artifactFiles = await listJsonFiles(join(workspaceRoot, "artifacts"));
    const indexedPaths = new Set(index.map((entry) => entry.path));
    const filePaths = new Set(artifactFiles.map((file) => relative(root, file)));

    assert.deepEqual(
      [...filePaths].sort(),
      [...indexedPaths].sort(),
      "every artifact file must be indexed and every index entry must point to a file",
    );

    for (const entry of index) {
      assertIndexEntry(entry);

      const artifactPath = join(root, entry.path);
      assert.ok(existsSync(artifactPath), `indexed artifact path must exist: ${entry.path}`);

      const artifact = JSON.parse(await readFile(artifactPath, "utf8"));
      assertArtifactContract(artifact, entry);
      assert.equal(digestJson(artifact), entry.digest, `digest mismatch for ${entry.type}:${entry.id}`);
      assertNoPrivateReferences(entry, artifact);
    }

    const emittedTypes = new Set(index.map((entry) => entry.type));

    for (const type of [
      "ActionLog",
      "CapabilityMap",
      "EvidenceGraph",
      "FindingReport",
      "GraphSlice",
      "IntentMap",
      "IntelligenceSnapshot",
      "MemoryEvent",
      "MemorySelection",
      "ObservedRepo",
      "OperatorFeedbackEntry",
      "OwnershipMap",
      "Publication",
      "ReconciliationLog",
      "ReconciliationPlan",
      "ResolverPacket",
      "VerificationPlan",
      "WorkOrder",
    ]) {
      assert.ok(emittedTypes.has(type), `${type} should be emitted by the smoke flow`);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function runCli(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);

  return result;
}

async function listJsonFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...await listJsonFiles(path));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(path);
    }
  }

  return files.sort();
}

function assertIndexEntry(entry) {
  assert.equal(typeof entry.type, "string", "index entry type must be a string");
  assert.equal(typeof entry.id, "string", "index entry id must be a string");
  assert.equal(typeof entry.path, "string", "index entry path must be a string");
  assert.equal(typeof entry.digest, "string", "index entry digest must be a string");
  assert.equal(typeof entry.schemaVersion, "string", "index entry schemaVersion must be a string");
  assert.equal(entry.artifactType, entry.type, "index artifactType must match type");
  assert.equal(entry.artifactId, entry.id, "index artifactId must match id");
  assert.ok(entry.path.startsWith(".rekon/artifacts/"), "index path must stay under .rekon/artifacts");
}

function assertArtifactContract(artifact, entry) {
  assert.ok(artifact && typeof artifact === "object", "artifact must be an object");
  assert.ok(artifact.header && typeof artifact.header === "object", "artifact header must be an object");

  const { header } = artifact;

  assert.equal(header.artifactType, entry.type, "header artifactType must match index type");
  assert.equal(header.artifactId, entry.id, "header artifactId must match index id");
  assert.equal(typeof header.schemaVersion, "string", "header schemaVersion must be a string");
  assert.equal(typeof header.generatedAt, "string", "header generatedAt must be a string");
  assert.ok(!Number.isNaN(Date.parse(header.generatedAt)), "header generatedAt must be parseable");
  assert.ok(header.subject && typeof header.subject === "object", "header subject must be an object");
  assert.equal(typeof header.subject.repoId, "string", "header subject.repoId must be a string");
  assert.ok(header.producer && typeof header.producer === "object", "header producer must be an object");
  assert.equal(typeof header.producer.id, "string", "header producer.id must be a string");
  assert.notEqual(header.producer.id.trim(), "", "header producer.id must be non-empty");
  assert.equal(typeof header.producer.version, "string", "header producer.version must be a string");
  assert.notEqual(header.producer.version.trim(), "", "header producer.version must be non-empty");
  assert.ok(Array.isArray(header.inputRefs), "header inputRefs must be an array");
  assert.ok(header.freshness && typeof header.freshness === "object", "header freshness must be an object");
  assert.match(header.freshness.status, /^(fresh|stale|partial|unknown)$/, "header freshness.status must be valid");

  for (const ref of header.inputRefs) {
    assert.equal(typeof ref.type, "string", "input ref type must be a string");
    assert.equal(typeof ref.id, "string", "input ref id must be a string");
    assert.equal(typeof ref.schemaVersion, "string", "input ref schemaVersion must be a string");
  }
}

function assertNoPrivateReferences(entry, artifact) {
  const serialized = JSON.stringify({ entry, artifact });
  const legacyWorkspaceSegment = [".codebase", "intel"].join("-");
  const legacyEnvPrefix = ["CODEBASE", "INTEL"].join("_");

  assert.equal(serialized.includes(legacyWorkspaceSegment), false, "generated artifacts must not reference private legacy workspace paths");
  assert.equal(serialized.includes(legacyEnvPrefix), false, "generated artifacts must not reference private legacy environment names");
}
