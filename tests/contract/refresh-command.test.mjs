import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");
const importBoundaryFixture = join(
  repoRoot,
  "examples/import-boundary-rule-pack/fixtures/bad-imports",
);
const ruleackPackageName = "rekon-capability-import-boundaries-example";

const EXPECTED_STEP_ORDER = [
  "init",
  "config.validate",
  "observe",
  "capability.graph",
  "project",
  "rulebook",
  "evaluate",
  "findings.filter",
  "findings.filter-health",
  "findings.lifecycle",
  "issues.adjudicate",
  "coherency.delta",
  "snapshot",
  "publish.architecture",
  "artifacts.validate",
  "artifacts.freshness",
];

const REQUIRED_ARTIFACT_TYPES = [
  "EvidenceGraph",
  "CapabilityEvidenceGraph",
  "ObservedRepo",
  "OwnershipMap",
  "CapabilityMap",
  "IntelligenceSnapshot",
  "FindingReport",
  "FindingFilterReport",
  "FindingFilterHealthReport",
  "FindingLifecycleReport",
  "IssueAdjudicationReport",
  "CoherencyDelta",
];

test("rekon refresh on a clean fixture creates expected artifact families and passes", async () => {
  await withFixture(exampleRoot, async (root) => {
    const result = JSON.parse(
      runCli(["refresh", "--root", root, "--json"]).stdout,
    );

    assert.equal(result.status, "passed");
    assert.deepEqual(result.missing, []);
    assert.ok(result.validation);
    assert.equal(result.validation.valid, true);
    assert.deepEqual(result.validation.issues, []);
    assert.ok(result.freshness);
    assert.ok(Array.isArray(result.freshness.latestMajor));

    const allFresh = result.freshness.latestMajor.every((entry) => entry.status === "fresh");
    assert.ok(allFresh, `expected all latest-major artifacts fresh, got ${JSON.stringify(result.freshness.latestMajor)}`);

    const indexedTypes = new Set(result.artifacts.map((ref) => ref.type));
    for (const type of REQUIRED_ARTIFACT_TYPES) {
      assert.ok(indexedTypes.has(type), `refresh result should include ${type}`);
    }

    // Publication of kind architecture-summary must exist in the store.
    const list = JSON.parse(
      runCli(["artifacts", "list", "--root", root, "--type", "Publication", "--json"]).stdout,
    );
    assert.ok(list.artifacts.length > 0, "expected a Publication artifact");
  });
});

test("rekon refresh runs steps in the documented order", async () => {
  await withFixture(exampleRoot, async (root) => {
    const result = JSON.parse(
      runCli(["refresh", "--root", root, "--json"]).stdout,
    );

    const stepIds = result.steps.map((step) => step.id);
    assert.deepEqual(stepIds, EXPECTED_STEP_ORDER);
  });
});

test("rekon refresh writes an architecture-summary Publication by default", async () => {
  await withFixture(exampleRoot, async (root) => {
    runCli(["refresh", "--root", root, "--json"]);
    const list = JSON.parse(
      runCli(["artifacts", "list", "--root", root, "--type", "Publication", "--json"]).stdout,
    );

    let found = false;
    for (const ref of list.artifacts) {
      const publication = JSON.parse(await readFile(join(root, ref.path), "utf8"));
      if (publication.kind === "architecture-summary") {
        found = true;
        break;
      }
    }
    assert.ok(found, "expected an architecture-summary Publication");
  });
});

test("rekon refresh status is passed when latest major artifacts are fresh", async () => {
  await withFixture(exampleRoot, async (root) => {
    const result = JSON.parse(
      runCli(["refresh", "--root", root, "--json"]).stdout,
    );

    assert.equal(result.status, "passed");
    assert.equal(result.freshness.latestMajor.every((entry) => entry.status === "fresh"), true);
  });
});

test("rekon refresh fails on malformed config", async () => {
  await withFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    await writeFile(join(root, ".rekon", "config.json"), "not valid json", "utf8");

    const proc = spawnSync(process.execPath, [cliPath, "refresh", "--root", root, "--json"], {
      cwd: repoRoot,
      encoding: "utf8",
    });

    assert.notEqual(proc.status, 0);
    const output = JSON.parse(proc.stdout);
    assert.equal(output.status, "failed");

    const configStep = output.steps.find((step) => step.id === "config.validate");
    assert.ok(configStep);
    assert.equal(configStep.status, "failed");

    // No lifecycle steps should run after a config failure.
    const ranLifecycle = output.steps.some((step) =>
      ["observe", "project", "snapshot", "evaluate"].includes(step.id) && step.status !== "skipped",
    );
    assert.ok(!ranLifecycle, "lifecycle steps must not run after config validation fails");
  });
});

test("rekon refresh --skip-publish does not write a new architecture-summary and records skipped step", async () => {
  await withFixture(exampleRoot, async (root) => {
    const before = JSON.parse(
      runCli(["artifacts", "list", "--root", root, "--type", "Publication", "--json"]).stdout,
    );
    assert.equal(before.artifacts.length, 0);

    const result = JSON.parse(
      runCli(["refresh", "--root", root, "--skip-publish", "--json"]).stdout,
    );

    const publishStep = result.steps.find((step) => step.id === "publish.architecture");
    assert.ok(publishStep);
    assert.equal(publishStep.status, "skipped");
    assert.match(publishStep.message ?? "", /skip-publish/);

    const after = JSON.parse(
      runCli(["artifacts", "list", "--root", root, "--type", "Publication", "--json"]).stdout,
    );
    assert.equal(after.artifacts.length, 0, "no Publication should be written when --skip-publish is set");

    // skip-publish should still leave validation fresh.
    assert.equal(result.validation.valid, true);
    // The latest-major check should exclude Publication when publish is skipped.
    const types = new Set(result.freshness.latestMajor.map((entry) => entry.type));
    assert.ok(!types.has("Publication"), "latest-major freshness should ignore Publication when --skip-publish is set");
    assert.equal(result.status, "passed");
  });
});

test("rekon refresh --skip-freshness skips the freshness step but still validates", async () => {
  await withFixture(exampleRoot, async (root) => {
    const result = JSON.parse(
      runCli(["refresh", "--root", root, "--skip-freshness", "--json"]).stdout,
    );

    const freshnessStep = result.steps.find((step) => step.id === "artifacts.freshness");
    assert.ok(freshnessStep);
    assert.equal(freshnessStep.status, "skipped");
    assert.equal(result.freshness, undefined);

    assert.ok(result.validation);
    assert.equal(result.validation.valid, true);
    assert.equal(result.status, "passed");
  });
});

test("rekon refresh twice does not fail because historical FindingReports remain", async () => {
  await withFixture(exampleRoot, async (root) => {
    const first = JSON.parse(
      runCli(["refresh", "--root", root, "--json"]).stdout,
    );
    assert.equal(first.status, "passed");

    await new Promise((resolveTimer) => setTimeout(resolveTimer, 5));

    const second = JSON.parse(
      runCli(["refresh", "--root", root, "--json"]).stdout,
    );

    assert.equal(
      second.status,
      "passed",
      "second refresh must pass even though prior FindingReports remain in the store",
    );
    const allFresh = second.freshness.latestMajor.every((entry) => entry.status === "fresh");
    assert.ok(allFresh, "every latest-major artifact must be fresh after a repeat refresh");
  });
});

test("a new intent ignores stale publication and proof lineage from a prior intent", async () => {
  await withFixture(exampleRoot, async (root) => {
    const firstRefresh = JSON.parse(runCli(["refresh", "--root", root, "--json"]).stdout);
    assert.equal(firstRefresh.status, "passed");

    const firstIntent = JSON.parse(runCli([
      "intent", "work-order",
      "--root", root,
      "--path", "src/index.ts",
      "--goal", "Complete the first intent",
      "--json",
    ]).stdout);
    const firstPlan = firstIntent.artifacts.find((ref) => ref.type === "VerificationPlan");
    assert.ok(firstPlan);

    const partialResult = JSON.parse(runCli([
      "verify", "record",
      "--root", root,
      "--plan", firstPlan.id,
      "--result-json", JSON.stringify({
        commands: [{ command: "npm run typecheck", status: "passed", exitCode: 0 }],
        recordedBy: "contract-test",
      }),
      "--json",
    ]).stdout);
    assert.equal(partialResult.status, "partial");

    const proof = JSON.parse(runCli(["publish", "proof", "--root", root, "--json"]).stdout);
    const historicalProofRef = proof.artifacts.find((ref) => ref.type === "Publication");
    assert.ok(historicalProofRef);

    const firstContext = JSON.parse(
      runCli(["intent", "context", "prepare", "--root", root, "--json"]).stdout,
    );
    assert.ok(firstContext.steps.every((step) => step.status === "passed"));
    const historicalStepGraphRef = runCli([
      "artifacts", "latest",
      "--root", root,
      "--type", "StepCapabilityGraph",
      "--id-only",
    ]).stdout.trim();
    assert.match(historicalStepGraphRef, /^StepCapabilityGraph:step-capability-graph-/);
    const historicalStepGraphId = historicalStepGraphRef.slice("StepCapabilityGraph:".length);

    const sourcePath = join(root, "src", "index.ts");
    const sourceBeforeSecondIntent = await readFile(sourcePath, "utf8");
    await writeFile(
      sourcePath,
      `${sourceBeforeSecondIntent}\nexport const secondIntentMarker = true;\n`,
      "utf8",
    );

    const secondRefresh = JSON.parse(runCli(["refresh", "--root", root, "--json"]).stdout);
    assert.equal(secondRefresh.status, "passed");
    assert.equal(secondRefresh.freshness.status, "fresh");
    const publicationFreshness = secondRefresh.freshness.latestMajor.filter(
      (entry) => entry.type === "Publication",
    );
    assert.equal(publicationFreshness.length, 1);
    assert.match(publicationFreshness[0].id, /^architecture-summary-/);
    assert.notEqual(publicationFreshness[0].id, historicalProofRef.id);

    const secondSnapshotRef = secondRefresh.artifacts.find(
      (ref) => ref.type === "IntelligenceSnapshot",
    );
    assert.ok(secondSnapshotRef);
    const secondSnapshot = JSON.parse(runCli([
      "artifacts", "show", `IntelligenceSnapshot:${secondSnapshotRef.id}`,
      "--root", root,
      "--json",
    ]).stdout).artifact;
    assert.equal(
      secondSnapshot.header.inputRefs.some(
        (ref) => ref.type === "StepCapabilityGraph" && ref.id === historicalStepGraphId,
      ),
      false,
      "the second scan snapshot must not inherit the prior intent context graph",
    );

    const publications = JSON.parse(
      runCli(["artifacts", "list", "--root", root, "--type", "Publication", "--json"]).stdout,
    );
    assert.ok(
      publications.artifacts.some((ref) => ref.id === historicalProofRef.id),
      "the prior publication should remain inspectable",
    );
    const historicalProof = JSON.parse(
      runCli([
        "artifacts", "show", `Publication:${historicalProofRef.id}`,
        "--root", root,
        "--json",
      ]).stdout,
    );
    assert.equal(historicalProof.artifact.kind, "proof-report");

    runCli(["intent", "context", "prepare", "--root", root, "--json"]);
    const secondIntent = JSON.parse(runCli([
      "intent", "assess",
      "--root", root,
      "--goal", "Start an unrelated second intent",
      "--kind", "feature",
      "--path", "src/index.ts",
      "--json",
    ]).stdout);
    const secondAssessment = JSON.parse(runCli([
      "artifacts", "show", `IntentAssessmentReport:${secondIntent.artifact.id}`,
      "--root", root,
      "--json",
    ]).stdout).artifact;
    const unrelatedTypes = new Set([
      "Publication",
      "WorkOrder",
      "VerificationPlan",
      "VerificationRun",
      "VerificationResult",
    ]);
    assert.equal(
      secondAssessment.header.inputRefs.some((ref) => unrelatedTypes.has(ref.type)),
      false,
      "the second assessment must not inherit first-intent proof lineage",
    );
    assert.ok(secondAssessment.warnings.some((warning) => warning.id === "proof:missing"));
    assert.equal(secondAssessment.warnings.some((warning) => warning.id === "proof:incomplete"), false);

    const secondPreparedOutput = JSON.parse(runCli([
      "intent", "prepare",
      "--root", root,
      "--assessment", `IntentAssessmentReport:${secondIntent.artifact.id}`,
      "--json",
    ]).stdout);
    const secondPrepared = JSON.parse(runCli([
      "artifacts", "show", `PreparedIntentPlan:${secondPreparedOutput.artifact.id}`,
      "--root", root,
      "--json",
    ]).stdout).artifact;
    assert.equal(
      secondPrepared.header.inputRefs.some((ref) => ref.type === "VerificationResult"),
      false,
      "prepare must not select unrelated historical proof",
    );
    assert.deepEqual(secondPrepared.approval.proof.verification.verificationRefs, []);

    const explicitIntent = JSON.parse(runCli([
      "intent", "assess",
      "--root", root,
      "--goal", "Reassess the explicitly selected first intent proof",
      "--kind", "feature",
      "--path", "src/index.ts",
      "--verification-result", partialResult.artifact.id,
      "--verification-plan", firstPlan.id,
      "--json",
    ]).stdout);
    const explicitAssessment = JSON.parse(runCli([
      "artifacts", "show", `IntentAssessmentReport:${explicitIntent.artifact.id}`,
      "--root", root,
      "--json",
    ]).stdout).artifact;
    assert.ok(explicitAssessment.header.inputRefs.some(
      (ref) => ref.type === "VerificationResult" && ref.id === partialResult.artifact.id,
    ));
    assert.ok(explicitAssessment.header.inputRefs.some(
      (ref) => ref.type === "VerificationPlan" && ref.id === firstPlan.id,
    ));
    assert.ok(explicitAssessment.warnings.some((warning) => warning.id === "proof:incomplete"));

    const explicitPreparedOutput = JSON.parse(runCli([
      "intent", "prepare",
      "--root", root,
      "--assessment", `IntentAssessmentReport:${explicitIntent.artifact.id}`,
      "--json",
    ]).stdout);
    const explicitPrepared = JSON.parse(runCli([
      "artifacts", "show", `PreparedIntentPlan:${explicitPreparedOutput.artifact.id}`,
      "--root", root,
      "--json",
    ]).stdout).artifact;
    assert.ok(explicitPrepared.header.inputRefs.some(
      (ref) => ref.type === "VerificationResult" && ref.id === partialResult.artifact.id,
    ));
    assert.ok(explicitPrepared.approval.proof.verification.verificationRefs.some(
      (ref) => ref.type === "VerificationResult" && ref.id === partialResult.artifact.id,
    ));
  });
});

test("existing rekon commands still work after refresh", async () => {
  await withFixture(exampleRoot, async (root) => {
    runCli(["refresh", "--root", root, "--json"]);

    const validateOutput = JSON.parse(
      runCli(["artifacts", "validate", "--root", root, "--json"]).stdout,
    );
    assert.equal(validateOutput.valid, true);

    const publish = JSON.parse(
      runCli(["publish", "agents", "--root", root, "--json"]).stdout,
    );
    assert.ok(publish.artifacts.some((ref) => ref.type === "Publication"));
  });
});

test("rekon refresh records artifact refs on each producing step", async () => {
  await withFixture(exampleRoot, async (root) => {
    const result = JSON.parse(
      runCli(["refresh", "--root", root, "--json"]).stdout,
    );

    const stepsWithRefs = result.steps.filter((step) =>
      [
        "observe",
        "project",
        "snapshot",
        "evaluate",
        "findings.filter",
        "findings.filter-health",
        "findings.lifecycle",
        "issues.adjudicate",
        "coherency.delta",
        "publish.architecture",
      ].includes(step.id),
    );

    for (const step of stepsWithRefs) {
      assert.equal(step.status, "passed", `${step.id} should pass`);
      assert.ok(
        Array.isArray(step.artifacts) && step.artifacts.length > 0,
        `${step.id} should record artifact refs`,
      );
    }
  });
});

test("rekon refresh against the import-boundary fixture surfaces active findings", async (t) => {
  if (!(await packageInstalled(ruleackPackageName))) {
    t.skip(
      `External rule pack not installed. Run 'npm install ./examples/import-boundary-rule-pack --no-save' before this test.`,
    );
    return;
  }

  await withFixture(importBoundaryFixture, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    const configPath = join(root, ".rekon", "config.json");
    const config = JSON.parse(await readFile(configPath, "utf8"));
    config.capabilities = [...config.capabilities, { package: ruleackPackageName }];
    config.permissions = {
      ...(config.permissions ?? {}),
      [ruleackPackageName]: ["read:artifacts", "write:artifacts"],
    };
    await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

    const result = JSON.parse(
      runCli(["refresh", "--root", root, "--json"]).stdout,
    );

    assert.equal(result.status, "passed");

    const coherencyStep = result.steps.find((step) => step.id === "coherency.delta");
    assert.ok(coherencyStep);
    assert.ok(coherencyStep.summary);
    assert.ok((coherencyStep.summary.active ?? 0) > 0, "expected active findings under the import-boundary fixture");

    const list = JSON.parse(
      runCli(["artifacts", "list", "--root", root, "--type", "Publication", "--json"]).stdout,
    );
    let foundArchitectureSummary = false;
    for (const ref of list.artifacts) {
      const pub = JSON.parse(await readFile(join(root, ref.path), "utf8"));
      if (pub.kind === "architecture-summary") {
        foundArchitectureSummary = true;
        // After issues.adjudicate joined the refresh pipeline,
        // CoherencyDelta is built from IssueAdjudicationReport and
        // the Coherency Summary section labels its unit as
        // "Active governed issue groups". Either label is valid;
        // when no adjudication report exists, the legacy
        // "Active findings:" label is still used.
        assert.ok(
          pub.content.includes("Active findings:") ||
            pub.content.includes("Active governed issue groups:"),
          "expected architecture summary to surface active counts under either governed-group or raw-finding label",
        );
        break;
      }
    }
    assert.ok(foundArchitectureSummary);
  });
});

// ---------- helpers ----------

async function packageInstalled(name) {
  try {
    await readdir(join(repoRoot, "node_modules", name));
    return true;
  } catch {
    return false;
  }
}

async function withFixture(sourceRoot, callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-refresh-"));

  try {
    await cp(sourceRoot, root, {
      recursive: true,
      filter(source) {
        return !relative(sourceRoot, source).split(/[\\/]/).includes(".rekon");
      },
    });
    await callback(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function runCli(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}
