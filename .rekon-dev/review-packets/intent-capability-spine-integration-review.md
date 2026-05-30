# Review Packet — Intent Capability Spine Integration Review

Slice 76 on the capability-ontology track. Strategy / architecture-review
batch. Read-only mapping of the classic codebase-intel intent surfaces
(`intent:assess` / `intent:prepare` / `intent:go` / `intent:status`) onto the
Rekon artifact spine, now that the capability, policy, finding, step,
handoff, coverage, observation, and drift layers all exist. Selects the next
intent implementation slice. No intent is implemented, registered, or wired
to the CLI.

## CHANGES MADE

- New strategy memo
  `docs/strategy/intent-capability-spine-integration-review.md` (17 headings;
  tables for classic surface / gap matrix / options / input dependency /
  sequence).
- New 18-assertion docs test
  `tests/docs/intent-capability-spine-integration-review.test.mjs`.
- Cross-reference updates to the classic parity audit, the
  RuntimeGraphDriftReport safety review, the runtime-graph-drift /
  runtime-graph-observation / handoff-coverage / handoff-contract /
  step-capability-graph artifacts, the agent-operating-contract +
  remediation-work-orders concepts, the work-order / verification-plan /
  verification-run / verification-result / path-freshness-report artifacts,
  both roadmaps, README, and CHANGELOG.
- This review packet.

## PUBLIC API CHANGES

None. Docs-only batch. No `packages/` source, artifact type, CLI command,
validator, factory, or schema changed.

## PURPOSE PRESERVATION CHECK

- **Original problem.** Rekon has shipped the full capability / policy /
  finding / step / handoff / coverage / observation / drift spine but never
  mapped the classic intent capability (`intent:assess` / `intent:prepare` /
  `intent:go` / `intent:status`) onto Rekon artifacts. Without that mapping —
  and without folding the new step/handoff/runtime-drift spine into intent
  readiness — intent parity would be incomplete and intent work could drift
  into prose-only design or premature execution.
- **Guarantee preserved.** This review fixes the mapping and the boundaries:
  assess → `IntentAssessmentReport`, prepare → `PreparedIntentPlan`, status →
  `IntentStatusReport`, go → a deferred `IntentGoDecision` execution gate.
  `IntentAssessmentReport` is not `WorkOrder`; `PreparedIntentPlan` is not
  source-write execution; `IntentStatusReport` is not `VerificationResult`;
  `RuntimeGraphDriftReport` is an input to intent readiness, not the intent
  system itself. Intent parity depends on the full graph spine. No intent is
  implemented, no artifact type registered, no CLI command added, no source
  write introduced, and nothing from classic codebase-intel is imported.

## CODEBASE-INTEL ALIGNMENT

Grounded by a targeted source-level audit of classic codebase-intel (CLI
`commands/cli-entry.ts`; services `IntentWorkflowService.ts`,
`IntentPreparationService.ts`; models `lib/intent/types.ts`,
`packages/product-codebase-intel/src/intent/model.ts`,
`lib/intent-preparation/types.ts`), not inferred from command names.
**Honest finding:** classic intent does **not** consume step-capability /
handoff / runtime-graph / drift surfaces — its readiness is gate-based
(actionability + verification gates) plus hash-based staleness. Rekon's
intent architecture therefore *extends* parity by wiring the graph spine into
intent readiness, a Rekon-native improvement, while preserving the classic
assess / prepare / status / go boundaries. Nothing from classic
codebase-intel is imported.

## CLASSIC INTENT SURFACES REVIEWED

- `intent:assess` — read-only classification (intent map `write:false`, owner
  systems / concerns, policy evaluation, size + score, migration guard,
  gating decision). No writes, no blockers.
- `intent:prepare` — phase artifact generation (parse source plan, normalize
  phases, elicitation, command-role resolution, codebase scan, assertions +
  meta-gates, actionability evaluation, artifact hash, execution graph +
  manifest). Writes phase JSON/MD, source-plan copy, manifest. No execution.
- `intent:go` — lifecycle driver (migration lock, actionability gate →
  verification gates, execute verification shell commands, advance pending →
  verified, completion summary). Writes manifest / reports; does **not**
  modify source.
- `intent:status` — read-only manifest inspection (per-migration phase
  counts, unregistered artifacts, next pending, resume command). No writes.

## GAP MATRIX

Classic `IntentMap` / actionability → `IntentAssessmentReport` (missing);
`PreparedPhaseArtifact` → `PreparedIntentPlan` (missing); `IntentPhaseManifest`
→ `IntentStatusReport` (missing); `IntentGate` / verification → Rekon
`VerificationPlan` / `VerificationRun` / `VerificationResult` (proof exists,
intent wiring missing); hash-staleness reconcile → `PathFreshnessReport`
(exists); runtime readiness inputs → full graph spine (exists, Rekon-native
parity extension); `intent:go` execution → `IntentGoDecision` (deferred).

## OPTIONS CONSIDERED

- A — map intent onto existing `WorkOrder`: rejected (guidance is not
  assessment / preparation / status).
- B — staged intent artifact spine (`IntentAssessmentReport` →
  `PreparedIntentPlan` → `IntentStatusReport`, execution gate later):
  **selected**.
- C — start with `PreparedIntentPlan`: rejected / deferred (assessment first).
- D — start with `intent:go`: rejected (execution too early).
- E — treat runtime drift as the intent system: rejected (drift is one input).

## RECOMMENDATION

Adopt Option B and ship `IntentAssessmentReport` first. Defer `intent:go` and
all source-write behavior to a separately-decided later track. Recommended
next implementation slice: **IntentAssessmentReport v1 decision**.

## INTENT ARTIFACT SKETCHES

Sketches only (not implemented, not registered):
`IntentAssessmentReport` assesses a requested intent against current repo
intelligence + the graph spine + `PathFreshnessReport`, surfacing scope,
missing context, drift / coverage readiness, verification readiness, and
blockers. `PreparedIntentPlan` prepares phases / gates / preservation
requirements after assessment (not source-write execution).
`IntentStatusReport` reports intent-lifecycle state over assessment / plan /
verification / freshness / drift inputs (not a single proof result).
`IntentGoDecision` is a future execution gate only.

## RUNTIME DRIFT / HANDOFF DEPENDENCY

Intent parity depends on `StepCapabilityGraph`, `HandoffContract`,
`HandoffCoverageReport`, `RuntimeGraphObservationReport`, and
`RuntimeGraphDriftReport`. A high-severity drift row, an `uncovered-handoff`,
an `observation-missing`, or a stale `PathFreshnessReport` should make
`IntentAssessmentReport` surface a blocker rather than claim readiness.
`RuntimeGraphDriftReport` is an input to intent readiness, not the intent
system itself.

## WORKORDER / VERIFICATION BOUNDARY

`IntentAssessmentReport` is not `WorkOrder` (guidance comes after
preparation, assessment before it). Verification (`VerificationPlan` /
`VerificationRun` / `VerificationResult`) supplies the proof state that
`IntentStatusReport` reports on; intent never re-implements proof. No
source-write behavior ships in this review.

## TESTS / VERIFICATION

- New docs test (18 assertions): memo exists, all 17 headings, classic
  surface table assess / prepare / status mappings, intent:go deferred, six
  boundary statements, input-dependency / option / sequence tables,
  recommendation, CHANGELOG mention, and this packet's PURPOSE PRESERVATION
  CHECK.
- Full gate: `npm run typecheck`, `npm run test`, `npm run build`,
  `git diff --check`, `node scripts/audit-package-exports.mjs`, `node
  scripts/audit-license.mjs`, `node scripts/publish-dry-run.mjs`, `node
  scripts/install-smoke.mjs`, `node scripts/install-tarball-smoke.mjs`.
  No CLI smoke (strategy-only).

## INTENTIONALLY UNTOUCHED

All `packages/` source; every existing artifact type, schema, validator,
factory, and CLI command; the full graph spine (`StepCapabilityGraph` /
`HandoffContract` / `HandoffCoverageReport` / `RuntimeGraphObservationReport`
/ `RuntimeGraphDriftReport`); `WorkOrder` / `VerificationPlan` /
`VerificationRun` / `VerificationResult` / `PathFreshnessReport`; intent
implementation (none); all version numbers; classic codebase-intel (not
imported); `pnpm-lock.yaml`.

## RISKS / FOLLOW-UP

- The intent artifact shapes here are sketches; the v1 decision slice fixes
  the assessment model precisely before implementation.
- Folding the graph spine into intent readiness is a Rekon-native extension
  beyond classic parity; the readiness policy (which drift severities / which
  coverage statuses block) must be decided in the IntentAssessmentReport v1
  decision, not assumed here.
- `intent:go` execution + source-write policy remain entirely deferred and
  must be decided in a separate slice.

## NEXT STEP

IntentAssessmentReport v1 decision — fix the request / goal model, scope
model, readiness model (graph spine + `PathFreshnessReport` inputs), and
blocker model, and pin the boundary from `WorkOrder` and `VerificationPlan`.
Still no intent execution, no `WorkOrder` / `VerificationPlan` creation from
assessment, and no source writes.
