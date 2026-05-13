import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

test("evaluate list reports built-in policy evaluator", async () => {
  await withFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
    const parsed = JSON.parse(
      runCli(["evaluate", "list", "--root", root, "--json"]).stdout,
    );

    assert.ok(Array.isArray(parsed.evaluators));
    const policy = parsed.evaluators.find(
      (entry) => entry.id === "@rekon/capability-policy.evaluator",
    );
    assert.ok(policy, "expected built-in policy evaluator");
    assert.equal(policy.capabilityId, "@rekon/capability-policy");
    assert.ok(policy.produces.includes("FindingReport"));
  });
});

test("evaluate run executes one built-in evaluator", async () => {
  await withFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
    const parsed = JSON.parse(
      runCli([
        "evaluate",
        "run",
        "@rekon/capability-policy.evaluator",
        "--root",
        root,
        "--json",
      ]).stdout,
    );

    assert.ok(Array.isArray(parsed.artifacts));
    assert.ok(parsed.artifacts.length > 0, "evaluate run must emit at least one artifact");
    assert.ok(
      parsed.artifacts.some((artifact) => artifact.type === "FindingReport"),
      "evaluate run must emit a FindingReport",
    );
  });
});

test("evaluate run errors clearly for unknown evaluator", async () => {
  await withFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
    const result = runCliRaw([
      "evaluate",
      "run",
      "no.such.evaluator",
      "--root",
      root,
      "--json",
    ]);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Unknown evaluator/);
    assert.match(result.stderr, /rekon evaluate list/);
  });
});

test("evaluate (no subcommand) still runs all evaluators", async () => {
  await withFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
    const parsed = JSON.parse(
      runCli(["evaluate", "--root", root, "--json"]).stdout,
    );

    assert.ok(Array.isArray(parsed.artifacts));
    assert.ok(parsed.artifacts.length > 0);
  });
});

test("resolve list reports built-in preflight resolver", async () => {
  await withFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
    const parsed = JSON.parse(
      runCli(["resolve", "list", "--root", root, "--json"]).stdout,
    );

    assert.ok(Array.isArray(parsed.resolvers));
    const preflight = parsed.resolvers.find(
      (entry) => entry.id === "resolve.preflight",
    );
    assert.ok(preflight, "expected resolve.preflight");
    assert.equal(preflight.capabilityId, "@rekon/capability-resolver");
    assert.ok(preflight.produces.includes("ResolverPacket"));
  });
});

test("resolve run resolve.preflight writes a ResolverPacket and injects latest snapshotRef", async () => {
  await withFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
    const parsed = JSON.parse(
      runCli([
        "resolve",
        "run",
        "resolve.preflight",
        "--root",
        root,
        "--input-json",
        '{"path":"src/index.ts","goal":"modify bootstrap"}',
        "--json",
      ]).stdout,
    );

    assert.ok(Array.isArray(parsed.artifacts));
    assert.ok(parsed.artifacts.length > 0);
    assert.ok(parsed.artifacts.some((artifact) => artifact.type === "ResolverPacket"));
    assert.ok(parsed.packet, "resolve run should return the packet payload");
    assert.ok(Array.isArray(parsed.packet.resolutionTrace));
    assert.ok(parsed.packet.resolutionTrace.length > 0);
  });
});

test("resolve run respects explicit snapshotRef when provided", async () => {
  await withFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
    // Run preflight once via friendly command to ensure a snapshot artifact exists.
    runCli([
      "resolve",
      "preflight",
      "--root",
      root,
      "--path",
      "src/index.ts",
      "--goal",
      "ensure snapshot",
      "--json",
    ]);

    const artifactsList = JSON.parse(
      runCli([
        "artifacts",
        "list",
        "--type",
        "IntelligenceSnapshot",
        "--root",
        root,
        "--json",
      ]).stdout,
    );

    const snapshotEntry = artifactsList.artifacts[0];
    assert.ok(snapshotEntry, "expected at least one IntelligenceSnapshot");

    const input = {
      path: "src/index.ts",
      goal: "explicit snapshot",
      snapshotRef: {
        type: snapshotEntry.type,
        id: snapshotEntry.id,
        schemaVersion: snapshotEntry.schemaVersion,
      },
    };

    const parsed = JSON.parse(
      runCli([
        "resolve",
        "run",
        "resolve.preflight",
        "--root",
        root,
        "--input-json",
        JSON.stringify(input),
        "--json",
      ]).stdout,
    );

    assert.ok(parsed.packet, "resolve run should return the packet payload");
    // The packet's inputRefs should reference the snapshot artifact id we passed in.
    const header = parsed.packet?.header;
    assert.ok(header, "packet must have header");
    assert.ok(
      header.inputRefs.some(
        (ref) => ref.type === "IntelligenceSnapshot" && ref.id === snapshotEntry.id,
      ),
      "explicit snapshotRef must appear in the resolver packet inputRefs",
    );
  });
});

test("resolve run errors clearly for unknown resolver", async () => {
  await withFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
    const result = runCliRaw([
      "resolve",
      "run",
      "no.such.resolver",
      "--root",
      root,
      "--json",
    ]);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Unknown resolver/);
    assert.match(result.stderr, /rekon resolve list/);
  });
});

test("resolve preflight friendly shortcut still works", async () => {
  await withFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
    const parsed = JSON.parse(
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
      ]).stdout,
    );

    assert.ok(parsed.packet);
    assert.ok(Array.isArray(parsed.packet.resolutionTrace));
  });
});

async function withFixture(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-generic-eval-res-"));

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

function runCli(args) {
  const result = runCliRaw(args);

  assert.equal(result.status, 0, result.stderr || result.stdout);

  return result;
}

function runCliRaw(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}
