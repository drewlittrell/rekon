# Law Calibration v1 Decision (WO-11)

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

**Status: pinned (WO-11, law track).** First documented pass of the
finding-to-law-to-refinement loop: two operator rulings (ratified
2026-06-11, from the WO-9/WO-10 triage) land as scoped overlay law, and
the findings they cover retire by declaration - never by suppression.

## Step 0 (light): one assignment path, confirmed

`assignGrammarLayer` (capability-ontology, `grammar/index.ts`) is the
single layer-assignment code path: the advisory evaluator calls it
in-module and the divergence detector imports it
(`capability-policy/src/grammar-divergence.ts`). No unification was
needed; the semantics change lands once and applies everywhere.

## Most-specific-match assignment

First-match-wins (Map insertion order, overlay layers appended last) made
file-scoped sublayers inexpressible: a parent's broad glob always won.
New semantics: among all matching patterns, the one with the most path
segments wins; ties break to the longest pattern; remaining ties break to
declaration order. With no competing specific pattern, assignment is
unchanged - proven by the no-competition regression test and by the
corpus re-run, where only the two ruled files moved layers.

## The two rulings (operator-ratified law, corpus copy)

Landed as `layers` entries in the mentor corpus copy's
`.rekon/architecture-grammar.overrides.json` (merged; the ratified
archetype stays). The law text lives verbatim in the entry `description`
fields; the purpose claim IS the entry, per the operator's calibration
discipline:

- **http-middleware** (`infra/http/withBatonContext.ts`): canonical
  route-boundary middleware (baton turn instrumentation). Permitted from
  route because wrapping the handler makes no business decision and skips
  no service-layer guarantee.
- **boundary-contracts** (`core/domain/validation/requestSchemas.ts`):
  domain-owned request contracts at the trust boundary (parse, do not
  validate).

Both are scoped allows expressed as ontology refinement, never open
borders: no topology edges reference the new layers, so route imports to
exactly these files become legal by construction while every other
route-to-infra / route-to-domain import still fires (verified: every
other finding target's count is unchanged in the re-run).

## Provenance wart (recorded follow-up)

`GrammarSourceRefSchema` admits only classic-shaped refs
(`<file>.ts#<key>` / `<file>.ontology.yaml#<key>`), so operator law has
no honest provenance format. The entries use the conforming
`operator-overrides.ts#<id>` shape as the interim convention. Follow-up
(small, not this slice): an operator provenance variant, for example
`operator:<ruling-ref>`.

## Re-run results and the bench delta, decomposed

Finding-level: mentor divergence findings 123 -> 93. The delta is exactly
the 30 findings the rulings cover (26 route->withBatonContext + 4
route->requestSchemas); every other target count is byte-identical.

Bench-level: mentor weighted recall 6.3% -> 6.1% (156 -> 152 matched),
aggregate 2.9% -> 2.8% (171 -> 167 / 5,994). The WO expected recall
unchanged; the -4 is reported, not absorbed. All four lost matches sit on
ONE file (`app/api/v1/events/handler.ts`) whose only divergence finding
was its now-legal baton import, and they decompose as:

1. *"Route imports domain logic directly ... requestSchemas"* - classic's
   kept finding flags the exact import the operator just ruled legal.
   The ruling contradicts classic here by design; this is the
   suppression-layer-to-law-refinement migration working, not lost
   detection.
2. *"Route must opt into observability via withBatonContext"* - classic's
   INVERSE rule (routes must import the middleware). It was credited by
   file overlap with our finding that said the same import was illegal -
   a semantically wrong match that file-grain identity allowed. An honest
   loss of an accidental credit.
3. *"Security-related responses should be logged"* and *"List endpoints
   should implement pagination"* - unrelated content rules riding the
   same file through the umbrella `architecture` mapping's file-overlap
   credit. Same accidental-credit class.

None of the four represent detection capability this slice removed; the
recall denominator and every other repo are untouched (figma-ds and
simulacrum stay 0 findings; codebase-intel unchanged at 0.5%).

## The operator's next triage set (14 genuine-new survive)

4 canonical_bypass (infra/providers/index.ts,
infra/telemetry/handoff/index.ts, core/domain/DecisionEngineFactory.ts,
experiences/simile_builder/domain/ContractSyncPolicy.ts) + 10 placement
(base forbiddenTypes hygiene: Manager/Helpers/Utils/Base names, including
`tests/visual/framework/VisualTestBase.ts` - whose triage may itself
produce the next calibration ruling on non-production scope).
