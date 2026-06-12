# Loop findings: first strict run, per-edge-law-source

Operator notes from the chat-Claude loop operator, 2026-06-11. These
are defects and judgments discovered while driving the first strict
intent pipeline run against rekon itself.

## Defect 1: intent pipeline kind vocabulary mismatch (rekon)

The actionability normalizer derives phase kind from title and
objective verbs and emits kinds including `implement` and `verify`.
The PreparedIntentPlan validation invoked at `intent approve` requires
a phase of kind exactly `modify` for bug/feature/migration plans and
rejected a plan whose implementation phase was kind `implement`. The
same artifact's approval proof computes
`planStructure.hasImplementationOrRefactor: true`, so one subsystem
recognizes `implement` as implementation-bearing while the validator
does not. Evidence: PreparedIntentPlan prepared-intent-plan-1781219119094
plus the approve failure "A prepared bug/feature/migration plan must
include a modify phase." Suggested fix: the validator should accept
the same kind class the proof block computes, or the normalizer should
emit `modify` for implementation phases. Workaround applied: retitled
phase 1 to lead with "Modify". This is a rekon work item candidate.

## Defect 2 (minor): bullet first-line truncation in normalization

Deterministic normalization takes the first line of hard-wrapped
bullets; acceptance criterion prose ("Planner/verifier stops cleanly")
leaked into phase 2's paths as a junk entry and rode through the
handoff into the imported work item. Inert for a forbidden phase, but
path extraction should not consume non-path bullet lines. Convention
adopted: machine-read sections get single-line bullets.

## Defect 3 (minor, circe): init repo recreates WORKFLOW.md unconditionally

`circe init repo` created a default-template WORKFLOW.md in a repo
that deliberately has none (this repo's gate design relies on default
workflow lookup failing loudly). The recreated file is a loadable
legacy-era workflow at the default path. Archived to
.rekon/archive/workflow-md-circe-init-recreated-2026-06-11.md and
removed again. Suggested fix: a --no-workflow flag on init, or skip
creation when WORKFLOW.local.md exists. The .gitignore update from
init was clean (appended .circe/ only).

## Operator lesson: artifacts supersede, never mutate

`intent approve` emits a new PreparedIntentPlan; the pre-approval ref
stays unapproved forever. Re-resolve `artifacts latest` after every
state-changing step. A transition fired against the stale ref fails
with blockers that accurately describe the old artifact.

## Gap judgments (intent approve), accepted by claude-loop-operator

- verification-proof-missing: accepted. Proof for unperformed work is
  structurally impossible pre-handoff; verification executes inside
  the Circe strict loop where WORKFLOW.local.md makes it mandatory.
- runtime-drift-unresolved: accepted. All drift counters are zero and
  the repo has no runtime event log; static law schema change with no
  runtime surface.

## Open question for Drew

.gitignore now ignores plans/ (scratch block, not mine). That inverts
rule 6's durability premise: with plans/ untracked, a lost checkout
loses both the plan and its regenerable handoff. Either commit plans/
or pick a new durable home for plan sources.
