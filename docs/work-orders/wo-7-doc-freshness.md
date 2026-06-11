---
freshness:
  paths:
    - packages/capability-docs/src/doc-freshness.ts
---
# Work Order: Doc Governance Freshness (WO-7)

> Committed verbatim as issued by the operator (2026-06-10) per the
> docs/work-orders/ convention. Amendments land as commits.

**Slice type:** decision + implementation (docs front matter, one read-only
CLI verb, test surface). Loop integrity track.

**Convention note:** lives in `docs/work-orders/`, committed before
execution; amendments land as commits.

---

## Objective

Ship `rekon docs freshness`: living documents declare their referents in
front matter, a read-only check evaluates them against git history using
the existing four-status vocabulary, and status renders where readers
land. This closes the exemption WO-5 diagnosed: the staleness model (a
preserved classic win) finally covers the documents that govern the work.
Snapshots stay exempt by definition; they never go stale because they
never claimed to be current.

## Pinned design decisions

1. **Enrollment is for living docs only.** Snapshot-bannered memos are out
   of scope permanently. The v1 enrollment set: the allowlist three
   (`rekon-system-model.md`, `north-star.md`, `roadmap.md`), everything in
   `docs/work-orders/`, and a starter set of concepts docs: the ones the
   detection-design substrate inventory leans on (capability-ontology,
   freshness-and-invalidation, the lint/bridge chain docs, semantic file
   understanding, the publication docs). Remaining concepts docs enroll
   incrementally; the check reports them as `unknown` (no declarations)
   rather than pretending they're fresh.
2. **Declarations are front matter, in the existing vocabulary.** YAML
   front matter with `freshness.inputs` (artifact type names or schema
   file paths) and `freshness.paths` (source and doc globs), mirroring the
   `invalidatedBy` rule shapes so one mental model covers artifacts and
   docs.
3. **Staleness is a git comparison, deterministic.** A living doc is
   `stale` when any declared path or input has a commit newer than the
   doc's own last commit; `fresh` otherwise; `partial` when some
   declarations don't resolve; `unknown` when a living doc carries no
   declarations. No daemons, no mtimes (git history only, so the check is
   reproducible across clones).
4. **Report, don't gate (v1).** The verb exits zero and prints the status
   table; a `--strict` flag exits non-zero on `stale`/`partial` for
   future CI use, off by default. Gating becomes a separate decision once
   the signal's precision is observed.
5. **Render where readers land.** The check writes/refreshes a generated
   `docs/INDEX.md`: living docs with status and last-verified commit,
   snapshots listed by directory with their exemption stated. One line in
   the AGENTS.md authority section points to the check as the way to test
   a living doc's currency before relying on it.

## Retiring the docs-test pattern

The prose-assertion tests in `tests/docs` were a hand-rolled freshness
system checking content because nothing could check lineage. With lineage
checkable:

- Tests guarding **snapshot** memos are deleted (snapshots need no content
  guards; their banner is the guard). This is the majority.
- Tests guarding **living docs that enroll in this slice** are deleted
  with the enrollment as citation.
- Tests guarding living docs not yet enrolled stay until those docs
  enroll. The completion summary reports the remaining count and the
  enrollment-debt list.

Every deletion cites this work order. Expected outcome: the docs-test
mass drops from roughly 250 files to a small remainder with a burn-down
list.

## Scope

1. Front-matter schema + parser (tolerant: docs without front matter are
   `unknown`, never errors).
2. The freshness evaluator over git history (pure function + a thin git
   reader; behavioral tests run against a fixture repo with constructed
   history).
3. `rekon docs freshness` CLI verb, `--strict`, `--json`.
4. `docs/INDEX.md` generation.
5. Enrollment of the v1 set: write the front matter, with declarations
   chosen conservatively (a doc describing an artifact type declares that
   schema file and the owning package source glob).
6. The docs-test retirement per the rules above.
7. Enroll this work order and its peers in `docs/work-orders/`.

## Non-goals

- No automatic doc updating or rewriting (the concepts state-shape
  rewrite is its own slice).
- No gating in CI (decision deferred until precision is observed).
- No enrollment of snapshots, ever.
- No new artifact type: the status table and INDEX.md are generated
  outputs, not canonical artifacts, by the same reasoning as the parity
  bench (promote later if a consumer needs to cite them).

## Guardrails

- **Declarations are conservative.** Over-broad globs make everything
  permanently stale and teach readers to ignore the signal, which is the
  failure this slice exists to fix. Each enrollment names the narrowest
  referent set that would have caught the doc's known historical
  staleness (the regression-plan incident is the calibration case: its
  declarations, had it been living, would have included the semantic
  provider package paths).
- **`unknown` is honest, not a failure.** Unenrolled living docs report
  `unknown`; nothing fabricates freshness.
- **Idempotent generation:** regenerating INDEX.md with no underlying
  change is byte-identical.
- Deletion citations per the docs-test rules; no other test changes.

## Verification plan

Required checks (per AGENTS.md): `npm run typecheck` / `npm run test` /
`npm run build`.

Slice-specific evidence: evaluator behavioral tests on the fixture
history (fresh, stale, partial, unknown each produced); the v1 enrollment
table (doc, declarations, current status) in the completion summary; the
calibration case demonstrated (a fixture reproducing the regression-plan
incident shape flips to stale); INDEX.md generated and idempotent;
docs-test deletion counts and the enrollment-debt list.

## Completion summary must include

CHANGES MADE / PUBLIC API CHANGES (the new CLI verb) / TESTS ·
VERIFICATION (enrollment table, calibration case, deletion counts,
remaining docs-test burn-down list) / INTENTIONALLY UNTOUCHED / RISKS ·
FOLLOW-UP / NEXT STEP (expected: incremental enrollment rides future
slices; the concepts state-shape rewrite is the next loop-integrity
slice).

---

## PURPOSE PRESERVATION CHECK

- **Original problem:** derived intelligence consumed after it goes stale
  silently steers work wrong; the strategy corpus did exactly this to
  both planning and executing agents.
- **Classic workflow guarantee:** "Freshness Must Be Explicit" (pinned
  classic win): staleness is announced where the reader acts.
- **Rekon equivalent guarantee:** the same model, extended to the
  governing documents themselves, with git-deterministic evaluation and
  honest `unknown` for the unenrolled.
- **What would mean we failed:** over-broad declarations make the signal
  ignorable; INDEX.md goes unread because it's not where readers land;
  the docs-test remainder never burns down; or snapshots get enrolled and
  the snapshot/living distinction blurs.
- **Regression test for the original problem:** the calibration-case
  fixture, permanently.

## CODEBASE-INTEL ALIGNMENT

- **Classic capability addressed:** the freshness discipline, applied to
  the layer classic also never covered: prose that directs builders.
- **What Rekon keeps:** the four-status vocabulary and the
  declaration-shaped invalidation model.
- **What Rekon redesigns:** prose-assertion content guards become lineage
  declarations; convention becomes mechanism.
- **How this advances the migration:** every pinned decision from the
  re-derivation effort, including the system model and these work orders,
  becomes measurably current instead of assertedly current.
