# Review Packet — IntentStatusReport v1 Implementation

Eighty-sixth slice on the capability-ontology track. Product-capability batch
registering and implementing IntentStatusReport v1 as a read-only rollup status
report over the intent spine. Implements the IntentStatusReport v1 Decision at
`fdca86a`.

## CHANGES MADE

- **kernel-repo-model** (`packages/kernel-repo-model/src/index.ts`): added
  `IntentStatusReport` types (`IntentStatusValue`,
  `IntentStatusRecommendedNextAction`, `IntentStatusIssueCategory`,
  `IntentStatusSeverity`, `IntentStatusIssue`, `IntentStatusPhaseSummary`,
  `IntentStatusReportSource`, `IntentStatusReportRequest`, `IntentStatusProof`,
  `IntentStatusReport`), `createIntentStatusReport` factory (normalize, dedupe,
  deterministic sort, assert), `validateIntentStatusReport` /
  `assertIntentStatusReport`, and `intentStatusReportSchema`.
- **sdk** + **runtime**: registered `IntentStatusReport`
  (`BUILT_IN_ARTIFACT_TYPES` experimental 0.1.0; `ARTIFACT_CATEGORY_BY_TYPE`
  `actions`).
- **capability-model** (`packages/capability-model/src/intent-status-report.ts`):
  `buildIntentStatusReport` — reads the assessment, prepared plan, work order,
  verification plan/run/result, freshness, and drift VALUES; derives the overall
  status with freshness/drift overrides; builds the proof rollup and the
  deterministic blocker / warning / stale-input / missing-input lists.
- **cli** (`packages/cli/src/index.ts`): added `rekon intent status` with the
  optional pinned-ref flags and human / JSON output.
- **tests**: `tests/contract/intent-status-report.test.mjs` (25) +
  `tests/docs/intent-status-report.test.mjs` (12).
- **docs**: 2 new (`docs/artifacts/intent-status-report.md`,
  `docs/concepts/intent-status.md`) + cross-references + CHANGELOG + README +
  review packet.

## PUBLIC API CHANGES

- New artifact type `IntentStatusReport` (category `actions`).
- New exported kernel types + `createIntentStatusReport` /
  `validateIntentStatusReport` / `assertIntentStatusReport` /
  `intentStatusReportSchema`.
- New `@rekon/capability-model.buildIntentStatusReport` + `Like` input types +
  `INTENT_STATUS_REPORT_ARTIFACT_ID_PREFIX`.
- New `rekon intent status` CLI command. All additive.

## PURPOSE PRESERVATION CHECK

IntentAssessmentReport assesses readiness; PreparedIntentPlan prepares a
proof-approved plan; Rekon now needs a read-only status layer reporting where
the intent stands across assessment, preparation, work, proof, freshness, and
drift — without becoming verification, execution, remediation, or source-write
behavior. The implementation preserves that guarantee: IntentStatusReport is a
rollup that consumes existing artifacts read-only, reports the seven-area state,
reports (but does not grant) PreparedIntentPlan approval, creates no missing
artifacts, and executes nothing.

## CODEBASE-INTEL ALIGNMENT

Classic intent surfaces reported a rollup state derived from many inputs. This
re-homes that as a read-only Rekon artifact over the materialized spine rather
than a side effect of running work. No classic codebase-intel modules are
imported.

## ARTIFACT MODEL

`IntentStatusReport` = header + optional `source` refs + optional `request` +
`status` (value + recommendedNextAction) + summarized `phases` + `proof` rollup +
`blockers` / `warnings` / `staleInputs` / `missingInputs`. The factory normalizes
refs, dedupes + sorts phases (by id) and issues (severity, category, id), and
asserts.

## STATUS MODEL

15-value enum (`not-assessed` … `complete` / `unknown`). The helper derives the
status from input presence + each input's recorded state, then applies overrides:
a stale `PathFreshnessReport` overrides to `stale`; high-severity unresolved
`RuntimeGraphDriftReport` rows downgrade an advancing status to `needs-review`.
`complete` requires passed verification with no stale context and no
high-severity blockers (validator-enforced). Approved prepared plan → `work-ready`;
not-approved → `preparation-blocked`; needs-review → `needs-review`.

## PROOF ROLLUP MODEL

`proof` mirrors each input's recorded state (assessment readiness + counts;
preparation status + approvalStatus + counts; work status; verification
plan/run/result presence + resultStatus; freshness present + stale; runtimeDrift
counts). It copies values; it does not re-derive proof. VerificationResult is an
input to status, not the status artifact itself.

## BLOCKER / WARNING MODEL

Shared `IntentStatusIssue` (id, category, severity, message, optional
sourceRefs). Blockers: assessment-blocked, preparation-not-approved,
runtime-drift (high), verification-failed. Warnings: handoff-coverage.
staleInputs: stale-context. missingInputs: missing IntentAssessmentReport. All
lists deterministically ordered by severity, category, id.

## CLI SURFACE

`rekon intent status [--root <path>] [--json]` plus optional pinned-ref flags
(`--assessment`, `--prepared-plan`, `--work-order`, `--verification-plan`,
`--verification-run`, `--verification-result`, `--path-freshness`,
`--runtime-drift`, `--handoff-coverage`). Reads latest-or-pinned, writes one
`IntentStatusReport`, prints a status summary. Creates no WorkOrder /
VerificationPlan / VerificationRun; executes no commands; writes no source.

## BOUNDARY MODEL

IntentStatusReport is status reporting, not VerificationResult; it is not
WorkOrder; it does not create WorkOrder or VerificationPlan, execute commands,
write source, or implement intent:go; it reports PreparedIntentPlan approval
state but does not approve plans; VerificationResult is an input to status, not
the status artifact itself.

## TESTS / VERIFICATION

- `tests/contract/intent-status-report.test.mjs` — 25 cases (validation, every
  status transition, approval-reported-not-granted + no-mutation, freshness/drift
  overrides, proof rollup, determinism, CLI write + pinned ref + no-WorkOrder /
  no-VerificationPlan / no-VerificationRun / no-source / validate-clean).
- `tests/docs/intent-status-report.test.mjs` — 12 assertions.
- Full 9-command gate + CLI smoke (assess → prepare → status chain).

## INTENTIONALLY UNTOUCHED

No `IntentGoDecision`; no WorkOrder / VerificationPlan / VerificationRun /
VerificationResult creation; no command execution; no source writes; no approval
of prepared plans; no mutation of any input artifact; no classic codebase-intel
imports; no version bump; no npm publish; no branch.

## RISKS / FOLLOW-UP

- WorkOrder has no stable `status` field, so `work-in-progress` is inferred from
  presence; richer work-state reporting can follow if WorkOrder gains status.
- Drift downgrades even `verification-passed` to `needs-review` per the decision;
  this is conservative by design.
- Next: IntentStatusReport safety review.

## NEXT STEP

Recommend **IntentStatusReport safety review**: review the status artifact
end-to-end before any intent:go / WorkOrder-generation / VerificationPlan-generation
decision. Still no WorkOrder / VerificationPlan creation from intent, no command
execution, no source writes, no intent:go.
