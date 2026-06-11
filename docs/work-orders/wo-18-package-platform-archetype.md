---
freshness:
  paths:
    - packages/capability-ontology/src/grammar/**
    - packages/capability-policy/src/**
    - tests/bench/**
---
# Work Order: The Package-Platform Archetype (WO-18)

> Committed verbatim as issued by the operator (2026-06-12) per the
> docs/work-orders/ convention. Amendments land as commits.


**Slice type:** decision + implementation (the library's first net-new
archetype, one detection axis, two home-repo ratifications, overruled
entries). Law and sensor tracks. **The WO-14 template binds.**
**Ratification note:** operator dispatch ratifies the archetype content,
both repo ratifications, and Part 4's entries; the four shaping decisions
were ruled 2026-06-12 and are restated inline.

---

## Part 1: the archetype pack

New builtin archetype `grammar-archetype-package-platform` (the fifth
pack, the first with no classic source: provenance `migratedFrom:
"operator"`, sources `operator:wo-18#<id>`). The school it encodes:
agent-era platform monorepos with a kernel substrate, library tiers,
product packs, and consumption surfaces.

**Layers** (conventional paths; repo overlays refine via
most-specific-match):

| Layer | Position | Conventional paths | Law summary |
| --- | --- | --- | --- |
| kernel | 1 | `packages/kernel-*/**`, `kernel/**` | imports nothing above itself; the constitutional edge |
| core | 2 | `core/**` | the cohesive platform body above kernel (operator ruling: core is not a capability); imports kernel only |
| capability | 2 | `packages/capability-*/**` | pluggable platform packages; imports kernel and sibling capabilities through public surfaces only |
| product | 3 | `product-packs/**` | product packs; imports kernel, core, capability; never surface |
| surface | 4 | `cli/**`, `packages/cli/**`, `packages/mcp/**`, `packages/sdk/**`, `packages/runtime/**`, `web/**`, `api/**` | entry points (operator ruling: runtime and sdk are surfaces); imports everything below; nothing imports surface |
| adapter | 2 | `packages/llm-provider/**` | external integrations stay leaf: kernel at most |
| generated | -1 | `generated/**` | codegen output; exempt from naming and placement law (the WO-15 generated class as a layer) |
| config | -1 | `config.project/**`, `governance/**`, `tools/**` | outside the import stack |

`requiredLayers: ["kernel", "surface"]` (the minimal platform
signature; core, capability, and product are optional tiers that don't
all coexist in one repo). Forbidden topology edges: kernel to every
higher tier; core to capability, product, and surface; capability to
product and surface; product to surface; adapter to core, capability,
product, and surface.

## Part 2: the package-boundary axis (the barrel-rot law)

Operator ruling 1: cross-package imports go through the package's public
surface. This is symbol-level law the topology schema can't express, so
the divergence detector gains a `package_boundary` axis: an
`import_specifier` whose `resolvedTarget` lies inside another workspace
package but was not reached through that package's name (the WO-8/WO-14
workspace alias table identifies both) is a deep-import violation. Law
citation `operator:wo-18#package-boundary`, archetype-tier (fires only
under package-platform ratification; jurisdiction test required). Purpose
claim in the law text: deep imports rot the public surface until its
barrels die (the WO-16 forty-dead-barrels discovery is this law's
evidence); the public surface is where package contracts live. Expected
fire count on the two ratifying repos: unknown, reported not predicted.

## Part 3: both home ratifications

**Rekon (the real repo):** `.rekon` config ratifies the archetype
(dispatch is the operator act). This is bench-invisible (rekon is not a
corpus repo) and self-scan-decisive: the first refresh produces rekon's
first governed self-triage. Expected: the 228 `noDistImports` findings
join divergence, boundary, naming, and anti-pattern findings as one
grouped report in the completion summary, presented as the operator's
home register seed, with no remediation in this slice.

**Simulacrum (corpus copy):** ratification in the corpus overrides, plus
two overlay entries: `product-pack/**` (singular) assigned to the
product layer as a **deprecated location**, law text carrying the
operator ruling verbatim: canonical is `product-packs/`; this entry
retires when BXRX ports over (the port is simulacrum's own work item,
recorded, outside this order). Expected: simulacrum exits structural
zero for grammar-derived rules; its recall and finding movements
reported per rule, every delta decomposed. Mentor, codebase-intel, and
figma-ds: byte-identical.

## Part 4: the 16 overruled entries, and the convention

The WO-17 run named 16 classic keeps its rulings contradict (9
command-surface console, 5 seam-file anti-pattern, 1 KeepThin, 1
kernel/cli console). Add the entries per finding, cited to their WO-17
parts. And land the convention in the work-orders README: **a
calibration order's dispatch also ratifies overruled entries for the
classic keeps its rulings directly contradict; the executor enumerates
them in the same slice, per-finding, with covering-ruling notes.** The
WO-12 guards hold unchanged; this removes the one-cycle lag, and the
recurring "next overruled-candidate batch" queue item retires.

## Expected deltas, stated

Denominator: −16 (Part 4, exact reported). Simulacrum: movement on its
364-weight share, reported per rule (no prediction; the declaration is
new law, and the parity model says declarations move recall in ways
estimates from labeled data should compute, which none exists for here).
Package-boundary fires: reported with a per-package breakdown on both
ratifying repos. All other repos byte-identical. The rekon self-triage
is a report, not a number.

## Verification

Template gate; the archetype pack validating with the existing four
(compile, cross-reference, jurisdiction); the package-boundary axis
contract tests (deep-import fires, package-name import silent,
unratified repo silent); the deprecated-location entry compiling with
clean notes; overruled validation green; the grouped rekon self-triage
in the summary.
