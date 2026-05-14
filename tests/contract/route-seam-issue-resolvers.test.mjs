import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";
import {
  issueResolver,
  routeResolver,
  seamResolver,
} from "../../packages/capability-resolver/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- direct evaluator tests against synthetic snapshots ----------

test("resolve.route returns single-owner routing and recommends preflight", async () => {
  const harness = buildHarness({
    ownershipMap: ownershipMapFor([
      { path: "src", ownerSystem: "src", confidence: 0.9 },
    ]),
  });

  const [ref] = await routeResolver.resolve({
    artifacts: harness.artifacts,
    input: {
      snapshotRef: harness.snapshotRef,
      paths: ["src/index.ts"],
      goal: "modify bootstrap",
    },
  });

  const packet = harness.writes.get(ref.id);

  assert.equal(packet.phase, "route");
  assert.equal(packet.routing.status, "single-owner");
  assert.equal(packet.routing.primaryOwner, "src");
  assert.equal(packet.routing.needsSeam, false);
  assert.equal(packet.nextRequiredResolver, "resolve.preflight");
  assertTraceIncludes(packet, "routing.decide");
});

test("resolve.route returns cross-owner routing and recommends seam", async () => {
  const harness = buildHarness({
    ownershipMap: ownershipMapFor([
      { path: "src", ownerSystem: "src", confidence: 0.9 },
      { path: "packages/runtime", ownerSystem: "runtime", confidence: 0.9 },
    ]),
  });

  const [ref] = await routeResolver.resolve({
    artifacts: harness.artifacts,
    input: {
      snapshotRef: harness.snapshotRef,
      paths: ["src/index.ts", "packages/runtime/src/index.ts"],
      goal: "touch boundary",
    },
  });

  const packet = harness.writes.get(ref.id);

  assert.equal(packet.routing.status, "cross-owner");
  assert.equal(packet.routing.needsSeam, true);
  assert.deepEqual([...packet.routing.candidateOwners].sort(), ["runtime", "src"]);
  assert.equal(packet.nextRequiredResolver, "resolve.seam");
});

test("resolve.route warns when ownership is unresolved", async () => {
  const harness = buildHarness();

  const [ref] = await routeResolver.resolve({
    artifacts: harness.artifacts,
    input: {
      snapshotRef: harness.snapshotRef,
      paths: ["unknown/path.ts"],
      goal: "touch unknown",
    },
  });

  const packet = harness.writes.get(ref.id);

  assert.equal(packet.routing.status, "unresolved");
  assert.equal(packet.nextRequiredResolver, "resolve.preflight");
  assert.ok(packet.warnings.some((warning) => warning.includes("Routing unresolved")));
});

test("resolve.seam returns resolved for a single owner", async () => {
  const harness = buildHarness({
    ownershipMap: ownershipMapFor([
      { path: "src", ownerSystem: "src", confidence: 0.9 },
    ]),
  });

  const [ref] = await seamResolver.resolve({
    artifacts: harness.artifacts,
    input: {
      snapshotRef: harness.snapshotRef,
      paths: ["src/index.ts"],
      goal: "single seam",
    },
  });

  const packet = harness.writes.get(ref.id);

  assert.equal(packet.phase, "seam");
  assert.equal(packet.seam.status, "resolved");
  assert.equal(packet.primaryOwner, "src");
  assert.deepEqual(packet.secondaryOwners, []);
  assert.equal(packet.nextRequiredResolver, "resolve.preflight");
});

test("resolve.seam returns needs-primary-owner without a hint when multiple owners are involved", async () => {
  const harness = buildHarness({
    ownershipMap: ownershipMapFor([
      { path: "src", ownerSystem: "src", confidence: 0.9 },
      { path: "packages/runtime", ownerSystem: "runtime", confidence: 0.9 },
    ]),
  });

  const [ref] = await seamResolver.resolve({
    artifacts: harness.artifacts,
    input: {
      snapshotRef: harness.snapshotRef,
      paths: ["src/index.ts", "packages/runtime/src/index.ts"],
      goal: "cross",
    },
  });

  const packet = harness.writes.get(ref.id);

  assert.equal(packet.seam.status, "needs-primary-owner");
  assert.equal(packet.seam.escalate, true);
  assert.ok(packet.warnings.some((warning) => warning.includes("primary owner")));
  assert.equal(packet.nextRequiredResolver, undefined);
});

test("resolve.seam returns resolved with secondary owners when primary owner is valid", async () => {
  const harness = buildHarness({
    ownershipMap: ownershipMapFor([
      { path: "src", ownerSystem: "src", confidence: 0.9 },
      { path: "packages/runtime", ownerSystem: "runtime", confidence: 0.9 },
    ]),
  });

  const [ref] = await seamResolver.resolve({
    artifacts: harness.artifacts,
    input: {
      snapshotRef: harness.snapshotRef,
      paths: ["src/index.ts", "packages/runtime/src/index.ts"],
      goal: "cross",
      primaryOwner: "runtime",
    },
  });

  const packet = harness.writes.get(ref.id);

  assert.equal(packet.seam.status, "resolved");
  assert.equal(packet.primaryOwner, "runtime");
  assert.deepEqual(packet.secondaryOwners, ["src"]);
  assert.equal(packet.nextRequiredResolver, "resolve.preflight");
});

test("resolve.seam returns unresolved when primary owner is not one of the resolved owners", async () => {
  const harness = buildHarness({
    ownershipMap: ownershipMapFor([
      { path: "src", ownerSystem: "src", confidence: 0.9 },
      { path: "packages/runtime", ownerSystem: "runtime", confidence: 0.9 },
    ]),
  });

  const [ref] = await seamResolver.resolve({
    artifacts: harness.artifacts,
    input: {
      snapshotRef: harness.snapshotRef,
      paths: ["src/index.ts", "packages/runtime/src/index.ts"],
      goal: "cross",
      primaryOwner: "ghost",
    },
  });

  const packet = harness.writes.get(ref.id);

  assert.equal(packet.seam.status, "unresolved");
  assert.equal(packet.seam.escalate, true);
  assert.ok(packet.warnings.some((warning) => warning.includes("not among resolved")));
});

test("resolve.issue matches by exact finding id and resolves ownership", async () => {
  const findingReport = findingReportWith([
    {
      id: "finding-1",
      type: "import_boundary.parent_relative_import",
      severity: "medium",
      description: "Parent-relative import.",
      files: ["src/feature/handler.ts"],
      ruleId: "import-boundaries.parent-relative",
    },
    {
      id: "finding-2",
      type: "import_boundary.generated_output_import",
      severity: "high",
      description: "Import from generated output.",
      files: ["src/feature/handler.ts"],
      ruleId: "import-boundaries.generated-output",
    },
  ]);
  const harness = buildHarness({
    ownershipMap: ownershipMapFor([
      { path: "src", ownerSystem: "src", confidence: 0.9 },
    ]),
    findingReport,
  });

  const [ref] = await issueResolver.resolve({
    artifacts: harness.artifacts,
    input: { snapshotRef: harness.snapshotRef, issue: "finding-1" },
  });

  const packet = harness.writes.get(ref.id);

  assert.equal(packet.phase, "issue");
  assert.equal(packet.issue?.id, "finding-1");
  assert.equal(packet.ownerSystems.includes("src"), true);
  assert.equal(packet.nextRequiredResolver, "resolve.preflight");
});

test("resolve.issue matches by unique fragment", async () => {
  const findingReport = findingReportWith([
    {
      id: "finding-1",
      type: "todo_comment",
      severity: "low",
      description: "TODO replace bootstrap greeting",
      files: ["src/index.ts"],
    },
    {
      id: "finding-2",
      type: "import_boundary.generated_output_import",
      severity: "high",
      description: "Import from generated output.",
      files: ["src/feature/handler.ts"],
    },
  ]);
  const harness = buildHarness({
    ownershipMap: ownershipMapFor([
      { path: "src", ownerSystem: "src", confidence: 0.9 },
    ]),
    findingReport,
  });

  const [ref] = await issueResolver.resolve({
    artifacts: harness.artifacts,
    input: { snapshotRef: harness.snapshotRef, issue: "todo" },
  });

  const packet = harness.writes.get(ref.id);

  assert.equal(packet.issue?.id, "finding-1");
});

test("resolve.issue does not silently choose when fragment is ambiguous", async () => {
  const findingReport = findingReportWith([
    {
      id: "finding-1",
      type: "import_boundary.parent_relative_import",
      severity: "medium",
      description: "Parent-relative import in handler.",
      files: ["src/feature/handler.ts"],
    },
    {
      id: "finding-2",
      type: "import_boundary.generated_output_import",
      severity: "high",
      description: "Generated output import in handler.",
      files: ["src/feature/handler.ts"],
    },
  ]);
  const harness = buildHarness({
    ownershipMap: ownershipMapFor([
      { path: "src", ownerSystem: "src", confidence: 0.9 },
    ]),
    findingReport,
  });

  const [ref] = await issueResolver.resolve({
    artifacts: harness.artifacts,
    input: { snapshotRef: harness.snapshotRef, issue: "import_boundary" },
  });

  const packet = harness.writes.get(ref.id);

  assert.equal(packet.issue, undefined);
  assert.ok(packet.warnings.some((warning) => warning.includes("matched 2 findings")));
  assert.equal(packet.relatedFindings.length, 2);
});

test("resolve.issue routes cross-owner finding to resolve.seam", async () => {
  const findingReport = findingReportWith([
    {
      id: "finding-cross",
      type: "architecture.crossSystem",
      severity: "high",
      description: "Touches multiple owners.",
      files: ["src/index.ts", "packages/runtime/src/index.ts"],
    },
  ]);
  const harness = buildHarness({
    ownershipMap: ownershipMapFor([
      { path: "src", ownerSystem: "src", confidence: 0.9 },
      { path: "packages/runtime", ownerSystem: "runtime", confidence: 0.9 },
    ]),
    findingReport,
  });

  const [ref] = await issueResolver.resolve({
    artifacts: harness.artifacts,
    input: { snapshotRef: harness.snapshotRef, issue: "finding-cross" },
  });

  const packet = harness.writes.get(ref.id);

  assert.equal(packet.issue?.id, "finding-cross");
  assert.equal(packet.nextRequiredResolver, "resolve.seam");
  assert.deepEqual([...packet.ownerSystems].sort(), ["runtime", "src"]);
});

test("resolve.issue warns when query is missing", async () => {
  const harness = buildHarness();

  const [ref] = await issueResolver.resolve({
    artifacts: harness.artifacts,
    input: { snapshotRef: harness.snapshotRef },
  });

  const packet = harness.writes.get(ref.id);

  assert.equal(packet.issue, undefined);
  assert.ok(packet.warnings.some((warning) => warning.includes("without an issue id or fragment")));
});

// ---------- CLI tests against the simple-js-ts fixture ----------

test("rekon resolve list reports all four resolvers", async () => {
  await withCliFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
    const parsed = JSON.parse(
      runCli(["resolve", "list", "--root", root, "--json"]).stdout,
    );
    const ids = parsed.resolvers.map((entry) => entry.id);

    for (const id of [
      "resolve.preflight",
      "resolve.route",
      "resolve.seam",
      "resolve.issue",
    ]) {
      assert.ok(ids.includes(id), `resolve list must include ${id}`);
    }
  });
});

test("rekon resolve route via friendly shortcut writes a route packet", async () => {
  await withCliFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
    const parsed = JSON.parse(
      runCli([
        "resolve",
        "route",
        "--root",
        root,
        "--path",
        "src/index.ts",
        "--goal",
        "modify bootstrap",
        "--json",
      ]).stdout,
    );

    assert.equal(parsed.packet.phase, "route");
    assert.ok(parsed.packet.resolutionTrace.length > 0);
    assert.ok(["single-owner", "cross-owner", "unresolved"].includes(parsed.packet.routing.status));
  });
});

test("rekon resolve seam via friendly shortcut writes a seam packet", async () => {
  await withCliFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
    const parsed = JSON.parse(
      runCli([
        "resolve",
        "seam",
        "--root",
        root,
        "--path",
        "src/index.ts",
        "--goal",
        "scoped seam",
        "--json",
      ]).stdout,
    );

    assert.equal(parsed.packet.phase, "seam");
    assert.ok(["resolved", "needs-primary-owner", "unresolved"].includes(parsed.packet.seam.status));
  });
});

test("rekon resolve issue via friendly shortcut surfaces no-match warning", async () => {
  await withCliFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
    const parsed = JSON.parse(
      runCli([
        "resolve",
        "issue",
        "--root",
        root,
        "--issue",
        "no-such-issue",
        "--json",
      ]).stdout,
    );

    assert.equal(parsed.packet.phase, "issue");
    assert.equal(parsed.packet.issue, undefined);
    assert.ok(parsed.packet.warnings.some((warning) => warning.includes("No finding matched")));
  });
});

test("rekon resolve run resolve.route dispatches the same handler", async () => {
  await withCliFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
    const parsed = JSON.parse(
      runCli([
        "resolve",
        "run",
        "resolve.route",
        "--root",
        root,
        "--input-json",
        '{"paths":["src/index.ts"],"goal":"modify bootstrap"}',
        "--json",
      ]).stdout,
    );

    assert.equal(parsed.packet.phase, "route");
    assert.ok(parsed.artifact);
  });
});

test("rekon resolve preflight still works after the new resolvers are added", async () => {
  await withCliFixture(async (root) => {
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
    assert.ok(parsed.packet.resolutionTrace.length > 0);
  });
});

test("artifacts freshness remains valid after writing route/seam/issue packets", async () => {
  await withCliFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli([
      "resolve",
      "route",
      "--root",
      root,
      "--path",
      "src/index.ts",
      "--goal",
      "smoke",
      "--json",
    ]);
    runCli([
      "resolve",
      "seam",
      "--root",
      root,
      "--path",
      "src/index.ts",
      "--goal",
      "smoke",
      "--json",
    ]);
    runCli([
      "resolve",
      "issue",
      "--root",
      root,
      "--issue",
      "no-such-issue",
      "--json",
    ]);

    const freshness = JSON.parse(
      runCli(["artifacts", "freshness", "--root", root, "--json"]).stdout,
    );
    const validate = JSON.parse(
      runCli(["artifacts", "validate", "--root", root, "--json"]).stdout,
    );

    assert.notEqual(freshness.status, "unknown");
    assert.equal(validate.valid, true, JSON.stringify(validate.issues, null, 2));
  });
});

// ---------- helpers ----------

function buildHarness(options = {}) {
  const writes = new Map();
  const reads = new Map();

  const snapshotRef = { type: "IntelligenceSnapshot", id: "snapshot-1", schemaVersion: "0.1.0" };
  const snapshot = {
    header: {
      artifactType: "IntelligenceSnapshot",
      artifactId: "snapshot-1",
      schemaVersion: "0.1.0",
      generatedAt: new Date().toISOString(),
      subject: { repoId: "synthetic" },
      producer: { id: "test-harness", version: "0.1.0" },
      inputRefs: [],
      freshness: { status: "fresh" },
    },
    repo: { id: "synthetic", root: "/synthetic" },
    inputs: { EvidenceGraph: [] },
    projections: {},
    evaluations: {},
    publications: {},
    actions: {},
    status: { freshness: "fresh", warnings: [], blockedReasons: [] },
  };

  if (options.ownershipMap) {
    const ref = registerArtifact(options.ownershipMap, "OwnershipMap", "ownership-map-1", writes, reads);
    snapshot.projections.OwnershipMap = [ref];
  }

  if (options.findingReport) {
    const ref = registerArtifact(options.findingReport, "FindingReport", "finding-report-1", writes, reads);
    snapshot.evaluations.FindingReport = [ref];
  }

  reads.set(`${snapshotRef.type}:${snapshotRef.id}`, snapshot);

  const artifacts = {
    async list(type) {
      return [...reads.keys()]
        .map((key) => {
          const value = reads.get(key);
          if (!value?.header) {
            return null;
          }
          return {
            type: value.header.artifactType,
            id: value.header.artifactId,
            schemaVersion: value.header.schemaVersion,
            path: `.rekon/artifacts/${value.header.artifactType}.json`,
            digest: "stub",
            writtenAt: value.header.generatedAt ?? new Date().toISOString(),
          };
        })
        .filter((entry) => entry !== null && (type === undefined || entry.type === type));
    },
    async read(ref) {
      const value = reads.get(`${ref.type}:${ref.id}`);
      if (!value) {
        throw new Error(`Synthetic harness has no artifact ${ref.type}:${ref.id}`);
      }
      return value;
    },
    async write(type, artifact) {
      const ref = {
        type,
        id: artifact.header.artifactId,
        schemaVersion: artifact.header.schemaVersion,
      };
      writes.set(ref.id, artifact);
      reads.set(`${type}:${ref.id}`, artifact);
      return ref;
    },
  };

  return { snapshotRef, artifacts, writes };
}

function registerArtifact(artifact, type, id, writes, reads) {
  reads.set(`${type}:${id}`, artifact);
  return { type, id, schemaVersion: "0.1.0" };
}

function ownershipMapFor(entries) {
  return {
    header: {
      artifactType: "OwnershipMap",
      artifactId: "ownership-map-1",
      schemaVersion: "0.1.0",
      generatedAt: new Date().toISOString(),
      subject: { repoId: "synthetic" },
      producer: { id: "test-harness", version: "0.1.0" },
      inputRefs: [],
      freshness: { status: "fresh" },
    },
    entries: entries.map((entry) => ({
      path: entry.path,
      ownerSystem: entry.ownerSystem,
      confidence: entry.confidence,
    })),
  };
}

function findingReportWith(findings) {
  return {
    header: {
      artifactType: "FindingReport",
      artifactId: "finding-report-1",
      schemaVersion: "0.1.0",
      generatedAt: new Date().toISOString(),
      subject: { repoId: "synthetic" },
      producer: { id: "test-harness", version: "0.1.0" },
      inputRefs: [],
      freshness: { status: "fresh" },
    },
    summary: {
      total: findings.length,
      bySeverity: {},
      byType: {},
    },
    findings: findings.map((finding) => ({
      ...finding,
      subjects: finding.files ?? [],
      status: "new",
    })),
  };
}

function assertTraceIncludes(packet, step) {
  assert.ok(
    packet.resolutionTrace.some((entry) => entry.step === step),
    `expected resolutionTrace to include step ${step}`,
  );
}

async function withCliFixture(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-resolver-cli-"));

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
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}
