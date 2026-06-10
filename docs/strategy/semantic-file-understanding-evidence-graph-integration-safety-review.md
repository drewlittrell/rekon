# Semantic File Understanding → Evidence Graph Integration Safety Review

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

Status: reviewed (slice 157). Base `35453e8`. Strategy / safety-review batch; no
runtime behavior changes, no source changes. Reviews the Semantic File
Understanding → Evidence Graph integration shipped in slice 156 end-to-end.

## Decision Summary

**Semantic File Understanding → Evidence Graph Integration is safe/stable.** The
shipped integration lets `SemanticFileUnderstandingReport` content enter
`CapabilityEvidenceGraph` as LLM-derived inference evidence **only through
explicit flags**, never as fact and never as proof, with deterministic facts
authoritative. No blocker was found.

The review re-read the committed source at `35453e8` — the pure builder and its
new semantic pass, the kernel evidence/claim/boundary shapes, and the CLI
command — and confirmed each safety property against the code, not the
documentation:

1. Semantic-report-to-graph integration is safe/stable. **Yes.**
2. Default graph build remains deterministic-only. **Yes** — the semantic pass
   runs only when `semanticFileUnderstandingReports` is supplied; with no flags
   the build is byte-for-byte the v1 build.
3. Semantic reports are consumed only by explicit flags/refs. **Yes** —
   `--semantic-file-reports latest` or `--semantic-file-report-ref <ref>`.
4. `--semantic-file-reports latest` selects matching reports safely. **Yes** —
   stored reports are path-filtered to graphed files, then sha/boundary-vetted.
5. `--semantic-file-report-ref` handles explicit refs safely. **Yes** — named
   refs are the candidate set; an unresolved ref throws (clean blocker).
6. Stale reports are skipped/warned, not consumed silently. **Yes** —
   sha-mismatch and boundaries-not-clean reports become `semantic_report_stale`
   needs-review claims plus a CLI warning.
7. Boundary-invalid reports are marked needs-review, not consumed. **Yes** —
   boundaries-not-clean is a staleness reason; such reports are never mapped.
8. Semantic report refs are preserved in `llm_extraction` evidence. **Yes** —
   the base evidence row sets `artifactRef` to the report ref.
9. Semantic claims are `llm` inference claims, not facts. **Yes.**
10. Deterministic fact conflict produces conflicted claims. **Yes** — a
    semantic-only export/import becomes a `conflicted` claim.
11. Deterministic facts win over semantic claims. **Yes** — matching
    exports/imports add no new claim; deterministic capability nodes are never
    overwritten.
12. Capability signal confidence maps low/medium/high → 0.25/0.5/0.75. **Yes** —
    never `1.0`.
13. Underivable/evidence-free capability signals remain needs-review. **Yes** —
    no accepted node is created for them.
14. Graph build itself calls no LLM providers. **Yes** — the builder has no
    `fs` / `child_process` / network / provider imports; it reads stored reports.
15. `usedLlm` remains false. **Yes** — it is a build-invocation flag, and the
    build invokes no provider.
16. Embeddings are still absent. **Yes** — deferred to a separate track.
17. Commands are not executed. **Yes.**
18. Source files are not written. **Yes** — the only write is the canonical graph
    artifact.
19. PreparedIntentPlan / WorkOrder / VerificationPlan are not created. **Yes.**
20. Circe is not run. **Yes.**
21. intent:go remains deferred. **Yes.**
22. What slice follows? **Embedding Provider / Index Decision.**

### Confirmed safety properties

Each property below was verified against the committed source at `35453e8`:

- CapabilityEvidenceGraph remains deterministic by default.
- SemanticFileUnderstandingReport contributes inference claims, not fact claims.
- Semantic report evidence is proposal/context, not proof.
- Deterministic facts win over semantic claims.
- Semantic claims preserve provider/model/provenance through evidence and claim text where the current graph shape allows.
- Unsupported semantic claims become needs-review or conflicted claims.
- Stale semantic reports are not consumed silently.
- Graph build itself calls no LLM providers.
- CapabilityEvidenceGraph.usedLlm remains false because the graph builder reads stored reports rather than calling providers.
- Semantic report integration does not approve plans.
- Semantic report integration executes no commands.
- Semantic report integration writes no source files.
- Semantic report integration creates no WorkOrder or VerificationPlan.
- Semantic report integration runs no Circe.
- Embeddings remain deferred to a separate track.
- intent:go remains deferred.

## Why This Review Exists

Slice 156 connected two previously separate substrates: the deterministic
`CapabilityEvidenceGraph` and the LLM-derived `SemanticFileUnderstandingReport`.
That connection is the first time model-derived interpretation can enter the
graph. Because the graph is meant to *grow* further — embeddings and runtime
traces attach next — the integration's boundaries must be proven now, while the
surface is small, so that growth never silently turns context into proof or a
reader into an actor. This review confirms the slice-156 integration is safe as
context and crosses no proof / execution / source-write boundary.

## Implementation Reviewed

Source (committed at `35453e8`):

- `packages/capability-model/src/capability-evidence-graph.ts` — the pure
  builder, the new optional `semanticFileUnderstandingReports` input, the
  exported `selectSemanticReportsForGraph` selector, and the semantic mapping
  pass.
- `packages/capability-model/src/index.ts` — re-exports.
- `packages/kernel-repo-model/src/index.ts` — `CapabilityEvidenceRef` (with
  `artifactRef`), `CapabilityEvidenceClaim`, the evidence/claim source sets, and
  `CAPABILITY_EVIDENCE_GRAPH_BOUNDARY_KEYS`.
- `packages/cli/src/index.ts` — `rekon capability graph build` and its two
  semantic flags.
- `tests/contract/semantic-file-understanding-evidence-graph-integration.test.mjs`
  (29 assertions), `tests/contract/capability-evidence-graph.test.mjs`,
  `tests/contract/semantic-file-understanding-report.test.mjs`.

## Evidence Mapping Review

Each consumed report emits one base `llm_extraction` evidence row whose
`artifactRef` is the report ref and whose excerpt carries
`provider=… model=… provenance=… method=…` — because `CapabilityEvidenceRef`
has no metadata field, provider/model/provenance are preserved in evidence and
claim text where the current graph shape allows. Capability signals with
structured `sourceEvidence` and findings (unstructured `string[]`) get their own
`llm_extraction` rows. All semantic claims cite at least the base row, so no
accepted semantic claim is evidence-free.

## Claim Mapping Review

Every semantic claim is `claimType: "inference"`, `source: "llm"`:
`has_purpose` / `has_responsibility` / `touches_concept` (accepted),
`implements_capability` (accepted), `has_capability_signal` (needs-review),
`has_semantic_finding` (needs-review), `claims_export` / `claims_import`
(conflicted), `semantic_report_stale` / `semantic_report_unmatched`
(needs-review). None are facts. Confidence is mapped from the signal enum
(`low → 0.25`, `medium → 0.5`, `high → 0.75`); summary-derived claims use a
medium default and concepts/findings the low value — never `1.0`.

## Conflict Model Review

`summary.publicExports` / `summary.imports` are reconciled against the
deterministic `exposes` / `imports` facts the builder extracts: a match adds no
new claim (the deterministic fact stands); a semantic-only export or import
becomes a `conflicted` claim. A capability signal whose `verb:noun` matches an
existing deterministic capability node appends evidence only — the node keeps
its deterministic confidence and implementedBy. Deterministic facts win.

## Stale Report Review

`selectSemanticReportsForGraph` rejects a report when its boundaries are not all
false (`boundaries-not-clean`) or when a known current file hash differs from
the report's `sha256` (`sha-mismatch`), and rejects an unmatched path. Rejected
reports are never mapped to accepted claims; each becomes a
`semantic_report_stale` / `semantic_report_unmatched` needs-review claim and a
CLI warning. Stale semantic reports are not consumed silently.

## CLI Review

`rekon capability graph build [--semantic-file-reports latest]
[--semantic-file-report-ref <ref>] [--root <path>] [--json]`. With no flags the
build is deterministic-only. `latest` considers stored reports path-filtered to
graphed files; explicit refs are the candidate set and an unresolved ref throws.
JSON gains a `semanticFileReports` summary (`requested` / `used` / `stale` /
`missing` / `warnings`) only when requested. The command reads stored artifacts
and writes one graph artifact; it calls no provider, executes no commands, and
writes no source.

## Boundary Review

The builder is pure: it has no `node:fs`, `node:child_process`, network, or
provider imports. The factory forces all nine graph boundary booleans false —
including `usedLlm`, which stays false because the build reads a stored artifact
rather than calling a provider — and the validator rejects any non-false
boundary. The boundary posture below holds in code.

### Surface table

| Surface | Status | Safety Finding |
| --- | --- | --- |
| default graph build | shipped | deterministic-only |
| --semantic-file-reports latest | shipped | explicit opt-in |
| --semantic-file-report-ref | shipped | explicit refs |
| llm_extraction evidence | shipped | proposal/context |
| llm inference claims | shipped | not facts |
| stale report handling | shipped | warning / skip |
| conflicted semantic claims | shipped | deterministic facts win |
| usedLlm boundary | shipped | remains false |

### Mapping table

| Semantic Report Field | Review Finding |
| --- | --- |
| report ref | preserved in llm_extraction evidence |
| summary.purpose | inference claim |
| summary.responsibilities | inference claims |
| summary.touchedConcepts | inference claims |
| capabilitySignals | capability nodes when derivable/evidenced |
| findings | needs-review semantic finding claims |
| publicExports/imports mismatch | conflicted claims |

### Boundary table

| Boundary | Decision |
| --- | --- |
| graph default | deterministic-only |
| semantic evidence | proposal/context |
| semantic claims | inference, not fact |
| deterministic conflict | deterministic facts win |
| LLM calls | none during graph build |
| embeddings | not generated |
| command execution | no execution |
| source writes | no writes |
| WorkOrder / VerificationPlan | not created |
| Circe | not run |
| intent:go | deferred |

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare integration safe/stable | selected | explicit inference boundary holds |
| embeddings decision next | selected | next major evidence source |
| graph dogfood next | deferred | useful but not required |
| treat semantic claims as facts | rejected | LLM output is inference |
| auto-consume semantic reports | rejected | explicit flag/ref only |

## Recommendation

**Semantic File Understanding → Evidence Graph Integration is safe/stable.**
Ship-as-is; no remediation required.

Recommended next slice: **Embedding Provider / Index Decision** — the
deterministic graph substrate is shipped and reviewed and now carries
LLM-derived inference claims safely, so embeddings are the remaining major
planned evidence source. They enter as `embedding_similarity` evidence on a
separate track, as proposal/context and not proof, with no command execution,
no source writes, no approval, and no intent:go.

Alternative next slice: **Semantic File Understanding → Evidence Graph
Integration Dogfood** — run graph-build integration across a larger repo before
embeddings if a richer operator proof is wanted first; the default
recommendation is the embeddings decision.

## What This Does Not Do

This batch changes no runtime behavior and no source. It does not change the
graph integration, implement embeddings, add vector storage, run an LLM
provider, execute commands, write source files, create a PreparedIntentPlan /
WorkOrder / VerificationPlan, run Circe, or implement intent:go. It does not
publish to npm or bump versions.

## Follow-Up Work

Embeddings remain the next evidence source to attach, on a separate track, as
`embedding_similarity` evidence — proposal/context, never fact, never proof.
Each new source enters the graph as an evidence-backed claim with bounded
confidence. That track is now started: the
[Embedding Provider / Index Decision](./embedding-provider-index-decision.md)
(*slice 158*) selects Voyage-first embeddings as `embedding_similarity` graph
evidence, with raw vectors as cache/index and deterministic facts authoritative.
