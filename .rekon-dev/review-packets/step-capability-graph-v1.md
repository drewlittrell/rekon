# Review Packet — StepCapabilityGraph v1

Slice 62 on the capability-ontology track. Product capability batch.
Implements the first artifact in the staged step/handoff/runtime graph
spine, per the StepCapabilityGraph v1 decision at `f6dac12`.

## CHANGES MADE

- **New artifact type `StepCapabilityGraph`** registered across the
  three-package surface: `packages/kernel-repo-model/src/index.ts`
  (types + `createStepCapabilityGraph` factory + validator + assert +
  schema), `packages/sdk/src/index.ts` (`KNOWN_ARTIFACT_TYPES`),
  `packages/runtime/src/index.ts` (`ARTIFACT_CATEGORY_BY_TYPE` →
  `graphs`).
- **New projection helper + config loader** in
  `packages/capability-model/src/step-capability-graph.ts`:
  `buildStepCapabilityGraph`, `parseStepCapabilityGraphConfig`, Like
  read types, and constants. Exported from the package index.
- **New CLI command** `rekon step graph build [--root] [--json]
  [--evidence-graph] [--capability-map] [--phrase-report]`.
- **Docs**: new artifact reference
  `docs/artifacts/step-capability-graph.md`, new concept
  `docs/concepts/step-capability-graph.md`, CHANGELOG / README / roadmap
  entries, and cross-reference updates.
- **Tests**: contract test
  `tests/contract/step-capability-graph.test.mjs` (28 assertions) +
  docs test `tests/docs/step-capability-graph.test.mjs` (12 assertions).

## PUBLIC API CHANGES

- `@rekon/kernel-repo-model` adds the `StepCapabilityGraph` type family,
  factory, validator, assert, and schema. Additive.
- `@rekon/capability-model` adds `buildStepCapabilityGraph`,
  `parseStepCapabilityGraphConfig`, Like types, and constants. Additive.
- `@rekon/sdk` + `@rekon/runtime` learn the new type (known-types +
  category map). Additive.
- CLI gains a new `step graph build` subcommand. No existing command
  changed.

## PURPOSE PRESERVATION CHECK

- **Original problem.** Rekon had capability projection and policy /
  lint / finding infrastructure but no step/workflow/handoff graph;
  classic codebase-intel had a step-capability graph linking steps,
  capabilities, and files, and Rekon needs a first-class
  `StepCapabilityGraph` before any handoff, coverage, runtime
  observation, drift, or intent parity work.
- **Guarantee preserved.** `StepCapabilityGraph` v1 models **expected
  workflow topology only**, projects from existing evidence/capability
  artifacts (no mutation), and treats the optional config as
  grouping/labeling rather than a source of truth. Runtime truth, handoff
  coverage, and drift stay deferred to later artifacts; intent
  implementation stays deferred. The classic capability (a step/workflow
  graph distinct from the capability projection) is preserved; the
  classic manual-admin and runtime-grounded properties are deliberately
  not carried into v1.

## CODEBASE-INTEL ALIGNMENT

The new artifact type is registered exactly where the established
new-artifact-type surface requires (kernel-repo-model factory/validator/
schema, SDK known-types, runtime category) and nowhere else; runtime
validation stays header-generic. The category is `graphs` (already used
by `GraphSlice`), matching "workflow topology, not evidence/action/
publication/policy". `@rekon/capability-model` reads its inputs
structurally via Like types and imports nothing from classic
codebase-intel.

## ARTIFACT MODEL

`StepCapabilityGraph` carries `source` (input refs + config path/hash),
`summary` (six recomputed counts), `steps[]` (id, label, source
derived/configured/mixed, systems?, paths?, evidenceRefs),
`capabilityEdges[]`, `fileEdges[]`, `systemEdges[]`,
`handoffPlaceholders[]` (reserved, empty in v1), and
`unresolvedCapabilities[]`. The factory dedupes by id, sorts, recomputes
the summary, and asserts; the validator rejects stale summaries.

## CONFIG MODEL

`.rekon/step-capability-map.json` is optional; missing is valid; invalid
fails clearly. It only groups/relabels/merges projected steps. It is
never a source of truth for capabilities/files/systems/handoffs, cannot
invent coverage/drift/readiness, and is never mutated.

## PROJECTION MODEL

Projection-first from `EvidenceGraph` + `CapabilityMap v2`
(phrase-backed capabilities) + `CapabilityPhraseReport`. Capability →
step assignment is deterministic: capability (verb+noun, optional
domain) > path prefix > system > config order > id ascending. Configured
steps that absorb non-declared capabilities become `mixed`;
domain-grouped steps are `derived`; unassignable capabilities (no config
match, no domain) become `unresolvedCapabilities`. Edges cite evidence
refs (or config source for config-declared file/system edges).

## CLI SURFACE

`rekon step graph build` reads latest/pinned inputs + optional config,
writes the graph under `graphs`, and prints a summary plus: "No runtime
coverage, drift, WorkOrder, or VerificationPlan artifacts were created."

## BOUNDARY MODEL

Expected workflow topology only. No runtime truth, no handoff coverage,
no drift, no execution readiness, no declared handoffs, no
`HandoffContract`, no `WorkOrder` / `VerificationPlan`, no intent. No
mutation of `EvidenceGraph` / `CapabilityMap` / `CapabilityPhraseReport`
or the config.

## TESTS / VERIFICATION

- Contract test (28 assertions): validation, config valid/invalid,
  zero-capability graph, configured/derived/mixed steps, capability/
  path/system matching + deterministic order + ties, evidence citation,
  unresolved capabilities, reserved-empty handoff placeholders, and CLI
  integration (writes graph, pinned refs, no mutation of inputs/config,
  no HandoffContract/WorkOrder/VerificationPlan, artifacts validate
  clean).
- Docs test (12 assertions).
- Full 9-command gate + CLI smoke (refresh → ontology normalize →
  phrase project → refresh → seed config → step graph build → artifacts
  validate).

## INTENTIONALLY UNTOUCHED

`EvidenceGraph` / `CapabilityMap` / `CapabilityPhraseReport` behavior and
schemas; `HandoffContract` and later spine layers; the lifecycle /
`CoherencyDelta` line; intent implementation; all version numbers;
classic codebase-intel (not imported).

## RISKS / FOLLOW-UP

- v1 derives step nodes coarsely (config steps + domain groupings);
  richer step derivation can refine later without changing the artifact
  type.
- The optional-config matching is prefix/exact; glob support is a
  follow-up.
- `handoffPlaceholders` / runtime grounding are reserved for the
  `HandoffContract` and `RuntimeGraphObservationReport` layers.

## NEXT STEP

StepCapabilityGraph safety review (before the HandoffContract v1
decision).
