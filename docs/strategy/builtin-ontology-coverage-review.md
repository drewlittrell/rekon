# Built-In Baseline Ontology Coverage Review

**Status:** v1 review shipped.
**Audience:** capability authors, operators, contributors evaluating the ontology track.
**Scope:** evaluates the built-in capability ontology baseline (Layer 1 of the layered ontology decision) against real `CapabilityNormalizationReport` output, then decides whether the baseline is sufficient for private beta and whether `CapabilityMap` integration (Layer 6) can proceed.

This memo is **analysis / docs / tests only**. It does **not** change the built-in vocabulary, the lexical splitter, the normalizer, the artifact shape, or the CLI.

## Decision Summary

- The built-in baseline vocabulary is **acceptable for audit-only v1**. `CapabilityNormalizationReport` correctly surfaces unknown and low-confidence rows for operator review.
- The built-in baseline is **not sufficient for `CapabilityMap` v2** in its current form. Real-target unknowns are dominated by **symbol noise + poor lexical split** rather than vocabulary gap. A pure vocabulary expansion would not move the needle enough to make a downstream projection trustworthy.
- The next implementation slice is **Option C — capability ontology unknown-term operator review surface**. Vocabulary expansion (Option A) follows, gated on the operator review surface's output. `CapabilityMap` v2 (Option B) remains deferred.
- **Source-write apply remains unavailable across this track.**

## Why This Review Exists

`CapabilityNormalizationReport` v1 shipped behind `rekon capability ontology normalize`. The translation-layer decision committed to "vocabulary expansion gated on operator review," and the implementation-sequence table called out **built-in baseline ontology coverage review** as step 4 of the eight-step ontology track.

Before any downstream projection of normalized verb/noun claims into `CapabilityMap` v2, Rekon needs evidence-based answers to:

- Is the built-in baseline rich enough for real-world repos?
- Are unknown / low-confidence rates a vocabulary problem or a lexical-split / candidate-extraction problem?
- Should `CapabilityMap` v2 consume normalized claims today, or wait for a coverage iteration?

This memo answers those questions against a real Next.js TypeScript application.

## Targets Reviewed

| Target | Archetype | Source | Result |
| --- | --- | --- | --- |
| `simple-js-ts` | fixture (single TS file) | `examples/simple-js-ts` (in-repo) | Normalization ran; 4 candidates total. |
| `target-1` | real-world Next.js TypeScript application | mktemp copy of an operator-controlled repo (anonymized) | Normalization ran; 9,110 candidates total. |

`target-1` is anonymized per the private-beta intake policy. Repo identity, file paths, and source excerpts are intentionally not reproduced here. Counts and term shapes are sufficient for the coverage decision.

## Normalization Results

| Target | Total | Normalized | Unknown Verb | Unknown Noun | Unknown | Ignored | Alias Applied | Low Confidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `simple-js-ts` | 4 | 0 | 0 | 0 | 1 | 1 | 0 | 2 |
| `target-1` | 9,110 | 100 | 578 | 594 | 5,558 | 226 | 561 | 2,054 |

Both runs used `ontology.source = "builtin"` (no operator config). The effective ontology hash matched across both runs (`13b26c3b4334a3d2`), confirming the baseline is deterministic.

On `target-1`:

- Normalized rate: **1.1%** (100 / 9,110).
- Alias-applied rate: **6.2%** (561 / 9,110) — aliases are reaching candidates, but the underlying noun gap dominates.
- Ignored: **2.5%** (226 / 9,110) — every `ownership_hint` candidate (one per file with an extracted ownership system) is correctly skipped from verb/noun normalization in v1.
- Unknown (both verb + noun unrecognized): **61%** (5,558 / 9,110). This is the dominant signal.
- Low-confidence (single-token name, no verb/noun pair): **22.5%** (2,054 / 9,110).

On `simple-js-ts`:

- The fixture has a single exported greeter (`greet`) plus the ownership / capability hint. The `low-confidence` outcome for `greet` is correct — it is one token, so the splitter cannot infer a verb/noun pair.

## Unknown Term Analysis

Top "raw verb" tokens on `target-1` (lexical-split first token, across all candidates):

```text
figma   1163     normalize  112    bridge   78
build    240     family     106    handle   77
app      155     core       100    ...
is       151     src         94
token    113     normalized  93
```

Top fully-unknown verb/noun pairs (status: `"unknown"`):

```text
figma/schema    495     core/ts        50     family/schema   24
figma/command   140     src/ts         44     figma/outline   24
app/ts           59     figma/service  32
figma/snapshot   52     token/schema   26
core/ts          50     normalize/name 26
```

Top unknown verbs (status: `"unknown-verb"` — the noun resolved):

```text
figma    162     normalized  9     manifest  8
attach    18     start       9
resolve   13     normalize   9
```

Top unknown nouns (status: `"unknown-noun"` — the verb resolved):

```text
schema  40     plan   17     value     14
id      34     prompt 18     number    12
name    23     key    20     ms        11
```

Top low-confidence single-token names (sample):

```text
runtime 57     parsed     35     existing 21     OPTIONS 46
dynamic 56     service    34     body     19     POST    40
result  53     normalized 25     candidates 19   GET     24
```

## Low-Confidence Analysis

Low-confidence rows (single-token names) on `target-1` decompose into three distinct populations:

1. **HTTP method constants** (`GET`, `POST`, `OPTIONS`, `PUT`, `DELETE`). These are runtime exports from Next.js route handlers, not capabilities. They are symbol noise.
2. **Internal state / variable names** (`result`, `parsed`, `body`, `existing`, `candidates`, `service`). These are intermediate computations, not declarations of repo capability.
3. **Single-word capability names** (`runtime`, `dynamic`, `normalized`). A real fraction of these *are* capabilities but the lexical splitter cannot resolve verb/noun from a one-token name. The translation-layer decision explicitly committed to "single-token names → low-confidence."

Low-confidence is therefore behaving exactly as the decision memo specified. The audit report flags them so the operator can decide whether to extend the ontology or rename the source symbol.

## Cause Table

| Cause | Evidence on `target-1` | Decision |
| --- | --- | --- |
| Vocabulary gap (real but moderate) | Top unknown verbs `attach`, `resolve`, `normalize`, `start`, `compile`, `manifest`. Top unknown nouns `schema`, `id`, `key`, `prompt`, `plan`, `value`, `signature`, `number`, `ms`. | Defer baseline expansion until the operator review surface (Option C) reaches a steady state. Then expand vocabulary using observed unknown-term frequency, not guesses. |
| Poor lexical split for proper-noun-prefixed identifiers | "FigmaSchema" → `verb="figma" noun="schema"` (495 occurrences). The splitter treats the leading token as the verb regardless of semantics. | Documented as a known limitation. The lexical splitter improvement is a separate slice; do not attempt it in this batch. |
| Poor lexical split for path-shaped capability hints | `capability_hint` facts whose name equals the file path (`src/index.ts`) produce `verb="src" noun="ts"`. ~226 candidates on `target-1`. | Future slice: tighten `capability_hint` fact construction or skip path-only hints during candidate extraction. Track as follow-up. |
| Symbol noise (HTTP method exports, internal variables, constants) | `OPTIONS`, `POST`, `GET`, `parsed`, `body`, `existing`. ~250+ candidates. | Audit-only v1 surfaces these as low-confidence — correct behaviour. Filter heuristics should land **after** the operator review surface ships. |
| `ownership_hint` symbol noise | Every file contributes one ownership-hint candidate; classified `ignored`. 226 on `target-1`. | Correct behaviour today. v2 may project ownership into a separate role-level surface. |
| EvidenceGraph fact-shape issues | None blocking. Symbol / export / hint shapes are deterministic and match the artifact reference. | No change. |

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| **A. Expand the built-in baseline vocabulary now** | Deferred | The unknown set is dominated by noise, not vocabulary gap. A blind expansion would inflate the canonical set without addressing the real cause. |
| **B. Ship `CapabilityMap` v2 with a high-confidence-only gate** | Deferred | The high-confidence yield (normalized = 100 of 9,110, plus 561 alias-applied) is too sparse to make a useful map on `target-1`. Projection today would create the impression of completeness when 61% of candidates are unknown. |
| **C. Capability ontology unknown-term operator review surface** | **Recommended next slice** | Lets the operator review top unknown verbs / nouns from a real `CapabilityNormalizationReport`. Drives evidence-based vocabulary expansion (Option A) and gates `CapabilityMap` v2 (Option B). Matches the implementation-sequence step 7 in the translation-layer decision. |

## Baseline Sufficiency Decision

- **Audit-only v1:** baseline is **sufficient**. Unknown and low-confidence rows surface for operator review. No downstream projection. No silent finding mutation. No source-write apply.
- **`CapabilityMap` v2 readiness:** baseline is **not sufficient yet**. The dominant cause of unknown rows is symbol noise + lexical split limitations, not pure vocabulary gap. A `CapabilityMap` projection layered on the current outcome would either:
  1. Project low-coverage claims (1.1% normalized) — misleading completeness; or
  2. Project alias-applied + normalized (≈ 7.3%) — still misleading, and would silently mix proper noun prefixes ("Figma…") into canonical verbs.

The right gate before `CapabilityMap` v2 is **either** (a) operator review that drives a targeted vocabulary + splitter iteration, **or** (b) a high-confidence definition that excludes single-token, path-shaped, and proper-noun-prefixed outcomes. Option C produces the evidence to make that decision deterministically.

## CapabilityMap Readiness

- **Not ready in this batch.** `CapabilityMap` v2 remains deferred.
- The translation-layer decision pinned "do not flatten the ontology into a single config / report layer." This review preserves the layered model — `CapabilityNormalizationReport` is the audit surface; `CapabilityMap` is the projection surface; the two stay separate.
- `CapabilityMap` v2 will land **only after** the operator review surface produces ≥ one iteration of operator-approved baseline updates against real targets.

## What This Does Not Do

- Does not change the built-in baseline vocabulary.
- Does not change the lexical splitter.
- Does not change the normalizer.
- Does not change `CapabilityNormalizationReport` shape.
- Does not change the `rekon capability ontology normalize` CLI.
- Does not register a `CapabilityOntology` artifact.
- Does not add `RefactorPreservationContract`.
- Does not mutate `EvidenceGraph`.
- Does not mutate `CapabilityMap`.
- Does not write any source file.
- Does not publish to npm.
- Does not bump versions.

## Follow-Up Work

In priority order:

1. **Capability ontology unknown-term operator review surface (Option C).** New CLI + artifact (working title: `CapabilityNormalizationReviewLedger` — name reserved, registration deferred). Lets operators triage top unknown verbs / nouns into one of: "extend ontology," "rename symbol," "noise — filter," "defer."
2. **Built-in ontology vocabulary expansion v1 (Option A).** Driven by Option C's output. Adds verbs / nouns / aliases observed at frequency ≥ N across reviewed targets.
3. **Lexical splitter v2.** Address proper-noun-prefixed identifiers (e.g. "FigmaSchema") and path-shaped capability hints. Strictly deterministic.
4. **`CapabilityMap` normalized claims v2 with high-confidence-only gate (Option B).** Gated on (1) + (2) reaching steady state. Excludes single-token outcomes, path-shaped outcomes, and proper-noun-prefixed outcomes.
5. **`RefactorPreservationContract`** (Layer 7). Far-future. Not in scope for any near-term batch.

## See Also

- [Capability Ontology Translation Layer Decision](capability-ontology-translation-layer-decision.md)
- [Capability Ontology Architecture Impact Review](capability-ontology-architecture-impact-review.md)
- [`CapabilityNormalizationReport` artifact reference](../artifacts/capability-normalization-report.md)
- [`CapabilityNormalizationReviewLedger` artifact
  reference](../artifacts/capability-normalization-review-ledger.md)
  — append-only operator review surface shipped as the
  follow-up to this memo (Option C).
- [Capability ontology concept](../concepts/capability-ontology.md)
- [Roadmap](roadmap.md)
- [Classic-behaviour roadmap](classic-behavior-roadmap.md)
