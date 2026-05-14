# Reconciliation Plans

A reconciliation plan is the artifact that records what reconciliation
would (or did) do. Rekon supports two flavors:

- **Manual plans.** Operator-driven: `rekon reconcile --operation
  docs_regeneration` writes a plan listing the requested operations.
  The actuator denies anything that is not artifact-only.
- **Suggestion plans.** Governance-driven: `rekon reconcile suggest`
  reads the latest remediation `WorkOrder` (or `CoherencyDelta`
  remediation queue when no work order exists) and classifies every
  remediation item into a `ReconciliationPlanOperation` with a class,
  status, and required permissions.

In both cases, the plan is an artifact, not an action. Source-write
and command operations are **never** applied in this alpha.

This is the alpha "lite" form of classic `PlanHandler` /
`PlanExecutorService`. The deterministic-first discipline is
preserved; the auto-apply path is not. See
[../strategy/classic-behavior-distillation.md](../strategy/classic-behavior-distillation.md)
("Reconciliation And Source Writes") and
[../strategy/classic-wins.md](../strategy/classic-wins.md)
("Deterministic-First Reconciliation Stays Honest").

## Why Suggestion Plans Exist

Before this batch, reconciliation could only be invoked with an
operator-provided operation list. That works, but it leaves the
governance signal stranded: `CoherencyDelta.remediationQueue` tells
us *what* should happen, and the remediation `WorkOrder` tells us
*which subset of it the operator wants to act on*, but nothing turned
those into a concrete plan that names the operation class and
permission gate.

Suggestion plans close the loop:

- the source is the artifact lineage, not console output;
- every operation carries a `class` so reviewers can see at a glance
  what is artifact-only vs source-write-deferred vs command-deferred
  vs manual-review;
- `requiresPermission` names the permissions that will be needed when
  a future apply path becomes available;
- `manual_review` is a real, first-class operation for items the
  classifier could not categorize automatically.

The plan never auto-applies anything outside `artifact-only`.

## How It Is Built

`rekon reconcile suggest` invokes the
`@rekon/capability-reconcile.actuator` in suggestion mode. The
actuator:

1. Reads the latest `WorkOrder` with `source === "coherency-delta"`
   if one exists.
2. Falls back to the latest `CoherencyDelta` otherwise.
3. Builds a list of `RemediationItemLike` entries from
   `workOrder.remediationItems` (preferred) or
   `coherencyDelta.remediationQueue`.
4. Applies CLI filters (`--finding`, `--priority`, `--limit`).
5. Classifies each item via
   `suggestReconciliationOperations(input)`. Classification is a
   pure function over `title` + `action`.
6. Applies dry-run defaults: artifact-only operations are `planned`
   unless `--apply` is provided; everything else is `deferred`.
7. Writes one `ReconciliationPlan`, one `ReconciliationLog`, and one
   `ActionLog`, all citing the inputs in `header.inputRefs`.

If no `WorkOrder` and no `CoherencyDelta` exist, the plan is empty
but still written (so freshness/index integrity stays consistent).

## Operation Classes

| Class | Meaning | Apply Behavior |
| --- | --- | --- |
| `artifact-only` | Operations that only touch `.rekon/` artifacts (docs regeneration, finding ledger writes). | Apply with `--apply` (existing alpha behavior). |
| `deterministic-deferred` | Reserved for future deterministic non-source operations. | Always deferred in this alpha. |
| `source-write-deferred` | Would modify repository source files. | Always deferred; requires future `write:source` grant. |
| `command-deferred` | Would execute shell commands (tests, verifiers). | Always deferred; requires future `execute:commands` grant. |
| `manual-review` | The classifier could not infer a deterministic operation. | Always deferred; record context and act manually. |

`--apply` does not promote any of the deferred classes to `applied`.
That requires an explicit permission/execution model that is not in
scope for this alpha.

## CLI Surface

```sh
rekon reconcile suggest --root <repo> --json
rekon reconcile suggest --root <repo> --priority p0 --limit 3 --json
rekon reconcile suggest --root <repo> --finding <finding-id> --json
rekon reconcile suggest --root <repo> --apply --json   # only artifact-only ops apply
```

Output shape:

```json
{
  "artifacts": [
    { "type": "ReconciliationPlan", "id": "...", "path": "..." },
    { "type": "ReconciliationLog", "id": "...", "path": "..." },
    { "type": "ActionLog", "id": "...", "path": "..." }
  ],
  "summary": {
    "total": 3,
    "artifactOnly": 0,
    "sourceWriteDeferred": 3,
    "commandDeferred": 0,
    "manualReview": 0,
    "applied": 0,
    "planned": 0,
    "deferred": 3,
    "denied": 0
  },
  "operations": [
    {
      "operation": "safe_import_rewrite",
      "status": "deferred",
      "class": "source-write-deferred",
      "findingId": "...",
      "priority": "p0",
      "requiresPermission": ["write:source"]
    }
  ]
}
```

The legacy `rekon reconcile --operation docs_regeneration [--apply]`
command keeps its existing behavior: artifact-only operations only,
with denial on non-artifact-only operations.

## Anti-Apply Stance

This batch deliberately does not enable source writes. Two reasons:

1. Source writes need a permission model that this alpha doesn't yet
   have. `write:source` is a manifest permission today but the
   runtime does not enforce it during reconciliation.
2. Even with permission, classic `PlanExecutorService` discipline
   demands per-operation verification (post-apply tests, gate
   re-evaluation, evidence capture). Until that exists, applying
   source rewrites would risk silent regressions.

`manual_review` exists so the classifier never has to fabricate an
operation. If the title/action doesn't match a known pattern, the
plan says so out loud.

## Freshness

`rekon artifacts freshness --type ReconciliationPlan --json` marks a
plan `stale` when a newer `CoherencyDelta` or `WorkOrder` is indexed.
Rebuild with `rekon reconcile suggest`.

## What This Is Not

- Not source modification. The actuator does not write code.
- Not auto-apply. Deferred operations stay deferred regardless of
  `--apply`.
- Not a full classic `PlanExecutorService` port.
- Not a verification runner. `verification_command_run` is deferred;
  a future `VerificationResult` artifact and recorder capability will
  record outcomes.
- Not a reconciliation marketplace. Operation classes are fixed in
  this alpha.

## Cross-References

- [ReconciliationPlan artifact](../artifacts/reconciliation-plan.md)
- [ReconciliationLog artifact](../artifacts/reconciliation-log.md)
- [Remediation work orders concept](remediation-work-orders.md)
- [CoherencyDelta concept](coherency-delta.md)
- [Capability model](../strategy/capability-model.md)
- [Classic behavior distillation](../strategy/classic-behavior-distillation.md)
- [Classic behavior roadmap](../strategy/classic-behavior-roadmap.md)
