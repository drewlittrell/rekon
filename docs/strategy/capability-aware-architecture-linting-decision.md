# Capability-Aware Architecture Linting Decision

**Slice:** thirty-seventh on the capability-ontology
track.

**Scope:** strategy / architecture decision memo only.
This memo decides the artifact boundary, finding
relationship, severities, confidence model, and safety
constraints for capability-aware architecture linting.
No linting implementation, no finding emission, no
resolver routing, no verification planning, no source
writes ship in this slice.

> **Status update (thirty-eighth slice — shipped).**
> `CapabilityArchitectureLintReport` v1 has shipped per
> Option B. Artifact, validator, producer, and
> `rekon capability lint architecture` CLI all land in
> the thirty-eighth slice. The v1 implementation honors
> every pinned boundary in this memo: no
> `FindingReport` mutation, no
> `FindingFilterReport`/`FindingLifecycleReport`/
> `CoherencyDelta` mutation, no resolver routing, no
> verification planning, no `RefactorPreservationContract`,
> no source writes, no LLM-only inference. See
> [../artifacts/capability-architecture-lint-report.md](../artifacts/capability-architecture-lint-report.md)
> and
> [../concepts/capability-aware-architecture-linting.md](../concepts/capability-aware-architecture-linting.md).

> **Status update (thirty-ninth slice — shipped).**
> The
> [`CapabilityArchitectureLintReport` safety review](capability-architecture-lint-report-safety-review.md)
> audited the v1 implementation end-to-end and declared
> it **safe / stable as a separate evaluation
> artifact**. It confirms the evaluation-vs-enforcement
> boundary holds, that `findingCandidate` is
> preview-only, and that no governance artifact is
> mutated. Recommended next slice:
> `CapabilityArchitectureLintReport` **publication
> surfacing** (read-only visibility) — the finding
> bridge stays deferred to its own decision + safety
> review pair.

> **Status update (fortieth slice — shipped).**
> `CapabilityArchitectureLintReport` **publication
> surfacing** has shipped. The architecture summary and
> agent contract render a read-only `Capability
> Architecture Linting` section sourced from the latest
> lint report. Surfacing is read-only visibility only:
> no `FindingReport` write, no
> `FindingFilterReport`/`FindingLifecycleReport`/
> `CoherencyDelta` mutation, no resolver routing, no
> verification planning, no source writes;
> `findingCandidate` stays preview-only; proof-report
> surfacing is deferred. Recommended next slice:
> `CapabilityArchitectureLintReport` publication safety
> review.

> **Status update (forty-first slice — shipped).**
> The
> [`CapabilityArchitectureLintReport` publication safety
> review](capability-architecture-lint-publication-safety-review.md)
> declared the publication surfacing **safe / stable as
> read-only visibility**. The read-only boundary holds,
> `findingCandidate` stays preview-only, and proof-report
> surfacing remains deferred. **Finding-bridge decision
> work may now begin.** Recommended next slice:
> `CapabilityArchitectureLintReport` → `FindingReport`
> **bridge decision** — decide whether/how selected lint
> rows become governed findings. Bridge implementation,
> lifecycle / `CoherencyDelta` mutation, resolver
> routing, verification planning, and source writes stay
> deferred to that decision + its own safety review.

## Decision Summary

**Select Option B: emit a separate
`CapabilityArchitectureLintReport` artifact from
`CapabilityContract` + `CapabilityMap` v2.** The lint
artifact preserves the boundary between policy
evaluation (placement / system rules) and governed
findings (`FindingReport`, `FindingLifecycleReport`,
`CoherencyDelta`). It lets operators inspect
capability-policy violations as a first-class artifact
before any decision to promote selected rows into
findings or remediation.

V1 scope (when the next slice ships): evaluate
`allowedLayers` / `forbiddenLayers` / `allowedSystems` /
`forbiddenSystems` over the **configured** rows of the
latest `CapabilityContract`. `requiredChecks` may
optionally surface as `not-evaluated` / `unverified`
rows. `requiredNeighbors`, `forbiddenNeighbors`, and
`preservationRules` evaluation is deferred — those
need richer graph / proof semantics that haven't
shipped yet.

Pinned verbatim:

- Capability-aware architecture linting is evaluation,
  not source mutation.
- `CapabilityArchitectureLintReport` is not
  `FindingReport` in v1.
- `CapabilityArchitectureLintReport` does not mutate
  `FindingLifecycleReport` or `CoherencyDelta`.
- `CapabilityArchitectureLintReport` does not
  implement resolver routing or verification planning.
- Only a later explicit bridge may promote lint rows
  into governed findings.

**Recommended next slice:**
`CapabilityArchitectureLintReport` v1 — register the
artifact in `@rekon/kernel-repo-model` + SDK +
runtime, implement the evaluation helper, and ship a
CLI. No `FindingReport` mutation, no
`FindingLifecycleReport` mutation, no `CoherencyDelta`
mutation, no resolver routing, no verification
planning, no source writes.

## Why This Decision Exists

The thirty-sixth slice
([CapabilityContract publication safety review](capability-contract-publication-safety-review.md))
declared `CapabilityContract` publication surfacing
safe / stable as read-only visibility and selected
this decision as the next slice. Without this memo,
the natural next step — "make the contract do
something" — has at least five plausible shapes, each
with very different blast radius:

1. **No linting at all** — leaves the contract a
   read-only document.
2. **Separate lint artifact** — preserves the
   policy / finding boundary.
3. **Emit findings directly** — turns every
   placement disagreement into a governed item the
   moment the contract ships.
4. **Emit remediation directly** — skips the
   finding lifecycle entirely.
5. **Resolver routing first** — has the contract
   shape resolver behavior before linting ships.

Shipping any of these without a decision risks
freezing an enforcement shape the operator hasn't
reviewed. This memo pins the shape so the next
implementation slice has a clear contract.

## Current Boundary

`CapabilityContract` already pins these invariants
(verbatim across the architecture decision, the v1
safety review, the publication safety review, and the
publication surfacing artifact doc):

- `CapabilityContract` is policy, not projection or
  enforcement.
- `CapabilityMap` v2 remains projection.
- v1 emits `configured` and `unmatched` rows only;
  `suggested` remains reserved.
- v1 does not implement architecture linting,
  resolver routing, verification planning, source
  writes, or `RefactorPreservationContract`
  behavior.
- Publication surfacing is read-only visibility.

This decision crosses **into** evaluation — for the
first time on the capability-ontology track — but it
crosses only as far as a new artifact. It does **not**
cross into finding emission, finding lifecycle
mutation, remediation, routing, verification, or
source writes. Each of those remains a separate
decision + safety review pair.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| no architecture linting | rejected/deferred | CapabilityContract should eventually be evaluated |
| separate lint report first | selected | preserves evaluation/governance boundary |
| emit FindingReport directly | rejected | bypasses review of new policy signal |
| emit CoherencyDelta directly | rejected | skips finding lifecycle |
| resolver routing first | rejected/deferred | routing should wait for reviewed lint/finding boundary |

**Option A — no architecture linting** keeps the
contract visibility-only. Rejected / deferred:
visibility is the right shape *today*, but operator
intent is that the contract eventually evaluates
placement. Leaving the contract permanently
visibility-only would freeze it as documentation, not
as a substrate for the architecture-linting track the
roadmap commits to.

**Option B — separate lint report first** *(selected)*.
A new `CapabilityArchitectureLintReport` artifact
consumes the latest `CapabilityContract` + the latest
`CapabilityMap` v2 and emits an evaluation. Operators
read it the same way they read other diagnostic
artifacts: in isolation, without it triggering
remediation, without it changing finding lifecycle.
This is the only option that preserves all six
boundary statements (see the boundary table) without
deferring the evaluation step.

**Option C — emit `FindingReport` findings
directly.** Rejected for v1. Going straight to
governed findings would skip the operator-review
checkpoint that every previous policy / projection
artifact has earned, and it would invite the proof
loop, lifecycle ledger, and coherency delta to track
items the operator hasn't yet decided are worth
governing. A future explicit bridge (with its own
decision + safety review) can promote selected lint
rows into findings.

**Option D — emit `CoherencyDelta` remediation
directly.** Rejected. Worse than Option C: skips
finding lifecycle and adjudication entirely.
`CoherencyDelta` exists to track remediation against
governed issues; surfacing capability-policy
violations there without ever passing through finding
review would short-circuit the governance contract.

**Option E — use `CapabilityContract` for resolver
routing first.** Rejected / deferred. Routing is a
separate downstream decision; it should consume
*reviewed* signals (lint rows that have passed
through an explicit bridge into findings). Routing
before linting collapses two decisions into one and
gives resolvers an unreviewed policy signal.

## Recommendation

**Select Option B.** Implement
`CapabilityArchitectureLintReport` v1 as the
recommended next slice. The artifact records
evaluation results; the decision to promote selected
rows into `FindingReport` is its own future slice
with its own safety review.

## Lint Artifact Model

Sketch only — **do not implement in this slice**.

```ts
type CapabilityArchitectureLintStatus =
  | "violation"
  | "pass"
  | "not-evaluated";

type CapabilityArchitectureLintRule =
  | "allowed-layer"
  | "forbidden-layer"
  | "allowed-system"
  | "forbidden-system"
  | "required-check"
  | "required-neighbor"
  | "forbidden-neighbor"
  | "preservation-rule";

type CapabilityArchitectureLintReport = {
  header: ArtifactHeader;
  source: {
    capabilityContractRef: ArtifactRef;
    capabilityMapRef: ArtifactRef;
  };
  summary: {
    total: number;
    violations: number;
    passes: number;
    notEvaluated: number;
    byRule: Record<string, number>;
    bySeverity: Record<string, number>;
  };
  rows: Array<{
    id: string;
    contractId: string;
    phraseCapabilityId: string;
    rule: CapabilityArchitectureLintRule;
    status: CapabilityArchitectureLintStatus;
    severity: "low" | "medium" | "high";
    confidence: "high" | "medium" | "low";
    message: string;
    evidenceRefs: ArtifactRef[];
    findingCandidate?: {
      title: string;
      category: string;
      severity: "low" | "medium" | "high";
    };
  }>;
};
```

**Naming.** `CapabilityArchitectureLintReport` is the
selected name. The alternative
`CapabilityContractEvaluationReport` was considered
but rejected: the artifact evaluates architectural
placement rules specifically, not all possible
contract semantics (which would include preservation
rules, neighbor rules, and required checks once those
land).

**Row scope.** v1 should emit rows only for
**configured** `CapabilityContract` entries. Unmatched
contract rows can appear in the summary section but
must not produce `violation` rows — by definition
they don't have a v2 capability to violate placement
against.

**`findingCandidate` field.** Present in the shape
above but only as **diagnostic context**, not as a
promotion signal. v1 may omit it; it is reserved for
the future finding bridge slice so when that bridge
ships, a row can carry the proposed finding shape
without re-deriving it.

## V1 Scope

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

**In scope (v1).** Layer / system placement rules.
These can be evaluated deterministically from the
data already in `CapabilityContract` (placement
fields) and `CapabilityMap` v2 (phrase-backed
capabilities' `layer` and the matching
`ObservedSystem.layers` / `OwnershipMap` entries). No
new evidence shape, no new graph traversal, no source
file reads.

**Optional (v1).** `requiredChecks` surfacing —
emitted with `status: "not-evaluated"` (or
`"unverified"` if the producer can confirm the check
exists in the latest `VerificationPlan` but has not
run). Not a violation, not a pass. Useful as
visibility so operators can see *which* required
checks the contract pinned without the producer
claiming pass/fail. May be omitted entirely from v1
if the implementer prefers a tighter v1 surface.

**Deferred.** Neighbor evaluation
(`requiredNeighbors`, `forbiddenNeighbors`) needs
richer graph semantics — it requires per-capability
adjacency analysis that `CapabilityMap` v2 doesn't
project today. Preservation rules
(`preservationRules`) need refactor-phase semantics
that `RefactorPreservationContract` will eventually
provide. `requiredChecks` pass/fail validation needs
verification-result integration that crosses into
the verify track. Each of these deferrals is a
separate decision + safety review pair before any
implementation lands.

## Severity And Confidence Policy

Suggested v1 defaults (the next slice may refine):

| Rule outcome | Severity | Confidence |
| --- | --- | --- |
| `forbiddenLayer` violation | high | high |
| `allowedLayer` violation | high | high |
| `forbiddenSystem` violation | high | high |
| `allowedSystem` violation | high | high |
| `requiredChecks` missing (if surfaced) | medium | medium |
| `not-evaluated` row (any rule) | low or medium | low |

**Floor for confidence.** When evidence is missing or
the v2 phrase-backed capability lacks a `layer`
field, the implementer must emit `status:
"not-evaluated"` with `confidence: "low"` rather than
guess. No `violation` row may be emitted at
`confidence: "low"` — that combination is a contract
bug to be caught by the validator in the
implementation slice.

**Why severity defaults to high for placement
violations.** Placement rules are operator-authored,
explicit, and exact (the matched v2 capability either
agrees on `layer` / `system` or it doesn't). When
the producer emits a violation it has evidence;
giving it `medium` severity would understate the
operator's intent. If a future cohort dogfood shows
this over-emits, the next-slice safety review can
tighten the default.

## Finding Bridge Boundary

| Boundary | Decision |
| --- | --- |
| lint report vs source mutation | no source writes |
| lint report vs FindingReport | separate artifact first |
| lint report vs FindingLifecycleReport | no status mutation |
| lint report vs CoherencyDelta | no remediation mutation |
| lint report vs resolver routing | no routing |
| lint report vs verification planning | no planning |

**The hard boundary.** `CapabilityArchitectureLintReport`
in v1 is a *new artifact*; it does not write
`FindingReport`, does not mutate
`FindingLifecycleReport`, does not mutate
`CoherencyDelta`, does not create `WorkOrder`
artifacts, does not generate `VerificationPlan`
artifacts, does not invoke the resolver track, and
does not touch source files.

**The future bridge.** When (and only when) a future
slice ships an explicit `CapabilityArchitectureLintReport
→ FindingReport` bridge — with its own decision memo +
safety review pair — selected lint rows may be
promoted into governed findings. The bridge must
explicitly answer at least these questions:

| Future Bridge | Requirement |
| --- | --- |
| lint row → FindingReport | explicit decision + safety review |
| lint row → WorkOrder | after finding lifecycle bridge |
| lint row → VerificationPlan | after task/work-order boundary |
| lint row → resolver routing | after policy/finding boundary |

- Which lint rules promote (almost certainly a
  subset of v1 rules, not all).
- What `category` / `title` shape the promoted
  finding carries (the
  `findingCandidate` field in the lint row was
  reserved for this; the bridge may use it or
  override it).
- How filter-policy interacts (the bridge must
  emit through the existing finding-filter chain,
  not bypass it).
- How `FindingLifecycleReport` and `CoherencyDelta`
  see the new finding source.
- How the resolver track (if it ever consumes
  capability-aware findings) gates on operator
  review.

None of these answers ship in v1. They ship in their
own decision slices.

## Future Consumers

Each consumer is a separate future slice with its own
decision + safety review pair:

- **Finding bridge.** `CapabilityArchitectureLintReport
  → FindingReport` promotion (above).
- **Architecture linting in CI.** A future GitHub
  Check / PR comment surface that renders lint rows
  the same way the current verification publishers
  do. Read-only by default; no auto-promotion.
- **Resolver routing.** Resolvers consume promoted
  findings (post-bridge), not raw lint rows. The
  routing decision is its own slice.
- **Verification planning by capability.** Plans
  consume promoted findings; the verification
  decision is its own slice.
- **Semantic impact analysis.** Cross-capability
  impact view (e.g. "which capabilities does this
  PR touch and which contracts apply?"). Its own
  slice.
- **`RefactorPreservationContract`.** Captures
  refactor-phase obligations. Consumes preservation
  rules from `CapabilityContract` *and*
  preservation outcomes from
  `CapabilityArchitectureLintReport`. Its own
  decision + safety review pair.

## What This Does Not Do

This batch is a decision memo. Specifically:

- No source file under `packages/` is modified.
- No artifact validator, helper, or CLI command is
  modified.
- No new artifact type is registered in the SDK or
  runtime.
- No new permission is registered.
- No publication surface is modified.
- No `FindingReport`, `FindingLifecycleReport`,
  `CoherencyDelta`, or `WorkOrder` mutation.
- No `CapabilityContract`, `CapabilityMap`,
  `CapabilityPhraseReport`, or `EvidenceGraph`
  mutation.
- No `.rekon/capability-contracts.json` mutation.
- No resolver routing by capability.
- No verification planning by capability.
- No `RefactorPreservationContract`.
- No architecture linting implementation.
- No source writes.
- No LLM-only inference.
- No npm publish. No version bump.

## Implementation Sequence

| Step | Slice | Status |
| --- | --- | --- |
| 1 | **Capability-aware architecture linting decision (this memo)** | ✅ Shipped (thirty-seventh slice) |
| 2 | `CapabilityArchitectureLintReport` v1 — register artifact in `@rekon/kernel-repo-model` + SDK + runtime; add evaluation helper for `allowed/forbidden Layers/Systems`; add CLI. No `FindingReport` mutation. | next slice |
| 3 | `CapabilityArchitectureLintReport` v1 safety review | gated on step 2 |
| 4 | `CapabilityArchitectureLintReport` publication surfacing — architecture summary + agent contract; read-only; carries new `Do Not Do` reminders | gated on step 3 |
| 5 | `CapabilityArchitectureLintReport` publication safety review | gated on step 4 |
| 6 | Lint row → `FindingReport` bridge decision memo (this is the first enforcement-adjacent decision after the lint artifact ships) | gated on step 5 |
| 7 | Lint row → `FindingReport` bridge implementation | gated on step 6 |
| 8 | Lint row → `WorkOrder` / `VerificationPlan` / resolver routing decision memos — each its own decision + safety review pair | gated on step 7 |
| 9 | `RefactorPreservationContract` architecture decision | gated on step 8 |

Parallel polish lanes (independent of the lint
track):

- **Operator polish on `CapabilityContract`
  publication surfacing** — per-row links to source
  files, per-row links to consumed v2 entries. Can
  ship any time without blocking the lint track.
- **Cohort dogfood on `CapabilityContract`** — run
  the publications against external cohort targets
  and capture operator reactions. Parallel to the
  lint v1 implementation.

## Cross-References

- [`CapabilityContract` Architecture Decision](capability-contract-architecture-decision.md)
  — thirty-second slice; pins the policy /
  projection boundary.
- [`CapabilityContract` v1 Safety Review](capability-contract-v1-safety-review.md)
  — thirty-fourth slice; declares the artifact
  safe / stable.
- [`CapabilityContract` Publication Safety Review](capability-contract-publication-safety-review.md)
  — thirty-sixth slice; declares publication
  surfacing safe / stable and selects this
  decision as the next slice.
- [`CapabilityContract` artifact reference](../artifacts/capability-contract.md)
- [`CapabilityContract` concept doc](../concepts/capability-contracts.md)
- [`CapabilityMap` artifact reference](../artifacts/capability-map.md)
- [Capability Ontology concept](../concepts/capability-ontology.md)
- [Graph-aware finding filters concept](../concepts/graph-aware-finding-filters.md)
  — where lint rows would eventually flow through if
  the finding bridge ever ships.
- [CoherencyDelta concept](../concepts/coherency-delta.md)
  — explicitly **not** consumed by v1.

## Status

Decision recorded. Recommendation: ship
`CapabilityArchitectureLintReport` v1 as the next
slice (artifact registration + evaluation helper +
CLI; no `FindingReport` mutation; no
`FindingLifecycleReport` mutation; no
`CoherencyDelta` mutation; no resolver routing; no
verification planning; no source writes).
