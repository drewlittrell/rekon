# Review Packet — BridgeFindingLifecycleIntegrationReport v1

Slice 57 on the capability-ontology track. Implements the preview
artifact chosen by the
[lifecycle / CoherencyDelta integration decision](../../docs/strategy/bridge-finding-lifecycle-integration-decision.md)
(Option B).

## CHANGES MADE

- **New artifact type `BridgeFindingLifecycleIntegrationReport`**
  registered in the three-package surface:
  - `packages/kernel-repo-model/src/index.ts` — types, the
    `createBridgeFindingLifecycleIntegrationReport` factory (dedupes by
    entry id, sorts by `(findingId, id)`, recomputes summary, normalizes
    source refs, asserts), `validateBridgeFindingLifecycleIntegrationReport`
    / `validateBridgeFindingLifecycleIntegrationEntry`,
    `assertBridgeFindingLifecycleIntegrationReport`, and
    `bridgeFindingLifecycleIntegrationReportSchema`.
  - `packages/sdk/src/index.ts` — `KNOWN_ARTIFACT_TYPES` entry
    (`schemaVersion 0.1.0`, `stability experimental`).
  - `packages/runtime/src/index.ts` — `ARTIFACT_CATEGORY_BY_TYPE`
    mapping to `actions`.
- **New builder `buildBridgeFindingLifecycleIntegrationReport`** in
  `packages/capability-model/src/bridge-finding-lifecycle-integration.ts`,
  plus `isBridgeDerivedFinding`, the `*FindingLike` /
  `*FindingReportLike` structural read types, and the artifact-id-prefix
  constant. Exported from `packages/capability-model/src/index.ts`.
- **New CLI command `rekon capability lint lifecycle-preview`** in
  `packages/cli/src/index.ts` — reads the latest or `--finding-report`
  pinned `FindingReport`, builds the preview, writes it under
  `actions`, and prints JSON or a human summary with the governance
  boundary statement.
- **Docs**: new artifact reference
  `docs/artifacts/bridge-finding-lifecycle-integration-report.md`, new
  concept `docs/concepts/bridge-finding-lifecycle-integration.md`,
  CHANGELOG / README / roadmap entries, and cross-reference updates to
  the decision doc, the publication safety review, `finding-report.md`,
  `finding-lifecycle.md`, `graph-aware-finding-filters.md`,
  `coherency-delta.md`, `remediation-work-orders.md`, `work-order.md`,
  and `verification-plan.md`.
- **Tests**: new contract test
  `tests/contract/bridge-finding-lifecycle-integration-report.test.mjs`
  (23 assertions) and docs test
  `tests/docs/bridge-finding-lifecycle-integration-report.test.mjs`
  (11 assertions).

## PUBLIC API CHANGES

- `@rekon/kernel-repo-model` adds the
  `BridgeFindingLifecycleIntegrationReport` type family, factory,
  validators, assert, and schema. Additive.
- `@rekon/capability-model` adds
  `buildBridgeFindingLifecycleIntegrationReport`,
  `isBridgeDerivedFinding`, the `Like` read types, and constants.
  Additive.
- `@rekon/sdk` and `@rekon/runtime` learn the new artifact type
  (known-types list and category map). Additive.
- CLI gains one new subcommand. No existing command changed.

## PURPOSE PRESERVATION CHECK

The capability ontology's governed boundary is unchanged. The pipeline
still terminates at a `FindingReport`; findings still enter lifecycle
through the existing governed path. This slice adds a **read-only
preview** that *models* eligibility — it does not move findings into
lifecycle, does not adjudicate, and does not touch `CoherencyDelta`.
The controlled `write-findings --confirm-finding-write` writer is
unchanged. No new authority to mutate governed state was introduced.
The `initialLifecycleStatus` field is explicitly a modeled value (`new`
for ready entries, never `resolved`), not a written lifecycle status.

## CODEBASE-INTEL ALIGNMENT

The new artifact type was registered exactly where the established
new-artifact-type surface requires (kernel-repo-model factory/validator/
schema, SDK known-types, runtime category) — mirroring
`CapabilityLintFindingBridgeReport` — and nowhere else. Runtime
validation is header-generic (`validateArtifactHeader`), so no per-type
body-schema registry wiring was needed. `@rekon/capability-model` keeps
its dependency set (kernel-artifacts, kernel-repo-model, sdk) and reads
`FindingReport` structurally via a `Like` type, with no new dependency
on `@rekon/kernel-findings`.

## ARTIFACT MODEL

`BridgeFindingLifecycleIntegrationReport` carries `source`
(`findingReportRef` required; `filterReportRef` / `lifecycleReportRef`
/ `issueAdjudicationReportRef` optional citation refs), a `summary`
(`totalBridgeFindings`, `readyForLifecycle`, `filtered`, `needsReview`,
`duplicate`, `ineligible`, `bySeverity`), and `entries[]`. Each entry
has a stable id (`<findingId>#<index>`), `findingId`, `decision`,
optional modeled `initialLifecycleStatus`, `severity`, the bridge trace
fields, `evidenceRefs`, and optional `messages`. The factory dedupes
entries by id, sorts by `(findingId, id)`, recomputes the summary from
entries, and asserts the schema.

## CLASSIFICATION MODEL

Bridge-derived findings are identified structurally —
`type === "capability_architecture_policy"`,
`details.source === "capability-lint-bridge"`, or any non-empty
`details.source*` trace field — never by title text. For each
bridge-derived finding, in `FindingReport.findings` order: no evidence
→ `ineligible`; evidence but missing `sourceLintRowId` +
`sourceContractId` → `needs-review`; a repeat of an earlier ready
finding id → `duplicate`; otherwise → `ready-for-lifecycle` with modeled
`initialLifecycleStatus new`. Non-bridge findings are **omitted** (not
listed as ineligible). Severity is coerced: critical/high → `high`,
medium → `medium`, else → `low`. `resolved` is never modeled. `filtered`
is reserved for a later slice; v1 does not run the filter chain.

## CLI SURFACE

`rekon capability lint lifecycle-preview [--root <path>] [--json]
[--finding-report <ref>]`. Reads the latest (or pinned) `FindingReport`,
writes the preview under `.rekon/artifacts/actions/`, and prints the
summary plus the explicit boundary statement: no
`FindingLifecycleReport`, `IssueAdjudicationReport`, or `CoherencyDelta`
changed; `FindingFilterReport` not mutated; no `WorkOrder` /
`VerificationPlan` created.

## GOVERNANCE BOUNDARY

Read-only preview. No mutation of `FindingFilterReport`,
`FindingLifecycleReport`, `IssueAdjudicationReport`, or `CoherencyDelta`.
No `WorkOrder` / `VerificationPlan` creation. No resolver routing or
verification planning by capability. No `RefactorPreservationContract`.
No source writes. No LLM-only inference. No version bumps, no npm
publish, no branch.

## TESTS / VERIFICATION

- Contract: `tests/contract/bridge-finding-lifecycle-integration-report.test.mjs`
  — 23 assertions. Helper-direct classification tests plus CLI
  integration tests that seed a deterministic bridge-derived
  `FindingReport` (the fixture produces zero eligible naturally) and
  assert the positive lifecycle-preview path, plus a
  before/after index count + digest check confirming the preview leaves
  every governed finding artifact type unchanged.
- Docs: `tests/docs/bridge-finding-lifecycle-integration-report.test.mjs`
  — 11 assertions over the artifact doc, concept doc, CHANGELOG, and
  this review packet.
- Full 9-command gate green; CLI smoke runs the work order's explicit
  sequence ending in `capability lint lifecycle-preview --json` and
  `artifacts validate --json`.

## INTENTIONALLY UNTOUCHED

`FindingReport` writer behavior; `FindingFilterReport`;
`FindingLifecycleReport`; `IssueAdjudicationReport`; `CoherencyDelta`;
`WorkOrder`; `VerificationPlan`; the deterministic finding-filter APIs
(consumed in a later slice, not run here); the `FindingStatusLedger`;
resolver routing; verification planning; all version numbers.

## RISKS / FOLLOW-UP

- The preview reserves `filtered` but does not run the filter chain;
  the eventual lifecycle slice must wire the deterministic filter APIs
  in and reconcile the modeled `filtered` decision against real filter
  output.
- `initialLifecycleStatus` is modeled; a future writer must not treat
  the preview as authoritative — it re-derives from live inputs.
- Duplicate detection is per-report (within one `FindingReport`); a
  cross-report dedupe against the live `FindingStatusLedger` is a
  follow-up for the writer slice.

## NEXT STEP

BridgeFindingLifecycleIntegrationReport safety review.
