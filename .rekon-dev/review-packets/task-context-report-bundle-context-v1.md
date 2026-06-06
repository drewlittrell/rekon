# Review Packet — TaskContextReport Bundle Context Implementation (v1)

Slice: TaskContextReport Bundle Context Implementation (slice 183)
Decision: [Bundle Context Decision](../../docs/strategy/task-context-report-bundle-context-decision.md) (Option B + E)
Implementation memo: [task-context-report-bundle-context-implementation.md](../../docs/strategy/task-context-report-bundle-context-implementation.md)

## CHANGES MADE

- `packages/capability-docs/src/intent-plan-bundle.ts`
  - Added optional `taskContextReports?: Array<{ ref: ArtifactRef; report: unknown }>`
    to `BuildIntentPlanBundleInput`.
  - Added pure render helpers: `projectTaskContextAgent` (partitions context items
    into core/supporting by source, maps do-not-touch as `enforced: false`,
    verification hints as `executed: false`, dedups + sorts evidence, attaches an
    all-false boundaries block) and `renderTaskContextSidecars` (returns the three
    `context/` files, the `manifest.context` section, and the ref strings, or
    `undefined` for empty input).
  - Wired the sidecars into the file map, the `bundleFiles` list, and
    `manifest.context` — all guarded so empty input leaves the bundle unchanged.
- `packages/cli/src/index.ts`
  - Resolved a repeatable `--task-context-ref` flag (clean failure on missing /
    wrong-type), plus bounded lineage discovery from prepared-plan / assessment
    `header.inputRefs`, de-duplicated by id.
  - Passed the resolved entries into `buildIntentPlanBundle` only when non-empty.
  - Added a `taskContext` block to the `--json` output and one human-output line.
  - Added `--task-context-ref` to the `intent bundle write` usage line with a
    "not proof" note.
- Tests: `tests/contract/task-context-bundle-context.test.mjs` (27 assertions),
  `tests/docs/task-context-report-bundle-context.test.mjs` (15 assertions).

## PUBLIC API CHANGES

- `BuildIntentPlanBundleInput.taskContextReports?` — new optional field. Additive;
  existing callers are unaffected.
- `rekon intent bundle write --task-context-ref <ref>` — new optional, repeatable
  flag.
- Bundle `--json` gains an additive `taskContext` object; no existing field changed.
- `manifest.json` gains an additive `context.taskContextReports[]` section only
  when task context is attached.

## PURPOSE PRESERVATION CHECK

TaskContextReport remains the standard pre-work context substrate, not a proof
artifact. This slice lets a bundle *carry* that context for a downstream human or
agent; it does not change what the context is or what it can do. With no
`--task-context-ref` and no lineage ref, the bundle is byte-identical to the prior
release. Context never becomes proof, never approves a plan, never satisfies a
WorkOrder / VerificationPlan / phase gate, never executes a command, never writes
source, and never runs Circe. The Circe handoff projection is unchanged. The
feature is purely additive context.

## SOURCE REVIEW

- The producer's `manifest` is a flexible record already carrying `manifest.circe`;
  `manifest.context` is added alongside without disturbing existing keys.
- `renderTaskContextSidecars` returns `undefined` for empty input, so every
  wiring point is a no-op when no task context is present.
- The CLI resolves task context (lines ~7012–7068) before the producer call, so a
  bad ref fails before any file is written.
- `findArtifactEntry` throws `Artifact not found: <ref>` for an unknown ref; the
  wrong-type guard throws `must reference a TaskContextReport`.

## BUNDLE INPUT MODEL

Two attachment sources, both optional and de-duplicated by id:
1. Explicit, repeatable `--task-context-ref` (validated to be a TaskContextReport).
2. Bounded lineage discovery from prepared-plan / assessment `header.inputRefs`
   (missing refs skipped). No other artifact arrays are scanned.

## MANIFEST CONTEXT MODEL

`manifest.context.taskContextReports[]` entries:
`{ ref: { type, id }, role: "optional-agent-context", proof: false, sidecars: { markdown, agentJson } }`.
Omitted entirely when no task context is attached.

## SIDECAR MODEL

- `context/task-context.md` — human brief; opens "This context is optional
  guidance, not proof."; per report: "Read This Before Editing", "Do Not Touch"
  ("(guidance, not enforced)"), "Verification Hints" ("(hint, not executed)"),
  all-false "Boundaries".
- `context/task-context.agent.json` — `{ taskContextReports: [{ ref, agentContext,
  proof: false }], boundaries: { ...all false } }`.
- `context/task-context.refs.json` — `{ taskContextReports: [{ ref, role:
  "optional-agent-context", proof: false }] }`.

## CIRCE HANDOFF BOUNDARY

`circe/handoff.json`, `circe/phase-plan.json`, and `circe/rekon-proof.json` are
produced by the same adapters as before and never reference task context. Circe
handoff JSON is unchanged in v1; Circe is not required to know TaskContextReport
internals. The contract test asserts the handoff JSON contains no `task-context` /
`taskContext` substring and that `manifest.circe` is likewise free of it.

## CLI SURFACE

- `rekon intent bundle write ... [--task-context-ref <TaskContextReport ref>]`
  (repeatable).
- `--json` output: `taskContext: { included, count, refs, sidecars, proof: false }`
  or `{ included: false }`.
- Human output: "Task context: N optional context report(s) included (context/,
  not proof)." when present.
- `rekon help` lists the flag with a "not proof" note.

## BOUNDARY MODEL

- TaskContextReport may be included in bundles only as optional context, not proof.
- TaskContextReport must not be required to write an intent bundle.
- TaskContextReport must not approve plans.
- TaskContextReport must not satisfy WorkOrder or VerificationPlan gates.
- TaskContextReport must not change phase gates.
- TaskContextReport must not execute commands.
- TaskContextReport must not write source files.
- TaskContextReport must not run Circe.
- verification hints remain hints, not executed commands.
- do-not-touch zones remain guidance/context, not enforcement.
- Circe handoff JSON is unchanged in v1.
- intent:go remains deferred.

## TESTS / VERIFICATION

- `tests/contract/task-context-bundle-context.test.mjs` — 27 assertions: full
  operator path WITH `--task-context-ref`; manifest section; three sidecars;
  markdown framing; unchanged Circe / WorkOrder / VerificationPlan surfaces;
  clean failure on missing / wrong-type ref; no source / plan write, no
  VerificationRun, no IntentGoReport; artifacts validate clean; fresh bundle
  WITHOUT context has no sidecars; help lists the flag and states "not proof".
- `tests/docs/task-context-report-bundle-context.test.mjs` — 15 assertions on
  boundary language + CHANGELOG + this packet.
- Full keyless gate: `npm test`, `npm run typecheck`, `npm run build`,
  `git diff --check`, export/license audits, publish dry-run, install smokes.
- Manual CLI smoke on a temp fixture (graph build → context task → bundle write
  `--task-context-ref`) confirmed the sidecars + manifest.context + unchanged
  Circe handoff.

## INTENTIONALLY UNTOUCHED

- The Circe handoff / phase-plan / rekon-proof projection schema.
- WorkOrder, VerificationPlan, and phase-gate generation.
- `intent assess` / `intent plan review` task-context plumbing (already shipped).
- `agent/context.json` (the existing bundle handoff context, distinct from the
  TaskContextReport agentContext — hence the separate `context/` sidecar paths).
- intent:go (remains deferred).

## RISKS / FOLLOW-UP

- Low risk: the change is additive and gated on non-empty task context. The main
  residual is documentation drift, addressed by the boundary docs test.
- Follow-up: a Bundle Context Safety Review to re-read the shipped surfaces, and
  optionally a Bundle Context Dogfood replaying the full path on a real repo.

## NEXT STEP

Recommend **TaskContextReport Bundle Context Safety Review** as the next slice.
