# Review Packet — StepCapabilityGraph Safety Review

Slice 63 on the capability-ontology track. Strategy / safety-review
batch. Read-only end-to-end review of the `StepCapabilityGraph` v1
implementation shipped at `783b7df`.

## CHANGES MADE

- New strategy memo
  `docs/strategy/step-capability-graph-safety-review.md` (12 headings +
  4 tables: surface / matching / boundary / option).
- New 16-assertion docs test
  `tests/docs/step-capability-graph-safety-review.test.mjs`.
- Cross-reference updates to the v1 decision, the architecture decision,
  the parity audit, the artifact + concept docs, `evidence-graph.md`,
  `capability-map.md`, `capability-phrase-report.md`,
  `capability-contract.md`, `work-order.md`, `verification-plan.md`,
  `agent-operating-contract.md`, `remediation-work-orders.md`, both
  roadmaps, README, and CHANGELOG.
- This review packet.

## PUBLIC API CHANGES

None. Docs-only batch. No `packages/` source, artifact type, CLI
command, validator, or schema changed.

## PURPOSE PRESERVATION CHECK

- **Original problem.** `StepCapabilityGraph` is Rekon's first
  workflow-topology artifact; it sits between capability projection and
  the future handoff / runtime / intent layers. Before using it to design
  `HandoffContract`, Rekon needs a safety review confirming v1 does not
  overclaim runtime truth, coverage, drift, or intent readiness.
- **Guarantee preserved.** This review changes no behavior; it confirms,
  against the shipped code, that `StepCapabilityGraph` is expected
  workflow topology only, remains separate from `CapabilityMap v2`, keeps
  the optional config as grouping/labeling, and leaves runtime
  observation, drift, `HandoffContract`, and intent deferred. No classic
  or v1-decision guarantee is dropped.

## CODEBASE-INTEL ALIGNMENT

Grounded by re-reading the kernel-repo-model type/factory/validator/
schema, the `buildStepCapabilityGraph` + `parseStepCapabilityGraphConfig`
helper, and the CLI `step graph build` branch. The memo's claims
(expected topology, reserved-empty handoff placeholders, deterministic
matching, recompute-and-reject-stale-summary validation, write-under-
`graphs`, no other artifacts created) are taken directly from that code.
Nothing was imported from classic codebase-intel.

## ARTIFACT / CLI REVIEWED

`StepCapabilityGraph` type + `createStepCapabilityGraph` factory +
`validateStepCapabilityGraph` / assert / schema (kernel-repo-model);
`buildStepCapabilityGraph` + `parseStepCapabilityGraphConfig`
(capability-model); `rekon step graph build` CLI.

## PROJECTION / TOPOLOGY BOUNDARY REVIEW

Adds step/workflow nodes + `realizes` / `touches` / system edges over
capability projection; never rewrites `CapabilityMap`. Static and
projected — expected workflow topology, not runtime truth, not
`CapabilityMap v2`.

## OPTIONAL CONFIG REVIEW

`.rekon/step-capability-map.json` optional; missing valid; invalid fails
clearly; never mutated. Grouping/labeling only; not a source of truth;
cannot invent coverage / drift / readiness.

## MATCHING / UNRESOLVED CAPABILITY REVIEW

Deterministic assignment: capability (verb+noun, optional domain) > path
prefix > system > config order > id asc. Unassignable capabilities (no
config match, no domain) become `unresolvedCapabilities` rather than
force-fit. Edges cite evidence refs or carry a `config` source.
Sufficient for v1; same inputs → same graph (enforced by factory +
validator).

## HANDOFF / RUNTIME BOUNDARY REVIEW

`handoffPlaceholders` reserved + empty (helper emits `[]`). No
`HandoffContract`, no handoff coverage, no runtime observation, no drift,
no `WorkOrder` / `VerificationPlan`. Those are later spine layers.

## INTENT BOUNDARY REVIEW

Intent implementation remains deferred. v1 is a prerequisite for intent
parity; it runs no intent phase and gates nothing.

## RECOMMENDATION

`StepCapabilityGraph` v1 is safe / stable as expected workflow topology
(no blocker). Recommended next slice: **HandoffContract architecture / v1
decision** (declared baton policy over StepCapabilityGraph step ids).

## TESTS / VERIFICATION

- New docs test (16 assertions): headings, the eight required boundary
  statements, all four tables, CHANGELOG mention, and this packet.
- Full gate: `npm run typecheck`, `npm run test`, `npm run build`,
  `git diff --check`, `node scripts/audit-package-exports.mjs`, `node
  scripts/audit-license.mjs`, `node scripts/publish-dry-run.mjs`, `node
  scripts/install-smoke.mjs`, `node scripts/install-tarball-smoke.mjs`.
  No CLI smoke (strategy-only batch).

## INTENTIONALLY UNTOUCHED

`StepCapabilityGraph` behavior, factory, validator, schema, helper,
config parser, and CLI; `EvidenceGraph` / `CapabilityMap` /
`CapabilityPhraseReport`; `HandoffContract` and later spine layers; the
lifecycle / `CoherencyDelta` line; intent implementation; all version
numbers; classic codebase-intel (not imported).

## RISKS / FOLLOW-UP

- v1 derives steps coarsely (config + domain groupings); richer
  derivation can follow without changing the artifact type.
- Config matching is prefix/exact; glob support is a follow-up.
- `handoffPlaceholders` / runtime grounding stay reserved for the
  `HandoffContract` and `RuntimeGraphObservationReport` layers.

## NEXT STEP

HandoffContract architecture / v1 decision.
