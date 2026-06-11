# Strategy Docs

> Status: mixed current strategy and historical decision archive. Start with
> `README.md` and `docs/README.md` for public navigation.

Current living strategy:

- [Rekon system model](rekon-system-model.md)
- [NorthStar](north-star.md)
- [Roadmap](roadmap.md)
- [Capability model](capability-model.md)
- [codebase-intel-classic migration](codebase-intel-classic-migration.md)

The rest of this directory is mostly historical strategy snapshots, decision
memos, safety reviews, dogfood reports, and slice records. They are useful for
auditing how Rekon got here, but they are not the public starting point and do
not override current source code, CLI behavior, artifact schemas, or concept
docs.

For current document freshness, run:

```sh
node packages/cli/dist/index.js docs freshness --root . --json
```
