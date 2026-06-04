# CapabilityEvidenceGraph

**Status:** experimental (`0.1.0`) · **Category:** `graphs` · **Producer:**
`@rekon/capability-model.capability-evidence-graph`

> **Embedding similarity dogfooded (slice 161):** `rekon capability graph build
> --embedding-similarity latest` was exercised on a realistic fixture — it emits
> `embedding_similarity` evidence and `embedding` inference claims (confidence
> clamped below the deterministic `1.0`) read from the `.rekon/cache/embeddings`
> cache, generating no embeddings, so `generatedEmbeddings` / `usedLlm` stay
> false. See [Embedding Retrieval / Graph Dogfood Review](../strategy/embedding-retrieval-graph-dogfood-review.md).

> **Safety-reviewed (slice 154):** v1 is **safe/stable** — evidence-backed context
> not proof, deterministic facts the only source, all nine boundaries
> validator-enforced. See
> [`../strategy/capability-evidence-graph-safety-review.md`](../strategy/capability-evidence-graph-safety-review.md).

> **Semantic → Evidence Graph integration safety-reviewed (slice 157):** the
> slice-156 integration was ground-reviewed against committed source and found
> **safe/stable** — default build deterministic-only, semantic content opt-in as
> `llm_extraction` evidence and `llm` / `inference` claims, deterministic facts
> win, stale reports never consumed silently, builder calls no provider so
> `usedLlm` stays false. See
> [`../strategy/semantic-file-understanding-evidence-graph-integration-safety-review.md`](../strategy/semantic-file-understanding-evidence-graph-integration-safety-review.md).

> **Semantic → Evidence Graph integration implemented (slice 156):** `rekon
> capability graph build --semantic-file-reports latest` /
> `--semantic-file-report-ref <ref>` now folds stored
> `SemanticFileUnderstandingReport` content in as `llm_extraction` evidence and
> `llm` / `inference` claims (purpose/responsibilities/touchedConcepts/
> capabilitySignals/findings). The default build stays deterministic-only;
> deterministic facts win (semantic-only export/import → `conflicted`); stale
> reports are surfaced, never consumed silently; the build calls no provider so
> `usedLlm` stays `false`. See
> [`../strategy/semantic-file-understanding-evidence-graph-integration-implementation.md`](../strategy/semantic-file-understanding-evidence-graph-integration-implementation.md).

> **Semantic → Evidence Graph integration decided (slice 155):** semantic file
> understanding will enter the graph as `llm_extraction` evidence and `llm` /
> `inference` claims via an explicit, opt-in `--semantic-file-reports` /
> `--semantic-file-report-ref` flag (Option B). The evidence/claim source sets
> already accept these values; no kernel change is required. See
> [`../strategy/semantic-file-understanding-evidence-graph-integration-decision.md`](../strategy/semantic-file-understanding-evidence-graph-integration-decision.md).

The `CapabilityEvidenceGraph` is the unified substrate for semantic
codebase intelligence: file nodes, symbol nodes, and `verb:noun`
capability nodes, connected by evidence-backed claims. See
[concepts/capability-evidence-graph.md](../concepts/capability-evidence-graph.md)
for the model and
[strategy/capability-evidence-graph-v1.md](../strategy/capability-evidence-graph-v1.md)
for the roadmap.

It is **evidence-backed context, not proof by itself.** Deterministic
facts are the substrate; LLM and embedding outputs are evidence-backed
inferences that attach later.

## Shape

```jsonc
{
  "schemaVersion": "0.1.0",
  "header": { "artifactType": "CapabilityEvidenceGraph", "...": "..." },
  "status": { "value": "built", "reason": "..." },
  "nodes": [
    { "kind": "file", "id": "src/orders/index.ts" },
    { "kind": "symbol", "id": "src/orders/index.ts#createOrder" },
    { "kind": "capability", "id": "cap:create:order" }
  ],
  "evidence": [
    {
      "id": "ev:src/orders/index.ts:1",
      "source": "deterministic_scan",
      "path": "src/orders/index.ts",
      "lineStart": 1,
      "excerpt": "import { db } from \"../db\";"
    }
  ],
  "claims": [
    {
      "id": "claim:imports:src/orders/index.ts:../db",
      "subject": { "kind": "file", "id": "src/orders/index.ts" },
      "predicate": "imports",
      "object": "../db",
      "claimType": "fact",
      "source": "deterministic",
      "confidence": 1.0,
      "evidenceRefs": ["ev:src/orders/index.ts:1"],
      "status": "accepted"
    }
  ],
  "capabilities": [
    {
      "id": "cap:create:order",
      "verb": "create",
      "noun": "order",
      "implementedBy": [{ "kind": "symbol", "id": "src/orders/index.ts#createOrder" }],
      "entrypoints": [],
      "sideEffects": [],
      "dependencies": [],
      "consumers": [],
      "confidence": 0.5,
      "evidenceRefs": ["ev:src/orders/index.ts:7"]
    }
  ],
  "summary": {
    "files": 1, "symbols": 1, "capabilities": 1,
    "facts": 2, "inferences": 1, "recommendations": 0, "evidence": 2
  },
  "boundaries": {
    "usedLlm": false, "generatedEmbeddings": false, "executedCommands": false,
    "wroteSourceFiles": false, "createdPreparedIntentPlan": false,
    "createdWorkOrder": false, "createdVerificationPlan": false,
    "ranCirce": false, "implementedIntentGo": false
  }
}
```

### Nodes

A `CapabilityGraphRef` is `{ kind, id }`. v1 emits three kinds: `file`,
`symbol`, and `capability`. Nodes are de-duplicated and sorted for
deterministic output. **Files remain containers**; **symbols are
first-class intelligence nodes** that claims and capabilities point at.

### Claims

| Field          | Notes                                                                  |
| -------------- | ---------------------------------------------------------------------- |
| `predicate`    | `imports` / `exposes` / `implements` in v1.                            |
| `claimType`    | `fact` / `inference` / `recommendation`.                               |
| `source`       | `deterministic` / `llm` / `embedding` / `runtime` / `human` / `ontology`. |
| `confidence`   | `[0, 1]`. Facts are `1.0`; heuristic capability inferences are `<= 0.5`. |
| `status`       | `accepted` / `conflicted` / `rejected` / `needs-review`.               |
| `evidenceRefs` | ids that must exist in `evidence`.                                     |

Deterministic facts are the substrate. LLM and embedding outputs are
evidence-backed inferences — never facts — so `verb:noun remains
shorthand, not the whole capability model`: a capability node carries
its implementing symbols, entrypoints, side effects, dependencies,
consumers, confidence, and evidence.

### Evidence

Each `CapabilityEvidenceRef` records `{ id, source, path?, lineStart?,
lineEnd?, excerpt? }`. In v1 `source` is always `deterministic_scan`.

### Summary

Re-derived by the factory from `nodes`, `claims`, `evidence`, and
`capabilities`. The validator recomputes it and rejects any artifact
whose supplied summary does not match.

### Boundaries

The factory forces all nine booleans `false`; the validator rejects any
non-`false` boundary. In plain language:

- **No LLM is used in v1.**
- **No embeddings are generated in v1.**
- **Semantic intelligence must not execute commands.**
- **Semantic intelligence must not write source files.**
- It does not create a PreparedIntentPlan.
- It does not create a WorkOrder.
- It does not create a VerificationPlan.
- It does not run Circe.
- **intent:go remains deferred.**

## Building it

### CLI

```bash
rekon capability graph build [--path <file-or-dir>] [--root <path>] [--json]
```

Walks a conservative source-file selection (`.ts`, `.tsx`, `.js`,
`.jsx`, `.mjs`, `.cjs`; excluding `node_modules`, `dist`, `build`,
`coverage`, `.git`, `.rekon`, lockfiles, binary and oversized files),
reads each file, builds the graph from deterministic facts, and writes
one `CapabilityEvidenceGraph` under `.rekon/artifacts/graphs/`. `--path`
narrows the scan to a single file or directory. The command reads
source; it never writes it.

JSON output:

```jsonc
{
  "status": { "value": "built", "reason": "..." },
  "artifact": { "type": "CapabilityEvidenceGraph", "id": "capability-evidence-graph-..." },
  "summary": { "files": 1, "symbols": 6, "capabilities": 3, "facts": 8, "inferences": 3, "recommendations": 0, "evidence": 8 },
  "boundaries": { "usedLlm": false, "...": false }
}
```

### Library

```ts
import { buildCapabilityEvidenceGraph } from "@rekon/capability-model";

const graph = buildCapabilityEvidenceGraph({
  root: ".",
  files: [{ path: "src/orders/index.ts", text: source }],
});
```

`buildCapabilityEvidenceGraph` is pure: the caller reads files and
passes their text; the builder performs no I/O, runs no provider, and
returns a validated artifact.

## Validation

`validateCapabilityEvidenceGraph(value)` (from `@rekon/kernel-repo-model`)
enforces the header, the node/claim/evidence/capability shapes, the
confidence range, that every `evidenceRef` resolves, that the summary
matches, and that every boundary is `false`. `rekon artifacts validate`
runs the same check over stored artifacts.
