# Review Packet — CapabilityLintFindingBridgeReport → FindingReport Writer Decision

**Slice:** forty-seventh on the codebase-intel-classic
capability-ontology track. Strategy / architecture decision batch.
Follows the `CapabilityLintFindingBridgeReport` publication safety
review at `f671f4f`.

## CHANGES MADE

- New decision memo
  `docs/strategy/capability-lint-finding-writer-decision.md`
  (13 headings; option / eligibility / boundary / future-sequence
  tables; answers all 11 required decision questions; pins the 7
  required boundary statements).
- New review packet (this file).
- New docs test
  `tests/docs/capability-lint-finding-writer-decision.test.mjs`
  (16 assertions).
- Cross-reference / "Update (forty-seventh slice)" notes added to
  the bridge publication safety review, bridge report safety
  review, bridge decision memo, bridge report artifact doc, bridge
  concept doc, FindingReport artifact doc, finding lifecycle
  concept, graph-aware finding filters concept, coherency delta
  concept, remediation work orders concept, WorkOrder artifact doc,
  and VerificationPlan artifact doc.
- Roadmap + classic behavior roadmap entries, README comment block,
  and CHANGELOG entry.

## PUBLIC API CHANGES

None. This is a strategy / decision-only batch. No package source
under `packages/` changed. No types, validators, CLI commands, or
exports were added or modified. No artifact schema changed.

## PURPOSE PRESERVATION CHECK

- **Original problem.** Eligible
  `CapabilityLintFindingBridgeReport` candidates are visible and
  safety-reviewed but still do not enter the governed findings
  pipeline. The open question is whether Rekon should allow a
  tightly gated writer that converts eligible preview candidates
  into `FindingReport` entries — a major boundary crossing from
  preview/action artifact to governed finding artifact.
- **Decision.** Yes, via **Option B** — a future, separate,
  **opt-in** writer that requires a **dry-run preview** and an
  **explicit confirmation** flag. Implementation is deferred to its
  own slice and safety review.
- **Product guarantee preserved.** No candidate becomes a finding
  automatically. Only `eligible` candidates may be considered. The
  writer is opt-in and explicit. `FindingReport` writing does not
  bypass finding filters, lifecycle status, issue adjudication, or
  `CoherencyDelta`. `CoherencyDelta` remains downstream of governed
  findings. `WorkOrder` / `VerificationPlan` generation remains
  downstream and deferred.
- **No regression.** No runtime behavior changed; the bridge,
  publications, and governance chain are untouched.

## CODEBASE-INTEL ALIGNMENT

- Preserves the evaluation → preview-candidate → governed-finding
  boundary that the whole capability-ontology track has maintained.
- Mirrors the dry-run-first / explicit-confirmation posture already
  proven by the GitHub Check publisher and PR-comment publisher
  write paths (dry-run default, explicit `--confirm-*` flag for
  write mode).
- Honors `FindingReport` immutability: writes a new artifact rather
  than mutating an existing one, matching the append-only finding
  lifecycle model.
- Keeps the governed finding pipeline (filters → status ledger →
  lifecycle → adjudication → `CoherencyDelta` → remediation work
  orders / verification plans) as the single path any promoted
  candidate must travel.

## OPTIONS CONSIDERED

| Option | Decision | Reason |
| --- | --- | --- |
| A: keep bridge preview-only | rejected/deferred | eligible candidates need a governed path |
| B: opt-in writer with dry-run + explicit confirmation | selected | preserves operator control |
| C: automatic writer during refresh | rejected | hidden finding mutation |
| D: direct lifecycle / CoherencyDelta mutation | rejected | bypasses finding governance |
| E: WorkOrder / VerificationPlan from bridge | rejected | downstream stages only |

Option A is the documented fallback if the implementation slice or
its safety review surfaces an unmitigable boundary risk.

## WRITER MODEL

Sketch only; not implemented. Recommended future CLI:

```bash
rekon capability lint write-findings --bridge-report <id|type:id> --dry-run --json
rekon capability lint write-findings --bridge-report <id|type:id> --confirm-finding-write --json
```

Rules: `--dry-run` required unless `--confirm-finding-write` is
present; dry-run never writes `FindingReport`; write mode requires
explicit confirmation; no automatic write during refresh; no hidden
write from publications.

## ELIGIBILITY POLICY

Writer considers only candidates where **all** hold:
`decision === "eligible"`, `proposedFinding` exists, non-empty
`evidenceRefs`, `sourceLintRowRef` exists, severity `high`/`medium`,
confidence `high`/`medium`. Excludes ineligible, needs-review,
eligible-missing-proposedFinding, eligible-missing-evidenceRefs,
low severity, low confidence. The writer trusts the bridge
`decision` and re-validates structural prerequisites before
writing.

## FINDINGREPORT WRITE MODEL

Writes a **new** `FindingReport` artifact containing only
bridge-derived findings plus source metadata. No in-place mutation
of an existing `FindingReport`. Cites
`CapabilityLintFindingBridgeReport`,
`CapabilityArchitectureLintReport`, `CapabilityContract`,
`CapabilityMap`, and `EvidenceGraph` (when reachable via
`evidenceRefs`) in `header.inputRefs`. Finding category
`capability_architecture_policy`. Per-finding fields: `id`,
`title`, `category`, `severity`, `evidenceRefs`,
`sourceBridgeCandidateId`, `sourceLintRowId`, `sourceContractId`,
`sourcePhraseCapabilityId`. Exact mapping onto the concrete
`FindingReport` finding shape is pinned in the dry-run
implementation slice.

## GOVERNANCE BOUNDARY

- Writer does not mutate `FindingFilterReport`.
- Writer does not mutate `FindingLifecycleReport`.
- Writer does not mutate `IssueAdjudicationReport`.
- Writer does not mutate `CoherencyDelta`.
- Writer does not create `WorkOrder` or `VerificationPlan`.
- Finding lifecycle, adjudication, `CoherencyDelta`, `WorkOrder`,
  and `VerificationPlan` remain downstream stages.
- Source writes remain unavailable.

## FUTURE SEQUENCE

| Step | Gate |
| --- | --- |
| writer decision | this slice |
| writer dry-run helper / CLI | next implementation slice |
| writer safety review | required before write mode |
| opt-in writer implementation | explicit confirmation only |
| post-writer safety review | required before downstream lifecycle integration |
| lifecycle / CoherencyDelta integration | later, separate decision |

## TESTS / VERIFICATION

- New docs test
  `tests/docs/capability-lint-finding-writer-decision.test.mjs`
  (16 assertions): memo exists, all required headings, Option B
  selected, the 7 pinned boundary statements, the 4 required
  tables, CHANGELOG mention, and review-packet PURPOSE PRESERVATION
  CHECK.
- Full 9-command gate: `npm run typecheck`, `npm run test`,
  `npm run build`, `git diff --check`,
  `node scripts/audit-package-exports.mjs`,
  `node scripts/audit-license.mjs`,
  `node scripts/publish-dry-run.mjs`,
  `node scripts/install-smoke.mjs`,
  `node scripts/install-tarball-smoke.mjs`.
- No CLI smoke (strategy-only batch; no runtime surface changed).

## INTENTIONALLY UNTOUCHED

- `packages/capability-model/src/capability-lint-finding-bridge.ts`
  (bridge builder) — unchanged.
- `packages/kernel-repo-model/src/index.ts` (bridge + FindingReport
  types) — unchanged.
- `packages/capability-docs/src/index.ts` (publishers) — unchanged.
- All governance artifacts: `FindingReport`, `FindingFilterReport`,
  `FindingLifecycleReport`, `IssueAdjudicationReport`,
  `CoherencyDelta` — no writer, no mutation.
- `WorkOrder` / `VerificationPlan` generators — untouched.
- No resolver routing, no verification planning, no
  `RefactorPreservationContract`, no source writes, no npm publish,
  no version bump, no branch.

## RISKS / FOLLOW-UP

- **Risk:** a future writer could be wired into `refresh` or a
  publication by mistake. *Mitigation:* the memo pins "no automatic
  write during refresh" and "no hidden write from publications";
  the writer safety review must confirm both.
- **Risk:** field mapping onto the concrete `FindingReport` finding
  shape is not yet pinned. *Mitigation:* explicitly deferred to the
  dry-run implementation slice, which must pin the exact mapping.
- **Follow-up:** `FindingReport` writer dry-run helper / CLI
  (preview only) is the recommended next slice, then its safety
  review before any write mode.

## NEXT STEP

Recommended next slice: **CapabilityLintFindingBridgeReport →
FindingReport writer dry-run helper / CLI** — implement dry-run
preview only (reads the bridge report, selects eligible candidates,
builds the proposed `FindingReport` body, writes/prints no
`FindingReport`; no governance mutation; no source writes). Write
mode remains deferred until the dry-run helper passes its safety
review.
