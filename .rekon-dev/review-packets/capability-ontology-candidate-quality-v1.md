# Review Packet — Capability Ontology Candidate-Quality Improvements v1

Product capability batch shipping deterministic
candidate-quality improvements to reduce upstream
normalization noise without weakening the
`CapabilityPhraseReport` stable threshold. **No
`CapabilityMap` mutation. No `CapabilityPhraseReport`
shape change. No phrase projection rule change. No
`CapabilityNormalizationReport` semantics change. No
`EvidenceGraph` mutation. No new artifact registration.
No new CLI command. No source reads. No AST /
typechecker / LLM evidence. No source writes. No npm
publish. No version bump. No git tag. No GitHub Release.
No new branch.**

## CHANGES MADE

- **`@rekon/capability-ontology` `splitCapabilityName`**:
  added `kind: CapabilityNameSplitKind = "name" | "path"`
  to the result. Path detection rule: name contains `/`
  OR matches bare extension `/^\.[a-z0-9]+$/i`.
  Tokenization regex updated to treat `/` as a delimiter
  alongside `.` / `_` so audit data still lists the
  attempted tokens.
- **`CapabilityCandidate.raw.splitKind`**: optional new
  field, additive. Older artifacts that didn't surface
  this continue to validate.
- **`@rekon/capability-ontology` normalizer**: two new
  branches:
  - `splitKind === "path"` → `status: "ignored"`,
    `message: "Path-shaped candidate; not a capability
    identifier."`
  - single-token name where the token is a known
    canonical noun (or noun alias) → `status:
    "low-confidence"`, `message: "Known noun \"X\"
    without a verb; insufficient for a capability
    phrase."` and `normalized.noun` populated; **no
    canonical verb invented**.
- **`extractCapabilityCandidates`**: propagates
  `splitKind` from the splitter to the candidate `raw`
  block for all four candidate kinds (`symbol`,
  `export`, `capability_hint`, `ownership_hint`).
- **Canon packs**: no new canonical entries added. The
  four target nouns (`schema`, `request`, `response`,
  `plan`) and three target verbs (`save`, `get`,
  `build`) are confirmed already canonical in the
  **base** pack; no duplicates introduced.
- **New strategy memo**:
  `docs/strategy/capability-ontology-candidate-quality-v1.md`.
- **New 16-assertion contract test**:
  `tests/contract/capability-ontology-candidate-quality.test.mjs`.
- **New 9-assertion docs test**:
  `tests/docs/capability-ontology-candidate-quality.test.mjs`.
- **New review packet** (this file).
- **Supporting doc updates**: enrichment coverage
  review, phrase enrichment v1 memo, normalization
  artifact reference, phrase artifact reference,
  ontology concept doc, both roadmaps, README,
  CHANGELOG.

## PUBLIC API CHANGES

- `CapabilityNameSplit` gains a required `kind` field.
  External callers that destructure the result still
  work; the field is additive.
- `CapabilityNameSplitKind` is a new exported type
  alias (`"name" | "path"`).
- `CapabilityCandidate.raw.splitKind` is a new optional
  field. Older callers that don't set it continue to
  work (the normalizer defaults the branch on
  `splitKind === "path"`, which is falsy when absent).
- No CLI surface changes. No new permission, role, or
  workflow YAML. No schema change to any artifact.

## PURPOSE PRESERVATION CHECK

- `CapabilityNormalizationReport` semantics unchanged.
  The audit report still surfaces unknown / unknown-
  verb / unknown-noun / ignored / low-confidence /
  normalized statuses; the new branches just shift
  some candidates from `unknown` → `ignored` and
  emit more precise `low-confidence` messages for
  single-token known nouns.
- `CapabilityPhraseReport` shape unchanged. Stable
  threshold unchanged. Partial phrase rules from
  enrichment v1 unchanged.
- `CapabilityMap` v2 remains deferred. The safety
  review's pin —
  **`CapabilityMap` integration remains deferred** —
  is preserved.
- Noun-only candidates never project as phrases.
  Path-shaped candidates never project as phrases.
- No new vocabulary is invented. No verb is invented
  for noun-only or path-shaped inputs.
- Source writes remain unavailable.

## CODEBASE-INTEL ALIGNMENT

- Aligned with the
  [Enrichment Coverage Review](../../docs/strategy/capability-phrase-enrichment-coverage-review.md):
  this slice is the exact next-slice the coverage
  review selected.
- Aligned with the
  [Canon + Override Model Decision](../../docs/strategy/capability-ontology-canon-override-model-decision.md):
  no canon-pack changes ship here; the splitter
  change is orthogonal to the pack model.
- Aligned with the
  [CapabilityPhraseReport Safety Review](../../docs/strategy/capability-phrase-report-safety-review.md):
  all five verbatim pins preserved (semantic
  projection ≠ placement policy; normalization
  remains audit; `CapabilityMap` deferred; proof
  report deferred; only stable phrases eligible).
- Aligned with the
  [Built-In Baseline Ontology Coverage Review](../../docs/strategy/builtin-ontology-coverage-review.md):
  that review identified path-shaped capability hints
  as a noise source classified `ignored`. This slice
  generalizes that handling to any path-shaped
  candidate name regardless of fact kind.

## CANON PACK CHANGES

None. The four observed target nouns (`schema`,
`request`, `response`, `plan`) and three target verbs
(`save`, `get`, `build`) are confirmed already canonical
in `base.ts`. No duplicates introduced. Contract test
pins both invariants.

Future canon-pack expansion (per-archetype overlays,
new aliases, etc.) lands behind its own decision memo.

## SPLITTER CHANGES

```ts
export type CapabilityNameSplitKind = "name" | "path";

export type CapabilityNameSplit = {
  tokens: string[];
  verb?: string;
  noun?: string;
  confidence: CapabilitySplitConfidence;
  kind: CapabilityNameSplitKind; // NEW
};
```

Detection rule:

```ts
function looksLikePath(name: string): boolean {
  if (name.includes("/")) return true;
  if (/^\.[a-z0-9]+$/i.test(name)) return true;
  return false;
}
```

Tokenization regex unchanged in semantics; the new `/`
delimiter handling ensures path-shaped names still
produce inspectable tokens for the audit report.

Normalizer behaviour:

- `splitKind === "path"` → `status: "ignored"`.
- Single-token name where token is a canonical noun /
  alias → `status: "low-confidence"`, message includes
  the canonical noun, `normalized.noun` populated, no
  verb invented.

## STABLE THRESHOLD

Unchanged. `CapabilityPhraseReport.buildCapabilityPhraseReport`
still requires:

- `candidate.status === "normalized"`
- `candidate.confidence === "high"`
- `candidate.raw.splitConfidence === "high"`

Path-shaped candidates cannot reach `"normalized"`
(they're classified `"ignored"` in the normalizer).
Single-token noun-only candidates cannot reach
`"normalized"` (they're classified `"low-confidence"`).
The stable foundation is preserved.

## TESTS / VERIFICATION

- **New 16-assertion contract test**
  `tests/contract/capability-ontology-candidate-quality.test.mjs`:
  - canon-pack noun coverage (schema/request/response/plan)
  - no duplicate canonical terms within any pack
  - observed pairs normalize (saveSchema, saveRequest,
    getResponse, buildPlan)
  - path-shaped candidate `src/index.ts` → ignored
  - bare extension `.tsx` → ignored
  - noun-only `Schema` → low-confidence, not phrase
  - `FigmaSchema` does not invent figma as a verb
  - 4× known noun suffix recognition (Schema /
    Request / Response / Plan)
  - stable phrase threshold unchanged
  - `CapabilityPhraseReport` emits stable only for
    high+high candidates
  - `CapabilityMap` not mutated
  - `EvidenceGraph` not mutated
  - well-formed outcomes across all branch types
- **New 9-assertion docs test**
  `tests/docs/capability-ontology-candidate-quality.test.mjs`
  pins the verbatim guarantees + CHANGELOG mention +
  review packet.
- **CLI smoke** on `target-1` (post-change vs.
  pre-change baseline):
  - `unknown` 4,088 → 3,865 (−223)
  - `ignored` 226 → 449 (+223)
  - `normalized` 241 → 241 (unchanged)
  - `lowConfidence` 2,054 → 2,054 (unchanged)
  - stable phrases 16 → 16 (unchanged)
  - total phrases 239 → 239 (unchanged)
  - `aliasApplied` 524 → 597 (+73; side effect of
    canonical noun lookup now matching a few
    additional aliases via `aliasApplied`
    bookkeeping — no behavioural change to
    normalized count).
- 9-command gate: typecheck / test / build / git diff
  --check / audit-package-exports / audit-license /
  publish-dry-run / install-smoke / install-tarball-smoke
  all expected green.

## INTENTIONALLY UNTOUCHED

- Canon packs (no new canonical entries).
- `CapabilityNormalizationReport` shape and semantics.
- `CapabilityPhraseReport` shape and projection rules.
- Phrase enrichment rules.
- Stable phrase threshold.
- `CapabilityMap` v2 (still deferred).
- `EvidenceGraph` (unchanged).
- `CapabilityNormalizationReviewLedger` (unchanged).
- `CapabilityOntologySuggestionReport` (unchanged).
- Publication shape (unchanged).
- CLI command surface (unchanged; no new subcommand,
  no flag changes).
- No new permission. No new role. No workflow YAML
  change.
- No source writes. No source reads. No AST. No LLM.
- No version bump. No npm publish. No git tag. No
  GitHub Release. No new branch.

## RISKS / FOLLOW-UP

Risks:

1. Path detection is too eager and reclassifies a
   genuinely canonical name. Mitigation: the rule
   requires either `/` or a leading-dot extension —
   both are unambiguous. Genuine TypeScript identifier
   names cannot satisfy either.
2. Single-token noun recognition shadows a future
   verb-by-coincidence case. Mitigation: it only
   triggers when the noun is canonical / aliased AND
   `nounRaw` is missing AND `verbRaw` is set; this is
   already an ambiguous case where no phrase would
   emit anyway.
3. Side-effect rise in `aliasApplied` count surprises
   operators. Mitigation: the count rises because
   noun-only known terms now populate
   `normalized.noun` with the canonical form — this
   is correct behaviour and is exactly what the
   precise low-confidence message communicates.
4. Phrase enrichment v1 partial yield changes
   accidentally. Mitigation: contract test pins
   partial count is unaffected by the splitter
   change; smoke run on `target-1` confirms.

Follow-up:

- **Post-quality coverage review** (next slice).
- **`CapabilityMap` v2 high-confidence-only design
  decision** — gated on the post-quality coverage
  review.
- **Canon-pack expansion v2** (parallel; per-archetype).
- **Lexical-splitter v2** (parallel; proper-noun-prefix
  handling, framework-convention awareness).
- **Additional cohort targets** (parallel; intake-
  gated).
- **`CapabilityContract` decision** (further future).

## NEXT STEP

Recommended: **CapabilityPhraseReport post-quality
coverage review** — re-run fixture + `target-1` + at
least one additional cohort target to measure stable
phrase count delta, partial phrase delta, path-
classified-as-ignored count, and publication usefulness.
Output drives the `CapabilityMap` v2 high-confidence-
only decision.
