import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";
import {
  computeFilterPolicyStaleness,
  loadCurrentFindingFilterPolicies,
} from "../../packages/capability-docs/dist/index.js";
import {
  fingerprintFindingFilterPolicies,
} from "../../packages/kernel-findings/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- pure-helper tests ----------

test("fingerprintFindingFilterPolicies is deterministic for the same input", () => {
  const rules = [
    rule({ id: "gen", pathPattern: "src/generated/**", reason: "generated-file" }),
    rule({ id: "vendor", pathPattern: "vendor/**", reason: "external-file" }),
  ];
  const fp1 = fingerprintFindingFilterPolicies(rules);
  const fp2 = fingerprintFindingFilterPolicies(rules);
  assert.equal(fp1.digest, fp2.digest);
  assert.equal(fp1.ruleCount, 2);
  assert.deepEqual(fp1.ruleIds, ["gen", "vendor"]);
});

test("fingerprintFindingFilterPolicies is order-sensitive", () => {
  const a = rule({ id: "a", pathPattern: "src/generated/**", reason: "generated-file" });
  const b = rule({ id: "b", pathPattern: "vendor/**", reason: "external-file" });
  const fpAB = fingerprintFindingFilterPolicies([a, b]);
  const fpBA = fingerprintFindingFilterPolicies([b, a]);
  assert.notEqual(fpAB.digest, fpBA.digest, "rule order must affect the digest");
  assert.deepEqual(fpAB.ruleIds, ["a", "b"]);
  assert.deepEqual(fpBA.ruleIds, ["b", "a"]);
});

test("fingerprintFindingFilterPolicies: empty array produces a stable empty fingerprint", () => {
  const fp = fingerprintFindingFilterPolicies([]);
  assert.equal(fp.ruleCount, 0);
  assert.deepEqual(fp.ruleIds, []);
  assert.ok(typeof fp.digest === "string" && fp.digest.length > 0);
});

test("fingerprintFindingFilterPolicies: ignores undefined matcher fields", () => {
  const sparse = rule({ id: "x", reason: "policy-exception", pathPattern: "src/x/**" });
  const verbose = rule({
    id: "x",
    reason: "policy-exception",
    pathPattern: "src/x/**",
    confidence: undefined,
    type: undefined,
    ruleId: undefined,
  });
  assert.equal(
    fingerprintFindingFilterPolicies([sparse]).digest,
    fingerprintFindingFilterPolicies([verbose]).digest,
  );
});

test("computeFilterPolicyStaleness: missing filter report yields missing status", () => {
  const result = computeFilterPolicyStaleness({
    currentFingerprint: fingerprintFindingFilterPolicies([]),
    filterReport: undefined,
  });
  assert.equal(result.status, "missing");
  assert.ok(result.warnings.length > 0);
  assert.equal(result.recommendedCommand, "rekon refresh");
});

test("computeFilterPolicyStaleness: filter report without fingerprint yields unknown", () => {
  const result = computeFilterPolicyStaleness({
    currentFingerprint: fingerprintFindingFilterPolicies([]),
    filterReport: makeFilterReportWithoutFingerprint(),
  });
  assert.equal(result.status, "unknown");
});

test("computeFilterPolicyStaleness: matching digest yields fresh", () => {
  const fp = fingerprintFindingFilterPolicies([
    rule({ id: "gen", pathPattern: "src/generated/**", reason: "generated-file" }),
  ]);
  const result = computeFilterPolicyStaleness({
    currentFingerprint: fp,
    filterReport: makeFilterReportWithFingerprint(fp),
  });
  assert.equal(result.status, "fresh");
  assert.deepEqual(result.warnings, []);
});

test("computeFilterPolicyStaleness: divergent digest yields stale + recommend refresh", () => {
  const fpA = fingerprintFindingFilterPolicies([
    rule({ id: "gen", pathPattern: "src/generated/**", reason: "generated-file" }),
  ]);
  const fpB = fingerprintFindingFilterPolicies([
    rule({ id: "gen2", pathPattern: "src/built/**", reason: "generated-file" }),
  ]);
  const result = computeFilterPolicyStaleness({
    currentFingerprint: fpA,
    filterReport: makeFilterReportWithFingerprint(fpB),
  });
  assert.equal(result.status, "stale");
  assert.equal(result.recommendedCommand, "rekon refresh");
  assert.ok(result.warnings.some((entry) => entry.includes("findingFilters")));
});

// ---------- end-to-end CLI tests ----------

test("FindingFilterReport written by `rekon refresh` includes policyFingerprint", async () => {
  await withFreshWorkspace(async ({ root }) => {
    runCli(["refresh", "--root", root, "--json"]);
    const report = await readLatestFilterReport(root);
    assert.ok(report, "expected at least one FindingFilterReport after refresh");
    assert.ok(report.policyFingerprint, "FindingFilterReport must record policyFingerprint");
    assert.equal(typeof report.policyFingerprint.digest, "string");
    assert.equal(Number.isInteger(report.policyFingerprint.ruleCount), true);
    assert.ok(Array.isArray(report.policyFingerprint.ruleIds));
  });
});

test("loadCurrentFindingFilterPolicies returns the empty-policy fingerprint for an empty config", async () => {
  await withFreshWorkspace(async ({ root }) => {
    const loaded = await loadCurrentFindingFilterPolicies(root);
    assert.ok(loaded, "loader should succeed against an initialized workspace");
    assert.deepEqual(loaded.rules, []);
    assert.equal(loaded.fingerprint.ruleCount, 0);
  });
});

test("loadCurrentFindingFilterPolicies fingerprints the actual findingFilters in config", async () => {
  await withFreshWorkspace(async ({ root }) => {
    const configPath = join(root, ".rekon", "config.json");
    const config = JSON.parse(await readFile(configPath, "utf8"));
    config.findingFilters = [
      {
        id: "gen",
        reason: "generated-file",
        evidence: "Generated src",
        pathPattern: "src/generated/**",
      },
    ];
    await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

    const loaded = await loadCurrentFindingFilterPolicies(root);
    assert.equal(loaded.rules.length, 1);
    assert.equal(loaded.rules[0].id, "gen");
    assert.equal(loaded.fingerprint.ruleCount, 1);
    assert.deepEqual(loaded.fingerprint.ruleIds, ["gen"]);
  });
});

test("rekon findings filter-policy apply --dry-run includes projectedPolicyFingerprint and does not mutate config", async () => {
  await withSuggestionFixture(async ({ root, suggestionId, rule: r }) => {
    const configBefore = await readFile(join(root, ".rekon", "config.json"), "utf8");
    const result = JSON.parse(
      runCli([
        "findings",
        "filter-policy",
        "apply",
        suggestionId,
        "--dry-run",
        "--root",
        root,
        "--json",
      ]).stdout,
    );
    assert.equal(result.applied, false);
    assert.equal(result.dryRun, true);
    assert.ok(result.projectedPolicyFingerprint);
    assert.equal(result.projectedPolicyFingerprint.ruleCount, 1);
    assert.deepEqual(result.projectedPolicyFingerprint.ruleIds, [r.id]);
    assert.ok(result.currentPolicyFingerprint);
    assert.equal(result.currentPolicyFingerprint.ruleCount, 0);

    const configAfter = await readFile(join(root, ".rekon", "config.json"), "utf8");
    assert.equal(configAfter, configBefore, "dry-run must not mutate config");
  });
});

test("rekon findings filter-policy apply returns policyFingerprint after writing", async () => {
  await withSuggestionFixture(async ({ root, suggestionId, rule: r }) => {
    const result = JSON.parse(
      runCli([
        "findings",
        "filter-policy",
        "apply",
        suggestionId,
        "--root",
        root,
        "--json",
      ]).stdout,
    );
    assert.equal(result.applied, true);
    assert.ok(result.policyFingerprint);
    assert.equal(result.policyFingerprint.ruleCount, 1);
    assert.deepEqual(result.policyFingerprint.ruleIds, [r.id]);
  });
});

test("architecture summary reports policy fresh after rekon refresh", async () => {
  await withFreshWorkspace(async ({ root }) => {
    runCli(["refresh", "--root", root, "--json"]);
    runCli(["publish", "architecture", "--root", root, "--json"]);
    const body = await readLatestPublicationBody(root, "architecture-summary");
    assert.ok(body.includes("## Finding Filter Policy Freshness"));
    assert.ok(body.includes("- Status: `fresh`"));
    assert.ok(body.includes("Finding filter policy fingerprint matches"));
  });
});

test("architecture summary warns stale after `.rekon/config.json` findingFilters changes", async () => {
  await withFreshWorkspace(async ({ root }) => {
    runCli(["refresh", "--root", root, "--json"]);
    // Mutate config AFTER refresh wrote the FindingFilterReport.
    const configPath = join(root, ".rekon", "config.json");
    const config = JSON.parse(await readFile(configPath, "utf8"));
    config.findingFilters = [
      {
        id: "post-refresh",
        reason: "policy-exception",
        evidence: "Added after refresh; should mark publication stale.",
        pathPattern: "src/specific/**",
      },
    ];
    await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

    runCli(["publish", "architecture", "--root", root, "--json"]);
    const body = await readLatestPublicationBody(root, "architecture-summary");
    assert.ok(body.includes("- Status: `stale`"));
    assert.ok(body.includes("findingFilters` changed after the latest FindingFilterReport"));
    assert.ok(body.includes("rekon refresh"));
  });
});

test("agent contract warns stale after findingFilters change + adds Do Not Do reminder", async () => {
  await withFreshWorkspace(async ({ root }) => {
    runCli(["refresh", "--root", root, "--json"]);
    const configPath = join(root, ".rekon", "config.json");
    const config = JSON.parse(await readFile(configPath, "utf8"));
    config.findingFilters = [
      {
        id: "post-refresh-agent",
        reason: "policy-exception",
        evidence: "Added after refresh for agent contract test.",
        pathPattern: "src/specific/**",
      },
    ];
    await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

    runCli(["publish", "agent-contract", "--root", root, "--json"]);
    const body = await readLatestPublicationBody(root, "agent-contract");
    assert.ok(body.includes("### Finding Filter Policy Freshness"));
    assert.ok(body.includes("- Status: `stale`"));
    assert.ok(body.includes("Do not rely on active governance until `rekon refresh`"));
    assert.ok(
      body.includes("Do not rely on active issue / coherency counts after `.rekon/config.json`"),
      "agent contract Do Not Do block must include the new policy-changed reminder",
    );
  });
});

test("rekon refresh after a config change clears the stale warning", async () => {
  await withFreshWorkspace(async ({ root }) => {
    runCli(["refresh", "--root", root, "--json"]);
    const configPath = join(root, ".rekon", "config.json");
    const config = JSON.parse(await readFile(configPath, "utf8"));
    config.findingFilters = [
      {
        id: "post-refresh-clear",
        reason: "policy-exception",
        evidence: "Will be picked up by the second refresh.",
        pathPattern: "src/specific/**",
      },
    ];
    await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

    runCli(["publish", "architecture", "--root", root, "--json"]);
    let body = await readLatestPublicationBody(root, "architecture-summary");
    assert.ok(body.includes("- Status: `stale`"), "expected stale before second refresh");

    runCli(["refresh", "--root", root, "--json"]);
    runCli(["publish", "architecture", "--root", root, "--json"]);
    body = await readLatestPublicationBody(root, "architecture-summary");
    assert.ok(body.includes("- Status: `fresh`"), "expected fresh after second refresh");
    assert.ok(!body.includes("- Status: `stale`"), "stale warning must disappear after refresh");
  });
});

test("raw FindingReport is not mutated by filter-policy apply or freshness checks", async () => {
  await withSuggestionFixture(async ({ root, suggestionId }) => {
    const reportPath = await locateLatestArtifact(root, "FindingReport");
    const before = await readFile(reportPath, "utf8");
    runCli([
      "findings",
      "filter-policy",
      "apply",
      suggestionId,
      "--root",
      root,
      "--json",
    ]);
    runCli(["publish", "architecture", "--root", root, "--json"]);
    const after = await readFile(reportPath, "utf8");
    assert.equal(after, before, "FindingReport must remain byte-identical");
  });
});

test("rekon artifacts validate stays clean after refresh + publish + freshness rendering", async () => {
  await withFreshWorkspace(async ({ root }) => {
    runCli(["refresh", "--root", root, "--json"]);
    runCli(["publish", "architecture", "--root", root, "--json"]);
    runCli(["publish", "agent-contract", "--root", root, "--json"]);
    const validate = JSON.parse(
      runCli(["artifacts", "validate", "--root", root, "--json"]).stdout,
    );
    assert.equal(validate.valid, true);
    assert.deepEqual(validate.issues ?? [], []);
  });
});

// ---------- helpers ----------

function rule(overrides = {}) {
  return {
    id: overrides.id ?? "rule-id",
    reason: overrides.reason ?? "policy-exception",
    evidence: overrides.evidence ?? "synthetic",
    pathPattern: overrides.pathPattern,
    type: overrides.type,
    ruleId: overrides.ruleId,
    severity: overrides.severity,
    titleIncludes: overrides.titleIncludes,
    descriptionIncludes: overrides.descriptionIncludes,
    confidence: overrides.confidence,
  };
}

function makeFilterReportWithoutFingerprint() {
  return {
    header: {
      artifactType: "FindingFilterReport",
      artifactId: "synthetic-no-fp",
      schemaVersion: "0.1.0",
      generatedAt: new Date().toISOString(),
      subject: { repoId: "synthetic" },
      producer: { id: "test", version: "0.1.0" },
      inputRefs: [],
      freshness: { status: "fresh" },
    },
    summary: {
      totalFiltered: 0,
      kept: 0,
      byReason: {},
      byConfidence: {},
      byType: {},
      bySeverity: {},
    },
    keptFindings: [],
    filteredFindings: [],
  };
}

function makeFilterReportWithFingerprint(fingerprint) {
  return {
    ...makeFilterReportWithoutFingerprint(),
    policyFingerprint: fingerprint,
  };
}

async function withFreshWorkspace(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-filter-policy-freshness-"));
  try {
    await cp(exampleRoot, root, {
      recursive: true,
      filter(source) {
        return !relative(exampleRoot, source).split(/[\\/]/).includes(".rekon");
      },
    });
    runCli(["init", "--root", root, "--json"]);
    await callback({ root });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function withSuggestionFixture(callback) {
  await withFreshWorkspace(async ({ root }) => {
    runCli(["refresh", "--root", root, "--json"]);
    // Manually craft a high-confidence narrow suggestion via the
    // store so the apply path is exercised end-to-end without
    // depending on whatever the example's actual filter run
    // happens to surface.
    const { createLocalArtifactStore } = await import(
      "../../packages/runtime/dist/index.js"
    );
    const { createFindingFilterPolicySuggestionReport } = await import(
      "../../packages/kernel-findings/dist/index.js"
    );
    const store = createLocalArtifactStore(root);
    await store.init();
    const suggestedRule = {
      id: "narrow-gen",
      reason: "generated-file",
      evidence: "Synthetic narrow rule",
      pathPattern: "src/generated/**",
    };
    const suggestionId = "policy-suggestion:freshness-test:narrow-gen";
    const report = createFindingFilterPolicySuggestionReport({
      header: {
        artifactType: "FindingFilterPolicySuggestionReport",
        artifactId: `freshness-suggestions-${Date.now()}`,
        schemaVersion: "0.1.0",
        generatedAt: new Date().toISOString(),
        subject: { repoId: "freshness-test" },
        producer: { id: "test-harness", version: "0.1.0" },
        inputRefs: [],
        freshness: { status: "fresh" },
      },
      suggestions: [
        {
          id: suggestionId,
          reason: "repeated-filtered-path",
          suggestedRule,
          confidence: "high",
          rationale: "Synthetic suggestion for filter-policy freshness tests.",
          affectedFindingIds: ["a"],
          affectedPaths: ["src/generated/a.ts"],
          affectedTypes: ["test.example"],
          sourceFilterReportIds: [],
          evidence: [],
        },
      ],
    });
    await store.write(report, { category: "findings" });
    await callback({ root, suggestionId, rule: suggestedRule });
  });
}

async function readLatestFilterReport(root) {
  const findingsDir = join(root, ".rekon", "artifacts", "findings");
  const files = (await import("node:fs/promises")).readdir(findingsDir);
  const all = await files;
  const filterReports = all.filter((file) => file.startsWith("FindingFilterReport-"));
  if (filterReports.length === 0) return undefined;
  filterReports.sort();
  const latest = filterReports[filterReports.length - 1];
  return JSON.parse(await readFile(join(findingsDir, latest), "utf8"));
}

async function readLatestPublicationBody(root, kindPrefix) {
  const pubDir = join(root, ".rekon", "artifacts", "publications");
  const files = await (await import("node:fs/promises")).readdir(pubDir);
  const matches = files
    .filter((file) => file.startsWith(`Publication-${kindPrefix}-`))
    .sort();
  if (matches.length === 0) throw new Error(`no ${kindPrefix} publication found under ${pubDir}`);
  const latest = matches[matches.length - 1];
  const pub = JSON.parse(await readFile(join(pubDir, latest), "utf8"));
  return pub.content ?? "";
}

async function locateLatestArtifact(root, artifactType) {
  const fs = await import("node:fs/promises");
  const findingsDir = join(root, ".rekon", "artifacts", "findings");
  const files = (await fs.readdir(findingsDir))
    .filter((file) => file.startsWith(`${artifactType}-`))
    .sort();
  if (files.length === 0) {
    throw new Error(`no ${artifactType} artifact under ${findingsDir}`);
  }
  return join(findingsDir, files[files.length - 1]);
}

function runCli(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}
