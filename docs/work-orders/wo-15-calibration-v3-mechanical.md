---
freshness:
  paths:
    - packages/capability-policy/src/**
    - packages/capability-ontology/src/grammar/**
---
# Work Order: Calibration v3, Mechanical Half (WO-15)

> Committed verbatim as issued by the operator (2026-06-12) per the
> docs/work-orders/ convention. Amendments land as commits.


**Slice type:** implementation (detector calibration from labeled
suppression classes, one compiler gap fix, one ruling execution). Sensor
and law tracks. **The WO-14 template binds in full** (Step 0,
jurisdiction, citations, scope paths, bench discipline, no
score-motivated filters, gate). **Convention notes:** committed before
execution; the rulings half of calibration v3 (naming vocabulary batch,
the 86-finding triage rulings) follows separately once the operator rules
on the planner's packages.

**Ratification note:** Part 3 executes the instrumentation path-scope
constraint recommended after WO-13. Operator dispatch of this order is
the ratification act; strike Part 3 before dispatch to rule the other
way.

---

## Part 1: dead_code v2 (the wave's red flag)

The WO-14 precision readout: `dead_code.unreferenced` fired on 16 of 19
suppressed-set members, and the fired-on classes are classic's exact
suppression reasons: `type_only_file`, `factory_file_creates_deps`,
`generated_file`, `barrel_file`. Teach the detector those four classes,
each from existing substrate, each exemption counted (the WO-13
transparency pattern):

1. **Type-only usage counts as usage.** WO-9 skips type-only imports for
   layer law because type dependencies don't violate runtime layering;
   reachability has the opposite purpose, so `import type` edges (the
   WO-8 `typeOnly` flag) are references. A file whose exports are
   consumed only as types is alive. Pin this purpose distinction in the
   decision memo.
2. **Barrel files are conduits, not consumers.** `reexport` facts make
   barrel detection deterministic: a file whose exports are
   substantially re-exports is exempt from unreferenced-export findings
   itself, and reachability flows *through* it to the original symbols.
3. **Generated files are exempt** by deterministic signals: `@generated`
   header markers and declared codegen globs (operator-extendable via
   the scan or rule config, same replace-semantics shape as WO-10's
   override).
4. **Factory and dynamic-registration files** get the conservative
   treatment: where the recovered suppression reasons identify the
   class, exempt by the declared signal available (registration-pattern
   detection rules from the grammar where present); where no
   deterministic signal exists, the finding stands and the class is
   reported as residual rather than silently exempted. No prose
   guessing.

**Expected deltas, stated:** precision against the suppressed set moves
from 16/19 toward at most 3/19, with any residual fired-on member named
and classed. The 1,047-finding dead_code triage pile drops by roughly the
type-only, barrel, and generated share (the triage estimate was ~70%);
the exact retirement count is reported by class. Coverage (50.4%) is
expected roughly stable because classic's keeps were by definition
outside its suppression classes; any credited-match loss is decomposed,
never absorbed.

## Part 2: operator topology edges compile in

`compileEffectiveGrammar` sets `topologies` only for archetype packs;
topology declared by overlay or operator-override packs never enters the
effective grammar (found during the WO-13 path-scope analysis). Fix:
overlay and operator-override topologies join the topologies map and the
advisory and detector edge evaluation, with the same findings-eligibility
the pack already has. Contract test: an override pack declaring a
forbidden edge produces the edge in the compiled grammar and a firing
evaluation; the no-override regression case is unchanged.

## Part 3: the instrumentation constraint (ratified by dispatch)

Execute the ruling: instrumentation is a route-boundary concept by its
own purpose claim. In mentor's corpus overrides, add topology law
forbidding `domain -> instrumentation` (the observed overreach: WO-13's
reported fourth retirement). Route stays legal per the WO-11/WO-13
entries; service stays unconstrained on current evidence (handoff
registration legitimately flows through services), with that scoping
recorded in the law text as its own revisit condition. Source:
`operator:wo-15#instrumentation-constraint`.

**Expected delta:** the `DecisionEngine.ts -> telemetry/handoff` finding
returns (+1 mentor divergence), joining the standing register as real
drift with its remedy (domain-side telemetry goes through the service
seam) until the real repo remediates. Recall unchanged.

## Non-goals

The rulings half of v3 (vocabulary batch, the 86-finding rulings); the
required-edge graduation; slot 8; any filter-policy changes; relitigating
the eight debt findings.

## Verification

Template gate; the four exemption-class contract tests with counters; the
topology compile test; the canonical bench re-run with the before/after
precision table per class, the dead_code retirement count by class, and
the returned constraint finding shown in the register.
