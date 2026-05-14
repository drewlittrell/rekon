# Architecture Summary Publication

A concise governance read of the repository in one Rekon-native
publication. It rolls up the snapshot, owner systems, capability map,
coherency delta, and finding lifecycle into a single markdown document
that humans and agents can scan before editing code.

This is the alpha "lite" form of the classic generated architecture
docs and assistant-doc projections — see
[../strategy/classic-behavior-distillation.md](../strategy/classic-behavior-distillation.md)
("Publications And Generated Docs") and
[../strategy/classic-wins.md](../strategy/classic-wins.md) ("Generated
Docs Are Publications, Not Truth").

## Why It Exists

Before this batch, governance lived across many artifacts:
`FindingReport`, `FindingStatusLedger`, `FindingLifecycleReport`,
`CoherencyDelta`, `OwnershipMap`, `CapabilityMap`. Each is correct,
but reading them all in one go was friction. The architecture summary
collapses them into one publication:

- one paragraph for repository overview;
- one table for owner systems;
- a short capability map;
- a coherency summary (active/accepted/ignored/resolved + severity
  breakdown);
- top affected paths;
- a prioritized remediation queue;
- short agent guidance.

The publication does not replace any of the underlying artifacts. It
is a derived projection and is regenerated from artifacts each time.

## How It Is Built

`rekon publish architecture` invokes the
`@rekon/capability-docs.architecture-summary` publisher inside
`@rekon/capability-docs`. The publisher:

1. Reads the latest `IntelligenceSnapshot` (required).
2. Reads the latest `ObservedRepo`, `OwnershipMap`, `CapabilityMap`,
   `CoherencyDelta`, and `FindingLifecycleReport` if available.
3. Renders the markdown summary.
4. Writes a `Publication` artifact with `kind = "architecture-summary"`
   and full `header.inputRefs`.

The publisher does **not** call runtime helpers to build missing
artifacts. If a `CoherencyDelta` is missing, the summary instructs the
operator to run `rekon coherency delta`.

## CLI Surface

```sh
rekon publish architecture --root <repo> --json
rekon publish run @rekon/capability-docs.architecture-summary --root <repo> --json
rekon publish list --root <repo> --json
```

Both write paths emit the same artifact. The shortcut exists for
parity with `rekon publish agents`.

## When To Use It

- After a fresh evaluate + coherency-delta cycle, to capture a
  governance snapshot.
- Before handing repo state to an agent that does not have time to
  read every underlying artifact.
- When reviewing repository drift over time — read the latest
  publication and compare to the previous one.

## What This Is Not

- Not canonical architecture truth. Generated docs never are. The
  publication cites its inputs; trust the inputs.
- Not the full classic generated-docs tree. There is no per-system
  generated doc set in this alpha.
- Not an AGENTS.md overwrite. Rekon does not inject content into the
  repo's root AGENTS.md.
- Not a watcher- or PR-driven publication. CLI/runtime only.
- Not a dashboard.
- Not a remediation auto-apply. The queue lists work; it does not run
  it.

## Freshness

Run `rekon artifacts freshness --type Publication --json` to inspect
whether the latest architecture summary still reflects current inputs.
A newer `IntelligenceSnapshot`, `CoherencyDelta`, `OwnershipMap`,
`CapabilityMap`, `ObservedRepo`, or `FindingLifecycleReport` will mark
the summary `stale`. Rebuild with `rekon publish architecture`.

## Cross-References

- [Architecture summary artifact](../artifacts/architecture-summary-publication.md)
- [Coherency delta concept](coherency-delta.md)
- [Finding lifecycle concept](finding-lifecycle.md)
- [Resolvers](resolvers.md)
- [Capability model](../strategy/capability-model.md)
- [Classic behavior distillation](../strategy/classic-behavior-distillation.md)
- [Classic behavior roadmap](../strategy/classic-behavior-roadmap.md)
