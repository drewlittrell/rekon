# Review Packet — Intent Planning UX / Context Quality Fix

Slice 175 · product capability batch · base `f210b1c`.

Fixes the one carried ergonomics issue from the TaskContextReport intent dogfood:
`rekon context task` with an existing embeddings index, no `--path`, and an
implicitly-defaulted provider whose key is missing exited non-zero. It now
degrades gracefully to a graph + lexical context fallback, while explicit-provider
failures stay strict.

## CHANGES MADE

- `packages/capability-model/src/task-context-report.ts` — added a pure
  `selectLexicalGraphContextPaths(taskText, graph, {limit})` helper (+
  `DEFAULT_LEXICAL_FALLBACK_LIMIT`) and an opt-in `lexicalContextPaths` input to
  `buildTaskContextReport`, surfaced as `deterministic_graph` context items and
  expanded like any selected path.
- `packages/capability-model/src/index.ts` — re-export the new helper + constant.
- `packages/cli/src/index.ts` (`context task` branch) — distinguish explicit vs
  implicit provider; track whether an embedding call failed; on no-retrieval +
  no-`--path`, degrade to the graph + lexical fallback for IMPLICIT failures while
  keeping EXPLICIT failures strict; add `provider-unavailable` /
  `graph-lexical-fallback` warnings and a `retrieval` status field to the JSON.
- New `tests/contract/intent-planning-ux-context-quality.test.mjs` (19 assertions),
  new `tests/docs/intent-planning-ux-context-quality-fix.test.mjs` (12 assertions),
  new `docs/strategy/intent-planning-ux-context-quality-fix.md`, this packet, plus
  cross-ref doc updates + CHANGELOG + README.

## PUBLIC API CHANGES

Additive only: a new exported pure helper `selectLexicalGraphContextPaths` and an
optional `lexicalContextPaths` field on `BuildTaskContextReportInput`. No new
artifact, no new CLI command, no removed/renamed flag, no version change. The
`context task` JSON gains additive `providerExplicit` + `retrieval` fields and two
new warning codes.

## PURPOSE PRESERVATION CHECK

TaskContextReport is task-shaped *context*, proposal/context, never proof. The fix
makes one brittle implicit-provider case degrade gracefully instead of failing; it
does not change the trust model. The lexical fallback only surfaces nodes that
already exist in the deterministic graph (selection is lexical; the nodes are
facts), and fails cleanly rather than fabricating context when nothing matches.
Explicit provider failures remain visible and strict.

## SOURCE REVIEW

Grounded in the real `context task` branch (`packages/cli/src/index.ts`), the pure
builder (`task-context-report.ts`), the embedding provider resolver
(`llm-provider/src/index.ts`, which returns `{ ok: false, error: "missing-api-key" }`
and makes no network call on a missing key — it never throws), and the existing
contract tests. The pre-fix hard-fail lived at the no-retrieval/no-`--path`
junction and triggered regardless of provider explicitness; the builder only
expanded graph context around already-selected paths, so with no `--path` and no
retrieval it surfaced no file/symbol/capability context.

## PROVIDER DEFAULT BEHAVIOR

`context task` defaults the provider to `voyage` when `--provider` is omitted
(implicit). The fix records `providerExplicit` and `providerCallFailed`; only an
implicit call that failed triggers the fallback. The no-index case makes no
provider call, so it is unchanged (still fails cleanly).

## GRAPH / LEXICAL FALLBACK

`selectLexicalGraphContextPaths` tokenizes the task text (drops short/structural
words), matches against graph file-node path tokens plus implementing-capability
label tokens, ranks by overlap then lexicographically, caps at the default limit,
and returns `[]` on no match. Pure: reads no files, calls no providers, executes
nothing. Matched paths feed `buildTaskContextReport` as `lexicalContextPaths`,
surfaced as `deterministic_graph` items with a clear fallback reason and expanded
into connected claims/capabilities.

## EXPLICIT PROVIDER STRICTNESS

`--provider voyage` (or any explicit provider) with a missing key + no `--path`
still exits non-zero with `context-retrieval-unavailable` and `providerExplicit:
true`. The fallback never hides an explicit operator choice.

## DOGFOOD RESULT

Ran the WO's exact fixture (`route-message.ts`, `profile.ts`, graph build, mock
index). Critical case (implicit, missing key, no `--path`): `status: partial`,
`retrieval: { status: "fallback", fallback: "graph-lexical" }`, surfaced
`src/sms/route-message.ts` (matched "sms") + `src/users/profile.ts` (matched
"profile") with `provider-unavailable` + `graph-lexical-fallback` warnings, exit 0.
Explicit `--provider voyage` (missing key): exit 1, `context-retrieval-unavailable`.
`artifacts validate` clean. Source unchanged.

## BOUNDARY MODEL

Task context stays proposal/context, not proof; verification hints stay hints, not
executed commands; no source writes; no command execution; no PreparedIntentPlan /
WorkOrder / VerificationPlan / VerificationRun; no Circe; intent:go deferred.
Deterministic graph facts still outrank embedding similarity.

## TESTS / VERIFICATION

19-assertion contract test + 12-assertion docs test + full keyless 9-command gate +
CLI dogfood. Existing task-context contract tests (103) remain green, including the
no-index/no-`--path` strict-fail test.

## INTENTIONALLY UNTOUCHED

`intent assess` / `intent plan review` behavior; prepare / approval / status /
handoff gates; the TaskContextReport artifact schema, factory, and validator; the
embedding provider architecture; artifact registration; versions.

## RISKS / FOLLOW-UP

- The lexical fallback is a conservative heuristic (token overlap). A real
  embedding provider remains the higher-signal path; the fallback is honestly
  labelled low-confidence graph context.
- Follow-up: **TaskContextReport Broader Workflow Decision** (broader agent/operator
  use is now unblocked); alternative **Intent Planning UX / Context Quality Safety
  Review**.

## NEXT STEP

Ship slice 175. Then **TaskContextReport Broader Workflow Decision**.
