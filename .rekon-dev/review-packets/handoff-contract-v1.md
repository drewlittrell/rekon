# Review Packet — HandoffContract v1

Slice 65 on the capability-ontology track. Product capability batch.
Implements the second artifact in the staged step/handoff/runtime graph
spine, per the HandoffContract v1 decision at `095bb74`.

## CHANGES MADE

- **New artifact type `HandoffContract`** registered across the
  three-package surface: `kernel-repo-model` (types +
  `createHandoffContract` factory + validator + assert + schema), `sdk`
  (`KNOWN_ARTIFACT_TYPES`), `runtime` (`ARTIFACT_CATEGORY_BY_TYPE` →
  `actions`).
- **New resolution helper + config loader** in
  `packages/capability-model/src/handoff-contract.ts`:
  `buildHandoffContract`, `parseHandoffContractConfig`, the
  `StepCapabilityGraph` Like type, and constants. Exported from the
  package index.
- **New CLI command** `rekon handoff contract build [--root] [--json]
  [--step-graph]`.
- **Docs**: new artifact reference `docs/artifacts/handoff-contract.md`,
  new concept `docs/concepts/handoff-contract.md`, CHANGELOG / README /
  roadmap entries, and cross-reference updates.
- **Tests**: contract test `tests/contract/handoff-contract.test.mjs`
  (27 assertions) + docs test `tests/docs/handoff-contract.test.mjs`
  (11 assertions).

## PUBLIC API CHANGES

- `@rekon/kernel-repo-model` adds the `HandoffContract` type family,
  factory, validator, assert, and schema. Additive.
- `@rekon/capability-model` adds `buildHandoffContract`,
  `parseHandoffContractConfig`, Like type, and constants. Additive.
- `@rekon/sdk` + `@rekon/runtime` learn the new type. Additive.
- CLI gains a new `handoff contract build` subcommand. No existing
  command changed.

## PURPOSE PRESERVATION CHECK

- **Original problem.** `StepCapabilityGraph` gives Rekon expected step
  topology; `HandoffContract` is the next classic-parity layer — declared
  baton policy over step ids. Rekon needs an artifact-backed effective
  contract before coverage, runtime observation, runtime drift, or intent
  can use handoff expectations.
- **Guarantee preserved.** `HandoffContract` v1 materializes declared
  baton policy only, references `StepCapabilityGraph` step ids, resolves
  `declared` vs `unresolved-step`, infers no handoffs, observes no runtime
  events, and evaluates no coverage. The optional config is grouping of
  declared intent, never mutated. Coverage / runtime / drift / intent
  stay deferred.

## CODEBASE-INTEL ALIGNMENT

Registered exactly where the established new-artifact-type surface
requires (kernel-repo-model factory/validator/schema, SDK known-types,
runtime category) and nowhere else; runtime validation stays
header-generic. Category `actions` (an effective policy artifact over the
graph, not the topology graph itself). `@rekon/capability-model` reads
the graph structurally via a Like type and imports nothing from classic
codebase-intel.

## ARTIFACT MODEL

`HandoffContract` { header, source(stepCapabilityGraphRef, configPath?,
configHash?), summary(total, declared, unresolvedStep, needsReview),
handoffs[] }. Each entry: id, status
(declared/unresolved-step/needs-review), fromStepId, toStepId, feature?,
capability?, event?, payload?, evidenceRefs, messages?. The factory
recomputes the summary, sorts by status rank then id, dedupes by id, and
asserts; the validator requires a message on `unresolved-step` rows and
rejects stale summaries.

## CONFIG MODEL

`.rekon/handoff-contracts.json` (version 0.1.0; `handoffs[]` with
fromStepId + toStepId required, id/feature/capability/event/payload/notes
optional). Missing valid (zero handoffs); invalid fails clearly; never
mutated. Declares expected baton policy only; cannot claim coverage /
mark drift / create runtime events.

## RESOLUTION MODEL

For each configured handoff: resolve `fromStepId` / `toStepId` against
`StepCapabilityGraph.steps` → `declared` (both present) or
`unresolved-step` (a step id missing, with a message). Id is explicit or
derived (`handoff:<from>:<to>:<feature|capability|event|default>`,
slug-safe, deterministic). Declared rows cite the resolved steps'
evidence refs. No config → zero handoffs. Infers nothing; reads no
runtime events.

## CLI SURFACE

`rekon handoff contract build` reads latest/pinned `StepCapabilityGraph`
+ optional config, writes the contract under `actions`, and prints a
summary plus: "No handoff coverage, runtime events, drift, WorkOrder, or
VerificationPlan artifacts were created."

## BOUNDARY MODEL

Declared baton policy only. No coverage, no runtime events, no drift, no
`HandoffCoverageReport` / `RuntimeGraphObservationReport` /
`RuntimeGraphDriftReport`, no `WorkOrder` / `VerificationPlan`, no intent.
No mutation of `StepCapabilityGraph` or the config.

## TESTS / VERIFICATION

- Contract test (27 assertions): validation, config valid/invalid,
  declared / unresolved-step (missing from / to / both), unresolved
  messages, explicit + derived ids, capability / event / payload
  preservation, declared-row evidence citation, summary counts,
  deterministic ordering, and CLI integration (writes contract, pinned
  graph ref, no mutation of graph/config, no coverage/runtime/drift/
  WorkOrder/VerificationPlan, source cites only graph + config, artifacts
  validate clean).
- Docs test (11 assertions).
- Full 9-command gate + CLI smoke (refresh → ontology normalize → phrase
  project → refresh → step-map config → step graph build → handoff config
  → handoff contract build → artifacts validate).

## INTENTIONALLY UNTOUCHED

`StepCapabilityGraph` behavior, schema, and config; `HandoffCoverageReport`
and later spine layers; the lifecycle / `CoherencyDelta` line; intent
implementation; all version numbers; classic codebase-intel (not
imported).

## RISKS / FOLLOW-UP

- v1 resolves step-id existence only; richer validation (e.g. capability
  alignment between the handoff and the referenced steps) is a follow-up.
- `event` / `payload` are expected-identity metadata; the coverage slice
  must not mistake them for observed events.
- `needs-review` is reserved (always 0 in v1) for a future triage path.

## NEXT STEP

HandoffContract safety review (before the HandoffCoverageReport v1
decision).
