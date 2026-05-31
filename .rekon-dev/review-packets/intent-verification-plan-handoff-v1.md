# Review Packet — Intent VerificationPlan Handoff Implementation (slice 93)

## CHANGES MADE

- **`packages/capability-model/src/intent-verification-plan-handoff.ts`** (new) —
  `buildIntentVerificationPlanHandoff` helper + the proof-planning gate, the
  14-category blocker model, the `classifyVerificationCommand` sanitizer, the
  requirement→command/check mapping, the structural `IntentGeneratedVerificationPlan`
  mirror, and `INTENT_VERIFICATION_PLAN_ARTIFACT_ID_PREFIX` /
  `INTENT_VERIFICATION_PLAN_ALLOWED_STATUSES`.
- **`packages/capability-model/src/index.ts`** — re-exports the helper + types.
- **`packages/capability-intent/src/index.ts`** — additive
  `VerificationPlanIntentHandoff` type + optional `intentHandoff?` on
  `VerificationPlanLike` (`source` stays an open string that already accepts
  `"intent-handoff"`).
- **`packages/cli/src/index.ts`** — new `intent verification-plan generate` branch
  + imports.
- **Docs / tests** — new `docs/concepts/intent-verification-plan-handoff.md`;
  additive `VerificationPlan` artifact-doc section; cross-ref footers; CHANGELOG;
  32-assertion contract test; 14-assertion docs test.

## PUBLIC API CHANGES

- `@rekon/capability-intent`: new `VerificationPlanIntentHandoff` type;
  `VerificationPlanLike.intentHandoff?` added (additive, backwards-compatible).
- `@rekon/capability-model`: new exports `buildIntentVerificationPlanHandoff`,
  `classifyVerificationCommand`, `INTENT_VERIFICATION_PLAN_ARTIFACT_ID_PREFIX`,
  `INTENT_VERIFICATION_PLAN_ALLOWED_STATUSES`, and the
  `BuildIntentVerificationPlanHandoffInput` / `IntentVerificationPlanHandoffResult`
  / `IntentVerificationPlanHandoffBlocker` / `IntentVerificationPlanRequirementMapping`
  / `IntentGeneratedVerificationPlan` / `IntentVerificationPlan*Like` types.
- CLI: new subcommand `rekon intent verification-plan generate`.

## PURPOSE PRESERVATION CHECK

`PreparedIntentPlan.verificationRequirements` are proof obligations, not a
VerificationPlan. The WorkOrder handoff now covers implementation guidance; this
slice covers the proof-planning half — turning requirements into a runnable plan
without running anything. The generator writes exactly one VerificationPlan on a
passing gate, refuses on failed approval / status / freshness / drift / requirement
safety, maps requirements into commands + success criteria, preserves traceability
to the prepared plan, executes no commands, and writes no source.

## CODEBASE-INTEL ALIGNMENT

Classic intent kept proof planning explicit and non-executing. The generator emits
the classic `VerificationPlan` artifact (reusing the type; no new registration) and
mirrors the WorkOrder handoff's additive-source + `intentHandoff` pattern. The
broader proof-planning status set (`work-ready` / `work-in-progress` /
`verification-ready`) matches the slice-92 decision.

## GENERATION GATE

All-of: PreparedIntentPlan + ref present; `approval.status === "approved"`;
`status.value === "prepared"`; non-empty `verificationRequirements`;
IntentStatusReport + ref present and a proof-planning status; no high-severity
status blocker; `downstreamHandoff.verificationPlanAllowed === true`;
`sourceWriteAllowed === false`; freshness recheck; drift recheck; no rejected
requirement command.

## BLOCKER MODEL

14 stable categories: `missing-prepared-plan`, `plan-not-approved`,
`plan-not-prepared`, `missing-verification-requirements`, `missing-intent-status`,
`status-not-allowed`, `status-has-high-blocker`, `freshness-stale`,
`drift-changed`, `missing-source-ref`, `verification-plan-not-allowed`,
`source-write-boundary`, `unsafe-command`, `ambiguous-requirement`. Blocked →
`{ status: "blocked", blockers }` with no `verificationPlan`.

## FRESHNESS / DRIFT RECHECK

Stale `PathFreshnessReport` (`status: "stale"` or changed/missing entries) →
`freshness-stale`; any high-severity open `RuntimeGraphDriftReport` row →
`drift-changed`. Both optional; absent ≠ blocking; no override.

## VERIFICATION REQUIREMENT MAPPING

requirement id → mapping `requirementId` / trace id; safe command → `commands[]`;
reason → `successCriteria` + mapping `reason`; commandless requirement → `check`
guidance + success criterion (never an executable command); sourceRefs → mapping
refs; request goal → scope success criterion; phases → `phaseIds`; obligations →
`obligationIds`.

## COMMAND SAFETY MODEL

`classifyVerificationCommand`: **safe** (allowlist regexes: `npm run <script>`,
`npm test`, `node scripts/<name>.mjs`, `rekon … --json`, `rekon artifacts
validate|freshness`) → `commands[]`; **needs-review** (commandless-with-reason, or
command outside allowlist) → check/success-criterion only; **rejected**
(shell-control / destructive tokens, or no command and no reason) → blocks
(`unsafe-command` / `ambiguous-requirement`). Commands are never executed.

## TRACEABILITY MODEL

`intentHandoff` records prepared-plan / assessment / status / workOrder (when
supplied) / freshness / drift refs, `verificationRequirementIds`, `phaseIds`,
`obligationIds`, `requirementMappings`, and the literal all-false `boundary`.
Header `inputRefs` mirrors the refs.

## CLI SURFACE

`rekon intent verification-plan generate --prepared-plan <ref> [--intent-status
<ref>] [--work-order <ref>] [--path-freshness <ref>] [--runtime-drift <ref>]
[--root <path>] [--json]`. `--prepared-plan` required (must be a PreparedIntentPlan);
others resolve pinned-or-latest. Generated → one VerificationPlan + ref; blocked →
blockers, non-zero exit, nothing written.

## BOUNDARY MODEL

`boundary: { createsWorkOrder: false, createsVerificationRun: false,
createsVerificationResult: false, executesCommands: false, writesSourceFiles:
false }` literal-typed and set on every generated plan. CLI writes only via
`store.write(..., { category: "actions" })`; spawns no process, touches no source.
Contract tests 27–31 confirm no WorkOrder / VerificationRun / VerificationResult,
no command execution, no source writes.

## TESTS / VERIFICATION

- `tests/contract/intent-verification-plan-handoff.test.mjs` — 32 assertions
  (helper gate / safety / mapping / traceability + seeded CLI generate / blocked /
  no-WorkOrder / no-Run / no-Result / no-source / validate-clean).
- `tests/docs/intent-verification-plan-handoff.test.mjs` — 14 assertions.
- Full 9-command gate + product-capability CLI smoke (see ship log).

## INTENTIONALLY UNTOUCHED

No new artifact type registration (kernel / SDK / runtime unchanged); the runtime
validates only headers, so additive VerificationPlan fields keep `artifacts
validate` clean. No `VerificationRun` creation, no command execution, no
source-write path, no `intent:go`, no change to existing VerificationPlan
producers.

## RISKS / FOLLOW-UP

- The command sanitizer is a conservative v1 allowlist; a future slice may add a
  configurable policy artifact.
- The generator trusts the supplied approval envelope; status / freshness / drift
  are the handoff-time rechecks.
- Recommended next slice: **Intent VerificationPlan Handoff Safety Review**.

## NEXT STEP

Intent VerificationPlan Handoff Safety Review.
