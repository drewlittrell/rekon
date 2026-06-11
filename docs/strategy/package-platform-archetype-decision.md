# The Package-Platform Archetype - Decision (WO-18)

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

**Status: pinned (WO-18, law + sensor tracks).** The library's first
net-new archetype; operator dispatch ratified the pack content, both
repo ratifications, and the Part 4 entries (the four shaping decisions
were ruled 2026-06-12).

## Part 1: the pack

`grammar-archetype-package-platform` joined the registry as the fifth
pack - provenance `migratedFrom: "operator"`, every row sourced
`operator:wo-18#<id>`. Eight layers (kernel 1, core/capability/adapter
2, product 3, surface 4, generated/config -1), fourteen forbidden
edges, `requiredLayers: ["kernel", "surface"]`. The generated layer's
exemption from naming and placement law is implemented as id-keyed law
(the WO-15 Factory-role pattern): both evaluators skip files a declared
`generated` layer claims; config stays in scope for naming, outside the
import stack only.

## Part 2: the package-boundary axis

`grammar.divergence` gained the `package_boundary` axis: an
import_specifier whose resolvedTarget lies inside another workspace
package but was not reached through that package's name (bare or
subpath) is a deep-import violation. Archetype-tier, gated on
package-platform findings-eligibility (jurisdiction contract-tested).
The workspace table comes from `loadWorkspacePackages` (manifest
workspaces, the WO-14 B loadDeclaredRoots pattern). Law text carries
the purpose claim verbatim: deep imports rot the public surface until
its barrels die (the WO-16 forty-dead-barrels discovery is this law's
evidence).

## Part 3: both home ratifications

**Rekon (self-scan, bench-invisible).** The worktree `.rekon` config
ratifies the archetype; the first governed self-triage:

| Rule | Count |
| --- | --- |
| imports.noDistImports | 228 (the operator's predicted number, exact; heads: examples/ + fixture trees) |
| grammar.divergence / layer_import | 11 - ALL `capability -> surface`, and systematic: every capability package's src/index.ts imports a surface package |
| dead_code.unreferenced | 5 |
| debt.markers | 3 |
| grammar.antiPattern | 3 |
| grammar.divergence / package_boundary | **0 - and load-bearing: 720 cross-package production imports, all 720 through package names, 0 deep** |

The home register seed is the table above (no remediation this slice).
The 11-file cluster poses one architectural question for the operator:
capability -> surface is either drift to remediate, a sign the imported
types belong further down the stack, or a surface-definition carve-out
to rule.

**Simulacrum (corpus).** Ratified in corpus overrides plus the
deprecated-location overlay (`product-pack/**` -> product,
`operator:wo-18#product-pack-deprecated`, retiring when BXRX ports
over - simulacrum's own recorded work item). **Result: byte-identical,
verified honest, not a wiring gap:** eligibility confirmed in the
compiled grammar; 5,192 resolved import edges judged; every observed
cross-layer edge is allowed (surface->kernel 265, config traffic,
generated traffic); ZERO forbidden-edge hits - simulacrum genuinely
respects the platform stack. The boundary axis is inert there by
construction: `workspaces: null` (directories, not npm packages) -
reported, never absorbed. Naming stays silent (the pack declares no
fileTypes). "Exits structural zero" resolved as: the jurisdiction now
exists and judged everything; the verdict is clean.

## Part 4: the sixteen entries, and the convention

All 16 WO-17 contradictions joined `overruled.json` per finding
(mentor 5 seam, ci 9 command-surface + 1 KeepThin, sim 1), rulingRefs
into WO-17 Parts 2/3/5, covering rulings named in every note. The
list: 44 (1 + 9 + 18 + 16). The convention landed in
`docs/work-orders/README.md`: a calibration order's dispatch also
ratifies overruled entries for the classic keeps its rulings directly
contradict, enumerated same-slice; the WO-12 guards hold unchanged.
The recurring "next overruled-candidate batch" queue item retires.

## The run, every delta decomposed

- Aggregate 8.7% (520/5,966) -> **8.7% (520/5,950)**: denominator -16
  (Part 4, exact), credit unchanged everywhere.
- mentor, codebase-intel, figma-ds, simulacrum: byte-identical rule
  counts (figma-ds the permanent control; sim's identity decomposed
  above).
- Package-boundary fires: rekon 0-of-720 (decomposed above); simulacrum
  inert (no workspace table). Both reported, neither predicted.

## The register after this slice

The rekon home register opens: 228 noDistImports + 11 capability->surface
+ 5 dead_code + 3 debt + 3 antiPattern. Corpus register unchanged from
WO-17 (~54 ui->domain cluster + 38 mentor console backlog + naming tail
~210 + 40 dead barrels + businessLogicInService ~20 pending the sampled
read).
