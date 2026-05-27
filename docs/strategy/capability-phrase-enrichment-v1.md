# CapabilityPhraseReport Phrase Enrichment v1

**Status:** v1 implementation memo. Product capability
batch. **No `CapabilityMap` mutation. No
`CapabilityPhraseReport` shape change. No
`CapabilityNormalizationReport` semantics change. No
`EvidenceGraph` mutation. No new artifact registration. No
new CLI command. No source reads. No AST / typechecker /
LLM evidence. No source writes. No npm publish. No version
bump. No git tag. No GitHub Release. No new branch.**

**Audience:** future enrichment slice authors;
`CapabilityMap` v2 design decision; the second coverage
review.

**Companion docs:**

- [CapabilityPhraseReport Real-Repo Coverage Review](capability-phrase-report-coverage-review.md)
  — measured the sparsity that motivated this slice.
- [CapabilityPhraseReport Safety Review](capability-phrase-report-safety-review.md)
  — pinned the evidence-gated `CapabilityMap` v2
  boundary that this slice preserves.
- [CapabilityPhraseReport Decision](capability-phrase-report-decision.md)
  — Option B carrier commitment.
- [CapabilityPhrase + CapabilityContract Architecture Decision](capability-phrase-contract-architecture-decision.md).
- [`CapabilityPhraseReport` artifact reference](../artifacts/capability-phrase-report.md).

## Decision Summary

**Phrase enrichment v1** is shipped. The phrase projection
helper (`buildCapabilityPhraseReport` in
`@rekon/capability-ontology`) now consumes optional
`ObservedRepo` + `OwnershipMap` artifacts to populate the
phrase `domain` / `pattern` / `layer` fields when
deterministic context is available.

Pinned verbatim (the docs test asserts these):

- **Phrase enrichment v1 uses deterministic artifact
  context.**
- **The stable threshold is unchanged.**
- **Partial phrases are semantic context, not
  `CapabilityMap`-ready placement or ownership policy.**
- **`domain` / `pattern` / `layer` can be enriched
  deterministically from `ObservedRepo` + `OwnershipMap`.**
- **`sideEffects` / `inputs` / `outputs` remain deferred.**
- **`CapabilityMap` integration remains deferred.**

Coverage outcome on `target-1` (the real anonymized
Next.js TypeScript target from the coverage review):

- **before enrichment**: 16 stable phrases on 9,110
  candidates (0.18%; 6.6% of normalized).
- **after enrichment**: **239 total phrases** (16 stable +
  223 partial; **0% low-confidence**) on the same input.
  100% of phrases carry a `domain`; 40% carry a `layer`.
  Stable count is unchanged.

A 15x increase in projection yield, achieved without
relaxing the `stable` threshold and without inventing data.

## Status Model

The existing `CapabilityPhraseStatus` enum is unchanged.
Enrichment v1 keeps the meanings:

| Status | Meaning | CapabilityMap v2 eligible? |
| --- | --- | :-: |
| `stable` | Strictest class. `status === "normalized"`, `confidence === "high"`, raw split confidence `"high"`. Threshold **unchanged** by enrichment — enrichment only adds optional `domain` / `pattern` / `layer` fields onto an already-stable phrase. | ✅ |
| `partial` | Semantic context, **not** placement/ownership policy. `status === "normalized"`, confidence ≥ `"medium"`, split ≥ `"medium"`, candidate does **not** meet the stable threshold, AND at least one deterministic enrichment field (`domain`, `pattern`, `layer`) is present. Partial phrases never emit without real enrichment context. | ❌ (deferred to a future decision) |
| `low-confidence` | Reserved. Phrase Enrichment v1 does **not** emit low-confidence phrases. | ❌ |

## Enrichment Sources

Enrichment is strictly deterministic. The helper consults
only existing artifacts:

| Source | Field consumed | Phrase field populated | Rule |
| --- | --- | --- | --- |
| `OwnershipMap.entries[]` | `path` → `ownerSystem` | `domain` | Longest matching prefix wins. Empty / `"unknown"` / `"none"` are skipped. |
| `OwnershipMap.entries[]` | `path` → `layer` | `layer` | Same prefix match as `ownerSystem`. Empty / `"unknown"` / `"none"` are skipped. |
| `ObservedRepo.systems[]` | `paths[]` → `id` | `domain` (fallback when no `OwnershipMap` match) | Longest matching prefix; first matching system wins. |
| `ObservedRepo.systems[]` | `kind` (`route` / `service` / `ui` / `module` / `infra`) | `pattern` (`route-handler` / `service` / `component` / `module` / `infra`) | Empty / `"unknown"` / `"none"` are skipped. No other kinds map. |
| `ObservedRepo.systems[]` | `layers[]` | `layer` (fallback when no `OwnershipMap` match, and only when the system has exactly one layer) | Single-layer systems only — multi-layer systems are ambiguous. |

**Allowed** enrichment is the four-field set above
(`domain`, `pattern`, `layer`, and the stable threshold's
`verb` + `noun`). No phrase field is populated from
heuristics, name-pattern guessing, file content, or
inference.

**Deferred** enrichment (does **not** ship in v1):

- `sideEffects` — requires runtime side-effect evidence or
  call-graph data.
- `inputs` / `outputs` — requires schemas, API specs, or
  test-to-capability mapping.
- `qualifier[]` — requires sharper lexical-split tokens
  and canon-pack vocabulary expansion.
- `requiredChecks` / `allowedSystems` / `allowedLayers` /
  `forbiddenSystems` / `forbiddenLayers` — these are
  `CapabilityContract` policy concerns, not phrase
  concerns.

Each deferred field ships behind its own decision memo per
the architecture decision.

## CLI Surface

`rekon capability phrase project --report <ref>` is
backward-compatible. The CLI now optionally reads:

- the latest `ObservedRepo` from `.rekon/registry/artifacts.index.json`
- the latest `OwnershipMap` from the same index

Both are optional. Missing context is **not** a CLI
failure — it just reduces enrichment yield. The CLI:

- writes only a `CapabilityPhraseReport`;
- does **not** mutate `CapabilityMap`,
  `CapabilityNormalizationReport`, or `EvidenceGraph`;
- adds a `contextRefs` field to the JSON output that
  records which `ObservedRepo` / `OwnershipMap` the CLI
  read (separately from `inputRefs`, which only cite
  consumed artifacts);
- emits enrichment counts in human output:
  `Enrichment: withDomain N, withPattern N, withLayer N`.

`header.inputRefs` cites `ObservedRepo` and/or
`OwnershipMap` **only when at least one candidate path
matched and the helper used the enrichment**. This keeps
the audit chain tight: a phrase report that cites no
enrichment artifact projected zero enriched phrases.

## Publication Surfacing

Architecture summary + agent contract `Capability Phrases`
sections naturally surface the new `partial` count via the
existing `Phrases: N (stable N, partial N, low-confidence
N)` line and the enrichment line
(`Enrichment: withDomain N, withPattern N, withLayer N`).
The agent contract retains the existing `Do Not Do`
reminder: *Do not treat `CapabilityPhraseReport` entries
as `CapabilityMap` ownership or placement policy.*

No new publication section. No proof report change. The
deferred-`CapabilityMap` callout remains in both surfaces.

## Implementation Sketch

```ts
type BuildCapabilityPhraseReportInput = {
  header: ArtifactHeader;
  normalizationReport: CapabilityNormalizationReport;
  normalizationReportRef: ArtifactRef;
  // Phrase Enrichment v1 (all optional)
  observedRepo?: ObservedRepo;
  observedRepoRef?: ArtifactRef;
  ownershipMap?: OwnershipMap;
  ownershipMapRef?: ArtifactRef;
};
```

The helper builds an in-memory index keyed by path prefix
(longest first) for both `OwnershipMap` entries and
`ObservedRepo` systems. For each normalized candidate:

1. Skip if `status !== "normalized"`.
2. Skip if `confidence === "low"` or split `=== "low"`.
3. Compute enrichment: longest-prefix `OwnershipMap` match
   (`domain` + `layer`), then longest-prefix
   `ObservedRepo` system match (fallback `domain`,
   `pattern` from `kind`, single-layer `layer`).
4. If the candidate meets the strict threshold
   (`confidence === "high"` AND split `=== "high"`),
   emit as `stable` — with optional enrichment.
5. Otherwise, emit as `partial` only if **at least one
   enrichment field is present**. Otherwise skip.

`"unknown"` / `"none"` / empty values are treated as
non-enriching at the source — they appear in upstream
artifacts when the projector lacks confident evidence;
surfacing them as phrase enrichment would falsely imply
known domain / pattern / layer.

## What This Does Not Do

- Does **not** mutate `CapabilityMap`.
- Does **not** add `CapabilityMap` v2.
- Does **not** add `CapabilityContract`.
- Does **not** add `RefactorPreservationContract`.
- Does **not** change `CapabilityNormalizationReport`
  semantics or schema.
- Does **not** mutate `EvidenceGraph` or the
  `CapabilityNormalizationReviewLedger`.
- Does **not** add architecture linting, resolver routing,
  or verification planning by capability.
- Does **not** use AST / typechecker evidence.
- Does **not** use LLM-only inference.
- Does **not** read source files.
- Does **not** add source writes. **Source writes remain
  unavailable.**
- Does **not** add a new CLI command, new permission, new
  role, or new workflow YAML.
- Does **not** publish to npm. **No version bump. No git
  tag. No GitHub Release. No new branch.**

## Follow-Up Work

- **Second coverage review** (next slice). Run fixture +
  at least one real cohort target through the enrichment
  pipeline. Measure: stable count, partial count,
  withDomain / withPattern / withLayer ratios, publication
  usefulness, and whether `CapabilityMap` v2 is finally
  ready to design.
- **`CapabilityMap` v2 high-confidence-only design
  decision** — gated on the second coverage review.
- **Per-evidence-source enrichment slices** (one per
  source): framework convention enrichment, architecture
  profile enrichment, future AST adapters, LLM as audit
  signal.
- **`qualifier[]` enrichment** — sharper lexical-split
  tokens beyond verb/noun.
- **`sideEffects` / `inputs` / `outputs` slices** — each
  ships behind its own decision memo. None ship here.
- **`CapabilityContract` decision** — further future,
  after phrases stabilize across multiple cohort targets.

## See Also

- [CapabilityPhraseReport Real-Repo Coverage Review](capability-phrase-report-coverage-review.md)
- [CapabilityPhraseReport Safety Review](capability-phrase-report-safety-review.md)
- [CapabilityPhraseReport Decision](capability-phrase-report-decision.md)
- [CapabilityPhrase + CapabilityContract Architecture Decision](capability-phrase-contract-architecture-decision.md)
- [Capability Ontology Translation Layer Decision](capability-ontology-translation-layer-decision.md)
- [`CapabilityPhraseReport` artifact reference](../artifacts/capability-phrase-report.md)
- [`CapabilityNormalizationReport` artifact reference](../artifacts/capability-normalization-report.md)
- [Capability ontology concept](../concepts/capability-ontology.md)
- [Roadmap](roadmap.md)
- [Classic-behavior roadmap](classic-behavior-roadmap.md)
