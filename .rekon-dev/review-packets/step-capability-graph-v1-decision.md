# Review Packet — StepCapabilityGraph v1 Decision

Slice 61 on the capability-ontology track. Strategy / architecture
decision batch (v1 shape + inputs only). Builds on the StepCapabilityGraph
/ HandoffContract Architecture Decision at `c8fceae`.

## CHANGES MADE

- New strategy memo `docs/strategy/step-capability-graph-v1-decision.md`
  (14 headings + 4 tables: options / inputs / node-edge shape / boundary).
- New 16-assertion docs test
  `tests/docs/step-capability-graph-v1-decision.test.mjs`.
- Cross-reference updates to the architecture decision, the parity audit,
  `evidence-graph.md`, `capability-map.md`, `capability-phrase-report.md`,
  `capability-contract.md`, `work-order.md`, `verification-plan.md`, both
  roadmaps, README, and CHANGELOG.
- This review packet.

## PUBLIC API CHANGES

None. Docs-only batch. No `packages/` source, artifact type, CLI command,
validator, or schema changed.

## PURPOSE PRESERVATION CHECK

- **Original problem.** Classic codebase-intel modeled a step-capability
  graph (step → capability → file edges) from an operator-authored
  `step-capability-map.yaml`, runtime-grounded with execution stats.
  Rekon needs the expected-topology layer but must avoid two regressions:
  over-claiming runtime truth it cannot provide, and reintroducing a
  hand-maintained step-map admin burden.
- **Guarantee preserved.** This decision keeps `EvidenceGraph` /
  `CapabilityMap` / `CapabilityPhraseReport` boundaries intact (no
  mutation) and positions `StepCapabilityGraph` v1 as **projection-first
  expected workflow topology**, with the operator config strictly
  optional grouping/labeling. The classic capability — a step/workflow
  graph distinct from the capability projection — is preserved in intent;
  the classic *manual-admin* and *runtime-grounded* properties are
  deliberately not carried into v1 (deferred / re-homed to later spine
  layers).

## CODEBASE-INTEL ALIGNMENT

References the parity audit's classic findings (step-capability-map.yaml,
`owns`/`implements` edges, runtime grounding) rather than re-auditing
classic code, and imports nothing from classic codebase-intel. v1
re-homes the classic graph into Rekon's artifact-first spine: projection
from governed artifacts instead of a mutable YAML source of truth, and
static expected topology instead of runtime grounding.

## V1 SHAPE / INPUTS

Inputs: `EvidenceGraph` (required), `CapabilityMap v2` (required),
`CapabilityPhraseReport` (optional/recommended), and the optional
`.rekon/step-capability-map.json`. Nodes: step / capability / file /
system. Edges: step→capability (`realizes`), step→file/system
(`touches`). Reserved (empty in v1): expected-handoff edges and runtime
grounding.

## OPTIONAL CONFIG

`.rekon/step-capability-map.json` is optional; absence is the normal
case. When present it may only group, relabel, or merge/split projected
steps. It is not a source of truth for capabilities/files/systems/handoffs
and is not required to produce the artifact. Optional grouping/labeling,
not a manual-admin-heavy system.

## WHAT V1 DOES NOT MODEL

No runtime truth, no handoff coverage, no execution readiness, no declared
handoffs, no runtime/handoff event ingestion, no drift. Expected workflow
topology only.

## INTENT IMPACT

Deferred. The v1 shape is chosen so a future `intent:assess` /
`intent:prepare` can attach steps + capabilities once the artifact
exists; handoff coverage + runtime drift inputs to intent remain deferred
to later spine layers.

## TESTS / VERIFICATION

- New docs test (16 assertions): headings, the projection + optional
  config decision, the "expected workflow topology" statement, the "not
  runtime truth / handoff coverage / execution readiness" statement, the
  optional-config-not-admin-heavy statement, the inputs, the
  no-runtime-change statement, all four tables, CHANGELOG, and this
  packet.
- Full gate: `npm run typecheck`, `npm run test`, `npm run build`,
  `git diff --check`, `node scripts/audit-package-exports.mjs`,
  `node scripts/audit-license.mjs`, `node scripts/publish-dry-run.mjs`,
  `node scripts/install-smoke.mjs`,
  `node scripts/install-tarball-smoke.mjs`. No CLI smoke (strategy-only).

## INTENTIONALLY UNTOUCHED

All `packages/` source; every existing artifact type, schema, validator,
factory, and CLI command; `EvidenceGraph` / `CapabilityMap` /
`CapabilityPhraseReport`; `HandoffContract` and later spine layers; the
lifecycle / `CoherencyDelta` line; intent implementation; all version
numbers; classic codebase-intel (read-only reference, not imported).

## RISKS / FOLLOW-UP

- The exact projection algorithm (how step nodes are derived/clustered
  from `CapabilityMap` entries) is fixed in the v1 *implementation* slice,
  not here; this decision pins shape + inputs + sourcing stance.
- The optional config schema is sketched (group/relabel/merge) but
  finalized at implementation time.
- Expected-handoff and runtime-grounding fields are reserved; their
  population is owned by `HandoffContract` and
  `RuntimeGraphObservationReport` respectively.

## NEXT STEP

StepCapabilityGraph v1 implementation (register the artifact type, add the
projection builder over `EvidenceGraph` + `CapabilityMap v2` +
`CapabilityPhraseReport` + optional config, and a read-only CLI;
expected-handoff and runtime-grounding fields stay reserved/empty).
