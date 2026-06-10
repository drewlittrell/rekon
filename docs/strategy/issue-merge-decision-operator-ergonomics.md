# Issue Merge Decision Operator Ergonomics

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

> Combined strategy + implementation memo. Improves the
> human-in-the-loop merge workflow built on top of
> [issue merge decision freshness guardrails](issue-merge-decision-freshness-guardrails.md):
> operators can now list undecided / accepted / rejected
> / stale / superseded merge candidates, inspect a
> candidate in detail, and see decision-count guidance
> in publications. **No automatic merging. No semantic
> review.**

## Decision Summary

**Operators get four ergonomic surfaces:**

1. **Filters on `rekon issues merge candidates`**:
   `--undecided` / `--decision accepted|rejected|none`
   / `--stale` / `--superseded` / `--reason <reason>`
   / `--strength strong|medium|weak` / `--limit <n>`.
   The command also returns a `summary` with
   `accepted / rejected / undecided / stale /
   superseded` counts plus a structured
   `mergeCandidateViews` array carrying decision
   state per candidate.
2. **New `rekon issues merge candidate <candidate-id>`
   detail command** returning the candidate plus its
   member groups, member finding ids, files, latest
   decision, full decision history, current
   `CoherencyDelta` roll-up item (when accepted), the
   merge-rollup freshness result, and recommended
   next operator commands.
3. **Enhanced `rekon issues merge decide` output**
   now includes `previousDecision`, `changedDecision`,
   and `recommendedNextCommands`
   (`rekon coherency delta`, `rekon publish
   architecture`, `rekon publish agent-contract`).
4. **Publication decision-count guidance**:
   architecture summary renders a new
   `## Merge Candidate Decisions` section with
   counts + recommended commands; agent contract
   renders a `### Merge Candidate Decisions`
   subsection with the same counts and an explicit
   "Ask the operator to review undecided candidates"
   directive. A new `Do Not Do` reminder warns agents
   not to assume advisory merge candidates are
   accepted.

**Merge candidates remain advisory.** Only
`rekon issues merge decide` mutates the
`IssueMergeDecisionLedger`. Nothing in this slice
auto-decides, auto-merges, or applies semantic /
LLM / fuzzy review.

## Problem

After the freshness guardrails shipped at `b443ed1`,
operators can SEE when accepted merge roll-up
lineage goes stale or a decision is superseded —
but they still have to open raw
`IssueAdjudicationReport.mergeCandidates`,
`IssueMergeDecisionLedger.decisions`, and
`CoherencyDelta.items` to find the candidate,
inspect its context, and re-decide. That's
artifact-spelunking — technically correct, operationally
annoying.

The product decision is unchanged: humans adjudicate
merge relationships; Rekon never auto-merges. What
needs to change is the **friction** of that
human-in-the-loop workflow.

## Operator Workflow

Three CLI commands serve the workflow:

1. **`rekon issues merge candidates`** — discovery /
   filtering. Operators run this with
   `--undecided` to find candidates needing
   decisions, with `--decision accepted|rejected`
   to audit past decisions, with `--stale` or
   `--superseded` to find candidates whose decisions
   no longer match the current `CoherencyDelta`
   roll-up state. Output now includes a `summary`
   block and structured `mergeCandidateViews` per
   candidate (decision state, decision history,
   member groups, files, roll-up if any, warnings).
2. **`rekon issues merge candidate <candidate-id>`**
   — detail / context. Same shape as a single
   `mergeCandidateViews[i]` entry plus a
   `recommendedCommands` array suggesting the
   accepted / rejected decide commands and the
   merge-rollup freshness result. Operators run
   this before recording a decision.
3. **`rekon issues merge decide <candidate-id>`** —
   mutation. Unchanged ledger-append semantics.
   Output is now enriched with `previousDecision`,
   `changedDecision`, and `recommendedNextCommands`
   so operators see what was already on record and
   what to run next (`rekon coherency delta`,
   `rekon publish architecture`, `rekon publish
   agent-contract`).

Publications surface this in two ways:

- **Architecture summary** — new
  `## Merge Candidate Decisions` section between
  `## Accepted Issue Merge Roll-ups` and `## Finding
  Filter Health`. Shows `Total / Accepted /
  Rejected / Undecided` counts, recommends
  `rekon issues merge candidates --undecided --json`
  when undecided > 0, and recommends `--superseded` /
  `--stale` versions when those counts are
  non-zero. Always closes with the candidate detail
  + decide command lines so operators have a single
  starting point.
- **Agent contract** — new `### Merge Candidate
  Decisions` subsection right after `### Merge
  Decision Freshness`. Compact bullet list of
  decision counts plus explicit "Ask the operator to
  review undecided candidates before treating merge
  roll-ups as final." instruction when undecided > 0.

Both publications cite the latest
`IssueAdjudicationReport`, `IssueMergeDecisionLedger`,
and `CoherencyDelta` already (via the freshness
guardrails); no new `inputRefs` were added by this
slice — only new sections rendered from existing
inputs.

## Public Helper Shape

New exports from `@rekon/kernel-findings`
(additive only):

```ts
export type IssueMergeCandidateDecisionState =
  | "accepted"
  | "rejected"
  | "none";

export type IssueMergeCandidateView = {
  candidate: IssueMergeCandidate;
  decisionState: IssueMergeCandidateDecisionState;
  latestDecision?: IssueMergeDecision;
  decisionHistory: IssueMergeDecision[];
  groups: IssueAdjudicationGroup[];
  memberFindingIds: string[];
  files: string[];
  rollup?: CoherencyDeltaItem;
  stale?: boolean;
  superseded?: boolean;
  warnings: string[];
};

export type IssueMergeCandidateViewsInput = {
  report: IssueAdjudicationReport;
  ledger?: IssueMergeDecisionLedger;
  coherencyDelta?: CoherencyDelta;
  mergeRollupFreshness?: IssueMergeRollupFreshness;
};

export function buildIssueMergeCandidateViews(
  input: IssueMergeCandidateViewsInput,
): IssueMergeCandidateView[];
```

The helper is pure, deterministic, never mutates its
inputs, and never reads the filesystem. Decision
history is sorted newest-first
(`decidedAt` descending, `id` lexicographic
tiebreak) so callers can rely on
`decisionHistory[0] === latestDecision`. The
per-candidate `superseded` flag fires when a roll-up
exists for the candidate AND the latest ledger
decision is not the one the roll-up cites, OR the
latest decision is no longer `accepted`. The
per-view `stale` flag is the delta-level signal from
the freshness predicate applied to every candidate
when the lineage is stale.

The CLI's filter parsing, count summarization,
candidate-view serialization, and
`recommendedCommands` generation are CLI-local
helpers (`parseIssueMergeCandidateFilterFlags`,
`applyIssueMergeCandidateFilters`,
`summarizeIssueMergeCandidateDecisions`,
`serializeIssueMergeCandidateView`,
`recommendedCommandsForCandidateView`) so the
kernel surface stays minimal.

## What This Does Not Do

- **No automatic accept / reject** of merge
  candidates. Only `rekon issues merge decide`
  writes to the ledger.
- **No automatic merging** of issue groups. The
  rollup behavior of `CoherencyDelta` is unchanged.
- **No semantic / fuzzy / LLM / embedding review.**
  Filters are deterministic and operate purely on
  decision state + roll-up presence.
- **No mutation** of `IssueAdjudicationReport`,
  `FindingReport`, `FindingLifecycleReport`,
  `FindingStatusLedger`, or `CoherencyDelta`.
- **No watcher / daemon.** Reads happen on demand
  when commands run or publications regenerate.
- **No new artifact type, schema bump, capability
  role, or CLI subcommand outside the merge
  workflow.**

## Tests Required

A single contract test
(`tests/contract/issue-merge-operator-ergonomics.test.mjs`)
pins:

1. `--undecided` returns only undecided candidates.
2. `--decision accepted` returns only accepted candidates.
3. `--decision rejected` returns only rejected candidates.
4. `--decision none` equals `--undecided`.
5. `candidate <id>` returns groups, memberFindingIds,
   files, and recommendedCommands.
6. Candidate detail includes latest decision and
   decisionHistory (newest first).
7. Candidate detail includes `rollup` when accepted.
8. Candidate detail warns when candidate is superseded.
9. `decide` output includes `previousDecision` and
   `changedDecision` on re-decide; `previousDecision
   === null` on first decide.
10. `decide` output includes `recommendedNextCommands`.
11. Architecture summary renders the Merge Candidate
    Decisions counts.
12. Architecture summary recommends
    `--undecided --json` when undecided exist.
13. Agent contract renders the counts + undecided
    command.
14. Agent contract `Do Not Do` warns against
    assuming candidates are accepted.
15. Read commands (`candidates`, `candidate`) do not
    mutate any artifact; only `decide` writes.
16. `rekon artifacts validate` stays clean across
    all scenarios.

## Follow-Up Work

- **Issue merge decision publication / detail polish
  v2** — recommended next slice. Improve how the
  decision counts surface in proof report and how
  candidate detail formats for non-JSON consumption.
- Optional alert surfaces on filter-health-style
  output when undecided / superseded candidates
  dominate.
- Operator-facing summary in the `rekon issues
  merge decisions` command (currently lists the
  ledger without decision-state classification).

## Cross-References

- [Issue merge decisions concept](../concepts/issue-merge-decisions.md)
- [Issue merge decision ledger artifact](../artifacts/issue-merge-decision-ledger.md)
- [Issue merge decision freshness guardrails](issue-merge-decision-freshness-guardrails.md)
- [Issue adjudication concept](../concepts/issue-adjudication.md)
- [Issue adjudication report artifact](../artifacts/issue-adjudication-report.md)
- [CoherencyDelta artifact](../artifacts/coherency-delta.md)
- [Coherency delta concept](../concepts/coherency-delta.md)
- [Architecture summary publication artifact](../artifacts/architecture-summary-publication.md)
- [Architecture summary publication concept](../concepts/architecture-summary-publication.md)
- [Agent contract publication artifact](../artifacts/agent-contract-publication.md)
- [Agent operating contract concept](../concepts/agent-operating-contract.md)
- [Issue governance architecture decision](issue-governance-architecture-decision.md)
- [Classic behavior roadmap](classic-behavior-roadmap.md)
- [Roadmap](roadmap.md)
