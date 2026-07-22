// Contract tests for TaskContextReport v1 (slice 166). Exercises the pure
// `buildTaskContextReport` helper, the factory/validator boundary rules, and the
// `rekon context task` CLI end-to-end. Task-shaped context is proposal/context,
// not proof: deterministic graph facts outrank embedding similarity, ignored
// neighbors are excluded, evidence refs are preserved, verification hints are
// hints (never executed), and no source is written / no command executed / no
// PreparedIntentPlan / WorkOrder / VerificationPlan created.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import test from "node:test";

import {
  buildTaskContextReport,
  TASK_CONTEXT_REPORT_ARTIFACT_ID_PREFIX,
} from "@rekon/capability-model";
import {
  createTaskContextReport,
  validateTaskContextReport,
} from "@rekon/kernel-repo-model";
import { createLocalArtifactStore } from "@rekon/runtime";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const CLI = resolve(repoRoot, "packages/cli/dist/index.js");

const GRAPH_FIXTURE = {
  nodes: [
    { kind: "file", id: "src/index.ts" },
    { kind: "symbol", id: "src/index.ts#greet" },
    { kind: "file", id: "src/users/get-user.ts" },
    { kind: "capability", id: "cap:get:user" },
  ],
  claims: [
    {
      id: "claim-exposes",
      subject: { kind: "file", id: "src/index.ts" },
      predicate: "exposes",
      object: { kind: "symbol", id: "src/index.ts#greet" },
      source: "deterministic",
      confidence: 1,
      evidenceRefs: ["ev-1"],
      status: "accepted",
    },
    {
      id: "claim-semantic",
      subject: { kind: "file", id: "src/users/get-user.ts" },
      predicate: "summarized-as",
      object: "looks up a user by id",
      source: "llm",
      confidence: 0.6,
      evidenceRefs: ["sem-ev-1"],
      status: "accepted",
    },
  ],
  capabilities: [
    {
      id: "cap:get:user",
      verb: "get",
      noun: "user",
      implementedBy: [{ kind: "symbol", id: "src/users/get-user.ts#getUser" }],
      evidenceRefs: ["ev-cap-1"],
    },
  ],
};

const AT = "2026-01-01T00:00:00.000Z";
const TASK = "Add a marker export to src/index.ts. Do not change greet behavior. Verify with typecheck.";

const baseReport = buildTaskContextReport({
  taskText: TASK,
  paths: ["src/index.ts"],
  graph: GRAPH_FIXTURE,
  retrievalResults: [],
  generatedAt: AT,
  repoId: ".",
});

const rankedReport = buildTaskContextReport({
  taskText: "find user lookup code",
  paths: [],
  graph: GRAPH_FIXTURE,
  retrievalResults: [
    { score: 0.85, chunkId: "c-strong", kind: "file_summary", path: "src/strong.ts", chunk: { id: "c-strong", kind: "file_summary", path: "src/strong.ts" } },
    { score: 0.7, chunkId: "c-useful", kind: "file_summary", path: "src/useful.ts", chunk: { id: "c-useful", kind: "file_summary", path: "src/useful.ts" } },
    { score: 0.3, chunkId: "c-ignored", kind: "file_summary", path: "src/ignored.ts", chunk: { id: "c-ignored", kind: "file_summary", path: "src/ignored.ts" } },
  ],
  generatedAt: AT,
  repoId: ".",
});

// 1
test("builder creates a TaskContextReport", () => {
  assert.equal(baseReport.header.artifactType, "TaskContextReport");
  assert.equal(baseReport.schemaVersion, "0.1.0");
  assert.ok(baseReport.header.artifactId.startsWith(TASK_CONTEXT_REPORT_ARTIFACT_ID_PREFIX));
  assert.match(baseReport.header.supersession.key, /^task:[a-f0-9]{64}$/);
  assert.ok(baseReport.admission.decisions.length > 0);
  assert.equal(baseReport.admission.summary.refuted, 0);
});

test("legacy reports without an admission audit remain valid", () => {
  const legacy = structuredClone(baseReport);
  delete legacy.admission;
  assert.equal(validateTaskContextReport(legacy).ok, true);
});

// 2
test("factory forces all boundaries false", () => {
  const forced = createTaskContextReport({
    ...baseReport,
    boundaries: { ...baseReport.boundaries, retrievalIsProof: true, executedCommands: true },
  });
  assert.ok(Object.values(forced.boundaries).every((value) => value === false));
});

// 3
test("validator rejects a non-false boundary", () => {
  const bad = structuredClone(baseReport);
  bad.boundaries.retrievalIsProof = true;
  assert.equal(validateTaskContextReport(bad).ok, false);
});

test("validator rejects unknown constraint guidance source and freshness", () => {
  const badSource = structuredClone(baseReport);
  badSource.doNotTouch[0].source = "model_guess";
  assert.equal(validateTaskContextReport(badSource).ok, false);

  const badFreshness = structuredClone(baseReport);
  badFreshness.verificationHints[0].freshness = "current";
  assert.equal(validateTaskContextReport(badFreshness).ok, false);
});

// 4
test("empty task text is invalid", () => {
  const bad = structuredClone(baseReport);
  bad.task.text = "";
  assert.equal(validateTaskContextReport(bad).ok, false);
});

// 5
test("operator-provided path becomes a context item", () => {
  const item = baseReport.contextItems.find(
    (entry) => entry.source === "operator_input" && entry.path === "src/index.ts",
  );
  assert.equal(item?.routeRole, "task-target");
  assert.equal(item?.necessity, "required");
  assert.match(item?.necessityReason ?? "", /operator explicitly named/iu);
});

test("route metadata is additive and legacy TaskContextReport items still validate", () => {
  const legacy = structuredClone(baseReport);
  for (const item of legacy.contextItems) {
    delete item.routeRole;
    delete item.necessity;
    delete item.necessityReason;
  }
  assert.equal(validateTaskContextReport(legacy).ok, true);
});

test("validator rejects partial or unknown route metadata", () => {
  const partial = structuredClone(baseReport);
  delete partial.contextItems[0].necessityReason;
  assert.equal(validateTaskContextReport(partial).ok, false);

  const unknown = structuredClone(baseReport);
  unknown.contextItems[0].routeRole = "maybe-useful";
  assert.equal(validateTaskContextReport(unknown).ok, false);
});

// 6
test("strong embedding neighbor becomes a context item", () => {
  const item = rankedReport.contextItems.find(
    (entry) => entry.source === "embedding_retrieval" && entry.path === "src/strong.ts" && entry.scoreBand === "strong",
  );
  assert.equal(item?.routeRole, "supporting");
  assert.equal(item?.necessity, "supporting");
});

// 7
test("useful embedding neighbor becomes a context item", () => {
  assert.ok(
    rankedReport.contextItems.some(
      (item) => item.source === "embedding_retrieval" && item.path === "src/useful.ts" && item.scoreBand === "useful",
    ),
  );
});

// 8
test("ignored embedding neighbor is excluded by default", () => {
  assert.ok(!rankedReport.contextItems.some((item) => item.path === "src/ignored.ts"));
});

// 9
test("deterministic graph facts appear in context when connected", () => {
  assert.ok(
    baseReport.contextItems.some((item) => item.source === "deterministic_graph" && item.path === "src/index.ts"),
  );
});

// 10
test("evidence refs are preserved", () => {
  const det = baseReport.contextItems.find((item) => item.source === "deterministic_graph");
  assert.ok(det && det.evidenceRefs.includes("claim-exposes"));
  const strong = rankedReport.contextItems.find((item) => item.path === "src/strong.ts");
  assert.ok(strong && strong.evidenceRefs.includes("c-strong"));
});

// 11
test("do-not-touch zone is created from an explicit task constraint", () => {
  assert.ok(baseReport.doNotTouch.some((zone) => /do not change greet/i.test(zone.reason)));
});

// 12
test("verification hint is created as a hint only", () => {
  const hint = baseReport.verificationHints.find((entry) => entry.command === "npm run typecheck");
  assert.ok(hint, "expected an npm run typecheck verification hint");
  assert.deepEqual(hint.evidenceRefs, []);
  assert.equal(baseReport.boundaries.executedCommands, false);
});

test("an explicit test command is not duplicated by a generic test hint", () => {
  const report = buildTaskContextReport({
    taskText: "Change src/index.ts and run npm run test.",
    paths: ["src/index.ts"],
    graph: GRAPH_FIXTURE,
    generatedAt: AT,
    repoId: ".",
  });

  assert.deepEqual(
    report.verificationHints.map((hint) => hint.command).filter(Boolean),
    ["npm run test"],
  );
});

test("without-changing and preserve language become explicit pact constraints", () => {
  const report = buildTaskContextReport({
    taskText: "Change src/index.ts without changing its public contract. Preserve greeting behavior.",
    paths: ["src/index.ts"],
    graph: GRAPH_FIXTURE,
    generatedAt: AT,
    repoId: ".",
  });

  assert.deepEqual(
    report.doNotTouch.map((zone) => zone.reason),
    [
      "Change src/index.ts without changing its public contract.",
      "Preserve greeting behavior.",
    ],
  );
  assert.ok(report.doNotTouch.every((zone) => zone.path === undefined));
});

test("preserving language and non-JavaScript test commands remain explicit", () => {
  const report = buildTaskContextReport({
    taskText: "Refactor the service while preserving event behavior. Run pytest and go test ./...",
    paths: ["src/index.ts"],
    graph: GRAPH_FIXTURE,
    generatedAt: AT,
    repoId: ".",
  });

  assert.deepEqual(report.doNotTouch.map((zone) => zone.reason), [
    "Refactor the service while preserving event behavior.",
  ]);
  assert.deepEqual(
    report.verificationHints.map((hint) => hint.command).filter(Boolean),
    ["pytest", "go test ./..."],
  );
});

// ---- CLI end-to-end ----

function runCli(args, { cwd } = {}) {
  // This suite deliberately rewrites graph artifacts to exercise compiler
  // behavior. Freshness/refresh behavior has separate end-to-end coverage.
  const commandArgs = args[0] === "context" && args[1] === "task" && !args.includes("--no-auto-refresh")
    ? [...args, "--no-auto-refresh"]
    : args;
  try {
    const stdout = execFileSync("node", [CLI, ...commandArgs], {
      cwd: cwd ?? repoRoot,
      encoding: "utf8",
      env: { ...process.env, VOYAGE_API_KEY: "", OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "" },
    });
    return { status: 0, stdout, stderr: "" };
  } catch (error) {
    return { status: error.status ?? 1, stdout: error.stdout ?? "", stderr: error.stderr ?? "" };
  }
}

async function setupFixture() {
  const dir = mkdtempSync(join(tmpdir(), "rekon-task-context-"));
  const root = join(dir, "fixture");
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "fixture", version: "0.0.0", type: "module" }, null, 2));
  writeFileSync(
    join(root, "src", "index.ts"),
    [
      'export const existing = "ok";',
      "",
      "export function greet(name: string): string {",
      "  return `hello ${name}`;",
      "}",
      "",
      "export function marker(): string {",
      '  return "marker";',
      "}",
      "",
    ].join("\n"),
  );
  execFileSync("git", ["init", "-q"], { cwd: root });
  execFileSync("git", ["-c", "user.email=t@e.x", "-c", "user.name=t", "add", "-A"], { cwd: root });
  execFileSync("git", ["-c", "user.email=t@e.x", "-c", "user.name=t", "commit", "-qm", "init"], { cwd: root });
  runCli(["capability", "graph", "build", "--root", root, "--json"]);
  const store = createLocalArtifactStore(root);
  let graphRef = (await store.list("CapabilityEvidenceGraph")).at(-1);
  assert.ok(graphRef);
  let graph = await store.read(graphRef);
  let capability = graph.capabilities.find((entry) =>
    entry.implementedBy?.some((ref) => ref.id.split("#")[0] === "src/index.ts"),
  );
  if (!capability) {
    capability = {
      id: "capability:manage:fixture",
      verb: "manage",
      noun: "fixture",
      implementedBy: [{ kind: "file", id: "src/index.ts" }],
      evidenceRefs: ["EvidenceGraph:fixture-index"],
    };
    graph = {
      ...graph,
      header: {
        ...graph.header,
        artifactId: "fixture-capability-evidence-graph",
        generatedAt: new Date().toISOString(),
        inputRefs: [graphRef],
      },
      capabilities: [...graph.capabilities, capability],
    };
    graphRef = await store.write(graph, { category: "graphs" });
  }
  assert.ok(capability?.verb && capability?.noun);
  const mapRef = (await store.list("CapabilityMap")).at(-1) ?? {
    type: "CapabilityMap",
    id: "fixture-capability-map",
    schemaVersion: "0.1.0",
  };
  await store.write({
    header: {
      artifactType: "CapabilityContract",
      artifactId: "fixture-context-contract",
      schemaVersion: "0.1.0",
      generatedAt: new Date().toISOString(),
      subject: { repoId: root, paths: ["src/index.ts"] },
      producer: { id: "@rekon/test.task-context-contract", version: "1.0.0" },
      inputRefs: [mapRef],
      freshness: { status: "fresh" },
      provenance: { confidence: 1, notes: ["contract fixture"] },
    },
    source: { capabilityMapRef: mapRef },
    summary: {
      total: 1,
      configured: 1,
      suggested: 0,
      unmatched: 0,
      withRequiredChecks: 1,
      withPlacementRules: 0,
      withPreservationRules: 1,
    },
    contracts: [{
      id: "fixture-index-law",
      capabilityRef: { capabilityMapRef: mapRef, phraseCapabilityId: capability.id },
      match: { verb: capability.verb, noun: capability.noun },
      status: "configured",
      requiredChecks: ["npm run typecheck"],
      preservationRules: ["Keep fixture public behavior stable."],
    }],
  }, { category: "projections" });
  return root;
}

function rekonArtifactTypes(root) {
  const types = new Set();
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".json")) {
        try {
          const parsed = JSON.parse(readFileSync(full, "utf8"));
          const type = parsed?.header?.artifactType;
          if (typeof type === "string") types.add(type);
        } catch {
          /* ignore non-artifact json */
        }
      }
    }
  };
  const rekonDir = join(root, ".rekon");
  if (existsSync(rekonDir)) walk(rekonDir);
  return types;
}

const cliRoot = await setupFixture();
const cliJson = (() => {
  const result = runCli(["context", "task", "--root", cliRoot, "--task", TASK, "--path", "src/index.ts", "--json"]);
  return JSON.parse(result.stdout);
})();
const storeTypes = rekonArtifactTypes(cliRoot);
const cliDeclaredJson = (() => {
  const result = runCli([
    "context", "task", "--root", cliRoot,
    "--task", "Change src/index.ts.",
    "--path", "src/index.ts",
    "--json",
  ]);
  return JSON.parse(result.stdout);
})();

// 13
test("TaskContextReport creates no PreparedIntentPlan", () => {
  assert.equal(cliJson.boundaries.createdPreparedIntentPlan, false);
  assert.ok(!storeTypes.has("PreparedIntentPlan"));
});

// 14
test("TaskContextReport creates no WorkOrder", () => {
  assert.equal(cliJson.boundaries.createdWorkOrder, false);
  assert.ok(!storeTypes.has("WorkOrder"));
});

// 15
test("TaskContextReport creates no VerificationPlan", () => {
  assert.equal(cliJson.boundaries.createdVerificationPlan, false);
  assert.ok(!storeTypes.has("VerificationPlan"));
});

// 16
test("TaskContextReport executes no commands", () => {
  assert.equal(cliJson.boundaries.executedCommands, false);
  assert.equal(cliJson.boundaries.ranCirce, false);
});

// 17
test("TaskContextReport writes no source files", () => {
  assert.equal(cliJson.boundaries.wroteSourceFiles, false);
  const diff = execFileSync("git", ["status", "--porcelain", "src/index.ts"], { cwd: cliRoot, encoding: "utf8" });
  assert.equal(diff.trim(), "");
});

// 18
test("CLI context task --path writes a TaskContextReport when the graph exists", () => {
  assert.equal(cliJson.artifact.type, "TaskContextReport");
  assert.ok(typeof cliJson.artifact.id === "string" && cliJson.artifact.id.length > 0);
  assert.ok(storeTypes.has("TaskContextReport"));
});

// 19
test("CLI JSON includes contextItems", () => {
  assert.ok(Array.isArray(cliJson.contextItems) && cliJson.contextItems.length > 0);
  assert.ok(cliJson.contextItems.every((item) => typeof item.reason === "string" && item.reason.length > 0));
});

// 20
test("CLI JSON includes doNotTouch", () => {
  assert.ok(Array.isArray(cliJson.doNotTouch));
  assert.ok(cliJson.doNotTouch.some((zone) => /do not change greet/i.test(zone.reason)));
});

// 21
test("CLI JSON includes verificationHints", () => {
  assert.ok(Array.isArray(cliJson.verificationHints));
  assert.ok(cliJson.verificationHints.some((hint) => hint.command === "npm run typecheck"));
});

test("CLI terse task selects repository contract constraints and checks", () => {
  assert.deepEqual(cliDeclaredJson.matchedCapabilityContracts, ["fixture-index-law"]);
  assert.ok(cliDeclaredJson.doNotTouch.some((zone) =>
    zone.source === "repository_contract"
    && zone.reason === "Keep fixture public behavior stable."));
  assert.ok(cliDeclaredJson.verificationHints.some((hint) =>
    hint.source === "repository_contract"
    && hint.command === "npm run typecheck"));
  assert.ok(cliDeclaredJson.agentContext.doNotTouch.some((zone) => zone.trust === "declared"));
  assert.ok(cliDeclaredJson.agentContext.verificationHints.some((hint) => hint.trust === "declared"));
});

// 22
test("CLI human output includes Task Context", () => {
  const human = runCli(["context", "task", "--root", cliRoot, "--task", TASK, "--path", "src/index.ts"]);
  assert.ok(human.stdout.includes("Task Context"));
});

// 23
test("CLI help lists context task", () => {
  const help = runCli(["--help"]);
  assert.ok(help.stdout.includes("context task"));
});

// 24
test("artifacts validate clean", () => {
  const validate = JSON.parse(runCli(["artifacts", "validate", "--root", cliRoot, "--json"]).stdout);
  assert.equal(validate.valid, true);
});

// 25
test("source files unchanged", () => {
  // The command writes its artifact to the `.rekon/` store (its intended output
  // location); a fresh fixture repo does not gitignore it. The assertion is that
  // no SOURCE files changed — so filter the artifact store out.
  const changed = execFileSync("git", ["status", "--porcelain"], { cwd: cliRoot, encoding: "utf8" })
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !line.includes(".rekon/"));
  assert.deepEqual(changed, []);
});

// 26
test("CLI uses cached embedding neighbors when present", () => {
  runCli(["embeddings", "index", "--root", cliRoot, "--all", "--provider", "mock", "--model", "mock-embedding", "--json"]);
  const withCache = JSON.parse(
    runCli(["context", "task", "--root", cliRoot, "--task", "look up the user", "--provider", "mock", "--model", "mock-embedding", "--json"]).stdout,
  );
  // Retrieval was consulted: no retrieval-unavailable warning when the cache exists
  // and the provider can embed.
  assert.ok(!withCache.warnings.some((warning) => warning.includes("retrieval-unavailable")));
});

// 27
test("CLI missing provider with no explicit paths fails cleanly", async () => {
  const freshRoot = await setupFixture();
  const result = runCli(["context", "task", "--root", freshRoot, "--task", "do something", "--json"]);
  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, "failed");
  assert.equal(payload.error, "context-retrieval-unavailable");
});
