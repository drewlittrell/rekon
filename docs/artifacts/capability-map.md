# `CapabilityMap` Artifact

**Status:** v1 shipped (Layer 6, base shape). v2
high-confidence-only phrase-backed projection shipped
as an additive extension.
**Stability:** experimental, public.
**Producer:** `@rekon/capability-model` (the
`modelProjector`).
**Category:** `projections` (sits next to
[`CapabilityPhraseReport`](capability-phrase-report.md)
and
[`CapabilityNormalizationReport`](capability-normalization-report.md)).

A `CapabilityMap` is the **canonical capability
projection** layer (Layer 6 of the
[capability ontology](../concepts/capability-ontology.md)).
It exposes two complementary shapes:

- **v1 `entries[]`** — coarse capability hints
  derived from `EvidenceGraph` `capability_hint`
  facts (heuristic, low-confidence-tolerant).
- **v2 `phraseBackedCapabilities` /
  `phraseBackedSummary` / `phraseSourceRef`** —
  additive high-confidence projection sourced **only**
  from stable high-confidence
  [`CapabilityPhraseReport`](capability-phrase-report.md)
  entries.

## Verbatim Pins (asserted by docs test)

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

## Position In The Capability Ontology

| Layer | Artifact | Role |
| --- | --- | --- |
| 1 | `EvidenceGraph` | raw atomic evidence |
| 4 | `CapabilityNormalizationReport` | translation audit (raw + normalized rows, all confidences) |
| 5 | `CapabilityPhraseReport` | semantic purpose projection (high-confidence normalized only) |
| 6 (this doc) | `CapabilityMap` v1 + v2 | canonical capability projection: heuristic hints (v1) + phrase-backed claims (v2) |
| 7 | `CapabilityContract` v1 | policy layer — operator-authorised binding rules over v2 phrase-backed capabilities; diagnostic only, no linting / routing / verification planning yet |

`CapabilityMap` v2 is the **projection layer**. It
publishes the high-confidence subset of the phrase
report into a stable canonical shape that downstream
publishers (architecture summary, agent contract,
GitHub Check / PR-comment surfaces) can cite without
re-doing the eligibility filter themselves.

`CapabilityMap` v2 is **not** the enforcement layer.
The [`CapabilityContract`](capability-contract.md)
artifact (v1 shipped, thirty-third slice) owns the
*policy* surface — what code *must* live
where, which capabilities *must* exist, which paths
*must* match an owner. v2 stops at projection.

## Schema (v1)

The v1 shape is unchanged from earlier slices.

| Field | Meaning |
| --- | --- |
| `header.artifactType` | always `"CapabilityMap"` |
| `header.schemaVersion` | `"0.1.0"` |
| `header.inputRefs` | includes the source `EvidenceGraph` ref; includes the consumed `CapabilityPhraseReport` ref when v2 fields are populated |
| `entries[]` | one entry per `capability_hint` fact (heuristic, low-confidence-tolerant) |
| `entries[].capability` | canonical capability name (string) |
| `entries[].subjects` | string array of repo subjects (typically file paths) |
| `entries[].systems` | string array of owner system IDs |
| `entries[].confidence` | numeric confidence from the source fact |
| `entries[].evidence` | `ArtifactRef[]` citing the source evidence graph |

Existing v1 consumers continue to read
`entries[]` exactly as before. **v1 entries are
unchanged by the v2 projection.**

## Schema (v2 Additive Extension)

v2 adds three optional fields to the same artifact.
All three are absent when no
`CapabilityPhraseReport` has been consumed (clean
v1-shape).

| Field | Status | Meaning |
| --- | --- | --- |
| `phraseBackedCapabilities` | optional v2 | array of stable high-confidence phrase-backed capabilities |
| `phraseBackedSummary` | optional v2 | aggregate counts (`total`, `byVerb`, `byNoun`, `withDomain`, `withPattern`, `withLayer`) |
| `phraseSourceRef` | optional v2 | `ArtifactRef` pointing at the consumed `CapabilityPhraseReport` |

Each `phraseBackedCapabilities[]` entry carries:

| Field | Status | Meaning |
| --- | --- | --- |
| `id` | required | deterministic identifier `capability-phrase:<phraseId>` |
| `phraseRef.report` | required | `ArtifactRef` to the consumed `CapabilityPhraseReport` |
| `phraseRef.phraseId` | required | source `CapabilityPhrase.id` from the report |
| `verb` | required | canonical verb (mirrored from the source phrase) |
| `noun` | required | canonical noun (mirrored from the source phrase) |
| `evidenceRefs` | required | `ArtifactRef[]` citing contributing artifacts (mirrored from the source phrase; **must be non-empty**) |
| `sourceCandidateIds` | required | string array of source `CapabilityNormalizationReportCandidate.id` values (**must be non-empty**) |
| `confidence` | required | literal `"high"` (eligibility is conjunctive — see below) |
| `status` | required | literal `"stable"` (eligibility is conjunctive — see below) |
| `qualifier` | partial | optional lexical-split tokens beyond verb / noun |
| `domain` | partial | optional coarse business / system domain |
| `pattern` | partial | optional recognized architecture pattern |
| `layer` | partial | optional repo-layer placement hint |

## V2 Eligibility Rules (Conjunctive)

A `CapabilityPhrase` projects into
`phraseBackedCapabilities` **only when all of the
following hold**:

| Rule | Required value |
| --- | --- |
| `phrase.status` | `"stable"` |
| `phrase.confidence` | `"high"` |
| `phrase.verb` | non-empty string |
| `phrase.noun` | non-empty string |
| `phrase.evidenceRefs` | non-empty `ArtifactRef[]` |
| `phrase.sourceCandidateIds` | non-empty string array |

Any other status / confidence value **never**
projects. Partial phrases (`status === "partial"`)
remain visible in the upstream
`CapabilityPhraseReport` as semantic context but
**never** appear in `CapabilityMap` v2. Low-confidence
phrases (`confidence === "medium"` or `"low"`)
**never** appear in `CapabilityMap` v2. Raw
`CapabilityNormalizationReport` rows are **never**
consumed by `CapabilityMap` v2 directly — only
phrase-report entries.

## Deterministic Ordering

`phraseBackedCapabilities[]` is sorted deterministically:

1. `verb` ascending (locale-aware compare)
2. `noun` ascending (locale-aware compare)
3. `id` ascending (locale-aware compare)

`phraseBackedSummary.byVerb` and
`phraseBackedSummary.byNoun` use **alphabetically
sorted record keys** so JSON serialization is stable
across runs.

## Freshness And Citations

When a `CapabilityPhraseReport` is consumed:

- `CapabilityMap.header.inputRefs` includes **both**
  the `EvidenceGraph` ref and the
  `CapabilityPhraseReport` ref.
- The consumed report ref is mirrored into the
  top-level `phraseSourceRef`.
- Each entry's `phraseRef.report` also carries the
  consumed report ref (every entry can be cited back
  to the report independently of the top-level
  pointer).
- The `@rekon/capability-model` manifest declares a
  `capability-phrases.changed` invalidation rule on
  `CapabilityPhraseReport`, so consumers see the
  `CapabilityMap` as stale when the source phrase
  report changes.

## Producer Boundary

The `@rekon/capability-model` projector:

- **Reads** the latest `EvidenceGraph` (required) and
  the latest `CapabilityPhraseReport` (optional —
  absent on older runtimes or before any phrase
  project run).
- **Writes** exactly three artifacts:
  `ObservedRepo`, `OwnershipMap`, and `CapabilityMap`.
- **Does not** mutate `EvidenceGraph`,
  `CapabilityNormalizationReport`,
  `CapabilityPhraseReport`,
  `CapabilityNormalizationReviewLedger`, or
  `CapabilityOntologySuggestionReport`.
- **Does not** invoke an LLM.
- **Does not** read source files.
- **Does not** infer policy.
- **Does not** consume partial or low-confidence
  phrases.
- **Does not** consume raw
  `CapabilityNormalizationReport` rows.

## What `CapabilityMap` v2 Does Not Do

- It does **not** mutate `CapabilityPhraseReport`.
- It does **not** mutate `CapabilityNormalizationReport`.
- It does **not** mutate `EvidenceGraph`.
- It does **not** define a `CapabilityContract`.
- It does **not** enforce architecture rules.
- It does **not** route the resolver by capability.
- It does **not** plan verification by capability.
- It does **not** write source files.

These are deferred to future slices on the
capability-ontology track.

## Consumer Notes

- Existing v1 consumers reading `entries[]` need no
  change.
- New v2 consumers reading
  `phraseBackedCapabilities[]` can rely on the
  eligibility filter — every entry carries a
  non-empty `evidenceRefs`, a non-empty
  `sourceCandidateIds`, and the literal
  `confidence === "high"` / `status === "stable"`.
- The `phraseSourceRef` is the single source of
  truth for the consumed report. Consumers can fetch
  the report and follow each entry's
  `phraseRef.phraseId` back to its full phrase
  metadata (qualifier tokens, message, evidence
  tree).
- When `phraseBackedCapabilities` is absent, the
  `CapabilityMap` is a clean v1-shape (no phrase
  report was consumed); downstream surfaces should
  treat the v2 fields as optional and not require
  them.

## Publication Surfacing

The architecture summary and agent contract
publications surface the three v2 fields
(`phraseBackedCapabilities`,
`phraseBackedSummary`, `phraseSourceRef`) for
operators and agents. Both surfaces are **strictly
read-only**: they render data already on
`CapabilityMap` and never mutate it, never re-run
model projection, and never trigger CLI commands.

| Field | Read by | Rendered in |
| --- | --- | --- |
| `phraseBackedCapabilities` | architecture summary, agent contract | bounded table (verb / noun / domain / pattern / layer / evidence) |
| `phraseBackedSummary` | architecture summary, agent contract | count + top verbs / nouns |
| `phraseSourceRef` | architecture summary, agent contract | cited as the consumed `CapabilityPhraseReport` |

Both surfaces carry the same boundary statement:

> These entries are projection context, not
> `CapabilityContract` placement policy.
> `CapabilityMap` v2 does not imply placement
> policy, ownership policy, resolver routing,
> architecture linting, verification planning, or
> source writes.

The `Do Not Do` block in the agent contract carries
a reminder that v2 phrase-backed capabilities are
not `CapabilityContract` policy, not resolver
routing authority, not architecture lint findings,
not verification requirements, and not source-write
permission.

**Proof-report surfacing of `CapabilityMap` v2 is
deferred.** The proof report describes verification
proof; `CapabilityMap` v2 is semantic capability
projection. Surfacing v2 there would create proof
confusion.

Publications **read** `CapabilityMap` v2 fields and
**never** mutate `CapabilityMap`,
`CapabilityPhraseReport`,
`CapabilityNormalizationReport`, or
`EvidenceGraph`. See
[`architecture-summary-publication.md`](architecture-summary-publication.md)
and
[`agent-contract-publication.md`](agent-contract-publication.md)
for the rendered surfaces.

## Related Documents

- [CapabilityMap v2 High-Confidence-Only Decision](../strategy/capability-map-v2-high-confidence-decision.md)
- [CapabilityMap v2 Safety Review](../strategy/capability-map-v2-safety-review.md)
  — read-only audit confirming v2 is safe / stable
  as additive high-confidence projection.
- [CapabilityMap v2 Publication Safety Review](../strategy/capability-map-v2-publication-safety-review.md)
  — read-only audit confirming the publication
  surfacing is safe / stable as read-only
  visibility.
- [CapabilityContract Architecture Decision](../strategy/capability-contract-architecture-decision.md)
  — the policy layer that consumes
  `CapabilityMap` v2. Commits Rekon to Option B
  (config + artifact effective contract). Pins
  that `CapabilityMap` v2 must not grow policy
  fields.
- [CapabilityContract v1 Safety Review](../strategy/capability-contract-v1-safety-review.md)
  — thirty-fourth slice; declares the policy layer
  safe / stable as a read-only artifact and pins
  again that `CapabilityMap` v2 remains projection.
- [Architecture summary publication](architecture-summary-publication.md)
  — surfaces the v2 phrase-backed projection as
  operator context.
- [Agent contract publication](agent-contract-publication.md)
  — surfaces the v2 phrase-backed projection as
  agent guidance with explicit
  `CapabilityContract` boundary.
- [CapabilityPhraseReport artifact](capability-phrase-report.md)
- [CapabilityNormalizationReport artifact](capability-normalization-report.md)
- [Capability Ontology concept](../concepts/capability-ontology.md)
- [Post-AST Cohort Re-Run](../strategy/post-ast-cohort-rerun.md)
