# Intent Bundle Handoff Reading Order Dogfood Safety Review

This memo reviews the shipped [Intent Bundle Handoff Reading Order
Dogfood](intent-bundle-handoff-reading-order-dogfood.md) (slice 195) end-to-end and declares
the dogfood result safe and stable before broader handoff workflow use. It is re-grounded
against the current bundle producer at `d975d3e` ("feat/fix: keep Circe verification commands
executable"), which added a safe executable verification-command projection
(`isSafeExecutableVerificationCommand`) to the Circe projection. It is a review only: it
changes no runtime behavior, no reading-order implementation, no safe executable command
projection, no bundle implementation, no Circe handoff schema, no actor contracts, no
source-change posture implementation, and no gate.

## Decision Summary

Intent Bundle Handoff Reading Order Dogfood is safe/stable. Intent bundle handoff reading
order is guidance, not automation. The slice-195 dogfood ran the full public operator path and
proved the reading order is practically useful from the human-operator and the agent
perspective while every boundary held; the dogfood evidence was re-grounded against `d975d3e`
and the 41-assertion dogfood contract test re-ran green against the current producer. The new
safe executable verification-command projection added in `d975d3e` is additive bundle handoff
data, not execution. Humans should inspect README.md first, then context/task-context.md when
present. Agents should inspect agent/instructions.md first, then agent/handoff.md, then
agent/context.json, and then context/task-context.agent.json when present.

## Why This Review Exists

Slice 193 implemented the reading order, slice 194 reviewed the implementation, and slice 195
dogfooded the final reading order end-to-end and found it practically useful and boundary-safe.
This review confirms that dogfood result before broader handoff workflow use. It was rebased
onto `d975d3e` because that commit changed the bundle producer
(`packages/capability-docs/src/intent-plan-bundle.ts`) and the verification runner
(`packages/capability-verify/src/index.ts`) — surfaces this review's verification-posture /
Circe-projection scope covers — so the verification-posture claims are re-grounded against the
current producer.

## Dogfood Reviewed

Reviewed the slice-195 dogfood evidence + the shipped source it exercised, re-grounded in the
tree at `d975d3e`. The full reading-order dogfood path completed successfully:
`scan` → `intent context prepare` → `capability graph build` → `context task` →
`intent assess --task-context-ref` → `intent plan review --task-context-ref` →
`intent plan answer` → `intent prepare` → `intent status` → `intent approve` →
`intent status transition --to work-ready` → `intent work-order generate` →
`intent verification-plan generate` → `intent bundle write --task-context-ref` →
`artifacts validate` (`valid: true`), plus a without-context comparison bundle. The
41-assertion dogfood contract test `tests/contract/intent-bundle-handoff-reading-order-dogfood.test.mjs`
re-ran green against the `d975d3e` producer, confirming the dogfood result holds.

| Surface | Dogfood Finding | Safety Finding |
| --- | --- | --- |
| README.md | useful handoff reading order | human guidance only |
| agent/instructions.md | useful agent reading order | agent guidance only |
| agent/handoff.md | useful agent reading order | gates stay authoritative |
| agent/context.json.handoffReadingOrder | useful metadata | additive / non-authoritative |
| without-context bundle | clean and accurate | no false task-context availability |
| Circe handoff | stable | machine contract |

## Human Reading Order Review

README.md exposed a useful handoff reading order. The human reading order was practical: README
first, then `context/task-context.md` (if present), then `verification-plan.md`, then
`work-order.md` / source refs / agent files, and Circe actor contracts only for Circe-facing
handoffs. README.md pointed to context/task-context.md only as optional context (phrased "if
present", framed "optional context, not proof"). TaskContextReport remained optional context.

## Agent Reading Order Review

agent/instructions.md exposed a useful reading order ("Read these before acting:") and
agent/handoff.md exposed a useful reading order pointing at the structured-handoff and
authority surfaces; both stated gates remain authoritative. The Operator Command Boundary
remained operator-only.

## Agent Context Metadata Review

agent/context.json.handoffReadingOrder helped agents consume the bundle. handoffReadingOrder
preserved existing agent/context.json fields (`intentId`, `goal`, `status`, `scope`,
`capabilities`, `steps`, `phases`, `obligations`, `artifactRefs`). handoffReadingOrder
distinguished context from authority via its `authority` map (`taskContext: context-only`,
`workOrder: authoritative-work`, `verificationPlan: authoritative-verification`,
`sourceChangePosture: handoff-evidence-not-approval`, `actorContracts:
role-return-guidance-not-execution`).

## Source-Change Posture Review

source-change posture remained in the authority layer: `agent/verification.json.phases[]`
carries a per-phase `sourceChange` posture and the authority map labels it
`handoff-evidence-not-approval`. agent/verification.json remained authoritative for verification
posture and agent/source-refs.json remained authoritative for source refs. WorkOrder /
VerificationPlan remained authoritative.

## Verification Command Projection Review

The `d975d3e` change adds `isSafeExecutableVerificationCommand` to the Circe projection in the
bundle producer. Safe executable verification-command projection is handoff data, not
execution. isSafeExecutableVerificationCommand preserves only a bounded safe subset for
Circe-facing verification command projection — it allows `npm run <script>`, `npm test`,
`node scripts/<file>.mjs`, `rekon … --json`, and `rekon artifacts validate|freshness`, and
copies only those command strings into each requirement's `executableCommand`. Shell-metacharacter
command strings are rejected from the executable verification-command projection (the guard
rejects `;`, `&&`, `||`, `|`, `>`, `<`, backtick, `$(`, and `${`); a rejected string keeps its
human-readable evidence text but does not back an executable per-phase VerificationPlan.
circe/phase-plan.json may describe verification commands, but Rekon does not execute them — the
projection is data a downstream Circe runner (with its own execution authority) may consume, not
an action Rekon takes. circe/rekon-proof.json keeps commandsExecuted:false. The reading-order
surfaces are unchanged by `d975d3e`.

| Surface | Review Finding |
| --- | --- |
| agent/verification.json | authoritative verification posture |
| circe/phase-plan.json | projected phase/verification data, not execution |
| circe/rekon-proof.json | proof/boundary state with commandsExecuted:false |
| isSafeExecutableVerificationCommand | bounded safe-subset projection guard |
| executableCommand | handoff data only |

## Actor Contract Review

actor contracts remained role/return guidance, not executed workers. `circe/handoff.json`
remained the machine handoff contract, free of any task-context dependency, and the
`circe/actor-contracts/*` files were unchanged by the reading order and by `d975d3e`.

## Without-Context Review

The without-context bundle remained clean and accurate: the reading order still rendered
(phrased "if present"), no `context/` sidecars were created, no `taskContext` key was present in
agent/context.json, and `handoffReadingOrder` metadata remained present.

## Boundary Review

Every boundary holds. Source and plan files were unchanged. No commands were executed. No
VerificationRun or VerificationResult was created. Rekon did not run Circe. intent:go remains
deferred.

| Boundary | Review Finding |
| --- | --- |
| reading order vs automation | guidance only |
| task context vs proof | optional context only |
| source-change posture vs approval | evidence, not approval |
| verification command projection vs execution | handoff data only |
| actor contracts vs execution | guidance, not workers |
| WorkOrder / VerificationPlan | authoritative gates |
| command execution | none |
| source writes | none |
| VerificationRun / Result | none |
| Circe | not run by Rekon |
| intent:go | deferred |

| Finding | Severity | Resolution |
| --- | --- | --- |
| full reading-order dogfood path completed | positive | proceed |
| human reading order practical | positive | proceed |
| agent reading order practical | positive | proceed |
| handoffReadingOrder metadata useful | positive | proceed |
| safe executable command projection bounded | positive | proceed |
| without-context bundle clean | positive | proceed |

## Review Findings

- Intent bundle handoff reading order is guidance, not automation.
- The full reading-order dogfood path completed successfully.
- README.md exposed a useful handoff reading order.
- The human reading order was practical.
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
- Safe executable verification-command projection is handoff data, not execution.
- isSafeExecutableVerificationCommand preserves only a bounded safe subset for Circe-facing verification command projection.
- Shell-metacharacter command strings are rejected from the executable verification-command projection.
- circe/phase-plan.json may describe verification commands, but Rekon does not execute them.
- circe/rekon-proof.json keeps commandsExecuted:false.
- actor contracts remained role/return guidance.
- The Operator Command Boundary remained operator-only.
- The without-context bundle remained clean and accurate.
- Source and plan files were unchanged.
- No commands were executed.
- No VerificationRun or VerificationResult was created.
- Rekon did not run Circe.
- intent:go remains deferred.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare dogfood safe/stable | selected | usability and boundaries held |
| broader workflow decision next | selected | policy question remains |
| UX fix next | deferred | no issue found |
| make reading order authoritative | rejected | reading order is guidance |
| broader automation next | rejected/deferred | separate decision required |

## Recommendation

Intent Bundle Handoff Reading Order Dogfood is safe/stable. Recommended next slice: **Intent
Bundle Handoff Reading Order Broader Workflow Decision** — decide how broader operator/agent
workflow docs and handoff policy should treat the reading order, TaskContextReport sidecars,
phase source-change posture, the safe executable verification-command projection, actor
contracts, operator-only Circe commands, and the proof/gate/command/source boundaries.

## What This Does Not Do

This review changes no runtime behavior, no reading-order implementation, no safe executable
command projection, no bundle implementation, no Circe handoff schema, no actor contracts, no
source-change posture implementation, and no gate. It executes no commands, writes no source,
creates no WorkOrder / VerificationPlan / VerificationRun / VerificationResult, and runs no
Circe. intent:go remains deferred.

## Follow-Up Work

The recommended follow-up is **Intent Bundle Handoff Reading Order Broader Workflow Decision**.
Alternative: **Intent Bundle Handoff Reading Order UX Fix**, only if this review (or later use)
finds concrete wording / discoverability issues — none were found.

> Update (slice 197 · Intent Bundle Handoff Reading Order Broader Workflow Decision): decided how broader operator/agent workflow docs should treat the final reading order — Option B, a recommended (not required) broader handoff reading-order policy. Intent bundle handoff reading order is guidance, not automation; broader workflows should recommend the handoff reading order, not require it as proof. Humans start at README.md, agents at agent/instructions.md, with `agent/context.json.handoffReadingOrder` as the structured map. TaskContextReport stays optional context; WorkOrder / VerificationPlan + `agent/verification.json` + `agent/source-refs.json` stay authoritative; phase source-change posture stays handoff evidence, not approval; safe executable verification-command projection is handoff data, not execution (`circe/phase-plan.json` may describe verification commands but Rekon does not execute them; `circe/rekon-proof.json` keeps commandsExecuted:false); actor contracts stay role/return guidance; the Operator Command Boundary stays operator-only; intent:go deferred. First implementation: Intent Bundle Handoff Workflow Guide. See [`intent-bundle-handoff-reading-order-broader-workflow-decision`](intent-bundle-handoff-reading-order-broader-workflow-decision.md).

> Update (slice 198 · Intent Bundle Handoff Workflow Guide): shipped the slice-197 Option-B product-docs step — two reader guides ([`intent-bundle-handoff-workflow`](../guides/intent-bundle-handoff-workflow.md) and the agent reading-order companion) plus an implementation note that teach humans and agents how to consume an intent plan bundle using its handoff reading order. Documentation only. Intent bundle handoff reading order is guidance, not automation; broader workflows should recommend the handoff reading order, not require it as proof. Humans start at README.md, agents at agent/instructions.md, with `agent/context.json.handoffReadingOrder` as the structured map. TaskContextReport stays optional context; WorkOrder / VerificationPlan + `agent/verification.json` + `agent/source-refs.json` stay authoritative; phase source-change posture stays handoff evidence, not approval; safe executable verification-command projection is handoff data, not execution (`circe/phase-plan.json` may describe verification commands but Rekon does not execute them; `circe/rekon-proof.json` keeps commandsExecuted:false); actor contracts stay role/return guidance; the Operator Command Boundary stays operator-only; intent:go deferred. Next: Intent Bundle Handoff Workflow Guide Safety Review. See [`intent-bundle-handoff-workflow-guide`](intent-bundle-handoff-workflow-guide.md).
