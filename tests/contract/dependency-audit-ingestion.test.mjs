import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { parseNpmAuditReport } from "../../packages/capability-model/dist/index.js";
import { validateDependencyAuditReport } from "../../packages/kernel-repo-model/dist/index.js";

const workspaceRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(workspaceRoot, "packages/cli/dist/index.js");

test("npm audit v2 normalization joins advisories to installed versions and scopes", () => {
  const parsed = parseNpmAuditReport(parserInput(auditFixture(), lockFixture()));

  assert.equal(parsed.valid, true);
  assert.equal(validateDependencyAuditReport(parsed.report).ok, true);
  assert.equal(parsed.report.summary.vulnerabilities, 1);
  assert.equal(parsed.report.summary.production, 1);
  const vulnerability = parsed.report.vulnerabilities[0];
  assert.equal(vulnerability.packageName, "lodash");
  assert.equal(vulnerability.severity, "high");
  assert.equal(vulnerability.affectedRange, "<4.17.21");
  assert.equal(vulnerability.paths[0].installedVersion, "4.17.20");
  assert.equal(vulnerability.paths[0].scope, "production");
  assert.deepEqual(vulnerability.paths[0].dependencyPath, ["lodash"]);
  assert.equal(vulnerability.advisories[0].id, "1106913");
  assert.equal(JSON.stringify(parsed.report).includes("raw-secret-value"), false);

  const inconsistent = structuredClone(parsed.report);
  inconsistent.summary.production = 99;
  assert.equal(validateDependencyAuditReport(inconsistent).ok, false);
});

test("npm audit normalization reports partial evidence when no lockfile is supplied", () => {
  const parsed = parseNpmAuditReport(parserInput(auditFixture()));

  assert.equal(parsed.valid, true);
  assert.equal(parsed.report.status.complete, false);
  assert.equal(parsed.report.vulnerabilities[0].paths[0].scope, "unknown");
  assert.equal(parsed.issues.some((issue) => issue.code === "npm_audit.lockfile_missing"), true);
});

test("npm audit normalization rejects outside-root node paths and keeps stable advisory identity", () => {
  const firstAudit = auditFixture();
  firstAudit.vulnerabilities.lodash.nodes.push("../outside/node_modules/lodash");
  const first = parseNpmAuditReport(parserInput(firstAudit, lockFixture()));
  const secondAudit = auditFixture();
  secondAudit.metadata.generatedAt = "later";
  const second = parseNpmAuditReport(parserInput(secondAudit, lockFixture()));

  assert.deepEqual(first.report.vulnerabilities[0].paths.map((entry) => entry.nodePath), ["node_modules/lodash"]);
  assert.equal(first.report.vulnerabilities[0].id, second.report.vulnerabilities[0].id);
});

test("npm audit normalization rejects unsupported report versions", () => {
  const audit = auditFixture();
  audit.auditReportVersion = 1;
  const parsed = parseNpmAuditReport(parserInput(audit, lockFixture()));

  assert.equal(parsed.valid, false);
  assert.equal(parsed.issues[0].code, "npm_audit.unsupported_version");
});

test("CLI ingests npm audit evidence and policy emits an assessment, never a finding", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-npm-audit-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "package.json"), JSON.stringify({ name: "audit-fixture", type: "module" }));
    await writeFile(join(root, "package-lock.json"), JSON.stringify(lockFixture(), null, 2));
    await writeFile(join(root, "audit.json"), JSON.stringify(auditFixture(), null, 2));
    await writeFile(join(root, "src/index.ts"), "export const value = 1;\n");

    runCli(root, ["init"]);
    runCli(root, ["observe", "--json"]);
    const ingest = runCli(root, ["security", "ingest", "--npm-audit", "audit.json", "--json"]);
    assert.equal(ingest.status, 0, ingest.stderr);
    assert.equal(JSON.parse(ingest.stdout).summary.vulnerabilities, 1);
    runCli(root, ["evaluate", "--json"]);

    const index = JSON.parse(await readFile(join(root, ".rekon/registry/artifacts.index.json"), "utf8"));
    const audit = await latestArtifact(root, index, "DependencyAuditReport");
    const assessments = await latestArtifact(root, index, "AssessmentReport");
    const findings = await latestArtifact(root, index, "FindingReport");
    assert.equal(audit.header.inputRefs[0].type, "EvidenceGraph");
    assert.equal(audit.vulnerabilities[0].paths[0].installedVersion, "4.17.20");
    const risks = assessments.assessments.filter((assessment) => assessment.ruleId === "security.dependencyVulnerability");
    assert.equal(risks.length, 1);
    assert.equal(risks[0].kind, "risk");
    assert.equal(risks[0].confidence.verification, "corroborated");
    assert.equal(risks[0].details.production, true);
    assert.equal(findings.findings.some((finding) => finding.ruleId === "security.dependencyVulnerability"), false);

    await writeFile(join(root, "src/index.ts"), "export const value = 2;\n");
    runCli(root, ["observe", "--json"]);
    runCli(root, ["evaluate", "--json"]);
    const updated = JSON.parse(await readFile(join(root, ".rekon/registry/artifacts.index.json"), "utf8"));
    const staleAssessments = await latestArtifact(root, updated, "AssessmentReport");
    assert.equal(staleAssessments.assessments.some((assessment) => assessment.ruleId === "security.dependencyVulnerability"), false);

    const validation = runCli(root, ["artifacts", "validate", "--json"]);
    assert.equal(validation.status, 0, validation.stderr);
    assert.equal(JSON.parse(validation.stdout).valid, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("CLI requires exactly one security input format", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-security-input-"));
  try {
    await writeFile(join(root, "package.json"), JSON.stringify({ name: "fixture" }));
    runCli(root, ["init"]);
    runCli(root, ["observe", "--json"]);
    const result = runCli(root, ["security", "ingest", "--json"]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /exactly one/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function parserInput(audit, packageLock) {
  return {
    audit,
    packageLock,
    sourcePath: "audit.json",
    sourceDigest: "a".repeat(64),
    ...(packageLock ? { lockfilePath: "package-lock.json", lockfileDigest: "b".repeat(64) } : {}),
    header: {
      artifactType: "DependencyAuditReport",
      artifactId: "dependency-audit-report-test",
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

function auditFixture() {
  return {
    auditReportVersion: 2,
    privatePayload: "raw-secret-value",
    vulnerabilities: {
      lodash: {
        name: "lodash",
        severity: "high",
        isDirect: true,
        via: [{
          source: 1106913,
          name: "lodash",
          dependency: "lodash",
          title: "Command Injection in lodash",
          url: "https://github.com/advisories/GHSA-example",
          severity: "high",
          cwe: ["CWE-77"],
          cvss: { score: 7.2, vectorString: "CVSS:3.1/AV:N/AC:L" },
          privatePayload: "raw-secret-value",
        }],
        effects: [],
        range: "<4.17.21",
        nodes: ["node_modules/lodash"],
        fixAvailable: { name: "lodash", version: "4.17.21", isSemVerMajor: false },
      },
    },
    metadata: { vulnerabilities: { high: 1, total: 1 } },
  };
}

function lockFixture() {
  return {
    name: "audit-fixture",
    lockfileVersion: 3,
    packages: {
      "": { name: "audit-fixture", dependencies: { lodash: "4.17.20" } },
      "node_modules/lodash": { version: "4.17.20", resolved: "https://registry.npmjs.org/lodash/-/lodash-4.17.20.tgz" },
    },
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
