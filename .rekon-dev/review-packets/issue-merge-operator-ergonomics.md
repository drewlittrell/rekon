# Review Packet — Issue Merge Decision Operator Ergonomics v1

Combined CLI + publication + docs + test batch built
on top of the freshness guardrails shipped at
`b443ed1`. No automatic merging. No semantic / fuzzy /
LLM / embedding review. Only `rekon issues merge
decide` mutates the `IssueMergeDecisionLedger`. No
schemaVersion bump. No new artifact type. No new
capability role. No producer change. No graph-aware
filter change. No source-file reads. No version
bump. No npm publish.

## CHANGES MADE

**Strategy memo:**

- `docs/strategy/issue-merge-decision-operator-ergonomics.md`
  — pins the four operator-facing surfaces and the
  helper shape; restates the
  product invariants (advisory candidates, only
  `decide` mutates, no semantic review).

**Kernel helper:**

- `packages/kernel-findings/src/index.ts` — new
  exports `IssueMergeCandidateDecisionState`,
  `IssueMergeCandidateView`,
  `IssueMergeCandidateViewsInput`, and the pure
  data-only helper
  `buildIssueMergeCandidateViews(input)`. The helper
  is deterministic, never mutates inputs, never
  reads the filesystem. Decision history is sorted
  newest-first (`decidedAt` descending; `id`
  lexicographic tiebreak) so callers can rely on
  `decisionHistory[0] === latestDecision`. The
  per-candidate `superseded` flag fires when a
  roll-up exists for the candidate AND the latest
  ledger decision is not the one the roll-up cites
  (OR the latest decision is no longer `accepted`).
  The per-view `stale` flag is the delta-level
  signal from the freshness predicate applied to
  every candidate when the lineage is stale.

**CLI:**

- `packages/cli/src/index.ts` —
  - `issues merge candidates` now accepts
    `--undecided`, `--decision`, `--stale`,
    `--superseded`, `--reason`, `--strength`,
    `--limit` flags. Response carries `summary`
    (`total`, `accepted`, `rejected`, `undecided`,
    `stale`, `superseded`), `mergeCandidateViews`
    (structured per-candidate views), and
    `mergeRollupFreshness`.
  - New `issues merge candidate <candidate-id>`
    subcommand returns the candidate detail
    (candidate + decisionState + decision +
    decisionHistory + groups + memberFindingIds +
    files + rollup + stale + superseded + warnings)
    plus a `recommendedCommands` array (accepted /
    rejected decide commands pre-filled with the
    candidate id).
  - `issues merge decide` output now includes
    `previousDecision` (or `null` on first decide),
    `changedDecision` (true only when the new
    decision's status differs from the prior), and
    `recommendedNextCommands`. The recorded ledger
    semantics are unchanged.
  - CLI-local helpers `readLatestCoherencyDelta`,
    `parseIssueMergeCandidateFilterFlags`,
    `applyIssueMergeCandidateFilters`,
    `summarizeIssueMergeCandidateDecisions`,
    `serializeIssueMergeCandidateView`,
    `recommendedCommandsForCandidateView`.
  - Usage strings updated to include the new flags
    and the new `candidate <id>` subcommand.

**Publications:**

- `packages/capability-docs/src/index.ts` —
  - Architecture summary publisher computes
    `mergeCandidateViews` via the new helper and
    threads it through `renderArchitectureSummary`.
    A new `appendArchitectureMergeCandidateDecisions`
    function renders `## Merge Candidate Decisions`
    with `Total / Accepted / Rejected / Undecided`
    counts, plus recommended `--undecided`,
    `--superseded`, `--stale` filter commands when
    those counts are non-zero. The section closes
    with the candidate-detail and decide command
    lines.
  - Agent contract publisher mirrors the same
    computation. New
    `appendAgentContractMergeCandidateDecisions`
    function renders a compact `### Merge Candidate
    Decisions` subsection with the same counts and
    an explicit "Ask the operator to review
    undecided candidates" directive when undecided
    > 0.
  - A new entry appended to
    `AGENT_CONTRACT_DO_NOT_DO`: *"Do not assume
    advisory merge candidates are accepted; check
    `IssueMergeDecisionLedger` or run `rekon issues
    merge candidates --undecided`."*

**Contract test:**

- `tests/contract/issue-merge-operator-ergonomics.test.mjs`
  (16 cases) pins every behavior change end-to-end.

**Supporting docs:**

- `docs/concepts/issue-merge-decisions.md` — CLI
  Surface section extended; cross-reference added.
- `docs/artifacts/issue-merge-decision-ledger.md` —
  cross-reference added.
- `docs/artifacts/issue-adjudication-report.md` —
  cross-references added.
- `docs/concepts/issue-adjudication.md` —
  cross-references added.
- `docs/artifacts/coherency-delta.md` —
  cross-reference added.
- `docs/concepts/coherency-delta.md` —
  cross-reference added.
- `docs/artifacts/architecture-summary-publication.md`
  — new "Merge Candidate Decisions" section +
  cross-references.
- `docs/concepts/architecture-summary-publication.md`
  — paragraph explaining the new section +
  cross-references.
- `docs/artifacts/agent-contract-publication.md` —
  new "Merge Candidate Decisions" section +
  cross-references.
- `docs/concepts/agent-operating-contract.md` —
  paragraph + cross-references.
- `docs/strategy/issue-governance-architecture-decision.md`
  — step 33 flipped to `(shipped)` with full
  diagnostic; new step 34 reserves "Issue merge
  decision publication / detail polish v2"; the
  prior future steps shift down.
- `docs/strategy/classic-behavior-roadmap.md` — new
  v1 entry below the freshness-guardrails entry.
- `docs/strategy/roadmap.md` — new entry.
- `README.md` — CLI Commands list adds
  `issues merge candidates --undecided`,
  `issues merge candidate <id>`,
  `issues merge decide <id>`.
- `CHANGELOG.md` — new top-of-`0.1.0-alpha.1`
  entry.

**Review packet:**

- `.rekon-dev/review-packets/issue-merge-operator-ergonomics.md`
  (this file).

## PUBLIC API CHANGES

**Additive only.**

- New exports from `@rekon/kernel-findings`:
  - `IssueMergeCandidateDecisionState` type
  - `IssueMergeCandidateView` type
  - `IssueMergeCandidateViewsInput` type
  - `buildIssueMergeCandidateViews(input)` function

- New CLI subcommand: `rekon issues merge candidate
  <candidate-id>` (read-only).
- New CLI flags on `rekon issues merge candidates`:
  `--undecided`, `--decision`, `--stale`,
  `--superseded`, `--reason`, `--strength`,
  `--limit`.
- New CLI output fields on
  `rekon issues merge candidates`: `summary`,
  `mergeCandidateViews`, `coherencyDelta`,
  `mergeRollupFreshness`, `filter`. Existing
  `mergeCandidates` field is unchanged (still the
  `applyIssueMergeDecisionsToCandidates` shape, now
  filtered to the same id set as
  `mergeCandidateViews`).
- New CLI output fields on
  `rekon issues merge decide`: `previousDecision`,
  `changedDecision`, `recommendedNextCommands`.
  Existing `artifact` and `decision` fields are
  unchanged.

No removed fields, types, or signatures. No
`schemaVersion` bumps.

## PURPOSE PRESERVATION CHECK

- **Original problem:** merge candidates are useful
  only if operators can quickly review and decide
  them. After the freshness guardrails, stale /
  superseded states become visible, but operators
  still needed a clean workflow to find candidates,
  inspect context, and record decisions without
  artifact-spelunking.
- **Classic guarantee preserved:** classic
  codebase-intel-classic issue governance reduced
  noise while preserving reviewability and operator
  judgment. The guarantee is **not** automatic
  issue merging — it's that humans can adjudicate
  issue relationships without losing traceability.
- **Rekon equivalent preserved:**
  - Merge candidates remain advisory in
    `IssueAdjudicationReport.mergeCandidates`.
  - Merge decisions remain explicit operator
    artifacts in `IssueMergeDecisionLedger`.
  - `CoherencyDelta` continues to respect accepted
    decisions; nothing here changes roll-up
    behavior.
  - Stale / superseded lineage is now both visible
    AND filterable in one command.
  - Raw issue groups and member findings remain
    traceable via the view's `groups` /
    `memberFindingIds` arrays.
- **Failure modes avoided:**
  - Operators do NOT need to open raw artifacts to
    find undecided candidates — `--undecided` does
    it.
  - Re-deciding a superseded candidate is NOT
    confusing — `decide` returns `previousDecision`
    + `changedDecision` and the candidate detail
    surfaces full decisionHistory newest-first.
  - CLI output does NOT hide member group / finding
    context — `candidate <id>` returns the full
    set.
  - Publications do NOT warn about stale /
    superseded state without pointing at useful
    commands — the new sections always recommend
    the right `rekon issues merge candidates`
    filter.
  - The workflow does NOT become automatic merging
    — `decide` semantics are unchanged; only the
    output is enriched.

## CODEBASE-INTEL ALIGNMENT

Aligned to:

- `services/IssueDetectionService.ts`,
  `domain/issues/mergeIssues.ts`,
  `services/issues/**` (classic merge / dedup
  ergonomics).
- `packages/product-codebase-intel/src/replatform/replatform-delta.ts`,
  `packages/product-codebase-intel/src/replatform/replatform-delta-projections.ts`
  (classic delta projection; the Rekon equivalent is
  `CoherencyDelta` with accepted-merge-roll-up
  metadata).

What Rekon keeps:
- merge candidates remain advisory;
- merge decisions are explicit operator artifacts;
- accepted / rejected state is auditable;
- raw issue groups and member findings remain
  traceable;
- stale / superseded state is visible;
- no automatic semantic merge.

What Rekon simplifies:
- CLI ergonomics only;
- no UI / dashboard;
- no PR / check integration;
- no semantic / LLM review;
- no automatic merge application beyond
  already-shipped `CoherencyDelta` roll-up
  behavior.

## CLI ERGONOMICS

**`rekon issues merge candidates` filters:**

| Flag | Behavior |
| --- | --- |
| `--undecided` | Return only candidates with no decision (`decisionState === "none"`). |
| `--decision accepted` | Return only accepted candidates. |
| `--decision rejected` | Return only rejected candidates. |
| `--decision none` | Equivalent to `--undecided`. |
| `--stale` | Return only candidates whose merge-rollup lineage is stale. |
| `--superseded` | Return only candidates whose latest decision differs from the roll-up's cited decision. |
| `--reason <reason>` | Narrow by `candidate.reasons[]` membership. |
| `--strength <s>` | Narrow by `candidate.strength === s` (`strong` / `medium` / `weak`). |
| `--limit <n>` | Truncate the result to the first `n` candidates. |

Response shape:

```json
{
  "artifact": { "type": "IssueAdjudicationReport", "id": "...", "...": "..." },
  "ledger": { "type": "IssueMergeDecisionLedger", "id": "..." } | null,
  "coherencyDelta": { "type": "CoherencyDelta", "id": "..." } | null,
  "filter": { "decisionStates": [...], "stale": true, ... },
  "summary": {
    "total": 2,
    "accepted": 1,
    "rejected": 0,
    "undecided": 1,
    "stale": 0,
    "superseded": 0
  },
  "mergeCandidates": [ /* decoration-annotated shape, filtered */ ],
  "mergeCandidateViews": [ /* full per-candidate view shape, filtered */ ],
  "mergeRollupFreshness": { "status": "fresh|stale|missing", "warnings": [] }
}
```

**`rekon issues merge candidate <candidate-id>` detail:**

```json
{
  "artifact": { "type": "IssueAdjudicationReport", "id": "...", "...": "..." },
  "ledger": { "...": "..." } | null,
  "coherencyDelta": { "...": "..." } | null,
  "candidate": { /* full IssueMergeCandidate */ },
  "decisionState": "accepted|rejected|none",
  "decision": { /* latest IssueMergeDecision */ } | null,
  "decisionHistory": [ /* newest first; same shape as decision */ ],
  "groups": [ /* member IssueAdjudicationGroup objects */ ],
  "memberFindingIds": [ /* union of candidate + group memberFindingIds */ ],
  "files": [ /* union of group files */ ],
  "rollup": { /* current CoherencyDeltaItem */ } | null,
  "stale": false,
  "superseded": false,
  "warnings": [ /* per-candidate warning strings */ ],
  "recommendedCommands": [
    "rekon issues merge decide <candidate-id> --decision accepted --note \"Same root cause.\"",
    "rekon issues merge decide <candidate-id> --decision rejected --note \"Same root cause.\""
  ],
  "mergeRollupFreshness": { "status": "fresh|stale|missing", "warnings": [] }
}
```

**`rekon issues merge decide` output additions:**

```json
{
  "artifact": { "type": "IssueMergeDecisionLedger", "...": "..." },
  "decision": { /* the newly-recorded IssueMergeDecision */ },
  "previousDecision": { /* prior latest decision for this candidate */ } | null,
  "changedDecision": true | false,
  "recommendedNextCommands": [
    "rekon coherency delta --root <repo> --json",
    "rekon publish architecture --root <repo> --json",
    "rekon publish agent-contract --root <repo> --json"
  ]
}
```

`previousDecision === null` on first decide;
`changedDecision === true` only when the new
decision's status differs from the prior status.
Ledger append semantics are unchanged: a new
decision is always appended.

## PUBLICATION GUIDANCE

**Architecture summary** renders a new section right
below the existing merge / roll-up sections:

```markdown
## Merge Candidate Decisions

- Total: 2
- Accepted: 1
- Rejected: 0
- Undecided: 1

Recommended command:

```bash
rekon issues merge candidates --undecided --json
```

Inspect any candidate via `rekon issues merge candidate <candidate-id> --json`. Record or revise decisions via `rekon issues merge decide <candidate-id> --decision accepted|rejected --note <note>`.
```

When `--superseded` or `--stale` counts are non-zero,
the section also emits a one-line callout pointing at
the corresponding filter command.

**Agent contract** renders a compact subsection:

```markdown
### Merge Candidate Decisions

Merge candidate decisions:
- Undecided: 2
- Accepted: 0
- Rejected: 0

Ask the operator to review undecided candidates before treating merge roll-ups as final.
Command: `rekon issues merge candidates --undecided --json`
```

Plus a new `Do Not Do` reminder:
*"Do not assume advisory merge candidates are
accepted; check IssueMergeDecisionLedger or run
`rekon issues merge candidates --undecided`."*

## TESTS / VERIFICATION

**Contract test added:**
`tests/contract/issue-merge-operator-ergonomics.test.mjs`
(16 cases, all passing):

1. `--undecided` returns only undecided candidates.
2. `--decision accepted` returns only accepted.
3. `--decision rejected` returns only rejected.
4. `--decision none` equals `--undecided`.
5. `candidate <id>` returns groups, memberFindingIds,
   files, and recommendedCommands.
6. Candidate detail includes latest decision and
   newest-first decisionHistory.
7. Candidate detail includes `rollup` when accepted.
8. Candidate detail warns when superseded.
9. `decide` output reports `previousDecision` /
   `changedDecision` on re-decide;
   `previousDecision === null` on first decide.
10. `decide` output includes `recommendedNextCommands`.
11. Architecture summary renders the decision counts.
12. Architecture summary recommends `--undecided`
    when undecided exist.
13. Agent contract renders the decision counts +
    undecided command.
14. Agent contract `Do Not Do` warns against
    assuming candidates are accepted.
15. Read commands (`candidates`, `candidate`) do
    not mutate any artifact; only `decide` writes.
16. `rekon artifacts validate` stays clean.

**Verification commands (all green):**
- `npm run typecheck`
- `npm run build`
- `npm run test` (949 passed / 1 skipped / 0 failed)
- `git diff --check`
- `node scripts/audit-package-exports.mjs`
- `node scripts/publish-dry-run.mjs`
- `node scripts/audit-license.mjs`
- `node scripts/install-smoke.mjs`
- `node scripts/install-tarball-smoke.mjs`
- CLI smokes against `examples/simple-js-ts`:
  `refresh`, `issues merge candidates --undecided`,
  `publish architecture`, `publish agent-contract`,
  `artifacts validate`, `artifacts freshness`.

## INTENTIONALLY UNTOUCHED

- `IssueMergeDecisionLedger`,
  `IssueAdjudicationReport`,
  `CoherencyDelta`,
  `FindingLifecycleReport`,
  `FindingStatusLedger` — no field changes; no
  schema bumps; no mutation outside the existing
  `decide` ledger append.
- `recordIssueMergeDecision` (runtime helper) —
  unchanged ledger-append semantics. The CLI
  computes `previousDecision` and
  `changedDecision` from the prior ledger read.
- Merge decision semantics
  (`createIssueMergeDecisionLedger`,
  `rollupIssueGroupsByAcceptedMergeDecisions`,
  `applyIssueMergeDecisionsToCandidates`,
  `findLatestIssueMergeDecision`).
- `CoherencyDelta` roll-up behavior
  (`createCoherencyDelta`).
- Merge-rollup freshness predicate
  (`detectIssueMergeRollupFreshness`); the new
  helper consumes its result but does not change
  it.
- All graph-aware filter checks and the freshness
  guardrails surfaces.
- Existing CLI subcommands, flags, and exit codes
  for non-merge workflows.
- Capability roles, capability templates.
- `examples/**` — no example changes.

## RISKS / FOLLOW-UP

**Risks:**

- `--reason` matches on candidate `reasons[]`
  membership. If the reason vocabulary is later
  extended, operators may rely on stale reason
  strings. Mitigation: the existing
  `ISSUE_MERGE_CANDIDATE_REASONS` set is
  validated at the kernel boundary; consumers
  that pass unknown reasons get an empty result
  rather than an error, which preserves
  least-surprise behavior.
- `changedDecision` is derived from the prior
  ledger read at decide time. If multiple
  operators decide the same candidate
  concurrently, the CLI surfaces the
  most-recent prior decision visible to that
  process — same race condition the ledger
  append already has. No new risk introduced.
- The `summary` block counts across the FULL
  candidate set, not the filtered subset, so
  operators can see the unfiltered totals at a
  glance. The `mergeCandidateViews` array reflects
  the filtered subset (matching what
  `mergeCandidates` shows).

**Follow-up:**

- **Issue merge decision publication / detail
  polish v2** — recommended next slice. Improve
  how decision counts surface in proof report and
  how candidate detail formats for non-JSON
  consumption (e.g., a human-readable table mode).
- Optional summary in `rekon issues merge
  decisions` that classifies entries by current
  vs. superseded state.
- Optional filter-health-style alerts when
  undecided / superseded candidates dominate.

## NEXT STEP

**Issue merge decision publication / detail polish v2.**

Improve how accepted / rejected / undecided
merge-candidate context appears in architecture
summary, agent contract, and proof report. Likely
adds:
- A roll-up table format for accepted merge
  decisions in proof report (mirroring the existing
  Accepted Issue Merge Roll-ups section).
- Human-readable (non-JSON) output mode for
  `candidate <id>` detail.
- Tighter cross-references between the candidate
  detail JSON and the `decide` recommended-next
  commands.

Still no automatic merge or semantic review. Builds
directly on the operator-ergonomics v1 shipped here.
