# Resolvers

Resolvers consume an `IntelligenceSnapshot` and related typed artifacts to
produce resolved outputs for users and agents.

The first built-in resolver is `resolve.preflight`. It resolves ownership,
attaches findings and memory, evaluates simple risk, and writes a
`ResolverPacket`.

Resolver packets must be explainable. `resolve.preflight` includes a
`resolutionTrace` showing which artifact sources were checked, which source
won, why fallback happened, and which risk rule selected the final tier.

Ownership source precedence is deterministic:

1. `OwnershipMap`
2. `ObservedRepo`
3. ownership `GraphSlice`
4. raw `EvidenceGraph` `ownership_hint` fallback

Using raw evidence as fallback is allowed. Using it silently is not.
