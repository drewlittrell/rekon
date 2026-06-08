# Review Packet — Intent Bundle Handoff Reading Order Dogfood (slice 195, base ead7c7c)

Dogfoods: [Intent Bundle Handoff Reading Order Implementation](../../docs/strategy/intent-bundle-handoff-reading-order-implementation.md) (slice 193), found safe/stable by the [Safety Review](../../docs/strategy/intent-bundle-handoff-reading-order-safety-review.md) (slice 194).
Memo: [intent-bundle-handoff-reading-order-dogfood.md](../../docs/strategy/intent-bundle-handoff-reading-order-dogfood.md)

## CHANGES MADE

- New dogfood memo `docs/strategy/intent-bundle-handoff-reading-order-dogfood.md`.
- New contract test `tests/contract/intent-bundle-handoff-reading-order-dogfood.test.mjs` (41
  assertions) driving the full operator path + without-context comparison.
- New docs test `tests/docs/intent-bundle-handoff-reading-order-dogfood.test.mjs` (24
  assertions).
- This review packet; README banner + CHANGELOG entry; guarded cross-refs across the
  TaskContextReport family docs + roadmaps.
- No source, no runtime, no renderer, no Circe, no gate change. No narrow wording fix was
  needed — the reading order dogfooded cleanly as shipped.

## PUBLIC API CHANGES

None. Dogfood/review batch — docs + tests only. No type, CLI flag, artifact, schema, renderer,
or gate changed.

## PURPOSE PRESERVATION CHECK

The bundle tells humans and agents what to inspect first; the safety review confirmed the
guidance is boundary-safe; this dogfood confirms it is practically useful. The reading order
helps humans and agents consume the bundle, stays guidance (not automation), keeps task context
optional, keeps authority surfaces authoritative, and keeps proof / gates / source-change
posture / actor contracts / context clearly separated — with no command execution or source
mutation. The guarantee holds.

## SOURCE REVIEW

Re-grounded the four shipped reading-order surfaces in `intent-plan-bundle.ts` at `ead7c7c`
(README `## Handoff reading order`; agent `## Reading order` in instructions + handoff; additive
`agent/context.json.handoffReadingOrder`), the `CIRCE_OPERATOR_COMMAND_BOUNDARY` appended to each
actor contract, and the phase source-change posture (`agent/verification.json.phases[].sourceChange`
+ rekon-proof phase gates). The dogfood inspects the rendered output of all of these.

## DOGFOOD SCENARIO

Full public operator path on a fresh fixture through `intent bundle write --task-context-ref`
+ `artifacts validate` (`valid: true`), plus a without-context comparison bundle from the same
approved plan to a separate intent id. Source + plan SHAs unchanged.

## HUMAN READING ORDER REVIEW

README.md exposed a useful handoff reading order; the human order (README → task-context.md if
present → verification-plan.md → WorkOrder/source refs/agent files → actor contracts only for
Circe handoffs) was practical; README pointed to `context/task-context.md` only as optional
context; `context/task-context.md` remained useful orientation; `verification-plan.md` remained
the verification authority.

## AGENT READING ORDER REVIEW

agent/instructions.md and agent/handoff.md exposed useful reading orders pointing at the
structured-handoff and authority surfaces; the operator-only Circe command line held.

## AGENT CONTEXT METADATA REVIEW

`agent/context.json.handoffReadingOrder` helped agents consume the bundle, preserved every
existing field, and distinguished context from authority (authority map:
`taskContext: context-only`, `workOrder: authoritative-work`, `verificationPlan:
authoritative-verification`, `sourceChangePosture: handoff-evidence-not-approval`,
`actorContracts: role-return-guidance-not-execution`).

## SOURCE-CHANGE POSTURE REVIEW

Phase source-change posture remained in the authority layer (`agent/verification.json.phases[]
.sourceChange`), classified `handoff-evidence-not-approval` — evidence, not approval.

## ACTOR CONTRACT REVIEW

`circe/actor-contracts/*` remained role/return-shape guidance; the implementer contract carried
the Operator Command Boundary ("operator inspection commands", operator-only). `circe/handoff.json`
remained the machine handoff contract, free of task-context dependency.

## WITHOUT-CONTEXT REVIEW

The without-context bundle remained clean and accurate: reading order still rendered ("if
present"), no `context/` sidecars, no `taskContext` key, `handoffReadingOrder` still present,
validates clean.

## BOUNDARY MODEL

Guidance only — no automation, no proof, no approval, no command execution, no source writes, no
VerificationRun/VerificationResult, no Circe execution, no intent:go. Source and plan files
unchanged; Rekon did not run Circe.

## TESTS / VERIFICATION

- `tests/contract/intent-bundle-handoff-reading-order-dogfood.test.mjs` (41 assertions) — 41/41.
- `tests/docs/intent-bundle-handoff-reading-order-dogfood.test.mjs` (24 assertions).
- Full keyless gate: typecheck, `npm test`, build, `git diff --check`, export/license audits,
  publish dry-run, both install smokes.
- CLI dogfood: the contract test execs the built CLI end-to-end (the dogfood scenario).

## INTENTIONALLY UNTOUCHED

Bundle architecture, reading-order implementation, Circe handoff schema, actor-contract
contents, source-change posture implementation, WorkOrder / VerificationPlan / phase-gate
generation, proof / approval semantics, and intent:go (deferred).

## RISKS / FOLLOW-UP

Low risk: review/dogfood-only, no behavior change. Residual risk is wording drift, covered by
the docs test. Follow-up is the dogfood safety review.

## NEXT STEP

Recommend **Intent Bundle Handoff Reading Order Dogfood Safety Review** as the next slice
(alternative: UX Fix, only if a concrete wording/discoverability issue surfaces).
