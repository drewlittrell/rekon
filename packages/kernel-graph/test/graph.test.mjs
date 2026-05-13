import assert from "node:assert/strict";
import test from "node:test";
import { composeGraphSlices, createGraphSlice, validateGraphSlice } from "../dist/index.js";

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
