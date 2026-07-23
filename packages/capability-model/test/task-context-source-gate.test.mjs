import assert from "node:assert/strict";
import test from "node:test";

import { excludeStaleTaskContextSourceEvidence } from "../dist/index.js";

test("stale exact source evidence cannot remain deterministic task context", () => {
  const result = excludeStaleTaskContextSourceEvidence({
    nodes: [
      { kind: "file", id: "src/stale.ts" },
      { kind: "symbol", id: "src/stale.ts#run" },
      { kind: "file", id: "src/current.ts" },
    ],
    evidence: [
      { id: "ev-stale", path: "src/stale.ts", sourceSha256: "a".repeat(64) },
      { id: "ev-current", path: "src/current.ts", sourceSha256: "b".repeat(64) },
    ],
    claims: [
      {
        id: "claim-stale",
        subject: { kind: "file", id: "src/stale.ts" },
        predicate: "exposes",
        object: { kind: "symbol", id: "src/stale.ts#run" },
        evidenceRefs: ["ev-stale"],
      },
      {
        id: "claim-current",
        subject: { kind: "file", id: "src/current.ts" },
        predicate: "exposes",
        object: { kind: "symbol", id: "src/current.ts#run" },
        evidenceRefs: ["ev-current"],
      },
    ],
    capabilities: [
      {
        id: "cap-stale",
        implementedBy: [{ kind: "symbol", id: "src/stale.ts#run" }],
        evidenceRefs: ["ev-stale"],
      },
      {
        id: "cap-current",
        implementedBy: [{ kind: "symbol", id: "src/current.ts#run" }],
        evidenceRefs: ["ev-current"],
      },
    ],
  }, ["ev-stale"]);

  assert.deepEqual(result.removedEvidenceIds, ["ev-stale"]);
  assert.deepEqual(result.removedPaths, ["src/stale.ts"]);
  assert.deepEqual(result.removedClaimIds, ["claim-stale"]);
  assert.deepEqual(result.removedCapabilityIds, ["cap-stale"]);
  assert.deepEqual(result.graph.nodes.map((node) => node.id), ["src/current.ts"]);
  assert.deepEqual(result.graph.evidence.map((entry) => entry.id), ["ev-current"]);
  assert.deepEqual(result.graph.claims.map((claim) => claim.id), ["claim-current"]);
  assert.deepEqual(result.graph.capabilities.map((capability) => capability.id), ["cap-current"]);
});
