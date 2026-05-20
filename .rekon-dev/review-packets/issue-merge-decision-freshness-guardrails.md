# Review Packet — Issue Merge Decision Freshness Guardrails v1

Combined strategy + implementation batch. **No artifact
mutation.** No auto-refresh inside publishers or
resolvers. No watcher / daemon. No file-system mtime /
path invalidation. No artifact header shape change. No
`schemaVersion` bump. No new artifact type. No new
capability role. No new CLI subcommand or flag. No new
reason codes. No producer change. No graph-aware filter
change. No source-file reads. No LLM / semantic / fuzzy
/ embedding matching. No `GraphOntologyValidator` port.
No version bump. No npm publish.

## CHANGES MADE

**New strategy memo:**

- `docs/strategy/issue-merge-decision-freshness-guardrails.md`
  — pins the freshness predicate, the warning
  surfaces, and the test surface. Sections:
  Decision Summary, Problem, Accepted Merge
  Roll-Up Lineage, Freshness Predicate, Warning
  Surfaces, What This Does Not Do, Tests Required,
  Follow-Up Work, Cross-References.

**Filter / helper code:**

- `packages/kernel-findings/src/index.ts` — new
  exports `IssueMergeRollupFreshnessStatus`,
  `IssueMergeRollupFreshnessWarningCode`,
  `IssueMergeRollupFreshnessWarning`,
  `IssueMergeRollupFreshness`,
  `IssueMergeRollupFreshnessInput`, and the pure
  data-only predicate
  `detectIssueMergeRollupFreshness(...)`. The
  predicate emits warnings in stable A → B → C →
  D → E order with at most one Rule-E warning per
  `(rollupId, candidateId)` pair. No fs access.
  No mutation.

**Publication wiring:**

- `packages/capability-docs/src/index.ts` —
  - Architecture summary publisher reads the latest
    `IssueMergeDecisionLedger` and computes
    `mergeRollupFreshness` via the new predicate,
    threads it through `renderArchitectureSummary`,
    and emits a new `### Merge Roll-up Freshness`
    subsection right below `## Accepted Issue Merge
    Roll-ups` with a `Status:` line, a warnings
    table, and a stale callout.
  - Agent contract publisher mirrors the same reads
    and threads `mergeRollupFreshness` through
    `renderAgentContract`. New `### Merge Decision
    Freshness` subsection right below the
    agent-facing `### Accepted Issue Merge Roll-ups`
    renders per-input fresh/stale lines plus (when
    stale) a "Do not rely on accepted merge
    roll-ups …" callout. A new entry was appended to
    `AGENT_CONTRACT_DO_NOT_DO`.
  - New helpers
    `appendArchitectureMergeRollupFreshness`,
    `appendAgentContractMergeRollupFreshness`, and
    `escapeTableCell` are file-local; no exported
    types changed.

**Resolver wiring:**

- `packages/capability-resolver/src/index.ts` —
  - Imports the new
    `detectIssueMergeRollupFreshness`,
    `IssueMergeRollupFreshness`,
    `IssueMergeDecisionLedger`, and
    `FindingLifecycleReport` types.
  - `ResolutionTraceEntry.sourceType` gains
    `"IssueMergeDecisionLedger"`.
  - `findMergeRollupForGroup` now returns the full
    `CoherencyDelta` body so the freshness helper
    can compute against it without re-reading.
  - New helper
    `readAndDetectMergeRollupFreshness(...)` reads
    the latest ledger / adjudication / lifecycle
    refs (pushing them into a caller-provided
    accumulator) and runs the predicate.
  - When `mergeRollup` is attached, the resolver
    runs the helper, appends a `Accepted merge
    roll-up may be stale; run \`rekon refresh\`
    before relying on merged issue context.`
    warning string when `status === "stale"`, and
    adds an `issue.merge.freshness`
    `resolutionTrace` step (`status: "warning"`
    with `details.codes` array when stale,
    `status: "used"` when fresh).
  - New `buildIssuePacketInputRefs` helper
    consolidates the dedupe of snapshot +
    adjudication + merge-rollup + ledger /
    adjudication / lifecycle refs.

**New contract test:**

- `tests/contract/issue-merge-decision-freshness-guardrails.test.mjs`
  (16 cases) — covers every rule end-to-end through
  architecture summary, agent contract, and
  `resolve.issue`, plus the helper's `missing`,
  `fresh`, and Rule-A `stale` unit-level branches.

**Supporting docs updated:**

- `docs/concepts/freshness-and-invalidation.md` —
  new "Accepted Merge Roll-up Freshness" section
  enumerating the five rules + cross-reference.
- `docs/concepts/issue-merge-decisions.md` — new
  paragraph under "Freshness" linking the freshness
  guardrails + cross-reference.
- `docs/artifacts/issue-merge-decision-ledger.md` —
  new "Freshness Guardrails" section +
  cross-reference.
- `docs/artifacts/coherency-delta.md` — new
  "Accepted Merge Roll-up Freshness" section +
  cross-reference.
- `docs/concepts/coherency-delta.md` —
  cross-reference added.
- `docs/artifacts/architecture-summary-publication.md`
  — new "Merge Roll-up Freshness" section +
  cross-reference.
- `docs/concepts/architecture-summary-publication.md`
  — paragraph + cross-reference.
- `docs/artifacts/agent-contract-publication.md` —
  new "Merge Decision Freshness" section +
  cross-reference.
- `docs/concepts/agent-operating-contract.md` —
  paragraph + cross-reference.
- `docs/artifacts/resolver-packet.md` — new
  "Accepted Merge Roll-up Freshness" subsection
  under "Freshness And Provenance".
- `docs/concepts/resolvers.md` — paragraph
  explaining the freshness step + cross-reference.
- `docs/strategy/issue-governance-architecture-decision.md`
  — step 32 flipped from `(future)` to `(shipped)`
  with full diagnostic.
- `docs/strategy/classic-behavior-roadmap.md` —
  new v1 freshness-guardrails entry below the v3
  operator-review entry; the v3 entry's "recommended
  next slice" pointer updated.
- `docs/strategy/roadmap.md` — new
  issue-merge-decision-freshness-guardrails entry
  above the v3 operator-review entry.
- `CHANGELOG.md` — new top-of-`0.1.0-alpha.1`
  entry.

**New review packet:**

- `.rekon-dev/review-packets/issue-merge-decision-freshness-guardrails.md`
  (this file).

## PUBLIC API CHANGES

**Additive only.**

- New exports from `@rekon/kernel-findings`:
  - `IssueMergeRollupFreshnessStatus` type
  - `IssueMergeRollupFreshnessWarningCode` type
  - `IssueMergeRollupFreshnessWarning` type
  - `IssueMergeRollupFreshness` type
  - `IssueMergeRollupFreshnessInput` type
  - `detectIssueMergeRollupFreshness(input)`
    function

- `ResolutionTraceEntry.sourceType` (in
  `@rekon/capability-resolver`) gains one new
  enum value: `"IssueMergeDecisionLedger"`. The
  type still matches the runtime-emitted shape;
  consumers that exhaustively switched on
  `sourceType` will need to handle the new
  variant.

No existing fields, types, or function signatures
were removed or changed. No schema bumps.

## PURPOSE PRESERVATION CHECK

- **Original problem:** accepted issue merge
  decisions are an explicit operator artifact
  (`IssueMergeDecisionLedger`) consumed by
  `CoherencyDelta`. If newer decisions land, the
  delta's roll-ups may no longer reflect the
  current governed issue state. Agents and humans
  may act on stale merged issue context unless
  the surfaces they read warn explicitly.
- **Classic guarantee preserved:** classic
  codebase-intel-classic treated context freshness
  as a trust boundary. Generated context (and
  derived issue / coherency state) should never be
  silently presented as current when newer inputs
  exist. The Rekon equivalent is achieved by:
  - exposing `evidenceSource` on every filtered
    finding (graph-aware filter v1 / v2 / v3),
  - exposing existing `GovernanceFreshness`
    warnings for the broad adjudication →
    coherency chain, and now
  - exposing per-rule merge-rollup freshness
    warnings on the publications and resolver
    packet that consume accepted merge roll-ups.
- **No behavior change beyond warnings.** The
  predicate is pure data-only. It does not refresh,
  it does not mutate, it does not rewrite the
  `CoherencyDelta`, the `IssueMergeDecisionLedger`,
  the `IssueAdjudicationReport`, or the
  `FindingLifecycleReport`. It does not change
  merge decision semantics or coherency roll-up
  behavior.
- **Failure modes avoided:**
  - architecture summary does NOT show accepted
    merge roll-ups from an old ledger without a
    warning;
  - agent contract does NOT instruct agents using
    stale merged issue context;
  - `resolve.issue` does NOT return `mergeRollup`
    without noting stale merge-decision lineage;
  - staleness is visible where users act
    (architecture summary, agent contract,
    `resolve.issue`), not only via low-level
    artifact freshness;
  - the helper's `status === "missing"` branch
    means warnings do NOT fire on clean / freshly
    rebuilt chains.

## CODEBASE-INTEL ALIGNMENT

Aligned to:

- `services/WatchHandler.ts`,
  `lib/context-freshness.ts`,
  `services/ContextHandler.ts` (classic context-
  freshness surfaces; the Rekon equivalent is the
  artifact-lineage predicate emitted into
  publications + resolver packets).
- `services/IssueDetectionService.ts`,
  `domain/issues/mergeIssues.ts` (classic merge
  semantics; the freshness predicate sits below the
  semantics and emits per-rule warnings without
  touching them).
- `packages/product-codebase-intel/src/replatform/replatform-delta.ts`,
  `packages/product-codebase-intel/src/replatform/replatform-delta-projections.ts`
  (classic delta projection; the Rekon equivalent
  is `CoherencyDelta` with accepted-merge-roll-up
  metadata).

What Rekon keeps:
- freshness is a trust guarantee;
- accepted merge decisions are explicit artifacts;
- stale generated context is visible;
- publications and resolver packets cite / read
  artifacts; they do not mutate them;
- artifacts remain canonical.

What Rekon simplifies:
- lineage freshness only;
- no watcher / daemon;
- no live file-change monitoring;
- no auto-refresh loop;
- no context server;
- no source mtime invalidation.

## FRESHNESS PREDICATE

The predicate operates on the
`CoherencyDelta` → `IssueMergeDecisionLedger` →
`IssueAdjudicationReport` →
`FindingLifecycleReport` lineage. Applied only when
at least one `CoherencyDelta.items[i]` carries
`mergedIssueGroupIds.length > 1`.

| # | Rule | Warning code | Fires when |
| - | --- | --- | --- |
| A | ledger-missing | `merge-ledger-missing` | merged roll-ups exist but `CoherencyDelta.header.inputRefs` cites no `IssueMergeDecisionLedger` |
| B | ledger-stale | `merge-ledger-stale` | cited ledger id ≠ latest ledger id |
| C | adjudication-stale | `adjudication-stale` | cited adjudication id ≠ latest adjudication id |
| D | lifecycle-stale | `lifecycle-stale` | cited adjudication's `FindingLifecycleReport` ref id ≠ latest lifecycle id |
| E | decision-superseded | `merge-decision-superseded` | for any `(rollupId, candidateId)` on a merged item, the latest ledger decision's id is not in the item's `mergeDecisionIds`, OR the latest decision is not `accepted` |

Status mapping: `missing` (delta absent or no merged
roll-ups) / `fresh` (no warnings) / `stale` (any
warning fired). All warnings recommend
`rekon refresh`.

## PUBLICATION WARNINGS

**Architecture summary** renders
`### Merge Roll-up Freshness` right below
`## Accepted Issue Merge Roll-ups`:

```markdown
### Merge Roll-up Freshness

- Status: <fresh|stale|missing>

(fresh)
Accepted merge roll-up lineage is fresh.

(stale)
| Code | Message | Recommended Command |
| --- | --- | --- |
| `merge-ledger-stale` | … | `rekon refresh` |

> Do not rely on accepted merge roll-ups until `rekon refresh` rebuilds adjudication and coherency state.

Recommended command: `rekon refresh`.
```

**Agent contract** renders
`### Merge Decision Freshness` right below the
agent-facing `### Accepted Issue Merge Roll-ups`:

```markdown
### Merge Decision Freshness

(stale)
> Do not rely on accepted merge roll-ups until `rekon refresh` rebuilds adjudication and coherency state.

- Merge decisions: <fresh|stale>
- Adjudication: <fresh|stale>
- Lifecycle: <fresh|stale>
- Recommended command: `rekon refresh`

(stale, with warnings table)
Warnings:
- `merge-ledger-stale`: …
```

Plus a new `Do Not Do` entry:
*"Do not rely on accepted merge roll-ups after merge
decisions, adjudication, or lifecycle artifacts
change until `rekon refresh` has run."*

## RESOLVE.ISSUE WARNINGS

When `IssuePacket.mergeRollup` is attached:

- The resolver runs the freshness helper against
  the latest ledger / adjudication / lifecycle
  artifacts; refs are added to
  `IssuePacket.header.inputRefs` (deduped).
- **Stale**:
  - Warning string appended to
    `IssuePacket.warnings`:
    `"Accepted merge roll-up may be stale; run \`rekon refresh\` before relying on merged issue context."`.
  - Trace entry pushed to `resolutionTrace`:
    ```json
    {
      "step": "issue.merge.freshness",
      "sourceType": "CoherencyDelta" | "IssueMergeDecisionLedger",
      "sourceRef": <CoherencyDelta ref>,
      "status": "warning",
      "message": "<first rule message>",
      "details": {
        "warningCount": <n>,
        "codes": [<warning codes>],
        "recommendedCommand": "rekon refresh"
      }
    }
    ```
- **Fresh**: a non-warning trace entry is pushed
  with `status: "used"` and message
  `"Accepted merge roll-up lineage is fresh."`.

**The resolver never blocks on a freshness
warning.** It annotates the packet so callers can
decide.

## TESTS / VERIFICATION

**Contract test added:**
`tests/contract/issue-merge-decision-freshness-guardrails.test.mjs`
(16 cases, all passing):

1. Architecture summary: clean accepted merge
   roll-up produces no freshness warning.
2. Architecture summary: warns
   `merge-ledger-stale` when a newer
   `IssueMergeDecisionLedger` exists.
3. Architecture summary: warns
   `merge-ledger-missing` when CoherencyDelta has
   merged roll-ups but no IssueMergeDecisionLedger
   inputRef.
4. Architecture summary: warns
   `adjudication-stale` when a newer
   `IssueAdjudicationReport` exists.
5. Architecture summary: warns `lifecycle-stale`
   when adjudication is stale relative to a newer
   `FindingLifecycleReport`.
6. Architecture summary: warns
   `merge-decision-superseded` when latest
   decision differs.
7. Agent contract: renders stale merge decision
   callout when ledger is superseded.
8. Agent contract: clean path renders fresh
   merge decision status with no callout.
9. `resolve.issue`: appends freshness warning
   when latest decision supersedes the roll-up.
10. `resolve.issue`: `resolutionTrace` includes
    `issue.merge.freshness` step (with
    `details.codes` array + ledger / adjudication
    / lifecycle refs in `inputRefs`).
11. `resolve.issue`: clean accepted roll-up emits
    a `used` trace and no freshness warning.
12. Freshness helper: returns `missing` when
    CoherencyDelta has no merged roll-ups.
13. Freshness helper: returns `missing` when
    CoherencyDelta is absent.
14. Freshness helper: fires Rule A when merged
    items exist but no ledger ref is cited.
15. `artifacts validate` stays clean across all
    scenarios.
16. End-to-end: accepted decision → newer
    rejected decision → both publications and the
    resolver surface `merge-decision-superseded`.

**Verification commands (all green):**
- `npm run typecheck`
- `npm run build`
- `npm run test` (932 passed / 1 skipped / 0 failed)
- `git diff --check`
- `node scripts/audit-package-exports.mjs`
- `node scripts/publish-dry-run.mjs`
- `node scripts/audit-license.mjs`
- `node scripts/install-smoke.mjs`
- `node scripts/install-tarball-smoke.mjs`
- CLI smokes against `examples/simple-js-ts`:
  `refresh`, `publish architecture`, `publish
  agent-contract`, `resolve issue --issue
  no-such-issue`, `artifacts validate`, `artifacts
  freshness`.

## INTENTIONALLY UNTOUCHED

- `IssueMergeDecisionLedger`,
  `IssueAdjudicationReport`, `CoherencyDelta`,
  `FindingLifecycleReport`,
  `FindingStatusLedger` — no field changes; no
  schema bumps; no mutation.
- `applyFindingFilters` and every graph-aware
  filter check.
- Merge decision semantics
  (`createIssueMergeDecisionLedger`,
  `rollupIssueGroupsByAcceptedMergeDecisions`,
  `applyIssueMergeDecisionsToCandidates`).
- CoherencyDelta roll-up behavior
  (`createCoherencyDelta`).
- All CLI subcommands, flags, and exit codes
  (no new subcommand, no new flag).
- Capability roles, capability templates.
- `examples/**` — no example changes.
- File-system watcher / daemon code — none added.

## RISKS / FOLLOW-UP

**Risks:**

- The predicate uses `id.localeCompare` on
  artifact-ref ids for "latest" tie-breaking,
  matching the existing pattern across the
  resolver and publishers. If a future indexer
  switches to a non-lexicographic id scheme, all
  these surfaces would need to update in
  lockstep — but that's a global change, not a
  freshness-guardrails change.
- The publishers always read the latest
  `IssueMergeDecisionLedger` from artifacts even
  when no merge roll-ups exist (the helper then
  returns `status: "missing"` and the section
  stays silent). This is one extra index lookup
  per publication; not a correctness concern.
- The resolver's `readAndDetectMergeRollupFreshness`
  fires only when `mergeRollup` is attached, so
  packets that don't carry an accepted merge
  roll-up pay no extra cost.

**Follow-up:**

- **Issue merge decision operator ergonomics** —
  recommended next implementation slice. Make the
  human-in-the-loop merge workflow easier:
  `issues merge candidates --undecided`,
  `--decision accepted|rejected|none`, candidate
  detail rendering, clearer recommended commands
  in publications. Still no automatic merging or
  semantic / LLM review.
- Optional alert surfaces for merge-rollup
  freshness (per-code dominance alerts on
  filter-health-style output) could land later
  once we have real-repo data.

## NEXT STEP

**Issue merge decision operator ergonomics.**

Make the human-in-the-loop merge workflow easier:
- `issues merge candidates --undecided`,
- `issues merge candidates --decision accepted|rejected|none`,
- candidate detail rendering on the CLI,
- clearer recommended commands in architecture
  summary + agent contract when undecided
  candidates exist.

Still no automatic merging or semantic / LLM
review. Builds directly on the v1 freshness
guardrails shipped here.
