# Review Packet — Bridge-Derived Findings Publication Surfacing

Fifty-fourth slice on the capability-ontology track. Product capability
batch implementing the slice-53 Option B decision. Read-only
publication surfacing only.

## CHANGES MADE

- **`packages/capability-docs/src/index.ts`**:
  - New exported pure helper
    `buildBridgeDerivedFindingsPublicationSection(input)` returning
    `{ lines: string[], inputRef?: ArtifactRef, count: number }`, plus
    exported `isBridgeDerivedFinding(finding)` predicate, the
    `BridgeDerivedFindingLike` / `BridgeDerivedFindingReportLike` /
    `BuildBridgeDerivedFindingsPublicationSectionInput` /
    `...Result` types, and the exported constants
    `BRIDGE_DERIVED_FINDING_TYPE`, `BRIDGE_DERIVED_FINDING_SOURCE`,
    `BRIDGE_DERIVED_FINDINGS_BOUNDARY_LINE`,
    `BRIDGE_DERIVED_FINDINGS_PROOF_DEFERRAL_LINE`.
  - Shared private `renderBridgeDerivedFindingsSection(sections,
    report, reportRef, headingLevel)` render helper.
  - Architecture-summary publisher: reads the latest `FindingReport`
    (read-only, pushes to `inputRefs`), threads `findingReport` /
    `findingReportRef` through `ArchitectureSummaryInputs`, and renders
    `## Bridge-Derived Findings` immediately after the preview
    `## Capability Lint Finding Bridge` section (before the proof
    loop).
  - Agent-contract publisher: same read + threading through
    `AgentContractInputs`, renders `### Bridge-Derived Findings` after
    the preview bridge subsection (before Memory Guidance), and adds a
    `Do Not Do` reminder to `AGENT_CONTRACT_DO_NOT_DO`.
  - Manifest: `FindingReport` added to `consumes`; new
    `bridge-derived-findings.changed` invalidation rule keyed on
    `FindingReport`.
- **New** `tests/contract/bridge-derived-findings-publications.test.mjs`
  (23 assertions).
- **New** `tests/docs/bridge-derived-findings-publications.test.mjs`
  (11 assertions).
- **New** this review packet.
- **Updated docs**: publication-decision memo (Surfacing
  Implementation section), writer safety review, finding-report,
  bridge report artifact + concept, finding-lifecycle,
  graph-aware-finding-filters, coherency-delta, remediation-work-orders,
  work-order, verification-plan, architecture-summary publication
  concept + artifact, agent-operating-contract concept +
  agent-contract artifact, proof-report publication concept + artifact,
  both roadmaps, README, CHANGELOG.

## PUBLIC API CHANGES

- New exports from `@rekon/capability-docs`:
  `buildBridgeDerivedFindingsPublicationSection`,
  `isBridgeDerivedFinding`, the four `BridgeDerived*` types, and the
  bridge-derived constants. Additive only.
- `@rekon/capability-docs` manifest `consumes` gains `FindingReport`;
  new `bridge-derived-findings.changed` invalidation rule.
- No CLI surface change. No artifact schema change. No version bump.

## PURPOSE PRESERVATION CHECK

**Original problem.** Bridge-derived `FindingReport` entries can be
written safely (slice 51 writer + slice 52 safety review). Operators
and agents need to distinguish bridge-derived findings from ordinary
findings and see their provenance in the normal publications, without
implying lifecycle status, adjudication, remediation readiness,
`WorkOrder` / `VerificationPlan` creation, or source-write behavior.

**Does this slice preserve that purpose?** Yes.

- Bridge-derived findings are now **visible** in the architecture
  summary + agent operating contract.
- **Source provenance** is shown when present (FindingReport ref,
  severity distribution, and a bounded table with
  `sourceBridgeCandidateId` / `sourceLintRowId` / `sourceContractId` /
  `sourcePhraseCapabilityId`).
- Publications are **read-only**: contract tests prove publish does not
  add/mutate `FindingReport`, `FindingLifecycleReport`,
  `IssueAdjudicationReport`, `CoherencyDelta`, `WorkOrder`, or
  `VerificationPlan` (index count + digest unchanged).
- The **proof report remains focused on verification proof**:
  surfacing deferred there, documented in the proof-report docs and
  re-verified by the contract test's docs scan.
- **Lifecycle / `CoherencyDelta` integration remains downstream** —
  pinned in the boundary statement, the agent `Do Not Do` reminder, and
  the manifest invalidation-rule description.

## CODEBASE-INTEL ALIGNMENT

- Mirrors the established capability-track publication pattern: the
  helper matches the `build<Feature>PublicationSection` →
  `{ lines, inputRef }` convention, the read pattern clones the
  immediately-adjacent `CapabilityLintFindingBridgeReport` read
  (`latestRef` + `artifacts.read` + manual `inputRefs.push`), and the
  shared `renderBridgeDerivedFindingsSection` mirrors
  `renderCapabilityLintFindingBridgeSection`.
- Source-identification signals (`type`, `details.source`,
  `details.source*`) were validated against the slice-51 writer's
  actual `Finding.details` mapping in `packages/cli/src/index.ts`.
- Distinct from the preview Capability Lint Finding Bridge section
  (which surfaces bridge *candidates*); this section surfaces the
  *governed findings* the writer wrote.

## PUBLICATION SURFACES

| Surface | Section | Heading | Status |
| --- | --- | --- | --- |
| architecture summary | Bridge-Derived Findings | `##` | shipped |
| agent operating contract | Bridge-Derived Findings | `###` | shipped (+ Do Not Do) |
| proof report | — | — | deferred |

## SOURCE IDENTIFICATION POLICY

A finding is bridge-derived when **any** of the following hold (never
title text alone):

- `finding.type === "capability_architecture_policy"`
- `finding.details.source === "capability-lint-bridge"`
- a non-empty `finding.details.sourceBridgeCandidateId`,
  `sourceLintRowId`, `sourceContractId`, or `sourcePhraseCapabilityId`

## READ-ONLY GUARANTEE

Publication generation reads the latest `FindingReport`, filters
bridge-derived findings, renders the section, and cites the
`FindingReport` in `header.inputRefs`. It never runs `rekon capability
lint write-findings` or `rekon capability lint bridge-findings`, never
mutates `FindingReport` / `FindingFilterReport` /
`FindingLifecycleReport` / `IssueAdjudicationReport` / `CoherencyDelta`,
never creates `WorkOrder` / `VerificationPlan`, and writes no source
files. The only artifact written is the `Publication`.

## BOUNDARY STATEMENTS

- "Bridge-derived findings are governed FindingReport entries, not
  lifecycle status; this publication does not update lifecycle status,
  adjudication, CoherencyDelta, WorkOrders, VerificationPlans, or
  source files." (rendered in both publications)
- Agent `Do Not Do`: "Do not treat bridge-derived FindingReport
  entries as lifecycle status, adjudication, CoherencyDelta
  remediation, WorkOrder creation, VerificationPlan creation, resolver
  routing, verification planning, RefactorPreservationContract, or
  source-write permission."

## PROOF REPORT DEFERRAL

Proof-report surfacing of bridge-derived findings is **deferred**:
finding provenance is governance context, not verification proof. The
proof-report concept + artifact docs carry an explicit "Not a
bridge-derived findings surface" deferral; the helper also emits a
proof-deferral line (`BRIDGE_DERIVED_FINDINGS_PROOF_DEFERRAL_LINE`).

## TESTS / VERIFICATION

- New 23-assertion contract test (helper identification by
  type/details/source*, no title-only classification, arch summary +
  agent contract rendering, severity distribution, bounded provenance
  table, boundary statement, inputRefs citation, Do Not Do reminder,
  no-mutation of FindingReport/lifecycle/adjudication/CoherencyDelta,
  no WorkOrder/VerificationPlan creation, proof-report deferral docs
  scan, `artifacts validate` clean). All pass.
- New 11-assertion docs test. All pass.
- Full 9-command gate + CLI smoke (publish architecture + agent
  contract; `artifacts validate` clean).

## INTENTIONALLY UNTOUCHED

- The `FindingReport` writer (`--confirm-finding-write`) and dry-run
  behavior.
- `FindingReport`, `FindingFilterReport`, `FindingLifecycleReport`,
  `IssueAdjudicationReport`, `CoherencyDelta`.
- `WorkOrder` / `VerificationPlan`.
- The proof-report publisher (bridge-derived deferral preserved).
- The preview `Capability Lint Finding Bridge` publication section
  (unchanged; the new section is distinct).
- `pnpm-lock.yaml` (left unstaged per workflow).

## RISKS / FOLLOW-UP

- **Risk:** a reader could misread the section as lifecycle status.
  *Mitigation:* the boundary statement + agent `Do Not Do` reminder
  ship verbatim and are test-pinned.
- **Risk:** future finding types could collide with the
  `capability_architecture_policy` signal. *Mitigation:* identification
  also requires the `details.source*` provenance, which only the
  bridge writer stamps.
- **Follow-up:** bridge-derived findings publication safety review,
  then the lifecycle / `CoherencyDelta` integration decision.

## NEXT STEP

Recommended next slice: **bridge-derived findings publication safety
review** — review the surfacing and decide whether the
`FindingLifecycleReport` / `IssueAdjudicationReport` / `CoherencyDelta`
integration decision can begin. Still no lifecycle mutation, no
`CoherencyDelta` mutation, no `WorkOrder` / `VerificationPlan`
creation, no source writes.
