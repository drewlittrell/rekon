# Review Packet — TaskContextReport Human/Agent Context Export (slice 177)

Base `b1073c4`. Product capability batch. Improves how the existing
`TaskContextReport` is consumed by humans and agents via `rekon context task`.
Presentation only — no new artifact, no schema change, no executed command, no
source write.

## CHANGES MADE

- `packages/cli/src/index.ts` — `rekon context task` branch: computed a shared
  human/agent presentation layer once (core/supporting partition, deduped+sorted
  evidence refs, `agentContext` object) before the `if (json)` split. Human
  renderer rewritten into the "read this before editing" brief; JSON success
  payload gains an additive `agentContext` block. `usage()` `context task` line
  now describes the human brief + `agentContext`.
- `tests/contract/task-context-human-agent-export.test.mjs` — NEW, 26 assertions.
- `tests/docs/task-context-human-agent-export.test.mjs` — NEW, 16 assertions.
- `docs/strategy/task-context-human-agent-export.md` — NEW memo.
- `.rekon-dev/review-packets/task-context-human-agent-export.md` — NEW (this file).
- Cross-ref doc + roadmap + README + CHANGELOG updates.

## PUBLIC API CHANGES

- `rekon context task` human output: new section structure (additive content,
  same command, same flags). The `# Task Context` heading and `Report: <id>`
  footer are preserved for backward compatibility.
- `rekon context task --json`: ADDS one top-level key, `agentContext`. No existing
  key is renamed, removed, or changed in meaning. The artifact written to the
  store is byte-for-byte the same `TaskContextReport` as before.
- No change to any package export, type, factory, validator, or schema.

## PURPOSE PRESERVATION CHECK

The command's purpose — build and present ONE `TaskContextReport` as
proposal/context — is unchanged. The report is still canonical; the human markdown
and the agent JSON are projections of it. Deterministic graph facts still outrank
embedding similarity (core vs supporting partition mirrors that ordering).

## SOURCE REVIEW

- Partition: `coreItems` = `operator_input` + `deterministic_graph`;
  `supportingItems` = `embedding_retrieval` + `semantic_file_understanding`. Pure
  filters over `report.contextItems`.
- `agentContext` is assembled from `report.*` fields only; `enforced: false` and
  `executed: false` are pinned `as const`; `boundaries` is `report.boundaries`
  (all-false, factory-forced).
- Human renderer: five always-rendered sections with `(none)` fallbacks; Warnings
  conditional; footer points to `--json`. No new fs, process, or network calls.

## HUMAN MARKDOWN OUTPUT

Lead notice "Read this before editing."; `Task:` (+ optional `Goal:` / `Paths:`);
`## Core Context`; `## Related / Supporting Context`; `## Do Not Touch` (each zone
"(guidance, not enforced)"); `## Verification Hints` (each hint "(hint, not
executed)"); `## Warnings` (only when present); `## Evidence`; boundary footer with
`--json` pointer; `Report: <id>`.

## AGENT JSON OUTPUT

`agentContext = { readBeforeEditing, task, coreContext[], supportingContext[],
doNotTouch[] (enforced:false), verificationHints[] (executed:false), warnings[],
evidence[], boundaries }`. Every `coreContext`/`supportingContext` entry carries
`ref, kind, source, reason, evidenceRefs` (+ optional path/symbolId/capabilityId/
score/scoreBand). Additive only; all pre-existing top-level keys preserved.

## EVIDENCE REF PRESERVATION

`evidence` is the deduped, sorted union of every context item's, zone's, and
hint's `evidenceRefs`. The per-item `evidenceRefs` remain intact in the existing
`contextItems` / `doNotTouch` / `verificationHints` JSON. Contract assertion 20
checks the array is non-empty, all strings, unique, and sorted.

## BOUNDARY MODEL

All-false `boundaries` (incl. `approvedPlans`, `implementedIntentGo`) surfaced in
both views; `enforced: false` on zones; `executed: false` on hints. No approval,
no execution, no source write, no WorkOrder / VerificationPlan, no Circe,
intent:go deferred. Contract assertions 21, 23, 24 enforce this.

## CLI SMOKE

Fixture `task-context-export` (package.json + `src/index.ts` with `existing`,
`greet`, `marker`): `capability graph build` → `context task ... --path
src/index.ts --json` (agentContext present: doNotTouch / verificationHints /
boundaries) → same without `--json` (human brief: "Read this before editing." +
Core Context / Do Not Touch / Verification Hints) → `artifacts validate` (clean) →
`git diff -- src/index.ts` (empty).

## TESTS / VERIFICATION

- Contract: 26/26 pass.
- Docs: 16/16 pass.
- Full keyless 9-command gate: `npm test`, `npm run typecheck`, `npm run build`,
  `git diff --check`, audit-package-exports, audit-license, publish-dry-run,
  install-smoke, install-tarball-smoke.

## INTENTIONALLY UNTOUCHED

`TaskContextReport` schema / factory / validator / builder; retrieval, selection,
scoring, graph + lexical fallback; the strict no-index / no-path failure path
(still exits 1 with `context-retrieval-unavailable`); intent assess / plan review
task-context consumption.

## RISKS / FOLLOW-UP

- Risk: a downstream consumer parsing the human markdown by exact section title.
  Mitigation: the `# Task Context` H1 and `Report:` footer are preserved; the
  structured `agentContext` is the supported machine surface.
- Follow-up: optional `--format` flag and a dedicated export command remain
  deferred; revisit if a non-`--json` machine format is requested.

## NEXT STEP

Recommended: **TaskContextReport Human/Agent Export Safety Review** (docs-only).
Alternative: **TaskContextReport Workflow Integration Decision**.
