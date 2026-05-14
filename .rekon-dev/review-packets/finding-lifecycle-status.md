CHANGES MADE
- Extended `@rekon/kernel-findings` with the finding lifecycle types and helpers:
  - Types: `FindingStatusDecision`, `FindingStatusDecisionStatus`, `FindingStatusDecisionReason`, `FindingStatusLedger`, `EffectiveFinding`, `EffectiveFindingLifecycle`, `FindingLifecycleReport`, `FindingLifecycleInput`.
  - Helpers: `createFindingStatusLedger`, `validateFindingStatusLedger`, `assertFindingStatusLedger`, `findingStatusLedgerSchema`, `createFindingLifecycleReport`, `validateFindingLifecycleReport`, `assertFindingLifecycleReport`, `findingLifecycleReportSchema`, `applyFindingStatusDecisions`, `deriveFindingLifecycle`, `findLatestDecisionForFinding`.
  - Existing `Finding`, `FindingReport`, and related shapes are unchanged.
- Added `buildFindingLifecycleReport(store, options?)` to `@rekon/runtime`. Reads every indexed `FindingReport` (latest = active, earlier = previous), the latest `FindingStatusLedger`, and emits a `FindingLifecycleReport` projection with full `header.inputRefs`.
- Added `FindingStatusLedger` to the runtime's canonical-input set so the freshness validator does not raise `lineage.unknown` on operator-decision artifacts.
- Added four CLI commands under `rekon findings`:
  - `findings list [--status <status>]`
  - `findings lifecycle`
  - `findings status list`
  - `findings status set <finding-id> --status accepted|ignored|resolved --note <note> [--reason <reason>]`
- Updated `@rekon/capability-resolver`'s `resolve.issue` to read the latest `FindingStatusLedger` when matching, annotate the matched `IssueSummary` with `status`/`statusSource`/`statusNote`/`statusReason`, and emit a phase-appropriate warning when the match is `accepted`, `ignored`, or `resolved`.
- Added `tests/contract/finding-lifecycle.test.mjs` (13 tests).
- Documented the lifecycle model: new `docs/concepts/finding-lifecycle.md`, `docs/artifacts/finding-status-ledger.md`, `docs/artifacts/finding-lifecycle-report.md`. Updated `docs/artifacts/finding-report.md`, `docs/artifacts/resolver-packet.md`, `docs/concepts/resolvers.md`, `docs/strategy/roadmap.md`, `docs/strategy/classic-behavior-roadmap.md`, `docs/strategy/classic-alignment-map.md`, and the root `README.md`.
- Updated `CHANGELOG.md`.

PUBLIC API CHANGES
- New exports listed above from `@rekon/kernel-findings`, `@rekon/runtime`, and `@rekon/capability-resolver`. All additive.
- New CLI commands: `rekon findings list`, `rekon findings lifecycle`, `rekon findings status list`, `rekon findings status set`.
- Runtime canonical-input set now includes `FindingStatusLedger` for `validateArtifactFreshness`. Existing behavior unchanged for other artifact types.
- No artifact header shape changes. No SDK changes. No new capability roles. `Finding.status` enum and `FindingReport` shape are unchanged.

CODEBASE-INTEL ALIGNMENT
- Classic capability: issue lifecycle preservation, false-positive notes, and status across runs from `services/IssueDetectionService.ts`, `services/issues/**`, `domain/issues/mergeIssues.ts`, and `packages/product-codebase-intel/src/replatform/replatform-delta.ts`. Classic context surfaces (`lib/issue-context.ts`, `lib/issue-context/**`) also rely on persistent finding status.
- What Rekon keeps: findings as governance artifacts not lint noise, status survives across runs, accepted/ignored/resolved is explicit, ignored requires explanation, issue resolver exposes lifecycle context, status decisions carry provenance and input refs.
- What Rekon simplifies: explicit operator/system decision ledger + a derived lifecycle projection. No full classic multi-phase orchestration, no false-positive classifier, no health score, no remediation plan generation, no LLM issue review, no coherency delta yet.
- What Rekon does not port yet: full multi-phase IssueDetectionService pipeline, issue dedupe and semantic merge sophistication, false-positive filtering pipeline, coherency delta, health projection, remediation plan, watch alerts, assistant-doc projection from delta.
- Phase advanced: Phase B "issue lifecycle and status" ✅ initial slice shipped. Coherency delta still ahead.

FINDING LIFECYCLE MODEL
- Three artifact types make the model:
  - `FindingReport` — raw evaluator output (unchanged).
  - `FindingStatusLedger` — append-style operator/system decisions: `accepted`, `ignored`, `resolved`. Each carries `id`, `findingId`, `status`, `note`, optional `reason`, `updatedAt`, optional `updatedBy`, `source` (`operator` or `system`), optional `appliesTo`, optional `evidence`.
  - `FindingLifecycleReport` — derived projection. Latest report's findings are annotated `new`/`existing`/`accepted`/`ignored`/`resolved`. Previously-seen findings absent from the latest report become `resolved` (derived). Ledger decisions override derived status.
- Statuses:
  - `new` — first time seen.
  - `existing` — present in a previous report.
  - `accepted` — operator decision (requires note in normal use).
  - `ignored` — operator decision (requires non-empty note, enforced at kernel level).
  - `resolved` — derived when absent from latest report, or explicit operator decision (requires note in CLI).
- Status sources: `report`, `ledger`, `derived`. `statusSource: "ledger"` means the ledger overrode the derived status.
- Lifecycle includes `firstSeenReportId`, `lastSeenReportId`, `presentInLatestReport` per finding.
- Matching uses `finding.id` for the alpha; fuzzy/semantic matching is deferred.

CLI COMMANDS ADDED
- `rekon findings list [--status <status>]` — reads latest report + ledger, applies derivation, prints effective findings.
- `rekon findings lifecycle` — writes a `FindingLifecycleReport` artifact and returns its ref + summary.
- `rekon findings status list` — prints decisions in the latest ledger.
- `rekon findings status set <finding-id> --status <status> --note <note> [--reason <reason>]` — appends/replaces a decision for the given finding id and writes a new `FindingStatusLedger`. Validates that the finding id positional arg is the *fourth* positional (`findings`, `status`, `set`, `<id>`). Rejects `--status ignored` and `--status resolved` without `--note`.

RESOLVE.ISSUE STATUS CONTEXT
- When a `FindingStatusLedger` is indexed, `resolve.issue` looks up the latest decision for the matched finding and annotates `IssuePacket.issue` with:
  - `status` (the decision's status)
  - `statusSource: "ledger"`
  - `statusNote` (from the decision)
  - `statusReason` (from the decision)
- The resolver adds phase-specific warnings to the packet:
  - `ignored` → "Matched finding is ignored; verify before acting."
  - `accepted` → "Matched finding is accepted risk/debt; verify policy before changing."
  - `resolved` → "Matched finding is marked resolved; confirm whether action is still needed."
- The resolver does **not** silently treat ignored/accepted findings as no-ops. It surfaces the decision and recommends the next resolver based on ownership exactly as before.
- A new resolution-trace entry (`step: "issue.lookup"`, `sourceType: "Fallback"`) records that the ledger was used.

TESTS / VERIFICATION
- `npm run typecheck`: passed.
- `npm run test`: 158 passed, 2 skipped (optional dogfood + the external-TODO test which self-skips when its package is not installed). 13 new tests in `tests/contract/finding-lifecycle.test.mjs`:
  - kernel-level: ledger rejects ignored without note, lifecycle marks first-seen as new, repeated as existing, accepted from ledger overrides derived, absent prior is resolved, validator catches wrong artifactType.
  - CLI: lifecycle writes artifact, list reports effective status, status set writes ledger and reflects in list, status set rejects ignored without note.
  - Resolver: `resolve.issue` includes accepted status + warning, `resolve.issue` warns on ignored match.
  - Freshness: artifacts freshness handles `FindingStatusLedger` and `FindingLifecycleReport` and the validate command stays clean.
- `npm run build`: passed.
- `git diff --check`: clean.
- `node scripts/audit-package-exports.mjs`: passed.
- `node scripts/publish-dry-run.mjs`: passed (19 packages, 6 files each, no `.tsbuildinfo`, no forbidden tokens).
- `node scripts/audit-license.mjs`: passed.
- `node scripts/install-smoke.mjs`: passed.
- `node scripts/install-tarball-smoke.mjs`: passed.
- CLI smoke against `examples/simple-js-ts` including `findings list`, `findings lifecycle`, `resolve issue`, `artifacts validate`, and `artifacts freshness`: all exited 0. `artifacts validate` returned `{ valid: true, issues: [] }`. Aggregate `artifacts freshness` returned `fresh`. The example produces zero findings under built-in policy, so the lifecycle summary is empty but the artifact and the workflow are exercised end-to-end.
- Manual smoke against the import-boundary rule pack fixture (`/tmp/rekon-findings-test`) confirmed: `findings list` shows 3 active findings; `findings status set <id> --status ignored --reason false-positive --note "Test false positive"` writes a `FindingStatusLedger`; `findings list` after the decision reports the targeted finding with `effectiveStatus: "ignored"`, `statusSource: "ledger"`, `statusReason: "false-positive"`, and active count drops by one.

INTENTIONALLY UNTOUCHED
- No artifact header shape changes.
- No SDK changes.
- No new capability roles.
- No coherency delta, health projection, or remediation plan artifacts.
- No issue dedupe or semantic merge.
- No LLM issue review.
- No false-positive classifier.
- No source-writing reconciliation.
- No watcher / daemon / file-system monitoring.
- No version bump.
- No npm publish.
- No `codebase-intel-classic` imports.
- `resolveOwnership`, `preflightResolver`, `routeResolver`, and `seamResolver` are unchanged.
- `Finding` and `FindingReport` shapes are unchanged; lifecycle data lives in separate artifacts.

RISKS / FOLLOW-UP
- Status matching is by `finding.id` only. If a rule pack emits unstable ids across runs, existing decisions will not follow. Future work should add an alias/migration mechanism. Documented as a deliberate alpha simplification.
- The ledger is append-style at the artifact level: each `status set` writes a *new* `FindingStatusLedger` artifact. Earlier ledgers are retained in the store; only the latest is consulted by lifecycle + resolver. Operators who want to see decision history beyond the latest run can read the older artifacts via `rekon artifacts show`.
- `resolve.issue` reads the latest ledger from the artifact list. If the snapshot is older than the ledger, ledger annotation still wins — that's intentional, because status decisions are operator inputs, not snapshot-derived state.
- The CLI's `findings status set` positional shape (`findings status set <id>`) reads `<id>` from `parsed.positionals[3]`. A previously-introduced bug had it at `[2]` and was caught during smoke testing; the fix is locked in. Reviewers may want to revisit the CLI's positional parser surface in a future cleanup batch.
- The lifecycle helper currently treats *every* prior FindingReport as a single timeline. A future batch could limit consideration to a configurable window or only the most recent N reports for performance. Not a concern at alpha volume.

NEXT STEP
- Per the work order: coherency delta lite. Derive a `CoherencyDelta` artifact from the new `FindingLifecycleReport`, summarize high/medium/low active findings, top affected systems/paths, and a basic remediation queue. Maps directly to classic `replatform-delta.ts`. The lifecycle infrastructure shipped here is the right foundation.
- Operator npm publish is still pending and unchanged by this batch.
