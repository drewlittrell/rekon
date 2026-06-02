# Review Packet — Fresh Repo Intent Handoff / Circe Dogfood Review (Semantic Re-run, slice 140)

Base: `cf1118f`. System dogfood / review batch. Re-runs the slice-136 fresh-repo
intent-handoff dogfood with semantic mode and a real local Circe import.

## CHANGES MADE

- `@rekon/capability-docs/src/intent-plan-bundle.ts`: one additive line — the
  `rekon-proof.json` `gates` block now carries `runsCirce: false` alongside
  `sourceWriteAllowed: false` / `commandsExecuted: false` / `intentGoDeferred: true`.
- New contract test `tests/contract/fresh-repo-intent-handoff-circe-dogfood.test.mjs`
  (32 assertions) and docs test
  `tests/docs/fresh-repo-intent-handoff-circe-dogfood-review-semantic.test.mjs`
  (14 assertions).
- New strategy doc
  `docs/strategy/fresh-repo-intent-handoff-circe-dogfood-review-semantic.md` and
  this review packet; 12 supporting docs + CHANGELOG cross-referenced.

## PUBLIC API CHANGES

- None to any kernel artifact type, validator, or CLI flag. The bundle's
  `circe/rekon-proof.json` gains an additive `gates.runsCirce: false` field;
  Circe tolerates extra fields, so this is backward compatible.

## PURPOSE PRESERVATION CHECK

- **Original concern:** Rekon rebuilt the plan compiler + proof/handoff
  infrastructure and added semantic provider routing; before npm publish /
  broader v1, the full operator path needs a realistic dogfood proving semantic
  parsing stays proposal-not-proof and Rekon still prepares/proves/packages
  without executing or writing source.
- **This batch:** rough plans are reviewed and repaired through public Rekon
  commands; semantic provider routing is explicit and bounded; deterministic
  recheck stays authoritative; approval and status transition stay explicit;
  handoff generation stays downstream and gated; the bundle is Circe-importable;
  source + plan files stay unchanged. All verified end-to-end.

## SOURCE REVIEW

Reviewed `packages/cli/src/index.ts` (the eleven intent subcommands +
`createPlanSemanticNormalizationAdapter`), `packages/llm-provider/src/index.ts`,
`packages/capability-model/src/intent-plan-actionability-report.ts`, the prepared
-plan / approval / status-transition / work-order / verification-plan handoff
seams, `packages/capability-docs/src/intent-plan-bundle.ts` (the `rekonProof`
projection), and the slice-136 / slice-139 contract tests.

**Filename note (WO collision):** slice 136 already shipped
`docs/strategy/fresh-repo-intent-handoff-circe-dogfood-review.md`, its review
packet, its docs test, and `tests/contract/fresh-repo-intent-handoff-dogfood.test.mjs`.
To avoid clobbering slice-136 deliverables (whose docs test pins those paths),
this slice uses the `-semantic` suffix for the strategy doc / packet / docs test
and `fresh-repo-intent-handoff-circe-dogfood.test.mjs` for the contract test.

## DOGFOOD SCENARIO

A fresh temp repo with `package.json` (typecheck/test/build scripts +
typescript devDependency), `tsconfig.json`, `src/index.ts` (an `existing`
constant and a `greet` function), `test/index.test.ts`, and a deliberately rough
`plans/add-marker-rough.md` (TODO-laden, with explicit non-goals).

## END-TO-END PROOF

All public commands ran in sequence: scan, intent context prepare, plan review
(off/auto/required), plan answer, assess, prepare, status, approve, status
transition (work-ready), work-order generate, verification-plan generate, bundle
write, artifacts validate. Rough review = blocked (8 questions); answered review
= actionable; source report byte-unchanged after answer; source + plan files
unchanged end-to-end; validate clean. Captured by the 32-assertion contract test.

## SEMANTIC FALLBACK PROOF

With no API key: `off` writes a deterministic report; `auto --llm-provider
openai` writes a `deterministic-fallback` report with a warning (2 reports after
off+auto); `required --llm-provider openai` exits non-zero and writes no report
(report count stays 2).

## BUNDLE / CIRCE PROJECTION REVIEW

Bundle emitted `circe/handoff.json`, `circe/phase-plan.json`,
`circe/rekon-proof.json`, 2 per-phase WorkOrders, 2 per-phase VerificationPlans.
Proof `gates`: `sourceWriteAllowed: false`, `commandsExecuted: false`,
`runsCirce: false`, `intentGoDeferred: true`. `approval.reasons` carries the
accepted-risk codes. Phase posture explicit; needs-review/manual phases marked.

## OPTIONAL LIVE LLM DOGFOOD

Not run — no API key configured; the live path is opt-in
(`REKON_RUN_LIVE_LLM_TESTS=1` + key). Non-blocking. Real adapter proven offline
in slice 139.

## OPTIONAL CIRCE VALIDATION

Run from outside Rekon against a local Circe checkout, into an isolated store:
`circe import rekon-phase-plan` → `ok: true` (ordered native work items; verify
phase blocked on implement phase); `circe import rekon-work-order` → `ok: true`
(WorkOrder + VerificationPlan accepted; idempotent `source_exists`). The Rekon
bundle is Circe-importable. This Circe build exposes `import rekon-phase-plan` /
`import rekon-work-order`, not the `rekon-handoff` command referenced in the WO;
recorded as a non-blocking naming/version gap.

## EMBEDDED SAFETY REVIEW

The dogfood review does not introduce a new execution/source-write/Circe
boundary; it reviews the already-shipped public path end-to-end. The single code
change (`runsCirce: false`) makes an already-true boundary explicit and does not
change behavior. No separate safety-review slice is required.

## SEMANTIC PROVIDER BOUNDARY

Provider output is proposal-not-proof: schema-gated by `coercePhaseDrafts` and
deterministically re-checked. With no key the provider refuses cleanly and the
router falls back (auto) or fails (required). API keys are read from env by the
CLI only; never in repo config, never in capability-model. Unchanged.

## PLAN REVIEW BOUNDARY

`intent plan review` writes exactly one report, mutates no source/plan, and
creates no downstream artifacts. Unchanged.

## ANSWER / MERGE-BACK BOUNDARY

`intent plan answer` writes a new report revision, leaves the source report
byte-unchanged, and does not touch the plan file. Verified by digest. Unchanged.

## PREPARE INTEGRATION BOUNDARY

`intent prepare --actionability-report` consumes the actionable report and writes
a `PreparedIntentPlan` that is **not** auto-approved (approval status is not
`approved` before `intent approve`). Unchanged.

## APPROVAL BOUNDARY

`intent approve` requires explicit `--accept` gap codes + reason; it records
accepted risks into the prepared plan / proof. No auto-approve. Unchanged.

## STATUS TRANSITION BOUNDARY

`intent status transition --to work-ready` requires the approved plan + previous
status + reason; WorkOrder / VerificationPlan generation gates on work-ready.
Unchanged.

## HANDOFF BOUNDARY

WorkOrder and VerificationPlan generation succeed only from an approved,
work-ready plan; both are downstream artifacts, not source writes. Unchanged.

## BUNDLE / CIRCE PROJECTION BOUNDARY

`intent bundle write` is a passive projection: it writes the bundle directory and
the `circe/` projection, executes no commands, runs no Circe, and writes no
source. The proof gates make this explicit. Unchanged behavior; `runsCirce: false`
added as an explicit field.

## TESTS / VERIFICATION

- Contract: `tests/contract/fresh-repo-intent-handoff-circe-dogfood.test.mjs` (32).
- Docs: `tests/docs/fresh-repo-intent-handoff-circe-dogfood-review-semantic.test.mjs` (14).
- Full 9-command gate green; the dogfood scenario + (non-blocking) Circe import
  were run by hand and captured here.

## INTENTIONALLY UNTOUCHED

- No new artifact family, no plan-compiler redesign, no provider architecture, no
  embeddings, no execution behavior, no Circe execution from Rekon, no `intent:go`.
- No version bump, no npm publish, no branch.
- Slice-136 deliverables left intact (distinct `-semantic` names used).

## RISKS / FOLLOW-UP

- Live LLM dogfood is unverified (operator-gated) — gather once a key is
  available.
- Circe's rekon import command naming (`import rekon-phase-plan` /
  `rekon-work-order` vs the WO's `rekon-handoff`) should be reconciled before a
  broader release; it is a Circe-side surface, not a Rekon blocker.

## NEXT STEP

**V1 Publish Readiness Reconciliation / npm Release Decision** — reconcile
post-v1-tag work, decide whether current main is the real publish candidate,
decide package metadata / npm publish / version + tag policy. If this dogfood had
exposed a blocker, a single blocker-specific fix slice only. Do not start without
a new confirmed Work Order against the new SHA.
