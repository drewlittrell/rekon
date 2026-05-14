CHANGES MADE
- Extended `@rekon/capability-resolver` with three new resolver handlers alongside the existing `resolve.preflight`:
  - `resolve.route` — single-owner / cross-owner / unresolved routing decision; recommends `resolve.preflight` or `resolve.seam`.
  - `resolve.seam` — designates primary + secondary owners or escalates when a primary cannot be chosen; honors an explicit `primaryOwner` input.
  - `resolve.issue` — finds a `Finding` by id (exact) or fragment; surfaces ambiguous-match and missing-match warnings without silently choosing; resolves ownership for the matched finding's files and recommends the next resolver based on owner spread.
- Added a shared `ResolverPacketBase` shape (`resolverId`, `phase`, `summary`, `warnings`, `nextSteps`, `resolutionTrace`) plus per-phase packet types (`RoutePacket`, `SeamPacket`, `IssuePacket`). The existing `PreflightPacket` shape is unchanged.
- Added CLI friendly shortcuts: `rekon resolve route`, `rekon resolve seam`, `rekon resolve issue`. Generic `rekon resolve list` / `rekon resolve run <id>` covers every resolver.
- Added `ensureSnapshotForResolver` helper in the CLI so the three new commands share snapshot readiness with the same "only run snapshot if missing or inputs are newer" logic as `ensureSnapshotReady`.
- Added `tests/contract/route-seam-issue-resolvers.test.mjs` (19 tests).
- Updated `docs/concepts/resolvers.md`, `docs/artifacts/resolver-packet.md`, `docs/strategy/capability-model.md`, `docs/strategy/roadmap.md`, `docs/strategy/classic-behavior-roadmap.md`, `docs/strategy/classic-alignment-map.md`, and the root `README.md` with phase flow, per-phase packet fields, and CLI examples.
- Updated `CHANGELOG.md`.

PUBLIC API CHANGES
- New exported types from `@rekon/capability-resolver`: `ResolverPhase`, `ResolverPacketBase`, `RoutePacket`, `SeamPacket`, `IssuePacket`, `IssueSummary`. Existing `PreflightPacket`, `ResolutionTraceEntry`, and `preflightResolver` exports are unchanged. New exports: `routeResolver`, `seamResolver`, `issueResolver`.
- New CLI commands: `rekon resolve route`, `rekon resolve seam`, `rekon resolve issue`. Existing `resolve preflight`, `resolve list`, and `resolve run` are unchanged.
- No kernel, SDK, runtime, or built-in capability behavior changes. No artifact header shape changes. The runtime's `runResolve` already accepted `resolverId` and `input`; this batch only added more handler registrations + CLI surfaces.

CODEBASE-INTEL ALIGNMENT
- Classic capability: resolver phase model (route, seam, preflight, issue context) from `lib/context/resolver.ts`, `services/ContextHandler.ts`, `handlers/RealTimeContextHandler.ts`, `lib/issue-context.ts`, `lib/issue-context/**`, `services/IssueDetectionService.ts`, `services/issues/**`.
- Rekon keeps: resolver phases as explicit packets, ownership-aware routing, seam detection, issue-specific resolution, required checks, next-step guidance, `resolutionTrace`, artifact `inputRefs`, freshness visibility, CLI discoverability via `resolve list`/`resolve run`.
- Rekon simplifies: route/seam/issue only — no bootstrap/approval/intent-gate model, no watcher heartbeat, no real-time server, no protected-area approval workflow (warnings only), no full issue-context graph enrichment, no docs scraping as truth.
- Rekon does not port yet: full route/seam/preflight handoff choreography, approval-required protected path system, full issue-context graph signals, runtime truth graph integration, generated context bundle validation, real-time context HTTP server, watcher-backed freshness proof.
- Phase advanced: B — route/seam/issue resolver expansion ✅ shipped.

RESOLVERS ADDED
- `resolve.route` — phase `route`, produces `ResolverPacket` with `routing.{status, primaryOwner, candidateOwners, needsSeam, rationale}` and `nextRequiredResolver` ∈ {`resolve.seam`, `resolve.preflight`}.
- `resolve.seam` — phase `seam`, produces `ResolverPacket` with `primaryOwner`, `secondaryOwners`, `seam.{status, rationale, escalate}` and `nextRequiredResolver` = `resolve.preflight` when resolved.
- `resolve.issue` — phase `issue`, produces `ResolverPacket` with `query`, `issue` (matched finding summary), `relatedFindings`, ownership for the issue's files, and `nextRequiredResolver` ∈ {`resolve.route`, `resolve.seam`, `resolve.preflight`}.

ROUTE FLOW
- Inputs: `snapshotRef`, `paths` (or `path`), optional `goal` and `concern`.
- Ownership resolution reuses `resolveOwnership()` from the existing preflight implementation (precedence: `OwnershipMap` → `ObservedRepo` → ownership `GraphSlice` → `EvidenceGraph` ownership_hint).
- Decision rules:
  - All paths → single owner: `routing.status = "single-owner"`, `primaryOwner` set, `needsSeam = false`, `nextRequiredResolver = "resolve.preflight"`.
  - Multiple owners: `routing.status = "cross-owner"`, `needsSeam = true`, `nextRequiredResolver = "resolve.seam"`.
  - No owners resolved: `routing.status = "unresolved"`, warning, `nextRequiredResolver = "resolve.preflight"` with reduced confidence.
- Trace records resolver input, ownership source checks, routing decision, and next-resolver decision.

SEAM FLOW
- Inputs: `snapshotRef`, `paths` (or `path`), optional `goal`, optional `primaryOwner`.
- Decision rules:
  - Single owner system: `seam.status = "resolved"`, `primaryOwner` set, `secondaryOwners = []`, `nextRequiredResolver = "resolve.preflight"`.
  - Multiple owners + valid `primaryOwner` input: `seam.status = "resolved"`, secondary owners recorded, `nextRequiredResolver = "resolve.preflight"`.
  - Multiple owners, no `primaryOwner` input: `seam.status = "needs-primary-owner"`, `escalate = true`, no next resolver.
  - `primaryOwner` provided but not in resolved owners: `seam.status = "unresolved"`, warning, `escalate = true`.
  - No owners resolved: `seam.status = "unresolved"`, warning, `escalate = true`.
- Trace records seam decision, primary/secondary owner selection, and next resolver.

ISSUE FLOW
- Inputs: `snapshotRef`, optional `issue` (id or fragment).
- Matching strategy:
  - Empty query → warning, no match.
  - Exact id match wins.
  - Otherwise unique substring match across `id`, `type`, `title`, `description`, `ruleId`.
  - Multiple substring matches → ambiguous warning + `relatedFindings`; resolver does not silently choose.
- When a single match is found: resolver looks up `OwnershipMap`/`ObservedRepo`/ownership `GraphSlice`/`EvidenceGraph` for the finding's files and sets `nextRequiredResolver` to `resolve.preflight` (single owner), `resolve.seam` (multi-owner), or `resolve.route` (no files attached to the finding).
- Trace records FindingReports checked, match strategy, ambiguity/missing-match decision, ownership resolution for issue files, and next-resolver decision.

FRESHNESS INTEGRATION
- All four resolvers continue to write artifacts through the runtime artifact store with full `header.inputRefs`, so `rekon artifacts freshness` reflects route/seam/issue packets the same way it does preflight packets.
- The CLI helper `ensureSnapshotForResolver` mirrors the `ensureSnapshotReady` semantics added in the freshness batch: it only writes a new snapshot when one is missing or when newer inputs (`EvidenceGraph`, `ObservedRepo`, `OwnershipMap`, `CapabilityMap`, `GraphSlice`, `FindingReport`, `MemorySelection`) exist. This keeps freshness honest after running multiple resolvers in sequence.
- Resolver packets do not (yet) call `validateArtifactFreshness()` themselves to emit warnings inline. Adding a freshness pre-check inside the resolver would couple the capability to the runtime helper; left as a follow-up. Today, operators can run `rekon artifacts freshness --json` alongside resolver runs.

TESTS / VERIFICATION
- `npm run typecheck`: passed.
- `npm run test`: 146 passed, 1 skipped optional dogfood. 19 new tests in `tests/contract/route-seam-issue-resolvers.test.mjs`:
  - Direct evaluator tests (12) using a synthetic in-memory artifact harness: route single/cross/unresolved, seam single/needs-primary/secondary-recorded/unresolved-primary, issue exact/fragment/ambiguous/cross-owner/missing-query.
  - CLI tests (7): `resolve list` reports all four; each friendly shortcut writes a phase-tagged packet; `resolve run resolve.route` dispatches the same handler; existing `resolve preflight` still works; `artifacts freshness` remains valid after writing route/seam/issue packets.
- `npm run build`: passed.
- `git diff --check`: clean.
- `node scripts/audit-package-exports.mjs`: passed.
- `node scripts/publish-dry-run.mjs`: passed.
- `node scripts/audit-license.mjs`: passed.
- `node scripts/install-smoke.mjs`: passed.
- `node scripts/install-tarball-smoke.mjs`: passed.
- CLI smoke against `examples/simple-js-ts` including `resolve list`, `resolve route`, `resolve seam`, `resolve preflight`, `resolve issue`, `resolve run resolve.route`: every command exited 0. `artifacts validate` returned `{ valid: true, issues: [] }`. Aggregate `artifacts freshness` reported `stale` because running multiple resolvers + publish produces older packets that no longer reference the latest snapshot — that is the freshness model working correctly; integrity validation is the relevant gate.

INTENTIONALLY UNTOUCHED
- No watcher / daemon / file-system monitoring.
- No artifact header shape changes.
- No SDK changes.
- No kernel changes.
- No new capability roles.
- No source-writing reconciliation.
- No generic actuator or learner dispatch.
- No marketplace/discovery.
- No SaaS/dashboard.
- No version bump.
- No npm publish.
- `preflightResolver` and its existing risk/finding/memory plumbing are unchanged.
- `PreflightPacket` shape unchanged; new packet types live alongside it.
- `examples/import-boundary-rule-pack` and `examples/custom-capability` are unchanged.

RISKS / FOLLOW-UP
- `resolve.issue` matches against any FindingReport's findings; if the same finding appears in multiple reports with different ids, behavior is "first exact id wins" then "unique substring across all candidates". Acceptable for alpha; document explicitly if a community use case wants targeted-report scoping.
- `resolve.seam`'s "needs-primary-owner" status sets `nextRequiredResolver = undefined` because the seam itself is incomplete. Agents reading the packet should treat that as "stop and ask"; this is the explicit gate.
- All resolver packets share `artifactType = "ResolverPacket"`. Downstream code that wants to filter by phase should use the `phase` field rather than parsing artifact ids. The synthetic test harness verifies the field is set on every emitted packet.
- The CLI's `resolve preflight` command does not yet use `ensureSnapshotForResolver`. Its existing snapshot-readiness path lives inline and unconditionally calls `runSnapshot()`. That predates this batch and was kept untouched to avoid churn. A future batch can consolidate the resolver setup helpers.
- Freshness pre-check inside the resolver was considered and deferred. Operators have a working `rekon artifacts freshness --json` workflow; resolver-side warnings would require either runtime coupling or a kernel surface for capabilities to consult freshness directly.

NEXT STEP
- Per the work order: issue lifecycle and status. Finding status preservation, accepted/ignored/resolved findings, false-positive notes; aligns with classic `IssueDetectionService` and coherency delta. Builds naturally on `resolve.issue` and the existing `Finding`/`FindingReport` contracts.
- Operator npm publish is still pending and unchanged by this batch.
