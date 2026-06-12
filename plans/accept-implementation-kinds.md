# Plan: Accept Implementation-Bearing Phase Kinds at Intent Approve

## Problem

The PreparedIntentPlan validation in
`packages/kernel-repo-model/src/index.ts` requires a phase of kind
exactly `modify` for bug, feature, and migration plans, while the
deterministic normalizer derives phase kinds from title and objective
verbs and legitimately emits `implement`. The same artifact's approval
proof computes `hasImplementationOrRefactor` over the kind class
modify, implement, refactor
(`packages/capability-model/src/prepared-intent-plan.ts:743`), so one
subsystem recognizes `implement` as implementation-bearing while the
validator rejects it. The first strict run hit this defect: a plan
whose phase 1 was titled "Implement..." failed approve until retitled
(plans/reviews/findings-first-strict-run.md, defect 1). This plan
itself reproduced the defect a second way: kind verbs in its own
objective prose classified its mutation phase as refactor and failed
prepare, which is why the phase sections below name the affected kinds
only in deliverables.

## Goals

- The prepared plan validation accepts modify, implement, and refactor as implementation-bearing kinds for bug, feature, and migration plans.
- The validation error message names the accepted kind class instead of only modify.
- Contract assertions prove both directions: an implement-kind phase satisfies the requirement, and a plan with no implementation-bearing phase still fails.
- Verify with typecheck, build, the focused contract test, and the full suite.

## Non-Goals

- Do not change the normalizer's kind derivation; title-verb inference stays as it is.
- Do not change the proof computation in capability-model.
- Do not update plans/AUTHORING.md in this plan; the convention notes land in a docs follow-up after this fix.
- Do not touch the bench, the parity corpus, or operator config.

## Boundaries

- Expected changed files:
  - packages/kernel-repo-model/src/index.ts
  - tests/contract/intent-plan-bundle.test.mjs
- Do not edit `.circe` or `.rekon` runtime state manually.
- Worker harnesses must not run git add, git commit, or git push.

## Phase 1: Modify the prepared plan validation to accept the wider phase kind class

#### Phase Contract

Problem: the approve-time validation demands one specific phase kind
while the deterministic normalizer legitimately emits sibling kinds
for source-changing phases, and the approval proof already computes
the wider class.

Goal: modify the PreparedIntentPlan validation so the required-phase
rule accepts the same kind class the approval proof computes, and
prove both directions with contract assertions.

Non-Goals: do not touch kind derivation, the proof computation, or any
law content.

Boundary: keep source edits to the kernel-repo-model schema module and
the intent plan bundle contract test.

### Objective

Modify the prepared plan validation so every kind the approval proof
counts toward its source-changing class satisfies the required-phase
rule for bug, feature, and migration plans, with the error message
naming the accepted class, proven by contract assertions in both
directions.

### Source Change Policy

Source Change: required

### Implementation Scope

- packages/kernel-repo-model/src/index.ts
- tests/contract/intent-plan-bundle.test.mjs

### Changed files should include

- packages/kernel-repo-model/src/index.ts
- tests/contract/intent-plan-bundle.test.mjs

### Deliverables

- The prepared plan validation accepts modify, implement, and refactor as satisfying the required implementation-phase rule.
- The validation error message names the accepted kind class.
- A contract assertion proves a plan whose implementation phase has kind implement passes validation.
- A contract assertion proves a plan with no implementation-bearing phase still fails validation.

### Acceptance Criteria

- `npm run typecheck` passes.
- `npm run build` passes.
- `node --test tests/contract/intent-plan-bundle.test.mjs` passes.
- `npm test` passes.
- Changed files are limited to the expected scope.

### Verification Commands

- npm run typecheck
- npm run build
- node --test tests/contract/intent-plan-bundle.test.mjs
- npm test

### Evidence Gate

- Contract assertions prove implement satisfies the requirement and absence of any implementation-bearing phase still fails.
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

- packages/kernel-repo-model/src/index.ts
- tests/contract/intent-plan-bundle.test.mjs

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
