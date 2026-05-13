# @rekon/capability-resolver

Built-in Rekon resolver capability.

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
