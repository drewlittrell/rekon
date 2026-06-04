# Review Packet — TaskContextReport Selection Quality Fix (slice 169)

Base `50f63f2`. Product capability batch (focused quality fix). No new artifact, no
new CLI command, no new architecture track.

## CHANGES MADE

- `packages/capability-model/src/task-context-report.ts`
  - `extractVerificationHints`: added a second pass that emits a NON-command
    `manual-verification` hint for free-form verification-intent clauses (verify /
    confirm / validate / ensure / make sure / check) that name no command; clauses
    with a command keyword are skipped so they never double-emit.
  - retrieval loop: classify neighbors first, then include weak-band neighbors as
    labelled supporting context ONLY when no strong/useful neighbor exists; ignored
    still excluded; weak items keep `scoreBand: "weak"` with a "weak supporting"
    reason.
- `packages/cli/src/index.ts` — broadened the `context task` `retrieval-low-signal`
  warning: fires when retrieval ran but selected no embedding context (now includes
  the top candidate's score/band), and additionally when every selected embedding
  neighbor is weak-band.
- `tests/contract/task-context-report-selection-quality.test.mjs` (NEW, 19 keyless
  + 4 live-gated assertions).
- `tests/docs/task-context-report-selection-quality.test.mjs` (NEW, 12 assertions).
- New strategy memo + this review packet; cross-ref updates to the TaskContextReport
  doc set, releases, roadmaps, README, CHANGELOG.

## PUBLIC API CHANGES

None. No type, artifact, command, or flag changed. Behavioral deltas are additive:
free-form verification hints are a new *kind of entry* in the existing
`verificationHints` array (using the already-supported optional `artifact` field,
no `command`), and the retrieval-low-signal warning string is enriched. The
`TaskContextReport` schema, factory, and validator are unchanged.

## PURPOSE PRESERVATION CHECK

- Original problem: TaskContextReport is useful for explicit-path tasks; before
  intent integration it needed better quality for free-form verification intent and
  weak retrieval-backed context — and the improvements must stay context-only.
- Product guarantee preserved: verification hints are hints, not executed commands;
  free-form verification intent is captured without inventing shell commands; weak
  retrieval context is labelled supporting (or excluded with a warning); retrieval
  remains proposal/context, never proof; deterministic graph facts outrank
  similarity; source files remain unchanged; no proof / approval / execution
  semantics are introduced; intent:go remains deferred.

## SOURCE REVIEW

- Grounded in the kernel `TaskContextVerificationHint` type (`command?` + `artifact?`
  both optional) and validator (each checked only "when present"; reason required) —
  so an `artifact`-only free-form hint is valid.
- The builder remains pure: imports only `node:crypto`; no providers, commands,
  source writes, or PreparedIntentPlan / WorkOrder / VerificationPlan.
- The CLI change is additive output only (a warning string); selection is unchanged
  and an ignored neighbor is never promoted into context.

## VERIFICATION HINT QUALITY

- "Verify routing behavior." → 1 `manual-verification` hint, `command` undefined.
- "Make sure inbound SMS routing still works." / "Confirm greet behavior." /
  "Check profile rendering." / "Validate order creation." / "Ensure invoice
  formatting still works." → non-command hints.
- "Verify with typecheck and tests." → `npm run typecheck` + `npm test` command
  hints, NO free-form duplicate.
- "Run npm test." / "Use npm run build." → command hints preserved.
- All hints carry empty evidence refs and never execute.

## RETRIEVAL QUALITY

- Weak + ignored (no strong/useful) → weak included as labelled supporting context;
  ignored excluded.
- Strong + weak → weak gated out; only strong kept.
- Pure mock retrieval over the 6-file fixture → all-ignored → `retrieval-low-signal`
  warning with top-candidate detail. Weak-only selection → all-weak warning.

## DOGFOOD RESULT

Both slice-168 scenarios rerun against the rebuilt CLI: explicit-path unchanged
(2 command hints); retrieval task now yields a free-form verification hint; pure
mock retrieval still records `retrieval-low-signal` (now with candidate detail);
source unchanged; artifacts validate clean.

## LIVE VOYAGE RESULT

Not run this batch (optional; no `REKON_RUN_LIVE_EMBEDDING_TESTS=1` + `VOYAGE_API_KEY`
opt-in). The four live contract assertions skip cleanly; keyless gate unaffected.
Recommended as a non-blocking follow-up.

## BOUNDARY MODEL

No source writes, no command execution, no Circe, no PreparedIntentPlan / WorkOrder
/ VerificationPlan, no approval, no intent:go. Retrieval is proposal/context, not
proof; deterministic graph facts outrank embedding similarity; weak neighbors are
never core context.

## TESTS / VERIFICATION

- New contract test (19 keyless + 4 live-gated) — pure-builder hint + weak-band
  assertions and CLI low-signal + boundary checks.
- New docs test (12 assertions).
- Existing `task-context-report.test.mjs` + `task-context-report-dogfood.test.mjs`
  re-run green (no regression).
- Full keyless 9-command gate.
- CLI dogfood: both scenarios run.

## INTENTIONALLY UNTOUCHED

Ranking thresholds, graph expansion bounds, artifact model, provider architecture,
intent prepare, duplicate detection, canonical recommendations, ANN/HNSW, versions.

## RISKS / FOLLOW-UP

- Free-form verb detection is intentionally broad ("check" included); it only ever
  emits a hint (never a command), so false positives are low-cost.
- Retrieval path still benefits from a live Voyage dogfood before relying on
  embedding retrieval for intent context.

## NEXT STEP

**TaskContextReport Intent Integration Decision** — decide how task context
optionally feeds intent assess / plan review as context (not proof), with no
approval, command execution, source writes, or intent:go. Live Voyage retrieval
dogfood recommended as a non-blocking companion.
