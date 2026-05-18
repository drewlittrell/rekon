import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";
import {
  buildFindingFilterHealth,
  createFindingReport,
  fingerprintFindingFilterPolicies,
  isBuiltInPathFiltered,
  isClassicContentFiltered,
  isPolicyFiltered,
  isResultFiltered,
} from "../../packages/kernel-findings/dist/index.js";
import { createLocalArtifactStore } from "../../packages/runtime/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- pure-helper tests ----------

test("classification helpers bucket entries into policy / content / result / built-in", () => {
  const policy = filteredEntry("p", "policy-exception", "policy", { policyId: "p1" });
  const content = filteredEntry("c", "empty-constructor-stub", "system");
  const result = filteredEntry("r", "below-min-confidence", "system");
  const built = filteredEntry("b", "generated-file", "system");
  assert.equal(isPolicyFiltered(policy), true);
  assert.equal(isClassicContentFiltered(content), true);
  assert.equal(isResultFiltered(result), true);
  assert.equal(isBuiltInPathFiltered(built), true);
  // Mutual exclusion: a policy entry whose `reason` is `policy-exception`
  // should be classified as policy, not built-in.
  assert.equal(isBuiltInPathFiltered(policy), false);
});

test("reason-over-filtering alert fires when one reason dominates (>= 5 findings, >= 50%)", () => {
  const report = makeFilterReport({
    kept: 1,
    filtered: [
      ...times(6, (index) => filteredEntry(`gen-${index}`, "generated-file", "system")),
      filteredEntry("noise", "external-file", "system"),
    ],
  });
  const { alerts, summary } = buildFindingFilterHealth({ filterReport: report });
  const codes = alerts.map((alert) => alert.code);
  assert.ok(codes.includes("reason-over-filtering"), `expected reason-over-filtering; got ${codes.join(", ")}`);
  assert.ok(summary.dominantReason, "summary.dominantReason should be populated");
  assert.equal(summary.dominantReason.reason, "generated-file");
});

test("policy-dominance alert fires when one policy dominates", () => {
  const report = makeFilterReport({
    kept: 1,
    filtered: [
      ...times(6, (index) =>
        filteredEntry(`pol-${index}`, "policy-exception", "policy", { policyId: "broad" }),
      ),
      filteredEntry("other", "external-file", "system"),
    ],
    byPolicy: { broad: 6, other: 0 },
  });
  const { alerts, summary } = buildFindingFilterHealth({ filterReport: report });
  const codes = alerts.map((alert) => alert.code);
  assert.ok(codes.includes("policy-dominance"), `expected policy-dominance; got ${codes.join(", ")}`);
  assert.ok(summary.dominantPolicy);
  assert.equal(summary.dominantPolicy.policyId, "broad");
});

test("content-filter-dominance alert fires when content filters dominate", () => {
  const report = makeFilterReport({
    kept: 1,
    filtered: [
      ...times(3, (index) => filteredEntry(`ec-${index}`, "empty-constructor-stub", "system")),
      ...times(2, (index) => filteredEntry(`sd-${index}`, "same-directory-import", "system")),
      filteredEntry("noise", "external-file", "system"),
    ],
  });
  const { alerts, summary } = buildFindingFilterHealth({ filterReport: report });
  const codes = alerts.map((alert) => alert.code);
  assert.ok(
    codes.includes("content-filter-dominance"),
    `expected content-filter-dominance; got ${codes.join(", ")}`,
  );
  assert.ok(summary.contentFiltered >= 5);
});

test("result-filter-dominance alert fires when result filters dominate", () => {
  const report = makeFilterReport({
    kept: 1,
    filtered: [
      ...times(3, (index) => filteredEntry(`mc-${index}`, "below-min-confidence", "system")),
      ...times(2, (index) => filteredEntry(`sv-${index}`, "below-min-severity", "system")),
      filteredEntry("noise", "external-file", "system"),
    ],
  });
  const { alerts, summary } = buildFindingFilterHealth({ filterReport: report });
  const codes = alerts.map((alert) => alert.code);
  assert.ok(
    codes.includes("result-filter-dominance"),
    `expected result-filter-dominance; got ${codes.join(", ")}`,
  );
  assert.ok(summary.resultFiltered >= 5);
});

test("low-confidence-filtered alert includes count", () => {
  const report = makeFilterReport({
    kept: 1,
    filtered: [
      filteredEntry("a", "content-filter", "system", { confidence: "low" }),
      filteredEntry("b", "content-filter", "system", { confidence: "low" }),
    ],
  });
  const { alerts } = buildFindingFilterHealth({ filterReport: report });
  const alert = alerts.find((entry) => entry.code === "low-confidence-filtered");
  assert.ok(alert);
  assert.ok(alert.message.includes("2 findings"), `expected count in message, got ${alert.message}`);
});

test("low-confidence-policy-filter alert fires when a policy-filtered entry is low-confidence", () => {
  const report = makeFilterReport({
    kept: 1,
    filtered: [
      filteredEntry("a", "policy-exception", "policy", {
        policyId: "weak",
        confidence: "low",
      }),
    ],
    byPolicy: { weak: 1 },
  });
  const { alerts } = buildFindingFilterHealth({ filterReport: report });
  const codes = alerts.map((alert) => alert.code);
  assert.ok(codes.includes("low-confidence-policy-filter"));
});

test("unused-policy-filter alert names the policy id", () => {
  const report = makeFilterReport({
    kept: 1,
    filtered: [filteredEntry("a", "policy-exception", "policy", { policyId: "alpha" })],
    byPolicy: { alpha: 1, beta: 0 },
  });
  const { alerts } = buildFindingFilterHealth({
    filterReport: report,
    policies: [
      makePolicy("alpha"),
      makePolicy("beta"),
    ],
  });
  const alert = alerts.find((entry) => entry.code === "unused-policy-filter");
  assert.ok(alert);
  assert.ok(alert.message.includes("beta"), `expected 'beta' in message, got ${alert.message}`);
});

test("policy-fingerprint-missing fires when policyFiltered > 0 and report has no fingerprint", () => {
  const report = makeFilterReport({
    kept: 1,
    filtered: [filteredEntry("a", "policy-exception", "policy", { policyId: "p1" })],
    byPolicy: { p1: 1 },
  });
  // report.policyFingerprint left undefined
  const { alerts } = buildFindingFilterHealth({ filterReport: report });
  const codes = alerts.map((alert) => alert.code);
  assert.ok(codes.includes("policy-fingerprint-missing"));
});

test("stale-policy-fingerprint fires when current fingerprint differs from report fingerprint", () => {
  const rulesA = [makePolicy("a", { pathPattern: "src/foo/**" })];
  const rulesB = [makePolicy("a", { pathPattern: "src/bar/**" })];
  const report = makeFilterReport({
    kept: 1,
    filtered: [filteredEntry("x", "external-file", "system")],
    policyFingerprint: fingerprintFindingFilterPolicies(rulesA),
  });
  const { alerts } = buildFindingFilterHealth({
    filterReport: report,
    currentPolicyFingerprint: fingerprintFindingFilterPolicies(rulesB),
  });
  const codes = alerts.map((alert) => alert.code);
  assert.ok(codes.includes("stale-policy-fingerprint"));
});

test("no stale-policy-fingerprint when fingerprints match", () => {
  const rules = [makePolicy("a", { pathPattern: "src/foo/**" })];
  const fingerprint = fingerprintFindingFilterPolicies(rules);
  const report = makeFilterReport({
    kept: 1,
    filtered: [filteredEntry("x", "external-file", "system")],
    policyFingerprint: fingerprint,
  });
  const { alerts } = buildFindingFilterHealth({
    filterReport: report,
    currentPolicyFingerprint: fingerprint,
  });
  const codes = alerts.map((alert) => alert.code);
  assert.equal(codes.includes("stale-policy-fingerprint"), false);
});

test("summary includes contentFiltered / resultFiltered / policyFiltered / builtInPathFiltered counts that sum to totalFiltered", () => {
  const report = makeFilterReport({
    kept: 0,
    filtered: [
      filteredEntry("p1", "policy-exception", "policy", { policyId: "p" }),
      filteredEntry("c1", "empty-constructor-stub", "system"),
      filteredEntry("r1", "below-min-confidence", "system"),
      filteredEntry("b1", "generated-file", "system"),
    ],
    byPolicy: { p: 1 },
  });
  const { summary } = buildFindingFilterHealth({ filterReport: report });
  assert.equal(summary.policyFiltered, 1);
  assert.equal(summary.contentFiltered, 1);
  assert.equal(summary.resultFiltered, 1);
  assert.equal(summary.builtInPathFiltered, 1);
  assert.equal(
    summary.policyFiltered + summary.contentFiltered + summary.resultFiltered + summary.builtInPathFiltered,
    summary.totalFiltered,
  );
});

test("summary includes dominantReason / dominantPolicy with deterministic tiebreak", () => {
  const report = makeFilterReport({
    kept: 0,
    filtered: [
      filteredEntry("p1", "policy-exception", "policy", { policyId: "alpha" }),
      filteredEntry("p2", "policy-exception", "policy", { policyId: "alpha" }),
      filteredEntry("p3", "policy-exception", "policy", { policyId: "beta" }),
      filteredEntry("p4", "policy-exception", "policy", { policyId: "beta" }),
    ],
    byPolicy: { alpha: 2, beta: 2 },
  });
  const { summary } = buildFindingFilterHealth({ filterReport: report });
  // Tie on count → alphabetic tiebreak → alpha wins.
  assert.ok(summary.dominantPolicy);
  assert.equal(summary.dominantPolicy.policyId, "alpha");
  assert.equal(summary.dominantPolicy.count, 2);
  // Dominant reason is policy-exception (all four).
  assert.equal(summary.dominantReason.reason, "policy-exception");
});

test("rekon findings filter-health passes current config fingerprint and surfaces it in JSON", async () => {
  await withFreshWorkspace(async ({ root }) => {
    runCli(["refresh", "--root", root, "--json"]);
    const result = JSON.parse(
      runCli(["findings", "filter-health", "--root", root, "--json"]).stdout,
    );
    assert.ok(result.currentPolicyFingerprint, "filter-health CLI must echo current fingerprint");
    assert.equal(typeof result.currentPolicyFingerprint.digest, "string");
    // Empty policy set → empty-policy fingerprint matches the report's empty-policy fingerprint.
    assert.equal(
      result.summary.policyFingerprint?.digest,
      result.currentPolicyFingerprint.digest,
      "summary should mirror the report policyFingerprint",
    );
    const codes = (result.alerts ?? []).map((alert) => alert.code);
    assert.equal(codes.includes("stale-policy-fingerprint"), false);
    assert.equal(codes.includes("policy-fingerprint-missing"), false);
  });
});

test("rekon refresh produces a filter-health report whose fingerprint matches current config", async () => {
  await withFreshWorkspace(async ({ root }) => {
    runCli(["refresh", "--root", root, "--json"]);
    const health = await readLatestFilterHealthReport(root);
    assert.ok(health, "filter-health report must exist after refresh");
    // Fresh refresh with no configured policies: empty-policy fingerprint.
    assert.equal(health.summary.policyFingerprint?.ruleCount, 0);
    const codes = (health.alerts ?? []).map((alert) => alert.code);
    assert.equal(codes.includes("stale-policy-fingerprint"), false);
  });
});

test("architecture summary and agent contract publications surface new alert codes via existing generic tables", async () => {
  await withFreshWorkspace(async ({ root }) => {
    // Seed a synthetic FindingReport with > 5 result-filtered findings
    // so result-filter-dominance fires, then publish.
    runCli(["refresh", "--root", root, "--json"]);
    await patchConfig(root, {
      findingResultFilters: { severity: "critical" },
    });
    const store = createLocalArtifactStore(root);
    await store.init();

    const findings = times(6, (index) => ({
      id: `low-${index}`,
      type: "issue",
      severity: "low",
      title: `Low ${index}`,
      description: `Low severity finding ${index}`,
      subjects: [`src/low/${index}.ts`],
      files: [`src/low/${index}.ts`],
    }));
    const ev = (await store.list("EvidenceGraph"))
      .slice()
      .sort((left, right) => right.writtenAt.localeCompare(left.writtenAt))[0];
    const om = (await store.list("OwnershipMap"))
      .slice()
      .sort((left, right) => right.writtenAt.localeCompare(left.writtenAt))[0];
    const inputRefs = [];
    if (ev) inputRefs.push({ type: ev.type, id: ev.id, schemaVersion: ev.schemaVersion });
    if (om) inputRefs.push({ type: om.type, id: om.id, schemaVersion: om.schemaVersion });
    const synth = createFindingReport({
      header: {
        artifactType: "FindingReport",
        artifactId: `health-v2-${Date.now()}`,
        schemaVersion: "0.1.0",
        generatedAt: new Date().toISOString(),
        subject: { repoId: "filter-health-v2" },
        producer: { id: "test-harness", version: "0.1.0" },
        inputRefs,
        freshness: { status: "fresh" },
      },
      findings,
    });
    await store.write(synth, { category: "findings" });
    runCli(["findings", "filter", "--root", root, "--json"]);
    runCli(["findings", "filter-health", "--root", root, "--json"]);
    runCli(["publish", "architecture", "--root", root, "--json"]);
    runCli(["publish", "agent-contract", "--root", root, "--json"]);

    const arch = await readLatestPublicationBody(root, "architecture-summary");
    const agent = await readLatestPublicationBody(root, "agent-contract");
    assert.ok(
      arch.includes("result-filter-dominance") || arch.includes("result-filter-over-filtering"),
      "architecture summary must surface a dominance / over-filtering alert in its Filter Health table",
    );
    assert.ok(
      agent.includes("result-filter-dominance") || agent.includes("result-filter-over-filtering"),
      "agent contract must surface a dominance / over-filtering alert in its Filter Health subsection",
    );
  });
});

test("rekon artifacts validate stays clean after filter-health diagnostics v2 fields are populated", async () => {
  await withFreshWorkspace(async ({ root }) => {
    runCli(["refresh", "--root", root, "--json"]);
    runCli(["findings", "filter-health", "--root", root, "--json"]);
    const validation = JSON.parse(
      runCli(["artifacts", "validate", "--root", root, "--json"]).stdout,
    );
    assert.equal(validation.valid, true);
    assert.deepEqual(validation.issues ?? [], []);
  });
});

// ---------- helpers ----------

function makeFilterReport({ kept, filtered, byPolicy, policyFingerprint }) {
  const byReason = {};
  const byConfidence = {};
  const byType = {};
  const bySeverity = {};
  for (const entry of filtered) {
    byReason[entry.reason] = (byReason[entry.reason] ?? 0) + 1;
    byConfidence[entry.confidence] = (byConfidence[entry.confidence] ?? 0) + 1;
    const type = entry.finding.type;
    byType[type] = (byType[type] ?? 0) + 1;
    const severity = entry.finding.severity;
    bySeverity[severity] = (bySeverity[severity] ?? 0) + 1;
  }
  const summary = {
    totalFiltered: filtered.length,
    kept,
    byReason,
    byConfidence,
    byType,
    bySeverity,
  };
  if (byPolicy) summary.byPolicy = byPolicy;
  const report = {
    header: {
      artifactType: "FindingFilterReport",
      artifactId: `synthetic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      schemaVersion: "0.1.0",
      generatedAt: new Date().toISOString(),
      subject: { repoId: "synthetic" },
      producer: { id: "test-harness", version: "0.1.0" },
      inputRefs: [],
      freshness: { status: "fresh" },
    },
    summary,
    keptFindings: times(kept, (index) => synthFinding(`kept-${index}`, "src/kept.ts")),
    filteredFindings: filtered,
  };
  if (policyFingerprint) report.policyFingerprint = policyFingerprint;
  return report;
}

function filteredEntry(id, reason, source, overrides = {}) {
  return {
    findingId: id,
    finding: synthFinding(id, overrides.filePath ?? `src/${id}.ts`),
    reason,
    evidence: overrides.evidence ?? `Synthetic filter evidence for ${id}`,
    filePath: overrides.filePath ?? `src/${id}.ts`,
    confidence: overrides.confidence ?? "high",
    filteredAt: "2026-05-17T00:00:00.000Z",
    source,
    policyId: overrides.policyId,
  };
}

function synthFinding(id, filePath) {
  return {
    id,
    type: "issue",
    severity: "medium",
    title: `Finding ${id}`,
    description: `Synthetic finding ${id}`,
    subjects: [filePath],
    files: [filePath],
  };
}

function makePolicy(id, overrides = {}) {
  return {
    id,
    reason: overrides.reason ?? "policy-exception",
    evidence: overrides.evidence ?? `Synthetic policy ${id}`,
    pathPattern: overrides.pathPattern ?? `src/${id}/**`,
  };
}

function times(n, fn) {
  return Array.from({ length: n }, (_, index) => fn(index));
}

async function withFreshWorkspace(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-filter-health-v2-"));
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

async function patchConfig(root, patch) {
  const configPath = join(root, ".rekon", "config.json");
  let config = {};
  try {
    config = JSON.parse(await readFile(configPath, "utf8"));
  } catch {
    config = {};
  }
  await writeFile(
    configPath,
    `${JSON.stringify({ ...config, ...patch }, null, 2)}\n`,
    "utf8",
  );
}

async function readLatestFilterHealthReport(root) {
  const findingsDir = join(root, ".rekon", "artifacts", "findings");
  const files = (await readdir(findingsDir))
    .filter((file) => file.startsWith("FindingFilterHealthReport-"))
    .sort();
  if (files.length === 0) return undefined;
  return JSON.parse(await readFile(join(findingsDir, files[files.length - 1]), "utf8"));
}

async function readLatestPublicationBody(root, kindPrefix) {
  const pubDir = join(root, ".rekon", "artifacts", "publications");
  const files = (await readdir(pubDir))
    .filter((file) => file.startsWith(`Publication-${kindPrefix}-`))
    .sort();
  if (files.length === 0) throw new Error(`no ${kindPrefix} publication under ${pubDir}`);
  const pub = JSON.parse(await readFile(join(pubDir, files[files.length - 1]), "utf8"));
  return pub.content ?? "";
}

function runCli(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}
