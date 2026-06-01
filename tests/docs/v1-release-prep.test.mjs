// Docs tests for V1 Release Prep Implementation.
//
// Gate the V1 release notes, migration notes, and release checklist, plus the
// CHANGELOG mention and the review packet.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (rel) => readFileSync(resolve(repoRoot, rel), "utf8");
const norm = (text) => text.replace(/[`*]/g, "").replace(/\s+/g, " ");

const notesRaw = read("docs/releases/v1-release-notes.md");
const notes = norm(notesRaw);
const migrationRaw = read("docs/releases/v1-migration-notes.md");
const migration = norm(migrationRaw);
const checklistRaw = read("docs/releases/v1-release-checklist.md");
const checklist = norm(checklistRaw);
const changelog = norm(read("CHANGELOG.md"));
const packet = read(".rekon-dev/review-packets/v1-release-prep.md");

const SIX_COMMANDS = [
  "rekon intent assess",
  "rekon intent prepare",
  "rekon intent status",
  "rekon intent work-order generate",
  "rekon intent verification-plan generate",
  "rekon intent bundle write",
];

const NINE_GATES = [
  "npm run typecheck",
  "npm run test",
  "npm run build",
  "git diff --check",
  "node scripts/audit-package-exports.mjs",
  "node scripts/audit-license.mjs",
  "node scripts/publish-dry-run.mjs",
  "node scripts/install-smoke.mjs",
  "node scripts/install-tarball-smoke.mjs",
];

// ---------- 1 ----------
test("release notes exist with title", () => {
  assert.match(notesRaw, /# Rekon V1 Release Notes/);
});

// ---------- 2 ----------
test("migration notes exist with title", () => {
  assert.match(migrationRaw, /# Rekon V1 Migration Notes/);
});

// ---------- 3 ----------
test("release checklist exists with title", () => {
  assert.match(checklistRaw, /# Rekon V1 Release Checklist/);
});

// ---------- 4 ----------
test("release notes say V1 means prepare/prove/package/export, not Rekon-side execution", () => {
  assert.ok(notes.includes("V1 means prepare/prove/package/export, not Rekon-side execution."));
});

// ---------- 5 ----------
test("release notes say Circe owns orchestration for V1", () => {
  assert.ok(notes.includes("Circe owns orchestration for V1."));
});

// ---------- 6 ----------
test("release notes say intent:go remains deferred beyond V1", () => {
  assert.ok(notes.includes("intent:go remains deferred beyond V1."));
});

// ---------- 7 ----------
test("release notes list all six rich intent commands", () => {
  for (const cmd of SIX_COMMANDS) assert.ok(notesRaw.includes(cmd), `missing command: ${cmd}`);
});

// ---------- 8 ----------
test("release notes mention the external Circe serve-loop proof (pass 1 / fail 0)", () => {
  assert.ok(notes.includes("External Circe serve-loop proof passed: pass 1 / fail 0"));
});

// ---------- 9 ----------
test("migration notes say legacy rekon prepare plan / .rekon/handoffs is superseded", () => {
  assert.ok(migration.includes("Legacy rekon prepare plan / .rekon/handoffs direction is superseded"));
});

// ---------- 10 ----------
test("migration notes include the canonical V1 flow", () => {
  assert.ok(
    migration.includes(
      "rekon intent bundle write circe rekon-handoff validate circe rekon-handoff routes circe import rekon-handoff",
    ),
  );
});

// ---------- 11 ----------
test("migration notes say intent:go is not available in V1", () => {
  assert.ok(migration.includes("intent:go is not available in V1."));
});

// ---------- 12 ----------
test("migration notes say .rekon/artifacts/ remains canonical truth", () => {
  assert.ok(migration.includes(".rekon/artifacts/ remains canonical truth"));
});

// ---------- 13 ----------
test("checklist says current packages remain at 0.1.0-beta.0 in this prep slice", () => {
  assert.ok(checklist.includes("Current packages remain at 0.1.0-beta.0 in this prep slice."));
});

// ---------- 14 ----------
test("checklist says no npm publish occurs in this prep slice", () => {
  assert.ok(checklist.includes("No npm publish occurs in this prep slice."));
});

// ---------- 15 ----------
test("checklist says no version bump occurs in this prep slice", () => {
  assert.ok(checklist.includes("No version bump occurs in this prep slice."));
});

// ---------- 16 ----------
test("checklist includes all nine required verification commands", () => {
  for (const gate of NINE_GATES) assert.ok(checklistRaw.includes(gate), `missing gate: ${gate}`);
});

// ---------- 17 ----------
test("CHANGELOG mentions V1 Release Prep", () => {
  assert.match(changelog, /V1 Release Prep/);
});

// ---------- 18 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.match(packet, /PURPOSE PRESERVATION CHECK/);
});
