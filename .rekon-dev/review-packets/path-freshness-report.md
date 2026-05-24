# Review Packet — PathFreshnessReport Artifact + Source-State Fingerprint Skeleton

**Slice:** `path-freshness-report`
**Sequence position:** First implementation slice of
the post-beta watcher / path-freshness track. Follows
the [Post-Beta Dogfood Evidence Triage
Decision](../../docs/strategy/post-beta-dogfood-evidence-triage.md)
(Option C) and lands the artifact reserved by the
[Watcher / Path Freshness Policy Decision](../../docs/strategy/watcher-path-freshness-policy-decision.md).
**Batch type:** Runtime + helpers + CLI + tests + docs.
**Strict no-go list:** no daemon, no background
refresh, no automatic `rekon refresh` invocation, no
source mutation, no new permission, no new role, no
`ArtifactHeader` change, no workflow YAML, no
`package.json` version bump, no `npm publish`, no
release tag, no GitHub Release, no GitHub API call, no
network I/O.

## CHANGES MADE

1. **New artifact type `PathFreshnessReport`** in
   `@rekon/capability-intent` (`packages/capability-intent/src/index.ts`).
   Plus `createPathFreshnessReport(...)` factory and
   `comparePathFreshness(current, baseline?)` pure
   comparator. Status enum, per-path enum, summary,
   recommendation shape — all defined and validated.
2. **Registered the type** in `@rekon/sdk`
   conformance (`packages/sdk/src/index.ts`) and the
   `@rekon/runtime` category map
   (`packages/runtime/src/index.ts`, category
   `"actions"`).
3. **New pure helper
   `buildSourceStateFingerprint(input)`** in
   `@rekon/kernel-repo-model`
   (`packages/kernel-repo-model/src/index.ts`).
   Sha256 content hashes, deterministic ordering,
   conservative default ignore set (`.git`, `.rekon`,
   `node_modules`, `dist`, `coverage`, `.next`,
   `.turbo`, `.cache`), bounded reads (32 MiB safety
   cap), `mtimeAdvisory` opt-in only.
4. **New CLI command** `rekon paths freshness [--path
   <path>] [--root <path>] [--json]` in
   `@rekon/cli`. Read-only with respect to source
   files; writes exactly one new
   `PathFreshnessReport` per invocation. Compares to
   the most recent prior `PathFreshnessReport`;
   narrows the baseline when `--path` narrows the
   tracking set.
5. **CLI deps updated**: `packages/cli/package.json`
   adds `@rekon/kernel-repo-model` dependency;
   `packages/cli/tsconfig.json` adds the project
   reference.
6. **15-case contract test**
   `tests/contract/path-freshness-report.test.mjs`
   covers fingerprint determinism, ignore-set
   correctness, content-change detection, first-run
   unknown / second-run fresh / changed / missing /
   new flows, `--path` narrowing, recommendation,
   artifact validation, `artifacts validate` clean,
   no-refresh, no source mutation, mtime advisory.
7. **9-assertion docs test**
   `tests/docs/path-freshness-report.test.mjs`.
8. **New docs**:
   `docs/artifacts/path-freshness-report.md` and
   `docs/concepts/path-freshness.md`.
9. **Updated supporting docs**:
   `docs/strategy/watcher-path-freshness-policy-decision.md`,
   `docs/strategy/post-beta-dogfood-evidence-triage.md`,
   `docs/strategy/roadmap.md`,
   `docs/strategy/classic-behavior-roadmap.md`,
   `docs/concepts/refresh.md`,
   `docs/concepts/freshness-and-invalidation.md`,
   `docs/concepts/agent-operating-contract.md`,
   `docs/artifacts/architecture-summary-publication.md`,
   `docs/artifacts/agent-contract-publication.md`,
   `README.md`, `CHANGELOG.md`.

## PUBLIC API CHANGES

Additive only:

- `@rekon/capability-intent` exports new types
  `PathFreshnessReport`, `PathFreshnessStatus`,
  `PathFreshnessPathStatus`, `PathFreshnessEntry`,
  `PathFreshnessSummary`,
  `PathFreshnessRecommendation`,
  `SourceStateFingerprint`,
  `SourcePathFingerprint`,
  `CreatePathFreshnessReportInput`, and new
  functions `createPathFreshnessReport`,
  `comparePathFreshness`.
- `@rekon/kernel-repo-model` exports new types
  `SourceStateFingerprintData`,
  `SourcePathFingerprintEntry`,
  `BuildSourceStateFingerprintInput`, new function
  `buildSourceStateFingerprint`, and the constant
  `DEFAULT_SOURCE_FINGERPRINT_IGNORE`.
- `@rekon/sdk` `BUILT_IN_ARTIFACT_TYPES` gains a
  `PathFreshnessReport` entry (`schemaVersion
  "0.1.0"`, `stability: "experimental"`).
- `@rekon/runtime` `ARTIFACT_CATEGORY_BY_TYPE`
  gains `PathFreshnessReport: "actions"`.
- `@rekon/cli` adds the `rekon paths freshness`
  command + usage entry.

No types removed, renamed, or narrowed. No
existing artifact shape modified.

## PURPOSE PRESERVATION CHECK

The original problem (per the work order):

> Rekon artifacts are generated from a repo state.
> After source files change, existing artifact lineage
> freshness may still look valid even though the
> working tree has drifted. Users and agents need a
> read-only way to see whether paths are stale
> relative to the source state Rekon observed.

Classic workflow guarantee preserved:

- codebase-intel-classic had watcher / context
  freshness behaviour. The **useful guarantee was
  not "always run a daemon"** but rather "do not let
  users or agents rely on stale codebase context
  unknowingly."

Rekon equivalent guarantee in this slice:

- Stale source context is **visible** —
  `PathFreshnessReport.status` and the
  recommendation field surface it.
- Refresh **remains explicit** — the CLI never
  runs `rekon refresh` on its own.
- Source-state freshness is computed
  **deterministically** — sha256 over hash + size
  + exists + path, sorted.
- `PathFreshnessReport` **records the
  comparison** as an artifact so audit
  reviewers see what changed and when.
- Agents can be told **not to rely on stale
  artifacts** by checking the latest
  `PathFreshnessReport.status`.
- **No hidden background writes.** The CLI is the
  only place a `PathFreshnessReport` is written;
  nothing else writes one as a side effect.

What would mean we failed (none of these happened):

- A daemon was introduced — **no daemon shipped**.
- Source files were mutated — **the helper +
  comparator + CLI are read-only with respect to
  source; tests 13 + 14 pin this**.
- `rekon refresh` ran automatically — **the CLI
  prints a recommendation; it never spawns the
  refresh command**.
- mtimes were treated as canonical evidence —
  **`includeMtimeAdvisory` is opt-in and the
  comparator never uses mtimes; test 15 pins
  this**.
- Path freshness was confused with artifact
  lineage freshness — **the artifact doc + concept
  doc + every comparator message keep the two
  surfaces explicitly distinct**.
- The report could not explain which paths changed
  — **`entries[]` carries one record per path with
  `status`, `currentHash`, `baselineHash`, and a
  human `message`**.

## CODEBASE-INTEL ALIGNMENT

Classic capability or failure mode addressed:

- Watcher / context freshness after file changes.

Relevant classic systems (per work order):

- `services/WatchHandler.ts`, `services/ContextHandler.ts`,
  `lib/context-freshness.ts`.

What Rekon **keeps**:

- Stale context must be visible.
- Refresh remains explicit.
- Path-level source drift matters.
- No hidden artifact mutation.
- Agents should recommend refresh after edits.

What Rekon **simplifies** in this slice:

- No daemon.
- No live fs watcher.
- Read-only fingerprint + report first.
- Publication surfacing deferred to a follow-up
  slice.

## ARTIFACT MODEL

See `docs/artifacts/path-freshness-report.md` for
the full shape. Key invariants:

- Hashes only — **never raw file contents**.
- `ArtifactHeader` **unchanged**.
- New artifact lives in category `"actions"`
  alongside `VerificationRun` /
  `VerificationResult` / `VerificationPlan`.
- `inputRefs` contains the prior baseline's
  `ArtifactRef` when one was found; the empty
  array on first run.
- `summary` adds to a single total: `total ===
  fresh + changed + missing + new + unknown`.
- `status === "stale"` iff at least one entry is
  `changed`, `missing`, or `new`. Otherwise
  `fresh` (with a comparable baseline) or
  `unknown` (no baseline yet).

## SOURCE-STATE FINGERPRINT

`buildSourceStateFingerprint(input)` is the only
helper that touches the filesystem in this slice.
Behaviour pinned by tests + the artifact doc:

- Deterministic across runs (tests #1, #3).
- Default ignore set excludes `.git`,
  `node_modules`, `.rekon`, `dist`, `coverage`,
  `.next`, `.turbo`, `.cache` (test #2; constant
  exported as `DEFAULT_SOURCE_FINGERPRINT_IGNORE`).
- Sha256 over file content; bounded by a 32 MiB
  safety cap so a runaway file records
  `exists + size` only.
- Reads only inside `repoRoot`. Never opens a
  socket. Never writes to source.

## CLI SURFACE

`rekon paths freshness [--path <path>] [--root
<path>] [--json]`. Behaviour pinned by tests
#4–#10 + #12–#15:

- First run on a repo records
  `status: "unknown"` with
  `recommendation.refreshRecommended: false` and
  a "No baseline" message.
- Subsequent run with no changes records
  `status: "fresh"`.
- Changed file → `status: "stale"` with the
  per-path entry marked `"changed"`.
- Deleted file → `status: "stale"` with the entry
  marked `"missing"`.
- New file (default walk) → `status: "stale"`
  with the entry marked `"new"`.
- `--path` narrows tracking; baseline comparison
  is narrowed to the same path set to avoid
  surfacing "missing" for unrelated paths in a
  broader prior baseline.
- Stale status → `recommendation.commands`
  includes `"rekon refresh"` and the message
  names the command.
- `artifacts validate` remains clean after
  multiple runs.
- The command **never spawns `rekon refresh`**;
  test #13 pins that no
  `EvidenceGraph` / `IntelligenceSnapshot` /
  `ObservedRepo` / `Publication` / `FindingReport`
  artifacts are added by `paths freshness`.
- Source tree is byte-identical before vs after
  invocation (test #14).
- mtimes alone do not flip status (test #15 ages
  a file forward without changing content; the
  next run still reports `fresh`).

## TESTS / VERIFICATION

- New: `tests/contract/path-freshness-report.test.mjs`
  — 15 tests, all passing.
- New: `tests/docs/path-freshness-report.test.mjs`
  — 9 tests, all passing.
- All 9 mandatory verification commands clean
  (typecheck, test, build, git diff --check,
  audit-package-exports, audit-license,
  publish-dry-run, install-smoke,
  install-tarball-smoke).
- CLI smoke matrix (per work order) clean on an
  `examples/simple-js-ts` mktemp copy.

## INTENTIONALLY UNTOUCHED

- No `ArtifactHeader` change.
- No existing artifact shape change.
- No existing CLI command change.
- No watcher / daemon / fs-event surface.
- No source-write surface.
- No publication / publisher behaviour change.
- No GitHub Check / PR-comment behaviour change.
- No validator profile change. No workflow
  template change. No active workflow YAML.
- No version bump. No npm publish. No release
  tag. No GitHub Release.
- No `package.json` / `package-lock.json`
  mutation (CLI dep addition is the only
  package.json edit, and the lockfile is not
  rewritten in this batch).
- No mutation of any operator repo (the contract
  tests all run against `mktemp -d` copies of
  `examples/simple-js-ts`).

## RISKS / FOLLOW-UP

- **Publication surfacing pending.** The
  architecture summary, agent contract, and proof
  report do not yet render the latest
  `PathFreshnessReport`. That is the next slice
  ("path freshness publication surfacing") per
  the work-order's "Next Step" guidance.
- **Default walk cost on very large
  monorepos.** The first cohort run on
  `structured-evals` and `figma-ds` should be
  measured. If the default walk is too slow for
  large monorepos, follow-up work can:
  (a) accept `--path` from a `git diff
  --name-only` invocation,
  (b) recognise repo-local ignore files
  (`.gitignore`, `.rekonignore`).
  Neither is in scope for this slice.
- **`--path` glob support.** Today `--path` is
  literal paths only. A future slice can add glob
  expansion if a real-world cohort surfaces the
  need.
- **mtimeAdvisory.** Capturing mtimes is opt-in
  and unused by the comparator. If a future slice
  surfaces mtime as a useful debugging hint we may
  expose a `--include-mtime` flag.

## NEXT STEP

Per the work order: **Path freshness publication
surfacing.** Surface the latest
`PathFreshnessReport` in the architecture summary,
the agent contract, and (if appropriate) the proof
report + GitHub review dry-run payloads. Still no
daemon. Still no background refresh. Still no
source writes.
