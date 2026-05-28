# Review Packet: CapabilityLintFindingBridgeReport v1

Forty-third slice on the codebase-intel-classic
capability-ontology track. Implements the
`CapabilityArchitectureLintReport` → `FindingReport` Bridge
Decision (shipped at `4ecc676`, Option B) as a preview-only
bridge artifact.

## CHANGES MADE

- **kernel-repo-model** (`packages/kernel-repo-model/src/index.ts`):
  added `CapabilityLintFindingBridgeReport` types
  (`CapabilityLintFindingBridgeDecision`,
  `CapabilityLintFindingBridgeReason`,
  `CapabilityLintFindingBridgeFindingRef`,
  `CapabilityLintFindingBridgeSourceLintRowRef`,
  `CapabilityLintFindingBridgeCandidate`,
  `CapabilityLintFindingBridgeSource`,
  `CapabilityLintFindingBridgeSummary`,
  `CapabilityLintFindingBridgeReport`), the
  `createCapabilityLintFindingBridgeReport` factory
  (dedupe-by-id, deterministic sort, summary recompute),
  `validateCapabilityLintFindingBridgeReport` +
  `assertCapabilityLintFindingBridgeReport`, the
  `capabilityLintFindingBridgeReportSchema`, and `BRIDGE_DECISIONS`
  / `BRIDGE_REASONS` validation sets.
- **capability-model**
  (`packages/capability-model/src/capability-lint-finding-bridge.ts`,
  new): `buildCapabilityLintFindingBridgeReport` — consumes only
  a `CapabilityArchitectureLintReport`, classifies each row, and
  assigns deterministic proposed finding ids. Exported from the
  package index.
- **sdk** (`packages/sdk/src/index.ts`): registered
  `CapabilityLintFindingBridgeReport` (schemaVersion 0.1.0,
  stability experimental) in the artifact type list.
- **runtime** (`packages/runtime/src/index.ts`): mapped
  `CapabilityLintFindingBridgeReport` → `actions` in the artifact
  category map.
- **cli** (`packages/cli/src/index.ts`): added the
  `rekon capability lint bridge-findings [--lint-report <ref>]
  [--root <path>] [--json]` command + help text.
- Tests, docs, CHANGELOG, README, review packet (this file).

## PUBLIC API CHANGES

- New artifact type: `CapabilityLintFindingBridgeReport`
  (experimental, schemaVersion 0.1.0).
- New `@rekon/kernel-repo-model` exports: the types above plus
  `createCapabilityLintFindingBridgeReport`,
  `validateCapabilityLintFindingBridgeReport`,
  `assertCapabilityLintFindingBridgeReport`,
  `capabilityLintFindingBridgeReportSchema`.
- New `@rekon/capability-model` exports:
  `buildCapabilityLintFindingBridgeReport`,
  `BuildCapabilityLintFindingBridgeReportInput`,
  `CAPABILITY_LINT_FINDING_BRIDGE_ARTIFACT_ID_PREFIX`,
  `CAPABILITY_LINT_FINDING_BRIDGE_FINDING_ID_PREFIX`.
- New CLI command: `rekon capability lint bridge-findings`.

All additive. No existing signatures changed. No version bump.

## PURPOSE PRESERVATION CHECK

- **Original problem.** `CapabilityArchitectureLintReport` emits
  evaluation rows; violation rows may carry `findingCandidate`
  previews. Operators need a dry-run bridge showing which rows
  are eligible to become governed findings later. Writing
  `FindingReport` directly is too much blast radius for v1.
- **Product guarantee preserved.** Bridge output is
  preview-only. Eligibility is explicit and auditable. Proposed
  finding ids are deterministic. Governance artifacts remain
  untouched. Any future `FindingReport` writer must go through
  its own decision and safety review.
- **Boundary held.** The bridge writes no `FindingReport`,
  mutates no `FindingFilterReport` / `FindingLifecycleReport` /
  `IssueAdjudicationReport` / `CoherencyDelta`, and creates no
  `WorkOrder` / `VerificationPlan`. Verified by contract tests
  18–23.

## CODEBASE-INTEL ALIGNMENT

The bridge keeps the classic separation between evaluation and
governed findings. It is the Rekon-native preview step that lets
operators see candidate findings before any writer promotes
them — preserving the "issues survive across runs, false
positives are explainable" discipline by *not* short-circuiting
the filter → ledger → adjudication → delta chain.

## ARTIFACT MODEL

`CapabilityLintFindingBridgeReport` = `{ header, source,
summary, candidates[] }`. One candidate per lint row:
`decision` (eligible | ineligible | needs-review), `reason`,
copied `severity` / `confidence`, and (for eligible /
needs-review) a `proposedFinding` with a deterministic id and a
`sourceLintRowRef` citation. Summary counts are re-derived from
candidates by the factory; stale summaries are rejected by the
validator.

## ELIGIBILITY RULES

Eligible only when: `status === "violation"` + `findingCandidate`
present + confidence high/medium + severity high/medium +
non-empty `evidenceRefs`. Otherwise ineligible with the first
matching reason. Duplicate proposed finding ids → later rows
become `needs-review` (`duplicate-candidate`), deterministic
first kept.

## CLI SURFACE

```sh
rekon capability lint bridge-findings [--root <path>] [--json]
rekon capability lint bridge-findings --lint-report <CapabilityArchitectureLintReport:id> [--json]
```

Reads latest/pinned lint report, writes the bridge report under
`actions/`, prints eligible/ineligible/needs-review counts, says
"No FindingReport entries were written."

## GOVERNANCE BOUNDARY

- No `FindingReport` write.
- No `FindingFilterReport` / `FindingLifecycleReport` /
  `IssueAdjudicationReport` / `CoherencyDelta` mutation.
- No `WorkOrder` / `VerificationPlan` creation.
- No resolver routing or verification planning by capability.
- No `RefactorPreservationContract`. No source writes. No LLM
  inference. No network.

## TESTS / VERIFICATION

- `tests/contract/capability-lint-finding-bridge-report.test.mjs`
  — 24 required assertions + 1 bonus registry check (25 total,
  all passing): validation, every eligibility branch, duplicate
  detection, deterministic id, summary counts, ref copying, CLI
  write / pinned / output text, and purity / no-creation for
  FindingReport, FindingFilterReport, FindingLifecycleReport,
  CoherencyDelta, WorkOrder, VerificationPlan, plus
  `artifacts validate` clean.
- `tests/docs/capability-lint-finding-bridge-report.test.mjs`
  — 9 assertions.
- Full gate: typecheck / test / build / git diff --check /
  audit-package-exports / audit-license / publish-dry-run /
  install-smoke / install-tarball-smoke.
- CLI smoke on `tests/fixtures/js-ts-ast-evidence`.

## INTENTIONALLY UNTOUCHED

- The governed-findings pipeline (FindingReport, filters,
  lifecycle, adjudication, CoherencyDelta).
- `CapabilityArchitectureLintReport` evaluation logic and its
  publication surfacing.
- Resolver routing, verification planning, reconciliation,
  source writes.

## RISKS / FOLLOW-UP

- The bridge is preview-only; a future `FindingReport` writer is
  a separate decision + safety review (explicitly out of scope).
- Publication surfacing of the bridge report is deferred to a
  later slice.
- Next recommended slice: **CapabilityLintFindingBridgeReport
  safety review** — review the preview bridge before any
  publication surfacing or `FindingReport` writer decision.

## NEXT STEP

`CapabilityLintFindingBridgeReport` safety review. Still no
`FindingReport` mutation, no lifecycle mutation, no
`CoherencyDelta` mutation, no `WorkOrder` / `VerificationPlan`
creation, no source writes.
