# CapabilityMap v2 Safety Review

**Status:** review complete; recommendation recorded.
**Slice:** `capability-map-v2-safety-review`.
**Sequence position:** Twenty-ninth slice on the
capability-ontology track. Follows the
[CapabilityMap v2 High-Confidence-Only Implementation](capability-map-v2-high-confidence-decision.md)
(twenty-eighth slice), which shipped the additive
`phraseBackedCapabilities` / `phraseBackedSummary` /
`phraseSourceRef` fields on `CapabilityMap`.

## Decision Summary

**Recommendation: `CapabilityMap` v2 is safe/stable
as an additive high-confidence projection.** The
review confirms the implementation preserves every
boundary the
[v2 decision memo](capability-map-v2-high-confidence-decision.md)
committed to: existing v1 `entries[]` is untouched,
only stable high-confidence `CapabilityPhraseReport`
claims project into the new fields, the citation
chain back to source evidence is walkable, the
freshness model is sufficient, and no policy / source-
write surface was introduced.

**Pinned verbatim (asserted by docs test):**

- **`CapabilityMap` v2 is additive; existing
  `entries[]` remain valid.**
- **`CapabilityMap` v2 consumes
  `CapabilityPhraseReport`, not raw
  `CapabilityNormalizationReport` rows.**
- **Partial phrases are excluded from
  `phraseBackedCapabilities`.**
- **`CapabilityMap` v2 is not `CapabilityContract`.**
- **`CapabilityMap` v2 does not imply placement
  policy, ownership policy, resolver routing,
  architecture linting, verification planning, or
  source writes.**

**Recommended next slice:** `CapabilityMap` v2
**publication surfacing** — extend the architecture
summary and agent contract publishers to render
`phraseBackedCapabilities` / `phraseBackedSummary` so
operators and agents can see the new field before any
downstream policy / routing layer consumes it.

`CapabilityContract`, architecture linting, resolver
routing by capability, and verification planning by
capability remain **deferred** until publication
surfacing has shipped and produced real-repo
operator feedback.

This memo is a **strategy / safety review only**. It
does not modify the `CapabilityMap` type, the
`@rekon/capability-model` producer, the
`buildPhraseBackedCapabilityMapAdditions` helper, the
manifest, the tests, the artifact reference, or any
runtime behaviour.

## Why This Review Exists

The twenty-eighth slice shipped a real type
extension and producer change on `CapabilityMap`. Now
that the v2 projection is live, downstream surfaces
will start to consume it — first publications, then
(eventually, behind further reviews)
`CapabilityContract`, resolver routing, and
verification planning.

Before any downstream surface depends on v2, a
**read-only audit** has to confirm that the
implementation actually delivered what the
[v2 decision memo](capability-map-v2-high-confidence-decision.md)
promised:

1. v1 consumers were not broken.
2. The eligibility filter cannot leak partial or
   low-confidence phrases into v2.
3. Raw `CapabilityNormalizationReport` rows are
   never consumed.
4. Each v2 entry can be cited back through the
   phrase report and normalization report to the
   evidence graph.
5. The freshness model marks `CapabilityMap` stale
   when the consumed `CapabilityPhraseReport`
   changes.
6. The producer did **not** start writing source
   files, invoking an LLM, mutating upstream
   artifacts, or enforcing policy.

A safety review that confirms (1)–(6) lets the next
slice cite this memo as the gate for publication
surfacing. A safety review that finds a blocker
keeps `CapabilityMap` v2 in a frozen state until the
blocker ships its own implementation slice.

## Projection Path Reviewed

| Step | Artifact / Helper | Role | Boundary |
| --- | --- | --- | --- |
| phrase project | `CapabilityPhraseReport` | semantic purpose projection | does not mutate `CapabilityMap` |
| model projection | `buildPhraseBackedCapabilityMapAdditions` | high-confidence projection | excludes partials |
| capability map | `CapabilityMap` | stable capability projection | additive v2 fields only |

The review walked each step:

- **Phrase project**: the
  `rekon capability phrase project` command writes a
  `CapabilityPhraseReport` from a
  `CapabilityNormalizationReport`. It never writes
  to `CapabilityMap`. The producer file confirms
  this (no `CapabilityMap` write path exists in
  `@rekon/capability-ontology`).
- **Model projection**: the helper
  `buildPhraseBackedCapabilityMapAdditions` takes a
  structurally-typed `PhraseReportLike` (no
  dependency on `@rekon/capability-ontology`). The
  helper is **pure** — no I/O, no LLM call, no
  source read. It rejects partials and
  low-confidence phrases via a conjunctive guard.
- **Capability map**: the producer in
  `@rekon/capability-model` spreads the helper's
  additions into the existing
  `createCapabilityMap` call. v1 `entries[]` is
  populated from `EvidenceGraph` `capability_hint`
  facts unchanged. v2 fields are populated only
  when a `CapabilityPhraseReport` is found by
  `artifacts.list("CapabilityPhraseReport")`. The
  `try` / `catch` around the list call means
  runtimes that don't know the type produce a
  clean v1-shape artifact, never a partial or
  ill-formed v2 shape.

## Eligibility Rule Review

| Rule | Required |
| --- | --- |
| `status` | `stable` |
| `confidence` | `high` |
| `verb` | non-empty |
| `noun` | non-empty |
| `evidenceRefs` | non-empty |
| `sourceCandidateIds` | non-empty |
| partial phrases | excluded |
| raw normalization rows | excluded |

Three independent enforcement points:

1. **Helper guard** — `phrase-backed.ts` short-
   circuits on `raw.status !== "stable"`,
   `raw.confidence !== "high"`, missing-verb,
   missing-noun, empty `evidenceRefs`, and empty
   `sourceCandidateIds`. Every clause is a
   `continue`, so any failure means the phrase
   never enters `eligible[]`.
2. **Validator guard** — the `@rekon/kernel-repo-model`
   validator rejects any v2 entry whose
   `status !== "stable"` or
   `confidence !== "high"`, whose `evidenceRefs`
   array is empty, or whose `sourceCandidateIds`
   array is empty. Even a hand-constructed map
   that bypasses the helper cannot validate
   without these constraints.
3. **Type-level guard** — the
   `CapabilityMapPhraseBackedCapability` type pins
   `confidence: "high"` and `status: "stable"` as
   literal types. TypeScript will reject any
   construction that doesn't use those literals.

The contract test covers all three layers:
helper-level (partial excluded, low-confidence
excluded, empty refs excluded, missing verb/noun
excluded), validator-level (rejects ineligible
entries), and mixed-status report (partials absent
from output).

**No path consumes raw
`CapabilityNormalizationReport` rows.** The
producer never reads a normalization report
directly; it only reads the phrase report (which is
itself a high-confidence projection of normalized
candidates). The structural input type
`PhraseReportLike` has no fields that match
`CapabilityNormalizationReport` rows — a
mis-supplied report would fail the conjunctive
guard at the first phrase.

## Additive Shape Review

All three v2 fields are **optional** on the
`CapabilityMap` type. The validator accepts both
shapes:

- **Pure v1 shape** — `entries[]` populated;
  `phraseBackedCapabilities` /
  `phraseBackedSummary` / `phraseSourceRef` absent.
  This is what older `@rekon/capability-model`
  runtimes emit, and what runtimes that don't find
  a `CapabilityPhraseReport` emit. Pin: the
  validator accepts this shape without surfacing
  any issue.
- **v1 + v2 shape** — `entries[]` populated **and**
  all three v2 fields populated together. The
  helper guarantees: if `phraseBackedCapabilities`
  is present, then `phraseBackedSummary` and
  `phraseSourceRef` are also present (the helper
  returns all three or none).

Existing v1 consumers reading `entries[]` see no
difference. The contract test pin
"`CapabilityMap` without v2 fields still validates"
guards this. Existing kernel utilities
(`createCapabilityMap`, `validateCapabilityMap`,
`assertCapabilityMap`) handle the optional fields
without breaking the v1 surface.

Dedupe and ordering are deterministic:
`phraseBackedCapabilities[]` is sorted (verb asc,
noun asc, id asc) and the summary `byVerb` /
`byNoun` record keys are alphabetically sorted.
JSON serialisation is stable across runs, which
matters for caching and diffing.

## Citation And Freshness Review

The citation chain reviewed:

```
CapabilityMap.phraseBackedCapabilities[i].phraseRef.report
    → CapabilityPhraseReport
        → CapabilityPhrase (by phraseId)
            → CapabilityNormalizationReportCandidate.id
                → CapabilityNormalizationReport
                    → EvidenceGraph fact
```

Every link in the chain is materialised:

- **Entry-level**: each entry carries
  `phraseRef.report` (the consumed report ref) and
  `phraseRef.phraseId` (the source phrase id).
- **Top-level**: `phraseSourceRef` mirrors the
  consumed report ref, so consumers don't have to
  read every entry to know which report was
  consumed.
- **Header-level**: `CapabilityMap.header.inputRefs`
  includes both the `EvidenceGraph` and the
  `CapabilityPhraseReport` refs.
- **Evidence-level**: each entry's `evidenceRefs[]`
  mirrors the source phrase's `evidenceRefs[]`,
  letting the consumer follow citations
  independently of the report.

**Freshness** is enforced by two mechanisms:

1. **Manifest invalidation rule**
   `capability-phrases.changed` consumes
   `CapabilityPhraseReport`. When the phrase report
   changes, downstream artifacts treating
   `CapabilityMap` as fresh learn it's stale.
2. **Header `inputRefs`** — the consumed report ref
   carries its digest. Any change in the report
   produces a new digest, which the
   `IntelligenceSnapshot` indexer surfaces as a
   stale input.

The decision memo's freshness table specified that
a stale or missing phrase report should produce a
clean v1-shape `CapabilityMap`. The implementation
respects this: when
`artifacts.list("CapabilityPhraseReport")` returns
empty (or throws on an older runtime), the helper
returns `{}` and the producer emits a pure v1
artifact.

**Citation chain is complete enough for v2.**
Publication surfaces (architecture summary, agent
contract) can already render the entries with full
attribution. A `CapabilityContract` layer would
need additional citation surfaces (policy origin,
override audit trail) — those are explicitly
deferred.

## Boundary Review

| Boundary | Decision |
| --- | --- |
| v1 `entries[]` compatibility | preserved |
| `CapabilityPhraseReport` vs `CapabilityMap` | projection boundary preserved |
| `CapabilityMap` vs `CapabilityContract` | policy boundary preserved |
| `CapabilityMap` vs source writes | no writes |

Reviewed in detail:

- **v1 `entries[]` compatibility**: the existing
  `entries[]` field is still populated from
  `EvidenceGraph` `capability_hint` facts. Every
  v1 consumer that reads `entries[]` continues to
  work. The validator accepts v1-only shape
  unchanged. The kernel's `createCapabilityMap`
  normalizer treats v2 fields independently from
  v1.
- **`CapabilityPhraseReport` vs `CapabilityMap`**:
  the producer reads the phrase report and writes
  a `CapabilityMap`. The producer **never** writes
  back to the phrase report. The helper is pure
  (no side effects). The
  `@rekon/capability-ontology` package — the only
  package that writes `CapabilityPhraseReport`
  artifacts — does not import or depend on
  `@rekon/capability-model`. Cycle impossible.
- **`CapabilityMap` vs `CapabilityContract`**: no
  `CapabilityContract` artifact, type, helper, or
  registration was added. The v2 fields are
  **read-only projections**, not policy. There is
  no `required: true`, no `allowedLayers[]`, no
  `preservationRules[]`, no
  `requiredChecks[]`. The artifact-reference doc
  states this explicitly under *What
  CapabilityMap v2 Does Not Do*.
- **`CapabilityMap` vs source writes**: the
  producer reads `EvidenceGraph` and (optionally)
  `CapabilityPhraseReport` and writes three
  artifacts (`ObservedRepo`, `OwnershipMap`,
  `CapabilityMap`). It never reads or writes
  source files. The
  `@rekon/capability-model` package does not
  import `fs.writeFile` for any source-file path,
  does not invoke an LLM, and does not call
  `resolve.policy` or any reconciliation surface.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare v2 safe/stable projection | selected | additive + high-confidence-only |
| publication surfacing next | selected | operators need visibility |
| `CapabilityContract` next | deferred | policy layer too early |
| resolver routing next | deferred | needs surfacing/safety first |
| more dogfood before surfacing | deferred | implementation smoke + tests sufficient for visibility |

**Selected**: declare v2 safe/stable as an additive
high-confidence projection, and ship publication
surfacing as the next slice.

**Why publication surfacing is the right next
step**:

- The CLI smoke from the implementation batch
  emitted 6 phrase-backed capabilities on a small
  fixture (verbs `create` / `fetch` / `handle`;
  nouns `request` / `user`). That's enough
  signal for visibility, but not enough for an
  operator to see in the wild.
- The architecture summary and agent contract
  already cite `CapabilityPhraseReport`; lifting
  one extra projection into the same publication
  surfaces is a small, well-bounded addition.
- Once operators and agents see v2 entries in
  publications, real-repo feedback can decide
  whether the next layer is `CapabilityContract`,
  resolver routing, or a polish cycle on the
  filter / canon packs.

**Why `CapabilityContract` is the wrong next
step**:

- `CapabilityContract` is policy (required checks,
  allowed layers, preservation rules). Policy
  before the projection is even surfaced in
  publications is premature — operators have no
  way to validate the policy proposal against
  what v2 actually projects.
- The
  [capability-phrase-contract architecture
  decision](capability-phrase-contract-architecture-decision.md)
  already pinned `CapabilityContract` as a
  further-future slice. Skipping ahead would
  collapse the eight-layer ontology model.

**Why resolver routing is the wrong next step**:

- Routing the resolver by capability would consume
  v2 entries as routing keys. That's a policy
  surface, not a projection consumer. It belongs
  with `CapabilityContract`, not with v2.

**Why "more dogfood before surfacing" is
unnecessary**:

- The implementation batch already ran a CLI
  smoke against `tests/fixtures/js-ts-ast-evidence`
  end-to-end (refresh → normalize → phrase project
  → refresh) and validated artifacts cleanly.
- The 19-assertion contract test covers
  eligibility, ordering, summary, citation,
  validator rejection, and structural typing.
- Real-repo dogfood without a publication surface
  is operator-blind — the operator can't see
  phrase-backed entries unless they `cat` the JSON.
  Publication surfacing **is** the dogfood gate.

## Recommendation

**`CapabilityMap` v2 is safe/stable as an additive
high-confidence projection.** No blockers. No
runtime changes required. Ship publication
surfacing as the next slice.

The recommended publication-surfacing scope:

- Add a `buildCapabilityMapV2PublicationSection`
  (or equivalent) helper to
  `@rekon/capability-docs`.
- Wire the helper into the architecture summary
  publisher and agent contract publisher.
- Keep both surfaces strictly read-only over
  `CapabilityMap` — they never mutate it.
- Add a manifest `consumes: CapabilityMap` /
  `invalidatedBy: capability-map.changed` entry to
  the publishers.
- Contract test (15+ assertions) + docs test (9+
  assertions).
- Cite this safety review as the gate.

Deferred (gated on publication-surfacing operator
feedback):

- `CapabilityContract` decision
- architecture linting
- resolver routing by capability
- verification planning by capability

## What This Does Not Do

- It does **not** modify `CapabilityMap` v1 or v2
  behaviour.
- It does **not** change the
  `buildPhraseBackedCapabilityMapAdditions`
  helper.
- It does **not** add publication surfacing in
  this batch (that is the next slice).
- It does **not** introduce a `CapabilityContract`
  artifact, type, or capability.
- It does **not** add architecture linting,
  resolver routing by capability, or verification
  planning by capability.
- It does **not** mutate `EvidenceGraph`,
  `CapabilityNormalizationReport`,
  `CapabilityPhraseReport`,
  `CapabilityMap` (any field), or any operator
  ledger.
- It does **not** add source writes.
- It does **not** invoke an LLM.
- It does **not** bump versions or publish to
  npm.

## Follow-Up Work

- **`CapabilityMap` v2 publication surfacing**
  (next slice). Extends architecture summary +
  agent contract publishers to render
  `phraseBackedCapabilities` /
  `phraseBackedSummary`.
- **Post-`CapabilityMap`-v2 coverage review**
  (gated on publication surfacing). Measure
  phrase-backed entry quality on the cohort +
  fixture once operators can see the output.
- **`CapabilityContract` decision memo** (further
  future; gated on coverage review + publication
  surfacing feedback).
- **`RefactorPreservationContract`** (phase-5).

## Cross-References

- [CapabilityMap v2 High-Confidence-Only Decision](capability-map-v2-high-confidence-decision.md)
  — twenty-seventh slice; the decision memo
  this review audits.
- [CapabilityMap artifact reference](../artifacts/capability-map.md)
  — produced by the twenty-eighth slice.
- [CapabilityPhraseReport artifact](../artifacts/capability-phrase-report.md)
  — the source artifact for v2 projection.
- [Capability Phrase Contract Architecture Decision](capability-phrase-contract-architecture-decision.md)
  — pins `CapabilityContract` as further-future.
- [Post-AST Cohort Re-Run](post-ast-cohort-rerun.md)
  — twenty-sixth slice; evidence base for v2.
- [Capability Ontology concept](../concepts/capability-ontology.md)
  — eight-layer model.

## Status

Review complete. Recommendation: `CapabilityMap` v2
is safe/stable as additive high-confidence
projection. Next slice: publication surfacing.
