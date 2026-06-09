# Review Packet — Intent Bundle Handoff Reading Order Broader Workflow Decision (slice 197, base 6983e15)

Decides: how broader operator/agent workflow docs should treat the reading order (implemented slice 193, safety-reviewed 194, dogfooded 195, dogfood-safety-reviewed 196).
Memo: [intent-bundle-handoff-reading-order-broader-workflow-decision.md](../../docs/strategy/intent-bundle-handoff-reading-order-broader-workflow-decision.md)

## CHANGES MADE

- New decision memo `docs/strategy/intent-bundle-handoff-reading-order-broader-workflow-decision.md`
  (12 headings, 22 boundary statements, 4 tables, 22 answered decision questions; selects
  Option B).
- New docs test `tests/docs/intent-bundle-handoff-reading-order-broader-workflow-decision.test.mjs`
  (30 assertions).
- This review packet; README banner + CHANGELOG entry; guarded cross-refs across the
  reading-order family docs + roadmaps.
- Decision-only: no source, runtime, renderer, projection, Circe, or gate change.

## PUBLIC API CHANGES

None. Docs + docs-test only. No type, CLI flag, artifact, schema, renderer, projection, or gate
changed.

## PURPOSE PRESERVATION CHECK

Bundles now contain a tested reading order; humans and agents can consume the bundle safely when
they follow it. Broader workflow docs need a policy for when and how to use it — and that policy
must not turn the reading order into proof, approval, execution, or source-write authority. This
decision pins a recommended-not-required policy: reading order helps consumption (guidance, not
automation); authority surfaces stay authoritative; context stays context; safe executable
verification-command projection stays handoff data; actor contracts stay guidance; operator-only
commands stay operator-only. The guarantee holds.

## CODEBASE-INTEL ALIGNMENT

Rekon is a read-only codebase-intelligence substrate that emits auditable artifacts and never
acts on the target repo. A recommended reading order is consistent with that posture: it orders
reads and classifies authority, but issues no writes, runs no commands, and runs no Circe. The
safe executable verification-command projection is explicitly handoff data for a downstream Circe
runner with its own execution authority — the intelligence/execution boundary is reinforced, not
redrawn.

## SOURCE REVIEW

Grounded the reading-order surfaces (`## Handoff reading order`, the agent `## Reading order`
sections, `agent/context.json.handoffReadingOrder`) and the `isSafeExecutableVerificationCommand`
projection in `intent-plan-bundle.ts` at `6983e15`, plus the `circe/rekon-proof.json` gate
booleans (`sourceWriteAllowed`/`commandsExecuted`/`runsCirce`/`intentGoDeferred`). All unchanged;
the decision adds policy only.

## CURRENT HANDOFF SURFACE

Four always-rendered reading-order surfaces + the additive `handoffReadingOrder` metadata + the
safe executable verification-command projection; gate booleans unchanged.

## OPTIONS CONSIDERED

A (bundle-only) rejected/deferred; **B (recommend broadly) selected**; C (require as gate)
rejected; D (automate consumption) rejected/deferred; E (require TaskContextReport) rejected.

## BROADER WORKFLOW MODEL

Humans: README → reading order → task-context.md if present → verification-plan.md → authority
surfaces → Circe actor contracts only for Circe-facing prep. Agents: instructions → handoff →
context.json/handoffReadingOrder → task-context.agent.json if present → source-refs → verification
→ WorkOrder/VerificationPlan/phase source-change posture → Circe handoff + actor contracts if
Circe-targeted.

## AUTHORITY MODEL

TaskContextReport optional context; WorkOrder authoritative work scope; VerificationPlan
authoritative verification scope; agent/verification.json authoritative verification posture;
agent/source-refs.json authoritative source refs; phase source-change posture handoff evidence
(not approval); safe executable verification-command projection handoff data (not execution);
rekon-proof proof/boundary state; actor contracts role/return guidance.

## SAFE VERIFICATION COMMAND PROJECTION POLICY

Handoff data, not execution. `circe/phase-plan.json` may describe verification commands but Rekon
does not execute them; `circe/rekon-proof.json` keeps `commandsExecuted:false`;
shell-metacharacter strings are rejected from the executable projection; agents/operators treat
projected commands as candidate verification instructions, not evidence that commands ran.

## ACTOR CONTRACT AND OPERATOR COMMAND BOUNDARY POLICY

Actor contracts role/return-shape guidance (not executed workers); the Operator Command Boundary
operator-only inspection guidance; worker requests to run operator-only Circe commands are
plan-quality concerns; Circe handoff JSON remains the machine handoff contract; Rekon does not run
Circe.

## BOUNDARY MODEL

Guidance only — no automation, no proof, no approval, no command execution, no source writes, no
VerificationRun/VerificationResult, no Circe execution, no intent:go. Recommended, not required.

## TESTS / VERIFICATION

- `tests/docs/intent-bundle-handoff-reading-order-broader-workflow-decision.test.mjs` (30
  assertions).
- Full keyless gate: typecheck, `npm test`, build, `git diff --check`, export/license audits,
  publish dry-run, both install smokes. No CLI smoke (decision-only batch).

## INTENTIONALLY UNTOUCHED

Reading-order implementation, safe executable command projection, bundle renderer, Circe handoff
schema, actor-contract contents, source-change posture implementation, WorkOrder /
VerificationPlan / phase-gate generation, proof / approval semantics, and intent:go (deferred).

## RISKS / FOLLOW-UP

Low risk: decision-only, no behavior change. Residual risk is wording drift, covered by the docs
test. Follow-up is the Intent Bundle Handoff Workflow Guide implementation.

## NEXT STEP

Recommend **Intent Bundle Handoff Workflow Guide** as the next slice (alternative: UX Fix, only if
a concrete wording/discoverability issue surfaces).
