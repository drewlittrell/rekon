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

`OwnershipMap -> ObservedRepo -> ownership GraphSlice -> EvidenceGraph`

1. `OwnershipMap`
2. `ObservedRepo`
3. ownership `GraphSlice`
4. raw `EvidenceGraph` `ownership_hint` fallback

Using raw evidence as fallback is allowed. Using it silently is not.

## Trace Entry Shape

`resolutionTrace` entries include:

- `step`
- `sourceType`
- `sourceRef`
- `status`
- `message`
- `paths`
- `systems`
- `confidence`
- `details`

Example:

```json
{
  "step": "ownership.resolve",
  "sourceType": "OwnershipMap",
  "status": "used",
  "message": "Resolved owner system from OwnershipMap.",
  "paths": ["src/index.ts"],
  "systems": ["src"],
  "confidence": 0.9
}
```

## Fallback

Fallback means a preferred source was unavailable or did not match the requested
path, so the resolver checked the next source in the precedence chain. Fallback
is acceptable when it is explicit in the packet. It is not acceptable for a
resolver to silently use lower-confidence data.

## Risk Trace

Risk rules are recorded with `step: "risk.evaluate"` and
`sourceType: "RiskRule"`. Current rules are intentionally small:

- high: multiple owner systems
- high: protected or high-leverage path
- high: relevant high or critical finding
- medium: unresolved ownership
- medium: relevant findings
- medium: multiple paths
- low: single owner, narrow scope, no relevant findings

## Building A Resolver That Explains Itself

A resolver should:

- read from `IntelligenceSnapshot`
- prefer model artifacts over raw evidence
- record every checked source
- record skipped and fallback decisions
- include confidence when a source provides it
- attach input refs to the packet header
- avoid hiding missing data behind confident prose
