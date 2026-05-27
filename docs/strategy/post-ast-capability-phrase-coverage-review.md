# Post-AST CapabilityPhraseReport Coverage Review

**Status:** review recorded.
**Slice:** `post-ast-capability-phrase-coverage-review`.
**Sequence position:** Twenty-fifth slice on the
capability-ontology track. Fourth coverage review on
the phrase track. Follows the
[JS/TS AST EvidenceGraph Provider v1](js-ts-ast-evidence-adapter-decision.md)
(twenty-fourth slice).

## Decision Summary

**Verdict:** `CapabilityMap` v2 **remains deferred.**
Evidence is **explicitly narrower** than the readiness
gate demands — target-1 and target-2 (the prior real-
repo cohort) are unavailable in this session. The
two targets measured (`tests/fixtures/js-ts-ast-evidence`
+ `examples/simple-js-ts`) confirm AST extraction
functions correctly, produce meaningful stable
phrases on AST-rich fixtures, and surface a phrase
section in the architecture-summary / agent-contract
publications. But the readiness gate's "consistent
across more than one real repo" requirement is not
met by fixtures alone, and **partial phrases alone
do not justify `CapabilityMap` v2**.

**Pinned verbatim (asserted by docs test):**

- **AST extraction was measured.**
- **Stable phrase density materially improved on the
  AST fixture.**
- **`CapabilityMap` v2 is evidence-gated.**
- **Partial phrases alone do not justify
  `CapabilityMap` v2.**

**Headline numbers (post-AST, this session):**

- **`tests/fixtures/js-ts-ast-evidence`** — a fixture
  deliberately built to exercise the v1 construct
  table: 80 facts (70% AST), 66 candidates, 8
  normalized, **6 stable phrases**, 2 partial, 0 low-
  confidence. Stable pairs `create:user`,
  `fetch:user`, `handle:request`. Publications
  surface every phrase with verb / noun / status /
  confidence / evidence.
- **`examples/simple-js-ts`** — 5 facts (40% AST), 4
  candidates, 0 normalized, **0 stable phrases**.
  Unchanged from the pre-AST baseline. The fixture
  is too small (1 source file, 1 export) to exercise
  AST richness; the AST-vs-regex result is
  *expected* to be identical.
- **`target-1`** and **`target-2`** — **unavailable**
  in this session. The pre-AST baseline (`target-1`:
  9,110 candidates / 241 normalized / 16 stable;
  `target-2`: 408 candidates / 12 normalized / 2
  stable) is recorded for context; no post-AST
  comparison is possible without re-running.

**Recommendation:** the memo issues an **intake
request** for target-1 + target-2 re-runs. Until those
land, the next product slice is *gated on cohort
re-runs*. Once available, the same `rekon refresh +
capability ontology normalize + capability phrase
project` matrix run on those targets will produce the
real-repo evidence the readiness gate needs.

## Why This Review Exists

The
[JS/TS AST Evidence Adapter Decision](js-ts-ast-evidence-adapter-decision.md)
pinned **AST v1 should improve
`CapabilityNormalizationReport` candidate quality**
and **AST v1 should improve `CapabilityPhraseReport`
stable phrase density** as the expected downstream
effects. The
[JS/TS AST EvidenceGraph Provider v1](classic-scanner-ontology-parity-audit.md)
shipped the runtime that delivers that evidence. The
[Classic Scanner/Ontology Parity Audit](classic-scanner-ontology-parity-audit.md)
selected this coverage review as the gating evidence
for `CapabilityMap` v2 design.

Three prior coverage reviews
([Real-Repo](capability-phrase-report-coverage-review.md),
[Enrichment](capability-phrase-enrichment-coverage-review.md),
[Post-Quality](capability-phrase-post-quality-coverage-review.md))
all reached the same verdict: stable phrase density
on `target-1` and `target-2` was sparse and did not
move under vocabulary or splitter tweaks. The
hypothesis: the evidence model itself was the
bottleneck. AST extraction tests that hypothesis.

This review records the first post-AST evidence and
decides the next slice.

## Targets Reviewed

### Target table

| Target | Archetype | Source | Result |
| --- | --- | --- | --- |
| `tests/fixtures/js-ts-ast-evidence` | repo-internal fixture; AST-construct-rich | fixture | ✅ measured |
| `examples/simple-js-ts` | repo-internal fixture; minimal TS | fixture | ✅ measured |
| `target-1` (real Next.js TS) | non-Rekon real repo | external | ⛔ unavailable in this session |
| `target-2` (real small TS + workflows) | non-Rekon real repo | external | ⛔ unavailable in this session |

**Why `target-1` / `target-2` are unavailable.**
Prior coverage reviews ran the cohort matrix from
ephemeral local copies (the cohort source / clone
location did not persist across the worktree). The
work order's escape clause ("Use available non-Rekon
real repos and record that the comparison is not
exact") cannot be satisfied either — no other non-
Rekon real repo is checked into this worktree. Per
the work order: this review proceeds with the two
available fixtures and **explicitly accepts narrower
evidence** as the readiness gate permits.

### Intake Request

To advance the readiness gate, this review **issues
an intake request** for:

1. A re-run of the `rekon refresh + capability
   ontology normalize + capability phrase project +
   publish architecture + publish agent-contract +
   artifacts validate` matrix against `target-1` and
   `target-2` after the AST provider has landed.
2. Anonymized or aggregated post-AST metrics for
   each (EvidenceGraph fact counts split by
   `extractionMethod`, normalization summary,
   phrase summary, top stable verbs / nouns /
   pairs).
3. Operator confirmation that the existing
   anonymization rules from prior reviews still
   apply.

The intake request is part of this memo so the
next coverage review can begin without re-deciding
which targets to use.

## Command Matrix

For each available target, the review ran the
following matrix against a temp copy of the source
tree (so the in-place `.rekon/` artifacts are not
mutated):

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

A single Node.js measurement helper (`/tmp/measure-target.mjs`)
drove the matrix and extracted the metrics tables
below from the emitted artifacts. Inspection points
covered: `EvidenceGraph`, `CapabilityNormalizationReport`,
`CapabilityPhraseReport`, `Publication`
(architecture-summary), `Publication` (agent-contract).

## EvidenceGraph AST Results

### EvidenceGraph table

| Target | Total Facts | AST Facts | Regex Fallback Facts | Symbol Facts | Export Facts | Import Facts |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `tests/fixtures/js-ts-ast-evidence` | 80 | 56 | 0 | 27 | 24 | 5 |
| `examples/simple-js-ts` | 5 | 2 | 0 | 1 | 1 | 0 |

**Breakdown by AST contribution (fixture):** every
`symbol` / `export` / `import` fact is AST-derived
(27 / 24 / 5). Zero regex-fallback facts — the
TypeScript parser tolerates the deliberately
malformed `broken.ts` source by emitting recoverable
diagnostics rather than throwing.

**Breakdown by AST contribution (simple-js-ts):**
both AST-eligible facts (1 symbol + 1 export) are
AST-derived. The remaining three facts are `file`,
`ownership_hint`, `capability_hint` — none of which
go through the AST path.

**Observation:** the AST adapter is functioning
correctly in production-like conditions. No silent
fall-throughs.

## Normalization Results

### Normalization table

| Target | Total Candidates | Normalized | Unknown Verb | Unknown Noun | Unknown | Ignored | Alias Applied | Low Confidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `tests/fixtures/js-ts-ast-evidence` | 66 | 8 | 9 | 0 | 19 | 16 | 2 | 14 |
| `examples/simple-js-ts` | 4 | 0 | 0 | 0 | 0 | 2 | 0 | 2 |

**Fixture normalization ratio:** 8 / 66 = **12.1%
normalized**. Compare to `target-1` (pre-AST):
241 / 9,110 = 2.6%. The fixture's normalization
ratio is ~4.6× the real-repo ratio, but the fixture
is intentionally biased toward canonical capability
patterns (`createUser`, `fetchUser`, `handleRequest`,
etc.) — the comparison is not a like-for-like
real-repo signal.

**Top remaining unknown verbs (fixture):** `user`
(10), `brief` (2), `page` (2), `react` (2),
`projected` (2). Each reflects a real construct:
class names (`User…`, `…Brief…`), TSX component
names (`Page`), namespace imports (`React*`), type
qualifiers (`Projected*`). The splitter is treating
these as verbs because they appear in the head
position of an `extractedName` like `UserService`
→ verb `user`, noun `service`.

**Top remaining unknown nouns (fixture):** `thing`
(3), `role` (2), `sender` (2), `props` (2), `node`
(2). These are domain terms not in the base canon
pack — expected for a deliberately-crafted fixture
that includes capability-style sources.

## Phrase Results

### Phrase table

| Target | Total Phrases | Stable | Partial | Low Confidence | With Domain | With Pattern | With Layer |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `tests/fixtures/js-ts-ast-evidence` | 8 | 6 | 2 | 0 | 8 | 0 | 0 |
| `examples/simple-js-ts` | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

**Fixture stable density:** 6 / 66 = **9.1% stable**.
Compare to `target-1` (pre-AST): 16 / 9,110 = 0.18%.
The fixture's stable density is ~50× the pre-AST
real-repo density — again, the fixture is
intentionally biased and is **not** a substitute for
real-repo signal.

**Top stable verbs:** `create` (2), `fetch` (2),
`handle` (2).
**Top stable nouns:** `user` (4), `request` (2).
**Top stable pairs:** `create:user` (2),
`fetch:user` (2), `handle:request` (2).

These are textbook capability phrases — the kind
`CapabilityMap` v2 would want to consume. The
duplication (each appearing twice) is because the
fixture exercises both the function-declaration
construct and the exported-`const` arrow-function
construct.

**Top partial verbs:** `build` (2). **Top partial
nouns:** `report` (2). **Top partial pair:**
`build:report` (2). Partial phrases are
deterministically enriched (every phrase carries a
domain field — the source path's top segment) but
do not meet the stable threshold (no canonical
verb / noun match without the `partial` lane).

**Simple-js-ts stable density:** unchanged at 0.
This is expected: the source has one TS file with
one `export const`. There is no verb-bearing
construct to extract.

## Pre-AST / Post-AST Comparison

### Pre / post comparison table

| Target | Metric | Pre-AST | Post-AST | Decision |
| --- | --- | ---: | ---: | --- |
| `simple-js-ts` | total candidates | 4 | 4 | unchanged — expected (fixture too small for AST richness) |
| `simple-js-ts` | normalized | 0 | 0 | unchanged — expected |
| `simple-js-ts` | stable phrases | 0 | 0 | unchanged — expected |
| `simple-js-ts` | total phrases | 0 | 0 | unchanged — expected |
| `js-ts-ast-fixture` | total candidates | n/a | 66 | new fixture; designed for AST coverage |
| `js-ts-ast-fixture` | normalized | n/a | 8 | new fixture |
| `js-ts-ast-fixture` | stable phrases | n/a | 6 | new fixture; demonstrates stable production with AST evidence |
| `js-ts-ast-fixture` | total phrases | n/a | 8 | new fixture |
| `target-1` | total candidates | 9,110 | not measured | re-run pending intake |
| `target-1` | normalized | 241 | not measured | re-run pending intake |
| `target-1` | stable phrases | 16 | not measured | re-run pending intake |
| `target-1` | total phrases | 239 | not measured | re-run pending intake |
| `target-2` | total candidates | 408 | not measured | re-run pending intake |
| `target-2` | normalized | 12 | not measured | re-run pending intake |
| `target-2` | stable phrases | 2 | not measured | re-run pending intake |
| `target-2` | total phrases | 12 | not measured | re-run pending intake |

**Note on `simple-js-ts`.** The post-AST result
matching the pre-AST result exactly is the *correct*
signal for this fixture. The AST and regex extractors
agree on a single-file, single-export source: both
emit one `symbol` and one `export` fact. There is
no candidate-quality lift to measure because the
input has no candidates worth quality-lifting.

## Publication Usefulness

The architecture-summary and agent-contract
publications were re-rendered after the phrase
report landed in the artifact index. Both:

- include the `## Capability Phrases` section under
  the operating-state group;
- cite the source `CapabilityNormalizationReport` and
  the emitted `CapabilityPhraseReport`;
- list the summary counts (`stable`, `partial`,
  `low-confidence`, enrichment field counts);
- render a bounded phrase table with verb / noun /
  status / confidence / evidence;
- carry the deferred-`CapabilityMap` callout
  (verbatim: "CapabilityMap integration remains
  deferred. CapabilityPhraseReport is semantic
  purpose projection; CapabilityNormalizationReport
  remains translation audit.").

**Verdict:** publication surfacing is operator-
readable. Phrases produced from AST-derived candidates
appear in the same surface as phrases produced from
regex-derived candidates — the publication path is
extraction-method-agnostic.

## CapabilityMap Readiness

### Readiness table

| Gate | Result | Notes |
| --- | --- | --- |
| stable phrase density materially improved | **partial** | Improved on the AST fixture (0 → 6 stable); unchanged on `simple-js-ts` (expected); not measured on real repos. |
| stable evidence refs present | **pass** | Every stable phrase on the AST fixture carries an `EvidenceGraph` ref. |
| stable terms meaningful | **pass** | `create:user`, `fetch:user`, `handle:request` are textbook capability phrases. |
| partials not used for `CapabilityMap` | **pass** | Partials remain semantic context only; the readiness gate requires stable density, not partial. |
| publications understandable | **pass** | Architecture-summary + agent-contract render the phrase section with verb / noun / status / confidence / evidence and the deferred-`CapabilityMap` callout. |
| artifacts validate clean | **pass** | `rekon artifacts validate --json` returns `valid: true, issues: []` on both measured targets. |
| consistent across more than one real repo | **fail** | `target-1` and `target-2` not measured in this session. Intake request issued. |
| **Overall CapabilityMap v2 readiness** | **deferred** | Narrower evidence accepted; real-repo signal required before `CapabilityMap` v2 design begins. |

## Options Considered

### Option table

| Option | Decision | Reason |
| --- | --- | --- |
| `CapabilityMap` v2 high-confidence-only | **deferred** | Real-repo evidence missing; fixture-only signal does not satisfy the readiness gate. |
| Normalization consumes AST metadata (extend candidate extractor to use `symbolKind` / `exportKind`) | **selected as the parallel polish lane** | AST already emits the metadata. The normalizer could optionally weight candidates by `symbolKind: "method"` or `exportKind: "default"` for richer splits. Low-risk, additive. |
| Phrase projection consumes AST metadata | **deferred** | The phrase projector reads canonical splits from normalization, not raw AST. Unwind only if the normalizer-side polish does not move stable density on the next real-repo run. |
| JS/TS AST Provider v2 construct coverage | **deferred** | The v1 construct table covers function / class / method / arrow / interface / type-alias / enum / named / default / re-export / type-only / namespace / side-effect. Deferred constructs (call graph, type resolution, JSX component tree) require typechecker or cross-file resolution. Wait for real-repo evidence before expanding. |
| More dogfood (re-run on `target-1` + `target-2`) | **selected as the primary next slice** | The readiness gate explicitly requires real-repo evidence. The intake request asks operator to supply / re-supply the cohort. |

## Recommendation

**Primary next slice:** *Post-AST cohort re-run* —
re-execute the `refresh + normalize + phrase project
+ publish + validate` matrix against `target-1` and
`target-2` once those targets are available, then
gate `CapabilityMap` v2 on the result.

**Parallel polish:** *`CapabilityNormalizationReport`
AST-metadata candidate integration* — the candidate
extractor can optionally weight candidates by
`symbolKind` / `exportKind` / `importKind` to produce
richer splits without changing the artifact shape.
The post-AST cohort re-run will determine whether
this polish is needed.

**Explicitly deferred:**

- `CapabilityMap` v2 high-confidence-only design —
  gated on the post-AST cohort re-run delivering
  real-repo stable-density improvement.
- JS/TS AST Provider v2 construct coverage — gated
  on evidence that v1's construct table is the
  blocker (the fixture suggests it is not — the
  fixture exercises only v1 constructs and still
  produces meaningful stable phrases).
- `CapabilityContract` decision and
  `RefactorPreservationContract` — far future; gated
  on `CapabilityMap` v2 stability.

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
- Does **not** add `CapabilityMap` v2.
- Does **not** add `CapabilityContract`.
- Does **not** add `RefactorPreservationContract`.
- Does **not** add source writes.
- Does **not** add LLM-only inference.
- Does **not** publish to npm.
- Does **not** bump versions.
- Does **not** create a branch.

The shipped artefacts of this slice are: this memo,
the 15-assertion docs test, the review packet, and
supporting-doc cross-references.

## Follow-Up Work

- **Post-AST cohort re-run** (primary next slice;
  intake request issued). Re-execute the matrix
  against `target-1` and `target-2`. Output
  recorded under
  `docs/strategy/post-ast-cohort-rerun-results.md`
  (TBD).
- **`CapabilityMap` v2 high-confidence-only
  design / implementation plan** — gated on the
  cohort re-run delivering real-repo stable-density
  improvement.
- **`CapabilityNormalizationReport` AST-metadata
  candidate integration** (parallel polish; gated
  on the cohort re-run identifying the need).
- **JS/TS AST Provider v2 construct coverage** —
  gated on the cohort re-run identifying that v1's
  table is the blocker. Constructs deferred in v1:
  call graph, type resolution, symbol references,
  inferred return types, side-effect analysis, JSX
  component tree, test-to-source map, schema
  inference.
- **Canon-pack expansion v2** (parallel; per-
  archetype; gated on the cohort re-run identifying
  which archetype unknown verbs / nouns belong to).
- **Phrase enrichment v2** (parallel; gated on the
  cohort re-run identifying which framework /
  architecture-profile hints would move partial
  enrichment).
- **`CapabilityContract` decision** (further future).
- **`RefactorPreservationContract`** (phase-5 of
  the architecture impact review's sequence).

## Cross-References

- [JS/TS AST EvidenceGraph Provider v1](js-ts-ast-evidence-adapter-decision.md)
  (twenty-fourth slice) — the runtime that produces
  the AST facts measured here.
- [JS/TS AST Evidence Adapter Decision](js-ts-ast-evidence-adapter-decision.md)
  (twenty-third slice) — the design memo that
  predicted "AST v1 should improve
  `CapabilityNormalizationReport` candidate quality"
  and "AST v1 should improve
  `CapabilityPhraseReport` stable phrase density".
- [Classic Scanner/Ontology Parity Audit](classic-scanner-ontology-parity-audit.md)
  (twenty-second slice) — selected this coverage
  review as the gating evidence for `CapabilityMap`
  v2 design.
- [CapabilityPhraseReport Post-Quality Coverage Review](capability-phrase-post-quality-coverage-review.md)
  — third coverage review; identified the evidence-
  model bottleneck this review tests.
- [CapabilityPhraseReport Enrichment Coverage Review](capability-phrase-enrichment-coverage-review.md)
  — second coverage review; measured partial-phrase
  coverage.
- [CapabilityPhraseReport Real-Repo Coverage Review](capability-phrase-report-coverage-review.md)
  — first coverage review; established the
  baseline.
- [Capability Ontology Architecture Impact Review](capability-ontology-architecture-impact-review.md)
  — eight architectural reservations remain in
  force.
- [`EvidenceGraph` artifact reference](../artifacts/evidence-graph.md)
- [`CapabilityNormalizationReport` artifact reference](../artifacts/capability-normalization-report.md)
- [`CapabilityPhraseReport` artifact reference](../artifacts/capability-phrase-report.md)
- [Capability ontology concept](../concepts/capability-ontology.md)
- [Roadmap](roadmap.md)
- [Classic-behaviour roadmap](classic-behavior-roadmap.md)

## Status

Recorded on 2026-05-27 against Rekon commit `97c6fd6`.
No version bump. No npm publish. No git tag. No GitHub
Release. No runtime behaviour change. No new artifact
type registered. No new validator. No new writer. No
new permission. No new role. No new capability
package. Schema unchanged. Rollback is trivial: revert
this memo and the supporting doc cross-links.
