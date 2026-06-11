---
freshness:
  paths:
    - packages/capability-policy/src/**
    - packages/capability-js-ts/src/**
    - tests/bench/**
---
# Work Order: Detection Wave 1 (WO-14)

> Committed verbatim as issued by the operator (2026-06-11) per the
> docs/work-orders/ convention. Amendments land as commits.

**Slice type:** wave order: one shared detector template plus six thin
sub-orders for parallel dispatch. Sensor track. **Convention notes:** this
file commits before any sub-order executes (first agent commits, the rest
verify at tip); each agent executes exactly one assigned sub-order;
amendments land as commits to this file.

**Wave protocol, pinned.** Wave A: sub-orders A, B, C (disjoint surfaces).
Wave B on A's heels: D, E, F. Per-slot bench runs are working data; the
**canonical numbers come from one wave-end re-run** (Wave close, below).
Triage of the wave's genuine-new findings happens once, combined, after the
re-run; calibration rulings batch into law calibration v3. The operator's
pending instrumentation path-scope ruling (constrain recommended) and the
operator-topology-edge mechanism gap both ride v3, not this wave.

**Out of this wave, deliberately:** slots 3 (drift preservation ports) and
9 (intent divergence) stay design-grade slices; slot 8 waits on A;
required-edge graduation, actuator and runtime tracks, and the apex
refresh are separate threads.

---

## The detector slice template (binding for every sub-order)

1. **Step 0 substrate audit** from tier-1 sources; decision memo reports
   found-versus-built; substantial existing substrate reshapes the
   sub-order to composition and says so.
2. **Composition over invention:** evaluator rules on the policy chain per
   the WO-9 exemplar unless the sub-order states otherwise; new fact kinds
   follow WO-8's id-stability discipline (never enrich existing kinds).
3. **Jurisdiction is absolute** wherever law derives from grammar:
   findings only from `findingsEligiblePackIds`; a jurisdiction test
   proves silence on unratified repos; figma-ds stays a control.
4. **Every finding carries its citation:** the law, marker, or evidence it
   rests on, with pack and tier where applicable.
5. **Scope is the shared path:** non-production segments and agent-scratch
   exclusions apply by construction (the unified code paths from WO-12 and
   WO-13; do not reimplement).
6. **Bench discipline:** stable `rekonRuleId`, rule-map rows updated with
   citations, dispositions flip per the pinned bench policy, expected
   movement stated before the run, per-repo readout primary,
   expected-delta-or-report for everything else. **No score-motivated
   filters**, ever.
7. **Determinism** proven where facts are added; gate green (typecheck /
   test / build); completion summary in house format. The wave-level
   purpose preservation check is this template plus each sub-order's
   decisions-doc citation; per-slice PPC sections are not required in this
   wave.

---

## Sub-order A (queue slot 2): tech_debt deterministic core

Citation: detection-design-decisions.md §B. Markers as evidence facts (new
kinds): TODO / FIXME / HACK comments, `@deprecated` tags, disabled tests
(`it.skip`, `describe.skip`, `xit`, `test.skip` and peers), plus a
`debt.markers` emitter. **This sub-order also lands the goal-level
coverage scorer** (bench policy item 2): the B cluster is LLM-origin, so
matching is file-set coverage against classic's tech_debt and stub keeps,
not per-finding identity. Expected movement: the marker-backed share of
2,119 + 21 via coverage. Slot 8 (trend) builds on this later; trend is out
of scope here.

## Sub-order B (queue slot 6): dead_code reachability

Citation: §C, dead_code row. Unreferenced exports via WO-8 symbol facts;
reachability via GraphSlices from declared roots. **The workspace-import
obligation is binding** (WO-8 risk): exports consumed through workspace
package names must not read as dead; extend the resolver with a
workspace-name alias table read from workspace manifests (data read,
deterministic, same fail-soft discipline as tsconfig aliases). Roots come
from manifest data (`main`, `exports`, `bin`) and app entry conventions;
**absent roots, the rule runs in unreferenced-exports mode only and says
so** (no reachability claims without declared roots). Classic's dead_code
baseline is LLM-origin: coverage scoring. Expected: share of 250.

## Sub-order C: suppressed-dataset recovery (corpus, not a detector)

Citation: WO-9 risks; bench policy item 3. Locate classic's 2,155
suppressed findings (the WO-3 dossier computed per-rule suppression rates,
so the data exists in classic's filter artifacts or the dossier's data
files; Step 0 finds the authoritative source), export them into the parity
corpus as the labeled-negative set, and wire the bench's precision
gauntlet to score every detector rule against it: fire on kept, silent on
suppressed, reported per rule in the bench output. The named-shape
fixtures from WO-9 stay as permanent fast tests; this makes precision
measured instead of sampled. No detector changes.

## Sub-order D (queue slot 4): capability_overlap

Citation: §C, capability_overlap row (priority redesign). Two systems
implementing the same declared capability, detected on the capability
graph; **declared sharing disambiguates intentional overlap from drift**
(contracts' shared-capability declarations exempt, with the declaration
cited in the exemption). Step 0 inventories the suggestions and phrase
machinery for existing overlap logic before building. Per-finding identity
matching unless Step 0 shows the classic baseline was prose-origin, in
which case coverage scoring with a citation. Expected: share of 358.

## Sub-order E (queue slot 5): naming contract

Citation: §D, naming row. The {Entity}{Role} contract as an
ontology-backed check: role tokens validate against the grammar's declared
roles, entity tokens against the compiled vocabulary (the WO-13
cooperation extended; the vocabulary-exemption counter and the
manager-amnesty tripwire pattern apply here too). Names are declarations
of system membership, never pattern-list matches. Naming law is
archetype-tier: ratified repos only, jurisdiction test required, figma-ds
silent. Per-finding identity. Expected: up to 724 of 846.

## Sub-order F (queue slot 7): anti_pattern and pattern_violation pack

Citation: §B anti_pattern row and §A pattern_violation row. The
deterministic sub-rules re-expressed as policy rules reading the ported
grammar content (anti-patterns and patterns with structural signals),
tier-aware: base hygiene applies everywhere, archetype-bound anti-patterns
only under ratification. **Classic's correction pairs ride along:** each
finding's payload carries the declared correction, so remediation guidance
ships inside the finding. LLM-judged remainder stays out (semantic
overlay, later). Expected: deterministic share of 125 + 4.

---

## Wave close

The last sub-order to land (or a dedicated close-out run) performs the
canonical wave-end bench re-run and produces the combined report: movement
table per repo per rule, precision against the recovered suppressed set
(if C landed), coverage-scorer results for the LLM-origin rules,
vocabulary-exemption counters, and the **combined genuine-new triage set**
handed to the operator as one package. Calibration v3 then batches: the
wave's rulings, the instrumentation constraint (pending operator
constrain/allow, constrain recommended), and the operator-topology-edge
compile gap. Until the wave-end run, no per-slot number is quoted as the
scoreboard.
