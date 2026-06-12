# Plan: Per-Edge Law Source on Topology Edges

## Problem

Topology edges carry forbidden and required import law, but
`GrammarTopologyEdgeSchema` is the only law-carrying schema in
`packages/capability-ontology/src/grammar/schema.ts` without a per-entry
`source` field. Layers, file types, patterns, anti-patterns, forbidden
types, and sequential patterns are all citable at the entry grain; edges
are citable only at the whole-topology grain. WO-20 had to record the
kernel-to-contract edge's operator provenance
(`operator:wo-20#kernel-contract-edge`) in the topology description as a
workaround, which breaks the provenance chain for every edge added by a
later ruling.

## Goals

- Add an optional `source` field using the existing
  `GrammarSourceRefSchema` to `GrammarTopologyEdgeSchema`.
- Populate the field on the package-platform pack's ruling-added edges:
  the five contract-layer edges sourced `operator:wo-19#contract-layer`
  and the kernel-to-contract edge sourced
  `operator:wo-20#kernel-contract-edge`.
- Migrate the WO-20 provenance note out of the topology description into
  the new field so the description stops doing the schema's job.
- Prove the field survives grammar compilation into the effective
  topology with a focused contract assertion.
- Verify with typecheck, build, the focused contract test, and the full
  test suite.

## Non-Goals

- Do not change detector behavior; divergence finding payloads do not
  gain edge sources in this plan.
- Do not add new edges, layers, or any law content beyond the provenance
  migration.
- Do not modify other grammar packs; ported edges inherit the
  topology-level source by design, and absent edge sources stay valid.
- Do not touch the bench, the parity corpus, or operator config.

## Boundaries

- Expected changed files:
  - packages/capability-ontology/src/grammar/schema.ts
  - packages/capability-ontology/src/grammar/packs/grammar-archetype-package-platform.ts
  - tests/contract/architecture-grammar-archetypes.test.mjs
- Acceptable fallback file if compilation drops the field:
  - packages/capability-ontology/src/grammar/index.ts
- Do not edit `.circe` or `.rekon` runtime state manually.
- Worker harnesses must not run git add, git commit, or git push.

## Phase 1: Modify the topology edge schema and pack for per-edge law sources

#### Phase Contract

Problem: edge-grain law has no edge-grain provenance, and the WO-20
workaround parked an operator citation in a description string.

Goal: modify source by adding an optional source field to the topology
edge schema, populating it on the package-platform pack's ruling-added
edges, migrating the WO-20 description workaround into the field, and
adding a focused contract assertion that the field round-trips through
grammar compilation.

Non-Goals: do not change detector behavior, finding payloads, other
packs, bench mechanics, or any law content beyond the provenance
migration.

Boundary: keep source edits to the schema module, the package-platform
pack, and the archetype contract test unless compilation drops the field,
in which case `packages/capability-ontology/src/grammar/index.ts` may be
edited to preserve it.

### Objective

Modify source so that topology edges carry optional per-edge law
provenance, the six ruling-added package-platform edges cite their
rulings in the field, and a contract assertion proves the field is
preserved end to end.

### Source Change Policy

Source Change: required

### Implementation Scope

- packages/capability-ontology/src/grammar/schema.ts
- packages/capability-ontology/src/grammar/packs/grammar-archetype-package-platform.ts
- tests/contract/architecture-grammar-archetypes.test.mjs
- packages/capability-ontology/src/grammar/index.ts

The grammar index file is in scope only as the fallback if compilation
drops the field; otherwise it stays untouched.

### Changed files should include

- packages/capability-ontology/src/grammar/schema.ts
- packages/capability-ontology/src/grammar/packs/grammar-archetype-package-platform.ts
- tests/contract/architecture-grammar-archetypes.test.mjs

### Deliverables

- `GrammarTopologyEdgeSchema` gains an optional source field, and edges without sources remain valid, so every existing pack still validates unchanged.
- The five contract-layer edges carry operator:wo-19#contract-layer and the kernel-to-contract edge carries operator:wo-20#kernel-contract-edge.
- The topology description no longer carries the WO-20 provenance workaround text.
- A focused contract assertion proves a sourced edge survives grammar compilation with its source intact and an unsourced edge stays valid.

### Acceptance Criteria

- `npm run typecheck` passes.
- `npm run build` passes.
- `node --test tests/contract/architecture-grammar-archetypes.test.mjs` passes.
- `npm test` passes.
- Changed files are limited to the expected scope unless the compilation fallback file is needed.
- All five builtin packs still validate with no content changes outside the package-platform topology edges and description.

### Verification Commands

- npm run typecheck
- npm run build
- node --test tests/contract/architecture-grammar-archetypes.test.mjs
- npm test

### Evidence Gate

- The focused assertion proves per-edge source round-trips through compilation.
- Typecheck, build, and the full suite pass; contract tests consume built dist output, so the build step precedes them.
- No detector, bench, or corpus behavior changes.

## Phase 2: Final verify

#### Phase Contract

Problem: the mutation phase needs a read-only final verification pass
that starts from the mutation commit and proves source continuity plus a
clean final state.

Goal: verify the final source tree, build, and test suite as a read-only
pass.

Non-Goals: do not add tests, change runtime behavior, alter workflow
config, or modify law content.

Boundary: read-only verification over the final source tree. No source
edits in this phase. If verification exposes a real issue, the phase
fails with the issue recorded in run evidence, and the fix arrives as a
follow-up phase with a required source change policy.

### Objective

Verify the final source tree and test suite after the mutation phase as
a strictly read-only pass. If verification finds a real issue, record it
and let the phase fail; the fix belongs to a follow-up phase, never to
this one.

### Source Change Policy

Source Change: forbidden

### Implementation Scope

- packages/capability-ontology/src/grammar/schema.ts
- packages/capability-ontology/src/grammar/packs/grammar-archetype-package-platform.ts
- tests/contract/architecture-grammar-archetypes.test.mjs

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
