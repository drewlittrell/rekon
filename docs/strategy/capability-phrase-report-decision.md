# CapabilityPhraseReport Decision

**Status:** v1 decision memo. Strategy / docs / tests-only
batch. **No runtime change. No new artifact registration.
No `CapabilityNormalizationReport` shape mutation. No
`CapabilityMap` mutation. No `EvidenceGraph` mutation. No
source-write apply. No LLM-only semantic inference. No npm
publish. No version bump. No git tag. No GitHub Release. No
new branch.**

**Audience:** future implementers of the
capability-ontology track, agents needing a stable purpose
projection, operators reasoning about whether normalized
claims are ready to flow into `CapabilityMap` v2.

**Companion docs:**

- [Capability Ontology Translation Layer Decision](capability-ontology-translation-layer-decision.md)
  — eight-layer translation model that defines Layer 5
  (`CapabilityNormalizationReport`) and Layer 6
  (`CapabilityMap`).
- [Capability Ontology Canon + Override Model Decision](capability-ontology-canon-override-model-decision.md)
  — built-in canon packs + overrides supply the canonical
  vocabulary phrases anchor on.
- [CapabilityPhrase + CapabilityContract Architecture Decision](capability-phrase-contract-architecture-decision.md)
  — reserves the semantic primitive this memo turns into a
  v1 artifact decision.

## Decision Summary

Selected: **Option B — emit `CapabilityPhrase` v1 as a
separate `CapabilityPhraseReport` artifact** in the next
implementation slice. Rejected: Option A (enrich
`CapabilityNormalizationReport`) and Option C (wait /
defer).

Reason (verbatim):

> `CapabilityNormalizationReport` is a translation audit.
> `CapabilityPhraseReport` is a semantic purpose
> projection. Keeping them separate preserves the layered
> ontology model and avoids treating normalization rows as
> purpose truth too early.

Verbatim pins (the docs test asserts these):

- `CapabilityNormalizationReport` is a **translation
  audit**.
- `CapabilityPhraseReport` is a **semantic purpose
  projection**.
- `CapabilityMap` v2 should consume `CapabilityPhraseReport`
  (not raw `CapabilityNormalizationReport` rows).
- **Only high-confidence / stable `CapabilityPhrase`
  claims are eligible for `CapabilityMap` v2.**
- `CapabilityContract` is the **future policy /
  preservation layer**. Not implemented in
  `CapabilityPhraseReport` v1.
- AST / typechecker evidence is **optional enrichment, not
  foundational truth**.
- `CapabilityPhrase` v1 must remain **repo / language /
  architecture agnostic**.
- Source writes remain unavailable.

Recommended implementation slice that follows this memo:
**CapabilityPhraseReport v1** — register the artifact,
implement deterministic phrase projection from
high-confidence `CapabilityNormalizationReport` candidates,
cite the source normalization report and `EvidenceGraph` in
`header.inputRefs`. No `CapabilityMap` mutation. No
`CapabilityContract`. No source writes.

## Why This Decision Exists

The architecture decision shipped at `58d625f` reserves
`CapabilityPhrase` as the intermediate semantic unit
between `CapabilityNormalizationReport` and the future
`CapabilityMap` v2. That memo deliberately did **not**
commit to a carrier: it sketched the field shape and the
boundary but left "Option A vs B vs C" as the next
question.

Without a carrier decision, every downstream feature
(`CapabilityMap` v2, architecture linting, resolver
routing, verification planning, memory anchoring) is
blocked on an ambiguous primitive. The track also risks
quietly collapsing phrase semantics into the normalization
report — which would turn the audit artifact into a
purpose claim and erase the layer boundary the architecture
decision pinned.

This memo commits to **Option B** and pins the next
implementation slice. It records *why* B was selected over
A and C and what guardrails apply to the v1 artifact when it
ships.

## Current Layered Ontology State

Layers already shipped or pinned by prior decisions:

| Layer | Artifact | Status |
| --- | --- | --- |
| 0 | `EvidenceGraph` | shipped |
| 1 | `CapabilityCandidateSet` (helper) | shipped |
| 2 | `CapabilityLexicalSplit` (helper) | shipped |
| 3 | `CapabilityOntology` (canon packs + overrides) | shipped |
| 4 | `EffectiveCapabilityOntology` (internal) | shipped |
| 5 | `CapabilityNormalizationReport` | shipped (translation audit) |
| 5b | `CapabilityPhraseReport` (semantic purpose projection) | **this memo decides** |
| 6 | `CapabilityMap` v2 | deferred (gated on stable phrases) |
| 7 | `CapabilityContract` | future (policy layer) |
| 8 | `RefactorPreservationContract` | far-future |

The architecture decision reserved Layer 5b but did not
commit to a carrier. This memo commits.

## Options Considered

### Option A — Enrich `CapabilityNormalizationReport`

Add `CapabilityPhrase` candidates directly into the existing
`CapabilityNormalizationReport` (e.g. as an optional
`phrases[]` field).

Pros:

- fewer artifacts to maintain.
- simpler v1 implementation.
- direct continuity from normalized rows.

Cons:

- **blurs translation audit with semantic purpose
  projection**.
- makes `CapabilityNormalizationReport` do two jobs and
  evolve under two pressures at once.
- harder to evolve phrase semantics independently (e.g.
  add `pattern` heuristics, side-effect enrichment).
- forces every consumer of the audit artifact to know
  whether to read the audit rows or the phrase candidates,
  conflating *raw observation* with *projected purpose*.
- corrodes the layer boundary the architecture decision
  spent a memo pinning.

**Decision: rejected for v1.**

### Option B — Create `CapabilityPhraseReport`

Add a separate artifact that consumes
`CapabilityNormalizationReport` (and cites `EvidenceGraph`
through it) and emits stable phrase candidates with
confidence + provenance.

Pros:

- preserves the layer boundary explicitly.
- keeps normalization audit separate from purpose
  projection.
- gives `CapabilityMap` v2 a clean input (it reads a
  phrase report, not raw rows).
- phrase fields can evolve independently from the audit
  shape.
- supports future `CapabilityContract` /
  `RefactorPreservationContract` work without backporting
  fields into the audit artifact.
- aligns with the canon + override / suggestion-report
  pattern that already keeps audit, decision, and
  projection as separate artifacts.

Cons:

- one more artifact to maintain.
- one more publication / validation / freshness surface
  later.

**Decision: selected.** The single largest gain — keeping
the audit and the purpose projection separate — is exactly
what the architecture decision required.

### Option C — Wait / defer

Do not commit to any phrase carrier yet.

Pros:

- avoids premature design.

Cons:

- blocks `CapabilityMap` v2.
- blocks architecture linting, resolver routing,
  verification planning, memory anchoring, refactor
  preservation, and every other use case the architecture
  decision unlocked.
- leaves the ontology track stuck at audit-only
  normalization.
- compounds the cost of every future evidence-source
  slice, because each one would need to decide a carrier
  on its own.

**Decision: rejected.** The track has enough shipped
substrate (canon packs, overrides, normalization reports,
review ledger, suggestion report) to commit to a carrier
without overcommitting on field shape.

## Recommendation

Select **Option B**.

The next implementation slice is **CapabilityPhraseReport
v1**:

- register `CapabilityPhraseReport` as a new artifact type
  in the SDK + runtime (category: `projections`, next to
  `CapabilityNormalizationReport`);
- implement a deterministic projection from
  `CapabilityNormalizationReport` candidates with status
  `normalized` (and high lexical-split confidence) into
  `CapabilityPhrase` rows;
- cite the source `CapabilityNormalizationReport` and the
  underlying `EvidenceGraph` in
  `header.inputRefs` so the audit chain is intact;
- populate v1 required fields only; mark partial fields
  optional; leave future fields absent;
- do **not** mutate `CapabilityMap`;
- do **not** register `CapabilityContract`;
- do **not** add source writes;
- do **not** use LLM-only semantic inference.

The implementation slice ships its own decision memo for
specific behaviour (confidence formula, status thresholds,
publication surface), but the carrier decision is committed
here.

## CapabilityPhraseReport Model

Sketch only. **Not implemented in this batch.** The shape
becomes authoritative in the
`CapabilityPhraseReport` v1 implementation slice.

```ts
type CapabilityPhraseConfidence = "high" | "medium" | "low";

type CapabilityPhraseStatus = "stable" | "partial" | "low-confidence";

type CapabilityPhrase = {
  // Required (v1)
  id: string;
  verb: string;
  noun: string;
  confidence: CapabilityPhraseConfidence;
  evidenceRefs: ArtifactRef[];
  sourceCandidateIds: string[];
  status: CapabilityPhraseStatus;

  // Optional (v1 partial)
  qualifier?: string[];
  domain?: string;
  pattern?: string;
  layer?: string;
  message?: string;

  // Reserved (future)
  sideEffects?: string[];
  inputs?: string[];
  outputs?: string[];
};

type CapabilityPhraseReportSummary = {
  totalPhrases: number;
  stable: number;
  partial: number;
  lowConfidence: number;
  withDomain: number;
  withPattern: number;
  withLayer: number;
};

type CapabilityPhraseReport = {
  header: ArtifactHeader;
  sourceNormalizationReportRef: ArtifactRef;
  summary: CapabilityPhraseReportSummary;
  phrases: CapabilityPhrase[];
};
```

Key invariants:

- **Every phrase cites its source candidate(s).** `sourceCandidateIds`
  is required and points back to one or more
  `CapabilityNormalizationReportCandidate` ids. The audit
  chain is complete.
- **Every phrase cites contributing artifacts.**
  `evidenceRefs` includes at least the source
  normalization report and the underlying `EvidenceGraph`.
  Future enrichment slices may add `ObservedRepo`,
  `OwnershipMap`, framework signal, etc.
- **`status` and `confidence` are required.** Consumers
  gate on `status === "stable"` (which implies `confidence`
  is high and at least one corroborating source agrees).
- **`sourceNormalizationReportRef` is the primary input
  ref.** Freshness is driven by it; if the normalization
  report changes, the phrase report becomes stale.
- **No mutation of upstream artifacts.** The phrase report
  is read-only with respect to the normalization report,
  the review ledger, the suggestion report, and
  `CapabilityMap`.

## V1 Field Policy

| Field | V1 Status | Evidence Source |
| --- | --- | --- |
| `verb` | required | `CapabilityNormalizationReport` (canonical pair) |
| `noun` | required | `CapabilityNormalizationReport` (canonical pair) |
| `confidence` | required | normalized claim confidence (lexical + ontology match strength) |
| `evidenceRefs` | required | source artifact refs (normalization report + EvidenceGraph) |
| `sourceCandidateIds` | required | one or more `CapabilityNormalizationReportCandidate.id` values |
| `status` | required | derived from confidence + field completeness |
| `qualifier` | partial | lexical-split tokens beyond verb / noun + canon pack qualifier vocabulary |
| `domain` | partial | path / ownership / system context (`OwnershipMap`, `ObservedRepo`) |
| `pattern` | partial | path / role / framework convention (canon packs, archetype overlays) |
| `layer` | partial | architecture profile / `ObservedRepo` / path |
| `sideEffects` | future | imports / packages / runtime evidence / language adapters |
| `inputs` / `outputs` | future | schemas / API specs / tests / AST adapters |
| `message` | partial | optional human-readable note (always informational) |

V1 status meanings:

- **required** — must be present in every phrase row.
- **partial** — optional in v1; populated when the
  evidence source is available; absent otherwise. No
  inference from vibes.
- **future** — reserved; ships per evidence-source slice
  behind its own decision memo. Absent in v1.

The hard rule: **future fields may appear only when
deterministic evidence exists**. No LLM-only inference, no
heuristic guessing, no implicit defaults. If the evidence
is not in the artifact graph, the field is absent.

## Repo-Agnostic Evidence Model

`CapabilityPhrase` v1 must remain **repo / language /
architecture agnostic**. The pin: an arbitrary repo (Ruby,
Python, Go, Rust, shell, manifest-only) whose
`EvidenceGraph` can be built must produce the same phrase
shape as a TypeScript repo with a full AST adapter.

Evidence sources allowed for v1:

- `CapabilityNormalizationReport` normalized claims —
  primary source for `verb` / `noun` / `confidence` /
  `sourceCandidateIds`.
- `EvidenceGraph` source refs — provenance.
- `ObservedRepo` path / system context, when available —
  contributes to `domain` / `layer`.
- `OwnershipMap` owner / system context, when available —
  contributes to `domain`.
- Architecture profile / accepted repo contract — cited
  context only; never a sole evidence source.

Evidence sources deferred (future enrichment, behind their
own memos):

- AST / typechecker call graph.
- Runtime side-effect evidence.
- API schemas / input-output contracts.
- Test-to-capability mapping.
- LLM-generated semantic labels.

**Verbatim:** AST / typechecker evidence is **optional
enrichment, not foundational truth**.

Why this matters: the architecture decision identified
AST-first inference as a failure mode. Language adapters
ship incrementally; the phrase model must be usable on
repos before their adapter exists. The next memo (the
phrase implementation slice) must pass docs tests pinning
this constraint.

## CapabilityMap Boundary

The pin: **`CapabilityMap` v2 should consume
`CapabilityPhraseReport`, not raw
`CapabilityNormalizationReport` rows.**

Reason: `CapabilityMap` is a projection of stable repo
capability purpose. Raw normalization rows include
unknowns, low-confidence splits, aliases, system seeds,
and audit details that are useful for operator review but
should not be projected into the canonical capability map.
The phrase report is the cleanup boundary.

`CapabilityMap` v2 gate (additional to the gates already
pinned by the canon + override decision):

- v2 consumes phrases with `status === "stable"` by
  default. Operators may opt into `status === "partial"`
  per repo via a future config knob — but the default is
  stable-only.
- v2 cites the source `CapabilityPhraseReport` in
  `header.inputRefs` so freshness propagates.
- v2 **does not** mutate `EvidenceGraph`, the
  normalization report, the phrase report, the review
  ledger, the suggestion report, or any operator
  decision.
- v2 ships only after phrase claims are demonstrated
  stable across multiple cohort targets — measured by the
  canon-pack coverage review slice.

Until then, `CapabilityMap` stays as a derived projection
from `ObservedRepo` + `OwnershipMap`, exactly as v1 ships
today.

## CapabilityContract Boundary

The pin: **`CapabilityContract` is the future policy /
preservation layer.**

`CapabilityContract` is *not* implemented in
`CapabilityPhraseReport` v1. The phrase artifact is an
**observed** semantic claim; the contract is an
**operator-authored** policy claim about the same
capability. Conflating them would let observed signal
silently become policy.

`CapabilityContract` will eventually define:

- `allowedLayers`
- `allowedSystems`
- `forbiddenLayers`
- `requiredChecks`
- `requiredNeighbors`
- `forbiddenNeighbors`
- `preservationRules`

`RefactorPreservationContract` remains the **phase-specific
refactor obligation layer** — a projection of contract
policy onto a single refactor batch. It is not the same as
`CapabilityContract`.

Both remain reserved names; neither registers in this
batch or in the next phrase implementation slice.

## What This Does Not Do

- Does **not** implement `CapabilityPhrase`.
- Does **not** register `CapabilityPhraseReport` in this
  batch.
- Does **not** mutate the `CapabilityNormalizationReport`
  shape in runtime.
- Does **not** mutate `CapabilityMap`.
- Does **not** mutate `EvidenceGraph`.
- Does **not** mutate the
  `CapabilityNormalizationReviewLedger` or the
  `CapabilityOntologySuggestionReport`.
- Does **not** add `CapabilityContract`.
- Does **not** add `RefactorPreservationContract`.
- Does **not** add architecture linting.
- Does **not** add resolver routing by capability.
- Does **not** add verification planning by capability.
- Does **not** add semantic impact analysis.
- Does **not** add memory anchoring by capability.
- Does **not** add source writes. **Source writes remain
  unavailable.**
- Does **not** add LLM-only semantic inference.
- Does **not** add a CLI command.
- Does **not** publish to npm.
- Does **not** bump versions.
- Does **not** add a git tag or GitHub Release.
- Does **not** create a branch.

## Implementation Sequence

| Step | Slice | Status |
| --- | --- | --- |
| 1 | [CapabilityPhrase + CapabilityContract Architecture Decision](capability-phrase-contract-architecture-decision.md) | ✅ Shipped |
| 2 | **CapabilityPhraseReport v1 artifact / report decision** (this memo) | ✅ Shipped |
| 3 | **CapabilityPhraseReport v1** — register the artifact, implement deterministic projection from high-confidence normalized candidates, cite normalization report + `EvidenceGraph` in `inputRefs`. v1 required fields only. See [`docs/artifacts/capability-phrase-report.md`](../artifacts/capability-phrase-report.md). | ✅ Shipped |
| 4 | Confidence + status model decision — formalize the formula that maps lexical / ontology / corroborating-source signal into `confidence` and `status`. | After step 3 |
| 5 | Per-evidence-source enrichment slices — one per source (path / ownership / framework / architecture profile / future AST / LLM as audit signal). | After step 4 |
| 6 | `CapabilityMap` v2 design — gated on stable phrase claims across cohort targets. | Deferred |
| 7 | `CapabilityContract` decision — only after phrases stabilize. | Deferred |
| 8 | `RefactorPreservationContract` decision — far-future. | Deferred |

Steps 3 – 5 are the next implementation work. Step 2 lands
now as a strategy decision.

## See Also

- [CapabilityPhrase + CapabilityContract Architecture Decision](capability-phrase-contract-architecture-decision.md)
- [Capability Ontology Translation Layer Decision](capability-ontology-translation-layer-decision.md)
- [Capability Ontology Canon + Override Model Decision](capability-ontology-canon-override-model-decision.md)
- [Capability Ontology Architecture Impact Review](capability-ontology-architecture-impact-review.md)
- [Capability Ontology Suggestion Safety Review](capability-ontology-suggestion-safety-review.md)
- [`CapabilityNormalizationReport` artifact reference](../artifacts/capability-normalization-report.md)
- [`CapabilityNormalizationReviewLedger` artifact reference](../artifacts/capability-normalization-review-ledger.md)
- [`CapabilityOntologySuggestionReport` artifact reference](../artifacts/capability-ontology-suggestion-report.md)
- [Capability ontology concept](../concepts/capability-ontology.md)
- [Roadmap](roadmap.md)
- [Classic-behavior roadmap](classic-behavior-roadmap.md)
