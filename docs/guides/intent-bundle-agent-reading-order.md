# Intent Bundle Agent Reading Order

This guide is for agents consuming an intent bundle.

Read in this order:

1. `agent/instructions.md`
2. `agent/handoff.md`
3. `agent/context.json`
4. `context/task-context.agent.json`, when present
5. `agent/source-refs.json`
6. `agent/verification.json`
7. `WorkOrder` and `VerificationPlan`
8. Adapter-specific projection files, only when the task explicitly uses that
   integration

## How To Treat Each Surface

- Task context is useful context, not proof or approval.
- Source refs are the source boundary.
- Verification posture describes expected checks; it is not evidence that
  checks have run.
- Work orders and verification plans define scope and proof obligations.
- Adapter projections are handoff data for another system.

Do not treat reading-order guidance as permission to execute commands, write
source outside scope, or approve a plan.
