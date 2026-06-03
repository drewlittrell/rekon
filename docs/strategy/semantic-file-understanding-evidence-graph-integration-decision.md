# Semantic File Understanding → Evidence Graph Integration Decision

Status: decided (slice 155). Base `33f28fb`. Strategy / architecture
decision-only batch; no runtime behavior changes, no source changes. Decides
how `SemanticFileUnderstandingReport` contributes LLM-derived inference claims
into `CapabilityEvidenceGraph`. Follows Capability Evidence Graph v1 and its
safety review.

## Decision Summary

**Select Option B — explicit semantic-report-to-graph integration.**
`CapabilityEvidenceGraph` remains deterministic by default. A future explicit
command flag — `rekon capability graph build --semantic-file-reports latest`
or `--semantic-file-report-ref <ref>` — may include
`SemanticFileUnderstandingReport` content as **LLM-derived inference evidence**.

This decision is implementable with **no kernel type changes**: the
`CapabilityEvidenceGraph` artifact shipped in slice 153 already accepts every
value the mapping needs — evidence `source` includes `llm_extraction`, claim
`source` includes `llm`, `claimType` includes `inference`, and `status`
includes `accepted` / `needs-review` / `conflicted`. The graph was deliberately
designed (slice 152 architecture decision) to carry exactly these sources.

`SemanticFileUnderstandingReport` contributes inference claims, not fact
claims. Semantic report evidence is proposal/context, not proof. Deterministic
facts win over semantic claims. The recommended follow-up is the **Semantic
File Understanding → Evidence Graph Integration Implementation**.

## Why This Decision Exists

`CapabilityEvidenceGraph` is now Rekon's deterministic graph substrate.
`SemanticFileUnderstandingReport` carries file-level semantic interpretation
(purpose, responsibilities, public exports/imports, touched concepts,
capability signals, findings) with provider/model provenance. The two are not
yet connected: LLM-derived file understanding does not become graph-level
inference claims. Rekon needs a pinned decision for how semantic interpretation
becomes graph *evidence* without becoming graph *proof*, before any code lands.

## Current Surfaces

Grounded against committed source at `33f28fb`.

`CapabilityEvidenceGraph` (kernel):
`{ schemaVersion, header, status, nodes, evidence, claims, capabilities,
summary, boundaries }`. Evidence `source` is one of `ast` / `import_graph` /
`typechecker` / `runtime_trace` / `llm_extraction` / `embedding_similarity` /
`human_override` / `ontology_rule` / `ground_truth` / `deterministic_scan`.
Claim fields: `claimType` (`fact`/`inference`/`recommendation`), `source`
(`deterministic`/`llm`/`embedding`/`runtime`/`human`/`ontology`), `status`
(`accepted`/`conflicted`/`rejected`/`needs-review`), `confidence` (number in
`[0, 1]`), `evidenceRefs`. v1 emits only `deterministic_scan` evidence and
`deterministic` claims.

`SemanticFileUnderstandingReport` (kernel, schemaVersion `0.1.0`):
`file { path, sha256, language?, lineCount, byteLength }`,
`normalizationTrace { method, invokedSemanticUnderstanding, provider?, model?,
provenance ("source-only"|"semantic-llm"), warnings[] }`,
`summary { purpose, responsibilities[], publicExports[], imports[],
touchedConcepts[] }`,
`capabilitySignals[] { id, label, confidence ("low"|"medium"|"high"),
sourceEvidence[] { lineStart?, lineEnd?, excerpt } }`,
`findings[] { id, severity, message, sourceEvidence: string[],
suggestedFollowUp? }`,
`boundaries { 8 booleans, all false }`.

**Recorded field differences (must be honored by the implementation):**

- Semantic `capabilitySignals[].confidence` is the enum `low | medium | high`,
  not a number. The implementation must map it to a graph numeric `confidence`
  in `[0, 1]` (recommended `low → 0.25`, `medium → 0.5`, `high → 0.75`) and
  must never assign `1.0` — that value is reserved for deterministic facts.
- `findings[].sourceEvidence` is `string[]` (unstructured), whereas
  `capabilitySignals[].sourceEvidence` is structured
  (`lineStart?/lineEnd?/excerpt`). Evidence rows must tolerate both.
- `SemanticFileUnderstandingReport.boundaries` has 8 keys and no `usedLlm`
  (semantic understanding legitimately uses an LLM, recorded via
  `normalizationTrace.provenance = "semantic-llm"`). The graph's `usedLlm`
  boundary is a *build-invocation* flag (did `capability graph build` call a
  provider — no, it reads a stored artifact), not a data-provenance flag.
  LLM provenance lives per-claim (`source: llm`) and per-evidence
  (`source: llm_extraction`), so the graph's `usedLlm: false` stays accurate
  even when ingesting a semantic report.
- A report whose `normalizationTrace.provenance === "source-only"` carries no
  net-new LLM inference (the deterministic fallback ran); the implementation
  may skip such reports as redundant with the deterministic substrate.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| deterministic graph forever | rejected/deferred | semantic track would remain parallel |
| explicit semantic-report integration | selected | unifies inference with graph safely |
| automatic semantic report consumption | rejected/deferred | surprise/staleness risk |
| semantic claims as facts | rejected | LLM output is inference |
| wait for embeddings | rejected/deferred | semantic reports are already useful |

## Recommendation

Adopt **Option B**. `capability graph build` without semantic flags remains
deterministic-only. With `--semantic-file-reports latest` or
`--semantic-file-report-ref <ref>`, the build adds semantic content as
`llm_extraction` evidence and `llm` / `inference` claims, grounded back to the
`SemanticFileUnderstandingReport` artifact and its source excerpts. Embeddings
remain deferred to a separate track.

## Mapping Model

Semantic report content maps to graph evidence and claims as follows.

| Semantic Report Field | Graph Mapping |
| --- | --- |
| report ref | llm_extraction evidence artifactRef |
| file path + sha256 | evidence path / staleness check |
| summary.purpose | inference claim |
| summary.responsibilities | inference claims |
| summary.touchedConcepts | inference claims |
| capabilitySignals | capability nodes + inference claims |
| findings | needs-review / conflicted claims |
| normalizationTrace | provider/model/provenance metadata |

Evidence entries use `source = "llm_extraction"`, `artifactRef =` the
`SemanticFileUnderstandingReport` ref, `path = report.file.path`, and
`lineStart` / `lineEnd` / `excerpt` from `capabilitySignals[].sourceEvidence`
when present. Claims use `claimType = "inference"`, `source = "llm"`, a numeric
`confidence` derived from the signal's `low/medium/high`, and `evidenceRefs`
pointing at those evidence rows. `summary.publicExports` and `summary.imports`
are reconciled against the deterministic `exposes` / `imports` facts rather than
emitted as independent facts.

`capabilitySignals` map to `CapabilityNode` candidates: `id` from the
normalized signal label/id, `verb` / `noun` derived from the signal id/label
when possible, `implementedBy` set to the grounded file or symbol node,
`confidence` mapped from the signal confidence, and `evidenceRefs` pointing at
the semantic evidence. If `verb` / `noun` cannot be derived, the implementation
emits a needs-review claim rather than a fully accepted capability node.

## Conflict Model

Semantic claims are checked against the deterministic graph facts. Deterministic
facts win over semantic claims. Examples: an LLM-claimed export that the
deterministic graph has no `exposes` fact for becomes a `conflicted` claim; an
LLM-claimed import with no deterministic `imports` fact becomes a `conflicted`
claim; an LLM capability with no supporting evidence becomes a `needs-review`
claim; an LLM responsibility that contradicts known file path / system
ownership becomes `needs-review` or `conflicted` depending on confidence.

| Semantic Claim Condition | Graph Claim Status |
| --- | --- |
| source evidence + no deterministic conflict | accepted |
| weak or missing evidence | needs-review |
| contradicts deterministic fact | conflicted |
| unsupported capability shape | needs-review |

Unsupported semantic claims become needs-review or conflicted claims — they are
never silently dropped and never promoted to facts.

## Staleness Model

A semantic report may be consumed only when `report.file.path` matches a graph
file-node path, `report.file.sha256` matches the current file hash when a
current hash is available, and `report.boundaries` are all false. Stale semantic
reports must not be consumed silently: a stale or hash-mismatched report is
skipped with a visible warning. Provider/model changes are recorded in evidence
metadata or as a policy warning; a provider change is not treated as a proof
problem. The v1 staleness posture is **warn on stale, skip the stale report**;
an optional `--semantic-report-staleness warn|block` flag may be added later.

## CLI Surface

```bash
rekon capability graph build \
  --semantic-file-reports latest

rekon capability graph build \
  --semantic-file-report-ref <SemanticFileUnderstandingReport ref>
```

Rules: with no semantic flags, the build is deterministic-only; `latest`
selects path-filtered, sha-matched latest reports; `ref` consumes explicit refs
and warns or blocks on stale refs depending on mode. The graph build never calls
an LLM provider — it reads stored `SemanticFileUnderstandingReport` artifacts.

## Boundary Model

The integration preserves every boundary the graph and the semantic spine
already hold. The pinned boundary statements:

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

This batch is decision-only. It does not implement graph integration, change
`CapabilityEvidenceGraph`, change `SemanticFileUnderstandingReport`, implement
embeddings, add vector storage, implement retrieval, run an LLM provider, change
scan behavior, execute commands, write source files, approve plans, create a
WorkOrder or VerificationPlan, run Circe, or implement intent:go. It does not
publish to npm or bump versions.

## Implementation Sequence

1. **Semantic File Understanding → Evidence Graph Integration Implementation** —
   *done (slice 156).* Added the `--semantic-file-reports` /
   `--semantic-file-report-ref` flags to `rekon capability graph build`; read
   stored reports; emit `llm_extraction` evidence and `llm` / `inference` claims
   with the confidence-mapping, conflict, and staleness rules above; enrich
   capability nodes where verb/noun is derivable. No embeddings, no source
   writes, no command execution, no approval, no intent:go. See
   [`semantic-file-understanding-evidence-graph-integration-implementation.md`](./semantic-file-understanding-evidence-graph-integration-implementation.md).
2. **Safety review** of that implementation — *done (slice 157)*; found
   safe/stable. See
   [`semantic-file-understanding-evidence-graph-integration-safety-review.md`](./semantic-file-understanding-evidence-graph-integration-safety-review.md).
3. **Embedding Provider / Index Decision** — only after semantic reports can
   land in the graph, embeddings enter as `embedding_similarity` evidence on a
   separate track.
