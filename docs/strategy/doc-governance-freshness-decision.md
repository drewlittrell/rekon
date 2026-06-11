# Doc Governance Freshness Decision (WO-7)

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

**Status: pinned (WO-7, loop integrity track).** Implementation decisions
the work order (`docs/work-orders/wo-7-doc-freshness.md`) left to the
executing agent. The five pinned design decisions are not restated.

## Carrier: `@rekon/capability-docs`

`src/doc-freshness.ts` — the docs package already owns reader-facing
generated surfaces. Pure evaluation over an injectable `DocGitReader`
(three operations: `lastCommit`, `changedSince`, `everTouched`); the CLI
verb composes them.

## Staleness is git ancestry, not timestamps

`stale` means `git rev-list <docLastCommit>..HEAD -- :(glob)<pathspec>`
is non-empty — a commit strictly after the doc's last commit touched a
declared referent. Commit timestamps are non-monotonic across rebases
and clones; ancestry is not. A declaration whose pathspec no commit has
ever touched is *unresolved*. Status precedence: any newer referent →
`stale` (dominates), else any unresolved → `partial`, else `fresh`.
Docs without declarations (or without git history yet) → `unknown`.

## Front matter: a tolerant subset parser, not a YAML dependency

The declaration shape is two string lists under `freshness:`. The parser
handles exactly that (block lists and inline `[a, b]` arrays) and treats
anything else as "no declarations." Full YAML stays out of the
dependency tree; if declarations ever need richer shapes, that is the
moment to revisit.

## Bare input names resolve through an explicit table

`freshness.inputs` entries containing `/` are pathspecs; bare artifact
type names resolve via `DOC_INPUT_PATHSPECS` (seven types mapped to
their owning kernel package sources). An unmapped name is an unresolved
declaration → `partial`. Explicit over clever: a guessed mapping would
fabricate freshness.

## The read-only reconciliation

The slice header says "one read-only CLI verb"; pinned decision 5 says
the check writes `docs/INDEX.md`. The specific decision wins: the verb's
only write is the generated INDEX (skipped when byte-identical, no
timestamps in the output, so regeneration is idempotent by
construction). No `.rekon` state, no artifact writes — INDEX.md is a
generated output, not a canonical artifact, by the same reasoning as the
parity bench.

## Enrollment-commit semantics

Enrolling a doc re-commits it, so every enrolled doc is `fresh` at the
moment its enrollment ships — the enrollment commit *is* the
"last verified" act. Statuses diverge from there as referents move. The
operator re-verifies a stale doc by reviewing and re-committing it
(possibly unchanged); the doc's last commit is the verification record.

## Calibration

The regression-plan incident is the permanent fixture shape: a doc
declaring the semantic provider package paths goes `stale` the moment a
commit lands on those paths after the doc's last commit. The contract
test reproduces exactly this and is the regression test for the original
problem.
