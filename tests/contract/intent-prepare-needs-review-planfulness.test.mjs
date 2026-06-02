// Contract: Intent Prepare Needs-Review Planfulness Fix (slice 121).
//
// On a fresh repo, `rekon intent assess` reaches needs-review with ZERO hard
// blockers. Before the fix, `rekon intent prepare` produced only a review phase
// and no verification requirements. After the fix it produces an
// implementation-bearing DRAFT plan (investigate / modify / verify / review with
// safe verification requirements) while keeping approval needs-review and the
// WorkOrder / VerificationPlan handoff gates closed. No commands run; no source
// is written.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const cliPath = fileURLToPath(new URL("../../packages/cli/dist/index.js", import.meta.url));

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], { encoding: "utf8" });
}

function readLatestArtifact(dir, type) {
  const root = join(dir, ".rekon", "artifacts");
  const out = [];
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.startsWith(`${type}-`) && name.endsWith(".json")) out.push(full);
    }
  };
  walk(root);
  out.sort();
  return JSON.parse(readFileSync(out.at(-1), "utf8"));
}

// ---- Fresh-repo pipeline (run once) ----
const dir = mkdtempSync(join(tmpdir(), "rekon-prepare-planfulness-"));
mkdirSync(join(dir, "src"), { recursive: true });
mkdirSync(join(dir, "plans"), { recursive: true });
writeFileSync(
  join(dir, "package.json"),
  JSON.stringify(
    {
      name: "fresh-rekon-intent",
      version: "0.0.0",
      type: "module",
      scripts: { typecheck: "tsc --noEmit", test: "node --test", build: "echo build" },
      devDependencies: { typescript: "^5.0.0" },
    },
    null,
    2,
  ),
);
const SRC = 'export const existing = "ok";\n';
writeFileSync(join(dir, "src", "index.ts"), SRC);
writeFileSync(join(dir, "plans", "add-marker.md"), "# Add marker export\n\nAdd a marker export to src/index.ts.\n");

const scan = runCli(["scan", "--root", dir, "--json"]);
const ctx = runCli(["intent", "context", "prepare", "--root", dir, "--json"]);
const assess = runCli(["intent", "assess", "--root", dir, "--goal", "Add a marker export to src/index.ts.", "--kind", "feature", "--path", "src/index.ts", "--json"]);
const assessmentRef = runCli(["artifacts", "latest", "--root", dir, "--type", "IntentAssessmentReport", "--id-only"]).stdout.trim();
const prepare = runCli(["intent", "prepare", "--root", dir, "--assessment", assessmentRef, "--json"]);
const prepareJson = prepare.status === 0 ? JSON.parse(prepare.stdout) : null;
const planArtifact = readLatestArtifact(dir, "PreparedIntentPlan");
const planRef = runCli(["artifacts", "latest", "--root", dir, "--type", "PreparedIntentPlan", "--id-only"]).stdout.trim();
const phaseKinds = planArtifact.phases.map((p) => p.kind);
const phaseById = Object.fromEntries(planArtifact.phases.map((p) => [p.id, p]));
const reqIds = planArtifact.verificationRequirements.map((r) => r.id);

const workOrder = runCli(["intent", "work-order", "generate", "--root", dir, "--prepared-plan", planRef, "--json"]);
const woJson = (() => { try { return JSON.parse(workOrder.stdout); } catch { return null; } })();
const verificationPlan = runCli(["intent", "verification-plan", "generate", "--root", dir, "--prepared-plan", planRef, "--json"]);

test("1. fresh repo scan succeeds", () => assert.equal(scan.status, 0));
test("2. intent context prepare succeeds", () => assert.equal(ctx.status, 0));
test("3. intent assess has zero hard blockers", () => {
  assert.equal(assess.status, 0);
  assert.equal(JSON.parse(assess.stdout).blockers, 0);
});
test("4. intent prepare succeeds from needs-review assessment", () => {
  assert.equal(prepare.status, 0);
  assert.ok(prepareJson);
});
test("5. prepared plan status remains needs-review", () => assert.equal(prepareJson.status.value, "needs-review"));
test("6. approval.status remains needs-review", () => assert.equal(prepareJson.approval.status, "needs-review"));
test("7. approval.reasons include verification-proof-missing", () =>
  assert.ok(prepareJson.approval.reasons.includes("verification-proof-missing")));
test("8. approval.reasons include runtime-drift-unresolved", () =>
  assert.ok(prepareJson.approval.reasons.includes("runtime-drift-unresolved")));
test("9. prepared plan includes phase:investigate", () => assert.ok(phaseKinds.includes("investigate")));
test("10. prepared plan includes phase:modify for feature request", () => assert.ok(phaseKinds.includes("modify")));
test("11. prepared plan includes phase:verify", () => assert.ok(phaseKinds.includes("verify")));
test("12. prepared plan includes phase:review", () => assert.ok(phaseKinds.includes("review")));
test("13. prepared plan verificationRequirements is non-empty", () =>
  assert.ok(planArtifact.verificationRequirements.length > 0));
test("14. verificationRequirements include typecheck when script exists", () =>
  assert.ok(reqIds.includes("verify:typecheck")));
test("15. verificationRequirements include test when script exists", () =>
  assert.ok(reqIds.includes("verify:test")));
test("16. verificationRequirements include build when script exists", () =>
  assert.ok(reqIds.includes("verify:build")));
test("17. verification requirements attach to phase:modify", () =>
  assert.ok((phaseById["phase:modify"].verificationRequirements ?? []).length > 0));
test("18. verification requirements attach to phase:verify", () =>
  assert.ok((phaseById["phase:verify"].verificationRequirements ?? []).length > 0));
test("19. work-order generate remains blocked", () => assert.notEqual(workOrder.status, 0));
test("20. work-order blocker includes plan-not-approved", () =>
  assert.ok((woJson?.blockers ?? []).some((b) => b.id === "plan-not-approved")));
test("21. verification-plan generate remains blocked", () => assert.notEqual(verificationPlan.status, 0));
test("22. bundle write, if allowed, does not claim approval", () => {
  const bw = runCli(["intent", "bundle", "write", "--root", dir, "--prepared-plan", planRef, "--json"]);
  // Whether bundle write is blocked or succeeds, it must never elevate the plan
  // to approved: the stored PreparedIntentPlan approval stays needs-review.
  const afterPlan = readLatestArtifact(dir, "PreparedIntentPlan");
  assert.equal(afterPlan.approval.status, "needs-review");
  if (bw.status === 0) assert.ok(!/"status"\s*:\s*"approved"/.test(bw.stdout), "bundle output claims no approval");
});
test("23. source file unchanged", () => assert.equal(readFileSync(join(dir, "src", "index.ts"), "utf8"), SRC));
test("24. artifacts validate clean", () => {
  const v = runCli(["artifacts", "validate", "--root", dir, "--json"]);
  assert.equal(v.status, 0);
  const parsed = JSON.parse(v.stdout);
  assert.ok(parsed.valid === true || parsed.ok === true, "artifacts validate reports valid");
});

// Reference the unused binding so linters stay quiet without changing behavior.
void existsSync;
