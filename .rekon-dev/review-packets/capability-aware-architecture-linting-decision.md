# Review packet — Capability-aware architecture linting decision

**Slice:** thirty-seventh on the capability-ontology track.

**Scope:** strategy / architecture decision memo. Decides
the artifact boundary, finding relationship, severities,
confidence model, and safety constraints for
capability-aware architecture linting. Selects Option B:
emit a separate `CapabilityArchitectureLintReport`
artifact rather than promoting straight to
`FindingReport`.

**Status:** Shipped.

## CHANGES MADE

- New strategy memo:
  [`docs/strategy/capability-aware-architecture-linting-decision.md`](../../docs/strategy/capability-aware-architecture-linting-decision.md)
  with 12 required headings and 4 required tables
  (option, scope, boundary, future bridge).
- New docs test:
  `tests/docs/capability-aware-architecture-linting-decision.test.mjs`
  with 15 assertions.
- Updated cross-references in 11 supporting docs +
  README + CHANGELOG (publication safety review memo,
  v1 safety review memo, architecture decision memo,
  CapabilityContract artifact + concept docs,
  CapabilityMap artifact doc, capability-ontology
  concept doc, graph-aware-finding-filters concept
  doc, coherency-delta concept doc, roadmap + classic
  roadmap, README, CHANGELOG).
- This review packet at
  `.rekon-dev/review-packets/capability-aware-architecture-linting-decision.md`.

## PUBLIC API CHANGES

None. This is a strategy / decision memo batch. No
source files under `packages/` change. No artifact
type, helper, validator, CLI command, publication
surface, or permission is added, removed, or modified.

## PURPOSE PRESERVATION CHECK

The original purpose of `CapabilityContract` is to
record operator-authored policy without freezing the
contract as documentation. The thirty-sixth slice
declared publication surfacing safe / stable and
selected this decision as the next slice. This memo
pins the shape of evaluation **before** any
implementation lands, so that:

- `CapabilityContract` evaluation has an explicit
  artifact (`CapabilityArchitectureLintReport`) and
  does not silently appear inside the finding
  lifecycle.
- v1 evaluation scope (placement rules) is bounded
  so the next slice has a clear, narrow contract.
- Every consumer downstream of evaluation (findings,
  remediation, routing, planning, source writes)
  remains gated on its own decision + safety review
  pair.

The memo confirms:

- Capability-aware architecture linting is
  evaluation, not source mutation.
- `CapabilityArchitectureLintReport` is not
  `FindingReport` in v1.
- `CapabilityArchitectureLintReport` does not mutate
  `FindingLifecycleReport` or `CoherencyDelta`.
- `CapabilityArchitectureLintReport` does not
  implement resolver routing or verification
  planning.
- Only a later explicit bridge may promote lint
  rows into governed findings.

## CODEBASE-INTEL ALIGNMENT

No codebase-intel surface changes. The new artifact
will eventually slot into the existing artifact-store
+ capability-ontology + finding stacks; this memo
records *where* without shipping the code. The
finding-bridge boundary table reserves room for the
existing finding-filter chain, finding lifecycle
ledger, and coherency delta to remain in charge of
governance.

## OPTIONS CONSIDERED

| Option | Decision | Reason |
| --- | --- | --- |
| no architecture linting | rejected/deferred | CapabilityContract should eventually be evaluated |
| separate lint report first | **selected** | preserves evaluation/governance boundary |
| emit FindingReport directly | rejected | bypasses review of new policy signal |
| emit CoherencyDelta directly | rejected | skips finding lifecycle |
| resolver routing first | rejected/deferred | routing should wait for reviewed lint/finding boundary |

Selected: Option B. See the memo for the full
rationale. The key reason is that Option B is the
only shape that crosses into evaluation without
*also* crossing into finding emission, lifecycle
mutation, remediation, routing, verification, or
source writes — each of which deserves its own
review.

## LINT ARTIFACT MODEL

- **Name:** `CapabilityArchitectureLintReport`.
  (Alternative
  `CapabilityContractEvaluationReport` rejected;
  the artifact specifically evaluates architectural
  placement, not all contract semantics.)
- **Sources:** the latest `CapabilityContract` and
  the latest `CapabilityMap` v2 (cited in
  `header.inputRefs`).
- **Rows:** keyed by `(contractId,
  phraseCapabilityId, rule)` with status
  `violation` / `pass` / `not-evaluated`, severity
  + confidence, message, and `evidenceRefs[]`.
- **`findingCandidate` field:** present in the
  shape but **diagnostic only**. v1 may omit it;
  the field is reserved for the future finding
  bridge slice.
- **Row scope:** v1 emits rows only for
  `configured` contract rows. Unmatched contract
  rows can appear in the summary but must not
  produce `violation` rows.

## V1 SCOPE

| Rule | V1 Decision |
| --- | --- |
| allowedLayers | included |
| forbiddenLayers | included |
| allowedSystems | included |
| forbiddenSystems | included |
| requiredChecks | optional not-evaluated / unverified |
| requiredNeighbors | deferred |
| forbiddenNeighbors | deferred |
| preservationRules | deferred |

Layer / system placement can be evaluated from data
already in `CapabilityContract` + `CapabilityMap`
v2; neighbor / preservation / required-check
pass/fail evaluation needs richer graph + proof
semantics that haven't shipped.

## FINDING BRIDGE BOUNDARY

| Boundary | Decision |
| --- | --- |
| lint report vs source mutation | no source writes |
| lint report vs FindingReport | separate artifact first |
| lint report vs FindingLifecycleReport | no status mutation |
| lint report vs CoherencyDelta | no remediation mutation |
| lint report vs resolver routing | no routing |
| lint report vs verification planning | no planning |

Future bridge gate:

| Future Bridge | Requirement |
| --- | --- |
| lint row → FindingReport | explicit decision + safety review |
| lint row → WorkOrder | after finding lifecycle bridge |
| lint row → VerificationPlan | after task/work-order boundary |
| lint row → resolver routing | after policy/finding boundary |

## FUTURE CONSUMERS

Each is a separate future decision + safety review
pair, none ship in this slice:

- Lint row → `FindingReport` promotion bridge.
- Architecture linting in CI (GitHub Check + PR
  comment; read-only).
- Resolver routing (post-bridge).
- Verification planning by capability
  (post-bridge).
- Semantic impact analysis.
- `RefactorPreservationContract`.

## TESTS / VERIFICATION

- 15-assertion docs test
  `tests/docs/capability-aware-architecture-linting-decision.test.mjs`
  pins the verbatim guarantees in the decision memo
  + CHANGELOG + review packet.
- 9-command verification gate runs clean: typecheck
  · test · build · diff-check ·
  audit-package-exports · audit-license ·
  publish-dry-run · install-smoke ·
  install-tarball-smoke.

## INTENTIONALLY UNTOUCHED

- All source files under `packages/`.
- All artifact validators.
- All CLI command implementations.
- All publication surfaces.
- All finding-related artifacts (`FindingReport`,
  `FindingLifecycleReport`, `FindingFilterReport`,
  `FindingFilterPolicySuggestionReport`,
  `CoherencyDelta`).
- `CapabilityContract`, `CapabilityMap`,
  `CapabilityPhraseReport`, and `EvidenceGraph`
  shapes.
- `.rekon/capability-contracts.json`.
- `RefactorPreservationContract`.

## RISKS / FOLLOW-UP

Tracked, not gating:

- **`CapabilityArchitectureLintReport` v1
  implementation** (next slice). Register the
  artifact + evaluation helper + CLI. No
  `FindingReport` mutation.
- **`CapabilityArchitectureLintReport` v1 safety
  review** — gated on the implementation slice.
- **`CapabilityArchitectureLintReport` publication
  surfacing** — gated on the v1 safety review.
- **Lint → FindingReport bridge decision** — the
  first enforcement-adjacent decision after the
  lint artifact ships; gated on the publication
  safety review.
- **Cohort dogfood pass** on the new artifact once
  v1 ships. Operator-reaction-driven refinements
  may inform the bridge decision.
- **Long-deferred enforcement consumers**
  (resolver routing, verification planning,
  source writes, `RefactorPreservationContract`)
  remain in their own decision queues.

## NEXT STEP

`CapabilityArchitectureLintReport` v1 implementation
— register the artifact type in
`@rekon/kernel-repo-model` + SDK + runtime,
implement the evaluation helper for
`allowed/forbidden Layers/Systems` over configured
`CapabilityContract` rows, and ship a CLI command.
Still no `FindingReport` mutation, no
`FindingLifecycleReport` mutation, no
`CoherencyDelta` mutation, no resolver routing, no
verification planning, no source writes.
