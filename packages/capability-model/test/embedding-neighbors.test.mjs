import assert from "node:assert/strict";
import test from "node:test";

import { findEmbeddingNeighbors } from "../dist/index.js";

test("embedding neighbor search is exact for small comparable groups", () => {
  const fileGroup = ["voyage", "voyage-4", "512", "file"].join("\u0000");
  const result = findEmbeddingNeighbors({
    entries: [
      { id: "a", group: fileGroup, vector: [1, 0] },
      { id: "b", group: fileGroup, vector: [0.99, 0.01] },
      { id: "c", group: fileGroup, vector: [0, 1] },
      { id: "other-space", group: ["voyage", "other", "512", "file"].join("\u0000"), vector: [1, 0] },
    ],
    topK: 2,
    floor: 0.5,
  });

  assert.equal(result.stats.strategy, "exact");
  assert.equal(result.stats.groups, 2);
  assert.equal(result.stats.comparisons, 3);
  assert.deepEqual(result.neighbors.find((entry) => entry.id === "a")?.neighbors.map((entry) => entry.id), ["b"]);
  assert.equal(result.neighbors.some((entry) => entry.id === "other-space"), false);
});

test("large embedding groups use bounded deterministic candidates and retain near duplicates", () => {
  const dimensions = 64;
  const base = Array.from({ length: dimensions }, (_, index) => Math.sin((index + 1) * 0.37));
  const entries = [
    { id: "duplicate-a", group: "large", vector: base },
    { id: "duplicate-b", group: "large", vector: base.map((value, index) => value + (index === 3 ? 0.0001 : 0)) },
    ...Array.from({ length: 298 }, (_, entryIndex) => ({
      id: `noise-${String(entryIndex).padStart(3, "0")}`,
      group: "large",
      vector: Array.from(
        { length: dimensions },
        (_, dimension) => Math.sin((entryIndex + 7) * (dimension + 3) * 0.173) + Math.cos((entryIndex + 1) * 0.11),
      ),
    })),
  ];
  const options = {
    entries,
    topK: 5,
    floor: 0.9,
    exactGroupLimit: 16,
    approximateCandidateLimit: 24,
  };

  const first = findEmbeddingNeighbors(options);
  const second = findEmbeddingNeighbors(options);

  assert.deepEqual(second, first, "approximate candidate generation must be deterministic");
  assert.equal(first.stats.strategy, "hybrid");
  assert.equal(first.stats.approximateGroups, 1);
  assert.ok(first.stats.comparisons <= entries.length * options.approximateCandidateLimit);
  assert.ok(first.stats.comparisons < first.stats.possiblePairs / 4);
  assert.ok(
    first.neighbors.find((entry) => entry.id === "duplicate-a")?.neighbors.some((entry) => entry.id === "duplicate-b"),
    "near-identical vectors must survive approximate candidate selection",
  );
});
