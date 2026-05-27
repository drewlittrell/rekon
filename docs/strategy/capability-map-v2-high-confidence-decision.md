# CapabilityMap v2 High-Confidence-Only Decision

**Status:** decision recorded.
**Slice:** `capability-map-v2-high-confidence-decision`.
**Sequence position:** Twenty-seventh slice on the
capability-ontology track. Follows the
[Post-AST Cohort Re-Run](post-ast-cohort-rerun.md)
(twenty-sixth slice), which satisfied the readiness
gate for `CapabilityMap` v2 design with narrower
real-repo evidence.

## Decision Summary

**Recommendation: Option B — additive
`CapabilityMap` v2 projection from stable
high-confidence `CapabilityPhraseReport` claims
only.** `CapabilityMap` v2 reads the latest
`CapabilityPhraseReport`, filters to phrases where
`status === "stable"` **and** `confidence === "high"`
**and** at least one `evidenceRef` is present **and**
`sourceCandidateIds` is non-empty, and projects each
match into a new additive section on the
`CapabilityMap` artifact. The existing v1
`entries[]` field remains untouched. Partial phrases
and raw normalization rows are explicitly excluded.

**Pinned verbatim (asserted by docs test):**

- **`CapabilityMap` v2 consumes
  `CapabilityPhraseReport`, not raw
  `CapabilityNormalizationReport` rows.**
- **Only stable high-confidence `CapabilityPhrase`
  claims are eligible for `CapabilityMap` v2.**
- **Partial phrases remain semantic context and are
  not `CapabilityMap`-ready ownership or placement
  policy.**
- **`CapabilityMap` v2 is not `CapabilityContract`.**
- **`CapabilityMap` v2 is additive and existing
  `CapabilityMap` fields remain valid.**
- **`CapabilityMap` should be stale when the
  consumed `CapabilityPhraseReport` changes.**

This memo is a **strategy / architecture decision
only**. It commits to the v2 shape, eligibility
rules, freshness model, and `CapabilityContract`
boundary, then defers the implementation to the next
slice (*CapabilityMap v2 high-confidence-only
implementation*). No runtime behaviour changes in
this batch.

## Why This Decision Exists

Three review surfaces converge on this decision:

1. The
   [Post-AST Cohort Re-Run](post-ast-cohort-rerun.md)
   (twenty-sixth slice) measured AST-backed
   extraction on `target-1` and `target-2`. **target-1
   stable phrases lifted 16 → 37 (+131.3%, 2.3×)**
   with textbook capability pairs (`get:response`,
   `build:plan`, `get:schema`, `get:session`,
   `save:response`, `build:report`). target-2 was
   neutral with no regression. The readiness gate
   passed six of seven criteria; the seventh
   ("consistent across more than one real repo") was
   partial, and the memo explicitly invoked the
   narrower-evidence escape clause.
2. The
   [CapabilityPhraseReport Decision](capability-phrase-report-decision.md)
   (committed to Option B — separate artifact carrier
   for phrases) and
   [CapabilityPhrase + CapabilityContract Architecture Decision](capability-phrase-contract-architecture-decision.md)
   (reserved `CapabilityPhrase` as the semantic
   primitive) both pin `CapabilityMap` v2 consumption
   as "stable phrases only, additive to v1."
3. The
   [CapabilityPhraseReport Safety Review](capability-phrase-report-safety-review.md)
   pinned `CapabilityMap` integration as **deferred
   until phrase coverage is measured on real
   repos** — that coverage measurement is now
   complete.

The decision required before any v2 runtime work:

- Should v2 consume `CapabilityPhraseReport` at all?
- Stable phrases only, or partial too?
- Replace v1 or extend additively?
- What shape do the new fields take?
- How does freshness propagate?
- What stays out of v2 (the `CapabilityContract`
  boundary)?

This memo answers each.

## Current CapabilityMap Boundary

`CapabilityMap` v1 shape lives in
`@rekon/kernel-repo-model`
(`packages/kernel-repo-model/src/index.ts`, lines
71–80):

```ts
export type CapabilityMap = {
  header: ArtifactHeader;
  entries: Array<{
    capability: string;
    subjects: string[];
    systems: string[];
    confidence: number;
    evidence: ArtifactRef[];
  }>;
};
```

Producer:
`@rekon/capability-model.createCapabilityMap` (called
from the capability-model registered capability). v1
populates `entries` from `ObservedRepo.capabilities`
+ system-derived metadata + path / ownership hints
extracted from `EvidenceGraph`.

**What v1 does well**

- Stable artifact shape; every downstream consumer
  (architecture-summary publication, agent-contract
  publication, future verification flows) reads from
  `entries[]`.
- Deterministic across runs.
- Cites `ObservedRepo` / `OwnershipMap` /
  `EvidenceGraph` via `inputRefs` and per-entry
  `evidence[]`.

**What v1 doesn't do**

- Surface canonical verb:noun semantic capability
  claims.
- Carry phrase-level metadata (`domain`, `pattern`,
  `layer`, `qualifier`).
- Reflect AST-derived structural information.

`CapabilityMap` v2 fills the second gap **additively**.

## Evidence From Post-AST Cohort Re-Run

### Evidence table

| Target | Pre-AST Stable | Post-AST Stable | Decision |
| --- | ---: | ---: | --- |
| target-1 | 16 | **37** | evidence supports conservative v2 design (+131.3% lift; textbook pairs `get:response`, `build:plan`, `get:schema`, `get:session`, `save:response`, `build:report`) |
| target-2 | 2 | 2 | neutral; no regression — AST did not regress small-repo signal |

**target-1 stable phrase composition** (top 10
verb:noun pairs, post-AST):

- `get:response` (14), `build:plan` (13),
  `get:schema` (12), `get:session` (10),
  `save:response` (8), `build:report` (8),
  `get:token` (6), `build:command` (6),
  `save:session` (6), `build:session` (4).

Every entry is a canonical capability verb paired
with a canonical domain-shaped noun. These are
exactly the verb:noun patterns `CapabilityMap` v2
should project; the cohort re-run confirms they
exist in real production code at meaningful scale.

**target-2 stable phrase:** `test:session` (2). Low
absolute count but semantically meaningful.

**Overall:** the evidence is sufficient to begin v2
design with conservative eligibility (stable +
high-confidence only). The narrower-evidence escape
clause from the cohort re-run review is respected by
restricting v2 to the most confident phrase claims
only.

## Options Considered

### Option table

| Option | Decision | Reason |
| --- | --- | --- |
| Option A: keep `CapabilityMap` v1 only | **rejected** | Post-AST evidence shows stable phrases are useful enough to design v2; not capitalising on the new signal would leave the layered model under-utilised. |
| Option B: additive stable-phrase-backed `CapabilityMap` v2 | **selected** | Preserves v1 compatibility, uses the best available semantic purpose layer (`CapabilityPhraseReport`), respects the `status === "stable"` / `confidence === "high"` threshold the safety review pinned, and keeps the door open for `CapabilityContract` later. |
| Option C: project partial phrases too | **rejected** | Partial phrases are semantic context only; promoting them to ownership / placement projection contradicts the phrase report safety review's pinned guarantee. |
| Option D: project raw `CapabilityNormalizationReport` rows | **rejected** | Blurs translation audit with stable capability projection; collapses the layered model the architecture impact review committed to. |
| Option E: wait for more dogfood before design | **rejected** | Enough evidence exists for a *conservative* design. Implementation remains high-confidence-only; v2 ships cautiously. A future cohort review can broaden eligibility if evidence supports it. |

### Why Option B is selected

Option B is the only choice that:

- **Preserves the layered model.** `EvidenceGraph` →
  `CapabilityNormalizationReport` →
  `CapabilityPhraseReport` → `CapabilityMap` v2.
  Each layer's contract stays distinct.
- **Honours the safety review's pinned guarantees.**
  Stable phrases only; partials as context only;
  `CapabilityMap` integration remains gated on
  evidence (which the cohort re-run now provides).
- **Stays additive.** v1 `entries[]` is untouched.
  Existing consumers read v1 as before; new
  consumers can opt into v2 fields.
- **Stays conservative.** A high-confidence-only
  threshold keeps v2 quality high even when the
  underlying canonical vocabulary is sparse on a
  given repo.

### Why Option E ("wait") is not selected

The cohort re-run review explicitly invoked the
narrower-evidence escape clause. Selecting Option E
would re-defer indefinitely. The conservative design
(stable + high-confidence only) makes the
implementation risk low enough that proceeding is
the correct call.

## Recommendation

**Adopt Option B.** Ship this decision memo. The
implementation slice that follows
(*CapabilityMap v2 high-confidence-only
implementation*) ships:

1. Extension of `CapabilityMap` type in
   `@rekon/kernel-repo-model` with optional
   `phraseBackedCapabilities`,
   `phraseBackedSummary`, `phraseSourceRef` fields.
   No removal of v1 fields.
2. `createCapabilityMap` accepts the new optional
   fields and validates them.
3. `@rekon/capability-model.register` reads the
   latest `CapabilityPhraseReport` artifact, filters
   eligible phrases per the eligibility table, and
   emits the additive v2 section.
4. `inputRefs` extended to cite the consumed
   `CapabilityPhraseReport`.
5. New invalidation rule
   `capability-phrases.changed` so freshness
   propagates when the upstream phrase report
   changes.
6. Contract tests + docs test pinning the
   eligibility rules.
7. `docs/artifacts/capability-map.md` artifact
   reference created (documentation gap identified
   in this memo).

## Eligibility Rules

### Eligibility table

| Rule | Decision |
| --- | --- |
| phrase `status` | must be `"stable"` |
| phrase `confidence` | must be `"high"` |
| `evidenceRefs` | required (at least one `ArtifactRef`) |
| `sourceCandidateIds` | required (non-empty) |
| partial phrases | **excluded** |
| low-confidence phrases | **excluded** |
| raw `CapabilityNormalizationReport` rows | **excluded** |
| phrases without `verb` or without `noun` | **excluded** |
| phrases whose verb or noun fails canonical-ontology lookup | **excluded** (deterministically) |

Every rule is conjunctive. A phrase that meets all
filters becomes one `CapabilityMapPhraseBackedCapability`
entry. Any failure means the phrase is **not**
projected into v2. The phrase still appears in
`CapabilityPhraseReport` and in publications; it is
simply ineligible for the structural map.

**Rationale.** The conjunctive filter implements the
work-order pin "Only stable high-confidence
`CapabilityPhrase` claims are eligible." The
deterministic canonical-vocabulary check guards
against phrases that drifted in earlier slices but
no longer match the current canon pack — they should
not retroactively become v2 entries.

## Additive Shape

### Boundary table

| Layer | Responsibility |
| --- | --- |
| `EvidenceGraph` | raw observed facts |
| `CapabilityNormalizationReport` | translation audit |
| `CapabilityPhraseReport` | semantic purpose projection |
| `CapabilityMap` v1 | structural capability projection (observed-repo / ownership / capability hints) |
| `CapabilityMap` v2 (this decision) | additive stable-phrase-backed capability projection |
| `CapabilityContract` (future) | placement / proof / preservation policy |

### Field sketch (implementation slice will finalise)

```ts
type CapabilityMapPhraseBackedCapability = {
  /** Deterministic id derived from (verb, noun,
   *  qualifier?, domain?, pattern?, layer?) so the
   *  same canonical capability emits the same id
   *  across runs. */
  id: string;
  phraseRef: {
    report: ArtifactRef;
    phraseId: string;
  };
  verb: string;
  noun: string;
  qualifier?: string[];
  domain?: string;
  pattern?: string;
  layer?: string;
  evidenceRefs: ArtifactRef[];
  sourceCandidateIds: string[];
  confidence: "high";
  status: "stable";
};

type CapabilityMapV2Additions = {
  phraseBackedCapabilities?: CapabilityMapPhraseBackedCapability[];
  phraseBackedSummary?: {
    total: number;
    byVerb: Record<string, number>;
    byNoun: Record<string, number>;
    withDomain: number;
    withPattern: number;
    withLayer: number;
  };
  phraseSourceRef?: ArtifactRef;
};
```

**Section name decision.** Use
`phraseBackedCapabilities` (not
`normalizedCapabilities`). The map projects
*phrases*, not *normalization rows*; the field name
reflects the actual upstream layer. The
`normalizedCapabilities` alternative would conflate
normalization with phrase projection and re-introduce
the boundary blur Option D explicitly rejects.

**Constraints.**

- All v2 fields are `?:` optional.
- The existing v1 `entries[]` field is unchanged.
- `confidence: "high"` and `status: "stable"` are
  literal types (not the broader phrase-report
  enums) because v2 only ever emits values that pass
  the eligibility filter.
- `phraseSourceRef` is the single
  `ArtifactRef` to the `CapabilityPhraseReport` that
  was filtered; it appears once at the v2 section
  root, not per-entry. Per-entry `phraseRef` carries
  the `phraseId` so consumers can drill into the
  source phrase without re-resolving the report.
- `phraseBackedSummary` mirrors the
  `CapabilityPhraseReport.summary` shape but counts
  only filtered (v2-eligible) phrases, not the
  upstream total. Consumers reading v1 still see the
  v1 summary; consumers reading v2 see a v2-scoped
  summary.
- The `id` field is **deterministic across runs**
  (per the work-order pin) — same verb / noun /
  qualifier / domain / pattern / layer tuple → same
  id. The implementation slice picks the exact digest
  shape.

## Freshness And Citations

### `inputRefs`

`CapabilityMap` v2 `inputRefs` must cite:

- everything `CapabilityMap` v1 already cites
  (`ObservedRepo`, `OwnershipMap`, `EvidenceGraph`),
  unchanged;
- **plus** the latest `CapabilityPhraseReport` when
  `phraseBackedCapabilities` is populated.

If the run finds no `CapabilityPhraseReport` (sparse
repo, no phrase coverage), v2 emits an unchanged v1
shape — no `phraseBackedCapabilities` /
`phraseBackedSummary` / `phraseSourceRef` fields and
no `CapabilityPhraseReport` in `inputRefs`. The
output remains a valid `CapabilityMap`.

### Invalidation rule

The implementation manifest for `@rekon/capability-model`
adds:

```ts
{
  id: "capability-phrases.changed",
  description:
    "CapabilityMap is stale when the consumed CapabilityPhraseReport changes.",
  paths: [".rekon/artifacts/projections/CapabilityPhraseReport-*.json"],
}
```

(or the equivalent under the artifact-store schema
the implementation chooses).

### Stale / sparse / missing handling

| Upstream condition | `CapabilityMap` v2 behaviour |
| --- | --- |
| No `CapabilityPhraseReport` present | emit v1-only shape; no `phraseBackedCapabilities`. |
| `CapabilityPhraseReport` present but empty | emit empty `phraseBackedCapabilities: []` with summary `total: 0`. |
| `CapabilityPhraseReport` present with phrases, none eligible | emit empty `phraseBackedCapabilities: []`; cite the report; summary `total: 0`. |
| `CapabilityPhraseReport` stale (its own freshness check failed) | treat as missing for v2 emission; do **not** read a stale phrase report. |
| `CapabilityPhraseReport` regenerated | manifest invalidation rule above marks `CapabilityMap` stale; next run regenerates v2. |

`CapabilityMap` v2 never **mutates**
`CapabilityPhraseReport`; it only reads.

### Citation rule

Every emitted `phraseBackedCapabilities` entry must
carry:

- `phraseRef.report` — `ArtifactRef` to the consumed
  `CapabilityPhraseReport`.
- `phraseRef.phraseId` — the source phrase id from
  that report.
- `evidenceRefs[]` — direct copy of the source
  phrase's `evidenceRefs[]` (typically pointing at
  the upstream `EvidenceGraph`).
- `sourceCandidateIds[]` — direct copy of the source
  phrase's `sourceCandidateIds[]`.

The citation chain `CapabilityMap` v2 entry →
`CapabilityPhrase` → `CapabilityNormalizationReport`
candidate → `EvidenceGraph` fact is therefore fully
walkable by operators and downstream consumers.

## CapabilityContract Boundary

This decision explicitly does **not** create or
mutate `CapabilityContract`. The two are distinct:

| Surface | Purpose | Scope |
| --- | --- | --- |
| `CapabilityMap` v2 | Surface **what** stable capabilities exist in the repo, with citations. | Read-only projection. |
| `CapabilityContract` (future) | Decide **policy** for each capability: required checks, allowed layers, allowed neighbours, preservation rules. | Future policy artifact. Far future. |

`CapabilityMap` v2 entries are projection inputs, not
policy. Consumers cannot use them to forbid placement,
reject changes, or gate verification. Those behaviours
require `CapabilityContract`, which remains
unscheduled.

## What This Does Not Do

This batch:

- Does **not** implement `CapabilityMap` v2.
- Does **not** mutate `CapabilityMap` runtime
  behaviour.
- Does **not** mutate `EvidenceGraph`.
- Does **not** mutate
  `CapabilityNormalizationReport`.
- Does **not** mutate `CapabilityPhraseReport`.
- Does **not** consume partial phrases.
- Does **not** consume low-confidence phrases.
- Does **not** consume raw normalization rows.
- Does **not** add `CapabilityContract`.
- Does **not** add `RefactorPreservationContract`.
- Does **not** add architecture linting.
- Does **not** add resolver routing by capability.
- Does **not** add source writes.
- Does **not** add LLM-only inference.
- Does **not** publish to npm.
- Does **not** bump versions.
- Does **not** create a git tag or GitHub Release.
- Does **not** create a branch.
- Does **not** create
  `docs/artifacts/capability-map.md` (documentation
  gap; the implementation slice creates it).

The shipped artefacts of this slice are: this memo,
the 16-assertion docs test, the review packet, and
supporting-doc cross-references.

## Implementation Sequence

| Step | Slice | Status |
| --- | --- | --- |
| 1 | [Post-AST Cohort Re-Run](post-ast-cohort-rerun.md) | ✅ Shipped |
| 2 | **`CapabilityMap` v2 high-confidence-only decision (this memo)** | ✅ Shipped |
| 3 | **`CapabilityMap` v2 high-confidence-only implementation** — extend `@rekon/kernel-repo-model` `CapabilityMap` type; `@rekon/capability-model` reads latest `CapabilityPhraseReport`, filters per the eligibility table, emits the additive section; new manifest invalidation rule `capability-phrases.changed`; contract tests; create [`docs/artifacts/capability-map.md`](../artifacts/capability-map.md) | ✅ Shipped (twenty-eighth slice) |
| 4 | **[`CapabilityMap` v2 safety review](capability-map-v2-safety-review.md)** — read-only audit of the additive projection (projection path, eligibility enforcement, additive shape, citation chain, freshness model, boundary review). Recommends v2 safe / stable. | ✅ Shipped (twenty-ninth slice) |
| 5 | **`CapabilityMap` v2 publication surfacing** — extends `@rekon/capability-docs` with `buildCapabilityMapV2PublicationSection`; architecture summary + agent contract publications surface `phraseBackedCapabilities` / `phraseBackedSummary` / `phraseSourceRef` as projection context (read-only). Proof-report surfacing deferred. | ✅ Shipped (thirtieth slice) |
| 6 | **[`CapabilityMap` v2 publication safety review](capability-map-v2-publication-safety-review.md)** — read-only audit of the publication surfacing (boundary statements, read-only guarantee, proof-report deferral, Do-Not-Do reminder coverage). Recommends publication surfacing safe / stable. | ✅ Shipped (thirty-first slice) |
| 7 | `CapabilityContract` architecture decision — strategy / decision memo only. Pins policy / placement / preservation semantics for the next layer. **No implementation, no linting, no routing, no verification planning, no source writes.** | next slice |
| 8 | Post-`CapabilityMap`-v2 coverage review — measure phrase-backed entry quality on the cohort + fixture now that operators can see the output | parallel / opportunistic |
| 5 | `CapabilityContract` decision memo | far future; gated on step 4 |

Parallel polish lane:

- **`CapabilityNormalizationReport` AST-metadata
  candidate integration** (selected by the
  cohort re-run as parallel work). Independent of
  `CapabilityMap` v2 design. Can ship in parallel
  with step 3.

## Cross-References

- [Post-AST Cohort Re-Run](post-ast-cohort-rerun.md)
  — twenty-sixth slice; the evidence base for this
  decision.
- [Post-AST CapabilityPhraseReport Coverage Review](post-ast-capability-phrase-coverage-review.md)
  — twenty-fifth slice; first measurement of AST
  impact on phrase density.
- [CapabilityPhraseReport Safety Review](capability-phrase-report-safety-review.md)
  — pinned `CapabilityMap` integration as deferred
  until phrase coverage is measured on real repos
  (now done).
- [CapabilityPhraseReport Decision](capability-phrase-report-decision.md)
  — committed to Option B (separate artifact
  carrier) which makes additive `CapabilityMap` v2
  consumption clean.
- [CapabilityPhrase + CapabilityContract Architecture Decision](capability-phrase-contract-architecture-decision.md)
  — reserved `CapabilityPhrase` as the semantic
  primitive and `CapabilityContract` as the future
  policy layer that this decision explicitly does
  not touch.
- [Capability Ontology Architecture Impact Review](capability-ontology-architecture-impact-review.md)
  — the eight architectural reservations remain in
  force; this decision adds no new mutations to
  existing artifacts.
- [Capability Ontology Translation Layer Decision](capability-ontology-translation-layer-decision.md)
  — Layer 6 (`CapabilityMap`) in the eight-layer
  model is the layer this decision evolves.
- [JS/TS AST EvidenceGraph Provider v1](js-ts-ast-evidence-adapter-decision.md)
  — produced the AST-backed facts the cohort re-run
  measured.
- [`CapabilityPhraseReport` artifact reference](../artifacts/capability-phrase-report.md)
  — defines the upstream source this decision
  consumes.
- [`CapabilityNormalizationReport` artifact reference](../artifacts/capability-normalization-report.md)
  — translation audit layer that v2 explicitly does
  not consume directly.
- [`EvidenceGraph` artifact reference](../artifacts/evidence-graph.md)
- [Capability ontology concept](../concepts/capability-ontology.md)
- [Roadmap](roadmap.md)
- [Classic-behaviour roadmap](classic-behavior-roadmap.md)

## Status

Recorded on 2026-05-27 against Rekon commit
`d9e91f9`. No version bump. No npm publish. No git
tag. No GitHub Release. No runtime behaviour
change. No new artifact type registered. No new
validator. No new writer. No new permission. No new
role. No new capability package. Schema unchanged.
Rollback is trivial: revert this memo and the
supporting doc cross-links.
