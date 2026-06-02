// Docs contract for the Intent Operator Approval / Proof Acceptance Decision (slice 122).
// A strategy / architecture decision batch: it pins the explicit operator approval
// path that turns a needs-review draft PreparedIntentPlan into a NEW approved
// revision after rechecking freshness / drift / status and recording accepted gaps.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const memoPath = resolve(root, "docs/strategy/intent-operator-approval-proof-acceptance-decision.md");
const packetPath = resolve(root, ".rekon-dev/review-packets/intent-operator-approval-proof-acceptance-decision.md");
const changelogPath = resolve(root, "CHANGELOG.md");

const raw = readFileSync(memoPath, "utf8");
const norm = (text) => text.replace(/[`*]/g, "").replace(/\s+/g, " ");
const n = norm(raw);

const REQUIRED_HEADINGS = [
  "## Decision Summary",
  "## Why This Decision Exists",
  "## Current Approval Gap",
  "## Options Considered",
  "## Recommendation",
  "## Approval Gate Model",
  "## Accepted Risk Model",
  "## Recheck Model",
  "## Approved Revision Semantics",
  "## Boundary Model",
  "## What This Does Not Do",
  "## Implementation Sequence",
];

test("1. decision memo exists", () => {
  assert.ok(raw.length > 0);
  assert.match(raw, /^# Intent Operator Approval \/ Proof Acceptance Decision/m);
});
test("2. doc contains all required headings", () => {
  for (const h of REQUIRED_HEADINGS) assert.ok(raw.includes(h), `missing heading: ${h}`);
});
test("3. doc selects new approved PreparedIntentPlan revision", () => {
  assert.match(raw, /new approved PreparedIntentPlan revision \| selected/);
  assert.ok(n.includes("a new approved PreparedIntentPlan revision"));
});
test("4. operator approval is explicit; never auto-approved", () => {
  assert.ok(n.includes("Operator approval is explicit; needs-review plans are never auto-approved."));
});
test("5. approval creates a new revision, not a mutation", () => {
  assert.ok(n.includes("Approval creates a new PreparedIntentPlan revision rather than mutating the existing artifact."));
});
test("6. approval accepts gaps, does not erase them", () => {
  assert.ok(n.includes("Approval accepts specific proof gaps; it does not erase them."));
});
test("7. approval rechecks freshness and drift", () => {
  assert.ok(n.includes("Approval must recheck freshness and runtime drift before enabling handoff."));
});
test("8. approval enables but does not create handoffs", () => {
  assert.ok(n.includes("Approval may enable WorkOrder and VerificationPlan handoff but does not create them."));
});
test("9. approval does not create VerificationRun or VerificationResult", () => {
  assert.ok(n.includes("Approval does not create VerificationRun or VerificationResult."));
});
test("10. approval does not execute commands", () => {
  assert.ok(n.includes("Approval does not execute commands."));
});
test("11. approval does not write source files", () => {
  assert.ok(n.includes("Approval does not write source files."));
});
test("12. approval does not implement intent:go", () => {
  assert.ok(n.includes("Approval does not implement intent:go."));
});
test("13. option table present", () => {
  assert.match(raw, /\| Option \| Decision \| Reason \|/);
  assert.match(raw, /auto-approve needs-review \| rejected/);
});
test("14. gate table present", () => {
  assert.match(raw, /\| Gate \| Required State \|/);
  assert.match(raw, /runtime drift recheck \| no new high-severity drift/);
});
test("15. result table present", () => {
  assert.match(raw, /\| Field \| Approved Revision \|/);
  assert.match(raw, /downstreamHandoff.sourceWriteAllowed \| false/);
});
test("16. boundary table present", () => {
  assert.match(raw, /\| Boundary \| Decision \|/);
  assert.match(raw, /approval vs intent:go \| deferred/);
});
test("17. CHANGELOG mentions the decision", () => {
  assert.ok(readFileSync(changelogPath, "utf8").includes("Intent Operator Approval / Proof Acceptance Decision"));
});
test("18. review packet exists with PURPOSE PRESERVATION CHECK", () => {
  const packet = readFileSync(packetPath, "utf8");
  assert.ok(packet.length > 0);
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
});
