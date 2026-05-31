# Review Packet — PreparedIntentPlan v1, Approval / Proof Envelope Amendment

Eighty-third slice on the capability-ontology track. Amends the already-shipped
`PreparedIntentPlan` v1 (`decc93c`) to add the required approval/proof envelope
decided in the PreparedIntentPlan Approval / Proof Model Decision (`599ddac`).
No git history is rewritten; the amendment layers on top of the shipped code.

## CHANGES MADE

- **kernel-repo-model** (`packages/kernel-repo-model/src/index.ts`): added
  `PreparedIntentPlanApprovalStatus`, `PreparedIntentPlanApprovalReason`,
  `PreparedIntentPlanApprovalProof`, and `PreparedIntentPlanApproval` types; a
  required `approval` field on `PreparedIntentPlan`; approval-status / reason /
  implementation-kind / explicit-reason constant sets; factory normalizers
  (`preparedIntentNormalizeApproval` / `preparedIntentNormalizeProof` and
  helpers) wired into `createPreparedIntentPlan`; proof validators
  (`validatePreparedIntentProof` / `validatePreparedIntentApproval`); and the
  cross-field hard rules in `validatePreparedIntentPlan`.
- **capability-model** (`packages/capability-model/src/prepared-intent-plan.ts`):
  extended the input `Like` types to carry VALUES (drift rows, coverage summary,
  freshness status/entries, verification-result status); compute approval
  status / reasons / proof; downgrade the prepared status from the FINAL
  approval decision; regenerate phases and verification requirements from the
  final status; build the proof record, the downstream-handoff flags, the
  approval blockers, and the reused blockedReasons.
- **cli** (`packages/cli/src/index.ts`): `rekon intent prepare` now reads the
  runtime-drift / handoff-coverage / path-freshness / verification-result VALUES
  (not just refs), passes them to the helper, and prints `Approval:` /
  `Approval reasons:` (and `approval.status` / `approval.reasons` in `--json`).
- **tests**: rewrote `tests/contract/prepared-intent-plan.test.mjs` (33 cases)
  and extended `tests/docs/prepared-intent-plan.test.mjs` (17 assertions).
- **docs**: amended the artifact + concept docs, CHANGELOG, README, roadmaps,
  and intent cross-references.

## PUBLIC API CHANGES

- `PreparedIntentPlan` gains a **required** `approval: PreparedIntentPlanApproval`
  field (`status`, `reasons[]`, `proof`, `blockers[]`). Existing fields are
  unchanged. New exported types from `@rekon/kernel-repo-model`.
- `buildPreparedIntentPlan` input gains optional VALUE-carrying fields on the
  existing `Like` inputs; refs are unchanged.
- CLI output adds approval lines / JSON keys (additive).

## PURPOSE PRESERVATION CHECK

The artifact's purpose — turn a safe assessment into prepared phases,
obligations, and verification requirements — is preserved and **strengthened**:
a plan is now "prepared" only when it is proof-approved, mirroring classic's
proof-before-plan discipline. No purpose is removed. The downstream boundary is
unchanged: no WorkOrder/VerificationPlan creation, no command execution, no
source writes.

## CODEBASE-INTEL ALIGNMENT

Grounded in the integration review's recorded classic findings: plan output was
authorized only through explicit authorization or intake sufficiency, premature
planning while not-ready was a critical violation, and minimum plan structure
was required. The approval envelope re-homes that discipline onto the Rekon
graph spine (assessment readiness + drift + coverage + freshness + verification
proof) instead of importing classic code. No classic codebase-intel modules are
imported.

## APPROVAL MODEL

`approval.status` ∈ {`approved`, `not-approved`, `needs-review`}.
`approval.reasons` carry authorizing reasons (`assessment-ready-for-prepare`,
`explicit-operator-approval`, `intake-sufficient`, `manual-risk-acceptance`) and
blocking reasons (`blocked-assessment`, `stale-assessment`,
`insufficient-context`, `runtime-drift-unresolved`,
`handoff-coverage-unresolved`, `verification-proof-missing`).
`explicit-operator-approval` and `manual-risk-acceptance` are **reserved** in
v1 — the helper and CLI invent no override behavior. `approval.blockers` reuse
the `PreparedIntentObligation` shape, derived from the blocking reasons.

## PROOF MODEL

`approval.proof` independently re-checks the spine from artifact VALUES:
assessment readiness + approved-for-prepare, required-context presence, runtime
drift (unresolved high-severity count), handoff coverage (uncovered /
unresolved-contract / not-evaluated counts), freshness (stale-context state),
verification (requirements + optional proof refs), plan structure (phase-kind
booleans), and the downstream handoff. `downstreamHandoff.sourceWriteAllowed` is
the literal `false`, enforced by both the factory normalizer and the validator.

## PREPARED STATUS RULE

**PreparedIntentPlan.status.value can be prepared only when approval.status is
approved.** The validator rejects a `prepared` plan whose `approval.status` is
not `approved`, and rejects `approved` on a `blocked` / `stale-assessment` /
`insufficient-assessment` plan. The helper downgrades:
`ready-for-prepare` + `approved` → `prepared`; + `needs-review` →
`needs-review`; + `not-approved` → `blocked`.

## PLAN STRUCTURE PROOF

A `prepared` plan must have ≥1 phase. Implementation-bearing kinds
(`bug` / `feature` / `refactor` / `migration`) must carry verification
requirements **and** a `verify` phase; `refactor` must include a `refactor`
phase; `bug` / `feature` / `migration` must include a `modify` phase; an
`unknown`-kind request cannot be `prepared` without an explicit approval reason.
`approval.proof.planStructure` records the phase-kind booleans.

## VERIFICATION PROOF

`verificationRequirements` remain proof obligations, not a `VerificationPlan`.
Missing proof *results* are acceptable at preparation time; missing
*requirements* are not acceptable for implementation-bearing prepared plans.
Proof results, when available, are cited as refs in
`approval.proof.verification.verificationRefs`. **Verification requirements are
proof obligations, not VerificationPlan.**

## CLI SURFACE

`rekon intent prepare --assessment <ref> [--root <path>] [--json]` plus the
optional context flags (`--capability-map`, `--step-graph`,
`--handoff-coverage-report`, `--runtime-observation-report`,
`--runtime-drift-report`, `--path-freshness-report`, `--verification-result`).
The command now reads the drift / coverage / freshness / verification VALUES so
proof can re-check them, and prints the approval status + reasons. It creates no
`WorkOrder` / `VerificationPlan`, executes no commands, and writes no source.

## BOUNDARY MODEL

- **PreparedIntentPlan must be proof-approved, not merely generated.**
- **PreparedIntentPlan.status.value can be prepared only when approval.status is approved.**
- **A plan with phases but without approval is not prepared.**
- **PreparedIntentPlan does not create WorkOrder or VerificationPlan.**
- **PreparedIntentPlan does not execute commands.**
- **PreparedIntentPlan does not write source files.**
- **Verification requirements are proof obligations, not VerificationPlan.**
- **intent:go remains deferred.** Source-write behavior remains unavailable.

## TESTS / VERIFICATION

- `tests/contract/prepared-intent-plan.test.mjs` — 33 cases: approval validates,
  missing approval fails, prepared requires approved, readiness→approval
  mappings, proof citation, drift / coverage / freshness gates, impl-bearing
  without requirements rejected, sourceWriteAllowed always false, downstream
  handoff flags, CLI JSON + human approval output, and the no-WorkOrder /
  no-VerificationPlan / no-VerificationRun / no-source / validate-clean
  boundaries.
- `tests/docs/prepared-intent-plan.test.mjs` — 17 assertions including the three
  key statements and the approval-envelope review packet.
- Full 9-command gate (typecheck, test, build, `git diff --check`, audit
  package-exports, audit-license, publish-dry-run, install-smoke,
  install-tarball-smoke) + CLI smoke.

## INTENTIONALLY UNTOUCHED

No git history rewrite. No new artifact type registration (PreparedIntentPlan is
already registered). No `IntentStatusReport` / `intent:go` implementation. No
version bump. No npm publish. No new branch. `IntentAssessmentReport`,
`RuntimeGraphDriftReport`, `HandoffCoverageReport`, and `PathFreshnessReport` are
read-only inputs and are not mutated.

## RISKS / FOLLOW-UP

- Approval gates are conservative (drift / coverage / freshness block unless
  accepted, and v1 exposes no acceptance input). Reserved reasons leave room for
  a future operator-approval / risk-acceptance gate without relaxing the
  source-write boundary.
- The next slice is the **PreparedIntentPlan safety review** (decision/strategy
  batch, no implementation), then `IntentStatusReport`.

## NEXT STEP

Recommend **PreparedIntentPlan safety review** next: ground a safety-review memo
in the shipped approval/proof envelope, confirm the boundary holds end-to-end,
and record the surface / approval / proof / boundary tables before
`IntentStatusReport`.
