# Fresh Repo Intent Handoff / Circe Dogfood Review (Semantic Re-run)

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

> **Semantic quality proven (slice 141):** LLM-backed semantic normalization was dogfooded live (OpenAI `gpt-4o-mini`) — it extracts objectives/deliverables/acceptance/paths/commands and preserves non-goals with **zero invented paths or commands**, while staying a proposal that is schema-gated and deterministically rechecked. See [`intent-plan-semantic-quality-dogfood.md`](./intent-plan-semantic-quality-dogfood.md).

Status: dogfood / review (slice 140). Base: `cf1118f`. Successor to the slice-136
[`fresh-repo-intent-handoff-circe-dogfood-review.md`](./fresh-repo-intent-handoff-circe-dogfood-review.md)
(which predates semantic normalization); this re-run exercises semantic mode and
imports the projected bundle into a local Circe checkout. Follows
[`intent-plan-compiler-semantic-normalization-dogfood.md`](./intent-plan-compiler-semantic-normalization-dogfood.md).

> **Scope:** the dogfood review does not introduce a new
> execution/source-write/Circe boundary; it reviews the already-shipped public
> path end-to-end. The only code change is a one-line additive projection field
> (`runsCirce: false`) in the Circe-facing proof sidecar, surfacing an
> already-true boundary as an explicit, checkable field.

## What was proven

The **fresh repo rough-plan path works through review -> answer -> prepare ->
approval -> status -> handoff -> bundle**, driven entirely through public Rekon
commands on a fresh repo with a deliberately under-specified plan:

```
scan
-> intent context prepare
-> intent plan review --semantic off|auto|required
-> intent plan answer
-> intent assess
-> intent prepare --actionability-report
-> intent status
-> intent approve
-> intent status transition --to work-ready
-> intent work-order generate
-> intent verification-plan generate
-> intent bundle write
```

The rough plan reviewed as **blocked** with eight elicitation questions; the
answered revision became **actionable**; prepare / approve / transition /
work-order / verification-plan / bundle all succeeded; `artifacts validate` was
clean.

## Semantic mode

- `--semantic off` writes a deterministic report.
- **Semantic auto fallback is proven when provider is unavailable**:
  `--semantic auto --llm-provider openai` with no API key writes a
  `deterministic-fallback` report with a warning.
- **Semantic required fails cleanly when provider is unavailable**:
  `--semantic required --llm-provider openai` with no API key exits non-zero and
  writes no report.

## Bundle / Circe projection

**Circe projection is emitted.** The bundle wrote `circe/handoff.json`,
`circe/phase-plan.json`, `circe/rekon-proof.json`, two per-phase WorkOrders
(`circe/work-orders/*.json`), and two per-phase VerificationPlans
(`circe/verification-plans/*.json`), plus the human/agent files.

- **The proof sidecar carries or references approval/proof state**:
  `rekon-proof.json` records `approval.status = "approved"` with
  `approval.reasons` including the accepted-risk codes (`verification-proof-missing`,
  `runtime-drift-unresolved`) plus `explicit-operator-approval` and
  `manual-risk-acceptance`.
- **Phase verification posture is explicit**: the phase plan carries per-phase
  verification posture, and reviewer-gated / needs-review phases are marked.
- The proof `gates` block makes the boundaries explicit and checkable:
  `sourceWriteAllowed: false`, `commandsExecuted: false`, `runsCirce: false`,
  `intentGoDeferred: true`.

## Boundaries (unchanged)

- **Rekon does not execute verification commands** — `agent/verification.json`
  records `executesCommands: false` and the proof gates record
  `commandsExecuted: false`.
- **Rekon does not write source files or plan files** — the repo's source and
  plan files were byte-for-byte unchanged across the whole flow, and answering
  did not mutate the source report.
- **Rekon does not run Circe during bundle generation** — the bundle is a passive
  projection; `runsCirce: false` is now an explicit field in the proof sidecar.
- **`intent:go` remains deferred** — no go semantics are invoked; the proof gate
  records `intentGoDeferred: true`.

## Optional live LLM dogfood

Not run: no API key is configured in this environment, and the live path is
opt-in (`REKON_RUN_LIVE_LLM_TESTS=1` plus a key). Non-blocking. The real provider
adapter is proven offline (slice 139).

## Optional Circe validation

A local Circe checkout was available, so the projected bundle was imported into
Circe **from outside Rekon** (Rekon itself ran no Circe) using an isolated store:

- `circe import rekon-phase-plan` returned `ok: true`, creating ordered native
  work items from `circe/phase-plan.json` — the implementation phase queued and
  the verification phase blocked on it, preserving the Rekon ordering.
- `circe import rekon-work-order` returned `ok: true`, accepting the WorkOrder +
  VerificationPlan (idempotent `source_exists` because the phase-plan import had
  already created the work item).

The Rekon bundle is therefore genuinely Circe-importable. Note: this Circe build
exposes `circe import rekon-phase-plan` / `circe import rekon-work-order` rather
than a top-level `circe rekon-handoff validate/routes/import` command;
`handoff.json` remains a valid manifest pointing at the importable phase-plan and
work-orders. Recorded as non-blocking evidence.

## Usability gaps found

1. The Circe-import contract did not previously surface `runsCirce` explicitly —
   fixed this slice with a one-line additive `runsCirce: false` proof gate.
2. The Circe rekon import is exposed as `import rekon-phase-plan` /
   `import rekon-work-order`, not the `rekon-handoff` command name referenced in
   the work order — a naming / version gap to reconcile before broader release,
   not a Rekon-side blocker.
3. No live LLM dogfood evidence yet (operator-gated) — to be gathered when a key
   is available.

## Next step

The recommended follow-on is **V1 Publish Readiness Reconciliation / npm Release
Decision** — reconcile post-v1-tag work, decide whether current main is the real
publish candidate, decide package metadata / npm publish / version + tag policy,
and prepare for broader v1 release. Do not start it without a new confirmed Work
Order against the new SHA.

## Related

- Predecessor: [`fresh-repo-intent-handoff-circe-dogfood-review.md`](./fresh-repo-intent-handoff-circe-dogfood-review.md) (slice 136)
- Loop closure: [`plan-compiler-loop-closure.md`](./plan-compiler-loop-closure.md)
- Semantic dogfood: [`intent-plan-compiler-semantic-normalization-dogfood.md`](./intent-plan-compiler-semantic-normalization-dogfood.md)
- Bundle concept: [`../concepts/intent-plan-bundle.md`](../concepts/intent-plan-bundle.md)
- Review packet: [`../../.rekon-dev/review-packets/fresh-repo-intent-handoff-circe-dogfood-review-semantic.md`](../../.rekon-dev/review-packets/fresh-repo-intent-handoff-circe-dogfood-review-semantic.md)
