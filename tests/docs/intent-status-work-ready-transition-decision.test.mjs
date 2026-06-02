// Docs: Intent Status Work-Ready Transition Decision (slice 125).
//
// Verifies the decision memo selects the explicit status transition, records the
// required headings + boundary statements + tables, and that the CHANGELOG and
// review packet are wired up.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const path = (rel) => fileURLToPath(new URL(`../../${rel}`, import.meta.url));
const read = (rel) => readFileSync(path(rel), "utf8");
const norm = (text) => text.replace(/[`*]/g, "").replace(/\s+/g, " ");

const memoPath = "docs/strategy/intent-status-work-ready-transition-decision.md";
const packetPath = ".rekon-dev/review-packets/intent-status-work-ready-transition-decision.md";
const memoRaw = read(memoPath);
const memo = norm(memoRaw);
const changelog = norm(read("CHANGELOG.md"));

test("1. decision memo exists", () => assert.ok(existsSync(path(memoPath))));

test("2. doc contains all required headings", () => {
  for (const h of [
    "# Intent Status Work-Ready Transition Decision",
    "## Decision Summary",
    "## Why This Decision Exists",
    "## Current Status Gap",
    "## Options Considered",
    "## Recommendation",
    "## Work-Ready Gate Model",
    "## Status Semantics",
    "## Recheck Model",
    "## Resulting Status Report",
    "## Boundary Model",
    "## What This Does Not Do",
    "## Implementation Sequence",
  ]) {
    assert.ok(memoRaw.includes(h), `missing heading: ${h}`);
  }
});

test("3. doc selects explicit status transition", () => {
  assert.ok(memo.includes("Selected Option B"));
  assert.ok(memo.includes("an explicit status transition"));
  assert.match(memoRaw, /\| explicit status transition \| selected \| preserves auditability \|/);
});

test("4. doc says status transition is explicit; approval does not automatically make status work-ready", () =>
  assert.ok(memo.includes("Status transition is explicit; approval does not automatically make status work-ready.")));

test("5. doc says status transition creates a new IntentStatusReport artifact rather than mutating an existing report", () =>
  assert.ok(memo.includes("Status transition creates a new IntentStatusReport artifact rather than mutating an existing report.")));

test("6. doc says work-ready status requires an approved PreparedIntentPlan", () =>
  assert.ok(memo.includes("Work-ready status requires an approved PreparedIntentPlan.")));

test("7. doc says work-ready status preserves sourceWriteAllowed false", () =>
  assert.ok(memo.includes("Work-ready status preserves sourceWriteAllowed false.")));

test("8. doc says status transition may enable WorkOrder and VerificationPlan handoff but does not create them", () =>
  assert.ok(memo.includes("Status transition may enable WorkOrder and VerificationPlan handoff but does not create them.")));

test("9. doc says status transition creates no WorkOrder", () =>
  assert.ok(memo.includes("Status transition creates no WorkOrder.")));

test("10. doc says status transition creates no VerificationPlan", () =>
  assert.ok(memo.includes("Status transition creates no VerificationPlan.")));

test("11. doc says status transition creates no VerificationRun or VerificationResult", () =>
  assert.ok(memo.includes("Status transition creates no VerificationRun or VerificationResult.")));

test("12. doc says status transition executes no commands", () =>
  assert.ok(memo.includes("Status transition executes no commands.")));

test("13. doc says status transition writes no source files", () =>
  assert.ok(memo.includes("Status transition writes no source files.")));

test("14. doc says status transition does not run Circe", () =>
  assert.ok(memo.includes("Status transition does not run Circe.")));

test("15. doc says status transition does not implement intent:go", () =>
  assert.ok(memo.includes("Status transition does not implement intent:go.")));

test("16. doc includes option table", () => {
  assert.match(memoRaw, /\| Option \| Decision \| Reason \|/);
  assert.match(memoRaw, /\| auto-transition after approval \| rejected\/deferred \| hidden side effect \|/);
});

test("17. doc includes gate table", () => {
  assert.match(memoRaw, /\| Gate \| Required State \|/);
  assert.match(memoRaw, /\| sourceWriteAllowed \| false \|/);
});

test("18. doc includes result table", () => {
  assert.match(memoRaw, /\| Field \| Work-Ready Status Report \|/);
  assert.match(memoRaw, /\| status\.value \| work-ready \|/);
});

test("19. doc includes boundary table", () => {
  assert.match(memoRaw, /\| Boundary \| Decision \|/);
  assert.match(memoRaw, /\| status transition vs approval \| separate step \|/);
});

test("20. CHANGELOG mentions Intent Status Work-Ready Transition Decision", () =>
  assert.ok(changelog.includes("Intent Status Work-Ready Transition Decision")));

test("21. review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(path(packetPath)), "review packet exists");
  assert.ok(read(packetPath).includes("PURPOSE PRESERVATION CHECK"));
});
