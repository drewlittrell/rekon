# Review Packet — Issue Merge Decision Publication / Detail Polish v2

Combined CLI + publication + docs + test polish
batch on top of issue-merge-decision-operator-
ergonomics v1 (`fde5a91`). No automatic merging.
No semantic / fuzzy / LLM / embedding review. Only
`rekon issues merge decide` mutates the
`IssueMergeDecisionLedger`. No `schemaVersion`
bump. No new artifact type. No new capability role.
No producer change. No graph-aware filter change.
No source-file reads. No version bump. No npm
publish.

## CHANGES MADE

**Strategy memo:**

- `docs/strategy/issue-merge-decision-publication-detail-polish.md`
  — pins the four polish surfaces and the
  product invariants (advisory candidates, only
  `decide` mutates, `current` annotation computed
  at read time, no semantic review).

**CLI:**

- `packages/cli/src/index.ts` —
  - `issues merge candidate <id>` now renders a
    human-readable plain-text block when `--json`
    is absent. New helper
    `renderIssueMergeCandidateDetailText`.
  - `issues merge candidates` renders a summary
    line + filter description + Markdown table
    when `--json` is absent. New helper
    `renderIssueMergeCandidatesText` plus
    `describeIssueMergeCandidateFilter`.
  - `issues merge decisions` JSON output gains a
    `summary` block (`total`, `current`,
    `superseded`, `accepted`, `rejected`) and a
    `current` boolean per decision; non-JSON
    output renders the summary + Markdown table.
    New helpers `annotateIssueMergeDecisions`
    (computes the `current` annotation at read
    time, no ledger mutation) and
    `renderIssueMergeDecisionsText`.
  - JSON output for `candidates` and
    `candidate <id>` is otherwise unchanged.
  - Empty-ledger path on `issues merge decisions`
    now renders friendly text in non-JSON mode and
    an empty `summary` block in JSON mode.

**Publications:**

- `packages/capability-docs/src/index.ts` —
  - Proof-report publisher reads
    `IssueAdjudicationReport` and
    `IssueMergeDecisionLedger`, builds
    `mergeCandidateViews` via the existing
    `buildIssueMergeCandidateViews` helper, runs
    `detectIssueMergeRollupFreshness`, and threads
    both through `renderProofReport`.
  - New `appendProofReportMergeDecisionContext`
    function renders `## Issue Merge Decision
    Context` right after the opening paragraph
    (so it appears even when no `VerificationPlan`
    exists yet). Shows counts + accepted-roll-up
    table + recommended commands.
  - `ProofReportInputs` gains
    `mergeCandidateViews` and
    `mergeRollupFreshness` (additive optional).
  - Capability manifest `consumes` adds
    `IssueMergeDecisionLedger`; `invalidatedBy`
    adds an `issue-merge-decision.changed` rule
    that lists `IssueMergeDecisionLedger`.
  - Architecture summary's
    `appendArchitectureMergeCandidateDecisions`
    now recommends
    `rekon issues merge candidates --decision
    accepted --json` when accepted > 0; closing
    paragraph points operators at the
    human-readable detail mode explicitly.
  - Agent contract's
    `appendAgentContractMergeCandidateDecisions`
    mirrors the accepted-audit command line.

**Contract test:**

- `tests/contract/issue-merge-publication-detail-polish.test.mjs`
  (17 cases) pins every behavior change end-to-end.

**Supporting docs:**

- `docs/concepts/issue-merge-decisions.md` — CLI
  Surface section extended; cross-references added.
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
- `docs/artifacts/proof-report-publication.md` —
  new "Issue Merge Decision Context" section +
  cross-references.
- `docs/concepts/proof-report-publication.md` —
  cross-reference added.
- `docs/artifacts/architecture-summary-publication.md`
  — cross-reference added.
- `docs/concepts/architecture-summary-publication.md`
  — cross-reference added.
- `docs/artifacts/agent-contract-publication.md` —
  cross-reference added.
- `docs/concepts/agent-operating-contract.md` —
  cross-reference added.
- `docs/strategy/issue-governance-architecture-decision.md`
  — step 34 flipped to `(shipped)` with full
  diagnostic.
- `docs/strategy/classic-behavior-roadmap.md` —
  new polish-v2 entry below operator-ergonomics-v1
  entry; next-slice pointer updated to "verification
  runner v1 decision memo".
- `docs/strategy/roadmap.md` — new entry.
- `README.md` — CLI Commands list adds the
  non-JSON variants of `candidates` /
  `candidate <id>` / `decisions`.
- `CHANGELOG.md` — new top-of-`0.1.0-alpha.1`
  entry.

**Review packet:**

- `.rekon-dev/review-packets/issue-merge-publication-detail-polish-v2.md`
  (this file).

## PUBLIC API CHANGES

**Additive only.**

- CLI non-JSON output paths added for:
  - `rekon issues merge candidate <candidate-id>`
  - `rekon issues merge candidates`
  - `rekon issues merge decisions`
- CLI JSON output additions:
  - `rekon issues merge decisions` now includes a
    `summary` block (`total`, `current`,
    `superseded`, `accepted`, `rejected`) and a
    `current` boolean per decision in the
    `decisions` array.
- Publisher manifest additions:
  - `@rekon/capability-docs.consumes` adds
    `IssueMergeDecisionLedger`.
  - `@rekon/capability-docs.invalidatedBy` adds an
    `issue-merge-decision.changed` rule.

No removed fields, types, or function signatures.
No `schemaVersion` bumps. No new artifact types.

## PURPOSE PRESERVATION CHECK

- **Original problem:** merge-candidate / decision
  state is technically reachable via JSON, but
  human operators reviewing candidates
  interactively shouldn't need `jq`. The proof
  report is the surface where humans and agents
  look for the current proof-of-correctness state,
  and accepted merge roll-ups affect remediation
  grouping — the proof report should mention them.
  Architecture summary + agent contract already
  show counts but lacked an accepted-audit path.
- **Classic guarantee preserved:** classic
  codebase-intel-classic issue governance reduced
  duplicate / noisy issue surfaces while preserving
  reviewability, traceability, and operator
  judgment. The useful guarantee is **not**
  automatic issue merging — it's that humans can
  review issue relationships, understand proof
  state, and act without losing raw traceability.
- **Rekon equivalent preserved:**
  - Merge candidates remain advisory.
  - Merge decisions remain explicit operator
    artifacts.
  - `CoherencyDelta` continues to respect accepted
    decisions; roll-up behavior unchanged.
  - Stale / superseded lineage remains visible.
  - The proof report now reflects accepted
    roll-ups so operators understand how
    remediation grouping was projected.
  - The CLI surfaces a single read-time `current`
    annotation on decisions without mutating the
    ledger.
- **Failure modes avoided:**
  - Candidate detail no longer requires reading
    raw artifacts or piping JSON through tools —
    non-JSON output is readable.
  - Proof report no longer ignores accepted merge
    roll-ups.
  - Publications now point at the accepted-audit
    command in addition to the `--undecided`
    command.
  - Human-readable output still includes member
    group / finding traceability (member group
    list, memberFindingIds union, files union,
    rollup block).
  - The workflow does not become automatic
    merging or semantic review — `decide` is
    still the only mutating command; `current`
    is a read-time annotation.

## CODEBASE-INTEL ALIGNMENT

Aligned to:

- `services/IssueDetectionService.ts`,
  `domain/issues/mergeIssues.ts`,
  `services/issues/**` (classic merge / dedup
  ergonomics).
- `packages/product-codebase-intel/src/replatform/replatform-delta.ts`,
  `packages/product-codebase-intel/src/replatform/replatform-delta-projections.ts`
  (classic delta projection; the proof report
  Rekon-side now surfaces the merge-decision
  context the projection depends on).
- `services/IntentPreparationService.ts` (classic
  proof-loop preparation surface; the Rekon
  equivalent is `@rekon/capability-docs.proof-report`,
  which now sees merge-decision state during early
  proof-loop preparation).

What Rekon keeps:
- merge candidates remain advisory;
- merge decisions are explicit operator artifacts;
- proof surfaces reflect governed issue roll-ups;
- raw issue groups and member findings remain
  traceable;
- stale / superseded state is visible;
- no automatic semantic merge.

What Rekon simplifies:
- CLI and publication polish only;
- no UI / dashboard;
- no PR / check integration;
- no semantic / LLM review;
- no automatic merge application beyond
  already-shipped `CoherencyDelta` roll-up
  behavior.

## CLI DETAIL POLISH

**Candidate detail (`rekon issues merge candidate
<candidate-id>`):** non-JSON output renders
candidate id, decision state, strength / confidence /
reasons, member groups (with status / severity /
type / files / members), unioned member finding ids
+ files, latest decision + decision-history
summary, roll-up block when accepted, freshness
status, warnings + `rekon refresh` recommendation
when stale, and the recommended decide-commands
list. JSON output is unchanged.

**Candidates list (`rekon issues merge candidates`):**
non-JSON output renders a summary line + optional
`Filters:` / `Lineage:` / `Merge-rollup freshness:`
lines + a Markdown table with candidate / decision
/ strength / confidence / groups / reasons +
empty-state text when filters return zero matches.
JSON output is unchanged.

**Decisions (`rekon issues merge decisions`):**
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

A decision is `current` when it is the latest
decision (by `decidedAt` descending; `id`
lexicographic tiebreak) for its `candidateId`.
`accepted` and `rejected` counts are over the
**current** decisions only. **The ledger is not
modified** — the annotation is computed at read
time.

Non-JSON output renders the summary + a Markdown
table with candidate / decision / current /
decided-at / note (note truncated at 80 chars,
`|` chars escaped).

## PROOF REPORT MERGE CONTEXT

The proof-report publisher reads
`IssueAdjudicationReport` and
`IssueMergeDecisionLedger` (in addition to the
existing `CoherencyDelta` and
`FindingLifecycleReport`), builds
`mergeCandidateViews` via
`buildIssueMergeCandidateViews`, and runs
`detectIssueMergeRollupFreshness`. Manifest
`consumes` adds `IssueMergeDecisionLedger`;
`invalidatedBy` adds an
`issue-merge-decision.changed` rule.

The publisher emits a new section right after the
opening paragraph (so it renders even when no
`VerificationPlan` exists yet — operators see
merge-decision state during early proof-loop
preparation):

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
| ... | ... | ... | ... | fresh|stale|missing |

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
merge candidates, the section emits:

```markdown
No issue merge candidates in latest IssueAdjudicationReport.
```

## PUBLICATION GUIDANCE

**Architecture summary `## Merge Candidate
Decisions` section** continues to render counts +
`--undecided` command + closing paragraph. New:
also recommends
`rekon issues merge candidates --decision accepted
--json` when accepted > 0 (audit path). Closing
paragraph now points operators at the
human-readable detail mode (`rekon issues merge
candidate <id>`) explicitly.

**Agent contract `### Merge Candidate Decisions`
subsection** mirrors the accepted-audit command
line when accepted > 0.

## TESTS / VERIFICATION

**Contract test added:**
`tests/contract/issue-merge-publication-detail-polish.test.mjs`
(17 cases, all passing):

1. Candidate detail non-JSON output includes
   candidate id, decision state, groups, member
   ids, files, and recommended commands.
2. Undecided candidate detail says
   `Decision: none`.
3. Stale/superseded candidate detail surfaces
   warnings and recommends `rekon refresh`.
4. Candidates list non-JSON renders summary +
   table.
5. Candidates list non-JSON shows applied filters.
6. Candidates list non-JSON renders empty-state.
7. Proof report cites
   `IssueAdjudicationReport`,
   `IssueMergeDecisionLedger`, and
   `CoherencyDelta` in `inputRefs`.
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

**Verification commands (all green):**
- `npm run typecheck`
- `npm run build`
- `npm run test` (966 passed / 1 skipped / 0 failed)
- `git diff --check`
- `node scripts/audit-package-exports.mjs`
- `node scripts/publish-dry-run.mjs`
- `node scripts/audit-license.mjs`
- `node scripts/install-smoke.mjs`
- `node scripts/install-tarball-smoke.mjs`
- CLI smokes against `examples/simple-js-ts`:
  `refresh`, `issues merge candidates --undecided`
  (non-JSON), `issues merge decisions` (non-JSON),
  `publish proof`, `publish architecture`,
  `publish agent-contract`, `artifacts validate`,
  `artifacts freshness`.

## INTENTIONALLY UNTOUCHED

- `IssueMergeDecisionLedger`,
  `IssueAdjudicationReport`,
  `CoherencyDelta`,
  `FindingLifecycleReport`,
  `FindingStatusLedger` — no field changes; no
  schema bumps; no mutation outside the existing
  `decide` ledger append.
- `recordIssueMergeDecision` — unchanged.
- Merge decision semantics
  (`createIssueMergeDecisionLedger`,
  `rollupIssueGroupsByAcceptedMergeDecisions`,
  `applyIssueMergeDecisionsToCandidates`,
  `findLatestIssueMergeDecision`,
  `buildIssueMergeCandidateViews`).
- `CoherencyDelta` roll-up behavior
  (`createCoherencyDelta`).
- Merge-rollup freshness predicate
  (`detectIssueMergeRollupFreshness`).
- All graph-aware filter checks and freshness
  guardrails surfaces.
- Existing JSON output shapes for `candidates` and
  `candidate <id>`.
- Existing CLI subcommands, flags, and exit codes
  for non-merge workflows.
- Capability roles, capability templates.
- `examples/**` — no example changes.

## RISKS / FOLLOW-UP

**Risks:**

- The `current` annotation in `decisions` JSON is
  computed at read time. Consumers that snapshot
  the JSON and re-render later may see stale
  `current` flags if a new decision lands between
  snapshot and render. Mitigation: callers that
  want up-to-the-moment classification should
  re-run `rekon issues merge decisions --json`
  rather than caching it. Same race the freshness
  guardrails already document.
- Non-JSON output includes Markdown tables; the
  pipe character (`|`) in decision notes is
  escaped to `\\|`, but very wide notes get
  truncated at 80 chars in the `decisions` table.
  Operators can recover the full note via the JSON
  output.
- Adding `IssueMergeDecisionLedger` to the
  proof-report manifest's `consumes` means the
  proof report regenerates when operators record
  new decisions. That is the intent — the proof
  report should reflect current decision state —
  but it adds one more artifact-change trigger
  for the refresh pipeline.

**Follow-up:**

- **Verification runner v1 decision memo** —
  recommended next slice. The next big
  classic-parity gap is execution / proof
  maturity: decide whether Rekon should execute
  verification commands locally; define safety
  model + secret / log handling + timeout
  behavior + artifact shape; **no implementation
  until the decision is pinned**.
- Optional: extend the `current` annotation into
  the `mergeCandidateViews` JSON shape so
  consumers don't have to cross-reference the
  decisions ledger.
- Optional: explicit `--format table|json` flag
  on the merge commands (alongside the existing
  `--json` flag).

## NEXT STEP

**Verification runner v1 decision memo.**

Decide whether Rekon should execute verification
commands locally, define the safety model
(sandboxing, allowed binaries, env scrubbing),
secret / log handling (redaction, truncation,
where logs land), timeout behavior, retry rules,
and the canonical artifact shape for the
recorded execution. **No implementation until the
decision is pinned.** Likely strategy memo only,
similar in shape to the import-fact subject-shape
decision memo.
