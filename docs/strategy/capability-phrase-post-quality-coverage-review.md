# CapabilityPhraseReport Post-Quality Coverage Review

**Status:** v3 coverage / dogfood-analysis memo. Strategy /
docs / tests-only batch. **No runtime change. No
`CapabilityMap` mutation. No `CapabilityPhraseReport` shape
change. No `CapabilityNormalizationReport` shape change. No
phrase projection rule change. No canon pack change. No
splitter change. No new artifact registration. No new CLI
command. No source writes. No LLM-only inference. No npm
publish. No version bump. No git tag. No GitHub Release. No
new branch.**

**Audience:** the `CapabilityMap` v2 decision; the
repo-agnostic purpose understanding architecture review;
future candidate-extraction slices; operators evaluating
whether stable phrase yield is broad enough to cross the
`CapabilityMap` boundary.

**Companion docs:**

- [Candidate-Quality v1 Memo](capability-ontology-candidate-quality-v1.md)
  — the slice this review measures.
- [Enrichment Coverage Review](capability-phrase-enrichment-coverage-review.md)
  — the prior coverage review (post-enrichment, pre-quality).
- [Pre-Enrichment Coverage Review](capability-phrase-report-coverage-review.md)
  — baseline measurements.
- [CapabilityPhraseReport Safety Review](capability-phrase-report-safety-review.md)
  — pinned the `CapabilityMap` v2 evidence gate.

## Decision Summary

Selected: **`CapabilityMap` v2 stays deferred.** The next
slice is a **repo-agnostic purpose understanding
architecture review** — symbol/export-name evidence is
*structurally insufficient* to drive a useful canonical
projection across real repos, and no further canon-pack
or splitter tweak will change that without first deciding
what richer evidence the phrase layer should consume.

Verdict (verbatim):

> **Candidate-quality improvements reduced unknown noise
> as designed**, but **stable phrase count remained
> unchanged across both real repos** — `target-1` (real
> Next.js TypeScript) and `target-2` (real small TS +
> workflows). Stable density is consistently sparse:
> 0.18% on `target-1` and 0.49% on `target-2`. **Stable
> phrase quality is high; stable phrase density is the
> bottleneck.** The bottleneck is not vocabulary, not
> splitter precision, and not enrichment yield — it is
> the *evidence model itself*: symbol and export names
> alone do not yield enough verb:noun pairs that match
> a canonical capability vocabulary on real repos. The
> next slice should be a **repo-agnostic purpose
> understanding architecture review** that examines what
> richer, deterministic evidence sources (framework
> conventions, architecture profile, doc-string-only
> signals, etc.) would unlock — *before* either
> `CapabilityMap` v2 or another candidate-quality
> iteration ships. **`CapabilityMap` v2 is
> evidence-gated. Partial phrases alone do not justify
> `CapabilityMap` v2.**

Verbatim pins (the docs test asserts these):

- **Candidate-quality improvements reduced unknown noise.**
- **Stable phrase count remained unchanged.**
- **`CapabilityMap` v2 is evidence-gated.**
- **Partial phrases alone do not justify `CapabilityMap`
  v2.**

## Why This Review Exists

The
[Enrichment Coverage Review](capability-phrase-enrichment-coverage-review.md)
selected candidate-quality improvements v1 as the next
slice on condition that a **third coverage review** would
measure whether canon-pack confirmation + splitter
sharpening moved the stable phrase count before any
`CapabilityMap` v2 decision moves forward.

This memo is that third review. It measures phrase output
with candidate-quality v1 enabled across a fixture +
**two** real cohort targets (one Next.js TypeScript, one
small TS + workflows) and selects the next slice based on
the observed data.

The product guarantee preserved here: **`CapabilityMap`
v2 remains evidence-gated.** Only stable high-confidence
phrases are eligible. Partial phrases are useful semantic
context but not placement/ownership policy.

## Targets Reviewed

| Target | Archetype | Source | Result |
| --- | --- | --- | --- |
| `examples/simple-js-ts` (temp copy) | minimal JS/TS fixture | bundled example repo | full pipeline succeeds; 4 candidates, 0 normalized, 0 phrases. Strict v1 rules hold even with enrichment context available. |
| `target-1` | real Next.js TypeScript application | anonymized `mktemp` copy from prior coverage reviews | full pipeline succeeds; 9,110 candidates, 241 normalized, **16 stable + 223 partial = 239 total phrases**. |
| `target-2` | real small TypeScript repo with workflows | anonymized `mktemp` copy | full pipeline succeeds; 408 candidates, 12 normalized, **2 stable + 10 partial = 12 total phrases**. |

`target-1` and `target-2` are both anonymized per the
private-beta intake policy. No source paths or internal
symbol names are reproduced in this review.

## Command Matrix

For each target (identical to prior coverage reviews;
verbatim from the work order):

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

Every command completed successfully on all three
targets. No artifact validation failures, no crashes, no
unexpected errors.

## Pack Detection Results

| Target | Base Pack | Overlay Packs | Override Path | Override Kind |
| --- | --- | --- | --- | --- |
| `examples/simple-js-ts` | `base` | _none_ | _none_ | _none_ |
| `target-1` | `base` | `nextjs-app` | _none_ | _none_ |
| `target-2` | `base` | _none_ | _none_ | _none_ |

Auto-detection of the Next.js overlay on `target-1` is
deterministic (matches the
[Canon + Override Model Decision](capability-ontology-canon-override-model-decision.md)).
No repo applied an override file.

## Normalization Results

| Target | Total Candidates | Normalized | Unknown Verb | Unknown Noun | Unknown | Ignored | Alias Applied | Low Confidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `examples/simple-js-ts` | 4 | 0 | 0 | 0 | 0 | 2 | 0 | 2 |
| `target-1` | 9,110 | 241 | 1,670 | 831 | 3,865 | 449 | 597 | 2,054 |
| `target-2` | 408 | 12 | 41 | 49 | 98 | 121 | 41 | 87 |

Normalization rate by target:

| Target | Normalized / Total | Ignored / Total | Unknown / Total |
| --- | ---: | ---: | ---: |
| `examples/simple-js-ts` | 0% | 50% | 0% |
| `target-1` | 2.6% | 4.9% | 42.4% |
| `target-2` | 2.9% | 29.7% | 24.0% |

Cross-target observation: the **normalized rate is
consistent** across both real repos (2.6% and 2.9%) —
this is the structural ceiling current evidence shape +
canon vocabulary impose. `target-2`'s larger `ignored`
share reflects its higher proportion of path-shaped and
ownership-hint candidates per real symbol (smaller
repo, more workflow / scaffolding paths).

## Phrase Results

| Target | Total Phrases | Stable | Partial | Low Confidence | With Domain | With Pattern | With Layer |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `examples/simple-js-ts` | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `target-1` | 239 | 16 | 223 | 0 | 239 | 0 | 95 |
| `target-2` | 12 | 2 | 10 | 0 | 12 | 0 | 2 |

Stable phrase density:

| Target | Stable / Total | Stable / Normalized | Total / Normalized |
| --- | ---: | ---: | ---: |
| `target-1` | 0.18% | 6.6% | 99.2% |
| `target-2` | 0.49% | 16.7% | 100% |

Inspection verdict — stable phrases:

- **`target-1`** stable: `build:session` (4),
  `get:result` (2), `fetch:result`, `publish:event`,
  `verify:service`, `fetch:config`, `validate:page`,
  `render:record`, `create:token`, `execute:report`,
  `resolve:session`, `route:report`. Recognizable
  capability terms; meaningful per inspection.
- **`target-2`** stable: `test:session` (2 emissions
  across 2 source candidates). Single phrase shape;
  meaningful but very narrow.

Inspection verdict — partial phrases (`target-1`,
top pairs): `save:schema` (24), `save:request` (16),
`get:response` (14), `build:plan` (13), `get:schema`
(12). Same pattern as the enrichment coverage review;
no degradation.

Inspection verdict — partial phrases (`target-2`):
`update:schema` (2), `execute:config` (2),
`build:report` (2), `save:file` (2), `normalize:route`
(2). Each pair appears twice (matched symbol +
matching export); shape is consistent with target-1.

## Before / After Comparison

`target-1`:

| Metric | Pre-Enrichment | Post-Enrichment | Post-Quality | Decision |
| --- | ---: | ---: | ---: | --- |
| stable phrases | 16 | 16 | 16 | **unchanged** across all three stages |
| total phrases | 16 | 239 | 239 | enrichment unlocked partials; quality preserved them |
| `unknown` | 4,088 | 4,088 | 3,865 | candidate-quality reduced noise by 223 |
| `ignored` | 226 | 226 | 449 | candidate-quality reclassified 223 path-shaped candidates |
| `normalized` | 241 | 241 | 241 | upstream foundation unchanged |
| `aliasApplied` | 524 | 524 | 597 | +73 from noun-only known-term recognition |
| `lowConfidence` | 2,054 | 2,054 | 2,054 | unchanged |

`target-2` (no pre-enrichment / pre-quality baseline
exists — `target-2` was newly added in this review):

| Metric | Post-Quality | Notes |
| --- | ---: | --- |
| stable phrases | 2 | meaningful but narrow (single `test:session` pair, 2 emissions) |
| total phrases | 12 | 2 stable + 10 partial |
| `unknown` | 98 | 24% of candidates |
| `ignored` | 121 | 30% of candidates (path-shaped + ownership hints) |
| `normalized` | 12 | 2.9% of candidates |

**Key takeaway**: the stable phrase count has been
**16 → 16 → 16** through three coverage reviews on
`target-1`, and `target-2` shows the same upstream
normalization ceiling (~3% normalized). The bottleneck
is not vocabulary, not splitter precision, not enrichment
— it is the *evidence model*.

## Evidence Ref Distribution

`target-1` (239 phrases):

- entries with at least one `EvidenceGraph` ref: **239 / 239**
- entries with only normalization refs: **0 / 239**
- `header.inputRefs` cites `ObservedRepo`: **yes**
- `header.inputRefs` cites `OwnershipMap`: **yes**

`target-2` (12 phrases):

- entries with at least one `EvidenceGraph` ref: **12 / 12**
- entries with only normalization refs: **0 / 12**
- `header.inputRefs` cites `ObservedRepo`: **yes**
- `header.inputRefs` cites `OwnershipMap`: **yes**

Evidence-ref discipline is consistent across targets:
every phrase carries the audit chain back to the source
`EvidenceGraph` fact, and consumed enrichment artifacts
are cited.

## Publication Usefulness

For both real targets, after `publish architecture` +
`publish agent-contract`:

- Architecture summary `## Capability Phrases` section:
  **present**. Renders report ref, source normalization
  ref, summary counts (`Phrases: N (stable N, partial N,
  low-confidence N)`), enrichment counts, the
  deferred-`CapabilityMap` callout, and a bounded
  phrase table.
- Agent contract `### Capability Phrases` subsection:
  **present**. Same metadata + the `Do Not Do` reminder
  pinning that phrases are not `CapabilityMap` ownership
  or placement policy.
- Proof report phrase section: **absent** — still
  deferred.
- Stable / partial counts visible: **yes** in both
  surfaces on both real targets.
- Deferred-`CapabilityMap` callout visible: **yes** in
  both surfaces on both real targets.

The fixture's publications continue to render the
phrase section with `Phrases: 0` and the deferred
callout — confirming the publisher behaves correctly
when there is no phrase data to surface.

## CapabilityMap Readiness

| Gate | Result | Notes |
| --- | --- | --- |
| real repo non-trivial stable phrases | **pass (sparse)** | `target-1`: 16 stable; `target-2`: 2 stable. Non-trivial in count but sparse in density. |
| stable evidence refs present | **pass** | every stable phrase on both real targets has an `EvidenceGraph` ref + normalization report. |
| stable terms meaningful | **pass** | both targets' stable phrases are recognizable capability terms per inspection. |
| stable density sufficient | **fail** | `target-1` is 0.18% of candidates, unchanged across three coverage reviews; `target-2` is 0.49%. Density did not move with canon-pack confirmation or splitter sharpening. |
| partials not used for CapabilityMap | **pass** | design + `Do Not Do` reminder + docs tests all pin this. |
| publications understandable | **pass** | both surfaces render the phrase section with the deferred callout on both real targets. |
| artifacts validate clean | **pass** | `rekon artifacts validate --json` returns `{ "valid": true, "issues": [] }` on all three targets. |

Six of seven gates pass on both real targets. The seventh
— **stable density sufficient for canonical projection**
— has not moved through three coverage reviews and two
runtime slices (enrichment v1 + candidate-quality v1).
This is the gate `CapabilityMap` v2 is waiting on, and
**no further tweak to the existing evidence model is
going to move it**.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| `CapabilityMap` v2 high-confidence-only | **deferred** | Stable density is consistently sparse across both real repos (0.18% and 0.49%). Three coverage reviews now confirm the stable foundation does not respond to vocabulary or splitter tweaks. A canonical map projected from 16 + 2 phrases would still imply ~99.5% missing coverage — the same problem the pre-enrichment review identified, unmoved by enrichment v1 or candidate-quality v1. |
| Phrase enrichment v2 (framework / architecture-profile, sharper `ObservedRepo.kind`) | deferred (parallel) | Would raise `pattern` coverage (currently 0% on both real targets) and refine `layer` coverage. Useful but **does not move stable count** — same lesson as enrichment v1. Track as parallel follow-up. |
| Candidate extraction improvements | deferred (parallel) | Could broaden which symbols become candidates (e.g. extract from JSDoc / type aliases / interface members). Useful but secondary to the architecture review — extending extraction without first deciding what richer evidence is acceptable risks rebuilding the same problem with a wider net. |
| Canon-pack expansion v2 (per-archetype overlays) | deferred (parallel) | Could add domain-specific verbs/nouns (e.g. nextjs-specific terms). Useful but **does not address the structural bottleneck** — both target-1 (already running the nextjs-app overlay) and target-2 (running base only) show the same normalized rate. |
| **Repo-agnostic purpose understanding architecture review** | **selected (next slice)** | Three coverage reviews + two runtime slices have produced consistent evidence: symbol/export-name evidence yields ~2.6%–2.9% normalized candidates regardless of vocabulary or splitter precision. Before any further evidence-extension slice ships, Rekon needs a strategy memo that examines what richer, **repo-agnostic, deterministic** evidence sources (framework convention detection, architecture-profile-derived hints, doc-string signals, dependency-graph-derived hints, etc.) could unlock — and explicitly pins which sources stay deferred (AST adapters, LLM inference, source reads). The architecture review feeds the next product slice. |
| More dogfood (additional non-Rekon repos) | deferred (parallel) | Useful for breadth, especially before declaring the evidence-model bottleneck universal. `target-1` (Next.js TS) and `target-2` (small TS + workflows) both show the same pattern, but a third archetype (monorepo, library-package) would strengthen the architecture review. Track as parallel follow-up. |

## Recommendation

**Repo-agnostic purpose understanding architecture review**
is the next slice. Specifically:

1. **Document the structural bottleneck** measured here
   (consistent 2.6%–2.9% normalized rate on real repos;
   stable count fixed at 16 on `target-1` through three
   coverage reviews) as evidence the symbol/export-name
   evidence model is structurally insufficient.
2. **Survey repo-agnostic, deterministic evidence
   sources** that could feed the phrase layer:
   - framework convention detection (Next.js routes,
     React hooks naming, Rails MVC, Django views,
     etc.) — extending what's already in canon-pack
     overlays.
   - architecture-profile-derived hints (operator-
     declared system boundaries, layer names).
   - doc-string / annotation signals
     (`@deprecated`, `@since`, JSDoc `@returns`/`@param`,
     Python type hints from comments).
   - dependency-graph-derived hints (this module
     imports from `db/*` → its symbols are likely
     persistence verbs).
   - file-header / co-located README signals.
3. **Reject** AST adapters, LLM inference, and source
   reads at this strategy stage — those remain pinned
   deferred per the architecture decision.
4. **Pin gates** the next product slice must hit before
   `CapabilityMap` v2 can be reconsidered:
   - measurable lift in stable phrase density on at
     least two real repos; and
   - cross-target consistency in stable phrase quality.
5. **Output** the architecture review feeds either a
   targeted phrase enrichment v2 slice or a candidate
   extraction v1 slice (whichever the review's evidence
   analysis selects).

`CapabilityMap` v2 design / implementation stays
deferred. The other parallel slices (phrase enrichment
v2, candidate extraction improvements, canon-pack
expansion v2, more dogfood) remain available as
follow-ups, but each is now conditioned on the
architecture review's evidence-source recommendation.

## What This Does Not Do

- Does **not** mutate `CapabilityMap`.
- Does **not** mutate `EvidenceGraph`.
- Does **not** mutate `CapabilityNormalizationReport`.
- Does **not** mutate `CapabilityPhraseReport`.
- Does **not** change phrase projection rules.
- Does **not** change normalizer behavior.
- Does **not** change canon packs.
- Does **not** change the splitter.
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

- **Classic scanner/ontology parity audit** —
  ✅ Shipped. See
  [Classic Scanner/Ontology Parity Audit](classic-scanner-ontology-parity-audit.md).
  Maps codebase-intel-classic's scanner / taxonomy /
  ontology / GraphOntologyValidator design against
  Rekon's current track. Identifies regex-only JS/TS
  extraction in `@rekon/capability-js-ts` as the
  evidence-model bottleneck. Selects **JS/TS AST
  Evidence Adapter Decision** as the next slice.
- **JS/TS AST Evidence Adapter Decision** — ✅
  Shipped. See
  [JS/TS AST Evidence Adapter Decision](js-ts-ast-evidence-adapter-decision.md).
  Selects the **TypeScript compiler parser API** for
  parser-only AST v1. Pins regex as fallback only.
  Pins additive `extractionMethod` /
  `language` / `syntaxKind` / `symbolKind` /
  `exportKind` / `importKind` / `location` /
  `confidence` fields on existing `symbol` / `export`
  / `import` facts. Pins **no typechecker
  dependency** in v1. Pins **AST v1 should improve
  CapabilityNormalizationReport candidate quality**
  and **AST v1 should improve CapabilityPhraseReport
  stable phrase density**. The runtime slice below
  inherits these answers.
- **JS/TS AST EvidenceGraph Provider v1** — ✅
  shipped as the twenty-fourth slice. Runtime
  implementation in `@rekon/capability-js-ts` using
  the TypeScript compiler parser API. AST-backed
  `symbol` / `export` / `import` facts now carry
  `extractionMethod: "ast"` and richer metadata;
  regex stays as labelled fallback. The next slice
  (post-AST coverage review) measures the impact on
  candidate quality and stable phrase density.
- **Phrase enrichment v2** (parallel; framework /
  architecture-profile-derived `pattern` and `layer`
  enrichment). Lands behind the architecture review.
- **Candidate extraction improvements** (parallel;
  broaden which fact kinds become candidates). Lands
  behind the architecture review.
- **Canon-pack expansion v2** (parallel; per-archetype
  overlays). Lands behind the architecture review or
  as an independent slice if a specific archetype
  shows promise.
- **Additional cohort targets** (parallel; intake-
  gated). At least one library-package or monorepo
  archetype.
- **`CapabilityMap` v2 high-confidence-only design
  decision** — gated on a fourth coverage review after
  at least one architecture-review-recommended slice
  ships and demonstrably lifts stable phrase density on
  ≥ 2 real repos.
- **`CapabilityContract` decision** (further future,
  after phrases stabilize and `CapabilityMap` v2 ships).

## See Also

- [Candidate-Quality v1 Memo](capability-ontology-candidate-quality-v1.md)
- [Enrichment Coverage Review](capability-phrase-enrichment-coverage-review.md)
- [Phrase Enrichment v1 Memo](capability-phrase-enrichment-v1.md)
- [Pre-Enrichment Coverage Review](capability-phrase-report-coverage-review.md)
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
- [Classic Scanner/Ontology Parity Audit](classic-scanner-ontology-parity-audit.md)
  — twenty-second slice; selected AST extraction as
  the next product slice.
- [JS/TS AST Evidence Adapter Decision](js-ts-ast-evidence-adapter-decision.md)
  — twenty-third slice; commits Rekon to parser-only
  AST extraction using the TypeScript compiler parser
  API. Regex stays as fallback only.
- [Classic-behavior roadmap](classic-behavior-roadmap.md)
