# Review Packet — Intent Plan Bundle / Agent Handoff Implementation (slice 96)

## CHANGES MADE

- **`packages/capability-docs/src/intent-plan-bundle.ts`** (new) — the pure
  `buildIntentPlanBundle` renderer + `slugifyIntentId` + `isSafeBundleRelativePath`.
- **`packages/capability-docs/src/index.ts`** — re-exports the renderer + types.
- **`packages/cli/src/index.ts`** — new `intent bundle write` branch + imports;
  resolves source artifacts, computes digests from the store index, renders the
  bundle, and writes files only under `.rekon/intent/plans/<intent-id>/` with
  path-traversal safety.
- **Docs / tests** — new `docs/concepts/intent-plan-bundle.md`; cross-ref footers;
  CHANGELOG; 29-assertion contract test; 11-assertion docs test.

## PUBLIC API CHANGES

- `@rekon/capability-docs`: new exports `buildIntentPlanBundle`, `slugifyIntentId`,
  `isSafeBundleRelativePath`, and the `IntentPlanBundleSource` /
  `IntentPlanBundleFile` / `IntentPlanBundleRenderResult` /
  `BuildIntentPlanBundleInput` types.
- CLI: new subcommand `rekon intent bundle write`.
- No artifact type registered; no canonical artifact shape changed.

## PURPOSE PRESERVATION CHECK

Rekon has canonical intent artifacts under `.rekon/artifacts/`, but humans and LLM
agents need a predictable repo-local handoff bundle. The bundle must project
artifacts without becoming canonical truth, must cite source refs / digests, and
must never imply command execution, source writes, or `intent:go`. The
implementation preserves those guarantees: the renderer is pure (reads no files,
writes none, runs nothing, mutates nothing); the CLI writes only inside the bundle
directory; the manifest records refs / digests / staleness / boundaries; and the
bundle creates no canonical artifacts.

## CODEBASE-INTEL ALIGNMENT

Mirrors Rekon's truth-vs-projection split: `.rekon/artifacts/` is canonical
machine-readable truth and presentation surfaces are derived. The bundle is the
per-intent handoff projection, written by the docs package that already owns
Markdown generation.

## DIRECTORY MODEL

Default `.rekon/intent/plans/<intent-id>/`; intent id derived from `--intent-id`
else PreparedIntentPlan / IntentAssessmentReport / IntentStatusReport id, slug
normalized. Bundle creation writes nowhere else, mutates no canonical artifact,
writes no source, and runs no command.

## MANIFEST MODEL

`manifest.json`: schemaVersion `0.1.0`, bundleKind `intent-plan`, intentId,
generatedAt, status, `sourceArtifacts` (ref + digest per present artifact),
`staleness` (state + staleReasons), `files` map, `boundaries`
(`canonicalTruth: ".rekon/artifacts"`, executesCommands / writesSourceFiles /
implementsIntentGo all `false`). Digests come from the store index, falling back to
a deterministic FNV-1a hash of the loaded artifact.

## HUMAN-READABLE FILES

`README.md` (overview / status / canonical-truth reminder / source refs /
boundaries), `prepared-plan.md` (goal / approval / phases / obligations /
verification requirements / blocked reasons), `work-order.md` (goal / scope /
constraints / traceability), `verification-plan.md` (commands as text +
"commands are not executed" note + success criteria + traceability), `status.md`
(status / next action / blockers / warnings / stale / missing inputs).

## AGENT HANDOFF FILES

`agent/handoff.md` (goal / status / what-to-do / what-not-to-do / source refs /
stop conditions), `agent/context.json` (intentId / goal / status / scope / systems
/ capabilities / steps / phases / obligations / artifactRefs), `agent/instructions.md`
(ordered phases + constraints + WorkOrder guidance), `agent/constraints.md`
(non-goals / source-write boundary / command-execution boundary / preservation
obligations / stop conditions), `agent/verification.json` (commands + success
criteria + sourceRefs + `executesCommands: false`), `agent/source-refs.json`
(generatedAt / canonicalTruth / sourceArtifacts).

## STALENESS / PROVENANCE MODEL

`stale` on missing prepared plan, stale `PathFreshnessReport`, high-severity open
`RuntimeGraphDriftReport`, or `IntentStatusReport` stale inputs; else `fresh`. The
manifest carries `staleReasons`. A stale bundle should be regenerated before use.

## CLI SURFACE

`rekon intent bundle write [--intent-id <id>] [--assessment <ref>] [--prepared-plan
<ref>] [--intent-status <ref>] [--work-order <ref>] [--verification-plan <ref>]
[--path-freshness <ref>] [--runtime-drift <ref>] [--root <path>] [--json]`. Reads
latest-or-pinned artifacts; writes the bundle; prints path + staleness + file count
(human) or a `bundle` / `canonicalTruth` / `boundaries` JSON object.

## PATH SAFETY

The intent id is slugified (neutralizing traversal). The CLI resolves the bundle
dir under `<root>/.rekon/intent/plans/` and rejects any intent id whose resolved
path escapes that base; every rendered file path is checked with
`isSafeBundleRelativePath` (no absolute, no `..`, no backslash / NUL) and re-checked
after `resolve`. The renderer also asserts its own emitted paths are safe.

## BOUNDARY MODEL

Bundle vs canonical artifacts (projection vs truth); vs intent:go (no execution);
vs source writes (only inside the bundle dir); vs VerificationRun (no command
execution); vs canonical artifact creation (none). Manifest boundaries are
literal-`false`.

## TESTS / VERIFICATION

- `tests/contract/intent-plan-bundle.test.mjs` — 29 assertions (renderer files /
  manifest / slug / path safety / staleness + seeded CLI write / pinned refs /
  no-canonical-artifact / no-source-write / validate-clean).
- `tests/docs/intent-plan-bundle.test.mjs` — 11 assertions.
- Full 9-command gate + product-capability CLI smoke (see ship log).

## INTENTIONALLY UNTOUCHED

No new artifact type; no canonical artifact mutation; no command execution; no
source writes outside the bundle directory; no `intent:go`; no version bump; no
publish. Existing intent / verification artifacts and producers unchanged. `rekon
artifacts validate` stays clean (the bundle is not an artifact).

## RISKS / FOLLOW-UP

- Staleness v1 computes from digests + summary fields; a future slice may
  re-derive staleness against freshly recomputed artifacts.
- Immutable-snapshot mode is deferred (v1 regenerates in place).
- Recommended next slice: **Intent Plan Bundle / Agent Handoff Safety Review**.

## NEXT STEP

Intent Plan Bundle / Agent Handoff Safety Review.
