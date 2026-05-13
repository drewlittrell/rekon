# Capability Registry

The capability registry is the public SDK surface where capabilities register
artifact types and handlers.

The registry rejects duplicate capability ids, duplicate handler ids, role and
handler mismatches, unknown permissions, and handlers that produce undeclared
artifact types.
