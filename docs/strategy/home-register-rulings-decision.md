# Home Register Rulings - Decision (WO-19)

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

**Status: pinned (WO-19, law track, rekon home).** Dispatch ratified
both rulings as written; nothing was struck.

## Part 1: the contract layer - governed law was wrong, and corrected

`grammar-archetype-package-platform` gained the optional `contract`
layer (`operator:wo-19#contract-layer`): position 2, `packages/sdk/**`
(removed from surface), imports kernel only, five forbidden edges
(contract to core / capability / product / surface / adapter),
`requiredLayers` unchanged. **The finding, plainly: this is the
system's first demonstration that governed law can be wrong and has a
correction path - a stronger property than drift detection alone.**
The detector caught a misclassification in the law (sdk-as-surface);
the repo was right (kernel-only dependency list, the manifest's own
words); the law adjusted through the operator pathway with full
provenance.

- Rekon: the 11 layer_import findings retired as corrected
  classification (250 -> 239); **zero new findings from the
  reassignment - verified by run, not assumed** (the sdk's imports are
  kernel-only in fact, so no contract-edge fires).
- Corpus: **byte-identical asserted and PROVEN** at the finding-id
  level on all four repos (simulacrum ratifies the shared pack; no
  `packages/sdk/**` path exists there; the layer is optional).
- Observed gap, reported not absorbed: the order's edge list does not
  include kernel -> contract, so a kernel file importing the sdk would
  not fire today. Consistent with "kernel imports nothing above
  itself" this edge is a future one-line amendment candidate.

## Part 2: noDistImports scopes to production source

`imports.noDistImports` gained operator-config exemptions in the WO-15
generatedGlobs pattern: `.rekon/scan-scope.json` key
`distImportExemptions: [{glob, reason}]`, repo-jurisdiction, source
`operator:wo-19#dist-scope`. The named globs from the run data:

| Glob | Heads | Purpose claim (verbatim in config) |
| --- | --- | --- |
| `examples/**` | 3 | Examples demonstrate consuming the built package, so importing dist there is the point, never a violation. |
| `tests/fixtures/**` | 1 | Rule fixtures simulate violations by design (the head is literally `uses-dist.ts` in the parity fixture). |

**Exempted share: 4 of 228.** The remainder - **224, counted and
decomposed: 204 `tests/contract/*.test.mjs` + 20 `packages/*/test/*.test.mjs`,
nothing else** - is ONE coherent class, not 224 individual fixes: the
keyless-gate convention, where the committed suite deliberately
exercises BUILT output (`dist/index.js`) per the AGENTS.md gate design.
It stands as the named register item "test-suite-consumes-built-output"
and reads as a follow-up ruling candidate (a third purpose claim), not
a remediation backlog. Reported; the rulings as dispatched exempt only
the two ruled classes.

Wiring note (caught by the run, fixed in-slice): the runtime passes
`input.repo.root`, not `input.repoRoot`; the first refresh ignored the
config silently. The evaluator now derives from either key; the live
re-run confirms exempted 4 / remainder 224.

## Part 3: housekeeping

- **Memory correction, confirmed:** WO-17 WAS the "86-finding triage
  rulings" amendment the WO-14 queue named. The executor memory now
  records it; the stale "cited amendment follows" queue item is
  retired.
- **Same-slice contradictions (WO-18 convention): checked, none.**
  These are home-register findings, not bench keeps; no classic keep
  loses a partner; `overruled.json` is untouched at 44.
- Bench: untouched, asserted and verified - 8.7% (520/5,950); no
  denominator movement, no credit movement.

## The home register after this slice

| Item | Count | Disposition |
| --- | --- | --- |
| test-suite-consumes-built-output (dist imports) | 224 (204 contract + 20 package tests) | named register item; follow-up ruling candidate |
| dead_code.unreferenced | 5 | stands |
| debt.markers | 3 | inventory by design |
| grammar.antiPattern | 3 | stands |
| capability -> surface layer_import | 0 | RETIRED (Part 1 corrected classification) |
| BXRX port | - | simulacrum's recorded item (WO-18) |
| kernel -> contract edge gap | - | observed; one-line amendment candidate |

Self-scan total: 250 -> **235**.
