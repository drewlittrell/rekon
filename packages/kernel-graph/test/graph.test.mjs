import assert from "node:assert/strict";
import test from "node:test";
import { BUILT_IN_EDGE_KINDS, BUILT_IN_NODE_KINDS, composeGraphSlices, createGraphSlice, validateGraphSlice } from "../dist/index.js";

const header = {
  artifactType: "GraphSlice",
  artifactId: "graph-1",
  schemaVersion: "0.1.0",
  generatedAt: new Date().toISOString(),
  subject: { repoId: "repo" },
  producer: { id: "test", version: "0.1.0" },
  inputRefs: [],
};

test("graph slices validate and dedupe nodes and edges", () => {
  const slice = createGraphSlice({
    header,
    producer: "test",
    nodes: [
      { id: "b", kind: "file" },
      { id: "a", kind: "file" },
      { id: "a", kind: "file" },
    ],
    edges: [
      {
        source: "a",
        target: "b",
        kind: "imports",
        evidence: [{ source: "test", extractorVersion: "0.1.0", computedAt: header.generatedAt, confidence: 1 }],
      },
      {
        source: "a",
        target: "b",
        kind: "imports",
        evidence: [{ source: "test", extractorVersion: "0.1.0", computedAt: header.generatedAt, confidence: 1 }],
      },
    ],
  });

  assert.deepEqual(slice.nodes.map((node) => node.id), ["a", "b"]);
  assert.equal(slice.edges.length, 1);
  assert.equal(validateGraphSlice(slice).ok, true);
});

test("graph slices compose", () => {
  const slice = createGraphSlice({
    header,
    producer: "test",
    nodes: [{ id: "a", kind: "file" }],
    edges: [],
  });
  const composed = composeGraphSlices({
    header: { ...header, artifactId: "composed" },
    producer: "test",
    slices: [slice, slice],
  });

  assert.equal(composed.nodes.length, 1);
});

test("graph slice type becomes its supersession identity", () => {
  const slice = createGraphSlice({
    header,
    producer: "test",
    sliceType: "imports",
    nodes: [],
    edges: [],
  });

  assert.equal(slice.header.supersession.key, "imports");
  assert.throws(() => createGraphSlice({
    header: { ...header, supersession: { key: "ownership" } },
    producer: "test",
    sliceType: "imports",
    nodes: [],
    edges: [],
  }), /must match sliceType/);
});

test("built-in graph vocabulary includes test context without claiming coverage", () => {
  assert.equal(BUILT_IN_NODE_KINDS.capability, "capability");
  assert.equal(BUILT_IN_EDGE_KINDS.dependsOn, "depends_on");
  assert.equal(BUILT_IN_EDGE_KINDS.relatedTo, "related_to");
  assert.equal(BUILT_IN_EDGE_KINDS.observed, "observed");
  assert.equal(BUILT_IN_EDGE_KINDS.produces, "produces");
  assert.equal(BUILT_IN_NODE_KINDS.command, "command");
  assert.equal(BUILT_IN_NODE_KINDS.cliOutput, "cli_output");
  assert.equal("covers" in BUILT_IN_EDGE_KINDS, false);
});
