import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";
import {
  applyFindingFilters,
  buildFindingFilterHealth,
  createFindingFilterReport,
  createFindingReport,
  validateFindingFilterPolicyRules,
} from "../../packages/kernel-findings/dist/index.js";
import {
  buildFindingFilterHealthReport,
  buildFindingFilterReport,
  createLocalArtifactStore,
} from "../../packages/runtime/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- pure-helper tests ----------

test("validateFindingFilterPolicyRules accepts a valid ruleset", () => {
  const { rules, issues } = validateFindingFilterPolicyRules([
    policy({
      id: "generated-src",
      reason: "generated-file",
      evidence: "Generated source is excluded from active governance.",
      pathPattern: "src/generated/**",
      confidence: "high",
    }),
    policy({
      id: "test-import",
      reason: "test-file",
      evidence: "Test fixtures may use parent-relative imports.",
      pathPattern: "tests/**",
      type: "import_boundary.parent_relative_import",
      confidence: "medium",
    }),
  ]);
  assert.deepEqual(issues, []);
  assert.equal(rules.length, 2);
  assert.equal(rules[0].id, "generated-src");
  assert.equal(rules[0].confidence, "high");
  assert.equal(rules[1].type, "import_boundary.parent_relative_import");
});

test("validateFindingFilterPolicyRules rejects duplicate ids", () => {
  const { issues } = validateFindingFilterPolicyRules([
    policy({ id: "dup", reason: "generated-file", evidence: "x", pathPattern: "src/**" }),
    policy({ id: "dup", reason: "test-file", evidence: "y", pathPattern: "tests/**" }),
  ]);
  assert.ok(
    issues.some((entry) => entry.code === "finding-filter-id-duplicate"),
    `expected duplicate id issue, got ${JSON.stringify(issues)}`,
  );
});

test("validateFindingFilterPolicyRules rejects entries with no matcher", () => {
  const { issues } = validateFindingFilterPolicyRules([
    policy({ id: "no-matcher", reason: "other", evidence: "x" }),
  ]);
  assert.ok(
    issues.some((entry) => entry.code === "finding-filter-no-matcher"),
    `expected no-matcher issue, got ${JSON.stringify(issues)}`,
  );
});

test("validateFindingFilterPolicyRules rejects absolute or traversal pathPattern", () => {
  const { issues } = validateFindingFilterPolicyRules([
    policy({ id: "abs", reason: "generated-file", evidence: "x", pathPattern: "/etc/passwd" }),
    policy({ id: "tra", reason: "generated-file", evidence: "x", pathPattern: "../../escape/**" }),
  ]);
  assert.ok(issues.some((entry) => entry.code === "finding-filter-path-pattern-absolute"));
  assert.ok(issues.some((entry) => entry.code === "finding-filter-path-pattern-traversal"));
});

test("validateFindingFilterPolicyRules rejects an unknown reason", () => {
  const { issues } = validateFindingFilterPolicyRules([
    {
      id: "bad-reason",
      reason: "made-up",
      evidence: "x",
      pathPattern: "src/**",
    },
  ]);
  assert.ok(
    issues.some((entry) => entry.code === "finding-filter-reason-invalid"),
    `expected reason-invalid issue, got ${JSON.stringify(issues)}`,
  );
});

test("applyFindingFilters: policy pathPattern filters matching finding with source policy + policyId", () => {
  const policies = [
    policy({ id: "gen-src", reason: "generated-file", evidence: "Generated.", pathPattern: "src/generated/**", confidence: "high" }),
  ];
  const { keptFindings, filteredFindings, policyUsage } = applyFindingFilters({
    findings: [
      finding("gen", { files: ["src/generated/foo.ts"] }),
      finding("ok", { files: ["src/lib/index.ts"] }),
    ],
    policies,
  });
  assert.deepEqual(keptFindings.map((f) => f.id), ["ok"]);
  assert.equal(filteredFindings.length, 1);
  assert.equal(filteredFindings[0].findingId, "gen");
  assert.equal(filteredFindings[0].source, "policy");
  assert.equal(filteredFindings[0].policyId, "gen-src");
  assert.equal(filteredFindings[0].reason, "generated-file");
  assert.equal(filteredFindings[0].evidence, "Generated.");
  assert.equal(filteredFindings[0].confidence, "high");
  assert.deepEqual(policyUsage, { "gen-src": 1 });
});

test("applyFindingFilters: type / ruleId / severity matching works", () => {
  const policies = [
    policy({ id: "ti", reason: "policy-exception", evidence: "type match", type: "policy.target" }),
    policy({ id: "ri", reason: "policy-exception", evidence: "rule match", ruleId: "import-boundaries.X" }),
    policy({ id: "sv", reason: "policy-exception", evidence: "severity match", severity: "low" }),
  ];
  const result = applyFindingFilters({
    findings: [
      finding("a", { type: "policy.target", files: ["src/lib/a.ts"] }),
      finding("b", { type: "other.kind", ruleId: "import-boundaries.X", files: ["src/lib/b.ts"] }),
      finding("c", { type: "other.kind", severity: "low", files: ["src/lib/c.ts"] }),
      finding("d", { type: "other.kind", files: ["src/lib/d.ts"] }),
    ],
    policies,
  });
  const filteredIds = result.filteredFindings.map((entry) => entry.findingId).sort();
  assert.deepEqual(filteredIds, ["a", "b", "c"]);
  assert.deepEqual(result.keptFindings.map((f) => f.id), ["d"]);
  const policyIds = result.filteredFindings.map((entry) => entry.policyId).sort();
  assert.deepEqual(policyIds, ["ri", "sv", "ti"]);
});

test("applyFindingFilters: titleIncludes / descriptionIncludes match case-insensitively", () => {
  const policies = [
    policy({ id: "title", reason: "policy-exception", evidence: "title", titleIncludes: "GENERATED" }),
    policy({ id: "desc", reason: "policy-exception", evidence: "desc", descriptionIncludes: "auto-generated stub" }),
  ];
  const result = applyFindingFilters({
    findings: [
      finding("t", { title: "Generated output detected", files: ["src/lib/x.ts"] }),
      finding("d", { description: "Auto-Generated Stub leaked.", files: ["src/lib/y.ts"] }),
      finding("k", { files: ["src/lib/z.ts"] }),
    ],
    policies,
  });
  const filteredById = new Map(result.filteredFindings.map((entry) => [entry.findingId, entry]));
  assert.ok(filteredById.has("t"));
  assert.ok(filteredById.has("d"));
  assert.equal(filteredById.get("t").policyId, "title");
  assert.equal(filteredById.get("d").policyId, "desc");
  assert.deepEqual(result.keptFindings.map((f) => f.id), ["k"]);
});

test("applyFindingFilters: policy filters run before built-ins (first matching policy wins)", () => {
  const policies = [
    policy({
      id: "skip-test-default",
      reason: "policy-exception",
      evidence: "Override the default test-file filter for this fixture path.",
      pathPattern: "tests/special/**",
      confidence: "medium",
    }),
  ];
  const result = applyFindingFilters({
    findings: [
      finding("special-test", { files: ["tests/special/case.test.ts"] }),
      finding("ordinary-test", { files: ["tests/other.test.ts"] }),
    ],
    policies,
  });
  const byId = new Map(result.filteredFindings.map((entry) => [entry.findingId, entry]));
  assert.equal(byId.get("special-test").policyId, "skip-test-default");
  assert.equal(byId.get("special-test").source, "policy");
  assert.equal(byId.get("special-test").reason, "policy-exception");
  // The ordinary-test path still trips the built-in test-file rule.
  assert.equal(byId.get("ordinary-test").source, "system");
  assert.equal(byId.get("ordinary-test").reason, "test-file");
  assert.equal(byId.get("ordinary-test").policyId, undefined);
});

test("applyFindingFilters: built-in filters still work when no policies are supplied", () => {
  const result = applyFindingFilters({
    findings: [
      finding("gen", { files: ["src/dist/x.ts"] }),
      finding("ok", { files: ["src/lib/x.ts"] }),
    ],
  });
  assert.deepEqual(result.keptFindings.map((f) => f.id), ["ok"]);
  assert.equal(result.filteredFindings.length, 1);
  assert.equal(result.filteredFindings[0].source, "system");
  assert.equal(result.policyUsage, undefined);
});

test("FindingFilterReport.summary.byPolicy reports per-policy counts", () => {
  const policies = [
    policy({ id: "a", reason: "generated-file", evidence: "a", pathPattern: "src/generated/**" }),
    policy({ id: "b", reason: "policy-exception", evidence: "b", pathPattern: "src/legacy/**" }),
  ];
  const { keptFindings, filteredFindings, policyUsage } = applyFindingFilters({
    findings: [
      finding("a1", { files: ["src/generated/x.ts"] }),
      finding("a2", { files: ["src/generated/y.ts"] }),
      finding("b1", { files: ["src/legacy/x.ts"] }),
      finding("ok", { files: ["src/lib/x.ts"] }),
    ],
    policies,
  });
  const report = createFindingFilterReport({
    header: artifactHeader("FindingFilterReport", "fr-byp"),
    keptFindings,
    filteredFindings,
    policyUsage,
  });
  assert.deepEqual(report.summary.byPolicy, { a: 2, b: 1 });
});

test("buildFindingFilterHealth: byPolicy + policy-over-filtering + unused-policy-filter alerts", () => {
  // `huge` is a broad single-segment glob that matches src/*.ts but
  // not nested paths (so `narrow` still gets a chance to fire on
  // src/legacy/x.ts). `unused` never matches anything in the fixture.
  const policies = [
    policy({ id: "huge", reason: "generated-file", evidence: "broad", pathPattern: "src/*.ts" }),
    policy({ id: "narrow", reason: "policy-exception", evidence: "narrow", pathPattern: "src/legacy/**" }),
    policy({ id: "unused", reason: "policy-exception", evidence: "never", pathPattern: "never-matches/**" }),
  ];
  const { keptFindings, filteredFindings, policyUsage } = applyFindingFilters({
    findings: [
      finding("a", { files: ["src/foo.ts"] }),
      finding("b", { files: ["src/bar.ts"] }),
      finding("c", { files: ["src/baz.ts"] }),
      finding("d", { files: ["src/legacy/x.ts"] }),
    ],
    policies,
  });
  const filterReport = createFindingFilterReport({
    header: artifactHeader("FindingFilterReport", "fr-over"),
    keptFindings,
    filteredFindings,
    policyUsage,
  });
  const { summary, alerts } = buildFindingFilterHealth({ filterReport, policies });
  assert.ok(summary.byPolicy);
  assert.equal(summary.byPolicy.huge, 3);
  assert.equal(summary.byPolicy.narrow, 1);
  assert.equal(summary.byPolicy.unused, 0);
  assert.equal(summary.policyFiltered, filteredFindings.length);
  assert.deepEqual(summary.unusedPolicies, ["unused"]);
  assert.ok(alerts.some((alert) => alert.code === "policy-over-filtering"));
  assert.ok(alerts.some((alert) => alert.code === "unused-policy-filter"));
});

test("buildFindingFilterHealth: low-confidence-policy-filter fires for a low-confidence policy hit", () => {
  const policies = [
    policy({
      id: "soft",
      reason: "policy-exception",
      evidence: "soft",
      pathPattern: "src/legacy/**",
      confidence: "low",
    }),
  ];
  const { keptFindings, filteredFindings, policyUsage } = applyFindingFilters({
    findings: [
      finding("legacy", { files: ["src/legacy/x.ts"] }),
      finding("ok", { files: ["src/lib/y.ts"] }),
    ],
    policies,
  });
  const filterReport = createFindingFilterReport({
    header: artifactHeader("FindingFilterReport", "fr-low"),
    keptFindings,
    filteredFindings,
    policyUsage,
  });
  const { alerts } = buildFindingFilterHealth({ filterReport, policies });
  assert.ok(
    alerts.some((alert) => alert.code === "low-confidence-policy-filter"),
    `expected low-confidence-policy-filter alert, got ${JSON.stringify(alerts)}`,
  );
});

// ---------- end-to-end CLI tests ----------

test("rekon config validate accepts a valid findingFilters block", async () => {
  await withConfigFixture(async (root) => {
    await writeConfig(root, {
      capabilities: [{ package: "@rekon/capability-policy" }],
      findingFilters: [
        {
          id: "gen-src",
          reason: "generated-file",
          evidence: "Generated source.",
          pathPattern: "src/generated/**",
        },
      ],
    });
    const result = JSON.parse(
      runCli(["config", "validate", "--root", root, "--json"]).stdout,
    );
    assert.equal(result.valid, true);
    for (const issue of result.issues ?? []) {
      assert.ok(
        !issue.path?.startsWith("findingFilters"),
        `unexpected findingFilters issue: ${JSON.stringify(issue)}`,
      );
    }
  });
});

test("rekon config validate rejects duplicate ids and missing matchers", async () => {
  await withConfigFixture(async (root) => {
    await writeConfig(root, {
      capabilities: [{ package: "@rekon/capability-policy" }],
      findingFilters: [
        {
          id: "dup",
          reason: "generated-file",
          evidence: "x",
          pathPattern: "src/**",
        },
        {
          id: "dup",
          reason: "test-file",
          evidence: "y",
          pathPattern: "tests/**",
        },
        {
          id: "no-matcher",
          reason: "other",
          evidence: "z",
        },
      ],
    });
    const result = runCliExpectFailure(["config", "validate", "--root", root, "--json"]);
    const body = JSON.parse(result.stdout);
    assert.equal(body.valid, false);
    assert.ok(body.issues.some((issue) => issue.code === "finding-filter-id-duplicate"));
    assert.ok(body.issues.some((issue) => issue.code === "finding-filter-no-matcher"));
  });
});

test("rekon findings filter reads .rekon/config.json findingFilters and writes a policy-aware report", async () => {
  await withRefreshedFixture(async (root) => {
    await mergeConfig(root, {
      findingFilters: [
        {
          id: "legacy-src",
          reason: "policy-exception",
          evidence: "Legacy module is excluded from active governance.",
          pathPattern: "src/legacy/**",
          confidence: "medium",
        },
      ],
    });
    const store = createLocalArtifactStore(root);
    await store.init();
    await seedReportCitingEvidence(store);

    const result = JSON.parse(
      runCli(["findings", "filter", "--root", root, "--json"]).stdout,
    );
    assert.equal(result.policyFilters, 1);
    assert.ok(result.summary.byPolicy);
    assert.equal(result.summary.byPolicy["legacy-src"], 1);

    // Re-read the artifact to inspect the filtered entry on disk.
    const reportOnDisk = JSON.parse(
      await readFile(join(root, result.artifact.path), "utf8"),
    );
    const policyEntry = reportOnDisk.filteredFindings.find(
      (entry) => entry.findingId === "legacy",
    );
    assert.ok(policyEntry, "expected policy-filtered entry for 'legacy'");
    assert.equal(policyEntry.source, "policy");
    assert.equal(policyEntry.policyId, "legacy-src");
    assert.equal(policyEntry.reason, "policy-exception");
    assert.equal(policyEntry.evidence, "Legacy module is excluded from active governance.");
  });
});

test("policy-filtered findings are excluded from lifecycle, adjudication, and coherency", async () => {
  await withRefreshedFixture(async (root) => {
    await mergeConfig(root, {
      findingFilters: [
        {
          id: "legacy-src",
          reason: "policy-exception",
          evidence: "Legacy module excluded.",
          pathPattern: "src/legacy/**",
        },
      ],
    });
    const store = createLocalArtifactStore(root);
    await store.init();
    await seedReportCitingEvidence(store);

    runCli(["findings", "filter", "--root", root, "--json"]);
    runCli(["findings", "lifecycle", "--root", root, "--json"]);
    runCli(["issues", "adjudicate", "--root", root, "--json"]);
    runCli(["coherency", "delta", "--root", root, "--json"]);

    const lifecycle = await readLatestArtifact(root, "FindingLifecycleReport");
    const lifecycleIds = lifecycle.findings.map((finding) => finding.id);
    assert.ok(lifecycleIds.includes("ok"));
    assert.ok(!lifecycleIds.includes("legacy"));

    const adjudication = await readLatestArtifact(root, "IssueAdjudicationReport");
    const memberIds = adjudication.groups.flatMap((group) => group.memberFindingIds);
    assert.ok(!memberIds.includes("legacy"));

    const coherency = await readLatestArtifact(root, "CoherencyDelta");
    const allMembers = coherency.items.flatMap((item) => item.memberFindingIds ?? []);
    assert.ok(!allMembers.includes("legacy"));

    // Raw FindingReport must still contain the policy-filtered finding.
    const findingReport = await readLatestArtifact(root, "FindingReport");
    const rawIds = findingReport.findings.map((finding) => finding.id);
    assert.ok(rawIds.includes("legacy"), "raw FindingReport must keep policy-filtered finding");
  });
});

test("rekon findings filter-health surfaces byPolicy + unused-policy-filter alert", async () => {
  await withRefreshedFixture(async (root) => {
    await mergeConfig(root, {
      findingFilters: [
        {
          id: "legacy-src",
          reason: "policy-exception",
          evidence: "Legacy module excluded.",
          pathPattern: "src/legacy/**",
        },
        {
          id: "never-fires",
          reason: "policy-exception",
          evidence: "Reserved for a path we don't ship yet.",
          pathPattern: "src/unbuilt/**",
        },
      ],
    });
    const store = createLocalArtifactStore(root);
    await store.init();
    await seedReportCitingEvidence(store);
    runCli(["findings", "filter", "--root", root, "--json"]);

    const result = JSON.parse(
      runCli(["findings", "filter-health", "--root", root, "--json"]).stdout,
    );
    assert.equal(result.policyFilters, 2);
    assert.ok(result.summary.byPolicy);
    assert.equal(result.summary.byPolicy["legacy-src"], 1);
    assert.equal(result.summary.byPolicy["never-fires"], 0);
    assert.deepEqual(result.summary.unusedPolicies, ["never-fires"]);
    assert.ok(
      result.alerts.some((alert) => alert.code === "unused-policy-filter"),
      `expected unused-policy-filter alert, got ${JSON.stringify(result.alerts)}`,
    );
  });
});

test("artifacts validate remains clean after policy-aware filter + filter-health runs", async () => {
  await withRefreshedFixture(async (root) => {
    await mergeConfig(root, {
      findingFilters: [
        {
          id: "legacy-src",
          reason: "policy-exception",
          evidence: "Legacy module excluded.",
          pathPattern: "src/legacy/**",
        },
      ],
    });
    const store = createLocalArtifactStore(root);
    await store.init();
    await seedReportCitingEvidence(store);
    runCli(["findings", "filter", "--root", root, "--json"]);
    runCli(["findings", "filter-health", "--root", root, "--json"]);
    runCli(["findings", "lifecycle", "--root", root, "--json"]);
    runCli(["issues", "adjudicate", "--root", root, "--json"]);
    runCli(["coherency", "delta", "--root", root, "--json"]);

    const validation = JSON.parse(
      runCli(["artifacts", "validate", "--root", root, "--json"]).stdout,
    );
    assert.equal(validation.valid, true);
    assert.deepEqual(validation.issues ?? [], []);
  });
});

// ---------- helpers ----------

function policy(overrides) {
  return {
    id: overrides.id,
    reason: overrides.reason,
    evidence: overrides.evidence,
    confidence: overrides.confidence,
    pathPattern: overrides.pathPattern,
    type: overrides.type,
    ruleId: overrides.ruleId,
    severity: overrides.severity,
    titleIncludes: overrides.titleIncludes,
    descriptionIncludes: overrides.descriptionIncludes,
  };
}

function finding(id, overrides = {}) {
  return {
    id,
    type: overrides.type ?? "test.example",
    severity: overrides.severity ?? "medium",
    title: overrides.title ?? `Finding ${id}`,
    description: overrides.description ?? `Description for ${id}`,
    subjects: overrides.subjects ?? [`src/${id}.ts`],
    files: overrides.files,
    ruleId: overrides.ruleId,
    suggestedAction: overrides.suggestedAction,
  };
}

function artifactHeader(type, id) {
  return {
    artifactType: type,
    artifactId: id,
    schemaVersion: "0.1.0",
    generatedAt: new Date().toISOString(),
    subject: { repoId: "synthetic" },
    producer: { id: "test-harness", version: "0.1.0" },
    inputRefs: [],
    freshness: { status: "fresh" },
  };
}

async function seedReportCitingEvidence(store) {
  const ev = (await store.list("EvidenceGraph"))
    .slice()
    .sort((left, right) => right.writtenAt.localeCompare(left.writtenAt))[0];
  const om = (await store.list("OwnershipMap"))
    .slice()
    .sort((left, right) => right.writtenAt.localeCompare(left.writtenAt))[0];

  const header = artifactHeader("FindingReport", `fr-policy-${Date.now()}`);
  header.inputRefs = [];
  if (ev) header.inputRefs.push({ type: ev.type, id: ev.id, schemaVersion: ev.schemaVersion });
  if (om) header.inputRefs.push({ type: om.type, id: om.id, schemaVersion: om.schemaVersion });

  const report = createFindingReport({
    header,
    findings: [
      finding("legacy", { files: ["src/legacy/widget.ts"] }),
      finding("ok", { files: ["src/lib/index.ts"] }),
    ],
  });
  return store.write(report, { category: "findings" });
}

async function readLatestArtifact(root, type) {
  const indexPath = join(root, ".rekon/registry/artifacts.index.json");
  const raw = JSON.parse(await readFile(indexPath, "utf8"));
  const entries = Array.isArray(raw) ? raw : Array.isArray(raw.artifacts) ? raw.artifacts : [];
  const sorted = entries
    .filter((entry) => entry.type === type)
    .sort((left, right) => right.writtenAt.localeCompare(left.writtenAt));
  if (sorted.length === 0) {
    throw new Error(`No ${type} indexed at ${indexPath}`);
  }
  return JSON.parse(await readFile(join(root, sorted[0].path), "utf8"));
}

async function writeConfig(root, config) {
  await writeFile(
    join(root, ".rekon", "config.json"),
    JSON.stringify(config, null, 2),
    "utf8",
  );
}

async function mergeConfig(root, additions) {
  const configPath = join(root, ".rekon", "config.json");
  const raw = await readFile(configPath, "utf8");
  const existing = JSON.parse(raw);
  await writeFile(
    configPath,
    JSON.stringify({ ...existing, ...additions }, null, 2),
    "utf8",
  );
}

async function withConfigFixture(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-filter-policy-config-"));
  try {
    await cp(exampleRoot, root, {
      recursive: true,
      filter(source) {
        return !relative(exampleRoot, source).split(/[\\/]/).includes(".rekon");
      },
    });
    runCli(["init", "--root", root, "--json"]);
    await callback(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function withRefreshedFixture(callback) {
  await withConfigFixture(async (root) => {
    runCli(["refresh", "--root", root, "--json"]);
    await callback(root);
  });
}

function runCli(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}

function runCliExpectFailure(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0, `expected non-zero exit, stdout: ${result.stdout}`);
  return result;
}
