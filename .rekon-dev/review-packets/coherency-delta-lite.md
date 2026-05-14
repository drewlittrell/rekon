CHANGES MADE
- Added `CoherencyDelta` artifact types and helpers to `@rekon/kernel-findings`:
  - Types: `CoherencyDeltaSeverity`, `CoherencyDeltaItemStatus`, `CoherencyDeltaItem`, `CoherencyRemediationPriority`, `CoherencyRemediationStep`, `CoherencyDeltaSummary`, `CoherencyDeltaInput`, `CoherencyDelta`.
  - Helpers: `createCoherencyDelta`, `validateCoherencyDelta`, `assertCoherencyDelta`, `coherencyDeltaSchema`, `severityToPriority`.
  - Existing `Finding`, `FindingReport`, `FindingStatusLedger`, and `FindingLifecycleReport` shapes are unchanged.
- Added `buildCoherencyDelta(store, options?)` to `@rekon/runtime`. Reads the latest `FindingLifecycleReport` (or builds one in place via the existing `buildFindingLifecycleReport`), the latest `OwnershipMap` and `ObservedRepo`, assigns systems per finding by longest-prefix match (`OwnershipMap` → `ObservedRepo` → `"unknown"` fallback), and emits a `CoherencyDelta` with full `header.inputRefs`.
- Added `FindingStatusLedger`, `FindingLifecycleReport`, and `CoherencyDelta` to the runtime artifact category map under `findings`. Earlier CLI calls already wrote ledger/lifecycle under `findings` via the `category` option; the map entries are belt-and-suspenders for direct `store.write` calls.
- Added CLI command `rekon coherency delta [--root <path>] [--json]` which writes a `CoherencyDelta` artifact and prints `{ artifact, summary, remediationQueue }`.
- Added `@rekon/kernel-repo-model` as a `@rekon/runtime` dependency (used for `ObservedRepo` / `OwnershipMap` type imports inside `buildCoherencyDelta`).
- Added `tests/contract/coherency-delta.test.mjs` (10 tests).
- Documented the new artifact + concept: `docs/artifacts/coherency-delta.md`, `docs/concepts/coherency-delta.md`. Updated `docs/artifacts/finding-lifecycle-report.md`, `docs/concepts/finding-lifecycle.md`, `docs/strategy/classic-behavior-roadmap.md`, `docs/strategy/classic-alignment-map.md`, `docs/strategy/roadmap.md`, the root `README.md`, and `CHANGELOG.md`.

PUBLIC API CHANGES
- New exports from `@rekon/kernel-findings`: `CoherencyDelta`, related types, `createCoherencyDelta`, `validateCoherencyDelta`, `assertCoherencyDelta`, `coherencyDeltaSchema`, `severityToPriority`. Additive.
- New exports from `@rekon/runtime`: `BuildCoherencyDeltaOptions`, `buildCoherencyDelta`. Additive.
- New runtime dep: `@rekon/kernel-repo-model` (used internally; not re-exported).
- New CLI command: `rekon coherency delta`.
- New artifact type: `CoherencyDelta` stored under `.rekon/artifacts/findings/`.
- No artifact header shape changes. No SDK changes. No new capability roles. `resolve.issue` was not modified in this batch — the optional resolver-side `coherency` annotation is deferred (see RISKS / FOLLOW-UP).

CODEBASE-INTEL ALIGNMENT
- Classic capability: coherency delta + remediation roll-up from `packages/product-codebase-intel/src/replatform/replatform-delta.ts`, `packages/product-codebase-intel/src/replatform/replatform-delta-projections.ts`, `services/IssueDetectionService.ts`, `services/issues/**`, `domain/issues/mergeIssues.ts`, `packages/product-codebase-intel/src/reconcile/PlanHandler.ts`, `packages/product-codebase-intel/src/reconcile/PlanExecutorService.ts`.
- What Rekon keeps: findings roll up into a higher-level coherency artifact; severity and category summaries; affected systems/paths; explicit ordered remediation; accepted/ignored findings excluded from active drift; resolved findings visible but not active; the delta is positioned to feed future publishers, work orders, and reconciliation.
- What Rekon simplifies: lite projection only — no weighted health score, no trend calculation, no assistant-doc projection, no watch alerts, no remediation auto-apply, no previous-delta comparison, no full issue-status merge pipeline.
- What Rekon does not port yet: full `replatform-delta` projection set, health grade/weighted penalty, trend from previous delta, watch alert generation, assistant-doc focus projection, remediation plan expansion beyond a simple queue, reconciliation plan generation from delta.
- Phase advanced: B — "coherency delta lite" ✅ initial slice shipped. Health, trend, assistant docs, and reconciliation plan generation remain Phase C.

COHERENCY DELTA MODEL
- A `CoherencyDelta` carries `header`, `summary`, `items`, and `remediationQueue`.
- `items` include both active findings (from `FindingLifecycleReport.findings`) and inactive ones (from `FindingLifecycleReport.resolvedFindings`). Each item is normalized:
  - `id: "coherency:<findingId>"`.
  - `severity` coerced into the kernel's `CoherencyDeltaSeverity` (`critical` / `high` / `medium` / `low`) — unknown severities default to `medium`.
  - `status` mirrors the lifecycle status (`new`, `existing`, `accepted`, `ignored`, `resolved`).
  - `active === true` only when status is `new` or `existing`.
  - `systems` are assigned via the helper-provided `systemsForFinding`. If no system resolves, the item carries `["unknown"]` so summaries always count it.
  - `files` and `subjects` from the finding are preserved (sorted, deduped).
- `summary` totals `total`, `active`, `resolved`, `accepted`, `ignored`, plus `bySeverity`, `byType`, `bySystem`, and `topPaths` (top 10 by occurrence count).
- `remediationQueue` includes only `active` items, each mapped to a remediation step with `id`, `priority` (`p0` for `critical`/`high`, `p1` for `medium`, `p2` for `low`), `findingId`, `title`, `action` (uses `finding.suggestedAction` if present, otherwise a default phrase), `files`, `systems`, and `severity`.
- Items are sorted: active first → severity rank → status rank → `findingId`. Remediation queue is sorted by priority then `findingId`.

CLI COMMANDS ADDED
- `rekon coherency delta [--root <path>] [--json]` — writes a `CoherencyDelta` artifact through the runtime store under the `findings` category and prints the artifact ref, summary, and remediation queue. Default JSON output.

REMEDIATION QUEUE
- Only includes active findings (status `new` or `existing`).
- Priority mapping:
  - `critical` / `high` → `p0`
  - `medium` → `p1`
  - `low` → `p2`
- Each step carries a `findingId` so future actuators can correlate back to the source finding.
- The queue does not run anything. Actuator integration is intentionally deferred; this batch ships a typed queue artifact only.

TESTS / VERIFICATION
- `npm run typecheck`: passed.
- `npm run test`: 168 passed, 2 skipped (optional dogfood + the external-TODO test which self-skips when its package is not installed). 10 new tests in `tests/contract/coherency-delta.test.mjs`:
  - Kernel: summary by severity/type/system; accepted/ignored exclusion from active; resolved findings included but not active; remediation queue priority mapping + ordering; `severityToPriority` per-severity; `OwnershipMap`-based system assignment via `systemsForFinding`; `"unknown"` fallback when no owner resolves.
  - CLI/runtime: `rekon coherency delta` writes a `CoherencyDelta` artifact; freshness marks older deltas `stale` after a newer `FindingLifecycleReport`; `artifacts validate` stays clean with `CoherencyDelta` indexed.
- `npm run build`: passed.
- `git diff --check`: clean.
- `node scripts/audit-package-exports.mjs`: passed.
- `node scripts/publish-dry-run.mjs`: passed (19 packages, 6 entries each, no `.tsbuildinfo`, no forbidden tokens).
- `node scripts/audit-license.mjs`: passed.
- `node scripts/install-smoke.mjs`: passed.
- `node scripts/install-tarball-smoke.mjs`: passed.
- CLI smoke against `examples/simple-js-ts` including `findings lifecycle`, `coherency delta`, and `artifacts validate`: clean. The example produces no findings under built-in policy, so the delta is empty but the artifact and the workflow are exercised end-to-end.
- Manual smoke against the import-boundary rule pack fixture confirmed: 3 active findings, severities `high: 1` and `medium: 2`, system assignment `src: 3`, top path `src/feature/handler.ts: 3`, and a remediation queue with the high-severity finding at `p0` and the two medium-severity findings at `p1`.

INTENTIONALLY UNTOUCHED
- No artifact header shape changes.
- No SDK changes.
- No new capability roles.
- No source-writing reconciliation; remediation queue is just a typed list.
- No watcher / daemon / file-system monitoring.
- No LLM issue review or false-positive classifier.
- No health score / trend calculation / assistant-doc projection / watch alerts.
- No previous-delta comparison.
- No version bump.
- No npm publish.
- No `codebase-intel-classic` imports.
- `resolve.issue` is unchanged. The optional `coherency` annotation was reviewed and deliberately deferred (see follow-up below).
- `Finding`, `FindingReport`, `FindingStatusLedger`, `FindingLifecycleReport` shapes are unchanged. `applyFindingStatusDecisions` and `deriveFindingLifecycle` semantics are unchanged.

RISKS / FOLLOW-UP
- `resolve.issue` does not yet annotate matched issues with delta priority. Adding it would require either widening `IssueSummary` again or computing on the fly inside the resolver. The work-order called this out as optional; deferring keeps the resolver decoupled from the runtime helper and avoids tight coupling between the resolver capability and the latest `CoherencyDelta` artifact. A future batch can plumb `coherency.priority` through if a real consumer needs it.
- `buildCoherencyDelta` reads the **latest** `FindingLifecycleReport` by `writtenAt`. If multiple lifecycle reports are written within the same millisecond (rare on real systems but possible in tests), `localeCompare` on the `writtenAt` string falls back to the artifact ids; tests use synthetic `Date.now()` ids that already differ. Acceptable for alpha.
- The delta's `topPaths` cap is 10. There's no parameter to widen it yet; future callers that need a longer list can build their own projection from `items[].files`.
- System assignment uses `OwnershipMap` and `ObservedRepo` only. `GraphSlice`-aware ownership (the resolver already supports it for ownership graph slices) is intentionally deferred for this batch to keep dependencies minimal.
- The delta carries every finding's `description` and `suggestedAction`. For very large repos with thousands of findings, that's verbose. Trimming or capping is a possible Phase C follow-up but not needed at alpha volume.

NEXT STEP
- Per the work order: architecture summary publisher. A publisher capability that consumes `IntelligenceSnapshot`, `CoherencyDelta`, `OwnershipMap`, and `CapabilityMap` to produce a concise architecture/status `Publication`. Maps to classic `ArchitectureDocsHandler` and the coherency assistant-doc projections, but without copying classic generated architecture docs wholesale.
- Operator npm publish is still pending and unchanged by this batch.
