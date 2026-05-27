# CapabilityPhrase + CapabilityContract Architecture Decision

**Status:** v1 architecture decision. Strategy / docs /
tests-only batch. **No runtime behavior. No new artifact
registration. No `CapabilityMap` mutation. No
`CapabilityNormalizationReport` mutation. No
`EvidenceGraph` mutation. No source-write apply. No AST-first
assumption. No LLM-only semantic inference. No npm publish.
No version bump. No git tag. No GitHub Release. No new
branch.**

**Audience:** future implementers of the capability-ontology
track, operators following the canon + override roadmap, and
agents needing a stable purpose model to reason about repos.

**Companion docs:**

- [Capability Ontology Translation Layer Decision](capability-ontology-translation-layer-decision.md)
  — the eight-layer translation model this memo extends.
- [Capability Ontology Canon + Override Model Decision](capability-ontology-canon-override-model-decision.md)
  — the canon-packs-v1 substrate that emits the verb / noun
  pairs `CapabilityPhrase` enriches.
- [Capability Ontology Architecture Impact Review](capability-ontology-architecture-impact-review.md)
  — the five architectural reservations this memo turns into
  a semantic primitive.

## Decision Summary

`CapabilityPhrase` is the **intermediate semantic unit**
between `CapabilityNormalizationReport` and the future
`CapabilityMap` v2. A `CapabilityPhrase` is a
**purpose-bearing claim** about what a piece of repo
behaviour *does*, not just how it is named. A normalized
verb / noun pair is the **seed**, not the phrase itself.

`CapabilityContract` is a **future policy / preservation
layer** that binds a `CapabilityPhrase` to placement rules,
required proof, allowed neighbours, and preservation
obligations. `CapabilityContract` is **not the same as**
`RefactorPreservationContract` — that name remains reserved
for phase-specific refactor obligations after a contract
exists.

Selected direction:

- **`CapabilityPhrase` is `verb` + `noun` + a small set of
  repo-agnostic enrichment fields** (qualifier, domain,
  pattern, layer, sideEffects, inputs, outputs, confidence,
  evidenceRefs). v1 ships only the fields the existing
  artifact graph can populate; the rest are reserved.
- **AST / typechecker evidence is optional enrichment,
  never foundational truth.** Lexical, path, ownership,
  framework, and operator-decision evidence remain the
  baseline. Language adapters layer in via separate slices
  per language.
- **`CapabilityMap` v2 consumes only stable, confidence-
  scored `CapabilityPhrase` claims.** Low / unknown
  confidence claims surface as audit signal; they do not
  flow into the canonical projection.
- **`CapabilityContract` is a future layer.** v1 only
  reserves the name and pins the boundary.
- **Repo / language / architecture agnostic evidence is
  required** for the phrase model to work across
  arbitrary repos. Evidence-source coverage is staged per
  source, not per language.

**Verbatim pins** (the docs test asserts these):

- `CapabilityPhrase` is the intermediate semantic unit
  between `CapabilityNormalizationReport` and
  `CapabilityMap` v2.
- `CapabilityPhrase` is different from a normalized
  verb/noun.
- `CapabilityContract` is the future policy / preservation
  layer.
- `CapabilityMap` v2 should consume stable
  `CapabilityPhrase` claims.
- AST is optional evidence, not foundational truth.
- Repo / language / architecture agnostic evidence is
  required.
- `CapabilityPhrase` supports architecture linting.
- `CapabilityPhrase` supports resolver routing.
- `CapabilityPhrase` supports verification planning.
- `CapabilityPhrase` supports semantic impact analysis.
- `CapabilityPhrase` supports memory.
- `CapabilityPhrase` supports refactor preservation.
- Source writes remain unavailable.

## Why This Decision Exists

The capability-ontology track has shipped:

```
EvidenceGraph
  → CapabilityNormalizationReport
  → CapabilityNormalizationReviewLedger
  → CapabilityOntologySuggestionReport
  → canon packs / overrides
```

The track now has enough audit and translation machinery to
take a raw symbol like `createInvoicePreview` and emit a
normalized claim of `create + invoice-preview`. That claim is
useful for operator review, but Rekon's north star requires
strictly more:

```
canonical capability phrase
  → placement / cohesion / impact / ownership /
    verification / preservation
```

Examples of the next semantic step:

- `create + invoice-preview` is **not enough** to decide
  whether a new file belongs in `app/billing/` or
  `app/admin/`.
- `validate + token` is **not enough** to decide whether the
  required proof is unit tests or integration tests.
- `publish + event` is **not enough** to decide whether
  side-effecting middleware needs to run before the
  publication completes.

A `CapabilityPhrase` is the smallest unit that can answer
those questions. It is the projection that future layers
(architecture linting, resolver routing, verification
planning, semantic impact analysis, memory, refactor
preservation) consume.

Without this decision, every downstream feature would invent
its own ad-hoc semantic model and the audit chain would
fragment. With this decision, every future feature consumes
the same primitive.

## North Star

Rekon's product north star (paraphrased from the canon +
override decision) is:

> Rekon understands *purpose* across arbitrary repos.

Concretely, that means an agent or operator can ask:

- *What does this file do?*
- *Where should this capability live?*
- *Who owns this behaviour?*
- *What proof must pass before this change is safe?*
- *What must survive this refactor?*

`CapabilityPhrase` is the structural answer to "what does
this do?" — and the foundation every other question rests
on. `CapabilityContract` is the structural answer to "where
does it belong, and what guarantees it?" — but only after
phrases stabilize.

The north star pin: **purpose is the product**. Normalized
verb / noun pairs are the substrate. CapabilityPhrase is
the purpose-bearing semantic claim. Every later artifact
projects from it.

## Repo-Agnostic Evidence Model

`CapabilityPhrase` must work for repos Rekon has never
seen. That requires the evidence model to be agnostic in
three dimensions:

1. **Language-agnostic.** A `CapabilityPhrase` should be
   producible from any repo whose `EvidenceGraph` can be
   built. Ruby, Python, Go, Rust, and shell repos must
   carry the same phrase model as TypeScript / JavaScript
   repos. AST / type-checker evidence is per-language
   enrichment; it is never the only evidence accepted.
2. **Architecture-agnostic.** Modular monoliths, monorepos,
   Next.js apps, library packages, CLIs, and ETL pipelines
   all need the same primitive. Archetype overlays
   (canon-packs-v1) provide canonical vocabulary per
   archetype, but the phrase shape itself is constant.
3. **Source-shape-agnostic.** The model must work whether
   the unit of repo behaviour is a function, a class, an
   exported module, a route file, a Lambda handler, or a
   declarative manifest. The phrase describes the
   capability, not the syntactic carrier.

This rules out:

- **AST-only inference.** Many repos Rekon governs do not
  expose a tractable AST (manifests, configs,
  domain-specific languages).
- **Language-specific schemas.** Schemas / API specs /
  test signatures are valuable evidence sources but cannot
  be required.
- **LLM-only semantic inference.** A model call may
  enrich a phrase but cannot be the only source of truth.
  See the
  [translation layer decision](capability-ontology-translation-layer-decision.md)
  for the same constraint at the ontology layer.

The required model is **multi-source evidence with
confidence scoring**. A `CapabilityPhrase` carries a
`confidence` field plus `evidenceRefs` so consumers can
audit which sources contributed and decide whether the
claim is stable enough to act on.

## CapabilityPhrase Model

Sketch only — **no implementation in this batch.** The
authoritative type lives in a later
`@rekon/capability-ontology` slice that introduces a
`CapabilityPhraseReport` (decision deferred to the next
memo).

```ts
type CapabilityPhrase = {
  // Required (v1)
  verb: string;
  noun: string;
  confidence: "high" | "medium" | "low";
  evidenceRefs: ArtifactRef[];

  // Optional (v1 partial)
  qualifier?: string[];
  domain?: string;
  pattern?: string;
  layer?: string;

  // Reserved (future enrichment)
  sideEffects?: string[];
  inputs?: string[];
  outputs?: string[];
};
```

Field semantics:

- **`verb`** / **`noun`** — the normalized canonical pair
  from `CapabilityNormalizationReport`. Required. The
  phrase is anchored on these.
- **`qualifier`** — small set of adjectives or modifiers
  the splitter / ontology can extract from the raw name
  (e.g. `["preview"]` for `createInvoicePreview`).
  Optional in v1; populated by lexical evidence.
- **`domain`** — coarse business / system domain
  (`"billing"`, `"auth"`, `"observability"`). Populated by
  ownership hints, path heuristics, and operator
  decisions. Partial in v1.
- **`pattern`** — recognized architecture pattern (`"pure
  service"`, `"route handler"`, `"adapter"`, `"factory"`).
  Populated by role / pack / framework signal. Partial in
  v1.
- **`layer`** — repo-layer placement (`"domain"`,
  `"infrastructure"`, `"ui"`, `"app"`). Populated by
  architecture profile / `ObservedRepo` / path. Partial in
  v1.
- **`sideEffects`** — declared / inferred side effects
  (`"db.write"`, `"http.send"`, `"file.write"`). Reserved
  for future enrichment via imports, packages, runtime
  evidence, and language adapters.
- **`inputs`** / **`outputs`** — typed shapes when
  available. Reserved for future enrichment via schemas,
  API specs, tests, and AST adapters.
- **`confidence`** — overall claim confidence. Required
  in v1. High = lexical + at least one corroborating
  source. Medium = lexical only with strong canon match.
  Low = lexical-only with weak match or only one source.
- **`evidenceRefs`** — `ArtifactRef[]` citing every
  artifact that contributed (typically the source
  `CapabilityNormalizationReport`, an `ObservedRepo`, an
  `OwnershipMap`, and any operator decision).

The v1 phrase is intentionally small. Future enrichment
(side effects, IO shapes) lands per evidence-source slice,
not in a single big-bang batch.

## CapabilityContract Model

Sketch only — **no implementation in this batch, and no v1
slice planned in the next track step.** The name is
reserved.

```ts
type CapabilityContract = {
  capability: CapabilityPhrase;
  allowedLayers?: string[];
  allowedSystems?: string[];
  forbiddenLayers?: string[];
  requiredChecks?: string[];
  requiredNeighbors?: CapabilityPhrase[];
  forbiddenNeighbors?: CapabilityPhrase[];
  preservationRules?: string[];
};
```

`CapabilityContract` answers questions about a phrase that
are **policy**, not facts:

- **Where can it live?** (`allowedLayers`,
  `allowedSystems`, `forbiddenLayers`)
- **What proof must pass before changes ship?**
  (`requiredChecks`)
- **What capabilities must it be next to?**
  (`requiredNeighbors`)
- **What capabilities must it never call?**
  (`forbiddenNeighbors`)
- **What behaviour must survive refactors?**
  (`preservationRules`)

A `CapabilityContract` is operator-authored (with
suggestions surfacing as audit rows in a future ledger). It
is **not** derived purely from observation — that is the
difference between a phrase (observed) and a contract
(policy).

`CapabilityContract` is deliberately deferred. v1 only
reserves the name and the boundary so the field model can
evolve without re-litigating the contract layer.

## CapabilityPhrase Versus Normalized Verb/Noun

| Aspect | Normalized verb/noun | CapabilityPhrase |
| --- | --- | --- |
| Source artifact | `CapabilityNormalizationReport` (Layer 5) | future `CapabilityPhraseReport` (new layer between 5 and 6) |
| Granularity | per-symbol / per-export claim | per-capability semantic projection |
| Fields | `verb`, `noun`, `confidence`, alias-applied | `verb` + `noun` + qualifier + domain + pattern + layer + (future) side effects + IO + confidence + evidenceRefs |
| Evidence | raw `EvidenceGraph` facts + ontology lookup | normalization claim + ownership + framework + operator decisions + future adapters |
| Consumers | operator review, suggestion-report preview | architecture linting, resolver routing, verification planning, semantic impact, memory, refactor preservation, future `CapabilityMap` v2 |
| Repo-agnostic | yes — language-neutral | yes — same field model across repos |
| Mutates `EvidenceGraph` | no | no |
| Mutates `CapabilityMap` | no | no (v2 is additive) |
| LLM-only inference | rejected | rejected (LLM is enrichment, never sole source) |

The two are **layered**, not redundant. The normalization
report stays as the translation audit. The phrase report
stays as the semantic projection. A repo always has both;
each answers a different question.

## CapabilityContract Versus RefactorPreservationContract

| Aspect | `CapabilityContract` | `RefactorPreservationContract` |
| --- | --- | --- |
| Anchor | a single `CapabilityPhrase` | a coherent set of capabilities tied to a specific refactor phase |
| Scope | steady-state policy (placement, proof, neighbours, preservation rules) | phase-specific obligations (what must survive *this* refactor) |
| Lifetime | long-lived; evolves slowly | bounded by a refactor batch |
| Source | operator-authored (with suggestion ledger) | derived from a `CapabilityContract` + planned change set |
| When | future, after phrases stabilize | further future, after contracts ship and a refactor pipeline exists |
| v1 status | name reserved | name reserved |
| Mutates source | no | no |

`CapabilityContract` is the **policy layer**;
`RefactorPreservationContract` is the **refactor
projection** of that policy onto a specific change. Both are
deferred; this memo only pins the boundary so neither can
collapse into the other later.

## Evidence Sources By Field

| Field | Evidence Sources | V1 Status |
| --- | --- | --- |
| `verb` | `CapabilityNormalizationReport` | v1 |
| `noun` | `CapabilityNormalizationReport` | v1 |
| `qualifier` | lexical split tokens beyond verb / noun + canon-pack qualifier vocabulary | v1 (lexical) |
| `domain` | path / ownership / docs / system hints (`OwnershipMap`, `ObservedRepo`, system seeds) | partial |
| `pattern` | path / role / export shape / framework convention (canon packs, archetype overlays, `CapabilityMap` role hints) | partial |
| `layer` | architecture profile / `ObservedRepo` / path | partial |
| `sideEffects` | imports / packages / runtime evidence / future language adapters | future |
| `inputs` / `outputs` | schemas / API specs / tests / future AST adapters | future |
| `confidence` | derived from per-field source count + ontology alias / canonical match strength + operator decisions | v1 |
| `evidenceRefs` | `ArtifactRef` citations to every contributing artifact | v1 |

Evidence-source coverage grows per slice, not per language.
The phrase model never assumes a particular language has
shipped its adapter; consumers must check `confidence` /
`evidenceRefs` to decide whether to act.

## Use Cases Unlocked

| Use Case | CapabilityPhrase Role |
| --- | --- |
| architecture linting | detect misplaced capability (phrase.layer mismatch vs. file path / archetype) |
| naming honesty | compare file name to dominant phrase (phrase.verb + phrase.noun vs. filename tokens) |
| overloaded files | detect unrelated phrase clusters (multiple high-confidence phrases in one file) |
| resolver routing | route by capability, not only path (`ResolverPacket` consumes phrase, not raw symbol) |
| verification planning | select checks for changed capability (phrase.pattern + requiredChecks → `VerificationPlan`) |
| semantic impact | identify affected capabilities (phrase-level change set, not just file diff) |
| memory | attach guidance to capability, not path (`OperatorFeedbackEntry.capability` → phrase) |
| refactor preservation | define what must survive (`CapabilityContract.preservationRules` over phrase semantics) |
| docs / publication | surface phrase clusters per system in architecture summary |
| capability map v2 | aggregate stable phrases into `CapabilityMap` entries with system / role / layer |

This table is the integration roadmap. Each row becomes a
candidate slice once `CapabilityPhrase` ships and produces
stable claims across the cohort.

## CapabilityMap v2 Boundary

`CapabilityMap` v1 ships today as a projection from
`ObservedRepo` + `OwnershipMap`. It does **not** consume
`CapabilityNormalizationReport`. The capability-ontology
track has deferred wiring the audit into the map until
normalized claims stabilize.

`CapabilityMap` v2 will consume **only stable, confidence-
scored `CapabilityPhrase` claims**. The pipeline becomes:

```
CapabilityNormalizationReport (per-symbol audit)
  → CapabilityPhraseReport (per-capability semantic projection)
  → CapabilityMap v2 (per-system canonical projection)
```

Constraints on v2:

- v2 consumes phrases with `confidence ∈ {"high"}` by
  default. Operators may opt into `"medium"` per repo via
  a future config knob.
- v2 cites the source `CapabilityPhraseReport` in
  `header.inputRefs` so freshness propagates.
- v2 **does not** mutate `EvidenceGraph`, the
  normalization report, the phrase report, or any
  operator decision.
- v2 ships only after phrase claims are demonstrated
  stable across multiple cohort targets — measured by the
  canon-pack coverage review slice.

Until then, `CapabilityMap` stays as a derived projection
from `ObservedRepo` + `OwnershipMap`, exactly as v1
shipped.

## AST / Language Adapter Boundary

AST / typechecker evidence is **optional enrichment**, not
foundational truth. The constraint is non-negotiable:

- A repo without an AST adapter must still produce a
  `CapabilityPhrase` (with lower confidence for AST-
  derived fields).
- An AST adapter must be a **separate package** per
  language, surfaced through additive `EvidenceGraph`
  fact kinds (e.g. `ast.signature`, `ast.side_effect`).
- Phrase compilation must **prefer** lexical + ownership
  + framework signal over AST signal when sources
  conflict, until the AST adapter has demonstrated
  stability for the language. Why: lexical evidence is
  what survives across all language adapters; AST signal
  may be wrong for misleadingly-named symbols.
- LLM-only inference is **rejected** for the phrase
  layer. An LLM may enrich a phrase by suggesting a
  domain / pattern label, but the label must be cited
  and operator-reviewable (suggestion ledger), and the
  phrase remains valid without it.

This boundary lets language-specific adapters ship
incrementally without blocking the rest of the model.

## Use Cases Unlocked (table referenced above)

See [Use Cases Unlocked](#use-cases-unlocked). The table is
the single integration roadmap; future slices reference it.

## Layer Boundary

The boundary table the existing translation-layer decision
established becomes:

| Layer | Responsibility |
| --- | --- |
| `CapabilityNormalizationReport` | translation audit |
| `CapabilityPhrase` | purpose-bearing semantic claim |
| `CapabilityMap` | stable capability projection |
| `CapabilityContract` | placement / proof / preservation policy |
| `RefactorPreservationContract` | phase-specific refactor obligations |

`CapabilityPhrase` sits **between** the translation audit
(Layer 5) and the canonical projection (Layer 6). It is
the new Layer 5b in the eight-layer model. The eight-layer
model is preserved; this memo refines Layer 6 to make
explicit that the projection is built from phrases, not
directly from normalization rows.

## Risks

| Risk | Mitigation |
| --- | --- |
| Phrase model becomes language-specific in practice | enforce repo-agnostic evidence in v1 contract tests; require lexical + at least one non-AST source for `confidence: "high"` |
| Field bloat (every consumer asks for one more field) | freeze v1 fields; future enrichment lands per evidence-source slice with its own decision memo |
| Operators conflate phrase and contract | docs / publications surface phrase and contract under separate headings; suggestion-report and ledger only target phrase enrichment, not contract authoring, until contract ships |
| `CapabilityMap` v2 ships before phrase claims stabilize | v2 gated on canon-pack coverage review showing stable high-confidence claims across ≥ 2 cohort targets |
| AST adapters get prioritized over lexical evidence | per-language AST adapters ship behind their own decision memos and must demonstrate non-conflict with lexical signal before raising phrase confidence |
| LLM enrichment becomes load-bearing | LLM suggestions surface only as operator-reviewable ledger entries; the phrase remains valid without them |
| Refactor preservation conflated with `CapabilityContract` | this memo pins the boundary; `RefactorPreservationContract` is the phase projection, not the policy layer itself |
| Suggestion-report and review-ledger semantics drift | both already target the override file under canon-packs-v1; phrase-specific review surfaces will need a follow-up decision before any new mutation channel ships |

## Recommendation

Selected direction:

- **Reserve `CapabilityPhrase` and `CapabilityContract`
  names now.** Do not register artifacts in this batch.
- **Pin the v1 `CapabilityPhrase` field shape** above:
  `verb` + `noun` + `confidence` + `evidenceRefs` required;
  `qualifier` / `domain` / `pattern` / `layer` optional /
  partial; `sideEffects` / `inputs` / `outputs` reserved.
- **Defer `CapabilityContract` to a separate future
  decision** after phrase claims demonstrate stability.
- **Defer `RefactorPreservationContract` to far-future**
  after `CapabilityContract` ships and a refactor pipeline
  exists.
- **Next slice (recommended):** *CapabilityPhrase v1
  artifact / report decision*. That decision answers
  whether v1 ships as:

    - **Option A** — enrich `CapabilityNormalizationReport`
      with phrase candidates (one artifact, two roles).
    - **Option B** — separate `CapabilityPhraseReport`
      artifact (this memo's preferred candidate; preserves
      *normalization audit ≠ semantic purpose projection*).
    - **Option C** — wait until more evidence-source slices
      ship before committing.

  The author of the next memo will choose; this memo only
  reserves the name and field shape.

## What This Does Not Do

- Does **not** add runtime behavior.
- Does **not** mutate `CapabilityMap`.
- Does **not** mutate `CapabilityNormalizationReport`.
- Does **not** mutate `EvidenceGraph`.
- Does **not** mutate operator decisions or the
  `CapabilityNormalizationReviewLedger`.
- Does **not** register a `CapabilityPhrase` artifact.
- Does **not** register a `CapabilityContract` artifact.
- Does **not** register a `RefactorPreservationContract`
  artifact.
- Does **not** add a CLI command.
- Does **not** add source writes. **Source writes remain
  unavailable.**
- Does **not** assume AST-first evidence.
- Does **not** ship a language adapter.
- Does **not** add LLM-only semantic inference.
- Does **not** publish to npm.
- Does **not** bump versions.
- Does **not** add a git tag or GitHub Release.
- Does **not** create a branch.

## Follow-Up Work

- **CapabilityPhrase v1 artifact / report decision** —
  ✅ Resolved by the
  [CapabilityPhraseReport Decision](capability-phrase-report-decision.md).
  Selected: **Option B** — separate
  `CapabilityPhraseReport`. **CapabilityPhraseReport v1**
  has shipped (see
  [`docs/artifacts/capability-phrase-report.md`](../artifacts/capability-phrase-report.md));
  the artifact registers in the SDK + runtime, the
  `buildCapabilityPhraseReport` helper lives in
  `@rekon/capability-ontology`, and the
  `rekon capability phrase project --report <ref>` CLI
  command writes the report.
- **CapabilityPhraseReport publication surfacing** —
  ✅ Shipped. Architecture summary + agent contract carry a
  read-only `Capability Phrases` section with the
  deferred-`CapabilityMap` callout, summary counts, and a
  bounded phrase table. Proof report surfacing remains
  deferred.
- **CapabilityPhraseReport safety review** —
  ✅ Shipped. Pins that `CapabilityPhraseReport` is semantic
  purpose projection (not ownership or placement policy),
  `CapabilityNormalizationReport` remains the translation
  audit, `CapabilityMap` integration remains deferred until
  phrase coverage is measured on real repos, proof report
  surfacing remains deferred because phrase projection is
  semantic context (not verification proof), and only stable
  high-confidence phrases are eligible for future
  `CapabilityMap` v2. See
  [Safety Review](capability-phrase-report-safety-review.md).
- **CapabilityPhraseReport real-repo coverage review** —
  ✅ Shipped. See
  [Coverage Review](capability-phrase-report-coverage-review.md).
  16 stable phrases on `target-1` (0.18% of candidates;
  6.6% of normalized). Phrase quality high, coverage
  sparse. Selected next slice: phrase enrichment v1.
- **Phrase enrichment v1** —
  ✅ Shipped. See
  [Phrase Enrichment v1 Memo](capability-phrase-enrichment-v1.md).
  Deterministic `domain` / `pattern` / `layer`
  enrichment from `ObservedRepo` + `OwnershipMap`.
  Coverage on `target-1` rose 15× (16 → 239 phrases).
  Stable threshold unchanged.
- **Second coverage review** — next slice. Re-measure
  stable + partial yield after enrichment lands across
  fixture + at least one real cohort target. Output
  drives the `CapabilityMap` v2 high-confidence-only
  decision.
- **Phrase confidence model decision** — define the
  formula. Initial sketch: lexical-only (low), lexical +
  canon-pack match (medium), lexical + canon + at least
  one ownership / framework / operator source (high).
  Lands after the second coverage review.
- **Per-evidence-source enrichment slices** (framework /
  architecture profile / future AST / LLM as audit
  signal). Each lands behind its own decision memo.
- **CapabilityMap v2 design** — gated on phrase
  stability and the safety review. Decides additive vs.
  replacement projection semantics.
- **CapabilityContract decision** — only after phrases
  stabilize. Defines schema, authoring surface, suggestion
  workflow, and review-ledger semantics.
- **RefactorPreservationContract decision** — far-future,
  after `CapabilityContract` ships.
- **Language adapter decisions** — per-language; AST
  evidence ships behind its own memo each time.
- **LLM enrichment decision** — defines how and where LLM
  suggestions enter the phrase pipeline as audit signal,
  not truth.

## See Also

- [Capability Ontology Translation Layer Decision](capability-ontology-translation-layer-decision.md)
- [Capability Ontology Canon + Override Model Decision](capability-ontology-canon-override-model-decision.md)
- [Capability Ontology Architecture Impact Review](capability-ontology-architecture-impact-review.md)
- [Capability Ontology Suggestion Safety Review](capability-ontology-suggestion-safety-review.md)
- [CapabilityPhraseReport Safety Review](capability-phrase-report-safety-review.md)
- [CapabilityPhraseReport Real-Repo Coverage Review](capability-phrase-report-coverage-review.md)
- [CapabilityPhraseReport Phrase Enrichment v1](capability-phrase-enrichment-v1.md)
- [`CapabilityNormalizationReport` artifact reference](../artifacts/capability-normalization-report.md)
- [`CapabilityNormalizationReviewLedger` artifact reference](../artifacts/capability-normalization-review-ledger.md)
- [`CapabilityOntologySuggestionReport` artifact reference](../artifacts/capability-ontology-suggestion-report.md)
- [Capability ontology concept](../concepts/capability-ontology.md)
- [Roadmap](roadmap.md)
- [Classic-behavior roadmap](classic-behavior-roadmap.md)
