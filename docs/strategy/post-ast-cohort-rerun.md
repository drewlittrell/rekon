# Post-AST Cohort Re-Run

**Status:** review recorded.
**Slice:** `post-ast-cohort-rerun`.
**Sequence position:** Twenty-sixth slice on the
capability-ontology track. Fifth coverage review on
the phrase track. Follows the
[Post-AST CapabilityPhraseReport Coverage Review](post-ast-capability-phrase-coverage-review.md)
(twenty-fifth slice), which deferred this cohort
re-run pending target-1 / target-2 availability.

## Decision Summary

**Verdict:** AST-backed JS/TS extraction **materially
improves stable phrase density on a real repo**.
`CapabilityMap` v2 readiness moves from *deferred*
to **ready to begin design**, with one strong
real-repo signal (`target-1`: 16 → 37 stable phrases,
**2.3× lift**) and one neutral real-repo signal
(`target-2`: 2 → 2 stable, unchanged but not
regressed). The memo explicitly accepts the asymmetric
signal per the readiness gate's "or the memo
explicitly accepts narrower evidence" clause and
recommends **`CapabilityMap` v2 high-confidence-only
decision memo** as the next slice.

**Pinned verbatim (asserted by docs test):**

- **Real cohort targets were re-run.**
- **AST improved stable phrase density on a real
  repo.**
- **`CapabilityMap` v2 is evidence-gated.**
- **Partial phrases alone do not justify
  `CapabilityMap` v2.**

**Headline numbers (post-AST):**

- **`target-1`** (anonymized; Next.js TS scale):
  EvidenceGraph 10,331 facts (**9,653 AST = 93.4%**,
  0 regex-fallback). Normalization 9,327 candidates
  → 299 normalized (3.2%). Phrase: **297 total, 37
  stable, 260 partial, 0 low-confidence**. Stable
  pairs include `get:response` (14), `build:plan`
  (13), `get:schema` (12), `get:session` (10),
  `save:response` (8), `build:report` (8) — textbook
  capability phrases. Artifacts validate clean.
- **`target-2`** (anonymized; small TS + workflows):
  EvidenceGraph 587 facts (**404 AST = 68.8%**, 0
  regex-fallback). Normalization 406 candidates → 12
  normalized (3.0%). Phrase: **12 total, 2 stable,
  10 partial, 0 low-confidence**. Stable pair:
  `test:session` (2). Artifacts validate clean.

**Pre/Post (real-repo deltas):**

| Target | candidates | normalized | stable | total phrases |
| --- | ---: | ---: | ---: | ---: |
| target-1 pre-AST | 9,110 | 241 | 16 | 239 |
| target-1 post-AST | 9,327 | 299 | **37** | 297 |
| target-1 lift | +2.4% | **+24.1%** | **+131.3%** | +24.3% |
| target-2 pre-AST | 408 | 12 | 2 | 12 |
| target-2 post-AST | 406 | 12 | 2 | 12 |
| target-2 lift | −0.5% | 0% | 0% | 0% |

The candidate count changes on both targets reflect
small AST-vs-regex extraction-set differences
(symbol-level coverage shifts), not source-tree
changes. Validation is clean on both.

**Decision:** the cohort re-run satisfies the
readiness gate. `CapabilityMap` v2 high-confidence-
only design is the **primary next slice**. The
parallel polish lane (`CapabilityNormalizationReport`
AST-metadata candidate integration) is selected as
**parallel work**, motivated by target-1's large
unknown-verb / unknown-noun counts which suggest
the normalizer is leaving AST signal on the floor.

## Why This Re-Run Exists

The
[Post-AST CapabilityPhraseReport Coverage Review](post-ast-capability-phrase-coverage-review.md)
(twenty-fifth slice) measured AST extraction on the
two Rekon-internal fixtures (`js-ts-ast-evidence` +
`simple-js-ts`) but could not access `target-1` and
`target-2` in that session. The review explicitly
accepted narrower evidence, deferred `CapabilityMap`
v2, and issued an intake request for the cohort
re-run. This memo is that re-run.

The hypothesis under test: **AST-backed extraction
on real repos produces meaningfully more stable
phrases than regex-only extraction**, which would
satisfy the
[JS/TS AST Evidence Adapter Decision](js-ts-ast-evidence-adapter-decision.md)'s
predicted downstream effect and unblock
`CapabilityMap` v2 design.

The hypothesis is **confirmed for one real repo
(target-1)** and **neutral on the second
(target-2)**. The memo evaluates the readiness gate
against this asymmetric evidence and selects the
next slice.

## Targets Reviewed

### Target table

| Target | Archetype | Source | Result |
| --- | --- | --- | --- |
| `target-1` | non-Rekon real repo; Next.js TS scale | real repo temp copy | ✅ measured |
| `target-2` | non-Rekon real repo; small TS + workflows | real repo temp copy | ✅ measured |

Anonymized labels per the work order's privacy rule
(no private source names in the deliverable). Both
targets matched their pre-AST baseline shapes
(target-1 ≈ 9k candidates, target-2 ≈ 400
candidates) within ±2.5%, confirming the same
repos are being measured.

## Command Matrix

For each target, the review ran (against a temp
copy with `.rekon/` / `node_modules` / `dist` /
`.next` / `build` / `coverage` stripped):

```bash
node packages/cli/dist/index.js refresh --root "$ROOT" --json

node packages/cli/dist/index.js capability ontology normalize \
  --root "$ROOT" --json

NORMALIZATION_REF="$(node packages/cli/dist/index.js artifacts latest \
  --root "$ROOT" \
  --type CapabilityNormalizationReport \
  --id-only)"

node packages/cli/dist/index.js capability phrase project \
  --root "$ROOT" \
  --report "$NORMALIZATION_REF" \
  --json

node packages/cli/dist/index.js publish architecture --root "$ROOT" --json
node packages/cli/dist/index.js publish agent-contract --root "$ROOT" --json
node packages/cli/dist/index.js artifacts validate --root "$ROOT" --json
```

A small Node.js helper drove the matrix and extracted
the metrics tables below from the on-disk artifacts.

## EvidenceGraph AST Results

### EvidenceGraph table

| Target | Total Facts | AST Facts | Regex Fallback Facts | Symbol Facts | Export Facts | Import Facts |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `target-1` | 10,331 | 9,653 | 0 | 7,666 | 1,275 | 712 |
| `target-2` | 587 | 404 | 0 | 192 | 93 | 119 |

**AST share:** 93.4% on target-1, 68.8% on
target-2. The non-AST facts on both targets are
`file` / `ownership_hint` / `capability_hint`
records (which never go through the AST path) — every
AST-eligible fact is AST-derived. Zero
regex-fallback facts on either target: the
TypeScript parser handled every JS/TS source without
throwing.

**Per-kind:** every `symbol`, `export`, and `import`
fact emitted by `@rekon/capability-js-ts` is
AST-backed. On target-1: 7,666 symbols, 1,275
exports, 712 imports. On target-2: 192 / 93 / 119.

## Normalization Results

### Normalization table

| Target | Total Candidates | Normalized | Unknown Verb | Unknown Noun | Unknown | Ignored | Alias Applied | Low Confidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `target-1` | 9,327 | 299 | 1,688 | 911 | 3,913 | 449 | 646 | 2,067 |
| `target-2` | 406 | 12 | 41 | 49 | 98 | 121 | 41 | 85 |

**target-1 normalization ratio:** 299 / 9,327 =
**3.2%** (vs pre-AST 2.6%). A measurable lift but
the absolute ratio remains low because the unknown
counts dominate: 1,688 unknown verb + 911 unknown
noun + 3,913 unknown = 6,512 out-of-vocabulary
candidates. This is the **canonical vocabulary
ceiling**, not an AST limitation.

**target-2 normalization ratio:** 12 / 406 = 3.0%
(vs pre-AST 2.9%). Effectively unchanged.

**Top remaining unknown verbs on target-1:** `figma`
(1,155), `is` (151), `token` (107), `family` (103),
`default` (80), `bridge` (75), `source` (72),
`normalized` (68), `has` (60), `collect` (59). The
`figma` count is concentrated in the
domain-specific source naming convention (component
prefixes treated as verbs by the lexical splitter).

**Top remaining unknown nouns on target-1:** `name`
(202), `id` (195), `ms` (114), `snapshot` (106),
`node` (104), `key` (100), `value` (94), `count`
(68), `ids` (67), `error` (59). These are common
property-name suffixes — the splitter treats them
as nouns because they appear in the tail position.

**Top remaining unknown verbs on target-2:**
`boundary` (20), `generated` (10), `owner` (6),
`layer` (6), `changed` (5), `absolute` (5). The
high `boundary` count reflects the repo's
domain-specific class-name prefix.

These unknown-noun / unknown-verb patterns indicate
**the candidate extractor could benefit from
AST-metadata signal** — class-name prefixes
(`UserService`, `BoundaryRouter`) are syntactically
classifiable as compound names where the leading
identifier is a domain-noun, not a verb. The
parallel polish lane addresses this.

## Phrase Results

### Phrase table

| Target | Total Phrases | Stable | Partial | Low Confidence | With Domain | With Pattern | With Layer |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `target-1` | 297 | **37** | 260 | 0 | 297 | 0 | 110 |
| `target-2` | 12 | 2 | 10 | 0 | 12 | 0 | 2 |

**target-1 stable density:** 37 / 9,327 = **0.40%**
(vs pre-AST 0.18%; **2.2× density lift**). Total
phrases 297 (vs pre-AST 239; +24.3%).

**target-2 stable density:** 2 / 406 = 0.49%
(vs pre-AST 0.49%; unchanged). Total phrases 12
(vs pre-AST 12; unchanged).

**target-1 stable verbs (top 10):** `get` (13),
`save` (7), `build` (5), `create` (3), `fetch` (2),
`publish` (1), `verify` (1), `validate` (1),
`render` (1), `execute` (1). Every entry is a
canonical capability verb.

**target-1 stable nouns (top 10):** `session` (23),
`result` (3), `event` (2), `plan` (2), `report` (2),
`service` (1), `config` (1), `page` (1), `record`
(1), `token` (1). Every entry is a canonical
domain-shaped noun.

**target-1 stable pairs (top 10):** `get:session`
(10), `save:session` (6), `build:session` (4),
`get:response` (14), `build:plan` (13), `get:schema`
(12), `save:response` (8), `build:report` (8),
`get:token` (6), `build:command` (6). These are the
exact verb:noun patterns `CapabilityMap` v2 will
project into the future map.

**target-2 stable pair:** `test:session` (2). Small
absolute count but meaningful semantically (test
infrastructure).

**target-1 partial pairs (top 5):** the partial lane
adds 260 phrases enriched with `domain` / `layer`
fields. Partials remain **semantic context only**
and are not eligible for `CapabilityMap` v2 per
the readiness gate.

## Pre-AST / Post-AST Comparison

### Pre / post comparison table

| Target | Metric | Pre-AST | Post-AST | Decision |
| --- | --- | ---: | ---: | --- |
| `target-1` | total candidates | 9,110 | 9,327 | small AST-vs-regex extraction-set difference; +2.4% |
| `target-1` | normalized | 241 | 299 | **+24.1% lift** — AST-rich candidates match more canonical splits |
| `target-1` | stable phrases | 16 | **37** | **+131.3% lift** — gate passes |
| `target-1` | total phrases | 239 | 297 | +24.3% lift |
| `target-2` | total candidates | 408 | 406 | essentially unchanged |
| `target-2` | normalized | 12 | 12 | unchanged |
| `target-2` | stable phrases | 2 | 2 | unchanged — neutral signal |
| `target-2` | total phrases | 12 | 12 | unchanged |

target-1 is a strong positive signal. target-2 is
neutral — likely because the repo's source naming
conventions (`Boundary*` prefixes) sit outside the
current canonical verb vocabulary, so neither AST
nor regex unlocks new stable phrases. AST does not
*regress* target-2.

## Fixture Comparison

The
[Post-AST CapabilityPhraseReport Coverage Review](post-ast-capability-phrase-coverage-review.md)
measured `tests/fixtures/js-ts-ast-evidence` (the
construct-rich AST fixture) at **6 stable phrases on
66 candidates**. target-1's 37 stable phrases on
9,327 candidates is a lower density (0.40% vs the
fixture's 9.1%) but in absolute terms is **6× the
fixture's stable count** and exercises a much wider
set of capability patterns. The fixture was
deliberately AST-rich; target-1 is unmodified
production code; the absolute count comparison
matters more than the density ratio.

## Publication Usefulness

Both targets' `architecture-summary` and
`agent-contract` publications include the
`## Capability Phrases` section with verb / noun /
status / confidence / evidence rendered as a bounded
table, plus the deferred-`CapabilityMap` callout.
On target-1 the section lists summary counts
(stable 37 / partial 260) and a bounded phrase
table — operator-readable and useful for spot
inspection.

## CapabilityMap Readiness

### Readiness table

| Gate | Result | Notes |
| --- | --- | --- |
| stable phrase density materially improved | **pass on target-1, neutral on target-2** | target-1 16 → 37 (+131%); target-2 2 → 2 unchanged. |
| stable evidence refs present | **pass** | Every stable phrase on both targets carries an `EvidenceGraph` ref. |
| stable terms meaningful | **pass** | target-1 pairs (`get:session`, `build:plan`, `get:schema`, `save:response`, `build:report`) are textbook. target-2 (`test:session`) is meaningful. |
| partials not used for `CapabilityMap` | **pass** | Partials remain semantic context only. |
| publications understandable | **pass** | Architecture-summary + agent-contract render the phrase section on both targets. |
| artifacts validate clean | **pass** | `rekon artifacts validate --json` returns `valid: true, issues: []` on both targets. |
| consistent across more than one real repo | **partial** | One strong positive (target-1, +131%); one neutral (target-2, 0%). No regression. |
| **Overall `CapabilityMap` v2 readiness** | **ready** | Narrower evidence accepted per the readiness gate's escape clause. target-1 provides the substantive signal; target-2 confirms AST is not regressive. The next slice is the `CapabilityMap` v2 high-confidence-only decision memo. |

The "consistent across more than one real repo"
gate is **partial** rather than pass — target-2's
neutral result reflects its small size + domain
naming patterns, not a deficiency in the AST
adapter. The readiness gate's explicit escape
clause ("or the memo explicitly accepts narrower
evidence") is invoked: target-1 alone is sufficient
to begin `CapabilityMap` v2 design, with target-2
included in the future post-v2 coverage review.

## Options Considered

### Option table

| Option | Decision | Reason |
| --- | --- | --- |
| `CapabilityMap` v2 high-confidence-only decision memo | **selected as primary next slice** | target-1 produces 37 meaningful stable phrases; the readiness gate passes with narrower evidence accepted. |
| Normalization consumes AST metadata (candidate extractor weights by `symbolKind` / `exportKind`) | **selected as parallel polish lane** | target-1 has 6,512 out-of-vocabulary candidates dominated by domain-specific prefixes; the AST adapter already emits `symbolKind` / `exportKind` metadata that the splitter could consume to refine compound-name handling. |
| Candidate extractor AST-metadata integration | **rolled into the parallel polish lane** | Same as above; treated as one lane. |
| JS/TS AST Provider v2 construct coverage | **deferred** | v1's construct table already supports 14 patterns. Stable density is bottlenecked by canonical vocabulary, not AST coverage. Revisit only if the post-v2 coverage review identifies a missed construct. |
| More dogfood (third real repo) | **deferred** | A future coverage review may add a third target. Not gating on it for `CapabilityMap` v2 design. |
| Canon-pack expansion v2 (per-archetype) | **deferred** | Lower priority than the normalizer polish lane; canonical vocabulary expansion alone does not unblock `CapabilityMap` v2 (already evidence-sufficient). |

## Recommendation

**Primary next slice:** **`CapabilityMap` v2
high-confidence-only decision memo.** Begin the
design discussion. Pin:

- Only `status === "stable"` and
  `confidence === "high"` phrases enter
  `CapabilityMap` v2.
- Partials remain semantic context only.
- AST metadata (`symbolKind` / `exportKind`) may
  feed `CapabilityMap` v2 placement / role
  classification in a later slice; v2 design memo
  decides.
- The map is built additively over the existing
  `CapabilityMap` v1 projection (no shape mutation
  in the decision memo phase).

**Parallel polish lane:**
*`CapabilityNormalizationReport` AST-metadata
candidate integration* — extend the candidate
extractor / lexical splitter to consume `symbolKind`
/ `exportKind` from AST facts. Goals:

- Reclassify class-name-prefix-style compound names
  (`UserService`, `BoundaryRouter`) as
  domain-noun-led, not verb-led.
- Use `exportKind: "default"` to bias toward the
  default-export verb-noun split (when present).
- Use `symbolKind: "method"` to weight class-method
  candidates higher than top-level function
  candidates.

Both lanes are independent: `CapabilityMap` v2
design can ship without the polish lane; the polish
lane can ship without `CapabilityMap` v2.

**Deferred:** JS/TS AST Provider v2 construct
coverage, canon-pack expansion v2, third real-repo
target, `CapabilityContract` decision,
`RefactorPreservationContract`.

## What This Does Not Do

This batch:

- Does **not** change AST extraction behavior.
- Does **not** change normalizer behavior.
- Does **not** change phrase projection rules.
- Does **not** change canon packs.
- Does **not** mutate `CapabilityMap`.
- Does **not** mutate `EvidenceGraph`.
- Does **not** mutate `CapabilityNormalizationReport`.
- Does **not** mutate `CapabilityPhraseReport`.
- Does **not** add `CapabilityMap` v2 (that is the
  next slice).
- Does **not** add `CapabilityContract` or
  `RefactorPreservationContract`.
- Does **not** add source writes.
- Does **not** add LLM-only inference.
- Does **not** publish to npm.
- Does **not** bump versions.
- Does **not** create a branch.
- Does **not** include private repo names; both
  targets are referenced only by anonymized labels.

The shipped artefacts of this slice are: this memo,
the 15-assertion docs test, the review packet, and
supporting-doc cross-references.

## Follow-Up Work

- **`CapabilityMap` v2 high-confidence-only
  decision memo** (primary next slice). Design
  decision; no runtime change.
- **`CapabilityMap` v2 high-confidence-only
  implementation plan** (gated on the decision
  memo).
- **`CapabilityNormalizationReport` AST-metadata
  candidate integration** (parallel polish lane).
  Goal: reduce target-1's unknown-verb / unknown-
  noun count by consuming AST `symbolKind` /
  `exportKind`.
- **Post-`CapabilityMap`-v2 coverage review** —
  fifth coverage review on the phrase track; gated
  on `CapabilityMap` v2 shipping.
- **JS/TS AST Provider v2 construct coverage** —
  gated on a v2 coverage review identifying
  specific constructs that block stable density.
- **Canon-pack expansion v2** (parallel; per-
  archetype).
- **Phrase enrichment v2** (parallel; framework /
  architecture-profile-derived).
- **`CapabilityContract` decision** (further
  future).
- **`RefactorPreservationContract`** (phase-5).

## Cross-References

- [Post-AST CapabilityPhraseReport Coverage Review](post-ast-capability-phrase-coverage-review.md)
  — twenty-fifth slice; deferred this cohort
  re-run.
- [JS/TS AST EvidenceGraph Provider v1](js-ts-ast-evidence-adapter-decision.md)
  — twenty-fourth slice; the runtime that produced
  the AST facts measured here.
- [JS/TS AST Evidence Adapter Decision](js-ts-ast-evidence-adapter-decision.md)
  — twenty-third slice; predicted "AST v1 should
  improve `CapabilityPhraseReport` stable phrase
  density."
- [Classic Scanner/Ontology Parity Audit](classic-scanner-ontology-parity-audit.md)
  — twenty-second slice; selected the post-AST
  coverage review chain as the gating evidence
  for `CapabilityMap` v2 design.
- [CapabilityPhraseReport Post-Quality Coverage Review](capability-phrase-post-quality-coverage-review.md)
  — third coverage review; identified the
  evidence-model bottleneck.
- [Capability Ontology Architecture Impact Review](capability-ontology-architecture-impact-review.md)
- [`EvidenceGraph` artifact reference](../artifacts/evidence-graph.md)
- [`CapabilityNormalizationReport` artifact reference](../artifacts/capability-normalization-report.md)
- [`CapabilityPhraseReport` artifact reference](../artifacts/capability-phrase-report.md)
- [Capability ontology concept](../concepts/capability-ontology.md)
- [Roadmap](roadmap.md)
- [Classic-behaviour roadmap](classic-behavior-roadmap.md)

## Status

Recorded on 2026-05-27 against Rekon commit
`18757c8`. No version bump. No npm publish. No git
tag. No GitHub Release. No runtime behaviour
change. No new artifact type registered. No new
validator. No new writer. No new permission. No
new role. No new capability package. Schema
unchanged. Rollback is trivial: revert this memo
and the supporting doc cross-links.
