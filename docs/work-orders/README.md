---
freshness:
  paths:
    - tests/bench/parity-core.mjs
    - tests/bench/overruled.json
---

# Work orders

Operator work orders are committed verbatim as issued, before execution
begins; amendments land as commits. Each order's dispatch is the
ratification act for the rulings it carries (strike a part to rule the
other way).

## The overruled-entry convention (WO-18 Part 4)

A calibration order's dispatch also ratifies overruled entries for the
classic keeps its rulings directly contradict; the executor enumerates
them in the same slice, per-finding, with covering-ruling notes. The
WO-12 guards hold unchanged: only operator rulings overrule, entries are
per-finding never per-rule, honest losses never qualify, and every
rulingRef must resolve. This removes the one-cycle lag the
"next overruled-candidate batch" queue item used to carry.
