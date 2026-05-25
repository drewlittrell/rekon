# Path Freshness

Rekon distinguishes **artifact lineage freshness** from
**working-tree (path) freshness**. Both are independent
signals; both matter:

- **Artifact lineage freshness.** Is the chain of
  artifacts internally consistent? Does the latest
  `FindingReport` cite the latest
  `IntelligenceSnapshot`? Did anything in the lineage
  get marked stale by
  `validateArtifactFreshness`? Today this surface
  lives in the architecture summary's `## Input
  Freshness Warnings` block, the agent contract's
  `### Governance Freshness` subsection, and
  `resolve.issue`'s `issue.freshness` trace.
- **Working-tree (path) freshness.** Have the source
  files Rekon's artifacts cite changed since those
  artifacts were generated? This is the new surface
  introduced by `PathFreshnessReport`.

**Working-tree freshness is distinct from artifact
lineage freshness.** A repo can have a fresh artifact
chain (every artifact matches its inputs) and a stale
working tree (the operator edited source after the last
refresh). The two checks are independent.

## How Path Freshness Works

1. The operator runs `rekon paths freshness [--path
   <path>]`. The CLI is **read-only with respect to
   source files**: it computes a deterministic
   `SourceStateFingerprint` over the requested paths
   (or a conservative default walk), reads the latest
   prior `PathFreshnessReport` baseline from the local
   artifact store, and writes one new
   `PathFreshnessReport`.
2. The report's `status` is `unknown` on the first
   run (no baseline yet), `fresh` when the current
   fingerprint matches the baseline, or `stale` when
   any tracked path is `changed`, `missing`, or
   `new`.
3. When the report is `stale`, the
   `recommendation.commands` field names `rekon
   refresh` and the human output prints the
   recommendation. **The CLI never runs `rekon
   refresh` on its own. Refresh remains
   operator-initiated.**

## What Path Freshness Does NOT Do

- **No watcher daemon.** Beta default per the
  [Watcher / Path Freshness Policy Decision](../strategy/watcher-path-freshness-policy-decision.md).
- **No background refresh.** Refresh runs only when
  the operator invokes `rekon refresh` explicitly.
- **No file-system event subscription.** The CLI
  reads the working tree once per invocation and
  returns.
- **No source writes.** The helper and the CLI
  never modify any file in the source tree.
- **No reliance on file mtimes as canonical
  freshness evidence.** mtimes can be captured as
  advisory metadata when explicitly requested,
  but the comparator uses sha256 content hashes
  as the source of truth.
- **No new permission surface.** The CLI uses the
  existing `read:source` + `write:artifacts`
  boundary (write only the report itself).

## What Path Freshness Is Good For

- Telling operators **before** they trust
  artifacts (or hand them to an agent) that the
  working tree has drifted since the last refresh.
- Giving agents a single, explicit signal
  (`PathFreshnessReport.status`) to check rather
  than guessing from file mtimes or commit
  hashes.
- Recording, deterministically, which paths
  changed between two recorded source states —
  useful for audit logs and post-mortems.

## Operator Workflow

```bash
# 1. After an edit session, check whether
#    Rekon's artifacts are still backed by the
#    files they were generated from.
rekon paths freshness --json

# 2. If status is stale, refresh the artifact
#    graph explicitly:
rekon refresh

# 3. Re-run paths freshness to capture a fresh
#    baseline.
rekon paths freshness --json
```

The first run on a repo will record `status:
unknown` because there is no prior baseline to
compare against. The recommendation message explains
this and tells the operator that subsequent runs
will compare against this baseline.

## Publication Surfacing

As of the `path-freshness-publication-surfacing`
slice, **the latest `PathFreshnessReport` is
surfaced in three publications operators and agents
already consume:**

- **Architecture summary** — renders a `##
  Working Tree Path Freshness` section between the
  `## Verification Proof Status` block and the
  `## Proof Loop` block.
- **Agent contract** — renders the same content
  as a `### Working Tree Path Freshness`
  subsection, plus a new Do-Not-Do reminder
  forbidding agents from treating artifact lineage
  freshness as proof that the working tree has not
  changed.
- **Proof report** — renders the same content as
  a `## Working Tree Path Freshness` section so
  reviewers see whether the proof was taken
  against a working tree that has drifted.

Each publication cites the latest
`PathFreshnessReport` in `header.inputRefs` when
present. **Publication generation is read-only
with respect to working-tree freshness: it never
runs `rekon paths freshness` and never runs `rekon
refresh`.** When no `PathFreshnessReport` exists,
publications render no-report guidance that names
the `rekon paths freshness` command.

GitHub Check dry-run and PR comment dry-run
surfacing is deferred to the next slice
("path freshness GitHub review surfacing"); until
that ships, operators must inspect the
publications directly.

## Cross-References

- [PathFreshnessReport artifact doc](../artifacts/path-freshness-report.md)
  — the shape + safety contract.
- [Watcher / Path Freshness Policy
  Decision](../strategy/watcher-path-freshness-policy-decision.md)
  — why beta does not ship a daemon.
- [Post-Beta Dogfood Evidence Triage
  Decision](../strategy/post-beta-dogfood-evidence-triage.md)
  — why this slice ships first among the
  post-beta tracks.
- [Refresh concept doc](refresh.md) — how
  `rekon refresh` rebuilds the artifact graph.
- [Freshness and invalidation concept
  doc](freshness-and-invalidation.md) — covers
  the complementary artifact-lineage freshness
  surface.
