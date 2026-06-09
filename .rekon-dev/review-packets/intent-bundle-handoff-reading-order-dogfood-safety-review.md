# Review Packet — Intent Bundle Handoff Reading Order Dogfood Safety Review (slice 196, base d975d3e)

Reviews: [Intent Bundle Handoff Reading Order Dogfood](../../docs/strategy/intent-bundle-handoff-reading-order-dogfood.md) (slice 195), re-grounded against `d975d3e`.
Memo: [intent-bundle-handoff-reading-order-dogfood-safety-review.md](../../docs/strategy/intent-bundle-handoff-reading-order-dogfood-safety-review.md)

## CHANGES MADE

- New safety-review memo `docs/strategy/intent-bundle-handoff-reading-order-dogfood-safety-review.md`
  (15 headings, 28 required statements, 5 tables).
- New docs test `tests/docs/intent-bundle-handoff-reading-order-dogfood-safety-review.test.mjs`
  (37 assertions).
- This review packet; README banner + CHANGELOG entry; guarded cross-refs across the
  TaskContextReport family docs + roadmaps.
- Rebased onto `d975d3e`; producer rebuilt; the slice-195 41-assertion dogfood contract test
  re-ran green against the current producer. No source, runtime, renderer, projection, Circe, or
  gate change.

## PUBLIC API CHANGES

None. Docs + docs-test only. No type, CLI flag, artifact, schema, renderer, projection, or gate
changed.

## PURPOSE PRESERVATION CHECK

The reading order is implemented and dogfooded; it helps humans and agents consume the bundle.
This review confirms the dogfood result did not create hidden proof, approval, execution,
source-write, or gate authority — including after `d975d3e`'s safe executable
verification-command projection. Reading order stays guidance; TaskContextReport stays optional
context; WorkOrder / VerificationPlan stay authoritative; phase source-change posture stays
handoff evidence, not approval; the safe executable command projection is handoff data, not
execution; actor contracts stay role/return guidance; operator-only Circe commands stay
operator-only. The guarantee holds.

## CODEBASE-INTEL ALIGNMENT

Rekon is a read-only codebase-intelligence substrate that produces auditable artifacts and never
acts on the target repo. `d975d3e` reinforces that posture: `isSafeExecutableVerificationCommand`
bounds which command strings may be *represented* as executable in the Circe per-phase
VerificationPlan projection, but Rekon still executes nothing during bundle generation or this
review — `commandsExecuted` stays `false`. The projection is handoff data for a downstream Circe
runner that holds its own execution authority; the intelligence/execution boundary is preserved.

## DOGFOOD REVIEWED

Re-grounded the slice-195 dogfood at `d975d3e`: the full operator path + without-context
comparison; the 41-assertion dogfood contract test re-ran green against the current producer.

## HUMAN READING ORDER REVIEW

README.md exposed a useful handoff reading order; the human order was practical; README pointed
to `context/task-context.md` only as optional context; TaskContextReport stays optional context.

## AGENT READING ORDER REVIEW

agent/instructions.md and agent/handoff.md exposed useful agent reading orders pointing at the
structured-handoff and authority surfaces; the operator-only Circe command line held.

## AGENT CONTEXT METADATA REVIEW

`agent/context.json.handoffReadingOrder` helped agents consume the bundle, preserved every
existing field, and distinguished context from authority via its `authority` map.

## SOURCE-CHANGE POSTURE REVIEW

Phase source-change posture stays in the authority layer
(`agent/verification.json.phases[].sourceChange`), classified `handoff-evidence-not-approval`;
`agent/verification.json` stays authoritative for verification posture and `agent/source-refs.json`
for source refs.

## VERIFICATION COMMAND PROJECTION REVIEW

`d975d3e` adds `isSafeExecutableVerificationCommand`: it allows only a bounded safe subset
(`npm run <script>`, `npm test`, `node scripts/<file>.mjs`, `rekon … --json`,
`rekon artifacts validate|freshness`) and rejects shell metacharacters (`; && || | > < \` $( ${`)
from the executable verification-command projection (`executableCommand`). The Circe per-phase
VerificationPlan executable command list is built only from that safe subset. This is handoff
data, not execution — `circe/phase-plan.json` may describe verification commands, but Rekon does
not execute them, and `circe/rekon-proof.json` keeps `commandsExecuted: false`.

## ACTOR CONTRACT REVIEW

`circe/handoff.json` stays the machine handoff contract; `circe/actor-contracts/*` stay
role/return-shape guidance, unchanged by the reading order and by `d975d3e`; the Operator Command
Boundary stays operator-only.

## WITHOUT-CONTEXT REVIEW

The without-context bundle stays clean and accurate: reading order renders ("if present"), no
`context/` sidecars, no `taskContext` key, `handoffReadingOrder` still present.

## BOUNDARY MODEL

Guidance only — no automation, no proof, no approval, no command execution, no source writes, no
VerificationRun/VerificationResult, no Circe execution, no intent:go. Verification command
projection is handoff data, not execution. Source + plan unchanged; Rekon did not run Circe.

## RECOMMENDATION

Declare the dogfood safe/stable. Recommend **Intent Bundle Handoff Reading Order Broader Workflow
Decision** next.

## TESTS / VERIFICATION

- `tests/docs/intent-bundle-handoff-reading-order-dogfood-safety-review.test.mjs` (37 assertions).
- `tests/contract/intent-bundle-handoff-reading-order-dogfood.test.mjs` (41) re-ran green at `d975d3e`.
- Full keyless gate: typecheck, `npm test`, build, `git diff --check`, export/license audits,
  publish dry-run, both install smokes. No CLI smoke (strategy/safety-review batch).

## INTENTIONALLY UNTOUCHED

Reading-order implementation, safe executable command projection, bundle renderer, Circe handoff
schema, actor-contract contents, source-change posture implementation, WorkOrder /
VerificationPlan / phase-gate generation, proof / approval semantics, and intent:go (deferred).

## RISKS / FOLLOW-UP

Low risk: review-only, no behavior change. Residual risk is wording drift, covered by the docs
test. Follow-up is the broader workflow decision.

## NEXT STEP

Recommend **Intent Bundle Handoff Reading Order Broader Workflow Decision** as the next slice
(alternative: UX Fix, only if a concrete wording/discoverability issue surfaces).
