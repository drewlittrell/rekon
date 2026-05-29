# Review Packet: CapabilityLintFindingBridgeReport Publication Surfacing

Forty-fifth slice on the codebase-intel-classic
capability-ontology track. Product capability batch. Surfaces
the latest `CapabilityLintFindingBridgeReport` v1 (shipped at
`166e07a`, safety-reviewed at `fb12542`) in the architecture
summary and agent contract as read-only visibility.

## CHANGES MADE

- **capability-docs** (`packages/capability-docs/src/index.ts`):
  - New pure helper
    `buildCapabilityLintFindingBridgePublicationSection` +
    `CapabilityLintFindingBridgeReportLike` (and nested
    `*Like`) types, exported boundary / proof-deferral consts.
  - Architecture summary publisher reads the latest
    `CapabilityLintFindingBridgeReport`, threads it into
    `renderArchitectureSummary`, renders a level-2
    `Capability Lint Finding Bridge` section, cites it in
    `header.inputRefs`.
  - Agent contract publisher does the same at heading level 3.
  - New `renderCapabilityLintFindingBridgeSection` helper.
  - New agent-contract Do Not Do reminder entry.
  - Manifest `consumes` gains `CapabilityLintFindingBridgeReport`;
    new invalidation rule `capability-lint-finding-bridge.changed`.
- Tests: `tests/contract/capability-lint-finding-bridge-publications.test.mjs`
  (23 assertions), `tests/docs/capability-lint-finding-bridge-publications.test.mjs`
  (11 assertions).
- Docs: bridge artifact + concept (new Publication Surfacing
  section), lint artifact + concept, architecture-summary +
  agent-contract + proof-report docs, governance docs, both
  roadmaps, safety review memo, decision memo, README, CHANGELOG.

## PUBLIC API CHANGES

- New `@rekon/capability-docs` exports:
  `buildCapabilityLintFindingBridgePublicationSection`, its
  input/result types, `CapabilityLintFindingBridgeReportLike`
  (+ nested), `CAPABILITY_LINT_FINDING_BRIDGE_PUBLICATION_BOUNDARY_LINE`,
  `CAPABILITY_LINT_FINDING_BRIDGE_PUBLICATION_PROOF_DEFERRAL_LINE`.
- No new artifact type. No new CLI command. No version bump.

## PURPOSE PRESERVATION CHECK

- **Original problem.** `CapabilityLintFindingBridgeReport`
  previews which architecture-lint rows could become governed
  findings later. Operators and agents need to see eligible /
  ineligible / needs-review candidates in the main publications,
  but visibility must not imply FindingReport writing, lifecycle
  mutation, CoherencyDelta mutation, WorkOrder / VerificationPlan
  creation, or source writes.
- **Product guarantee preserved.** Bridge candidates become
  visible; `proposedFinding` stays preview-only; publications
  cite the bridge report when present; publications never run
  bridge generation; publications never mutate governance
  artifacts; the FindingReport writer remains deferred to its
  own decision + safety review.
- **Verified.** 23-assertion contract test (incl. before/after
  artifact-index digest snapshots proving no mutation/creation
  of CapabilityLintFindingBridgeReport, CapabilityArchitectureLintReport,
  FindingReport, FindingLifecycleReport, CoherencyDelta,
  WorkOrder, VerificationPlan) + `artifacts validate` clean.

## CODEBASE-INTEL ALIGNMENT

Mirrors the CapabilityArchitectureLintReport publication
surfacing (slice 40): a pure structural helper shared by the
architecture summary and agent contract, read-only, additive,
with an explicit boundary statement and a Do Not Do reminder.
Visibility is not enforcement.

## PUBLICATION SURFACES

- Architecture summary: level-2 `## Capability Lint Finding
  Bridge`, placed after the Capability Architecture Linting
  section, before the Proof Loop.
- Agent contract: level-3 `### Capability Lint Finding Bridge`
  inside the operating-state group.
- Proof report: **deferred** (documented).

## READ-ONLY GUARANTEE

Publications may read the latest bridge report, render the
summary / candidate table, and cite it in `inputRefs`. They must
not run `rekon capability lint bridge-findings`, mutate the
bridge report or `CapabilityArchitectureLintReport`, write
`FindingReport`, mutate `FindingFilterReport` /
`FindingLifecycleReport` / `IssueAdjudicationReport` /
`CoherencyDelta`, create `WorkOrder` / `VerificationPlan`, or
write source files.

## BOUNDARY STATEMENTS

Rendered in both publications: "CapabilityLintFindingBridgeReport
is preview visibility only; this publication does not write
FindingReport, mutate lifecycle state, mutate CoherencyDelta,
create WorkOrders, create VerificationPlans, or write source
files." Plus eligible / ineligible / needs-review guidance and
the preview-not-FindingReport statement.

## PROOF REPORT DEFERRAL

Proof-report surfacing is deferred: the bridge report is preview
/ governance-candidate context, not verification proof.
Documented in the bridge artifact + concept docs.

## TESTS / VERIFICATION

- Contract test (23 assertions): helper rendering (no-report
  guidance, section, counts, bounded table, boundary), inputRefs
  citation, agent-contract guidance + Do Not Do, no-mutation /
  no-creation across 7 artifact types, proof deferral, validate
  clean.
- Docs test (11 assertions).
- Full gate: typecheck / test / build / git diff --check /
  audit-package-exports / audit-license / publish-dry-run /
  install-smoke / install-tarball-smoke.
- CLI smoke on `tests/fixtures/js-ts-ast-evidence`.

## INTENTIONALLY UNTOUCHED

- `CapabilityLintFindingBridgeReport` generation (builder, CLI,
  factory, validator) — no behavior change.
- The governed-findings pipeline, WorkOrder / VerificationPlan,
  resolver routing, verification planning, source writes.
- Proof-report publisher (deferral only).

## RISKS / FOLLOW-UP

- A future `FindingReport` writer remains a separate decision +
  safety review (deferred).
- Next recommended slice: **CapabilityLintFindingBridgeReport
  publication safety review** — review the surfacing and decide
  whether a FindingReport writer decision can begin.

## NEXT STEP

`CapabilityLintFindingBridgeReport` publication safety review.
Still no FindingReport mutation, no lifecycle mutation, no
CoherencyDelta mutation, no WorkOrder / VerificationPlan
creation, no source writes.
