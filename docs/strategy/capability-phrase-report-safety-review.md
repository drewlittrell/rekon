# CapabilityPhraseReport Safety Review

**Status:** v1 safety review. Strategy / docs / tests-only
batch. **No runtime change. No `CapabilityMap` mutation.
No `CapabilityPhraseReport` mutation. No
`CapabilityNormalizationReport` mutation. No
`EvidenceGraph` mutation. No phrase-projection rule change.
No `CapabilityContract`. No `RefactorPreservationContract`.
No architecture linting, resolver routing, or verification
planning by capability. No AST / typechecker evidence. No
LLM-only inference. No source-write apply. No npm publish.
No version bump. No git tag. No GitHub Release. No new
branch.**

**Audience:** future implementers of the
capability-ontology track, operators consuming the
architecture summary / agent contract, and reviewers
gating `CapabilityMap` v2.

**Companion docs:**

- [CapabilityPhrase + CapabilityContract Architecture
  Decision](capability-phrase-contract-architecture-decision.md)
  — reserves the semantic primitive this review covers.
- [CapabilityPhraseReport Decision](capability-phrase-report-decision.md)
  — commits to Option B (separate
  `CapabilityPhraseReport` carrier).
- [Capability Ontology Translation Layer Decision](capability-ontology-translation-layer-decision.md)
  — eight-layer model that defines Layers 5
  (`CapabilityNormalizationReport`), 5b
  (`CapabilityPhraseReport`), and 6 (`CapabilityMap`).
- [`CapabilityPhraseReport` artifact reference](../artifacts/capability-phrase-report.md)
  — implementation surface + publication surfacing
  contract.

## Decision Summary

`CapabilityPhraseReport` is **safe and stable as the
semantic purpose projection layer.** The end-to-end
projection path —
`CapabilityNormalizationReport → CapabilityPhraseReport →
architecture summary / agent contract publication
surfacing` — preserves the layer boundaries the
architecture and carrier decisions established. The
publication surfaces explicitly callout the
deferred-`CapabilityMap` boundary; the agent contract's
`Do Not Do` reminder pins the same constraint at the
operating-rules level.

**`CapabilityMap` v2 should still be deferred**, even
though the artifact path is safe, until one more
real-repo phrase-coverage review validates:

- phrase count across canon-pack archetypes;
- stable-phrase quality (signal density,
  noise rate);
- evidence-ref coverage (per-phrase
  `evidenceRefs` size, `sourceCandidateIds`
  distribution);
- publication usefulness (do operators / agents act on
  the rendered table?).

**Selected next slice:** *CapabilityPhraseReport real-
repo coverage review* — measure the four signals above
on at least one fixture + one real cohort target.

**Pinned verbatim** (the docs test asserts each
statement):

- `CapabilityPhraseReport` is semantic purpose
  projection, not ownership or placement policy.
- `CapabilityNormalizationReport` remains the
  translation audit.
- `CapabilityMap` integration remains deferred until
  phrase coverage is measured on real repos.
- Proof report surfacing remains deferred because phrase
  projection is semantic context, not verification
  proof.
- Only stable high-confidence phrases are eligible for
  future `CapabilityMap` v2.

## Why This Review Exists

The capability-ontology track now ships the full
operator-facing semantic projection path:

```
EvidenceGraph
  → CapabilityNormalizationReport
  → CapabilityPhraseReport
  → architecture summary + agent contract publications
```

Each layer was reserved or shipped behind its own
decision memo (architecture impact review, translation
layer, canon + override, canon packs v1,
`CapabilityPhrase` architecture, phrase-report decision,
phrase-report v1, publication surfacing). The next
candidate consumer is `CapabilityMap` v2 — but
`CapabilityMap` is a canonical projection that historically
binds ownership, system membership, and role taxonomy.
Wiring it to phrases prematurely would:

- elevate observed semantic claims to canonical
  ownership;
- create a feedback loop where phrase output drives
  capability claims that drive new phrase output;
- short-circuit the operator-control surface the
  override file is meant to be.

This review exists so the decision to ship
`CapabilityMap` v2 lands on evidence, not optimism. It
walks the projection path layer by layer, asks whether
each boundary holds, and identifies what evidence is
still missing before `CapabilityMap` v2 can begin.

## Projection Path Reviewed

The end-to-end path under review:

| Step | Artifact / Command | Role | Boundary |
| --- | --- | --- | --- |
| normalize | `CapabilityNormalizationReport` | translation audit | raw `EvidenceGraph` facts unchanged |
| phrase project | `CapabilityPhraseReport` | semantic purpose projection | `CapabilityMap` unchanged |
| architecture summary | `Publication` (architecture summary) | operator surface | read-only |
| agent contract | `Publication` (agent contract) | agent guidance | read-only |

Pipeline pin: every arrow above is **additive**. No
downstream consumer mutates an upstream artifact. The
agent contract gains operator-rules visibility into the
phrase surface; the architecture summary gains
operator-visible counts and a bounded table; neither
publication writes a new `CapabilityPhraseReport` or
shifts the canon / override files.

## Artifact Boundary Review

### `CapabilityNormalizationReport` (Layer 5)

- Shape unchanged across the entire phrase track.
- Still the translation audit (raw `EvidenceGraph`
  candidates → canonical verb / noun claims; unknown /
  ignored / low-confidence rows remain audit signal).
- Cited by `CapabilityPhraseReport.sourceNormalizationReportRef`
  and by phrase-report `header.inputRefs`.

### `CapabilityPhraseReport` (Layer 5b)

- Pure projection from `CapabilityNormalizationReport`
  via `buildCapabilityPhraseReport`.
- Strict v1 projection rules: emit a phrase **only when**
  the candidate is `status === "normalized"` +
  `confidence === "high"` + lexical-split confidence is
  high. Every emitted phrase has `status === "stable"`
  in v1. Unknown / ignored / low-confidence rows do
  **not** project.
- Required v1 fields: `id`, `verb`, `noun`, `confidence`,
  `evidenceRefs`, `sourceCandidateIds`, `status`.
  Partial fields (`qualifier`, `domain`, `pattern`,
  `layer`, `message`) are absent unless deterministic
  evidence exists. Future fields (`sideEffects`,
  `inputs`, `outputs`) are reserved.
- Deterministic ids and ordering: re-running the
  projector against the same normalization report
  produces byte-identical phrase rows (modulo the
  header timestamp).
- Never reads source files. Never invokes an LLM.
  Never uses AST / typechecker evidence.

### `CapabilityMap` (Layer 6 — deferred)

- v1 (today) is a projection from `ObservedRepo` +
  `OwnershipMap`. Unchanged.
- v2 (deferred) will consume **only stable
  high-confidence** `CapabilityPhrase` claims from
  `CapabilityPhraseReport`. Raw normalization rows
  never flow into the canonical projection.
- v2 gate: stable claims across multiple cohort
  targets, measured by the next real-repo coverage
  review. This safety review pins the gate; it does
  not declare it satisfied.

### `CapabilityContract` (Layer 7 — future)

- Reserved name only. Not implemented in v1.
- Binds a phrase to allowed layers / required checks /
  required + forbidden neighbours / preservation
  rules. Operator-authored, not observed.
- Stays distinct from `CapabilityPhraseReport` (which
  is observed) and from
  `RefactorPreservationContract` (which is a phase
  projection of contract policy).

## Publication Surfacing Review

Both surfaces shipped at `6e2c0c2`. Both are strictly
read-only.

### Architecture summary

- New `## Capability Phrases` section between the
  `## Capability Ontology Suggestions` block and the
  `## Proof Loop` block.
- Renders report ref, source
  `CapabilityNormalizationReport` ref, summary counts
  (`totalPhrases`, `stable`, `partial`, `lowConfidence`,
  `withDomain`, `withPattern`, `withLayer`), bounded
  phrase table (default cap 10).
- Section text explicitly carries the
  *"CapabilityMap integration remains deferred"* callout
  alongside *"semantic purpose projection"* and
  *"translation audit"* phrasing so readers cannot
  conflate the layers.
- When no `CapabilityPhraseReport` exists, emits
  no-report guidance pointing at `rekon capability
  phrase project --report
  <CapabilityNormalizationReport:id> --json`.

### Agent contract

- New `### Capability Phrases` subsection in the
  operating-state group with the same metadata.
- New `Do Not Do` reminder: *Do not treat
  `CapabilityPhraseReport` entries as `CapabilityMap`
  ownership or placement policy; `CapabilityPhraseReport`
  is semantic purpose projection,
  `CapabilityNormalizationReport` remains translation
  audit, and `CapabilityMap` integration remains
  deferred.*
- The reminder sits at the operating-rules level, which
  is where agents read instructions. This is the
  correct place to pin the boundary for runtime
  consumers.

### Proof report

- **Surfacing deliberately deferred.**
  `CapabilityPhraseReport` is semantic context, not
  verification proof. Surfacing it in the proof report
  would mix semantic projection with proof status and
  risk operators reading phrase enrichment as
  evidence that a change is verified.
- Re-evaluate the deferral once a natural
  semantic-context section exists in the proof
  surface.

## Input Refs And Citations

The phrase report is the only new node in the
`header.inputRefs` graph; everything else is unchanged.

- `CapabilityPhraseReport.header.inputRefs` includes
  the source `CapabilityNormalizationReport` (always,
  when projected by the helper) plus the upstream
  `EvidenceGraph` (when the normalization report
  cites it).
- `CapabilityPhraseReport.sourceNormalizationReportRef`
  is the primary input for freshness: when the source
  report changes, the phrase report is stale.
- Both publications now cite
  `CapabilityPhraseReport` in
  `Publication.header.inputRefs` when present. The
  manifest's new `capability-phrases.changed`
  invalidation rule directs freshness to re-mark both
  publications stale on a new phrase report.

The chain stays auditable end-to-end: every emitted
phrase points back to the candidate it projected from
via `sourceCandidateIds`, every candidate points back
to the `EvidenceGraph` fact via `source.artifactRef`,
every publication points back to the phrase report via
`header.inputRefs`. No layer collapses provenance.

## No-Mutation Guarantee

| Component | Reads | Writes |
| --- | --- | --- |
| `buildCapabilityPhraseReport` | normalization report (only) | returns new in-memory `CapabilityPhraseReport`; never persists |
| `rekon capability phrase project` CLI | normalization report (via ref) | one new `CapabilityPhraseReport` artifact under `.rekon/artifacts/projections/` |
| `architectureSummaryPublisher` | latest `CapabilityPhraseReport` | one new `Publication` (architecture summary) |
| `agentContractPublisher` | latest `CapabilityPhraseReport` | one new `Publication` (agent contract) |
| `buildCapabilityPhrasePublicationSection` | pure helper, no I/O | pure helper, returns markdown lines |

**Nothing in the path mutates:**

- `CapabilityNormalizationReport` (the audit stays
  byte-identical across phrase projection and
  publication regeneration).
- `EvidenceGraph` (the substrate is never written by
  any phrase-track surface).
- `CapabilityMap` (the canonical projection stays at
  v1 — `ObservedRepo` + `OwnershipMap`).
- `CapabilityNormalizationReviewLedger`
- `CapabilityOntologySuggestionReport`
- The canon-pack source files or the override file
  (`.rekon/capability-ontology.overrides.json`).
- Any source file in the operator's repo.

The 20 contract assertions on
`tests/contract/capability-phrase-report.test.mjs`
plus the 18 assertions on
`tests/contract/capability-phrase-publications.test.mjs`
enforce these guarantees mechanically. They run on
every PR.

## Proof Report Deferral

The deferral is intentional and remains correct:

- **Proof report surfaces verification state**
  (`VerificationPlan` / `VerificationResult` /
  `VerificationRun`). Its job is "did the proof loop
  close?"
- **Phrase report surfaces semantic context** ("what
  does this capability do?"). It has no opinion on
  proof.
- Mixing the two would let semantic enrichment leak
  into proof status. A reader could plausibly read a
  Capability Phrases section as evidence the change
  was verified.
- The current proof report stays focused. A future
  slice may add a clearly-labeled semantic-context
  section once that section's contract is itself
  reviewed.

## CapabilityMap Boundary

The boundary remains the conservative one fitted in the
architecture decision:

- `CapabilityMap` v1 today: derived from
  `ObservedRepo` + `OwnershipMap`. Unchanged.
- `CapabilityMap` v2 (future): consumes
  `CapabilityPhraseReport` claims with
  `status === "stable"` by default. Phrase report is
  the cleanup boundary; raw normalization rows never
  enter the canonical projection.
- v2 ships only after phrases are demonstrated
  **stable**, not just **present**. "Stable" is
  measured by:
  - per-phrase confidence formula correctness;
  - evidence-ref distribution (most phrases cite at
    least one `EvidenceGraph` source);
  - cross-repo signal density (phrase counts do not
    collapse to 0 on real repos with real
    capabilities).
- This safety review **does not declare v2 ready**.
  It pins the gate.

## CapabilityContract Boundary

- `CapabilityContract` remains the future policy /
  preservation layer. Not implemented in v1. Not
  implemented in this batch.
- The agent contract's existing `Do Not Do` reminder
  re-pins the boundary: phrases are *observed*
  semantic claims, contracts are *operator-authored*
  policy. The two never share a code path.
- `RefactorPreservationContract` stays as a future
  phase-specific projection of contract policy onto a
  refactor batch. Both names remain reserved; neither
  registers.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| Proceed directly to `CapabilityMap` v2 | deferred | needs real-repo phrase coverage; the artifact path is safe but stability is unmeasured |
| Phrase coverage review (real-repo measurement) | **selected** | validates stable phrase quality, evidence coverage, and publication usefulness before any canonical projection layer consumes it |
| Add phrase enrichment first (domain / pattern / layer / sideEffects) | deferred | enrichment needs evidence-source slices each with its own decision memo; without coverage data we cannot pick which slice yields the highest signal |
| Add `CapabilityContract` now | rejected | policy layer ships too early — phrases need to stabilize before a contract surface can constrain them |

The selected option is the conservative one: measure,
then decide.

## Recommendation

Selected: **CapabilityPhraseReport is safe and stable as
the semantic purpose projection layer. CapabilityMap
v2 stays deferred until one real-repo phrase coverage
review measures stable-phrase quality across the canon-
pack archetypes.**

Recommended next slice: **CapabilityPhraseReport
real-repo coverage review** — strategy / docs / tests
batch that runs `refresh → normalize → phrase project`
against the fixture and at least one real cohort target
and records:

- phrase count by archetype (base / nextjs-app /
  library-package / monorepo);
- stable-phrase ratio (`summary.stable /
  summary.totalPhrases`);
- evidence-ref distribution (how many phrases cite
  ≥ 1 `EvidenceGraph` source);
- publication usefulness (do agents / operators act on
  the rendered table?);
- whether high-confidence-only projection gives useful
  signal across multiple targets.

Output drives the `CapabilityMap` v2 high-confidence-
only decision. The review is docs / tests-only — no
runtime change, no CLI change, no artifact
registration.

## What This Does Not Do

- Does **not** mutate `CapabilityMap`.
- Does **not** mutate `CapabilityPhraseReport`.
- Does **not** mutate `CapabilityNormalizationReport`.
- Does **not** mutate `EvidenceGraph`.
- Does **not** mutate the review ledger or suggestion
  report.
- Does **not** change phrase projection rules.
- Does **not** change publication shape.
- Does **not** add `CapabilityContract`.
- Does **not** add `RefactorPreservationContract`.
- Does **not** add architecture linting.
- Does **not** add resolver routing by capability.
- Does **not** add verification planning by
  capability.
- Does **not** add semantic impact analysis.
- Does **not** add memory anchoring by capability.
- Does **not** add AST / typechecker evidence.
- Does **not** add LLM-only inference.
- Does **not** add source writes. **Source writes
  remain unavailable.**
- Does **not** publish to npm.
- Does **not** bump versions.
- Does **not** add a git tag or GitHub Release.
- Does **not** create a branch.

## Follow-Up Work

- **CapabilityPhraseReport real-repo coverage review** —
  ✅ Shipped. See
  [CapabilityPhraseReport Real-Repo Coverage Review](capability-phrase-report-coverage-review.md).
  Verdict: 16 stable phrases on `target-1` (0.18% of
  candidates, 6.6% of normalized). All gates pass except
  *phrase coverage sufficient for a useful canonical
  projection*. Recommended next slice is **phrase
  enrichment v1**, not `CapabilityMap` v2.
- **Phrase enrichment v1** — ✅ Shipped. See
  [Phrase Enrichment v1 Memo](capability-phrase-enrichment-v1.md).
  Deterministic `domain` / `pattern` / `layer`
  enrichment from `ObservedRepo` + `OwnershipMap`.
  Partial phrases emit only with deterministic
  context. Stable threshold unchanged. Coverage on
  `target-1` rose 15× (16 → 239 phrases).
- **Enrichment coverage review** — ✅ Shipped. See
  [Enrichment Coverage Review](capability-phrase-enrichment-coverage-review.md).
  Confirms enrichment v1 raised partial coverage but
  not stable count. `CapabilityMap` v2 stays deferred.
  Next slice is candidate-quality improvements
  (canon-pack expansion + lexical-splitter sharpening).
- **Second coverage review** after phrase enrichment v1
  lands. Measures stable + partial yield, enrichment
  field coverage, and publication usefulness.
- **Phrase confidence + status model decision** —
  formalize the formula that maps lexical / ontology /
  corroborating-source signal into `confidence` and
  `status`. Until then, v1's "lexical + canon-pack
  match + normalized = high → stable" rule holds.
- **Per-evidence-source enrichment slices** (one per
  source: path / ownership / framework / architecture
  profile / future AST / LLM-as-audit-signal). Each
  ships behind its own decision memo. Only land after
  enrichment v1 + the second coverage review.
- **`CapabilityMap` v2 design** — gated on the second
  coverage review and on stable claims across
  multiple cohort targets.
- **`CapabilityContract` decision** — far-future,
  after phrases stabilize and `CapabilityMap` v2 has
  shipped.
- **`RefactorPreservationContract` decision** —
  further future, after `CapabilityContract` ships.

## See Also

- [CapabilityPhrase + CapabilityContract Architecture Decision](capability-phrase-contract-architecture-decision.md)
- [CapabilityPhraseReport Decision](capability-phrase-report-decision.md)
- [Capability Ontology Translation Layer Decision](capability-ontology-translation-layer-decision.md)
- [Capability Ontology Canon + Override Model Decision](capability-ontology-canon-override-model-decision.md)
- [Capability Ontology Suggestion Safety Review](capability-ontology-suggestion-safety-review.md)
- [CapabilityPhraseReport Real-Repo Coverage Review](capability-phrase-report-coverage-review.md)
- [`CapabilityPhraseReport` artifact reference](../artifacts/capability-phrase-report.md)
- [`CapabilityNormalizationReport` artifact reference](../artifacts/capability-normalization-report.md)
- [Capability ontology concept](../concepts/capability-ontology.md)
- [Roadmap](roadmap.md)
- [Classic-behavior roadmap](classic-behavior-roadmap.md)
