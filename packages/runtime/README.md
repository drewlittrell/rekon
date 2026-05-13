# @rekon/runtime

Local filesystem runtime for Rekon.

Current alpha responsibilities:

- initialize `.rekon/`
- write and read typed JSON artifacts
- maintain `.rekon/registry/artifacts.index.json`
- load built-in capability objects directly
- enforce manifest-requested permissions
- run evidence providers
- create an `IntelligenceSnapshot`
- run registered resolvers

The runtime is local only. It does not load external packages dynamically yet.
