# CapabilityPhraseReport Enrichment Coverage Review

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

**Status:** v2 coverage / dogfood-analysis memo. Strategy /
docs / tests-only batch. **No runtime change. No
`CapabilityMap` mutation. No `CapabilityPhraseReport` shape
change. No `CapabilityNormalizationReport` shape change. No
phrase projection rule change. No canon pack change. No new
artifact registration. No new CLI command. No source
writes. No LLM-only inference. No npm publish. No version
bump. No git tag. No GitHub Release. No new branch.**

**Audience:** the `CapabilityMap` v2 decision; future
candidate-quality / phrase-enrichment slices; operators
evaluating whether phrase enrichment v1 was enough to cross
the `CapabilityMap` boundary.

**Companion docs:**

- [Phrase Enrichment v1 Memo](capability-phrase-enrichment-v1.md)
  — the slice this review measures.
- [Pre-Enrichment Coverage Review](capability-phrase-report-coverage-review.md)
  — the baseline this review compares against.
- [CapabilityPhraseReport Safety Review](capability-phrase-report-safety-review.md)
  — pinned the evidence-gated `CapabilityMap` v2 boundary
  this review continues to preserve.
- [`CapabilityPhraseReport` artifact reference](../artifacts/capability-phrase-report.md).

## Decision Summary

Selected: **`CapabilityMap` v2 stays deferred.**
**Candidate-quality improvements** is the next slice —
specifically, raising the **normalized** count (currently
241 of 9,110 candidates = 2.6% on `target-1`) by expanding
canon-pack vocabulary and sharpening lexical-split rules.

Verdict (verbatim):

> **Phrase enrichment v1 materially improved coverage**
> for publication and agent-context use — `target-1` went
> from 16 total phrases to 239 (a 15× yield increase) —
> **but the stable phrase count is unchanged at 16**. The
> stable threshold remains strict, as designed; enrichment
> adds optional `domain` / `pattern` / `layer` context to
> already-stable phrases and emits a new `partial` class
> with deterministic context, but it does not raise the
> `CapabilityMap`-v2-eligible foundation. **CapabilityMap
> v2 is evidence-gated**, and on stable evidence the gate
> has not moved. **Partial phrases alone do not justify
> `CapabilityMap` v2.** The bottleneck is upstream: 97.4%
> of candidates are not normalized at all. The next slice
> should attack candidate quality — not add more
> projection layers.

Verbatim pins (the docs test asserts these):

- **Phrase enrichment materially improved coverage.**
- **The stable threshold remains unchanged.**
- **Partial phrases alone do not justify `CapabilityMap`
  v2.**
- **`CapabilityMap` v2 is evidence-gated.**

## Why This Review Exists

The [Phrase Enrichment v1 memo](capability-phrase-enrichment-v1.md)
shipped at `29d3444` claimed a 15× yield improvement
based on a single spot-check. The
[Pre-Enrichment Coverage Review](capability-phrase-report-coverage-review.md)
selected enrichment v1 as the next slice on condition
that a **second coverage review** would measure the
actual change before any `CapabilityMap` v2 decision
moves forward.

This memo is that second review. It measures phrase
output with enrichment enabled on the same fixture +
`target-1` real repo and selects the next slice based on
the observed data.

The product guarantee preserved here: **`CapabilityMap`
v2 remains evidence-gated.** Only stable high-confidence
phrases are eligible. Partial phrases are useful semantic
context but not placement/ownership policy.

## Targets Reviewed

| Target | Archetype | Source | Result |
| --- | --- | --- | --- |
| `examples/simple-js-ts` (temp copy) | minimal JS/TS fixture | bundled example repo (temp `mktemp` copy) | refresh + normalize + phrase project + publish all succeed. 4 candidates, 0 normalized, 0 phrases — strict v1 rules hold; enrichment-context was available but no normalized candidates existed to enrich. |
| `target-1` | real-world Next.js TypeScript application | `mktemp` copy of an operator-controlled repo (anonymized) | refresh + normalize + phrase project + publish all succeed. 9,110 candidates, 241 normalized, 524 alias-applied, **239 total phrases (16 stable + 223 partial; 0 low-confidence)**. 100% of phrases carry `domain`; 40% carry `layer`; 0% carry `pattern`. |

`target-1` is the same anonymized real-world target used
in the [pre-enrichment coverage review](capability-phrase-report-coverage-review.md).
Repo identity, file paths, and source excerpts are not
reproduced. Counts and term shapes are sufficient to
make the `CapabilityMap` v2 readiness decision.

## Command Matrix

Identical to the pre-enrichment review (verbatim from the
work order):

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
errors. The CLI now reads the latest `ObservedRepo` +
`OwnershipMap` automatically; the fixture and `target-1`
both have those artifacts present in their stores, so the
helper consumed them on both runs (`contextRefs.observedRepo`
and `contextRefs.ownershipMap` populated in JSON output).

## Normalization Results

Unchanged from the pre-enrichment review (the normalizer
was not touched by enrichment v1):

| Target | Total Candidates | Normalized | Unknown Verb | Unknown Noun | Unknown | Ignored | Alias Applied | Low Confidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `examples/simple-js-ts` | 4 | 0 | 0 | 0 | 1 | 1 | 0 | 2 |
| `target-1` | 9,110 | 241 | 1,670 | 831 | 4,088 | 226 | 524 | 2,054 |

Key observation: **the normalized count on `target-1` is
241 (2.6%)**, exactly as before. Enrichment v1 cannot
move this — it only consumes normalized candidates. To
move stable phrase count meaningfully, the *normalized*
count has to rise.

## Phrase Results

| Target | Total Phrases | Stable | Partial | Low Confidence | With Domain | With Pattern | With Layer |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `examples/simple-js-ts` | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `target-1` | **239** | **16** | **223** | 0 | **239** | 0 | **95** |

Before-vs-after comparison on `target-1`:

| Metric | Pre-enrichment | Post-enrichment | Delta |
| --- | ---: | ---: | --- |
| Total phrases | 16 | 239 | **+223 (+1394%)** |
| Stable phrases | 16 | **16** | **0 (unchanged)** |
| Partial phrases | 0 | 223 | +223 |
| Low-confidence | 0 | 0 | unchanged |
| withDomain | 0 | 239 | +239 |
| withPattern | 0 | 0 | unchanged |
| withLayer | 0 | 95 | +95 |

**The stable phrase count is unchanged**, as the
enrichment v1 design promised. The 15× yield gain comes
entirely from the new `partial` class.

Stable phrases on `target-1` (the only CapabilityMap-v2-
eligible class), with their enrichment fields:

| Verb | Noun | Domain | Layer |
| --- | --- | --- | --- |
| build | session | `core` | `test` |
| build | session | `core` | `test` |
| build | session | `core` | `test` |
| build | session | `core` | `test` |
| create | token | `tools` | — |
| execute | report | `app` | — |
| fetch | config | `app` | — |
| fetch | result | `core` | `test` |
| get | result | `core` | `test` |
| get | result | `core` | `test` |
| publish | event | `core` | `test` |
| render | record | `app` | — |
| resolve | session | `app` | — |
| route | report | `app` | — |
| validate | page | `app` | — |
| verify | service | `core` | `test` |

Top verbs / nouns / pairs:

- Stable verbs: `build` (4), `get` (2), `fetch` (2),
  `publish`, `verify`, `validate`, `render`, `create`,
  `execute`, `resolve`, `route` (1 each).
- Stable nouns: `session` (5), `result` (3), `report`
  (2), `event`, `service`, `config`, `page`, `record`,
  `token` (1 each).
- Stable verb:noun pairs: `build:session` (4),
  `get:result` (2), and 10 distinct singletons.

Partial phrases on `target-1` (semantic context only;
**not** `CapabilityMap`-ready):

- Partial verbs (top 10): `save` (51), `get` (46),
  `build` (44), `normalize` (15), `resolve` (13),
  `create` (10), `list` (8), `execute` (7), `fetch` (6),
  `validate` (5).
- Partial nouns (top 10): `schema` (40), `response`
  (30), `request` (20), `route` (20), `plan` (18),
  `context` (13), `token` (11), `report` (11), `session`
  (9), `state` (8).
- Partial verb:noun pairs (top 10): `save:schema` (24),
  `save:request` (16), `get:response` (14), `build:plan`
  (13), `get:schema` (12), `save:response` (8),
  `build:report` (8), `get:token` (6), `resolve:route`
  (6), `build:route` (6).

**Inspection verdict** on partial phrases: every pair is
a recognizable domain capability term. None look like
file-path or system-seed pollution. The terms are
plausibly useful for agent guidance ("the code under
`core/` saves schemas, responses, and requests") but they
are not strong enough to declare placement or ownership
policy — confirmed by the deterministic rule that
**`partial` is not eligible for `CapabilityMap` v2**.

## Enrichment Coverage

| Target | Stable Ratio | Total Phrase Ratio | Domain Coverage | Pattern Coverage | Layer Coverage |
| --- | ---: | ---: | ---: | ---: | ---: |
| `examples/simple-js-ts` | 0 / 4 = 0% | 0 / 4 = 0% | n/a | n/a | n/a |
| `target-1` (stable only) | 16 / 9,110 = 0.18% | n/a | 16 / 16 = 100% | 0 / 16 = 0% | 9 / 16 = 56% |
| `target-1` (all phrases) | n/a | 239 / 9,110 = 2.6% | 239 / 239 = 100% | 0 / 239 = 0% | 95 / 239 = 40% |

Stable phrases / candidates = **0.18% (unchanged)**.
Total phrases / candidates = **2.6%** (up from 0.18%).

Enrichment field observations:

- **Domain is the strongest enrichment** — 100% of
  emitted phrases carry a `domain`. This is the
  deterministic `OwnershipMap` → `ownerSystem` path
  doing its job. Five unique domains were emitted on
  `target-1`: `app`, `core`, `infra`, `src`, `tools`.
- **Pattern is the weakest** — 0% of emitted phrases
  carry a `pattern`. Root cause: `target-1`'s
  `ObservedRepo` doesn't populate `systems[].kind` with
  any of the deterministic-mappable values (`route`,
  `service`, `ui`, `module`, `infra`). This is an
  **upstream `ObservedRepo` projector limitation**, not
  a phrase-projection limitation. Pattern enrichment
  works correctly when `kind` is present (verified by
  contract test #3 in
  `tests/contract/capability-phrase-enrichment.test.mjs`).
- **Layer is partial** — 40% of emitted phrases carry a
  `layer`. Only one layer value was emitted on
  `target-1`: `test`. Other `OwnershipMap` entries had
  `layer === "unknown"` and were filtered as
  non-enriching at the source. This is correct
  behaviour — empty / `"unknown"` / `"none"` skip.

## Evidence Ref Distribution

`target-1` (all 239 phrases):

- entries with at least one `EvidenceGraph` ref: **239 /
  239 (100%)**
- entries citing only the normalization report (no
  `EvidenceGraph`): **0 / 239**
- `header.inputRefs` cites `ObservedRepo`: **yes**
  (enrichment was consumed)
- `header.inputRefs` cites `OwnershipMap`: **yes**
  (enrichment was consumed)
- `header.inputRefs` cites `CapabilityNormalizationReport`:
  **yes** (source ref)
- `header.inputRefs` cites underlying `EvidenceGraph`:
  **yes** (propagated through the normalization report)

Every phrase carries the audit chain back to the source
`EvidenceGraph` fact. Every phrase report cites the four
enrichment-consumed artifact types (`CapabilityNormalizationReport`,
`EvidenceGraph`, `ObservedRepo`, `OwnershipMap`). The
audit chain is intact.

## Publication Usefulness

`target-1` publications, after `publish architecture` +
`publish agent-contract`:

- Architecture summary `## Capability Phrases` section:
  **present**. Renders report ref, source normalization
  ref, `Phrases: 239 (stable 16, partial 223,
  low-confidence 0)`, `Enrichment: withDomain 239,
  withPattern 0, withLayer 95`, the deferred-
  `CapabilityMap` callout, and a bounded phrase table.
- Agent contract `### Capability Phrases` subsection:
  **present**. Same metadata + the `Do Not Do` reminder
  pinning that phrases are not `CapabilityMap` ownership
  or placement policy. The reminder remains visible and
  on-topic now that partial phrases ship.
- Proof report phrase section: **absent** — still
  deferred, as the safety review required.
- Phrase table understandable: **yes** — verb, noun,
  status, confidence, evidence-ref count visible per
  row.
- Deferred-`CapabilityMap` callout: **visible** in both
  surfaces, exactly as before enrichment.
- Stable / partial counts visible: **yes** — operators
  can see at a glance that the 239 figure decomposes
  into 16 stable + 223 partial.

The fixture renders the same section with `Phrases: 0
(stable 0, partial 0, low-confidence 0)` and the
deferred-callout — confirming the publisher behaves
correctly when there is no phrase data to surface, even
when enrichment context exists.

## CapabilityMap Readiness

| Gate | Result | Notes |
| --- | --- | --- |
| real repo non-trivial stable phrases | **pass (sparse)** | 16 stable phrases on `target-1`; non-trivial in count but still only 0.18% of candidates. Unchanged by enrichment. |
| stable evidence refs present | **pass** | every stable phrase has an `EvidenceGraph` ref + the source normalization report. |
| stable terms meaningful | **pass** | `build:session`, `get:result`, `fetch:result`, `publish:event`, `verify:service`, `validate:page`, `render:record`, `create:token`, `resolve:session`, `route:report`, etc. All recognizable domain capability terms. |
| partials not used for CapabilityMap | **pass** | the design pins it; the agent contract `Do Not Do` reminder pins it; the docs test pins it. |
| publications understandable | **pass** | architecture summary + agent contract both render the partial counts and the deferred callout. |
| artifacts validate clean | **pass** | `rekon artifacts validate --json` returns `{ "valid": true, "issues": [] }` on both targets. |
| phrase coverage sufficient to drive a useful canonical projection | **fail** | stable count is **unchanged** (16) — enrichment moved partial coverage, not stable coverage. The bottleneck is upstream `normalized` count (241 of 9,110 = 2.6%), which enrichment cannot move. |

Six of seven gates pass. The seventh — **stable coverage
sufficient for canonical projection** — has not moved
since the pre-enrichment review. This is the gate
`CapabilityMap` v2 is waiting on. Enrichment v1
intentionally did not move it (the stable threshold
was preserved by design). To move it, we need either:

- more **normalized candidates** (canon-pack expansion +
  lexical-splitter sharpening), or
- different **projection rules** that admit medium-confidence
  candidates without an enrichment field (rejected — that
  weakens the stable contract).

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| `CapabilityMap` v2 high-confidence-only | **deferred** | Stable count is unchanged at 16 on a 9,110-candidate real repo. Coverage is still 0.18%. A canonical map projected from 16 phrases would still imply ~99.8% missing coverage — the same problem the pre-enrichment review identified. Partial phrases do not change this calculus. |
| Phrase enrichment v2 (framework / architecture-profile enrichment, sharper `ObservedRepo.kind` population) | deferred (parallel) | Would raise `pattern` coverage (currently 0%) and refine `layer` coverage, but does **not** move the stable count. Useful but secondary to candidate-quality. Track as parallel follow-up. |
| Candidate-quality improvements (canon-pack expansion + lexical-splitter sharpening) | **selected (next slice)** | The bottleneck is the upstream `normalized` count (241 of 9,110 = 2.6%). Raising normalized count is the only way to raise the stable phrase count without weakening the stable contract. Concrete first targets: more verb / noun pairs in canon packs (e.g., `save`, `normalize` — both appear 51+15 times in partial today and could promote to stable if normalized), and sharpening the lexical splitter for cases that fall into `unknown-verb` / `unknown-noun`. |
| More dogfood (additional non-Rekon repos) | deferred (parallel) | Useful for breadth, especially before declaring candidate-quality improvements done. Track as parallel follow-up. |
| Projection-rule hardening (e.g., dropping the `medium`+`medium` floor on partial) | rejected | The partial output is meaningful per inspection; no rule-hardening is needed today. The partial floor stays at medium + medium + at-least-one-enrichment. |
| `CapabilityContract` reservation work | deferred | Stays a reserved name. Policy layer remains future. |

## Recommendation

**Candidate-quality improvements** is the next slice.
Specifically:

1. **Canon-pack expansion**: promote frequently-appearing
   partial-only verbs and nouns into canonical vocabulary.
   `target-1` evidence: `save:schema` (24), `save:request`
   (16), `get:response` (14), `build:plan` (13) all appear
   at non-trivial frequency in partial — if the
   verb/noun pairs were canonical, the candidates would
   normalize at high confidence and produce stable
   phrases.
2. **Lexical-splitter sharpening**: the 1,670 `unknown-verb`
   and 831 `unknown-noun` rows on `target-1` are
   candidates where the splitter found a token shape but
   couldn't match the canonical vocabulary. Some of these
   are real verbs/nouns that the canon doesn't know;
   others are splitter artefacts (e.g., the path-only
   capability hints discussed in the
   [Built-In Baseline Ontology Coverage Review](builtin-ontology-coverage-review.md)).
   Track sharper splitter rules as a separate, smaller
   slice.
3. **Each landing slice** must:
   - leave the stable phrase threshold untouched;
   - cite added vocabulary in the canon-pack-version
     bump;
   - run the same coverage matrix to measure delta;
   - preserve `partial` phrase usefulness for
     publication / agent context.
4. **After** at least one canon-pack expansion + lexical-
   splitter sharpening slice ships, a **third coverage
   review** can revisit the `CapabilityMap` v2 gate.

`CapabilityMap` v2 design / implementation stays
deferred. Phrase enrichment v2 (framework / architecture-
profile enrichment) is parallel; it primarily improves
`pattern` coverage rather than stable count, so
candidate-quality takes priority.

## What This Does Not Do

- Does **not** mutate `CapabilityMap`.
- Does **not** mutate `EvidenceGraph`.
- Does **not** mutate `CapabilityNormalizationReport`.
- Does **not** mutate `CapabilityPhraseReport`.
- Does **not** change phrase projection rules.
- Does **not** change normalizer behavior.
- Does **not** change canon packs (canon-pack expansion
  is the *next* slice; this review only recommends it).
- Does **not** add `CapabilityContract` or
  `RefactorPreservationContract`.
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

- **Candidate-quality improvements v1** — ✅ Shipped. See
  [Candidate-Quality v1 Memo](capability-ontology-candidate-quality-v1.md).
  Canon-pack confirmation (all four observed-frequent
  nouns and three observed-frequent verbs already
  canonical) + lexical-splitter sharpening (path-shaped
  candidates classified as `ignored`, single-token
  known nouns get precise `low-confidence` messages).
  Measured on `target-1`: 223 path-shaped candidates
  moved from `unknown` → `ignored`; stable count
  unchanged at 16; partial count unchanged at 223.
- **Post-quality coverage review** — ✅ Shipped. See
  [Post-Quality Coverage Review](capability-phrase-post-quality-coverage-review.md).
  Added `target-2` (real small TS + workflows). Cross-
  target verdict: stable density sparse on both real
  repos (0.18% on `target-1`, 0.49% on `target-2`).
  Next slice is a repo-agnostic purpose understanding
  architecture review.
- **Third coverage review** after candidate-quality
  improvements land. Measure stable count + partial
  count + enrichment coverage on `target-1` + at least
  one additional cohort target.
- **`CapabilityMap` v2 high-confidence-only design
  decision** — gated on the third coverage review. Will
  not happen before stable phrase count meaningfully
  rises.
- **Phrase enrichment v2** (parallel; framework /
  architecture-profile enrichment, sharper
  `ObservedRepo.kind` population). Primarily raises
  `pattern` coverage.
- **Additional cohort targets** (parallel; intake-gated).
- **`CapabilityContract` decision** (further future,
  after phrases stabilize and `CapabilityMap` v2 ships).

## See Also

- [Phrase Enrichment v1 Memo](capability-phrase-enrichment-v1.md)
- [Pre-Enrichment Coverage Review](capability-phrase-report-coverage-review.md)
- [CapabilityPhraseReport Safety Review](capability-phrase-report-safety-review.md)
- [CapabilityPhraseReport Decision](capability-phrase-report-decision.md)
- [CapabilityPhrase + CapabilityContract Architecture Decision](capability-phrase-contract-architecture-decision.md)
- [Capability Ontology Translation Layer Decision](capability-ontology-translation-layer-decision.md)
- [Built-In Baseline Ontology Coverage Review](builtin-ontology-coverage-review.md)
- [`CapabilityPhraseReport` artifact reference](../artifacts/capability-phrase-report.md)
- [`CapabilityNormalizationReport` artifact reference](../artifacts/capability-normalization-report.md)
- [Capability ontology concept](../concepts/capability-ontology.md)
- [Roadmap](roadmap.md)
- [Classic-behavior roadmap](classic-behavior-roadmap.md)
