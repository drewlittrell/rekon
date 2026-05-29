# Review Packet — CapabilityLintFindingBridgeReport → FindingReport Writer Dry-Run Helper / CLI

**Slice:** forty-eighth on the codebase-intel-classic
capability-ontology track. Product capability batch (dry-run
preview only). Implements step 2 of the FindingReport writer
decision at `d8059aa`.

## CHANGES MADE

- New pure helper
  `@rekon/capability-model.buildFindingReportWritePreview` in
  `packages/capability-model/src/finding-report-write-preview.ts`
  (+ exports from the package index). Reads a
  `CapabilityLintFindingBridgeReport`, selects eligible
  candidates, and returns a `FindingReportWritePreview`
  (`dryRun: true`, `wouldWrite: false`).
- New CLI command
  `rekon capability lint write-findings --bridge-report <id|type:id>
  --dry-run [--root <path>] [--json]` in `packages/cli/src/index.ts`,
  plus its help-text entry.
- New contract test
  `tests/contract/capability-lint-finding-writer-dry-run.test.mjs`
  (27 assertions across 16 test blocks).
- New docs test
  `tests/docs/capability-lint-finding-writer-dry-run.test.mjs`
  (9 assertions).
- New review packet (this file).
- Docs: writer-decision memo gains a Dry-Run Helper / CLI section
  + an Update note; bridge artifact + concept docs, finding-report,
  finding-lifecycle, graph-aware-finding-filters, coherency-delta,
  remediation-work-orders, work-order, verification-plan, both
  roadmaps, README, and CHANGELOG updated.

## PUBLIC API CHANGES

- `@rekon/capability-model` adds exports:
  `buildFindingReportWritePreview`,
  `FINDING_REPORT_WRITE_PREVIEW_SOURCE`,
  `FINDING_REPORT_WRITE_PREVIEW_CATEGORY`, and the types
  `BuildFindingReportWritePreviewInput`, `FindingReportWritePreview`,
  `FindingReportWritePreviewFinding`,
  `FindingReportWritePreviewSkipped`.
- New CLI subcommand `capability lint write-findings` (dry-run
  only). No artifact type registered; no kernel/SDK/runtime change.
- Additive only. No existing export, type, or command changed.

## PURPOSE PRESERVATION CHECK

- **Original problem.** `CapabilityLintFindingBridgeReport`
  eligible candidates are preview-only. The writer decision
  selected an opt-in writer with dry-run preview first. Before any
  write mode exists, operators need to inspect the exact
  `FindingReport` body that would be written.
- **Product guarantee preserved.** The dry-run shows the proposed
  `FindingReport` body, writes no `FindingReport`, mutates no
  governance artifact, creates no `WorkOrder` / `VerificationPlan`,
  and does not imply source writes. Write mode remains deferred to
  a later safety-reviewed slice.
- **No regression.** No existing runtime behavior changed; the
  bridge, publications, and governance chain are untouched. The
  command writes no artifact and does not mutate the artifact
  index (verified by before/after snapshots in the contract test).

## CODEBASE-INTEL ALIGNMENT

- Mirrors the dry-run-first posture proven by the GitHub Check and
  PR-comment publishers (dry-run default; write-ish flags rejected
  until a future, gated write mode).
- Preserves the evaluation → preview-candidate → governed-finding
  boundary maintained across the whole capability-ontology track.
- The proposed body models `FindingReport` immutability: a future
  writer would write a NEW artifact, never mutate one in place.
- Keeps the governed finding pipeline (filters → status ledger →
  lifecycle → adjudication → CoherencyDelta → remediation) as the
  single path any promoted candidate must travel.

## DRY-RUN MODEL

`buildFindingReportWritePreview({ bridgeReport, bridgeReportRef })`
returns `{ dryRun: true, wouldWrite: false, source, summary,
proposedFindingReport, skippedCandidates }`. `proposedFindingReport`
carries `artifactType: "FindingReport"`, `source:
"capability-lint-bridge"`, `inputRefs` (bridge + lint + contract +
map when present), and `findings[]` with id / title / category /
severity / evidenceRefs + the trace fields `sourceBridgeCandidateId`
/ `sourceLintRowId` / `sourceContractId` / `sourcePhraseCapabilityId`.
It is a preview value, not an artifact: nothing is written or
indexed.

## ELIGIBILITY POLICY

A candidate becomes a proposed finding only when all hold:
`decision === "eligible"`, `proposedFinding` exists, non-empty
`proposedFinding.evidenceRefs`, `proposedFinding.sourceLintRowRef`
exists, `severity` high/medium, `confidence` high/medium, and the
finding id is not already claimed. Every other candidate is skipped
with one deterministic reason: `candidate-ineligible`,
`candidate-needs-review`, `missing-proposed-finding`,
`low-severity`, `low-confidence`, `missing-evidence-refs`,
`missing-source-lint-row-ref`, or `duplicate-finding-id`. The
writer re-validates rather than trusting the bridge `decision`
field alone.

## CLI SURFACE

`rekon capability lint write-findings --bridge-report <id|type:id>
--dry-run [--root <path>] [--json]`. `--dry-run` is required;
`--confirm-finding-write` / `--write` / `--send` / `--execute` exit
non-zero with a "write mode is deferred" message. Reads only the
`CapabilityLintFindingBridgeReport`; writes no artifact; does not
mutate the artifact index. Human output: "No FindingReport entries
were written." + "Write mode is deferred." JSON output: the full
`FindingReportWritePreview`.

## GOVERNANCE BOUNDARY

- Does not write `FindingReport`; does not mutate an existing
  `FindingReport`.
- Does not mutate `FindingFilterReport`, `FindingLifecycleReport`,
  `IssueAdjudicationReport`, or `CoherencyDelta`.
- Creates no `WorkOrder` and no `VerificationPlan`.
- Does not mutate the artifact index; writes no source files.
- Adds no resolver routing, no verification planning, no
  `RefactorPreservationContract`.

## TESTS / VERIFICATION

- Contract test (27 assertions): helper eligibility / skip / dedup
  / id-preservation / inputRefs / trace fields; CLI `--dry-run`
  requirement, write-ish flag rejection, JSON shape; before/after
  snapshots proving no FindingReport / FindingFilterReport /
  FindingLifecycleReport / IssueAdjudicationReport / CoherencyDelta
  mutation, no WorkOrder / VerificationPlan creation, no index
  mutation; `artifacts validate` clean.
- Docs test (9 assertions): memo statements + CHANGELOG + review
  packet.
- Full 9-command gate + CLI smoke matrix on `js-ts-ast-evidence`.

## INTENTIONALLY UNTOUCHED

- `packages/capability-model/src/capability-lint-finding-bridge.ts`
  (bridge builder) — unchanged.
- `packages/kernel-repo-model` / `kernel-findings` types — no new
  artifact type registered; `FindingReport` type unchanged.
- SDK / runtime registration — unchanged (no new artifact type).
- All governance artifacts and their writers — unchanged.
- No write mode, no `--confirm-finding-write`, no npm publish, no
  version bump, no branch.

## RISKS / FOLLOW-UP

- **Risk:** a future write mode could be added without a safety
  review. *Mitigation:* the command hard-rejects all write-ish
  flags today; the decision memo pins write mode behind its own
  safety-reviewed slice.
- **Risk:** the proposed body's per-finding field mapping is
  preview-shaped, not the concrete `Finding` shape. *Mitigation:*
  the exact mapping onto `FindingReport.findings` is pinned for the
  writer-implementation slice; this dry-run is explicitly a
  preview.
- **Follow-up:** FindingReport writer dry-run safety review (next
  slice), then opt-in write mode only if approved.

## NEXT STEP

Recommended next slice: **CapabilityLintFindingBridgeReport →
FindingReport writer dry-run safety review** — review the dry-run
helper / CLI end-to-end before any actual writer implementation.
Still no `FindingReport` mutation, no governance mutation, no
`WorkOrder` / `VerificationPlan` creation, no source writes.
