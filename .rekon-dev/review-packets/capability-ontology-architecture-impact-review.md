# Review Packet — Capability Ontology Architecture Impact Review

**Slice:** `capability-ontology-architecture-impact-review`
**Batch type:** Strategy / architecture review
(docs + tests only).
**Sequence position:** First slice on the
capability-ontology track. Comes before any
implementation slice or even the
translation-layer decision memo.
**Outcome:** Eight architectural decisions
pinned + three diagnostic tables canonical +
five-layer boundary established. No runtime
change.
**Strict no-go list:** no `CapabilityOntology`
implementation, no `CapabilityNormalizationReport`
registration, no `RefactorPreservationContract`
registration, no `EvidenceGraph` change, no
`CapabilityMap` change, no `FindingReport` /
`FindingFilterReport` / `IssueAdjudicationReport`
/ `CoherencyDelta` / `ReconciliationPlan` /
`ReconciliationPreview` / `VerificationRun` /
`VerificationResult` / memory / publication
behaviour change, no new capability package,
no new CLI command, no new validator, no new
writer, no new permission, no new role, no
workflow YAML, no GitHub API call, no
`package.json` / `package-lock.json` mutation,
no source-file mutation in any
`packages/*/src/*`, no source-write apply, no
LLM-only normalization, no port of the
classic `GraphOntologyValidator` monolith, no
npm publish, no version bump, no git tag, no
GitHub Release, no new branch, no network I/O,
no mutation of any operator repo.

## CHANGES MADE

1. **New strategy memo
   `docs/strategy/capability-ontology-architecture-impact-review.md`**
   with all 13 required headings (Decision
   Summary, Why This Review Exists, Classic
   Ontology Intent, Current Rekon
   Architecture, Architecture Impact Map,
   Translation Layer Boundary, Raw Evidence
   Versus Normalized Purpose, Candidate
   Artifacts, Consumer Impact Review, Risks,
   Recommendation, What This Does Not Do,
   Follow-Up Work) + Cross-References +
   Status.
2. **Three required diagnostic tables**
   present: Architecture impact (canonical
   columns Area / Existing Role / Ontology
   Impact), Boundary (canonical columns
   Layer / Responsibility, five layers),
   Risk (canonical columns Risk / Guardrail).
3. **Eight architectural decisions** pinned
   verbatim in *Decision Summary*: Rekon
   still needs the ontology function; the
   ontology function should not be a
   monolithic validator; raw evidence must
   remain separate from normalized purpose;
   normalization decisions need an audit
   artifact; `CapabilityMap` should
   eventually consume normalized capability
   claims; `RefactorPreservationContract`
   depends on normalized capability
   language; LLM-only normalization is not
   acceptable as truth; unknown verbs /
   nouns must surface to operators.
4. **New review packet (this file)** with
   PURPOSE PRESERVATION CHECK + all 11
   required sections (CHANGES MADE / PUBLIC
   API CHANGES / PURPOSE PRESERVATION CHECK
   / CODEBASE-INTEL ALIGNMENT / CLASSIC
   ONTOLOGY INTENT / ARCHITECTURE IMPACT /
   BOUNDARY MODEL / RECOMMENDATION / TESTS /
   VERIFICATION / INTENTIONALLY UNTOUCHED /
   RISKS / FOLLOW-UP / NEXT STEP).
5. **New 15-assertion docs test
   `tests/docs/capability-ontology-architecture-impact-review.test.mjs`**
   covering memo existence + headings + all
   verbatim pins + all three diagnostic
   tables + CHANGELOG + review packet.
6. **Supporting doc updates:**
   `docs/strategy/graph-ontology-validator-lite-audit.md`
   gains a forward pointer; the
   `docs/concepts/graph-aware-finding-filters.md`
   concept notes that ontology-derived
   filtering is a future phase-3 consumer;
   `docs/artifacts/evidence-graph.md` is
   reminded that the evidence graph
   remains raw + immutable from ontology's
   perspective;
   `docs/concepts/reconciliation-preview.md`
   gets a forward-link to the future
   `RefactorPreservationContract` track;
   `docs/strategy/roadmap.md` +
   `docs/strategy/classic-behavior-roadmap.md`
   list the slice; `README.md` +
   `CHANGELOG.md` are updated.

## PUBLIC API CHANGES

**None.** This batch is strategy /
architecture / docs / tests only. No new
type added, removed, renamed, narrowed, or
exported. No CLI surface added or modified.
No runtime behaviour change. No schema
change. No new artifact type. No new
permission. No new role. No workflow YAML
installed. No `package.json` mutation in
any workspace.

## PURPOSE PRESERVATION CHECK

Original architectural question: *"Where
does canonical purpose live in Rekon? Who
produces it? Who consumes it? What is raw
evidence vs normalized interpretation?
What remains operator-reviewable? What
becomes canonical? What is allowed to
influence findings / plans / memory?"*

This review answers those questions:

- **Where does canonical purpose live?**
  In a future
  `CapabilityNormalizationReport`-shaped
  audit artifact, produced by a yet-to-be-
  decided capability package, consumed by
  `CapabilityMap` (phase 2) and downstream
  surfaces (phases 3–5).
- **Who produces it?** Not decided in this
  review — the translation-layer decision
  slice (next slice) will name the
  capability package.
- **Who consumes it?** Phase-by-phase:
  `CapabilityMap` first, then
  `FindingFilterReport`, then
  `IssueAdjudicationReport` +
  `CoherencyDelta`, then memory +
  publications, finally
  `RefactorPreservationContract`.
- **What is raw evidence vs normalized
  interpretation?** Raw evidence stays in
  `EvidenceGraph` / `ObservedRepo` /
  `OwnershipMap` / `FindingReport`,
  unchanged. Normalized interpretation
  lives exclusively in the audit
  artifact.
- **What remains operator-reviewable?**
  Everything: applied aliases, accepted
  unknowns, confidence scores, unknown-
  term review queue, every cited source
  artifact.
- **What becomes canonical?** Only what
  the operator explicitly accepts via
  the unknown-term review path. The
  audit artifact records the operator
  decision trail.
- **What is allowed to influence
  findings / plans / memory?** The
  audit artifact only — and only after
  phase-2+ consumers are wired up
  additively, with raw inputs preserved.

The review's eight architectural
decisions encode this exact contract.
Every subsequent slice must honor them
or trigger a re-review.

Source-write policy preserved verbatim:

- *Source-write apply remains
  unavailable.* — pinned in the
  *What This Does Not Do* section.
- *No LLM-only normalization.* —
  pinned in *Decision Summary* and
  *Risks*; asserted by the docs
  test.
- *Raw evidence remains separate
  from normalized purpose.* — pinned;
  asserted.
- *No port of the classic
  GraphOntologyValidator wholesale.*
  — pinned; asserted.

Existing reconciliation track
guarantees (preview v1 +
ReconciliationPreviewReport decision
+ exact-diff operation v1) preserved
unchanged.

## CODEBASE-INTEL ALIGNMENT

This review intentionally re-reads
classic `codebase-intel` to honor what
it solved without porting how it
solved it:

- `lib/taxonomy/types.ts` — the public
  types (`ExtractedName`, `SplitName`,
  `TaxonomyOutput`,
  `TaxonomyValidationFormat`,
  `ValidationResult.synonymsApplied`)
  pin the model boundaries Rekon must
  match: extraction → splitting →
  discovery → runtime validation, with
  an explicit synonyms-applied audit
  trail. The Rekon equivalent is the
  five-layer boundary table.
- `lib/taxonomy/extraction.ts` — the
  source for extracted-name shapes
  (functions, classes, methods,
  interfaces, types, variables,
  exports). Rekon's
  `EvidenceGraph.facts.symbols` /
  `.exports` covers this; the future
  classifier reads them.
- `lib/taxonomy/discovery.ts` — the
  source for term-frequency
  aggregation + seeding from
  `ownership.owns` /
  `ownership.doesNotOwn`. Rekon's
  `OwnershipMap` covers this; the
  future classifier reads it.
- `lib/taxonomy/hierarchy.ts` — the
  source for verb / noun category
  hierarchy. The
  `CapabilityOntology`
  config-or-artifact decision
  (next slice) will pin Rekon's
  equivalent.
- `lib/taxonomy/runtime.ts` /
  `lib/verb-rules.ts` /
  `lib/noun-rules.ts` /
  `infra/repositories/VerbVocabularyRepository.ts`
  / `infra/repositories/TaxonomyRepository.ts`
  — the source for runtime
  validation + alias application.
  Rekon's equivalent is the
  `CapabilityNormalizationReport`
  audit, **not** a single runtime
  service.
- `infra/validation/GraphOntologyValidator.ts`
  — the classic monolith. Pinned
  here as **not** the right port
  shape. The
  [Graph Ontology Validator Lite
  Audit](../../docs/strategy/graph-ontology-validator-lite-audit.md)
  already documents the
  pre-existing decision to defer
  porting it; this review extends
  that to "decompose into
  vocabulary + audit + consumers".

The review honors classic intent
without recreating classic
implementation choices that don't
fit Rekon's artifact-backed
architecture.

## CLASSIC ONTOLOGY INTENT

Classic's intent (translated to
Rekon language): *repo-specific
language → canonical capability
language → purpose understanding
→ drift prevention → safer
remediation / refactor planning*.

That is bigger than graph-aware
filtering. It is the foundation
for purpose comparison across
repos and over time. The review
preserves this intent as the
*target* but does not commit
Rekon to classic's monolithic
implementation.

## ARCHITECTURE IMPACT

The review's
*Architecture Impact Map* section
walks 15 Rekon surfaces and pins
ontology impact per surface. The
canonical seven-row table appears
under *Architecture Impact Map →
Architecture impact table*. Full
surface coverage is in the
preceding 15-row narrative table.

Key takeaways:

- **Read-only inputs:**
  `EvidenceGraph`, `ObservedRepo`,
  `OwnershipMap`, `FindingReport`.
  Ontology never mutates these.
- **Phase-2 consumers:**
  `CapabilityMap` gains an
  additive normalized-claims
  field.
- **Phase-3 consumers:**
  `FindingFilterReport` policy
  providers may filter by
  canonical capability.
- **Phase-4 consumers:**
  `IssueAdjudicationReport` +
  `CoherencyDelta` group by
  canonical capability.
- **Phase-5 consumers:**
  `RefactorPreservationContract`
  + verification preservation
  gates.

## BOUNDARY MODEL

Five layers, each with one
responsibility:

1. `EvidenceGraph` — raw observed
   facts.
2. `CapabilityOntology` —
   canonical vocabulary /
   aliases.
3. `CapabilityNormalizationReport`
   — translation audit.
4. `CapabilityMap` — normalized
   capability projection.
5. `RefactorPreservationContract`
   — preservation obligations.

Each layer is forbidden from
doing the prior layer's job.
No layer crosses the
raw-evidence vs
normalized-purpose boundary.

## RECOMMENDATION

**Adopt the eight architectural
decisions in *Decision
Summary*.** Schedule the next
slice as **Capability Ontology
Translation Layer Decision** —
that memo will decide:

- Is `CapabilityOntology` config,
  artifact, or both?
- What is the first audit
  artifact shape?
- Which capability package owns
  the translation pipeline?
- What is the phase-1 minimal
  product surface?
- Are unknown-term review
  candidates a new artifact, a
  field on the audit, or both?

This review does **not**
pre-commit any of those.
Reserved names
(`CapabilityOntology`,
`CapabilityNormalizationReport`,
`RefactorPreservationContract`)
are documentation
reservations only; no
identifier exists in code
today.

## TESTS / VERIFICATION

- `tests/docs/capability-ontology-architecture-impact-review.test.mjs`
  — 15 assertions covering memo
  existence + all 13 required
  headings + all 9 required
  verbatim pins + all 3
  diagnostic tables + CHANGELOG +
  review packet.
- **Full 9-command verification
  gate** runs on `af188ef`
  before edits + again after
  edits.
- **No new contract test
  required** — no new helper,
  CLI, validator, or publisher
  in this batch.
- **No CLI smoke required** —
  strategy / architecture only.

## INTENTIONALLY UNTOUCHED

- `packages/*/src/*` — no
  source change anywhere.
- `packages/cli/src/*` — no
  new command, no new flag.
- `packages/kernel-*/src/*` —
  no schema change, no
  validator change.
- `packages/capability-*/src/*`
  — no behaviour change.
- The artifact registry, schema
  set, and permission model —
  unchanged.
- `EvidenceGraph` shape,
  validators, writer —
  unchanged.
- `CapabilityMap` shape,
  validators, writer —
  unchanged.
- `FindingFilterReport` /
  `FindingReport` /
  `IssueAdjudicationReport` /
  `CoherencyDelta` /
  `ReconciliationPlan` /
  `ReconciliationPreview` /
  `VerificationRun` /
  `VerificationResult` /
  memory / publications —
  unchanged.
- `.github/workflows/*.yml` —
  no active workflow
  installed.
- Any `package.json`,
  `package-lock.json`, or
  `tsconfig.json` — no
  dependency change, no
  version bump.
- The classic
  `GraphOntologyValidator`
  monolith — explicitly NOT
  ported wholesale; the
  decision to decompose it is
  pinned by this review.

## RISKS / FOLLOW-UP

**Risks (all addressed by the
review's eight decisions +
risk table):**

- *Re-creating the second
  truth layer.* Mitigated by
  decision #2 + the
  decomposition into
  vocabulary + audit +
  consumers.
- *Raw evidence mutation.*
  Mitigated by decision #3
  (raw evidence immutable).
- *Hidden semantic
  guessing.* Mitigated by
  decision #7 (no LLM-only
  normalization).
- *Unknown-term silence.*
  Mitigated by decision #8
  (unknowns surface as
  operator-review
  candidates).
- *Premature drift claims.*
  Mitigated by the
  phase-by-phase consumer
  plan; drift is a phase-5
  feature.

**Follow-up:**

- *Capability Ontology
  Translation Layer
  Decision* — the next
  slice. Inputs: this
  review's eight decisions
  + the five-layer
  boundary + the
  architecture impact map.

## NEXT STEP

**Capability Ontology
Translation Layer Decision
memo.** That memo will pin
`CapabilityOntology` shape
(config vs artifact vs
both), the first audit
artifact's shape, the
owning capability
package, the phase-1
minimal product surface,
and the unknown-term
review path. Until that
memo lands, no
implementation slice is
queued.
