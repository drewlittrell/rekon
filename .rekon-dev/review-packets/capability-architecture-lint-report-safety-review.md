# Review Packet: CapabilityArchitectureLintReport Safety Review

Thirty-ninth slice on the codebase-intel-classic
capability-ontology track. Strategy / safety-review
batch. Read-only end-to-end audit of the
`CapabilityArchitectureLintReport` v1 implementation
shipped at `0bd7af0`.

## CHANGES MADE

- New strategy memo
  `docs/strategy/capability-architecture-lint-report-safety-review.md`
  with 12 required headings (Decision Summary, Why This
  Review Exists, Artifact And CLI Reviewed, Rule
  Evaluation Review, Preview Finding Boundary,
  Governance Mutation Boundary, Resolver / Verification
  Boundary, Options Considered, Recommendation, What
  This Does Not Do, Follow-Up Work, Cross-References)
  and 4 required tables (surface / rule / boundary /
  option).
- New review packet (this file).
- New docs test
  `tests/docs/capability-architecture-lint-report-safety-review.test.mjs`
  (13 assertions).
- Cross-references added to 9 supporting docs + README +
  CHANGELOG.

## PUBLIC API CHANGES

None. Strategy / docs-only batch. No types, helpers,
CLI commands, artifact registrations, or runtime
behavior changed.

## PURPOSE PRESERVATION CHECK

Original problem:

> `CapabilityArchitectureLintReport` is the first
> evaluation layer after `CapabilityContract`. It is
> enforcement-adjacent because it evaluates policy, but
> it must not yet enter governed findings or
> remediation. Before surfacing or bridging lint rows,
> Rekon needs a safety review.

This memo delivers that review. It preserves the product
guarantee:

- `CapabilityArchitectureLintReport` is evaluation, not
  enforcement.
- `findingCandidate` is preview-only.
- `FindingReport` / lifecycle / `CoherencyDelta` remain
  untouched.
- Resolver routing / verification planning remain
  untouched.
- Source writes remain unavailable.

The review confirms each of these holds in the shipped
v1 and recommends publication surfacing — not a finding
bridge — as the next slice.

## CODEBASE-INTEL ALIGNMENT

The review mirrors the read-only-audit model proven by
the `CapabilityContract` publication safety review
(thirty-sixth slice): audit the shipped surface, assert
every boundary statement, evaluate options, and
recommend the next slice that adds visibility before
enforcement. It keeps the capability-ontology stack on
its disciplined cadence of decision → implementation →
safety review → surfacing, with each enforcement
consumer gated on its own decision + safety review pair.

## ARTIFACT / CLI REVIEWED

- Types + factory + validator + schema in
  `@rekon/kernel-repo-model`.
- `buildCapabilityArchitectureLintReport` helper in
  `@rekon/capability-model`.
- `rekon capability lint architecture` CLI command.
- 23-assertion contract test + 12-assertion docs test.
- Artifact doc, concept doc, decision memo.

Finding: artifact shape, factory determinism, validator
strictness (enum checks, duplicate-id rejection,
recomputed-summary comparison), and CLI boundary
messaging ("No findings were written.") are all sound.

## RULE EVALUATION REVIEW

- Only `configured` contract rows evaluated; `unmatched`
  rows ignored.
- `allowed-layer` / `forbidden-layer`: pass / violation /
  not-evaluated.
- `allowed-system` / `forbidden-system`: not-evaluated in
  v1 (no deterministic system field on phrase-backed
  capabilities).
- Missing phrase-backed match or missing `layer` →
  not-evaluated (low confidence).
- Neighbor + preservation rules deferred.

Finding: the conservative `not-evaluated` fallback is the
correct default. The artifact never fabricates a verdict.

## PREVIEW FINDING BOUNDARY

`findingCandidate` is emitted on `violation` rows only,
as a preview payload. No `FindingReport` is written. The
artifact header `artifactType` is always
`CapabilityArchitectureLintReport`. Confirmed safe.

## GOVERNANCE MUTATION BOUNDARY

No mutation of `FindingReport`, `FindingFilterReport`,
`FindingLifecycleReport`, or `CoherencyDelta`. The
contract test suite snapshots each before/after the lint
run and asserts byte-equality, plus a clean
`artifacts validate`. The `findings` storage category is
directory layout only, not pipeline membership.
Confirmed safe.

## RESOLVER / VERIFICATION BOUNDARY

No resolver routing, no verification planning, no
`RefactorPreservationContract`, no source writes. The
helper holds no `write:source` permission and reads no
working-tree files. `requiredChecks` reserved but not
evaluated. Confirmed safe.

## RECOMMENDATION

`CapabilityArchitectureLintReport` v1 is safe / stable
as a separate evaluation artifact. Recommended next
slice: **CapabilityArchitectureLintReport publication
surfacing** (read-only visibility in architecture
summary + agent contract). The finding bridge is
explicitly deferred.

## TESTS / VERIFICATION

- New docs test
  `tests/docs/capability-architecture-lint-report-safety-review.test.mjs`
  (13 assertions: doc presence, all required headings,
  five boundary statements, four tables, CHANGELOG
  mention, review-packet PURPOSE PRESERVATION CHECK).
- Full 9-command gate (typecheck / test / build /
  diff-check / audit-package-exports / audit-license /
  publish-dry-run / install-smoke /
  install-tarball-smoke) green. No CLI smoke required
  for a strategy-only batch.

## INTENTIONALLY UNTOUCHED

- `CapabilityArchitectureLintReport` type / factory /
  validator / schema.
- `buildCapabilityArchitectureLintReport` helper.
- `rekon capability lint architecture` CLI.
- `CapabilityContract`, `CapabilityMap`,
  `CapabilityPhraseReport`, `EvidenceGraph`.
- `FindingReport`, `FindingFilterReport`,
  `FindingLifecycleReport`, `CoherencyDelta`.
- Resolver routing, verification planning, source-write
  reconciliation.

## RISKS / FOLLOW-UP

- System rules remain `not-evaluated` until phrase-backed
  capabilities gain a deterministic `system` field.
- The finding bridge is the highest-leverage deferred
  work; it must be a separate decision + safety review
  pair so the finding-filter chain and adjudication
  checkpoint are preserved.
- Publication surfacing (next slice) must stay read-only:
  surfacing the lint report must not be mistaken for
  enforcement.

## NEXT STEP

Recommended next slice:
**CapabilityArchitectureLintReport publication
surfacing**. Surface lint report summary / violations /
not-evaluated rows in the architecture summary and agent
contract. Still no `FindingReport` mutation. Still no
lifecycle mutation. Still no `CoherencyDelta` mutation.
Still no resolver routing. Still no verification
planning. Still no source writes.
