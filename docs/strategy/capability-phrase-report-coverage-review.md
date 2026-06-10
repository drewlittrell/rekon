# CapabilityPhraseReport Real-Repo Coverage Review

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

**Status:** v1 coverage / dogfood-analysis memo. Strategy /
docs / tests-only batch. **No runtime change. No
`CapabilityMap` mutation. No `CapabilityPhraseReport` shape
change. No `CapabilityNormalizationReport` shape change. No
phrase projection rule change. No canon pack change. No new
artifact registration. No new CLI command. No source
writes. No LLM-only inference. No npm publish. No version
bump. No git tag. No GitHub Release. No new branch.**

**Audience:** the `CapabilityMap` v2 decision; future
phrase enrichment slices; operators evaluating whether the
phrase track has produced enough evidence to cross the
`CapabilityMap` boundary.

**Companion docs:**

- [CapabilityPhraseReport Safety Review](capability-phrase-report-safety-review.md)
  — pinned the gate this review now measures.
- [CapabilityPhraseReport Decision](capability-phrase-report-decision.md)
  — Option B carrier commitment.
- [`CapabilityPhraseReport` artifact reference](../artifacts/capability-phrase-report.md).
- [Built-In Baseline Ontology Coverage Review](builtin-ontology-coverage-review.md)
  — prior coverage review at the normalization layer
  (Layer 5) using the same `target-1` repo.

## Decision Summary

Selected: **Phrase enrichment v1 is the next slice.**
`CapabilityMap` v2 design / implementation **stays
deferred** until phrase yield on real repos is richer than
the v1 strict-projection rule produces today.

Verdict (verbatim):

> CapabilityPhraseReport is structurally safe and produces
> meaningful, high-confidence phrases on a real Next.js
> TypeScript target. **Phrase quality is high; phrase
> coverage is sparse.** Stable phrase yield is **0.18% of
> total candidates** and **6.6% of normalized candidates**
> on `target-1`. **`CapabilityMap` v2 remains
> evidence-gated**: building a canonical projection from 16
> phrases would project the appearance of completeness on
> a 9,110-candidate repo where 61% of candidates are
> unknown. Phrase enrichment v1 (deterministic domain /
> pattern / layer signal from `ObservedRepo` +
> `OwnershipMap`) is the right next slice, after which the
> high-confidence-only `CapabilityMap` v2 decision can be
> made on richer evidence. **Only stable high-confidence
> phrases remain eligible for future `CapabilityMap` v2.**
> **Unknown / low-confidence rows remain in
> `CapabilityNormalizationReport` and never project into
> phrases or `CapabilityMap`.**

Verbatim pins (the docs test asserts these):

- **CapabilityMap v2 is evidence-gated.**
- **Stable high-confidence phrases were measured on a real
  repo.**
- **Unknown / low-confidence rows remain excluded from
  phrases and from any future `CapabilityMap` v2.**

## Why This Review Exists

The
[CapabilityPhraseReport Safety Review](capability-phrase-report-safety-review.md)
shipped at `27f4432` pinned three structural guarantees but
explicitly deferred the `CapabilityMap` v2 decision until
"phrase coverage is measured on real repos." That review
declared the artifact path safe; it did *not* declare it
useful enough to feed a canonical projection.

This memo measures usefulness on a fixture and at least one
real, anonymized non-Rekon repo, and selects the next
slice based on the observed data.

The product guarantee preserved here: **`CapabilityMap` v2
remains evidence-gated.** No assumption that "stable
high-confidence" is enough is committed without measured
support.

## Targets Reviewed

| Target | Archetype | Source | Result |
| --- | --- | --- | --- |
| `examples/simple-js-ts` (temp copy) | minimal JS/TS fixture | bundled example repo (temp `mktemp` copy) | refresh + normalize + phrase project + publish all succeed. 4 candidates, 0 normalized, 0 phrases — strict v1 rules hold even on a sparse repo. |
| `target-1` | real-world Next.js TypeScript application | `mktemp` copy of an operator-controlled repo (anonymized) | refresh + normalize + phrase project + publish all succeed. 9,110 candidates, 241 normalized, 524 alias-applied, **16 stable phrases**. |

`target-1` is the same anonymized real-world target used in
the [Built-In Baseline Ontology Coverage Review](builtin-ontology-coverage-review.md).
Repo identity, file paths, and source excerpts are not
reproduced. Counts and term shapes are sufficient to
make the `CapabilityMap` v2 readiness decision.

No `pnpm install` was run on `target-1` (the prior temp
copy survived from the earlier normalization coverage
slice). The phrase projection consumes the same
`EvidenceGraph` and exercises the same canon-pack +
override pipeline as a freshly built target would.

## Command Matrix

For each target, the exact command sequence run (verbatim
from the work order):

```bash
node packages/cli/dist/index.js refresh --root "$ROOT" --json
node packages/cli/dist/index.js capability ontology normalize --root "$ROOT" --json
NORMALIZATION_REF="$(node packages/cli/dist/index.js artifacts latest --root "$ROOT" --type CapabilityNormalizationReport --id-only)"
node packages/cli/dist/index.js capability phrase project --root "$ROOT" --report "$NORMALIZATION_REF" --json
PHRASE_REF="$(node packages/cli/dist/index.js artifacts latest --root "$ROOT" --type CapabilityPhraseReport --id-only)"
node packages/cli/dist/index.js publish architecture --root "$ROOT" --json
node packages/cli/dist/index.js publish agent-contract --root "$ROOT" --json
node packages/cli/dist/index.js artifacts validate --root "$ROOT" --json
```

Every command completed successfully on both targets. No
artifact validation failures, no crashes, no unexpected
errors. Aggregate command runtime on `target-1` was within
the same envelope as the prior normalization coverage
slice.

## Normalization Results

| Target | Total Candidates | Normalized | Unknown Verb | Unknown Noun | Unknown | Ignored | Alias Applied | Low Confidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `examples/simple-js-ts` | 4 | 0 | 0 | 0 | 1 | 1 | 0 | 2 |
| `target-1` | 9,110 | 241 | 1,670 | 831 | 4,088 | 226 | 524 | 2,054 |

Observations on `target-1`:

- Normalized count rose from 100 (prior review) to **241**
  thanks to canon packs v1 (`40ba911`) and the
  Next.js / monorepo overlay logic.
- Alias-applied rose from 561 to **524**? — actually a
  small drop, reclassified into the now-larger `normalized`
  bucket as the canon pack expanded canonical pairs.
- `unknownVerb` rose from 578 → 1,670 and `unknownNoun`
  rose from 594 → 831 because more tokens now classify
  "unknown verb / unknown noun" instead of "fully unknown"
  — the lexical splitter is sharper but the canon pack
  still does not cover every token. The total `unknown +
  unknownVerb + unknownNoun` is **6,589**, down from
  **6,730** in the prior review.
- The fixture (`examples/simple-js-ts`) emits 4 candidates;
  none normalize. This is correct behaviour — the fixture
  exists to test artifact shape, not capability coverage.

## Phrase Results

| Target | Total Phrases | Stable | Partial | Low Confidence | With Domain | With Pattern | With Layer |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `examples/simple-js-ts` | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `target-1` | **16** | **16** | 0 | 0 | 0 | 0 | 0 |

Stable phrase ratios on `target-1`:

| Ratio | Value |
| --- | ---: |
| stable phrases / total candidates | 16 / 9,110 = **0.18%** |
| stable phrases / normalized candidates | 16 / 241 = **6.6%** |
| stable phrases / (normalized + alias-applied) | 16 / 765 = **2.1%** |

The 16 phrases on `target-1`, in observed order (verbs and
nouns are canonical-pack vocabulary; no source paths or
internal symbol names are reproduced):

| # | Verb | Noun | Status | Confidence | Evidence refs |
| ---: | --- | --- | --- | --- | ---: |
| 1 | `get` | `result` | stable | high | 1 |
| 2 | `get` | `result` | stable | high | 1 |
| 3 | `fetch` | `result` | stable | high | 1 |
| 4 | `publish` | `event` | stable | high | 1 |
| 5 | `build` | `session` | stable | high | 1 |
| 6 | `build` | `session` | stable | high | 1 |
| 7 | `build` | `session` | stable | high | 1 |
| 8 | `build` | `session` | stable | high | 1 |
| 9 | `verify` | `service` | stable | high | 1 |
| 10 | `fetch` | `config` | stable | high | 1 |
| 11 | `validate` | `page` | stable | high | 1 |
| 12 | `render` | `record` | stable | high | 1 |
| 13 | `create` | `token` | stable | high | 1 |
| 14 | `execute` | `report` | stable | high | 1 |
| 15 | `resolve` | `session` | stable | high | 1 |
| 16 | `route` | `report` | stable | high | 1 |

Top phrase verbs (`target-1`): `build` (4), `get` (2),
`fetch` (2), then `publish`, `verify`, `validate`,
`render`, `create`, `execute`, `resolve`, `route` (1 each).

Top phrase nouns: `session` (5), `result` (3), `report`
(2), then `event`, `service`, `config`, `page`, `record`,
`token` (1 each).

Top verb:noun pairs: `build:session` (4), `get:result`
(2), then 10 distinct unique pairs.

**Inspection verdict:** every phrase term is a recognizable
domain capability. None look like noise. None look like
file-path or system-seed pollution (those stay in
`CapabilityNormalizationReport`'s `ignored` /
`low-confidence` rows, as the v1 strict projection rule
requires).

**Sparsity verdict:** 16 phrases — even with no junk — is
too thin to drive a useful canonical `CapabilityMap` v2
across an entire Next.js TypeScript application of 9,110
candidates. Projection today would imply ~99.8% of
candidates have no canonical capability projection, which
is true but operationally misleading.

## Evidence Ref Distribution

`target-1` phrase entries:

- entries with at least one `EvidenceGraph` ref: **16 / 16**
- entries citing only the normalization report (no
  `EvidenceGraph`): **0 / 16**
- entries with multiple source candidate ids: **0 / 16**
  (each phrase corresponds to one candidate — no
  aggregation yet)

Every phrase carries the audit chain back to the source
`EvidenceGraph` fact, satisfying the safety review's
"evidence refs present" gate. The single-source-candidate
shape is a v1 simplification; future enrichment slices may
collapse duplicate verb:noun pairs into one phrase with
multiple `sourceCandidateIds`.

## Publication Usefulness

`target-1` publications were inspected after `publish
architecture` + `publish agent-contract`:

- Architecture summary `## Capability Phrases` section:
  **present**. Renders report ref, source normalization
  ref, `Phrases: 16 (stable 16, partial 0, low-confidence
  0)`, `Enrichment: withDomain 0, withPattern 0, withLayer
  0`, the deferred-`CapabilityMap` callout, and the bounded
  phrase table (10 entries shown with explicit "6
  additional phrase(s) omitted" notice).
- Agent contract `### Capability Phrases` subsection:
  **present**. Same metadata + the `Do Not Do` reminder
  pinning that phrases are not `CapabilityMap` ownership or
  placement policy.
- Proof report phrase section: **absent** — as deferred by
  the safety review. Verification proof is not a phrase
  concern.
- Phrase table understandable: **yes** — every row has
  verb, noun, status, confidence, and evidence-ref count.
- Header `inputRefs` cite the phrase report: **yes**
  (`capability-phrases.changed` invalidation rule covers
  it).

The publications make the phrase output **understandable**
to a human operator scanning the summary. They do **not**
yet visualize a "capability map" — by design, since
`CapabilityMap` v2 is not implemented.

The fixture (`examples/simple-js-ts`) renders the same
section with `Phrases: 0 (stable 0, ...)` and still carries
the deferred-`CapabilityMap` callout. This confirms the
publisher handles zero-phrase repos correctly without
inventing data.

## CapabilityMap Readiness

| Gate | Result | Notes |
| --- | --- | --- |
| real repo non-trivial stable phrases | **pass (sparse)** | 16 stable phrases on `target-1`; non-trivial in count but only 0.18% of candidates and 6.6% of normalized candidates. |
| evidence refs present | **pass** | every phrase has an `EvidenceGraph` ref + the source normalization report. |
| unknown / low-confidence excluded | **pass** | 4,088 unknown + 1,670 unknown-verb + 831 unknown-noun + 2,054 low-confidence rows stay in `CapabilityNormalizationReport` and never project. |
| publications understandable | **pass** | both architecture summary and agent contract render the phrase section with deferred-`CapabilityMap` callout. |
| artifacts validate clean | **pass** | `rekon artifacts validate --json` on both targets returned `{ "valid": true, "issues": [] }`. |
| phrase coverage sufficient to drive a useful canonical projection | **fail** | 0.18% of candidates is too sparse — `CapabilityMap` v2 today would project the appearance of completeness on a repo where 61% of candidates are unknown. |

Five of six gates pass. The sixth — *coverage sufficient
for a useful canonical projection* — is the gate the safety
review explicitly added: structural readiness is necessary
but not sufficient. The recommended response is **not** to
re-tune the projection rule (which would erode the
high-confidence-only contract), and **not** to widen the
canon pack alone (which is one cause but not the only
one). The recommended response is **phrase enrichment v1**:
let partial phrases emit when at least one deterministic
enrichment signal (path / framework / owner) is available
alongside the canonical verb:noun pair, while keeping
`status === "stable"` reserved for the strictest case.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| `CapabilityMap` v2 high-confidence-only | **deferred** | 16 stable phrases on a 9,110-candidate real repo would form a useful starter map *only* with explicit operator framing. Without enrichment, ~99.8% of candidates would have no projection. Defer until phrase yield is richer. |
| Phrase enrichment v1 | **selected (next slice)** | Adds deterministic `domain` / `pattern` / `layer` enrichment from `ObservedRepo` + `OwnershipMap` and lets `partial` phrases emit. Raises projection rate while keeping the strict `stable` gate for `CapabilityMap` v2. Does not change phrase shape; respects safety review pins. |
| Candidate-quality improvements (lexical splitter / candidate extraction) | deferred (parallel) | The lexical splitter already classifies path-shaped hints as `low-confidence` (correct), and ownership hints as `ignored` (correct). Improvements here would unlock more *unknown* candidates, but the primary bottleneck is canonical-pack and enrichment, not extraction. Track as follow-up. |
| Canon pack expansion | deferred (parallel) | The Next.js / monorepo overlays already shipped (`40ba911`) and grew normalized from 100 → 241. Further canon-pack growth helps but should land alongside enrichment, not before. |
| More dogfood (additional non-Rekon repos) | deferred (parallel) | Useful for breadth, but `target-1` already produces enough signal to make the next-slice decision. Additional cohort targets can land alongside phrase enrichment v1 to validate enrichment metrics. |
| `CapabilityContract` reservation work | deferred | Stays a reserved name. Policy layer remains future. |

## Recommendation

**Phrase enrichment v1** is the next implementation slice.
Specifically:

1. Add deterministic enrichment from `ObservedRepo` (path
   prefix → `domain`, package-role → `pattern`, layer name
   → `layer`) and `OwnershipMap` (owner → `domain`).
2. Emit a `partial` phrase when the canonical pair is known
   but no enrichment field is present.
3. Keep `status === "stable"` for the strictest case
   (high-confidence + normalized + high-confidence lexical
   split + at least one enrichment field present).
4. **Do not** change the v1 strict rule for `stable`
   status: the safety review's pin —
   *only stable high-confidence phrases are eligible for
   future `CapabilityMap` v2* — must hold.
5. Cite `ObservedRepo` and `OwnershipMap` in the phrase
   report's `header.inputRefs` when those evidence sources
   contributed.

After enrichment ships and a second coverage review
measures the new stable-phrase ratio, the
`CapabilityMap` v2 high-confidence-only design decision can
land.

## What This Does Not Do

- Does **not** mutate `CapabilityMap`.
- Does **not** mutate `EvidenceGraph`.
- Does **not** mutate `CapabilityNormalizationReport`.
- Does **not** mutate `CapabilityPhraseReport`.
- Does **not** change phrase projection rules.
- Does **not** change canon packs or overlays.
- Does **not** add `CapabilityContract`.
- Does **not** add `RefactorPreservationContract`.
- Does **not** add architecture linting.
- Does **not** add resolver routing by capability.
- Does **not** add verification planning by capability.
- Does **not** use AST / typechecker evidence.
- Does **not** use LLM-only inference.
- Does **not** add a CLI command.
- Does **not** add a new permission, role, or workflow YAML.
- Does **not** add source writes. **Source writes remain
  unavailable.**
- Does **not** publish to npm. **No version bump. No git
  tag. No GitHub Release. No new branch.**

## Follow-Up Work

- **Phrase enrichment v1** — ✅ Shipped. See
  [Phrase Enrichment v1 Memo](capability-phrase-enrichment-v1.md).
  Deterministic `domain` / `pattern` / `layer` from
  `ObservedRepo` + `OwnershipMap`. `partial` phrases emit
  only with deterministic enrichment context. Stable
  threshold unchanged. Coverage on `target-1` rose from
  16 → 239 phrases (15× yield).
- **Enrichment coverage review** — ✅ Shipped. See
  [Enrichment Coverage Review](capability-phrase-enrichment-coverage-review.md).
  Confirmed: stable count unchanged at 16; partial
  coverage rich (223); `CapabilityMap` v2 stays
  deferred. Next slice is candidate-quality
  improvements.
- **Second coverage review** after phrase enrichment v1
  lands. Measure: stable-phrase ratio change, partial
  phrase yield, enrichment field coverage, publication
  usefulness on `target-1` and at least one additional
  real non-Rekon repo.
- **CapabilityMap v2 high-confidence-only design decision**
  (gated on the second coverage review). Must respect the
  safety review's stable-only consumption pin.
- **Canon pack expansion** (parallel; per-archetype). Can
  ship alongside phrase enrichment.
- **Candidate-quality improvements** (parallel; track as
  separate slice). Lexical-split sharpening for `verb`
  extraction is a possible enrichment, but secondary to
  enrichment v1.
- **Additional cohort targets** (parallel; intake-gated).
  Operators may supply more anonymized real repos when
  available.
- **`CapabilityContract` decision** (further future, after
  phrases stabilize across multiple targets).

## See Also

- [CapabilityPhraseReport Safety Review](capability-phrase-report-safety-review.md)
- [CapabilityPhraseReport Decision](capability-phrase-report-decision.md)
- [CapabilityPhrase + CapabilityContract Architecture Decision](capability-phrase-contract-architecture-decision.md)
- [Capability Ontology Translation Layer Decision](capability-ontology-translation-layer-decision.md)
- [Capability Ontology Canon + Override Model Decision](capability-ontology-canon-override-model-decision.md)
- [Built-In Baseline Ontology Coverage Review](builtin-ontology-coverage-review.md)
- [`CapabilityPhraseReport` artifact reference](../artifacts/capability-phrase-report.md)
- [`CapabilityNormalizationReport` artifact reference](../artifacts/capability-normalization-report.md)
- [Capability ontology concept](../concepts/capability-ontology.md)
- [Roadmap](roadmap.md)
- [Classic-behavior roadmap](classic-behavior-roadmap.md)
