# Plan: Fold Wrapped Bullet Continuations in Phase Section Parsing

## Problem

The phase-region parser in
`packages/capability-model/src/intent-plan-actionability-report.ts`
computes bullet content per physical line and pushes list items only
when the line itself matches BULLET_RE (the field switch around lines
500-528). A hard-wrapped bullet therefore enters list-bearing fields
as its first physical line only: the fragment lands in the field
(including touchedPaths, where it reads as a malformed path) and every
continuation line is silently dropped. Only the objective field
accumulates continuation lines today. The first strict run hit this as
defect 2 (plans/reviews/findings-first-strict-run.md), and
plans/AUTHORING.md currently forces single-line bullets as a
workaround.

## Goals

- Continuation lines of a wrapped bullet fold into that bullet's content for every list-bearing field: deliverables, acceptance criteria, touched paths, expected changed files, the command list, evidence, constraints, and non-goals.
- Single-line bullets and inline field values behave exactly as before.
- Contract assertions prove a wrapped bullet round-trips whole and that no first-line fragment enters touched paths.
- The full suite passes.

## Non-Goals

- Do not change heading classification, inline field parsing, or phase kind derivation.
- Do not change objective-line accumulation, which already keeps continuation lines.
- Do not update plans/AUTHORING.md in this plan; the convention relaxes in a docs follow-up after this lands.
- Do not touch the bench, the parity corpus, or operator config.

## Boundaries

- Expected changed files:
  - packages/capability-model/src/intent-plan-actionability-report.ts
  - tests/contract/intent-plan-actionability-report.test.mjs
- Do not edit `.circe` or `.rekon` runtime state manually.
- Worker harnesses must not run git add, git commit, or git push.

## Phase 1: Implement continuation-line folding for wrapped bullets in phase sections

#### Phase Contract

Problem: the phase-region parser keeps only the first physical line of
a wrapped bullet for list-bearing fields and drops continuation lines
silently, leaking fragments into touched paths.

Goal: implement folding of continuation lines into the owning bullet
for all list-bearing phase fields, leaving single-line bullets and
inline field values untouched, proven by contract assertions.

Non-Goals: do not touch heading classification, inline field parsing,
kind derivation, or objective-line accumulation.

Boundary: keep source edits to the actionability normalizer and its
contract test.

### Objective

Implement continuation-line folding so each non-heading, non-bullet,
non-inline-field line that follows a bullet inside a list-bearing
field appends to that bullet's content with a single space, across
deliverables, acceptance criteria, touched paths, expected changed
files, the command list, evidence, constraints, and non-goals, with
single-line bullets unchanged and contract assertions proving both the
folding and the unchanged behavior.

### Source Change Policy

Source Change: required

### Implementation Scope

- packages/capability-model/src/intent-plan-actionability-report.ts
- tests/contract/intent-plan-actionability-report.test.mjs

### Changed files should include

- packages/capability-model/src/intent-plan-actionability-report.ts
- tests/contract/intent-plan-actionability-report.test.mjs

### Deliverables

- Continuation lines fold into the owning bullet for every list-bearing field in the phase-region parser.
- A wrapped bullet in a scope section produces one whole touched path and no fragment entries.
- Contract assertions cover a wrapped deliverable, a wrapped scope path, and an unchanged single-line bullet.
- Inline field values and objective-line accumulation behave exactly as before, proven by existing tests still passing.

### Acceptance Criteria

- `npm run typecheck` passes.
- `npm run build` passes.
- `node --test tests/contract/intent-plan-actionability-report.test.mjs` passes.
- `npm test` passes.
- Changed files are limited to the expected scope.

### Verification Commands

- npm run typecheck
- npm run build
- node --test tests/contract/intent-plan-actionability-report.test.mjs
- npm test

### Evidence Gate

- Contract assertions prove wrapped bullets fold whole and single-line bullets are unchanged.
- Typecheck, build, and the full suite pass; contract tests consume built dist output, so the build step precedes them.
- No detector, bench, or corpus behavior changes.

## Phase 2: Final verify

#### Phase Contract

Problem: the mutation phase needs a read-only final verification pass
that starts from the mutation commit and proves source continuity plus
a clean final state.

Goal: verify the final source tree, build, and test suite as a
read-only pass.

Non-Goals: do not add tests, change runtime behavior, alter workflow
config, or modify law content.

Boundary: read-only verification over the final source tree. No source
edits in this phase. If verification exposes a real issue, the phase
fails with the issue recorded in run evidence, and the fix arrives as
a follow-up phase with a required source change policy.

### Objective

Verify the final source tree and test suite after the mutation phase
as a strictly read-only pass. If verification finds a real issue,
record it and let the phase fail; the fix belongs to a follow-up
phase, never to this one.

### Source Change Policy

Source Change: forbidden

### Implementation Scope

- packages/capability-model/src/intent-plan-actionability-report.ts
- tests/contract/intent-plan-actionability-report.test.mjs

### Deliverables

- Verification output showing `npm run typecheck` passed.
- Verification output showing `npm run build` passed.
- Verification output showing `npm test` passed.
- A read-only final phase with the planner recording a clean stop.

### Acceptance Criteria

- `npm run typecheck` passes.
- `npm run build` passes.
- `npm test` passes.
- Phase source base shows the final verification phase started from the prior mutation commit.
- The final verification phase stays read-only.
- Planner/verifier stops cleanly.

### Verification Commands

- npm run typecheck
- npm run build
- npm test

### Evidence Gate

- Typecheck, build, and the full suite pass on the final tree.
- The final phase stays read-only.
- Planner/verifier records a stop decision.
