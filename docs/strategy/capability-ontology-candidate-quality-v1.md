# Capability Ontology Candidate-Quality Improvements v1

**Status:** v1 implementation memo. Product capability
batch. **No `CapabilityMap` mutation. No
`CapabilityPhraseReport` shape change. No phrase
projection rule change. No `CapabilityNormalizationReport`
semantics change. No `EvidenceGraph` mutation. No new
artifact registration. No new CLI command. No source
reads. No AST / typechecker / LLM evidence. No source
writes. No npm publish. No version bump. No git tag. No
GitHub Release. No new branch.**

**Audience:** future canon-pack expansion / lexical-
splitter / phrase-quality slices; the post-quality
coverage review; `CapabilityMap` v2 decision.

**Companion docs:**

- [Enrichment Coverage Review](capability-phrase-enrichment-coverage-review.md)
  — the review that selected this slice.
- [Phrase Enrichment v1 Memo](capability-phrase-enrichment-v1.md)
- [CapabilityPhraseReport Safety Review](capability-phrase-report-safety-review.md)
- [Capability Ontology Canon + Override Model Decision](capability-ontology-canon-override-model-decision.md).

## Decision Summary

**Candidate-quality improvements v1** is shipped. Two
deterministic improvements land:

1. **Canon-pack confirmation** — the four observed
   high-frequency partial-only nouns (`schema`,
   `request`, `response`, `plan`) and three observed
   verbs (`save`, `get`, `build`) are confirmed already
   canonical in the base pack. No new canonical entries
   are added; no duplicates are introduced.
2. **Lexical splitter sharpening** — the splitter now
   emits a structural `kind` hint (`"name"` or `"path"`)
   on its output. Path-shaped names (containing `/` or
   bare file extensions like `.tsx`) are flagged as
   `"path"`; the normalizer classifies them as
   `ignored` rather than `unknown`, reducing audit
   noise without inventing capability claims. The
   normalizer also recognizes single-token names that
   are themselves canonical nouns (e.g. `Schema`,
   `Request`, `Response`, `Plan`) and emits a precise
   `low-confidence` message ("Known noun \"X\" without
   a verb; insufficient for a capability phrase")
   instead of the generic "Lexical split did not yield
   both a verb and a noun."

Pinned verbatim (the docs test asserts these):

- **Candidate-quality improvements are deterministic.**
- **Canon-pack additions are evidence-backed.**
- **Lexical splitter sharpening reduces noise.**
- **Noun-only candidates do not become phrases.**
- **Stable phrase threshold remains unchanged.**
- **`CapabilityMap` integration remains deferred.**

Measured impact on `target-1` (the real anonymized
Next.js TypeScript target from the enrichment coverage
review):

| Status | Pre | Post | Delta |
| --- | ---: | ---: | --- |
| `unknown` | 4,088 | **3,865** | −223 |
| `ignored` | 226 | **449** | +223 |
| `normalized` | 241 | 241 | unchanged |
| `lowConfidence` | 2,054 | 2,054 | unchanged |
| `aliasApplied` | 524 | **597** | +73 |
| Stable phrases | 16 | **16** | unchanged |
| Total phrases | 239 | **239** | unchanged |

**Audit noise dropped** (223 path-shaped candidates
moved from `unknown` to `ignored`), the stable phrase
count is preserved, and the partial phrase count is
preserved. No phrases were invented by either change.

## Status Model

Unchanged. `CapabilityNormalizationReport` still emits:

- `normalized` — verb + noun both in the effective
  ontology.
- `unknown-verb` — noun matches; verb does not.
- `unknown-noun` — verb matches; noun does not.
- `unknown` — neither matches.
- `ignored` — non-projectable candidate (path noise,
  ownership hint, file-extension fragment).
- `low-confidence` — split did not yield enough signal
  (e.g. single token without a verb).

`CapabilityPhraseReport` still emits:

- `stable` — strictest threshold (normalized + high
  confidence + high split). **Unchanged.**
- `partial` — semantic context only (medium-or-better
  confidence + at least one deterministic enrichment
  field present). **Unchanged.**
- `low-confidence` — reserved; not emitted in v1.

## Canon-Pack Changes

The four observed-frequent target nouns and three
verbs are already canonical in the **base** pack:

| Token | Kind | Already canonical? | Category |
| --- | --- | :-: | --- |
| `schema` | noun | ✅ base | `data` |
| `request` | noun | ✅ base | `infrastructure` |
| `response` | noun | ✅ base | `infrastructure` |
| `plan` | noun | ✅ base | `process` |
| `save` | verb | ✅ base | `write` |
| `get` | verb | ✅ base | `read` |
| `build` | verb | ✅ base | `create` |

**No new canonical entries are added.** This is
intentional: every observed-frequent token already has
canonical coverage. The contract test pins that all
four nouns are present in base and that no canon pack
introduces duplicates.

Future canon-pack slices may add aliases or per-archetype
overlays (e.g. nextjs-app-specific terms) — those land
behind their own decision memos.

## Splitter Changes

`splitCapabilityName` now returns an extra `kind` field
of type `CapabilityNameSplitKind = "name" | "path"`.
The path detection rule is deterministic:

```ts
function looksLikePath(name: string): boolean {
  if (name.includes("/")) return true;        // src/index.ts, app/api/route.ts
  if (/^\.[a-z0-9]+$/i.test(name)) return true; // .ts, .tsx, .js
  return false;
}
```

Path-shaped inputs still tokenize (so the audit report
can show what was attempted) — the regex now treats `/`
as a delimiter the same as `.` and `_` — but the
splitter labels the result with `kind: "path"`.

`CapabilityCandidate.raw.splitKind` propagates the
splitter hint. It's optional on the candidate type so
older artifacts and producers that didn't surface it
continue to validate.

## Normalizer Changes

Two new branches in `normalizeOneCandidate`, both
**before** the existing verb/noun lookup branches:

1. **Path-shaped candidates** — `if (candidate.raw.splitKind === "path")` →
   `status: "ignored"`, `message: "Path-shaped
   candidate; not a capability identifier."` This
   reclassifies what was previously `unknown` (or
   `low-confidence` for bare extensions) so the audit
   report distinguishes path noise from genuine
   vocabulary gaps.
2. **Single-token known noun** — when the lexical split
   produced a single token (`verbRaw` set, `nounRaw`
   missing) and that token is a canonical noun (or noun
   alias), the normalizer returns `status:
   "low-confidence"` with the precise message
   `Known noun "X" without a verb; insufficient for a
   capability phrase.` and populates `normalized.noun`
   with the canonical noun. **It does not populate a
   canonical verb** — there is no verb to claim.

These changes are non-mutating and strictly opt-in:
candidates that don't match either branch continue
through the existing branches unchanged. The stable
phrase eligibility rule (`status === "normalized"` +
`confidence === "high"` + `splitConfidence === "high"`)
is unchanged.

## Stable Threshold

Unchanged. `CapabilityPhraseReport` emits a phrase as
`stable` only when:

- `candidate.status === "normalized"`,
- `candidate.confidence === "high"`,
- `candidate.raw.splitConfidence === "high"`.

The new splitter `kind` hint does **not** affect the
stable threshold. Path-shaped candidates can never
reach `normalized` (they're classified `ignored`), so
they can never become stable phrases. Noun-only
candidates can never reach `normalized` (they're
classified `low-confidence` with no verb), so they can
never become stable phrases either.

## What This Does Not Do

- Does **not** mutate `CapabilityMap`.
- Does **not** add `CapabilityMap` v2.
- Does **not** add `CapabilityContract` or
  `RefactorPreservationContract`.
- Does **not** change phrase enrichment rules.
- Does **not** change `CapabilityPhraseReport` status
  semantics.
- Does **not** add canonical terms beyond what's already
  in the base pack.
- Does **not** add architecture linting or resolver
  routing.
- Does **not** use AST / typechecker evidence.
- Does **not** use LLM-only inference.
- Does **not** read source files.
- Does **not** add source writes. **Source writes
  remain unavailable.**
- Does **not** add a new CLI command, new permission,
  new role, or new workflow YAML.
- Does **not** publish to npm. **No version bump. No
  git tag. No GitHub Release. No new branch.**

## Follow-Up Work

- **CapabilityPhraseReport post-quality coverage
  review** (next slice). Re-run fixture + `target-1` +
  at least one additional cohort target to measure
  whether stable phrase count moves, whether splitter
  still needs work, or whether more canon-pack
  expansion is required.
- **Canon-pack expansion v2** — per-archetype additions
  for terms observed only in specific overlays (e.g.
  Next.js-specific tokens). Each pack expansion ships
  behind its own decision memo.
- **Lexical-splitter v2** — sharper rules for
  `unknown-verb` / `unknown-noun` candidates (proper-
  noun-prefix handling, framework-convention awareness).
- **`CapabilityMap` v2 high-confidence-only design
  decision** — gated on the post-quality coverage
  review.
- **`CapabilityContract` decision** (further future,
  after phrases stabilize and `CapabilityMap` v2 ships).

## See Also

- [Enrichment Coverage Review](capability-phrase-enrichment-coverage-review.md)
- [Phrase Enrichment v1 Memo](capability-phrase-enrichment-v1.md)
- [Pre-Enrichment Coverage Review](capability-phrase-report-coverage-review.md)
- [CapabilityPhraseReport Safety Review](capability-phrase-report-safety-review.md)
- [Capability Ontology Canon + Override Model Decision](capability-ontology-canon-override-model-decision.md)
- [`CapabilityNormalizationReport` artifact reference](../artifacts/capability-normalization-report.md)
- [`CapabilityPhraseReport` artifact reference](../artifacts/capability-phrase-report.md)
- [Capability ontology concept](../concepts/capability-ontology.md)
- [Roadmap](roadmap.md)
- [Classic-behavior roadmap](classic-behavior-roadmap.md)
