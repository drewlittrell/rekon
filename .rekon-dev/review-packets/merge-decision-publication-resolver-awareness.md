# Review Packet: Publication and Resolver Awareness of Accepted Merge Decisions

Slice: P1.1 (Issue Adjudication), merge-awareness slice. Builds on
CoherencyDelta v3.

## CHANGES MADE

`packages/capability-docs/src/index.ts`
- Architecture summary publisher: after the existing
  `## Governed Issue Groups` section, render a new
  `## Accepted Issue Merge Roll-ups` section. When
  `CoherencyDelta` is absent, instruct the operator to run
  `rekon coherency delta`. When present, walk the delta items and
  emit one table row per merged rollup item
  (`mergedIssueGroupIds.length > 1`):
  `Roll-up | Groups | Decision IDs | Member Findings | Severity |
  Status | Active`. Active rollups sort before inactive; tie-break
  by rollup id. Cap the table at 20 rows with a "_… N more
  roll-ups_" overflow line. When there are no merged rollups,
  render the literal sentence "No accepted issue merge roll-ups
  in latest CoherencyDelta." so the absence is explicit (no claim
  is made about whether merge candidates exist).
- Agent contract publisher: inside the `Active Governance State`
  section, after the existing `### Governed Issue Groups`
  subsection, render `### Accepted Issue Merge Roll-ups`. When
  `CoherencyDelta` is missing, instruct the operator to run
  `rekon coherency delta`. When present, render one bullet per
  merged rollup item with rollup id, member group ids, member
  finding count, decision id(s), severity, and active flag (cap
  at 10 with a `_… N more roll-ups_` overflow line). Closing
  sentence: "When working on a merged roll-up, inspect every
  member group and finding id before editing. Use
  `rekon resolve issue --issue <group-id>` for context on any
  member group." Empty-rollup branch renders "No accepted issue
  merge roll-ups in latest CoherencyDelta."
- `AGENT_CONTRACT_DO_NOT_DO` gains one new entry:
  "Do not treat accepted merge roll-ups as automatic mutation of
  raw issue groups; inspect mergedIssueGroupIds and
  memberFindingIds before editing, and consult both member
  groups for context."
- New shared helper `collectMergedRollups(delta)` returns a
  sorted array of merged rollup rows from `CoherencyDelta.items`.

`packages/capability-resolver/src/index.ts`
- Imports `CoherencyDelta` and `CoherencyDeltaItem` from
  `@rekon/kernel-findings`.
- `ResolutionTraceEntry.sourceType` literal-union gains
  `"CoherencyDelta"`.
- New exported type `IssueMergeRollupSummary`:
  `rollupId`, `issueGroupId?`, `mergedIssueGroupIds`,
  `mergeDecisionIds`, `mergeCandidateIds`, `memberFindingIds`,
  `severity`, `status`, `active`.
- `IssuePacket` gains additive optional `mergeRollup?:
  IssueMergeRollupSummary`.
- New helpers: `findMergeRollupForGroup(artifacts, groupId)` reads
  the latest `CoherencyDelta` and returns the first merged rollup
  item (`mergedIssueGroupIds.length > 1`) that includes
  `groupId`, plus a properly-shaped `ArtifactRef`;
  `toMergeRollupSummary(item)` projects a `CoherencyDeltaItem`
  into the summary shape.
- `buildGroupIssuePacket` calls `findMergeRollupForGroup` after
  the existing freshness / ownership steps. When a rollup is
  found:
  - attaches `mergeRollup` to the packet
  - appends a sibling-group warning naming the other group ids:
    "Matched issue group is part of an operator-accepted merged
    roll-up (<rollup-id>); inspect sibling group(s) <ids>
    before acting."
  - pushes a trace entry `step: "issue.merge"`,
    `sourceType: "CoherencyDelta"`, `status: "used"`,
    referencing the delta via `sourceRef`, with rollup metadata
    in `details`
  - cites the `CoherencyDelta` in `header.inputRefs` via the
    existing `appendInputRef` helper (deduped) — alongside the
    existing `IssueAdjudicationReport` ref
  - adds `"CoherencyDelta"` to `header.provenance.notes`
- Manifest `consumes` gains `"CoherencyDelta"` so registry
  inspection reflects the new dependency.

Tests:
- New `tests/contract/merge-decision-publication-resolver-awareness.test.mjs`
  with 10 tests covering: architecture summary with/without
  accepted roll-ups, architecture-summary inputRefs preservation,
  agent contract with/without accepted roll-ups, agent contract
  `Do Not Do` reminder, `resolve.issue` mergeRollup + warning +
  trace + inputRef on accepted, `resolve.issue` no-rollup on
  rejected, raw-fallback preservation, and that
  `publish agents` / `publish proof` still emit Publications.
- Existing `tests/contract/publications-adjudicated-issues.test.mjs`,
  `tests/contract/issue-resolver-adjudicated.test.mjs`, and the
  earlier merge-decision contracts are unchanged.
- Full suite: 458 passed / 1 skipped.

Docs (10 files):
- `docs/artifacts/architecture-summary-publication.md` — new
  section #6 ("Accepted Issue Merge Roll-ups") with shape +
  empty-state text; remaining sections renumbered.
- `docs/concepts/architecture-summary-publication.md` —
  expanded step 2 to describe the new section.
- `docs/artifacts/agent-contract-publication.md` — extended the
  governance-state step to describe the new subsection.
- `docs/concepts/agent-operating-contract.md` — sectioned table
  updated; new "Accepted Issue Merge Roll-ups" paragraph;
  `Do Not Do` reminder noted.
- `docs/artifacts/resolver-packet.md` — added `mergeRollup`
  field description.
- `docs/concepts/resolvers.md` — added paragraph on
  merge-rollup awareness, including trace entry and inputRef
  shape.
- `docs/artifacts/coherency-delta.md` — "Consumed By" gains the
  three new consumer entries (architecture summary, agent
  contract, resolver).
- `docs/concepts/coherency-delta.md` — v3 callout extended to
  name the downstream surfaces.
- `docs/concepts/issue-merge-decisions.md` — new "Downstream
  Surfaces" section + updated "What This Is Not".
- `CHANGELOG.md` — detailed entry at the top of
  `0.1.0-alpha.1`.
- Strategy doc updates:
  `docs/strategy/classic-subsystem-purpose-map.md` (subsystem 6
  status + next slice),
  `docs/strategy/classic-behavior-roadmap.md` (new phase entry
  for the merge-awareness slice),
  `docs/strategy/classic-guarantee-regression-plan.md` (P1.1
  entry citing the new 10-test contract suite),
  `docs/strategy/roadmap.md` (new bullet under completed alpha
  spine),
  `docs/strategy/classic-alignment-map.md` (resolver +
  publications rows updated to mention v3 merge awareness).

## PUBLIC API CHANGES

`@rekon/capability-resolver`:
- New exported type: `IssueMergeRollupSummary`.
- `IssuePacket.mergeRollup` is additive optional.
- `ResolutionTraceEntry.sourceType` literal union gains
  `"CoherencyDelta"`. (Additive — existing consumers that switch
  on the union must add no new branches because the new value is
  reserved for the new `issue.merge` step; existing steps still
  use the same source types.)
- Manifest `consumes` gains `"CoherencyDelta"`.

No SDK API change. No artifact registry change. No artifact
schemaVersion bump. No new capability role. No new CLI subcommand.
No version bump. No npm publish.

## PURPOSE PRESERVATION CHECK

Original problem: after an operator accepts a merge candidate,
humans and agents need to understand that multiple issue groups
are being treated as one roll-up / remediation unit. If
publications and resolvers only show raw groups, operators see
duplicate-looking issues even though they already made an
explicit merge decision. If surfaces hide raw group / member
traceability, the merge becomes unreviewable.

Classic shape: `services/IssueDetectionService.ts`,
`domain/issues/mergeIssues.ts`,
`services/ContextHandler.ts`,
`services/ArchitectureDocsHandler.ts`,
`packages/product-codebase-intel/src/replatform/replatform-delta.ts`,
`packages/product-codebase-intel/src/replatform/replatform-delta-projections.ts`.

Rekon equivalent:
- `CoherencyDelta` v3 (shipped previously) creates merged rollup
  items for accepted merge decisions.
- This batch surfaces those rollups in the three places humans
  and agents actually read: architecture summary, agent contract,
  `resolve.issue`.
- Raw group ids, member finding ids, decision ids, and candidate
  ids all remain visible on every surface.

What would mean we failed:
- Accepted merge decisions affect CoherencyDelta but are
  invisible in publications/resolvers — covered by the
  architecture-summary, agent-contract, and `resolve.issue`
  accepted-fixture tests.
- Publications make merged rollups look like ordinary single
  groups — covered by the architecture-summary tests asserting
  the new section text + both group ids + decision id.
- `resolve.issue` on one group does not mention its merged
  siblings — covered by the `resolve.issue` warning assertion.
- Raw member finding traceability disappears — covered by the
  `mergeRollup` field which carries `mergedIssueGroupIds`,
  `mergeDecisionIds`, `mergeCandidateIds`, `memberFindingIds`.
- Rejected decisions are presented as merged — covered by the
  rejected-fixture test asserting no `mergeRollup`, no
  `issue.merge` trace step, and no "operator-accepted merged
  roll-up" warning.

## CODEBASE-INTEL ALIGNMENT

Classic capability / failure mode: issue / coherency / docs
context should reflect governed issue relationships and operator
judgments.

What Rekon keeps:
- accepted merge decisions reduce duplicate remediation noise in
  human-readable surfaces
- operator decisions are visible and auditable on every surface
- generated docs reflect governed issue state, including merged
  roll-ups
- issue resolver exposes merged context
- raw groups and findings remain traceable through the rollup
  metadata

What Rekon simplifies:
- reads `CoherencyDelta` rollup fields only — no direct
  `IssueMergeDecisionLedger` reads from publications or
  resolver
- no mutation of adjudication groups or any other artifact
- no semantic / fuzzy matching
- no LLM review
- no issue health scoring
- no PR / check / dashboard surface

What Rekon does not port yet:
- full semantic merge
- operator merge UI
- issue health / trend projections
- LLM adjudication
- false-positive classifier
- PR / check issue summaries
- propagation of merged rollups into `intent remediation`
  (remediation work order still keys off the
  `CoherencyDelta.remediationQueue` directly, so the queue's
  `remediation:merged:*` ids already collapse correctly — no
  separate change needed in this batch)

How this advances migration:
- Connects operator merge decisions to the surfaces people and
  agents actually consult.
- Makes `CoherencyDelta` v3 useful beyond raw artifact
  inspection.
- Preserves traceability via the rollup-id / decision-id /
  candidate-id / member-finding-id quadruple visible on every
  surface.

## PUBLICATION ROLL-UP DISPLAY

Architecture summary section header: `## Accepted Issue Merge
Roll-ups`. Always renders after `## Governed Issue Groups`.
Body:
- No `CoherencyDelta` indexed: "No CoherencyDelta found; accepted
  merge roll-ups cannot be displayed. Run `rekon coherency
  delta` after recording any operator merge decisions."
- `CoherencyDelta` present with no merged rollup items: "No
  accepted issue merge roll-ups in latest CoherencyDelta."
- `CoherencyDelta` present with merged rollup items: markdown
  table sorted by (active first, then rollup id) with up to 20
  rows + overflow line; followed by "Roll-ups reflect
  operator-accepted merge decisions; underlying issue groups
  remain in `IssueAdjudicationReport` and are still inspectable.
  Use `rekon resolve issue --issue <group-id>` for context on
  any member group."

Agent contract section header: `### Accepted Issue Merge
Roll-ups`. Always renders after `### Governed Issue Groups`.
Body:
- Missing-delta + no-rollup branches identical messages to the
  architecture summary equivalents.
- Rollup branch: bullet list (up to 10 with overflow line),
  each: ``- `<rollup-id>` — groups: <ids> — members: <n> —
  decision(s): <ids> — severity: <severity> —
  active|inactive``. Closing sentence: "When working on a merged
  roll-up, inspect every member group and finding id before
  editing. Use `rekon resolve issue --issue <group-id>` for
  context on any member group."

`Do Not Do` new entry:
"Do not treat accepted merge roll-ups as automatic mutation of
raw issue groups; inspect mergedIssueGroupIds and
memberFindingIds before editing, and consult both member groups
for context."

## RESOLVE.ISSUE MERGE ROLL-UP CONTEXT

Trigger: `resolve.issue` group mode matches a group (exact id /
canonical / member / unique substring). After freshness +
ownership resolution, the resolver calls
`findMergeRollupForGroup(artifacts, group.id)`:

- Lists `CoherencyDelta` entries, picks the latest by id
  (matching the timestamp-suffix convention used elsewhere in
  this file).
- Reads the delta. Finds the first item with
  `Array.isArray(item.mergedIssueGroupIds)` and
  `item.mergedIssueGroupIds.length > 1` and
  `item.mergedIssueGroupIds.includes(group.id)`.
- Returns `{ deltaRef, item }` or `null`.

If found:
- `mergeRollup` attached to packet with the eight fields above.
- Warning pushed: "Matched issue group is part of an
  operator-accepted merged roll-up (<rollup-id>); inspect
  sibling group(s) <other-ids> before acting."
- Trace entry pushed:
  `step: "issue.merge"`,
  `sourceType: "CoherencyDelta"`,
  `sourceRef: <deltaRef>`,
  `status: "used"`,
  `message: "Matched group <groupId> is part of merged roll-up
   <rollupId> (<n> groups, <m> member findings)."`,
  `details: { rollupId, mergedIssueGroupIds, mergeDecisionIds,
   mergeCandidateIds, memberFindingCount }`.
- `header.inputRefs` extended with the `CoherencyDelta` ref via
  the existing `appendInputRef` dedupe helper. The
  `IssueAdjudicationReport` ref still appears.
- `header.provenance.notes` becomes
  `["resolve.issue", "IssueAdjudicationReport", "CoherencyDelta"]`.

If not found (no `CoherencyDelta`, no rollup containing the
group, latest decision was rejected): `mergeRollup` stays
`undefined`, no warning, no trace entry, no extra inputRef.
Existing v2 group-mode behavior is byte-for-byte preserved on
this path.

Manifest update: `consumes` adds `"CoherencyDelta"` so registry
inspection (e.g. `rekon capabilities inspect
@rekon/capability-resolver`) reflects the dependency.

## TESTS / VERIFICATION

New: `tests/contract/merge-decision-publication-resolver-awareness.test.mjs`
with 10 tests.

Test coverage:
1. architecture summary includes new section with member group
   ids + decision id when an accepted decision exists
2. architecture summary says no accepted roll-ups in the absence
   of any decision (still cross-rule seeded so the path goes
   through `CoherencyDelta`)
3. architecture summary continues to cite
   `IssueAdjudicationReport` + `CoherencyDelta` in its
   `inputRefs` after the merge-aware update
4. agent contract renders new subsection with member group ids +
   instruction to inspect every member group
5. agent contract `Do Not Do` includes the new reminder text
6. agent contract no-rollup branch when no decisions exist
7. `resolve.issue` attaches `mergeRollup`, sibling-group
   warning, `issue.merge` `CoherencyDelta` `used` trace step,
   and adds `CoherencyDelta` + retains `IssueAdjudicationReport`
   in `inputRefs` when matched group is in an accepted rollup
8. `resolve.issue` does not attach `mergeRollup`, warning, or
   trace step when the latest decision is rejected
9. `resolve.issue` raw fallback still works (no `mergeRollup`,
   `matchSource !== "IssueAdjudicationReport"`) when no
   `IssueAdjudicationReport` is indexed yet
10. `rekon publish agents` and `rekon publish proof` still emit
    Publications after the merge-awareness wiring

Full suite: 458 passed / 1 skipped / 0 failed.

Required verification commands (all run, all green):
- `npm run typecheck`
- `npm run build`
- `npm run test`
- `git diff --check`
- `node scripts/audit-package-exports.mjs`
- `node scripts/publish-dry-run.mjs`
- `node scripts/audit-license.mjs`
- `node scripts/install-smoke.mjs`
- `node scripts/install-tarball-smoke.mjs`
- `node packages/cli/dist/index.js refresh --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js publish architecture --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js publish agent-contract --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js resolve issue --root examples/simple-js-ts --issue no-such-issue --json`
- `node packages/cli/dist/index.js artifacts validate --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js artifacts freshness --root examples/simple-js-ts --json`

## INTENTIONALLY UNTOUCHED

- `IssueAdjudicationReport.groups` and writes — not mutated.
- `IssueMergeDecisionLedger.decisions` and writes — not mutated.
  Publications and resolver read merged rollup metadata from
  `CoherencyDelta` only, so this batch adds no second reader of
  the ledger.
- `CoherencyDelta` shape and behavior — the v3 projection is
  read only.
- `FindingReport`, `FindingStatusLedger`, `FindingLifecycleReport`
  — untouched.
- Resolver group-mode freshness handling (`detectAdjudicationStaleness`,
  `issue.freshness` trace step, sibling stale warning).
- Resolver verification aggregation (`aggregateGroupVerification`,
  `verificationByFinding`, status-based warnings).
- Resolver raw fallback (status-ledger annotations, raw issue
  matching, `relatedFindings`).
- `resolve.route`, `resolve.seam`, `resolve.preflight`.
- `@rekon/capability-intent.remediation-work-order` — it already
  consumes the `CoherencyDelta.remediationQueue` which now
  carries `remediation:merged:*` ids for accepted merged
  rollups, so this slice needs no change there.
- `@rekon/capability-reconcile.actuator` — same story; it sees
  the merged remediation entries unchanged.
- All evaluator output, finding lifecycle, status ledger
  handling.
- All capability manifests, permissions, dist contents,
  schemaVersion strings.
- No version bump (`0.1.0-alpha.1` workspace + all
  `@rekon/*` packages remain).
- No npm publish.

## RISKS / FOLLOW-UP

- Risk: the resolver reads the latest `CoherencyDelta` by id
  ordering (timestamp-suffixed) for symmetry with the existing
  `findIssueGroupMatches` path. If `CoherencyDelta` is stale
  relative to the latest `IssueMergeDecisionLedger`, the
  resolver will still attach the rollup that was present in the
  delta at write time. Mitigation: `validateArtifactFreshness`
  marks a stale `CoherencyDelta` and the agent contract /
  architecture summary already surface that warning. Future
  hardening (next slice, "Issue merge decision freshness
  guardrails") will pin this end-to-end.
- Risk: `mergeRollup` adds new fields to `IssuePacket`; consumers
  that pin a closed shape will need to update. Mitigation: all
  three new fields are optional and additive; the field is
  `undefined` on rejected / no-rollup / no-delta paths.
- Risk: the resolver's new `findMergeRollupForGroup` reads the
  full latest `CoherencyDelta`. For small deltas this is fine.
  For very large deltas the cost is linear in items. Mitigation:
  not a concern for current alpha sizes; can be tightened with
  an index later if needed.
- Risk: the architecture summary's new section sits between
  Governed Issue Groups and Top Affected Paths; consumers
  parsing the publication by anchored section index need to
  re-anchor. Mitigation: sections are stable by markdown heading
  text, not numeric index. Existing tests assert content not
  position.
- Follow-up: "Issue merge decision freshness guardrails" — when
  the cited `CoherencyDelta` or upstream `IssueMergeDecisionLedger`
  is stale, publications and `resolve.issue` should warn
  explicitly (akin to the existing adjudication stale-source
  guardrails).
- Follow-up (deferred, captured in strategy docs): semantic /
  fuzzy / LLM merge, false-positive classifier, PR / GitHub /
  dashboard surfaces, operator UI for merge decisions.

## NEXT STEP

Per the work order's closing section, the recommended next slice
is:

> Issue merge decision freshness guardrails

Purpose:
- If the `CoherencyDelta` that the publications and resolver
  read was built from a stale `IssueMergeDecisionLedger`, or if
  the latest `IssueMergeDecisionLedger` is newer than the delta
  the resolver / publications consult, publications and
  `resolve.issue` should warn explicitly.
- Same shape as the existing adjudication-staleness guardrail
  surfaces — inline freshness warning subsections in publications
  and an `issue.merge.freshness` trace step in
  `resolve.issue`.

This batch will not modify the merge-rollup display itself; it
adds explicit stale-source warnings so operators don't act on a
projection that hasn't kept up with their decisions.
