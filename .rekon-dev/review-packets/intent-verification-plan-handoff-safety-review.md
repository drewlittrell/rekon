# Review Packet — Intent VerificationPlan Handoff Safety Review (slice 94)

## CHANGES MADE

Strategy / safety-review batch — no runtime behavior change. Adds
`docs/strategy/intent-verification-plan-handoff-safety-review.md` (ground review of
the slice-93 generator), this review packet, a 22-assertion docs test, and
cross-reference footers / CHANGELOG / README pointers across the intent and
verification scope docs. No source files changed.

## PUBLIC API CHANGES

None. No helper, type, CLI flag, or artifact shape changed.

## PURPOSE PRESERVATION CHECK

The VerificationPlan handoff is the artifact closest to command execution on the
read-only intent spine, so it must be confirmed safe before any VerificationRun /
execution / `intent:go` decision. The review verifies the original guarantees:
generation is explicit and gated, requires a proof-approved `PreparedIntentPlan`
with non-empty verification requirements, is gated (not generated) by
`IntentStatusReport`, cites an optional `WorkOrder`, rechecks freshness / drift,
classifies commands as text (never executing them), traces back to the plan, and
creates no `WorkOrder` / `VerificationRun` / `VerificationResult`; `intent:go` stays
deferred.

## CODEBASE-INTEL ALIGNMENT

Classic intent kept proof planning explicit and non-executing. The reviewed
generator emits the classic `VerificationPlan` artifact (reusing the type) and
mirrors the WorkOrder handoff's additive-source + `intentHandoff` pattern, adding a
conservative command sanitizer that classic intent's command lists never
auto-executed.

## HELPER / CLI REVIEWED

- `buildIntentVerificationPlanHandoff` (`packages/capability-model/src/intent-verification-plan-handoff.ts`)
  — pure function; reads only the supplied artifacts, returns blocked-or-generated
  (+ mappings), mutates nothing, writes nothing itself.
- `classifyVerificationCommand` — text-only classifier: safe allowlist regexes,
  reject-token set, needs-review fallback; never executes.
- `rekon intent verification-plan generate` (`packages/cli/src/index.ts`) — resolves
  inputs, calls the helper, persists exactly one `VerificationPlan` on pass (one
  `store.write`, `actions` category) and nothing on block (exit 1).

## GATE REVIEW

All-of: PreparedIntentPlan + ref present; `approval.status === "approved"`;
`status.value === "prepared"`; non-empty `verificationRequirements`; IntentStatusReport
+ ref present and `work-ready` / `work-in-progress` / `verification-ready`; no
high-severity status blocker; `verificationPlanAllowed === true`;
`sourceWriteAllowed === false`; freshness recheck; drift recheck; no rejected
requirement command. Matches the slice-92 decision.

## BLOCKED PATH REVIEW

`blockers.length > 0 || !plan || !planRef` → `{ status: "blocked", blockers,
mappings }`, no `verificationPlan`; CLI sets exit 1 and writes nothing. Confirmed by
the slice-93 CLI smoke (6 blockers, exit 1, no VerificationPlan / WorkOrder /
VerificationRun / VerificationResult, validate clean, source untouched). **Blocked
handoff writes no VerificationPlan.**

## GENERATED VERIFICATIONPLAN REVIEW

On pass, exactly one `VerificationPlan` with `source: "intent-handoff"`: safe
commands → `commands`; reasons + commandless/needs-review → `successCriteria` +
`requirementMappings.check`; request goal → scope success criterion. One `store.write`
and nothing else.

## COMMAND SAFETY REVIEW

`classifyVerificationCommand` classifies command text only. Safe allowlist (`npm run
<script>`, `npm test`, `node scripts/<name>.mjs`, `rekon … --json`, `rekon artifacts
validate|freshness`) → `commands`. Reject tokens (`;`, `&&`, `||`, `|`, `>`, `<`,
backtick, `$(`, `${`, `rm`, `mv`, `cp`, `chmod`, `chown`, `curl`, `wget`, `ssh`,
`scp`, `sudo`, `git push`, `npm publish`) → blocked. Commandless-with-reason or
out-of-allowlist → needs-review (check only, not executable). Reasonless / no-command
→ ambiguous, blocked.

## TRACEABILITY REVIEW

`intentHandoff` records prepared-plan / assessment / status / optional workOrder /
freshness / drift refs + `verificationRequirementIds` / `phaseIds` / `obligationIds`
+ `requirementMappings` (with per-requirement safety). Header `inputRefs` mirrors
them. Descriptive only. **Generated VerificationPlan must trace back to
PreparedIntentPlan.**

## FRESHNESS / DRIFT RECHECK REVIEW

Stale `PathFreshnessReport` (`status: "stale"` or changed/missing entries) →
`freshness-stale`; any high-severity open `RuntimeGraphDriftReport` row →
`drift-changed`. Both optional (absent ≠ blocking); no override.

## WORKORDER BOUNDARY

No `WorkOrder` created; `WorkOrder` is an optional input cited when supplied. **WorkOrder
is optional in v1 and cited when available.** **VerificationPlan generation does not
create WorkOrder.**

## VERIFICATIONRUN / VERIFICATIONRESULT BOUNDARY

No `VerificationRun` / `VerificationResult` created; `intentHandoff.boundary` is
literal-typed all-false (`createsWorkOrder` / `createsVerificationRun` /
`createsVerificationResult` / `executesCommands` / `writesSourceFiles`). **VerificationPlan
generation does not create VerificationRun or VerificationResult.**

## COMMAND / SOURCE-WRITE BOUNDARY

Pure transform + one `store.write`. No process spawned, no command executed, no
source path written. **VerificationPlan generation does not execute commands.**
**VerificationPlan generation does not write source files.**

## INTENT GO BOUNDARY

Produces an artifact, not execution; runs no commands, schedules no run, implements
no `intent:go`. **intent:go remains deferred.**

## NEXT PHASE PLAN

The non-executing preparation chain is complete (assessment → prepared plan →
status → WorkOrder → VerificationPlan). Next phase: (1) Intent Plan Bundle / Agent
Handoff Directory Decision; (2) Implementation; (3) Safety Review; (4) Intent Go /
Execution Boundary Decision — only after the plan-bundle safety review. The directory
to evaluate defaults to `.rekon/intent/plans/<intent-id>/`, split from
`.rekon/artifacts/...`. **Plan bundle / LLM-agent handoff directory work is deferred
to the next phase plan**; this review implements no bundle.

## RECOMMENDATION

Intent VerificationPlan handoff is **safe / stable** as an explicit gated
VerificationPlan generator. Proceed to the **Intent Plan Bundle / Agent Handoff
Directory Decision**.

## TESTS / VERIFICATION

- New `tests/docs/intent-verification-plan-handoff-safety-review.test.mjs` (22
  assertions).
- Full gate: typecheck, test (full suite), build, `git diff --check`,
  audit-package-exports, audit-license, publish-dry-run, install-smoke,
  install-tarball-smoke. No CLI smoke (strategy-only batch).

## INTENTIONALLY UNTOUCHED

Helper, CLI, sanitizer, VerificationPlan type, all intent / verification / freshness
/ drift artifacts unchanged. No plan-bundle implementation, no VerificationRun, no
version bump, no publish.

## RISKS / FOLLOW-UP

- The command sanitizer is a conservative v1 allowlist; a future slice may add a
  configurable policy artifact.
- Plan-bundle directory shape is the next decision; staleness / provenance
  representation must be pinned there.

## NEXT STEP

Intent Plan Bundle / Agent Handoff Directory Decision.
