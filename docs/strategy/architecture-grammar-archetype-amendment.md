# Architecture Grammar Archetype Amendment (WO-4.1)

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

**Status: pinned (WO-4.1, law track).** Ratifies the three-tier grammar
model and authorizes the re-disposition of every WO-4 `default-canon`
manifest row that this document's slice re-shelved. Rows in
`packages/capability-ontology/grammar-port-manifest.json` cite this memo
via their `reDisposition` field. The original carrier decision
(`architecture-grammar-pack-decision.md`) is not edited; its snapshot
banner already frames it.

## Trigger

The operator's "one codebase" challenge: the WO-4 port, executed two-tier
as ordered, placed the operator's architectural school in `grammar-base`
as default canon. Compiled as universal law, the cluster-A divergence
detector (Phase 1 queue slot 1) would have judged every repo by one
school's rules and reproduced classic's context-blind false positives as
Rekon's flagship detection. Law needs jurisdiction before the first
detector that enforces it lands.

## The three tiers

1. **Base** — the minimal universal canon. Content earns this tier with a
   per-row written argument (`baseArgument` in the manifest); the burden
   of proof sits with universality. After this slice: three hygiene
   anti-patterns (consoleLogging, deleteFeatureDuringRefactor,
   ambiguousSuffix), the seven forbidden generic type names, and the hub
   classification thresholds (graph mathematics). Eleven rows.
2. **Archetype** — the layered school, scoped to the four topology
   archetypes classic itself maintained, each carrying only the grammar
   whose referenced layers exist in it. A rule naming `route` does not
   attach to `domain_library`.
3. **Overlay** — project law (unchanged from WO-4: the
   `grammar-project-overlay-example` pack, 11 rows).

## Classic prior art (migration source, data only)

- `domain/issues/topology-contract-inference.ts` —
  `BUILTIN_TOPOLOGY_TEMPLATES`: the four archetypes ported verbatim
  (names, required layers, required/forbidden layer edges) into
  `grammar-archetype-fullstack-layered`, `-service-layered`,
  `-backend-layered`, `-domain-library`, with rows in the second
  completeness inventory (`classic-topology-keys.json`).
- `domain/analysis/expectedArchitecture.ts` — classic's expected-model
  assembly; its drift section relates to queue slot 1 (sensor track) and
  is not ported here.
- `domain/analysis/overridePrecedence.ts` — classic's declared-over-
  inferred precedence, preserved in the activation rule below.

## The activation rule (pinned)

1. **Declared** grammar (operator-authored overrides at
   `.rekon/architecture-grammar.overrides.json`) always wins — overrides
   apply last in `compileEffectiveGrammar`.
2. **Ratified** archetypes — listed in the `archetypes` array of the same
   overrides file (or passed as `ratifiedArchetypeIds`) — compile into
   the effective grammar and may back findings
   (`findingsEligiblePackIds`).
3. **Unratified** archetypes never back findings. In default compiles
   they do not enter the effective grammar at all (structural
   enforcement); advisory compiles (`advisory: true`) include them while
   `findingsEligiblePackIds` still excludes them. The advisory evaluator
   (`evaluateGrammarAdvisory`) emits advisories only and writes nothing.
4. **Reserved, not implemented:** the inferred-as-proposal layer
   (classic's `inferTopologyArchetypeFromLayers` with confidence and
   reasons) sits between 2 and 3 in spirit and ports with the
   bootstrapping work on the actuator track, where it becomes the
   `rekon init` proposal engine. Auto-apply does not return; proposal
   does.

## Re-disposition authorization

All 116 WO-4 `default-canon` rows were re-shelved by this slice: 105
content rows to the archetype tier (with per-row `archetypes` lists
recording exactly which packs each entry attached to) and 11 rows
remaining base with written arguments. The 47 vocabulary rows, 11
overlay-example rows, 5 rejected, 10 deferred, and 17 metadata rows are
untouched. The manifest's anti-gaming rules hold: nothing moved without
this citation, and the generality test below is the empirical check on
the placement.

## The generality test

Each archetype pack is compiled (advisory; nothing ratified) and the
advisory evaluator runs against the corpus's non-layered member. Every
fire is a tier-assignment error to be reported with a proposed
re-shelving — never silently fixed. The result is recorded in the WO-4.1
completion summary, and the activation behavioral test plus this run are
the permanent regression checks on jurisdiction.
