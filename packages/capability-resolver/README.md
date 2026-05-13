# @rekon/capability-resolver

Built-in Rekon resolver capability.

## Stability

Experimental alpha. Resolver packet fields are public alpha artifacts.

## Purpose

Initial resolver:

- `resolve.preflight`

The preflight resolver consumes an `IntelligenceSnapshot` artifact and returns
a typed `ResolverPacket` with owner systems, risk, required checks, relevant
findings, optional memory guidance, warnings, resolution trace, and next steps.

Ownership resolution is deterministic:

1. `OwnershipMap`
2. `ObservedRepo`
3. ownership `GraphSlice`
4. raw `EvidenceGraph` `ownership_hint` fallback

Every fallback and risk decision is recorded in `resolutionTrace`.

## Lifecycle Fit

Runs during `Resolve`, converting snapshots and indexed artifacts into a
decision-ready packet for agents and humans.

## Public Surface

The default export is a Rekon capability definition with a resolver handler.
The package also exports preflight packet types.

## Import Boundary

Resolvers should consume snapshots, artifact refs, and artifact readers. Do not
scan source files directly unless the resolver explicitly declares and receives
the needed permissions.
