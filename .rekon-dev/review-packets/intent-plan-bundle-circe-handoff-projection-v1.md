# Review Packet — Intent Plan Bundle → Circe Handoff Projection Implementation (slice 99)

## CHANGES MADE

Product-capability batch. `buildIntentPlanBundle` (`@rekon/capability-docs`) now also
emits a Circe `rekon-circe-handoff` projection under each bundle's `circe/`
directory; `rekon intent bundle write` writes those files and surfaces them in its
output. No new artifact type, no canonical artifact mutation, no Circe execution.

## PUBLIC API CHANGES

- `BuildIntentPlanBundleInput` gains optional `repoRoot?` and `producerVersion?`
  (both additive; default `"."` / `null`). The renderer return shape is unchanged
  except that `result.files` now also contains the `circe/*` files and
  `result.manifest.circe` is added.
- CLI `intent bundle write` JSON output gains a `circe` block and
  `boundaries.runsCirce: false`.

## PURPOSE PRESERVATION CHECK

Rekon prepares and packages; Circe imports and orchestrates. The bundle was the final
non-executing handoff surface; the missing bridge was a Circe-importable projection.
This slice adds that projection while preserving every boundary: the projection is an
import adapter (not a second planner), derived from the bundle's canonical artifacts;
Rekon runs no Circe commands during bundle generation, executes nothing, writes no
source outside the bundle, mutates no canonical artifacts, and registers no new
artifact type; `implementerProfile` is omitted (Rekon does not invent operator
profiles); orchestration stays with Circe; `intent:go` stays deferred.

## CODEBASE-INTEL ALIGNMENT

Reuses the existing pure-renderer pattern (`buildIntentPlanBundle`), the existing
path-safety helpers (`slugifyIntentId`, `isSafeBundleRelativePath`), and the existing
CLI write loop (per-file containment). The per-phase WorkOrder / VerificationPlan use
the canonical Rekon artifact shapes already established by slices 90 / 93.

## CIRCE SOURCE ALIGNMENT

Grounded in the **actual Circe source** (not inferred from filenames):
`/Users/andrewlittrell/Code/Circe/src/adapters/rekon-handoff.ts`
(`RekonHandoffManifest` + `validateHandoffShape` + `normalizeHandoffManifest`),
`rekon-phase-plan-import.ts` (`normalizePhasePlan` / `readRekonPhasePlanFile`),
`rekon-phase-plan-validate.ts` (`validatePhasePlanShape`), and
`src/rekon/RekonTypes.ts` (`normalizeRekonWorkOrder` /
`normalizeRekonVerificationPlan`), plus the `valid-handoff` fixtures.

**The projection was validated against Circe's real normalizers** (run via `tsx`
over the current Circe TS source): `readRekonHandoffManifestFile`,
`readRekonPhasePlanFile`, `normalizeRekonWorkOrder`, and
`normalizeRekonVerificationPlan` all accepted a generated projection
(`handoff.json` workOrders=2 / verificationPlans=1 / warnings=1; `phase-plan.json`
phases=2 with profiles omitted; both per-phase WorkOrders; the VerificationPlan).
Circe's `circe rekon-handoff validate` was not run end-to-end (it needs an operator
workflow + config); the pure normalizers are the authoritative shape gate.

## PROJECTION MODEL

`circe/handoff.json`, `circe/phase-plan.json`,
`circe/work-orders/<phase-id>.work-order.json`, and (when requirements exist)
`circe/verification-plans/<phase-id>.verification-plan.json`. Manifest-relative paths
resolve inside `circe/`; `sourcePlanPath` is `../prepared-plan.md`.

## HANDOFF MANIFEST MODEL

`schemaVersion: 1` (number), `kind: "rekon-circe-handoff"`, `handoffId` (slug intent
id), `repoRoot` (CLI passes the resolved root; renderer default `"."`),
`sourcePlanPath: "../prepared-plan.md"`, `phasePlanPath: "phase-plan.json"`,
`producer: { system: "rekon", version }`, `status: "ready"`, `warnings[]`,
`artifacts.{workOrders,verificationPlans}[{phaseId, path, artifactId}]` (paths
relative to `circe/`; artifactId equals the projected file's `header.artifactId`).

## PHASE PLAN MODEL

`schemaVersion: 1`, `planId` (intent id), `repoRoot`, `phases[{ phaseId, title,
workOrderPath, verificationPlanPath? }]` — keys match Circe's `normalizePhasePlan`
exactly; no `kind` / `goal` on phases; `implementerProfile` omitted by default.

## WORKORDER PROJECTION MODEL

One per phase. Canonical Rekon WorkOrder: `header` (artifactType `"WorkOrder"`,
phase-derived `artifactId`, schemaVersion, generatedAt, inputRefs → PreparedIntentPlan
ref), non-empty `goal` (phase goal/title fallback), `paths` (phase paths),
`ownerSystems` (phase systems), `riskNotes` (phase constraints + resolved obligation
messages), `requiredChecks` (phase requirement commands), `successCriteria` (phase
requirement reasons), empty `relevantFindings`/`relevantMemory`/`remediationItems`,
`source: "intent-handoff"`.

## VERIFICATIONPLAN PROJECTION MODEL

Optional (omitted → handoff warning). Canonical Rekon VerificationPlan: `header`
(artifactType `"VerificationPlan"`), `workOrderRef` → the phase's WorkOrder
artifactId, `commands` (requirement commands, text only), `successCriteria`
(requirement reasons), `source: "intent-handoff"`. Never executed.

## PATH SAFETY

Phase ids are slugified (`slugifyIntentId`) and de-duplicated; every emitted `circe/*`
path passes `isSafeBundleRelativePath` (asserted in the renderer) and the CLI's
per-file post-resolve containment check. An unsafe phase id (e.g. `../../etc/passwd`)
slugifies to a safe segment; no projection path can escape the bundle directory.

## CLI SURFACE

`rekon intent bundle write …` (unchanged flags). Output adds the Circe handoff path +
per-kind counts (human) and a `circe` block + `boundaries.runsCirce: false` (JSON).
The command runs no Circe and writes only under the bundle directory.

## BOUNDARY MODEL

Rekon emits projection; Circe validates / imports / orchestrates. Projection vs
canonical artifacts (projection vs truth). No Circe command execution by default. No
source writes outside the bundle. No `intent:go`. No VerificationRun. No new artifact
type. No version bump / publish.

## TESTS / VERIFICATION

- `tests/contract/intent-plan-bundle.test.mjs`: 53 assertions (29 prior + 24 Circe).
- `tests/docs/intent-plan-bundle-circe-projection.test.mjs`: 10 assertions.
- External: Circe real normalizers accepted the projection (see CIRCE SOURCE
  ALIGNMENT).
- Full 9-command gate + CLI smoke (verifies circe files emitted; no source writes;
  `artifacts validate` clean).

## INTENTIONALLY UNTOUCHED

No Circe command execution, no Circe import, no Circe validation during bundle
generation, no `intent:go`, no VerificationRun, no command execution, no source writes
outside the bundle, no canonical artifact mutation, no new artifact type, no version
bump, no npm publish, no branch.

## RISKS / FOLLOW-UP

- `producer.version` is a CLI literal (`0.1.0-beta.0`); a shared version constant is a
  follow-up.
- Per-phase requirement association uses phase `verificationRequirements` ids, falling
  back to all plan requirements only for a single (or fallback) phase; multi-phase
  plans whose phases omit requirement ids will warn per phase.
- `implementerProfile` is omitted in v1; a configurable mapping is a follow-up.
- End-to-end `circe rekon-handoff validate` (with a workflow) is left to the
  operator / CI.

## NEXT STEP

Intent Plan Bundle → Circe Handoff Projection Safety Review.
