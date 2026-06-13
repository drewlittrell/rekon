# `@rekon/capability-ontology`

Built-in capability ontology translation layer.

The package translates raw repository vocabulary into Rekon's canonical
capability language and writes audit artifacts. It is deterministic and
artifact-first.

## Public Surface

- default SDK capability export
- built-in ontology vocabulary
- ontology compiler helpers
- deterministic name splitter
- normalization report builder

## Boundary

This package does not mutate `EvidenceGraph`, resolve findings, write source
files, or make network calls.

## Stability

Label: `experimental, public`.
