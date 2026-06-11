---
freshness:
  paths:
    - packages/capability-ontology/src/grammar/**
    - packages/capability-policy/src/**
---
# Work Order: Home Register Rulings (WO-19)

> Committed verbatim as issued by the operator (2026-06-12) per the
> docs/work-orders/ convention. Amendments land as commits.

**Slice type:** decision + implementation (one archetype amendment, one
rule scoping, register housekeeping). Law track, rekon home. **The
WO-14 template binds.** **Ratification note:** both rulings were made
2026-06-12 and are restated inline; dispatch ratifies the parts as
written, strike any part to rule otherwise.

---

## Part 1: the contract layer (archetype amendment)

`grammar-archetype-package-platform` gains an optional `contract`
layer. Operator ruling, restated: the sdk is the capability contract
tier, consumed by capabilities to define themselves and by the runtime
host to register them. Its package manifest says so ("Public SDK for
defining Rekon capabilities"), its dependency list is kernel-only, and
the original surface assignment was a misclassification the detector
caught. The repo was right; the law adjusts.

Pack changes, sourced `operator:wo-19#contract-layer`:

- New layer `contract`, position 2, conventional path
  `packages/sdk/**`, removed from surface's conventional paths.
- Law: contract imports kernel only. Capability, product, and surface
  may import contract.
- Forbidden edges added: contract to core, capability, product,
  surface, and adapter.
- `requiredLayers` unchanged.

Expected on rekon: the 11 `layer_import` findings retire as corrected
classification (self-triage 250 to 239); any new findings the
reassignment creates are reported, verified by run, never assumed
absent. Expected on the corpus: **all four repos byte-identical.** The
pack is shared law and simulacrum ratifies it, so this is an assertion
the report proves, not a hope: no `packages/sdk/**` path exists there,
the layer is optional, nothing reassigns. The decision memo states the
finding plainly: the system's first demonstration that governed law can
be wrong and has a correction path, which is a stronger property than
drift detection alone.

## Part 2: noDistImports scopes to production source

Operator ruling, restated: examples demonstrate consuming the built
package, so importing dist there is the point, never a violation; rule
fixtures simulate violations by design. The `imports.noDistImports`
rule gains operator-config exemptions in the WO-15 `generatedGlobs`
pattern (repo-jurisdiction config, never hardcoded): `examples/**` and
the fixture trees the 228 finding heads identify (the executor names
the exact globs from the run data and reports them). Each exemption
carries its purpose claim verbatim in the law text, source
`operator:wo-19#dist-scope`.

Expected: the exempted share of the 228 reported by glob; the remainder
is the real fix list, counted and listed in the completion report.
Remediation is out of scope for this slice; the remainder becomes a
named register item.

## Part 3: housekeeping

- **Executor memory correction:** retire the stale queue item "the
  86-finding amendment when the planner completes." WO-17 was that
  amendment; the memory entry updates to reflect it, confirmed in the
  report.
- **Same-slice contradictions (WO-18 convention):** none expected.
  These are home-register findings, not bench keeps; no overruled
  entries arise. Stated so the report shows it was checked, not
  skipped.
- **Home register update:** the register document reflects the
  post-ruling state: the Part 2 remainder, 5 dead_code, 3 debt, 3
  antiPattern, and the BXRX port (simulacrum's recorded item).

## Expected deltas, stated

Bench: untouched. Aggregate stays 8.7% (520/5,950); all four corpus
repos byte-identical, asserted and verified. Rekon self-scan: 250 to
239 via Part 1, then minus the Part 2 exempted share (exact count
reported), remainder listed. No denominator movement, no credit
movement.

## Verification

Template gate; contract-layer edge tests (sdk to kernel silent, a
hypothetical contract-to-capability edge fires, capability to sdk
silent); exemption tests (dist import under `examples/**` silent, the
same import under `src/**` fires); the corpus byte-identical assertion;
cited updates to any permanent test pinning the pack's layer table;
the memory correction confirmed.
