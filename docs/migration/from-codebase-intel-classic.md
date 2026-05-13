# Migration From codebase-intel-classic

`codebase-intel-classic` is Rekon's reference implementation, capability mine,
dogfood target, migration source, and fixture corpus.

It is not a dependency. Rekon packages must not import from the classic repo or
reuse private service internals through path aliases.

Migration should happen by role:

- Evidence providers: move deterministic extractors first.
- Projectors: convert evidence into typed model or graph artifacts.
- Evaluators: migrate rules in small groups with fixture coverage.
- Resolvers: consume `IntelligenceSnapshot` and typed artifacts, not old service
  state.
- Publishers: regenerate docs from artifacts; docs are not canonical truth.
- Learners: enrich resolver output without mutating architecture facts.
- Actuators: stay permission-gated and artifact-first until source writes are
  explicitly approved.

Dogfood runs against the classic repo should compare coherent outputs, not
semantic parity with every old artifact.
