# Review Packet — Intent Work / Proof Handoff Decision

Eighty-eighth slice on the capability-ontology track. Strategy / architecture
decision batch pinning whether and how a proof-approved PreparedIntentPlan may
lead to downstream WorkOrder and VerificationPlan artifacts. Follows the
IntentStatusReport Safety Review at `1d19a4f`. No generator is implemented.

## CHANGES MADE

- New `docs/strategy/intent-work-proof-handoff-decision.md` (14 sections +
  option / gate / boundary / sequence tables): Decision Summary, Why This
  Decision Exists, Current Boundary, Options Considered, Recommendation, WorkOrder
  Handoff Gate, VerificationPlan Handoff Gate, Freshness And Drift Recheck,
  Traceability Model, WorkOrder Generation Model, VerificationPlan Generation
  Model, Boundary Model, What This Does Not Do, Implementation Sequence.
- New `tests/docs/intent-work-proof-handoff-decision.test.mjs` (18 assertions).
- This review packet.
- Cross-reference updates to the intent / work / proof / spine docs, roadmaps,
  README, and CHANGELOG.

## PUBLIC API CHANGES

None. No types, helpers, CLI commands, schemas, or artifacts changed. This is a
decision/documentation-only batch.

## PURPOSE PRESERVATION CHECK

IntentAssessmentReport assesses readiness; PreparedIntentPlan prepares a
proof-approved phase/gate plan; IntentStatusReport reports current state. The next
boundary is whether a proof-approved plan can be handed off to existing downstream
work/proof artifacts. This handoff is close to action, so it must be decided
explicitly before any generator is built. The decision preserves the guarantee:
work/proof handoff is downstream of proof-approved preparation; WorkOrder remains
implementation guidance; VerificationPlan remains proof command planning;
generation must be explicit, gated, traceable, and read-only over inputs; it must
not execute commands or write source files; intent:go remains deferred.

## CODEBASE-INTEL ALIGNMENT

Classic intent never let plan output silently become work or proof execution; it
gated authorized output and required traceable structure. This decision re-homes
that discipline as separate, gated Rekon generators over the materialized spine,
using the earlier recorded classic findings. No classic codebase-intel modules
are imported.

## OPTIONS CONSIDERED

Selected Option B (separate gated generators). Rejected/deferred: Option A
(manual handoff only — leaves the spine incomplete), Option C (combined generator
— too much blast radius), Option D (status report generates artifacts — status is
read-only), Option E (intent:go now — execution deferred).

## WORKORDER HANDOFF GATE

Required inputs: PreparedIntentPlan, IntentStatusReport, optional latest
PathFreshnessReport / RuntimeGraphDriftReport. Required state:
approval.status === "approved"; status.value === "prepared";
recommendedNextAction === "create-work-order"; IntentStatusReport.status.value
work-ready with no high-severity blockers; no stale freshness or new high-severity
drift after approval unless explicitly accepted. Blocked on not-approved /
blocked / stale / needs-review / freshness-or-drift-changed / missing refs.
WorkOrder generation must require a proof-approved PreparedIntentPlan.

## VERIFICATIONPLAN HANDOFF GATE

Required inputs: PreparedIntentPlan, IntentStatusReport, optional WorkOrder.
Required state: approval.status === "approved"; verificationRequirements present;
IntentStatusReport.status.value work-ready / work-in-progress / verification-ready;
every requirement preserved as traceable commands/checks. Blocked on no
requirements / not-approved / stale-or-blocked-or-needs-review / ambiguous
requirements. VerificationPlan generation must require PreparedIntentPlan
verification requirements.

## FRESHNESS AND DRIFT RECHECK

Approval proof is captured at preparation time, so both generators must re-check
freshness and drift at handoff time. Stale scoped context (PathFreshnessReport) or
new high-severity drift (RuntimeGraphDriftReport) after approval blocks generation
unless the prepared plan's approval explicitly accepted that risk.

## TRACEABILITY MODEL

Generated WorkOrder cites preparedIntentPlanRef, intentAssessmentReportRef,
intentStatusReportRef, approval proof refs, and phase/obligation ids. Generated
VerificationPlan cites preparedIntentPlanRef, intentAssessmentReportRef,
intentStatusReportRef, verification-requirement ids, and verification proof refs.
Neither generator mutates PreparedIntentPlan / IntentStatusReport, marks anything
complete, executes commands, or writes source. Generated WorkOrder and
VerificationPlan must trace back to PreparedIntentPlan.

## WORKORDER GENERATION MODEL

Sketch only (IntentWorkOrderSource + IntentWorkOrderGenerationPolicy with
requiredApprovalStatus "approved", allowedIntentStatuses ["work-ready"],
requireFreshnessRecheck/requireDriftRecheck true, sourceWriteAllowed false).
Content: goal, selected phases, touched paths, capability/step/handoff
obligations, preservation constraints, verification-requirement summary, explicit
non-goals, source refs.

## VERIFICATIONPLAN GENERATION MODEL

Sketch only (IntentVerificationPlanSource + IntentVerificationPlanGenerationPolicy
with requiredApprovalStatus "approved", requireVerificationRequirements true,
executeCommands false, sourceWriteAllowed false). Content: commands/checks derived
from verificationRequirements, reason per command/check, source refs, expected
result type, no execution result.

## BOUNDARY MODEL

Intent work/proof handoff is artifact generation, not intent:go. WorkOrder and
VerificationPlan are separate downstream artifacts. IntentStatusReport gates but
does not generate. PreparedIntentPlan feeds guidance (WorkOrder) and proof planning
(VerificationPlan). Handoff generation does not execute commands or write source
files. intent:go remains deferred.

## TESTS / VERIFICATION

- `tests/docs/intent-work-proof-handoff-decision.test.mjs` — 18 assertions
  (headings, selected option, nine boundary statements, four tables, CHANGELOG,
  review packet).
- Full 9-command gate: typecheck, test, build, `git diff --check`,
  audit-package-exports, audit-license, publish-dry-run, install-smoke,
  install-tarball-smoke. No CLI smoke (strategy-only batch).

## INTENTIONALLY UNTOUCHED

No WorkOrder / VerificationPlan generation; no WorkOrder / VerificationPlan /
VerificationRun / VerificationResult creation; no command execution; no source
writes; no intent:go; no artifact-type registration; no CLI command; no mutation
of any input artifact; no classic codebase-intel imports; no version bump; no npm
publish; no branch.

## RISKS / FOLLOW-UP

- The gates depend on revalidating freshness/drift at handoff time; the WorkOrder
  handoff implementation must make that recheck a hard gate, not advisory.
- Next: Intent WorkOrder Handoff Decision.

## NEXT STEP

Recommend **Intent WorkOrder Handoff Decision** (strategy/decision batch, no
implementation): decide the exact WorkOrder generator shape from a proof-approved
PreparedIntentPlan. Still no WorkOrder generation implementation, no
VerificationPlan generation, no command execution, no source writes, no intent:go.
