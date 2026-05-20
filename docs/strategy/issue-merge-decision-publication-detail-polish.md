# Issue Merge Decision Publication / Detail Polish v2

> Combined CLI + publication + docs + test polish
> batch on top of
> [issue merge decision operator ergonomics v1](issue-merge-decision-operator-ergonomics.md).
> Adds human-readable CLI output for the three merge
> commands, wires merge-decision context into the
> proof report, and tightens command guidance across
> the existing publications.
>
> **No automatic merging. No semantic / fuzzy / LLM /
> embedding review. No schema bump. No new artifact
> type.**

## Decision Summary

**Four polish surfaces:**

1. **Human-readable `rekon issues merge candidate
   <candidate-id>`** — when `--json` is absent, the
   detail command renders a structured plain-text
   block (candidate id, decision state, strength,
   confidence, reasons, member groups with status /
   severity / type / files / members, member finding
   ids, files, latest decision + decision-history
   summary, roll-up block if present, freshness
   status, warnings + `rekon refresh` recommendation
   if stale, and the recommended-commands list).
2. **Human-readable `rekon issues merge candidates`**
   — non-JSON output renders a compact summary line
   (`Merge candidates: N total, N undecided, N
   accepted, N rejected`), an optional `Filters:`
   line describing applied filters, an optional
   `Lineage:` line when stale / superseded counts
   are non-zero, and a Markdown table with
   candidate id / decision / strength / confidence
   / groups / reasons. Empty-state text when
   filters return zero matches.
3. **Enhanced `rekon issues merge decisions`** —
   adds a `summary` block (`total`, `current`,
   `superseded`, `accepted`, `rejected`) to JSON
   output, where a decision is `current` when it
   is the latest decision for its `candidateId`
   and `superseded` otherwise. The `accepted` and
   `rejected` counts are over the **current**
   decisions only. Non-JSON output renders the
   summary line plus a Markdown table with
   candidate / decision / current / decided-at /
   note (truncated).
4. **Proof report Issue Merge Decision Context** —
   `@rekon/capability-docs.proof-report` now reads
   `IssueAdjudicationReport` and
   `IssueMergeDecisionLedger`, builds
   `mergeCandidateViews`, and renders a new
   `## Issue Merge Decision Context` section right
   after the opening paragraph. The section shows
   `Merge candidates` / `Accepted` / `Rejected` /
   `Undecided` / `Accepted roll-ups in
   CoherencyDelta` counts; an accepted-roll-up
   table when accepted decisions exist; and the
   `rekon issues merge candidates --undecided` /
   `--superseded` / `--stale` recommended commands
   when those counts are non-zero. The publisher
   manifest's `consumes` list adds
   `IssueMergeDecisionLedger` and a new
   `issue-merge-decision.changed` invalidation
   rule.

**Tightened existing publications:**

- Architecture summary's `## Merge Candidate
  Decisions` section now also recommends
  `rekon issues merge candidates --decision
  accepted --json` when accepted candidates exist
  (audit path).
- Agent contract's `### Merge Candidate Decisions`
  subsection mirrors the same accepted-audit
  command line.

## Problem

After
[operator ergonomics v1](issue-merge-decision-operator-ergonomics.md)
shipped at `fde5a91`, operators have filters and a
candidate-detail command — but the detail command
returns raw JSON. Running it interactively still
requires `jq` to read. Similarly, `issues merge
decisions` lists the raw ledger with no
classification of current vs. superseded entries,
so an operator scanning a ledger that contains
re-decided candidates can't see which entries
reflect live state without comparing timestamps.

The proof report is the surface where humans and
agents look for the current proof-of-correctness
state. Accepted merge roll-ups affect remediation
grouping; the proof report should mention them.
Today it doesn't.

The architecture summary and agent contract show
candidate decision counts and recommend
`--undecided` when undecided > 0, but offer no
audit path for accepted candidates.

This batch polishes those four surfaces so the
operator workflow no longer requires raw-JSON
inspection or extra navigation.

## CLI Detail Polish

### Candidate detail (`rekon issues merge candidate <candidate-id>`)

Without `--json`, renders:

```text
Merge Candidate: <candidate-id>
Decision: accepted | rejected | none
Strength: strong | medium | weak
Confidence: 0.85
Reasons: same-file, same-severity, related-type-prefix

Groups:
- <group-id> — <status> — <severity> — <type>
  Files: <file list>
  Members: <finding ids>

Member finding ids: <union>
Files: <union>

Latest Decision: (when present)
- <decision> by <decidedBy> at <decidedAt>
  note: <note>
  reason: <reason>
- (decision history length: <n>)

Roll-up: (when present)
- <rollup id>
  Groups: <group ids>
  Decisions: <decision ids>

Freshness:
- status: fresh | stale | missing | unknown

Warnings: (when present)
- <warning text>

Recommended command: rekon refresh (when stale)

Recommended commands:
- rekon issues merge decide <candidate-id> --decision accepted --note "..."
- rekon issues merge decide <candidate-id> --decision rejected --note "..."
- rekon coherency delta --json
```

JSON output is unchanged. The `recommendedCommands`
array still surfaces in JSON.

### Candidates list (`rekon issues merge candidates`)

Without `--json`, renders:

```text
Merge candidates: 3 total, 1 undecided, 1 accepted, 1 rejected
Lineage: 0 stale, 0 superseded         (only when non-zero)
Filters: decision=none                 (only when filters applied)
Merge-rollup freshness: stale          (only when non-fresh/non-missing)

| Candidate | Decision | Strength | Confidence | Groups | Reasons |
| --- | --- | --- | ---: | --- | --- |
| merge-candidate:... | none | strong | 0.85 | issue-a1, issue-b1 | same-file, same-severity |
```

Empty-state text when filters return zero matches:
*"No issue merge candidates match the requested
filters."*

### Decisions (`rekon issues merge decisions`)

A decision is **`current`** when it is the latest
decision (by `decidedAt` descending; `id`
lexicographic tiebreak) for its `candidateId`.
Earlier decisions for the same candidate are
**`superseded`**. The `accepted` and `rejected`
counts in the summary are over the **current**
decisions only.

JSON output gains:

```json
{
  "ledger": { "type": "IssueMergeDecisionLedger", "...": "..." },
  "summary": {
    "total": 5,
    "current": 3,
    "superseded": 2,
    "accepted": 2,
    "rejected": 1
  },
  "decisions": [
    { "id": "...", "candidateId": "...", "decision": "...", "current": true | false, "...": "..." }
  ]
}
```

Non-JSON output renders:

```text
Merge decisions: 5 total, 3 current, 2 superseded
Current breakdown: 2 accepted, 1 rejected
Ledger: issue-merge-decision-ledger-...

| Candidate | Decision | Current | Decided At | Note |
| --- | --- | --- | --- | --- |
| ... | accepted | yes | 2026-05-20T... | Same root cause. |
```

The ledger itself is **not** modified; the
`current` annotation is computed on the fly at
read time.

## Proof Report Merge Context

The proof-report publisher now reads:

- `IssueAdjudicationReport`
- `IssueMergeDecisionLedger`
- `CoherencyDelta` (already read pre-batch)
- `FindingLifecycleReport` (already read pre-batch)

It cites every artifact it consulted in
`header.inputRefs`. Manifest `consumes` adds
`IssueMergeDecisionLedger`; manifest `invalidatedBy`
adds an `issue-merge-decision.changed` rule.

The publisher emits a new section right after the
opening paragraph (so it renders even when no
`VerificationPlan` exists — operators see merge-
decision state during early proof-loop preparation):

```markdown
## Issue Merge Decision Context

- Merge candidates: <n>
- Accepted: <n>
- Rejected: <n>
- Undecided: <n>
- Accepted roll-ups in CoherencyDelta: <n>

(when accepted roll-ups exist)
| Roll-up | Groups | Decision IDs | Member Findings | Freshness |
| --- | --- | --- | ---: | --- |
| <rollup id> | <groups> | <decision ids> | <member count> | fresh|stale|missing |

(when undecided exist)
Recommended command:

```bash
rekon issues merge candidates --undecided --json
```

(when superseded > 0)
Recommended command:

```bash
rekon issues merge candidates --superseded --json
```

(when stale > 0)
Recommended command:

```bash
rekon issues merge candidates --stale --json
```
```

When the latest `IssueAdjudicationReport` has no
merge candidates at all, the section emits:

```markdown
No issue merge candidates in latest IssueAdjudicationReport.
```

## Publication Command Guidance Tightening

Architecture summary's `## Merge Candidate
Decisions` section already shows counts and the
`--undecided` command. This batch adds an
accepted-audit recommendation when accepted
candidates exist:

```markdown
Audit accepted candidates via:

```bash
rekon issues merge candidates --decision accepted --json
```
```

The closing paragraph also now points at the
human-readable detail mode explicitly:

> Inspect any candidate via `rekon issues merge
> candidate <candidate-id>` (human-readable) or add
> `--json` for the structured view.

Agent contract's `### Merge Candidate Decisions`
subsection mirrors the accepted-audit command line.

## What This Does Not Do

- **No automatic accept / reject** of merge
  candidates.
- **No automatic merging** of issue groups.
- **No semantic / fuzzy / LLM / embedding review.**
- **No schema bump** — `IssueMergeDecisionLedger`,
  `IssueAdjudicationReport`, `CoherencyDelta`,
  `FindingLifecycleReport`, the publication types,
  and the resolver packet types are all unchanged.
- **No mutation** of any artifact. The `current`
  annotation on decisions is computed at read
  time; the ledger entries are unchanged.
- **No new artifact type, capability role, or CLI
  subcommand outside the merge workflow.**
- **No new producer.** The proof report changes are
  publisher-only (reads existing artifacts).

## Tests Required

`tests/contract/issue-merge-publication-detail-polish.test.mjs`
(17 cases) pins:

1. Candidate detail non-JSON output includes
   candidate id, decision state, groups, member
   ids, files, and recommended commands.
2. Undecided candidate detail says
   `Decision: none`.
3. Stale/superseded candidate detail surfaces
   warnings and recommends `rekon refresh`.
4. Candidates list non-JSON renders summary + table.
5. Candidates list non-JSON shows applied filters.
6. Candidates list non-JSON renders empty-state.
7. Proof report cites
   `IssueAdjudicationReport`,
   `IssueMergeDecisionLedger`, and
   `CoherencyDelta` in inputRefs.
8. Proof report includes the new section.
9. Proof report shows accepted / rejected /
   undecided counts.
10. Proof report shows accepted roll-up table.
11. Proof report recommends `--undecided` when
    undecided exist.
12. Proof report recommends `--superseded` when
    superseded exist.
13. Architecture summary includes both
    `--undecided` and `--decision accepted`
    guidance.
14. Agent contract includes accepted-audit command
    when accepted candidates exist.
15. `decisions --json` includes the summary block
    + `current` flag per entry.
16. `decisions` non-JSON renders the summary +
    readable table.
17. `rekon artifacts validate` stays clean.

## Follow-Up Work

- **Verification runner v1 decision memo** —
  recommended next slice. The next big
  classic-parity gap is execution / proof
  maturity: decide whether Rekon should execute
  verification commands locally; define safety
  model, secret / log handling, timeout
  behavior, and artifact shape; no implementation
  until the decision is pinned.
- Optional: extend the `current` annotation into
  `rekon issues merge candidates` JSON output
  per-view so consumers don't have to cross-
  reference the decisions ledger when rendering
  decision history.
- Optional: a `rekon issues merge candidates
  --format table|json` flag to make the output
  mode explicit (alongside the existing
  `--json` flag).

## Cross-References

- [Issue merge decisions concept](../concepts/issue-merge-decisions.md)
- [Issue merge decision ledger artifact](../artifacts/issue-merge-decision-ledger.md)
- [Issue merge decision freshness guardrails](issue-merge-decision-freshness-guardrails.md)
- [Issue merge decision operator ergonomics](issue-merge-decision-operator-ergonomics.md)
- [Issue adjudication concept](../concepts/issue-adjudication.md)
- [Issue adjudication report artifact](../artifacts/issue-adjudication-report.md)
- [CoherencyDelta artifact](../artifacts/coherency-delta.md)
- [Coherency delta concept](../concepts/coherency-delta.md)
- [Proof report publication artifact](../artifacts/proof-report-publication.md)
- [Proof report publication concept](../concepts/proof-report-publication.md)
- [Architecture summary publication artifact](../artifacts/architecture-summary-publication.md)
- [Architecture summary publication concept](../concepts/architecture-summary-publication.md)
- [Agent contract publication artifact](../artifacts/agent-contract-publication.md)
- [Agent operating contract concept](../concepts/agent-operating-contract.md)
- [Issue governance architecture decision](issue-governance-architecture-decision.md)
- [Classic behavior roadmap](classic-behavior-roadmap.md)
- [Roadmap](roadmap.md)
