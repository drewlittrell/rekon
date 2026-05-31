# Intent VerificationPlan Handoff Safety Review

## Decision Summary

The Intent VerificationPlan handoff generator shipped in the ninety-third slice
(`7a8aaaa`) as the proof-planning half of the Rekon intent spine: `rekon intent
verification-plan generate` reads a proof-approved `PreparedIntentPlan` (gated by
`IntentStatusReport` and a handoff-time freshness / drift recheck), classifies each
verification requirement command for safety, and writes exactly one
`VerificationPlan`. Because that plan carries executable-looking command *text*, it
is reviewed here before any VerificationRun, command execution, or `intent:go` work
begins.

This review finds the handoff **safe / stable as an explicit gated VerificationPlan
generator** (no blocker). **Intent VerificationPlan handoff is VerificationPlan
artifact generation, not intent:go.** **VerificationPlan generation requires a
proof-approved PreparedIntentPlan.** **VerificationPlan generation requires
PreparedIntentPlan verification requirements.** **IntentStatusReport gates
VerificationPlan generation but does not generate VerificationPlan.** **WorkOrder is
optional in v1 and cited when available.** **Blocked handoff writes no
VerificationPlan.** **Generated VerificationPlan must trace back to
PreparedIntentPlan.** **VerificationPlan generation does not create WorkOrder.**
**VerificationPlan generation does not create VerificationRun or
VerificationResult.** **VerificationPlan generation does not execute commands.**
**VerificationPlan generation does not write source files.** **intent:go remains
deferred.** **Plan bundle / LLM-agent handoff directory work is deferred to the next
phase plan.**

The recommended next slice is the **Intent Plan Bundle / Agent Handoff Directory
Decision** — the next missing operator / agent surface.

| Surface | Status | Boundary |
| --- | --- | --- |
| buildIntentVerificationPlanHandoff helper | shipped | evaluates proof-planning gate |
| classifyVerificationCommand sanitizer | shipped | classifies command text only |
| intent verification-plan generate CLI | shipped | writes VerificationPlan only on pass |
| blocked path | shipped | writes no VerificationPlan |
| generated VerificationPlan intentHandoff block | shipped | traceability only |
| WorkOrder | optional | cited when available |
| VerificationRun / VerificationResult | deferred | not created |
| intent:go | deferred | no execution |

## Why This Review Exists

`PreparedIntentPlan.verificationRequirements` are proof obligations, not a
`VerificationPlan`; the WorkOrder handoff covers implementation guidance, and this
handoff covers proof planning. A `VerificationPlan` lists verification *commands* —
the artifact closest to command execution on the read-only intent spine. Before any
VerificationRun / execution / `intent:go` decision, the generator must be confirmed
to plan without running, to classify commands conservatively, and to remain
read-only and traceable over its inputs. This review grounds those guarantees in the
shipped code.

## Helper And CLI Reviewed

`buildIntentVerificationPlanHandoff`
(`packages/capability-model/src/intent-verification-plan-handoff.ts`) is a pure
function: it reads only the fields of the artifacts handed to it, computes the
requirement→command/check mappings, runs the gate, and returns either
`{ status: "blocked", blockers, mappings }` (no `verificationPlan`) or
`{ status: "generated", verificationPlan, blockers: [], mappings }`. It reads no
files, writes no artifacts itself, executes no commands, writes no source, and
mutates none of its inputs.

The CLI branch `rekon intent verification-plan generate`
(`packages/cli/src/index.ts`) resolves a required `PreparedIntentPlan`
(`--prepared-plan`, must reference a `PreparedIntentPlan`), the latest-or-pinned
`IntentStatusReport`, and the optional `WorkOrder` / `PathFreshnessReport` /
`RuntimeGraphDriftReport`, builds a `VerificationPlan` header, and calls the helper.
On `blocked` it sets a non-zero exit code and writes nothing; on `generated` it
persists exactly one `VerificationPlan` via `store.write(..., { category: "actions"
})` and prints the ref.

## Gate Review

The generation gate is allowed only when **all** of the following hold; any failure
produces a high-severity blocker and no VerificationPlan.

| Gate | Required State |
| --- | --- |
| PreparedIntentPlan approval | approval.status approved |
| PreparedIntentPlan status | status.value prepared |
| verification requirements | non-empty and safe |
| IntentStatusReport | work-ready / work-in-progress / verification-ready |
| blockers | no high-severity blockers |
| freshness recheck | no stale scoped context after approval |
| drift recheck | no new high-severity drift after approval |
| downstream handoff | verificationPlanAllowed true and sourceWriteAllowed false |

The helper additionally requires the `PreparedIntentPlan` and its ref, the
`IntentStatusReport` and its ref, and non-empty `verificationRequirements`, and it
blocks on any requirement that classifies as `rejected`. The gate matches the
slice-92 decision exactly.

## Blocked Path Review

When `blockers.length > 0 || !plan || !planRef`, the helper returns
`{ status: "blocked", blockers, mappings }` with no `verificationPlan`, and the CLI
sets `process.exitCode = 1` and writes nothing. The implementation-batch CLI smoke
confirmed this against a real `assess → prepare → status` spine: a not-approved plan
produced six deterministic blockers, exit code 1, and **no VerificationPlan, no
WorkOrder, no VerificationRun, and no VerificationResult written**, with `artifacts
validate` clean and the source tree untouched. **Blocked handoff writes no
VerificationPlan.**

## Generated VerificationPlan Review

On a passing gate the helper produces exactly one `VerificationPlan` with
`source: "intent-handoff"`. Safe requirement commands populate `commands`;
requirement reasons and commandless / needs-review requirements populate
`successCriteria` and the `intentHandoff.requirementMappings[].check` field; and the
request goal becomes a scope success criterion. The CLI persists this single
artifact and nothing else.

## Command Safety Review

`classifyVerificationCommand` classifies each requirement command as text only — it
never executes anything.

| Command Class | V1 Behavior |
| --- | --- |
| safe allowlist command | copied to VerificationPlan.commands |
| commandless clear requirement | copied to success criteria / check guidance |
| needs-review command | not executable; success criteria / needs-review mapping |
| shell-control / destructive command | blocked |
| ambiguous requirement | blocked |

The safe allowlist is a small set of deterministic patterns (`npm run <script>`,
`npm test`, `node scripts/<name>.mjs`, `rekon … --json`, `rekon artifacts
validate|freshness`). The reject set covers shell-control (`;`, `&&`, `||`, `|`,
`>`, `<`, backticks, `$(`, `${`) and destructive / network / privilege tokens (`rm`,
`mv`, `cp`, `chmod`, `chown`, `curl`, `wget`, `ssh`, `scp`, `sudo`, `git push`, `npm
publish`). A command with a reject token, or a requirement with neither command nor
reason, blocks generation (`unsafe-command` / `ambiguous-requirement`). Anything
outside the allowlist but free of reject tokens is `needs-review` — surfaced as a
check, never as an executable command.

## Traceability Review

Every generated VerificationPlan carries an `intentHandoff` block recording the
`preparedIntentPlanRef`, the `intentAssessmentReportRef` (from the plan's source),
the `intentStatusReportRef`, the optional `workOrderRef` / `pathFreshnessReportRef` /
`runtimeGraphDriftReportRef`, the `verificationRequirementIds`, `phaseIds`,
`obligationIds`, and the full `requirementMappings` (with per-requirement safety
classification). The header `inputRefs` carries the same refs. Traceability is
descriptive only — it grants no authority and triggers no downstream action.

## Freshness / Drift Recheck Review

The handoff rechecks freshness and runtime drift at generation time. A supplied or
latest `PathFreshnessReport` whose `status` is `stale` (or whose entries are
`changed` / `missing`) blocks with `freshness-stale`; a `RuntimeGraphDriftReport`
with any high-severity row that is not `in-sync` / `not-evaluated` blocks with
`drift-changed`. Both inputs are optional — an absent report does not block —
matching the decision's "checked when available" rule. There is no override path.

## WorkOrder Boundary Review

The handoff creates no `WorkOrder`. `WorkOrder` is an optional input: when supplied
it is cited in `intentHandoff.workOrderRef` and the plan's `workOrderRef` for
traceability and status context, and when absent the handoff still generates. **WorkOrder
is optional in v1 and cited when available.** **VerificationPlan generation does not
create WorkOrder.**

## VerificationRun / VerificationResult Boundary Review

The handoff produces a plan, never a run or a result. It creates no
`VerificationRun` and no `VerificationResult`; the generated plan's
`intentHandoff.boundary` is literal-typed
`{ createsWorkOrder: false, createsVerificationRun: false, createsVerificationResult:
false, executesCommands: false, writesSourceFiles: false }`. **VerificationPlan
generation does not create VerificationRun or VerificationResult.**

## Command / Source-Write Boundary Review

The helper is a pure data transform and the CLI's only side effect is one
`store.write` into the artifact store's `actions` category. No process is spawned,
no command string is executed, and no source path is opened for writing. **VerificationPlan
generation does not execute commands.** **VerificationPlan generation does not write
source files.**

## Intent Go Boundary Review

The handoff produces an artifact, never execution. It does not run the plan's
commands, schedule a run, or implement `intent:go`. **intent:go remains deferred.**

## Next Phase Plan: Plan Bundle And Agent Handoff

The non-executing intent preparation chain is now complete: assessment →
proof-approved preparation → status → WorkOrder generation → VerificationPlan
generation, all read-only and traceable. The next missing operator / agent surface
is a stable plan-bundle directory that projects those canonical artifacts into
human-readable and LLM-agent handoff files. **Plan bundle / LLM-agent handoff
directory work is deferred to the next phase plan** — this review implements no
bundle. The phased sequence is:

1. Intent Plan Bundle / Agent Handoff Directory Decision.
2. Intent Plan Bundle / Agent Handoff Implementation.
3. Intent Plan Bundle / Agent Handoff Safety Review.
4. Intent Go / Execution Boundary Decision — only after the plan-bundle safety
   review.

The directory to evaluate in that next decision defaults to
`.rekon/intent/plans/<intent-id>/`, keeping a clean split between
`.rekon/artifacts/...` (canonical machine-readable truth) and
`.rekon/intent/plans/<intent-id>/` (the human + agent handoff bundle). A sketch to
evaluate later:

```text
.rekon/intent/plans/<intent-id>/
  manifest.json
  README.md
  prepared-plan.md
  work-order.md
  verification-plan.md
  status.md
  agent/
    handoff.md
    context.json
    instructions.md
    constraints.md
    verification.json
    source-refs.json
```

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare VerificationPlan handoff safe/stable | selected | explicit gate and sanitizer hold |
| plan bundle / agent handoff directory decision next | selected | next missing operator/agent surface |
| more VerificationPlan dogfood first | deferred | tests + smoke sufficient for safety |
| VerificationRun generation next | rejected | execution boundary not decided |
| intent:go next | rejected | execution remains deferred |

| Boundary | Decision |
| --- | --- |
| VerificationPlan handoff vs intent:go | artifact generation, not execution |
| VerificationPlan generator vs IntentStatusReport | status gates, generator writes |
| VerificationPlan generator vs WorkOrder | no work guidance creation |
| VerificationPlan generator vs VerificationRun / VerificationResult | no command/proof result creation |
| VerificationPlan generator vs command execution | no commands are run |
| VerificationPlan generator vs source writes | no writes |
| VerificationPlan generator vs PreparedIntentPlan | consumes approved plan, mutates nothing |
| VerificationPlan generator vs plan bundle | bundle deferred to next phase |

## Recommendation

Adopt the finding: **Intent VerificationPlan handoff is safe/stable as an explicit
gated VerificationPlan generator.** The gate requires a proof-approved
`PreparedIntentPlan` with non-empty verification requirements, the command sanitizer
classifies commands as text and blocks unsafe / ambiguous ones, the blocked path
writes no VerificationPlan, the generated path writes exactly one traceable
VerificationPlan, and the WorkOrder / VerificationRun / VerificationResult / command
/ source-write / `intent:go` boundaries all hold. Proceed to the **Intent Plan
Bundle / Agent Handoff Directory Decision**. The alternative, an Intent
VerificationPlan Handoff publication / operator-surface review, is deferred: the
generator is already CLI-visible, and the higher-value next gap is where prepared
plan output and LLM-agent handoff live.

## What This Does Not Do

This review changes no runtime behavior. It implements no plan bundle / agent
handoff, no VerificationRun generation, and creates no `WorkOrder` /
`VerificationRun` / `VerificationResult`; it executes no commands, writes no source
files, and implements no `intent:go`. It mutates no `PreparedIntentPlan`,
`IntentStatusReport`, `WorkOrder`, `VerificationPlan`, `VerificationRun`,
`VerificationResult`, `PathFreshnessReport`, or `RuntimeGraphDriftReport`. It bumps
no versions and publishes nothing.

## Follow-Up Work

- **Next:** Intent Plan Bundle / Agent Handoff Directory Decision (pin the
  `.rekon/intent/plans/<intent-id>/` directory shape, how it projects canonical
  artifacts, and how staleness / provenance are represented; no bundle
  implementation).
- **Deferred:** plan-bundle implementation; VerificationRun generation; command
  execution; source writes; `intent:go`.
