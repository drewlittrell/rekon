# Public Package Boundaries

This document records the publish decision for `0.1.0-alpha.1`. It answers,
per workspace package:

- Is it a publishable public package?
- Is it public but experimental (the alpha default)?
- Is it intentionally private/internal?
- Is it included only for examples or tests?

The release commit that runs `npm publish` must match this list. If a
package fails the tarball install smoke or audit, defer its publish here
explicitly rather than forcing it.

## Decision Table

| Package | Decision | Notes |
| --- | --- | --- |
| `@rekon/kernel-artifacts` | publish | Foundational artifact contracts. |
| `@rekon/kernel-evidence` | publish | Evidence facts and graph contracts. |
| `@rekon/kernel-snapshot` | publish | IntelligenceSnapshot contract. |
| `@rekon/kernel-graph` | publish | Graph slice contracts. |
| `@rekon/kernel-repo-model` | publish | Observed repo, ownership, capability map contracts. |
| `@rekon/kernel-rulebook` | publish | Rulebook contracts. |
| `@rekon/kernel-findings` | publish | Finding and report contracts. |
| `@rekon/sdk` | publish | Public SDK for defining capabilities. |
| `@rekon/runtime` | publish | Local runtime. |
| `@rekon/cli` | publish | CLI binary (`rekon`). |
| `@rekon/capability-js-ts` | publish | Built-in evidence provider. |
| `@rekon/capability-model` | publish | Built-in projector. |
| `@rekon/capability-graph` | publish | Built-in graph projector. |
| `@rekon/capability-policy` | publish | Built-in policy evaluator. |
| `@rekon/capability-resolver` | publish | Built-in resolver. |
| `@rekon/capability-docs` | publish | Built-in docs publisher. |
| `@rekon/capability-memory` | publish | Built-in memory learner. |
| `@rekon/capability-intent` | publish | Built-in intent/work-order actuator. |
| `@rekon/capability-reconcile` | publish | Built-in reconciliation actuator. |

All 19 packages are scheduled for publish at `0.1.0-alpha.1`, all under the
`experimental, public` stability label defined in
[docs/concepts/stability.md](../concepts/stability.md).

Examples (`examples/simple-js-ts`, `examples/custom-capability`) and tests
(`tests/**`) are not published packages and are not listed above.

## Deferred Packages

None for `0.1.0-alpha.1`.

If the install-from-tarball smoke or publish dry-run later exposes a
package that is not tarball-installable without significant churn, list it
here with the precise blocker and a target release for re-evaluation.

## Publish Posture

Every published package will:

- declare `license: Apache-2.0`
- declare `type: module`
- ship `dist/` build output only (`files: ["dist"]`)
- exclude `.tsbuildinfo` from tarballs (see [npm-publish-plan.md](npm-publish-plan.md))
- carry README.md with stability label
- depend only on `@rekon/*` packages or `@types/node` at the configured
  version

Capability authors writing community capabilities should depend on
`@rekon/sdk` and the kernel packages they consume; they should not depend
on `@rekon/runtime` or `@rekon/cli` internals.

## Names And Scope

The `@rekon` npm scope is required for publishing. Publishing for the
first time will create the scope if the publishing account has rights.

## Re-Evaluation Triggers

Re-open this decision when:

- A package fails the tarball install smoke.
- A package picks up a non-`@rekon/*` runtime dependency that should not be
  forced on consumers.
- A package becomes large enough to need its own release cadence (split
  out instead of forcing the whole workspace to bump).
- A community package upstream calls for a stable surface.

## Cross-References

- [NorthStar](../strategy/north-star.md)
- [Stability concept](../concepts/stability.md)
- [Alpha release checklist](alpha-release-checklist.md)
- [npm publish plan](npm-publish-plan.md)
- [0.1.0-alpha.1 release notes draft](0.1.0-alpha.1.md)
