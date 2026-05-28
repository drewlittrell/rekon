# CapabilityArchitectureLintReport Safety Review

**Slice:** thirty-ninth on the codebase-intel-classic
capability-ontology track.

**Scope:** strategy / safety-review batch. Read-only
end-to-end audit of the `CapabilityArchitectureLintReport`
v1 implementation shipped at `0bd7af0`. No runtime
behavior changes. No new artifact type. No new CLI
command. No source files under `packages/` modified
beyond docs cross-references.

## Decision Summary

**`CapabilityArchitectureLintReport` v1 is safe / stable
as a separate evaluation artifact.** The implementation
honors every boundary pinned by the Capability-Aware
Architecture Linting Decision (Option B): it evaluates
configured `CapabilityContract` placement rules against
the projected `CapabilityMap` v2 and writes a standalone
evaluation artifact. It does **not** write
`FindingReport`, does **not** mutate
`FindingFilterReport` / `FindingLifecycleReport` /
`CoherencyDelta`, and does **not** add resolver routing,
verification planning, `RefactorPreservationContract`, or
source writes.

**Recommended next slice:**
`CapabilityArchitectureLintReport` publication surfacing
— render the lint summary / violations / not-evaluated
rows read-only in the architecture summary and agent
contract publications. **Operators and agents should
inspect lint rows before any finding bridge is
designed.** The finding bridge (lint row →
`FindingReport`) is explicitly deferred to a later
decision + safety review pair.

## Why This Review Exists

`CapabilityArchitectureLintReport` is the first
evaluation layer that sits *after* `CapabilityContract`
policy. It is enforcement-adjacent: it evaluates
operator-authored placement policy and emits
pass / violation / not-evaluated rows. That makes it the
closest the capability-ontology stack has come to
governed findings — and therefore the point at which an
explicit safety review is warranted before any surfacing
or bridging work begins.

The risk this review guards against is **boundary
creep**: a future slice (or an over-eager reading of the
current one) treating lint violations as findings,
routing resolvers by capability, planning verification
by capability, or writing source. v1 must remain
evaluation-only, and this memo confirms it does.

## Artifact And CLI Reviewed

Reviewed surfaces (all shipped at `0bd7af0`):

- **Type shape** —
  `CapabilityArchitectureLintReport`,
  `CapabilityArchitectureLintRow`,
  `CapabilityArchitectureLintSummary`,
  `CapabilityArchitectureLintSource`,
  `CapabilityArchitectureLintStatus`,
  `CapabilityArchitectureLintRule`,
  `CapabilityArchitectureLintSeverity`,
  `CapabilityArchitectureLintConfidence`,
  `CapabilityArchitectureLintFindingCandidate`
  in `@rekon/kernel-repo-model`.
- **Factory** —
  `createCapabilityArchitectureLintReport`
  (deterministic ordering by
  `(contractId, rule, phraseCapabilityId, id)`;
  summary recomputed from rows; `byRule` / `bySeverity`
  key-sorted).
- **Validator / assert / schema** —
  `validateCapabilityArchitectureLintReport`,
  `assertCapabilityArchitectureLintReport`,
  `capabilityArchitectureLintReportSchema`. Rejects
  unknown status / rule / severity / confidence enum
  values; rejects duplicate row ids; rejects
  summary counts that disagree with the rows
  (re-derived and compared).
- **Helper** —
  `buildCapabilityArchitectureLintReport` in
  `@rekon/capability-model`. Pure function over JSON
  input + an `ArtifactRef` pair. No source reads, no
  network, no LLM.
- **CLI** —
  `rekon capability lint architecture
  [--capability-contract <id|type:id>]
  [--capability-map <id|type:id>] [--root <path>]
  [--json]`. Reads latest (or pinned)
  `CapabilityContract` + `CapabilityMap`, writes a
  `CapabilityArchitectureLintReport` under
  `.rekon/artifacts/findings/`, prints a summary, and
  states "No findings were written."
- **Tests** —
  `tests/contract/capability-architecture-lint-report.test.mjs`
  (23 cases) and
  `tests/docs/capability-architecture-lint-report.test.mjs`
  (12 cases).
- **Docs** —
  [`docs/artifacts/capability-architecture-lint-report.md`](../artifacts/capability-architecture-lint-report.md),
  [`docs/concepts/capability-aware-architecture-linting.md`](../concepts/capability-aware-architecture-linting.md),
  [`docs/strategy/capability-aware-architecture-linting-decision.md`](capability-aware-architecture-linting-decision.md).

| Surface | Status | Boundary |
| --- | --- | --- |
| CapabilityArchitectureLintReport artifact | shipped | evaluation only |
| CLI lint command | shipped | writes lint report only |
| findingCandidate | shipped | preview-only payload |
| publication surfacing | deferred | visibility only |

## Rule Evaluation Review

The helper evaluates only `configured` contract rows.
`unmatched` rows are skipped — they surface config drift
in the contract generator, not architecture policy
violations, and carry no policy fields by validator
construction. For each configured row, the helper
resolves the matched phrase-backed capability via
`capabilityRef.phraseCapabilityId`; a missing match
yields one `not-evaluated` row per declared placement
rule (low confidence).

Layer rules compare the phrase-backed capability's
`layer` against the contract's `allowedLayers` /
`forbiddenLayers`. When the phrase-backed capability has
no `layer`, the rule is `not-evaluated` rather than
guessed. System rules are always `not-evaluated` in v1:
`CapabilityMap` v2 phrase-backed capabilities do not yet
carry a deterministic `system` field, and the helper
refuses to invent one. This is the correct conservative
default — a `not-evaluated` row is honest about missing
context, where a `pass` or `violation` would be a
fabricated verdict.

| Rule | V1 Behavior |
| --- | --- |
| configured rows | evaluated |
| unmatched rows | ignored |
| allowed-layer | pass / violation / not-evaluated |
| forbidden-layer | pass / violation / not-evaluated |
| allowed-system | not-evaluated unless deterministic system exists |
| forbidden-system | not-evaluated unless deterministic system exists |
| neighbor rules | deferred |
| preservation rules | deferred |

**Finding:** rule evaluation is sound. The
`not-evaluated` fallback for missing `layer` and for all
system rules prevents the artifact from asserting
verdicts it cannot deterministically justify.

## Preview Finding Boundary

`findingCandidate` appears only on `violation` rows. It
carries a `title`, a `category`
(`capability_architecture_policy`), and a `severity`. It
is a **preview** payload: nothing in v1 reads it, nothing
promotes it, and no `FindingReport` row is authored from
it. The CLI explicitly prints "No findings were written."
and the contract test asserts that the artifact header
`artifactType` is always
`CapabilityArchitectureLintReport`, never `FindingReport`.

**`findingCandidate` is preview-only and does not write
`FindingReport`.** The field exists so a future explicit
bridge slice has a stable shape to consume; it does not
constitute a finding today.

## Governance Mutation Boundary

The lint command and helper touch no governed-findings
artifact. The contract test suite includes dedicated
non-mutation cases that snapshot
`CapabilityContract`, `CapabilityMap`, `FindingReport`,
`FindingLifecycleReport`, and `CoherencyDelta` bytes
before the lint run and assert they are unchanged after,
and that `artifacts validate` stays clean.

**`CapabilityArchitectureLintReport` is evaluation, not
enforcement.** **`CapabilityArchitectureLintReport` does
not mutate `FindingFilterReport`,
`FindingLifecycleReport`, or `CoherencyDelta`.** The
artifact lives under the `findings` storage category for
directory layout only; storage location is not pipeline
membership. `CoherencyDelta` does not read
`CapabilityArchitectureLintReport`, and the finding
filter chain is not bypassed.

| Boundary | Decision |
| --- | --- |
| lint report vs FindingReport | no FindingReport writes |
| lint report vs FindingFilterReport | no filter mutation |
| lint report vs FindingLifecycleReport | no lifecycle mutation |
| lint report vs CoherencyDelta | no remediation mutation |
| lint report vs resolver routing | no routing |
| lint report vs verification planning | no planning |
| lint report vs source writes | no writes |

## Resolver / Verification Boundary

**`CapabilityArchitectureLintReport` does not implement
resolver routing, verification planning,
`RefactorPreservationContract`, or source writes.** The
helper holds no `write:source` permission, performs no
filesystem reads of the working tree, and emits no
`VerificationPlan` / `WorkOrder` / `ResolverPacket`.
`requiredChecks` is reserved as a row kind but is not
evaluated in v1 — the verification pipeline remains a
separate, opt-in surface. Capability-based resolver
routing remains gated on a future finding/policy
boundary decision.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare v1 safe/stable evaluation artifact | selected | isolated artifact + strict boundaries |
| publication surfacing next | selected | operators need visibility |
| finding bridge next | rejected/deferred | needs surfacing + safety first |
| resolver routing next | rejected | needs finding/policy boundary first |

## Recommendation

Declare `CapabilityArchitectureLintReport` v1 safe /
stable as a separate evaluation artifact. Proceed to
**publication surfacing** as the next slice: render the
lint report summary, violations, and not-evaluated rows
read-only in the architecture summary and agent contract
publications, mirroring the read-only-visibility model
already proven for `CapabilityContract` publication
surfacing. **The next slice may surface
`CapabilityArchitectureLintReport` in publications, but
must not bridge to findings yet.**

## What This Does Not Do

This memo is strategy only. It does not change runtime
behavior, does not modify the lint artifact / helper /
CLI, does not add publication surfacing, does not add a
`FindingReport` bridge, does not add
`FindingFilterReport` / `FindingLifecycleReport` /
`CoherencyDelta` integration, does not add resolver
routing or verification planning, does not add
`RefactorPreservationContract`, does not add source
writes, does not use LLM inference, does not publish to
npm, and does not bump versions.

## Follow-Up Work

Deferred, each gated on its own decision + safety review
pair where applicable:

- lint row → `FindingReport` bridge (explicit decision
  memo first).
- finding lifecycle integration.
- `CoherencyDelta` / remediation-queue integration.
- resolver routing by capability.
- verification planning by capability (promotion of
  `requiredChecks`).
- deterministic `system` attribution on phrase-backed
  capabilities (un-defers `allowed-system` /
  `forbidden-system` evaluation).
- neighbor + preservation rule evaluation.
- `RefactorPreservationContract` (layer 7).
- source writes.

## Cross-References

- [Capability-Aware Architecture Linting Decision](capability-aware-architecture-linting-decision.md)
  — thirty-seventh slice; selects Option B.
- [`CapabilityArchitectureLintReport` artifact](../artifacts/capability-architecture-lint-report.md)
  — thirty-eighth slice; v1 implementation.
- [Capability-Aware Architecture Linting concept](../concepts/capability-aware-architecture-linting.md)
- [`CapabilityContract` artifact](../artifacts/capability-contract.md)
- [`CapabilityContract` concept](../concepts/capability-contracts.md)
- [`CapabilityContract` publication safety review](capability-contract-publication-safety-review.md)
  — the read-only-audit model this memo reuses.
- [Graph-aware finding filters concept](../concepts/graph-aware-finding-filters.md)
- [Coherency delta concept](../concepts/coherency-delta.md)
- [Roadmap](roadmap.md)
- [Classic behavior roadmap](classic-behavior-roadmap.md)
