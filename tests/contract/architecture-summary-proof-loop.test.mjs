import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";
import { digestJson } from "../../packages/kernel-artifacts/dist/index.js";
import { createFindingReport } from "../../packages/kernel-findings/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");
const importBoundaryFixture = join(
  repoRoot,
  "examples/import-boundary-rule-pack/fixtures/bad-imports",
);
const ruleackPackageName = "rekon-capability-import-boundaries-example";

const PROOF_LOOP_SECTIONS = [
  "## Work Orders",
  "## Reconciliation Plans",
  "## Verification Status",
  "## Proof Loop",
];

test("architecture summary always includes the four proof-loop sections", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    const publication = await readArchitectureSummary(root);

    for (const section of PROOF_LOOP_SECTIONS) {
      assert.ok(
        publication.content.includes(section),
        `architecture summary must include section: ${section}`,
      );
    }
  });
});

test("architecture summary recommends rekon verify record when no VerificationResult exists", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli(["observe", "--root", root, "--json"]);
    runCli(["project", "--root", root, "--json"]);
    runCli(["snapshot", "--root", root, "--json"]);
    runCli(["evaluate", "--root", root, "--json"]);
    runCli(["findings", "lifecycle", "--root", root, "--json"]);
    runCli(["coherency", "delta", "--root", root, "--json"]);
    runCli([
      "intent",
      "work-order",
      "--root",
      root,
      "--path",
      "src/index.ts",
      "--goal",
      "modify bootstrap",
      "--json",
    ]);
    runCli(["reconcile", "suggest", "--root", root, "--json"]);

    const publication = await readArchitectureSummary(root);

    assert.ok(
      publication.content.includes("No VerificationResult found"),
      "verification status section must call out missing VerificationResult",
    );
    assert.ok(
      publication.content.includes("Suggested next command: `rekon verify record`"),
      "proof loop next command should point at rekon verify record",
    );
  });
});

test("architecture summary suggests rekon coherency delta when CoherencyDelta is missing", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    const publication = await readArchitectureSummary(root);

    assert.ok(
      publication.content.includes("Suggested next command: `rekon coherency delta`"),
      "proof loop next command should point at rekon coherency delta when missing",
    );
    assert.ok(
      publication.content.includes("CoherencyDelta: missing"),
      "proof loop should call out missing CoherencyDelta",
    );
  });
});

test("architecture summary surfaces partial verification status and not-run count", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli(["observe", "--root", root, "--json"]);
    runCli(["project", "--root", root, "--json"]);
    runCli(["snapshot", "--root", root, "--json"]);
    runCli(["evaluate", "--root", root, "--json"]);
    runCli(["findings", "lifecycle", "--root", root, "--json"]);
    runCli(["coherency", "delta", "--root", root, "--json"]);
    runCli([
      "intent",
      "work-order",
      "--root",
      root,
      "--path",
      "src/index.ts",
      "--goal",
      "modify bootstrap",
      "--json",
    ]);
    runCli(["reconcile", "suggest", "--root", root, "--json"]);
    runCli([
      "verify",
      "record",
      "--root",
      root,
      "--result-json",
      JSON.stringify({
        recordedBy: "operator",
        commands: [{ command: "npm run typecheck", status: "passed", exitCode: 0 }],
      }),
      "--json",
    ]);

    const publication = await readArchitectureSummary(root);

    assert.ok(
      /\| partial \| 1 \| 0 \| 0 \| 2 \|/.test(publication.content),
      "verification status table must show partial status with not-run count of 2",
    );
    assert.ok(
      publication.content.includes("Verification is not complete."),
      "publication must call out incomplete verification",
    );
    assert.ok(
      publication.content.includes(
        "Suggested next command: address failures and re-run `rekon verify record`",
      ),
      "proof loop must suggest addressing failures after partial verification",
    );
  });
});

test("architecture summary surfaces failed verification status", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli([
      "intent",
      "work-order",
      "--root",
      root,
      "--path",
      "src/index.ts",
      "--goal",
      "modify bootstrap",
      "--json",
    ]);
    runCli([
      "verify",
      "record",
      "--root",
      root,
      "--result-json",
      JSON.stringify({
        recordedBy: "operator",
        commands: [
          { command: "npm run typecheck", status: "passed", exitCode: 0 },
          { command: "npm run test", status: "failed", exitCode: 1, notes: "regression" },
          { command: "npm run build", status: "passed", exitCode: 0 },
        ],
      }),
      "--json",
    ]);

    const publication = await readArchitectureSummary(root);

    assert.ok(
      /\| failed \| 2 \| 1 \|/.test(publication.content),
      "verification status table must show failed overall status",
    );
    assert.ok(
      publication.content.includes("Verification is not complete."),
      "publication must call out incomplete verification on failure",
    );
  });
});

test("architecture summary header.inputRefs include the new proof-loop artifacts when present", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli([
      "intent",
      "work-order",
      "--root",
      root,
      "--path",
      "src/index.ts",
      "--goal",
      "modify bootstrap",
      "--json",
    ]);
    runCli(["reconcile", "suggest", "--root", root, "--json"]);
    runCli([
      "verify",
      "record",
      "--root",
      root,
      "--result-json",
      JSON.stringify({
        commands: [{ command: "npm run typecheck", status: "passed", exitCode: 0 }],
      }),
      "--json",
    ]);

    const publication = await readArchitectureSummary(root);
    const inputTypes = publication.header.inputRefs.map((ref) => ref.type);

    assert.ok(inputTypes.includes("WorkOrder"), "should cite WorkOrder");
    assert.ok(inputTypes.includes("ReconciliationPlan"), "should cite ReconciliationPlan");
    assert.ok(inputTypes.includes("VerificationPlan"), "should cite VerificationPlan");
    assert.ok(inputTypes.includes("VerificationResult"), "should cite VerificationResult");
  });
});

test("architecture summary work orders table distinguishes coherency-delta and resolver sources", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli(["observe", "--root", root, "--json"]);
    runCli(["project", "--root", root, "--json"]);

    await writeSyntheticFindingReport(root, [
      { id: "ws-finding-1", severity: "high", files: ["src/index.ts"] },
    ]);
    runCli(["findings", "lifecycle", "--root", root, "--json"]);
    runCli(["coherency", "delta", "--root", root, "--json"]);
    runCli(["intent", "remediation", "--root", root, "--json"]);
    runCli([
      "intent",
      "work-order",
      "--root",
      root,
      "--path",
      "src/index.ts",
      "--goal",
      "modify bootstrap",
      "--json",
    ]);

    const publication = await readArchitectureSummary(root);

    const workOrdersStart = publication.content.indexOf("## Work Orders");
    const workOrdersEnd = publication.content.indexOf("## Reconciliation Plans");
    const workOrdersSection = publication.content.slice(workOrdersStart, workOrdersEnd);

    assert.ok(
      workOrdersSection.includes("| coherency-delta |"),
      "should include a coherency-delta work order row",
    );
    assert.ok(
      workOrdersSection.includes("| resolver |"),
      "should include a resolver work order row",
    );
  });
});

test("architecture summary calls out stale verification when latest plan differs", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli([
      "intent",
      "work-order",
      "--root",
      root,
      "--path",
      "src/index.ts",
      "--goal",
      "modify bootstrap",
      "--json",
    ]);
    runCli([
      "verify",
      "record",
      "--root",
      root,
      "--result-json",
      JSON.stringify({
        commands: [{ command: "npm run typecheck", status: "passed", exitCode: 0 }],
      }),
      "--json",
    ]);

    // Generate a newer VerificationPlan so the existing result is stale.
    await new Promise((resolveTimer) => setTimeout(resolveTimer, 5));
    runCli([
      "intent",
      "work-order",
      "--root",
      root,
      "--path",
      "src/index.ts",
      "--goal",
      "modify bootstrap again",
      "--json",
    ]);

    const publication = await readArchitectureSummary(root);

    assert.ok(
      publication.content.includes("VerificationResult may be stale; latest VerificationPlan differs."),
      "publication must call out that the latest VerificationResult references an older plan",
    );
  });
});

test("architecture summary freshness goes stale after a newer VerificationResult", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli([
      "intent",
      "work-order",
      "--root",
      root,
      "--path",
      "src/index.ts",
      "--goal",
      "modify bootstrap",
      "--json",
    ]);
    runCli([
      "verify",
      "record",
      "--root",
      root,
      "--result-json",
      JSON.stringify({
        commands: [{ command: "npm run typecheck", status: "passed", exitCode: 0 }],
      }),
      "--json",
    ]);

    const publishResult = JSON.parse(
      runCli(["publish", "architecture", "--root", root, "--json"]).stdout,
    );
    const publicationRef = publishResult.artifacts.find((ref) => ref.type === "Publication");
    const publicationId = publicationRef.id;

    await new Promise((resolveTimer) => setTimeout(resolveTimer, 5));
    runCli([
      "verify",
      "record",
      "--root",
      root,
      "--result-json",
      JSON.stringify({
        commands: [{ command: "npm run typecheck", status: "passed", exitCode: 0 }],
      }),
      "--json",
    ]);

    const freshness = JSON.parse(
      runCli([
        "artifacts",
        "freshness",
        "--root",
        root,
        "--type",
        "Publication",
        "--id",
        publicationId,
        "--json",
      ]).stdout,
    );

    const entry = freshness.artifacts.find((candidate) => candidate.id === publicationId);
    assert.ok(entry);
    assert.equal(entry.status, "stale");
    assert.ok(
      entry.issues.some(
        (issue) =>
          issue.code === "newer-input-exists" && issue.inputType === "VerificationResult",
      ),
      "expected stale issue citing newer VerificationResult",
    );
  });
});

test("existing publish agents flow still emits a Publication", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    const result = JSON.parse(
      runCli(["publish", "agents", "--root", root, "--json"]).stdout,
    );

    assert.ok(Array.isArray(result.artifacts));
    assert.ok(
      result.artifacts.some((ref) => ref.type === "Publication"),
      "publish agents must still emit a Publication",
    );
  });
});

test("import-boundary fixture: architecture summary surfaces reconciliation classification rows", async (t) => {
  if (!(await packageInstalled(ruleackPackageName))) {
    t.skip(
      `External rule pack not installed. Run 'npm install ./examples/import-boundary-rule-pack --no-save' before this test.`,
    );
    return;
  }

  await withCliFixture(importBoundaryFixture, async (root) => {
    runCli(["init", "--root", root, "--json"]);

    const configPath = join(root, ".rekon", "config.json");
    const config = JSON.parse(await readFile(configPath, "utf8"));
    config.capabilities = [
      ...config.capabilities,
      { package: ruleackPackageName },
    ];
    config.permissions = {
      ...(config.permissions ?? {}),
      [ruleackPackageName]: ["read:artifacts", "write:artifacts"],
    };
    await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

    runCli(["observe", "--root", root, "--json"]);
    runCli(["project", "--root", root, "--json"]);
    runCli([
      "evaluate",
      "run",
      "import-boundaries.evaluate",
      "--root",
      root,
      "--json",
    ]);
    runCli(["findings", "lifecycle", "--root", root, "--json"]);
    runCli(["coherency", "delta", "--root", root, "--json"]);
    runCli(["intent", "remediation", "--root", root, "--json"]);
    runCli(["reconcile", "suggest", "--root", root, "--json"]);

    const publication = await readArchitectureSummary(root);
    const reconciliationStart = publication.content.indexOf("## Reconciliation Plans");
    const reconciliationEnd = publication.content.indexOf("## Verification Status");
    const reconciliationSection = publication.content.slice(reconciliationStart, reconciliationEnd);

    assert.ok(
      reconciliationSection.includes("safe_import_rewrite"),
      "should include safe_import_rewrite operation row",
    );
    assert.ok(
      reconciliationSection.includes("source-write-deferred"),
      "should include source-write-deferred class",
    );
    assert.ok(
      reconciliationSection.includes("write:source"),
      "should include write:source permission",
    );
  });
});

// ---------- helpers ----------

async function readArchitectureSummary(root) {
  const result = JSON.parse(
    runCli(["publish", "architecture", "--root", root, "--json"]).stdout,
  );
  const publicationRef = result.artifacts.find((ref) => ref.type === "Publication");
  assert.ok(publicationRef, "publish architecture must emit a Publication");

  return JSON.parse(await readFile(join(root, publicationRef.path), "utf8"));
}

async function packageInstalled(name) {
  try {
    await readdir(join(repoRoot, "node_modules", name));
    return true;
  } catch {
    return false;
  }
}

async function withCliFixture(sourceRoot, callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-proof-loop-"));

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

function header(artifactType, artifactId) {
  return {
    artifactType,
    artifactId,
    schemaVersion: "0.1.0",
    generatedAt: new Date().toISOString(),
    subject: { repoId: "synthetic" },
    producer: { id: "test-harness", version: "0.1.0" },
    inputRefs: [],
    freshness: { status: "fresh" },
  };
}

function finding(id, overrides = {}) {
  return {
    id,
    type: overrides.type ?? "test.example",
    severity: overrides.severity ?? "medium",
    title: overrides.title ?? `Finding ${id}`,
    description: overrides.description ?? `Description for ${id}`,
    subjects: overrides.subjects ?? [id],
    files: overrides.files ?? ["src/index.ts"],
    ruleId: overrides.ruleId,
    suggestedAction: overrides.suggestedAction,
    status: overrides.status,
  };
}

async function writeSyntheticFindingReport(root, findings) {
  const reportPath = join(root, ".rekon", "artifacts", "findings", "FindingReport-synth.json");
  const indexPath = join(root, ".rekon", "registry", "artifacts.index.json");
  const index = JSON.parse(await readFile(indexPath, "utf8"));
  const evidenceEntry = index.find((entry) => entry.type === "EvidenceGraph");
  const inputRefs = evidenceEntry
    ? [
      {
        type: "EvidenceGraph",
        id: evidenceEntry.id,
        schemaVersion: evidenceEntry.schemaVersion,
      },
    ]
    : [];

  const report = createFindingReport({
    header: {
      ...header("FindingReport", `synth-${Date.now()}`),
      inputRefs,
    },
    findings: findings.map((entry) => finding(entry.id, entry)),
  });

  await writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");

  index.push({
    type: "FindingReport",
    id: report.header.artifactId,
    schemaVersion: "0.1.0",
    artifactType: "FindingReport",
    artifactId: report.header.artifactId,
    path: relative(root, reportPath),
    digest: digestJson(report),
    writtenAt: new Date().toISOString(),
  });
  await writeFile(indexPath, JSON.stringify(index, null, 2), "utf8");
}
