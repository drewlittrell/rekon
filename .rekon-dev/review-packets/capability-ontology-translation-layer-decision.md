# Review Packet — Capability Ontology Translation Layer Decision

**Slice:** `capability-ontology-translation-layer-decision`
**Batch type:** Strategy / decision (docs +
tests only).
**Sequence position:** Second slice on the
capability-ontology track. Follows the
[Capability Ontology Architecture Impact Review](../../docs/strategy/capability-ontology-architecture-impact-review.md).
**Outcome:** Option C — layered config-first
ontology + artifact-backed normalization
report.
**Strict no-go list:** no
`@rekon/capability-ontology` package
implementation, no
`CapabilityNormalizationReport` artifact
registration, no `RefactorPreservationContract`
registration, no `EvidenceGraph` change, no
`CapabilityMap` change, no `FindingReport` /
`FindingFilterReport` /
`IssueAdjudicationReport` / `CoherencyDelta`
/ `ReconciliationPlan` /
`ReconciliationPreview` / `VerificationRun`
/ `VerificationResult` / memory /
publication behaviour change, no new
capability package shipped (the package
name is selected here but not created), no
new CLI command, no new validator, no new
writer, no new permission, no new role, no
workflow YAML, no GitHub API call, no
`package.json` / `package-lock.json`
mutation, no source-file mutation in any
`packages/*/src/*`, no source-write apply,
no LLM-only normalization, no port of the
classic `GraphOntologyValidator` monolith,
no npm publish, no version bump, no git
tag, no GitHub Release, no new branch, no
network I/O.

## CHANGES MADE

1. **New strategy memo
   `docs/strategy/capability-ontology-translation-layer-decision.md`**
   with all 18 required headings (Decision
   Summary, Why This Decision Exists,
   Architecture Boundary From Prior
   Review, Classic Layered Ontology
   Structure, Rekon Layered Ontology
   Model, Options Considered,
   Recommendation, CapabilityOntology
   Config Model, EffectiveCapabilityOntology
   Model, CapabilityNormalizationReport
   Model, Owning Package, V1 Inputs And
   Outputs, Unknown Term Workflow,
   CapabilityMap Integration,
   RefactorPreservationContract
   Connection, What This Does Not Do,
   Implementation Sequence) +
   Cross-References + Status.
2. **Three required diagnostic tables**
   present with canonical columns:
   Option (Option / Decision / Reason),
   Layer (Layer / Responsibility / V1
   Status), Unknown Term (Unknown Type /
   V1 Behavior).
3. **Layered ontology model preserved**:
   Layer 0 `EvidenceGraph` → Layer 1
   `CapabilityCandidateSet` → Layer 2
   `CapabilityLexicalSplit` → Layer 3
   `CapabilityOntology` → Layer 4
   `EffectiveCapabilityOntology` →
   Layer 5 `CapabilityNormalizationReport`
   → Layer 6 `CapabilityMap` → Layer 7
   `RefactorPreservationContract`.
4. **Required verbatim pins** present in
   *Decision Summary* and section bodies:
   - "Layered config-first ontology +
     artifact-backed normalization
     report" (option-selected phrasing).
   - "CapabilityOntology starts as
     config / source vocabulary."
   - "EffectiveCapabilityOntology is
     internal in v1."
   - "CapabilityNormalizationReport is
     the first registered artifact."
   - "CapabilityMap integration is
     deferred to v2."
   - "EvidenceGraph raw facts are
     unchanged."
   - "Unknown verbs / nouns must surface
     to operators."
   - "LLM suggestions are not truth in
     v1."
   - "Do not flatten the ontology into a
     single config / report layer."
5. **Owning package selected:**
   `@rekon/capability-ontology` (new
   package; not created in this slice).
6. **Config source for v1 selected:**
   `.rekon/capability-ontology.json`.
7. **CapabilityOntologyConfig,
   EffectiveCapabilityOntology,
   CapabilityNormalizationReport
   sketched** (TypeScript-shaped types
   in fenced code blocks; not
   implemented).
8. **New review packet (this file)** with
   PURPOSE PRESERVATION CHECK + all 13
   required sections (CHANGES MADE /
   PUBLIC API CHANGES / PURPOSE
   PRESERVATION CHECK / CODEBASE-INTEL
   ALIGNMENT / OPTIONS CONSIDERED /
   RECOMMENDATION / LAYERED ONTOLOGY
   MODEL / BOUNDARY MODEL / V1
   IMPLEMENTATION SHAPE / TESTS /
   VERIFICATION / INTENTIONALLY
   UNTOUCHED / RISKS / FOLLOW-UP / NEXT
   STEP).
9. **New 16-assertion docs test
   `tests/docs/capability-ontology-translation-layer-decision.test.mjs`**
   covering memo existence + headings +
   all verbatim pins + all three
   diagnostic tables + CHANGELOG +
   review packet.
10. **Supporting doc updates:**
    `docs/strategy/capability-ontology-architecture-impact-review.md`
    (Follow-Up section pointed at this
    decision),
    `docs/strategy/graph-ontology-validator-lite-audit.md`
    (forward pointer extended),
    `docs/concepts/graph-aware-finding-filters.md`
    (cross-link to layered model),
    `docs/artifacts/evidence-graph.md`
    (boundary pin extended),
    `docs/concepts/reconciliation-preview.md`
    (phase-5 forward link updated),
    `docs/strategy/roadmap.md`,
    `docs/strategy/classic-behavior-roadmap.md`,
    `README.md`, `CHANGELOG.md`.

## PUBLIC API CHANGES

**None.** This batch is strategy / decision
/ docs / tests only. No new type added,
removed, renamed, narrowed, or exported.
No CLI surface added or modified. No
runtime behaviour change. No schema
change. No new artifact type. No new
permission. No new role. No workflow YAML
installed. No `package.json` mutation in
any workspace. No new capability package
created.

## PURPOSE PRESERVATION CHECK

Original architectural question (per the
work order): *"Decide the concrete shape
of Rekon's capability ontology translation
layer inside the architecture boundary
pinned by the architecture impact review.
This decision must preserve the layered
ontology architecture from classic
codebase-intel: extraction, lexical
split, baseline vocabulary, repo-local
overrides, effective ontology,
normalization audit, normalized
capability projection, and future
preservation contracts."*

This memo preserves the classic layered
intent and answers each required decision
question:

| # | Question | Answer |
| --- | --- | --- |
| 1 | Internal layers of the translation system | Eight layers (Layer 0–7) refining the macro five-layer boundary |
| 2 | `CapabilityOntology` config / artifact / both | **Config** in v1 (`starts as config / source vocabulary`) |
| 3 | Baseline vocabulary location | Built-in in the package; optional override at `.rekon/capability-ontology.json` |
| 4 | Repo-local aliases / overrides | `.rekon/capability-ontology.json` operator-editable |
| 5 | System-derived seed terms | Compiled into `EffectiveCapabilityOntology` from `EvidenceGraph.facts.ownership_hints` + `ObservedRepo` / `OwnershipMap` |
| 6 | `EffectiveCapabilityOntology` layer | Yes — Layer 4, internal, deterministic compile, cited by digest |
| 7 | `CapabilityNormalizationReport` records | Per-candidate translation decisions, alias applications, unknown terms, low-confidence splits, ontology source / digest |
| 8 | Owning package | `@rekon/capability-ontology` (new) |
| 9 | V1 inputs | Latest `EvidenceGraph`, optional config, built-in baseline |
| 10 | Unknown verbs / nouns surfacing | First-class report entries with `status: "unknown-verb"` / `"unknown-noun"` / `"unknown"` |
| 11 | `CapabilityMap` v1 vs later | **Deferred to v2** |
| 12 | Support for `RefactorPreservationContract` | Layer 7, far future; phase-5 from the architecture impact review |
| 13 | V1 implementation scope | New package + `CapabilityNormalizationReport` artifact + internal helpers; no `CapabilityMap` mutation, no CLI by default |
| 14 | What stays deferred | `CapabilityMap` integration, `RefactorPreservationContract`, LLM-assisted normalization, unknown-term operator-review CLI |

The eight architectural decisions from the
prior review are honored:

1. Rekon still needs the ontology
   function. **Preserved.**
2. The ontology function should not be a
   monolithic validator. **Preserved**
   (decomposed into helpers in
   `@rekon/capability-ontology`).
3. Raw evidence must remain separate
   from normalized purpose. **Preserved**
   (`EvidenceGraph` read-only).
4. Normalization decisions need an
   audit artifact. **Preserved**
   (`CapabilityNormalizationReport`).
5. `CapabilityMap` should eventually
   consume normalized capability claims.
   **Preserved** (deferred to v2).
6. `RefactorPreservationContract`
   depends on normalized capability
   language. **Preserved** (Layer 7).
7. LLM-only normalization is not
   acceptable as truth. **Preserved**
   (v1 forbids it; future advisory
   metadata only).
8. Unknown verbs / nouns must surface to
   operators. **Preserved** (first-class
   report entries).

Source-write policy preserved verbatim:

- *Source-write apply remains
  unavailable.* The ontology track
  ships no apply path.
- *No LLM-only normalization.* — pinned.

Reconciliation track guarantees
unchanged. Beta posture unchanged.

## CODEBASE-INTEL ALIGNMENT

The memo's *Classic Layered Ontology
Structure* section honours the original
intent without porting the
implementation:

- `lib/taxonomy/types.ts` →
  Rekon's helper shapes
  (`CapabilityCandidateSet`,
  `CapabilityLexicalSplit`) +
  `CapabilityNormalizationReport`
  fields (`raw`, `normalized`,
  `aliasApplied`).
- `lib/taxonomy/extraction.ts` →
  Layer 1 candidate extraction from
  `EvidenceGraph` symbols / exports /
  capability hints / ownership
  hints.
- `lib/taxonomy/discovery.ts` →
  system-seed compilation step
  inside Layer 4.
- `lib/taxonomy/hierarchy.ts` →
  `CapabilityOntology.verbs.categories`
  / `nouns.categories`.
- `lib/taxonomy/runtime.ts` /
  `lib/verb-rules.ts` /
  `lib/noun-rules.ts` →
  per-candidate normalization
  pass inside the package.
- `schemas/verb-rules.schema.ts` /
  `schemas/noun-rules.schema.ts` /
  `schemas/taxonomy.schema.ts` →
  `CapabilityOntologyConfig` shape.
- `infra/repositories/VerbVocabularyRepository.ts`
  / `infra/repositories/TaxonomyRepository.ts`
  → `.rekon/capability-ontology.json`
  config-backed vocabulary.
- `infra/validation/GraphOntologyValidator.ts`
  → explicitly **NOT** ported
  wholesale. The decomposition into
  helpers + audit artifact replaces
  it.
- `domain/ontology/mergeOntology.ts`
  → the deterministic
  `EffectiveCapabilityOntology`
  compile (builtin + config +
  system seeds).

The Rekon equivalent is a package
that exposes helper functions
operating on the eight-layer model
rather than a single end-to-end
service.

## OPTIONS CONSIDERED

| Option | Decision | Reason |
| --- | --- | --- |
| Flat config-only ontology | rejected | no audit trail; flattens the layered system |
| Artifact-only ontology | rejected | vocabulary/policy must be operator-editable |
| Layered config-first + normalization report | **selected** | preserves layers and provides auditable translation |
| CapabilityMap-only normalization | rejected for v1 | collapses translation and projection too early |
| Monolithic GraphOntologyValidator revival | rejected | violates artifact-first architecture |

Rationale for each option lives in the
*Options Considered* section of the
memo.

## RECOMMENDATION

**Adopt Option C — layered config-first
ontology + artifact-backed normalization
report.** Implementation v1 ships:

- New `@rekon/capability-ontology`
  package.
- Built-in baseline vocabulary
  (small, conservative).
- Optional
  `.rekon/capability-ontology.json`
  config source.
- Internal helpers
  (`CapabilityCandidateSet`,
  `CapabilityLexicalSplit`,
  `EffectiveCapabilityOntology`).
- `CapabilityNormalizationReport`
  artifact registration + validator
  + writer.
- No `CapabilityMap` mutation.
- No CLI command by default (the
  implementation slice may add one
  only if operator value justifies
  it).
- No LLM normalization.

## LAYERED ONTOLOGY MODEL

The memo defines eight layers:

| Layer | Responsibility | V1 Status |
| --- | --- | --- |
| Layer 0 — `EvidenceGraph` | raw observed facts | input |
| Layer 1 — `CapabilityCandidateSet` | extracted candidates | conceptual / helper |
| Layer 2 — `CapabilityLexicalSplit` | verb/noun split | helper |
| Layer 3 — `CapabilityOntology` | vocabulary / aliases | config |
| Layer 4 — `EffectiveCapabilityOntology` | compiled vocabulary | internal |
| Layer 5 — `CapabilityNormalizationReport` | translation audit | **first artifact** |
| Layer 6 — `CapabilityMap` | normalized projection | **deferred to v2** |
| Layer 7 — `RefactorPreservationContract` | preservation obligations | future |

Each layer has one responsibility.
None crosses the raw-evidence vs
normalized-purpose boundary. None
recreates the monolithic-validator
failure mode.

## BOUNDARY MODEL

The memo's eight-layer internal model
**refines** the macro five-layer
boundary from the architecture impact
review. The macro boundary remains:

- `EvidenceGraph` — raw observed
  facts.
- `CapabilityOntology` — canonical
  vocabulary / aliases.
- `CapabilityNormalizationReport` —
  translation audit.
- `CapabilityMap` — normalized
  capability projection.
- `RefactorPreservationContract` —
  preservation obligations.

Layers 1, 2, and 4
(`CapabilityCandidateSet`,
`CapabilityLexicalSplit`,
`EffectiveCapabilityOntology`) live
**inside** the
`CapabilityOntology` →
`CapabilityNormalizationReport` arc
of the macro boundary. They are
not new outer layers; they are
helpers + an internal compiled
model within
`@rekon/capability-ontology`.

## V1 IMPLEMENTATION SHAPE

The next slice
(`CapabilityNormalizationReport`
v1) ships:

| Artifact | Owner | V1 Behavior |
| --- | --- | --- |
| `@rekon/capability-ontology` package | new | exports helpers; reads `EvidenceGraph` + optional config; emits the audit artifact |
| Built-in baseline vocabulary | inside the package | small, conservative; verbs + nouns + minimal roles / patterns / layers |
| `.rekon/capability-ontology.json` | config (optional) | repo-local overrides + alias maps |
| `EffectiveCapabilityOntology` | internal | deterministic compile; cited by digest only |
| `CapabilityNormalizationReport` | new artifact | one per run; cites `EvidenceGraph` and ontology source / effective digest |
| `CapabilityMap` integration | none in v1 | additive `normalizedCapabilities` field arrives in v2 |
| `rekon ontology` CLI surface | optional | implementation slice decides; default is no-CLI |

The v1 slice will run a full
9-command verification + a CLI
smoke pattern (read the latest
`CapabilityNormalizationReport`
via `rekon artifacts latest --type
CapabilityNormalizationReport` to
prove the round-trip).

## TESTS / VERIFICATION

- `tests/docs/capability-ontology-translation-layer-decision.test.mjs`
  — 16 assertions covering memo
  existence + all 18 required
  headings + Option C selected +
  all required verbatim pins +
  three diagnostic tables +
  CHANGELOG + review packet.
- **Full 9-command verification
  gate** ran on `7226f31` before
  edits + again after edits.
- **No new contract test
  required** — no new helper,
  CLI, validator, or publisher
  in this batch.
- **No CLI smoke required** —
  decision-only.

## INTENTIONALLY UNTOUCHED

- `packages/*/src/*` — no source
  change anywhere. No new package
  created in this slice (the name
  `@rekon/capability-ontology` is
  reserved by this decision; the
  v1 slice creates the package).
- `packages/cli/src/*` — no new
  command, no new flag.
- `packages/kernel-*/src/*` — no
  schema change, no validator
  change.
- `packages/capability-*/src/*` —
  no behaviour change.
- The artifact registry, schema
  set, and permission model —
  unchanged.
- `EvidenceGraph` shape,
  validators, writer — unchanged.
- `CapabilityMap` shape,
  validators, writer — unchanged.
- `FindingFilterReport` /
  `FindingReport` /
  `IssueAdjudicationReport` /
  `CoherencyDelta` /
  `ReconciliationPlan` /
  `ReconciliationPreview` /
  `VerificationRun` /
  `VerificationResult` / memory /
  publications — unchanged.
- `.github/workflows/*.yml` — no
  active workflow installed.
- Any `package.json`,
  `package-lock.json`, or
  `tsconfig.json` — no
  dependency change, no version
  bump.

## RISKS / FOLLOW-UP

**Risks (all addressed by the
memo's recommendation + layered
model):**

- *Layered model collapses into
  flat config / report.* Mitigated
  by the explicit eight-layer
  model + the "do not flatten the
  ontology" pin + docs-test
  assertion #11.
- *Repo-local overrides shadow
  canonical vocabulary
  silently.* Mitigated by
  `CapabilityNormalizationReport.ontology`
  recording both source +
  configHash + effectiveHash so
  operators can see which
  vocabulary fired.
- *Unknown terms get auto-dropped
  or auto-accepted.* Mitigated by
  the unknown-term table + the
  unknown-term workflow + decision
  question #10 + docs-test
  assertion #9.
- *LLM normalization sneaks in as
  truth.* Mitigated by the
  no-LLM-only pin + docs-test
  assertion #10. LLM suggestions
  may live in `message` only.
- *`CapabilityMap` integration
  arrives too early.* Mitigated
  by deferring to v2 + docs-test
  assertion #7. v1 ships only the
  audit artifact.

**Follow-up:** the implementation
v1 slice (`CapabilityNormalizationReport`
v1).

## NEXT STEP

**`CapabilityNormalizationReport`
v1.** That slice:

- Creates the new
  `@rekon/capability-ontology`
  package.
- Ships a small, conservative
  built-in baseline vocabulary.
- Reads the latest
  `EvidenceGraph` + optional
  `.rekon/capability-ontology.json`.
- Compiles
  `EffectiveCapabilityOntology`
  in memory.
- Emits one
  `CapabilityNormalizationReport`
  per run.
- Surfaces unknown verbs /
  nouns as first-class entries.
- Does NOT touch
  `CapabilityMap`.
- Does NOT add LLM
  normalization.
- Does NOT add source writes.

The slice ships behind a docs
test that re-asserts the
layered model + this memo's
verbatim pins.
