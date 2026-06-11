# Detection Wave 1 Decisions (WO-14)

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

**Status: pinned (WO-14, sensor track).** Six sub-orders under one
binding template, executed sequentially in wave order by a single agent
(the wave protocol's parallel dispatch is the multi-agent affordance;
sequential execution preserved every binding constraint, with per-slot
bench runs as working data and one canonical wave-end re-run).

## Found-versus-built (Step 0, per sub-order)

- **A (tech_debt core): built.** No marker logic existed on any chain.
  New `debt_marker` fact kind (WO-8 id discipline: no location in value
  or provenance; identical lines dedupe) + `debt.markers` emitter
  (non-prod excluded except disabled tests, which live in test trees by
  nature). The coverage scorer landed in parity-core per bench policy
  item 2: rule-map rows take `scoring: "coverage"`; credit mechanics
  unchanged (file overlap); the report gains per-rule file-set coverage.
- **B (dead_code): composed + built.** WO-8 symbol facts carry the
  edges; the GraphSlice TYPE exists in kernel-graph but no refresh
  produces a slice artifact, so reachability is composed in the
  evaluator from the same facts. Workspace-import obligation honored:
  `loadWorkspaceAliases` (manifest data, WO-8 tsconfig-alias precedent)
  resolves package-name imports; package entry files are declared roots
  and their exports never flag. Absent roots -> unreferenced-exports
  mode, stated in the payload.
- **C (suppressed recovery): found.** The authoritative source is each
  real repo's `.codebase-intel/reports/filtered-issues.json`
  (`{issue, reason}` entries). **2,148 of the dossier's 2,155 recovered**
  (mentor 1,222 + codebase-intel 704 + simulacrum 111 + figma-ds 111);
  the 7-finding gap is run-vintage drift, recorded not chased. Exporter
  takes paths as arguments (private paths never committed); the bench
  scores fire-on-kept / silent-on-suppressed per rule with the
  ambiguous-file guard.
- **D (capability_overlap): built.** No overlap logic existed in the
  phrase/suggestion machinery. Systems come only from the OwnershipMap;
  contract-declared sharing exempts with the declaration cited. Corpus
  repos declare no ownership, so the axis is inert there (0/773
  coverage, honest) - fixture-proven both ways. Coverage scoring: Step 0
  found the classic baseline prose-origin (LLM-phrased capability names).
- **E (naming contract): built on ported law.** Roles ARE the grammar's
  43 fileTypes (archetype-tier -> jurisdiction is structural: unratified
  repos compile zero roles and stay silent). Entity-only names whose
  tokens are all canonical nouns are vocabulary-exempt, counted (WO-13
  mechanism; manager-amnesty tripwire applies). Unknown entity tokens
  under a declared role are surfaced, not fired, in v1 - the vocabulary
  is young; firing would recreate the missing-context FP class.
- **F (anti-pattern pack): the signals were ported data.** The grammar
  antiPattern rows carry `details.detectionRules` regexes and dont/do
  correction pairs. Provider emits `content_signal` facts (presence
  only, drift-guarded by test against the pack rows); the evaluator
  applies law tier-aware (base everywhere, archetype under ratification,
  service-scoped signals layer-checked, row-declared exceptions like
  tools/** honored). Implemented: consoleLogging,
  businessLogicInService, directDatabaseInService, conditionalHooks.
  Out: prose-rule rows (routeOrchestration, routeBusinessLogic) and
  detectable:false rows - the LLM remainder; ambiguousSuffix stays with
  the placement axis (no double-fire). **pattern_violation (4 classic
  fires) stays missed-redesigned**: its rows carry prose
  structuralSignals, not regexes; mapping it to this pack would claim
  coverage the detector does not have.

## Canonical wave-end readout (the only quotable numbers)

Weighted recall **2.8% -> 8.7% (523/5,993)**. Per-repo (primary):
mentor-family-mvp 14.3% (355/2,485), codebase-intel 5.4% (155/2,877),
simulacrum 2.2% (8/364), figma-ds 1.9% (5/267). Mentor's pre-wave 152
matched are intact (147 architecture + 3 canonical_gap + 2
canonical_bypass); the wave added naming 99, anti_pattern 53, dead_code
41, tech_debt 10 there.

**The control distinction, stated precisely:** figma-ds and simulacrum
moved ONLY on base-tier hygiene and evidence rules (dead_code,
consoleLogging) - which apply everywhere by design. Jurisdiction-gated
law (naming.contract, grammar.divergence, archetype anti-patterns)
remains ZERO on both. The control holds for everything ratification
gates.

Coverage (LLM-origin baselines): dead_code 50.4% (122/242 files);
tech_debt 0.9% (8/939) - classic's LLM-judged debt simply is not where
the markers are; the marker-backed share is honestly small and the
trend layer (slot 8) is where this goal grows; stub 0/15;
capability_overlap 0/773 (inert without ownership declarations).

Precision vs the recovered suppressed set (fire on kept, silent on
suppressed): grammar.divergence 14 fired / 1,093 suppressed;
debt.markers 2/419; naming.contract 6/139; grammar.antiPattern 10/112;
capability.overlap 0/255; **dead_code.unreferenced 16/19 - the wave's
one red precision flag.** The fired-on classes are classic's
type_only_file, factory_file_creates_deps, generated_file, barrel_file
suppression reasons: dead_code v2 needs type-only-export awareness and
factory/barrel handling. Named for calibration v3.

## The combined genuine-new triage set (one package, 1,469)

| Rule | mentor | codebase-intel | simulacrum | figma-ds |
| --- | --- | --- | --- | --- |
| dead_code.unreferenced | 516 | 212 | 274 | 45 |
| naming.contract | 278 | 58 | 0 | 0 |
| grammar.antiPattern | 36 | 8 | 7 | 0 |
| grammar.divergence | 10 | 11 | 0 | 0 |
| debt.markers | 7 | 3 | 4 | 0 |

dead_code dominates (1,047 of 1,469) and its precision flag explains
why: the suppressed-set classes it fires on are the same classes
inflating the new set. Triage order recommended: (1) dead_code v2
type-only/factory/barrel calibration, (2) naming vocabulary + role
calibration on the 278-file mentor set, (3) the small divergence and
anti-pattern remainders.

## Calibration v3 queue (batched per the wave protocol)

1. dead_code type-only-export + factory/barrel awareness (the precision
   flag above).
2. The instrumentation path-scope ruling (constrain recommended,
   pending from WO-13).
3. The operator-topology-edge compile mechanism gap.
4. Whatever the operator's triage of the 1,469-set rules.
