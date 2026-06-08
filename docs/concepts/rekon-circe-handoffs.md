# Rekon-to-Circe Handoffs

Rekon prepares grounded intent-plan bundles. Circe consumes the Circe projection,
orchestrates actors, verifies work, commits changes, and handles continuation.

Rekon remains standalone. It does not import Circe code, shell out to Circe, run
workers, execute verification commands, commit, push, or repair invalid plans.

## Targets

`rekon intent bundle write` is target-aware:

- `--target generic` writes the generic Rekon bundle only.
- `--target circe` writes the generic Rekon bundle plus the Circe projection.

Omitting `--target` currently keeps the compatibility behavior and emits the
Circe projection.

## Generic Bundle

The generic bundle stays Rekon-owned and Circe-neutral:

```text
.rekon/intent/plans/<intent-id>/
  manifest.json
  README.md
  prepared-plan.md
  work-order.md
  verification-plan.md
  status.md
  agent/
    handoff.md
    context.json
    instructions.md
    constraints.md
    verification.json
    source-refs.json
```

Generic `agent/instructions.md` does not carry Circe actor-output contracts.

## Circe Projection

The Circe target adds a Circe-specific projection:

```text
.rekon/intent/plans/<intent-id>/circe/
  handoff.json
  phase-plan.json
  rekon-proof.json
  work-orders/
  verification-plans/
  actor-contracts/
    implementer.md
    reviewer.md
    planner-verifier.md
    implementation-handoff.schema.json
    review-verdict.schema.json
    planner-decision.schema.json
```

`handoff.json` links the actor contracts relative to the `circe/` directory:

```json
{
  "actorContracts": {
    "implementer": {
      "path": "actor-contracts/implementer.md",
      "schemaPath": "actor-contracts/implementation-handoff.schema.json",
      "outputContract": "implementation_handoff"
    },
    "reviewer": {
      "path": "actor-contracts/reviewer.md",
      "schemaPath": "actor-contracts/review-verdict.schema.json",
      "outputContract": "review_verdict"
    },
    "plannerVerifier": {
      "path": "actor-contracts/planner-verifier.md",
      "schemaPath": "actor-contracts/planner-decision.schema.json",
      "outputContract": "planner_decision"
    }
  }
}
```

Circe reads these files when present. Older handoffs continue to work because
Circe falls back to built-in actor contracts.

### Operator Command Boundary

Circe-target actor contracts include an Operator Command Boundary. Worker
verification commands should be executable repo-local checks, such as
`npm run typecheck`, `npm run agents:generate`, or `npm test`.

Circe cockpit/admin/report commands, such as `circe handoffs show`,
`circe phase report`, `circe handoffs trace`, `circe admin attention`, and
`circe workers status`, are operator inspection commands. They belong after or
outside actor execution. If a plan asks a worker to run them as implementation
verification, the worker should report a plan-quality concern.

This guidance is target-specific. Generic Rekon bundles remain Circe-neutral and
do not include Circe cockpit commands.

## Operator Flow

```bash
rekon intent bundle write \
  --root . \
  --intent-id <intent-id> \
  --target circe \
  --assessment IntentAssessmentReport:<assessment-id> \
  --prepared-plan PreparedIntentPlan:<prepared-plan-id> \
  --intent-status IntentStatusReport:<status-id> \
  --work-order WorkOrder:<work-order-id> \
  --verification-plan VerificationPlan:<verification-plan-id> \
  --json

circe rekon-handoff validate \
  --handoff .rekon/intent/plans/<intent-id>/circe/handoff.json \
  --workflow WORKFLOW.md \
  --json

circe rekon-handoff routes \
  --handoff .rekon/intent/plans/<intent-id>/circe/handoff.json \
  --workflow WORKFLOW.md \
  --json

circe import rekon-handoff \
  --handoff .rekon/intent/plans/<intent-id>/circe/handoff.json \
  --json
```

## Boundaries

- Rekon emits Markdown and JSON artifacts matching the published Circe handoff
  contract.
- Rekon does not depend on Circe packages or require Circe to be installed.
- Rekon does not choose the best harness automatically.
- Circe owns actor execution, source-change policy, verification execution,
  commits, push, CI, continuation, reports, and traces.
- Actor contracts are guidance/output contracts for Circe actors, not generic
  Rekon agent instructions.

> Update (slice 190 · TaskContextReport Bundle Handoff Dogfood — rebased on 4cc34b73 Circe actor contracts): the promoted handoff guidance was re-dogfooded from both the human-operator and the agent perspective against the current bundle producer after `4cc34b73` ("feat: emit target-specific Circe actor contracts"). A human can discover task context from `README.md`; `context/task-context.md` + `context/task-context.refs.json` were useful; an agent can discover it from `agent/instructions.md` + `agent/handoff.md`; `agent/context.json` `taskContext` metadata + `context/task-context.agent.json` were useful; `agent/verification.json` stayed authoritative for verification posture and `agent/source-refs.json` for source refs. The Circe handoff trio stayed stable and independent of TaskContextReport — `circe/handoff.json` now carries an additive `actorContracts` block. The new `circe/actor-contracts/` artifacts (3 contract Markdown + 3 JSON Schema, default `circe` target) were present and non-executing (return-shape guidance/artifacts, not executed workers) and identical in the without-context bundle. WorkOrder / VerificationPlan + phase gates remained authoritative; source + plan unchanged; no commands executed; no VerificationRun/VerificationResult; Rekon did not run Circe; intent:go remains deferred; the without-context bundle omitted every task-context surface. No fix needed. Next: TaskContextReport Bundle Handoff Dogfood Safety Review. See [`task-context-report-bundle-handoff-dogfood.md`](../strategy/task-context-report-bundle-handoff-dogfood.md).

> Update (slice 191 · TaskContextReport Bundle Handoff Dogfood Safety Review): the shipped slice-190 handoff dogfood (`c5acc07`) — including the `circe/actor-contracts` surface and the new Circe Operator Command Boundary added in `11a209fd` — was reviewed end-to-end and declared **safe/stable** before broader handoff workflow use. Strategy/safety-review batch; no runtime/API/CLI/agent-file-rendering/actor-contract-generation/operator-boundary-generation/Circe-schema/gate change. TaskContextReport sidecars are optional context, not proof; the full handoff dogfood path completed successfully; the human + agent task-context surfaces stay discoverable and non-authoritative; `agent/verification.json` + `agent/source-refs.json` stay authoritative; the Circe handoff JSON stays stable and independent of TaskContextReport; Circe actor-contract artifacts were present and non-executing (guidance/artifacts, not executed workers); the new Operator Command Boundary is operator-only inspection guidance, not worker execution guidance — it reinforces that Rekon does not run Circe and treats worker requests to run Circe operator commands as plan-quality concerns; WorkOrder / VerificationPlan + phase gates remain authoritative; source + plan unchanged; no commands executed; no VerificationRun/VerificationResult; Rekon did not run Circe; intent:go remains deferred; the without-context bundle stayed clean. Next: TaskContextReport Bundle Handoff Broader Workflow Decision (alternative: Handoff UX Fix). See [`task-context-report-bundle-handoff-dogfood-safety-review.md`](../strategy/task-context-report-bundle-handoff-dogfood-safety-review.md).
