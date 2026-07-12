# Resolvers

Resolvers turn the current snapshot and related artifacts into task-specific
answers.

The built-in preflight resolver answers:

- which systems own the requested paths;
- what risk tier applies;
- which findings or memory entries are relevant;
- which checks are recommended;
- why the answer was selected.

Resolver packets include `resolutionTrace` so users can audit the source and
fallback path.

Preflight also checks current call and reachability graphs for directly related
files. It adds that context to `recommendedContext` and records
`impact.explain` trace entries. Graph context does not change the risk tier;
risk remains governed by the resolver's explicit ownership, path, finding, and
assessment rules.
