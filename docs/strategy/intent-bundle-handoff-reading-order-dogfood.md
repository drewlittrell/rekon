# Intent Bundle Handoff Reading Order Dogfood

This memo records a dogfood of the shipped [Intent Bundle Handoff Reading Order
Implementation](intent-bundle-handoff-reading-order-implementation.md) (slice 193) — found
safe/stable by the [Safety Review](intent-bundle-handoff-reading-order-safety-review.md)
(slice 194) — from four perspectives: a human operator reading the bundle, a general agent
consuming it, a task-context-aware agent reading the context sidecars, and a Circe-targeted
actor reading the Circe handoff and actor contracts. The dogfood ran the full public operator
path keyless against the freshly built CLI and inspected every handoff surface. The reading
order is practically useful, every boundary held, and no fix was needed.

## Dogfood Scenario

A fresh `intent-bundle-reading-order-dogfood` fixture (`src/index.ts` with `existing` +
`greet`, `plans/rough.md`) was driven through `scan` → `intent context prepare` →
`capability graph build` → `context task` → `intent assess --task-context-ref` →
`intent plan review --task-context-ref` → `intent plan answer` (answering the actual written
actionability questions) → `intent prepare` → `intent status` → `intent approve` →
`intent status transition --to work-ready` → `intent work-order generate` →
`intent verification-plan generate` → `intent bundle write --task-context-ref` →
`artifacts validate` (`valid: true`). A without-context comparison bundle was written from the
same approved plan to a separate intent id. Source + plan SHAs were unchanged throughout.

## Human Reading Order Review

Reading the bundle as a human operator, the `README.md` "## Handoff reading order" section
opened the bundle with a clear, practical order: read the README first, then
`context/task-context.md` (if present), then `verification-plan.md`, then `work-order.md` /
source refs / agent files, and Circe actor contracts only for a Circe-facing handoff.
`context/task-context.md` remained useful orientation (framed "optional guidance, not
proof"), and `verification-plan.md` remained the verification authority.

## Agent Reading Order Review

Reading the bundle as a general agent, `agent/instructions.md` "## Reading order" ("Read these
before acting:") gave a practical ordered list — `agent/handoff.md`, `agent/context.json`,
`context/task-context.agent.json` when present, `agent/source-refs.json`,
`agent/verification.json`, WorkOrder / VerificationPlan / phase source-change posture, and the
Circe handoff + actor contracts when Circe-targeted — and `agent/handoff.md` "## Reading order"
pointed at the same structured-handoff and authority surfaces while stating gates remain
authoritative.

## Agent Context Metadata Review

`agent/context.json.handoffReadingOrder` carried an ordered `agent` read array plus an
`authority` map; the block helped a programmatic agent order its reads and classify each
surface. Every existing `agent/context.json` field (`intentId`, `goal`, `status`, `scope`,
`capabilities`, `steps`, `phases`, `obligations`, `artifactRefs`) was preserved, and the
authority map distinguished task context (`context-only`) from work/verification authority
(`authoritative-work` / `authoritative-verification`), source-change posture
(`handoff-evidence-not-approval`), and actor contracts (`role-return-guidance-not-execution`).

## Source-Change Posture Review

Phase source-change posture remained in the authority layer: `agent/verification.json.phases[]`
carried a `sourceChange` posture per phase, and the `handoffReadingOrder.authority` map labelled
it `handoff-evidence-not-approval`. The reading order references the posture; it does not move
or weaken it.

## Actor Contract Review

The `circe/actor-contracts/*` files remained role/return-shape guidance — the implementer
contract describes the fields the Circe actor must *return* and carries the Operator Command
Boundary ("operator inspection commands", operator-only). `circe/handoff.json` remained the
machine handoff contract, free of any task-context dependency.

## Without-Context Review

The without-context bundle remained clean and accurate: the reading order still rendered
(phrased "if present"), no `context/` sidecars were created, `agent/context.json` had no
`taskContext` key, and `handoffReadingOrder` metadata was still present. The bundle validated
clean.

## Dogfood Findings

- README.md exposed a useful handoff reading order.
- the human reading order was practical.
- README.md pointed to context/task-context.md only as optional context.
- agent/instructions.md exposed a useful reading order.
- agent/handoff.md exposed a useful reading order.
- agent/context.json.handoffReadingOrder helped agents consume the bundle.
- handoffReadingOrder preserved existing agent/context.json fields.
- handoffReadingOrder distinguished context from authority.
- source-change posture remained in the authority layer.
- TaskContextReport remained optional context.
- WorkOrder / VerificationPlan remained authoritative.
- agent/verification.json remained authoritative.
- agent/source-refs.json remained authoritative.
- actor contracts remained role/return guidance.
- The Operator Command Boundary remained operator-only.
- the without-context bundle remained clean and accurate.
- source and plan files were unchanged.
- no commands were executed.
- no VerificationRun or VerificationResult was created.
- Rekon did not run Circe.
- intent:go remains deferred.

## Recommendation

The reading order is useful enough for broader handoff workflow use. The dogfood confirmed it
guides humans and agents toward the authoritative surfaces without making context, proof,
approval, execution, or source-write authority. Recommended next slice: **Intent Bundle Handoff
Reading Order Dogfood Safety Review** — review this dogfood result before broader handoff
workflow use. Alternative: **Intent Bundle Handoff Reading Order UX Fix**, only if a concrete
wording/discoverability issue surfaces.

## What This Does Not Do

This dogfood changed no bundle architecture, no Circe handoff schema, no actor-contract
implementation, no source-change posture implementation, no WorkOrder / VerificationPlan gate,
and no phase gate. It executed no commands, wrote no source, created no WorkOrder /
VerificationPlan / VerificationRun / VerificationResult, and ran no Circe. intent:go remains
deferred.

> Update (slice 196 · Intent Bundle Handoff Reading Order Dogfood Safety Review): the slice-195 dogfood result was reviewed end-to-end and declared safe/stable — rebased onto `d975d3e` ("keep Circe verification commands executable") so the verification-posture / Circe-projection claims re-ground against the current producer; the 41-assertion dogfood contract test re-ran green. Intent bundle handoff reading order is guidance, not automation. The new `isSafeExecutableVerificationCommand` projection preserves only a bounded safe subset and rejects shell-metacharacter command strings — safe executable verification-command projection is handoff data, not execution: `circe/phase-plan.json` may describe verification commands but Rekon does not execute them, and `circe/rekon-proof.json` keeps commandsExecuted:false. TaskContextReport stays optional context; WorkOrder / VerificationPlan + `agent/verification.json` + `agent/source-refs.json` stay authoritative; source-change posture stays handoff evidence, not approval; actor contracts stay role/return guidance; the Operator Command Boundary stays operator-only; the without-context bundle stays clean; intent:go deferred. See [`intent-bundle-handoff-reading-order-dogfood-safety-review`](intent-bundle-handoff-reading-order-dogfood-safety-review.md).

> Update (slice 197 · Intent Bundle Handoff Reading Order Broader Workflow Decision): decided how broader operator/agent workflow docs should treat the final reading order — Option B, a recommended (not required) broader handoff reading-order policy. Intent bundle handoff reading order is guidance, not automation; broader workflows should recommend the handoff reading order, not require it as proof. Humans start at README.md, agents at agent/instructions.md, with `agent/context.json.handoffReadingOrder` as the structured map. TaskContextReport stays optional context; WorkOrder / VerificationPlan + `agent/verification.json` + `agent/source-refs.json` stay authoritative; phase source-change posture stays handoff evidence, not approval; safe executable verification-command projection is handoff data, not execution (`circe/phase-plan.json` may describe verification commands but Rekon does not execute them; `circe/rekon-proof.json` keeps commandsExecuted:false); actor contracts stay role/return guidance; the Operator Command Boundary stays operator-only; intent:go deferred. First implementation: Intent Bundle Handoff Workflow Guide. See [`intent-bundle-handoff-reading-order-broader-workflow-decision`](intent-bundle-handoff-reading-order-broader-workflow-decision.md).

> Update (slice 198 · Intent Bundle Handoff Workflow Guide): shipped the slice-197 Option-B product-docs step — two reader guides ([`intent-bundle-handoff-workflow`](../guides/intent-bundle-handoff-workflow.md) and the agent reading-order companion) plus an implementation note that teach humans and agents how to consume an intent plan bundle using its handoff reading order. Documentation only. Intent bundle handoff reading order is guidance, not automation; broader workflows should recommend the handoff reading order, not require it as proof. Humans start at README.md, agents at agent/instructions.md, with `agent/context.json.handoffReadingOrder` as the structured map. TaskContextReport stays optional context; WorkOrder / VerificationPlan + `agent/verification.json` + `agent/source-refs.json` stay authoritative; phase source-change posture stays handoff evidence, not approval; safe executable verification-command projection is handoff data, not execution (`circe/phase-plan.json` may describe verification commands but Rekon does not execute them; `circe/rekon-proof.json` keeps commandsExecuted:false); actor contracts stay role/return guidance; the Operator Command Boundary stays operator-only; intent:go deferred. Next: Intent Bundle Handoff Workflow Guide Safety Review. See [`intent-bundle-handoff-workflow-guide`](intent-bundle-handoff-workflow-guide.md).
