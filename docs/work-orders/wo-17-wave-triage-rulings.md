---
freshness:
  paths:
    - packages/capability-policy/src/**
    - packages/capability-js-ts/src/**
    - tests/bench/**
---
# Work Order: Calibration v3, Wave Triage Rulings (WO-17)

> Committed verbatim as issued by the operator (2026-06-12) per the
> docs/work-orders/ convention. Amendments land as commits.


**Slice type:** decision + implementation (operator rulings as law, scope
completions, overruled entries). Law and sensor tracks. **The WO-14
template binds.** **Ratification note:** operator dispatch ratifies every
part; strike any part to rule the other way. This is the cited amendment
WO-16 named; with it, calibration v3 closes.

---

## Part 1: the 18 naming overruled entries (WO-16 queue item 1)

Eighteen classic naming keeps flag names the WO-16 rulings declared
valid: four bare `Registry.ts` files, `Engine.ts`, `AuthRequestSecurity`,
`CallbackSecurity`, `Client.ts`, `ClientBridge`, `PlumePatchPolicy`,
`Constants`, `Bootstrap`, and peers per the WO-16 run data. Add
`overruled.json` entries per finding, rulingRef
`docs/work-orders/wo-16-calibration-v3-rulings.md#part-3` (or the
bare-role semantics note where that's the covering ruling), each note
naming the covering role. Per WO-12: per-finding, exact denominator
delta reported.

## Part 2: the logging seam (mentor ruling)

The consoleLogging anti-pattern fires on the logging infrastructure
itself. Declare mentor's logging seam exempt, as a row-scoped exception
with a purpose claim: **the seam that implements logging is the one
sanctioned console boundary; everything else routes through it.** Paths:
`infra/logging/**`, `infra/realtime/logging/Logger.ts`,
`infra/utils/ClientDebugLog.ts`,
`infra/telemetry/handoff/ServerLogger.ts`. Source
`operator:wo-17#logging-seam`. Everything outside the seam keeps firing;
the ~35 mentor app-code fires stand as the remediation backlog with
classic's correction pair (route through LoggingService) in their
payloads.

## Part 3: console on command surfaces (codebase-intel and simulacrum rulings)

CLI commands and dev servers print to console by design; stdout is the
product surface. Per-repo overlay exceptions for the consoleLogging row:
codebase-intel `commands/**`, root-level `run-*.ts` and `test-*.ts`
scripts; simulacrum `web/server/**` and `kernel/cli/**`. Purpose claim:
the rule prevents stray logging in production app paths, never the
command surface whose output is the point. figma-ds's three route-handler
fires are NOT exempted; they stand (base law on a control repo, and
they're real).

## Part 4: mentor's ui layer, declared (the worksheet executed)

Mentor's overlay gains the `ui` layer: paths `surfaces/web/**` and
`experiences/*/surfaces/**` (the executor verifies against the WO-16
layer-verification data and reports any path the six ui-home roles need
beyond these). Source `operator:wo-17#ui-layer`. Then scope the
conditionalHooks anti-pattern row to where hooks can exist: the ui
layer, `.tsx` files, and hook-role files. Expected: the fires on
`.types.ts`, config files, and repositories retire as the FP class they
are; the genuine hook-file candidates stand as a register cluster for
remediation.

## Part 5: codebase-intel's evaluator-routes correction

`domain/issues/evaluators/routes/**` holds rule evaluators, not HTTP
routes; the archetype's route glob mis-assigns them. ci's overlay assigns
that path to the domain layer (most-specific-match wins), source
`operator:wo-17#evaluator-routes`. Expected: the five Checks/KeepThin/
Shared bypass findings retire as layer mis-assignment.

## Part 6: scope completions (mechanical)

`.agents` joins `DEFAULT_AGENT_SCRATCH_SEGMENTS` (third agent-scratch
class observed in the wild); `.dist` joins the core ignores (a built
artifact was scanned as source); root `.tmp-*` files likewise. Contract
test additions in the WO-10 pattern; report the retired-fire count.

## Part 7: stands, recorded (no law change)

The businessLogicInService cluster (~20) stands pending a five-file
sampled read in a future session; blind refinement of a regex-driven row
is prose-guessing by another name. The composition-root family (ci's
eight handlers pulling `main-assembly`, mentor's matched bypass mass)
stands as credited drift with remedies recorded.
`DecisionEngine -> withStep` stands under the instrumentation
constraint's remedy (domain-side telemetry through the service seam).
The debt markers are inventory by design. Nothing in this part moves a
number; the part exists so the memo shows these were judged, not missed.

## Expected deltas, stated

Denominator: minus the Part 1 weight (exact reported). Mentor
anti-pattern fires drop by the seam (~6) plus the conditionalHooks FP
class (~10); ci by the command-surface share (~14) plus five evaluator
bypasses; simulacrum by its command surface (~7) plus the `.tmp` scope
fire; the `.agents` and `.dist` scope retirements reported by count.
Recall: Part 1 raises the percentage by denominator exit; credit
unchanged. Controls: figma-ds unchanged except nothing (its three
fires stand). Every other delta decomposed, never absorbed.

## Verification

Template gate; contract tests for each exception path (fires-outside,
silent-inside, per-repo jurisdiction); the scope tests; overruled
validation green; before/after per part; the updated register listing.
