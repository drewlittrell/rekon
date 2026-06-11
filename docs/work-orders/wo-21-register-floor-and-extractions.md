---
freshness:
  paths:
    - packages/capability-policy/src/**
---
# Work Order: Register Floor and Triage Extractions (WO-21)

> Committed verbatim as issued by the operator (2026-06-12) per the
> docs/work-orders/ convention. Amendments land as commits.

**Slice type:** decision + data gathering (two one-line rulings, three
planner extractions). Law track, rekon home; bench register, corpus.
**The WO-14 template binds.** **Ratification note:** dispatch ratifies
the parts as written; strike any part to rule otherwise.

---

## Part 1: rekon's logging seam

Operator ruling: `packages/runtime/src/index.ts` hosts the log-line
formatter; its stderr writes are the seam implementing logging, the one
sanctioned console boundary (the WO-17 claim, verbatim, in rekon's own
overlay). Source `operator:wo-21#logging-seam`. Expected: the runtime
antiPattern stand retires; nothing else moves.

## Part 2: law text is data

Operator ruling: grammar pack sources quote the patterns they forbid,
and quoting a pattern is part of forbidding it, never committing it.
The consoleLogging content signal (and any anti-pattern content signal)
does not read law text as behavior. Mechanism: path-scoped exemption
for the grammar packs directory in rekon's overlay, purpose claim
verbatim, source `operator:wo-21#law-text-as-data`. The memo names the
general class (any repo hosting law text hits this; the corpus's
codebase-intel copy may exhibit it in its remaining anti-pattern
stands, checked and reported, no ruling stretched there). Expected: the
grammar-base stand retires; the home register reaches its floor: 3 debt
markers, inventory by design, plus the BXRX port on simulacrum's side.

## Part 3: three triage extractions for the planner

The WO-13 division of labor: the executor gathers, the planner judges,
the operator ratifies. Three JSON files in the corpus root, one record
per finding, each record carrying finding id, file, the matched import
or signal line with two lines of surrounding context, and the file's
first comment block or export list head (enough for purpose judgment
without a full read):

- `triage-ui-domain.json`: the ~54 unmatched mentor ui-to-domain
  layer_import findings. The precision question on the campaign's
  newest recall: real drift classic missed, or FP classes in the
  edge.
- `triage-business-logic.json`: the ~20 businessLogicInService
  findings (mentor and codebase-intel). The deferred sampled read,
  now fully extracted instead of sampled, since the count is small.
- `triage-dead-exports.json`: a 30-item stratified sample of the ~900
  plain unreferenced mentor exports (stratify by top-level directory,
  proportional), each with its export line and importer count. The
  question: genuinely dead, unlabeled class, or agent over-export
  habit.

No judgment in this slice; the files land, the planner's pass follows.

## Expected deltas, stated

Rekon self-scan: 5 to 3 (Parts 1 and 2, one each). Bench: untouched,
8.7% (520/5,950), all four corpus repos byte-identical for findings
(the extractions read, never write, corpus state). Same-slice
contradictions: Part 2's check on codebase-intel reports any
law-text-as-data fires there as candidates, never as entries; otherwise
none expected.

## Verification

Template gate; the two overlay entries compiling with clean notes; the
pack-path exemption test (a console string inside law text silent, the
same string in package code fires); the three JSONs validating against
the record shape with counts reported; the register table updated in
the memo.
