# Review Packet — Intent Bundle Handoff Workflow Guide (slice 198, base 7cbeb5c)

Implements the product-docs step selected by the Intent Bundle Handoff Reading Order Broader
Workflow Decision (slice 197, Option B): teach humans and agents how to consume an intent plan
bundle using its handoff reading order.

Guides: [intent-bundle-handoff-workflow.md](../../docs/guides/intent-bundle-handoff-workflow.md) ·
[intent-bundle-agent-reading-order.md](../../docs/guides/intent-bundle-agent-reading-order.md)
Note: [intent-bundle-handoff-workflow-guide.md](../../docs/strategy/intent-bundle-handoff-workflow-guide.md)

## CHANGES MADE

- New `docs/guides/intent-bundle-handoff-workflow.md` — human + agent workflow guide (11 sections;
  workflow / authority / boundary tables).
- New `docs/guides/intent-bundle-agent-reading-order.md` — agent-focused reading-order companion
  (11 sections).
- New `docs/strategy/intent-bundle-handoff-workflow-guide.md` — implementation note (11 sections;
  consolidated 22-statement Boundary Model).
- New docs test `tests/docs/intent-bundle-handoff-workflow-guide.test.mjs` (30 assertions).
- This review packet; README banner + CHANGELOG entry; guarded cross-refs across the reading-order
  family docs + roadmaps.
- Documentation only: no source, runtime, renderer, projection, Circe, or gate change.

## PUBLIC API CHANGES

None. Docs + docs-test only. No type, CLI flag, help text, artifact, schema, renderer, projection,
or gate changed.

## PURPOSE PRESERVATION CHECK

Bundles now expose many handoff surfaces; the reading order prevents humans and agents from
confusing context, authority, proof, and execution; broader workflow docs need to teach that
habit. This slice ships that teaching: the guides help humans and agents consume bundles safely,
add no automation, grant no authority to context, and preserve every proof / gate / command /
source-write / Circe / intent:go boundary. The guarantee holds.

## SOURCE REVIEW

Grounded (read-only) the documented surfaces at `7cbeb5c`: README `## Handoff reading order`,
agent `## Reading order` sections, `agent/context.json.handoffReadingOrder`, the
`isSafeExecutableVerificationCommand` projection in `intent-plan-bundle.ts`, and the
`circe/rekon-proof.json` gate booleans. All unchanged; this slice adds reader-facing docs only.

## GUIDE SURFACE

Two reader guides (human+agent workflow, agent reading order) + one implementation note. Workflow
/ authority / boundary tables live in the workflow guide; the consolidated boundary-statement list
lives in the implementation note.

## HUMAN WORKFLOW

README → reading order → task-context.md if present → verification-plan.md → WorkOrder / source
refs / proof for authority → actor contracts only for Circe-facing prep.

## AGENT WORKFLOW

instructions → handoff → context.json/handoffReadingOrder → task-context.agent.json if present →
source-refs → verification → WorkOrder/VerificationPlan/phase source-change posture → Circe layer
when Circe-targeted.

## AUTHORITY MODEL

TaskContextReport optional context; WorkOrder authoritative work scope; VerificationPlan
authoritative verification scope; agent/verification.json authoritative verification posture;
agent/source-refs.json authoritative source refs; phase source-change posture handoff evidence (not
approval); safe executable verification-command projection handoff data (not execution);
rekon-proof proof/boundary state; actor contracts role/return guidance.

## SAFE VERIFICATION COMMAND PROJECTION

Handoff data, not execution. `circe/phase-plan.json` may describe verification commands but Rekon
does not execute them; `circe/rekon-proof.json` keeps `commandsExecuted:false`; projected commands
are candidate verification instructions, not evidence that commands ran.

## ACTOR CONTRACT AND OPERATOR COMMAND BOUNDARY

Actor contracts role/return-shape guidance (not executed workers); Operator Command Boundary
operator-only inspection guidance; worker requests to run operator-only Circe commands are
plan-quality concerns; Circe handoff JSON remains the machine handoff contract; Rekon does not run
Circe.

## BOUNDARY MODEL

Guidance only — recommended not required; no automation, no proof, no approval, no command
execution, no source writes, no VerificationRun/VerificationResult, no Circe execution, no
intent:go.

## TESTS / VERIFICATION

- `tests/docs/intent-bundle-handoff-workflow-guide.test.mjs` (30 assertions).
- Full keyless gate: typecheck, `npm test`, build, `git diff --check`, export/license audits,
  publish dry-run, both install smokes. No CLI smoke (docs-only batch, no help-text change).

## INTENTIONALLY UNTOUCHED

Reading-order implementation, safe executable command projection, bundle renderer, Circe handoff
schema, actor-contract contents, source-change posture implementation, WorkOrder / VerificationPlan
/ phase-gate generation, CLI help text, proof / approval semantics, and intent:go (deferred).

## RISKS / FOLLOW-UP

Low risk: documentation only, no behavior change. Residual risk is wording drift, covered by the
docs test. Follow-up: **Intent Bundle Handoff Workflow Guide Safety Review**.

## NEXT STEP

Recommend **Intent Bundle Handoff Workflow Guide Safety Review** (alternative: Intent Bundle
Handoff Workflow Guide Quality Fix, only if a clarity issue surfaces).
