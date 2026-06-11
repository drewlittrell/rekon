---
freshness:
  paths:
    - tests/bench/**
    - packages/capability-policy/src/**
---
# Work Order: Overruled Disposition and Scope Completion (WO-12)

> Committed verbatim as issued by the operator (2026-06-11) per the
> docs/work-orders/ convention. Amendments land as commits.

**Slice type:** implementation (bench scoring policy amendment plus one
scope-list completion; small). Sensor track. **Convention notes:**
committed before execution; Step 0 light (confirm where the scorer
classifies losses and where the non-production segment list lives).

**Trigger:** the WO-11 decomposition. Operator law calibration now
contradicts classic's uncalibrated keeps by design, and the bench reads
that as recall regression. A metric that punishes correct rulings is a
perverse incentive aimed at the system's own return flow.

---

## Part 1: the `overruled` disposition

A new finding-level list, `tests/bench/overruled.json`: entries of
`{classicId, rulingRef, note}` where `rulingRef` cites a committed
operator ruling (an overlay entry id or ruling memo section). The scorer
treats overruled findings like `rejected` rows: they leave the
denominator and render in the report under their own heading with
citations.

Guards, pinned:

- **Only operator rulings overrule.** An entry without a resolvable
  `rulingRef` into a committed law artifact fails validation. Agents may
  not add entries on their own judgment; the bench README says so
  explicitly, alongside the existing anti-gaming rules.
- **Overruling is per-finding, never per-rule.** A ruling retires the
  specific classic findings it contradicts; the rule's other findings
  stay scored.
- **Honest losses stay lost.** Semantically wrong matches (WO-11's
  inverse-rule case) and umbrella file-overlap noise do not qualify; the
  decomposition discipline continues for them.

Seed the list with exactly one entry: the classic kept finding on
`app/api/v1/events/handler.ts` flagging the route->`requestSchemas`
import, ruling reference the `boundary-contracts` overlay entry (WO-11).
The other three WO-11 losses do not qualify and are noted as such in the
memo. Re-run the bench; the report shows the new heading and the
recomputed denominator, with before/after stated.

## Part 2: top-level `tests/` joins the non-production segments

The divergence and advisory scope's non-production list carries the
classic-parity segments but not a top-level `tests/` directory; mentor's
`tests/visual/framework/VisualTestBase.ts` placement finding rides that
gap. Add the segment, with a contract test, and report the finding's
retirement as a scope delta (it leaves the operator's 14-finding triage
set, shrinking it to 13).

## Non-goals

No detector changes beyond the segment list; no rule-map row edits; no
new rulings (the placement cluster stays the operator's triage set); no
relitigation of WO-11's honest losses.

## Verification

Required checks per AGENTS.md; the `rulingRef` validation test (an entry
citing a nonexistent ruling fails); the scope contract test; the bench
re-run with the overruled heading rendered and every delta explained.

## PURPOSE PRESERVATION CHECK

- **Original problem:** the bench exists to measure detection against
  ground truth, and ground truth just became living: operator rulings
  refine it. A scoreboard that can't absorb ground-truth updates will
  either decay into noise or pressure the operator away from calibrating.
- **What would mean we failed:** overruled becomes a recall lever (agent
  entries, rule-level sweeps, missing citations), or honest losses get
  laundered through it.
- **Regression test:** the rulingRef validation and the seeded
  single-entry list with its citation, permanent.

## CODEBASE-INTEL ALIGNMENT

Classic's ground truth was static because its law was static. Rekon's law
is governed and alive, so its measurement must distinguish "we failed to
detect what classic detected" from "the operator ruled classic wrong."
This slice teaches the scoreboard that difference, with the same citation
discipline as every other reclassification.
