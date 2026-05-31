# Review Packet — Intent Plan Bundle → Circe Handoff Projection Safety Review (slice 100)

## CHANGES MADE

Strategy / safety-review batch — no runtime behavior change. Adds the safety-review
memo, this review packet, a 19-assertion docs test, and cross-reference footers /
CHANGELOG / README pointers. No source files changed; no projection behavior changed.

## PUBLIC API CHANGES

None. No helper, type, CLI flag, artifact shape, or projection behavior changed.

## PURPOSE PRESERVATION CHECK

Rekon prepares and packages; Circe imports and orchestrates. The Circe projection is an
import adapter, not a second planner. This review confirms the projection preserves that
boundary — schema-valid, runs no Circe, executes nothing, writes no source, mutates no
canonical artifacts, `intent:go` deferred — and surfaces the one place the purpose is at
risk: the projection does not yet carry Rekon's approval/proof gate state into `circe/`,
so it preserves the boundary but not (yet) the full proof. The review records that gap
and keeps `intent:go` blocked until proof/gate state survives the projection.

## CODEBASE-INTEL ALIGNMENT

Grounded in the shipped slice-99 code (`packages/capability-docs/src/intent-plan-bundle.ts`
`renderCirceProjection` + `buildIntentPlanBundle` wiring; `packages/cli/src/index.ts`
`intent bundle write`) and the real Circe schema (`src/adapters/rekon-handoff.ts`,
`rekon-phase-plan-import.ts`, `rekon-phase-plan-validate.ts`, `src/rekon/RekonTypes.ts`).
Re-reading confirmed `renderCirceProjection` receives only `planRef`, `phases`,
`requirements`, `obligations` (plus ids/versions) — not the approval/proof envelope, the
IntentStatusReport, or the freshness/drift inputs.

## HELPER / CLI REVIEWED

`buildIntentPlanBundle` / `renderCirceProjection` (pure renderer; reads no files, writes
none, runs no commands, mutates no input) and `rekon intent bundle write` (writes
`circe/` files only under the bundle directory with per-file path safety; surfaces the
Circe handoff path / counts + `boundaries.runsCirce: false`; runs no Circe).

## CIRCE SCHEMA VALIDATION REVIEW

The projection matches Circe's `rekon-circe-handoff` schema, proven against Circe's own
normalizers (`readRekonHandoffManifestFile`, `readRekonPhasePlanFile`,
`normalizeRekonWorkOrder`, `normalizeRekonVerificationPlan`) for both a hand-crafted and
a real-pipeline projection in slice 99. `handoff.json` is `schemaVersion: 1`, `kind:
"rekon-circe-handoff"`, `producer.system: "rekon"`, `status: "ready"`; phase-plan uses
`phaseId` / `workOrderPath` / `verificationPlanPath`; per-phase files are canonical Rekon
shapes.

## PROJECTION SURFACE REVIEW

`circe/handoff.json`, `circe/phase-plan.json`, `circe/work-orders/<phase-id>.work-order.json`,
and (when requirements exist) `circe/verification-plans/<phase-id>.verification-plan.json`;
manifest gains an additive `circe` section. A phase with no requirement omits its
VerificationPlan and records a warning.

## PROOF / GATE TRACEABILITY REVIEW

**Finding (gap, not blocker).** Carried: phase id (phase-plan + filenames), obligations
(WorkOrder riskNotes), constraints (riskNotes), verification-requirement content
(commands / successCriteria), and the PreparedIntentPlan ref (WorkOrder inputRefs). NOT
carried into `circe/`: the PreparedIntentPlan `approval` / `proof` envelope (including
`sourceWriteAllowed === false`), the `IntentStatusReport` gate status (`handoff.status`
is the literal `"ready"`), the verification-requirement literal ids, the freshness /
drift refs, and explicit per-phase boundary flags. Enough survives to schedule work; not
enough to prove gate-approval / source-write-restriction from `circe/` alone.

## PATH SAFETY REVIEW

Slug-safe, de-duplicated phase ids; every `circe/*` path passes `isSafeBundleRelativePath`
plus the CLI's per-file containment check; adversarial phase ids slugify to safe
segments; no absolute paths, no traversal, no escape. Contract assertions cover all four
file kinds + the unsafe-phase-id case.

## REKON / CIRCE BOUNDARY

Rekon emits projection; Circe validates / imports / orchestrates. Projection vs canonical
artifacts (projection vs truth); orchestration JSON vs Markdown review files; no Circe
command execution by default; import handoff, not execution; no source writes outside the
bundle.

## COMMAND / SOURCE-WRITE BOUNDARY

Pure renderer; CLI's only effect is `mkdir` / `writeFile` under the bundle directory.
Commands are projected as text, never executed. No `circe` process spawned
(`boundaries.runsCirce: false`). No source writes outside the bundle. No canonical
artifact created; `rekon artifacts validate` stays clean.

## INTENT GO BOUNDARY

`intent:go` remains deferred and unimplemented. Because approval/proof and the
IntentStatusReport gate status do not survive into the projection, the execution boundary
cannot be honestly discussed from `circe/` alone. **If proof/gate traceability is
incomplete, intent:go must remain blocked** — and it is.

## RECOMMENDATION

The projection is **safe/stable as a Circe import adapter** (no blocker). Proof/gate
traceability is **incomplete**, so per the stricter posture the next slice is **Intent
Plan Bundle → Circe Proof/Gate Projection Enrichment**, not the Intent Go / Execution
Boundary Decision. Do not begin the execution-boundary decision until proof/gate state
survives into the projection.

## TESTS / VERIFICATION

- New `tests/docs/intent-plan-bundle-circe-handoff-projection-safety-review.test.mjs`
  (19 assertions).
- Full gate: typecheck, test (full suite), build, `git diff --check`,
  audit-package-exports, audit-license, publish-dry-run, install-smoke,
  install-tarball-smoke. No CLI smoke (strategy-only batch).

## INTENTIONALLY UNTOUCHED

No projection behavior change, no proof/gate enrichment, no `circe/*` writes, no Circe
execution, no `intent:go`, no VerificationRun, no command execution, no source writes, no
canonical artifact mutation, no new artifact type, no version bump, no publish, no branch.

## RISKS / FOLLOW-UP

- Approval/proof envelope + IntentStatusReport gate status + freshness/drift refs must be
  carried into the projection before any execution-boundary discussion (the enrichment
  slice). Candidate surfaces: `circe/rekon-proof.json`, per-phase gate metadata, a
  handoff-manifest pointer if the Circe schema permits.
- Verification-requirement literal ids are not projected (only content); the enrichment
  slice should add them for full requirement traceability.
- `implementerProfile` omitted by default (a configurable mapping is a follow-up).

## NEXT STEP

Intent Plan Bundle → Circe Proof/Gate Projection Enrichment.
