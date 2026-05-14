CHANGES MADE
- Added artifact freshness validation in `@rekon/runtime`:
  - `validateArtifactFreshness(store, options?)` — inspects every indexed artifact's `header.inputRefs`, compares to the latest indexed artifact of each input type, and reports per-artifact + aggregate status.
  - New runtime exports: `ArtifactFreshnessStatus`, `ArtifactFreshnessIssue`, `ArtifactFreshnessEntry`, `ArtifactFreshnessResult`, `ArtifactFreshnessOptions`.
  - Issue codes: `newer-input-exists` (warning → stale), `input.missing` (warning → partial), `lineage.unknown` (warning → unknown), `artifact.unreadable` (error → unknown).
  - Canonical input types (`EvidenceGraph`, `Rulebook`, `OperatorFeedbackEntry`) are exempt from the lineage.unknown warning since they are roots.
- Added `rekon artifacts freshness [--type <type>] [--id <id>] [--json]` CLI command. `rekon artifacts validate` remains integrity-only.
- Tightened `ensureSnapshotReady` and `ensurePreflight` in the CLI: they only run a new `runSnapshot()` if there is no existing snapshot or the latest known inputs (`EvidenceGraph`, `ObservedRepo`, `OwnershipMap`, `CapabilityMap`, `GraphSlice`, `FindingReport`, `MemorySelection`) are newer than the latest snapshot. Prior behavior unconditionally re-ran snapshot, which made the resolver packet and earlier artifacts legitimately stale after a clean golden flow.
- Documented the freshness model in `docs/concepts/freshness-and-invalidation.md` (statuses, integrity-vs-freshness, check rules, CLI surface, invalidation rule shape, snapshot-vs-validator distinction).
- Updated `docs/artifacts/artifact-header.md`, `docs/artifacts/intelligence-snapshot.md`, `docs/extensions/capability-manifest.md`, and `docs/strategy/capability-model.md` to reference the new surface and clarify that the alpha validator evaluates `invalidatedBy.inputs` indirectly through `header.inputRefs` while `paths`/`events` remain future intent.
- Added Freshness sections to both external capability READMEs (`examples/custom-capability/README.md`, `examples/import-boundary-rule-pack/README.md`).
- Marked the lineage-based portion of Phase B's freshness/invalidation item as shipped in `docs/strategy/classic-behavior-roadmap.md`. Path/event-driven invalidation remains future watcher work.
- Added `tests/contract/artifact-freshness.test.mjs` (6 tests).
- Updated `CHANGELOG.md`.

PUBLIC API CHANGES
- New runtime exports listed above (additive only).
- New CLI command: `rekon artifacts freshness`.
- No changes to artifact header shape, SDK types, kernel contracts, or any built-in capability behavior.
- CLI behavior change: `ensureSnapshotReady` / `ensurePreflight` no longer write a brand-new `IntelligenceSnapshot` on every invocation. This is observable: prior to this batch, a clean golden flow produced 14 indexed artifacts; it now produces 13 because one redundant snapshot is gone. The behavior is still semantically equivalent — the latest snapshot covers the same inputs — and the freshness model is now honest after the flow.

CODEBASE-INTEL ALIGNMENT
- Classic capability addressed: freshness and invalidation. Classic codebase-intel had `services/WatchHandler.ts`, `lib/context-freshness.ts`, `lib/watcher-lifecycle.ts`, and freshness-aware behavior across `ContextHandler`, `FullScanHandler`, and `IssueDetectionService`.
- Classic source areas sampled at time of writing: `services/WatchHandler.ts`, `services/WatchBatchRuntime.ts`, `lib/context-freshness.ts`, `lib/watcher-lifecycle.ts`, `services/ContextHandler.ts`, `services/IssueDetectionService.ts`, `packages/product-codebase-intel/src/replatform/replatform-delta.ts`.
- What Rekon keeps: freshness must be explicit; derived artifacts must know their inputs; publications can go stale; resolver output should expose when it used older data; capability invalidation must be declared, not guessed; integrity is distinct from freshness.
- What Rekon simplifies: no watcher, no daemon, no heartbeat, no auto-regeneration loop, no full-scan lifecycle, no process lock, no context server freshness cache. Lineage-driven freshness over the artifact index is all that ships.
- What Rekon does not port yet: full `WatchHandler` lifecycle, real-time context server, daemon process model, file-change event stream, generated-doc auto-regeneration, scan checkpoint freshness, issue status merge across runs.
- Phase advanced: Phase B "freshness/invalidation engine" — the lineage-based portion lands today; path/event-driven invalidation stays in Phase C.

FRESHNESS MODEL
- Statuses: `fresh` / `stale` / `partial` / `unknown`. Defined identically for single artifacts and aggregate results.
- Integrity is separate from freshness. `rekon artifacts validate` answers integrity; `rekon artifacts freshness` answers freshness. An artifact can be valid but stale.
- Check rules:
  1. Input ref existence — missing ref → `input.missing` → `partial`.
  2. Newer input by type — a referenced input has a newer indexed peer → `newer-input-exists` → `stale`.
  3. Unknown lineage — no `inputRefs` and not in the canonical-input set → `lineage.unknown` → `unknown`.
  4. Unreadable artifact — read/parse failure → `artifact.unreadable` → `unknown`.
- Aggregate precedence: unknown > partial > stale > fresh.
- File-system mtimes and source-file change events are not part of the alpha and remain explicitly deferred to the future watcher.

CLI COMMANDS ADDED
- `rekon artifacts freshness` (aggregate).
- `rekon artifacts freshness --type <type>` (type filter).
- `rekon artifacts freshness --type <type> --id <artifact-id>` (single artifact).
- All commands accept `--root` and `--json` (default `--json`-shaped output).
- Usage line added to `rekon --help`.

INVALIDATION SEMANTICS
- `CapabilityManifest.invalidatedBy` is unchanged (`{ id, description?, inputs?, paths?, events? }`).
- Today's freshness validator evaluates `inputs` indirectly: an artifact's `header.inputRefs` is the consumed lineage, and the validator checks whether newer artifacts of the same type exist in the index.
- `paths` and `events` are documented as public intent for the future watcher. Capability authors should declare conservative rules now; the watcher engine will evaluate them without requiring retroactive manifest edits.
- Built-in capabilities already declared `invalidatedBy` rules in earlier batches; no manifest edits were required by this batch. Authors of new community capabilities should follow the same pattern (see `docs/extensions/capability-manifest.md`).

TESTS / VERIFICATION
- `npm run typecheck`: passed.
- `npm run test`: 127 passed, 1 skipped (optional dogfood). 6 new tests in `tests/contract/artifact-freshness.test.mjs`:
  1. After the golden CLI flow the latest artifact of every major type is fresh.
  2. FindingReport becomes stale after a newer EvidenceGraph is observed.
  3. ResolverPacket becomes stale after newer OwnershipMap/FindingReport/snapshot inputs exist.
  4. Publication becomes stale after newer ResolverPacket or snapshot exists.
  5. Missing `inputRef` produces a `partial` freshness result with an `input.missing` issue.
  6. `rekon artifacts freshness` CLI returns the documented JSON shape.
- `npm run build`: passed.
- `git diff --check`: clean.
- `node scripts/audit-package-exports.mjs`: passed.
- `node scripts/publish-dry-run.mjs`: passed (19 packages, 6 entries each).
- `node scripts/audit-license.mjs`: passed.
- `node scripts/install-smoke.mjs`: passed.
- `node scripts/install-tarball-smoke.mjs`: passed (now reports 13 indexed artifacts after the smarter ensureSnapshotReady removed one redundant snapshot; previously 14).
- Standard CLI smoke against `examples/simple-js-ts` including `artifacts freshness`: all exited 0; aggregate freshness reported `fresh` and `artifacts validate` reported `{ valid: true, issues: [] }`. Example `.rekon/` cleaned afterward.

INTENTIONALLY UNTOUCHED
- No watcher, daemon, or file-system monitoring.
- No source-file mtime checks.
- No artifact header shape changes.
- No new capability roles.
- No SDK type changes.
- No source-writing reconciliation.
- No generic actuator or learner dispatch.
- No marketplace/discovery.
- No SaaS/dashboard.
- No version bump.
- No npm publish.
- No new built-in capability.
- No `codebase-intel-classic` imports.

RISKS / FOLLOW-UP
- The smarter `ensureSnapshotReady` is a small CLI behavior change. Downstream tooling that relied on every `publish agents` / `resolve preflight` writing a fresh snapshot artifact will now see fewer snapshots. Snapshot is still written when it is genuinely needed; the change only suppresses redundant writes when the latest snapshot already covers the latest inputs.
- `validateArtifactFreshness` is index-driven. It does not yet inspect source-file mtimes; a file that changes without a re-run of `rekon observe` will go undetected. That is the future watcher's job.
- The freshness validator treats every input type uniformly. If a future capability author wants type-specific tolerance (e.g., "MemorySelection becoming stale should be a warning, not stale"), we can extend the rules — currently every newer-input case becomes `stale`. Acceptable for alpha.
- Snapshot status (`IntelligenceSnapshot.status.freshness`) is unchanged. The per-snapshot status reflects what the runtime knew at write time; the new validator answers the same question across the whole index. Both surfaces coexist.

NEXT STEP
- Per the next-step note in the work order, move to route / seam / issue resolver expansion. Now well-grounded by freshness + trace + ownership precedence; builds on the resolver phases distillation from `lib/context/resolver.ts`.
- Operator npm publish is still pending and unchanged by this batch.
