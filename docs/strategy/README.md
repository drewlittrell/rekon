# Strategy Docs

> Status: Strategy index and historical archive map. For public navigation,
> start at `README.md` and `docs/README.md`.

This directory contains design decisions, safety reviews, implementation notes,
dogfood reports, and a small set of current strategy docs. It is not the public
getting-started path.

## Current Architecture Direction

- [Rekon system model](rekon-system-model.md)
- [NorthStar](north-star.md)
- [Roadmap](roadmap.md)
- [Capability model](capability-model.md)
- [codebase-intel-classic migration](codebase-intel-classic-migration.md)

## Safety Reviews

Safety reviews preserve rationale for boundary-sensitive work. They are useful
audit evidence, but current behavior must still be verified against source code,
CLI output, artifact schemas, and current concept docs.

Examples:

- `*-safety-review.md`
- `source-write-reconciliation-policy-decision.md`
- `verification-github-trust-boundary-safety-review.md`

## Historical Implementation Notes

Most slice records, implementation notes, dogfood reports, and one-off decision
memos are historical snapshots. They explain how Rekon got here; they do not
override current source code or the living docs map.

Common groups:

- **Bundle / handoff work:** `intent-bundle-*`, `handoff-*`,
  `task-context-report-bundle-*`.
- **Task context work:** `task-context-*`, `semantic-file-understanding-*`.
- **Evidence graph / semantic / embeddings work:** `capability-evidence-*`,
  `embedding-*`, `semantic-file-*`.
- **Issue and governance work:** `issue-*`, `finding-*`, `coherency-*`.
- **Classic migration work:** `classic-*`, `codebase-intel-classic-*`.

For current document freshness, run:

```sh
node packages/cli/dist/index.js docs freshness --root . --json
```
