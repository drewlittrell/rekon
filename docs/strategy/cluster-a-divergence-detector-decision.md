# Cluster-A Divergence Detector Decision (WO-9, queue slot 1)

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

**Status: pinned (WO-9, sensor track).** The first detector on the
declared layer; the bench moves off 0.0%.

## Step 0: substrate audit (found vs build)

1. **The 228 rekon-repo findings are NOT the lint chain's.** All 228 are
   `imports.noDistImports` (policy evaluator), all status `new` -
   accumulating untriaged. Lifecycle and adjudication artifacts exist but
   these findings flow ungoverned. This detector does not touch or
   duplicate them (different rule family); their triage is operator
   queue, not this slice.
2. **CapabilityArchitectureLintReport checks contract placement only:**
   allowedLayers/forbiddenLayers per configured CapabilityContract row
   against the phrase-backed CapabilityMap layer; system rules are
   stubbed `not-evaluated`. It reads NO grammar, NO imports, NO
   OwnershipMap. **All four WO axes were therefore build, not rebuild** -
   the lint chain remains the contract-placement complement, untouched.
3. **The bridge/writer path** (lint -> bridge-findings -> write-findings
   --dry-run/--confirm-finding-write -> lifecycle) exists end-to-end but
   is contract-driven and operator-confirmed. The bench, however, scores
   findings from the FindingReport that `rekon refresh` produces - so
   this detector is a **runtime evaluator rule** joining the policy
   evaluator's report (the same route as every policy rule, governed by
   the same lifecycle), not a CLI-only helper. The gated bridge path is
   unchanged and remains the curated route for contract violations.

## Carrier and emission

`packages/capability-policy/src/grammar-divergence.ts`, wired into the
policy evaluator (`grammar.divergence` joins BUILT_IN_POLICY_RULES, one
FindingReport per refresh). The evaluator compiles the grammar with the
REPO'S OWN overrides (`input.repo.root` from the runtime), so
ratification - and therefore jurisdiction - is always the scanned repo's
decision. No repo root or no config means no ratified archetypes and the
layered axes are inert by construction.

## Axes as shipped

- **layer_import** (symbol-level): WO-8 `import_specifier` facts with
  `resolvedTarget`, type-only edges skipped (erased at build - the
  `type_only_file` suppression class eliminated by design), evaluated
  against ratified topology forbidden edges + layer `cannotImport`.
- **canonical_bypass**: a forbidden edge whose layer pair has a DECLARED
  two-step required path through an intermediate (route->domain forbidden
  while route->service->domain is required). No declaration, no bypass.
- **canonical_gap**: a required topology edge with both layers populated
  and zero production imports realizing it. Declared and unsatisfied -
  never inferred.
- **placement**: base-tier forbiddenTypes law on production files (base
  is in findingsEligiblePackIds everywhere; hygiene law travels).
- **ownership**: declared CapabilityContract allowedSystems/
  forbiddenSystems joined against OwnershipMap path->ownerSystem. Fires
  only where contracts declare systems; corpus repos have none, so the
  axis is inert there (fixture-tested).
- **canonical_misplacement** maps in the rule-map but has no dedicated
  detection in v1: classic misplacement findings credit via file overlap
  with layer/bypass findings. Dedicated detection awaits pattern-signal
  evaluation (recorded follow-up).

Every finding: `ruleId: grammar.divergence`, `type: architecture`, a
`law` payload `{axis, packId, tier, declaration}` citing exactly what was
diverged from, and file subjects for bench identity matching.

## Corrections this slice surfaced

- **globToRegExp replace-chain bug (WO-4.1):** `**` -> `.*` emitted a
  `*` the following `*` -> `[^/]*` step mangled, silently limiting
  globstars to one path segment. Found by this slice's layer tests,
  fixed with placeholder tokens. Consequence: WO-4.1's figma-ds
  generality run under-matched layers. Re-run on the fixed glob and the
  WO-8 446-pair graph: **zero detector findings on figma-ds (the
  jurisdiction proof holds)**, while advisory-only evaluation of the two
  largest foreign archetypes now surfaces ~41-51 production advisories -
  exactly the FP class jurisdiction exists to contain, and exactly why
  figma-ds is not ratified.
- **Corpus carries kept findings only.** The 981 classic suppressions
  never reached the exported issues.json (no status labels). The FP
  gauntlet is therefore built from classic's NAMED suppression-reason
  shapes as synthetic fixtures (type_only_file,
  route_handler_with_service, factory_file_creates_deps,
  empty_constructor_stub), each proven silent by design; the
  corpus-level precision proxy is the matched-vs-new ratio against kept
  classic findings.

## Corpus ratification (slice setup, recorded)

Archetypes were ratified in the corpus repos' own
`.rekon/architecture-grammar.overrides.json` (corpus-local config, never
committed to this repository), selected by populated-layer coverage:
mentor-family-mvp -> fullstack-layered; codebase-intel ->
service-layered; **simulacrum -> none** (no template's required layers
all populated - jurisdiction says no law, honestly); **figma-ds -> none**
(the generality control). The corpus is the operator's; revert or adjust
at will - the bench reads whatever the repos declare.

## Severity/confidence

Static per axis (high for edges/bypass/ownership, medium for gap/
placement). D3's unified evidence-strength scale is the recorded
follow-up for aligning these with finding confidence.
