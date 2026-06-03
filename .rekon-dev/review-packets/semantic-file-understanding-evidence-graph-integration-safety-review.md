# Review Packet — Semantic File Understanding → Evidence Graph Integration Safety Review (slice 157)

Base `35453e8`. Strategy / safety-review batch. Ground-reviews the slice-156
integration that lets `SemanticFileUnderstandingReport` content enter
`CapabilityEvidenceGraph` as `llm_extraction` evidence and `llm` / `inference`
claims (opt-in), never as fact, never as proof, deterministic facts
authoritative. No source changes.

## CHANGES MADE

New safety-review memo
(`docs/strategy/semantic-file-understanding-evidence-graph-integration-safety-review.md`),
this review packet, a 24-assertion docs test, and cross-reference updates to 12
docs + CHANGELOG. No runtime/source changes.

## PUBLIC API CHANGES

None. Strategy/safety-review batch only.

## PURPOSE PRESERVATION CHECK

The slice-155 decision's purpose — let LLM-derived file understanding become
graph *evidence* without becoming graph *proof*, explicitly and opt-in, with
deterministic facts authoritative — was confirmed intact in the shipped slice-156
code. The review verified each property against committed source rather than
documentation; nothing in the implementation widens that purpose.

## CODEBASE-INTEL ALIGNMENT

This integration is the bridge between the old codebase-intel system's two
strands inside Rekon: deterministic structural facts (the substrate) and
LLM-derived per-file understanding (the interpretation layer). The review
confirms the interpretation layer enters the graph only as bounded-confidence
inference, preserving the codebase-intel principle that model output is a
proposal rechecked against deterministic facts — never authoritative on its own.

## IMPLEMENTATION REVIEWED

`capability-evidence-graph.ts` (pure builder + semantic pass +
`selectSemanticReportsForGraph`), `capability-model/index.ts` (re-exports),
`kernel-repo-model/index.ts` (evidence/claim/boundary shapes), `cli/index.ts`
(`capability graph build` + two flags), and the slice-156 contract test.

## EVIDENCE MAPPING REVIEW

One base `llm_extraction` evidence row per consumed report carries the report
`artifactRef` + provider/model/provenance in its excerpt (no metadata field on
`CapabilityEvidenceRef`); signal/finding evidence rows added for structured and
unstructured source evidence. Every accepted semantic claim cites evidence.

## CLAIM MAPPING REVIEW

All semantic claims are `inference` / `source: llm`. Confidence maps
`low → 0.25 / medium → 0.5 / high → 0.75`, never `1.0`. Accepted:
`has_purpose` / `has_responsibility` / `touches_concept` /
`implements_capability`. Needs-review: `has_capability_signal` /
`has_semantic_finding` / `semantic_report_stale` / `semantic_report_unmatched`.
Conflicted: `claims_export` / `claims_import`.

## CONFLICT MODEL REVIEW

`publicExports` / `imports` reconcile against deterministic `exposes` / `imports`
(match → no new claim; semantic-only → `conflicted`). Deterministic capability
nodes are never overwritten — only evidence is appended. Deterministic facts win.

## STALE REPORT REVIEW

`selectSemanticReportsForGraph` rejects boundaries-not-clean, sha-mismatch, and
unmatched-path reports; each becomes a needs-review claim + a CLI warning. Never
consumed silently.

## CLI REVIEW

`rekon capability graph build` is deterministic-only without flags; `latest`
path-filters to graphed files; explicit refs are the candidate set and an
unresolved ref throws cleanly; JSON gains `semanticFileReports` only when
requested. Reads stored artifacts; no provider call; no command execution; no
source write.

## BOUNDARY REVIEW

Builder is pure (no `node:fs` / `node:child_process` / network / provider
imports). All nine graph boundaries are forced false, including `usedLlm`
(build reads a stored artifact). Validator rejects non-false boundaries.

## RECOMMENDATION

**Safe/stable.** Ship-as-is. Recommended next slice: **Embedding Provider /
Index Decision**. Alternative: Semantic File Understanding → Evidence Graph
Integration Dogfood.

## TESTS / VERIFICATION

24 docs assertions (memo headings + 16 boundary statements + 4 tables +
CHANGELOG + this packet). Full 9-command gate. No CLI smoke (strategy-only).

## INTENTIONALLY UNTOUCHED

Builder/CLI/kernel source, the slice-156 integration, `SemanticFileUnderstandingReport`,
embeddings, Circe, intent:go, versions, npm.

## RISKS / FOLLOW-UP

- `CapabilityEvidenceRef` has no metadata field; provider/model/provenance are
  carried in evidence/claim text. A future kernel slice could add structured
  metadata.
- Embeddings are the next evidence source, on a separate track.

## NEXT STEP

Embedding Provider / Index Decision.
