# Review Packet — CapabilityLintFindingBridgeReport → FindingReport Writer Implementation

**Slice:** fifty-first on the codebase-intel-classic
capability-ontology track. Product capability batch (controlled
writer). Implements the opt-in write mode selected by the
writer-mode decision at `584beb3`.

## CHANGES MADE

- `rekon capability lint write-findings` gains an opt-in write
  mode (`--confirm-finding-write`) alongside the existing
  `--dry-run` preview (`packages/cli/src/index.ts`). Added
  `createFindingReport` to the CLI's `@rekon/kernel-findings`
  import.
- New contract test
  `tests/contract/capability-lint-finding-writer.test.mjs` (25
  assertions across 9 test blocks).
- New docs test
  `tests/docs/capability-lint-finding-writer.test.mjs` (11
  assertions).
- New review packet (this file).
- Docs: writer-mode-decision memo gains a Writer Implementation
  section; dry-run safety review, writer-decision memo, bridge
  artifact + concept docs, finding-report, finding-lifecycle,
  graph-aware-finding-filters, coherency-delta,
  remediation-work-orders, work-order, verification-plan, both
  roadmaps, README, and CHANGELOG updated.

## PUBLIC API CHANGES

- New CLI mode: `rekon capability lint write-findings
  --confirm-finding-write` writes a new `FindingReport`. The
  `--dry-run` mode is unchanged. No new artifact type, no kernel /
  SDK / runtime change, no new package export. Additive only.

## PURPOSE PRESERVATION CHECK

- **Original problem.** The dry-run path can produce the exact
  proposed `FindingReport` body; operators need an explicit,
  confirmation-gated way to turn eligible bridge candidates into
  governed `FindingReport` artifacts, crossing only one boundary
  (preview bridge candidate → new `FindingReport` artifact).
- **Product guarantee preserved.** Write mode is opt-in, requires
  explicit `--confirm-finding-write`, reuses the dry-run preview,
  creates exactly one new `FindingReport`, mutates no existing
  governed artifact, and creates no `WorkOrder` /
  `VerificationPlan`. Lifecycle, filtering, adjudication, and
  `CoherencyDelta` remain downstream. Source writes remain
  unavailable.
- **No regression.** Dry-run behavior is byte-for-byte preserved
  (preview only, writes nothing). The contract test snapshots a
  pre-existing `FindingReport` and proves it is never mutated in
  place, and that all downstream governance artifact counts stay
  unchanged.

## CODEBASE-INTEL ALIGNMENT

- Mirrors the dry-run-first / single-confirmation-flag posture of
  the GitHub Check and PR-comment publisher write paths; generic
  write-ish aliases stay rejected.
- Honors `FindingReport` immutability: a NEW artifact is always
  created; the existing report is never appended in place.
- Keeps the governed finding pipeline (filters → status ledger →
  lifecycle → adjudication → `CoherencyDelta` → remediation) as the
  single downstream path for any written finding; the writer
  participates in none of it.
- Reuses `buildFindingReportWritePreview` so write mode is
  "preview + persist", not a divergent code path.

## WRITE MODE MODEL

Write mode builds the dry-run preview, runs before-write safety
checks, maps `preview.proposedFindingReport.findings` to the
governed `Finding` shape (category → `type`; trace fields →
`details`; severity / evidenceRefs / id preserved), constructs a
`FindingReport` header citing the preview `inputRefs`, calls
`createFindingReport`, and writes one artifact under
`findings/`. JSON output: `{ dryRun: false, wouldWrite: true,
artifact, source.bridgeReportRef, summary }`.

## DRY-RUN PRESERVATION

`--dry-run` is unchanged: it builds the same preview and prints
`dryRun: true` / `wouldWrite: false`, writes no artifact, and
mutates no index. The contract test asserts the FindingReport
count is unchanged after a dry-run.

## CONFIRMATION POLICY

`--confirm-finding-write` is the only path into write mode.
`--dry-run` and `--confirm-finding-write` are mutually exclusive.
Running with neither errors. `--write` / `--send` / `--execute`
exit non-zero with "not accepted".

## FINDINGREPORT WRITE MODEL

A new `FindingReport` artifact only — never an in-place mutation.
`header.inputRefs` cite `CapabilityLintFindingBridgeReport` +
upstream lint / contract / map refs. Per finding: `id` (preserved),
`type` = category (`capability_architecture_policy`), `title`,
`description` (synthesized), `severity` (preserved), `subjects`
(`[sourceContractId]`), `evidence` (preserved evidenceRefs),
`details` (source + trace fields). Refuses to write if proposed
findings count is 0, if ids are not unique, or if any finding lacks
`evidenceRefs`.

## GOVERNANCE BOUNDARY

- Writes only a new `FindingReport`.
- Does not mutate an existing `FindingReport`.
- Does not mutate `FindingFilterReport`, `FindingLifecycleReport`,
  `IssueAdjudicationReport`, or `CoherencyDelta`.
- Creates no `WorkOrder` and no `VerificationPlan`.
- No resolver routing, no verification planning, no
  `RefactorPreservationContract`, no source writes.
- Lifecycle / filtering / adjudication / `CoherencyDelta` /
  `WorkOrder` / `VerificationPlan` remain downstream of the written
  `FindingReport`.

## TESTS / VERIFICATION

- Contract test (25 assertions): dry-run preserved; write mode
  writes exactly one FindingReport with preserved id / severity /
  evidenceRefs and bridge + upstream citations; 0-findings fails
  and writes nothing; `--dry-run`/`--confirm-finding-write`
  mutually exclusive; `--write`/`--send`/`--execute` rejected;
  missing `--bridge-report` fails; pre-existing FindingReport not
  mutated in place (count +1 only); all downstream governance
  counts unchanged; `artifacts validate` clean.
- Docs test (11 assertions).
- Full 9-command gate + CLI smoke (dry-run + write mode on a seeded
  eligible bridge).

## INTENTIONALLY UNTOUCHED

- `packages/capability-model/src/finding-report-write-preview.ts`
  (dry-run helper) — unchanged; reused.
- `@rekon/kernel-findings` `createFindingReport` — used as-is, not
  modified.
- All governance writers / artifacts — no mutation.
- `WorkOrder` / `VerificationPlan` generators — untouched.
- No resolver routing, no verification planning, no
  `RefactorPreservationContract`, no source writes, no npm publish,
  no version bump, no branch.

## RISKS / FOLLOW-UP

- **Risk:** a future caller could pass `--confirm-finding-write`
  unintentionally. *Mitigation:* it is a single, explicit,
  purpose-named flag, mutually exclusive with `--dry-run`, with
  before-write safety checks; the writer safety review (next
  slice) re-confirms the boundary.
- **Risk:** the written finding's field mapping (category→type,
  trace→details) is a writer convention. *Mitigation:* documented
  here and in the memo; the writer safety review reviews it
  end-to-end.
- **Follow-up:** FindingReport writer safety review, then any
  lifecycle / `CoherencyDelta` integration as a separate decision.

## NEXT STEP

Recommended next slice: **CapabilityLintFindingBridgeReport →
FindingReport writer safety review** — review the actual write
mode end-to-end before any lifecycle / `CoherencyDelta`
integration. Still no `FindingLifecycleReport` mutation, no
`CoherencyDelta` mutation, no `WorkOrder` / `VerificationPlan`
creation, no source writes.
