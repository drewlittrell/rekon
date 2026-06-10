# Semantic File Understanding → Evidence Graph Integration Implementation

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

Status: shipped (slice 156). Base `cb90414`. Product-capability batch (source
changes). Implements the
[Semantic File Understanding → Evidence Graph Integration Decision](./semantic-file-understanding-evidence-graph-integration-decision.md)
(slice 155, Option B). Follows
[Capability Evidence Graph v1](./capability-evidence-graph-v1.md) and its
[safety review](./capability-evidence-graph-safety-review.md).

## What Shipped

`rekon capability graph build` gains two opt-in flags —
`--semantic-file-reports latest` and `--semantic-file-report-ref <ref>` — that
fold stored `SemanticFileUnderstandingReport` content into the
`CapabilityEvidenceGraph` as **`llm_extraction` evidence** and **`llm` /
`inference` claims**. With no flags, the build is byte-for-byte the
deterministic-only v1 build. No kernel type change was required: the graph
shipped in slice 153 already accepts `llm_extraction` evidence, `llm` claim
source, `inference` claim type, and `accepted` / `needs-review` / `conflicted`
status.

The build calls **no LLM provider** — it reads stored report artifacts. LLM
provenance lives per-claim (`source: llm`) and per-evidence
(`source: llm_extraction`); the graph's `usedLlm` boundary stays `false` because
it is a *build-invocation* flag, not a data-provenance flag.

## Changes Made

- **`packages/capability-model/src/capability-evidence-graph.ts`** —
  `BuildCapabilityEvidenceGraphInput` gains optional
  `semanticFileUnderstandingReports`. New exported pure
  `selectSemanticReportsForGraph` (path-match + sha-staleness +
  boundaries-all-false + latest-wins). The builder maps usable reports to
  evidence/claims/capabilities and reconciles them against deterministic facts.
- **`packages/capability-model/src/index.ts`** — re-exports
  `selectSemanticReportsForGraph`, `SemanticReportForGraph`,
  `SemanticReportGraphSelection`.
- **`packages/cli/src/index.ts`** — `capability graph build` reads the two
  flags, collects candidate reports (explicit refs, or `latest` path-filtered to
  graphed files), passes them to the builder, and emits a `semanticFileReports`
  summary (`requested` / `used` / `stale` / `missing` / `warnings`) in JSON when
  requested. An unresolved `--semantic-file-report-ref` fails cleanly. Help line
  updated.
- **Tests** —
  `tests/contract/semantic-file-understanding-evidence-graph-integration.test.mjs`
  (29 assertions) and this memo's docs test.

## Mapping Model

| Semantic Report Field | Graph Mapping |
| --- | --- |
| report ref | `llm_extraction` evidence `artifactRef` |
| file path + sha256 | evidence `path` / staleness check |
| summary.purpose | `has_purpose` inference claim |
| summary.responsibilities | `has_responsibility` inference claims |
| summary.touchedConcepts | `touches_concept` inference claims |
| capabilitySignals | capability nodes + `implements_capability` claims |
| findings | `has_semantic_finding` needs-review claims |
| normalizationTrace | provider/model/provenance in evidence excerpt |

Confidence maps from the signal enum: `low → 0.25`, `medium → 0.5`,
`high → 0.75` — never `1.0` (that value is reserved for deterministic facts).
Summary-derived claims use a medium default; concepts, findings, and
conflicted/needs-review claims use the low value. A capability signal with a
derivable verb/noun **and** source evidence becomes an accepted capability node;
one without a derivable verb/noun, or without source evidence, becomes a
needs-review claim with no node.

## Conflict Model

`summary.publicExports` / `summary.imports` are reconciled against the
deterministic `exposes` / `imports` facts: a match adds no new claim (the
deterministic fact stands); a semantic-only export or import becomes a
`conflicted` claim. Semantic signals never overwrite a deterministic capability
node — they only append evidence; the node keeps its deterministic confidence.

## Stale Report Model

A report is usable only when its `file.path` matches a graphed file, its
boundaries are all false, and (when a current hash is known) its `file.sha256`
matches. A stale (sha-mismatch or boundaries-not-clean) or unmatched-path report
is **never consumed silently**: it becomes a `semantic_report_stale` /
`semantic_report_unmatched` needs-review claim and a CLI warning. The v1
staleness posture is warn-and-skip.

## CLI Surface

```bash
# deterministic-only (unchanged from v1)
rekon capability graph build

# fold in the latest matching semantic report per graphed file
rekon capability graph build --semantic-file-reports latest

# fold in explicit reports (repeatable); an unresolved ref fails cleanly
rekon capability graph build --semantic-file-report-ref <SemanticFileUnderstandingReport ref>
```

## Boundary Model

The integration preserves every boundary the graph and the semantic spine
already hold:

- CapabilityEvidenceGraph remains deterministic by default.
- SemanticFileUnderstandingReport contributes inference claims, not fact claims.
- Semantic report evidence is proposal/context, not proof.
- Deterministic facts win over semantic claims.
- Semantic claims must preserve provider/model/provenance.
- Unsupported semantic claims become needs-review or conflicted claims.
- Stale semantic reports must not be consumed silently.
- Semantic report integration must not approve plans.
- Semantic report integration must not execute commands.
- Semantic report integration must not write source files.
- Semantic report integration must not create WorkOrder or VerificationPlan.
- Semantic report integration must not run Circe.
- Embeddings remain deferred to a separate track.
- intent:go remains deferred.

| Boundary | Decision |
| --- | --- |
| default graph build | deterministic-only |
| semantic claims | inference, not fact |
| semantic evidence | context, not proof |
| deterministic conflict | deterministic facts win |
| stale report | warn/skip, not silent |
| approval | no approval |
| command execution | no execution |
| source writes | no writes |
| WorkOrder / VerificationPlan | not created |
| Circe | not run |
| embeddings | deferred |
| intent:go | deferred |

## What This Does Not Do

This batch does not implement embeddings, add vector storage, implement
retrieval, run an LLM provider, change `SemanticFileUnderstandingReport`, change
scan behavior, execute commands, write source files, approve plans, create a
WorkOrder or VerificationPlan, run Circe, or implement intent:go. It does not
make semantic consumption automatic — it is opt-in per flag. It does not publish
to npm or bump versions.

## Next Step

**Semantic File Understanding → Evidence Graph Integration Safety Review** —
*done (slice 157)*. The shipped integration was ground-reviewed against committed
source and found **safe/stable**: the boundaries above hold in code. See
[`semantic-file-understanding-evidence-graph-integration-safety-review.md`](./semantic-file-understanding-evidence-graph-integration-safety-review.md).
Then the **Embedding Provider / Index Decision**: with semantic reports now
landing in the graph, embeddings enter as `embedding_similarity` evidence on a
separate track.
