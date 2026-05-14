CHANGES MADE
- Rewrote `@rekon/capability-memory` to ship a deterministic, reason-attached memory ranker. The learner still exposes `mode: "add"` and `mode: "select"`, but selection now combines scope match (path / system / capability / tags), verification status, reliability, priority, freshness, and specificity into a clamped 0..1 score with explicit `reasons`. Deprecated, superseded, and disputed entries are rejected outright; entries whose non-empty scope does not match the query are rejected with `scope-mismatch`. Ties break by specificity desc, then `updatedAt` desc, then artifact id asc.
- Extended the package-local `OperatorFeedbackEntry` shape additively. New optional fields: `scope.systems`, `scope.capabilities`, `scope.layers`, `scope.tags`, `rationale`, `evidence`, `verification` (with `status`, `verifiedAt`, `verificationResultRef`), `reliability`, `priority`, `createdAt`, `updatedAt`, `source`, `status`. The legacy `instruction`, `scope.paths`, `scope.goal`, and `confidence` fields are unchanged; pre-v1 entries continue to rank correctly via fallbacks (default reliability 0.5, default priority `normal`, default status `active`).
- Extended the package-local `MemorySelection` shape additively. New fields: `query: { path, paths, goal, system, capability, tags }`; `selected: MemorySelectionItem[]` with per-item `id` / `score` / `reasons` / `match: { paths, systems, capabilities, tags }` / `priority` / `verification` alongside the legacy `instruction` / `scope` / `confidence` / `reason`; `rejected: Array<{ id, reasons }>`. The legacy `selections[*]` array is preserved and always equals `selected` so existing consumers (notably `resolve.preflight`'s memory reader) keep working unchanged.
- Extended `rekon memory add` with new flags: `--system`, `--capability`, `--tag` (repeatable), `--layer` (repeatable), `--priority low|normal|high`, `--reliability <0..1>`, `--verified`, `--rationale <text>`. Existing flags untouched. Invalid `--priority` and out-of-range `--reliability` values are rejected with clear errors before any artifact write.
- Extended `rekon memory select` with new filters: `--system`, `--capability`, `--tag` (repeatable), `--limit <n>` (default 5). Existing flags untouched.
- Added `tests/contract/memory-ranking-curation.test.mjs` with 10 tests covering the ranking matrix, rejection semantics, freshness penalty, legacy-shape preservation, CLI flag wiring, the resolver invariant, and verified-with-verificationResultRef.
- New docs: `docs/concepts/memory.md`, `docs/artifacts/operator-memory-entry.md`, `docs/artifacts/memory-selection.md`. Updated `docs/artifacts/memory-artifacts.md` to point at the new docs. Updated `docs/strategy/classic-guarantees-audit.md` (subsystem 10 entry now marks the guarantee preserved at v1 and lists the remaining gaps), `docs/strategy/classic-guarantee-regression-plan.md` (P1.2 marked closed with the shipped regression test), `docs/strategy/classic-subsystem-purpose-map.md` (row 10 priority reads "P1 preserved (v1)"; next slice = promotion engine), `docs/strategy/classic-behavior-roadmap.md` (P1.2 closure entry added), `docs/strategy/roadmap.md`, the root `README.md` (memory add example now shows the new flags), and `CHANGELOG.md`.

PUBLIC API CHANGES
- New exports from `@rekon/capability-memory`: `OperatorMemoryPriority`, `OperatorMemoryStatus`, `OperatorMemoryVerificationStatus`, `OperatorMemoryScope`, `OperatorMemoryVerification`, `MemorySelectionItem`, `MemorySelectionRejection`, `MemorySelectionQuery`. Existing `OperatorFeedbackEntry`, `MemorySelection`, and `memoryLearner` exports are preserved with additive shape changes.
- `OperatorFeedbackEntry` gained ten optional fields (see Changes Made). `MemorySelection` gained `query`, `selected`, `rejected`. Soft, additive package-local type changes. The runtime treats both as opaque JSON, so no downstream code breaks.
- New CLI flags on `rekon memory add` (`--system`, `--capability`, `--tag`, `--layer`, `--priority`, `--reliability`, `--verified`, `--rationale`) and on `rekon memory select` (`--system`, `--capability`, `--tag`, `--limit`). Existing flags continue to behave identically.
- No kernel changes. No SDK changes. No new capability roles. No new actuator / publisher / resolver handlers. No new artifact types. No artifact header shape changes.

PURPOSE PRESERVATION CHECK
- Original problem: operators repeatedly correct agents and supply project-specific guidance. Without durable, scoped, quality-managed memory, agents forget lessons or over-apply generic guidance. Bad memory — stale, broad, unverified, irrelevant — becomes prompt sludge and misleads future work.
- Classic workflow guarantee: codebase-intel-classic operator feedback (`lib/operator-feedback.ts`, `lib/memory/**`) was scoped, ranked, freshness-aware, reliability-aware, verification-aware, and tied to context usage. Memory was not just notes; it was quality-managed guidance applied only when relevant.
- Classic shape that provided the guarantee: per-entry scope, ranking logic combining scope match / freshness / verification / specificity / reliability / priority, promotion/curation signals, supersession chains, and context-usage logs.
- Rekon equivalent guarantee: `MemorySelection` artifacts are ranked by an explainable deterministic score that combines scope, verification, reliability, priority, freshness, and specificity. Rejected entries are surfaced with reasons. The resolver continues to read the legacy `selections[*]` array, so resolver behavior is unchanged for callers; the new metadata is additive. Memory **never** mutates `ownerSystems`, `risk`, `findings`, `status`, or `nextRequiredResolver`.
- What would mean we failed (and why this batch does not):
  - "A broad old note outranks a fresh path-specific note." — Test `path-specific verified memory outranks broad stale memory` pins this. The broad note hits `broad-scope-penalty` and `stale-over-365-days`; the path-scoped verified note hits `path-prefix-match` + `system-match` + `verified` + `high-priority` + `fresh-within-30-days`. The score gap is large.
  - "Memory appears in preflight/route/issue context with no explanation." — Every selected item carries `score` + `reasons` + `match`. The resolver still surfaces the legacy `reason` string for the package-local `applicableMemory` shape; the rich reason list lives on the artifact for consumers that want it.
  - "Memory overrides ownership or finding status." — Test `preflight resolver includes selected memory but does not mutate ownerSystems or finding status` exercises a memory entry deliberately scoped to a non-existent system (`memory-system`) and asserts `ownerSystems` stays bound to the OwnershipMap-derived value.
  - "Stale/unverified memory is surfaced as if it were authoritative." — Stale entries surface `stale-over-365-days`; unverified entries have no `verified` reason; both end up below verified fresh entries on score.
  - "Users cannot tell why a memory was selected." — Every item carries an ordered `reasons` array; rejected entries carry rejection reasons.
- Acceptance test for original problem (from the work order):
  - "Given broad stale memory and fresh path-specific verified memory, `rekon memory select` ranks the path-specific verified entry first and includes reasons." — Shipped as the test `path-specific verified memory outranks broad stale memory`.
  - "Given a resolver request for a path, resolver output includes selected memory with score/reason but does not change ownership/finding facts." — Shipped as `preflight resolver includes selected memory but does not mutate ownerSystems or finding status`. The CLI smoke confirms `applicableMemory` is populated with a `confidence` + `reason` and `ownerSystems` is unchanged.

CODEBASE-INTEL ALIGNMENT
- Classic capability / failure mode: operator feedback and memory quality control.
- Relevant classic files: `lib/operator-feedback.ts`, `lib/memory/**`, `commands/memory/**`, `schemas/*memory*`, `services/ContextHandler.ts`, `lib/context/resolver.ts`. Strategy anchors: `docs/strategy/classic-guarantees-audit.md` (subsystem 10), `docs/strategy/classic-guarantee-regression-plan.md` (P1.2), `docs/strategy/classic-subsystem-purpose-map.md` (row 10).
- What Rekon keeps: scoped recall; freshness-aware ranking; specificity-aware ranking; verification-aware ranking; reliability and priority signals; explainable selection reasons; memory enriches context but does not become truth; usage evidence preserved at the artifact level (`MemorySelection.inputRefs`).
- What Rekon simplifies: no automatic promotion engine; no LLM summarization; no context-usage analytics beyond the artifact lineage; no global / user-cloud memory; no complex taxonomy of memory kinds; no auto-write from resolver outcomes.
- What Rekon does not port yet: full promotion / curation engine; usage effectiveness tracking; supersession chains (the field exists, but there is no link to the superseding entry yet); memory decay policies beyond simple freshness scoring; automatic extraction from meetings/chats; large-scale memory search index.
- How this advances migration: closes P1.2 from the Classic Guarantees Audit. Makes memory useful and safe enough to feed resolver packets and (indirectly) publications. Sets up future promotion / curation without ever making memory authoritative.

MEMORY RANKING MODEL
- Base score: 0.1 for any active entry.
- Scope match: `path-exact-match` +0.45; `path-prefix-match` +0.35; `system-match` +0.25; `capability-match` +0.2; `tag-match` +0.1 each capped at +0.2. Entry has scope but no match → reject with `scope-mismatch`. Entry has no scope at all → +0.05 (`no-scope-fallback`).
- Verification: `verified` +0.2; `unverified`/absent neutral; `disputed` → reject with `disputed-rejected`.
- Reliability: `reliability * 0.15` (default 0.5). Surface reason `reliability-<value>` for ≥0.75 and `low-reliability-<value>` for ≤0.25.
- Priority: `high` +0.1; `normal` 0; `low` −0.05.
- Freshness: within 30 days +0.1; within 180 days +0.05; older than 365 days −0.1.
- Specificity: exactly one of paths/systems/capabilities/tags non-empty → +0.1 (`scoped-specific`). No scope at all → −0.05 (`broad-scope-penalty`).
- Status: `deprecated` and `superseded` → reject with `*-rejected`.
- Final score clamped to `[0, 1]`. Ties break by specificity desc, then `updatedAt` desc, then artifact id asc.

CLI COMMANDS UPDATED
- `rekon memory add --root <repo> --instruction <text> --path <path> [--goal <goal>] [--system <system>] [--capability <capability>] [--tag <tag>] [--layer <layer>] [--priority low|normal|high] [--reliability <0..1>] [--verified] [--rationale <text>] [--json]`. Validates `--priority` and `--reliability` before writing.
- `rekon memory select --root <repo> --path <path> [--goal <goal>] [--system <system>] [--capability <capability>] [--tag <tag>] [--limit <n>] [--json]`. `--limit` defaults to 5.
- `rekon memory list` unchanged at the surface level, but the output now reflects the new fields when they are present on entries (`priority`, `reliability`, `verification`, `rationale`, `createdAt`, `updatedAt`, `source`, `status`, extended `scope`).

RESOLVER/PUBLICATION INTEGRATION
- `resolve.preflight` continues to call the memory learner before resolving and to read `MemorySelection.selections[*]` into `applicableMemory`. Because the learner now writes per-item ranked entries with the legacy `instruction` / `scope` / `confidence` / `reason` fields still populated, the resolver picks up the v1 ranking output transparently — the top-ranked entry surfaces first with the matching legacy `reason` token (e.g. `"scope prefix match"`).
- Route / seam / issue resolvers do not consume memory in this alpha. That is consistent with their narrower purposes and the work order's note that deferral is acceptable; documented in `docs/concepts/memory.md`.
- Publications are not changed in this batch. The architecture summary and proof report continue to ignore memory directly; future work could surface "applicable memory" in those publications, but the contract test already prevents memory from bleeding into the canonical artifacts that publications cite.

TESTS / VERIFICATION
- `npm run typecheck`: passed.
- `npm run test`: 302 passed, 1 skipped (optional dogfood). 10 new contract tests in `tests/contract/memory-ranking-curation.test.mjs`. Was 292 → 302 (+10).
- `npm run build`: passed.
- `git diff --check`: clean.
- `node scripts/audit-package-exports.mjs`: passed (19 packages, no issues).
- `node scripts/publish-dry-run.mjs`: passed.
- `node scripts/audit-license.mjs`: passed.
- `node scripts/install-smoke.mjs`: passed.
- `node scripts/install-tarball-smoke.mjs`: passed (19 tarballs, 13 artifacts).
- CLI smoke against `examples/simple-js-ts`: `rekon refresh` → `rekon memory add` with the full new flag set → `rekon memory select` returns a top entry with score `1.00`, priority `high`, verification `verified`, and reasons `[path-prefix-match: src, system-match: src, capability-match: bootstrap, verified, high-priority, fresh-within-30-days]`. `rekon resolve preflight` includes the same entry in `applicableMemory` with confidence `0.92` and reason `scope prefix match`, while `ownerSystems` remains `['src']` (sourced from OwnershipMap, not memory). `rekon artifacts validate` returns `valid: true`; `rekon artifacts freshness` exits 0.

INTENTIONALLY UNTOUCHED
- No kernel changes. No SDK changes. No new capability roles. No new actuator / publisher / resolver / learner handlers — the existing memory learner gained new modes-of-evidence but not new dispatch entry points.
- No new artifact types. The new structure lives on the existing `OperatorFeedbackEntry`, `MemoryEvent`, and `MemorySelection` types.
- No LLM. No automatic promotion. No automatic extraction from chat logs / meetings.
- No global / org-wide memory store. Each `.rekon/` remains independent.
- No context-usage analytics beyond what the artifact store already records via `header.inputRefs`.
- No watcher / daemon.
- No source writes. No command execution.
- The existing legacy `selections[*]` array is preserved verbatim so `resolve.preflight`'s memory reader keeps working without changes.
- The existing per-package `packages/capability-memory/test/memory.test.mjs` was not modified and continues to pass (the new fields are additive; the legacy `path match` / `scope prefix match` reasons are still produced).
- Route / seam / issue resolvers, intent / reconcile / verify commands, all publishers, and `rekon refresh` are unchanged.
- No version bump. No npm publish. No `codebase-intel-classic` imports.

RISKS / FOLLOW-UP
- The ranker rejects entries whose `scope` is non-empty but does not match the query. That is the right call for v1 (we do not want a `--path src` note to leak into requests for `packages/runtime`), but it means an operator who tags every entry with at least one scope dimension and then queries with a completely unrelated path / system / capability / tag will see zero results. Documented in `docs/concepts/memory.md`; future curation could surface "scope-mismatch" entries in `rekon memory list` so curators can see candidates the ranker filtered.
- Tags are matched by exact equality; no normalization. A `policy` tag and a `Policy` tag would not match. Documented; can layer normalization later.
- The freshness penalty uses ISO timestamp diffs. The existing `OperatorFeedbackEntry.header.generatedAt` is used as the fallback when `updatedAt` is absent. Pre-v1 entries get the entry's `generatedAt`, so old entries will surface the appropriate freshness reason.
- The package-local `OperatorFeedbackEntry` and `MemorySelection` widening is a soft API change — direct importers of these types from `@rekon/capability-memory` will see the new optional fields. The runtime treats both as opaque JSON, so no downstream code should break.
- Promotion / curation engine is the obvious next slice. The current `rejected` array is the first half of the audit trail; the second half is a `MemoryUsageEvent` artifact that records whether selected memory was actually applied. Future work.
- Supersession chains are scaffolded (`status: "superseded"`) but there is no link back to the superseding entry id. Future work can add `supersedes: ArtifactRef` to make the chain inspectable.
- `confidence` (the legacy field) is preserved at default `1`. The new ranker uses `reliability` instead, with a 0.5 default. Operators who want to migrate richer signal should set `--reliability` explicitly; `--confidence` is not exposed as a flag and remains at 1 for legacy compatibility.

NEXT STEP
- Per the work order: agent operating contract publication v1. Preserve the classic generated AGENTS/CLAUDE docs guarantee — agents receive a concise operating contract before editing, including current ownership, required checks, resolver flow, memory guidance, and proof-loop expectations. Still publication-only; no root `AGENTS.md` overwrite by default. The agent operating contract should consume the v1 ranked `MemorySelection` so memory guidance is part of what agents see before they touch code.
- Operator npm publish is still pending and unchanged by this batch.
