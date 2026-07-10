# Private Reference Migration

Some Rekon behavior was distilled from prior private systems. Those systems are
not part of the public repo, and they are not dependencies.

Rekon must not import from private repos, depend on private service paths, or
carry private workspace conventions into generated artifacts.

## Mapping

| Classic area | Rekon shape |
| --- | --- |
| JS/TS analysis | evidence providers and projectors |
| Graph producers | graph projectors |
| Rule evaluators | evaluators and rulebooks |
| Context resolver | resolver packets with trace |
| Docs generation | publishers |
| Memory | learner output and resolver enrichment |
| Intent preparation | work, intent, and verification artifacts |
| Reconciliation | permissioned actuators |
| Watcher | future freshness lifecycle |
| GitHub app/dashboard | future publication surfaces |

## Porting Criteria

A migrated behavior should declare inputs, outputs, permissions, invalidation
rules, artifact schemas, provenance, and tests. If a behavior cannot be
represented through those contracts, reshape it before bringing it into Rekon.

The migration goal is to preserve proven workflow guarantees while giving them
a cleaner artifact and capability shape.
