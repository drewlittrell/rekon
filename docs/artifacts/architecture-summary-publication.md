# Architecture Summary Publication

The architecture summary is a Markdown `Publication` artifact that summarizes
repository structure, ownership, capabilities, active findings, remediation
priorities, and verification status.

## Produced By

- `@rekon/capability-docs.architecture-summary`
- `rekon publish architecture`

## Consumed By

- humans who need a compact repository overview
- agents that need generated guidance
- downstream publication surfaces

## Common Fields

- `header`
- `kind: "architecture-summary"`
- `title`
- `path`
- `format: "markdown"`
- `content`

## Notes

The architecture summary is a publication, not canonical truth. It should cite
the snapshot, model, finding, work, reconciliation, and verification artifacts it
read through `header.inputRefs`.
