# Memory Usage Evidence / Curation v1

## Batch Summary

Adds the feedback loop that lets operator memory get better over
time. The previous batch shipped deterministic ranking; this batch
records explicit outcomes after a memory was used and derives
deterministic curation recommendations. No automatic promotion, no
automatic deprecation, no LLM. Closes the next slice of the
operator-feedback / memory-curation guarantee under P1.2 in the
Classic Guarantees Audit.

## CHANGES MADE

- `packages/capability-memory/src/index.ts`:
  - New types: `MemoryUsageOutcome`, `MemoryUsageContext`,
    `MemoryUsageEvent`, `MemoryUsageLedger`,
    `MemoryCurationRecommendation`, `MemoryCurationItem`,
    `MemoryCurationReport`.
  - Module-scope constants `MEMORY_USAGE_OUTCOMES` and
    `MEMORY_USAGE_NOTE_REQUIRED`.
  - Two new learner modes: `"usage-record"` and `"curation"`.
  - Pure exported helpers: `createMemoryUsageLedger`,
    `validateMemoryUsageLedger`, `createMemoryCurationReport`,
    `deriveMemoryCuration`.
  - Manifest `produces` now includes `MemoryUsageLedger` and
    `MemoryCurationReport`. `consumes` adds `MemoryUsageLedger`.
    New invalidation rule `memory.usage.changed` cites
    `MemoryUsageLedger`.
  - Helpers added: `runUsageRecord`, `runCuration`,
    `readLatestLedger`, `computeCurationScore`,
    `parseUsageOutcome`, `parseUsageContext`,
    `assignStringContextField`, `parseEvidenceRefs`. The existing
    `runAdd` / `runSelect` paths are unchanged.
- `packages/sdk/src/index.ts`: registered
  `MemoryUsageLedger` and `MemoryCurationReport` as built-in
  artifact types so the SDK's `ensureManifestProducesKnownArtifacts`
  conformance check accepts the new outputs.
- `packages/runtime/src/index.ts`: added category routing for the
  two new types (`MemoryUsageLedger` → `actions`,
  `MemoryCurationReport` → `publications`).
- `packages/capability-docs/src/index.ts`:
  - Added `MemoryCurationReportLike` type.
  - `agentContractPublisher.publish` reads the latest
    `MemoryCurationReport` via `readLatestArtifact` (which
    pushes the ref into `inputRefs`).
  - `AgentContractInputs` and the `renderAgentContract`
    destructure carry `memoryCurationReport`.
  - Memory Guidance section renders a `### Memory Curation Status`
    sub-section with `memories needing review`, `reinforce
    candidates`, plus optional `deprecate candidates` and
    `supersede candidates`. Includes "Run `rekon memory curation`
    to refresh."
  - Manifest `consumes` adds `MemoryCurationReport`; new
    invalidation rule `memory.curation.changed` cites it.
- `packages/cli/src/index.ts`:
  - Three new command branches: `memory usage record
    <memory-entry-id>`, `memory usage list`, `memory curation`.
    `usage record` requires `--outcome`; the CLI surfaces the
    missing-arg error directly. `usage list` and `curation`
    short-circuit when no relevant artifacts exist
    (`{ artifact: null, events: [] }` for usage list;
    `{ artifact: null, summary: { totalMemories: 0 }, message: "No memory entries found." }`
    for curation).
  - Usage line for `rekon` extended with the three new commands.
- `tests/contract/memory-usage-curation.test.mjs`: 13 contract
  tests.
- New docs: `docs/artifacts/memory-usage-ledger.md`,
  `docs/artifacts/memory-curation-report.md`,
  `docs/concepts/memory-curation.md`.
- Doc updates: `docs/concepts/memory.md` (explicit "selection is
  not usage", new CLI smoke, deprecation deferral language),
  `docs/artifacts/memory-selection.md` (replaces the "Future
  `MemoryUsageEvent` could record …" deferral; cross-links the
  new docs), `docs/artifacts/operator-memory-entry.md` (cross-link
  updates), `docs/strategy/classic-subsystem-purpose-map.md` (row
  10 reads v1 ranking + v1 usage/curation),
  `docs/strategy/classic-behavior-roadmap.md` (new Phase B entry),
  `docs/strategy/classic-guarantee-regression-plan.md` (P1.2
  coverage expanded with the new test plan and deferrals),
  `docs/strategy/roadmap.md` (new bullet under completed alpha
  spine), `README.md` (new commands), `CHANGELOG.md` (entry at
  the top of `0.1.0-alpha.1`).
- Review packet:
  `.rekon-dev/review-packets/memory-usage-curation-v1.md` (this
  file).

## PUBLIC API CHANGES

- New CLI commands (additive, no flag changes to existing
  commands):
  - `rekon memory usage record <memory-entry-id> --outcome
    helpful|ignored|harmful|stale|unclear [--note <note>]
    [--selection <selection-id>] [--path <path>] [--goal <goal>]
    [--used-by <name>] [--root <path>] [--json]`
  - `rekon memory usage list [--root <path>] [--json]`
  - `rekon memory curation [--root <path>] [--json]`
- New package-local types in `@rekon/capability-memory`
  (additive):
  - `MemoryUsageOutcome`, `MemoryUsageContext`, `MemoryUsageEvent`,
    `MemoryUsageLedger`, `MemoryCurationRecommendation`,
    `MemoryCurationItem`, `MemoryCurationReport`.
- New exported helpers in `@rekon/capability-memory`:
  - `createMemoryUsageLedger`, `validateMemoryUsageLedger`,
    `createMemoryCurationReport`, `deriveMemoryCuration`.
- Two new built-in artifact types registered in `@rekon/sdk`:
  - `MemoryUsageLedger` (schemaVersion `0.1.0`, stability
    `experimental`)
  - `MemoryCurationReport` (schemaVersion `0.1.0`, stability
    `experimental`)
- `@rekon/capability-memory` manifest changes:
  - `consumes` adds `MemoryUsageLedger`.
  - `produces` adds `MemoryUsageLedger` and `MemoryCurationReport`.
  - `invalidatedBy` adds `memory.usage.changed` citing
    `MemoryUsageLedger`.
- `@rekon/capability-docs` manifest changes:
  - `consumes` adds `MemoryCurationReport`.
  - `invalidatedBy` adds `memory.curation.changed` citing
    `MemoryCurationReport`.
- No changes to `ArtifactHeader` shape. No new SDK roles. No new
  permissions. No new actuator. No source-write surface. No version
  bump. No npm publish.

## PURPOSE PRESERVATION CHECK

- **Original problem**: ranking memory is not enough. Without a
  feedback loop, harmful or stale guidance keeps resurfacing
  because the system has no record of past outcomes, and operators
  cannot tell which entries deserve review or deprecation.
- **Classic workflow guarantee**: `codebase-intel-classic` treated
  operator feedback as quality-managed guidance — scoped capture,
  ranking, curation/promotion signals, usage tracking, and
  freshness/reliability concerns.
- **Classic shape that provided the guarantee**:
  `lib/operator-feedback.ts`, `lib/memory/**`, context-usage
  events, feedback status / curation / promotion concepts,
  scoped feedback entries with evidence and verification metadata.
- **Rekon equivalent guarantee**: `MemorySelection` remains scored
  and explainable from the v1 ranking batch.
  `MemoryUsageLedger.events` records when selected memory was used
  and what happened, with an outcome enum and a required note for
  harmful/stale/ignored. `MemoryCurationReport` derives
  deterministic recommendations to keep / reinforce / review /
  deprecate / supersede-candidate, without mutating any feedback
  entry. The agent-contract publication surfaces a short status
  line.
- **What would mean we failed**:
  - Memory is selected but usage / outcome is not recorded.
    (Closed by the `usage record writes a MemoryUsageLedger
    artifact` test.)
  - Harmful or ignored memory has no way to be surfaced for
    review. (Closed by the four "recommendation" tests.)
  - Curation recommendations mutate memory automatically. (Closed
    by the `curation does not mutate OperatorFeedbackEntry.status`
    test, which round-trips the feedback entry JSON file on disk
    and asserts byte-equivalence.)
  - Memory curation implies guidance is truth. (Docs explicitly
    state curation is a suggestion; memory is not architecture
    truth.)
  - Users cannot tell which memories are repeatedly helpful or
    ignored. (Closed by the agent-contract integration test and
    by `rekon memory curation --json`'s items[] output.)
- **Regression test for the original problem**:
  `tests/contract/memory-usage-curation.test.mjs` (13 tests).
  Particularly load-bearing:
  - `curation does not mutate OperatorFeedbackEntry.status` —
    bytes-on-disk identity check after curation runs.
  - `memory select does not automatically record usage` — confirms
    selection ≠ usage.
  - `MemoryCurationReport freshness goes stale after a newer
    MemoryUsageLedger` — proves the feedback loop is closed under
    `rekon artifacts freshness`.
  - `agent-contract publication mentions Memory Curation Status
    when a report exists` — proves the loop reaches the
    operator-facing publication.

## CODEBASE-INTEL ALIGNMENT

- **Classic capability or failure mode being addressed**: operator
  feedback and memory curation / promotion / usage tracking.
- **Relevant classic files/systems**: `lib/operator-feedback.ts`,
  `lib/memory/**`, `commands/memory/**`, `schemas/*memory*`,
  `services/ContextHandler.ts`, `lib/context/resolver.ts`. See
  `docs/strategy/classic-guarantees-audit.md`,
  `docs/strategy/classic-wins.md`,
  `docs/strategy/classic-alignment-map.md`.
- **What Rekon keeps**: memory quality must be managed; scoped
  recall is not enough without usage feedback; curation decisions
  should be explicit; harmful / stale / ignored guidance should be
  reviewable; memory must not mutate canonical artifacts; usage
  evidence must be artifact-backed.
- **What Rekon simplifies**: no automatic promotion; no automatic
  deprecation; no LLM summarization; no supersession-graph
  mutation; no global memory backend; no analytics dashboard.
- **What Rekon does not port yet**: full promotion engine;
  automatic curation; long-horizon memory decay policies;
  usage-effectiveness analytics at scale; supersession chains that
  rewrite active memory; automatic extraction from chats /
  meetings.
- **How this advances migration**: closes the next slice of the
  operator-feedback guarantee after v1 ranking. Prepares future
  promotion / supersession work without making any automatic
  changes today. Subsystem 10 in
  `docs/strategy/classic-subsystem-purpose-map.md` now reads "P1
  preserved (v1 ranking + v1 usage/curation)". The next slice
  remains the optional automatic promotion / supersession engine,
  which is deferred until operator demand is real.

## MEMORY USAGE MODEL

`MemoryUsageEvent`:

```ts
{
  id: string;
  memoryEntryId: string;
  memorySelectionId?: string;
  outcome: "helpful" | "ignored" | "harmful" | "stale" | "unclear";
  note: string;
  usedAt: string;
  usedBy?: string;
  context?: {
    path?: string;
    goal?: string;
    resolverId?: string;
    publicationId?: string;
    workOrderId?: string;
  };
  evidence?: ArtifactRef[];
}
```

`MemoryUsageLedger.events` is append-only: each `rekon memory
usage record` call writes a fresh `MemoryUsageLedger` artifact
that includes every prior event plus the new one. History is
preserved across writes. The freshness loop relies on this
identity (a newer ledger artifact id invalidates older curation
reports via the `memory.usage.changed` rule).

Validation:
- `id`, `memoryEntryId`, `usedAt`, `outcome` are required.
- `outcome` must be one of the five enum values.
- `note` is required when `outcome` is `harmful` / `stale` /
  `ignored`. Helpful and unclear may have empty notes.

## CURATION REPORT MODEL

`MemoryCurationItem`:

```ts
{
  memoryEntryId: string;
  instruction: string;
  recommendation: "keep" | "reinforce" | "review" | "deprecate"
    | "supersede-candidate";
  helpfulCount: number;
  ignoredCount: number;
  harmfulCount: number;
  staleCount: number;
  unclearCount: number;
  score: number;
  reasons: string[];
}
```

Recommendation rules (first match wins, deterministic):

1. `harmfulCount >= 2` → **deprecate**
2. `harmfulCount >= 1` → **review**
3. `staleCount >= 2` → **supersede-candidate**
4. `helpfulCount >= 2` → **reinforce**
5. `helpfulCount >= 1 && ignoredCount == 0` → **keep**
6. `ignoredCount >= 2 && helpfulCount == 0` → **review**
7. otherwise → **review**

`score` is `helpfulCount - 0.25 * ignoredCount - 1 * harmfulCount
- 0.5 * staleCount - 0.1 * unclearCount`, rounded to three decimal
places. It is used only for stable sort ordering within the
report.

`MemoryCurationReport.summary` reports `totalMemories`,
`totalUsageEvents`, and per-recommendation counts.

## CLI COMMANDS ADDED

```sh
rekon memory usage record <memory-entry-id> \
  --outcome helpful|ignored|harmful|stale|unclear \
  [--note <note>] [--selection <selection-id>] \
  [--path <path>] [--goal <goal>] [--used-by <name>] \
  [--root <path>] [--json]

rekon memory usage list [--root <path>] [--json]

rekon memory curation [--root <path>] [--json]
```

All three exit non-zero on validation failure (missing
positional, missing `--outcome`, missing required `--note`, etc.)
with a human-readable stderr message.

## TESTS / VERIFICATION

- `npm run typecheck` ✓
- `npm run build` ✓
- `git diff --check` ✓
- `npm run test` — 346 passed, 1 skipped (optional dogfood), 0
  failed (includes the 13 new memory-usage-curation contract
  tests).
- `node scripts/audit-license.mjs` ✓
- `node scripts/audit-package-exports.mjs` ✓
- `node scripts/publish-dry-run.mjs` ✓
- `node scripts/install-smoke.mjs` ✓
- `node scripts/install-tarball-smoke.mjs` ✓
- Prescribed CLI smoke against `examples/simple-js-ts`:
  - `rekon refresh` → status `passed`
  - `rekon memory add` → wrote `OperatorFeedbackEntry`
    (`feedback-<timestamp>`)
  - `rekon memory select` → selected 1 ranked entry
  - `rekon memory usage record <id> --outcome helpful --note "…"`
    → wrote `MemoryUsageLedger` with 1 event
  - `rekon memory usage list` → 1 event
  - `rekon memory curation` → summary
    `{ totalMemories: 1, totalUsageEvents: 1, keep: 1, … }`,
    item recommendation `keep`
  - `rekon artifacts validate` → `valid: true`
  - `rekon artifacts freshness` → 17 artifacts indexed (now
    including `MemoryUsageLedger` and `MemoryCurationReport`)
- Existing tests left in place; the 10
  memory-ranking-curation.test.mjs tests and the 16
  agent-operating-contract-publisher.test.mjs tests all still
  pass.

## INTENTIONALLY UNTOUCHED

- `OperatorFeedbackEntry`, `MemorySelection`, `MemoryEvent` shapes
  unchanged.
- Existing learner modes (`add`, `select`) and existing CLI memory
  commands (`add`, `list`, `select`) unchanged.
- Resolver behavior unchanged; memory still does not mutate
  `ownerSystems`, `risk`, `findings`, `status`, or
  `nextRequiredResolver`.
- Agent-contract publication structure unchanged outside the new
  `### Memory Curation Status` sub-section inside Memory Guidance.
- No new actuator, no source-write surface.
- No watcher. Usage events are recorded explicitly.
- No LLM. All scoring and recommendation rules are deterministic.
- No version bump, no npm publish.

## RISKS / FOLLOW-UP

- **Risk**: operators record usage events but no one ever runs
  `rekon memory curation`, so harmful guidance keeps resurfacing
  through ranking. Mitigation: the agent-contract publication
  surfaces a "Memory Curation Status" line so reviewers see the
  counts every time the contract is read. A future batch could
  add curation as an automatic step in `rekon refresh`; deferred
  until operator demand is real.
- **Risk**: an operator inflates `helpful` recordings to "rescue"
  a memory the system would otherwise flag. Mitigation: every
  event carries a required `note` for harmful / stale / ignored
  outcomes (the load-bearing review signal), and the ledger is
  append-only so the audit trail is intact. Recordings are
  attributed via `usedBy` and `context.resolverId` /
  `publicationId` / `workOrderId`. Gaming would be visible in the
  ledger event list.
- **Risk**: curation recommendations look authoritative and an
  operator (or agent) auto-deprecates a memory just because the
  report said `deprecate`. Mitigation: every doc, the CLI output
  shape, and the agent-contract status line frame curation as
  **recommendations**, not mutations. The
  `curation does not mutate OperatorFeedbackEntry.status` test
  pins the invariant.
- **Risk**: ledger size grows unbounded over time. Mitigation:
  not addressed in this batch. Each new ledger artifact replaces
  the latest by id; old ledger artifacts remain in
  `.rekon/artifacts/actions/`. Future work could add a "compact"
  command; deferred.
- **Follow-up**: extend `rekon memory curation` with an `--apply`
  option that requires explicit operator confirmation per item to
  flip `OperatorFeedbackEntry.status` (deferred — not in this
  batch, and explicitly out of scope per the work order's
  non-goals).
- **Follow-up**: optionally extend `rekon memory select` to bias
  rankings by historical helpfulness, as a future ranking-v2 batch.
  Deferred — this batch did **not** change ranking behavior.

## NEXT STEP

Per the user's working agreement, push `main` directly after
checks pass. Commit on the worktree's detached HEAD, fast-forward
local `main` from the primary worktree, push `origin/main`.

Per the user's queued sequence, the next batch is either
**Agent Contract v2 memory curation integration** (already included
in this batch as the minimal "Memory Curation Status" line — the
work order asked to defer if integration coupling was too high,
which it was not) **or** **issue adjudication / dedupe v1**. The
Classic Guarantees Audit identifies issue adjudication as the next
big gap after refresh / memory, so that is the recommended next
work order.
