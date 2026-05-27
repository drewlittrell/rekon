# Review Packet — CapabilityPhraseReport Publication Surfacing

Surfaces the latest `CapabilityPhraseReport` in the
architecture summary and agent contract publishers. The
surfacing is strictly **read-only**: neither publisher
mutates the phrase report, the source
`CapabilityNormalizationReport`, `CapabilityMap`, or
`EvidenceGraph`. Proof report surfacing is deferred —
`CapabilityPhraseReport` is semantic context, not
verification proof.

## CHANGES MADE

- **New helper in `@rekon/capability-docs`**:
  `buildCapabilityPhrasePublicationSection(input)` — pure
  renderer accepting `{ report?, reportRef?,
  headingLevel?: 2 | 3, tableLimit?: number }` and
  returning `{ lines: string[], inputRef?: ArtifactRef }`.
  Renders a `## Capability Phrases` (level 2) or `###
  Capability Phrases` (level 3) section with summary
  counts, bounded table, and the deferred-CapabilityMap
  callout. Emits no-report guidance pointing at
  `rekon capability phrase project --report <…>` when no
  report exists.
- **New duck type `CapabilityPhraseReportLike`** in
  `packages/capability-docs/src/index.ts` so the
  capability-docs package never imports
  `@rekon/capability-ontology` directly.
- **Architecture summary publisher** (`architectureSummaryPublisher`):
  loads the latest `CapabilityPhraseReport`, cites it in
  `header.inputRefs` when present, and renders the
  section between the existing
  `## Capability Ontology Suggestions` block and the
  `## Proof Loop` block.
- **Agent contract publisher** (`agentContractPublisher`):
  loads the latest `CapabilityPhraseReport`, cites it in
  `header.inputRefs` when present, renders a `###
  Capability Phrases` subsection in the operating-state
  group, and appends a new `Do Not Do` reminder: *Do not
  treat CapabilityPhraseReport entries as CapabilityMap
  ownership or placement policy; CapabilityPhraseReport
  is semantic purpose projection, CapabilityNormalizationReport
  remains translation audit, and CapabilityMap
  integration remains deferred.*
- **Manifest update**:
  `@rekon/capability-docs.consumes` adds
  `CapabilityPhraseReport`. New invalidation rule
  `capability-phrases.changed` directs callers to
  regenerate the architecture summary and agent
  contract when a new `CapabilityPhraseReport` is
  written.
- **New 18-assertion contract test**
  `tests/contract/capability-phrase-publications.test.mjs`.
- **New 10-assertion docs test**
  `tests/docs/capability-phrase-publications.test.mjs`.
- **New review packet** (this file).
- **Supporting doc updates:**
  - `docs/artifacts/capability-phrase-report.md` —
    new *Publication Surfacing* section pinning the
    read-only contract, the no-report guidance, the
    inputRefs citation, the manifest invalidation rule,
    and the proof-report deferral.
  - `docs/strategy/capability-phrase-report-decision.md`
    — implementation-sequence row 4 references the
    surfacing.
  - `docs/strategy/capability-phrase-contract-architecture-decision.md`
    — Follow-Up bullet for surfacing marked Resolved.
  - `docs/concepts/capability-ontology.md` — Semantic
    Layer section notes publication surfacing has
    shipped.
  - `docs/strategy/roadmap.md` — fifteenth-slice entry.
  - `docs/strategy/classic-behavior-roadmap.md` — same.
  - `README.md` — new comment block.
  - `CHANGELOG.md` — top entry describing the surfacing.

## PUBLIC API CHANGES

- New export from `@rekon/capability-docs`:
  - `buildCapabilityPhrasePublicationSection`
  - `BuildCapabilityPhrasePublicationSectionInput`
  - `BuildCapabilityPhrasePublicationSectionResult`
- New input fields on the internal
  `ArchitectureSummaryInputs` and `AgentContractInputs`
  types: `capabilityPhraseReport?:
  CapabilityPhraseReportLike` and
  `capabilityPhraseRef?: ArtifactRef`. Both are optional
  and additive.
- New invalidation rule `capability-phrases.changed` on
  `@rekon/capability-docs.manifest.invalidatedBy`.
- New agent-contract `Do Not Do` entry (additive).

No existing types / exports / schemas change. No artifact
registration. No CLI command added.

## PURPOSE PRESERVATION CHECK

- The layer boundary between **translation audit**
  (`CapabilityNormalizationReport`) and **semantic
  purpose projection** (`CapabilityPhraseReport`) is
  preserved in the rendered surfaces. Both publications
  visibly cite the deferred-CapabilityMap callout so
  readers cannot conflate observation with policy.
- The surfacing is read-only across every upstream
  artifact. Contract tests assert no new phrase report,
  no mutation of the existing phrase report, no
  mutation of the normalization report, no mutation of
  `CapabilityMap`, and no mutation of `EvidenceGraph`.
- The Agent Contract gains a `Do Not Do` reminder
  specifically against treating phrases as
  `CapabilityMap` ownership or placement policy. The
  contract level is the right place for that pin
  because agents read this artifact for operating
  rules.
- Proof report surfacing is deliberately deferred so
  proof status is not mixed with semantic context.

## CODEBASE-INTEL ALIGNMENT

- Aligned with the
  [CapabilityPhrase + CapabilityContract Architecture
  Decision](../../docs/strategy/capability-phrase-contract-architecture-decision.md):
  `CapabilityPhraseReport` enters the operator-visible
  surface as the semantic projection it was reserved to
  be.
- Aligned with the
  [CapabilityPhraseReport Decision](../../docs/strategy/capability-phrase-report-decision.md):
  the carrier (Option B, separate artifact) is now
  visible alongside the normalization audit without
  blurring boundaries.
- Aligned with the
  [Translation Layer Decision](../../docs/strategy/capability-ontology-translation-layer-decision.md):
  Layer 5b is now operator-visible. Layer 5 (audit) and
  Layer 6 (canonical projection) are unchanged.
- Aligned with the canon + override + canon-packs
  decisions: canon packs continue to supply canonical
  vocabulary; phrases enrich; suggestion preview
  continues to target the overrides file.
- Aligned with the
  [Suggestion Safety Review](../../docs/strategy/capability-ontology-suggestion-safety-review.md):
  preview-only, operator-control, no auto-mutation.
  Phrase surfacing follows the same posture.

## PUBLICATION SURFACES

| Publication | Heading | Heading Level | Trigger | Mutation? |
| --- | --- | --- | --- | --- |
| Architecture summary | `## Capability Phrases` | 2 | Always rendered (with no-report guidance when missing) | Read-only |
| Agent contract | `### Capability Phrases` | 3 | Always rendered (with no-report guidance when missing) | Read-only |
| Proof report | n/a | — | **Deferred** (semantic context ≠ verification proof) | n/a |

Both rendered sections include:

- report ref + source `CapabilityNormalizationReport` ref
- summary counts (`totalPhrases`, `stable`, `partial`,
  `lowConfidence`, `withDomain`, `withPattern`,
  `withLayer`)
- bounded phrase table (verb / noun / status /
  confidence / evidence count); default cap 10
- the verbatim deferred-CapabilityMap callout

## READ-ONLY GUARANTEE

Both publishers:

- read the **latest** `CapabilityPhraseReport`;
- cite it in `header.inputRefs` when present;
- render the section using the pure helper.

Both publishers **must not**:

- run `rekon capability phrase project`;
- run `rekon capability ontology normalize`;
- mutate `CapabilityPhraseReport`;
- mutate `CapabilityNormalizationReport`;
- mutate `CapabilityMap`;
- mutate `EvidenceGraph`;
- mutate the review ledger or suggestion report.

Contract tests assert all of the above.

## INPUT REFS / CITATIONS

When a phrase report exists, both publications carry a
`CapabilityPhraseReport` entry in `header.inputRefs`.
This is what wires freshness: the manifest's new
`capability-phrases.changed` invalidation rule directs
freshness to re-mark both publications stale on new
phrase reports, and operators see the change after
re-running `rekon publish architecture` /
`rekon publish agent-contract`.

## PROOF REPORT DEFERRAL

`CapabilityPhraseReport` is semantic context, not
verification proof. Surfacing it in the proof report
would mix semantic projection with proof status and
risk operators reading phrase enrichment as evidence
the change is verified. The proof report stays focused
on `VerificationPlan` / `VerificationResult` /
`VerificationRun`. A future slice may revisit once a
natural semantic-context section exists in the proof
surface.

## TESTS / VERIFICATION

- **18-assertion contract test**
  `tests/contract/capability-phrase-publications.test.mjs`
  pins section presence, no-report guidance, summary
  counts, bounded table, CapabilityMap-deferred pin,
  inputRefs citation on both publications, agent-contract
  verbatim pins (`semantic purpose projection`,
  `translation audit`, `CapabilityMap integration remains
  deferred`), the new `Do Not Do` reminder, and the
  read-only guarantees (no new phrase report, no
  mutation of phrase / normalization / CapabilityMap /
  EvidenceGraph), plus `rekon artifacts validate` stays
  clean.
- **10-assertion docs test**
  `tests/docs/capability-phrase-publications.test.mjs`
  pins doc coverage of the surfacing.
- Expected full suite: 2349 pass (2321 + 28 new) / 10
  skipped / 0 fail.
- 9-command gate: typecheck / test / build /
  audit-package-exports / audit-license /
  publish-dry-run / install-smoke /
  install-tarball-smoke all green.
- CLI smoke: refresh → normalize → phrase project →
  publish architecture → publish agent-contract →
  artifacts validate (clean).

## INTENTIONALLY UNTOUCHED

- `CapabilityNormalizationReport` shape unchanged.
- `CapabilityNormalizationReviewLedger` unchanged.
- `CapabilityOntologySuggestionReport` unchanged.
- `CapabilityPhraseReport` shape unchanged.
- `CapabilityMap` v1 unchanged.
- `EvidenceGraph` unchanged.
- Proof report publisher unchanged.
- GitHub Check + PR comment publishers unchanged.
- CLI commands unchanged.
- No new permission. No version bump. No npm publish.

## RISKS / FOLLOW-UP

Risks:

1. Operators read the phrase section as
   `CapabilityMap` placement policy. Mitigation: the
   inline deferred-CapabilityMap callout + the agent
   contract `Do Not Do` reminder + the artifact-doc
   pins.
2. v1 strict projection emits 0 phrases on most repos
   today (low canon overlap with example fixtures), so
   the section will frequently render with `Phrases: 0`.
   Mitigation: this is faithful to the projection
   rules; the next safety review can decide whether the
   strictness should relax.
3. Future enrichment slices add fields the publication
   does not yet render. Mitigation: each slice ships
   its own incremental publisher update.

Follow-up:

- **CapabilityPhraseReport safety review** — end-to-end
  review of the
  `CapabilityNormalizationReport → CapabilityPhraseReport
  → publication surfacing` path. Decides whether
  phrases are stable enough to gate `CapabilityMap` v2,
  whether enrichment slices ship first, or whether
  more dogfood is required.
- **Per-evidence-source enrichment slices** (domain /
  pattern / layer / side-effect / IO).
- **Phrase confidence + status model decision**.
- **`CapabilityMap` v2 design** (deferred).
- **`CapabilityContract` decision** (deferred).

## NEXT STEP

Recommended: **CapabilityPhraseReport safety review** —
review the full path
`CapabilityNormalizationReport → CapabilityPhraseReport
→ publication surfacing` and decide:

- whether `CapabilityPhraseReport` is stable enough for
  `CapabilityMap` v2 high-confidence-only consumption;
- whether more phrase enrichment is needed first;
- or whether further dogfood is required.

The review is docs / tests-only; no runtime change.
