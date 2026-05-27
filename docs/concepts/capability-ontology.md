# Capability Ontology

**Status:** v1 shipped (CapabilityNormalizationReport).
**Audience:** operators, capability authors, agents.
**Scope:** explains how Rekon's layered capability ontology
translates raw repo vocabulary into canonical capability
language, what is auditable today, and what is deferred to v2.

The **capability ontology** is Rekon's translation layer
between arbitrary repo language (function names, exports,
file paths) and a canonical verb/noun capability language. It
is **layered**, **config-first**, and **auditable**. The
[Capability Ontology Translation Layer
Decision](../strategy/capability-ontology-translation-layer-decision.md)
records the selected approach and the eight-layer internal
model. Do not flatten the ontology into a single config /
report layer.

## Layered Model

The macro 5-layer boundary is:

1. `EvidenceGraph` — raw facts (`symbol`, `export`,
   `capability_hint`, `ownership_hint`).
2. `CapabilityOntology` — config-first source vocabulary
   (built-in baseline + operator config). In v1 this lives in
   source: `BUILTIN_CAPABILITY_ONTOLOGY` +
   `.rekon/capability-ontology.json`.
3. `CapabilityNormalizationReport` — first registered audit
   artifact (this slice).
4. `CapabilityMap` — canonical capability claims. Integration
   is deferred to v2.
5. `RefactorPreservationContract` — far-future preservation
   contracts. Name reserved; registration deferred.

The internal eight-layer refinement (raw facts → candidate
extraction → lexical split → baseline ontology → effective
ontology → normalization audit → normalized capability
projection → preservation contract) is preserved across the
implementation and is explicit in
`@rekon/capability-ontology/src/index.ts`.

## What v1 Ships

- `@rekon/capability-ontology` package (`projector` role,
  consumes `EvidenceGraph`, produces
  `CapabilityNormalizationReport`).
- **Built-in canon packs** ship with Rekon: `base` (always
  included) plus three archetype overlays — `nextjs-app`,
  `library-package`, `monorepo`. Each pack defines canonical
  verbs / nouns / aliases / categories / noise terms. Packs
  are the substrate the normalizer compiles from; operators
  do **not** author them.
- **Repo-local override file**:
  `.rekon/capability-ontology.overrides.json` (optional).
  Overrides extend or supersede canon. Operator-authored
  canonical terms are added to canon; aliases supersede pack
  aliases on key collision; noise extends pack noise.
- **Legacy compatibility**: when the canonical overrides file
  is absent, Rekon falls back to reading the legacy
  `.rekon/capability-ontology.json`. When both files exist,
  the overrides file wins and the report surfaces
  `legacyOverrideIgnored`. **Rekon never creates or mutates
  either file automatically.**
- A deterministic lexical splitter for camelCase, snake_case,
  and kebab-case names.
- A pure normalizer that maps candidates to canonical
  verb/noun pairs (using exact match + alias lookup).
- A `CapabilityNormalizationReport` audit artifact with
  per-candidate provenance, a coarse summary, and source
  metadata (`basePack`, `overlayPacks`, `overridePath`,
  `overrideHash`, `overrideKind`, `legacyOverrideIgnored`,
  `systemSeedCount`).
- Conservative overlay auto-detection from `package.json` +
  repo paths (`next` dependency / `app/` / `pages/` →
  `nextjs-app`; `workspaces` / `pnpm-workspace.yaml` /
  `packages/*` → `monorepo`; library-style exports without an
  app pattern → `library-package`).
- `rekon capability ontology normalize` CLI command.

**`CapabilityMap` integration remains deferred** until
reviewed terms produce stable high-confidence normalized
claims across multiple operator targets. Canon packs do not
mutate `CapabilityMap`.

## What v1 Does Not Ship

- **No `CapabilityMap` integration.** Layer 6 is deferred to
  v2. The normalized verb/noun claims do not flow into
  `CapabilityMap` entries in this batch.
- **No `RefactorPreservationContract`.** Layer 7 is
  far-future.
- **No LLM normalization.** v1 is purely deterministic.
- **No source-write apply.** This package never writes source
  files.
- **No finding mutation.** Unknown verbs / nouns surface as
  audit rows. They do not raise findings and do not resolve
  any existing finding.

## Operator Overrides (canon + override model)

Drop a `.rekon/capability-ontology.overrides.json` file next
to `.rekon/config.json` to extend or supersede the built-in
canon packs:

```json
{
  "version": "0.1.0",
  "extends": ["base", "nextjs-app"],
  "verbs": {
    "canonical": ["dispatch", "publish"],
    "aliases": { "broadcast": "dispatch" },
    "categories": { "dispatch": "communicate" }
  },
  "nouns": {
    "canonical": ["invoice"],
    "aliases": { "receipt": "invoice" },
    "thresholds": { "autoMap": 0.7 }
  },
  "roles": { "canonical": ["worker"] },
  "patterns": { "canonical": ["fan-out"] },
  "noise": {
    "verbs": ["legacy-noise-verb"],
    "nouns": ["legacy-noise-noun"]
  }
}
```

Rules:

- `version` must equal `"0.1.0"` in v1.
- **`extends` is optional.** When present, it selects which
  built-in packs the compiler applies. `base` is always
  included implicitly. When absent, Rekon falls back to
  conservative auto-detection from `package.json` and repo
  paths.
- **Operator-supplied canonical entries extend canon.**
  Built-in entries are never removed.
- **Operator-supplied aliases supersede pack aliases on key
  collision.** This is the only path for an alias key to win
  over canon.
- **Noise terms suppress suggestion noise, not raw
  evidence.** The normalizer still records raw `EvidenceGraph`
  facts; only the review surface uses noise for filtering.
- Aliases are case-insensitive.
- Invalid config (bad JSON, wrong version, wrong shape) fails
  the CLI command clearly. The CLI never silently ignores
  config errors.
- **Rekon never creates or mutates the override file
  automatically.** Operators apply suggestions manually.

### Legacy compatibility

`.rekon/capability-ontology.json` (the v1 path) is supported
as a **legacy compatibility fallback** when the canonical
overrides file is absent. When both files exist, the canonical
overrides file wins and the report surfaces
`legacyOverrideIgnored: true` so operators can clean up. There
is no automatic migration; operators rename the file
themselves when they are ready.

## Running The CLI

```bash
rekon refresh
rekon capability ontology normalize
```

`--json` emits the canonical report. Without `--json`, prints
a short summary line and the artifact id.

The CLI:

- Reads the latest `EvidenceGraph` from the local artifact
  store.
- Compiles an in-memory `EffectiveCapabilityOntology` from
  the built-in baseline + optional config.
- Writes a single `CapabilityNormalizationReport` under
  `.rekon/artifacts/projections/`.
- Does **not** mutate any source file.
- Does **not** mutate the `EvidenceGraph` or `CapabilityMap`.
- Does **not** silently resolve findings.

If no `EvidenceGraph` exists yet, the command fails with the
message *"rekon capability ontology normalize: no
EvidenceGraph found. Run `rekon refresh` (or `rekon observe`)
first."*

## Unknown Verbs / Nouns Are Audit Signal

Unknown verbs surface as `status: "unknown-verb"` rows.
Unknown nouns surface as `status: "unknown-noun"` rows. Both
unknown surface as `status: "unknown"`. The operator decides
whether to:

- Add the term to `.rekon/capability-ontology.json` (extending
  the ontology), or
- Rename the source symbol to a canonical form, or
- Accept the unknown row as documented audit signal.

Rekon never auto-extends the ontology. Unknowns must surface.

## Operator Review Surface

The
[`CapabilityNormalizationReviewLedger`](../artifacts/capability-normalization-review-ledger.md)
is the **append-only** operator surface for triaging unknown
/ low-confidence terms before any vocabulary expansion or
`CapabilityMap` integration. It is the runtime surface
selected by the
[built-in baseline coverage review](../strategy/builtin-ontology-coverage-review.md).

Three CLI subcommands drive the workflow:

```bash
rekon capability ontology review suggestions \
  --report <CapabilityNormalizationReport-id|type:id> \
  [--limit <n>] [--include-decided] [--json]

rekon capability ontology review decide \
  --term <text> \
  --term-kind verb|noun|candidate \
  --decision extend-ontology|rename-symbol|noise-filter|defer \
  --reason <text> \
  [--suggested-canonical <text>] \
  [--report <CapabilityNormalizationReport-id|type:id>] \
  [--candidate <candidate-id>] \
  [--json]

rekon capability ontology review decisions [--json]
```

Rules:

- The ledger is **append-only**. Each `decide` appends one
  entry; existing entries are never rewritten or removed.
- Recording an `extend-ontology` decision does **not**
  automatically mutate `.rekon/capability-ontology.json`.
  Vocabulary expansion ships in a separate slice that uses
  the ledger as input.
- The review surface does **not** mutate
  `CapabilityNormalizationReport`, `CapabilityMap`, or
  `EvidenceGraph`.
- The four decision values are: **`extend-ontology`** (term
  is a real capability verb / noun missing from the
  baseline), **`rename-symbol`** (source repo should rename),
  **`noise-filter`** (term is not a capability — symbol
  noise), and **`defer`** (operator is not yet sure).

## Vocabulary Expansion Preview

The
[`CapabilityOntologySuggestionReport`](../artifacts/capability-ontology-suggestion-report.md)
is the **preview-only** projection of the review ledger's
`extend-ontology` decisions into a proposed
`.rekon/capability-ontology.json` patch. It is the next
stage of the translation track and is driven by:

```bash
rekon capability ontology suggestions \
  [--ledger <CapabilityNormalizationReviewLedger-id|type:id>] \
  [--root <path>] [--json]
```

Rules:

- The surface is **preview-only**. The report contains a
  `before` / `after` JSON string under `preview.patch`;
  `.rekon/capability-ontology.json` is **not** mutated
  automatically.
- Only `extend-ontology` ledger decisions feed the report.
  `rename-symbol`, `noise-filter`, and `defer` decisions
  are ignored.
- `termKind: candidate` is skipped in v1 with the reason
  *"candidate-level decisions require manual ontology
  editing."* (single-token decisions need operator
  judgement that v1 does not encode).
- `CapabilityMap` integration (Layer 6) remains deferred
  until vocabulary expansion reaches a steady state across
  multiple targets.
- The architecture summary and agent contract publishers
  surface the latest
  `CapabilityOntologySuggestionReport` so operators see
  ontology expansion proposals next to repo state without
  running the suggestions CLI directly. The publication
  surfaces are **read-only**: they never mutate
  `.rekon/capability-ontology.json`, the ledger, the
  suggestion report, or `CapabilityMap`. The agent contract
  adds a `Do Not Do` reminder pinning that suggestions are
  **not applied vocabulary**. Proof report surfacing
  remains deferred.
- The full `normalize → review → suggest → publish` loop
  has been reviewed end-to-end as a preview-only operator-
  control surface; see the
  [Capability Ontology Suggestion Safety
  Review](../strategy/capability-ontology-suggestion-safety-review.md).
  The review pins that **manual editing of
  `.rekon/capability-ontology.json` remains the
  operator-control boundary** and that no operator-approved
  config apply command ships yet. `CapabilityMap`
  integration remains deferred until reviewed terms
  produce stable high-confidence normalized claims.
- Operators executing the manual fallback path should
  read the
  [Capability Ontology Config Authoring
  Guide](../beta/capability-ontology-config-authoring-guide.md)
  for the canonical config shape and the
  [Capability Ontology Review-Loop
  Quickstart](../beta/capability-ontology-review-loop-quickstart.md)
  for the seven-step procedural walkthrough. Both docs
  pin verbatim that `.rekon/capability-ontology.json` is
  optional, that Rekon never creates or mutates it
  automatically, and that suggestions remain preview-only.
  They are emergency manual references, not the
  steady-state product model.
- The steady-state product model is the
  [Capability Ontology Canon + Override Model
  Decision](../strategy/capability-ontology-canon-override-model-decision.md):
  Rekon ships canonical ontology packs (`base` +
  archetype overlays) and repo-local overrides extend or
  supersede them. The override file is being renamed
  `.rekon/capability-ontology.overrides.json` in the
  canon-packs-v1 implementation slice.

## Lexical Splitter Confidence

- **High**: 2 tokens (`getUser`, `save_token`).
- **Medium**: 3+ tokens (`getUserToken`, `delete_user_record`).
- **Low**: 1 token (`orphan`) or empty.

Low-confidence candidates are classified `low-confidence` in
the report regardless of ontology lookup. They are not
considered normalized.

## Semantic Layer (CapabilityPhrase)

The normalization report answers "what does this symbol
look like?" The next layer — `CapabilityPhrase` — answers
"what does this *do*?" A phrase enriches the canonical
verb / noun pair with optional `qualifier` / `domain` /
`pattern` / `layer` fields plus required `confidence` and
`evidenceRefs`. `CapabilityPhrase` is the intermediate
semantic unit between `CapabilityNormalizationReport` and
the future `CapabilityMap` v2.

**`CapabilityPhraseReport` v1 has shipped.** The
[CapabilityPhrase + CapabilityContract Architecture
Decision](../strategy/capability-phrase-contract-architecture-decision.md)
reserved the name and field shape, and the
[CapabilityPhraseReport
Decision](../strategy/capability-phrase-report-decision.md)
committed to Option B (a separate artifact carrier). The
runtime now registers
[`CapabilityPhraseReport`](../artifacts/capability-phrase-report.md)
as a new `projections` artifact type. The
`buildCapabilityPhraseReport` helper in
`@rekon/capability-ontology` projects high-confidence
normalized candidates from
`CapabilityNormalizationReport` into stable
`CapabilityPhrase` entries. The
`rekon capability phrase project --report <ref>` CLI
command writes the report. **The translation audit
(`CapabilityNormalizationReport`) and the semantic
purpose projection (`CapabilityPhraseReport`) remain
distinct layers.** `CapabilityMap` is not mutated — v2
will consume the phrase report later, not raw
normalization rows. `CapabilityContract` remains the
future policy layer; `RefactorPreservationContract` is a
phase-specific projection of that policy.

The
[CapabilityPhraseReport Safety Review](../strategy/capability-phrase-report-safety-review.md)
pins these verbatim guarantees: `CapabilityPhraseReport`
is **semantic purpose projection, not ownership or
placement policy**; `CapabilityNormalizationReport`
**remains the translation audit**; `CapabilityMap`
**integration remains deferred until phrase coverage is
measured on real repos**; **proof report surfacing
remains deferred because phrase projection is semantic
context, not verification proof**; and **only stable
high-confidence phrases are eligible for future
`CapabilityMap` v2**. The architecture summary and agent
contract carry a read-only `Capability Phrases` section
that surfaces the deferred-`CapabilityMap` callout; the
proof report does not.

The
[CapabilityPhraseReport Real-Repo Coverage Review](../strategy/capability-phrase-report-coverage-review.md)
measured phrase output on a fixture
(`examples/simple-js-ts`) and one real, anonymized
Next.js TypeScript target (`target-1`): **16 stable
phrases on 9,110 candidates (0.18%; 6.6% of normalized).
Every phrase carries an `EvidenceGraph` ref; every phrase
is `status === "stable"`, `confidence === "high"`.**
Phrase quality is high; phrase coverage is sparse. The
review pins **`CapabilityMap` v2 is evidence-gated** and
selected **phrase enrichment v1** as the next slice.

[Phrase Enrichment v1](../strategy/capability-phrase-enrichment-v1.md)
has shipped. The builder now consumes optional
`ObservedRepo` + `OwnershipMap` and populates the phrase
`domain` / `pattern` / `layer` fields when deterministic
context is available. Partial phrases emit only when at
least one enrichment field is present — they are
**semantic context, not `CapabilityMap`-ready placement
or ownership policy**. **The stable threshold is
unchanged**: only stable high-confidence phrases remain
eligible for future `CapabilityMap` v2. Coverage on
`target-1` rose from 16 → 239 phrases (16 stable + 223
partial; 0 low-confidence). `sideEffects` / `inputs` /
`outputs` remain deferred per the architecture decision.

## See Also

- [`CapabilityNormalizationReport` artifact
  reference](../artifacts/capability-normalization-report.md)
- [`CapabilityNormalizationReviewLedger` artifact
  reference](../artifacts/capability-normalization-review-ledger.md)
  — append-only operator decisions over unknown /
  low-confidence terms.
- [`CapabilityOntologySuggestionReport` artifact
  reference](../artifacts/capability-ontology-suggestion-report.md)
  — preview-only proposal for
  `.rekon/capability-ontology.json` based on
  `extend-ontology` ledger decisions.
- [Capability Ontology Suggestion Safety
  Review](../strategy/capability-ontology-suggestion-safety-review.md)
  — end-to-end safety review of the
  `normalize → review → suggest → publish` loop. Pins
  the preview-only contract and defers any config apply
  command.
- [CapabilityPhraseReport Safety
  Review](../strategy/capability-phrase-report-safety-review.md)
  — end-to-end safety review of the
  `normalize → phrase project → publish` path. Pins
  semantic-purpose-projection boundary, the deferred
  `CapabilityMap` v2 gate, and the deferred proof report
  surfacing.
- [CapabilityPhraseReport Real-Repo Coverage
  Review](../strategy/capability-phrase-report-coverage-review.md)
  — coverage / dogfood-analysis review measuring phrase
  output on a fixture + one real Next.js TS target.
  Verdict: phrase quality is high; coverage is sparse.
  Next slice is **phrase enrichment v1** rather than
  `CapabilityMap` v2.
- [CapabilityPhraseReport Phrase Enrichment
  v1](../strategy/capability-phrase-enrichment-v1.md)
  — product slice that adds deterministic `domain` /
  `pattern` / `layer` enrichment from `ObservedRepo` +
  `OwnershipMap`. Enables `partial` phrase emission while
  keeping the stable threshold unchanged.
- [Capability Ontology Config Authoring
  Guide](../beta/capability-ontology-config-authoring-guide.md)
  + [Capability Ontology Review-Loop
  Quickstart](../beta/capability-ontology-review-loop-quickstart.md)
  — operator-facing manual editing reference and
  seven-step quickstart. Fallback / emergency manual
  path.
- [Capability Ontology Canon + Override Model
  Decision](../strategy/capability-ontology-canon-override-model-decision.md)
  — steady-state product model. Rekon ships canonical
  packs + archetype overlays; repo-local overrides
  extend or supersede them.
- [Capability Ontology Translation Layer
  Decision](../strategy/capability-ontology-translation-layer-decision.md)
- [Capability Ontology Architecture Impact
  Review](../strategy/capability-ontology-architecture-impact-review.md)
- [Built-In Baseline Ontology Coverage
  Review](../strategy/builtin-ontology-coverage-review.md) —
  evidence-based review of the v1 baseline against a real
  Next.js TypeScript target. Recommends Option C (operator
  review surface) as the next implementation slice. Vocabulary
  expansion (Option A) follows; `CapabilityMap` v2 (Option B)
  remains deferred.
- [`EvidenceGraph` artifact reference](../artifacts/evidence-graph.md)
- [Reconciliation preview
  concept](reconciliation-preview.md)
- [`@rekon/capability-ontology`
  README](../../packages/capability-ontology/README.md)
