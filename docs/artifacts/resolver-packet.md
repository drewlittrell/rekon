# ResolverPacket

## Purpose

`ResolverPacket` is a resolved output artifact written by every resolver
phase: `resolve.route`, `resolve.seam`, `resolve.preflight`, and
`resolve.issue`. Every packet shares an explainable header + trace
contract; each phase adds a phase-specific payload.

Phases:

- `route` — given a goal and paths, decide owner spread and whether to
  proceed directly to preflight or stage a seam first.
- `seam` — designate the primary owner across multiple owners and record
  secondary owners, or escalate when a primary cannot be chosen.
- `preflight` — resolve ownership, attach findings and memory, evaluate
  risk, and emit recommended context.
- `issue` — find a `Finding` by id or fragment, resolve ownership for the
  finding's files, and recommend the next resolver.

See [../concepts/resolvers.md](../concepts/resolvers.md) for the phase
flow and CLI surface.

## Produced By

- `@rekon/capability-resolver`

## Consumed By

- `@rekon/capability-docs`
- `@rekon/capability-intent`
- users and agents preparing scoped work

## Required Header Fields

All standard `ArtifactHeader` fields are required. `artifactType` is
`ResolverPacket`.

## Common Fields

Shared across phases:

- `resolverId` (e.g., `resolve.route`)
- `phase` (`route` / `seam` / `preflight` / `issue`)
- `summary`
- `warnings`
- `nextSteps`
- `resolutionTrace`

Preflight phase adds:

- `goal`
- `paths`
- `ownerSystems`
- `matchedScopes`
- `risk`
- `requiredChecks`
- `relevantFindings`
- `recommendedContext`
- `applicableMemory`

Route phase adds:

- `goal`, `concern`, `paths`, `ownerSystems`, `matchedScopes`
- `routing` (`status`, `primaryOwner`, `candidateOwners`, `needsSeam`,
  `rationale`)
- `recommendedContext`, `requiredChecks`
- `nextRequiredResolver` (`resolve.seam` | `resolve.preflight`)

Seam phase adds:

- `goal`, `paths`, `ownerSystems`, `primaryOwner`, `secondaryOwners`
- `seam` (`status`, `rationale`, `escalate`)
- `recommendedContext`, `requiredChecks`
- `nextRequiredResolver` (`resolve.preflight` when resolved)

Issue phase adds:

- `query`, `issue` (matched finding summary), `relatedFindings`
- `issueGroup` (v2 group mode only; carries the adjudicated group
  summary including `canonicalFindingId`, `memberFindingIds`,
  `groupingReasons`, `statusBreakdown`)
- `matchSource` — `"IssueAdjudicationReport"` when the match came
  from an adjudicated group, `"FindingReport"` when it came from
  the raw fallback path, `undefined` when no match was found
- `ownerSystems`, `matchedScopes`
- `recommendedContext`, `requiredChecks`
- `nextRequiredResolver` (`resolve.route` | `resolve.seam` |
  `resolve.preflight`)
- `verification` — the worst-status `VerificationEvidenceSummary`
  across all member findings in group mode, or the single-finding
  summary in raw mode
- `verificationByFinding` — per-member verification entries
  (`findingId`, `status`, `verificationResultRef?`,
  `verificationPlanRef?`, `workOrderRef?`); present only in group
  mode
- `mergeRollup` — `IssueMergeRollupSummary` populated only when
  the matched group is part of an operator-accepted merged
  rollup in the latest `CoherencyDelta` (v3). Carries the rollup
  id, the underlying `mergedIssueGroupIds` (always > 1 when
  present), the `mergeDecisionIds` / `mergeCandidateIds` that
  produced it, the unioned `memberFindingIds`, the worst severity
  in the bucket, the rollup status, and the active flag. Absent
  when no merged rollup contains the matched group, when the
  latest decision is `rejected`, or when there is no
  `CoherencyDelta` in the store. When `mergeRollup` is present
  the packet also adds a `Matched issue group is part of an
  operator-accepted merged roll-up; inspect sibling group(s) …
  before acting.` warning and an `issue.merge` /
  `sourceType: "CoherencyDelta"` / `status: "used"` entry to
  `resolutionTrace`. The packet's `header.inputRefs` also adds
  the `CoherencyDelta` ref the rollup came from. The resolver
  does not read `IssueMergeDecisionLedger` directly; all rollup
  metadata flows through `CoherencyDelta` only.

When an [IssueAdjudicationReport](issue-adjudication-report.md)
exists in the store, `resolve.issue` prefers adjudicated groups
over raw findings (v2 group mode). Matching order against the
latest report:

1. exact `group.id`
2. exact `group.canonicalFindingId`
3. exact member `findingId` (any entry of `memberFindingIds`)
4. unique substring across `group.id`, `canonicalFindingId`,
   any member id, `type`, `title`, `description`, `ruleId`

Ambiguous substring matches (more than one group) emit a warning
and a `relatedFindings`-style list of candidate canonical
findings; the resolver does **not** silently choose. When no
adjudication report exists, or no group matches the query, the
resolver falls back to the raw `FindingReport` / lifecycle
matching unchanged. The fallback emits a trace entry citing the
adjudication report (`sourceType:
"IssueAdjudicationReport"`, `status: "fallback"`) so the trail
explains why raw mode ran.

When a [FindingStatusLedger](finding-status-ledger.md) is indexed,
`resolve.issue` annotates the matched `issue` with effective status:

- `issue.status` — `accepted`, `ignored`, or `resolved` from the
  latest ledger decision.
- `issue.statusSource` — `ledger` when a decision overrode the
  raw-report status.
- `issue.statusNote` and `issue.statusReason` — the decision's note
  and optional reason.

The resolver also adds a warning when the matched finding is ignored
("verify before acting"), accepted ("verify policy before changing"),
or resolved ("confirm whether action is still needed"). See
[../concepts/finding-lifecycle.md](../concepts/finding-lifecycle.md).

`resolve.issue` also attaches a `verification:
VerificationEvidenceSummary` field to the packet when a matched
finding has any associated remediation work:

- `verification.status` — `passed`, `failed`, `partial`, `not-run`,
  or `missing`.
- `verification.verificationResultRef` / `verificationPlanRef` /
  `workOrderRef` — the artifacts the lookup walked through, in order
  `findingId -> WorkOrder.remediationItems -> VerificationPlan.workOrderRef
  -> VerificationResult.verificationPlanRef`.
- `verification.summary` — passed/failed/skipped/notRun counts from
  the linked `VerificationResult`.
- `verification.recordedAt` / `verification.recordedBy` — provenance
  from the linked `VerificationResult`.
- `verification.matchedFindingIds` — the finding ids matched against
  the remediation work order's `remediationItems`.
- `verification.warnings` — non-fatal notes from the lookup itself
  (e.g. "Remediation WorkOrder exists but no VerificationPlan
  references it.").

Each status (except `passed`) appends a warning to the packet's
top-level `warnings[]`; an `issue.verification` entry is added to the
`resolutionTrace` with `sourceType` set to the deepest artifact that
was found (`VerificationResult`, `VerificationPlan`, `WorkOrder`, or
`Fallback`). Passing verification does **not** mutate the
`FindingStatusLedger`, change `issue.status`, or hide the issue. See
[../concepts/verification-results.md](../concepts/verification-results.md).

In v2 group mode, verification is **aggregated across every
member finding** by looking each id up through
`lookupVerificationEvidence` and picking the worst status
(`failed > partial > not-run > missing > passed`). The packet's
top-level `verification` reflects the worst summary, while
`verificationByFinding` carries one entry per member id so
reviewers can see which finding contributed the worst evidence.
Group mode never mutates findings or the status ledger; a passing
aggregated verification still does not auto-resolve the group.

`resolutionTrace` explains why the packet contains its ownership and risk
answers. Trace entries include:

- `step`
- `sourceType`
- `sourceRef` when a concrete artifact was checked or used
- `status`
- `message`
- optional `paths`, `systems`, `confidence`, and `details`

For `resolve.preflight`, ownership resolution checks sources in this order:

1. `OwnershipMap`
2. `ObservedRepo`
3. ownership `GraphSlice`
4. raw `EvidenceGraph` `ownership_hint` facts

Fallbacks are recorded explicitly. Silent fallback is not acceptable for
resolver packets.

## Example Resolution Trace

```json
{
  "step": "ownership.resolve",
  "sourceType": "OwnershipMap",
  "sourceRef": {
    "type": "OwnershipMap",
    "id": "ownership-map-123",
    "schemaVersion": "0.1.0"
  },
  "status": "used",
  "message": "Resolved owner system from OwnershipMap.",
  "paths": ["src/index.ts"],
  "systems": ["src"],
  "confidence": 0.9,
  "details": {
    "matches": [
      {
        "path": "src/index.ts",
        "matchedPath": "src/index.ts",
        "owner": "src",
        "confidence": 0.9
      }
    ]
  }
}
```

## Risk Trace

Risk rules also write trace entries. For example, multiple owner systems produce
a high-risk trace with `details.rule` set to `multiple_owner_systems`.

## Freshness And Provenance

Resolver packets point to the snapshot and artifacts they used through
`inputRefs`. If they fall back to raw evidence, the fallback appears in
`resolutionTrace` and `warnings`.
