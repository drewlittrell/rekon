// Documentation coverage for Plan Compiler Loop Closure (slice 135).

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const path = (rel) => resolve(repoRoot, rel);
const read = (rel) => readFileSync(path(rel), "utf8");
const norm = (rel) => read(rel).replace(/[`*]/g, "").replace(/\s+/g, " ").toLowerCase();

const DOC = "docs/strategy/plan-compiler-loop-closure.md";
const PACKET = ".rekon-dev/review-packets/plan-compiler-loop-closure.md";
const CHANGELOG = "CHANGELOG.md";

test("1. closure doc exists", () => {
  assert.ok(existsSync(path(DOC)));
});
test("2. doc treats the plan compiler loop as one integrated capability", () => {
  assert.ok(norm(DOC).includes("plan compiler loop as one integrated capability"));
});
test("3. doc states the loop is review -> answer -> merge-back -> prepare", () => {
  assert.ok(norm(DOC).includes("review → answer → merge-back → prepare".toLowerCase()));
});
test("4. doc says answered reports may feed prepare", () => {
  assert.ok(norm(DOC).includes("answered reports may feed prepare"));
});
test("5. doc says source plan files are unchanged", () => {
  assert.ok(norm(DOC).includes("source plan files are unchanged"));
});
test("6. doc says source reports are immutable", () => {
  assert.ok(norm(DOC).includes("source reports are immutable"));
});
test("7. doc says approval remains explicit", () => {
  assert.ok(norm(DOC).includes("approval remains explicit"));
});
test("8. doc says status transition remains explicit", () => {
  assert.ok(norm(DOC).includes("status transition remains explicit"));
});
test("9. doc says WorkOrder / VerificationPlan handoff remain gated", () => {
  assert.ok(norm(DOC).includes("workorder / verificationplan handoff remain gated"));
});
test("10. doc says no command execution", () => {
  assert.ok(norm(DOC).includes("no command execution"));
});
test("11. doc says no source writes", () => {
  assert.ok(norm(DOC).includes("no source writes"));
});
test("12. doc says no Circe execution by Rekon", () => {
  assert.ok(norm(DOC).includes("no circe execution by rekon"));
});
test("13. doc says intent:go remains deferred", () => {
  assert.ok(norm(DOC).includes("intent:go remains deferred"));
});
test("14. doc states this closure batch replaces a separate immediate safety-review slice", () => {
  assert.ok(
    norm(DOC).includes(
      "this closure batch replaces a separate immediate safety-review slice because it introduces no new execution/source-write/circe boundary beyond the already-reviewed components",
    ),
  );
});
test("15. CHANGELOG mentions Plan Compiler Loop Closure", () => {
  assert.ok(norm(CHANGELOG).includes("plan compiler loop closure"));
});
test("16. review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(path(PACKET)));
  assert.ok(read(PACKET).includes("PURPOSE PRESERVATION CHECK"));
});
