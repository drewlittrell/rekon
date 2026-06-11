# Overruled Disposition Decision (WO-12)

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

**Status: pinned (WO-12, sensor track).** The scoreboard learns the
difference between "we failed to detect what classic detected" and "the
operator ruled classic wrong."

## Step 0 (light)

Losses classify in `tests/bench/parity-core.mjs` (`classifyParity` rows;
`computeWeightedRecall` excludes `rejected` from the denominator;
`renderMarkdownReport` renders the sections). The non-production segment
list lives in `packages/capability-policy/src/grammar-divergence.ts`
(`isNonProductionPath`), where `/tests/` was matched only with a leading
slash - a repo-root `tests/` tree never hit it, while `tools/` already
had the `startsWith` form. Both parts landed at exactly those sites.

## The disposition

`tests/bench/overruled.json`: `{classicId, rulingRef, note}` entries,
validated by `validateOverruledList` before scoring. The classification
is checked per classic finding id BEFORE rule-level dispositions -
per-finding, never per-rule, by construction. Overruled findings leave
the denominator (tracked as `overruledWeight`) and render under their
own report heading with per-finding citations. The bench README pins
guard 4 beside the existing anti-gaming rules: only operator rulings
overrule; an unresolvable `rulingRef` (missing file, missing fragment,
or no `#` at all) fails the run loudly.

## The seed, and the three losses that do NOT qualify

Seeded with exactly one entry: classic `route-complexity-4f606b38`
("Route imports domain logic directly ... requestSchemas" on
`app/api/v1/events/handler.ts`), rulingRef
`docs/work-orders/wo-11-law-calibration.md#boundary-contracts` - the
operator's WO-11 ruling declares exactly this import legal, so classic's
kept finding is overruled ground truth.

The other three WO-11 losses on the same file stay lost, per the
"honest losses stay lost" guard:

1. *"Route must opt into observability via withBatonContext"* - classic's
   inverse rule; its prior match against our violation finding was
   semantically wrong. Not overruled: the ruling does not contradict it.
2. *"Security-related responses should be logged"* - umbrella
   file-overlap noise; no ruling addresses it.
3. *"List endpoints should implement pagination"* - same class.

## Re-run results

- Aggregate: 2.8% (167/5,993) - denominator 5,994 -> 5,993, exactly the
  one overruled weight; credit unchanged (the finding was a miss, so
  overruling moves only the denominator side).
- Mentor: 6.1% (152/2,485), `overruledWeight: 1`, the report's
  "Overruled by operator ruling" heading renders the entry with its
  citation.
- Scope delta (Part 2): mentor divergence findings 92 (placement 15 ->
  14; the `tests/visual/framework/VisualTestBase.ts` placement finding
  retired as non-production). The operator's genuine-new triage set is
  now 13 (4 canonical_bypass + 9 placement).
- Nothing else moved: figma-ds and simulacrum stay 0; codebase-intel
  stays 15/2,877.
