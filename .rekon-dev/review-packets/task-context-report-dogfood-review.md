# Review Packet — TaskContextReport Dogfood Review (slice 168)

Base `503b632`. Product dogfood / review batch. One tiny output-visibility fix; no
new architecture, no artifact-model change, no selection-logic change.

## CHANGES MADE

- `packages/cli/src/index.ts` — `rekon context task` now appends a
  `retrieval-low-signal` warning when retrieval ran (cache + provider present) but
  every neighbor scored below the useful band, instead of returning a silent
  `status: "ok"` empty result. Visibility only; selection unchanged.
- `docs/strategy/task-context-report-dogfood-review.md` (NEW) — dogfood memo:
  two scenarios, honest results, 20 review questions answered, recommendation.
- `.rekon-dev/review-packets/task-context-report-dogfood-review.md` (NEW) — this packet.
- `tests/contract/task-context-report-dogfood.test.mjs` (NEW, 25 assertions) — both
  scenarios end-to-end (explicit path + retrieval/graph) with the low-signal probe.
- `tests/docs/task-context-report-dogfood-review.test.mjs` (NEW, 14 assertions).
- Cross-ref updates to the existing TaskContextReport doc set + releases + roadmaps
  + README narrative + CHANGELOG.

## PUBLIC API CHANGES

None. No new artifact type, no new CLI command, no new flags, no changed types. The
only behavioral change is an additional advisory string in the existing
`warnings[]` array of `rekon context task` output (both JSON and human). The
`retrieval-low-signal` string does not contain `retrieval-unavailable`, so existing
consumers/tests keying on that substring are unaffected.

## PURPOSE PRESERVATION CHECK

- Original problem: raw embedding nearest-neighbor output is not the product;
  TaskContextReport converts graph facts + retrieval neighbors + operator
  constraints into compact task-shaped context, and the safety review proved it
  stays within boundaries. This batch asks whether it is *useful*.
- Product guarantee preserved: task context remains proposal/context; evidence refs
  remain visible; do-not-touch zones are guidance; verification hints are hints, not
  executed commands; source files are unchanged; no proof/approval semantics are
  introduced. The low-signal warning *strengthens* honesty by making an empty
  retrieval result visible rather than silently "ok".
- CapabilityEvidenceGraph remains the evidence substrate; task-shaped context only
  points at it.

## SOURCE REVIEW

- `packages/kernel-repo-model/src/index.ts` — TaskContextReport type / factory /
  validator / schema unchanged; re-confirmed factory forces boundaries false +
  recomputes summary, validator rejects non-false boundaries / empty task text /
  reasonless context items.
- `packages/capability-model/src/task-context-report.ts` — `buildTaskContextReport`
  unchanged; pure (imports only `node:crypto`); no providers / commands / source
  writes / PreparedIntentPlan / WorkOrder / VerificationPlan.
- `packages/capability-model/src/capability-evidence-graph.ts`,
  `packages/capability-model/src/embedding-index.ts` — read for grounding; the
  ranking policy (strong/useful/weak/ignored) and graph claim shapes match the
  builder's expectations.
- `packages/cli/src/index.ts` — `context task` branch reviewed end-to-end; the only
  edit is the additive low-signal warning placed after the report is built and
  before `store.write`.

## DOGFOOD SCENARIOS

- A — explicit path / local edit: `--path src/index.ts`, no embeddings.
- B — embedding retrieval + graph expansion: mock embedding index over a 6-file
  repo (users / orders / sms / unrelated); pure-retrieval and `--path`-seeded probes.

## EXPLICIT PATH RESULT

Useful and reliable. 4 context items (1 operator path + 3 deterministic graph
claims), 1 do-not-touch ("Do not change greet behavior."), 2 verification hints
(`npm run typecheck`, `npm test`), 1 graph node / 3 claims, evidence refs present,
boundaries all false, clean `# Task Context` markdown, artifacts valid, source +
tests unchanged.

## RETRIEVAL RESULT

Low-signal with the lexical mock provider. Pure retrieval selected 0 context items
(all neighbors below the useful band) and now records the `retrieval-low-signal`
warning; do-not-touch was still extracted from the task text. The `--path`-seeded
probe immediately produced SMS context items, graph nodes/claims, and evidence
refs, confirming the gap is the provider's semantic signal — not the artifact,
builder, or CLI. Live Voyage (slice 162: 0.75–0.81 same-domain paraphrase) is the
right way to evaluate the retrieval path.

## HUMAN OUTPUT REVIEW

Readable and scannable: task echo, Core Context, Related Context (when present), Do
Not Touch, Verification Hints, plus warnings. Degrades gracefully in the low-signal
case (do-not-touch + warning, no invented context). Human markdown usefulness was
reviewed and judged good.

## AGENT JSON REVIEW

Exact and complete for agents: task / selection / summary / contextItems (kind,
source, path|symbolId, scoreBand, reason, evidenceRefs) / graphNeighborhood /
doNotTouch / verificationHints / warnings / all-false boundaries. Agent JSON
usefulness was reviewed and judged good.

## DO-NOT-TOUCH REVIEW

Both scenarios extracted the explicit "Do not change …" constraint into a
`doNotTouch` zone with a readable reason. Zones are advisory guidance/context, not
enforcement — nothing blocks edits.

## VERIFICATION HINT REVIEW

Scenario A produced `npm run typecheck` + `npm test` hints with empty evidence refs
and `executedCommands` false. Scenario B exposed the keyword-based extraction gap:
"Verify routing behavior" produced no hint. Hints are hints, never executed.
Broadening extraction is the headline of the recommended selection-quality fix.

## EVIDENCE REVIEW

evidenceRefs were inspected: deterministic graph items preserve the claim id;
embedding items (when present) preserve the chunk id. Refs flow through from the
CapabilityEvidenceGraph unchanged — every proposal stays traceable.

## BOUNDARY MODEL

All boundaries held in both scenarios: no source writes, no command execution, no
Circe, no PreparedIntentPlan / WorkOrder / VerificationPlan, no approval, no
intent:go; retrieval is proposal/context, not proof; deterministic graph facts
outrank embedding similarity.

## TESTS / VERIFICATION

- New contract test (25 assertions) — both scenarios, low-signal probe, all
  boundary checks.
- New docs test (14 assertions).
- Full keyless 9-command gate: `npm test`, typecheck, build, `git diff --check`,
  audit-exports, audit-license, publish-dry-run, install-smoke, install-tarball-smoke.
- CLI dogfood: both scenarios run against the built CLI.
- Live Voyage: not run this batch (optional / non-blocking; no env opt-in).

## INTENTIONALLY UNTOUCHED

Verification-hint extraction logic, ranking thresholds, graph expansion bounds,
artifact model, provider architecture, intent prepare, duplicate detection,
canonical recommendations, ANN/HNSW. All deferred per scope.

## RISKS / FOLLOW-UP

- Retrieval path is provider-bound; mock is insufficient for semantic evaluation →
  run a live Voyage dogfood before relying on retrieval for intent context.
- Verification-hint extraction misses free-form intent → broaden in the
  selection-quality fix.
- Low risk overall: the only code change is an additive advisory warning.

## NEXT STEP

**TaskContextReport Selection Quality Fix** — broaden verification-hint extraction +
live-provider retrieval dogfood (and decide on weak-band surfacing), keeping every
boundary intact. Then **TaskContextReport Intent Integration Decision**.
