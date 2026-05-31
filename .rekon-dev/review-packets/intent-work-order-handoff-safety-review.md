# Review Packet — Intent WorkOrder Handoff Safety Review (slice 91)

## CHANGES MADE

Strategy / safety-review batch — no runtime behavior change. Adds
`docs/strategy/intent-work-order-handoff-safety-review.md` (ground review of the
slice-90 generator), this review packet, an 18-assertion docs test, and
cross-reference footers / CHANGELOG / README pointers across the intent and
verification scope docs. No source files changed.

## PUBLIC API CHANGES

None. No helper, type, CLI flag, or artifact shape changed.

## PURPOSE PRESERVATION CHECK

The WorkOrder handoff is the first downstream generator on the intent spine and
is one CLI step from implementation guidance, so it must be confirmed safe before
the proof-plan handoff or `intent:go` is unblocked. The review verifies the
original guarantees hold: generation is explicit and gated, requires a
proof-approved `PreparedIntentPlan`, is gated (not generated) by
`IntentStatusReport`, rechecks freshness / drift at handoff time, traces back to
the plan, and creates no VerificationPlan, runs no commands, and writes no source;
`intent:go` stays deferred.

## CODEBASE-INTEL ALIGNMENT

Classic intent never let plan output silently become work guidance without
authorization. The reviewed generator preserves that discipline with an explicit
gate, a handoff-time recheck, and full traceability, emitting the classic
`WorkOrder` artifact rather than a new type.

## HELPER / CLI REVIEWED

- `buildIntentWorkOrderHandoff` (`packages/capability-model/src/intent-work-order-handoff.ts`)
  — pure function; reads only the supplied artifacts, returns blocked-or-generated,
  mutates nothing, writes nothing itself.
- `rekon intent work-order generate` (`packages/cli/src/index.ts`) — resolves
  inputs, calls the helper, persists exactly one `WorkOrder` on pass (one
  `store.write`, `actions` category) and nothing on block (exit 1). Legacy
  `intent work-order` branch guarded with `positional !== "generate"`.

## GATE REVIEW

All-of: PreparedIntentPlan + ref present; `approval.status === "approved"`;
`status.value === "prepared"`; `recommendedNextAction === "create-work-order"`;
IntentStatusReport + ref present and `work-ready`; no high-severity status
blocker; `workOrderAllowed === true`; `sourceWriteAllowed === false`; non-empty
phases; freshness recheck; drift recheck. Matches the slice-89 decision exactly.

## BLOCKED PATH REVIEW

`blockers.length > 0 || !plan || !planRef` → `{ status: "blocked", blockers }`,
no `workOrder`; CLI sets exit 1 and writes nothing. Confirmed by the slice-90 CLI
smoke (7 blockers, exit 1, no WorkOrder / VerificationPlan / VerificationRun,
validate clean, source untouched). **Blocked handoff writes no WorkOrder.**

## GENERATED WORKORDER REVIEW

On pass, exactly one `WorkOrder` with `source: "intent-handoff"`: goal ← request
goal; paths / ownerSystems ← unique-sorted phase paths / systems; riskNotes ←
obligation messages + blocked reasons; requiredChecks ← verification-requirement
guidance strings (never executed); fixed successCriteria noting requirements are
proof obligations, not a VerificationPlan.

## TRACEABILITY REVIEW

`intentHandoff` records the prepared-plan / assessment / status / freshness /
drift refs, the `sourceRefs` list, and the phase / obligation /
verification-requirement ids; header `inputRefs` mirrors them. Descriptive only;
grants no authority. **Generated WorkOrder must trace back to PreparedIntentPlan.**

## FRESHNESS / DRIFT RECHECK REVIEW

Stale `PathFreshnessReport` (`status: "stale"` or changed/missing entries) →
`freshness-stale`; any high-severity open `RuntimeGraphDriftReport` row →
`drift-changed`. Both optional (absent ≠ blocking); no override path.

## VERIFICATIONPLAN BOUNDARY

No `VerificationPlan` created; verification requirements are guidance + ids only.
**WorkOrder generation does not create VerificationPlan.** **WorkOrder generation
does not create VerificationRun or VerificationResult.**

## COMMAND / SOURCE-WRITE BOUNDARY

Pure transform + one `store.write`. No process spawned, no command executed, no
source path written. `intentHandoff.boundary` literal-typed all-false.
**WorkOrder generation does not execute commands.** **WorkOrder generation does
not write source files.**

## INTENT GO BOUNDARY

Produces guidance, not execution; does not start/schedule/run the work. **Intent
WorkOrder handoff is WorkOrder artifact generation, not intent:go.** **intent:go
remains deferred.**

## RECOMMENDATION

Intent WorkOrder handoff is **safe / stable** as an explicit gated WorkOrder
generator. Proceed to the **Intent VerificationPlan Handoff Decision**.

## TESTS / VERIFICATION

- New `tests/docs/intent-work-order-handoff-safety-review.test.mjs` (18
  assertions).
- Full gate: typecheck, test (full suite), build, `git diff --check`,
  audit-package-exports, audit-license, publish-dry-run, install-smoke,
  install-tarball-smoke. No CLI smoke (strategy-only batch).

## INTENTIONALLY UNTOUCHED

Helper, CLI, WorkOrder type, all intent / verification / freshness / drift
artifacts, and existing WorkOrders are unchanged. No version bump, no publish.

## RISKS / FOLLOW-UP

- The generator trusts the supplied `PreparedIntentPlan` approval envelope rather
  than re-deriving approval (by design; status / freshness / drift are the
  handoff-time rechecks). A future slice may add an optional re-derivation
  cross-check.
- Freshness / drift are only rechecked when reports exist; documented as "checked
  when available."

## NEXT STEP

Intent VerificationPlan Handoff Decision.
