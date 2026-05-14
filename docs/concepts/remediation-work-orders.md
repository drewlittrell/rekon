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
```

`--limit` defaults to 5 when omitted. `--priority` accepts `p0`,
`p1`, or `p2`. `--finding` matches `findingId` exactly.

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

When no work is selected:

```json
{
  "artifacts": [],
  "selectedItems": [],
  "message": "No active remediation items in latest CoherencyDelta."
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

## Cross-References

- [WorkOrder artifact](../artifacts/work-order.md)
- [VerificationPlan artifact](../artifacts/verification-plan.md)
- [CoherencyDelta concept](coherency-delta.md)
- [Finding lifecycle concept](finding-lifecycle.md)
- [Resolvers](resolvers.md)
- [Capability model](../strategy/capability-model.md)
- [Classic behavior distillation](../strategy/classic-behavior-distillation.md)
- [Classic behavior roadmap](../strategy/classic-behavior-roadmap.md)
