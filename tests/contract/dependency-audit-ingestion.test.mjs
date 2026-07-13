import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  parseNpmAuditReport,
  parseOsvScannerReport,
  parsePnpmAuditReport,
  parseYarnAuditReport,
} from "../../packages/capability-model/dist/index.js";
import { validateDependencyAuditReport } from "../../packages/kernel-repo-model/dist/index.js";

const workspaceRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(workspaceRoot, "packages/cli/dist/index.js");

test("npm audit v2 normalization joins advisories to installed versions and scopes", () => {
  const parsed = parseNpmAuditReport(parserInput(auditFixture(), lockFixture()));

  assert.equal(parsed.valid, true);
  assert.equal(validateDependencyAuditReport(parsed.report).ok, true);
  assert.equal(parsed.report.summary.vulnerabilities, 1);
  assert.equal(parsed.report.header.supersession.key, "dependency-audit:npm");
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

test("pnpm audit normalization preserves logical scoped-package paths and native scope", () => {
  const input = adapterInput("pnpm-audit.json");
  const first = parsePnpmAuditReport({ ...input, audit: pnpmAuditFixture() });
  const changedMetadata = pnpmAuditFixture();
  changedMetadata.metadata = { generatedAt: "later" };
  const second = parsePnpmAuditReport({ ...input, audit: changedMetadata });

  assert.equal(first.valid, true);
  assert.equal(validateDependencyAuditReport(first.report).ok, true);
  assert.equal(first.report.source.format, "pnpm-audit-v11");
  assert.equal(first.report.tool.name, "pnpm");
  assert.equal(first.report.header.supersession.key, "dependency-audit:pnpm");
  assert.equal(first.report.vulnerabilities[0].packageName, "@scope/example");
  assert.deepEqual(first.report.vulnerabilities[0].paths[0].dependencyPath, ["fixture", "@scope/example"]);
  assert.equal(first.report.vulnerabilities[0].paths[0].installedVersion, "1.2.3");
  assert.equal(first.report.vulnerabilities[0].paths[0].scope, "production");
  assert.equal(first.report.vulnerabilities[0].fixAvailable, true);
  assert.equal(first.report.vulnerabilities[0].id, second.report.vulnerabilities[0].id);
  assert.equal(JSON.stringify(first.report).includes("raw-secret-value"), false);
});

test("Yarn audit normalization consumes native NDJSON without inventing dependency scope", () => {
  const row = {
    value: "lodash",
    children: {
      ID: 1106913,
      Issue: "Command Injection in lodash",
      URL: "https://github.com/advisories/GHSA-example",
      Severity: "high",
      "Vulnerable Versions": "<4.17.21",
      "Tree Versions": ["4.17.20"],
      Dependents: ["fixture@workspace:.", "tools@workspace:packages/tools"],
      Private: "raw-secret-value",
    },
  };
  const parsed = parseYarnAuditReport({ ...adapterInput("yarn-audit.ndjson"), ndjson: `${JSON.stringify(row)}\n` });

  assert.equal(parsed.valid, true);
  assert.equal(validateDependencyAuditReport(parsed.report).ok, true);
  assert.equal(parsed.report.source.format, "yarn-audit-ndjson");
  assert.equal(parsed.report.status.complete, true);
  assert.equal(parsed.report.header.supersession.key, "dependency-audit:yarn");
  assert.equal(parsed.report.vulnerabilities[0].paths.length, 2);
  assert.equal(parsed.report.vulnerabilities[0].paths.every((path) => path.scope === "unknown"), true);
  assert.deepEqual(parsed.report.vulnerabilities[0].paths.map((path) => path.dependencyPath[0]), ["fixture@workspace:.", "tools@workspace:packages/tools"]);
  assert.equal(JSON.stringify(parsed.report).includes("raw-secret-value"), false);

  const malformed = parseYarnAuditReport({ ...adapterInput("yarn-audit.ndjson"), ndjson: "{not-json}\n" });
  assert.equal(malformed.valid, false);
  assert.equal(malformed.issues[0].code, "yarn_audit.invalid_ndjson");
});

test("OSV-Scanner normalization keeps advisory evidence and rejects outside-root source paths", () => {
  const root = "/tmp/rekon-osv-fixture";
  const first = parseOsvScannerReport({ ...adapterInput("osv.json"), report: osvFixture("package-lock.json"), repoRoot: root });
  const outside = parseOsvScannerReport({ ...adapterInput("osv.json"), report: osvFixture("../outside/package-lock.json"), repoRoot: root });

  assert.equal(first.valid, true);
  assert.equal(validateDependencyAuditReport(first.report).ok, true);
  assert.equal(first.report.source.format, "osv-scanner-json");
  assert.equal(first.report.tool.name, "osv-scanner");
  assert.equal(first.report.header.supersession.key, "dependency-audit:osv-scanner");
  assert.equal(first.report.vulnerabilities[0].severity, "high");
  assert.equal(first.report.vulnerabilities[0].paths[0].nodePath, "package-lock.json");
  assert.equal(first.report.vulnerabilities[0].fixVersion, "4.17.21");
  assert.equal(first.report.vulnerabilities[0].advisories[0].url, "https://github.com/advisories/GHSA-example");
  assert.equal(first.report.vulnerabilities[0].advisories[0].cvss.vector, "CVSS:3.1/AV:N/AC:L");
  assert.equal(outside.valid, true);
  assert.equal(outside.report.status.complete, false);
  assert.equal(outside.report.vulnerabilities[0].paths[0].nodePath, undefined);
  assert.equal(outside.issues.some((issue) => issue.code === "osv_scanner.source_outside_repo"), true);
});

test("CLI ingests pnpm, Yarn, and OSV dependency evidence", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-dependency-adapters-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "package.json"), JSON.stringify({ name: "adapter-fixture", type: "module" }));
    await writeFile(join(root, "src/index.ts"), "export const value = 1;\n");
    await writeFile(join(root, "pnpm-audit.json"), JSON.stringify(pnpmAuditFixture()));
    await writeFile(join(root, "yarn-audit.ndjson"), `${JSON.stringify(yarnAuditFixture())}\n`);
    await writeFile(join(root, "osv.json"), JSON.stringify(osvFixture("package.json")));

    runCli(root, ["init"]);
    runCli(root, ["observe", "--json"]);
    for (const [flag, file] of [["--pnpm-audit", "pnpm-audit.json"], ["--yarn-audit", "yarn-audit.ndjson"], ["--osv", "osv.json"]]) {
      const result = runCli(root, ["security", "ingest", flag, file, "--json"]);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(JSON.parse(result.stdout).summary.vulnerabilities, 1);
    }

    const index = JSON.parse(await readFile(join(root, ".rekon/registry/artifacts.index.json"), "utf8"));
    assert.equal(index.filter((entry) => entry.type === "DependencyAuditReport").length, 3);
    const validation = runCli(root, ["artifacts", "validate", "--json"]);
    assert.equal(validation.status, 0, validation.stderr);
    assert.equal(JSON.parse(validation.stdout).valid, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
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

function adapterInput(sourcePath) {
  return {
    sourcePath,
    sourceDigest: "c".repeat(64),
    header: parserInput({}).header,
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

function pnpmAuditFixture() {
  return {
    advisories: {
      "109": {
        findings: [{ version: "1.2.3", paths: ["fixture>@scope/example"], dev: false, optional: false, bundled: false }],
        id: 109,
        title: "Example pnpm advisory",
        module_name: "@scope/example",
        vulnerable_versions: "<1.2.4",
        patched_versions: ">=1.2.4",
        severity: "high",
        cwe: ["CWE-79"],
        github_advisory_id: "GHSA-pnpm-example",
        url: "https://github.com/advisories/GHSA-pnpm-example",
        privatePayload: "raw-secret-value",
      },
    },
    metadata: { vulnerabilities: { high: 1 }, privatePayload: "raw-secret-value" },
  };
}

function yarnAuditFixture() {
  return {
    value: "lodash",
    children: {
      ID: 1106913,
      Issue: "Command Injection in lodash",
      URL: "https://github.com/advisories/GHSA-example",
      Severity: "high",
      "Vulnerable Versions": "<4.17.21",
      "Tree Versions": ["4.17.20"],
      Dependents: ["fixture@workspace:."],
    },
  };
}

function osvFixture(sourcePath) {
  return {
    results: [{
      source: { path: sourcePath, type: "lockfile" },
      packages: [{
        package: { name: "lodash", version: "4.17.20", ecosystem: "npm" },
        vulnerabilities: [{
          id: "GHSA-example",
          summary: "Command Injection in lodash",
          database_specific: { severity: "HIGH", cwe_ids: ["CWE-77"] },
          severity: [{ type: "CVSS_V3", score: "CVSS:3.1/AV:N/AC:L" }],
          affected: [{ ranges: [{ type: "SEMVER", events: [{ introduced: "0" }, { fixed: "4.17.21" }] }] }],
          references: [{ type: "ADVISORY", url: "https://github.com/advisories/GHSA-example" }],
          privatePayload: "raw-secret-value",
        }],
      }],
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
