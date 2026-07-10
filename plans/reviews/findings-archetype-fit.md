# Findings: archetype fit investigation

Investigator: claude-loop-operator (chat), 2026-06-12
Question: why figma-ds and simulacrum show near-zero recall when the
package-platform pack was added to cover them.
Corrected: 2026-06-12, see the correction section. The first committed
version attributed simulacrum's empty layers partly to Swift code
outside the TypeScript observer. That was wrong.

## Kill list

Every configuration hypothesis was tested and eliminated with
evidence. The pack is registered in BUILTIN_GRAMMAR_ARCHETYPE_PACKS
with id grammar-archetype-package-platform. Simulacrum's overrides
declare that exact id and the compile ratifies it:
findingsEligiblePackIds includes the pack, topology present, nine
layers armed. Refresh cache staleness was disproved by a full scan
producing identical results. Layer globs match simulacrum's actual
layout where that layout exists. Pipeline plumbing was disproved by
running evaluateGrammarDivergence offline with the real evidence graph
and full inputs: mentor reproduces 184 findings against the pipeline's
183, and simulacrum reproduces zero. Zero is the evaluator's true
answer.

## Mechanism: jurisdiction over vacuum

Simulacrum's observable surface populates four of the pack's nine
layers (surface 387, kernel 150, config 58, generated 18); core,
capability, product, contract, and adapter map zero files, and 258
files map to no layer. Forbidden-edge law needs imports between
populated layers; required-edge law needs both ends populated. Five
empty layers means the topology mostly governs vacuum. The system
reports this as zero findings, indistinguishable from full
conformance.

Why those layers are empty (corrected): the pack's layer globs encode
rekon's own anatomy, and simulacrum shares the package-platform
philosophy but not the file layout. core/ in simulacrum holds
governance documents (core/config, core/architecture), zero
TypeScript. product-pack/ and product-packs/ hold contract data, not
code. No packages/ tree exists, so the capability, contract, and
adapter globs (packages/capability-*, packages/sdk,
packages/llm-provider) can never map. The observer missed nothing:
871 file facts cover the full TS surface, and the 258 unmapped files
are exactly tests/. Simulacrum's real code anatomy is four layers:
kernel (152), surface (web plus api, about 384), tools/config (58),
generated (18).

figma-ds was simpler: no overrides file existed, so nothing was ever
ratified there. Base canon does apply without overrides (its
pre-wiring anti-pattern matches prove it), but no topology law.

## The fit matrix (inference prototype)

Force-ratifying each builtin pack against each repo's evidence graph
and scoring mapped files, populated layers, and findings under law:

- figma-ds reads as fullstack-layered decisively: 68% mapped, 6/6
  layers populated, 29 divergence findings under its law.
  Package-platform maps 61% but populates 3/9 layers.
- simulacrum's pack choice was right in school: package-platform maps
  70% against fullstack-layered's 15%. The problem is anatomy, not
  school: five of the pack's layers describe directories simulacrum
  does not have as code.

Prototype: a fifty-line harness compiling each pack advisory and
running the divergence evaluator offline (session archive,
fit-matrix.mjs). The algorithm: per pack, mapped-file share, populated
layer share, findings count under force-ratified law.

## Measured result of wiring figma-ds

One overrides file ratifying fullstack-layered, full scan, canonical
bench: figma-ds matched 5 -> 28 (naming_violation 17, anti_pattern 5,
architecture 4, dead_code 2), recall 1.9% -> 10.5%, aggregate 8.7% ->
9.1% (520 -> 543 weighted). Mentor, simulacrum, and reference-repo
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
   overrides file with provenance, replacing hand-authored wiring, and
   surfaces per-layer population at ratify time so a 4-of-9 topology
   is caught at setup, not months later.
4. Same school, different anatomy is a named case the inference design
   must handle: a repo can be the right archetype in philosophy while
   the pack's layer globs describe a sibling's directories. The flow
   needs per-repo layer adaptation at ratify time (overrides already
   support it) or anatomy-profile variants per pack.
5. Open judgment for simulacrum, now properly grounded: author a
   faithful topology over its four real code layers in overrides
   (kernel imports nothing above itself, surface reaches kernel only
   through declared entries, generated consumed only via declared
   paths), or keep the aspirational nine-layer topology and accept
   silence until those trees exist as code. Operator decision.

## Correction (2026-06-12)

The first committed version of this memo explained the empty layers
partly as "parts are Swift, outside the TS observer." That was a
misread of Package.swift at the repo root. Package.swift defines
SimulacrumUI, a single library under swift-packages/: the SwiftUI
runtime that Simile's compiled output consumes. It is the output
target, not the application. Simile is a TypeScript compiler; nothing
architectural lives in Swift, and the observer covered the full code
surface. The corrected mechanism is anatomy mismatch as described
above.
