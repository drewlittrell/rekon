CHANGES MADE
- Added a second publisher handler inside `@rekon/capability-docs`:
  - id `@rekon/capability-docs.architecture-summary` registered alongside the existing `@rekon/capability-docs.publisher`.
  - Consumes the latest `IntelligenceSnapshot` (required), plus `ObservedRepo`, `OwnershipMap`, `CapabilityMap`, `CoherencyDelta`, and `FindingLifecycleReport` (each optional).
  - Emits one `Publication` artifact with `kind = "architecture-summary"`, `title = "Rekon Architecture Summary"`, and a Markdown body.
- Extended the package-local `PublicationArtifact` type to include `"architecture-summary"` in the `kind` enum and to expose an optional `title` field. The kernel-level `Publication` artifact shape is unchanged.
- Added `@rekon/kernel-findings` and `@rekon/kernel-repo-model` as `@rekon/capability-docs` dependencies (used for type imports).
- Updated the capability manifest's `consumes` to include the new artifact types and added a `coherency.changed` invalidation rule.
- Added a CLI friendly shortcut `rekon publish architecture` which invokes `runPublish({ publisherId: "@rekon/capability-docs.architecture-summary" })` after `ensureSnapshotReady`. Generic dispatch via `rekon publish run @rekon/capability-docs.architecture-summary` is equivalent.
- Added contract test file `tests/contract/architecture-summary-publisher.test.mjs` with 8 tests.
- Updated the existing `packages/capability-docs/test/docs.test.mjs` to invoke `runPublish` with an explicit `publisherId` and added a new test exercising the architecture-summary publisher directly through the runtime.
- New docs: `docs/artifacts/architecture-summary-publication.md`, `docs/concepts/architecture-summary-publication.md`. Updated authoring-capabilities, coherency-delta (artifact + concept), classic-behavior-roadmap, classic-alignment-map, roadmap, root README, CHANGELOG.

PUBLIC API CHANGES
- New publisher handler exported from `@rekon/capability-docs`: `architectureSummaryPublisher`. The default capability export now registers it alongside `docsPublisher`.
- `PublicationArtifact.kind` package-local type now includes `"architecture-summary"`; `PublicationArtifact` now has an optional `title?: string` field.
- New CLI command: `rekon publish architecture`.
- New publisher id appears in `rekon publish list`.
- No kernel changes. No SDK changes. No new capability roles. No artifact header shape changes. The `Publication` artifact type at the kernel level is unchanged.

CODEBASE-INTEL ALIGNMENT
- Classic capability: generated architecture docs + assistant-doc projections from `services/ArchitectureDocsHandler.ts`, `services/ContextHandler.ts`, `lib/agent-docs.ts`, `tools/agent-docs/generator.ts`, plus the assistant-doc side of `packages/product-codebase-intel/src/replatform/replatform-delta.ts` / `replatform-delta-projections.ts`.
- What Rekon keeps: generated docs are useful for humans and agents; docs are produced from current repo intelligence and cite their input artifacts; coherency findings guide assistant focus; ownership, capabilities, and remediation priorities are visible; publications are downstream outputs, not canonical truth.
- What Rekon simplifies: one concise governance publication only — no per-system generated doc tree, no AGENTS.md overwrite/injection, no watcher-driven regeneration, no assistant-doc bundle, no dashboard or GitHub surface.
- What Rekon does not port yet: full `ArchitectureDocsHandler` output tree, system-specific generated docs, AGENTS.md overwrite/injection, real-time context docs refresh, PR/check publication, dashboard UI, assistant-doc watch alerts.
- Phase advanced: B — architecture-summary publisher ✅ initial slice shipped. Phase C still holds the full doc tree, PR/check publishers, and dashboards.

PUBLISHER ADDED
- Id: `@rekon/capability-docs.architecture-summary`.
- Capability id: `@rekon/capability-docs` (existing).
- Produces: `Publication`.
- Required input: latest `IntelligenceSnapshot` (publisher throws if missing).
- Optional inputs: latest `ObservedRepo`, `OwnershipMap`, `CapabilityMap`, `CoherencyDelta`, `FindingLifecycleReport`.
- Output kind: `architecture-summary`.
- Output path: `.rekon/artifacts/publications/architecture-summary.md`.
- The publisher does not synthesize missing inputs. When `CoherencyDelta` is missing, the markdown body says so and instructs the operator to run `rekon coherency delta`. When `ObservedRepo`/`OwnershipMap` are missing, the Owner Systems section says so and instructs the operator to run `rekon observe`, `rekon project`, and `rekon snapshot`.

ARCHITECTURE SUMMARY CONTENT
The Markdown body always contains these sections in order:
1. Repository Overview — repo id/root, system count, capability count, indexed-artifact category counts, snapshot freshness.
2. Owner Systems — table (System | Paths | Capabilities), capped at 20 rows.
3. Capability Map — bullet list of capabilities, truncated subjects/systems, capped at 20.
4. Coherency Summary — active/accepted/ignored/resolved counts plus severity breakdown.
5. Top Affected Paths — table of `CoherencyDelta.summary.topPaths` (up to 10).
6. Remediation Queue — table from `CoherencyDelta.remediationQueue` (priority/findingId/severity/systems/action), capped at 20.
7. Agent Guidance — short bullet list (route → seam → preflight, P0 first, run required checks).
8. Freshness — instructs the operator to run `rekon artifacts freshness --json`.
9. Input Artifacts — bullet list of `header.inputRefs`.

COHERENCY DELTA INTEGRATION
- The publisher reads the latest `CoherencyDelta` if indexed and uses its `summary` for the Coherency Summary section, its `summary.topPaths` for the Top Affected Paths section, and its `remediationQueue` for the Remediation Queue section.
- If no `CoherencyDelta` is indexed, the Coherency Summary section displays "No CoherencyDelta found. Run `rekon coherency delta` for governance summary." Top Affected Paths and Remediation Queue sections each display "No affected paths recorded." / "No remediation steps queued." respectively.
- The publisher cites `CoherencyDelta` in `header.inputRefs` when it was used; freshness validation marks the publication `stale` once a newer `CoherencyDelta` lands.
- The publisher reads `CoherencyDelta` directly from the artifact store and does **not** call `buildCoherencyDelta` from runtime. Keeping the publisher decoupled from runtime helpers preserves the capability boundary.

TESTS / VERIFICATION
- `npm run typecheck`: passed.
- `npm run test`: 178 passed, 1 skipped (optional dogfood). 8 new contract tests in `tests/contract/architecture-summary-publisher.test.mjs`, plus one new test in `packages/capability-docs/test/docs.test.mjs`. The previously-existing `packages/capability-docs/test/docs.test.mjs` test was adjusted to dispatch the original publisher explicitly (otherwise it would have run both publishers and emitted 3 publications instead of 2).
- `npm run build`: passed.
- `git diff --check`: clean.
- `node scripts/audit-package-exports.mjs`: passed.
- `node scripts/publish-dry-run.mjs`: passed (19 packages, 6 files each, no `.tsbuildinfo`, no forbidden tokens).
- `node scripts/audit-license.mjs`: passed.
- `node scripts/install-smoke.mjs`: passed.
- `node scripts/install-tarball-smoke.mjs`: passed.
- CLI smoke against `examples/simple-js-ts`: `init`, `observe`, `project`, `snapshot`, `evaluate`, `findings lifecycle`, `coherency delta`, `publish list`, `publish architecture`, `publish run @rekon/capability-docs.architecture-summary`, `publish agents`, `artifacts validate`, `artifacts freshness` — every command exited 0. `artifacts validate` returned `{ valid: true, issues: [] }`. The example produces zero findings so the publication's coherency sections are empty but the artifact and the workflow are exercised end-to-end.
- Manual smoke against the import-boundary rule pack fixture (`/tmp/...`) confirmed: the publication's Coherency Summary reports `Active findings: 3` (`high: 1`, `medium: 2`), Top Affected Paths shows `src/feature/handler.ts: 3`, Remediation Queue includes a `p0` row for the high-severity generated-output import finding and `p1` rows for the parent-relative imports, and Input Artifacts cites `IntelligenceSnapshot`, `ObservedRepo`, `OwnershipMap`, `CapabilityMap`, `CoherencyDelta`, and `FindingLifecycleReport`.

INTENTIONALLY UNTOUCHED
- No kernel changes. The `Publication` artifact type at the kernel level is unchanged.
- No SDK changes. The publisher is registered via the existing `defineCapability` API.
- No new capability roles. The new handler is a second `publisher` inside the same capability.
- No AGENTS.md overwrite or injection. The summary is written to `.rekon/artifacts/publications/architecture-summary.md` only.
- No watcher / daemon / file-system monitoring.
- No PR/check publisher.
- No dashboard or hosted SaaS.
- No remediation auto-apply. The queue lists work; it does not run it.
- No source-writing reconciliation.
- No version bump.
- No npm publish.
- No `codebase-intel-classic` imports.
- The existing `@rekon/capability-docs.publisher` and its `agents` / `repo-summary` publications are unchanged.
- `resolve.issue` is unchanged in this batch.

RISKS / FOLLOW-UP
- The publication is currently a single Markdown blob. For very large repos (hundreds of systems, thousands of findings) it could become long. The publisher caps Owner Systems and Capability Map at 20 rows and Remediation Queue at 20 entries; longer follow-up would either add pagination, multiple publications, or a structured JSON sibling. Not needed at alpha volume.
- The publisher does not yet emit a JSON sidecar containing the structured data it rendered. Future PR/check publishers that consume the same inputs will likely want a structured surface; deferring to keep this batch small.
- The publication cites every consumed artifact in `header.inputRefs` but does not embed their content. Re-reading them through `rekon artifacts show <id>` is the canonical path; the publication is downstream.
- The package-local `PublicationArtifact.kind` enum widening is a soft API change — direct importers of that type from `@rekon/capability-docs` will see the new union member. The runtime treats `Publication` opaquely, so no downstream code should break.
- The CLI shortcut `rekon publish architecture` always (re)runs snapshot via `ensureSnapshotReady` before publishing. If a CoherencyDelta exists but the snapshot is older than the delta, this is harmless and consistent with the rest of the publish surface. If users want pure-replay behavior they can use `rekon publish run @rekon/capability-docs.architecture-summary` without ensuring readiness — except today even that path runs through the same CLI handler. A future refinement could let `publish run` skip `ensureSnapshotReady`; not in this batch.

NEXT STEP
- Per the work order: work-order / intent maturity. Consume `CoherencyDelta.remediationQueue` to generate remediation-focused `WorkOrder` / `VerificationPlan` artifacts inside `@rekon/capability-intent`, preserving the anti-gaming gate concepts from classic `IntentPreparationService`. No auto-apply.
- Operator npm publish is still pending and unchanged by this batch.
