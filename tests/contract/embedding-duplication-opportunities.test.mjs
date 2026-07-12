import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import policyCapability from "../../packages/capability-policy/dist/index.js";
import { createRuntime } from "../../packages/runtime/dist/index.js";

const logger = { info() {}, warn() {}, error() {} };
const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");

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

test("CLI embedding graph flow exposes duplicate candidates through assessments", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-embedding-duplication-cli-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    const implementation = "export function normalizeUser(value: string): string { return value.trim().toLowerCase(); }\n";
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
