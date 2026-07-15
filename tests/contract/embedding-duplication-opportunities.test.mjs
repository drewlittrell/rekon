import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import policyCapability, {
  evaluateEmbeddingDuplicationCandidates,
} from "../../packages/capability-policy/dist/index.js";
import { createRuntime } from "../../packages/runtime/dist/index.js";

const logger = { info() {}, warn() {}, error() {} };
const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const graphRef = { type: "CapabilityEvidenceGraph", id: "graph", schemaVersion: "0.1.0" };

test("same-file capability candidates remain silent", () => {
  const assessments = evaluateEmbeddingDuplicationCandidates({
    claims: [
      capabilityClaim("left-right", "cap:load:file", "cap:load:directory", 0.97, "embed"),
      capabilityClaim("right-left", "cap:load:directory", "cap:load:file", 0.97, "embed"),
    ],
    capabilities: [
      { id: "cap:load:file", implementedBy: [{ kind: "symbol", id: "src/load.ts#loadFile" }] },
      { id: "cap:load:directory", implementedBy: [{ kind: "symbol", id: "src/load.ts#loadDirectory" }] },
    ],
  }, graphRef);

  assert.deepEqual(assessments, []);
});

test("directly linked modules remain silent", () => {
  const assessments = evaluateEmbeddingDuplicationCandidates({
    claims: [
      claim("left-right", "src/a.ts#run", "src/b.ts#runInternal", 0.97, "embed"),
      claim("right-left", "src/b.ts#runInternal", "src/a.ts#run", 0.97, "embed"),
      {
        id: "imports",
        subject: { kind: "file", id: "src/a.ts" },
        predicate: "imports",
        object: "./b.js",
        source: "deterministic",
      },
    ],
    capabilities: [],
  }, graphRef);

  assert.deepEqual(assessments, []);
});

test("reciprocal embedding duplicate claims become one opportunity and no finding", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-embedding-duplication-"));
  try {
    const runtime = await createRuntime({ repoRoot: root, repoId: "similarity-fixture", capabilities: [policyCapability], logger });
    const evidenceRef = await runtime.artifacts.write({
      header: header("EvidenceGraph", "evidence", []),
      facts: [],
    });
    const graphRef = await runtime.artifacts.write({
      header: header("CapabilityEvidenceGraph", "capability-graph", [evidenceRef]),
      schemaVersion: "0.1.0",
      status: { value: "built", reason: "fixture" },
      nodes: [],
      evidence: [
        { id: "embed-a", source: "embedding_similarity", path: "src/a.ts", excerpt: "fixture" },
        { id: "embed-b", source: "embedding_similarity", path: "src/b.ts", excerpt: "fixture" },
      ],
      claims: [
        claim("a-to-b", "src/a.ts#loadUser", "src/b.ts#fetchUser", 0.97, "embed-a"),
        claim("b-to-a", "src/b.ts#fetchUser", "src/a.ts#loadUser", 0.96, "embed-b"),
        claim("self", "src/a.ts#loadUser", "src/a.ts#loadUser", 0.99, "embed-a"),
        { ...claim("merely-similar", "src/a.ts#loadUser", "src/c.ts#renderUser", 0.8, "embed-a"), predicate: "similar_to" },
      ],
      capabilities: [],
      summary: {},
      boundaries: {},
    }, { category: "graphs" });

    const refs = await runtime.runEvaluate();
    const findingReport = await runtime.artifacts.read(refs.find((ref) => ref.type === "FindingReport"));
    const assessmentReport = await runtime.artifacts.read(refs.find((ref) => ref.type === "AssessmentReport"));
    const opportunities = assessmentReport.assessments.filter((assessment) => assessment.ruleId === "similarity.duplicateCandidate");

    assert.equal(findingReport.summary.total, 0);
    assert.equal(opportunities.length, 1);
    assert.equal(opportunities[0].kind, "opportunity");
    assert.deepEqual(opportunities[0].files, ["src/a.ts", "src/b.ts"]);
    assert.equal(opportunities[0].confidence.verification, "unverified");
    assert.equal(opportunities[0].details.reciprocalClaims, 2);
    assert.equal(opportunities[0].details.similarity, 0.97);
    assert.equal(opportunities[0].evidence.length, 1);
    assert.equal(opportunities[0].evidence[0].type, graphRef.type);
    assert.equal(opportunities[0].evidence[0].id, graphRef.id);
    assert.equal(opportunities[0].evidence[0].schemaVersion, graphRef.schemaVersion);
    assert.equal(assessmentReport.header.inputRefs.some((ref) => ref.type === "CapabilityEvidenceGraph"), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("one-way embedding neighbors remain context and do not become duplicate opportunities", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-embedding-one-way-"));
  try {
    const runtime = await createRuntime({ repoRoot: root, repoId: "similarity-fixture", capabilities: [policyCapability], logger });
    const evidenceRef = await runtime.artifacts.write({
      header: header("EvidenceGraph", "evidence", []),
      facts: [],
    });
    await runtime.artifacts.write({
      header: header("CapabilityEvidenceGraph", "capability-graph", [evidenceRef]),
      schemaVersion: "0.1.0",
      status: { value: "built", reason: "fixture" },
      nodes: [],
      evidence: [{ id: "embed-a", source: "embedding_similarity", path: "src/a.ts", excerpt: "fixture" }],
      claims: [claim("a-to-b", "src/a.ts#loadUser", "src/b.ts#fetchUser", 0.97, "embed-a")],
      capabilities: [],
      summary: {},
      boundaries: {},
    }, { category: "graphs" });

    const refs = await runtime.runEvaluate();
    const assessmentReport = await runtime.artifacts.read(refs.find((ref) => ref.type === "AssessmentReport"));
    assert.equal(
      assessmentReport.assessments.filter((assessment) => assessment.ruleId === "similarity.duplicateCandidate").length,
      0,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("embedding duplicates in non-production paths remain silent", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-embedding-non-production-"));
  try {
    const runtime = await createRuntime({ repoRoot: root, repoId: "similarity-fixture", capabilities: [policyCapability], logger });
    const evidenceRef = await runtime.artifacts.write({
      header: header("EvidenceGraph", "evidence", []),
      facts: [],
    });
    await runtime.artifacts.write({
      header: header("CapabilityEvidenceGraph", "capability-graph", [evidenceRef]),
      schemaVersion: "0.1.0",
      status: { value: "built", reason: "fixture" },
      nodes: [],
      evidence: [{ id: "embed-a", source: "embedding_similarity", path: "tools/a.ts", excerpt: "fixture" }],
      claims: [
        claim("a-to-b", "tools/a.ts#loadUser", "tools/b.ts#fetchUser", 0.97, "embed-a"),
        claim("b-to-a", "tools/b.ts#fetchUser", "tools/a.ts#loadUser", 0.97, "embed-a"),
      ],
      capabilities: [],
      summary: {},
      boundaries: {},
    }, { category: "graphs" });

    const refs = await runtime.runEvaluate();
    const assessmentReport = await runtime.artifacts.read(refs.find((ref) => ref.type === "AssessmentReport"));
    assert.equal(
      assessmentReport.assessments.filter((assessment) => assessment.ruleId === "similarity.duplicateCandidate").length,
      0,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("reciprocal capability similarity cites implementation files without claiming ownership overlap", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-embedding-capability-paths-"));
  try {
    const runtime = await createRuntime({ repoRoot: root, repoId: "similarity-fixture", capabilities: [policyCapability], logger });
    const evidenceRef = await runtime.artifacts.write({
      header: header("EvidenceGraph", "evidence", []),
      facts: [],
    });
    await runtime.artifacts.write({
      header: header("CapabilityEvidenceGraph", "capability-graph", [evidenceRef]),
      schemaVersion: "0.1.0",
      status: { value: "built", reason: "fixture" },
      nodes: [],
      evidence: [{ id: "embed-a", source: "embedding_similarity", path: "src/alpha/load.ts", excerpt: "fixture" }],
      claims: [
        capabilityClaim("a-to-b", "cap:get:user", "cap:fetch:user", 0.97, "embed-a"),
        capabilityClaim("b-to-a", "cap:fetch:user", "cap:get:user", 0.96, "embed-a"),
      ],
      capabilities: [
        { id: "cap:get:user", verb: "get", noun: "user", implementedBy: [{ kind: "symbol", id: "src/alpha/load.ts#getUser" }] },
        { id: "cap:fetch:user", verb: "fetch", noun: "user", implementedBy: [{ kind: "symbol", id: "src/beta/fetch.ts#fetchUser" }] },
      ],
      summary: {},
      boundaries: {},
    }, { category: "graphs" });

    const refs = await runtime.runEvaluate();
    const assessmentReport = await runtime.artifacts.read(refs.find((ref) => ref.type === "AssessmentReport"));
    const candidates = assessmentReport.assessments.filter((assessment) => assessment.ruleId === "similarity.duplicateCandidate");

    assert.equal(candidates.length, 1);
    assert.deepEqual(candidates[0].files, ["src/alpha/load.ts", "src/beta/fetch.ts"]);
    assert.equal(candidates[0].confidence.basis, "semantic");
    assert.equal(candidates[0].confidence.verification, "unverified");
    assert.equal(assessmentReport.assessments.some((assessment) => assessment.ruleId === "capability.overlap"), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("CLI embedding graph flow exposes duplicate candidates through assessments", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-embedding-duplication-cli-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    const implementation = Array.from(
      { length: 20 },
      (_, index) => `export function normalizeUser${index}(value: string): string { return value.trim().toLowerCase(); }`,
    ).join("\n");
    await writeFile(join(root, "src", "a.ts"), implementation, "utf8");
    await writeFile(join(root, "src", "b.ts"), implementation, "utf8");
    await writeFile(join(root, "package.json"), JSON.stringify({ name: "duplication-fixture", type: "module" }), "utf8");

    runCli(root, ["observe", "--json"]);
    runCli(root, ["capability", "graph", "build", "--json"]);
    runCli(root, ["embeddings", "index", "--all", "--provider", "mock", "--model", "mock-embedding", "--json"]);
    runCli(root, ["capability", "graph", "build", "--embedding-similarity", "latest", "--json"]);
    runCli(root, ["evaluate", "--json"]);
    const payload = JSON.parse(runCli(root, ["assessments", "list", "--kind", "opportunity", "--json"]).stdout);
    const candidates = payload.assessments.filter((assessment) => assessment.ruleId === "similarity.duplicateCandidate");

    assert.ok(candidates.length > 0);
    assert.ok(candidates.some((candidate) => (
      candidate.files?.includes("src/a.ts") && candidate.files?.includes("src/b.ts")
    )));
    assert.equal(candidates.every((candidate) => candidate.kind === "opportunity"), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function claim(id, source, target, confidence, evidenceRef) {
  return {
    id,
    subject: { kind: "symbol", id: source },
    predicate: "duplicate_candidate",
    object: { kind: "symbol", id: target },
    claimType: "inference",
    source: "embedding",
    confidence,
    evidenceRefs: [evidenceRef],
    status: "accepted",
  };
}

function capabilityClaim(id, source, target, confidence, evidenceRef) {
  return {
    ...claim(id, source, target, confidence, evidenceRef),
    subject: { kind: "capability", id: source },
    object: { kind: "capability", id: target },
  };
}

function header(artifactType, artifactId, inputRefs) {
  return {
    artifactType,
    artifactId,
    schemaVersion: "0.1.0",
    generatedAt: "2026-07-10T00:00:00.000Z",
    subject: { repoId: "similarity-fixture" },
    producer: { id: "test", version: "1.0.0" },
    inputRefs,
    freshness: { status: "fresh" },
    provenance: { confidence: 1 },
  };
}

function runCli(root, args) {
  const result = spawnSync(process.execPath, [cliPath, ...args, "--root", root], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, REKON_LLM_ENABLED: "false" },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}
