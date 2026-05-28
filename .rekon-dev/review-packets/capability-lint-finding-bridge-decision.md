# Review Packet: CapabilityArchitectureLintReport → FindingReport Bridge Decision

Forty-second slice on the codebase-intel-classic
capability-ontology track. Strategy / architecture
decision memo only. Decides whether and how selected
`CapabilityArchitectureLintReport` rows may become
governed findings. Follows the
`CapabilityArchitectureLintReport` publication safety
review at `22d8233`.

## CHANGES MADE

- New strategy memo
  `docs/strategy/capability-lint-finding-bridge-decision.md`
  with 12 required headings (Decision Summary, Why This
  Decision Exists, Current Boundary, Options Considered,
  Recommendation, Bridge Artifact Model, Eligibility
  Policy, Finding Id Policy, Governance Boundary, Future
  Sequence, What This Does Not Do, Implementation
  Sequence) and 4 required tables (option / eligibility /
  governance boundary / future sequence).
- New review packet (this file).
- New docs test
  `tests/docs/capability-lint-finding-bridge-decision.test.mjs`
  (15 assertions).
- Cross-references added to 12 supporting docs + README +
  CHANGELOG.

## PUBLIC API CHANGES

None. Strategy / docs-only batch. No types, helpers, CLI
commands, artifact registrations, or runtime behavior
changed. The `CapabilityLintFindingBridgeReport` shape is
a sketch in the memo, not implemented.

## PURPOSE PRESERVATION CHECK

Original problem:

> `CapabilityArchitectureLintReport` now produces and
> surfaces capability-policy evaluation rows. Violation
> rows can include preview `findingCandidate` payloads.
> Operators need a governed path from useful lint
> violations into the existing finding lifecycle, but
> that path must not bypass filtering, lifecycle status,
> adjudication, or `CoherencyDelta` generation.

This memo delivers that decision. It preserves the
product guarantee:

- Lint rows do not automatically become findings.
- Only selected eligible violation rows may be bridged.
- Finding lifecycle and adjudication remain
  authoritative.
- `CoherencyDelta` remains downstream of governed
  findings.
- No source-write or remediation behavior is implied by
  the bridge decision.

The decision selects an intermediate preview artifact
(`CapabilityLintFindingBridgeReport`) precisely so the
evaluation → candidate → governed-finding boundary is
inspected before any `FindingReport` mutation exists.

## CODEBASE-INTEL ALIGNMENT

The decision keeps the capability-ontology stack on its
disciplined cadence: decision → implementation → safety
review for each layer, with each enforcement-adjacent
step gated on its own decision + safety review pair. It
mirrors the layered discipline already proven across the
finding-governance pipeline (FindingReport →
FindingFilterReport → FindingLifecycleReport →
IssueAdjudicationReport → CoherencyDelta): the bridge
report is a new *upstream* preview stage that must not
collapse those downstream stages.

## OPTIONS CONSIDERED

- A — no bridge: rejected/deferred (violations need a
  governed path).
- B — intermediate bridge report first: **selected**
  (preserves review boundary).
- C — direct FindingReport writer: rejected for v1 (too
  much blast radius).
- D — direct FindingLifecycleReport mutation: rejected
  (lifecycle is downstream).
- E — direct CoherencyDelta remediation: rejected (skips
  finding governance).

## BRIDGE ARTIFACT MODEL

Recommended name: `CapabilityLintFindingBridgeReport`.
Sketch shape (not implemented): `header`, `source`
(lintReportRef + optional contract/map refs), `summary`
(totalRows / eligible / ineligible / needsReview /
byReason / bySeverity), and `candidates[]` with
`decision` (eligible / ineligible / needs-review),
`reason`, `severity`, `confidence`, and an optional
`proposedFinding` preview payload carrying a deterministic
id, title, category, severity, evidenceRefs, and
`sourceLintRowRef`. The `proposedFinding` is preview
shape only — never a `FindingReport` entry.

## ELIGIBILITY POLICY

Eligible only when all of: status `violation`; has
`findingCandidate`; confidence high/medium; severity
high/medium; has `evidenceRefs`. Ineligible for pass /
not-evaluated / missing-candidate / low-confidence /
low-severity rows. Needs-review for duplicate id
conflicts, missing evidence chain, or uncertain category
mapping. No automatic `FindingReport` writing in v1.

## GOVERNANCE BOUNDARY

Pinned: the bridge report does not write `FindingReport`;
does not mutate `FindingFilterReport`,
`FindingLifecycleReport`, `IssueAdjudicationReport`, or
`CoherencyDelta`; does not create `WorkOrder` or
`VerificationPlan`. Only a later explicit writer decision
may allow bridge candidates to become governed findings,
and even then lifecycle / adjudication / CoherencyDelta
remain downstream stages.

## FUTURE SEQUENCE

1. `CapabilityLintFindingBridgeReport` v1 — preview
   artifact only.
2. bridge safety review — required before writer.
3. `FindingReport` writer decision — required before
   mutation.
4. `FindingReport` writer implementation — explicit
   approval only.
5. lifecycle / `CoherencyDelta` integration — downstream,
   separate slices.

## TESTS / VERIFICATION

- New docs test
  `tests/docs/capability-lint-finding-bridge-decision.test.mjs`
  (15 assertions: memo presence, all required headings,
  option B selected, direct writer rejected, five
  boundary statements, four tables, CHANGELOG mention,
  review-packet PURPOSE PRESERVATION CHECK).
- Full 9-command gate (typecheck / test / build /
  diff-check / audit-package-exports / audit-license /
  publish-dry-run / install-smoke /
  install-tarball-smoke) green. No CLI smoke required for
  a strategy-only batch.

## INTENTIONALLY UNTOUCHED

- `CapabilityArchitectureLintReport` type / factory /
  validator / helper / CLI / publication surfacing.
- `FindingReport`, `FindingFilterReport`,
  `FindingLifecycleReport`, `IssueAdjudicationReport`,
  `CoherencyDelta`.
- `WorkOrder`, `VerificationPlan`.
- Resolver routing, verification planning, source-write
  reconciliation, `RefactorPreservationContract`.
- `CapabilityContract`, `CapabilityMap`,
  `CapabilityPhraseReport`, `EvidenceGraph`.

## RISKS / FOLLOW-UP

- The bridge is the first crossing point toward governed
  findings; the bridge-report implementation and its
  safety review must keep the preview strictly
  non-mutating.
- A future `FindingReport` writer is the highest-risk step
  and is explicitly gated behind its own decision +
  safety review.
- Deterministic finding ids matter so repeated bridge runs
  do not spawn duplicate prospective findings; the
  bridge-report implementation must honor the id policy.

## NEXT STEP

Recommended next slice:
**CapabilityLintFindingBridgeReport v1** — register the
bridge report artifact and implement preview-only
projection from eligible `CapabilityArchitectureLintReport`
violation rows. Still no `FindingReport` mutation, no
`FindingLifecycleReport` mutation, no `CoherencyDelta`
mutation, no `WorkOrder` / `VerificationPlan` creation, no
source writes.
