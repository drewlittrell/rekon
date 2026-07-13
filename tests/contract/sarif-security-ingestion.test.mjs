import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { parseSarifSecurityReport } from "../../packages/capability-model/dist/index.js";
import { validateSecurityScanReport } from "../../packages/kernel-repo-model/dist/index.js";

const workspaceRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(workspaceRoot, "packages/cli/dist/index.js");

test("SARIF 2.1 normalization retains scanner provenance and separates security results from generic lint", () => {
  const first = parseSarifSecurityReport(parserInput(sarifFixture()));
  assert.equal(first.valid, true);
  assert.equal(validateSecurityScanReport(first.report).ok, true);
  assert.equal(first.report.summary.results, 2);
  assert.equal(first.report.header.supersession.key, "security-scan:CodeQL");
  assert.equal(first.report.summary.securityResults, 1);
  const security = first.report.runs[0].results.find((result) => result.ruleId === "js/sql-injection");
  const lint = first.report.runs[0].results.find((result) => result.ruleId === "no-unused-vars");
  assert.equal(security.securityRelevant, true);
  assert.equal(security.severity, "critical");
  assert.equal(security.precision, "high");
  assert.deepEqual(security.locations, [{ path: "src/query.ts", startLine: 8, startColumn: 3 }]);
  assert.equal(security.message.includes("secret-value"), false);
  assert.match(security.fingerprints["primaryLocationLineHash/v1"], /^sha256:[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(first.report).includes("stable-security-fingerprint"), false);
  assert.equal(security.helpUri, "https://example.invalid/rules/sql-injection");
  assert.equal(lint.securityRelevant, false);
  assert.equal(first.issues.some((issue) => issue.code === "sarif.location_outside_repo"), true);

  const changedMessage = sarifFixture();
  changedMessage.runs[0].results[0].message.text = "Message wording changed.";
  const second = parseSarifSecurityReport(parserInput(changedMessage));
  const changedSecurity = second.report.runs[0].results.find((result) => result.ruleId === "js/sql-injection");
  assert.equal(changedSecurity.id, security.id, "partial fingerprint must own stable identity");
});

test("SARIF normalization rejects unsupported versions", () => {
  const sarif = sarifFixture();
  sarif.version = "2.0.0";
  const result = parseSarifSecurityReport(parserInput(sarif));
  assert.equal(result.valid, false);
  assert.equal(result.issues[0].code, "sarif.unsupported_version");
});

test("CLI ingests repository-local SARIF and policy emits a non-promoted security risk", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-sarif-security-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "package.json"), JSON.stringify({ name: "sarif-fixture", type: "module" }));
    await writeFile(join(root, "src/query.ts"), "export const query = (value: string) => `SELECT ${value}`;\n");
    await writeFile(join(root, "scan.sarif"), JSON.stringify(sarifFixture(), null, 2));

    runCli(root, ["init"]);
    runCli(root, ["observe", "--json"]);
    const ingest = runCli(root, ["security", "ingest", "--sarif", "scan.sarif", "--json"]);
    assert.equal(ingest.status, 0, ingest.stderr);
    assert.equal(JSON.parse(ingest.stdout).summary.securityResults, 1);
    runCli(root, ["evaluate", "--json"]);

    const index = JSON.parse(await readFile(join(root, ".rekon/registry/artifacts.index.json"), "utf8"));
    const report = await latestArtifact(root, index, "SecurityScanReport");
    const assessments = await latestArtifact(root, index, "AssessmentReport");
    const findings = await latestArtifact(root, index, "FindingReport");
    assert.equal(report.header.inputRefs[0].type, "EvidenceGraph");
    assert.equal(report.summary.results, 2);
    assert.equal(report.summary.securityResults, 1);
    const securityRisks = assessments.assessments.filter((assessment) => assessment.ruleId === "security.scannerResult");
    assert.equal(securityRisks.length, 1);
    assert.equal(securityRisks[0].kind, "risk");
    assert.equal(securityRisks[0].impact, "critical");
    assert.equal(securityRisks[0].confidence.verification, "corroborated");
    assert.equal(securityRisks[0].details.reproducible, false);
    assert.equal(findings.findings.some((finding) => finding.ruleId === "security.scannerResult"), false);

    await writeFile(join(root, "src/query.ts"), "export const query = (value: string) => value;\n");
    runCli(root, ["observe", "--json"]);
    runCli(root, ["evaluate", "--json"]);
    const updatedIndex = JSON.parse(await readFile(join(root, ".rekon/registry/artifacts.index.json"), "utf8"));
    const staleAssessments = await latestArtifact(root, updatedIndex, "AssessmentReport");
    assert.equal(staleAssessments.assessments.some((assessment) => assessment.ruleId === "security.scannerResult"), false);

    const validation = runCli(root, ["artifacts", "validate", "--json"]);
    assert.equal(validation.status, 0, validation.stderr);
    assert.equal(JSON.parse(validation.stdout).valid, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function parserInput(sarif) {
  return {
    sarif,
    repoRoot: "/repo",
    sourcePath: "scan.sarif",
    sourceDigest: "a".repeat(64),
    header: {
      artifactType: "SecurityScanReport",
      artifactId: "security-scan-report-test",
      schemaVersion: "0.1.0",
      generatedAt: "2026-07-11T00:00:00.000Z",
      subject: { repoId: "repo" },
      producer: { id: "test", version: "1.0.0" },
      inputRefs: [{ type: "EvidenceGraph", id: "evidence", schemaVersion: "0.1.0" }],
      freshness: { status: "fresh" },
      provenance: { confidence: 1 },
    },
  };
}

function sarifFixture() {
  return {
    version: "2.1.0",
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    runs: [{
      tool: {
        driver: {
          name: "CodeQL",
          semanticVersion: "2.20.0",
          rules: [
            {
              id: "js/sql-injection",
              helpUri: "https://user:password@example.invalid/rules/sql-injection?token=secret#fragment",
              properties: {
                tags: ["security", "external/cwe/cwe-089"],
                "security-severity": "9.1",
                precision: "high",
              },
            },
            { id: "no-unused-vars", properties: { tags: ["maintainability"] } },
          ],
        },
      },
      invocations: [{ executionSuccessful: true }],
      results: [
        {
          ruleId: "js/sql-injection",
          ruleIndex: 0,
          level: "error",
          message: { text: "api_key=secret-value User input reaches a SQL query." },
          partialFingerprints: { "primaryLocationLineHash/v1": "stable-security-fingerprint" },
          locations: [
            { physicalLocation: { artifactLocation: { uri: "src/query.ts" }, region: { startLine: 8, startColumn: 3 } } },
            { physicalLocation: { artifactLocation: { uri: "../outside/secret.ts" }, region: { startLine: 1 } } },
          ],
        },
        {
          ruleId: "no-unused-vars",
          ruleIndex: 1,
          level: "warning",
          message: { text: "Variable is unused." },
          locations: [{ physicalLocation: { artifactLocation: { uri: "src/query.ts" }, region: { startLine: 1 } } }],
        },
      ],
    }],
  };
}

function runCli(root, args) {
  return spawnSync(process.execPath, [cliPath, ...args, "--root", root], {
    cwd: workspaceRoot,
    encoding: "utf8",
  });
}

async function latestArtifact(root, index, type) {
  const entries = index.filter((entry) => entry.type === type);
  assert.ok(entries.length > 0, `missing ${type}`);
  const latest = entries.sort((left, right) => right.writtenAt.localeCompare(left.writtenAt))[0];
  return JSON.parse(await readFile(join(root, latest.path), "utf8"));
}
