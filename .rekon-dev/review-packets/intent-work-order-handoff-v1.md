# Review Packet — Intent WorkOrder Handoff Implementation (slice 90)

## SUMMARY

This slice implements the explicit gated Intent WorkOrder generator pinned by the
slice-89 decision (`449a17d → 3b501b1`). A new
`rekon intent work-order generate` command reads a proof-approved
`PreparedIntentPlan` (gated by `IntentStatusReport` and a handoff-time
freshness / drift recheck), verifies the WorkOrder generation gate, and writes
exactly one `WorkOrder` (`source: "intent-handoff"`) — or, when the gate fails,
prints deterministic blockers, exits non-zero, and writes no WorkOrder. It
creates no `VerificationPlan`, executes no commands, and writes no source files;
`intent:go` remains deferred. No new artifact type is registered: the canonical
`WorkOrder` type is reused and extended additively.

## CHANGES MADE

- **`packages/capability-intent/src/index.ts`** — extended the canonical
  `WorkOrder` type additively: `source` gains `"intent-handoff"`, and a new
  optional `intentHandoff?: WorkOrderIntentHandoff` field (with the
  `WorkOrderIntentHandoff` type) carries source refs + phase / obligation /
  verification-requirement ids + a `boundary` record. No existing field changed.
- **`packages/capability-model/src/intent-work-order-handoff.ts`** (new) —
  `buildIntentWorkOrderHandoff` plus the `*Like` input types, the
  `IntentWorkOrderGenerationBlocker` model (12 categories), the structural
  `IntentGeneratedWorkOrder` mirror, the `IntentWorkOrderGenerationResult` union,
  and `INTENT_WORK_ORDER_ARTIFACT_ID_PREFIX`.
- **`packages/capability-model/src/index.ts`** — re-exports the helper + types.
- **`packages/cli/src/index.ts`** — new `intent work-order generate` branch
  (and a guard on the legacy `intent work-order` branch to exclude the
  `generate` positional). Imports the helper + `*Like` types.
- **Docs / tests** — new `docs/concepts/intent-work-order-handoff.md`; additive
  edits to `docs/artifacts/work-order.md` (third flavor + `intentHandoff`
  shape + producer); 19 cross-ref footers; CHANGELOG entry; 27-assertion
  contract test; 11-assertion docs test.

## PUBLIC API CHANGES

- `@rekon/capability-intent`: `WorkOrder.source` union adds `"intent-handoff"`;
  `WorkOrder.intentHandoff?` and the `WorkOrderIntentHandoff` type are new. Both
  additive and backwards-compatible.
- `@rekon/capability-model`: new exports `buildIntentWorkOrderHandoff`,
  `INTENT_WORK_ORDER_ARTIFACT_ID_PREFIX`, and the
  `BuildIntentWorkOrderHandoffInput` / `IntentWorkOrderGenerationResult` /
  `IntentWorkOrderGenerationBlocker` / `IntentGeneratedWorkOrder` /
  `IntentWorkOrder*Like` types.
- CLI: new subcommand `rekon intent work-order generate`.

## PURPOSE PRESERVATION CHECK

The handoff converts approved preparation into work guidance only; it never
becomes execution. Classic intent never let plan output silently become work
guidance without authorization — this generator preserves that discipline with
an explicit gate, a handoff-time recheck, and full traceability. The boundary
statements (no VerificationPlan / commands / source; intent:go deferred) are
asserted in code (`boundary` fields), the markdown, the concept doc, and the
contract tests.

## CODEBASE-INTEL ALIGNMENT

Mirrors the classic intent staging assess → prepare → status → work, where work
is gated on a proof-approved, status-blessed plan. The generator reads the same
context spine the decision pinned (`PreparedIntentPlan`, `IntentStatusReport`,
`PathFreshnessReport`, `RuntimeGraphDriftReport`, `IntentAssessmentReport` via
the plan's source ref) and emits the classic `WorkOrder` artifact rather than a
new type.

## GENERATION GATE

Allowed only when **all** hold (else `blocked`, no WorkOrder):
`PreparedIntentPlan` + ref present; `approval.status === "approved"`;
`status.value === "prepared"`; `recommendedNextAction === "create-work-order"`;
`IntentStatusReport.status.value === "work-ready"`; no high-severity status
blockers; `downstreamHandoff.workOrderAllowed === true` and
`sourceWriteAllowed === false`; at least one phase; freshness recheck passes;
runtime-drift recheck passes.

## BLOCKER MODEL

12 stable categories: `missing-prepared-plan`, `plan-not-approved`,
`plan-not-prepared`, `next-action-not-work-order`, `status-not-work-ready`,
`status-has-high-blocker`, `handoff-not-allowed`, `source-write-boundary`,
`empty-phases`, `freshness-stale`, `drift-changed`, `missing-source-ref`. A
blocked result returns `{ status: "blocked", blockers }` with no `workOrder`.

## FRESHNESS / DRIFT RECHECK

When a `PathFreshnessReport` is available and reports a stale status, the handoff
blocks (`freshness-stale`). When a `RuntimeGraphDriftReport` is available and has
any high-severity open drift row, the handoff blocks (`drift-changed`). Both are
optional inputs — absent reports do not block — matching the decision's
"checked when available" rule.

## WORKORDER MAPPING

`goal ← request.goal`; `paths ← unique-sorted phase paths`;
`ownerSystems ← unique-sorted phase systems`;
`riskNotes ← obligation messages + "Do not start:" blockedReasons`;
`requiredChecks ← verification-requirement command + reason`;
`successCriteria ← three fixed handoff criteria`; `markdown ← rendered phases /
constraints / verification-guidance / boundary sections`;
`source ← "intent-handoff"`; `antiGamingInstruction` includes the boundary
statement.

## TRACEABILITY MODEL

`intentHandoff` records `preparedIntentPlanRef`, `intentAssessmentReportRef`
(from the plan's source), `intentStatusReportRef`, optional
`pathFreshnessReportRef` / `runtimeGraphDriftReportRef`, the full `sourceRefs`
list, and the `phaseIds` / `obligationIds` / `verificationRequirementIds`. The
header `inputRefs` carries the same refs.

## CLI SURFACE

`rekon intent work-order generate --prepared-plan <ref> [--intent-status <ref>]
[--path-freshness <ref>] [--runtime-drift <ref>] [--root <path>] [--json]`.
`--prepared-plan` is required (and must reference a `PreparedIntentPlan`); the
others resolve pinned-or-latest. Generated → writes one WorkOrder + prints ref;
blocked → prints blockers, exits non-zero, writes nothing.

## BOUNDARY MODEL

`boundary: { createsVerificationPlan: false, executesCommands: false,
writesSourceFiles: false }` is literal-typed in `WorkOrderIntentHandoff` and set
on every generated WorkOrder. The CLI writes only via `store.write(..., {
category: "actions" })`; it spawns no process and touches no source path. Tests
24–26 confirm no `VerificationPlan` / `VerificationRun` is created and source
files are unchanged.

## TESTS / VERIFICATION

- `tests/contract/intent-work-order-handoff.test.mjs` — 27 assertions (helper
  gate / generation / mapping / traceability + seeded CLI generate / blocked /
  no-VerificationPlan / no-VerificationRun / no-source-write / validate-clean).
- `tests/docs/intent-work-order-handoff.test.mjs` — 11 assertions.
- Full 9-command gate + product-capability CLI smoke (see ship log).

## INTENTIONALLY UNTOUCHED

No new artifact type registration (kernel index / SDK
`BUILT_IN_ARTIFACT_TYPES` / runtime `ARTIFACT_CATEGORY_BY_TYPE` unchanged); the
runtime `validateArtifactIndex` validates only headers, so additive WorkOrder
fields keep `artifacts validate` clean. No `VerificationPlan` generator, no
`intent:go`, no source-write path, no change to existing WorkOrder producers.

## RISKS / FOLLOW-UP

- The generator trusts the supplied `PreparedIntentPlan` approval envelope; it
  does not re-derive approval. This matches the decision (status / freshness /
  drift are the handoff-time rechecks). A future slice may add an optional
  re-derivation cross-check.
- Freshness / drift are only rechecked when reports are supplied or present as
  latest; operators who never generate them get no recheck. Documented as
  "checked when available."
- Recommended next slice: **Intent WorkOrder Handoff Safety Review** (ground
  review of the shipped generator; no new capability).

## NEXT STEP

Intent WorkOrder Handoff Safety Review.
