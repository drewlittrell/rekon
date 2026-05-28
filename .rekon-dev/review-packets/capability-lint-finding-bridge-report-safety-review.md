# Review Packet: CapabilityLintFindingBridgeReport Safety Review

Forty-fourth slice on the codebase-intel-classic
capability-ontology track. Strategy / safety-review batch.
Read-only end-to-end review of `CapabilityLintFindingBridgeReport`
v1 (shipped at `166e07a`).

## CHANGES MADE

- New strategy memo
  `docs/strategy/capability-lint-finding-bridge-report-safety-review.md`
  (13 headings + 4 tables: surface / eligibility / boundary /
  option).
- New docs test
  `tests/docs/capability-lint-finding-bridge-report-safety-review.test.mjs`
  (14 assertions).
- This review packet.
- Cross-reference updates to the bridge decision memo, bridge
  artifact + concept docs, lint artifact + concept docs, the
  governance docs (finding-report, finding-lifecycle,
  graph-aware-finding-filters, coherency-delta,
  remediation-work-orders), both roadmaps, README, and CHANGELOG.

No source, schema, CLI, or test-behavior changes.

## PUBLIC API CHANGES

None. Strategy / docs only. No new exports, no new artifact
types, no new CLI commands, no version bump.

## PURPOSE PRESERVATION CHECK

- **Original problem.** `CapabilityArchitectureLintReport` rows
  can include `findingCandidate` preview payloads. The bridge
  report classifies which rows would be eligible to become
  governed findings later. Because governed findings drive
  lifecycle, `CoherencyDelta`, work orders, and verification
  plans downstream, the preview bridge must be safety-reviewed
  before surfacing or any writer decision.
- **Product guarantee preserved.**
  `CapabilityLintFindingBridgeReport` is preview, not
  `FindingReport`; eligibility is explicit and auditable;
  proposed finding ids are deterministic; governance artifacts
  and `WorkOrder` / `VerificationPlan` remain untouched; any
  future `FindingReport` writer requires its own decision and
  safety review.
- **Verified, not assumed.** The builder's imports were
  re-read (only `@rekon/kernel-artifacts` +
  `@rekon/kernel-repo-model` types; no governance-artifact
  reads); the CLI block was re-read (reads only the lint report,
  writes only the bridge report to `actions`); the 25-test
  contract suite (incl. purity tests 18–23) and `artifacts
  validate` confirm the boundary at runtime.

## CODEBASE-INTEL ALIGNMENT

Preserves the classic separation between evaluation and governed
findings. The bridge is the Rekon-native preview step that lets
operators see candidate findings before any writer promotes
them, without short-circuiting the finding filter → status
ledger → adjudication → `CoherencyDelta` chain.

## ARTIFACT / CLI REVIEWED

- `CapabilityLintFindingBridgeReport` type, factory, validator,
  schema (`@rekon/kernel-repo-model`).
- `buildCapabilityLintFindingBridgeReport`
  (`@rekon/capability-model`).
- `rekon capability lint bridge-findings`
  (`[--root] [--json] [--lint-report <ref>]`).
- Contract + docs tests; artifact + concept + decision docs.

## ELIGIBILITY RULE REVIEW

Strict conjunctive gate (violation + findingCandidate +
high/medium confidence + high/medium severity + non-empty
evidenceRefs). Ineligible branch evaluated in a fixed priority
order, one deterministic reason per row. Conservative default of
`ineligible`. **Strict enough for v1.**

## DUPLICATE HANDLING REVIEW

Stable pre-sort (`contractId`, `lintRowId`, `id`) + claimed-id
set: first eligible candidate keeps the id, later collisions
become `needs-review` / `duplicate-candidate`. Reproducible
regardless of input order. **Deterministic enough for v1.**

## PROPOSED FINDING ID REVIEW

`capability-architecture-policy:<rule>:<contractId>:<phraseCapabilityId>`,
slug-safe, no timestamp, stable across runs; collisions handled
by the duplicate logic, not silent merges. Preview value only.
**Stable enough for v1.**

## GOVERNANCE MUTATION BOUNDARY

No `FindingReport` writes; no `FindingFilterReport` /
`FindingLifecycleReport` / `IssueAdjudicationReport` /
`CoherencyDelta` mutation. Enforced structurally (builder input
= lint report only; CLI write = bridge report only) and
asserted by contract tests that snapshot bytes before/after.

## WORKORDER / VERIFICATIONPLAN BOUNDARY

The bridge creates no `WorkOrder` and no `VerificationPlan`;
both remain downstream of governed findings, never of
capability-lint evaluation. Confirmed by a dedicated contract
test.

## RECOMMENDATION

`CapabilityLintFindingBridgeReport` v1 is **safe / stable as a
preview bridge artifact.** Recommended next slice:
**CapabilityLintFindingBridgeReport publication surfacing** —
the next slice may surface the report in publications but must
not write findings. FindingReport writer decision and all
governance integration remain deferred.

## TESTS / VERIFICATION

- New docs test (14 assertions): headings, the six pinned
  statements, the four tables, CHANGELOG mention, review-packet
  presence.
- Full gate: typecheck / test / build / git diff --check /
  audit-package-exports / audit-license / publish-dry-run /
  install-smoke / install-tarball-smoke.
- No CLI smoke (strategy-only batch).

## INTENTIONALLY UNTOUCHED

- The bridge artifact, factory, validator, builder, and CLI
  (no behavior change).
- The governed-findings pipeline (FindingReport, filters,
  lifecycle, adjudication, CoherencyDelta).
- WorkOrder / VerificationPlan, resolver routing, verification
  planning, reconciliation, source writes.

## RISKS / FOLLOW-UP

- Publication surfacing (next slice) must remain read-only and
  must not write findings.
- A future `FindingReport` writer is a separate decision +
  safety review (explicitly deferred).
- No risk identified in the v1 preview boundary.

## NEXT STEP

`CapabilityLintFindingBridgeReport` publication surfacing
(architecture summary + agent contract, read-only). Still no
FindingReport mutation, no lifecycle mutation, no CoherencyDelta
mutation, no WorkOrder / VerificationPlan creation, no source
writes.
