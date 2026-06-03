# Capability Evidence Graph Safety Review

Status: reviewed (slice 154). Base `d7a3d27`. Strategy / safety-review batch; no
runtime behavior changes, no source changes. Reviews the Capability Evidence
Graph v1 implementation shipped in slice 153 end-to-end.

## Decision Summary

**Capability Evidence Graph v1 is safe/stable.** The shipped substrate is a
deterministic, evidence-backed graph that informs the agent without crossing any
proof, execution, or source-write boundary. No blocker was found.

The review re-read the committed source at `d7a3d27` — the kernel artifact
(types, factory, validator, schema), the SDK and runtime registrations, the pure
builder, and the CLI command — and confirmed each safety property against the
code, not the documentation.

CapabilityEvidenceGraph is evidence-backed context, not proof by itself.
Deterministic facts are the only v1 source. The recommended next slice is the
**Semantic File Understanding -> Evidence Graph Integration Decision**.

### Confirmed safety properties

Each property below was verified against the committed source at `d7a3d27`:

- CapabilityEvidenceGraph is evidence-backed context, not proof by itself.
- Deterministic facts are the only v1 source.
- File nodes and symbol nodes are first-class graph nodes.
- Capability nodes are richer than verb:noun.
- Capability nodes are heuristic inferences, not facts.
- Every claim carries evidence/provenance/confidence.
- Confidence values are validated to 0..1.
- Summary counts are recomputed by the factory.
- Boundaries are forced false by the factory.
- The validator rejects non-false boundaries.
- CapabilityEvidenceGraph v1 uses no LLM.
- CapabilityEvidenceGraph v1 generates no embeddings.
- Capability graph build executes no commands.
- Capability graph build writes no source files.
- Capability graph build creates no PreparedIntentPlan.
- Capability graph build creates no WorkOrder.
- Capability graph build creates no VerificationPlan.
- Capability graph build runs no Circe.
- intent:go remains deferred.
- Semantic file integration and embeddings remain follow-up work.

## Why This Review Exists

Rekon needs a central evidence-backed capability intelligence substrate before
embeddings or LLM interpretation become useful. Slice 153 added that substrate
using deterministic facts only. Because the graph is intended to *grow* — later
slices attach LLM inferences, embedding neighbors, runtime traces, and human
overrides as evidence — its boundaries must be proven now, while the surface is
small, so that growth never silently turns context into proof or a reader into
an actor.

This review confirms the v1 graph is safe as context and does not cross the
proof / execution / source-write boundaries that the architecture decision
(slice 152) and the v1 build (slice 153) committed to.

## Implementation Reviewed

Source (committed at `d7a3d27`):

- `packages/kernel-repo-model/src/index.ts` — `CapabilityEvidenceGraph` types,
  `createCapabilityEvidenceGraph`, `validateCapabilityEvidenceGraph`,
  `assertCapabilityEvidenceGraph`, `capabilityEvidenceGraphSchema`, and the
  `CAPABILITY_EVIDENCE_GRAPH_BOUNDARY_KEYS` constant.
- `packages/sdk/src/index.ts` — `BUILT_IN_ARTIFACT_TYPES` entry (experimental,
  `0.1.0`).
- `packages/runtime/src/index.ts` — `ARTIFACT_CATEGORY_BY_TYPE` mapping to
  `graphs`.
- `packages/capability-model/src/capability-evidence-graph.ts` — the pure
  `buildCapabilityEvidenceGraph` builder.
- `packages/capability-model/src/index.ts` — re-export.
- `packages/cli/src/index.ts` — `rekon capability graph build` command and the
  `collectCapabilityGraphCandidates` selection helper.
- `tests/contract/capability-evidence-graph.test.mjs` (23 cases) and
  `tests/docs/capability-evidence-graph.test.mjs` (15 cases).

## Artifact Model Review

The artifact is `{ schemaVersion, header, status, nodes, evidence, claims,
capabilities, summary, boundaries }`.

- **Nodes** are `CapabilityGraphRef` (`{ kind, id }`) with kinds `file`,
  `symbol`, and `capability` in v1. File nodes and symbol nodes are first-class
  graph nodes — each exported symbol is its own node that claims and
  capabilities point at, not an attribute hidden inside a file. Nodes are
  de-duplicated and sorted for deterministic output.
- **Confidence values are validated to 0..1.** The validator rejects any claim
  or capability whose `confidence` is not a finite number in `[0, 1]`.
- **Summary counts are recomputed by the factory.** The validator independently
  recomputes `files / symbols / capabilities / facts / inferences /
  recommendations / evidence` from the graph contents and rejects any supplied
  summary field that does not equal the recomputed value.
- **Boundaries are forced false by the factory.** The factory writes all nine
  boundary booleans as literal `false`. **The validator rejects non-false
  boundaries** by iterating `CAPABILITY_EVIDENCE_GRAPH_BOUNDARY_KEYS` and
  flagging any key whose value is not `false`.

Capability nodes are richer than verb:noun: beyond `verb` and `noun`, each
carries `implementedBy`, `entrypoints`, `sideEffects`, `dependencies`,
`consumers`, a `confidence`, and `evidenceRefs`.

## Claim Model Review

Every relationship is a **claim** with `claimType` (`fact` / `inference` /
`recommendation`), `source` (`deterministic` / `llm` / `embedding` / `runtime` /
`human` / `ontology`), `confidence`, `status` (`accepted` / `conflicted` /
`rejected` / `needs-review`), and `evidenceRefs`. Every claim carries
evidence/provenance/confidence, and the validator checks each `evidenceRefs`
entry resolves to a known evidence id when evidence is present.

In v1: `imports` and `exposes` claims are facts at confidence `1.0` with
`source: deterministic`; the heuristic `implements` claims are inferences at
confidence `0.5` with `source: deterministic`. Capability nodes are heuristic
inferences, not facts — they are derived from exported symbol names and remain
low-confidence until stronger evidence (semantic file understanding, embeddings,
runtime traces, human confirmation) arrives in a later slice.

## Builder Review

`buildCapabilityEvidenceGraph` is pure. It imports only artifact/kernel types
and the kernel factory; it has no `node:fs`, `node:child_process`, network, or
provider imports. The caller reads files and passes their text; the builder
performs no I/O. CapabilityEvidenceGraph v1 uses no LLM. CapabilityEvidenceGraph
v1 generates no embeddings.

Extraction is line-based regex: imports (`from`, bare, `require`, dynamic
`import()`) become `imports` facts; exported `function` / `class` / `const`
become symbol nodes and `exposes` facts. The capability heuristic is
conservative: a capability is emitted only when an exported symbol's first
camel/snake token is in a fixed `KNOWN_VERBS` set and at least one noun token
follows. Classes derive no capability; a non-verb first token (e.g. `joinName`)
derives none. There are no filename-fallback capabilities.

## CLI Review

`rekon capability graph build [--path <file-or-dir>] [--root <path>] [--json]`
selects source files conservatively (`.ts` / `.tsx` / `.js` / `.jsx` / `.mjs` /
`.cjs`; excluding `node_modules`, `dist`, `build`, `coverage`, `.git`, `.rekon`,
lockfiles, declaration files, and files over the byte limit, with a NUL-byte
binary sniff), reads each file with `readFile`, builds the graph, and writes one
`CapabilityEvidenceGraph` via `store.write(graph, { category: "graphs" })`.

Capability graph build executes no commands. Capability graph build writes no
source files — the only write is the canonical artifact under
`.rekon/artifacts/graphs/`; the user's source tree is read-only. Capability
graph build creates no PreparedIntentPlan. Capability graph build creates no
WorkOrder. Capability graph build creates no VerificationPlan. Capability graph
build runs no Circe. intent:go remains deferred.

## Boundary Review

The graph is context, not proof; facts and inferences are separated by
`claimType`; and the artifact factory + validator together make the nine
boundary booleans non-negotiable. The boundary posture below holds in code.

### Surface table

| Surface | Status | Safety Finding |
| --- | --- | --- |
| CapabilityEvidenceGraph | shipped | evidence-backed context only |
| createCapabilityEvidenceGraph | shipped | recomputes summary / forces boundaries |
| validateCapabilityEvidenceGraph | shipped | validates confidence / boundaries |
| buildCapabilityEvidenceGraph | shipped | deterministic extraction only |
| capability graph build | shipped | writes one graph artifact |
| runtime category | shipped | graphs |
| SDK registration | shipped | built-in experimental artifact |

### Claim table

| Claim Kind | V1 Source | Confidence Posture |
| --- | --- | --- |
| import fact | deterministic scan | 1.0 |
| exposes fact | deterministic scan | 1.0 |
| capability inference | deterministic heuristic | low / medium |
| recommendation | absent in v1 | deferred |
| LLM inference | absent in v1 | deferred |
| embedding similarity | absent in v1 | deferred |

### Boundary table

| Boundary | Decision |
| --- | --- |
| graph vs proof | context only |
| facts vs inferences | separated |
| LLM | not used |
| embeddings | not generated |
| command execution | no execution |
| source writes | no writes |
| PreparedIntentPlan | not created |
| WorkOrder | not created |
| VerificationPlan | not created |
| Circe | not run |
| intent:go | deferred |

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare graph v1 safe/stable | selected | deterministic context boundary holds |
| semantic file integration next | selected | next graph evidence source |
| embeddings next | deferred | graph should receive semantic inferences first |
| treat graph as proof | rejected | context only |
| add LLM/embedding sources now | rejected | v1 deterministic only |

## Recommendation

**Capability Evidence Graph v1 is safe/stable.** Ship-as-is; no remediation
required.

Recommended next slice: **Semantic File Understanding -> Evidence Graph
Integration Decision** — decide how `SemanticFileUnderstandingReport` contributes
LLM-derived inference claims into the graph (capability signals as inference
claims; summary/responsibility as evidence-backed context; provider/model
provenance; confidence and conflicts) while staying context, not proof. No
embeddings yet.

Alternative next slice: **Embedding Provider / Index Decision** — embeddings are
now structurally ready to land, but semantic file integration should happen
first so LLM interpretations are represented before similarity evidence.

## What This Does Not Do

This batch changes no runtime behavior and no source. It does not change the
`CapabilityEvidenceGraph` artifact, integrate semantic file understanding,
implement embeddings, add vector storage, run an LLM provider, add a human
override write path, ingest runtime traces, execute commands, write source
files, create a PreparedIntentPlan / WorkOrder / VerificationPlan, run Circe, or
implement intent:go. It does not publish to npm or bump versions.

## Follow-Up Work

Semantic file integration and embeddings remain follow-up work. The deterministic
graph substrate is now available and safety-reviewed; the next evidence source to
attach is the LLM-derived semantic file understanding (as inference claims),
followed by embedding similarity. Each new source enters the graph as an
evidence-backed claim with bounded confidence — never as a fact, never as proof.
