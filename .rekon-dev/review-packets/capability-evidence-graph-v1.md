# Review Packet — Capability Evidence Graph v1

**Slice:** capability-evidence-graph-v1 · **Base:** `3356379` · **Track:**
semantic intelligence

The first build slice of the CapabilityEvidenceGraph: a new kernel
artifact, a pure deterministic builder, and a `rekon capability graph
build` CLI command. No embeddings, no LLM, no retrieval, no source
writes, no command execution, no plan/work-order/verification creation,
no Circe, no `intent:go`.

## CHANGES MADE

- **Kernel** (`packages/kernel-repo-model/src/index.ts`): added the
  `CapabilityEvidenceGraph` artifact — types (`CapabilityGraphRef`,
  `CapabilityEvidenceSource`, `CapabilityEvidenceRef`,
  `CapabilityEvidenceClaim`, `CapabilityEvidenceGraphCapabilityNode`,
  `CapabilityEvidenceGraphBoundaries`, `CapabilityEvidenceGraphSummary`,
  `CapabilityEvidenceGraph`), factory `createCapabilityEvidenceGraph`,
  validator `validateCapabilityEvidenceGraph`, asserter
  `assertCapabilityEvidenceGraph`, and `capabilityEvidenceGraphSchema`.
- **SDK** (`packages/sdk/src/index.ts`): registered
  `CapabilityEvidenceGraph` (`0.1.0`, experimental) in
  `BUILT_IN_ARTIFACT_TYPES`.
- **Runtime** (`packages/runtime/src/index.ts`): mapped
  `CapabilityEvidenceGraph` → `graphs` in `ARTIFACT_CATEGORY_BY_TYPE`.
- **Builder** (`packages/capability-model/src/capability-evidence-graph.ts`,
  re-exported from the package index): pure
  `buildCapabilityEvidenceGraph`.
- **CLI** (`packages/cli/src/index.ts`): `rekon capability graph build`
  + a source-only file-selection helper + a usage() entry.
- **Tests**: `tests/contract/capability-evidence-graph.test.mjs` (23
  cases), `tests/docs/capability-evidence-graph.test.mjs` (15 cases).
- **Docs**: 3 new docs + supporting cross-references + CHANGELOG.

## PUBLIC API CHANGES

- New kernel exports: the types above plus
  `createCapabilityEvidenceGraph`, `validateCapabilityEvidenceGraph`,
  `assertCapabilityEvidenceGraph`, `capabilityEvidenceGraphSchema`.
- New `@rekon/capability-model` exports:
  `buildCapabilityEvidenceGraph`,
  `CAPABILITY_EVIDENCE_GRAPH_ARTIFACT_ID_PREFIX`,
  `BuildCapabilityEvidenceGraphInput`,
  `CapabilityEvidenceGraphInputFile`.
- New CLI surface: `rekon capability graph build [--path <file-or-dir>]
  [--root <path>] [--json]`.
- All additive. No existing signature changed.

## PURPOSE PRESERVATION CHECK

Rekon prepares, proves, packages, and exports; Circe imports and
orchestrates. The CapabilityEvidenceGraph is **evidence-backed context,
not proof by itself** — it does not approve work, gate merges, or stand
in for a VerificationResult. It strengthens the *prepare* surface
(richer, evidence-backed context for the agent) without touching the
*prove* surface (the verification spine is untouched). Deterministic
facts are the substrate; future LLM/embedding signals enter only as
evidence-backed inferences, never as new ground truth or authority. The
purpose is preserved.

## SOURCE REVIEW

Grounded in real source before writing:
`RuntimeGraphObservationReport` (the graph-artifact template),
`SemanticFileUnderstandingReport` (boundary force-false + validator
reject loop), the existing `EvidenceGraph` / `CapabilityMap`
phrase-backed model, and the CLI's `collectSemanticScanCandidates`
selection. The new artifact follows the established kernel pattern
exactly (normalize → factory → validator → schema).

## ARTIFACT MODEL

`{ schemaVersion, header, status, nodes, evidence, claims, capabilities,
summary, boundaries }`. Nodes are `file` / `symbol` / `capability`,
de-duplicated and sorted. Claims carry `claimType` / `source` /
`confidence` / `status` / `evidenceRefs`. Summary is re-derived and must
match. Files remain containers; symbols are first-class intelligence
nodes.

## BUILDER MODEL

`buildCapabilityEvidenceGraph(input)` is pure — the caller reads files
and passes their text; the builder performs no I/O, runs no provider,
and returns a validated artifact. It is deterministic given its inputs
(a supplied `generatedAt` yields a stable id and ordering).

## CLI SURFACE

`rekon capability graph build` selects source files conservatively,
reads them, builds the graph, and writes one artifact under
`.rekon/artifacts/graphs/`. `--path` narrows to a file or directory.
JSON output is `{ status, artifact, summary, boundaries }`. Read-only
with respect to source.

## DETERMINISTIC EXTRACTION

Imports (`from`, bare, `require`, dynamic `import()`) → `imports` facts.
Exported `function` / `class` / `const` → symbol nodes + `exposes`
facts. All facts are `deterministic`, `accepted`, confidence `1.0`, each
backed by a `deterministic_scan` evidence row with a line and excerpt.

## CAPABILITY HEURISTIC

An exported symbol's name is split into tokens; if the first token is a
known verb and at least one noun token follows, a `verb:noun` capability
node and an `implements` **inference** (confidence `0.5`) are emitted.
Classes are excluded. Names whose first token is not a known verb (e.g.
`joinName`) produce no capability. Conservative by design — no
filename-fallback capabilities.

## BOUNDARY MODEL

Nine booleans, all forced `false` by the factory and rejected by the
validator if non-`false`: `usedLlm`, `generatedEmbeddings`,
`executedCommands`, `wroteSourceFiles`, `createdPreparedIntentPlan`,
`createdWorkOrder`, `createdVerificationPlan`, `ranCirce`,
`implementedIntentGo`.

## TESTS / VERIFICATION

- Contract test (23 cases): builder shape, node/claim/evidence/capability
  structure, fact confidence, inference confidence, conservative
  heuristic, evidence integrity, summary match, boundary enforcement,
  validator rejection of non-false boundaries and tampered summaries,
  empty input, runtime registration, and CLI behavior (writes one
  artifact under `graphs/`, excludes node_modules/dist, honors `--path`,
  validates clean, leaves source unchanged, help lists the command).
- Docs test (15 cases): purpose phrases + boundary statements pinned.
- Full 9-command gate + CLI smoke on the WO fixture.

## INTENTIONALLY UNTOUCHED

`EvidenceGraph`, `CapabilityMap`, `SemanticFileUnderstandingReport`, the
verification spine, the LLM router, embedding tasks, Circe handoff. No
provider is wired. No source is written.

## RISKS / FOLLOW-UP

- The regex extractor is line-based; multi-line import/export forms are
  partially covered. Acceptable for a deterministic v1 substrate; an AST
  pass is a future evidence-quality improvement.
- The verb vocabulary is conservative and English-only; expanding it is
  additive and belongs with the ontology.
- No file-count cap beyond the per-file byte limit and directory
  exclusions; revisit if very large monorepos become a target.

## NEXT STEP

**Capability Evidence Graph Safety Review.**
