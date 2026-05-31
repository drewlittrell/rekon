# Intent Plan Bundle / Agent Handoff Safety Review

## Decision Summary

The Intent plan bundle generator shipped in the ninety-sixth slice (`a1723d7`) as
the final non-executing handoff surface of the Rekon intent spine: `rekon intent
bundle write` reads the canonical intent artifacts and projects them into a
regenerable human + LLM-agent handoff bundle under
`.rekon/intent/plans/<intent-id>/`. Because the generator writes filesystem files,
its path safety and source-write boundaries are reviewed here before any
`intent:go` / execution-boundary decision.

This review finds the bundle generator **safe / stable as a human + LLM-agent
filesystem projection** (no blocker). **Intent plan bundle is a projection, not
canonical artifact truth.** **Canonical source of truth remains `.rekon/artifacts/`.**
**Intent plan bundles live under `.rekon/intent/plans/<intent-id>/` by default.**
**Agent handoff files live under `agent/` inside the bundle.** **Bundle generation
writes only under `.rekon/intent/plans/<intent-id>/`.** **Bundle generation does not
create canonical artifacts.** **Bundle generation does not execute commands.**
**Bundle generation does not write source files.** **Bundle generation does not
implement intent:go.** **Stale bundles must not be treated as current handoff.**
**VerificationRun and VerificationResult are optional proof context, not
prerequisites for bundle generation.**

The recommended next slice is the **Intent Go / Execution Boundary Decision** — the
next boundary is not more plan output, but whether and how Rekon ever moves from a
prepared handoff into execution.

| Surface | Status | Boundary |
| --- | --- | --- |
| buildIntentPlanBundle helper | shipped | pure renderer |
| intent bundle write CLI | shipped | writes bundle files only |
| manifest.json | shipped | refs / digests / staleness / boundaries |
| human root files | shipped | operator review projection |
| agent/ files | shipped | bounded LLM-agent handoff |
| canonical artifacts | unchanged | source of truth |
| intent:go | deferred | no execution |

## Why This Review Exists

The non-executing intent preparation chain — assessment, proof-approved
preparation, status, WorkOrder handoff, VerificationPlan handoff — now ends in a
human / agent plan bundle. Unlike every prior intent surface, the bundle generator
writes files to the working tree, so the trust questions shift: does it write only
where it should, can an adversarial intent id or rendered path escape the bundle
directory, does it leave canonical artifacts untouched, and does it avoid command
execution and `intent:go`? This review grounds those guarantees in the shipped
code.

## Helper And CLI Reviewed

`buildIntentPlanBundle` (`packages/capability-docs/src/intent-plan-bundle.ts`) is a
pure function: it reads only the artifacts handed to it, derives a slug-safe intent
id, renders the manifest and the twelve files, and returns
`{ intentId, rootDir, files, manifest }`. It reads no files, writes none, executes
no commands, and mutates no input; it also asserts that each path it emits is
bundle-safe and throws if the intent id cannot be determined or is empty after slug
normalization.

The CLI branch `rekon intent bundle write` (`packages/cli/src/index.ts`) resolves
the latest-or-pinned canonical artifacts, computes their digests from the store
index, calls the renderer, and writes the files. Its only filesystem effect is
`mkdir` + `writeFile` under the bundle directory — no process is spawned, no
canonical artifact is written, and no source path is touched.

## Directory Boundary Review

The bundle root is `resolve(root, ".rekon", "intent", "plans")`, and the bundle
directory is `resolve(bundleBase, intentId)`. The CLI rejects any intent id whose
resolved path is empty, starts with `..`, or is absolute relative to the base — so
the bundle always lands inside `<repo-root>/.rekon/intent/plans/`. **Bundle
generation writes only under `.rekon/intent/plans/<intent-id>/`.** The split is
explicit: `.rekon/artifacts/` is canonical machine-readable truth, and the bundle
is the per-intent handoff projection.

## Path Safety Review

Path safety is enforced at three layers. The intent id is slug-normalized
(lowercase, non-alphanumeric → `-`, collapsed, trimmed), which neutralizes
traversal sequences (e.g. `../../etc` → `etc`). The renderer emits only hardcoded
relative paths and asserts each is `isSafeBundleRelativePath` (no absolute, no
backslash / NUL, no `""` / `.` / `..` segment). The CLI re-checks every file path
with `isSafeBundleRelativePath` and, after `resolve`, rejects any path whose
relative offset from the bundle directory starts with `..` or is absolute.

| Path Risk | V1 Safety |
| --- | --- |
| unsafe intent id | slug-safe normalization |
| absolute output path | rejected |
| .. traversal | rejected |
| renderer unsafe path | rejected |
| write outside bundle root | rejected |

## Manifest Review

`manifest.json` is the bundle entry point and provenance record: `schemaVersion`,
`bundleKind: "intent-plan"`, `intentId`, `generatedAt`, the rolled-up `status`,
`sourceArtifacts` (ref + digest for each present artifact, digest sourced from the
store index with a deterministic FNV-1a fallback), `staleness` (state +
`staleReasons`), the `files` map, and `boundaries` (`canonicalTruth:
".rekon/artifacts"`, `executesCommands` / `writesSourceFiles` /
`implementsIntentGo` all `false`). The manifest is written as a bundle file, never
registered as a canonical artifact.

## Human-Readable File Review

The root files give an operator a complete, readable review surface.

| File | Status | Safety Review |
| --- | --- | --- |
| manifest.json | shipped | entry point / provenance |
| README.md | shipped | human overview |
| prepared-plan.md | shipped | approval / phases / obligations |
| work-order.md | shipped | implementation guidance projection |
| verification-plan.md | shipped | proof requirements, commands not executed |
| status.md | shipped | status rollup |
| agent/handoff.md | shipped | bounded handoff prompt |
| agent/context.json | shipped | structured context |
| agent/instructions.md | shipped | implementation instructions |
| agent/constraints.md | shipped | stop conditions / boundaries |
| agent/verification.json | shipped | proof requirements only |
| agent/source-refs.json | shipped | refs / digests |

`README.md` carries the canonical-truth reminder and boundary note;
`verification-plan.md` states explicitly that commands are not executed by bundle
generation.

## Agent Handoff File Review

The `agent/` files are a bounded LLM-agent handoff, not an execution grant.
`handoff.md` carries goal / status / what-to-do / what-not-to-do / source refs /
stop conditions; `context.json` is structured (goal / scope / systems /
capabilities / steps / phases / obligations / artifactRefs); `constraints.md`
records non-goals, the source-write boundary, the command-execution boundary, and
stop conditions; `verification.json` lists requirements with `executesCommands:
false`; and `source-refs.json` cites canonical refs and digests. Agent files are
projection, cite their source, and never grant source-write or execution authority.

## Staleness / Provenance Review

The manifest's `staleness.state` is `stale` when the prepared plan is missing
(`missing-prepared-plan`), a `PathFreshnessReport` reports stale scoped context
(`freshness-stale`), a `RuntimeGraphDriftReport` has a high-severity open row
(`drift-changed`), or the `IntentStatusReport` lists stale inputs
(`status-stale-inputs`); otherwise `fresh`, with the reasons recorded in
`staleReasons`. **Stale bundles must not be treated as current handoff.** Provenance
is carried by the per-artifact refs and digests.

## Canonical Artifact Boundary Review

The bundle is a filesystem projection, not a registered artifact. The generator
creates no `WorkOrder`, `VerificationPlan`, `VerificationRun`, or
`VerificationResult`, registers no new artifact type, and mutates no canonical
artifact. The implementation-batch CLI smoke confirmed that after `intent bundle
write`, `rekon artifacts validate` stays clean and no new canonical artifact
exists. **Bundle generation does not create canonical artifacts.** **VerificationRun
and VerificationResult are optional proof context, not prerequisites for bundle
generation** — bundle generation succeeds without them, and they are not currently
wired as bundle inputs (a follow-up, not a blocker).

## Command / Source-Write Boundary Review

The renderer is a pure data transform, and the CLI's only filesystem effect is
`mkdir` + `writeFile` inside the bundle directory. No process is spawned, no
command string is executed, and no source path is opened for writing. **Bundle
generation does not execute commands.** **Bundle generation does not write source
files.**

## Intent Go Boundary Review

The bundle produces a handoff, not an execution. It does not run the verification
commands, schedule a run, or implement `intent:go`. The `agent/` files are a
bounded handoff that an operator or agent reads, not an automatic execution
trigger. **Bundle generation does not implement intent:go.**

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare bundle safe/stable | selected | path safety and projection boundaries hold |
| Intent Go / Execution Boundary Decision next | selected | final non-executing handoff surface exists |
| more bundle dogfood first | deferred | tests + smoke sufficient for safety |
| VerificationRun generation next | rejected/deferred | execution boundary not decided |
| source writes next | rejected | intent:go/source-write boundary not decided |

| Boundary | Decision |
| --- | --- |
| bundle vs canonical artifacts | projection vs truth |
| bundle vs artifact registry | no canonical artifact creation |
| bundle vs source writes | no source writes |
| bundle vs command execution | no commands |
| bundle vs intent:go | execution deferred |
| bundle vs stale handoff | stale bundle not current |
| bundle vs LLM agent execution | bounded handoff only |

## Recommendation

Adopt the finding: **Intent Plan Bundle / Agent Handoff is safe/stable as a human +
LLM-agent filesystem projection.** Path safety holds at the intent-id, renderer,
and CLI layers; canonical artifacts remain the source of truth; the manifest
records refs / digests / staleness / boundaries; and the canonical-artifact,
command, source-write, and `intent:go` boundaries all hold. Proceed to the **Intent
Go / Execution Boundary Decision** — the bundle is now the final non-executing
handoff surface, so the next boundary is whether and how Rekon ever moves from a
prepared handoff into execution. The alternative, a plan-bundle dogfood review, is
deferred: the tests and smoke are sufficient for safety.

## What This Does Not Do

This review changes no runtime behavior. It implements no `intent:go`, no
`VerificationRun` generation, and no source writes; it creates no canonical
artifacts, executes no commands, and mutates nothing. It bumps no versions and
publishes nothing.

## Follow-Up Work

- **Next:** Intent Go / Execution Boundary Decision (decide whether / how Rekon
  moves from prepared handoff into execution; still no `intent:go` implementation,
  no VerificationRun generation, no command execution, no source writes).
- **Follow-up (not a blocker):** wire `VerificationRun` / `VerificationResult` as
  optional bundle inputs so the bundle can surface proof results when available;
  bundle generation does not require them.
- **Deferred:** `intent:go`; VerificationRun generation; command execution; source
  writes; automatic agent execution.

> Decided (slice 98): the Intent plan bundle → Circe handoff projection is an import adapter, not a new planning system — Rekon emits a Circe `rekon-circe-handoff` package under `.rekon/intent/plans/<intent-id>/circe/` (handoff.json, phase-plan.json, work-orders/, verification-plans/) derived from the bundle. **Canonical Rekon truth remains `.rekon/artifacts/`**; Rekon does not execute the Circe handoff, does not run Circe commands during bundle generation, and does not write source files; Circe owns orchestration after import; intent:go remains deferred. Next: Intent Plan Bundle → Circe Handoff Projection Implementation. See [Intent Plan Bundle → Circe Handoff Projection Decision](./intent-plan-bundle-circe-handoff-projection-decision.md).

> Implemented (slice 99): the Intent plan bundle → Circe handoff projection now ships under `.rekon/intent/plans/<intent-id>/circe/` (handoff.json, phase-plan.json, work-orders/, verification-plans/), matching Circe's `rekon-circe-handoff` schema (validated against Circe's real normalizers). The bundle includes a Circe projection under `circe/`; **Circe handoff projection is an import adapter, not a new planning system**; **Canonical Rekon truth remains `.rekon/artifacts/`**; Rekon does not run Circe commands during bundle generation, does not execute the Circe handoff, and does not write source files; Circe owns orchestration after import; intent:go remains deferred. Next: Intent Plan Bundle → Circe Handoff Projection Safety Review. See [Intent Plan Bundle concept](../concepts/intent-plan-bundle.md).

> Reviewed (slice 100): the Intent plan bundle → Circe handoff projection is safe/stable as a Circe import adapter (schema-valid against Circe's real normalizers, boundary preserved, no Circe execution) — no blocker. But proof/gate traceability is incomplete: the PreparedIntentPlan approval/proof envelope, the IntentStatusReport gate status, and freshness/drift refs do not survive into `circe/`. **Circe handoff projection is an import adapter, not a new planning system**; **Canonical Rekon truth remains `.rekon/artifacts/`**; Rekon does not run Circe commands during bundle generation, does not execute the Circe handoff, and does not write source files; Circe owns orchestration after import; Circe projection must preserve Rekon's proof/gate traceability, and if it is incomplete, intent:go must remain blocked; intent:go remains deferred. Next: Intent Plan Bundle → Circe Proof/Gate Projection Enrichment. See [Intent Plan Bundle → Circe Handoff Projection Safety Review](./intent-plan-bundle-circe-handoff-projection-safety-review.md).
