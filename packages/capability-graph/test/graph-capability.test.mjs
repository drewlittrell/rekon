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
        { kind: "file", subject: "src/cli.ts", value: { path: "src/cli.ts" }, confidence: 1 },
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
        { kind: "call", subject: "app/api/users/route.ts:GET->src/user-service.ts:listUsers", value: { source: "app/api/users/route.ts", caller: "GET", targetFile: "src/user-service.ts", targetSymbol: "listUsers", resolution: "import-binding", callKind: "call" }, confidence: 1 },
        { kind: "call", subject: "src/cli.ts:__module__->src/cli.ts:main", value: { source: "src/cli.ts", caller: "__module__", targetFile: "src/cli.ts", targetSymbol: "main", resolution: "local-binding", callKind: "call" }, confidence: 1 },
        { kind: "entry_point", subject: "route:app/api/users/route.ts", value: { path: "app/api/users/route.ts", entryKind: "route", source: "framework-convention", routePath: "/api/users", handlers: ["GET"] }, confidence: 1 },
        { kind: "entry_point", subject: "cli:src/cli.ts", value: { path: "src/cli.ts", entryKind: "cli", source: "cli-convention" }, confidence: 1 },
        { kind: "entry_point", subject: "test:tests/user.test.ts", value: { path: "tests/user.test.ts", entryKind: "test", source: "framework-convention" }, confidence: 1 },
        { kind: "event_flow", subject: "src/user-service.ts:listUsers:emit:user.loaded", value: { source: "src/user-service.ts", caller: "listUsers", action: "emit", eventName: "user.loaded", receiver: "events" }, confidence: 1 },
        { kind: "state_access", subject: "src/user-service.ts:listUsers:@prisma/client:user.findMany", value: { source: "src/user-service.ts", caller: "listUsers", package: "@prisma/client", binding: "prisma", operation: "user.findMany" }, confidence: 1 },
        { kind: "output_flow", subject: "src/cli.ts:main:process.stdout.write", value: { source: "src/cli.ts", caller: "main", channel: "stdout", operation: "process.stdout.write" }, confidence: 1 },
        { kind: "error_flow", subject: "src/user-service.ts:listUsers:rethrow:20:3", value: { source: "src/user-service.ts", caller: "listUsers", action: "rethrow", errorName: "error", errorIdentity: "error", line: 20 }, confidence: 1 },
        { kind: "error_flow", subject: "src/user-service.ts:listUsers:throw:24:3", value: { source: "src/user-service.ts", caller: "listUsers", action: "throw", errorIdentity: "AbortError", line: 24 }, confidence: 1 },
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

    assert.deepEqual(refs.map((ref) => ref.type), ["GraphSlice", "GraphSlice", "GraphSlice", "GraphSlice", "GraphSlice", "GraphSlice", "GraphSlice"]);

    const importGraph = await runtime.artifacts.read(refs[0]);
    assert.equal(importGraph.sliceType, "import-graph");
    assert.equal(importGraph.edges[0].kind, "imports");
    assert.ok(importGraph.edges.some((edge) =>
      edge.source === "tests/user.test.ts"
      && edge.target === "src/user-service.ts"
      && edge.metadata.resolved === true));
    assert.equal(importGraph.edges.some((edge) => edge.source.includes(":")), false);
    const applicationGraph = await runtime.artifacts.read(refs[3]);
    assert.equal(applicationGraph.sliceType, "application-graph");
    assert.equal(applicationGraph.header.inputRefs.some((ref) => ref.id === refs[0].id), true);
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
    const callGraph = await runtime.artifacts.read(refs[4]);
    assert.ok(callGraph.edges.some((edge) =>
      edge.source === "callable:app/api/users/route.ts#GET"
      && edge.target === "callable:src/user-service.ts#listUsers"
      && edge.kind === "calls"));
    assert.ok(callGraph.edges.some((edge) =>
      edge.source === "callable:src/cli.ts#__module__"
      && edge.target === "callable:src/cli.ts#main"
      && edge.kind === "calls"));
    const reachabilityGraph = await runtime.artifacts.read(refs[5]);
    assert.ok(reachabilityGraph.edges.some((edge) =>
      edge.source === "entry:route:app/api/users/route.ts"
      && edge.target === "callable:app/api/users/route.ts#GET"
      && edge.kind === "handles"));
    assert.ok(reachabilityGraph.edges.some((edge) =>
      edge.source === "entry:cli:src/cli.ts"
      && edge.target === "callable:src/cli.ts#__module__"
      && edge.kind === "handles"
      && edge.metadata.relationship === "module-entry"));
    assert.ok(reachabilityGraph.edges.some((edge) =>
      edge.source === "entry:route:app/api/users/route.ts"
      && edge.target === "src/user-service.ts"
      && edge.kind === "reaches"
      && edge.metadata.distance === 1));
    const behaviorGraph = await runtime.artifacts.read(refs[6]);
    assert.ok(behaviorGraph.edges.some((edge) => edge.kind === "emits" && edge.target === "event:user.loaded"));
    assert.ok(behaviorGraph.edges.some((edge) => edge.kind === "accesses" && edge.target === "state:@prisma/client"));
    assert.ok(behaviorGraph.edges.some((edge) =>
      edge.source === "callable:src/cli.ts#main"
      && edge.target === "cli-output:src/cli.ts#main:stdout"
      && edge.kind === "produces"));
    assert.ok(behaviorGraph.edges.some((edge) => edge.kind === "propagates_error" && edge.metadata.action === "rethrow"));
    assert.deepEqual(
      behaviorGraph.nodes
        .filter((node) => node.kind === "error")
        .map((node) => node.metadata.errorIdentity)
        .sort(),
      ["AbortError", "error"],
    );
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

test("application context bounds transitive dependencies per test", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-graph-bounded-"));

  try {
    const runtime = await createRuntime({ repoRoot: root, capabilities: [graphCapability] });
    const dependencyCount = 140;
    const facts = [
      { kind: "file", subject: "tests/broad.test.ts", value: { path: "tests/broad.test.ts" }, confidence: 1 },
      { kind: "test", subject: "tests/broad.test.ts", value: { path: "tests/broad.test.ts", framework: "node-test", testKind: "unit" }, confidence: 1 },
    ];
    for (let index = 0; index < dependencyCount; index += 1) {
      const target = `src/dependency-${String(index).padStart(3, "0")}.ts`;
      facts.push({ kind: "file", subject: target, value: { path: target }, confidence: 1 });
      facts.push({
        kind: "import",
        subject: `tests/broad.test.ts:${target}`,
        value: { source: "tests/broad.test.ts", target },
        confidence: 1,
      });
    }
    await runtime.artifacts.write({
      header: {
        artifactType: "EvidenceGraph",
        artifactId: "evidence-bounded",
        schemaVersion: "0.1.0",
        generatedAt: new Date().toISOString(),
        subject: { repoId: "repo" },
        producer: { id: "test", version: "1.0.0" },
        inputRefs: [],
      },
      facts,
    });

    const refs = await runtime.runProject({ projectorId: "@rekon/capability-graph.projector" });
    const applicationGraph = await runtime.artifacts.read(refs[3]);
    const dependencyEdges = applicationGraph.edges.filter((edge) => (
      edge.source === "test:tests/broad.test.ts" && edge.kind === "depends_on"
    ));
    const testNode = applicationGraph.nodes.find((node) => node.id === "test:tests/broad.test.ts");

    assert.equal(dependencyEdges.length, 100);
    assert.deepEqual(testNode.metadata.contextProjection, {
      reachableFiles: dependencyCount,
      projectedFiles: 100,
      truncated: true,
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("reachability bounds non-test roots and delegates test dependency context", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-graph-reachability-bounded-"));

  try {
    const runtime = await createRuntime({ repoRoot: root, capabilities: [graphCapability] });
    const dependencyCount = 140;
    const facts = [
      { kind: "file", subject: "src/cli.ts", value: { path: "src/cli.ts" }, confidence: 1 },
      { kind: "file", subject: "tests/cli.test.ts", value: { path: "tests/cli.test.ts" }, confidence: 1 },
      { kind: "test", subject: "tests/cli.test.ts", value: { path: "tests/cli.test.ts", framework: "node-test", testKind: "unit" }, confidence: 1 },
      { kind: "entry_point", subject: "cli:src/cli.ts", value: { path: "src/cli.ts", entryKind: "cli" }, confidence: 1 },
      { kind: "entry_point", subject: "test:tests/cli.test.ts", value: { path: "tests/cli.test.ts", entryKind: "test" }, confidence: 1 },
    ];
    for (let index = 0; index < dependencyCount; index += 1) {
      const target = `src/dependency-${String(index).padStart(3, "0")}.ts`;
      facts.push({ kind: "file", subject: target, value: { path: target }, confidence: 1 });
      facts.push({
        kind: "import",
        subject: `src/cli.ts:${target}`,
        value: { source: "src/cli.ts", target },
        confidence: 1,
      });
      facts.push({
        kind: "import",
        subject: `tests/cli.test.ts:${target}`,
        value: { source: "tests/cli.test.ts", target },
        confidence: 1,
      });
    }
    await runtime.artifacts.write({
      header: {
        artifactType: "EvidenceGraph",
        artifactId: "evidence-reachability-bounded",
        schemaVersion: "0.1.0",
        generatedAt: new Date().toISOString(),
        subject: { repoId: "repo" },
        producer: { id: "test", version: "1.0.0" },
        inputRefs: [],
      },
      facts,
    });

    const refs = await runtime.runProject({ projectorId: "@rekon/capability-graph.projector" });
    const reachabilityGraph = await runtime.artifacts.read(refs[5]);
    const cliEntryId = "entry:cli:src/cli.ts";
    const testEntryId = "entry:test:tests/cli.test.ts";
    const cliReachability = reachabilityGraph.edges.filter((edge) => (
      edge.source === cliEntryId && edge.kind === "reaches"
    ));
    const testReachability = reachabilityGraph.edges.filter((edge) => (
      edge.source === testEntryId && edge.kind === "reaches"
    ));
    const cliNode = reachabilityGraph.nodes.find((node) => node.id === cliEntryId);
    const testNode = reachabilityGraph.nodes.find((node) => node.id === testEntryId);

    assert.equal(cliReachability.length, 100);
    assert.equal(testReachability.length, 0);
    assert.deepEqual(cliNode.metadata.reachabilityProjection, {
      projectedFiles: 100,
      limit: 100,
      truncated: true,
    });
    assert.deepEqual(testNode.metadata.reachabilityProjection, {
      projectedFiles: 0,
      limit: 0,
      truncated: true,
      delegatedTo: "application-graph",
    });
    assert.equal(reachabilityGraph.header.inputRefs.some((ref) => ref.id === refs[0].id), true);
    assert.ok(reachabilityGraph.header.provenance.notes.includes("truncated-non-test-roots:1"));
    assert.ok(reachabilityGraph.header.provenance.notes.includes("test-roots-delegated-to-application-graph:1"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
