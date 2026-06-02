// Docs: Intent Status Work-Ready Transition Safety Review (slice 127).
//
// Verifies the safety-review memo confirms the shipped `rekon intent status
// transition` is safe/stable: explicit (never automatic), writes a new immutable
// IntentStatusReport revision, rechecks context conservatively, enables but does
// not create the downstream handoffs, and crosses no execution boundary.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const memoPath = fileURLToPath(new URL("../../docs/strategy/intent-status-work-ready-transition-safety-review.md", import.meta.url));
const packetPath = fileURLToPath(new URL("../../.rekon-dev/review-packets/intent-status-work-ready-transition-safety-review.md", import.meta.url));
const changelogPath = fileURLToPath(new URL("../../CHANGELOG.md", import.meta.url));

const memoRaw = existsSync(memoPath) ? readFileSync(memoPath, "utf8") : "";
const packetRaw = existsSync(packetPath) ? readFileSync(packetPath, "utf8") : "";
const changelogRaw = readFileSync(changelogPath, "utf8");
const norm = (text) => text.replace(/[`*]/g, "").replace(/\s+/g, " ");
const memo = norm(memoRaw);
const packet = norm(packetRaw);

const REQUIRED_HEADINGS = [
  "# Intent Status Work-Ready Transition Safety Review",
  "## Decision Summary",
  "## Why This Review Exists",
  "## Implementation Reviewed",
  "## Additive Field Review",
  "## Transition Gate Review",
  "## Work-Ready Report Review",
  "## CLI Review",
  "## Handoff Gate Review",
  "## Boundary Review",
  "## Options Considered",
  "## Recommendation",
  "## What This Does Not Do",
  "## Follow-Up Work",
];

test("1. safety review doc exists", () => assert.ok(existsSync(memoPath)));
test("2. doc contains all required headings", () => {
  for (const h of REQUIRED_HEADINGS) assert.ok(memoRaw.includes(h), `missing heading: ${h}`);
});

// ---- Required verbatim statements (assertions 3-20) ----
test("3. explicit; approval does not auto-transition", () =>
  assert.ok(memo.includes("Status transition is explicit; approval does not automatically make status work-ready.")));
test("4. creates a new IntentStatusReport revision", () =>
  assert.ok(memo.includes("Status transition creates a new IntentStatusReport revision.")));
test("5. previous IntentStatusReport immutable", () =>
  assert.ok(memo.includes("The previous IntentStatusReport remains immutable.")));
test("6. approved PreparedIntentPlan immutable", () =>
  assert.ok(memo.includes("The approved PreparedIntentPlan remains immutable.")));
test("7. work-ready requires an approved PreparedIntentPlan", () =>
  assert.ok(memo.includes("Work-ready status requires an approved PreparedIntentPlan.")));
test("8. rechecks prior status, freshness, runtime drift", () =>
  assert.ok(memo.includes("Status transition rechecks prior status, freshness, and runtime drift context.")));
test("9. sourceWriteAllowed remains false", () =>
  assert.ok(memo.includes("sourceWriteAllowed remains false.")));
test("10. carries acceptedRisks into proof", () =>
  assert.ok(memo.includes("Status transition carries acceptedRisks into IntentStatusReport proof.")));
test("11. recommendedNextAction is create-work-order", () =>
  assert.ok(memo.includes("recommendedNextAction is create-work-order.")));
test("12. WorkOrder handoff proceeds past status-not-work-ready", () =>
  assert.ok(memo.includes("WorkOrder handoff proceeds past status-not-work-ready after transition.")));
test("13. VerificationPlan handoff proceeds past status-not-work-ready", () =>
  assert.ok(memo.includes("VerificationPlan handoff proceeds past status-not-work-ready after transition.")));
test("14. creates no WorkOrder", () =>
  assert.ok(memo.includes("Status transition creates no WorkOrder.")));
test("15. creates no VerificationPlan", () =>
  assert.ok(memo.includes("Status transition creates no VerificationPlan.")));
test("16. creates no VerificationRun or VerificationResult", () =>
  assert.ok(memo.includes("Status transition creates no VerificationRun or VerificationResult.")));
test("17. executes no commands", () =>
  assert.ok(memo.includes("Status transition executes no commands.")));
test("18. writes no source files", () =>
  assert.ok(memo.includes("Status transition writes no source files.")));
test("19. runs no Circe", () =>
  assert.ok(memo.includes("Status transition runs no Circe.")));
test("20. intent:go remains deferred", () =>
  assert.ok(memo.includes("intent:go remains deferred.")));

// ---- Tables (assertions 21-24) ----
test("21. doc includes surface table", () =>
  assert.match(memoRaw, /\| Surface \| Status \| Safety Finding \|/));
test("22. doc includes gate table", () =>
  assert.match(memoRaw, /\| Gate \| Review Finding \|/));
test("23. doc includes boundary table", () =>
  assert.match(memoRaw, /\| Boundary \| Decision \|/));
test("24. doc includes option table", () =>
  assert.match(memoRaw, /\| Option \| Decision \| Reason \|/));

// ---- CHANGELOG + review packet (assertions 25-26) ----
test("25. CHANGELOG mentions the safety review", () =>
  assert.ok(norm(changelogRaw).includes("Intent Status Work-Ready Transition Safety Review")));
test("26. review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(packetPath));
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
});
