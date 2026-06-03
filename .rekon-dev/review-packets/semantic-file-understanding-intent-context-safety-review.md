# Review Packet — Semantic File Understanding Intent Context Safety Review (slice 151)

Base: `de8c048`. Strategy/safety-review batch. Ground-reviews the shipped Semantic
File Understanding Intent Context integration (slice 150). No runtime behavior
changes; documentation + docs test only.

## CHANGES MADE

- New memo `docs/strategy/semantic-file-understanding-intent-context-safety-review.md`.
- New docs test `tests/docs/semantic-file-understanding-intent-context-safety-review.test.mjs` (27 assertions).
- Cross-reference appends to ~13 scope docs + `docs/releases/*` + README + CHANGELOG.
- No `.ts` source changes, no behavior change, no package-lock change.

## PUBLIC API CHANGES

None. Documentation and a docs test only.

## PURPOSE PRESERVATION CHECK

- Original problem: semantic file reports are now safe + scan-integrated; intent
  assess / plan review needed to consume them as useful context; slice 150 wired
  that explicitly; this review confirms the context improves grounding without
  becoming proof or weakening gates.
- Preserved guarantee: semantic context is opt-in, stale context is visible,
  semantic context enriches planning context and prompts, and it does not approve,
  execute, write source, satisfy proof gates, or create handoff artifacts.

## CODEBASE-INTEL ALIGNMENT

The old codebase-intel system fed per-file understanding into its planning
surface. Rekon mirrors the value (semantic context informs assessment + plan
review) under stricter boundaries: explicit opt-in, proposal-not-proof,
deterministic imports/exports authoritative, sha/boundary staleness, and
readiness/status that stay governed by the existing deterministic evaluators.

## IMPLEMENTATION REVIEWED

Grounded at `de8c048` against committed source. Helper file confirmed:
`packages/capability-model/src/semantic-file-context.ts` (name matches the WO).
Also reviewed `intent-assessment-report.ts`, `intent-plan-actionability-report.ts`,
`semantic-file-understanding-report.ts`, capability-model `index.ts`,
`packages/cli/src/index.ts`, and `packages/kernel-repo-model/src/index.ts`
(read-only — no schema change), plus the slice-150 contract test and the scan
integration / actionability contract tests.

## SELECTION MODEL REVIEW

`selectSemanticFileContext` is pure (no fs/providers/clock). Match by `pathRelated`;
stale on sha mismatch (`reason: "sha-mismatch"`) or non-all-false boundaries
(`reason: "boundaries-not-clean"`); latest-by-path wins via a per-path map;
`missing` = requested paths with no usable/stale report. CLI owns fs reads +
current-hash computation and the candidate set (explicit refs vs `latest`).

## INTENT ASSESSMENT REVIEW

`readiness` (and `blockers` / `missingContext`) is computed before the semantic
step (intent-assessment-report.ts: readiness at line ~398, semantic injection at
~424, before `createIntentAssessmentReport`). Enrichment only adds used-report
paths to `matchedContext.paths` and appends low-severity `scope-ambiguous`
(findings) / `stale-context` (stale) warnings. Readiness/blockers cannot be
flipped or suppressed by semantic context.

## PLAN ACTIONABILITY REVIEW

`status` and `findings` are decided by the deterministic evaluator before the
semantic step (intent-plan-actionability-report.ts: report assembled at ~777,
semantic append at ~814, before `createIntentPlanActionabilityReport`). Semantic
context only appends grounding to `revisionPrompt.prompt` and notes to
`normalizationTrace.warnings`; status is never made more permissive and no finding
is added/removed.

## STALE CONTEXT REVIEW

Both staleness paths drop the report from `usedReports`, record a `staleReports`
entry with a reason, and emit a warning. Surfaced via `semanticContext.stale`
(JSON) + the "Semantic context: N used, M stale" human line, and via
`normalizationTrace.warnings` in plan review. Never silent.

## CLI REVIEW

Opt-in: resolver returns `undefined` with no flag (cli index ~7766) → builders get
no context → unchanged behavior. Explicit refs precedence + no path filter (~7784).
Missing ref throws a clear error and exits non-zero (~7792). `latest` path-filters
to the request paths. `semanticContext` summary present only when requested.

## BOUNDARY REVIEW

Proposal/context not proof; explicit not automatic; no approval; no proof-gate
satisfaction; no replacement of deterministic evidence; no command execution; no
source writes; no PreparedIntentPlan / WorkOrder / VerificationPlan /
VerificationRun / VerificationResult; no Circe; stale never silent; missing refs
fail cleanly; latest path-filtered; embeddings deferred; intent:go deferred.

## RECOMMENDATION

**Safe/stable.** No blocker. Proceed to the Embeddings Parity Audit / Embedding
Index Decision (default); optional Semantic File Understanding Intent Context
Dogfood as an alternative.

## TESTS / VERIFICATION

- New docs test (27 assertions): headings, 19 boundary statements, 4 tables
  (surface/consumption/boundary/option), CHANGELOG mention, packet PURPOSE
  PRESERVATION CHECK.
- Full nine-command gate (typecheck, test, build, diff-check, exports, license,
  publish, install, tarball). No CLI smoke (strategy-only batch).

## INTENTIONALLY UNTOUCHED

All `.ts` source; the slice-150 integration; the `fix(cli): report intent bundle
handoff paths` change on the same tip; kernel schemas; deterministic evidence
artifacts; WorkOrder / VerificationPlan gates; Circe; npm publish; package
versions; the embeddings track.

## RISKS / FOLLOW-UP

- Relevance filtering is heuristic in v1 (path-related + sha/boundary staleness).
- `latest` reads prior reports — O(reports) on large histories.
- Follow-up: Embeddings Parity Audit / Embedding Index Decision.

## NEXT STEP

Recommended: **Embeddings Parity Audit / Embedding Index Decision**.
