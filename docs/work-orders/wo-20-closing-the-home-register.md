---
freshness:
  paths:
    - packages/capability-ontology/src/grammar/**
    - packages/capability-policy/src/**
---
# Work Order: Closing the Home Register (WO-20)

> Committed verbatim as issued by the operator (2026-06-12) per the
> docs/work-orders/ convention. Amendments land as commits.

**Slice type:** decision + implementation (one purpose-claim ruling,
one edge amendment, root declarations, the tail judged). Law track,
rekon home. **The WO-14 template binds.** **Ratification note:**
operator dispatch ratifies every part as written; strike any part to
rule otherwise.

---

## Part 1: the keyless-gate purpose claim

Operator ruling: the committed test suite deliberately exercises built
`dist/` output; that is the keyless-gate design AGENTS.md documents,
and the hygiene rule never outranks the gate it protects.
`distImportExemptions` gains two entries, source
`operator:wo-20#keyless-gate`: `tests/contract/**` and
`packages/*/test/**`, purpose claim verbatim: **the keyless gate runs
the committed suite against built output by design; dist imports here
are the gate working, never drift.** Expected: the 224 retire exactly
(204 + 20), `other: []` again, and the register's
test-suite-consumes-built-output line goes to zero.

## Part 2: the kernel-to-contract edge

One line, completing the constitutional principle: kernel imports
nothing above itself, and the contract tier sits above kernel. The
forbidden edge `kernel -> contract` joins the pack, source
`operator:wo-20#kernel-contract-edge`. Expected: zero fires (the WO-19
run already observed kernel's imports are clean); the edge-matrix
contract test gains the row; corpus byte-identical, asserted and
verified per the WO-19 standard.

## Part 3: package entries are declared roots

General package-platform law through the existing WO-14 declared-roots
mechanism, never a one-off exemption: a package's public entry is a
consumption root, because a library platform's exported surface is
consumed by hosts the repo cannot see. Rekon's config declares
`packages/*/src/index.ts` as roots, purpose claim recorded with source
`operator:wo-20#package-roots`. Re-run dead_code: exports reachable
from the declared roots are API and exit the findings; survivors are
genuinely dead. **Survivors are deleted in-slice** with the deletion
list in the report, provided each is unambiguous (no exports consumed
by string reference, codegen, or test doubles; anything ambiguous
stands and is reported instead of deleted).

## Part 4: the antiPattern tail, judged against established law

The three antiPattern findings are judged against the rulings that
exist, never stretched: if they are console fires on rekon's command
surfaces (cli, mcp), the WO-17 command-surface purpose claim extends to
rekon by its own overlay entry, source
`operator:wo-20#command-surface`, same claim verbatim. Anything the
established rulings do not cover stands on the register and is reported
with its content named. The report enumerates all three findings with
their files and verdicts either way.

## Expected deltas, stated

Bench: untouched, 8.7% (520/5,950), all four corpus repos
byte-identical, asserted and verified. Rekon self-scan: 235 minus 224
(Part 1) minus the dead_code exits (root reachability plus deletions,
decomposed in the report) minus any Part 4 retirements; the landing
number reported with every subtraction named. The register after this
order should read: debt markers (inventory by design), any Part 3 or
Part 4 stands, the BXRX port (simulacrum's item). Same-slice
contradictions per the WO-18 convention: none expected (home findings,
not bench keeps); checked and stated.

## Verification

Template gate; the new edge-matrix row; exemption tests for the two
Part 1 globs (dist import inside silent, outside fires); a declared-
roots test (export reachable from a package entry exits, an orphan
survives); deletion safety checks recorded per survivor; the corpus
byte-identical assertion; the register table updated in the memo.
