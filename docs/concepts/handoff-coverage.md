# Handoff Coverage

Handoff coverage answers one narrow question: for each baton pass an
operator **declared** in a `HandoffContract`, is there evidence that the
handoff was actually **observed**? `HandoffCoverageReport` is the artifact
that answers it.

## Coverage, Not Command Success

**HandoffCoverageReport is handoff-event coverage, not VerificationRun
command success.** A green `VerificationRun` proves a command (tests,
typecheck, build) succeeded; it says nothing about whether a declared
baton pass between two workflow steps was observed. Handoff coverage is a
different axis: it compares declared handoffs against observed
`handoff_event` evidence. The two are complementary and must not be
conflated.

## What It Reads

**It reads `HandoffContract` and optional `.rekon/handoff-events.jsonl`.**
The contract supplies the declared handoffs; the event log supplies the
observed `handoff_event` lines. Only lines whose `kind` is `handoff_event`
are considered observed handoffs — other JSON rows are ignored — and
matching is by event name, then feature, then step pair, never by title or
prose.

## Missing Log vs. Present-Unmatched

Two states are deliberately distinct:

- **Missing event log means not-evaluated, not uncovered.** With no log to
  read, coverage was never measured, so declared handoffs are
  `not-evaluated`. Calling them `uncovered` would falsely imply the
  handoff is known to be absent.
- **Present log without a match means uncovered.** When a log *is* present
  and a declared handoff has no matching observed event, that is a real
  coverage gap: `uncovered`.

This distinction keeps the report honest — absence of observation is not
the same as observed absence.

## Added-Observed and Parse Errors

**Added observed events are unmatched observed `handoff_event` rows.** An
observed event with no declared handoff becomes an `added-observed` row,
surfacing drift between what runs and what was declared — without yet
modeling a full runtime graph. Events consumed by a declared match are
never also counted as `added-observed`.

**Invalid lines count parseErrors without aborting the report.** A
malformed JSONL line increments a `parseErrors` counter and processing
continues; one bad line never discards the rest of the coverage signal.

## Boundaries

Handoff coverage is deliberately the *narrow* layer before generalized
runtime observation:

- **HandoffCoverageReport v1 creates no `RuntimeGraphObservationReport` /
  `RuntimeGraphDriftReport`.** It reads a raw handoff event log directly,
  not a generalized runtime graph, and detects no drift.
- **HandoffCoverageReport v1 creates no `WorkOrder` / `VerificationPlan`.**
- **HandoffCoverageReport v1 includes no intent implementation.**

`RuntimeGraphObservationReport` remains the next runtime layer after
coverage; `RuntimeGraphDriftReport` and intent integration remain
deferred.

## Cross-References

- [HandoffCoverageReport artifact](../artifacts/handoff-coverage-report.md)
- [HandoffCoverageReport v1 decision](../strategy/handoff-coverage-report-v1-decision.md)
- [Handoff contract concept](handoff-contract.md)
- [HandoffContract artifact](../artifacts/handoff-contract.md)
- [Classic step-capability / handoff / runtime drift parity audit](../strategy/classic-step-capability-handoff-runtime-drift-parity-audit.md)
- [Roadmap](../strategy/roadmap.md)
- [Classic behavior roadmap](../strategy/classic-behavior-roadmap.md)

> See also: [HandoffCoverageReport safety review](../strategy/handoff-coverage-report-safety-review.md) — declares HandoffCoverageReport v1 safe / stable as narrow handoff-event coverage (not VerificationRun command success): missing log → not-evaluated, present-no-match → uncovered, unmatched observed → added-observed, invalid lines → parseErrors (non-fatal); no RuntimeGraphObservationReport / RuntimeGraphDriftReport / WorkOrder / VerificationPlan / intent in v1. Next: RuntimeGraphObservationReport architecture / v1 decision.
