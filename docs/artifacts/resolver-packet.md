# ResolverPacket

`ResolverPacket` is a resolved output artifact.

The initial packet is `resolve.preflight`, which takes a goal and path, then
returns owner systems, matched scopes, risk, required checks, relevant findings,
recommended context, applicable memory, warnings, resolution trace, and next
steps.

`resolutionTrace` explains why the packet contains its ownership and risk
answers. Trace entries include:

- `step`
- `sourceType`
- `sourceRef` when a concrete artifact was checked or used
- `status`
- `message`
- optional `paths`, `systems`, `confidence`, and `details`

For `resolve.preflight`, ownership resolution checks sources in this order:

1. `OwnershipMap`
2. `ObservedRepo`
3. ownership `GraphSlice`
4. raw `EvidenceGraph` `ownership_hint` facts

Fallbacks are recorded explicitly. Silent fallback is not acceptable for
resolver packets.
