---
freshness:
  paths:
    - packages/capability-ontology/src/grammar/**
---
# Work Order: Law Calibration v1 (WO-11)

> Committed verbatim as issued by the operator (2026-06-11) per the
> docs/work-orders/ convention. Amendments land as commits.

**Slice type:** decision + implementation (one assignment-semantics fix in
capability-ontology, the first operator-ratified overlay entries in the
mentor corpus config, divergence re-run). Law track. **Convention notes:**
committed before execution; Step 0 light (confirm `assignGrammarLayer` and
the divergence detector's layer assignment share one code path before
changing it).

This slice executes two operator rulings (ratified 2026-06-11, from the
WO-9/WO-10 triage): the baton middleware edge and the boundary validation
edge, both as scoped allows expressed as ontology refinement, never as
open borders.

## Part 1: most-specific-match layer assignment

`assignGrammarLayer` currently returns the first layer whose glob matches,
in Map insertion order, with overlay-defined layers appended last. That
makes file-scoped sublayers inexpressible: a parent layer's broad glob
always wins. Change assignment to most-specific-match-wins: the matching
pattern with the most path segments wins; ties break to the longest
pattern; remaining ties break to current order. Apply the same semantics
everywhere layers are assigned (the advisory evaluator and the divergence
detector must share the path; Step 0 confirms they do or this slice
unifies them).

Contract tests: the overlap case (`infra/**` vs
`infra/http/withBatonContext.ts` assigns the specific layer), tie cases,
and a no-overlay regression run proving existing corpus assignments are
unchanged where no specific pattern competes.

## Part 2: the mentor overlay entries (operator-ratified law)

Add to the mentor corpus copy's
`.rekon/architecture-grammar.overrides.json` (which already carries the
ratified archetype), as layer entries. The law text below lands verbatim
in the `description` fields; the purpose claim is the entry, per the
operator's calibration discipline.

```json
{
  "layers": [
    {
      "id": "http-middleware",
      "name": "HTTP middleware",
      "description": "Canonical route-boundary middleware (baton turn instrumentation). Permitted from route because wrapping the handler makes no business decision and skips no service-layer guarantee: the service path is still taken inside the wrapper. Purpose claim: serves the route-layer law's goal (keep decisions out of routes) rather than violating it. Revisit if this layer accumulates anything beyond context propagation and observability.",
      "position": 4,
      "paths": ["infra/http/withBatonContext.ts"],
      "source": "operator-overrides.ts#http-middleware"
    },
    {
      "id": "boundary-contracts",
      "name": "Boundary contracts",
      "description": "Domain-owned request contracts applied at the trust boundary (parse, do not validate). Permitted from route because parsing a wire shape makes no business decision and skips no service-layer guarantee; the domain stays the single source of truth for what a valid request is. Purpose claim: serves the route-layer law's goal rather than violating it. Revisit if these schemas accumulate transport detail (headers, status codes, envelopes); at that point they move to a boundary-contracts home and this entry retires.",
      "position": 3,
      "paths": ["core/domain/validation/requestSchemas.ts"],
      "source": "operator-overrides.ts#boundary-contracts"
    }
  ]
}
```

Merge these into the existing overrides object (the `archetypes` array
stays); do not replace the file wholesale. No topology edges reference the
new layers, so route imports to them are legal by construction, and every
other route-to-infra or route-to-domain import still fires.

## Part 3: provenance wart, recorded

`GrammarSourceRefSchema` admits only classic-shaped refs, so operator law
has no honest provenance format; the entries above use the conforming
`operator-overrides.ts#<id>` shape as the interim convention. Record in
the decision memo: the schema needs an operator provenance variant (for
example `operator:<ruling-ref>`), a small follow-up, not this slice.

## Part 4: re-run and report

Divergence re-run on the mentor corpus copy. Expected: the
route-to-withBatonContext findings retire (roughly thirty of the 41
genuine-new), the route-to-requestSchemas findings retire (the handful),
the 82 classic-matched findings are untouched, recall is unchanged, and
nothing else moves. Any unexpected delta is reported, not absorbed. The
completion summary shows the before/after table and lists the surviving
genuine-new findings: that remainder is the operator's next triage set.

## Non-goals

No archetype content changes (the middleware concept may graduate to the
archetype later, cited to this ruling). No detector changes beyond shared
layer assignment. No schema extension for provenance (recorded). No real
mentor-repo edits (corpus copy only; the entries are the template for the
real repo when the operator applies them).

## Verification

Required checks per AGENTS.md; the assignment contract tests; the
before/after divergence table; the overrides file validating through
`compileEffectiveGrammar` with the collision notes clean.

## PURPOSE PRESERVATION CHECK

- Original problem: classic's false positives were context-blind, and its
  remedy was a suppression layer that decayed. Rekon's remedy is law
  refinement with provenance: the finding cites its law, the operator
  refines the law, the finding retires by declaration.
- What would mean we failed: the refinement legalizes more than the ruling
  (an open border instead of a canonical path); the purpose claims get
  trimmed from the descriptions; or the re-run moves findings the rulings
  don't cover and the delta gets absorbed silently.
- Regression test: the overlap-assignment contract test and the
  before/after table, permanent.

## CODEBASE-INTEL ALIGNMENT

Classic's suppression layer becomes Rekon's governed law-refinement loop:
the same false-positive classes that classic filtered after detection,
Rekon retires before detection by teaching the law the difference. First
documented pass of the finding-to-law-to-refinement loop the system model
names as the return flow.
