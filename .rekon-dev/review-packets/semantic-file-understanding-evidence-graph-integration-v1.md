# Review Packet — Semantic File Understanding → Evidence Graph Integration Implementation (slice 156)

Base `cb90414`. Product-capability batch. Implements the slice-155 Option B
decision: `rekon capability graph build` may fold stored
`SemanticFileUnderstandingReport` content into `CapabilityEvidenceGraph` as
`llm_extraction` evidence and `llm` / `inference` claims — opt-in, never proof,
deterministic facts authoritative.

## CHANGES MADE

- `packages/capability-model/src/capability-evidence-graph.ts`:
  `BuildCapabilityEvidenceGraphInput.semanticFileUnderstandingReports?`, the pure
  `selectSemanticReportsForGraph` selector, and the semantic mapping pass
  (evidence + claims + capability nodes + conflict/staleness handling).
- `packages/capability-model/src/index.ts`: re-export the selector + new types.
- `packages/cli/src/index.ts`: two flags on `capability graph build`, candidate
  collection, `semanticFileReports` JSON summary, help line.
- `tests/contract/semantic-file-understanding-evidence-graph-integration.test.mjs`
  (29 assertions); `tests/docs/...` (16 assertions).

## PUBLIC API CHANGES

Additive only. New optional builder input field; new exported pure functions
(`selectSemanticReportsForGraph`) and types (`SemanticReportForGraph`,
`SemanticReportGraphSelection`); two new optional CLI flags. No existing
signature changed; no kernel type changed.

## PURPOSE PRESERVATION CHECK

The slice-155 decision's purpose was: let LLM-derived file understanding become
graph *evidence* without becoming graph *proof*, explicitly and opt-in, with
deterministic facts authoritative. This implementation preserves that purpose
exactly — semantic content enters only behind a flag, only as `inference` claims
and `llm_extraction` evidence, always reconciled so deterministic facts win, and
stale reports are surfaced rather than consumed. No purpose was widened: the
build still calls no provider, writes no source, approves nothing.

## SOURCE REVIEW

Grounded the actual shapes before editing: `CapabilityEvidenceRef`
(`artifactRef?`, no metadata field — provider/model live in the excerpt),
`CapabilityEvidenceClaim` (`subject`/`predicate`/`object`/`claimType`/`source`/
`status`/`confidence`/`evidenceRefs`), `CapabilityEvidenceGraphCapabilityNode`
(non-empty `verb`+`noun` required), the validator (claim refs need not be nodes;
evidence ids must resolve when present; summary recomputed; boundaries forced
false), and the reusable `SemanticFileUnderstandingReportLike` type.

## SEMANTIC REPORT SELECTION

`selectSemanticReportsForGraph` is pure and shared by the builder (for mapping)
and the CLI (for the JSON summary), so both agree on what was consumed.
Path-filter, sha-staleness, boundaries-all-false, latest-wins; returns
`requested` / `usable` / `stale` / `missing` / `warnings`.

## EVIDENCE MAPPING

One base `llm_extraction` evidence row per consumed report carries the
artifactRef and `provider=… model=… provenance=… method=…` in its excerpt
(EvidenceRef has no metadata field). Capability signals with structured
evidence and findings (unstructured `string[]`) get their own evidence rows.

## CLAIM MAPPING

`has_purpose` / `has_responsibility` / `touches_concept` (accepted),
`implements_capability` (accepted), `has_capability_signal` (needs-review),
`has_semantic_finding` (needs-review), `claims_export` / `claims_import`
(conflicted), `semantic_report_stale` / `semantic_report_unmatched`
(needs-review). All `claimType: inference`, `source: llm`.

## CAPABILITY NODE MAPPING

Derivable verb/noun (first token a known verb, ≥1 noun) + source evidence →
accepted node at the mapped confidence (low/med/high → 0.25/0.5/0.75). A capId
that already exists from a deterministic node is never overwritten — only the
semantic evidence ref is appended. Non-derivable or evidence-less → needs-review
claim, no node.

## CONFLICT MODEL

`summary.publicExports` / `summary.imports` reconcile against deterministic
`exposes` / `imports`: match → no new claim; semantic-only → `conflicted`.
Deterministic facts always win.

## STALE REPORT MODEL

Stale (sha-mismatch / boundaries-not-clean) and unmatched-path reports are never
consumed silently — each becomes a needs-review claim and a CLI warning.
Warn-and-skip is the v1 posture.

## CLI SURFACE

`rekon capability graph build [--semantic-file-reports latest]
[--semantic-file-report-ref <ref>]`. No flags → deterministic-only. JSON gains
`semanticFileReports` only when requested. Unresolved ref → non-zero exit, clean
blocker message.

## BOUNDARY MODEL

All nine graph boundaries stay `false`, including `usedLlm` (the build reads a
stored artifact; it calls no provider). The 14 pinned boundary statements live
in the implementation memo and are asserted by the docs test.

## TESTS / VERIFICATION

29 contract assertions (helper-level mapping + staleness + conflict + CLI
selection/plumbing/safety) + 16 docs assertions. Full 9-command gate + CLI smoke
on a temp repo (deterministic facts + `semanticFileReports.used=1` +
`llm_extraction` evidence + `llm` inference claims + validates + source
unchanged).

## INTENTIONALLY UNTOUCHED

`SemanticFileUnderstandingReport` shape, kernel types, scan behavior, intent
context consumption, the deterministic extraction, embeddings, Circe, intent:go.

## RISKS / FOLLOW-UP

- EvidenceRef has no metadata field; provider/model/provenance are preserved in
  the evidence excerpt. A future kernel slice could add structured metadata.
- Source-only reports (deterministic fallback) are still consumed (their
  provenance is recorded); a later slice could skip them as redundant.

## NEXT STEP

Safety review of this implementation, then the Embedding Provider / Index
Decision.
