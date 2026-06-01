# Rekon Releases

Release materials for Rekon. Prepared under the staged release-mechanics model decided by
the [V1 Release Mechanics / Versioning Decision](../strategy/v1-release-mechanics-versioning-decision.md):
release notes, migration notes, and a release checklist are drafted here **before** any
version bump, git tag, or npm publish — each of which is a separate, explicitly-approved
slice.

## V1

- [V1 Release Notes](./v1-release-notes.md) — what V1 includes and excludes, the
  Rekon/Circe boundary, and proof/safety evidence.
- [V1 Migration Notes](./v1-migration-notes.md) — moving from beta / legacy
  `rekon prepare plan` / `.rekon/handoffs` to the V1 intent bundle + Circe projection flow.
- [V1 Release Checklist](./v1-release-checklist.md) — the gates required before version
  bump, git tag, and npm publish.

V1 means prepare/prove/package/export, not Rekon-side execution; Circe owns orchestration.
At the time of preparation, packages remain at `0.1.0-beta.0`; no version bump, tag, or
publish has occurred.
