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
