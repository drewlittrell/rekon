# CapabilityContract Architecture Decision

**Status:** decision recorded.
**Slice:** `capability-contract-architecture-decision`.
**Sequence position:** Thirty-second slice on the
capability-ontology track. Follows the
[CapabilityMap v2 Publication Safety Review](capability-map-v2-publication-safety-review.md)
(thirty-first slice), which un-deferred the
`CapabilityContract` architecture-decision step.

## Decision Summary

**Recommendation: Option B — `CapabilityContract`
is an artifact-backed policy layer generated from
config + `CapabilityMap` v2.** Operator-authored
configuration at `.rekon/capability-contracts.json`
expresses policy (allowed layers / systems,
forbidden layers / systems, required checks,
required / forbidden neighbouring capabilities,
preservation rules). Rekon emits a
`CapabilityContract` artifact that records the
effective contract for the current repo state,
citing the latest `CapabilityMap` v2 and (when
available) `CapabilityPhraseReport`. The artifact
publishes `configured` and `unmatched` rows in v1;
`suggested` rows are deferred to a future
suggestion / review workflow.

**Pinned verbatim (asserted by docs test):**

- **`CapabilityContract` is policy, not
  projection.**
- **`CapabilityMap` v2 remains projection and must
  not grow policy fields.**
- **`CapabilityContract` does not implement
  architecture linting by itself.**
- **`CapabilityContract` does not implement
  resolver routing by capability.**
- **`CapabilityContract` does not implement
  verification planning by capability.**
- **`CapabilityContract` does not implement source
  writes.**
- **`RefactorPreservationContract` remains
  phase-specific and comes later.**

This memo is a **strategy / architecture decision
only**. It commits to the contract shape, the
boundary against `CapabilityMap` v2 /
`CapabilityPhraseReport` /
`RefactorPreservationContract`, the missing-config
default, and the deferred-consumer list. It does
**not** register the artifact, ship a producer or
helper, or modify any runtime behaviour. The
implementation lands in the next slice
(`CapabilityContract` v1).

## Why This Decision Exists

`CapabilityMap` v2 now projects stable
phrase-backed capabilities, the architecture
summary and agent contract publications surface
them, and the
[publication safety review](capability-map-v2-publication-safety-review.md)
confirmed the projection layer is safe / stable
and bounded. The next capability-ontology question
is **what comes after projection**.

Projection answers "what capabilities exist." It
does **not** answer:

- *Where* may a capability live? (allowed /
  forbidden layers, allowed / forbidden systems)
- *What proof* must hold when a capability
  changes? (required checks)
- *Which neighbouring capabilities* must coexist
  or must not coexist? (required / forbidden
  neighbours)
- *What semantics* must be preserved if a
  capability is refactored? (preservation rules)

Those are **policy** questions. They require
operator authorship (no inference) and an
artifact-level audit trail (so policy state is
diffable across runs).

Today there is no policy layer. Surfaces that need
one — architecture linting, resolver routing by
capability, verification planning by capability,
semantic impact analysis, refactor preservation
— have no safe artifact to consume. This memo
defines the artifact so those surfaces can be
decided incrementally without inventing policy as
each lands.

Three surfaces converge on this decision:

1. The
   [CapabilityMap v2 Publication Safety Review](capability-map-v2-publication-safety-review.md)
   selected `CapabilityContract` architecture
   decision as the next slice. It already pinned
   the projection / policy split and named the
   overclaim risks v2 must not enable.
2. The
   [Capability Phrase Contract Architecture Decision](capability-phrase-contract-architecture-decision.md)
   (twentieth slice) reserved
   `CapabilityContract` as the future policy
   layer.
3. The classic codebase-intel intent surface
   (purpose-preserving refactor planning,
   capability contracts / drift reports,
   architecture invariants, intent gates,
   verification contracts) maps cleanly to
   `CapabilityContract`'s scope, but classic
   never separated projection from policy
   cleanly — this decision keeps the layers
   distinct.

## Current Boundary

The capability-ontology layers, as they stand:

| Layer | Responsibility |
| --- | --- |
| `CapabilityPhraseReport` | semantic purpose projection |
| `CapabilityMap` v2 | stable capability projection |
| `CapabilityContract` | placement / proof / preservation policy |
| `RefactorPreservationContract` | phase-specific refactor obligations |

`CapabilityNormalizationReport` (translation
audit) sits below `CapabilityPhraseReport`.
`EvidenceGraph` sits below normalization. Every
layer above projection is policy or process; every
layer below is evidence or audit.

`CapabilityContract` is **the** policy layer.
Architecture linting, resolver routing by
capability, and verification planning by capability
sit **above** `CapabilityContract` and consume it.
`RefactorPreservationContract` is a phase-specific
extension that lives alongside `CapabilityContract`
and inherits its preservation rules during refactor
work.

The boundary is sharp:

- `CapabilityMap` v2 must not gain `allowedLayers`,
  `forbiddenLayers`, `requiredChecks`,
  `requiredNeighbors`, `forbiddenNeighbors`, or
  `preservationRules` fields. Adding any of these
  to v2 would blur projection and policy. The
  publication safety review already pinned this
  separation; this memo restates it.
- `CapabilityContract` must not gain
  evidence-graph re-extraction, candidate
  normalization, or phrase projection. Those
  belong in upstream layers.
- `CapabilityContract` must not perform writes
  (architecture lint mutations, resolver routing
  apply, verification plan generation, refactor
  preservation enforcement, source writes). Those
  are downstream consumer responsibilities.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| reserve name only | rejected/deferred | boundary is clear enough to model |
| config + artifact effective contract | selected | operator policy plus artifact audit |
| artifact-only inferred contract | rejected | projection would become policy |
| add policy fields to CapabilityMap | rejected | blurs projection and policy |
| only inside RefactorPreservationContract | rejected | policy should exist before refactor phase |

**Option A — reserve name only.** Reserve
`CapabilityContract` and defer config / artifact
model design. Rejected because the boundary
against `CapabilityMap` v2 is now clear, the
publication safety review names the overclaim
risks v2 must not enable, and the classic
codebase-intel intent surface already maps to
contract semantics. Continuing to defer would
leave consumers (architecture linting, resolver
routing, verification planning) without a target
shape to plan against.

**Option B — config + artifact effective
contract.** *Selected.* Operator-authored
configuration at `.rekon/capability-contracts.json`
defines policy; Rekon emits a `CapabilityContract`
artifact that records the effective contract for
the current repo state by joining config against
the latest `CapabilityMap` v2. This preserves
operator policy control (no inference becomes
binding) **and** gives every downstream consumer a
diffable, citable artifact to read.

**Option C — artifact-only inferred contract.**
Rekon infers contracts directly from
`CapabilityMap` v2 without operator config.
Rejected because it converts projection into
policy without operator approval. Operators have
no way to disable a bad inference, no way to
encode repo-specific intent, and no audit trail
showing why a contract row exists. Inference
without operator gate also collapses the
projection / policy boundary the publication
safety review just confirmed.

**Option D — `CapabilityMap` grows policy
fields.** Add `allowedLayers`,
`forbiddenLayers`, `requiredChecks`,
`requiredNeighbors`, `forbiddenNeighbors`,
`preservationRules` to `CapabilityMap` v2
directly. Rejected because it blurs the
projection and policy layers in a single artifact,
breaks the publication safety review's pinned
"projection context, not policy" statement, and
violates the
[CapabilityMap v2 High-Confidence-Only Decision](capability-map-v2-high-confidence-decision.md)'s
"additive only" guarantee (the new fields would
mean different things to v1 vs v2 consumers and
the validator would have to gain policy-shaped
rules).

**Option E — `CapabilityContract` only inside
`RefactorPreservationContract`.** Skip a
persistent policy layer; only create contracts
during refactor work. Rejected because placement /
proof rules should exist **before** a refactor
phase starts. An architecture-lint rule, for
example, has to be checkable at the head of every
PR — not only during a deliberate refactor.
`RefactorPreservationContract` is a phase-specific
extension that inherits from
`CapabilityContract`; the two are not the same
layer.

## Recommendation

Ship `CapabilityContract` as **Option B** —
artifact-backed policy layer generated from
operator config + `CapabilityMap` v2 — in a
sequence of small, audit-friendly slices:

1. **`CapabilityContract` v1 implementation**
   (next slice). Strategy-track product slice.
   Add the type definition to
   `@rekon/kernel-repo-model`, register the
   artifact type in the SDK + runtime, ship a
   producer that reads `.rekon/capability-contracts.json`
   and the latest `CapabilityMap` v2 and emits the
   effective contract artifact. Emits only
   `configured` + `unmatched` rows. No
   `suggested`. No CLI commands beyond `rekon
   refresh` re-projecting. No linting / routing /
   verification / writes.
2. **`CapabilityContract` safety review.**
   Read-only audit of the v1 producer + artifact
   shape, on the same pattern as the
   `CapabilityMap` v2 safety reviews.
3. **`CapabilityContract` publication surfacing.**
   Architecture summary and agent contract
   publications render the configured contracts
   as policy context (read-only). Carries
   `Do Not Do` reminders covering all the
   downstream consumer overclaim risks.
4. **`CapabilityContract` publication safety
   review.**
5. **Downstream-consumer decision memos**
   (architecture linting, resolver routing by
   capability, verification planning by
   capability) — gated on (1)–(4).
6. **`RefactorPreservationContract` decision**
   — gated on (5).

Each step ships its own decision memo or safety
review before runtime work lands. Skipping any
step means the next step has no safe artifact /
boundary to consume.

## Config Model

**Sketch only. Not implemented in this slice.**

Recommended config path:

```
.rekon/capability-contracts.json
```

Example:

```json
{
  "version": "0.1.0",
  "contracts": [
    {
      "id": "billing.invoice-preview",
      "match": {
        "verb": "compute",
        "noun": "invoice-preview",
        "domain": "billing"
      },
      "allowedLayers": ["domain", "service"],
      "forbiddenLayers": ["route", "ui"],
      "allowedSystems": ["billing", "pricing"],
      "requiredChecks": ["npm run test -- pricing"],
      "requiredNeighbors": [
        { "verb": "validate", "noun": "coupon" }
      ],
      "forbiddenNeighbors": [
        { "verb": "capture", "noun": "payment" }
      ],
      "preservationRules": [
        "Preserve tax rounding behavior.",
        "Preserve expired-coupon rejection semantics."
      ]
    }
  ]
}
```

**Rules:**

- **Missing config is allowed.** A repo with no
  `.rekon/capability-contracts.json` emits a
  `CapabilityContract` artifact whose `contracts`
  array is empty (and `summary.configured === 0`).
  No inference fills the gap.
- **No inferred contract becomes binding without
  config or explicit generated-review status.**
  Future generated suggestions may propose
  contract config, but do not auto-apply. A
  `suggested` row in the artifact (when that
  workflow ships) carries the same operator-gate
  semantics as a
  `CapabilityOntologySuggestionReport` row: it is
  preview-only until the operator copies it into
  the config file.
- **The `match` block is conjunctive.** A
  contract matches a v2 phrase-backed capability
  when all of `verb`, `noun`, and any populated
  `domain` / `pattern` / `layer` fields agree.
  Capabilities that don't match any contract are
  recorded as `unmatched` rows (visibility only).
- **Operators authorise every binding rule.**
  Rekon never writes the config file. The
  ontology-suggestion pattern applies.

## Artifact Model

**Sketch only. Not implemented in this slice.**

```ts
type CapabilityContractPolicyStatus =
  | "configured"
  | "suggested"
  | "unmatched";

type CapabilityContract = {
  header: ArtifactHeader;

  source: {
    configPath?: string;
    configHash?: string;
    capabilityMapRef: ArtifactRef;
    phraseReportRef?: ArtifactRef;
  };

  summary: {
    total: number;
    configured: number;
    suggested: number;
    unmatched: number;
    withRequiredChecks: number;
    withPlacementRules: number;
    withPreservationRules: number;
  };

  contracts: Array<{
    id: string;
    capabilityRef: {
      capabilityMapRef: ArtifactRef;
      phraseCapabilityId: string;
    };
    match: {
      verb: string;
      noun: string;
      domain?: string;
      pattern?: string;
      layer?: string;
    };
    status: CapabilityContractPolicyStatus;
    allowedLayers?: string[];
    forbiddenLayers?: string[];
    allowedSystems?: string[];
    forbiddenSystems?: string[];
    requiredChecks?: string[];
    requiredNeighbors?: Array<{ verb: string; noun: string }>;
    forbiddenNeighbors?: Array<{ verb: string; noun: string }>;
    preservationRules?: string[];
    messages?: string[];
  }>;
};
```

**V1 implementation guarantees:**

- v1 emits only `configured` and `unmatched`
  rows. `suggested` is deferred until a separate
  suggestion / review workflow ships.
- Every `configured` row carries
  `capabilityRef.capabilityMapRef` (the consumed
  `CapabilityMap` artifact) and
  `capabilityRef.phraseCapabilityId` (the
  `CapabilityMap.phraseBackedCapabilities[i].id`
  it matched). The citation chain runs back
  through `phraseRef.report` and
  `evidenceRefs[]` exactly as v2 entries do.
- `header.inputRefs` includes the consumed
  `CapabilityMap` ref and (when present) the
  `CapabilityPhraseReport` ref.
- Manifest carries a new invalidation rule
  `capability-contracts.changed` consuming the
  config file (`.rekon/capability-contracts.json`)
  and a `capability-map.changed` rule consuming
  `CapabilityMap`.
- No new permission. No `write:source`. No
  `write:rules`. The producer holds
  `read:artifacts` + `write:artifacts` only.
- Validator enforces: at least one of the
  policy fields populated for `configured` rows;
  no policy fields populated for `unmatched`
  rows; `phraseCapabilityId` non-empty;
  `capabilityMapRef` valid.

## CapabilityMap Boundary

**`CapabilityMap` v2 remains projection and must
not grow policy fields.**

The contract layer is **separate** from the
projection layer. `CapabilityMap` v2's role —
publishing the high-confidence subset of
`CapabilityPhraseReport` into a stable canonical
shape — is fixed. The
[CapabilityMap v2 Safety Review](capability-map-v2-safety-review.md)
already enumerated the eligibility filter, the
citation chain, and the freshness model.
`CapabilityContract` consumes that surface
**unchanged**.

What changes:

- `CapabilityContract` matches against
  `CapabilityMap.phraseBackedCapabilities[i]`
  entries by `verb` / `noun` (and optional
  qualifier fields). The contract artifact
  records the matched `phraseCapabilityId` in
  `contracts[i].capabilityRef.phraseCapabilityId`.
- `CapabilityContract` cites the consumed
  `CapabilityMap` in `header.inputRefs` and in
  `source.capabilityMapRef`. Freshness is driven
  by `CapabilityMap`'s digest changing.

What does **not** change:

- `CapabilityMap` v2's shape, eligibility
  filter, validator, producer, or publication
  surfacing.
- `CapabilityPhraseReport`'s shape, eligibility
  filter, validator, or producer.
- `CapabilityNormalizationReport`'s shape or
  validator.
- The runtime / SDK / kernel-repo-model package
  surface (until the v1 implementation slice).

The agent contract `Do Not Do` reminder will gain
a new line in the implementation slice
prohibiting agents from inferring contract
behaviour from `CapabilityMap` v2 directly when no
contract artifact exists. Until that reminder
ships, the existing v2 reminder
("`CapabilityMap` v2 phrase-backed capabilities
are stable capability projection; they are not
placement policy, ownership policy, or
source-write authority") covers the gap.

## RefactorPreservationContract Boundary

**`RefactorPreservationContract` remains
phase-specific and comes later.**

`CapabilityContract` carries
`preservationRules` because operators need a
place to write **standing** preservation
requirements (e.g. "preserve tax rounding
behavior"). Those rules sit on the contract
artifact at all times — even when no refactor is
underway — so architecture linting and
verification planning can read them.

`RefactorPreservationContract` (still deferred)
is the phase-specific layer that **extends**
`CapabilityContract` during refactor work:

- It binds a specific refactor work-order to a
  set of contracts.
- It records the behaviour the refactor must
  preserve (regression tests added, specific
  inputs / outputs pinned, performance
  envelopes).
- It expires when the refactor lands.

The two are distinct:

| Aspect | `CapabilityContract` | `RefactorPreservationContract` |
| --- | --- | --- |
| Lifetime | persistent (per repo) | phase-specific (per refactor) |
| Trigger | config + `CapabilityMap` change | refactor work order |
| Scope | all capabilities | the capabilities under refactor |
| Authoring | operator + (future) suggested | operator + agent under operator gate |
| Inheritance | n/a | inherits `preservationRules` from `CapabilityContract` |

`RefactorPreservationContract` is gated on
`CapabilityContract` v1 + safety review +
publication surfacing + downstream-consumer
decisions. It is **not** in scope for this memo or
the next-slice implementation.

## Future Consumers

| Future Consumer | How CapabilityContract Helps |
| --- | --- |
| architecture linting | checks allowed / forbidden placement |
| resolver routing | routes by configured capability ownership/policy |
| verification planning | maps capability changes to required checks |
| semantic impact | identifies neighboring capability constraints |
| refactor preservation | provides preservation rules |
| agent contract / architecture summary publications | renders configured contracts as policy context |

**All consumers are deferred until the contract
artifact exists and passes safety review.** That
means:

- No linting capability reads
  `CapabilityContract` in this slice.
- No resolver routing reads `CapabilityContract`
  in this slice.
- No verification planning reads
  `CapabilityContract` in this slice.
- No semantic impact analysis reads
  `CapabilityContract` in this slice.
- No publication renders a `CapabilityContract`
  section in this slice. (The architecture
  summary + agent contract surfacing slice is
  step 3 of the implementation sequence.)

Each consumer ships its own decision memo before
runtime work lands. The decision memo names which
contract fields it consumes, what it does on
missing-config / `unmatched` rows, and what
`Do Not Do` reminders it adds to the agent
contract.

## What This Does Not Do

- It does **not** implement `CapabilityContract`.
- It does **not** register `CapabilityContract`
  as an artifact type.
- It does **not** modify `CapabilityMap`,
  `CapabilityPhraseReport`,
  `CapabilityNormalizationReport`, or
  `EvidenceGraph`.
- It does **not** add architecture linting.
- It does **not** add resolver routing by
  capability.
- It does **not** add verification planning by
  capability.
- It does **not** add
  `RefactorPreservationContract`.
- It does **not** add source writes.
- It does **not** invoke an LLM.
- It does **not** bump versions or publish to
  npm.
- It does **not** add a CLI command.
- It does **not** modify the agent contract
  `Do Not Do` list (the v1 implementation slice
  ships the reminder).

## Implementation Sequence

| Step | Slice | Status |
| --- | --- | --- |
| 1 | [CapabilityMap v2 Publication Safety Review](capability-map-v2-publication-safety-review.md) | ✅ Shipped (thirty-first slice) |
| 2 | **`CapabilityContract` Architecture Decision (this memo)** | ✅ Shipped (thirty-second slice) |
| 3 | `CapabilityContract` v1 implementation — register the artifact type in `@rekon/kernel-repo-model` + SDK + runtime; add producer that reads `.rekon/capability-contracts.json` (when present) and the latest `CapabilityMap` v2 and emits the effective contract artifact. Emits `configured` + `unmatched` rows only. No publication surfacing yet. | ✅ Shipped (thirty-third slice). See [`CapabilityContract` artifact reference](../artifacts/capability-contract.md). |
| 4 | `CapabilityContract` v1 safety review | ✅ Shipped (thirty-fourth slice). See [`CapabilityContract` v1 safety review](capability-contract-v1-safety-review.md). Declares v1 safe / stable as an artifact-backed policy layer; recommends publication surfacing as the next slice. |
| 5 | `CapabilityContract` publication surfacing (architecture summary + agent contract; read-only; carries new `Do Not Do` reminders) | ✅ Shipped (thirty-fifth slice). See [publication-surfacing review packet](../../.rekon-dev/review-packets/capability-contract-publications.md). |
| 6 | `CapabilityContract` publication safety review | ✅ Shipped (thirty-sixth slice). See [`CapabilityContract` publication safety review](capability-contract-publication-safety-review.md). Declares publication surfacing safe / stable as read-only visibility; recommends the capability-aware architecture linting decision as the next slice. |
| 7 | Downstream consumer decision memos (architecture linting, resolver routing by capability, verification planning by capability, semantic impact analysis) — each its own decision + safety-review pair | gated on step 6 |
| 8 | `RefactorPreservationContract` architecture decision | gated on step 7 |

Parallel polish lane (independent of the contract
track):

- **Post-`CapabilityMap`-v2 coverage review** —
  measure phrase-backed entry quality on the
  cohort + fixture now that operators can see the
  output. Can ship any time without blocking the
  contract track.

## Cross-References

- [CapabilityMap v2 High-Confidence-Only Decision](capability-map-v2-high-confidence-decision.md)
  — twenty-seventh slice; pins v2 as additive
  projection only.
- [CapabilityMap v2 Safety Review](capability-map-v2-safety-review.md)
  — twenty-ninth slice; confirms v2 projection
  safe / stable.
- [CapabilityMap v2 Publication Safety Review](capability-map-v2-publication-safety-review.md)
  — thirty-first slice; un-defers this decision.
- [Capability Phrase Contract Architecture Decision](capability-phrase-contract-architecture-decision.md)
  — twentieth slice; reserved `CapabilityContract`
  as the future policy layer.
- [`CapabilityContract` artifact reference](../artifacts/capability-contract.md)
  — v1 shipped (thirty-third slice).
- [`CapabilityContract` v1 safety review](capability-contract-v1-safety-review.md)
  — thirty-fourth slice; declares v1 safe / stable
  and recommends publication surfacing.
- [`CapabilityContract` publication safety review](capability-contract-publication-safety-review.md)
  — thirty-sixth slice; declares publication
  surfacing safe / stable as read-only visibility
  and recommends the capability-aware architecture
  linting decision as the next slice.
- [`CapabilityMap` artifact reference](../artifacts/capability-map.md)
- [`CapabilityPhraseReport` artifact](../artifacts/capability-phrase-report.md)
- [Capability Ontology concept](../concepts/capability-ontology.md)
- [Architecture summary publication](../concepts/architecture-summary-publication.md)
- [Agent operating contract](../concepts/agent-operating-contract.md)

## Status

Decision recorded. Option B (`CapabilityContract`
v1 implementation) shipped in the thirty-third
slice. The v1 safety review (thirty-fourth slice)
declares v1 safe / stable; the recommended next
slice is `CapabilityContract` publication surfacing.
