# Capability Ontology Translation Layer Decision

**Status:** decision recorded.
**Slice:** `capability-ontology-translation-layer-decision`.
**Sequence position:** Second slice on the
capability-ontology track. Follows the
[Capability Ontology Architecture Impact Review](capability-ontology-architecture-impact-review.md).

## Decision Summary

**Recommendation: Option C — layered
config-first ontology + artifact-backed
normalization report.**

The capability ontology translation layer
preserves the layered architecture from
classic `codebase-intel`. It is **not** a
flat config + report. The internal model
honours eight layers (Layer 0 raw evidence
→ Layer 7 preservation contract), with the
macro five-layer boundary from the prior
architecture impact review remaining the
outer contract.

**Pinned verbatim (asserted by docs
test):**

- `CapabilityOntology` **starts as
  config / source vocabulary** — not an
  artifact in v1.
- `EffectiveCapabilityOntology` **is
  internal in v1** — a compiled in-memory
  model citable by digest, not a
  registered artifact.
- `CapabilityNormalizationReport` is the
  **first registered artifact** of this
  layer.
- `CapabilityMap` **integration is
  deferred to v2** — v1 ships the audit
  trail before downstream consumers rely
  on it.
- `EvidenceGraph` **raw facts are
  unchanged** — the translation layer
  reads them and never writes them back.
- **Unknown verbs / nouns must surface
  to operators** as first-class report
  entries.
- **LLM suggestions are not truth in
  v1** — they may be advisory metadata
  later, never canonical normalization
  in this slice or its v1 implementation
  slice.
- **Do not flatten the ontology into a
  single config / report layer.** The
  layered internal model is part of the
  design.

The owning package is
`@rekon/capability-ontology` (new). The
config source for v1 is
`.rekon/capability-ontology.json`
(optional; the built-in baseline
vocabulary is the default).

## Why This Decision Exists

The
[Capability Ontology Architecture Impact Review](capability-ontology-architecture-impact-review.md)
pinned the macro five-layer boundary
(`EvidenceGraph` → `CapabilityOntology`
→ `CapabilityNormalizationReport` →
`CapabilityMap` →
`RefactorPreservationContract`) and
reserved the three names. That review
deliberately deferred the *shape*
decisions to this memo:

- Is `CapabilityOntology` config,
  artifact, or both?
- What is the first audit artifact
  shape?
- Which capability package owns the
  translation pipeline?
- What is the phase-1 minimal product
  surface?
- Are unknown-term review candidates a
  new artifact, a field on the audit,
  or both?

The risk in answering those questions
casually is that a flat config + report
shape would lose the layered architecture
classic `codebase-intel` proved was
necessary. This memo answers each
question while preserving the layered
internal model. The next slice
(implementation v1) inherits the answers
without having to re-decide them.

## Architecture Boundary From Prior Review

From the architecture impact review,
**still in force**:

1. **Rekon still needs the ontology
   function.**
2. **The ontology function should not
   be a monolithic validator.**
3. **Raw evidence must remain separate
   from normalized purpose.**
4. **Normalization decisions need an
   audit artifact.**
5. `CapabilityMap` should eventually
   consume normalized capability claims.
6. `RefactorPreservationContract`
   depends on normalized capability
   language.
7. LLM-only normalization is not
   acceptable as truth.
8. Unknown verbs / nouns must surface
   to operators.

The macro five-layer boundary table:

| Layer | Responsibility |
| --- | --- |
| `EvidenceGraph` | raw observed facts |
| `CapabilityOntology` | canonical vocabulary / aliases |
| `CapabilityNormalizationReport` | translation audit |
| `CapabilityMap` | normalized capability projection |
| `RefactorPreservationContract` | preservation obligations |

This decision memo refines the second
and third layers into a layered internal
model while preserving the macro
boundary.

## Classic Layered Ontology Structure

Classic `codebase-intel` modelled the
translation as an explicit pipeline:

```text
source names
  → ExtractedName
  → SplitName
  → discovered verbs / nouns / patterns
  → baseline + workspace ontology merge
  → taxonomy validation format
  → canonical verb / noun normalization
  → synonymsApplied / corrected analysis
  → capability and architecture reasoning
```

Concretely, classic shipped:

- `lib/taxonomy/types.ts` — `ExtractedName`,
  `SplitName`, `TaxonomyOutput`,
  `TaxonomyValidationFormat`,
  `ValidationResult.synonymsApplied`.
- `lib/taxonomy/extraction.ts` — pulls
  names from functions, classes,
  methods, interfaces, types,
  variables, exports.
- `lib/taxonomy/discovery.ts` —
  aggregates term frequencies; seeds
  canonical verbs / nouns from
  `ownership.owns` /
  `ownership.doesNotOwn`.
- `lib/taxonomy/hierarchy.ts` — verb /
  noun category hierarchy.
- `lib/taxonomy/runtime.ts` /
  `lib/verb-rules.ts` /
  `lib/noun-rules.ts` — runtime
  validation + alias application.
- `schemas/verb-rules.schema.ts` /
  `schemas/noun-rules.schema.ts` /
  `schemas/taxonomy.schema.ts` — the
  declared shapes.
- `infra/repositories/VerbVocabularyRepository.ts`
  / `infra/repositories/TaxonomyRepository.ts`
  — config-backed vocabulary.
- `infra/validation/GraphOntologyValidator.ts`
  — the **monolithic validator** Rekon
  explicitly does NOT port wholesale.
- `domain/ontology/mergeOntology.ts` —
  baseline + workspace ontology merge.

The intent that must carry over: raw
evidence → candidate extraction →
lexical split → vocabulary → effective
vocabulary → audit → projection →
preservation.

The implementation that must NOT carry
over: a single service that owns every
stage end-to-end with no audit
artifact.

## Rekon Layered Ontology Model

Rekon's eight-layer internal model
(refines the macro five-layer
boundary):

### Layer 0 — `EvidenceGraph`

Raw observed facts: files, imports,
exports, symbols, ownership hints,
capability hints. Already exists.
**Read-only** input to every layer
above. Never mutated by ontology.

### Layer 1 — `CapabilityCandidateSet` (conceptual / helper)

The set of candidate name-bearing
records extracted from `EvidenceGraph`.
v1 sources:

| Source | Note |
| --- | --- |
| `EvidenceGraph.facts.symbols` | function / class / method / interface / type / variable / export tokens |
| `EvidenceGraph.facts.exports` | exported names + paths |
| `EvidenceGraph.facts.capability_hints` (if present) | explicit capability declarations |
| `EvidenceGraph.facts.ownership_hints` (if present) | `ownership.owns` / `ownership.doesNotOwn` seed terms |
| system declarations from `ObservedRepo` / `OwnershipMap` | system-derived seed terms |

`CapabilityCandidateSet` is **not** an
artifact in v1. It is an internal
helper shape in
`@rekon/capability-ontology`.

### Layer 2 — `CapabilityLexicalSplit` (helper)

For each candidate name, a
deterministic verb / noun split with
explicit confidence. Examples:

- `createUser` → verb `create`, noun
  `user`, splitConfidence `high`.
- `signUp` → verb `sign`, noun
  `up`, splitConfidence `low`
  (preposition collision).
- `Auth` → noun `auth`, no verb,
  splitConfidence `medium`.

The lexical splitter is rules-based,
deterministic, and never invokes an
LLM. Confidence is one of `high` /
`medium` / `low`. Splits with
confidence below the configured
threshold are recorded but **not
projected downstream** in v1.

### Layer 3 — `CapabilityOntology`

Canonical vocabulary + aliases. Lives
as **config** in v1
(`.rekon/capability-ontology.json`,
optional; built-in baseline
otherwise). Operator-editable. Not an
artifact. Carries:

- `verbs.canonical` — canonical verbs
  (`create`, `read`, `update`,
  `delete`, `authenticate`, …).
- `verbs.aliases` —
  `signUp → create` style
  alias-to-canonical map.
- `verbs.categories` — optional
  category groupings.
- `nouns.canonical` — canonical
  nouns (`user`, `session`, `order`,
  …).
- `nouns.aliases` — same shape as
  verb aliases.
- `nouns.categories` — optional
  groupings.
- `nouns.thresholds.autoMap` —
  confidence threshold above which
  the normalization step may auto-map
  an unknown noun via deterministic
  rules.
- `verbs.includeSystemVerbs` /
  `nouns.includeSystemNouns` —
  whether to fold system-derived
  seed terms into the canonical sets.
- `roles`, `patterns`, `layers` —
  optional secondary vocabularies
  with the same canonical + aliases
  shape.

### Layer 4 — `EffectiveCapabilityOntology` (internal)

Deterministic compiled vocabulary:
**builtin baseline + repo-local
overrides + system-derived seed
terms**. Internal-only in v1; cited
by `effectiveHash` in the audit
artifact, but **not** registered as
an artifact itself.

### Layer 5 — `CapabilityNormalizationReport`

The first artifact this layer ships.
Records every translation decision:
raw candidate → normalized capability
claim / unknown term / ignored /
low-confidence. Cites the
`EvidenceGraph` source, the ontology
config path / digest, and the
effective-ontology digest. Inspectable
by operators.

### Layer 6 — `CapabilityMap`

Future consumer of normalized
capability claims. **Not touched in
v1.** The existing capability
projection is unchanged. v2 wires the
audit artifact into `CapabilityMap`
as an **additive** input.

### Layer 7 — `RefactorPreservationContract`

Future consumer. Turns normalized
capabilities into preservation
obligations across refactors. Far
future; depends on translation
confidence + capability-map
integration + verification gates.

### Layer table (canonical)

| Layer | Responsibility | V1 Status |
| --- | --- | --- |
| EvidenceGraph | raw observed facts | input |
| CapabilityCandidateSet | extracted candidates | conceptual / helper |
| CapabilityLexicalSplit | verb/noun split | helper |
| CapabilityOntology | vocabulary / aliases | config |
| EffectiveCapabilityOntology | compiled vocabulary | internal |
| CapabilityNormalizationReport | translation audit | first artifact |
| CapabilityMap | normalized projection | deferred to v2 |
| RefactorPreservationContract | preservation obligations | future |

## Options Considered

### Option table

| Option | Decision | Reason |
| --- | --- | --- |
| Flat config-only ontology | rejected | no audit trail; flattens the layered system |
| Artifact-only ontology | rejected | vocabulary/policy must be operator-editable |
| Layered config-first + normalization report | selected | preserves layers and provides auditable translation |
| CapabilityMap-only normalization | rejected for v1 | collapses translation and projection too early |
| Monolithic GraphOntologyValidator revival | rejected | violates artifact-first architecture |

### Why Option A (flat config-only ontology) is rejected

A flat config-only ontology has no
audit artifact. Consumers would
apply aliases inline; operators
could never inspect *why* a given
capability claim normalized the way
it did. This is exactly the "hidden
semantic truth layer" failure mode
the architecture impact review
forbade.

### Why Option B (artifact-only ontology) is rejected

`CapabilityOntology` is vocabulary
+ policy — operator intent. It
needs to be operator-editable.
Generating it from observation
alone would collapse the
operator-review path that
decision #8 of the prior review
("unknown verbs / nouns must
surface to operators") depends on.

### Why Option C (recommended) is selected

`CapabilityOntology` lives as
config (operator intent); the
audit lives as an artifact
(machine-recorded decisions). The
internal `EffectiveCapabilityOntology`
captures the compiled result of
merging builtin + config + system
seeds without becoming a
publishable artifact. The layered
internal model from classic is
preserved as helper shapes inside
`@rekon/capability-ontology`. The
single artifact registered
(`CapabilityNormalizationReport`)
gives operators the inspection
surface the prior review
mandated.

### Why Option D (CapabilityMap-only normalization) is rejected for v1

Writing normalized claims directly
into `CapabilityMap` would collapse
translation audit and capability
projection into one artifact. The
audit trail would be entangled
with the projection; operator
review of normalization decisions
would be harder. v2 *adds*
normalized claims to
`CapabilityMap` additively — but
only after v1 proves the audit
shape.

### Why Option E (monolithic GraphOntologyValidator revival) is rejected

Recreates the single-service
failure mode. The architecture
impact review explicitly listed
this as decision #2 (the ontology
function should not be a
monolithic validator). The
`@rekon/capability-ontology`
package decomposes the pipeline
into helpers (extraction →
lexical split → effective compile
→ normalize → audit) rather than
a single end-to-end service.

## Recommendation

**Adopt Option C.** Ship this
decision memo. The implementation
v1 slice that follows ships:

1. New `@rekon/capability-ontology`
   package.
2. Built-in baseline vocabulary
   (small, intentionally
   conservative).
3. Optional
   `.rekon/capability-ontology.json`
   config source.
4. Internal helpers
   (`CapabilityCandidateSet`,
   `CapabilityLexicalSplit`,
   `EffectiveCapabilityOntology`).
5. `CapabilityNormalizationReport`
   artifact registration +
   validator + writer.
6. No `CapabilityMap` mutation.
7. No CLI command change. (A
   focused `rekon ontology` CLI
   surface may land in v1 if it
   adds operator value; the
   implementation slice decides.)
8. No LLM normalization.

## CapabilityOntology Config Model

The config shape sketched here is
**not** implemented in this memo.
The implementation v1 slice
finalises it and adds the
validator. Sketch:

```ts
type CapabilityOntologyConfig = {
  version: string;

  verbs: {
    canonical: string[];
    aliases?: Record<string, string>;
    categories?: Record<string, string[]>;
    includeSystemVerbs?: boolean;
  };

  nouns: {
    canonical: string[];
    aliases?: Record<string, string>;
    categories?: Record<string, string[]>;
    thresholds?: {
      autoMap?: number;
    };
    includeSystemNouns?: boolean;
  };

  roles?: {
    canonical: string[];
    aliases?: Record<string, string>;
  };

  patterns?: {
    canonical: string[];
    aliases?: Record<string, string>;
  };

  layers?: {
    canonical: string[];
    aliases?: Record<string, string>;
  };
};
```

**Config source for v1:**
`.rekon/capability-ontology.json`
(optional). Rationale:

- Rekon config already lives under
  `.rekon/`.
- JSON is deterministic to
  validate.
- Avoids adding YAML parser
  surface.
- Workspace-specific overrides
  remain explicit.

YAML / TS-config sources may be
added later if operator feedback
asks for them; v1 picks the
narrowest surface.

## EffectiveCapabilityOntology Model

Sketch:

```ts
type EffectiveCapabilityOntology = {
  version: string;
  source: {
    builtinVersion: string;
    configPath?: string;
    configHash?: string;
    systemSeedCount: number;
  };
  verbs: {
    canonical: string[];
    aliasToCanonical: Record<string, string>;
    categoryByCanonical: Record<string, string>;
  };
  nouns: {
    canonical: string[];
    aliasToCanonical: Record<string, string>;
    categoryByCanonical: Record<string, string>;
    autoMapThreshold: number;
  };
  roles: {
    canonical: string[];
    aliasToCanonical: Record<string, string>;
  };
  patterns: {
    canonical: string[];
    aliasToCanonical: Record<string, string>;
  };
};
```

**Rule:** `EffectiveCapabilityOntology`
may be referenced by digest /
source in
`CapabilityNormalizationReport`, but
it is **not** registered as an
artifact in v1. The compiled
model is deterministic from the
inputs, so the digest plus the
config-hash + system-seed-count is
enough to reproduce it.

## CapabilityNormalizationReport Model

Sketch (the implementation v1
slice finalises + adds the
validator):

```ts
type CapabilityNormalizationReport = {
  header: ArtifactHeader;

  ontology: {
    source: "builtin" | "config" | "builtin+config";
    configPath?: string;
    configHash?: string;
    effectiveHash: string;
  };

  summary: {
    totalCandidates: number;
    normalized: number;
    unknownVerb: number;
    unknownNoun: number;
    unknown: number;
    ignored: number;
    aliasApplied: number;
    lowConfidence: number;
  };

  candidates: Array<{
    id: string;
    source: {
      artifactRef: ArtifactRef;
      factId?: string;
      path?: string;
      symbol?: string;
      exportName?: string;
      kind:
        | "symbol"
        | "export"
        | "capability_hint"
        | "ownership_hint"
        | "system_seed";
    };
    raw: {
      name: string;
      verb?: string;
      noun?: string;
      splitConfidence: "high" | "medium" | "low";
    };
    normalized?: {
      verb: string;
      noun: string;
      verbAliasApplied?: string;
      nounAliasApplied?: string;
      verbCategory?: string;
      nounCategory?: string;
    };
    confidence: "high" | "medium" | "low";
    status:
      | "normalized"
      | "unknown-verb"
      | "unknown-noun"
      | "unknown"
      | "ignored"
      | "low-confidence";
    message?: string;
  }>;
};
```

**Hard rules for the v1 artifact:**

- Does NOT mutate `EvidenceGraph`.
- Does NOT mutate `CapabilityMap` in
  v1.
- Unknown terms are first-class
  report entries.
- Alias applications are recorded.
- Low-confidence splits are
  recorded but not projected
  downstream.
- LLM suggestions, if any, are
  advisory metadata in `message`
  only — **never** the source of
  `normalized.verb` /
  `normalized.noun` in v1.

## Owning Package

**Selected: `@rekon/capability-ontology` (new).**

The translation layer is
cross-cutting enough that placing
it in `@rekon/capability-model`
risks turning model projection
into purpose normalization too
early. A dedicated package can
consume `EvidenceGraph` and emit
`CapabilityNormalizationReport`
while leaving `CapabilityMap`
integration to v2.

**Alternative considered:**
`@rekon/capability-model`. Only
chosen if dependency boundaries
make a new package
unnecessarily heavy. The
implementation v1 slice
re-confirms this decision before
landing.

## V1 Inputs And Outputs

### v1 consumes

- Latest `EvidenceGraph` (read-only).
- Optional
  `.rekon/capability-ontology.json`
  (operator-editable config).
- Built-in default ontology
  vocabulary.

### v1 emits

- One `CapabilityNormalizationReport`
  artifact per run.

### v1 does NOT emit

- `CapabilityMap` changes.
- `RefactorPreservationContract`.
- `FindingFilterReport` changes.
- `ReconciliationPlan` changes.
- Any `EvidenceGraph` mutation.

### v1 does NOT add

- A new CLI command (unless the
  implementation slice can show
  operator value; default is
  no-CLI-this-slice).
- A new role.
- A new permission.
- LLM-based normalization.

## Unknown Term Workflow

### Unknown term table

| Unknown Type | V1 Behavior |
| --- | --- |
| unknown verb | report entry, operator review |
| unknown noun | report entry, operator review |
| alias candidate | deterministic report suggestion only |
| low confidence split | report entry, no downstream projection |

### Flow

1. The lexical splitter produces
   a raw verb + raw noun with
   confidence.
2. The normalization step looks
   up the raw verb in the
   effective vocabulary
   (canonical + aliases).
3. **Hit:** normalized verb +
   alias applied (if any) +
   verb category recorded.
4. **Miss:** record as
   `unknown-verb` status with
   the raw verb in the report.
   Operator review then either
   adds the verb to canonical
   vocabulary or extends the
   aliases map in
   `.rekon/capability-ontology.json`.
5. Same flow for nouns.
6. Low-confidence splits are
   recorded with
   `splitConfidence: "low"` and
   `status: "low-confidence"`.
   They are not projected to
   `CapabilityMap` even when v2
   ships.

LLM-only normalization is never
the source of canonical
verb / noun mappings in v1.

## CapabilityMap Integration

**Deferred to v2.** v1 proves the
audit shape against real
`EvidenceGraph` data on at least
one repo before any consumer
relies on it.

v2 scope (sketched here, not
committed):

- Additive `normalizedCapabilities`
  field on `CapabilityMap`.
- Reads
  `CapabilityNormalizationReport`
  via `inputRefs`.
- Raw symbol-derived capabilities
  preserved alongside normalized
  claims.
- Operator can flip per-claim
  status (`accepted` / `rejected`)
  in a future ledger artifact.

This decision memo **does not
commit any of v2's scope**.

## RefactorPreservationContract Connection

`RefactorPreservationContract` is
the phase-5 target from the
architecture impact review. It
turns normalized capabilities
into preservation obligations
across refactors. It cannot
exist before:

- normalization confidence is
  operator-visible across
  multiple runs,
- `CapabilityMap` consumes
  normalized claims (v2),
- a verification-gate design
  exists for preservation
  contracts.

This memo reserves the name and
defers its design to a much
later slice.

## What This Does Not Do

This batch:

- Does NOT implement
  `@rekon/capability-ontology`.
- Does NOT register
  `CapabilityNormalizationReport`
  as an artifact type.
- Does NOT register
  `RefactorPreservationContract`.
- Does NOT change `EvidenceGraph`
  shape, validators, or writers.
- Does NOT change `CapabilityMap`
  shape, validators, or writers.
- Does NOT change
  `FindingFilterReport` or any
  filter provider.
- Does NOT add a new CLI command.
- Does NOT port the classic
  `GraphOntologyValidator`
  wholesale.
- Does NOT add LLM-only
  normalization anywhere.
- Does NOT add source writes.
- Does NOT publish to npm, bump
  versions, create a git tag, or
  create a GitHub Release.
- Does NOT install workflow YAML.
- Does NOT create a branch.

The shipped artefacts of this
slice are: this memo, a docs
test, a review packet, and
supporting-doc cross-references.

## Implementation Sequence

| Step | Slice | Status |
| --- | --- | --- |
| 1 | [Capability ontology architecture impact review](capability-ontology-architecture-impact-review.md) | ✅ Shipped |
| 2 | **Capability ontology translation layer decision (this memo)** | ✅ Shipped |
| 3 | `CapabilityNormalizationReport` v1 — register artifact + implement first-pass normalization | Next slice (recommended) |
| 4 | Built-in baseline ontology coverage review | After step 3, gated on operator feedback |
| 5 | `CapabilityMap` normalized-claims integration | v2; gated on step 3 + step 4 |
| 6 | Built-in ontology expansion (verbs / nouns / roles / patterns / layers) | Iterative with step 3 + step 4 |
| 7 | Unknown-term operator-review CLI / surface | After step 3, gated on operator feedback |
| 8 | `RefactorPreservationContract` decision memo | Phase 5; far future |
| 9 | `RefactorPreservationContract` registration + verification preservation gates | Phase 5; far future |

Steps 3–7 are the implementation
work for this layer. Each ships
behind a docs test that asserts
the layered model is preserved.

## Cross-References

- [Capability Ontology Architecture Impact Review](capability-ontology-architecture-impact-review.md)
- [Graph Ontology Validator Lite Audit](graph-ontology-validator-lite-audit.md)
- [Graph-Aware Finding Filters concept](../concepts/graph-aware-finding-filters.md)
- [EvidenceGraph artifact reference](../artifacts/evidence-graph.md)
- [Reconciliation preview concept doc](../concepts/reconciliation-preview.md)
- [Roadmap](roadmap.md)
- [Classic-behaviour roadmap](classic-behavior-roadmap.md)

## Status

Recorded on 2026-05-25 against
Rekon commit `7226f31`. No
version bump. No npm publish.
No git tag. No GitHub Release.
No runtime behaviour change.
No new artifact type
registered. No new validator.
No new writer. No new
permission. No new role. No
new capability package. Schema
unchanged. Rollback is
trivial: revert this memo and
the supporting doc
cross-links.
