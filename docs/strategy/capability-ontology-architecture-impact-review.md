# Capability Ontology Architecture Impact Review

**Status:** architecture review recorded.
**Slice:** `capability-ontology-architecture-impact-review`.
**Audience:** Rekon maintainers + capability
authors deciding the shape of a future
capability-ontology / translation layer.

## Decision Summary

**The ontology system is a translation
layer:** repo-specific language →
canonical capability language → purpose
understanding → drift prevention →
safer remediation / refactor planning.
It is **not** merely a false-positive
filter. Mapping its impact across every
Rekon surface is the prerequisite for
choosing where the layer lives.

**This review records eight architectural
decisions** that must hold for any future
implementation slice:

1. **Rekon still needs the ontology
   function.** Classic
   `codebase-intel`'s taxonomy /
   discovery / runtime-validation
   pipeline solved a real product
   problem (purpose understanding +
   drift prevention) that Rekon has
   not yet replaced.
2. **The ontology function should not
   be a monolithic validator.** The
   classic
   `infra/validation/GraphOntologyValidator.ts`
   bundled extraction + discovery +
   hierarchy + runtime alias
   application into a single service.
   Porting that wholesale would
   recreate exactly the "second truth
   layer" failure mode Rekon needs to
   avoid.
3. **Raw evidence must remain separate
   from normalized purpose.**
   `EvidenceGraph` artifacts must
   continue to carry **raw** observed
   facts (symbols, exports, imports,
   path / system context). Normalized
   purpose lives in derived artifacts,
   never by mutating the evidence
   graph.
4. **Normalization decisions need an
   audit artifact.** Every applied
   alias, every accepted unknown,
   every confidence score must be
   inspectable. A
   `CapabilityNormalizationReport`-shaped
   artifact (name reserved by this
   review, registration deferred) is
   the right home.
5. **`CapabilityMap` should eventually
   consume normalized capability
   claims.** Today's `CapabilityMap`
   carries raw symbol-derived
   capabilities; once normalized
   claims are audit-trail-backed,
   `CapabilityMap` should read them
   as inputs (additive only — no raw
   capability data is dropped).
6. **`RefactorPreservationContract`
   depends on normalized capability
   language.** Comparing repo purpose
   across versions / over time
   requires a stable vocabulary.
   Preservation contracts are a
   future slice gated on translation
   confidence.
7. **LLM-only normalization is not
   acceptable as truth.** Aliases,
   verb / noun mappings, and
   capability claims must be backed
   by deterministic rules + operator
   review. LLM assistance may surface
   *candidates* but never replace
   audit-backed normalization.
8. **Unknown verbs / nouns must
   surface to operators.** When the
   classifier encounters terms not
   in the canonical vocabulary, it
   must emit them as **review
   candidates** rather than silently
   accept or drop them. Operator
   confirmation is the only path to
   adding new canonical terms.

The recommended next slice is the
**Capability Ontology Translation
Layer Decision** memo — only after
this review pins the architecture
boundary should that memo decide
"config vs artifact vs both" for
`CapabilityOntology` itself.

## Why This Review Exists

The
[Plan-Generator Diff Data Discovery](plan-generator-diff-data-discovery.md)
+ the
[Reconciliation Exact-Diff Operation v1](reconciliation-exact-diff-operation-v1.md)
slices closed the reconciliation
discovery loop for now. The next
material product capability question
is: **how does Rekon understand what
a repo is trying to accomplish?**
Classic `codebase-intel` answered
this with a taxonomy / runtime-
validation pipeline; Rekon
intentionally has not ported it.

Without that translation layer:

- `CapabilityMap` carries raw
  symbol-derived capabilities that
  vary repo by repo (`createSession`
  vs `signUp` vs `authenticateUser`
  all mean the same thing in three
  different vocabularies).
- `FindingFilterReport` can be
  enriched per-finding but has no
  way to filter by **canonical
  purpose**.
- `IssueAdjudicationReport` groups
  findings by raw symbol matches but
  not by capability purpose.
- `CoherencyDelta` cannot surface
  *purpose drift* between
  intended-capabilities and
  observed-capabilities.
- `Memory` accumulates raw symbol
  noise rather than stable purpose
  facts.
- Future `RefactorPreservationContract`
  work cannot exist at all without
  a stable purpose vocabulary.

The risk of *not* reviewing the
architecture first is wedging
ontology into the wrong layer. Bad
outcomes:

- ontology becomes a second "truth"
  layer that competes with the
  existing artifact chain,
- ontology silently mutates raw
  evidence,
- ontology is treated as a fancy
  filter and never reaches its
  classic-equivalent product value,
- LLM-only labelling sneaks in as
  truth.

This review maps every Rekon surface
the layer touches, defines the
boundary between raw evidence and
normalized purpose, and pins the
non-goals.

## Classic Ontology Intent

The classic `codebase-intel`
taxonomy system was an explicit
translation pipeline. Its public
types (`lib/taxonomy/types.ts`)
showed the model:

- `ExtractedName` — raw token
  pulled from a function, class,
  method, interface, type,
  variable, or export.
- `SplitName` — verb / noun
  candidates derived from a
  source name (e.g., `createUser`
  → verb `create`, noun `user`).
- `TaxonomyOutput` — aggregated
  verb / noun frequency + seed
  terms from system ownership
  declarations
  (`ownership.owns` /
  `ownership.doesNotOwn`).
- `TaxonomyValidationFormat` —
  runtime validation surface for
  normalizing capability claims.
- `ValidationResult.synonymsApplied`
  — explicit audit trail of which
  aliases fired.

The pipeline was a four-stage
process:

1. **Extraction** (`lib/taxonomy/extraction.ts`)
   — pull names from symbol facts.
2. **Splitting** — break each
   name into verb / noun pieces.
3. **Discovery** (`lib/taxonomy/discovery.ts`)
   — aggregate term frequencies,
   seed canonical verbs / nouns
   from ownership declarations.
4. **Runtime validation**
   (`lib/taxonomy/runtime.ts`) —
   normalize capability claims
   through canonical vocabularies
   (`lib/verb-rules.ts`,
   `lib/noun-rules.ts`,
   `infra/repositories/VerbVocabularyRepository.ts`,
   `infra/repositories/TaxonomyRepository.ts`),
   apply aliases, correct terms,
   surface unknowns / warnings.

The intent was *not* "filter
findings". It was:

> repo-specific language → canonical
> capability language → purpose
> understanding → drift prevention
> → safer remediation / refactor
> planning.

That intent is what Rekon needs to
preserve, in a shape that respects
its existing artifact-backed
architecture.

The historical
[Graph Ontology Validator Lite Audit](graph-ontology-validator-lite-audit.md)
already records that the classic
`GraphOntologyValidator` monolith
is **not** the right port shape.
This review carries that conclusion
forward and pushes it further:
ontology must be decomposed into
inputs + audit-backed derived
artifacts + consumers.

## Current Rekon Architecture

Today Rekon's purpose-relevant
surface is:

| Surface | Role |
| --- | --- |
| `EvidenceGraph` | raw structural facts (files, imports, exports, symbols, hints) |
| `ObservedRepo` | repo / file / system projection |
| `OwnershipMap` | system / path ownership |
| `CapabilityMap` | capability projection derived from raw symbol facts |
| `FindingReport` | raw detection output |
| `FindingFilterReport` | auditable false-positive projection |
| `IssueAdjudicationReport` | issue grouping / governance |
| `CoherencyDelta` | remediation / governance roll-up |
| `ReconciliationPlan` | remediation planning |
| `ReconciliationPreview` (v1) | read-only preview surface |
| `VerificationRun` / `VerificationResult` | proof |
| Memory | durable operator / context knowledge |
| Architecture summary publication | operator / agent surface |
| Agent contract publication | operating guidance |
| GitHub Check / PR comment | downstream review surfaces |

No surface currently performs
verb / noun extraction. No surface
applies aliases. No surface
surfaces unknown terms. There is
no canonical vocabulary; there is
no normalization audit trail.

The
[Graph-Aware Finding Filters](../concepts/graph-aware-finding-filters.md)
concept ships filter providers
that consult `EvidenceGraph` for
structural facts (e.g.,
import-evidence, factory-module
gate, generated-output gate),
but it does **not** perform
capability-language translation.
It is structural, not semantic.

## Architecture Impact Map

### Surface-by-surface impact

| Area | Existing Role | Ontology Impact |
| --- | --- | --- |
| `EvidenceGraph` | raw structural facts: files, imports, exports, symbols, hints | source input for extracted names + candidate capability terms; **never mutated** by ontology |
| `ObservedRepo` | repo / file / system projection | source of path / system context for capability scoping |
| `OwnershipMap` | system / path ownership | helps bind canonical capability claims to owners (seed for canonical capability terms) |
| `CapabilityMap` | capability projection | **should consume** normalized verb / noun claims once available; raw symbol claims preserved |
| `FindingReport` | raw detection output | **must not be mutated**; downstream filter / governance surfaces may enrich with capability context |
| `FindingFilterReport` | false-positive audit | may later filter by canonical capability (additive, opt-in policy provider) |
| `IssueAdjudicationReport` | issue grouping / governance | can group by canonical capability purpose; raw grouping preserved |
| `CoherencyDelta` | remediation roll-up | can surface purpose drift + missing capability contracts as remediation steps |
| `ReconciliationPlan` | remediation planning | future preservation-contract operations depend on canonical vocabulary |
| `ReconciliationPreview` (v1) | read-only preview surface | unchanged in this batch; benefits indirectly when plans carry preservation context |
| `VerificationRun` / `VerificationResult` | proof | future preservation gates require canonical capability comparison |
| Memory | durable operator / context knowledge | should store normalized purpose facts, **not** raw symbol noise |
| Architecture summary publication | operator / agent surface | should surface canonical purpose map + flagged unknown terms |
| Agent contract publication | operating guidance | should explain canonical capability vocabulary + the unknown-term review surface |
| GitHub review surfaces | downstream summaries | should cite canonical artifacts only; never invent purpose claims |
| Future `RefactorPreservationContract` | preservation obligations | only possible once canonical capability language exists |

### Architecture impact table (canonical)

| Area | Existing Role | Ontology Impact |
| --- | --- | --- |
| EvidenceGraph | raw facts | source of symbols / exports / imports |
| CapabilityMap | capability projection | should consume normalized claims |
| FindingFilterReport | false-positive audit | may later use normalized purpose |
| CoherencyDelta | remediation roll-up | can group by normalized capability |
| ReconciliationPlan | remediation plan | future preservation planning input |
| Memory | durable context | should store normalized purpose facts |
| Agent contract | operating guidance | should surface unknown purpose terms |

## Translation Layer Boundary

### Boundary table (canonical)

| Layer | Responsibility |
| --- | --- |
| `EvidenceGraph` | raw observed facts |
| `CapabilityOntology` | canonical vocabulary / aliases |
| `CapabilityNormalizationReport` | translation audit |
| `CapabilityMap` | normalized capability projection |
| `RefactorPreservationContract` | preservation obligations |

### What each layer must NOT do

- `EvidenceGraph` must NOT carry
  normalization results. Symbols
  remain raw.
- `CapabilityOntology` (config or
  artifact, decision deferred) must
  NOT validate findings directly.
  Validators consume canonical
  vocabulary; they do not
  *interpret* findings via
  ontology by themselves.
- `CapabilityNormalizationReport`
  must NOT silently drop unknown
  terms. Every unknown verb / noun
  must surface as a review
  candidate.
- `CapabilityMap` must NOT
  discard raw symbol-derived
  capabilities when normalized
  claims appear; both must coexist
  until preservation contracts
  prove the normalized projection
  is stable enough to be canonical.
- `RefactorPreservationContract`
  must NOT exist until translation
  confidence is operator-visible
  and operator-reviewable.

## Raw Evidence Versus Normalized Purpose

The single most important
invariant the future translation
layer must preserve:

**Raw evidence stays raw.
Normalized purpose becomes an
auditable derived artifact.**

What that means concretely:

- `EvidenceGraph` artifacts are
  **immutable from ontology's
  perspective**. The classifier
  reads them; it never writes
  them back. There is no "ontology
  refresh" that mutates evidence.
- `ObservedRepo`, `OwnershipMap`,
  `FindingReport` similarly are
  inputs, not outputs, of the
  translation layer.
- Every normalization decision —
  every applied alias, every
  unknown-term flag, every
  confidence score — must be
  recorded in
  `CapabilityNormalizationReport`
  (or equivalent audit artifact)
  with full lineage refs:
    - source symbol / export /
      capability hint
    - source file path
    - raw verb / raw noun
    - normalized verb /
      normalized noun
    - alias applied (if any)
    - confidence score
    - source artifact refs
      (`EvidenceGraph` entry,
      `ObservedRepo` path, etc.)
    - unknown-term warnings
    - operator-review candidates
- `CapabilityMap` (the existing
  capability projection) may
  *consume* the normalization
  audit but it remains an
  artifact-backed projection.
  Reading normalized claims does
  not make `CapabilityMap` the
  source of truth — the audit
  artifact is.

The litmus test: an operator must
be able to ask "why does Rekon
say my repo has capability X?"
and get an answer with citations
all the way back to the raw
symbol facts. If the answer is
"because some normalizer decided
so", the architecture is wrong.

## Candidate Artifacts

The translation-layer decision
slice (next slice) will decide
artifact registration. This
review reserves the names that
slice will use:

| Name | Role | Reserved by | Registered by |
| --- | --- | --- | --- |
| `CapabilityOntology` | canonical verbs / nouns / aliases / categories | this review (name only; shape may be config or artifact) | translation-layer decision slice |
| `CapabilityNormalizationReport` | per-translation audit trail | this review | translation-layer decision slice (or a follow-up implementation slice) |
| `RefactorPreservationContract` | preservation obligations across refactors | this review | a much later slice, after translation is stable |

The decision slice must answer:

1. Is `CapabilityOntology` config
   (operator-editable file under
   `.rekon/ontology/...`), an
   artifact (durable, lineage-
   tracked), or both?
2. Is `CapabilityNormalizationReport`
   produced by a new capability
   package (e.g.,
   `@rekon/capability-ontology`)
   or by an existing one
   (e.g., extending
   `@rekon/capability-graph`)?
3. What additive surface does
   `CapabilityMap` gain to read
   the normalization audit?

Those are **decisions for the
next slice**. This review does
not pre-commit any of them.

## Consumer Impact Review

The future translation layer
ships with these consumers in
mind, in this order:

### Phase 1 — read-only audit
Only `CapabilityNormalizationReport`
exists. Nothing consumes it yet.
The architecture summary
publication may surface a "purpose
map preview" section based on the
audit, but `CapabilityMap` is
unchanged. Operators can inspect
the translation work before
trusting it.

### Phase 2 — `CapabilityMap` integration
`CapabilityMap` gains an additive
field that carries normalized
capability claims. Raw symbol-
derived capabilities are
preserved. Consumers that want
the normalized view opt into it.

### Phase 3 — finding-filter policy
`FindingFilterReport` gains an
optional policy provider that
can filter by canonical
capability purpose. Existing
filter providers continue to
work; the new provider is
audit-backed and opt-in.

### Phase 4 — governance + reconciliation
`IssueAdjudicationReport` can
group by canonical capability;
`CoherencyDelta` can surface
purpose drift. Still
audit-backed, still opt-in.

### Phase 5 — preservation contracts
`RefactorPreservationContract`
ships once translation confidence
is high. Verification gates
prove preservation across
refactors.

**The review does not commit to
any phase beyond #1.** Phase #1
is the smallest useful step that
proves the layer works.

## Risks

### Risk table (canonical)

| Risk | Guardrail |
| --- | --- |
| hidden semantic guessing | no LLM-only normalization |
| ontology mutates raw evidence | raw evidence immutable |
| monolithic validator returns | artifact-backed consumers only |
| unknown terms hidden | surface unknowns for operator review |
| premature drift claims | translation first, drift later |

### Risk detail

- **Hidden semantic guessing.** If
  the layer accepts LLM-only
  suggestions as canonical, Rekon
  becomes a guesser. Mitigation:
  LLM suggestions surface as
  operator-review candidates only;
  acceptance is an explicit
  operator action.
- **Ontology mutates raw
  evidence.** Tempting (write
  normalized symbol names back to
  `EvidenceGraph`); fatal
  (destroys the artifact chain's
  audit value). Mitigation: raw
  evidence is read-only from
  ontology's perspective; no
  `EvidenceGraph` write happens.
- **Monolithic validator
  returns.** Re-porting the classic
  `GraphOntologyValidator` as a
  single service would recreate
  the "second truth layer"
  failure mode. Mitigation:
  ontology decomposes into
  vocabulary (config/artifact),
  audit (artifact), and
  consumers (existing artifacts
  read the audit). No single
  service owns ontology end-to-
  end.
- **Unknown terms hidden.**
  Auto-accepting unknowns or
  auto-dropping them both kill
  product value. Mitigation:
  unknown verbs / nouns surface
  in the audit artifact + an
  operator-review queue. Adding
  a term to canonical
  vocabulary requires explicit
  operator action.
- **Premature drift claims.**
  Surfacing "purpose drift"
  before translation confidence
  is operator-visible would
  produce noisy false signals.
  Mitigation: drift detection is
  a phase-5 feature; phase-1
  audit must run cleanly across
  multiple operator runs before
  drift comparison ships.

## Recommendation

**Adopt the eight architectural
decisions in *Decision Summary*.**
Schedule the next slice as the
**Capability Ontology Translation
Layer Decision** memo. That memo
will pin:

- Is `CapabilityOntology` config,
  artifact, or both?
- What is the first audit
  artifact shape (likely
  `CapabilityNormalizationReport`)?
- Which capability package owns
  the translation pipeline?
- What is the phase-1 minimal
  product surface (just the audit?
  audit + architecture-summary
  preview section? audit +
  unknown-term review CLI?).
- Are unknown-term review
  candidates a new artifact, a
  field on the audit, or both?

**Do not register any of these
yet.** This review reserves the
names; the decision slice will
register what ships.

## What This Does Not Do

This batch:

- **Does not** implement
  `CapabilityOntology`. No
  vocabulary file, no validator,
  no helper.
- **Does not** register
  `CapabilityNormalizationReport`
  as an artifact. The name is
  reserved.
- **Does not** register
  `RefactorPreservationContract`.
  The name is reserved.
- **Does not** change
  `EvidenceGraph` shape,
  validators, or writers.
- **Does not** change
  `CapabilityMap` shape.
- **Does not** change
  `FindingFilterReport` or any
  filter provider.
- **Does not** add a new
  capability package.
- **Does not** add a new CLI
  command.
- **Does not** port the classic
  `GraphOntologyValidator`
  wholesale; the decision to
  decompose it into
  vocabulary + audit + consumers
  is pinned here.
- **Does not** add LLM-only
  normalization anywhere.
- **Does not** publish to npm,
  bump versions, create a git
  tag, or create a GitHub
  Release.
- **Does not** install workflow
  YAML.
- **Does not** create a branch.

The shipped artefacts of this
slice are: this memo, a docs
test, a review packet, and
supporting-doc cross-references.

## Follow-Up Work

**Recommended next slice:**
*Capability Ontology Translation
Layer Decision.* Inputs:

- this review's eight
  architectural decisions,
- the boundary table's five-layer
  separation,
- the architecture impact table's
  consumer roles,
- the existing
  [Graph Ontology Validator Lite Audit](graph-ontology-validator-lite-audit.md)
  (which already records that the
  classic monolith is the wrong
  port shape).

**Update:** the decision has been
recorded — see
[Capability Ontology Translation
Layer Decision](capability-ontology-translation-layer-decision.md).
**Outcome: Option C — layered
config-first ontology +
artifact-backed normalization
report.** The decision refines
this review's macro five-layer
boundary into an eight-layer
internal model (Layer 0
`EvidenceGraph` → Layer 7
`RefactorPreservationContract`),
selects `@rekon/capability-ontology`
as the owning package (new),
picks `.rekon/capability-ontology.json`
as the v1 config source, and
pins `CapabilityNormalizationReport`
as the **first registered
artifact** of the track.
`CapabilityMap` integration is
deferred to v2. The next slice
is `CapabilityNormalizationReport`
v1.

**Subsequent slices** (in order,
each gated on the prior's
operator-review feedback):

- *CapabilityNormalizationReport
  v1* — phase-1 audit artifact;
  no `CapabilityMap` mutation
  yet.
- *CapabilityMap normalized
  claims integration* — phase-2
  additive field.
- *Finding-filter policy: canonical
  capability filter* — phase-3
  opt-in filter provider.
- *Issue / coherency governance
  + capability purpose grouping*
  — phase-4 surfaces.
- *RefactorPreservationContract
  decision memo* — phase-5,
  only after phases 1–4 are
  operator-stable.

Each subsequent slice ships **no
source-write apply**, **no LLM-
only normalization**, **no
runtime behaviour change to
existing surfaces beyond the
additive consumer described**.

## Cross-References

- [Graph Ontology Validator Lite Audit](graph-ontology-validator-lite-audit.md)
- [Graph-Aware Finding Filters concept](../concepts/graph-aware-finding-filters.md)
- [EvidenceGraph artifact reference](../artifacts/evidence-graph.md)
- [Reconciliation preview concept doc](../concepts/reconciliation-preview.md)
- [Reconciliation exact-diff operation v1](reconciliation-exact-diff-operation-v1.md)
- [Source-Write Reconciliation Policy Decision](source-write-reconciliation-policy-decision.md)
- [Capability Ontology Translation Layer Decision](capability-ontology-translation-layer-decision.md)
- [`CapabilityNormalizationReport` artifact reference](../artifacts/capability-normalization-report.md)
  — the first runtime artifact emitted under this
  architecture (ontology translation layer v1 shipped behind
  `rekon capability ontology normalize`).
- [Capability ontology concept](../concepts/capability-ontology.md)
- [Built-In Baseline Ontology Coverage
  Review](builtin-ontology-coverage-review.md) — first
  coverage review against a real Next.js TypeScript target;
  baseline acceptable for audit-only v1, `CapabilityMap`
  integration remains deferred until the operator review
  surface ships.
- [Roadmap](roadmap.md)
- [Classic-behaviour roadmap](classic-behavior-roadmap.md)

## Status

Recorded on 2026-05-25 against
Rekon commit `af188ef`. No
version bump. No npm publish.
No git tag. No GitHub Release.
No runtime behaviour change.
No new artifact type
registered. No new validator.
No new writer. No new
permission. No new role. No
new capability package.
Schema unchanged. Rollback is
trivial: revert this memo and
the supporting doc cross-links.
