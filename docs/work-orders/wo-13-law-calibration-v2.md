---
freshness:
  paths:
    - packages/capability-ontology/src/**
    - packages/capability-policy/src/**
---
# Work Order: Law Calibration v2 (WO-13)

> Committed verbatim as issued by the operator (2026-06-11) per the
> docs/work-orders/ convention. Amendments land as commits.

**Slice type:** decision + implementation (overlay law edits, one schema
provenance variant, one vocabulary-aware mechanism refinement, re-run).
Law track. **Convention notes:** committed before execution; Step 0 light
(confirm the vocabulary override surface path, and confirm the divergence
placement axis and the advisory forbidden-type check share one
suffix-check code path, unifying them if not, per the WO-11 precedent).

This slice executes the operator's triage rulings of 2026-06-11 on the
13-finding set: two law refinements, one vocabulary declaration with its
mechanism, eight findings standing as governed debt, two standing as real
drift. None of the thirteen touch classic keeps, so no `overruled`
entries are needed; WO-12's list stays at its single seed.

## Part 1: operator provenance, made honest

`GrammarSourceRefSchema` admits only classic-shaped refs (the WO-11
wart). Extend it to also admit `operator:<ruling-ref>` (for example
`operator:wo-13#instrumentation`), migrate the two WO-11 entries'
`source` fields to the new form, and use it for every entry below.
Contract test: both forms validate; arbitrary strings still fail.

## Part 2: the overlay law edits (mentor corpus copy, verbatim)

In `.rekon/architecture-grammar.overrides.json`:

Edit 1, the instrumentation family. Remove the `http-middleware` entry
and replace it with:

```json
{
  "id": "instrumentation",
  "name": "Boundary instrumentation",
  "description": "Canonical observability instrumentation applied at the route boundary: baton turn context and telemetry handoff marks. Permitted from route because context propagation and trace marking make no business decision and skip no service-layer guarantee; the service path is still taken inside or alongside the instrumented call. Purpose claim: serves the route-layer law's goal (keep decisions out of routes) rather than violating it. Revisit if this layer accumulates anything beyond context propagation, trace marks, and observability registration. Future ruling queued: classic's inverse rule mandated the baton wrapper; graduating this layer to a required edge is a separate operator act.",
  "position": 4,
  "paths": [
    "infra/http/withBatonContext.ts",
    "infra/telemetry/handoff/**"
  ],
  "source": "operator:wo-13#instrumentation"
}
```

Edit 2, boundary contracts gains the operation identifiers. Supersede
the `boundary-contracts` entry: paths become

```json
[
  "core/domain/validation/requestSchemas.ts",
  "experiences/simile_builder/domain/ContractSyncPolicy.ts"
]
```

and the description gains one sentence after the existing purpose claim:
"Also covers domain-owned wire-operation identifiers consumed by request
schema literals at the parse boundary." Source migrates to
`operator:wo-13#boundary-contracts`.

The `archetypes` array and everything else in the file stays.

## Part 3: the vocabulary declaration

Through the existing vocabulary override surface (Step 0 confirms the
path), mentor's overlay declares the canonical noun `base`: "the base
derived state, the pre-overlay state layer." This is operator-ratified
vocabulary, recorded with this work order as its provenance.

## Part 4: vocabulary-aware suffix matching

The forbidden-type suffix check (placement axis and advisory, one code
path) consults the effective vocabulary before firing: when the matched
suffix token, lowercased, is a canonical noun in the repo's compiled
vocabulary (canon plus overlays), the check does not fire. Nouns only;
verbs and aliases don't exempt. Transparency guard: the evaluation
counts vocabulary-exempted suppressions and the re-run reports the
count, so a vocabulary declaration can never silently swallow a hygiene
class; an operator declaring `manager` a noun would show up as an
exemption spike in the next report.

Contract tests: `deriveAllBase.ts` stops firing once `base` is declared;
`Helpers.ts` still fires (not a noun); the same file in a repo without
the declaration still fires (vocabulary jurisdiction is per-repo); the
exemption counter reports correctly.

## Part 5: re-run and the standing register

Divergence re-run on the mentor corpus copy. Expected, stated exactly:
three findings retire (voice handler's telemetry-handoff import, the
simile handler's `ContractSyncPolicy` import, and `deriveAllBase.ts`),
findings 92 -> 89, every other count byte-identical, recall and the
aggregate untouched (no classic keeps involved), controls unchanged. Any
other delta is reported, not absorbed.

The completion summary then names the standing register the operator
ratified: eight placement findings held as governed debt (renames as
remediation, classic's correction pairs as the guide) and two
composition-root findings held as real drift with their one-move
remedies recorded (provider resolution moves into `createVoiceServices`;
engine acquisition moves into the gate service). These ten stay open on
purpose; their persistence is the register working, never a number to
optimize away.

## Non-goals

No required-edge graduation (queued as its own ruling). No mentor-repo
code remediation (the register's remedies are the real repo's work, not
the corpus copy's). No archetype content changes. No `overruled`
entries. No relitigation of the eight debt findings.

## Verification

Required checks per AGENTS.md; the provenance contract test; the four
suffix-matching contract tests; overrides validating through
`compileEffectiveGrammar` with clean notes; the before/after table with
the three expected retirements and the exemption count.

## PURPOSE PRESERVATION CHECK

- Original problem: law that can't distinguish a domain noun from a
  generic suffix, or instrumentation from decisioning, generates noise
  that teaches operators to ignore it; classic answered with
  suppression, which decayed.
- What this slice preserves: every refinement is a scoped declaration
  with a purpose claim and operator provenance; the hygiene law keeps
  its teeth (eight findings stand); real drift stays visible (two
  findings stand); and the vocabulary exemption is counted where
  everyone can see it.
- What would mean we failed: the instrumentation layer accumulates
  business logic unnoticed; vocabulary declarations become a suffix
  amnesty; the standing register shrinks by anything other than real
  remediation; or expected deltas get absorbed.
- Regression tests: the suffix-matching matrix and the exemption
  counter, permanent.

## CODEBASE-INTEL ALIGNMENT

The descriptive ontology (vocabulary canon) informs the prescriptive
grammar (forbidden types) for the first time: the two halves classic
kept in one directory now cooperate as designed. Classic's correction
pairs remain the remediation guide for the standing register; classic's
inverse baton rule is the queued future ruling this slice's law text
names.
