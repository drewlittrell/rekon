# Classic Scanner/Ontology Parity Audit

**Status:** strategy / architecture audit memo. Docs /
tests-only batch. **No runtime change. No
`CapabilityMap` mutation. No `CapabilityPhraseReport`
shape change. No `CapabilityNormalizationReport` shape
change. No `EvidenceGraph` mutation. No phrase
projection rule change. No canon-pack change. No
splitter change. No new artifact registration. No new
CLI command. No source writes. No LLM-only inference.
No npm publish. No version bump. No git tag. No GitHub
Release. No new branch.**

**Audience:** future JS/TS AST evidence adapter
decision; the next `CapabilityMap` v2 readiness
review; operators evaluating whether further
canon-pack / splitter / enrichment tuning is the right
investment.

**Companion docs:**

- [ADR 0004: codebase-intel-classic Is Reference, Not Dependency](../adr/0004-codebase-intel-classic-is-reference-not-dependency.md).
- [Classic Behavior Distillation](classic-behavior-distillation.md).
- [Classic Alignment Map](classic-alignment-map.md).
- [Classic Subsystem Purpose Map](classic-subsystem-purpose-map.md).
- [Classic-to-Rekon Translation](classic-to-rekon-translation.md).
- [Capability Ontology Architecture Impact Review](capability-ontology-architecture-impact-review.md).
- [Capability Ontology Translation Layer Decision](capability-ontology-translation-layer-decision.md).
- [GraphOntologyValidator-Lite Audit](graph-ontology-validator-lite-audit.md)
  — sibling audit for finding-filter parity.
- [Post-Quality Coverage Review](capability-phrase-post-quality-coverage-review.md)
  — the review that flagged the evidence-model
  bottleneck this audit addresses.

## Decision Summary

The capability-ontology track has been solving the
scanner/ontology problem from scratch. **It should
not have been.** `codebase-intel-classic` already
shipped a layered taxonomy model with AST-backed name
extraction, verb/noun rule modules, workspace
ontology merge, synonym-tracking normalization, and
ontology-informed validation — that is the design
corpus the Rekon ontology track should be measured
against.

Per the
[Post-Quality Coverage Review](capability-phrase-post-quality-coverage-review.md),
three coverage reviews + two runtime slices on the
phrase track have not moved stable phrase density
(unchanged at 16 on `target-1` through three reviews;
2.6%–2.9% normalized ceiling on both real repos).
The bottleneck is upstream: **Rekon's JS/TS evidence
provider is regex-only**. Classic used AST-backed
scanning for the same job.

Pinned verbatim (the docs test asserts these):

- **codebase-intel is design prior art.**
- **JS/TS AST extraction should be primary where
  available.**
- **Regex extraction is fallback, not primary, for
  JS/TS.**
- **`EvidenceGraph` remains the repo-agnostic
  protocol.**
- **`GraphOntologyValidator` should not be ported
  wholesale.**
- **Classic taxonomy extraction / split / discovery /
  normalization should be adapted.**
- **`CapabilityMap` v2 should wait until post-AST
  coverage is measured.**

Verdict (verbatim):

> Rekon's capability-ontology track must stop treating
> the current regex-based evidence provider as
> primary. The next slice on this track is a **JS/TS
> AST Evidence Adapter Decision** memo that picks a
> parser, defines the emitted `EvidenceGraph` fact
> shapes, pins fallback behaviour for non-JS/TS
> targets, and lists test fixtures. Implementation
> (JS/TS AST EvidenceGraph Provider v1) follows the
> decision. `CapabilityMap` v2 high-confidence-only
> design waits until the post-AST coverage review
> measures stable-phrase density on real repos with
> AST-backed evidence.

## Why This Audit Exists

Per the
[Post-Quality Coverage Review](capability-phrase-post-quality-coverage-review.md):

> **Candidate-quality improvements reduced unknown
> noise** as designed, but **stable phrase count
> remained unchanged across both real repos.** Stable
> density is consistently sparse: 0.18% on `target-1`
> and 0.49% on `target-2`. The bottleneck is not
> vocabulary, not splitter precision, and not
> enrichment yield — it is the *evidence model
> itself*.

Three coverage reviews + two runtime slices on the
phrase track confirm canon-pack tuning and splitter
sharpening cannot move the stable foundation. The
post-quality review selected a **repo-agnostic
purpose understanding architecture review** as the
next slice; this memo is that review's
classic-grounded counterpart.

Classic codebase-intel already solved several of the
problems Rekon has been re-deriving:

- AST-backed name extraction (function / class /
  method / interface / type alias / variable /
  export).
- Verb/noun lexical splitting with confidence
  metadata.
- Repo-local taxonomy discovery seeded from declared
  system ownership capabilities.
- Verb-rule + noun-rule modules with canonical terms,
  aliases, categories, thresholds, and
  system-derived verbs.
- Base + workspace ontology merge.
- Synonym-tracking normalization with warnings,
  corrections, and `synonymsApplied` audit metadata.
- Ontology-informed validation
  (`GraphOntologyValidator`).

This audit maps that prior art against Rekon's
current artifact-first state, names which methods to
**repeat**, **adapt**, or **reject**, and pins the
next product slice.

## Classic Scanner Pipeline

Inferred from
[Classic Behavior Distillation](classic-behavior-distillation.md),
[Classic-to-Rekon Translation](classic-to-rekon-translation.md),
the
[GraphOntologyValidator-Lite Audit](graph-ontology-validator-lite-audit.md),
prior memos that reference `lib/taxonomy/*` and
`lib/*-rules.ts`, and the structure the user's work
order lists. Specific file inspection on the classic
GitHub repository is outside this batch's scope; the
audit relies on the design corpus already
documented in Rekon's classic memos.

Classic's scanner pipeline (high level):

1. **Source scan** — walk repo, read JS/TS files, build
   per-file analysis cache.
2. **AST parse** — use TypeScript compiler (or
   ts-morph) to parse each file's source into a
   typed AST.
3. **Extracted names** — for each file, collect every
   declared / exported identifier across function /
   class / method / interface / type-alias / variable
   / export forms. Each `ExtractedName` carries:
   - the identifier
   - its declaration kind
   - source path + position
   - export visibility
   - type-only / value-only distinction (where the
     type system surfaced it).
4. **SplitName** — for each extracted name, split into
   `verb` / `noun` / `original` with a confidence
   score. Single-token names fall back to a noun-only
   classification.
5. **Taxonomy discovery** — aggregate split names into
   per-repo vocabulary, seeded with terms from the
   declared system-ownership capabilities. Discovered
   terms feed candidate canonical pairs.
6. **Hierarchy** — load category rules (e.g. read /
   write / transform / system / communicate for verbs;
   data / infrastructure / process / ui for nouns).
7. **Runtime normalization** — for each split name,
   look up verb / noun against the merged ontology
   (base + workspace override), apply aliases, and
   record `synonymsApplied` entries.
8. **Validation** — feed normalized claims to
   `GraphOntologyValidator`, which emits findings
   when claims violate ontology constraints (e.g.
   verb-noun pairs outside allowed categories,
   missing canonical mapping, low-confidence claims).

Key design decisions inherited from classic:

- **Deterministic first**: classic favoured
  deterministic extraction before LLM augmentation.
  (Per
  [Classic Behavior Distillation](classic-behavior-distillation.md):
  "Deterministic-first extraction. Tries
  deterministic extraction first; escalates to LLM
  augmentation only [when warranted].")
- **Layered taxonomy**: extracted names →
  split names → discovered taxonomy → validation
  format → validation results → synonymsApplied —
  *not* a flat dictionary.
- **Workspace overrides**: base ontology + repo-local
  override file. (Rekon honors this already via the
  canon-pack + override model.)
- **System-derived verbs**: declared system ownership
  capabilities seed canonical verbs (`build`,
  `deploy`, `test`, `lint`, etc.).

## Classic Ontology / Taxonomy Pipeline

Verb / noun rule modules, per the user's work order:

- `lib/verb-rules.ts` — canonical verbs +
  per-verb aliases + verb category + confidence
  thresholds + system-derived verb injection.
- `lib/noun-rules.ts` — canonical nouns +
  per-noun aliases + noun category + auto-map
  thresholds.
- `schemas/verb-rules.schema.ts`,
  `schemas/noun-rules.schema.ts`,
  `schemas/taxonomy.schema.ts` — JSON Schemas for
  rule modules.
- `domain/ontology/mergeOntology.ts` — base +
  workspace override merge, with conflict resolution.
- `infra/repositories/TaxonomyRepository.ts` and
  `VerbVocabularyRepository.ts` — persistence /
  caching for taxonomy and verb vocabulary.

Normalization outputs (per classic):

- canonical verb / canonical noun.
- per-claim confidence.
- `synonymsApplied`: list of alias-to-canonical
  replacements made during normalization, with
  source position citations.
- warnings: ambiguous splits, missing canonical,
  cross-category claims.
- corrections: deterministic alias replacements.

Rekon's current `CapabilityNormalizationReport`
captures the equivalent — translation audit with
unknown-verb / unknown-noun / unknown / ignored /
low-confidence / normalized statuses + `aliasApplied`
flags — but is *fed* by a regex-only scanner, so the
audit reflects shallow evidence.

## Classic GraphOntologyValidator Role

The
[GraphOntologyValidator-Lite Audit](graph-ontology-validator-lite-audit.md)
already covered this in detail. Summary:

> Classic's `GraphOntologyValidator` is invoked by
> the validation pipeline and runs ontology-informed
> checks against the analyzed graph. It is a
> **monolithic** validator: a single class with
> ~10–15 internal checks, tightly coupled to classic's
> analysis cache and taxonomy repositories. The
> Rekon equivalent already shipped — `applyFindingGraphFilters` in
> `@rekon/kernel-findings` — implements five
> graph-aware checks (`route-handler-with-service`,
> `route-http-middleware-only`,
> `external-api-comment-only`,
> `factory-file-creates-deps`,
> `module-gate-verified-caller`) as small composable
> filters over the existing artifact graph. The audit
> explicitly **rejected** porting the monolithic
> `GraphOntologyValidator`.

This audit reaffirms that rejection. The
`GraphOntologyValidator`-lite path stays as the
guide for any future ontology-validation work;
candidate checks ship one at a time behind their own
decision memos.

## Rekon Current Equivalent

| Classic stage | Classic implementation | Rekon current |
| --- | --- | --- |
| Source scan | per-file analysis cache | `@rekon/capability-js-ts.extract` walks the repo and reads each `.ts` / `.tsx` / `.js` / `.jsx` file once. |
| AST parse | TypeScript compiler / ts-morph | **Regex-only** — explicit comment in source: *"regex-based extraction — no AST, no type checker, no LLM, no semantic role inference. Conservative: tolerate false negatives better than false positives."* |
| Extracted names | typed AST traversal | regex matches for `function` / `class` / `const` / `let` / `var` / `type` / `interface` / `namespace` / `default` / `enum` exports + symbols. |
| SplitName | lexical split + confidence | `splitCapabilityName` in `@rekon/capability-ontology` (post-Candidate-Quality v1: emits `kind: "name" | "path"` + `confidence: high | medium | low`). |
| Taxonomy discovery | per-repo vocabulary aggregation | **not surfaced as a per-repo artifact** — repo-local terms appear inline in `CapabilityNormalizationReport.candidates[]` but no aggregated vocabulary artifact ships. |
| Hierarchy / category rules | classic verb / noun rule modules | `@rekon/capability-ontology/packs/base.ts` + overlay packs (`nextjs-app`, `library-package`, `monorepo`). Each canonical term carries `category` + optional `aliases`. |
| Base + workspace ontology merge | `domain/ontology/mergeOntology.ts` | `compileEffectiveCapabilityOntology` in `@rekon/capability-ontology` — base + overlay packs + repo-local override (`.rekon/capability-ontology.overrides.json`). |
| Normalization output | canonical + warnings + corrections + `synonymsApplied` | `CapabilityNormalizationReport.candidates[].normalized` (verb / noun / `verbAliasApplied` / `nounAliasApplied` / categories) + status enum. |
| Validation | `GraphOntologyValidator` monolith | `applyFindingGraphFilters` in `@rekon/kernel-findings` (lite, composable). |

The gap is concentrated at one layer: **AST-backed
name extraction**. Every downstream artifact and
helper is structurally in place; the upstream feed is
too thin.

## Parity Matrix

| Classic Method | Purpose | Rekon Decision |
| --- | --- | --- |
| `ExtractedName` / `SplitName` | name → verb/noun candidates with declaration kind + position | **adapt** — Rekon emits the same shape inside `CapabilityNormalizationReport.candidates[].source` + `.raw`. Strengthening requires AST-backed extraction. |
| Taxonomy discovery | repo-local vocabulary aggregation | **adapt** — Rekon should surface a per-repo discovered-vocabulary artifact (future) once AST-backed evidence makes the aggregation meaningful. Today the data lives in normalization candidates only. |
| Verb / noun aliases | canonical translation | **repeat** — already shipped via canon-pack `aliases` + `aliasApplied` audit flag. |
| Base + workspace ontology merge | overrides | **repeat** — shipped via `compileEffectiveCapabilityOntology` + `.rekon/capability-ontology.overrides.json`. |
| `synonymsApplied` | audit normalization | **adapt** — `CapabilityNormalizationReport.candidates[].normalized.verbAliasApplied` / `nounAliasApplied` captures the same audit; aggregate `synonymsApplied` surfacing is a future polish. |
| `GraphOntologyValidator` monolith | validation consumer | **reject wholesale** (per the
[GraphOntologyValidator-Lite Audit](graph-ontology-validator-lite-audit.md)) — composable graph-aware filters per check instead. |
| `verb-rules.ts` / `noun-rules.ts` schemas | canonical + alias + category + threshold rules | **repeat** — canon-pack model already carries the same structure. |
| System-derived verbs (build / deploy / test / lint) | seed verbs from declared system capabilities | **repeat** — already in base pack via the `system` category and `build` / `deploy` / `test` / `lint` (note: `deploy` / `test` / `lint` are not yet first-class canonical in base; a `Methods To Adapt` follow-up). |
| AST-backed scanner | precise name extraction | **adapt** — net-new for Rekon. The right shape is a JS/TS-specific evidence adapter that emits richer `EvidenceGraph` facts; the protocol stays repo-agnostic. |
| Workspace TaxonomyRepository | persistence / caching | **reject as separate persistence layer** — Rekon already persists ontology via the canon-pack + override model + the artifact store. No new repository abstraction needed. |

## Scanner Parity Matrix

| Capability | Classic | Rekon Current | Gap |
| --- | --- | --- | --- |
| JS/TS function extraction | AST/scanner-backed; full declaration / expression coverage | regex on `export function NAME` + symbol `function NAME` | **AST needed** — regex misses arrow-function exports, default-exported function expressions with binding names, inner-scoped declarations relevant to capability claims. |
| Class / method extraction | full AST traversal of class members | regex on `export class NAME` only; class members not surfaced as candidates | **AST needed** — class methods (e.g. `OrderService.placeOrder`) carry the strongest verb/noun signal but are invisible to the regex extractor. |
| Export kind precision | scanner-backed; reliable distinction between value / type / namespace / default | regex with conservative kind mapping (`enum` → `namespace`, etc.); accurate for top-level export forms but blind to re-exports and assignment-style exports | **AST needed** — re-export precision matters for downstream `import → capability` reasoning. |
| Type-only distinction | TypeScript type-system traversal | currently inferred from declaration keyword (`type` / `interface`); cannot distinguish a `const` that's actually a typed function from a `const` that's a value | **AST + type-checker needed** for full parity; AST alone closes most of the gap. |
| Source evidence protocol | analysis cache (private, per-classic-internal) | `EvidenceGraph` artifact (public, repo-agnostic) | **Rekon stronger boundary** — the protocol stays. AST work changes the *producer*, not the protocol. |

## Methods To Repeat

These classic methods are already shipping in Rekon
and stay as-is:

- **Verb / noun alias** model with canonical + aliases
  + categories, persisted in canon packs.
- **Base + workspace ontology merge** with override
  precedence. Rekon's
  [canon + override model decision](capability-ontology-canon-override-model-decision.md)
  matches classic's design.
- **System-derived verbs** seeded from declared
  system-ownership capabilities. Already in base
  pack via the `system` verb category and
  `system_seed` candidate-kind handling.
- **Deterministic-first extraction posture** — Rekon
  rejects LLM-only inference by architecture
  decision; classic prioritized deterministic
  extraction even before escalating to LLM
  augmentation, and Rekon's eight architectural
  reservations preserve that posture.
- **Audit-on-mutation discipline** — every classic
  normalization decision was recorded; Rekon does
  the same via `CapabilityNormalizationReport` +
  `CapabilityNormalizationReviewLedger`.

## Methods To Adapt

These classic methods exist in Rekon at a shallower
level and should be strengthened — but inside
Rekon's artifact-first model, not by porting classic
code:

- **AST-backed JS/TS name extraction** — classic
  used the TypeScript compiler / ts-morph; Rekon
  uses regex. The next slice (JS/TS AST Evidence
  Adapter Decision) picks a parser and pins the
  emitted `EvidenceGraph` fact shapes. The protocol
  stays `EvidenceGraph` — JS/TS becomes a richer
  *adapter*.
- **SplitName confidence model** — classic recorded
  per-claim confidence with explicit thresholds.
  Rekon's `CapabilitySplitConfidence` enum is close
  but coarse; a future slice can sharpen confidence
  semantics once AST extraction provides the signal.
- **Discovered taxonomy** as a first-class artifact
  — classic aggregated repo-local vocabulary into a
  persisted view. Rekon currently leaves discovery
  implicit inside `CapabilityNormalizationReport`.
  After AST extraction lands, a `DiscoveredVocabulary`
  artifact (or equivalent) may be worth registering.
- **`synonymsApplied` aggregate surface** — Rekon
  records per-candidate alias application but does
  not aggregate. Once meaningful, a roll-up surface
  in the architecture summary / agent contract may
  ship.
- **System-derived verbs beyond `build`** — classic
  seeded `deploy` / `test` / `lint` / similar. Rekon's
  base pack has `build` + `test` but treats them as
  general canonical verbs, not system-seed-tagged
  verbs. A small canon-pack adjustment can match
  classic's model; depends on the AST adapter shape.

## Methods To Reject

These classic methods do **not** belong in Rekon:

- **Monolithic `GraphOntologyValidator` port** —
  rejected by the
  [GraphOntologyValidator-Lite Audit](graph-ontology-validator-lite-audit.md).
  Composable graph-aware filters per check instead.
- **`TaxonomyRepository` / `VerbVocabularyRepository`
  as separate persistence layers** — Rekon's
  artifact-store + canon-pack model already
  persists vocabulary. No new repository
  abstraction needed.
- **Implicit per-classic-internal analysis cache** —
  Rekon's `EvidenceGraph` is the public protocol;
  no private cache substitutes for it.
- **LLM-augmented extraction in v1** — classic
  escalated to LLM augmentation when deterministic
  extraction was insufficient. Rekon's architecture
  decision pins LLM-only inference as out-of-scope;
  LLM as audit signal is a far-future slice.
- **Classic-style mutable analysis state** —
  Rekon's artifacts are immutable per the artifact
  contract; classic's caches are not. The
  artifact-first model is intentionally stricter.

## AST Adapter Implication

The right next slice is:

**JS/TS AST Evidence Adapter Decision** — strategy
memo that:

- Picks a parser (TypeScript compiler API, ts-morph,
  swc, or another deterministic-AST option). Each
  has tradeoffs (install size, performance,
  type-checker access, distribution model).
- Defines the emitted `EvidenceGraph` fact shapes
  (extending the existing `export` / `symbol` /
  `import` fact kinds, possibly adding
  `function-signature` / `class-member` /
  `type-alias` / `enum-member` kinds).
- Pins fallback behaviour for non-JS/TS repos and
  for environments where the AST parser can't load
  (regex fallback stays available; AST is *primary
  when available*).
- Pins confidence metadata (per-fact `confidence`
  enum or numeric score).
- Lists test fixtures (small TS files exercising
  each AST construct).
- Pins **no source writes**. The adapter reads, emits
  facts; never mutates source.
- Pins **no LLM-only inference**.
- Pins **no type-checker dependency in v1** (AST-only
  extraction is sufficient to close the regex gap;
  type-checker access is a future enrichment).

After the decision memo lands, implementation
follows as a runtime slice (JS/TS AST EvidenceGraph
Provider v1). The post-AST coverage review
re-measures stable phrase density on `target-1` +
`target-2`. Only then does `CapabilityMap` v2
high-confidence-only design become viable.

## Capability Ontology Implication

The current ontology track (canon packs, splitter,
phrase enrichment, candidate-quality v1) **stays as
shipped**. None of those slices were wrong; they
were just downstream of the bottleneck. Once AST
extraction lands, every downstream slice gets a
broader candidate population to work with:

- canon packs already cover the right canonical
  vocabulary.
- the splitter's path / noun-only sharpening already
  cleans the noise.
- phrase enrichment v1 already adds `domain` /
  `pattern` / `layer` context from `ObservedRepo` +
  `OwnershipMap`.
- the safety-review pins (semantic projection ≠
  ownership policy; stable-only `CapabilityMap` v2
  consumption) remain in force.

The post-AST review's job is to confirm whether the
stable foundation is finally broad enough to drive
a useful canonical projection. If yes →
`CapabilityMap` v2. If no → the architecture review
considers further evidence sources (framework
convention detection, doc-string signals,
dependency-graph hints).

## Recommendation

Selected: **The next capability-ontology slice is a
JS/TS AST Evidence Adapter Decision memo.** Classic
codebase-intel is design prior art, not history;
Rekon should adopt classic's AST-backed scanning
approach while keeping `EvidenceGraph` as the
repo-agnostic protocol.

Implementation sequence:

1. **JS/TS AST Evidence Adapter Decision** (next
   slice) — strategy memo.
2. **JS/TS AST `EvidenceGraph` Provider v1** —
   runtime slice. Replaces the regex-based extractor
   inside `@rekon/capability-js-ts`; regex stays as
   fallback.
3. **Post-AST coverage review** — re-run fixture +
   `target-1` + `target-2` + at least one additional
   archetype; measure stable phrase density delta.
4. **`CapabilityMap` v2 high-confidence-only design
   decision** — gated on the post-AST coverage
   review.
5. **`CapabilityContract` decision** — further
   future, after phrases stabilize and
   `CapabilityMap` v2 ships.

Parallel follow-ups (do not block the AST track):

- Canon-pack expansion v2 (per-archetype).
- Phrase enrichment v2 (framework / architecture-
  profile-derived `pattern` and `layer`).
- Additional cohort targets (intake-gated).

## Next-Step Decision Table

| Next Step | Decision | Reason |
| --- | --- | --- |
| JS/TS AST adapter decision | **selected** | The next product slice. Replaces the regex bottleneck per the parity matrix. |
| `CapabilityMap` v2 | **deferred** | Gated on post-AST coverage review. |
| More canon-pack tuning | **deferred** | Three coverage reviews show canon-pack tuning does not move the stable foundation while the regex bottleneck holds. |
| `GraphOntologyValidator` port | **rejected** | Per the [GraphOntologyValidator-Lite Audit](graph-ontology-validator-lite-audit.md). Composable filters per check instead. |
| Standalone `TaxonomyRepository` | **rejected** | Artifact store + canon-pack model already covers persistence. |
| Discovered-vocabulary artifact | **deferred** | Becomes meaningful only after AST extraction lands. |
| LLM-augmented extraction | **deferred (far future)** | Per the architecture decision; LLM stays as audit signal at best. |
| Source-reading adapters | **rejected (unchanged)** | Source writes / source reads remain unavailable. AST adapter reads bytes but never mutates. |

## What This Does Not Do

- Does **not** implement AST extraction. The next
  slice is a decision memo, not a runtime change.
- Does **not** change `EvidenceGraph`. Fact-shape
  extensions, if any, ship behind the AST adapter
  decision.
- Does **not** change `CapabilityNormalizationReport`
  shape or projection rules.
- Does **not** change `CapabilityPhraseReport` shape
  or projection rules.
- Does **not** mutate `CapabilityMap`.
- Does **not** change phrase enrichment rules.
- Does **not** port `GraphOntologyValidator`.
- Does **not** add `CapabilityContract` or
  `RefactorPreservationContract`.
- Does **not** add architecture linting, resolver
  routing, or verification planning by capability.
- Does **not** use AST / typechecker evidence in
  Rekon today — only commits to using it in a future
  slice.
- Does **not** use LLM-only inference.
- Does **not** read source files. **Source reads
  remain unavailable today**; the AST adapter
  decision pins read-only file access for its
  future scope.
- Does **not** add source writes. **Source writes
  remain unavailable.**
- Does **not** add a CLI command.
- Does **not** add a new permission, role, or
  workflow YAML.
- Does **not** publish to npm. **No version bump. No
  git tag. No GitHub Release. No new branch.**

## Follow-Up Work

- **JS/TS AST Evidence Adapter Decision** — ✅ shipped
  as the
  [JS/TS AST Evidence Adapter Decision](js-ts-ast-evidence-adapter-decision.md)
  (twenty-third slice). Selected the **TypeScript
  compiler parser API** for parser-only AST v1.
  Pinned regex extraction as fallback only. Pinned
  the additive `extractionMethod` / `language` /
  `syntaxKind` / `symbolKind` / `exportKind` /
  `importKind` / `location` / `confidence` fields
  on existing `symbol` / `export` / `import` facts.
  The runtime slice below inherits these answers.
- **JS/TS AST EvidenceGraph Provider v1** — ✅
  shipped as the twenty-fourth slice. Runtime
  implementation in `@rekon/capability-js-ts` using
  the TypeScript compiler parser API, parser-only,
  with regex preserved as labelled fallback. AST
  facts carry `extractionMethod` / `language` /
  `syntaxKind` / `symbolKind` / `exportKind` /
  `importKind` / `location` / `confidence`.
- **Post-AST coverage review** — fourth coverage
  review on the phrase track; conditioned on
  Provider v1.
- **`CapabilityMap` v2 high-confidence-only design
  decision** — gated on the post-AST coverage
  review.
- **Discovered-vocabulary artifact** (deferred;
  becomes meaningful after AST).
- **`synonymsApplied` aggregate surfacing** in
  architecture summary / agent contract
  publications (parallel, low-priority polish).
- **System-derived verb expansion** in base canon
  pack (parallel, depends on AST adapter shape).
- **Canon-pack expansion v2** (parallel; per-
  archetype overlays).
- **Phrase enrichment v2** (parallel; framework /
  architecture-profile-derived).
- **`CapabilityContract` decision** (further future).

## See Also

- [ADR 0004: codebase-intel-classic Is Reference, Not Dependency](../adr/0004-codebase-intel-classic-is-reference-not-dependency.md)
- [Classic Behavior Distillation](classic-behavior-distillation.md)
- [Classic Alignment Map](classic-alignment-map.md)
- [Classic Subsystem Purpose Map](classic-subsystem-purpose-map.md)
- [Classic-to-Rekon Translation](classic-to-rekon-translation.md)
- [Classic Guarantee Regression Plan](classic-guarantee-regression-plan.md)
- [Beta-Readiness Classic-Parity Review](beta-readiness-classic-parity-review.md)
- [GraphOntologyValidator-Lite Audit](graph-ontology-validator-lite-audit.md)
- [Capability Ontology Architecture Impact Review](capability-ontology-architecture-impact-review.md)
- [Capability Ontology Translation Layer Decision](capability-ontology-translation-layer-decision.md)
- [Capability Ontology Canon + Override Model Decision](capability-ontology-canon-override-model-decision.md)
- [JS/TS AST Evidence Adapter Decision](js-ts-ast-evidence-adapter-decision.md)
  — twenty-third slice; the next slice on the
  capability-ontology track. Selects the TypeScript
  compiler parser API; pins parser-only v1; pins
  regex as fallback only.
- [CapabilityPhraseReport Post-Quality Coverage Review](capability-phrase-post-quality-coverage-review.md)
- [`EvidenceGraph` artifact reference](../artifacts/evidence-graph.md)
- [`CapabilityNormalizationReport` artifact reference](../artifacts/capability-normalization-report.md)
- [`CapabilityPhraseReport` artifact reference](../artifacts/capability-phrase-report.md)
- [Capability ontology concept](../concepts/capability-ontology.md)
- [Roadmap](roadmap.md)
- [Classic-behavior roadmap](classic-behavior-roadmap.md)
