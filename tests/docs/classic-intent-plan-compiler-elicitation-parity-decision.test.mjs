// Docs: Classic Intent Plan Compiler / Elicitation Parity Decision (slice 128).
//
// Verifies the decision memo restores the old codebase-intel plan compiler +
// critique + elicitation loop via a report-first IntentPlanActionabilityReport,
// puts LLM-backed normalization in scope (bounded to read/transform/critique),
// keeps the layer report-only and approval-coupled, and crosses no execution
// boundary.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const memoPath = fileURLToPath(new URL("../../docs/strategy/classic-intent-plan-compiler-elicitation-parity-decision.md", import.meta.url));
const packetPath = fileURLToPath(new URL("../../.rekon-dev/review-packets/classic-intent-plan-compiler-elicitation-parity-decision.md", import.meta.url));
const changelogPath = fileURLToPath(new URL("../../CHANGELOG.md", import.meta.url));

const memoRaw = existsSync(memoPath) ? readFileSync(memoPath, "utf8") : "";
const packetRaw = existsSync(packetPath) ? readFileSync(packetPath, "utf8") : "";
const changelogRaw = readFileSync(changelogPath, "utf8");
const norm = (text) => text.replace(/[`*]/g, "").replace(/\s+/g, " ");
const memo = norm(memoRaw);
const packet = norm(packetRaw);

test("1. decision memo exists", () => assert.ok(existsSync(memoPath)));
test("2. memo is marked Decided (slice 128)", () => assert.ok(memo.includes("Decided (slice 128)")));
test("3. memo selects the report-first IntentPlanActionabilityReport", () =>
  assert.ok(memo.includes("anchored on a new read-only IntentPlanActionabilityReport")));
test("4. memo says the current PreparedIntentPlan is not enough", () =>
  assert.ok(memo.includes("Rekon's current PreparedIntentPlan is not enough") || memo.includes("Is Rekon's current PreparedIntentPlan enough? No.")));
test("5. memo names the missing layer (plan compiler + critique + elicitation loop)", () =>
  assert.ok(memo.includes("plan compiler + critique + elicitation loop")));
test("6. memo puts LLM-backed semantic normalization in scope", () =>
  assert.ok(memo.includes("puts LLM-backed semantic normalization in scope") || memo.includes("LLM-backed semantic normalization, in scope")));
test("7. memo bounds LLM normalization to read/transform; no commands/source/Circe", () =>
  assert.ok(memo.includes("LLM-backed normalization reads and transforms plan text into structured drafts, findings, and questions; it executes no commands, writes no source, and runs no Circe.")));
test("8. memo keeps the layer report-only; no source, no plan mutation", () =>
  assert.ok(memo.includes("The plan-actionability layer is report-only; it writes no source and mutates no plan.")));
test("9. memo couples missing required fields to blocking approval", () =>
  assert.ok(memo.includes("Missing required fields produce blocking actionability findings that block approval.")));
test("10. memo surfaces elicitation questions but defers merge-back", () =>
  assert.ok(memo.includes("The elicitation questions are surfaced; answers are merged back into the draft only in a later, gated implementation slice.")));
test("11. memo proposes rekon intent plan review", () =>
  assert.ok(memo.includes("rekon intent plan review")));
test("12. memo says the report does not auto-approve and does not auto-revise", () =>
  assert.ok(memo.includes("does not auto-approve and does not auto-revise the plan")));
test("13. memo affirms intent:go remains deferred", () =>
  assert.ok(memo.includes("intent:go remains deferred.")));
test("14. memo names the next implementation slice", () =>
  assert.ok(memo.includes("Intent Plan Actionability Report v1")));
test("15. memo includes the parity table", () =>
  assert.match(memoRaw, /\| Capability \| Old codebase-intel \| Current Rekon \| Verdict \|/));
test("16. memo includes the option table", () =>
  assert.match(memoRaw, /\| Option \| Decision \| Reason \|/));
test("17. memo includes the boundary table", () =>
  assert.match(memoRaw, /\| Boundary \| Decision \|/));
test("18. memo includes the selected-model table", () =>
  assert.match(memoRaw, /\| Field \| Decision \|/));
test("19. CHANGELOG mentions the decision", () =>
  assert.ok(norm(changelogRaw).includes("Classic Intent Plan Compiler / Elicitation Parity Decision")));
test("20. review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(packetPath));
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
});
