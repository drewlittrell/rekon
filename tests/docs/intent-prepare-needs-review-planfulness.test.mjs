// Docs contract for the Intent Prepare Needs-Review Planfulness Fix (slice 121).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const memo = readFileSync(resolve(root, "docs/strategy/intent-prepare-needs-review-planfulness.md"), "utf8");
const norm = (text) => text.replace(/[`*]/g, "").replace(/\s+/g, " ");
const n = norm(memo);

test("1. docs say needs-review zero-hard-blocker assessments produce implementation-bearing draft plans", () => {
  assert.ok(n.includes("Needs-review assessments with zero hard blockers produce implementation-bearing draft plans."));
});
test("2. docs say draft plans remain needs-review until explicit approval", () => {
  assert.ok(n.includes("Draft plans remain needs-review until explicit approval."));
});
test("3. docs say intent prepare must not auto-approve needs-review plans", () => {
  assert.ok(n.includes("intent prepare must not auto-approve needs-review plans."));
});
test("4. docs say draft plans include implementation phases when the request requires work", () => {
  assert.ok(n.includes("Draft plans include implementation phases when the request requires work."));
});
test("5. docs say draft plans include verification requirements when safe repository scripts exist", () => {
  assert.ok(n.includes("Draft plans include verification requirements when safe repository scripts exist."));
});
test("6. docs say WorkOrder generation remains blocked until explicit approval", () => {
  assert.ok(n.includes("WorkOrder generation remains blocked until explicit approval."));
});
test("7. docs say VerificationPlan generation remains blocked until explicit approval", () => {
  assert.ok(n.includes("VerificationPlan generation remains blocked until explicit approval."));
});
test("8. docs say no commands are executed", () => {
  assert.ok(n.includes("No commands are executed."));
});
test("9. docs say no source files are written", () => {
  assert.ok(n.includes("No source files are written."));
});
test("10. CHANGELOG mentions Intent Prepare Needs-Review Planfulness Fix", () => {
  const changelog = readFileSync(resolve(root, "CHANGELOG.md"), "utf8");
  assert.ok(changelog.includes("Intent Prepare Needs-Review Planfulness Fix"));
});
test("11. review packet exists with PURPOSE PRESERVATION CHECK", () => {
  const packet = readFileSync(resolve(root, ".rekon-dev/review-packets/intent-prepare-needs-review-planfulness.md"), "utf8");
  assert.ok(packet.length > 0);
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
});
