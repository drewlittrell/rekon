// Docs: Intent Operator Approval / Proof Acceptance Safety Review (slice 124).
//
// Verifies the safety-review memo records the required headings, boundary
// statements, and tables; that the CHANGELOG announces the review; and that the
// review packet carries a PURPOSE PRESERVATION CHECK.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const path = (rel) => fileURLToPath(new URL(`../../${rel}`, import.meta.url));
const read = (rel) => readFileSync(path(rel), "utf8");
const norm = (text) => text.replace(/[`*]/g, "").replace(/\s+/g, " ");

const memoPath = "docs/strategy/intent-operator-approval-proof-acceptance-safety-review.md";
const packetPath = ".rekon-dev/review-packets/intent-operator-approval-proof-acceptance-safety-review.md";
const memoRaw = read(memoPath);
const memo = norm(memoRaw);
const changelog = norm(read("CHANGELOG.md"));

test("1. safety review doc exists", () => assert.ok(existsSync(path(memoPath))));

test("2. doc contains all required headings", () => {
  for (const h of [
    "# Intent Operator Approval / Proof Acceptance Safety Review",
    "## Decision Summary",
    "## Why This Review Exists",
    "## Implementation Reviewed",
    "## Accepted Risk Review",
    "## Approval Gate Review",
    "## Recheck Review",
    "## Approved Revision Review",
    "## CLI Review",
    "## Boundary Review",
    "## Options Considered",
    "## Recommendation",
    "## What This Does Not Do",
    "## Follow-Up Work",
  ]) {
    assert.ok(memoRaw.includes(h), `missing heading: ${h}`);
  }
});

test("3. doc says operator approval is explicit; needs-review plans are never auto-approved", () =>
  assert.ok(memo.includes("Operator approval is explicit; needs-review plans are never auto-approved.")));

test("4. doc says accepted proof gaps are recorded, not erased", () =>
  assert.ok(memo.includes("Accepted proof gaps are recorded, not erased.")));

test("5. doc says approval creates a new PreparedIntentPlan revision", () =>
  assert.ok(memo.includes("Approval creates a new PreparedIntentPlan revision.")));

test("6. doc says the source draft PreparedIntentPlan remains immutable", () =>
  assert.ok(memo.includes("The source draft PreparedIntentPlan remains immutable.")));

test("7. doc says approval rechecks freshness, runtime drift, and IntentStatusReport context", () =>
  assert.ok(memo.includes("Approval rechecks freshness, runtime drift, and IntentStatusReport context.")));

test("8. doc says approval blocks unknown or missing required accepted gaps", () =>
  assert.ok(memo.includes("Approval blocks unknown or missing required accepted gaps.")));

test("9. doc says approval blocks empty approval reasons", () =>
  assert.ok(memo.includes("Approval blocks empty approval reasons.")));

test("10. doc says sourceWriteAllowed remains false", () =>
  assert.ok(memo.includes("sourceWriteAllowed remains false.")));

test("11. doc says approval may enable WorkOrder and VerificationPlan handoff but does not create them", () =>
  assert.ok(memo.includes("Approval may enable WorkOrder and VerificationPlan handoff but does not create them.")));

test("12. doc says approval creates no WorkOrder", () =>
  assert.ok(memo.includes("Approval creates no WorkOrder.")));

test("13. doc says approval creates no VerificationPlan", () =>
  assert.ok(memo.includes("Approval creates no VerificationPlan.")));

test("14. doc says approval creates no VerificationRun or VerificationResult", () =>
  assert.ok(memo.includes("Approval creates no VerificationRun or VerificationResult.")));

test("15. doc says approval executes no commands", () =>
  assert.ok(memo.includes("Approval executes no commands.")));

test("16. doc says approval writes no source files", () =>
  assert.ok(memo.includes("Approval writes no source files.")));

test("17. doc says approval runs no Circe", () =>
  assert.ok(memo.includes("Approval runs no Circe.")));

test("18. doc says intent:go remains deferred", () =>
  assert.ok(memo.includes("intent:go remains deferred.")));

test("19. doc says status-not-work-ready remains a separate downstream gate after approval", () =>
  assert.ok(memo.includes("status-not-work-ready remains a separate downstream gate after approval.")));

test("20. doc includes surface table", () => {
  assert.match(memoRaw, /\| Surface \| Status \| Safety Finding \|/);
  assert.match(memoRaw, /\| rekon intent approve \| shipped \| explicit approval command \|/);
});

test("21. doc includes gate table", () => {
  assert.match(memoRaw, /\| Gate \| Review Finding \|/);
  assert.match(memoRaw, /\| accepted gaps \| must match required known gaps \|/);
});

test("22. doc includes boundary table", () => {
  assert.match(memoRaw, /\| Boundary \| Decision \|/);
  assert.match(memoRaw, /\| approval vs auto-approval \| explicit only \|/);
});

test("23. doc includes option table", () => {
  assert.match(memoRaw, /\| Option \| Decision \| Reason \|/);
  assert.match(memoRaw, /\| auto-approve needs-review \| rejected \| hides proof gaps \|/);
});

test("24. CHANGELOG mentions Intent Operator Approval / Proof Acceptance Safety Review", () =>
  assert.ok(changelog.includes("Intent Operator Approval / Proof Acceptance Safety Review")));

test("25. review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(path(packetPath)), "review packet exists");
  assert.ok(read(packetPath).includes("PURPOSE PRESERVATION CHECK"));
});
