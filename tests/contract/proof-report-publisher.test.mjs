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

test("publish list includes @rekon/capability-docs.proof-report", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    const result = JSON.parse(
      runCli(["publish", "list", "--root", root, "--json"]).stdout,
    );

    assert.ok(Array.isArray(result.publishers));
    assert.ok(
      result.publishers.some((publisher) => publisher.id === "@rekon/capability-docs.proof-report"),
      "proof-report publisher must appear in publish list",
    );
  });
});

test("rekon publish proof writes a Publication with kind proof-report", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    const result = JSON.parse(
      runCli(["publish", "proof", "--root", root, "--json"]).stdout,
    );

    assert.ok(Array.isArray(result.artifacts));
    const publicationRef = result.artifacts.find((ref) => ref.type === "Publication");
    assert.ok(publicationRef, "publish proof must emit a Publication");

    const publication = JSON.parse(
      await readFile(join(root, publicationRef.path), "utf8"),
    );

    assert.equal(publication.kind, "proof-report");
    assert.equal(publication.format, "markdown");
    assert.equal(publication.title, "Rekon Proof Report");
    assert.equal(typeof publication.content, "string");
    assert.ok(publication.content.includes("# Rekon Proof Report"));
  });
});

test("generic publish run dispatches the proof-report publisher", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    const result = JSON.parse(
      runCli([
        "publish",
        "run",
        "@rekon/capability-docs.proof-report",
        "--root",
        root,
        "--json",
      ]).stdout,
    );

    assert.ok(
      result.artifacts.some((ref) => ref.type === "Publication"),
      "publish run must emit a Publication",
    );
  });
});

test("proof report includes Proof Status, Verification Plan, and Verification Results sections", async () => {
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
        commands: [{ command: "npm run typecheck", status: "passed", exitCode: 0 }],
      }),
      "--json",
    ]);

    const publication = await readProofReport(root);

    for (const section of [
      "## Proof Status",
      "## Work Order",
      "## Verification Plan",
      "## Verification Results",
      "## Failed / Missing Evidence",
      "## Remediation Context",
      "## Reconciliation Context",
      "## Next Recommended Action",
      "## Input Artifacts",
    ]) {
      assert.ok(
        publication.content.includes(section),
        `proof report must include section: ${section}`,
      );
    }
  });
});

test("proof report surfaces failed status visibly", async () => {
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

    const publication = await readProofReport(root);

    assert.ok(/\| failed \| 2 \| 1 \|/.test(publication.content), "failed status row must be present");
    assert.ok(
      publication.content.includes("> Verification is not complete."),
      "publication must call out incomplete verification",
    );
    assert.ok(
      publication.content.includes("Failed: `npm run test`"),
      "failed command must be listed under Failed / Missing Evidence",
    );
    assert.ok(
      publication.content.includes("Fix the failing checks and record a new VerificationResult"),
      "Next Recommended Action must point at fixing failures",
    );
  });
});

test("proof report surfaces partial / not-run status visibly", async () => {
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
        commands: [{ command: "npm run typecheck", status: "passed", exitCode: 0 }],
      }),
      "--json",
    ]);

    const publication = await readProofReport(root);

    assert.ok(/\| partial \| 1 \| 0 \| 0 \| 2 \|/.test(publication.content), "partial status row must be present");
    assert.ok(
      publication.content.includes("> Verification is not complete."),
      "partial must trigger 'not complete' callout",
    );
    assert.ok(
      publication.content.includes("Not-run: `npm run test`"),
      "missing plan commands must be listed as Not-run",
    );
    assert.ok(
      publication.content.includes("Complete the missing checks"),
      "Next Recommended Action must point at completing missing checks",
    );
  });
});

test("proof report says passed does not auto-resolve findings", async () => {
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
          { command: "npm run test", status: "passed", exitCode: 0 },
          { command: "npm run build", status: "passed", exitCode: 0 },
        ],
      }),
      "--json",
    ]);

    const publication = await readProofReport(root);

    assert.ok(
      publication.content.includes(
        "> Verification recorded as passed. This does not automatically resolve findings.",
      ),
      "passed must include the no-auto-resolve callout",
    );
    assert.ok(
      publication.content.includes("Re-run `rekon evaluate`"),
      "Next Recommended Action must point at re-running the loop to confirm",
    );
  });
});

test("proof report header.inputRefs includes VerificationPlan and VerificationResult when present", async () => {
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

    const publication = await readProofReport(root);
    const inputTypes = publication.header.inputRefs.map((ref) => ref.type);

    assert.ok(inputTypes.includes("VerificationPlan"), "should cite VerificationPlan");
    assert.ok(inputTypes.includes("VerificationResult"), "should cite VerificationResult");
    assert.ok(inputTypes.includes("WorkOrder"), "should cite the WorkOrder behind the plan");
  });
});

test("proof report recommends rekon verify record when no VerificationResult exists", async () => {
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

    const publication = await readProofReport(root);

    assert.ok(
      publication.content.includes("No VerificationResult found"),
      "proof status section must call out missing VerificationResult",
    );
    assert.ok(
      publication.content.includes("Run `rekon verify record` to capture proof"),
      "Next Recommended Action must point at rekon verify record",
    );
  });
});

test("proof report says No VerificationPlan when none exists", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);

    const publication = await readProofReport(root);

    assert.ok(
      publication.content.includes("No VerificationPlan found"),
      "publication must say no plan exists",
    );
    assert.ok(
      publication.content.includes("`rekon intent work-order`")
        || publication.content.includes("`rekon intent remediation`"),
      "publication must recommend running intent commands",
    );
  });
});

test("existing publish agents and publish architecture still work", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    const agentsResult = JSON.parse(
      runCli(["publish", "agents", "--root", root, "--json"]).stdout,
    );
    assert.ok(agentsResult.artifacts.some((ref) => ref.type === "Publication"));

    const archResult = JSON.parse(
      runCli(["publish", "architecture", "--root", root, "--json"]).stdout,
    );
    assert.ok(archResult.artifacts.some((ref) => ref.type === "Publication"));
  });
});

test("artifacts freshness marks older proof report stale after newer VerificationResult", async () => {
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
      JSON.stringify({ commands: [{ command: "npm run typecheck", status: "passed", exitCode: 0 }] }),
      "--json",
    ]);
    const firstPublish = JSON.parse(
      runCli(["publish", "proof", "--root", root, "--json"]).stdout,
    );
    const publicationId = firstPublish.artifacts.find((ref) => ref.type === "Publication").id;

    await new Promise((resolveTimer) => setTimeout(resolveTimer, 5));
    runCli([
      "verify",
      "record",
      "--root",
      root,
      "--result-json",
      JSON.stringify({ commands: [{ command: "npm run typecheck", status: "passed", exitCode: 0 }] }),
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
        (issue) => issue.code === "newer-input-exists" && issue.inputType === "VerificationResult",
      ),
      "expected stale issue citing newer VerificationResult",
    );
  });
});

test("import-boundary fixture: proof report surfaces remediation context", async (t) => {
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
    config.capabilities = [...config.capabilities, { package: ruleackPackageName }];
    config.permissions = {
      ...(config.permissions ?? {}),
      [ruleackPackageName]: ["read:artifacts", "write:artifacts"],
    };
    await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

    runCli(["observe", "--root", root, "--json"]);
    runCli(["project", "--root", root, "--json"]);
    runCli(["evaluate", "run", "import-boundaries.evaluate", "--root", root, "--json"]);
    runCli(["findings", "lifecycle", "--root", root, "--json"]);
    runCli(["coherency", "delta", "--root", root, "--json"]);
    runCli(["intent", "remediation", "--root", root, "--json"]);
    runCli(["reconcile", "suggest", "--root", root, "--json"]);

    const publication = await readProofReport(root);

    const remediationStart = publication.content.indexOf("## Remediation Context");
    const remediationEnd = publication.content.indexOf("## Reconciliation Context");
    const remediationSection = publication.content.slice(remediationStart, remediationEnd);
    assert.ok(remediationSection.includes("import_boundary"), "remediation context should list import findings");
    assert.ok(remediationSection.includes("| p0 |") || remediationSection.includes("| p1 |"));

    const reconciliationStart = publication.content.indexOf("## Reconciliation Context");
    const reconciliationEnd = publication.content.indexOf("## Next Recommended Action");
    const reconciliationSection = publication.content.slice(reconciliationStart, reconciliationEnd);
    assert.ok(reconciliationSection.includes("safe_import_rewrite"));
    assert.ok(reconciliationSection.includes("source-write-deferred"));
  });
});

// ---------- helpers ----------

async function readProofReport(root) {
  const result = JSON.parse(
    runCli(["publish", "proof", "--root", root, "--json"]).stdout,
  );
  const publicationRef = result.artifacts.find((ref) => ref.type === "Publication");
  assert.ok(publicationRef, "publish proof must emit a Publication");

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
  const root = await mkdtemp(join(tmpdir(), "rekon-proof-report-"));

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
