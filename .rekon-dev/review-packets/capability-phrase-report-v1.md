# Review Packet — CapabilityPhraseReport v1

First runtime slice after the
[CapabilityPhraseReport Decision](../../docs/strategy/capability-phrase-report-decision.md)
shipped at `8791e62`. Registers `CapabilityPhraseReport` as
a new artifact type, adds the `buildCapabilityPhraseReport`
helper to `@rekon/capability-ontology`, and ships the
`rekon capability phrase project` CLI command.

The carrier boundary the decision selected (Option B) is
preserved: `CapabilityNormalizationReport` remains the
**translation audit**; `CapabilityPhraseReport` is the
**semantic purpose projection**; `CapabilityMap` is not
mutated.

## CHANGES MADE

- **New artifact type:** `CapabilityPhraseReport`.
  - Registered in
    `packages/sdk/src/index.ts` (`BUILT_IN_ARTIFACT_TYPES`,
    `schemaVersion: "0.1.0"`, `stability: "experimental"`).
  - Registered in
    `packages/runtime/src/index.ts`
    (`ARTIFACT_CATEGORY_BY_TYPE: "projections"` — sits next
    to `CapabilityNormalizationReport` and `CapabilityMap`).
- **New types + helpers** in
  `packages/capability-ontology/src/index.ts`:
  - `CapabilityPhraseConfidence` (`"high" | "medium" | "low"`).
  - `CapabilityPhraseStatus` (`"stable" | "partial" | "low-confidence"`).
  - `CapabilityPhrase` (required `id`, `verb`, `noun`,
    `confidence`, `evidenceRefs`, `sourceCandidateIds`,
    `status`; optional v1 `qualifier`, `domain`, `pattern`,
    `layer`, `message`; reserved future `sideEffects`,
    `inputs`, `outputs`).
  - `CapabilityPhraseReportSummary` (counts + with-domain /
    with-pattern / with-layer).
  - `CapabilityPhraseReport`
    (`header`, `sourceNormalizationReportRef`, `summary`,
    `phrases`).
  - `BuildCapabilityPhraseReportInput`.
  - `buildCapabilityPhraseReport(input)` — deterministic
    projection from `CapabilityNormalizationReport` to
    `CapabilityPhraseReport`.
  - `validateCapabilityPhraseReport(value)` — runtime
    validator returning `{ ok, report }` / `{ ok: false,
    reason }`.
- **New CLI command** in `packages/cli/src/index.ts`:
  `rekon capability phrase project --report <ref>
  [--root <path>] [--json]`. Help / usage line added.
- **New 20-assertion contract test**
  `tests/contract/capability-phrase-report.test.mjs`.
- **New 11-assertion docs test**
  `tests/docs/capability-phrase-report.test.mjs`.
- **New artifact doc**
  `docs/artifacts/capability-phrase-report.md`.
- **Review packet** (this file).
- **Supporting doc updates:**
  - `docs/concepts/capability-ontology.md` —
    *Semantic Layer (CapabilityPhrase)* section updated to
    reference the shipped v1 artifact.
  - `docs/artifacts/capability-normalization-report.md` —
    *Downstream Consumers* section updated; phrase report
    is now shipped, not future.
  - `docs/strategy/capability-phrase-report-decision.md` —
    implementation-sequence row 3 marked ✅ Shipped.
  - `docs/strategy/capability-phrase-contract-architecture-decision.md`
    — Follow-Up Work bullet for the v1 implementation
    marked Resolved.
  - `docs/strategy/roadmap.md` — fourteenth-slice entry.
  - `docs/strategy/classic-behavior-roadmap.md` — same
    entry on the classic-behavior track.
  - `README.md` — new comment block summarizing the v1
    artifact + CLI.
  - `CHANGELOG.md` — top entry describing the v1 artifact.

## PUBLIC API CHANGES

- `@rekon/capability-ontology` gains the following
  exports:
  - types: `CapabilityPhraseConfidence`,
    `CapabilityPhraseStatus`, `CapabilityPhrase`,
    `CapabilityPhraseReportSummary`,
    `CapabilityPhraseReport`,
    `BuildCapabilityPhraseReportInput`.
  - helpers: `buildCapabilityPhraseReport`,
    `validateCapabilityPhraseReport`.
- `@rekon/sdk.BUILT_IN_ARTIFACT_TYPES` gains
  `CapabilityPhraseReport` (`schemaVersion: "0.1.0"`,
  `stability: "experimental"`).
- `@rekon/runtime.ARTIFACT_CATEGORY_BY_TYPE` gains
  `CapabilityPhraseReport: "projections"`.
- `@rekon/cli` gains the `rekon capability phrase project`
  command.

No existing types / exports / schemas change. No artifact
shape is mutated.

## PURPOSE PRESERVATION CHECK

- The layer boundary the architecture + carrier decisions
  pinned is preserved exactly:
  - `CapabilityNormalizationReport` remains the
    translation audit.
  - `CapabilityPhraseReport` is the semantic purpose
    projection.
  - `CapabilityMap` is not mutated — v2 will consume the
    phrase report later.
- v1 emits a phrase **only when** the upstream claim is
  high-confidence and deterministic. Unknown / ignored /
  low-confidence rows remain visible in the audit
  artifact and never project.
- The repo-agnostic constraint is upheld:
  `buildCapabilityPhraseReport` does **not** read source
  files, does **not** require AST evidence, does **not**
  invoke an LLM, and does **not** depend on framework /
  language adapters.
- Source writes remain unavailable.
- Reserved future fields (`sideEffects`, `inputs`,
  `outputs`) are absent in v1. Partial fields (`domain`,
  `pattern`, `layer`) are left absent unless deterministic
  evidence is present — and v1 has no slice that produces
  such evidence yet, so they stay absent.

## CODEBASE-INTEL ALIGNMENT

- Aligned with the
  [CapabilityPhrase + CapabilityContract Architecture
  Decision](../../docs/strategy/capability-phrase-contract-architecture-decision.md):
  reserved primitive is now realized in code as a separate
  artifact.
- Aligned with the
  [CapabilityPhraseReport Decision](../../docs/strategy/capability-phrase-report-decision.md):
  Option B (separate artifact) is the carrier shipped.
- Aligned with the
  [Translation Layer Decision](../../docs/strategy/capability-ontology-translation-layer-decision.md):
  Layer 5b sits between Layer 5 (audit) and Layer 6 (canonical
  projection); the audit layer's shape is unchanged.
- Aligned with the
  [Canon + Override Decision](../../docs/strategy/capability-ontology-canon-override-model-decision.md)
  and [Canon Packs v1](../../docs/strategy/capability-ontology-canon-override-model-decision.md):
  canon packs continue to supply the canonical vocabulary
  phrases anchor on.

## ARTIFACT MODEL

```ts
type CapabilityPhrase = {
  // Required (v1)
  id: string;
  verb: string;
  noun: string;
  confidence: "high" | "medium" | "low";
  evidenceRefs: ArtifactRef[];
  sourceCandidateIds: string[];
  status: "stable" | "partial" | "low-confidence";

  // Optional (v1 partial; left absent unless deterministic)
  qualifier?: string[];
  domain?: string;
  pattern?: string;
  layer?: string;
  message?: string;

  // Reserved (future enrichment slices)
  sideEffects?: string[];
  inputs?: string[];
  outputs?: string[];
};

type CapabilityPhraseReport = {
  header: ArtifactHeader;
  sourceNormalizationReportRef: ArtifactRef;
  summary: {
    totalPhrases: number;
    stable: number;
    partial: number;
    lowConfidence: number;
    withDomain: number;
    withPattern: number;
    withLayer: number;
  };
  phrases: CapabilityPhrase[];
};
```

## PROJECTION RULES

A `CapabilityPhrase` is emitted **only when** the source
`CapabilityNormalizationReport` candidate satisfies:

- `candidate.status === "normalized"`
- `candidate.normalized` exists with both `verb` and `noun`
- `candidate.confidence === "high"`
- the lexical-split confidence was high

Not emitted for: `unknown-verb`, `unknown-noun`, `unknown`,
`ignored`, `low-confidence`, medium-confidence rows.

v1 status assignment: every emitted phrase has
`status === "stable"`. `partial` and `low-confidence` are
reserved.

Deterministic IDs: `phrase-<candidate-id>-<verb>-<noun>`.
Deterministic ordering: path → verb → noun → candidate id.

## CLI SURFACE

```bash
rekon capability phrase project \
  --report <CapabilityNormalizationReport-id|type:id> \
  [--root <path>] [--json]
```

- `--report` required; resolves a
  `CapabilityNormalizationReport`.
- Reads the normalization report, builds the phrase report
  via `buildCapabilityPhraseReport`, writes it under
  `.rekon/artifacts/projections/`.
- JSON mode emits `{ artifact, sourceNormalizationReportRef,
  summary, phrases }`.
- Human mode prints a short summary ending with
  *"CapabilityMap remains unchanged."*.

## BOUNDARY MODEL

| Layer | Responsibility |
| --- | --- |
| `EvidenceGraph` | raw facts |
| `CapabilityNormalizationReport` | translation audit |
| `CapabilityPhraseReport` | semantic purpose projection (this batch) |
| `CapabilityMap` v1 | derived from `ObservedRepo` + `OwnershipMap` (unchanged) |
| `CapabilityMap` v2 | future consumer of `CapabilityPhraseReport` (deferred) |
| `CapabilityContract` | future policy / preservation layer |
| `RefactorPreservationContract` | far-future phase-specific projection |

## TESTS / VERIFICATION

- **20-assertion contract test**
  `tests/contract/capability-phrase-report.test.mjs` pins
  validator behavior, projection rules per status (normalized
  high → stable; unknown-verb / unknown-noun / ignored /
  low-confidence rejected), deterministic id + ordering,
  evidence-ref / sourceCandidateIds citations, header
  inputRefs including `CapabilityNormalizationReport` and
  `EvidenceGraph` when upstream cites it, summary counts,
  CLI required `--report`, CLI writes phrase report, human
  output asserts CapabilityMap unchanged, CLI does not
  mutate `CapabilityNormalizationReport` / `EvidenceGraph` /
  `CapabilityMap`, and `rekon artifacts validate` stays
  clean.
- **11-assertion docs test**
  `tests/docs/capability-phrase-report.test.mjs` pins the
  artifact doc + concept doc + CHANGELOG + this packet's
  PURPOSE PRESERVATION CHECK.
- Expected full suite: 2321 pass (2290 + 31 new) / 10
  skipped / 0 fail.
- 9-command gate: typecheck / test / build /
  audit-package-exports / audit-license / publish-dry-run /
  install-smoke / install-tarball-smoke all green.
- CLI smoke (full chain): refresh → normalize → phrase
  project (writes `CapabilityPhraseReport`) → artifacts
  validate (clean).

## INTENTIONALLY UNTOUCHED

- `CapabilityNormalizationReport` shape unchanged.
- `CapabilityNormalizationReviewLedger` unchanged.
- `CapabilityOntologySuggestionReport` unchanged.
- `CapabilityMap` v1 unchanged.
- `EvidenceGraph` unchanged.
- `FindingReport` / `CoherencyDelta` / `ReconciliationPlan`
  / `VerificationRun` / `VerificationResult` unchanged.
- Publication / GitHub publisher behaviour unchanged.
- Existing CLI commands unchanged.
- No new permission. No new role. No workflow YAML change.
- No version bump. No npm publish. No git tag. No GitHub
  Release. No new branch.

## RISKS / FOLLOW-UP

Risks:

1. v1 projection is too strict for some repos. Mitigation:
   the next slice (publication surfacing) will expose the
   summary so operators can see when the projection emits
   zero phrases despite a populated normalization report;
   future enrichment slices relax the strictness behind
   their own decision memos.
2. Future enrichment slices add fields that the audit
   artifact cannot supply. Mitigation: each field lands
   per evidence-source slice with its own decision memo;
   the v1 field policy explicitly marks future fields as
   reserved.
3. `CapabilityMap` v2 consumers gate on `status === "stable"`
   only. Mitigation: phrase report stays cheap to re-project
   when the normalization report changes; freshness chains
   via `header.inputRefs`.
4. Operators conflate phrase (observed) with contract
   (policy). Mitigation: artifact doc + supporting docs
   explicitly call out the distinction.

Follow-up:

- **Phrase publication surfacing** — render phrase summary
  in architecture summary + agent contract.
- **Confidence + status model decision** — formalize the
  formula that maps lexical / ontology / corroborating-
  source signal into `confidence` and `status`.
- **Per-evidence-source enrichment slices** (domain /
  pattern / layer / future side-effect / IO).
- **`CapabilityMap` v2 design** — gated on phrase
  stability.
- **`CapabilityContract` decision** (future).

## NEXT STEP

Recommended: **CapabilityPhraseReport publication
surfacing** — render the phrase summary in the
architecture summary and the agent contract publications.
Read-only, no write surfaces. Still no `CapabilityMap`
mutation. Still no `CapabilityContract`.
