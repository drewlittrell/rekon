// Docs: Intent Status Work-Ready Transition Implementation (slice 126).
//
// Verifies the implementation memo and review packet document the shipped
// `rekon intent status transition` command, its additive kernel fields, the
// work-ready gate, and the preserved boundaries.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const memoPath = fileURLToPath(new URL("../../docs/strategy/intent-status-work-ready-transition-implementation.md", import.meta.url));
const packetPath = fileURLToPath(new URL("../../.rekon-dev/review-packets/intent-status-work-ready-transition-v1.md", import.meta.url));
const decisionPath = fileURLToPath(new URL("../../docs/strategy/intent-status-work-ready-transition-decision.md", import.meta.url));

const memoRaw = readFileSync(memoPath, "utf8");
const packetRaw = readFileSync(packetPath, "utf8");
const decisionRaw = readFileSync(decisionPath, "utf8");
const norm = (text) => text.replace(/[`*]/g, "").replace(/\s+/g, " ");
const memo = norm(memoRaw);
const packet = norm(packetRaw);

// ---- Memo content ----
test("1. memo is marked shipped for slice 126", () =>
  assert.ok(memo.includes("Shipped (slice 126)")));
test("2. memo documents the new CLI command", () =>
  assert.ok(memo.includes("rekon intent status transition")));
test("3. memo states the work-ready status value and next action", () =>
  assert.ok(memo.includes("status.value is work-ready") && memo.includes("create-work-order")));
test("4. memo lists the additive source refs", () =>
  assert.ok(memo.includes("approvedPreparedIntentPlanRef") && memo.includes("previousIntentStatusReportRef")));
test("5. memo lists the additive proof.preparation.acceptedRisks field", () =>
  assert.ok(memo.includes("acceptedRisks")));
test("6. memo documents the 14 blocker categories table", () => {
  assert.match(memoRaw, /\| Blocker category \| Fires when \|/);
  assert.ok(memo.includes("missing-previous-status") && memo.includes("previous-status-high-blocker"));
});
test("7. memo states the previous report and approved plan remain immutable", () =>
  assert.ok(memo.includes("previous IntentStatusReport remains immutable") && memo.includes("approved PreparedIntentPlan remains immutable")));
test("8. memo states the transition enables but does not create the handoffs", () =>
  assert.ok(memo.includes("enable WorkOrder and VerificationPlan handoff but does not create them")));
test("9. memo affirms no Circe and intent:go deferred", () =>
  assert.ok(memo.includes("does not run Circe") && memo.includes("does not implement intent:go")));
test("10. memo rejects inventing a combined recommended-next-action value", () =>
  assert.ok(memo.includes("create-work-order-and-verification-plan value does not exist")));

// ---- Review packet content ----
test("11. packet documents the boundaries JSON flags", () =>
  assert.ok(packet.includes("createdWorkOrder:false") && packet.includes("implementedIntentGo:false")));
test("12. packet records the 35-assertion contract test and 14-assertion docs test", () =>
  assert.ok(packet.includes("35 assertions") && packet.includes("14 assertions")));
test("13. packet names the next step as the safety review", () =>
  assert.ok(packet.includes("Intent Status Work-Ready Transition Safety Review")));

// ---- Decision linkage ----
test("14. decision memo points forward to this implementation", () =>
  assert.ok(norm(decisionRaw).includes("Intent Status Work-Ready Transition Implementation")));
