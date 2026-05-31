# Review Packet — PreparedIntentPlan v1

Slice 81 on the capability-ontology track. Product-capability batch. Registers
and implements `PreparedIntentPlan` v1 — a read-only phase/gate preparation
artifact generated from an `IntentAssessmentReport` plus the existing Rekon
context spine, the layer after `IntentAssessmentReport` selected by the
PreparedIntentPlan v1 Decision (`a7feb33`). It is phase/gate preparation, not
WorkOrder: it creates no `WorkOrder` / `VerificationPlan`, executes no commands,
writes no source, and mutates nothing.

## CHANGES MADE

- Registered the `PreparedIntentPlan` artifact type: `@rekon/kernel-repo-model`
  types + `createPreparedIntentPlan` factory + `validatePreparedIntentPlan` +
  `assertPreparedIntentPlan` + `preparedIntentPlanSchema`; `@rekon/sdk`
  `BUILT_IN_ARTIFACT_TYPES`; `@rekon/runtime` `ARTIFACT_CATEGORY_BY_TYPE`
  (category `actions`).
- New `@rekon/capability-model.buildPreparedIntentPlan` helper (structural
  `Like` inputs; status / phase / obligation / verification-requirement policy;
  reads no files).
- New `rekon intent prepare` CLI command (assessment resolution + latest
  context, human + `--json` output).
- New `docs/artifacts/prepared-intent-plan.md` +
  `docs/concepts/prepared-intent-plan.md`.
- New `tests/contract/prepared-intent-plan.test.mjs` (29 cases) +
  `tests/docs/prepared-intent-plan.test.mjs` (12 assertions).
- Updated ~18 supporting docs + CHANGELOG + README + this review packet.

## PUBLIC API CHANGES

- New exported artifact type `PreparedIntentPlan` + factory / validator /
  assert / schema from `@rekon/kernel-repo-model`.
- New `buildPreparedIntentPlan` + `PREPARED_INTENT_PLAN_ARTIFACT_ID_PREFIX` +
  structural `Like` types from `@rekon/capability-model`.
- New `rekon intent prepare` CLI command. No existing API changed.

## PURPOSE PRESERVATION CHECK

- **Original problem.** `IntentAssessmentReport` assesses readiness and
  blockers; Rekon needs a preparation layer that converts a *safe* assessment
  into planned phases, constraints, gates, obligations, touched paths, and
  verification requirements — without becoming a `WorkOrder` or
  `VerificationPlan` and without crossing into execution or source writes.
- **Guarantee preserved.** `PreparedIntentPlan` is read-only preparation. It
  consumes `IntentAssessmentReport` and existing Rekon context; it emits
  preparation phases and obligations; it emits verification requirements, not
  `VerificationPlan`; it recommends downstream work creation without creating a
  `WorkOrder`; it never executes commands or writes source. The helper contains
  no `child_process` / filesystem-write call; the CLI's only write is the single
  plan artifact.

## CODEBASE-INTEL ALIGNMENT

Implements the PreparedIntentPlan v1 decision (`a7feb33`) and the integration
review's recorded classic-source finding: classic `intent:prepare` produced
`PreparedPhaseArtifact`s and wrote phase JSON/MD + a manifest but executed
nothing. Rekon re-homes that preparation into the artifact-first spine and
additionally consumes the step/handoff/runtime-drift graph spine as obligations
— recorded honestly as a Rekon-native extension, not literal classic behavior.
Nothing from classic codebase-intel is imported.

## ARTIFACT MODEL

`PreparedIntentPlan` { header, source(intentAssessmentReportRef required + 10
optional refs), request(goal, kind, scope?), status(value,
recommendedNextAction), phases[], obligations[], verificationRequirements[],
blockedReasons[] }, category `actions`. Factory normalizes the request, dedupes
+ sorts phases (by id), obligations + blocked reasons (severity, category, id),
and verification requirements (by id), and asserts; validator enforces the
required assessment ref, enums, unique ids per list, non-empty fields, and ref
validity.

## PHASE MODEL

`PreparedIntentPhase` (id, title, kind ∈ investigate / modify / refactor /
verify / review, status ∈ planned / blocked / needs-review, goal, paths,
systems, capabilities, steps, constraints, obligations, verificationRequirements,
sourceRefs). prepared → investigate + (modify | refactor) + verify + review
(investigation/unknown → investigate + review); needs-review → review only;
blocked / stale-assessment / insufficient-assessment → no implementation phases
(blockers copied into blockedReasons). Matched context propagates into phases.

## OBLIGATION MODEL

`PreparedIntentObligation` (id, category, severity, message, optional
sourceRefs). Categories: capability-preservation / step-preservation /
handoff-preservation / runtime-drift / finding-governance / freshness /
verification / source-write-boundary. A `source-write-boundary` obligation is
always present; drift / handoff / proof / freshness / finding obligations are
derived from the assessment's blockers + warnings; capability/step-preservation
from touched context. Deterministically ordered.

## VERIFICATION REQUIREMENT MODEL

`verificationRequirements` (id, optional command, reason, optional sourceRefs)
are emitted only when status is `prepared`: typecheck / test / build for bug /
feature / refactor / migration, document-findings for investigation. They are
requirements, not a `VerificationPlan`; no command is run and no
`VerificationRun` / `VerificationResult` is created.

## CLI SURFACE

`rekon intent prepare --assessment <IntentAssessmentReport:id|type:id> [--root]
[--json] [--capability-map] [--capability-contract] [--step-graph]
[--handoff-coverage-report] [--runtime-observation-report]
[--runtime-drift-report] [--path-freshness-report] [--verification-result]`.
Resolves the required assessment + latest context, writes one
`PreparedIntentPlan` under `actions/`, prints the status summary + boundary
statement. Missing `--assessment` exits non-zero.

## BOUNDARY MODEL

PreparedIntentPlan is phase/gate preparation, not WorkOrder; it does not create
WorkOrder / VerificationPlan, execute commands, or write source. Verification
requirements are not VerificationPlan. IntentStatusReport remains the next
layer; intent:go remains deferred; source-write behavior remains unavailable.

## TESTS / VERIFICATION

- Contract test (29 cases): validation, missing-assessment failure, readiness →
  status mapping, recommended actions, request copy, matched-context
  propagation, phase generation by kind/status, obligation derivation (always
  source-write-boundary; runtime-drift / handoff-preservation / verification),
  verification requirements without VerificationPlan, and CLI behavior (writes
  plan, requires assessment, creates no WorkOrder / VerificationPlan /
  VerificationRun, writes no source, leaves `artifacts validate` clean).
- Docs test (12 assertions): artifact + concept docs, eight boundary
  statements, CHANGELOG mention, this packet's PURPOSE PRESERVATION CHECK.
- Full gate + CLI smoke matrix.

## INTENTIONALLY UNTOUCHED

Every existing artifact type, schema, validator, factory, and CLI command;
`IntentAssessmentReport`; the graph spine; `WorkOrder` / `VerificationPlan` /
`VerificationRun` / `VerificationResult` / `PathFreshnessReport`;
`IntentStatusReport` / `IntentGoDecision` (deferred); all version numbers;
classic codebase-intel (not imported); `pnpm-lock.yaml`.

## RISKS / FOLLOW-UP

- Assessment blocker categories without a direct obligation category
  (`missing-artifact`, `scope-ambiguous`) map to `verification` in blocked
  reasons; the original message is preserved. Documented heuristic.
- Phase decomposition is deterministic-or-coarse in v1; richer decomposition can
  deepen without changing the artifact type.
- `verificationRequirements` carry an optional suggested `command` string but
  never run it; the boundary to `VerificationPlan` stays explicit.

## NEXT STEP

PreparedIntentPlan safety review — review the preparation artifact before the
IntentStatusReport v1 decision. Still no `WorkOrder` / `VerificationPlan`
creation, no command execution, and no source writes.
