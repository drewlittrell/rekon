# Review Packet — Intent VerificationPlan Handoff Decision (slice 92)

## CHANGES MADE

Strategy / architecture decision batch — no runtime behavior change. Adds
`docs/strategy/intent-verification-plan-handoff-decision.md` (the second half of
the separate-generator handoff model), this review packet, a 19-assertion docs
test, and cross-reference footers / CHANGELOG / README pointers across the intent
and verification scope docs. No source files changed; no generator implemented.

## PUBLIC API CHANGES

None. No helper, type, CLI flag, or artifact shape changed. The decision *proposes*
(for the next slice) an additive `VerificationPlan.source: "intent-handoff"` value
and an additive optional `intentHandoff` block, but implements neither.

## PURPOSE PRESERVATION CHECK

`PreparedIntentPlan` emits `verificationRequirements` as proof obligations; the
WorkOrder handoff already maps an approved plan into work guidance. The remaining
boundary is proof planning — converting those obligations into a `VerificationPlan`
without executing commands. Because that is close to execution, the generator is
decided separately first. The decision preserves the guarantees: generation is
explicit and gated, requires a proof-approved `PreparedIntentPlan` with non-empty
verification requirements, is gated (not generated) by `IntentStatusReport`,
rechecks freshness / drift, traces back to the plan, sanitizes commands without
running them, and creates no `WorkOrder` / `VerificationRun` / `VerificationResult`;
`intent:go` stays deferred.

## CODEBASE-INTEL ALIGNMENT

Classic intent kept proof planning explicit and never executed commands as a side
effect of planning. The decision emits the classic `VerificationPlan` artifact
(reusing the existing type) rather than a new type, and mirrors the WorkOrder
handoff's additive-source + `intentHandoff` pattern. Grounding confirmed in the
shipped code: `downstreamHandoff.verificationPlanAllowed` exists
(`prepared-intent-plan.ts`, true only when approved); `IntentStatusReport.status.value`
includes `work-ready` / `work-in-progress` / `verification-ready`
(`intent-status-report.ts`); `verificationRequirements` is `{ id, command?, reason,
sourceRefs }`; and `VerificationPlan.workOrderRef` is optional.

## OPTIONS CONSIDERED

A manual-only (rejected/deferred), **B explicit gated generator (selected)**, C
require-WorkOrder-first (rejected/deferred — `workOrderRef` is optional, so nothing
forces it), D combined WorkOrder+VerificationPlan generator (rejected), E create
VerificationRun directly (rejected), F intent:go creates VerificationPlan
(rejected).

## VERIFICATIONPLAN GENERATION GATE

All-of: PreparedIntentPlan present; `approval.status === "approved"`;
`status.value === "prepared"`; `verificationRequirements` non-empty;
IntentStatusReport present and `work-ready` / `work-in-progress` /
`verification-ready`; no high-severity status blocker;
`downstreamHandoff.verificationPlanAllowed === true`; `sourceWriteAllowed === false`;
freshness recheck; drift recheck.

## BLOCKS VERIFICATIONPLAN GENERATION

Missing plan; not-approved; not-prepared; empty requirements; missing status;
status not allowed for proof planning; high-severity status blocker; stale
freshness after approval; new high-severity drift after approval; missing source
refs; ambiguous requirement; unsafe command; `verificationPlanAllowed !== true`;
`sourceWriteAllowed !== false`. Blocked → non-zero exit, no VerificationPlan.

## FRESHNESS AND DRIFT RECHECK

Compare the latest/pinned `PathFreshnessReport` / `RuntimeGraphDriftReport` against
the proof refs in `PreparedIntentPlan.approval.proof`; stale freshness or new
high-severity drift after approval blocks. Optional inputs (absent ≠ blocking). No
override implemented or assumed.

## VERIFICATION REQUIREMENT MAPPING

requirement id → check/trace id; requirement command → command/check text;
requirement reason → rationale; requirement sourceRefs → evidence/refs; request
goal → scope; phases → coverage context; obligations → proof context; source refs
→ traceability. Requirements without a command (e.g. `verify:document-findings`) →
guidance check only. Additive `source: "intent-handoff"` + `intentHandoff` block
proposed for the implementation slice (header-only validation keeps `artifacts
validate` clean).

## TRACEABILITY MODEL

Cite prepared-plan / assessment / status / workOrder (when present) / proof
freshness+drift refs + requirement ids + phase ids + obligation ids; header
`inputRefs` mirrors them; plan records the no-VerificationRun / no-execute /
no-source boundary.

## VERIFICATION COMMAND SAFETY

Commands as text only; never executed. v1 sanitizer classifies each requirement
command safe / needs-review / rejected: reject empty-required, shell control
operators, source-write/destructive tokens, non-command strings; block on
rejected; surface needs-review without executing. Implementation must include the
conservative sanitizer.

## BOUNDARY MODEL

VerificationPlan handoff vs intent:go (generation, not execution); vs
IntentStatusReport (status gates, generator writes); vs WorkOrder (no work-guidance
creation); vs VerificationRun/VerificationResult (no command/proof-result
creation); vs command execution (none run); vs source writes (none); vs
PreparedIntentPlan (consumes approved plan, mutates nothing).

## TESTS / VERIFICATION

- New `tests/docs/intent-verification-plan-handoff-decision.test.mjs` (19
  assertions).
- Full gate: typecheck, test (full suite), build, `git diff --check`,
  audit-package-exports, audit-license, publish-dry-run, install-smoke,
  install-tarball-smoke. No CLI smoke (strategy-only batch).

## INTENTIONALLY UNTOUCHED

No generator, no `VerificationPlan` / `VerificationRun` / `VerificationResult` /
`WorkOrder` creation, no command execution, no source writes, no `intent:go`, no
artifact-type registration, no version bump, no publish. All intent / verification
/ freshness / drift artifacts unchanged.

## RISKS / FOLLOW-UP

- The proof-planning status set is broader (`work-ready` / `work-in-progress` /
  `verification-ready`) than the WorkOrder handoff's (`work-ready` only); the
  implementation must enforce exactly this set.
- Command safety is a v1 conservative sanitizer; a future slice may add an
  allowlist / policy artifact.
- WorkOrder is optional in v1 (`workOrderRef?`); if a future schema makes it
  mandatory, revisit Option C.

## NEXT STEP

Intent VerificationPlan Handoff Implementation.
