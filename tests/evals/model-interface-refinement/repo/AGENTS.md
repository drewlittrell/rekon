# Repository Instructions

Keep checkout orchestration in `src/checkout/`, wire-event translation in
`src/events/`, and public HTTP behavior in `src/api/`. Event additions must be
backward compatible: optional fields are omitted rather than serialized as
`undefined`. Keep registered tests current when behavior changes. Registries
and contracts use stable symbolic IDs instead of implementation paths;
preserve those IDs and their consumers or producers when behavior changes.
Run `npm test` after changes.
