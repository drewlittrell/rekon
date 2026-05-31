# Review Packet — Intent Plan Bundle / Agent Handoff Safety Review (slice 97)

## CHANGES MADE

Strategy / safety-review batch — no runtime behavior change. Adds
`docs/strategy/intent-plan-bundle-agent-handoff-safety-review.md` (ground review of
the slice-96 generator), this review packet, a 20-assertion docs test, and
cross-reference footers / CHANGELOG / README pointers across the intent /
verification scope docs. No source files changed.

## PUBLIC API CHANGES

None. No helper, type, CLI flag, or artifact shape changed.

## PURPOSE PRESERVATION CHECK

The bundle generator is the first intent surface that writes filesystem files, so
its path safety and source-write boundaries must be confirmed before any
`intent:go` / execution decision. The review verifies the original guarantees: the
bundle is a projection of canonical truth, writes only under
`.rekon/intent/plans/<intent-id>/`, creates no canonical artifacts, executes no
commands, writes no source files, marks stale bundles, and implements no
`intent:go`.

## CODEBASE-INTEL ALIGNMENT

Mirrors Rekon's truth-vs-projection split: `.rekon/artifacts/` is canonical
machine-readable truth; the bundle is a derived per-intent handoff. The generator
lives in the docs package that already owns Markdown generation, and adds nothing
to the artifact registry.

## HELPER / CLI REVIEWED

- `buildIntentPlanBundle` (`packages/capability-docs/src/intent-plan-bundle.ts`) —
  pure function; reads no files, writes none, runs nothing, mutates nothing; derives
  a slug-safe intent id and asserts every emitted path is bundle-safe.
- `slugifyIntentId` / `isSafeBundleRelativePath` — path-safety primitives.
- `rekon intent bundle write` (`packages/cli/src/index.ts`) — resolves artifacts +
  digests, renders, and `mkdir`/`writeFile`s only under the bundle directory.

## DIRECTORY BOUNDARY REVIEW

Bundle root `resolve(root, ".rekon", "intent", "plans")`; bundle dir resolves
under it; the CLI rejects any intent id whose resolved path is empty / `..` /
absolute. Writes land only inside `<repo-root>/.rekon/intent/plans/`.

## PATH SAFETY REVIEW

Three layers: slug normalization neutralizes traversal; the renderer asserts each
emitted path is `isSafeBundleRelativePath` (no absolute / backslash / NUL / `.` /
`..` segment); the CLI re-checks each file path and, after `resolve`, rejects any
offset that starts with `..` or is absolute.

| Path Risk | V1 Safety |
| --- | --- |
| unsafe intent id | slug-safe normalization |
| absolute output path | rejected |
| .. traversal | rejected |
| renderer unsafe path | rejected |
| write outside bundle root | rejected |

## MANIFEST REVIEW

`manifest.json`: schemaVersion / bundleKind / intentId / generatedAt / status /
`sourceArtifacts` (ref + digest, store-index digest with FNV-1a fallback) /
`staleness` (state + reasons) / `files` map / `boundaries` (canonicalTruth +
executesCommands / writesSourceFiles / implementsIntentGo all false). Written as a
bundle file, never a registered artifact.

## HUMAN-READABLE FILE REVIEW

`README.md` (overview + canonical-truth reminder + boundaries), `prepared-plan.md`
(approval / phases / obligations), `work-order.md` (guidance + traceability),
`verification-plan.md` (proof requirements + "commands not executed"), `status.md`
(status rollup). Complete operator review surface.

## AGENT HANDOFF FILE REVIEW

`agent/handoff.md` (goal / status / do / don't / refs / stop conditions),
`agent/context.json` (structured), `agent/instructions.md`, `agent/constraints.md`
(non-goals / source-write + command-execution boundaries / stop conditions),
`agent/verification.json` (requirements, `executesCommands: false`),
`agent/source-refs.json` (refs / digests). Bounded handoff; cites source; grants no
execution authority.

## STALENESS / PROVENANCE REVIEW

`stale` on missing prepared plan / stale freshness / high-severity open drift /
status stale inputs; else `fresh`, with `staleReasons`. Provenance via per-artifact
refs + digests. A stale bundle is not a current handoff.

## CANONICAL ARTIFACT BOUNDARY

No `WorkOrder` / `VerificationPlan` / `VerificationRun` / `VerificationResult`
created; no artifact type registered; no canonical artifact mutated. Slice-96 smoke
confirmed `artifacts validate` clean post-write. **VerificationRun and
VerificationResult are optional proof context, not prerequisites for bundle
generation** (not currently wired as inputs — follow-up, not a blocker).

## COMMAND / SOURCE-WRITE BOUNDARY

Pure transform + `mkdir`/`writeFile` inside the bundle directory only. No process
spawned, no command executed, no source path written.

## INTENT GO BOUNDARY

Produces a handoff, not an execution; runs no commands, schedules no run,
implements no `intent:go`. Agent files are a bounded handoff, not an execution
trigger.

## RECOMMENDATION

Intent Plan Bundle / Agent Handoff is **safe / stable** as a human + LLM-agent
filesystem projection. Proceed to the **Intent Go / Execution Boundary Decision**.

## TESTS / VERIFICATION

- New `tests/docs/intent-plan-bundle-agent-handoff-safety-review.test.mjs` (20
  assertions).
- Full gate: typecheck, test (full suite), build, `git diff --check`,
  audit-package-exports, audit-license, publish-dry-run, install-smoke,
  install-tarball-smoke. No CLI smoke (strategy-only batch).

## INTENTIONALLY UNTOUCHED

Renderer, CLI, path-safety primitives, manifest model, all intent / verification
artifacts unchanged. No `intent:go`, no VerificationRun generation, no version
bump, no publish.

## RISKS / FOLLOW-UP

- VerificationRun / VerificationResult are not yet wired as optional bundle inputs
  (follow-up).
- Immutable-snapshot mode deferred (v1 regenerates in place).
- Intent Go / Execution Boundary Decision is the next, higher-stakes boundary.

## NEXT STEP

Intent Go / Execution Boundary Decision.
