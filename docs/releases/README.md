# Rekon Releases

Release materials for Rekon. Prepared under the staged release-mechanics model decided by
the [V1 Release Mechanics / Versioning Decision](../strategy/v1-release-mechanics-versioning-decision.md):
release notes, migration notes, and a release checklist are drafted here **before** any
version bump, git tag, or npm publish — each of which is a separate, explicitly-approved
slice.

## Current Release State

The repository is now versioned at **`1.0.0`**. The private workspace root and all
23 public `@rekon/*` workspace packages are lockstep at `1.0.0`.

The older beta / alpha release-prep files remain in `docs/release/` as historical
planning records. Use the V1 files in this directory for current release context.

## V1

- [V1 Release Notes](./v1-release-notes.md) — what V1 includes and excludes, the
  Rekon/Circe boundary, and proof/safety evidence.
- [V1 Migration Notes](./v1-migration-notes.md) — moving from beta / legacy
  `rekon prepare plan` / `.rekon/handoffs` to the V1 intent bundle + Circe projection flow.
- [V1 Release Checklist](./v1-release-checklist.md) — the gates required before version
  bump, git tag, and npm publish.

V1 means prepare/prove/package/export, not Rekon-side execution; Circe owns orchestration.
The V1 version bump to `1.0.0` and `v1.0.0` git tag happened in later, separately
approved slices. npm publishing remains separately approval-gated.
