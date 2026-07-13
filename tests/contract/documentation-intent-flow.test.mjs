import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");

const DOCUMENTATION_PLAN = `# Boundary contracts documentation

## Phase 1: Update boundary contracts

Phase Kind: modify
Source Change: required
Objective: Update the tracked boundary contracts documentation with the current repository behavior.

### Deliverables
- Revised boundary contract guide
- Updated command examples

### Acceptance Criteria
- The guide distinguishes implementation and review responsibilities
- Every documented command matches the current CLI

### Expected Changed Files
- docs/boundary-contracts.md

### Verification Commands
- npm run typecheck
- npm run test
- npm run example:all
- npm run cli -- --help

## Phase 2: Review documentation

Phase Kind: review
Source Change: forbidden
Objective: Review the completed guide without changing tracked files.

### Deliverables
- Documentation review notes

### Acceptance Criteria
- Review confirms the guide matches the boundary contract

### Scope
- docs/boundary-contracts.md

### Evidence
- Documentation review decision

## Phase 3: Final verification

Phase Kind: verify
Source Change: forbidden
Objective: Verify the final tree without changing tracked files.

### Deliverables
- Final verification result

### Acceptance Criteria
- Repository checks and CLI help remain green

### Scope
- docs/boundary-contracts.md

### Verification Commands
- npm run typecheck
- npm run test
`;

function runCli(root, args) {
  const env = { ...process.env };
  delete env.OPENAI_API_KEY;
  delete env.REKON_LLM_ENABLED;
  delete env.REKON_RUN_LIVE_LLM_TESTS;
  const result = spawnSync(process.execPath, [cliPath, ...args, "--root", root], {
    cwd: repoRoot,
    encoding: "utf8",
    env,
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim().startsWith("{") ? JSON.parse(result.stdout) : result.stdout;
}

function show(root, ref) {
  return runCli(root, ["artifacts", "show", ref, "--json"]).artifact;
}

test("documentation intent remains implementation-bearing through the Circe bundle", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-documentation-intent-"));
  try {
    await mkdir(join(root, "docs"), { recursive: true });
    await mkdir(join(root, "plans"), { recursive: true });
    await writeFile(join(root, "docs", "boundary-contracts.md"), "# Boundary contracts\n", "utf8");
    await writeFile(join(root, "plans", "documentation.md"), DOCUMENTATION_PLAN, "utf8");
    await writeFile(join(root, "package.json"), `${JSON.stringify({
      name: "documentation-intent-fixture",
      version: "1.0.0",
      type: "module",
      scripts: {
        typecheck: "tsc --noEmit",
        test: "node --test",
        "example:all": "node scripts/examples.mjs",
        cli: "node cli.mjs",
      },
    }, null, 2)}\n`, "utf8");

    runCli(root, ["scan", "--json"]);
    runCli(root, ["intent", "context", "prepare", "--json"]);

    const review = runCli(root, [
      "intent", "plan", "review",
      "--plan", "plans/documentation.md",
      "--goal", "Update boundary contracts documentation",
      "--kind", "documentation",
      "--target", "circe",
      "--semantic", "off",
      "--json",
    ]);
    assert.equal(review.status, "actionable");
    assert.equal(review.target, "circe");
    const actionabilityRef = `IntentPlanActionabilityReport:${review.artifact.id}`;
    const actionability = show(root, actionabilityRef);
    assert.equal(actionability.request.kind, "documentation");
    assert.deepEqual(
      actionability.normalizedPhases.map((phase) => phase.sourceChange),
      ["required", "forbidden", "forbidden"],
    );

    const assessmentOutput = runCli(root, [
      "intent", "assess",
      "--goal", "Update boundary contracts documentation",
      "--kind", "documentation",
      "--path", "docs/boundary-contracts.md",
      "--json",
    ]);
    const assessmentRef = `IntentAssessmentReport:${assessmentOutput.artifact.id}`;
    const assessment = show(root, assessmentRef);
    assert.equal(assessment.request.kind, "documentation");

    const prepare = runCli(root, [
      "intent", "prepare",
      "--assessment", assessmentRef,
      "--actionability-report", actionabilityRef,
      "--json",
    ]);
    const draftRef = `PreparedIntentPlan:${prepare.artifact.id}`;
    const draft = show(root, draftRef);
    assert.equal(draft.request.kind, "documentation");
    assert.deepEqual(draft.phases.map((phase) => phase.title), [
      "Phase 1: Update boundary contracts",
      "Phase 2: Review documentation",
      "Phase 3: Final verification",
    ]);
    assert.deepEqual(draft.phases.map((phase) => phase.kind), ["modify", "review", "verify"]);
    assert.deepEqual(
      draft.phases.map((phase) => phase.sourceChange),
      ["required", "forbidden", "forbidden"],
    );
    assert.deepEqual(draft.phases.map((phase) => phase.goal), [
      "Update the tracked boundary contracts documentation with the current repository behavior.",
      "Review the completed guide without changing tracked files.",
      "Verify the final tree without changing tracked files.",
    ]);
    assert.ok(draft.phases[0].constraints.includes("deliverable: Revised boundary contract guide"));

    const statusOutput = runCli(root, [
      "intent", "status",
      "--assessment", assessmentRef,
      "--prepared-plan", draftRef,
      "--json",
    ]);
    const draftStatusRef = `IntentStatusReport:${statusOutput.artifact.id}`;
    assert.equal(show(root, draftStatusRef).request.kind, "documentation");

    const approved = runCli(root, [
      "intent", "approve",
      "--prepared-plan", draftRef,
      "--intent-status", draftStatusRef,
      "--accept", "verification-proof-missing",
      "--accept", "runtime-drift-unresolved",
      "--reason", "The documentation plan and bounded proof gaps were reviewed for handoff.",
      "--accepted-by", "contract-test",
      "--json",
    ]);
    const approvedRef = `PreparedIntentPlan:${approved.artifact.id}`;

    const transition = runCli(root, [
      "intent", "status", "transition",
      "--prepared-plan", approvedRef,
      "--previous-status", draftStatusRef,
      "--to", "work-ready",
      "--reason", "The approved documentation plan is ready for work.",
      "--json",
    ]);
    const workReadyStatusRef = `IntentStatusReport:${transition.artifact.id}`;
    assert.equal(show(root, workReadyStatusRef).request.kind, "documentation");

    const workOrderOutput = runCli(root, [
      "intent", "work-order", "generate",
      "--prepared-plan", approvedRef,
      "--intent-status", workReadyStatusRef,
      "--json",
    ]);
    const workOrderRef = `WorkOrder:${workOrderOutput.artifact.id}`;
    const workOrder = show(root, workOrderRef);
    assert.equal(workOrder.intentHandoff.requestKind, "documentation");
    assert.deepEqual(workOrder.intentHandoff.phaseIds, draft.phases.map((phase) => phase.id));

    const verificationOutput = runCli(root, [
      "intent", "verification-plan", "generate",
      "--prepared-plan", approvedRef,
      "--intent-status", workReadyStatusRef,
      "--work-order", workOrderRef,
      "--json",
    ]);
    const verificationPlanRef = `VerificationPlan:${verificationOutput.artifact.id}`;
    const verificationPlan = show(root, verificationPlanRef);
    assert.equal(verificationPlan.intentHandoff.requestKind, "documentation");
    assert.deepEqual(verificationPlan.commands, [
      "npm run typecheck",
      "npm run test",
      "npm run example:all",
      "npm run cli -- --help",
      "npm run typecheck",
      "npm run test",
    ]);

    const bundle = runCli(root, [
      "intent", "bundle", "write",
      "--target", "circe",
      "--assessment", assessmentRef,
      "--prepared-plan", approvedRef,
      "--intent-status", workReadyStatusRef,
      "--work-order", workOrderRef,
      "--verification-plan", verificationPlanRef,
      "--json",
    ]);
    const bundleRoot = join(root, bundle.bundlePath);
    const phasePlan = JSON.parse(await readFile(join(bundleRoot, "circe", "phase-plan.json"), "utf8"));
    assert.deepEqual(
      phasePlan.phases.map((phase) => phase.title),
      [
        "Phase 1: Update boundary contracts",
        "Phase 2: Review documentation",
        "Phase 3: Final verification",
      ],
    );
    assert.deepEqual(
      phasePlan.phases.map((phase) => phase.sourceChangePolicy),
      ["required", "forbidden", "forbidden"],
    );
    assert.equal(phasePlan.phases.every((phase) => phase.rekon.requestKind === "documentation"), true);

    const handoff = JSON.parse(await readFile(join(bundleRoot, "circe", "handoff.json"), "utf8"));
    const projectedWorkOrders = await Promise.all(handoff.artifacts.workOrders.map(async (ref) =>
      JSON.parse(await readFile(join(bundleRoot, "circe", ref.path), "utf8"))));
    assert.deepEqual(projectedWorkOrders.map((entry) => entry.goal), draft.phases.map((phase) => phase.goal));
    assert.ok(projectedWorkOrders[0].riskNotes.includes("deliverable: Revised boundary contract guide"));
    assert.equal(projectedWorkOrders.every(
      (entry) => entry.intentHandoff.requestKind === "documentation",
    ), true);

    const projectedPlans = await Promise.all(handoff.artifacts.verificationPlans.map(async (ref) =>
      JSON.parse(await readFile(join(bundleRoot, "circe", ref.path), "utf8"))));
    assert.ok(projectedPlans.some((entry) => entry.commands.includes("npm run cli -- --help")));
    assert.equal(projectedPlans.every(
      (entry) => entry.intentHandoff.requestKind === "documentation",
    ), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
