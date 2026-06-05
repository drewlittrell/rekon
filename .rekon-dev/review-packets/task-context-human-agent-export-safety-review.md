# Review Packet — TaskContextReport Human/Agent Export Safety Review (slice 178)

Base `b0e80b9`. Strategy / safety-review batch. Docs-only — reviews the slice-177
`rekon context task` human/agent export. No runtime change, no source change, no
CLI smoke.

**Base note:** `b0e80b9` ("fix: harden source scan traversal") landed after slice
177 and before this safety review. It is out of scope for this review because it
touches source scan traversal in `capability-js-ts`, not the TaskContextReport
human/agent export presentation layer. The slice-177 export subject is intact at
`b0e80b9`.

## CHANGES MADE

- `docs/strategy/task-context-human-agent-export-safety-review.md` — NEW memo.
- `.rekon-dev/review-packets/task-context-human-agent-export-safety-review.md` —
  NEW (this file).
- `tests/docs/task-context-human-agent-export-safety-review.test.mjs` — NEW, 25
  assertions.
- Cross-ref pointers added to the slice-177 memo, broader-workflow decision,
  task-context v1 / artifact / concept docs, the intent dogfood safety review,
  the two v1 release docs, README, CHANGELOG, and the two roadmaps.
- No source, test (contract), or runtime files changed.

## PUBLIC API CHANGES

None. This batch is documentation only. `rekon context task`, the
`TaskContextReport` artifact, and every package export are unchanged.

## PURPOSE PRESERVATION CHECK

The slice-177 purpose — present the existing `TaskContextReport` to humans and
agents without changing artifact semantics — is preserved. The report stays
context, not proof; human markdown is a rendered view; agentContext JSON is
structured context, not authority; verification hints remain hints; do-not-touch
zones remain guidance; evidence refs are preserved; no source is written and no
command is executed. This review confirms the shipped code matches that purpose.

## CODEBASE-INTEL ALIGNMENT

The conceptual ancestor (`codebase-intel`) split orientation from implementation
and produced human-readable context bundles plus an agent context output. The
slice-177 export mirrors that split: a human "read this before editing" brief and
a structured `agentContext` block, both derived from one canonical report and
both explicitly non-authoritative. The export adds the presentation surface
codebase-intel implied while keeping Rekon's stricter boundary model (all-false
boundaries, hints-not-executed, guidance-not-enforced).

## IMPLEMENTATION REVIEWED

`packages/cli/src/index.ts` `context task` branch (shared presentation block,
`--json` payload, human renderer, `usage()` line);
`packages/capability-model/src/task-context-report.ts` + `task-context.ts`
(builder + shapes); `packages/kernel-repo-model/src/index.ts`
(`TaskContextReport` type + `createTaskContextReport` all-false factory +
validator). Confirmed the presentation reads `report.*` only, with no fs write
(beyond the already-persisted report), no child process, and no network call.

## HUMAN MARKDOWN REVIEW

`# Task Context` → blockquote "Read this before editing." → `Task:` (+ optional
`Goal:` / `Paths:`) → always-rendered `## Core Context`,
`## Related / Supporting Context`, `## Do Not Touch` ("(guidance, not enforced)"),
`## Verification Hints` ("(hint, not executed)"), `## Evidence` (deduped/sorted),
each with `(none)` fallback → conditional `## Warnings` → boundary footer with
`--json` pointer → `Report: <id>`. Rendered view; no authority asserted.

## AGENT JSON REVIEW

`agentContext = { readBeforeEditing, task, coreContext[], supportingContext[],
doNotTouch[] (enforced:false), verificationHints[] (executed:false), warnings[],
evidence[], boundaries }`. Additive: all pre-existing top-level keys preserved;
`agentContext` inserted before `note`. Items carry `ref, kind, source, reason,
evidenceRefs` (+ optional path/symbolId/capabilityId/score/scoreBand).

## EVIDENCE REVIEW

`evidence` = deduped, sorted union of every context item / zone / hint
`evidenceRefs`. Per-item `evidenceRefs` remain intact in the existing JSON.
Nothing dropped or invented. Contract assertion 20 enforces non-empty / strings /
unique / sorted.

## BOUNDARY REVIEW

All-false `boundaries` (incl. `approvedPlans`, `implementedIntentGo`) surfaced in
both views; `enforced:false` on zones; `executed:false` on hints. No approval, no
execution, no source write, no WorkOrder / VerificationPlan, no Circe; intent:go
deferred. Factory forces the all-false boundaries; the validator rejects any
non-false value.

## RECOMMENDATION

Declare the export safe/stable. Next: **TaskContextReport Workflow Integration
Decision**. Alternative (only if a defect were found, none was):
**TaskContextReport Human/Agent Export Quality Fix**.

## TESTS / VERIFICATION

- New docs test: 25/25.
- Existing slice-177 contract (26) + docs (16) tests remain green.
- Full keyless 9-command gate: `npm test`, `npm run typecheck`, `npm run build`,
  `git diff --check`, audit-package-exports, audit-license, publish-dry-run,
  install-smoke, install-tarball-smoke. No CLI smoke (docs-only).

## INTENTIONALLY UNTOUCHED

`rekon context task` runtime code; `TaskContextReport` schema / factory /
validator / builder; retrieval / selection / scoring / fallback; the strict
no-index / no-path failure path; intent assess / plan review consumption;
`b0e80b9` source scan traversal (out of scope).

## RISKS / FOLLOW-UP

- Risk: a downstream consumer parsing the human markdown by exact section title.
  Mitigation: the `# Task Context` H1 and `Report:` footer are preserved; the
  structured `agentContext` is the supported machine surface.
- Follow-up: the Workflow Integration Decision should define generation/requirement
  policy; `--format` and a dedicated export command remain deferred.

## NEXT STEP

Recommended: **TaskContextReport Workflow Integration Decision**.
