# Calibration v3, Wave Triage Rulings - Decision (WO-17)

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

**Status: pinned (WO-17, law + sensor tracks). Calibration v3 closes
with this slice.** Operator dispatch ratified every part; nothing was
struck.

## Parts as landed

- **Part 1:** the eighteen naming overruled entries (4 of them
  hub_suffix_requires_hub_status keeps riding the same files - noted,
  ratified by dispatch as run-data peers). rulingRefs into WO-16 Part 3
  for role-covered names; into the WO-16 memo's batch-semantics line
  (`stem === role`) for bare ported roles (Engine, Constants,
  Bootstrap). Denominator 5,984 -> 5,966. Overruled list: 28.
- **Part 2:** mentor's logging seam exempted as a row-scoped supersede
  (`operator:wo-17#logging-seam`); the exception mechanism became
  glob-capable, which also fixed a latent gap: the ported row's own
  `**/*.test.*` exception never matched under prefix-only logic.
  Mentor consoleLogging 43 -> 38; the 38 stand as the remediation
  backlog with correction pairs in their payloads.
- **Part 3:** command surfaces exempted per repo
  (`operator:wo-17#console-command-surfaces`): codebase-intel 14 -> 3,
  simulacrum 11 -> 6 (simulacrum gained its first overrides file -
  antiPatterns only, still unratified). figma-ds's three fires stand,
  untouched.
- **Part 4:** mentor's ui layer declared (`operator:wo-17#ui-layer`).
  Worksheet verification: the boundary-matching glob semantics make
  `surfaces/web/**` cover modules-nested surfaces too, so NO paths were
  needed beyond the ruled two (AssessmentsTab assigns ui). The
  conditionalHooks row is scoped to where hooks can exist (ui layer,
  .tsx, hook-role files): mentor 25 -> 15, the .types/config/repository
  FP class retired exactly.
- **Part 5:** ci's evaluator-routes correction. Step 0 found the
  mechanism: `**/routes/**` vs `**/domain/**` is a FULL specificity tie
  (3 segments, 12 chars) decided by declaration order - route won. The
  overlay domain row adds the 6-segment evaluator path; the five
  Checks/KeepThin/Shared bypasses retired exactly (ci divergence
  24 -> 19).
- **Part 6:** `.agents` joined the agent-scratch defaults, `.dist` the
  core ignores, root `.tmp-*` files the walk skip. Retired-fire count at
  finding level: mentor -3 dead_code; the rest of the class was
  fact-level contamination without standing findings.
- **Part 7 (stands, judged not missed):** businessLogicInService (~20)
  pending the sampled read; the composition-root family as credited
  drift; DecisionEngine -> withStep under the instrumentation remedy;
  debt markers as inventory.

## The headline: one declaration recovered forty matches

Declaring the ui layer ACTIVATED the fullstack archetype's dormant
`ui -> domain` forbidden edge: 94 layer_import findings appeared, every
one that edge, and classic agreed on 40 of them (mentor gained
architecture 33 + pattern_violation 4 + ownership_violation 2 +
canonical_gap 1, weighted +40, net +35 after the seam losses). Mentor
recall 13.5% -> 15.0% on a single ruling. This is the system model's
declaration-bounded thesis demonstrated: the bench climbs when
declarations grow. The ~54 unmatched ui->domain findings join the
triage register as the next cluster.

## Every delta decomposed

Aggregate 8.3% (496/5,984) -> **8.7% (520/5,966)**.

- Denominator -18 (Part 1 exact).
- Mentor credit +35 (the ui activation above, minus five anti_pattern
  keeps on logging-seam files the Part 2 ruling contradicts).
- ci credit -10: nine anti_pattern keeps on command-surface console
  files (Part 3 contradicts them) plus ONE architecture keep on
  KeepThin.ts - classic also mis-read the evaluator as a route; the
  Part 5 correction contradicts that keep.
- simulacrum credit -1: one anti_pattern keep on kernel/cli/index.ts
  (Part 3 contradiction).
- **Sixteen fresh overruled-candidates** (mentor 5 seam + ci 10 + sim 1):
  classic keeps contradicted by this order's own rulings - the recurring
  calibration pattern, fourth occurrence. Reported; the list grows only
  by operator ruling.
- Controls: figma-ds byte-identical (46 findings, 3 console fires
  standing).

## The register after calibration v3

8 placement debt + 2 composition-root drift + 1 instrumentation
constraint + naming tail (~210) + dead barrels (40) + mentor console
backlog (38) + ci/sim console remainders (3 + 6) + conditionalHooks
genuine cluster (15) + the new ui->domain unmatched cluster (~54) +
businessLogicInService (~20, pending sampled read).
