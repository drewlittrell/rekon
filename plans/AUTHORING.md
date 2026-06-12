# Plan authoring conventions

Conventions learned from the first strict runs (2026-06-11), enforced
at writing time so plans pass review and execute clean on the first
attempt. Every rule here traces to a concrete failure or finding in
plans/reviews/.

## Source change declarations

Each phase carries an inline marker under its Source Change Policy
heading: `Source Change: required`, `Source Change: allowed`, or
`Source Change: forbidden`. The deterministic normalizer reads the
inline marker; a bare value under the heading is not parsed and the
phase falls back to verb inference from prose.

## Kind verbs in titles, objectives, and phase contracts

The deterministic normalizer derives each phase's kind from verb stems
in the title, the objective, and the phase contract text, by substring
match. Exactly one kind verb stem may appear across those fields per
phase: the intended one. Implementation phases may lead with Modify,
Implement, or Refactor (all three pass validation as of commit
6a5b82b); final phases lead with Final verify. Naming other kinds in
those fields misclassifies the phase: this repo's own fix plan
classified as refactor because its objective said "implement or
refactor," and failed prepare until scrubbed. Kind words that must be
written down belong in deliverables or plan-level prose, which feed
source-change signals only.

## Machine-read sections use single-line bullets

Implementation Scope, Changed files, Deliverables, Acceptance
Criteria, and Evidence Gate bullets each fit on one line. The
normalizer takes the first line of a hard-wrapped bullet, truncating
the rest and leaking fragments into touched paths. Scope sections
carry bare paths only; any condition on a path moves to prose after
the list.

## Read-only phases say read-only

Negated source-change prose ("do not change source files", "no source
changes") scans as a positive source-change signal to the
deterministic classifier. Read-only phases describe themselves as
read-only and rely on the explicit forbidden marker.

## No escape clauses against machine gates

A forbidden phase carries no "unless a real issue must be fixed"
language anywhere: Boundary, Objective, or Deliverables. Under
enforcement, any source change fails the run regardless of prompt
permission, so the escape clause is an instruction the worker cannot
execute. The honest path is explicit: the phase fails with the issue
in run evidence, and the fix arrives as a follow-up phase with a
required policy.

## Verification commands

Verification Commands sections stay plain, no backticks. npm test
rebuilds all workspaces unconditionally, so a focused contract test
that consumes dist output lists npm run build before it. Per-command
verification runs under rekon's default timeout (600s as of
2026-06-11); a plan whose single command exceeds that needs the
timeout addressed before it ships.

## Standard two-phase shape

A mutation plan is two phases: a required implementation phase, then
a forbidden final verify that starts from the prior phase commit
(previous_phase_commit) and proves the final tree with the full
command set. Known limitation: the planner may conservatively stop
after a successful phase 1 instead of routing to phase 2, and the
dispatch guard then strands the final verify with no operator
continuation (circe backlog). The fallback is operator-path
verification of the phase commit, recorded in the plan's verdict.

## Requeue hygiene

A failed required-policy phase requeues only after its preserved
workspace is removed. The source-change baseline is captured at run
start; a preserved workspace that already contains the work makes the
required policy unsatisfiable. The prior attempt's diff is always
recorded in its run artifact, so the wipe loses nothing.
