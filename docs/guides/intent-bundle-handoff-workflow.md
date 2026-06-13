# Intent Bundle Handoff Workflow

Intent bundles package approved intent work into reviewable files for humans,
coding agents, and optional downstream execution adapters.

The reading order is guidance, not automation. It helps readers separate
orientation, context, source authority, verification authority, and adapter
projections.

## Recommended Reading Order

| Consumer | Recommended files |
| --- | --- |
| Human reviewer | `README.md`, `context/task-context.md`, `verification-plan.md` |
| Coding agent | `agent/instructions.md`, `agent/handoff.md`, `agent/context.json` |
| Context-aware agent | `context/task-context.agent.json` |
| Verification reviewer | `agent/verification.json`, `verification-plan.md` |
| Adapter integration | adapter-specific projection files, when present |

## Authority Surfaces

| Surface | Role |
| --- | --- |
| `README.md` | orientation |
| `TaskContextReport` sidecars | optional context |
| `WorkOrder` | work scope |
| `VerificationPlan` | verification scope |
| `agent/source-refs.json` | source references |
| `agent/verification.json` | verification posture |
| adapter projections | integration-specific handoff data |

The reading order moves no authority. Task context remains context. Work orders
and verification plans remain the authoritative work and verification surfaces.
Adapter projections are integration data, not proof of execution.

## Boundaries

- The bundle does not execute commands.
- The bundle does not write source.
- Verification command strings are candidate instructions until execution is
  recorded.
- Adapter projections are optional and downstream-specific.
- Generated guidance is not canonical repository truth.
