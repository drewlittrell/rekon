# Review Packet — Intent WorkOrder Handoff Decision

Eighty-ninth slice on the capability-ontology track. Strategy / architecture
decision batch pinning the exact WorkOrder generator shape, gate, freshness/drift
recheck, traceability, content mapping, and source policy for generating a
WorkOrder from a proof-approved PreparedIntentPlan. Follows the Intent Work /
Proof Handoff Decision at `449a17d`. No generator is implemented.

## CHANGES MADE

- New `docs/strategy/intent-work-order-handoff-decision.md` (14 sections +
  option / gate / mapping / boundary tables): Decision Summary, Why This Decision
  Exists, Current Boundary, Options Considered, Recommendation, WorkOrder
  Generation Gate, Blocks WorkOrder Generation, Freshness And Drift Recheck,
  Traceability Model, WorkOrder Content Mapping, Verification Requirement
  Boundary, Boundary Model, What This Does Not Do, Implementation Sequence.
- New `tests/docs/intent-work-order-handoff-decision.test.mjs` (18 assertions).
- This review packet.
- Cross-reference updates to the intent / work / proof / spine docs, roadmaps,
  README, and CHANGELOG.

## PUBLIC API CHANGES

None. No types, helpers, CLI commands, schemas, or artifacts changed. This is a
decision/documentation-only batch.

## PURPOSE PRESERVATION CHECK

PreparedIntentPlan is now proof-approved phase/gate preparation; IntentStatusReport
can report work-ready; the next boundary is converting a proof-approved prepared
plan into implementation guidance (WorkOrder). That conversion is close to action,
so the generator must be explicitly gated, traceable, and read-only over inputs.
The decision preserves the guarantee: WorkOrder generation is downstream of
proof-approved preparation; WorkOrder remains implementation guidance, not
execution; generation requires an approved plan + safe IntentStatusReport state +
a freshness/drift recheck; it creates a new WorkOrder only when explicitly invoked
in a future implementation slice; it does not create VerificationPlan, execute
commands, or write source files.

## CODEBASE-INTEL ALIGNMENT

Classic intent never let plan output silently become work guidance without
authorization; it gated authorized output and required traceable structure. This
decision re-homes that discipline as an explicit, gated Rekon generator over the
materialized spine, using the earlier recorded classic findings. No classic
codebase-intel modules are imported.

## OPTIONS CONSIDERED

Selected Option B (explicit gated WorkOrder generator). Rejected/deferred: Option
A (manual WorkOrder only — leaves the spine incomplete), Option C (combined
WorkOrder + VerificationPlan generator — proof planning is a separate handoff),
Option D (IntentStatusReport generates WorkOrder — status is read-only), Option E
(intent:go creates WorkOrder — execution deferred).

## WORKORDER GENERATION GATE

Allowed only when all are true: approval.status === "approved"; status.value ===
"prepared"; recommendedNextAction === "create-work-order";
IntentStatusReport.status.value === "work-ready"; no high-severity blockers;
approval.proof.downstreamHandoff.workOrderAllowed === true;
approval.proof.downstreamHandoff.sourceWriteAllowed === false; freshness recheck
passes; drift recheck passes. WorkOrder generation must require a proof-approved
PreparedIntentPlan.

## BLOCKS WORKORDER GENERATION

Blocked by: missing PreparedIntentPlan; approval not approved; status not
prepared; next action not create-work-order; IntentStatusReport not work-ready;
high-severity blocker; stale freshness after approval; new high-severity drift
after approval; missing source refs; empty phases; workOrderAllowed !== true;
sourceWriteAllowed !== false.

## FRESHNESS AND DRIFT RECHECK

The generator must compare the latest/pinned PathFreshnessReport and
RuntimeGraphDriftReport against the proof refs recorded in
PreparedIntentPlan.approval.proof. If the latest state differs materially from the
approved proof state, generation blocks unless a future explicit accepted-risk
override exists. No override is implemented or assumed in this decision. WorkOrder
generation must recheck freshness and runtime drift at handoff time.

## TRACEABILITY MODEL

Generated WorkOrder cites preparedIntentPlanRef, intentAssessmentReportRef,
intentStatusReportRef, approval proof refs, selected phase ids, selected
obligation ids, and selected verificationRequirement ids (IntentWorkOrderSource
trace fields). Generated WorkOrder must trace back to PreparedIntentPlan; the
generator mutates nothing it reads.

## WORKORDER CONTENT MAPPING

request.goal → WorkOrder summary/goal; phases → ordered implementation guidance;
phase.paths → touched paths; systems/capabilities/steps → implementation context;
obligations → preservation checks/constraints; blockedReasons → do-not-start
reasons; verificationRequirements → verification guidance only; source refs →
traceability. Where the narrower WorkOrder shape lacks a direct field, embed as
structured metadata if available or reserve a generator-specific details section;
do not invent unsupported fields.

## VERIFICATION REQUIREMENT BOUNDARY

Verification requirements may be copied into WorkOrder as guidance, but WorkOrder
generation does not create VerificationPlan. VerificationPlan generation is a
separate future handoff with its own gate and safety review.

## BOUNDARY MODEL

WorkOrder handoff is artifact generation, not intent:go. The generator writes
(status gates); it creates no VerificationPlan; it executes no commands; it writes
no source; it consumes the approved plan and mutates nothing. intent:go remains
deferred.

## TESTS / VERIFICATION

- `tests/docs/intent-work-order-handoff-decision.test.mjs` — 18 assertions
  (headings, selected option, nine boundary statements, four tables, CHANGELOG,
  review packet).
- Full 9-command gate: typecheck, test, build, `git diff --check`,
  audit-package-exports, audit-license, publish-dry-run, install-smoke,
  install-tarball-smoke. No CLI smoke (strategy-only batch).

## INTENTIONALLY UNTOUCHED

No WorkOrder generation; no WorkOrder / VerificationPlan / VerificationRun /
VerificationResult creation; no command execution; no source writes; no intent:go;
no artifact-type registration; no CLI command; no mutation of any input artifact;
no classic codebase-intel imports; no version bump; no npm publish; no branch.

## RISKS / FOLLOW-UP

- The freshness/drift recheck is the safety crux; the implementation must make it
  a hard gate that compares against the approved proof refs, not an advisory note.
- The narrower WorkOrder shape may force a generator-specific details section;
  the implementation decision must keep traceability ids first-class.
- Next: Intent WorkOrder Handoff Implementation.

## NEXT STEP

Recommend **Intent WorkOrder Handoff Implementation**: implement the explicit
gated WorkOrder generator + `rekon intent work-order generate` CLI from a
proof-approved PreparedIntentPlan. Still no VerificationPlan generation, no
command execution, no source writes, no intent:go.
