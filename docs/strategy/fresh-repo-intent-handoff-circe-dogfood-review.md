# Fresh Repo Intent Handoff / Circe Dogfood Review

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

Status: review/proof (slice 136). Scope: dogfood, no new capability.

## What this is

This is a **dogfood review** of the already-shipped public Rekon path that turns
a rough plan on a fresh repository into a Circe-importable handoff bundle. It
runs the path that
[`plan-compiler-loop-closure.md`](./plan-compiler-loop-closure.md) closed
(slice 135) on a **more realistic** fresh repository, inspects the emitted
bundle and Circe projection, attempts a real Circe import from outside Rekon,
and records the result honestly.

It does **not** add a new artifact family, a parser, a source-plan writer, an
LLM merge, command execution, a Rekon-driven Circe runner, or `intent:go`. The
only code touched (if any) would be small doc / proof-harness / inspection-test
/ projection / path-ref / CLI-JSON-field fixes. This slice required **no source
fix**: the shipped public path already produces a complete, Circe-importable
handoff with every boundary explicit.

## The dogfood repository

A small TypeScript package, more realistic than the slice-135 minimal fixture:

- `src/index.ts` — an existing `export const existing` plus a
  `greet(name: string): string` function (real behavior to preserve).
- `test/index.test.ts` — a `node:test` test asserting `greet("rekon")`.
- `tsconfig.json` — `strict`, `noEmit`.
- `package.json` — `typecheck` / `test` / `build` scripts and a `typescript`
  devDependency (never installed — Rekon never runs these scripts).
- `plans/add-marker-rough.md` — a deliberately rough plan with a `TODO` and a
  `Non-goals` section ("Do not change greet behavior", "Do not add runtime
  dependencies").

## The public sequence (all public commands)

```
rekon scan
rekon intent context prepare
rekon intent plan review   --plan plans/add-marker-rough.md --goal "<goal>"
rekon intent plan answer   --report <ref> --answers answers.json --answered-by dogfood
rekon intent assess        --kind feature --path src/index.ts --path test/index.test.ts \
                           --constraint "Do not add runtime dependencies." \
                           --constraint "Do not change greet behavior."
rekon intent prepare       --assessment <ref> --actionability-report <answered-ref>
rekon intent status
rekon intent approve       --prepared-plan <ref> --intent-status <ref> \
                           --accept verification-proof-missing --accept runtime-drift-unresolved \
                           --accepted-by dogfood
rekon intent status transition --prepared-plan <ref> --previous-status <ref> --to work-ready
rekon intent work-order generate       --prepared-plan <ref> --intent-status <work-ready-ref>
rekon intent verification-plan generate --prepared-plan <ref> --intent-status <work-ready-ref>
rekon intent bundle write              --prepared-plan <ref> --intent-status <work-ready-ref>
rekon artifacts validate
```

## Result: the fresh-repo path works end-to-end

The fresh-repo operator goes from a rough plan to a Circe-importable handoff
through **review → answer → prepare → approval → status → work-order /
verification-plan → bundle**, with all proof gates explicit:

- **Review** reports the rough plan as non-actionable and surfaces elicitation
  questions.
- **Answer** merges the operator's answers back into a new actionable report
  revision; the **source report and the source plan file are unchanged**.
- **Assess** accepts multiple `--path` and `--constraint` flags and records all
  of them in the `IntentAssessmentReport`.
- **Prepare** consults the answered report and writes a `PreparedIntentPlan`
  with an implementation phase and a synthesized **verify** phase. It does not
  auto-approve; the plan is `needs-review` with required gaps
  `verification-proof-missing` and `runtime-drift-unresolved`.
- **Approve** succeeds once the operator accepts those required gaps.
- **Status transition** moves the intent to `work-ready`.
- **Work-order** and **verification-plan** generation proceed without
  `plan-not-approved` / `status-not-work-ready` blockers.
- **Bundle write** emits the full agent-handoff directory and the `circe/`
  projection.
- **artifacts validate** is clean.

## Boundaries are explicit in the bundle

Rekon **does not execute verification commands, does not write source or plan
files, does not run Circe during bundle generation, and does not implement
`intent:go`.** The bundle states these boundaries in coherent, machine-readable
places:

- `manifest.json` → `boundaries`: `executesCommands: false`,
  `writesSourceFiles: false`, `implementsIntentGo: false`, plus
  `canonicalTruth: ".rekon/artifacts"`.
- `circe/rekon-proof.json` → `gates` (top-level and per phase):
  `sourceWriteAllowed: false`, `commandsExecuted: false`,
  `intentGoDeferred: true`.
- `agent/verification.json` → `executesCommands: false` (commands are listed as
  text; `verification-plan.md` says "Commands are not executed by bundle
  generation").

The **"Rekon does not run Circe"** boundary is expressed by the projection being
written by Rekon, not Circe: `circe/handoff.json.producer.system` is `"rekon"`,
and there is **no Circe-run record anywhere** in the bundle (no `ranCirce`,
`runsCirce`, `circeExecuted`, or `importedAt`). The bundle is a projection Rekon
emits; running it is Circe's job, performed later and elsewhere.

## Proof state and phase posture travel with the bundle

- The `circe/rekon-proof.json` sidecar carries the `approval` envelope and a
  `proof` block whose `runtimeDrift.accepted` is `true` with a `ref` back to the
  source `RuntimeGraphDriftReport` — the accepted gaps are **traceable**, not
  asserted bare.
- Phase verification posture is **explicit**: each `phaseGates[]` entry has a
  `verificationPosture` (e.g. `executable`), and boolean `manualGate` /
  `needsReview`. `manifest.json.circe.phaseVerification` summarizes the counts
  (`executable`, `manualReview`, `finalVerification`, `needsReview`). Manual and
  needs-review phases are surfaced, not hidden.
- `circe/handoff.json.artifacts` references each per-phase WorkOrder and
  VerificationPlan by `path` and `artifactId`, so Circe can resolve them.

## Optional Circe validation (recorded, non-blocking)

Circe is present at `/Users/andrewlittrell/Code/Circe` (v0.1.0) and exposes
explicit Rekon importers: `circe import rekon-phase-plan` and
`circe import rekon-work-order` (the latter accepting an optional
`--verification-plan`). Run from **outside** Rekon and pointed at an **isolated**
`--store-root`, both importers accepted the dogfood bundle's projection:

- `circe import rekon-phase-plan --phase-plan circe/phase-plan.json` →
  `{ ok: true }`, native ordered work created.
- `circe import rekon-work-order --work-order circe/work-orders/<phase>.work-order.json
  --verification-plan circe/verification-plans/<phase>.verification-plan.json` →
  `{ ok: true }`, native work item + events created.

This is a real end-to-end confirmation that the fresh-repo bundle is
Circe-importable. It is **non-blocking** and lives outside the hermetic contract
test (which depends only on the built Rekon CLI). Rekon did not run Circe to
obtain this result, and the Circe checkout was not modified (the import wrote
only to a throwaway store root).

## Embedded safety review

**The dogfood review does not introduce a new execution/source-write/Circe
boundary; it reviews the already-shipped public path end-to-end.** No new
capability, artifact family, parser, source-plan writer, LLM wiring, command
execution, Rekon-driven Circe runner, or `intent:go` implementation was added.
The seven validator-forced report boundaries remain all-false, the bundle's
boundary blocks remain as shipped, and the proof gates remain
`sourceWriteAllowed: false` / `commandsExecuted: false` / `intentGoDeferred:
true`. `intent:go` (the source-write step) remains deferred behind its existing
gate.

## Where this sits in the spine

This review confirms the front-to-handoff path is operator-usable on a fresh,
realistic repository. It does not change the spine. The remaining open question
is product/release packaging, not capability:
**V1 Publish Readiness Reconciliation / npm Release Decision** is the
recommended follow-on. Do not start it without a new confirmed Work Order
against the new SHA.

## Tests / verification

- `tests/contract/fresh-repo-intent-handoff-dogfood.test.mjs` — 29 assertions
  running the full public path on the realistic fresh repo and asserting the
  bundle, Circe projection, boundary blocks, phase posture, proof traceability,
  source/plan/test immutability, and absence of any executed verification.
- `tests/docs/fresh-repo-intent-handoff-circe-dogfood-review.test.mjs` — 12
  assertions covering this review's documented claims and boundaries.

## Related

- Loop closure: [`plan-compiler-loop-closure.md`](./plan-compiler-loop-closure.md)
- Answer / merge-back: [`plan-actionability-answer-merge-back-implementation.md`](./plan-actionability-answer-merge-back-implementation.md)
- Concepts: [`intent-plan-compiler.md`](../concepts/intent-plan-compiler.md),
  [`prepared-intent-plan.md`](../concepts/prepared-intent-plan.md),
  [`intent-plan-bundle.md`](../concepts/intent-plan-bundle.md)
- Circe projection decision: [`intent-plan-bundle-circe-handoff-projection-decision.md`](./intent-plan-bundle-circe-handoff-projection-decision.md)
- Review packet: [`fresh-repo-intent-handoff-circe-dogfood-review.md`](../../.rekon-dev/review-packets/fresh-repo-intent-handoff-circe-dogfood-review.md)
