# Remediation Work Orders

A remediation work order is a `WorkOrder` artifact generated from a
`CoherencyDelta` remediation queue. It tells humans and agents
*"this is the next governance work, here are the guardrails"*, but it
does not apply any changes.

This is the alpha "lite" form of classic
`IntentPreparationService` / `PlanHandler` / `PlanExecutorService`,
without the auto-apply machinery. See
[../strategy/classic-behavior-distillation.md](../strategy/classic-behavior-distillation.md)
("Intent Preparation And Anti-Gaming") and
[../strategy/classic-wins.md](../strategy/classic-wins.md) ("Intent
Preparation Curbs Agent Sloppiness").

## Why It Exists

Before this batch, the only path from `CoherencyDelta` to an actionable
work order was manual: an operator would read the architecture summary,
pick a finding, and craft an intent by hand. That works, but it
loses the classic discipline: structured objective, scope, required
checks, and explicit anti-gaming instructions.

Remediation work orders make that discipline reproducible:

- the goal is fixed ("resolve active coherency findings");
- scope is derived from the selected `CoherencyRemediationStep`s;
- required checks include validate/freshness commands that prove the
  governance state really changed;
- success criteria require real implementation, not gate-gaming;
- the guardrail names the most common gaming patterns explicitly.

## How It Is Built

`rekon intent remediation` invokes the
`@rekon/capability-intent.remediation-work-order` actuator inside
`@rekon/capability-intent`. The actuator:

1. Reads the latest `CoherencyDelta` (required).
2. Reads the latest `FindingLifecycleReport` if available.
3. Reads the latest `ResolverPacket` if available, for cross-reference.
4. Filters `remediationQueue` by optional `--finding`, `--priority`,
   and `--limit` flags. Default limit is 5; only active items are
   considered (accepted/ignored/resolved are excluded by definition).
5. Writes one `IntentMap`, one `WorkOrder`, and one
   `VerificationPlan`. All three cite the `CoherencyDelta` in
   `header.inputRefs`.

If no active remediation items remain, the actuator writes no
artifacts and the CLI returns
`{ artifacts: [], selectedItems: [], message: "..." }`.

## What Is In The Work Order

Structured fields:

- `goal`
- `paths` — union of files from the selected remediation items.
- `ownerSystems` — union of systems from the selected remediation items.
- `riskNotes` — P0 caution, cross-system seam reminders, lifecycle
  filtering note.
- `requiredChecks` — typecheck, test, build, artifacts validate,
  artifacts freshness.
- `successCriteria` — addresses real implementation, no gate weakening,
  selected findings no longer active after re-running evaluate ->
  findings lifecycle -> coherency delta.
- `antiGamingInstruction` — strengthened wording naming tests,
  validators, rules, status ledgers, and verification scripts.
- `remediationItems` — the selected list (priority, finding id,
  severity, files, systems, action).
- `markdown` — a rendered human/agent-readable version with a Selected
  Remediation Items table.

The Markdown body always contains, in order:

1. **Source.** Cites the `CoherencyDelta` artifact id (and the
   `FindingLifecycleReport`, when available).
2. **Objective.**
3. **Selected Remediation Items** table (priority, finding, severity,
   systems, files, action).
4. **Scope** (paths + owner systems).
5. **Required Checks.**
6. **Success Criteria.**
7. **Guardrails** (the anti-gaming instruction) plus **Risk Notes**
   when relevant.
8. **Follow-up Evidence** — re-run evaluate, findings lifecycle,
   coherency delta, publish architecture.

## CLI Surface

```sh
rekon intent remediation --root <repo> --json
rekon intent remediation --root <repo> --priority p0 --limit 3 --json
rekon intent remediation --root <repo> --finding <finding-id> --json
rekon intent remediation --root <repo> --skip-verified --json
```

`--limit` defaults to 5 when omitted. `--priority` accepts `p0`,
`p1`, or `p2`. `--finding` matches `findingId` exactly.
`--skip-verified` excludes remediation items whose associated
`WorkOrder` -> `VerificationPlan` -> `VerificationResult` chain has a
`passed` status. Findings with `failed`, `partial`, `not-run`, or
`missing` verification remain selected. The CLI builds the skip list
by calling `lookupVerificationEvidence` for each candidate `findingId`
before dispatching the actuator and reports excluded items via
`skippedVerified`. `--skip-verified` is opt-in and never default.

Output shape:

```json
{
  "artifacts": [
    { "type": "IntentMap", "id": "...", "path": "..." },
    { "type": "WorkOrder", "id": "...", "path": "..." },
    { "type": "VerificationPlan", "id": "...", "path": "..." }
  ],
  "selectedItems": [
    {
      "findingId": "...",
      "priority": "p0",
      "severity": "high",
      "files": ["..."],
      "systems": ["..."],
      "title": "...",
      "action": "..."
    }
  ]
}
```

With `--skip-verified` the response also includes a `skippedVerified`
list naming each excluded finding plus the `VerificationResult` that
backs the skip:

```json
{
  "artifacts": [...],
  "selectedItems": [...],
  "skippedVerified": [
    {
      "findingId": "...",
      "status": "passed",
      "verificationResultRef": { "type": "VerificationResult", "id": "...", "schemaVersion": "0.1.0" }
    }
  ]
}
```

When no work is selected:

```json
{
  "artifacts": [],
  "selectedItems": [],
  "message": "No active remediation items in latest CoherencyDelta."
}
```

When `--skip-verified` skips everything:

```json
{
  "artifacts": [],
  "selectedItems": [],
  "skippedVerified": [...],
  "message": "No active remediation items remain after skipping verified items."
}
```

## Active Versus Inactive

The actuator never selects `accepted`, `ignored`, or `resolved`
findings. Those statuses live on `CoherencyDelta.items` but never
appear in `CoherencyDelta.remediationQueue`. Operators who want to
revisit a previously accepted finding must change its ledger entry
first.

## Anti-Gaming

Verification gates are not implementation targets. The work order's
`antiGamingInstruction` calls out the most common gaming patterns:

> Do not modify tests, artifact validators, rules, findings, status
> ledgers, or verification scripts merely to make this work order
> appear complete. Verification gates exist to prove real
> implementation correctness; if a gate is wrong, record that as a
> finding or follow-up instead of gaming it.

This is the substantive Rekon-native distillation of classic
`IntentPreparationService` anti-gaming instructions.

## Freshness

`rekon artifacts freshness --type WorkOrder --json` marks a remediation
work order `stale` when a newer `CoherencyDelta` or
`FindingLifecycleReport` is indexed. Rebuild with
`rekon intent remediation`.

## What This Is Not

- Not source modification. The actuator does not write code.
- Not reconciliation auto-apply. The work order names what to do; it
  does not do it.
- Not a phase parser. There is no phase artifact renderer, no
  semantic triage, no elicitation state.
- Not a full classic `IntentPreparationService` port. The classic
  service captures actionability questions, gate quality review, and
  parallel work-unit scheduling. The Rekon-native form keeps the
  hard-won discipline (objective, scope, checks, guardrails) and
  defers the rest.
- Not a watcher or scheduler. CLI/runtime only.

## Consumed By

- [Reconciliation suggestion plans](reconciliation-plans.md) read the
  latest remediation work order (where `source === "coherency-delta"`)
  to derive a classified set of reconciliation operations. Source-
  write and command operations remain deferred; the work order is the
  decision record, the suggestion plan is the operational mapping.
- [Verification results](verification-results.md) cite the work order
  when recording operator-supplied outcomes for the paired
  `VerificationPlan`. Rekon does not execute the commands; the
  result is the proof artifact that closes the governance loop.
- The [architecture summary publication](../artifacts/architecture-summary-publication.md)
  surfaces the latest remediation and resolver work orders in its
  Work Orders section, citing both kinds in `header.inputRefs`.

## Cross-References

- [WorkOrder artifact](../artifacts/work-order.md)
- [VerificationPlan artifact](../artifacts/verification-plan.md)
- [VerificationResult artifact](../artifacts/verification-result.md)
- [Verification results concept](verification-results.md)
- [Reconciliation plans concept](reconciliation-plans.md)
- [CoherencyDelta concept](coherency-delta.md)
- [Finding lifecycle concept](finding-lifecycle.md)
- [Resolvers](resolvers.md)
- [Capability model](../strategy/capability-model.md)
- [Capability lint → finding bridge decision](../strategy/capability-lint-finding-bridge-decision.md)
  — forty-second slice; the `CapabilityLintFindingBridgeReport` preview
  artifact creates **no** `WorkOrder` and **no** `VerificationPlan`.
  Remediation work orders remain downstream of governed findings and
  `CoherencyDelta`, never of capability lint evaluation.
- [CapabilityLintFindingBridgeReport artifact](../artifacts/capability-lint-finding-bridge-report.md)
  — forty-third slice; the preview bridge report shipped.
  **WorkOrder / VerificationPlan creation is not included** — the bridge
  creates no `WorkOrder` and no `VerificationPlan` and writes no
  `FindingReport`. Remediation work orders stay downstream of governed
  findings.
- [CapabilityLintFindingBridgeReport safety review](../strategy/capability-lint-finding-bridge-report-safety-review.md)
  — forty-fourth slice; read-only review confirming the bridge creates
  no `WorkOrder` and no `VerificationPlan`, and declaring it safe /
  stable.
- [CapabilityLintFindingBridgeReport → FindingReport writer decision](../strategy/capability-lint-finding-writer-decision.md)
  — forty-seventh slice; selects Option B (a future, opt-in
  `FindingReport` writer with dry-run preview + explicit confirmation;
  not implemented). **`WorkOrder` and `VerificationPlan` creation remain
  downstream and are not part of the writer.** Remediation work orders
  stay downstream of governed findings and `CoherencyDelta`, never of
  the bridge or its writer. The writer's **dry-run helper / CLI** has
  shipped (forty-eighth slice, preview only): it previews the proposed
  `FindingReport` body and creates no `WorkOrder` / `VerificationPlan`;
  write mode is deferred. The dry-run **safety review** (forty-ninth
  slice) declared it **safe / stable as preview-only writer
  modeling**; remediation work orders stay downstream and are not
  created by the dry-run. The **writer mode decision** (fiftieth
  slice) selected an opt-in write mode behind
  `--confirm-finding-write` (now **shipped** in the fifty-first
  slice as the writer implementation); it creates no `WorkOrder` /
  `VerificationPlan`. The **writer safety review** (fifty-second
  slice) confirmed the writer **safe / stable as a controlled,
  opt-in writer**; remediation work orders remain downstream. The
  **bridge-derived findings publication decision** (fifty-third
  slice) then selected **Option B** — surface the written
  bridge-derived `FindingReport` entries in the architecture summary
  and agent operating contract first; that surfacing creates no
  `WorkOrder` / `VerificationPlan`, and remediation work orders
  remain downstream. See
  [bridge-derived findings publication decision](../strategy/bridge-derived-findings-publication-decision.md). The surfacing
implementation shipped in the fifty-fourth slice (read-only, in the
architecture summary + agent contract); it creates no `WorkOrder` /
`VerificationPlan` and remediation work orders remain downstream. The surfacing was safety-reviewed safe / stable as read-only visibility in the fifty-fifth slice. The lifecycle / CoherencyDelta integration decision (fifty-sixth slice) then selected a BridgeFindingLifecycleIntegrationReport preview artifact first; lifecycle / adjudication / CoherencyDelta mutation remain deferred to later safety-reviewed slices. The preview artifact `BridgeFindingLifecycleIntegrationReport` then shipped in the fifty-seventh slice (read-only; `rekon capability lint lifecycle-preview`); see [its artifact reference](../artifacts/bridge-finding-lifecycle-integration-report.md). It was safety-reviewed safe / stable in the fifty-eighth slice (no blocker).
- [Classic behavior distillation](../strategy/classic-behavior-distillation.md)
- [Classic behavior roadmap](../strategy/classic-behavior-roadmap.md)

> See also: [Classic step-capability / handoff / runtime drift parity audit](../strategy/classic-step-capability-handoff-runtime-drift-parity-audit.md) — reserves StepCapabilityGraph / HandoffContract / HandoffCoverageReport / RuntimeGraphObservationReport / RuntimeGraphDriftReport as future surfaces not yet modeled by Rekon.

> See also: [StepCapabilityGraph / HandoffContract architecture decision](../strategy/step-capability-handoff-architecture-decision.md) — selects a staged step/handoff/runtime graph spine (StepCapabilityGraph → HandoffContract → HandoffCoverageReport → RuntimeGraphObservationReport → RuntimeGraphDriftReport).

> See also: [StepCapabilityGraph artifact](../artifacts/step-capability-graph.md) — the first artifact in the staged step/handoff/runtime graph spine: an expected workflow topology graph projected from EvidenceGraph + CapabilityMap v2 + CapabilityPhraseReport (+ optional grouping/labeling config). Not CapabilityMap v2; no runtime coverage / drift.

> See also: [StepCapabilityGraph safety review](../strategy/step-capability-graph-safety-review.md) — declares StepCapabilityGraph v1 safe / stable as expected workflow topology (not CapabilityMap v2, not runtime truth; no handoff coverage / drift / HandoffContract / WorkOrder / VerificationPlan / intent).

> See also: [HandoffContract v1 decision](../strategy/handoff-contract-v1-decision.md) — the next spine layer: declares expected baton passes over StepCapabilityGraph step ids as a config + artifact effective contract (no handoff coverage / runtime events / drift in v1).

> See also: [HandoffContract artifact](../artifacts/handoff-contract.md) — the declared baton policy layer over StepCapabilityGraph step ids (config + artifact effective contract; declared / unresolved-step only; no handoff coverage / runtime events / drift in v1).

> See also: [HandoffContract safety review](../strategy/handoff-contract-safety-review.md) — declares HandoffContract v1 safe / stable as declared baton policy (not StepCapabilityGraph topology; no handoff coverage / runtime events / drift / WorkOrder / VerificationPlan / intent).

> See also: [HandoffCoverageReport v1 decision](../strategy/handoff-coverage-report-v1-decision.md) — the next spine layer: compares declared HandoffContract handoffs against an optional raw handoff event log (.rekon/handoff-events.jsonl); handoff-event coverage, not VerificationRun command success; no runtime graph observation / drift in v1.

> See also: [HandoffCoverageReport artifact](../artifacts/handoff-coverage-report.md) — handoff-event coverage over declared HandoffContract handoffs vs an optional raw handoff event log (.rekon/handoff-events.jsonl): missing log → not-evaluated, present-no-match → uncovered, unmatched observed → added-observed, invalid lines → parseErrors (non-fatal). Handoff-event coverage, not VerificationRun command success; no RuntimeGraphObservationReport / RuntimeGraphDriftReport / WorkOrder / VerificationPlan / intent in v1. See the [handoff coverage concept](handoff-coverage.md).

> See also: [HandoffCoverageReport safety review](../strategy/handoff-coverage-report-safety-review.md) — declares HandoffCoverageReport v1 safe / stable as narrow handoff-event coverage (not VerificationRun command success): missing log → not-evaluated, present-no-match → uncovered, unmatched observed → added-observed, invalid lines → parseErrors (non-fatal); no RuntimeGraphObservationReport / RuntimeGraphDriftReport / WorkOrder / VerificationPlan / intent in v1. Next: RuntimeGraphObservationReport architecture / v1 decision.

> See also: [RuntimeGraphObservationReport v1 decision](../strategy/runtime-graph-observation-report-v1-decision.md) — the next spine layer: an observed runtime graph generated from raw handoff_event logs (.rekon/handoff-events.jsonl). Observed runtime graph, not declared topology; not HandoffCoverageReport; does not evaluate declared coverage, detect drift, or create WorkOrder / VerificationPlan; intent deferred. RuntimeGraphDriftReport remains the next layer after observation.

> See also: [RuntimeGraphObservationReport artifact](../artifacts/runtime-graph-observation-report.md) — observed runtime graph generated from raw handoff_event logs (.rekon/handoff-events.jsonl): observed step/feature/event/source nodes + handoff/emitted-by edges with observedCount + line evidence; non-handoff rows → ignoredRows, invalid lines → parseErrors, missing log → zero nodes/edges. Observed runtime graph, not declared topology; not HandoffCoverageReport; no coverage evaluation / drift / WorkOrder / VerificationPlan / intent. RuntimeGraphDriftReport remains the next layer. See the [runtime graph observation concept](runtime-graph-observation.md).

> See also: [RuntimeGraphObservationReport safety review](../strategy/runtime-graph-observation-report-safety-review.md) — declares RuntimeGraphObservationReport v1 safe / stable as observed runtime graph: observed step/feature/event/source nodes + handoff/emitted-by edges aggregated from raw handoff_event logs; non-handoff rows → ignoredRows, invalid lines → parseErrors, missing log → zero. Observed runtime graph, not declared topology; not HandoffCoverageReport; no coverage evaluation / drift / WorkOrder / VerificationPlan / intent. Next: RuntimeGraphDriftReport architecture / v1 decision.

> See also: [RuntimeGraphDriftReport v1 decision](../strategy/runtime-graph-drift-report-v1-decision.md) — the next spine layer (final classic-parity drift): compares StepCapabilityGraph / HandoffContract / HandoffCoverageReport / RuntimeGraphObservationReport for expected-vs-observed runtime graph drift. Expected-vs-observed runtime graph drift, not runtime observation; not HandoffCoverageReport; not PathFreshnessReport or artifact lineage freshness; does not read raw handoff event logs directly; no WorkOrder / VerificationPlan; intent deferred.

> See also: [RuntimeGraphDriftReport artifact](../artifacts/runtime-graph-drift-report.md) — the final spine layer: expected-vs-observed runtime graph drift over StepCapabilityGraph / HandoffContract / HandoffCoverageReport / RuntimeGraphObservationReport. Drift rows in-sync / missing-expected / added-observed / uncovered-handoff / unresolved-contract / observation-missing / not-evaluated (severity-bucketed). Not runtime observation; not HandoffCoverageReport; not PathFreshnessReport or artifact lineage freshness; does not read raw handoff event logs directly; no WorkOrder / VerificationPlan; intent deferred. See the [runtime graph drift concept](runtime-graph-drift.md).
