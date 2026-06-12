# Findings: archetype fit investigation

Investigator: claude-loop-operator (chat), 2026-06-12
Question: why figma-ds and simulacrum show near-zero recall when the
package-platform pack was added to cover them.

## Kill list

Every configuration hypothesis was tested and eliminated with
evidence. The pack is registered in BUILTIN_GRAMMAR_ARCHETYPE_PACKS
with id grammar-archetype-package-platform. Simulacrum's overrides
declare that exact id and the compile ratifies it:
findingsEligiblePackIds includes the pack, topology present, nine
layers armed. Refresh cache staleness was disproved by a full scan
producing identical results. Layer globs match simulacrum's actual
layout. Pipeline plumbing was disproved by running
evaluateGrammarDivergence offline with the real evidence graph and
full inputs: mentor reproduces 184 findings against the pipeline's
183, and simulacrum reproduces zero. Zero is the evaluator's true
answer.

## Mechanism: jurisdiction over vacuum

Simulacrum's observable surface populates four of the pack's nine
layers (surface 387, kernel 150, config 58, generated 18); core,
capability, product, contract, and adapter map zero files, 258 files
map to no layer, and the root is Package.swift so the workspace
package table is empty and the WO-18 package-boundary axis is inert.
Forbidden-edge law needs imports between populated layers;
required-edge law needs both ends populated. Five empty layers means
the topology mostly governs vacuum. The system reports this as zero
findings, indistinguishable from full conformance.

figma-ds was simpler: no overrides file existed, so nothing was ever
ratified there. Base canon does apply without overrides (its
pre-wiring anti-pattern matches prove it), but no topology law.

## The fit matrix (inference prototype)

Force-ratifying each builtin pack against each repo's evidence graph
and scoring mapped files, populated layers, and findings under law:

- figma-ds reads as fullstack-layered decisively: 68% mapped, 6/6
  layers populated, 29 divergence findings under its law.
  Package-platform maps 61% but populates 3/9 layers.
- simulacrum's pack choice was right: package-platform maps 70%
  against fullstack-layered's 15%. The problem is the five empty
  layers, not the choice.

Prototype: a fifty-line harness compiling each pack advisory and
running the divergence evaluator offline (session archive,
fit-matrix.mjs). The algorithm: per pack, mapped-file share, populated
layer share, findings count under force-ratified law.

## Measured result of wiring figma-ds

One overrides file ratifying fullstack-layered, full scan, canonical
bench: figma-ds matched 5 -> 28 (naming_violation 17, anti_pattern 5,
architecture 4, dead_code 2), recall 1.9% -> 10.5%, aggregate 8.7% ->
9.1% (520 -> 543 weighted). Mentor, simulacrum, and codebase-intel
returned byte-identical rows: the delta landed in isolation. The new
canonical baseline is 9.1% (543/5950). The remaining figma-ds gap is
226 missed-redesigned rows awaiting the pending redesign-queue
detectors and per-repo triage.

## Product requirements extracted

1. Jurisdiction health is part of every grammar evaluation. A zero
   must be impossible to confuse with conformance: the report either
   states conformant over N evaluated edges or states k of m layers
   populated with the law largely unevaluable.
2. Scan-time archetype inference: compile all builtin packs advisory,
   score fit (mapped share, layer population, findings under law),
   propose the winner in scan output. The fit matrix is the working
   prototype.
3. A ratify command (rekon grammar ratify <pack-id>) that writes the
   overrides file with provenance, replacing hand-authored wiring.
   Overrides remain the operator surface for custom packs and
   per-repo layer adaptation.
4. Open judgment for simulacrum: adapt the empty layers' globs to
   where those concepts actually live (parts are Swift, outside the
   TS observer), or keep the aspirational topology and add
   required-edge law among populated layers so drift is detectable.
   Operator decision, informed by the histogram.
