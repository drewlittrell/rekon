# Review Packet — Intent Plan Bundle / Agent Handoff Directory Decision (slice 95)

## CHANGES MADE

Strategy / architecture decision batch — no runtime behavior change. Adds
`docs/strategy/intent-plan-bundle-agent-handoff-directory-decision.md` (pins the
plan-bundle directory / manifest / files / staleness model), this review packet, a
17-assertion docs test, and cross-reference footers / CHANGELOG / README pointers
across the intent and verification scope docs. No source files changed; no bundle
implemented.

## PUBLIC API CHANGES

None. No helper, type, CLI flag, or artifact shape changed. The decision *proposes*
a future `.rekon/intent/plans/<intent-id>/` bundle and `manifest.json` shape but
implements neither.

## PURPOSE PRESERVATION CHECK

Rekon now materializes canonical intent / work / proof artifacts under
`.rekon/artifacts/`, but operators and LLM agents need a predictable repo-local
plan bundle. The bundle must project canonical artifacts without becoming a second
source of truth, must detect stale source artifacts, and must never imply command
execution, source writes, or `intent:go`. The decision preserves those guarantees:
canonical truth stays in `.rekon/artifacts/`; the bundle is a regenerable
projection under `.rekon/intent/plans/<intent-id>/`; the manifest records refs /
digests / staleness; agent files are bounded instructions; and `intent:go` stays
deferred.

## CODEBASE-INTEL ALIGNMENT

The split mirrors Rekon's existing discipline: `.rekon/artifacts/` is canonical
machine-readable truth (validated, header-checked), and presentation surfaces
(architecture summary, agent operating contract) are derived projections. The
bundle extends that pattern with a stable per-intent handoff directory rather than
co-mingling Markdown with canonical artifacts.

## OPTIONS CONSIDERED

A artifacts-only (rejected), **B `.rekon/intent/plans/<intent-id>/` bundle
(selected)**, C Markdown in `.rekon/artifacts/` (rejected — blurs truth /
presentation), D top-level `plans/` (rejected/deferred — stays under `.rekon`), E
agent-only bundle (rejected — humans need readable handoff).

## DIRECTORY MODEL

Default `.rekon/intent/plans/<intent-id>/`; `<intent-id>` deterministic / slug-safe
and derived from `PreparedIntentPlan` / `IntentAssessmentReport` id where possible.
Bundle creation must not write outside the bundle dir, mutate canonical artifacts,
write source files, or execute commands.

## MANIFEST MODEL

`manifest.json` (schemaVersion, bundleKind `intent-plan`, intentId, generatedAt,
status, `sourceArtifacts` ref+digest per artifact, `staleness` state+reasons,
`files` map, `boundaries` canonicalTruth + executesCommands/writesSourceFiles/
implementsIntentGo all false). It is the bundle entry point.

## HUMAN-READABLE FILES

Root: `README.md` (overview / boundaries), `prepared-plan.md` (phases / approval /
obligations), `work-order.md` (implementation guidance), `verification-plan.md`
(proof requirements as text), `status.md` (status rollup). Optional future:
`findings.md`, `drift.md`, `handoff-coverage.md`.

## AGENT HANDOFF FILES

`agent/handoff.md` (concise task handoff + stop conditions), `agent/context.json`
(structured goal / scope / systems / capabilities / steps / phases / obligations /
status), `agent/instructions.md`, `agent/constraints.md` (non-goals / source-write
boundaries / preservation obligations), `agent/verification.json` (requirements
only), `agent/source-refs.json` (refs / digests). Agent files are projection, must
cite source refs + stop conditions, must state commands are not executed by the
bundle, and must not grant source-write permission beyond future policy.

## STALENESS AND PROVENANCE MODEL

Stale when: a source artifact digest changed; IntentStatusReport stale;
PathFreshnessReport stale; RuntimeGraphDriftReport new high-severity drift; missing
source artifact (stale / invalid). v1 may compute staleness from digests only, then
expand. A stale bundle must not be treated as a current handoff.

## SOURCE CONTROL POLICY

Default: repo-local operational state under `.rekon`, not assumed committed.
Whether `.rekon/intent/plans` is committed is a repo / operator policy decision; a
future export command may copy a bundle elsewhere.

## BOUNDARY MODEL

bundle vs canonical artifacts (projection vs truth); vs intent:go (no execution);
vs source writes (none); vs VerificationRun (no command execution); vs agent
handoff (bounded instructions); vs source control (repo/operator policy).

## TESTS / VERIFICATION

- New `tests/docs/intent-plan-bundle-agent-handoff-directory-decision.test.mjs` (17
  assertions).
- Full gate: typecheck, test (full suite), build, `git diff --check`,
  audit-package-exports, audit-license, publish-dry-run, install-smoke,
  install-tarball-smoke. No CLI smoke (strategy-only batch).

## INTENTIONALLY UNTOUCHED

No bundle implementation, no `.rekon/intent/plans` files written, no artifact-type
registration, no CLI command, no `WorkOrder` / `VerificationPlan` / `VerificationRun`
/ `VerificationResult` creation, no command execution, no source writes, no
`intent:go`, no version bump, no publish. Canonical artifacts unchanged.

## RISKS / FOLLOW-UP

- Immutable-snapshot vs regenerable-projection mode: v1 is regenerable; an immutable
  mode may be decided later.
- Staleness v1 uses digests only; the IntentStatusReport / PathFreshnessReport /
  RuntimeGraphDriftReport signals expand it in implementation.
- Intent-id determinism must be pinned in implementation to keep bundle paths stable.

## NEXT STEP

Intent Plan Bundle / Agent Handoff Implementation.
