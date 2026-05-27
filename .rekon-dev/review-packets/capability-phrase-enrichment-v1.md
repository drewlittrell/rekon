# Review Packet — CapabilityPhraseReport Phrase Enrichment v1

Product capability batch shipping deterministic
`domain` / `pattern` / `layer` enrichment to
`CapabilityPhraseReport`. The stable threshold is
**unchanged**; new `partial` phrases emit only when
deterministic enrichment context is available. **No
`CapabilityMap` mutation. No `CapabilityPhraseReport`
shape change. No `CapabilityNormalizationReport` semantics
change. No `EvidenceGraph` mutation. No new artifact
registration. No new CLI command. No source reads. No AST
/ typechecker / LLM evidence. No source writes. No npm
publish. No version bump. No git tag. No GitHub Release.
No new branch.**

## CHANGES MADE

- **`@rekon/capability-ontology` `buildCapabilityPhraseReport`**:
  extended `BuildCapabilityPhraseReportInput` with optional
  `observedRepo` / `observedRepoRef` / `ownershipMap` /
  `ownershipMapRef`. Added deterministic enrichment logic
  using longest-prefix path match against `OwnershipMap`
  entries and `ObservedRepo` systems. `domain` / `pattern`
  / `layer` populated only from existing artifacts.
  Sentinel values (`""`, `"unknown"`, `"none"`) are
  treated as non-enriching at the source.
- **`@rekon/capability-ontology` partial emission**:
  candidates that are normalized + at-least-medium
  confidence and at-least-medium split emit as
  `status === "partial"` **only when at least one
  enrichment field is present**. Partial phrases never
  emit without deterministic context. Stable threshold is
  unchanged.
- **`@rekon/cli` `rekon capability phrase project`**:
  CLI now reads the latest `ObservedRepo` + `OwnershipMap`
  from `.rekon/registry/artifacts.index.json` (optional;
  missing is not a failure) and passes them to the
  builder. Adds `contextRefs` to the JSON output and an
  enrichment summary line to the human output.
- **Dependency wiring**: `@rekon/capability-ontology` now
  depends on `@rekon/kernel-repo-model` so it can consume
  `ObservedRepo` / `OwnershipMap` types. `package.json` +
  `tsconfig.json` updated.
- **New strategy memo**:
  `docs/strategy/capability-phrase-enrichment-v1.md`.
- **New 22-assertion contract test**:
  `tests/contract/capability-phrase-enrichment.test.mjs`.
- **New 10-assertion docs test**:
  `tests/docs/capability-phrase-enrichment.test.mjs`.
- **New review packet** (this file).
- **Supporting doc updates**: coverage review, safety
  review, decision memo, architecture decision memo,
  artifact reference, ontology concept doc, both
  roadmaps, README, CHANGELOG.

## PUBLIC API CHANGES

- `BuildCapabilityPhraseReportInput` gains four optional
  fields (`observedRepo`, `observedRepoRef`,
  `ownershipMap`, `ownershipMapRef`). Existing callers
  that pass only `header`, `normalizationReport`, and
  `normalizationReportRef` continue to work — the helper
  emits exactly the same `stable` phrases it did before.
- `rekon capability phrase project --report <ref>` adds an
  optional `contextRefs` block to its JSON output. The
  human output adds optional `Context:` and `Enrichment:`
  lines.
- No schema change to `CapabilityPhraseReport`,
  `CapabilityPhrase`, or any other artifact.
- No new permission, role, workflow YAML, or CLI command.

## PURPOSE PRESERVATION CHECK

- `CapabilityNormalizationReport` shape and semantics
  unchanged. The translation audit still carries the
  unknown / low-confidence rows that never project.
- `CapabilityPhraseReport` shape unchanged.
  `CapabilityPhrase` fields unchanged.
- Stable threshold unchanged: `status === "normalized"`,
  `confidence === "high"`, raw split confidence
  `"high"`. Enrichment fields only **add** context to
  existing stable phrases; they never relax eligibility.
- Partial phrases are marked as such and explicitly
  documented as **not** `CapabilityMap`-ready placement
  or ownership policy.
- Enrichment uses only deterministic artifact context —
  `ObservedRepo` paths, `OwnershipMap` owner/layer,
  `ObservedRepo.systems[].kind`. No source reads, no AST,
  no LLM, no heuristic guessing.
- Sentinel `"unknown"` / `"none"` values are skipped at
  the source so they don't leak as phrase enrichment.
- `CapabilityMap` v2 remains deferred. The safety
  review's pin —
  **CapabilityMap integration remains deferred** — is
  preserved.
- Source writes remain unavailable.

## CODEBASE-INTEL ALIGNMENT

- Aligned with the
  [Coverage Review](../../docs/strategy/capability-phrase-report-coverage-review.md):
  this slice is exactly the recommended next slice the
  coverage review selected.
- Aligned with the
  [Safety Review](../../docs/strategy/capability-phrase-report-safety-review.md):
  all five verbatim pins are preserved.
- Aligned with the
  [Carrier Decision](../../docs/strategy/capability-phrase-report-decision.md):
  the carrier remains a separate `CapabilityPhraseReport`
  artifact; the schema is unchanged.
- Aligned with the
  [Architecture Decision](../../docs/strategy/capability-phrase-contract-architecture-decision.md):
  enrichment ships **per evidence source** behind its own
  memo. AST/LLM enrichment stays deferred.
- Aligned with the
  [Translation Layer Decision](../../docs/strategy/capability-ontology-translation-layer-decision.md):
  Layer 5b (phrase) consumes Layer 5 (normalization) +
  Layer 2 (ObservedRepo / OwnershipMap) artifacts. Layer
  6 (`CapabilityMap`) consumption stays pinned to phrase
  claims.

## ENRICHMENT MODEL

Sources (deterministic only):

- `OwnershipMap.entries[]`: longest-prefix `path` match →
  `ownerSystem` becomes `phrase.domain`; `layer` becomes
  `phrase.layer`. `"unknown"` / `"none"` / empty values
  skipped.
- `ObservedRepo.systems[]`: longest-prefix `paths[]`
  match → `id` becomes fallback `phrase.domain`; `kind`
  maps to `phrase.pattern`
  (`route`→`route-handler`, `service`→`service`,
  `ui`→`component`, `module`→`module`, `infra`→`infra`);
  single-layer systems contribute fallback `phrase.layer`.

Allowed enrichment fields:

- `domain` (string)
- `pattern` (string, deterministic kind mapping only)
- `layer` (string)

Deferred enrichment fields (do **not** ship here):

- `qualifier[]`
- `sideEffects[]`
- `inputs[]`
- `outputs[]`
- any `CapabilityContract` policy fields

## STATUS MODEL

- `stable`: strictest threshold unchanged. May carry
  optional `domain` / `pattern` / `layer` when context
  matches. **Eligible** for future `CapabilityMap` v2.
- `partial`: emits only when (a) the candidate is
  normalized, (b) confidence and split are both at least
  `"medium"`, (c) the candidate does **not** meet the
  stable threshold, AND (d) at least one deterministic
  enrichment field is present. **Not** `CapabilityMap`-
  ready placement or ownership policy.
- `low-confidence`: reserved. Phrase Enrichment v1 does
  not emit low-confidence phrases.

## CLI SURFACE

Backward-compatible. The command still requires
`--report <CapabilityNormalizationReport-id|type:id>`.
Adds:

- Reads latest `ObservedRepo` / `OwnershipMap` from the
  artifact index (optional; missing is OK).
- JSON output `contextRefs` records what was read.
- Human output adds `Context:` / `Context available (not
  consumed):` lines and an
  `Enrichment: withDomain N, withPattern N, withLayer N`
  summary.

`header.inputRefs` cites enrichment artifacts **only when
the helper actually consumed them** (i.e., at least one
candidate path matched and at least one enrichment field
was populated). This keeps the audit chain meaningful.

## PUBLICATION SURFACING

No new publication section. The existing architecture
summary `## Capability Phrases` and agent contract
`### Capability Phrases` sections naturally surface the
updated `partial` count via the existing summary line
and the enrichment line. The `Do Not Do` reminder against
treating phrases as `CapabilityMap` ownership/placement
policy is retained.

## TESTS / VERIFICATION

- **New 22-assertion contract test**
  `tests/contract/capability-phrase-enrichment.test.mjs`:
  - high-confidence normalized → stable (threshold
    unchanged)
  - medium-confidence + domain → partial
  - medium-confidence + pattern → partial
  - medium-confidence + layer → partial
  - medium-confidence + no enrichment → not emitted
  - unknown-verb / unknown-noun / ignored /
    low-confidence candidates never project (even with
    enrichment present)
  - stable threshold unchanged by enrichment context
  - summary counts stable/partial/withDomain/
    withPattern/withLayer correctly
  - `header.inputRefs` cites `ObservedRepo` when
    consumed
  - `header.inputRefs` cites `OwnershipMap` when
    consumed
  - CLI reads `ObservedRepo` / `OwnershipMap` when
    present
  - CLI succeeds when `ObservedRepo` / `OwnershipMap`
    are absent
  - CLI writes only `CapabilityPhraseReport`
  - CLI does not mutate `CapabilityMap`
  - CLI does not mutate `CapabilityNormalizationReport`
  - CLI does not mutate `EvidenceGraph`
  - architecture summary phrase section surfaces partial
    count
  - agent contract phrase section surfaces partial count
  - `artifacts validate` remains clean after enrichment
- **New 10-assertion docs test**
  `tests/docs/capability-phrase-enrichment.test.mjs`
  pins the verbatim guarantees + the CHANGELOG mention +
  the review packet.
- **CLI smoke** against `target-1` produced:
  - 239 total phrases (16 stable + 223 partial); 0
    low-confidence
  - 239 with domain, 0 with pattern, 95 with layer
  - all artifact validations pass clean
- 9-command gate: typecheck / test / build / git diff
  --check / audit-package-exports / audit-license /
  publish-dry-run / install-smoke / install-tarball-smoke
  all expected green.

## INTENTIONALLY UNTOUCHED

- `CapabilityNormalizationReport` shape and semantics
  unchanged.
- `CapabilityPhraseReport` shape unchanged.
- `CapabilityPhrase` field set unchanged.
- Phrase projection strict rules for `stable` unchanged.
- `CapabilityMap` v2 remains deferred. No
  `CapabilityMap` mutation.
- `EvidenceGraph` unchanged.
- `CapabilityNormalizationReviewLedger` unchanged.
- `CapabilityOntologySuggestionReport` unchanged.
- Canon packs / overrides unchanged.
- Publication shape unchanged.
- CLI command surface unchanged (no new subcommand;
  existing flag set is backward-compatible).
- No new permission. No new role. No workflow YAML
  change.
- No source writes. No source reads. No AST. No LLM.
- No version bump. No npm publish. No git tag. No GitHub
  Release. No new branch.

## RISKS / FOLLOW-UP

Risks:

1. Operators read partial phrases as `CapabilityMap`-
   ready placement policy. Mitigation: status is
   explicitly `partial` in the report; publications carry
   the deferred-`CapabilityMap` callout; the safety
   review's verbatim pins remain in effect; the agent
   contract's `Do Not Do` reminder retained.
2. `"unknown"` / `"none"` values leak into enrichment.
   Mitigation: `isMeaningfulValue` helper filters them at
   the source.
3. Path-prefix matching gives confusing domain attribution
   on monorepos. Mitigation: longest-prefix wins;
   `OwnershipMap` takes priority over `ObservedRepo`.
   Future enrichment can refine.
4. Pattern enrichment is sparse because `ObservedRepo`
   projectors don't yet populate `kind` widely.
   Mitigation: track as follow-up; the second coverage
   review measures the partial yield with concrete
   numbers.

Follow-up:

- **Second coverage review** (next slice) — measures the
  new partial yield + enrichment ratios on `target-1` +
  at least one additional cohort target.
- **`CapabilityMap` v2 high-confidence-only design
  decision** — gated on the second coverage review.
- **Per-evidence-source enrichment slices** (framework /
  architecture profile / future AST / LLM as audit
  signal). Each ships behind its own memo.
- **Phrase confidence + status model decision** —
  formalize the formula; depends on enrichment coverage
  evidence.
- **Canon-pack expansion** (parallel, per-archetype).
- **`CapabilityContract` decision** (further future).

## NEXT STEP

Recommended: **CapabilityPhraseReport enrichment coverage
review** — re-run fixture + at least one real cohort
target through the enrichment-enabled pipeline. Record
stable / partial counts, `withDomain` / `withPattern` /
`withLayer` ratios, and publication usefulness. Output
drives the `CapabilityMap` v2 high-confidence-only
decision.
