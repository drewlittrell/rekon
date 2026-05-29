# Review Packet — CapabilityLintFindingBridgeReport → FindingReport Writer Dry-Run Safety Review

**Slice:** forty-ninth on the codebase-intel-classic
capability-ontology track. Strategy / safety-review batch.
Follows the FindingReport writer dry-run helper / CLI at `cf87e59`.

## CHANGES MADE

- New strategy memo
  `docs/strategy/capability-lint-finding-writer-dry-run-safety-review.md`
  (12 headings; surface / flag / boundary / option tables; 8
  pinned statements).
- New review packet (this file).
- New docs test
  `tests/docs/capability-lint-finding-writer-dry-run-safety-review.test.mjs`
  (16 assertions).
- Cross-reference / "Update (forty-ninth slice)" notes added to
  the writer-decision memo, bridge artifact + concept docs,
  finding-report, finding-lifecycle, graph-aware-finding-filters,
  coherency-delta, remediation-work-orders, work-order,
  verification-plan, both roadmaps, README, and CHANGELOG.

## PUBLIC API CHANGES

None. Strategy / safety-review-only batch. No package source under
`packages/` changed. No types, validators, CLI commands, or
exports were added or modified. No artifact schema changed.

## PURPOSE PRESERVATION CHECK

- **Original problem.** The dry-run helper / CLI is the first
  concrete model of the future `FindingReport` writer. Before a
  write-mode decision, Rekon must safety-review the dry-run surface
  and confirm it cannot mutate governed finding or remediation
  artifacts.
- **Decision.** The dry-run helper / CLI is **safe / stable as
  preview-only writer modeling**; no blocker found.
- **Product guarantee preserved.** Dry-run is preview-only and
  faithfully models the future `FindingReport` body; it writes no
  `FindingReport`, mutates no governance artifact, does not mutate
  the artifact index, creates no `WorkOrder` / `VerificationPlan`,
  requires `--dry-run`, and rejects all write-ish flags. Write
  mode remains deferred to a later explicit decision and its own
  safety review.
- **No regression.** No runtime behavior changed; the helper, CLI,
  bridge, publications, and governance chain are untouched.

## CODEBASE-INTEL ALIGNMENT

- Confirms the dry-run-first posture (proven by the GitHub Check
  and PR-comment publishers) is preserved for the future writer.
- Confirms the evaluation → preview-candidate → governed-finding
  boundary is intact: the dry-run models the body without crossing
  into governed findings.
- Confirms `FindingReport` immutability framing: the modeled body
  describes a NEW artifact a future writer would emit, never an
  in-place mutation.

## HELPER / CLI REVIEWED

`buildFindingReportWritePreview` is pure (`dryRun: true`,
`wouldWrite: false`, no I/O, builds no artifact). The CLI
`rekon capability lint write-findings --bridge-report <id|type:id>
--dry-run` reads only the bridge report, calls the helper, prints
the preview, and never calls `store.write`. Eligibility
re-validates every structural prerequisite; duplicate finding ids
are skipped deterministically. Contract test (27) + docs test (9)
+ CLI smoke cover the surface.

## DRY-RUN REQUIREMENT REVIEW

`--dry-run` is required: the command throws (exit 1) when it is
absent. There is no implicit or default write path.

## WRITE-ISH FLAG REJECTION REVIEW

`--confirm-finding-write`, `--write`, `--send`, and `--execute` are
collected and rejected (exit 1) ahead of bridge resolution, with a
"write mode is deferred" message. A write-ish flag never reaches
helper or store code.

## PROPOSED FINDINGREPORT BODY REVIEW

`proposedFindingReport` models the future write: `artifactType:
"FindingReport"`, `source: "capability-lint-bridge"`, `inputRefs`
(bridge + lint + contract + map when present), and `findings[]`
preserving the deterministic `proposedFinding` id + trace fields
(`sourceBridgeCandidateId` / `sourceLintRowId` / `sourceContractId`
/ `sourcePhraseCapabilityId`) + `title` / `category` / `severity` /
`evidenceRefs`. Complete enough for future writer design; remains a
preview value (no header, not indexed).

## GOVERNANCE MUTATION BOUNDARY

- Dry-run writes no `FindingReport`; mutates no existing
  `FindingReport`.
- Dry-run mutates no `FindingFilterReport`,
  `FindingLifecycleReport`, `IssueAdjudicationReport`, or
  `CoherencyDelta`.
- Dry-run creates no `WorkOrder` and no `VerificationPlan`.
- No source writes. Enforced structurally (pure helper; CLI never
  calls `store.write`); verified by before/after contract-test
  snapshots.

## ARTIFACT INDEX BOUNDARY

Dry-run does not mutate the artifact index. `store.init()` is
read-only; no artifact is written. The contract test snapshots the
registry index file content before/after and asserts equality.

## RECOMMENDATION

The FindingReport writer dry-run helper / CLI is **safe / stable
as preview-only writer modeling.** Proceed to the
**CapabilityLintFindingBridgeReport → FindingReport writer mode
decision** (opt-in write mode requiring explicit confirmation;
its own decision + safety review). Write mode remains deferred.

## TESTS / VERIFICATION

- New docs test (16 assertions): memo headings + 8 pinned
  statements + 4 tables + CHANGELOG mention + review-packet PURPOSE
  PRESERVATION CHECK.
- Full 9-command gate: `npm run typecheck`, `npm run test`,
  `npm run build`, `git diff --check`,
  `node scripts/audit-package-exports.mjs`,
  `node scripts/audit-license.mjs`,
  `node scripts/publish-dry-run.mjs`,
  `node scripts/install-smoke.mjs`,
  `node scripts/install-tarball-smoke.mjs`.
- No CLI smoke (strategy-only batch; no runtime surface changed).

## INTENTIONALLY UNTOUCHED

- `packages/capability-model/src/finding-report-write-preview.ts`
  (dry-run helper) — unchanged.
- `packages/cli/src/index.ts` (write-findings command) —
  unchanged.
- All governance artifacts: `FindingReport`, `FindingFilterReport`,
  `FindingLifecycleReport`, `IssueAdjudicationReport`,
  `CoherencyDelta` — no writer, no mutation.
- `WorkOrder` / `VerificationPlan` generators — untouched.
- No write mode, no `--confirm-finding-write`, no resolver routing,
  no verification planning, no `RefactorPreservationContract`, no
  source writes, no npm publish, no version bump, no branch.

## RISKS / FOLLOW-UP

- **Risk:** the writer-mode decision could authorize a write path
  without its own safety review. *Mitigation:* this memo pins write
  mode behind its own explicit decision and safety review.
- **Risk:** the proposed body's field mapping is preview-shaped,
  not the concrete `Finding` shape. *Mitigation:* the exact mapping
  is pinned for the writer-implementation slice; the dry-run is
  explicitly a preview.
- **Follow-up:** writer mode decision (next slice), then opt-in
  write mode only if approved, then a post-writer safety review.

## NEXT STEP

Recommended next slice: **CapabilityLintFindingBridgeReport →
FindingReport writer mode decision** — decide whether/how to add an
opt-in write mode requiring explicit confirmation. Still no writer
implementation, no lifecycle / `CoherencyDelta` mutation, no
`WorkOrder` / `VerificationPlan` creation, no source writes.
