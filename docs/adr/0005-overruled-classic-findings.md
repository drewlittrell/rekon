# 0005. Overruled Classic Findings

Some benchmark findings from prior reference scans are excluded from recall
scoring because Rekon has an explicit ruling that the finding is not a valid
requirement for the current product.

The overrule is per finding, not per rule. A finding leaves the denominator only
when `tests/bench/overruled.json` cites this document with a fragment that names
the ruling.

## boundary-contracts

Route modules may import declared request-schema boundaries when that import is
the intended boundary contract for the route. A classic route-complexity finding
that treats the boundary contract itself as a layering violation is overruled.

## Part 1: the ten overruled entries

Living re-export conduits are valid when importers resolve through the conduit
and the conduit is the maintained public access point. Classic findings that
could not follow those re-export chains are overruled for the cited findings.

## stem === role

A file name can satisfy the naming contract when its stem is a declared role in
the effective grammar. Classic findings that require an additional suffix for
those cited role names are overruled.

## Part 3: the naming role batch

Declared role names such as registries, engines, and equivalent grammar roles
can be valid without extra suffixes. Classic findings contradicted by those role
declarations are overruled for the cited findings.

## Part 2: the logging seam

Command or diagnostic seams may own direct logging when the logging is the
declared surface behavior. Classic console findings on those cited seams are
overruled.

## Part 5: evaluator-routes correction

Evaluator route boundaries that match Rekon's declared grammar are not layering
violations. Classic findings against the cited evaluator route imports are
overruled.

## Part 3: console on command surfaces

Command surfaces may write user-facing console output. Classic console findings
against cited command-surface files are overruled.
