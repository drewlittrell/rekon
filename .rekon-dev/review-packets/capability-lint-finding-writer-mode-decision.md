# Review Packet — CapabilityLintFindingBridgeReport → FindingReport Writer Mode Decision

**Slice:** fiftieth on the codebase-intel-classic
capability-ontology track. Strategy / architecture decision batch.
Follows the FindingReport writer dry-run safety review at
`b635337`.

## CHANGES MADE

- New decision memo
  `docs/strategy/capability-lint-finding-writer-mode-decision.md`
  (13 headings; option / confirmation / boundary / safety-check
  tables; answers all 10 required decision questions; pins the 7
  required boundary statements).
- New review packet (this file).
- New docs test
  `tests/docs/capability-lint-finding-writer-mode-decision.test.mjs`
  (16 assertions).
- Cross-reference / "Update (fiftieth slice)" notes added to the
  dry-run safety review, writer-decision memo, bridge artifact +
  concept docs, finding-report, finding-lifecycle,
  graph-aware-finding-filters, coherency-delta,
  remediation-work-orders, work-order, verification-plan, both
  roadmaps, README, and CHANGELOG.

## PUBLIC API CHANGES

None. Strategy / decision-only batch. No package source under
`packages/` changed. No types, validators, CLI commands, or
exports were added or modified. No artifact schema changed. No
`--confirm-finding-write` behavior added in code.

## PURPOSE PRESERVATION CHECK

- **Original problem.** The dry-run helper / CLI can now model the
  exact `FindingReport` body a writer would emit, and the dry-run
  path has passed safety review. The open question is whether to
  add an opt-in write mode and what gates it must satisfy before
  writing a governed `FindingReport`.
- **Decision.** Yes, via **Option B** — a future, opt-in write
  mode gated behind `--confirm-finding-write`, reusing the dry-run
  preview, writing a new `FindingReport` artifact only.
  Implementation deferred to its own slice and post-implementation
  safety review.
- **Product guarantee preserved.** No write mode ships in this
  decision slice. Any future write mode is explicit, opt-in, and
  confirmation-gated; it creates a new `FindingReport` artifact and
  never mutates an existing one; finding lifecycle, filtering,
  adjudication, `CoherencyDelta`, `WorkOrder`, and
  `VerificationPlan` remain downstream; source writes remain
  unavailable.
- **No regression.** No runtime behavior changed; the dry-run
  helper, CLI, bridge, publications, and governance chain are
  untouched.

## CODEBASE-INTEL ALIGNMENT

- Continues the dry-run-first / explicit-confirmation posture
  proven by the GitHub Check and PR-comment publisher write paths
  (single purpose-named confirmation flag; generic write-ish
  aliases rejected).
- Preserves `FindingReport` immutability: write mode creates a new
  artifact, never mutates one in place.
- Keeps the governed finding pipeline (filters → status ledger →
  lifecycle → adjudication → `CoherencyDelta` → remediation) as the
  single path any written finding travels; the writer touches none
  of it.
- Reuses the safety-reviewed `buildFindingReportWritePreview` so
  write mode is "dry-run + persist", not a parallel code path.

## OPTIONS CONSIDERED

| Option | Decision | Reason |
| --- | --- | --- |
| A: keep dry-run only | rejected/deferred | dry-run passed safety review |
| B: opt-in writer with --confirm-finding-write | selected | explicit bounded mutation |
| C: accept --write / --send / --execute aliases | rejected | ambiguous crossing of governance boundary |
| D: mutate existing FindingReport | rejected | artifacts are immutable records |
| E: update lifecycle / CoherencyDelta too | rejected | downstream stages remain separate |

Option A is the documented fallback if the implementation slice or
its safety review surfaces an unmitigable risk.

## PROPOSED WRITE MODE

Sketch only; not implemented. Future CLI:

```bash
rekon capability lint write-findings --bridge-report <id|type:id> --confirm-finding-write --json
```

Rules: `--confirm-finding-write` required for write mode; `--dry-run`
remains preview-only; `--write` / `--send` / `--execute` rejected;
dry-run preview built first; write mode persists exactly
`preview.proposedFindingReport.findings` as a new `FindingReport`;
exits non-zero if proposed findings count is 0 (unless a later
explicit empty-write flag is approved).

## CONFIRMATION POLICY

`--confirm-finding-write` is the only path into write mode.
`--dry-run` stays the default-safe preview. `--write` / `--send` /
`--execute` remain rejected as ambiguous aliases.

## GOVERNANCE BOUNDARY

- Writes only a new `FindingReport` artifact (with confirmation).
- No in-place mutation of an existing `FindingReport`.
- No mutation of `FindingFilterReport`, `FindingLifecycleReport`,
  `IssueAdjudicationReport`, or `CoherencyDelta`.
- No `WorkOrder` / `VerificationPlan` creation.
- No resolver routing, no verification planning, no
  `RefactorPreservationContract`, no source writes.
- Finding lifecycle / filtering / adjudication / `CoherencyDelta` /
  `WorkOrder` / `VerificationPlan` remain downstream of the written
  `FindingReport`.

## SAFETY CHECKS

Before write: bridge report validates; dry-run preview succeeds;
proposed findings count > 0; proposed finding ids unique;
`evidenceRefs` present; `--confirm-finding-write` present. After
write: `artifacts validate` clean; written `FindingReport` cites
`CapabilityLintFindingBridgeReport`; no downstream artifact count
changed except the new `FindingReport`.

## FUTURE SEQUENCE

1. Writer mode decision — this slice.
2. Writer implementation (opt-in `--confirm-finding-write`).
3. Writer safety review — before write mode is declared stable.
4. Downstream lifecycle / filter / adjudication / `CoherencyDelta`
   integration — later, separate decision.

## TESTS / VERIFICATION

- New docs test (16 assertions): memo headings + Option B selected
  + 7 pinned boundary statements + 4 tables + CHANGELOG mention +
  review-packet PURPOSE PRESERVATION CHECK.
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
  unchanged; no `--confirm-finding-write` behavior added.
- All governance artifacts: `FindingReport`, `FindingFilterReport`,
  `FindingLifecycleReport`, `IssueAdjudicationReport`,
  `CoherencyDelta` — no writer, no mutation.
- `WorkOrder` / `VerificationPlan` generators — untouched.
- No write mode, no resolver routing, no verification planning, no
  `RefactorPreservationContract`, no source writes, no npm publish,
  no version bump, no branch.

## RISKS / FOLLOW-UP

- **Risk:** the writer implementation could be wired to accept a
  generic write-ish alias or skip a safety check. *Mitigation:* the
  memo pins `--confirm-finding-write` as the sole write path, the
  rejected aliases, and the six before-write + two after-write
  checks; the writer safety review must confirm them.
- **Risk:** an empty preview could write an empty `FindingReport`.
  *Mitigation:* write mode exits non-zero on zero proposed findings
  unless a later explicit `--allow-empty-finding-report` flag is
  approved.
- **Follow-up:** writer implementation (next slice), then its own
  safety review before downstream integration.

## NEXT STEP

Recommended next slice: **CapabilityLintFindingBridgeReport →
FindingReport writer implementation** — add the opt-in write mode
behind `--confirm-finding-write`, reusing the dry-run preview,
writing exactly one new `FindingReport` artifact, with the
before/after safety checks. No existing-`FindingReport` mutation,
no governance mutation, no `WorkOrder` / `VerificationPlan`
creation, no source writes.
