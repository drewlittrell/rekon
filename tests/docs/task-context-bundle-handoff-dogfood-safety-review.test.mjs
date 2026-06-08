// Docs tests for the TaskContextReport Bundle Handoff Dogfood Safety Review (slice 191,
// rebased to 11a209fd). Locks the safety-review findings: the shipped slice-190 handoff
// dogfood is safe/stable, the circe/actor-contracts artifacts are non-executing
// guidance/artifacts, the new Circe Operator Command Boundary is operator-only inspection
// guidance that reinforces the non-execution boundary, and every boundary held.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (relativePath) => readFileSync(resolve(repoRoot, relativePath), "utf8");
const norm = (text) =>
  text
    .replace(/^>\s?/gm, "")
    .toLowerCase()
    .replace(/[`*]/g, "")
    .replace(/\s+/g, " ");

const MEMO = "docs/strategy/task-context-report-bundle-handoff-dogfood-safety-review.md";
const PACKET = ".rekon-dev/review-packets/task-context-report-bundle-handoff-dogfood-safety-review.md";

const memoRaw = read(MEMO);
const memo = norm(memoRaw);
const packet = read(PACKET);
const changelog = norm(read("CHANGELOG.md"));

// 1
test("safety review doc exists", () => {
  assert.ok(memoRaw.length > 0);
});

// 2
test("doc contains all required headings", () => {
  const headings = [
    "## decision summary",
    "## why this review exists",
    "## dogfood reviewed",
    "## human handoff review",
    "## agent handoff review",
    "## agent context review",
    "## traceability review",
    "## circe handoff review",
    "## actor contract review",
    "## operator command boundary review",
    "## gate review",
    "## without-context review",
    "## boundary review",
    "## options considered",
    "## recommendation",
    "## what this does not do",
    "## follow-up work",
  ];
  for (const h of headings) assert.ok(memo.includes(h), `missing heading: ${h}`);
});

// 3
test("doc says TaskContextReport sidecars are optional context, not proof", () => {
  assert.ok(memo.includes("taskcontextreport sidecars are optional context, not proof"));
});

// 4
test("doc says the full handoff dogfood path completed successfully", () => {
  assert.ok(memo.includes("the full handoff dogfood path completed successfully"));
});

// 5
test("doc says a human can discover task context from README.md", () => {
  assert.ok(memo.includes("a human can discover task context from readme.md"));
});

// 6
test("doc says context/task-context.md was useful for a human operator", () => {
  assert.ok(memo.includes("context/task-context.md was useful for a human operator"));
});

// 7
test("doc says context/task-context.refs.json was useful for traceability", () => {
  assert.ok(memo.includes("context/task-context.refs.json was useful for traceability"));
});

// 8
test("doc says an agent can discover task context from agent/instructions.md", () => {
  assert.ok(memo.includes("an agent can discover task context from agent/instructions.md"));
});

// 9
test("doc says an agent can discover task context from agent/handoff.md", () => {
  assert.ok(memo.includes("an agent can discover task context from agent/handoff.md"));
});

// 10
test("doc says agent/context.json taskContext metadata was useful", () => {
  assert.ok(memo.includes("agent/context.json taskcontext metadata was useful"));
});

// 11
test("doc says context/task-context.agent.json was useful to an agent", () => {
  assert.ok(memo.includes("context/task-context.agent.json was useful to an agent"));
});

// 12
test("doc says agent/verification.json remains authoritative for verification posture", () => {
  assert.ok(memo.includes("agent/verification.json remains authoritative for verification posture"));
});

// 13
test("doc says agent/source-refs.json remains authoritative for source refs", () => {
  assert.ok(memo.includes("agent/source-refs.json remains authoritative for source refs"));
});

// 14
test("doc says Circe handoff JSON remains stable and independent of TaskContextReport", () => {
  assert.ok(memo.includes("circe handoff json remains stable and independent of taskcontextreport"));
});

// 15
test("doc says Circe actor-contract artifacts were present and non-executing", () => {
  assert.ok(memo.includes("circe actor-contract artifacts were present and non-executing"));
});

// 16
test("doc says actor contracts are guidance/artifacts, not executed workers", () => {
  assert.ok(memo.includes("actor contracts are guidance/artifacts, not executed workers"));
});

// 17
test("doc says the Operator Command Boundary is operator-only inspection guidance, not worker execution guidance", () => {
  assert.ok(memo.includes("the operator command boundary is operator-only inspection guidance, not worker execution guidance"));
});

// 18
test("doc says the Operator Command Boundary reinforces that Rekon does not run Circe", () => {
  assert.ok(memo.includes("the operator command boundary reinforces that rekon does not run circe"));
});

// 19
test("doc says the Operator Command Boundary treats worker requests to run Circe operator commands as plan-quality concerns", () => {
  assert.ok(memo.includes("the operator command boundary treats worker requests to run circe operator commands as plan-quality concerns"));
});

// 20
test("doc says WorkOrder / VerificationPlan gates remain authoritative", () => {
  assert.ok(memo.includes("workorder / verificationplan gates remain authoritative"));
});

// 21
test("doc says phase gates remain authoritative", () => {
  assert.ok(memo.includes("phase gates remain authoritative"));
});

// 22
test("doc says source and plan files were unchanged", () => {
  assert.ok(memo.includes("source and plan files were unchanged"));
});

// 23
test("doc says no commands were executed", () => {
  assert.ok(memo.includes("no commands were executed"));
});

// 24
test("doc says no VerificationRun or VerificationResult was created", () => {
  assert.ok(memo.includes("no verificationrun or verificationresult was created"));
});

// 25
test("doc says Rekon did not run Circe", () => {
  assert.ok(memo.includes("rekon did not run circe"));
});

// 26
test("doc says intent:go remains deferred", () => {
  assert.ok(memo.includes("intent:go remains deferred"));
});

// 27
test("doc includes surface table", () => {
  assert.ok(memo.includes("surface | dogfood finding | safety finding"));
});

// 28
test("doc includes boundary table", () => {
  assert.ok(memo.includes("boundary | review finding"));
});

// 29
test("doc includes actor-contract table", () => {
  assert.ok(memo.includes("actor contract surface | review finding"));
});

// 30
test("doc includes finding table", () => {
  assert.ok(memo.includes("finding | severity | resolution"));
});

// 31
test("doc includes option table", () => {
  assert.ok(memo.includes("option | decision | reason"));
});

// 32
test("CHANGELOG mentions TaskContextReport Bundle Handoff Dogfood Safety Review", () => {
  assert.ok(changelog.includes("taskcontextreport bundle handoff dogfood safety review"));
});

// 33
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(packet.length > 0);
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
  assert.ok(packet.includes("OPERATOR COMMAND BOUNDARY REVIEW"));
});
