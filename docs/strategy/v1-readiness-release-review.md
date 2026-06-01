# V1 Readiness / Release Review

## Decision Summary

V1 readiness is **conditionally approved** for the non-executing Rekon → Circe
prepared-plan handoff. The product surface — assess → prepare → status → WorkOrder
handoff → VerificationPlan handoff → plan bundle → Circe proof/gate projection, all
discoverable from top-level help — is complete, individually safety-reviewed, and proven
end-to-end against a real Circe import + serve loop. **V1 means prepare/prove/package/export,
not Rekon-side execution.** Conditional approval means this review may declare the product
surface ready, but a separate release-mechanics / versioning slice is still required before
any tagged release or npm publish; this batch bumps nothing, tags nothing, and publishes
nothing.

The fifteen readiness questions, answered:

1. **What does V1 mean for Rekon?** A stable system that assesses intent, prepares a
   proof-approved plan, reports status, generates a WorkOrder and a VerificationPlan,
   writes a human/agent plan bundle, and writes a Circe-compatible proof/gate projection —
   then hands execution to Circe. V1 is *prepare/prove/package/export*, not execution.
2. **Is V1 scoped to prepare/prove/package/export?** Yes.
3. **Is Circe the execution/orchestration owner for V1?** Yes — **Circe owns
   orchestration for V1.**
4. **What artifacts are included in V1?** IntentAssessmentReport, PreparedIntentPlan
   (with approval/proof envelope), IntentStatusReport, WorkOrder (intent handoff),
   VerificationPlan (intent handoff), the plan bundle, and the Circe proof/gate
   projection. See the surface table.
5. **What commands are included in V1?** `rekon intent assess` / `prepare` / `status` /
   `work-order generate` / `verification-plan generate` / `bundle write`. See the command
   table.
6. **What proof shows the Rekon → Circe path works?** The full Rekon test suite + package
   gates pass at `c5e0337`; Circe handoff schema validation passes against Circe's real
   normalizers; and the external serve-loop proof
   (`rekon-intent-handoff-serve-loop.test.ts`, run with `CIRCE_REKON_INTENT_CLI_PATH`
   pointed at the built Rekon CLI) passed **pass 1 / fail 0**, covering the rich command
   surface, bundle generation, Circe validate/routes/import, and `circe serve --mode
   worker` dispatching, committing, continuing, and stopping every generated phase. See
   the proof table.
7. **What safety reviews have passed?** Eight: IntentAssessmentReport,
   PreparedIntentPlan, IntentStatusReport, WorkOrder handoff, VerificationPlan handoff,
   Agent Handoff bundle, Circe Handoff Projection, and Circe Proof/Gate Projection (the
   last re-reviewed with the serve-loop proof recorded).
8. **What is explicitly excluded from V1?** `intent:go`, Rekon-side command execution,
   Rekon-side source writes, and Rekon-side VerificationRun / VerificationResult
   generation. See the excluded section.
9. **Is intent:go included?** No. **intent:go remains deferred beyond V1.**
10. **Is Rekon-side command execution included?** No. **Rekon does not execute commands
    in V1.**
11. **Are source writes included?** No. **Rekon does not write source files in V1.**
12. **Are VerificationRun / VerificationResult generation included?** No.
    **VerificationRun and VerificationResult generation remain deferred beyond V1.**
13. **Is top-level help aligned?** Yes. **Top-level Rekon help lists the rich intent
    workflow** (shipped in CLI Intent Help Surface Alignment, `c5e0337`).
14. **What known limitations remain?** See the limitation table — chiefly: no
    `intent:go`, no Rekon-side VerificationRun, no source writes, the bundle is a
    projection (canonical truth stays in `.rekon/artifacts/`), Circe is a required
    orchestration dependency, and release mechanics are not completed.
15. **What release/polish slice follows?** V1 Release Mechanics / Versioning Decision
    (version bump / tag / publish / release notes / migration notes — still no npm
    publish unless explicitly approved).

## Why This Review Exists

Rekon has been in beta for a long time. The non-executing intent pipeline is now complete
enough to prepare, prove, package, and hand off plans to Circe, and every layer has its own
shipped safety review. V1 needs a clear readiness decision: what V1 means, what is
included, what is explicitly excluded, and what proof supports the claim — without
expanding scope into Rekon-side execution. This review answers that and pins the boundary
so a later release-mechanics slice can act on a settled product definition.

## V1 Scope

**V1 means prepare/prove/package/export, not Rekon-side execution.** In V1, Rekon:

- assesses intent (IntentAssessmentReport);
- prepares a proof-approved plan (PreparedIntentPlan with approval/proof envelope);
- reports status (IntentStatusReport);
- generates a WorkOrder (intent handoff);
- generates a VerificationPlan (intent handoff);
- writes a human/agent plan bundle;
- writes a Circe-compatible proof/gate projection;
- exposes all of these commands in top-level help.

Circe, in V1:

- validates the handoff;
- previews routes;
- imports the handoff;
- orchestrates execution.

**Circe owns orchestration for V1.** **The Circe proof/gate projection carries Rekon
approval/proof state** — the approval status/reasons, the runtime-drift / handoff-coverage
/ freshness / verification / plan-structure proof refs, the IntentStatusReport gate state,
and per-phase gate metadata — so Circe imports a proof-carrying package rather than a flat
plan.

## Included Surfaces

| Surface | V1 Decision |
| --- | --- |
| IntentAssessmentReport | included |
| PreparedIntentPlan | included |
| IntentStatusReport | included |
| WorkOrder handoff | included |
| VerificationPlan handoff | included |
| Plan bundle | included |
| Circe proof/gate projection | included |
| CLI help surface | included |
| VerificationRun generation | excluded |
| intent:go | excluded |

## Included Commands

| Command | V1 Decision |
| --- | --- |
| rekon intent assess | included |
| rekon intent prepare | included |
| rekon intent status | included |
| rekon intent work-order generate | included |
| rekon intent verification-plan generate | included |
| rekon intent bundle write | included |
| circe rekon-handoff validate | external / Circe |
| circe rekon-handoff routes | external / Circe |
| circe import rekon-handoff | external / Circe |
| circe serve --mode worker | external / Circe |

## Proof Reviewed

| Proof | Result |
| --- | --- |
| full Rekon test suite | passing |
| Rekon package gates | passing |
| Circe handoff schema validation | passing |
| Circe validate/routes/import proof | passing |
| Circe serve-loop proof | passing |
| top-level help alignment | passing |

The full Rekon test suite passes at `c5e0337` (4281 tests, 0 fail, 10 skipped) and the
package gates (export audit, license audit, publish dry-run, install-from-build and
install-from-tarball smokes across 21 packages) pass. Circe handoff schema validation was
confirmed against Circe's real normalizers (`readRekonHandoffManifestFile` /
`readRekonPhasePlanFile` / `normalizeRekonWorkOrder` / `normalizeRekonVerificationPlan`),
and the external serve-loop proof passed **pass 1 / fail 0**. Top-level help alignment is
covered by the slice-104 help contract test (12 assertions).

## Rekon / Circe Boundary

| Boundary | V1 Decision |
| --- | --- |
| Rekon vs Circe | prepare/export vs orchestrate/execute |
| Rekon vs source writes | no writes |
| Rekon vs command execution | no execution |
| Rekon vs intent:go | deferred |
| VerificationPlan vs VerificationRun | plan only |
| bundle vs canonical artifacts | projection vs truth |

Boundary statements pinned by this review:

- **V1 means prepare/prove/package/export, not Rekon-side execution.**
- **Circe owns orchestration for V1.**
- **intent:go remains deferred beyond V1.**
- **Rekon does not execute commands in V1.**
- **Rekon does not write source files in V1.**
- **VerificationRun and VerificationResult generation remain deferred beyond V1.**
- **The Circe proof/gate projection carries Rekon approval/proof state.**
- **Top-level Rekon help lists the rich intent workflow.**

## Excluded From V1

- **intent:go** — not implemented; remains deferred beyond V1.
- **Rekon-side command execution** — Rekon does not execute commands in V1; the
  VerificationPlan projects commands as text and Circe (or an operator) runs them.
- **Rekon-side source writes** — Rekon does not write source files in V1; the bundle and
  projection are written only under `.rekon/intent/plans/<intent-id>/`, and canonical
  truth remains `.rekon/artifacts/`.
- **Rekon-side VerificationRun / VerificationResult generation** — remains deferred beyond
  V1; the intent pipeline produces a VerificationPlan handoff, not a run or a result.
- **npm publish / version bump / release tag** — not part of this readiness review; a
  separate release-mechanics slice owns them, and no publish happens unless separately
  approved.

## Known Limitations

| Limitation | V1 Handling |
| --- | --- |
| no intent:go | explicit exclusion |
| no Rekon-side VerificationRun | delegated/deferred |
| no source writes | explicit exclusion |
| bundle is projection | canonical truth remains artifacts |
| Circe required for orchestration | documented dependency |
| release mechanics not completed | separate release slice |

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| A. Do not declare V1 readiness yet (keep beta until intent:go / execution exists) | Reject | V1 should be scoped to non-executing prepare/prove/package/export, not Rekon-side execution. |
| B. Declare the non-executing handoff V1 ready (Rekon prepares/proves/packages/exports; Circe executes) | **Select** | This is the completed and proven product boundary. |
| C. Require Rekon-side execution before V1 (wait for Rekon to run commands / write source files) | Reject | Would expand V1 into a much riskier execution product. |
| D. Release V1 immediately with version bump/publish (readiness + release mechanics in one slice) | Reject/defer | Versioning/tagging/publish mechanics should be a separate explicit release slice. |
| E. Declare V1 only after more dogfood (keep beta despite passing proof) | Reject/defer | Dogfood can continue after V1; it should not block the scoped non-executing handoff boundary. |

## Recommendation

Select **Option B**: V1 readiness is **conditionally approved** for the non-executing
Rekon → Circe prepared-plan handoff. The product surface is ready — assess, prepare, prove,
report status, generate WorkOrder and VerificationPlan, write the plan bundle, write the
Circe proof/gate projection, and surface all commands in help — with every layer
safety-reviewed and the path proven against a real Circe import + serve loop. V1 explicitly
excludes `intent:go`, Rekon-side command execution, Rekon-side source writes, and
Rekon-side VerificationRun / VerificationResult generation. Conditional approval defers
release mechanics (version bump / tag / publish / release notes / migration notes) to a
separate **V1 Release Mechanics / Versioning Decision** slice; no publish happens unless
explicitly approved.

## What This Does Not Do

This is a strategy / release-readiness review. It does not bump versions, tag a release,
or publish to npm; it does not implement `intent:go`, VerificationRun generation, or any
Rekon-side execution or source write; it adds no CLI command, no artifact type, and changes
no runtime behavior. It only adds this memo, a docs test, a review packet, and
cross-reference / pointer updates to existing docs.

## Follow-Up Work

- **V1 Release Mechanics / Versioning Decision** (recommended next): decide whether to bump
  the version, tag, publish, and what release notes / package readiness / migration notes
  are required — still no npm publish unless explicitly approved. **Shipped (slice 106):
  Option B — staged V1 release mechanics — was selected; the version-bump / git-tag /
  npm-publish gates and the lockstep (`1.0.0`-target) versioning model are pinned, but no
  version is bumped and nothing is published in that slice. See
  [V1 Release Mechanics / Versioning Decision](./v1-release-mechanics-versioning-decision.md).**
  **Then shipped (slice 107): the V1 release materials —
  [V1 Release Notes](../releases/v1-release-notes.md),
  [V1 Migration Notes](../releases/v1-migration-notes.md),
  [V1 Release Checklist](../releases/v1-release-checklist.md) — were drafted under
  `docs/releases/`; packages remain at `0.1.0-beta.0` (no version bump / tag / publish).**
  **Then shipped (slice 108): the lockstep version bump was executed — all 21 public
  packages and the private root are now at `1.0.0` (no tag / publish). See
  [V1 Versioning Implementation](./v1-versioning-implementation.md).**
  **Then shipped (slice 109): an annotated `v1.0.0` git tag was created from the verified
  final commit and pushed to origin after the full gate passed (no npm publish, no version
  change). See [V1 Tagging Decision](./v1-tagging-decision.md).**
  **Then decided (slice 110): the V1 first-run onboarding model — the public first-run verb is
  `rekon scan` (not `refresh`), and docs / agent / verification / CI options are offered only
  after the first scan. No `rekon scan` implementation, no CLI change. See
  [Rekon First-Run Scan / Install Onboarding Decision](./rekon-first-run-scan-onboarding-decision.md).**
  **Then shipped (slice 111): `rekon scan` is implemented — the canonical first-run command
  that initializes `.rekon/` if needed and creates the first repository intelligence substrate,
  sharing the existing refresh pipeline. `refresh` retained as the expert / compatibility verb;
  no version bump, no npm publish, no `intent:go`.**
  **Then reviewed (slice 112): the Rekon First-Run Scan Safety Review confirmed `rekon scan`
  safe/stable as the canonical first-run command (first-run + repeat paths pass; boundaries
  hold; config normalization acceptable for v1). Recommended next: Rekon Install / Setup /
  ASCII Art UX Decision. See [Rekon First-Run Scan Safety Review](./rekon-first-run-scan-safety-review.md).**
- Continued dogfood of the non-executing handoff against real repos (does not block V1).
- `intent:go` / execution boundary remains a separate, later decision, owned by Circe at
  the execution boundary — not part of V1.
- **Rekon Install / Setup / ASCII Art UX Decision** (decided, slice 117): the V1 operator install /
  first-run setup UX is decided — staged install/setup polish, scan-first, non-interactive install,
  no ASCII in `--json`, `intent:go` still deferred. See
  [Rekon Install / Setup / ASCII Art UX Decision](./rekon-install-setup-ascii-ux-decision.md).
