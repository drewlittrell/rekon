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

> Update (slice 192 · TaskContextReport Bundle Handoff Broader Workflow Decision): decided how broader operator/agent handoff workflows should use the bundle surfaces — **Option B, an explicit reading-order policy** — rebased onto `e91dc087` ("feat: classify phase source-change intent") to include the new per-phase source-change posture. Decision-only; no runtime/API/CLI/bundle/Circe-schema/gate change. Humans inspect `README.md` first, then `context/task-context.md` when present; agents inspect `agent/instructions.md` first, then `agent/handoff.md`, then `agent/context.json`, then `context/task-context.agent.json` when present. Four handoff layers: operator orientation; agent structured handoff; source/verification authority (WorkOrder, VerificationPlan, **phase source-change posture**, `agent/source-refs.json`, `agent/verification.json`); Circe contract layer. TaskContextReport sidecars are optional context, not proof; phase source-change posture belongs to the authoritative source/verification layer, not the task-context layer — it is handoff evidence, not approval, and TaskContextReport sidecars must not override `sourceChange` posture; WorkOrder/VerificationPlan + phase gates + agent verification + source refs remain authoritative; Circe handoff JSON remains the machine handoff contract; actor contracts are role/return-shape guidance, not executed workers; the Operator Command Boundary stays operator-only; verification hints stay hints; do-not-touch stays guidance; intent:go deferred. First implementation: Intent Bundle Handoff Reading Order Implementation. See [`task-context-report-bundle-handoff-broader-workflow-decision.md`](../strategy/task-context-report-bundle-handoff-broader-workflow-decision.md).

> Update (slice 193 · Intent Bundle Handoff Reading Order Implementation): the intent plan bundle now promotes the handoff reading order directly in its surfaces — a "## Handoff reading order" section in `README.md` (human + agent lists), a "## Reading order" section in `agent/instructions.md` and `agent/handoff.md`, and an additive `handoffReadingOrder` metadata block in `agent/context.json`. Always rendered; task-context entries say "if present". Guidance only — no Circe handoff schema, actor-contract, source-change-classification, or gate change; TaskContextReport stays optional context, WorkOrder / VerificationPlan stay authoritative, source-change posture stays handoff evidence not approval, intent:go stays deferred. See [`intent-bundle-handoff-reading-order-implementation`](../strategy/intent-bundle-handoff-reading-order-implementation.md).

> Update (slice 194 · Intent Bundle Handoff Reading Order Safety Review): the slice-193 bundle handoff reading order was reviewed end-to-end and declared safe/stable — guidance, not automation. The README / agent-instructions / agent-handoff reading-order sections and the additive `agent/context.json.handoffReadingOrder` metadata (which preserves every existing field) guide humans and agents toward authoritative surfaces while every boundary holds: TaskContextReport sidecars stay optional context (not proof); WorkOrder / VerificationPlan stay authoritative; phase source-change posture stays handoff evidence, not approval; actor contracts stay role/return-shape guidance; the Operator Command Boundary stays operator-only; `circe/*` is byte-unchanged; intent:go deferred. See [`intent-bundle-handoff-reading-order-safety-review`](../strategy/intent-bundle-handoff-reading-order-safety-review.md).

> Update (slice 195 · Intent Bundle Handoff Reading Order Dogfood): the shipped reading order was dogfooded end-to-end from four perspectives (human operator, general agent, task-context-aware agent, Circe-targeted actor) via the full operator path + a without-context comparison. The reading order is practically useful and every boundary held — README / agent-instructions / agent-handoff reading orders and `agent/context.json.handoffReadingOrder` (preserving every existing field) guide humans and agents toward the authoritative surfaces; TaskContextReport stays optional context; WorkOrder / VerificationPlan + `agent/verification.json` + `agent/source-refs.json` stay authoritative; source-change posture stays handoff evidence, not approval; actor contracts stay role/return guidance; the Operator Command Boundary stays operator-only; the without-context bundle stays clean; source + plan unchanged; no commands executed; no VerificationRun/VerificationResult; Rekon did not run Circe; intent:go deferred. See [`intent-bundle-handoff-reading-order-dogfood`](../strategy/intent-bundle-handoff-reading-order-dogfood.md).

> Update (slice 196 · Intent Bundle Handoff Reading Order Dogfood Safety Review): the slice-195 dogfood result was reviewed end-to-end and declared safe/stable — rebased onto `d975d3e` ("keep Circe verification commands executable") so the verification-posture / Circe-projection claims re-ground against the current producer; the 41-assertion dogfood contract test re-ran green. Intent bundle handoff reading order is guidance, not automation. The new `isSafeExecutableVerificationCommand` projection preserves only a bounded safe subset and rejects shell-metacharacter command strings — safe executable verification-command projection is handoff data, not execution: `circe/phase-plan.json` may describe verification commands but Rekon does not execute them, and `circe/rekon-proof.json` keeps commandsExecuted:false. TaskContextReport stays optional context; WorkOrder / VerificationPlan + `agent/verification.json` + `agent/source-refs.json` stay authoritative; source-change posture stays handoff evidence, not approval; actor contracts stay role/return guidance; the Operator Command Boundary stays operator-only; the without-context bundle stays clean; intent:go deferred. See [`intent-bundle-handoff-reading-order-dogfood-safety-review`](../strategy/intent-bundle-handoff-reading-order-dogfood-safety-review.md).

> Update (slice 197 · Intent Bundle Handoff Reading Order Broader Workflow Decision): decided how broader operator/agent workflow docs should treat the final reading order — Option B, a recommended (not required) broader handoff reading-order policy. Intent bundle handoff reading order is guidance, not automation; broader workflows should recommend the handoff reading order, not require it as proof. Humans start at README.md, agents at agent/instructions.md, with `agent/context.json.handoffReadingOrder` as the structured map. TaskContextReport stays optional context; WorkOrder / VerificationPlan + `agent/verification.json` + `agent/source-refs.json` stay authoritative; phase source-change posture stays handoff evidence, not approval; safe executable verification-command projection is handoff data, not execution (`circe/phase-plan.json` may describe verification commands but Rekon does not execute them; `circe/rekon-proof.json` keeps commandsExecuted:false); actor contracts stay role/return guidance; the Operator Command Boundary stays operator-only; intent:go deferred. First implementation: Intent Bundle Handoff Workflow Guide. See [`intent-bundle-handoff-reading-order-broader-workflow-decision`](../strategy/intent-bundle-handoff-reading-order-broader-workflow-decision.md).

> Update (slice 198 · Intent Bundle Handoff Workflow Guide): shipped the slice-197 Option-B product-docs step — two reader guides ([`intent-bundle-handoff-workflow`](../strategy/../guides/intent-bundle-handoff-workflow.md) and the agent reading-order companion) plus an implementation note that teach humans and agents how to consume an intent plan bundle using its handoff reading order. Documentation only. Intent bundle handoff reading order is guidance, not automation; broader workflows should recommend the handoff reading order, not require it as proof. Humans start at README.md, agents at agent/instructions.md, with `agent/context.json.handoffReadingOrder` as the structured map. TaskContextReport stays optional context; WorkOrder / VerificationPlan + `agent/verification.json` + `agent/source-refs.json` stay authoritative; phase source-change posture stays handoff evidence, not approval; safe executable verification-command projection is handoff data, not execution (`circe/phase-plan.json` may describe verification commands but Rekon does not execute them; `circe/rekon-proof.json` keeps commandsExecuted:false); actor contracts stay role/return guidance; the Operator Command Boundary stays operator-only; intent:go deferred. Next: Intent Bundle Handoff Workflow Guide Safety Review. See [`intent-bundle-handoff-workflow-guide`](../strategy/intent-bundle-handoff-workflow-guide.md).

> Update (slice 199 · Intent Bundle Handoff Workflow Guide Safety Review): reviewed the slice-198 workflow guide end-to-end and declared it safe/stable before recommending it as the default broader operator/agent handoff practice. The workflow guide introduces no runtime behavior changes. Intent bundle handoff reading order is guidance, not automation; broader workflows should recommend the handoff reading order, not require it as proof. The human/agent workflow guidance, authority model, safe verification-command projection guidance, and actor-contract / Operator-Command-Boundary guidance all hold; the guides never tell a human or agent to execute commands or write source from the guide. TaskContextReport stays optional context; WorkOrder / VerificationPlan + `agent/verification.json` + `agent/source-refs.json` stay authoritative; phase source-change posture stays handoff evidence, not approval; safe executable verification-command projection is handoff data, not execution (`circe/phase-plan.json` may describe verification commands but Rekon does not execute them; `circe/rekon-proof.json` keeps commandsExecuted:false); actor contracts stay role/return guidance; the Operator Command Boundary stays operator-only; intent:go deferred. Next: Intent Bundle Handoff Workflow Guide Dogfood. See [`intent-bundle-handoff-workflow-guide-safety-review`](../strategy/intent-bundle-handoff-workflow-guide-safety-review.md).
