# HandoffContract Safety Review

## Decision Summary

`HandoffContract` v1 (shipped at `0c2be5d`) is **safe / stable as a
declared baton policy artifact**. It materializes the expected baton
passes an operator declares in an optional `.rekon/handoff-contracts.json`,
resolved over the current `StepCapabilityGraph` into `declared` /
`unresolved-step` rows, and nothing more.

**HandoffContract is declared baton policy, not StepCapabilityGraph
topology.** The artifact creates no other artifacts and overclaims no
runtime behavior: **HandoffContract v1 does not evaluate handoff
coverage.** **HandoffContract v1 does not read runtime events.**
**HandoffContract v1 does not detect runtime graph drift.**
**HandoffContract v1 does not create WorkOrder or VerificationPlan.**
**HandoffContract v1 does not implement intent.**

This review finds **no blocker**. **HandoffCoverageReport remains the
next layer after HandoffContract**, and **RuntimeGraphObservationReport
and RuntimeGraphDriftReport remain deferred**. The recommended next slice
is the **HandoffCoverageReport architecture / v1 decision** — declared
baton policy now exists, so the next layer should decide how declared
handoffs are compared against observed handoff events.

| Surface | Status | Boundary |
| --- | --- | --- |
| HandoffContract artifact | shipped | declared baton policy |
| handoff contract build CLI | shipped | writes contract only |
| .rekon/handoff-contracts.json | optional | operator-declared baton policy |
| needs-review status | reserved | no v1 emission |

## Why This Review Exists

`HandoffContract` is Rekon's first declared baton policy artifact over
`StepCapabilityGraph` step ids. It is the prerequisite for future handoff
coverage, runtime observation, runtime drift, and intent parity. Before
`HandoffCoverageReport` is designed, Rekon needs to safety-review that
`HandoffContract` v1 is only declared policy and does not quietly overclaim
runtime behavior (coverage, observed events, or drift).

## Artifact And CLI Reviewed

Grounded by re-reading the shipped slice-65 implementation:

- **Type shape** (`@rekon/kernel-repo-model`): `HandoffContract` carries
  `source` (`stepCapabilityGraphRef`, `configPath?`, `configHash?`), a
  `summary` (`total`, `declared`, `unresolvedStep`, `needsReview`), and
  `handoffs[]` (id, status, fromStepId, toStepId, feature?, capability?,
  event?, payload?, evidenceRefs, messages?).
- **Factory** `createHandoffContract`: dedupes by id, sorts by status
  rank then id, recomputes the summary from `handoffs`, and asserts. A
  caller cannot persist a stale summary.
- **Validator / assert / schema** `validateHandoffContract` validates the
  header, the `stepCapabilityGraphRef`, each handoff (id uniqueness,
  status / capability enums, step ids, evidenceRefs), and re-derives the
  summary counts — **rejecting any artifact whose summary does not match
  its handoffs**. It additionally **requires a non-empty message on every
  `unresolved-step` row**.
- **Helper** `buildHandoffContract` reads the `StepCapabilityGraph`
  structurally (Like type; no new dependency), resolves each configured
  handoff against the graph's step ids, and emits `declared` /
  `unresolved-step`. It reads no source files, makes no network calls,
  and mutates nothing.
- **Config parser** `parseHandoffContractConfig` validates an optional
  config and throws clear errors on invalid input; missing config is
  valid (zero handoffs). The config is never mutated.
- **CLI** `rekon handoff contract build [--root] [--json] [--step-graph]`
  writes one `HandoffContract` under `.rekon/artifacts/actions/` and
  prints "No handoff coverage, runtime events, drift, WorkOrder, or
  VerificationPlan artifacts were created."

## Config Review

`.rekon/handoff-contracts.json` is optional; its absence emits a valid
zero-handoff contract. When present it declares expected baton passes
(from/to step ids + optional feature / capability / event / payload
metadata). The config is **operator-declared policy, never mutated** (the
CLI reads it, hashes it for citation, and writes only the contract);
invalid config fails clearly, so it cannot silently corrupt the
resolution. The `event` / `payload` blocks are *expected-identity*
metadata reserved for a future coverage layer, not observed events.

## Resolution Review

Resolution is deterministic and conservative.

| Case | V1 Behavior |
| --- | --- |
| missing config | valid zero-handoff contract |
| fromStepId and toStepId resolve | declared |
| fromStepId missing | unresolved-step |
| toStepId missing | unresolved-step |
| both step ids missing | unresolved-step |
| explicit id | preserved |
| missing id | deterministic slug-safe id |

A handoff is `declared` only when **both** `fromStepId` and `toStepId`
exist in `StepCapabilityGraph.steps`; any missing step id yields
`unresolved-step` with a diagnostic message rather than a dropped or
guessed handoff — the safe default. Explicit ids are preserved; omitted
ids derive a deterministic, slug-safe id
(`handoff:<from>:<to>:<feature|capability|event|default>`), and a
collision-suffix keeps ids unique. Declared rows cite the resolved steps'
evidence refs. Resolution is sufficient for v1: the same inputs always
produce the same contract, which the factory + validator enforce.

## Declared Policy Boundary Review

`HandoffContract` adds the declared-handoff layer over
`StepCapabilityGraph` step ids; it never rewrites the graph.
**HandoffContract is declared baton policy, not StepCapabilityGraph
topology** — the graph says which steps realize which capabilities; the
contract says which steps are *expected to hand off* to which. It infers
no handoffs from the graph; every handoff is operator-declared.

## Coverage / Runtime Boundary Review

**HandoffContract v1 does not evaluate handoff coverage.**
**HandoffContract v1 does not read runtime events.**
**HandoffContract v1 does not detect runtime graph drift.** No observed
events are ingested, no declared-vs-observed comparison is performed, and
no observed runtime graph is built. **HandoffCoverageReport remains the
next layer after HandoffContract**; **RuntimeGraphObservationReport and
RuntimeGraphDriftReport remain deferred**.

| Boundary | Decision |
| --- | --- |
| HandoffContract vs StepCapabilityGraph | declared baton policy vs topology |
| HandoffContract vs HandoffCoverageReport | no coverage evaluation |
| HandoffContract vs RuntimeGraphObservationReport | no runtime events |
| HandoffContract vs RuntimeGraphDriftReport | no drift detection |
| HandoffContract vs WorkOrder / VerificationPlan | no task/proof artifact creation |
| HandoffContract vs intent | prerequisite only |

## WorkOrder / VerificationPlan Boundary Review

**HandoffContract v1 does not create WorkOrder or VerificationPlan.** The
CLI writes exactly one `HandoffContract` under `actions/` and creates no
other governed artifact. Task / proof artifact creation stays downstream
and out of v1.

## Intent Boundary Review

**HandoffContract v1 does not implement intent.** The contract is a
prerequisite for intent parity (a future `intent:prepare` can attach
declared handoffs; `intent:status` can report coverage / drift once those
layers exist), but v1 runs no intent phase and gates nothing.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare v1 safe/stable baton policy | selected | bounded effective contract |
| HandoffCoverageReport decision next | selected | next layer after declared policy |
| more HandoffContract dogfood first | deferred | tests + smoke sufficient for safety |
| publication surfacing next | deferred | coverage boundary should come first |
| runtime observation next | rejected | coverage needs declared handoffs first |

## Recommendation

`HandoffContract` v1 is safe/stable as declared baton policy (no
blocker). Proceed to the **HandoffCoverageReport architecture / v1
decision**: now that declared baton policy exists, decide how declared
handoffs are compared against observed handoff events — without
implementing coverage yet.

## What This Does Not Do

This is a read-only review. It changes no runtime behavior, mutates no
artifact (`StepCapabilityGraph` / the config), creates no
`HandoffCoverageReport`, `RuntimeGraphObservationReport`,
`RuntimeGraphDriftReport`, `WorkOrder`, or `VerificationPlan`, evaluates
no coverage, reads no runtime events, detects no drift, starts no intent
implementation, writes no source files, publishes nothing to npm, and
bumps no version.

## Follow-Up Work

- HandoffCoverageReport architecture / v1 decision (next).
- Deferred to later, separately-decided slices: `HandoffCoverageReport`
  implementation, `RuntimeGraphObservationReport`,
  `RuntimeGraphDriftReport`, intent implementation, `WorkOrder` /
  `VerificationPlan` creation, and source writes.
- Optional: richer handoff validation (capability alignment between a
  declared handoff and its referenced steps) can refine the resolution
  later without changing the artifact type.

## Cross-References

- [HandoffContract artifact](../artifacts/handoff-contract.md)
- [Handoff contract concept](../concepts/handoff-contract.md)
- [HandoffContract v1 decision](handoff-contract-v1-decision.md)
- [StepCapabilityGraph safety review](step-capability-graph-safety-review.md)
- [StepCapabilityGraph / HandoffContract architecture decision](step-capability-handoff-architecture-decision.md)
- [Classic step-capability / handoff / runtime drift parity audit](classic-step-capability-handoff-runtime-drift-parity-audit.md)
- [StepCapabilityGraph artifact](../artifacts/step-capability-graph.md)
- [Roadmap](roadmap.md)
- [Classic behavior roadmap](classic-behavior-roadmap.md)
