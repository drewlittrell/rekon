# Review Packet — Semantic File Understanding Intent Context Implementation (slice 150)

Base: `26622c5`. Implementation batch. Implements the slice-149 decision (Option
B — explicit consumption): `rekon intent assess` and `rekon intent plan review`
may now consume `SemanticFileUnderstandingReport`s as proposal/context under
strict, proof-preserving boundaries. Schema-light: no kernel artifact schema
changed.

## CHANGES MADE

- New pure helper `packages/capability-model/src/semantic-file-context.ts`
  (`selectSemanticFileContext`, `summarizeSemanticFileContext`, types
  `SemanticFileUnderstandingReportLike`, `SemanticFileContextSelection`,
  `SemanticFileContextReport`, `SemanticFileContextStaleWarning`,
  `SemanticFileContextStaleReason`, `normalizeSemanticContextPath`); re-exported
  from `packages/capability-model/src/index.ts`.
- `buildIntentAssessmentReport` input gains optional `semanticFileContext`;
  post-readiness it enriches `matchedContext.paths` and appends low-severity
  warnings (`scope-ambiguous` for findings, `stale-context` for stale).
- `buildIntentPlanActionabilityReport` input gains optional `semanticFileContext`;
  pre-create it appends grounding to `revisionPrompt.prompt` and stale/missing
  notes to `normalizationTrace.warnings`.
- CLI: a module-level `resolveSemanticFileContextSelection` helper + two opt-in
  flags (`--semantic-context latest`, `--semantic-context-ref <ref>` repeatable)
  on both `intent assess` and `intent plan review`; a CLI-only `semanticContext`
  JSON field + a human line; two usage() lines extended.
- New strategy doc, this review packet, a contract test, a docs test, ~12 doc
  cross-references + CHANGELOG.

## PUBLIC API CHANGES

- Added (capability-model): `selectSemanticFileContext`,
  `summarizeSemanticFileContext`, `normalizeSemanticContextPath`, and the
  associated types. Additive.
- Extended (capability-model): both builder input types gain an OPTIONAL
  `semanticFileContext?: SemanticFileContextSelection`. Existing callers are
  unaffected.
- Added (CLI): `--semantic-context` / `--semantic-context-ref` on two commands;
  `semanticContext` JSON field present only when requested. No kernel schema
  change.

## PURPOSE PRESERVATION CHECK

- Original problem: semantic file reports restore old codebase-intel per-file
  understanding; scan/understand now produce them safely; but intent assessment
  and plan actionability still operated mostly without that context.
- Preserved guarantee: semantic context is consumed only on explicit opt-in,
  remains proposal/context, never changes readiness/status, never suppresses
  deterministic blockers/findings, never executes/writes/creates/runs Circe, and
  never silently consumes a stale report. Deterministic evidence stays
  authoritative.

## SOURCE REVIEW

Grounded at `26622c5` against the actual field names: `IntentAssessmentReport`
has NO top-level `recommendedNextAction` (it lives inside `readiness`);
`IntentAssessmentBlocker.category` includes `scope-ambiguous` and
`stale-context`; requested paths live in `request.scope.paths`;
`IntentPlanActionabilityReport` exposes `revisionPrompt.{prompt,...}` and
`normalizationTrace.warnings`. The injections target these real shapes.

## SELECTION MODEL

`selectSemanticFileContext` is pure (no fs/providers/clock). `requestedPaths`
(when non-empty) restricts candidates by path-relatedness; staleness is
sha-mismatch (when current hash known) or non-all-false boundaries; latest write
wins per path; `missingReports` = requested paths with no usable/stale report.
The CLI owns fs reads + current-hash computation and picks the candidate set
(explicit refs vs `latest`).

## INTENT ASSESSMENT INTEGRATION

Post-readiness, `matchedContext.paths` gains used-report paths and `warnings`
gains low-severity `scope-ambiguous` (findings) / `stale-context` (stale)
entries. Readiness/blockers/missingContext are computed before this step and
never change.

## PLAN ACTIONABILITY INTEGRATION

Pre-create, the revision prompt gains a "Semantic file context (proposal/context,
not proof)" section (purpose / responsibilities / public exports) and the
normalization trace gains stale/missing notes. `status` and `findings` are
decided before this step and never change.

## STALE CONTEXT MODEL

Usable only if boundaries are all-false and (when the current file hash is
known) `file.sha256` matches. Stale/non-clean reports are surfaced as warnings —
never consumed silently. Missing requested paths are reported as `missing`.

## CLI SURFACE

`rekon intent assess --semantic-context latest | --semantic-context-ref <ref>`;
same for `rekon intent plan review`. `--semantic-context-ref` accepts the
`Type:id` form from `rekon artifacts latest --id-only`. No flag → unchanged
behavior (no `semanticContext` key in `--json`).

## BOUNDARY MODEL

Proposal/context not proof; explicit not automatic; no plan approval; no proof
gate satisfaction; no replacement of deterministic evidence; no command
execution; no source writes; no WorkOrder / VerificationPlan / VerificationRun /
VerificationResult; no Circe; stale reports never silent; embeddings deferred;
intent:go deferred.

## TESTS / VERIFICATION

- Contract test `tests/contract/semantic-file-understanding-intent-context.test.mjs`
  — 23 unit/builder assertions + 5 key-free CLI end-to-end checks (28 total,
  all green).
- Docs test `tests/docs/semantic-file-understanding-intent-context.test.mjs`
  (14 assertions).
- Full nine-command gate (typecheck, test, build, diff-check, exports, license,
  publish, install, tarball) + CLI smoke (`semantic file understand` →
  `artifacts latest --id-only` → `intent assess --semantic-context`).

## INTENTIONALLY UNTOUCHED

Kernel artifact schemas; `SemanticFileUnderstandingReport` producer; the scan
integration; deterministic evidence artifacts; WorkOrder / VerificationPlan
gates; Circe; npm publish; package versions; the embeddings track.

## RISKS / FOLLOW-UP

- Relevance filtering (which reports apply to a goal/plan) is heuristic in v1
  (path-related + sha/boundary staleness).
- `latest` reads prior reports — O(reports) on large histories.
- Follow-up: Semantic File Understanding Intent Context Safety Review.

## NEXT STEP

Recommended: **Semantic File Understanding Intent Context Safety Review**.
