import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import graphCapability from "../dist/index.js";
import { createRuntime } from "@rekon/runtime";

test("graph capability projects structural and application-context slices", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-graph-"));

  try {
    const runtime = await createRuntime({
      repoRoot: root,
      capabilities: [graphCapability],
    });
    await runtime.artifacts.write({
      header: {
        artifactType: "EvidenceGraph",
        artifactId: "evidence-1",
        schemaVersion: "0.1.0",
        generatedAt: new Date().toISOString(),
        subject: { repoId: "repo" },
        producer: { id: "test", version: "0.1.0" },
        inputRefs: [],
      },
      facts: [
        { kind: "file", subject: "src/index.ts", value: {}, confidence: 1 },
        { kind: "file", subject: "src/user-service.ts", value: { path: "src/user-service.ts" }, confidence: 1 },
        { kind: "file", subject: "app/api/users/route.ts", value: { path: "app/api/users/route.ts" }, confidence: 1 },
        { kind: "file", subject: "app/users/page.tsx", value: { path: "app/users/page.tsx" }, confidence: 1 },
        { kind: "file", subject: "tests/user.test.ts", value: { path: "tests/user.test.ts" }, confidence: 1 },
        { kind: "import", subject: "src/index.ts", value: { target: "src/util.ts" }, confidence: 1 },
        { kind: "import", subject: "tests/user.test.ts:../src/user-service", value: { source: "tests/user.test.ts", target: "../src/user-service" }, confidence: 1 },
        { kind: "import", subject: "app/api/users/route.ts:../../../src/user-service", value: { source: "app/api/users/route.ts", target: "../../../src/user-service" }, confidence: 1 },
        { kind: "import", subject: "app/users/page.tsx:../../src/user-service", value: { source: "app/users/page.tsx", target: "../../src/user-service" }, confidence: 1 },
        { kind: "export", subject: "src/index.ts", value: { name: "value" }, confidence: 1 },
        { kind: "ownership_hint", subject: "src/index.ts", value: { path: "src/index.ts", system: "src" }, confidence: 0.8 },
        { kind: "manifest", subject: "package.json", value: { path: "package.json", name: "fixture" }, confidence: 1 },
        { kind: "build_target", subject: "package.json#test", value: { path: "package.json", name: "test" }, confidence: 1 },
        { kind: "route", subject: "app/api/users/route.ts", value: { path: "app/api/users/route.ts", framework: "nextjs-app-router", routePath: "/api/users" }, confidence: 1 },
        { kind: "screen", subject: "app/users/page.tsx", value: { path: "app/users/page.tsx", framework: "nextjs-app-router", routePath: "/users" }, confidence: 1 },
        { kind: "test", subject: "tests/user.test.ts", value: { path: "tests/user.test.ts", framework: "node-test", testKind: "unit" }, confidence: 1 },
        { kind: "capability_hint", subject: "src/user-service.ts", value: { path: "src/user-service.ts", capability: "users" }, confidence: 0.9 },
      ],
    });
    const runtimeObservationRef = await runtime.artifacts.write({
      header: {
        artifactType: "RuntimeGraphObservationReport",
        artifactId: "runtime-observation-1",
        schemaVersion: "0.1.0",
        generatedAt: new Date().toISOString(),
        subject: { repoId: "repo" },
        producer: { id: "test-instrumentation", version: "1.0.0" },
        inputRefs: [],
        provenance: { confidence: 0.9 },
      },
      source: { eventLogPath: ".rekon/handoff-events.jsonl" },
      summary: { observedNodes: 3, observedEdges: 2, handoffEvents: 0, executionObservations: 1, ignoredRows: 0, parseErrors: 0 },
      nodes: [
        { id: "test:tests/user.test.ts", kind: "test", label: "tests/user.test.ts", source: "runtime-event-log", observedCount: 1, evidenceRefs: [{ line: 1 }] },
        { id: "file:src/user-service.ts", kind: "file", label: "src/user-service.ts", source: "runtime-event-log", observedCount: 1, evidenceRefs: [{ line: 1 }] },
        { id: "route:/api/users", kind: "route", label: "/api/users", source: "runtime-event-log", observedCount: 1, evidenceRefs: [{ line: 1 }] },
      ],
      edges: [
        { id: "observed-file", kind: "observed-execution", fromNodeId: "test:tests/user.test.ts", toNodeId: "file:src/user-service.ts", observedCount: 1, evidenceRefs: [{ line: 1 }] },
        { id: "observed-route", kind: "observed-execution", fromNodeId: "test:tests/user.test.ts", toNodeId: "route:/api/users", observedCount: 1, evidenceRefs: [{ line: 1 }] },
      ],
    });

    const refs = await runtime.runProject({
      projectorId: "@rekon/capability-graph.projector",
    });

    assert.deepEqual(refs.map((ref) => ref.type), ["GraphSlice", "GraphSlice", "GraphSlice", "GraphSlice"]);

    const importGraph = await runtime.artifacts.read(refs[0]);
    assert.equal(importGraph.edges[0].kind, "imports");
    assert.ok(importGraph.edges.some((edge) =>
      edge.source === "tests/user.test.ts"
      && edge.target === "src/user-service.ts"
      && edge.metadata.resolved === true));
    assert.equal(importGraph.edges.some((edge) => edge.source.includes(":")), false);
    const applicationGraph = await runtime.artifacts.read(refs[3]);
    assert.ok(applicationGraph.nodes.some((node) => node.kind === "route" && node.metadata.routePath === "/api/users"));
    assert.ok(applicationGraph.nodes.some((node) => node.kind === "screen"));
    assert.ok(applicationGraph.nodes.some((node) => node.kind === "test"));
    assert.ok(applicationGraph.nodes.some((node) => node.kind === "capability" && node.metadata.capability === "users"));
    assert.ok(applicationGraph.nodes.some((node) => node.kind === "build_target"));
    assert.ok(applicationGraph.edges.some((edge) =>
      edge.source === "test:tests/user.test.ts"
      && edge.target === "src/user-service.ts"
      && edge.kind === "depends_on"));
    assert.ok(applicationGraph.edges.some((edge) =>
      edge.source === "test:tests/user.test.ts"
      && edge.target.startsWith("route:")
      && edge.kind === "related_to"
      && edge.metadata.relationship === "shared-dependency"));
    assert.ok(applicationGraph.edges.some((edge) =>
      edge.source === "test:tests/user.test.ts"
      && edge.target.startsWith("screen:")
      && edge.kind === "related_to"));
    assert.ok(applicationGraph.edges.some((edge) =>
      edge.source === "test:tests/user.test.ts"
      && edge.target === "src/user-service.ts"
      && edge.kind === "observed"
      && edge.metadata.relationship === "observed-execution"));
    assert.ok(applicationGraph.edges.some((edge) =>
      edge.source === "test:tests/user.test.ts"
      && edge.target.startsWith("route:")
      && edge.kind === "observed"));
    assert.equal(applicationGraph.header.inputRefs.some((ref) => ref.id === runtimeObservationRef.id), true);
    assert.ok(applicationGraph.edges.some((edge) =>
      edge.source === "test:tests/user.test.ts"
      && edge.target === "capability:users"
      && edge.kind === "related_to"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
