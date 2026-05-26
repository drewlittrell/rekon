# Review Packet: Built-In Baseline Ontology Coverage Review

**Slice:** Strategy / dogfood-analysis batch (step 4 of the
capability-ontology track implementation sequence).
**Status:** Implemented. Ready for review.
**Owning surface:** `docs/strategy/builtin-ontology-coverage-review.md`.
**Decision lineage:** [Capability Ontology Architecture Impact
Review](../../docs/strategy/capability-ontology-architecture-impact-review.md)
→ [Capability Ontology Translation Layer
Decision](../../docs/strategy/capability-ontology-translation-layer-decision.md)
→ [CapabilityNormalizationReport
v1](../../docs/artifacts/capability-normalization-report.md)
→ **this review**.

## CHANGES MADE

- New strategy memo
  `docs/strategy/builtin-ontology-coverage-review.md` covering
  the v1 coverage review. Includes the decision summary, the
  three required diagnostic tables (target / summary / cause),
  the options-considered table, the baseline-sufficiency
  decision, and the CapabilityMap readiness verdict.
- New 11-assertion docs test
  `tests/docs/builtin-ontology-coverage-review.test.mjs`.
- This review packet
  `.rekon-dev/review-packets/builtin-ontology-coverage-review.md`.
- Cross-link updates to: translation-layer decision memo,
  architecture impact review memo, `CapabilityNormalizationReport`
  artifact reference, capability ontology concept doc, the
  roadmap, the classic-behavior roadmap, README, and CHANGELOG.

## PUBLIC API CHANGES

None.

- No package exports added or removed.
- No artifact type registered.
- No CLI command added or removed.
- No SDK / runtime change.
- No workspace package added.
- No `tsconfig` change.
- No `package.json` change to any workspace package.

## PURPOSE PRESERVATION CHECK

This memo preserves the capability-ontology track's product
guarantees verbatim:

- `EvidenceGraph` raw facts remain unchanged.
- `CapabilityNormalizationReport` remains audit-only.
- `CapabilityMap` integration remains deferred to v2.
- Unknown / low-confidence rows do not project downstream.
- The lexical splitter remains deterministic. No LLM normalization.
- Source-write apply remains unavailable.
- The layered ontology model is preserved — "Do not flatten
  the ontology into a single config / report layer."

The review extends the track with evidence-based decision data
without changing any runtime behavior.

## CODEBASE-INTEL ALIGNMENT

- The review is the substrate equivalent of classic
  `codebase-intel`'s "review the ontology against real repos
  before extending it" workflow. v1 ships the audit artifact;
  this memo decides what to ship next.
- The decision favours **operator-driven baseline expansion**
  over a wholesale port of the classic `GraphOntologyValidator`
  vocabulary, consistent with the architecture impact review's
  "no monolithic validator" pin.
- The recommended next slice (Option C — unknown-term operator
  review surface) is the substrate-side equivalent of the
  classic ontology review CLI but expressed as a Rekon
  capability + artifact, not a monolithic command.

## TARGETS REVIEWED

| Target | Archetype | Source |
| --- | --- | --- |
| `simple-js-ts` | fixture (single TS file) | `examples/simple-js-ts` (in-repo) |
| `target-1` | real-world Next.js TypeScript application | mktemp copy of operator-controlled repo (anonymized per private-beta intake policy) |

Both targets were normalized via the production CLI:

```bash
rekon refresh
rekon capability ontology normalize --json
```

The `target-1` repo identity, file paths, and source excerpts
are intentionally not reproduced in the memo or this packet.

## NORMALIZATION RESULTS

`simple-js-ts`:

```text
totalCandidates: 4
normalized:       0
unknownVerb:      0
unknownNoun:      0
unknown:          1
ignored:          1
aliasApplied:     0
lowConfidence:    2
```

`target-1`:

```text
totalCandidates: 9110
normalized:       100  (1.1%)
unknownVerb:      578
unknownNoun:      594
unknown:         5558  (61%)
ignored:          226
aliasApplied:     561
lowConfidence:   2054  (22.5%)
```

Ontology source on both runs: `"builtin"`. Effective hash
matched (`13b26c3b4334a3d2`), confirming the baseline
compiles deterministically.

Top unknown verbs on `target-1`: `figma` (162), `attach`
(18), `resolve` (13), `normalized` (9), `start` (9),
`normalize` (9), `compile` (8), `temp` (8), `manifest` (8),
`is` (7).

Top unknown nouns on `target-1`: `schema` (40), `id` (34),
`name` (23), `key` (20), `prompt` (18), `plan` (17),
`value` (14), `number` (12), `ms` (11), `signature` (11).

Top fully-unknown verb/noun pairs on `target-1`:
`figma/schema` (495), `figma/command` (140), `app/ts` (59),
`figma/snapshot` (52), `core/ts` (50), `src/ts` (44),
`figma/service` (32), `token/schema` (26), `normalize/name`
(26), `source/schema` (24), `figma/outline` (24),
`family/schema` (24).

## BASELINE SUFFICIENCY DECISION

- Baseline is **sufficient** for audit-only v1.
- Baseline is **not sufficient** for `CapabilityMap` v2
  projection. The unknown set is dominated by symbol noise +
  lexical-split limitations (proper-noun-prefixed identifiers,
  path-shaped capability hints), not pure vocabulary gap.
- Pure vocabulary expansion (Option A) would address only a
  fraction of unknowns and could create the illusion of
  coverage. Decision: defer.

## CAPABILITYMAP READINESS

- **Not ready.** `CapabilityMap` v2 is deferred until either
  the operator review surface produces a vetted baseline
  expansion, or `CapabilityMap` v2 ships with a strict
  high-confidence-only gate that excludes:
  - single-token outcomes,
  - path-shaped outcomes (`src/ts`, `app/ts`, `core/ts`), and
  - proper-noun-prefixed outcomes (`figma/*`).
- The translation-layer decision's pin "do not flatten the
  ontology into a single config / report layer" remains
  honored. `CapabilityNormalizationReport` stays the audit
  surface; `CapabilityMap` stays the projection surface.

## TESTS / VERIFICATION

- 9-command pre-validation gate passed on `891ccae` before
  this batch began.
- New 11-assertion docs test
  `tests/docs/builtin-ontology-coverage-review.test.mjs`
  passing.
- Full 9-command verification gate to be re-run before merge.
- CLI smoke for the normalize command remains green from the
  prior batch — no behaviour change in this batch.

## INTENTIONALLY UNTOUCHED

- Built-in ontology vocabulary (`packages/capability-ontology/src/index.ts`).
- Lexical splitter (`splitCapabilityName`).
- Candidate extractor (`extractCapabilityCandidates`).
- Normalizer (`normalizeCapabilityCandidates`).
- `CapabilityNormalizationReport` artifact shape.
- `rekon capability ontology normalize` CLI.
- SDK / runtime artifact registration.
- Any other workspace package.

## RISKS / FOLLOW-UP

- **Single real-world target.** This review uses one real
  Next.js TypeScript repo (`target-1`) plus the in-repo
  fixture. Future operator runs may surface different unknown
  patterns. The operator review surface (Option C) is the
  cleanest way to absorb that variance.
- **Anonymization tax.** Specific source excerpts and repo
  identity are deliberately omitted. The memo records counts
  and term shapes only. Operators reviewing privately can
  match these to their own normalization output.
- **HTTP-method-export noise.** `GET`, `POST`, `OPTIONS`,
  etc. inflate the low-confidence row count. A future
  candidate-extraction filter could drop these explicitly.
  Not in scope for this batch.
- **Splitter limitation on proper-noun-prefixed identifiers**
  (`FigmaSchema` → `verb="figma", noun="schema"`). Drives
  the bulk of the `unknown` pairs. A splitter-v2 slice can
  recognize proper-noun prefixes deterministically; tracked
  as follow-up work item 3 in the memo.

## NEXT STEP

**Option C — capability ontology unknown-term operator review
surface.** New CLI + artifact (working title:
`CapabilityNormalizationReviewLedger` — name reserved,
registration deferred). Triages top unknown verbs / nouns
from a real `CapabilityNormalizationReport` into one of
{extend ontology / rename symbol / noise — filter / defer}.

Option A (vocabulary expansion) follows, gated on Option C's
output. Option B (`CapabilityMap` v2) remains deferred until
Option A reaches steady state **or** a strict high-confidence
gate is defined.
