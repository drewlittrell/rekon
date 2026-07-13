import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cp,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";
import {
  createLocalArtifactStore,
  validateArtifactFreshness,
} from "../../packages/runtime/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

test("after the golden CLI flow the latest artifact of every major type is fresh", async () => {
  await withFixture(async (root) => {
    await goldenFlow(root);

    const store = createLocalArtifactStore(root);
    await store.init();
    const result = await validateArtifactFreshness(store);

    assert.ok(result.artifacts.length > 0);
    assert.ok(
      result.artifacts.every((entry) => entry.status !== "unknown"),
      `unexpected unknown after golden flow: ${JSON.stringify(result.artifacts.filter((entry) => entry.status === "unknown"), null, 2)}`,
    );

    // Older artifacts of the same type can legitimately be stale because newer
    // ones supplanted them inside the same flow (e.g. publish re-runs snapshot).
    // The freshness story is correct when the *latest* artifact of every major
    // type is fresh.
    const latestByType = new Map();
    for (const entry of result.artifacts) {
      const indexed = await store.list(entry.type);
      indexed.sort((left, right) => right.writtenAt.localeCompare(left.writtenAt));
      const latest = indexed[0];
      if (latest && latest.id === entry.id) {
        latestByType.set(entry.type, entry);
      }
    }

    for (const type of [
      "EvidenceGraph",
      "ObservedRepo",
      "OwnershipMap",
      "CapabilityMap",
      "GraphSlice",
      "FindingReport",
      "IntelligenceSnapshot",
      "ResolverPacket",
      "Publication",
    ]) {
      const latest = latestByType.get(type);
      assert.ok(latest, `expected a latest ${type} artifact after the golden flow`);
      assert.equal(
        latest.status,
        "fresh",
        `latest ${type}:${latest.id} should be fresh: ${JSON.stringify(latest.issues, null, 2)}`,
      );
    }
  });
});

test("FindingReport becomes stale after a newer EvidenceGraph is observed", async () => {
  await withFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli(["observe", "--root", root, "--json"]);
    runCli(["evaluate", "--root", root, "--json"]);

    const findingId = await latestArtifactId(root, "FindingReport");

    runCli(["observe", "--root", root, "--json"]);

    const result = await freshnessForType(root, "FindingReport");

    const findingEntry = result.artifacts.find(
      (entry) => entry.type === "FindingReport" && entry.id === findingId,
    );

    assert.ok(findingEntry, "expected the older FindingReport in freshness output");
    assert.equal(findingEntry.status, "stale");
    assert.ok(
      findingEntry.issues.some((issue) => issue.code === "newer-input-exists"),
      "stale finding must include a newer-input-exists issue",
    );
    assert.equal(result.status, "stale");
  });
});

test("ResolverPacket becomes stale after newer OwnershipMap or FindingReport exists", async () => {
  await withFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli([
      "resolve",
      "preflight",
      "--root",
      root,
      "--path",
      "src/index.ts",
      "--goal",
      "first resolve",
      "--json",
    ]);

    const resolverPacketId = await latestArtifactId(root, "ResolverPacket");

    runCli(["observe", "--root", root, "--json"]);
    runCli(["project", "--root", root, "--json"]);
    runCli(["evaluate", "--root", root, "--json"]);

    const result = await freshnessForId(root, "ResolverPacket", resolverPacketId);
    const entry = result.artifacts.find(
      (candidate) => candidate.type === "ResolverPacket" && candidate.id === resolverPacketId,
    );

    assert.ok(entry, "expected the older ResolverPacket in freshness output");
    assert.equal(entry.status, "stale");
    const newerInputTypes = entry.issues
      .filter((issue) => issue.code === "newer-input-exists")
      .map((issue) => issue.inputType);
    assert.ok(newerInputTypes.length > 0);
  });
});

test("Publication becomes stale after newer ResolverPacket or snapshot exists", async () => {
  await withFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli(["publish", "agents", "--root", root, "--json"]);

    const publicationId = await latestArtifactId(root, "Publication");

    runCli(["observe", "--root", root, "--json"]);
    runCli(["project", "--root", root, "--json"]);
    runCli(["evaluate", "--root", root, "--json"]);
    runCli(["snapshot", "--root", root, "--json"]);

    const result = await freshnessForId(root, "Publication", publicationId);
    const entry = result.artifacts.find(
      (candidate) => candidate.type === "Publication" && candidate.id === publicationId,
    );

    assert.ok(entry, "expected the older Publication in freshness output");
    assert.equal(entry.status, "stale");
  });
});

test("Missing inputRef produces a partial freshness result", async () => {
  await withFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli(["observe", "--root", root, "--json"]);
    runCli(["evaluate", "--root", root, "--json"]);

    // Mutate the latest FindingReport's first inputRef to point at a missing id.
    const findingsDir = join(root, ".rekon", "artifacts", "findings");
    const findingFiles = (await readdir(findingsDir)).filter((name) =>
      name.startsWith("FindingReport-"),
    );
    assert.ok(findingFiles.length > 0);

    const findingPath = join(findingsDir, findingFiles[0]);
    const finding = JSON.parse(await readFile(findingPath, "utf8"));

    finding.header.inputRefs = [
      ...finding.header.inputRefs.slice(1),
      {
        type: "EvidenceGraph",
        id: "missing-evidence-id",
        schemaVersion: "0.1.0",
      },
    ];

    await writeFile(findingPath, JSON.stringify(finding, null, 2), "utf8");

    // The mutated artifact will fail integrity (digest mismatch) but freshness
    // should still report partial because of the missing input reference.
    const result = await freshnessForType(root, "FindingReport");

    assert.notEqual(result.status, "fresh");
    const entry = result.artifacts.find(
      (candidate) => candidate.type === "FindingReport" && candidate.id === finding.header.artifactId,
    );

    assert.ok(entry);
    assert.ok(
      entry.issues.some((issue) => issue.code === "input.missing"),
      "expected an input.missing issue when an inputRef points to a missing artifact",
    );
    assert.ok(
      entry.status === "partial" || entry.status === "stale",
      `expected partial or stale, got ${entry.status}`,
    );
  });
});

test("rekon artifacts freshness CLI returns the documented JSON shape", async () => {
  await withFixture(async (root) => {
    await goldenFlow(root);
    const cliResult = runCli([
      "artifacts",
      "freshness",
      "--root",
      root,
      "--json",
    ]);

    const parsed = JSON.parse(cliResult.stdout);
    assert.ok(["fresh", "stale", "partial", "unknown"].includes(parsed.status));
    assert.equal(typeof parsed.checkedAt, "string");
    assert.ok(Array.isArray(parsed.issues));
    assert.ok(Array.isArray(parsed.artifacts));
    for (const entry of parsed.artifacts) {
      assert.equal(typeof entry.type, "string");
      assert.equal(typeof entry.id, "string");
      assert.ok(["fresh", "stale", "partial", "unknown"].includes(entry.status));
      assert.ok(Array.isArray(entry.issues));
    }
  });
});

test("rekon artifacts freshness renders non-fresh reasons for people", async () => {
  await withFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli(["observe", "--root", root, "--json"]);
    await writeFile(join(root, "src", "index.ts"), "export const changed = true;\n", "utf8");

    const result = runCli(["artifacts", "freshness", "--root", root, "--type", "EvidenceGraph"]);
    assert.match(result.stdout, /Artifact freshness: stale/);
    assert.match(result.stdout, /source\.changed:/);
    assert.match(result.stdout, /EvidenceGraph:/);
  });
});

test("source drift propagates through artifact lineage", async () => {
  await withFixture(async (root) => {
    await goldenFlow(root);
    await writeFile(join(root, "src", "index.ts"), "export const changed = true;\n", "utf8");
    const store = createLocalArtifactStore(root);
    await store.init();
    const result = await validateArtifactFreshness(store);

    const latestOwnership = (await store.list("OwnershipMap"))
      .sort((left, right) => right.writtenAt.localeCompare(left.writtenAt))[0];
    const ownershipFreshness = result.artifacts.find(
      (entry) => entry.type === "OwnershipMap" && entry.id === latestOwnership.id,
    );
    assert.equal(ownershipFreshness.status, "stale");
    assert.ok(ownershipFreshness.issues.some((issue) => issue.code === "input.stale"));
  });
});

test("supersession keys isolate independent artifact streams", async () => {
  await withFixture(async (root) => {
    const store = createLocalArtifactStore(root);
    await store.init();
    const streamA = await writeSyntheticArtifact(store, "StreamArtifact", "stream-a-1", "stream-a");
    const consumer = await writeSyntheticArtifact(store, "StreamConsumer", "consumer-a", undefined, [streamA]);

    await delayForIndexOrdering();
    await writeSyntheticArtifact(store, "StreamArtifact", "stream-b-1", "stream-b");
    const unrelatedResult = await validateArtifactFreshness(store, {
      artifactType: consumer.type,
      artifactId: consumer.id,
    });
    assert.equal(unrelatedResult.artifacts[0].status, "fresh");

    await delayForIndexOrdering();
    await writeSyntheticArtifact(store, "StreamArtifact", "stream-a-2", "stream-a");
    const replacementResult = await validateArtifactFreshness(store, {
      artifactType: consumer.type,
      artifactId: consumer.id,
    });
    assert.equal(replacementResult.artifacts[0].status, "stale");
    assert.ok(replacementResult.artifacts[0].issues.some((issue) =>
      issue.code === "newer-input-exists" && issue.inputId === streamA.id));
  });
});

test("incremental CLI flow keeps full evidence for downstream project and evaluate", async () => {
  await withFixture(async (root) => {
    await writeFile(join(root, "src", "unchanged.ts"), "export const unchanged = true;\n", "utf8");
    runCli(["init", "--root", root, "--json"]);
    runCli(["observe", "--root", root, "--json"]);

    await writeFile(join(root, "src", "index.ts"), "export function greet() { return 'changed'; }\n", "utf8");
    runCli([
      "observe", "--root", root, "--changed-file", "src/index.ts", "--json",
    ]);

    const store = createLocalArtifactStore(root);
    await store.init();
    const evidenceEntries = (await store.list("EvidenceGraph"))
      .sort((left, right) => right.writtenAt.localeCompare(left.writtenAt));
    const latestEvidence = await store.read(evidenceEntries[0]);
    const filePaths = latestEvidence.facts
      .filter((fact) => fact.kind === "file")
      .map((fact) => fact.value.path);
    assert.deepEqual(filePaths.sort(), ["src/index.ts", "src/unchanged.ts"]);
    assert.equal(latestEvidence.header.inputRefs[0].type, "EvidenceGraph");

    runCli(["project", "--root", root, "--json"]);
    runCli(["evaluate", "--root", root, "--json"]);
    const ownershipEntry = (await store.list("OwnershipMap"))
      .sort((left, right) => right.writtenAt.localeCompare(left.writtenAt))[0];
    const ownership = await store.read(ownershipEntry);
    assert.ok(ownership.entries.some((entry) => entry.path === "src/unchanged.ts"));
    assert.ok(ownership.header.inputRefs.some((ref) => ref.id === evidenceEntries[0].id));

    const findingEntry = (await store.list("FindingReport"))
      .sort((left, right) => right.writtenAt.localeCompare(left.writtenAt))[0];
    const findings = await store.read(findingEntry);
    assert.ok(findings.header.inputRefs.some((ref) => ref.id === evidenceEntries[0].id));
  });
});

async function withFixture(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-freshness-"));

  try {
    await cp(exampleRoot, root, {
      recursive: true,
      filter(source) {
        return !relative(exampleRoot, source).split(/[\\/]/).includes(".rekon");
      },
    });
    await callback(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function goldenFlow(root) {
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
    "smoke",
    "--json",
  ]);
  runCli(["publish", "agents", "--root", root, "--json"]);
}

async function writeSyntheticArtifact(store, type, id, supersessionKey, inputRefs = []) {
  return store.write({
    header: {
      artifactType: type,
      artifactId: id,
      schemaVersion: "0.1.0",
      generatedAt: new Date().toISOString(),
      subject: { repoId: "freshness-supersession-test" },
      producer: { id: "@rekon/test.supersession", version: "1.0.0" },
      inputRefs,
      ...(supersessionKey ? { supersession: { key: supersessionKey } } : {}),
      freshness: { status: "fresh" },
      provenance: { confidence: 1 },
    },
  });
}

async function delayForIndexOrdering() {
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 5));
}

async function latestArtifactId(root, type) {
  const store = createLocalArtifactStore(root);
  await store.init();
  const entries = await store.list(type);
  entries.sort((left, right) => right.writtenAt.localeCompare(left.writtenAt));
  assert.ok(entries.length > 0, `expected at least one ${type} artifact`);
  return entries[0].id;
}

async function freshnessForType(root, type) {
  const store = createLocalArtifactStore(root);
  await store.init();
  return validateArtifactFreshness(store, { artifactType: type });
}

async function freshnessForId(root, type, id) {
  const store = createLocalArtifactStore(root);
  await store.init();
  return validateArtifactFreshness(store, { artifactType: type, artifactId: id });
}

function runCli(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}
