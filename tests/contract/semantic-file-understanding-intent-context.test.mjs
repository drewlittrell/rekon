// Semantic File Understanding Intent Context (slice 150).
//
// `rekon intent assess` and `rekon intent plan review` may EXPLICITLY consume
// SemanticFileUnderstandingReport(s) as proposal/context via
// `--semantic-context latest` or `--semantic-context-ref <ref>`. Semantic
// context enriches matched paths / warnings / revision-prompt grounding, but it
// is proposal/context, not proof: it never changes readiness or actionability
// status, never suppresses deterministic blockers/findings, never executes,
// writes source, creates a WorkOrder/VerificationPlan, or runs Circe. Stale
// reports (sha mismatch or non-clean boundaries) are surfaced as warnings, never
// consumed silently. All CLI tests are key-free (no provider).

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  selectSemanticFileContext,
  summarizeSemanticFileContext,
  buildIntentAssessmentReport,
  buildIntentPlanActionabilityReport,
} from "../../packages/capability-model/dist/index.js";
import { validateIntentAssessmentReport } from "../../packages/kernel-repo-model/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");

// ---------- fixtures ----------

const CLEAN_BOUNDARIES = {
  executedCommands: false,
  wroteSourceFiles: false,
  createdWorkOrder: false,
  createdVerificationPlan: false,
  ranCirce: false,
  satisfiedProofGate: false,
  replacedDeterministicEvidence: false,
  ranEmbeddings: false,
};

function semReport(overrides = {}) {
  return {
    file: { path: "src/index.ts", sha256: "sha-current", ...(overrides.file ?? {}) },
    status: { value: "understood" },
    summary: {
      purpose: "Greets users.",
      responsibilities: ["greet", "Greeter"],
      publicExports: ["greet", "Greeter", "existing"],
      imports: ["node:path", "node:fs/promises"],
      touchedConcepts: ["greeting"],
      ...(overrides.summary ?? {}),
    },
    findings: overrides.findings ?? [],
    normalizationTrace: { method: "deterministic-fallback", provider: "openai", model: "m", warnings: [] },
    boundaries: overrides.boundaries ?? { ...CLEAN_BOUNDARIES },
  };
}

const REF = (id) => ({ type: "SemanticFileUnderstandingReport", id, schemaVersion: "0.1.0" });

function baseHeader() {
  return {
    artifactType: "IntentAssessmentReport",
    artifactId: "intent-assessment-report-sfu-1",
    schemaVersion: "0.1.0",
    generatedAt: "2026-06-03T00:00:00.000Z",
    subject: { repoId: "test" },
    producer: { id: "@rekon/test", version: "0.1.0" },
    inputRefs: [],
    freshness: { status: "fresh" },
    provenance: { confidence: 0.7 },
  };
}

const usedSelection = (over = {}) => ({
  usedReports: [
    {
      path: "src/index.ts",
      sha256: "sha-current",
      purpose: "Greets users.",
      responsibilities: ["greet", "Greeter"],
      publicExports: ["greet", "Greeter"],
      imports: ["node:path"],
      touchedConcepts: ["greeting"],
      findingCount: 0,
      highSeverityFindingCount: 0,
      ref: REF("a"),
      ...(over.used ?? {}),
    },
  ],
  staleReports: over.stale ?? [],
  missingReports: over.missing ?? [],
  warnings: over.warnings ?? [],
});

// ---------- 1: pure selection — matching path + sha → used ----------
test("1. selection uses a report with matching path and sha", () => {
  const selection = selectSemanticFileContext({
    reports: [{ report: semReport(), ref: REF("a") }],
    requestedPaths: ["src/index.ts"],
    currentFileHashes: { "src/index.ts": "sha-current" },
  });
  assert.equal(selection.usedReports.length, 1);
  assert.equal(selection.staleReports.length, 0);
});

// ---------- 2: sha mismatch → stale, not used ----------
test("2. sha mismatch marks the report stale, not used", () => {
  const selection = selectSemanticFileContext({
    reports: [{ report: semReport(), ref: REF("a") }],
    requestedPaths: ["src/index.ts"],
    currentFileHashes: { "src/index.ts": "sha-changed" },
  });
  assert.equal(selection.usedReports.length, 0);
  assert.equal(selection.staleReports.length, 1);
  assert.equal(selection.staleReports[0].reason, "sha-mismatch");
});

// ---------- 3: non-clean boundaries → stale, not used ----------
test("3. non-clean boundaries mark the report stale, not used", () => {
  const selection = selectSemanticFileContext({
    reports: [{ report: semReport({ boundaries: { ...CLEAN_BOUNDARIES, executedCommands: true } }), ref: REF("a") }],
    requestedPaths: ["src/index.ts"],
    currentFileHashes: { "src/index.ts": "sha-current" },
  });
  assert.equal(selection.usedReports.length, 0);
  assert.equal(selection.staleReports[0].reason, "boundaries-not-clean");
});

// ---------- 4: requestedPaths filters unrelated reports ----------
test("4. requestedPaths excludes unrelated reports", () => {
  const selection = selectSemanticFileContext({
    reports: [{ report: semReport({ file: { path: "src/other.ts", sha256: "x" } }), ref: REF("a") }],
    requestedPaths: ["src/index.ts"],
    currentFileHashes: {},
  });
  assert.equal(selection.usedReports.length, 0);
});

// ---------- 5: empty requestedPaths considers all candidates ----------
test("5. empty requestedPaths considers all candidates", () => {
  const selection = selectSemanticFileContext({
    reports: [{ report: semReport({ file: { path: "src/other.ts", sha256: "x" } }), ref: REF("a") }],
    requestedPaths: [],
    currentFileHashes: {},
  });
  assert.equal(selection.usedReports.length, 1);
  assert.equal(selection.usedReports[0].path, "src/other.ts");
});

// ---------- 6: latest wins for the same path ----------
test("6. latest report wins for the same path", () => {
  const selection = selectSemanticFileContext({
    reports: [
      { report: semReport({ summary: { purpose: "OLD" } }), ref: REF("old") },
      { report: semReport({ summary: { purpose: "NEW" } }), ref: REF("new") },
    ],
    requestedPaths: ["src/index.ts"],
    currentFileHashes: { "src/index.ts": "sha-current" },
  });
  assert.equal(selection.usedReports.length, 1);
  assert.equal(selection.usedReports[0].purpose, "NEW");
});

// ---------- 7: missingReports lists requested paths with no report ----------
test("7. missingReports lists requested paths with no usable report", () => {
  const selection = selectSemanticFileContext({
    reports: [],
    requestedPaths: ["src/index.ts"],
    currentFileHashes: {},
  });
  assert.deepEqual(selection.missingReports, ["src/index.ts"]);
});

// ---------- 8: stale produces a warning (never silent) ----------
test("8. stale reports produce a warning", () => {
  const selection = selectSemanticFileContext({
    reports: [{ report: semReport(), ref: REF("a") }],
    requestedPaths: ["src/index.ts"],
    currentFileHashes: { "src/index.ts": "sha-changed" },
  });
  assert.ok(selection.warnings.length >= 1);
  assert.match(selection.warnings[0], /stale/i);
});

// ---------- 9: used reports carry deterministic facts ----------
test("9. used reports carry purpose / responsibilities / exports / imports", () => {
  const selection = selectSemanticFileContext({
    reports: [{ report: semReport(), ref: REF("a") }],
    requestedPaths: ["src/index.ts"],
    currentFileHashes: {},
  });
  const used = selection.usedReports[0];
  assert.equal(used.purpose, "Greets users.");
  assert.deepEqual(used.responsibilities, ["greet", "Greeter"]);
  assert.ok(used.publicExports.includes("existing"));
  assert.ok(used.imports.includes("node:path"));
});

// ---------- 10: finding counts computed ----------
test("10. finding counts (total + high severity) are computed", () => {
  const selection = selectSemanticFileContext({
    reports: [
      {
        report: semReport({ findings: [{ severity: "high", message: "x" }, { severity: "low", message: "y" }] }),
        ref: REF("a"),
      },
    ],
    requestedPaths: ["src/index.ts"],
    currentFileHashes: {},
  });
  assert.equal(selection.usedReports[0].findingCount, 2);
  assert.equal(selection.usedReports[0].highSeverityFindingCount, 1);
});

// ---------- 11: path normalization (./src vs src) ----------
test("11. path normalization matches ./-prefixed requests", () => {
  const selection = selectSemanticFileContext({
    reports: [{ report: semReport({ file: { path: "./src/index.ts", sha256: "sha-current" } }), ref: REF("a") }],
    requestedPaths: ["src/index.ts"],
    currentFileHashes: { "src/index.ts": "sha-current" },
  });
  assert.equal(selection.usedReports.length, 1);
  assert.equal(selection.usedReports[0].path, "src/index.ts");
});

// ---------- 12: no current hash → consumed when boundaries clean (no sha staleness) ----------
test("12. an unknown current hash does not force staleness", () => {
  const selection = selectSemanticFileContext({
    reports: [{ report: semReport(), ref: REF("a") }],
    requestedPaths: ["src/index.ts"],
    currentFileHashes: {},
  });
  assert.equal(selection.usedReports.length, 1);
  assert.equal(selection.staleReports.length, 0);
});

// ---------- 13: summarize(undefined) ----------
test("13. summarizeSemanticFileContext(undefined) reports not requested", () => {
  const summary = summarizeSemanticFileContext(undefined);
  assert.deepEqual(summary, { requested: false, used: 0, stale: 0, missing: 0, warnings: [] });
});

// ---------- 14: summarize(selection) ----------
test("14. summarizeSemanticFileContext counts a selection", () => {
  const summary = summarizeSemanticFileContext({
    usedReports: [{}, {}],
    staleReports: [{}],
    missingReports: ["a"],
    warnings: ["w"],
  });
  assert.deepEqual(summary, { requested: true, used: 2, stale: 1, missing: 1, warnings: ["w"] });
});

// ---------- 15: assess builder enriches matchedContext.paths ----------
test("15. intent assess enriches matchedContext.paths with used reports", () => {
  const report = buildIntentAssessmentReport({
    header: baseHeader(),
    request: { goal: "Improve greeter", kind: "feature", scope: { paths: ["src/index.ts"] } },
    semanticFileContext: usedSelection(),
  });
  assert.ok(report.matchedContext.paths.includes("src/index.ts"));
});

// ---------- 16: assess findings → scope-ambiguous warning ----------
test("16. intent assess adds a scope-ambiguous warning for semantic findings", () => {
  const report = buildIntentAssessmentReport({
    header: baseHeader(),
    request: { goal: "Improve greeter", kind: "feature", scope: { paths: ["src/index.ts"] } },
    semanticFileContext: usedSelection({ used: { findingCount: 2, highSeverityFindingCount: 1 } }),
  });
  const warning = report.warnings.find((w) => w.id.startsWith("semantic-context:findings:"));
  assert.ok(warning, "expected a semantic findings warning");
  assert.equal(warning.category, "scope-ambiguous");
});

// ---------- 17: assess stale → stale-context warning ----------
test("17. intent assess adds a stale-context warning for stale reports", () => {
  const report = buildIntentAssessmentReport({
    header: baseHeader(),
    request: { goal: "Improve greeter", kind: "feature", scope: { paths: ["src/index.ts"] } },
    semanticFileContext: usedSelection({
      used: undefined,
      stale: [{ path: "src/index.ts", reason: "sha-mismatch", ref: REF("a") }],
    }),
  });
  const warning = report.warnings.find((w) => w.id.startsWith("semantic-context:stale:"));
  assert.ok(warning, "expected a semantic stale warning");
  assert.equal(warning.category, "stale-context");
});

// ---------- 18: semantic context never changes readiness ----------
test("18. semantic context never changes assessment readiness", () => {
  const request = { goal: "Improve greeter", kind: "feature", scope: { paths: ["src/index.ts"] } };
  const without = buildIntentAssessmentReport({ header: baseHeader(), request });
  const withCtx = buildIntentAssessmentReport({
    header: baseHeader(),
    request,
    semanticFileContext: usedSelection({ used: { findingCount: 3, highSeverityFindingCount: 2 } }),
  });
  assert.equal(withCtx.readiness.status, without.readiness.status);
  assert.equal(withCtx.readiness.recommendedNextAction, without.readiness.recommendedNextAction);
  assert.equal(withCtx.blockers.length, without.blockers.length);
});

// ---------- 19: assess report still validates ----------
test("19. assessment report with semantic context still validates", () => {
  const report = buildIntentAssessmentReport({
    header: baseHeader(),
    request: { goal: "Improve greeter", kind: "feature", scope: { paths: ["src/index.ts"] } },
    semanticFileContext: usedSelection({ used: { findingCount: 1, highSeverityFindingCount: 0 } }),
  });
  assert.equal(validateIntentAssessmentReport(report).ok, true);
});

// ---------- 20: plan review revisionPrompt grounds on semantic purpose ----------
test("20. plan review revisionPrompt includes semantic purpose", async () => {
  const report = await buildIntentPlanActionabilityReport({
    planText: "# Plan\n## Phase 1: Update greeter\n- Edit src/index.ts.\n",
    planPath: "plan.md",
    goal: "Improve greeter",
    semanticFileContext: usedSelection(),
  });
  assert.match(report.revisionPrompt.prompt, /Greets users\./);
});

// ---------- 21: plan review revisionPrompt includes a responsibility ----------
test("21. plan review revisionPrompt includes a semantic responsibility", async () => {
  const report = await buildIntentPlanActionabilityReport({
    planText: "# Plan\n## Phase 1: Update greeter\n- Edit src/index.ts.\n",
    planPath: "plan.md",
    semanticFileContext: usedSelection(),
  });
  assert.match(report.revisionPrompt.prompt, /greet/);
});

// ---------- 22: semantic context never changes actionability status ----------
test("22. semantic context never changes plan actionability status", async () => {
  const planText = "# Plan\n## Phase 1: Update greeter\n- Edit src/index.ts.\n";
  const without = await buildIntentPlanActionabilityReport({ planText, planPath: "plan.md" });
  const withCtx = await buildIntentPlanActionabilityReport({
    planText,
    planPath: "plan.md",
    semanticFileContext: usedSelection({ used: { findingCount: 3, highSeverityFindingCount: 2 } }),
  });
  assert.equal(withCtx.status.value, without.status.value);
  assert.equal(withCtx.findings.length, without.findings.length);
});

// ---------- 23: plan review surfaces stale notes in the normalization trace ----------
test("23. plan review records stale semantic notes in normalizationTrace.warnings", async () => {
  const report = await buildIntentPlanActionabilityReport({
    planText: "# Plan\n## Phase 1: Update greeter\n- Edit src/index.ts.\n",
    planPath: "plan.md",
    semanticFileContext: usedSelection({
      used: undefined,
      stale: [{ path: "src/index.ts", reason: "sha-mismatch", ref: REF("a") }],
    }),
  });
  assert.ok(report.normalizationTrace.warnings.some((w) => /stale/i.test(w)));
});

// ---------- CLI end-to-end (key-free) ----------

const noKeyEnv = () => {
  const env = { ...process.env };
  delete env.OPENAI_API_KEY;
  delete env.ANTHROPIC_API_KEY;
  delete env.REKON_RUN_LIVE_LLM_TESTS;
  return env;
};

function makeRepo() {
  const TMP = mkdtempSync(join(tmpdir(), "rekon-sfu-intent-"));
  const ROOT = join(TMP, "repo");
  mkdirSync(join(ROOT, "src"), { recursive: true });
  writeFileSync(join(ROOT, "package.json"), JSON.stringify({ name: "sfu-intent", version: "0.0.0", type: "module" }) + "\n");
  writeFileSync(
    join(ROOT, "src/index.ts"),
    'export function greet(name) { return `hello ${name}`; }\nexport class Greeter {}\n',
  );
  writeFileSync(join(ROOT, "plan.md"), "# Plan\n## Phase 1: Update greeter\n- Edit src/index.ts to add a farewell.\n");
  return ROOT;
}

const run = (ROOT, args) =>
  spawnSync(process.execPath, [cliPath, ...args, "--root", ROOT], { encoding: "utf8", env: noKeyEnv() });

function seedSemanticReport(ROOT) {
  const understand = run(ROOT, ["semantic", "file", "understand", "--path", "src/index.ts", "--semantic", "auto", "--llm-provider", "openai", "--llm-model", "test-model", "--json"]);
  assert.equal(understand.status, 0, understand.stderr);
  const ref = run(ROOT, ["artifacts", "latest", "--type", "SemanticFileUnderstandingReport", "--id-only"]);
  assert.equal(ref.status, 0, ref.stderr);
  return ref.stdout.trim();
}

// ---------- 24 ----------
test("24. intent assess --semantic-context latest consumes a seeded report", () => {
  const ROOT = makeRepo();
  seedSemanticReport(ROOT);
  const out = run(ROOT, ["intent", "assess", "--goal", "Improve greeter", "--kind", "feature", "--path", "src/index.ts", "--semantic-context", "latest", "--json"]);
  assert.equal(out.status, 0, out.stderr);
  const json = JSON.parse(out.stdout);
  assert.equal(json.semanticContext.requested, true);
  assert.ok(json.semanticContext.used >= 1);
  assert.ok(json.matchedContext.paths.includes("src/index.ts"));
});

// ---------- 25 ----------
test("25. intent assess --semantic-context-ref consumes the named report", () => {
  const ROOT = makeRepo();
  const semRef = seedSemanticReport(ROOT);
  const out = run(ROOT, ["intent", "assess", "--goal", "Improve greeter", "--path", "src/index.ts", "--semantic-context-ref", semRef, "--json"]);
  assert.equal(out.status, 0, out.stderr);
  const json = JSON.parse(out.stdout);
  assert.ok(json.semanticContext.used >= 1);
});

// ---------- 26 ----------
test("26. intent assess without the flag is unchanged (no semanticContext key)", () => {
  const ROOT = makeRepo();
  seedSemanticReport(ROOT);
  const out = run(ROOT, ["intent", "assess", "--goal", "Improve greeter", "--path", "src/index.ts", "--json"]);
  assert.equal(out.status, 0, out.stderr);
  const json = JSON.parse(out.stdout);
  assert.equal(json.semanticContext, undefined);
});

// ---------- 27 ----------
test("27. a missing --semantic-context-ref fails cleanly (non-zero)", () => {
  const ROOT = makeRepo();
  const out = run(ROOT, ["intent", "assess", "--goal", "Improve greeter", "--semantic-context-ref", "SemanticFileUnderstandingReport:does-not-exist", "--json"]);
  assert.notEqual(out.status, 0);
});

// ---------- 28 ----------
test("28. intent plan review --semantic-context latest surfaces context", () => {
  const ROOT = makeRepo();
  seedSemanticReport(ROOT);
  const out = run(ROOT, ["intent", "plan", "review", "--plan", "plan.md", "--path", "src/index.ts", "--semantic-context", "latest", "--json"]);
  assert.equal(out.status, 0, out.stderr);
  const json = JSON.parse(out.stdout);
  assert.equal(json.semanticContext.requested, true);
  assert.ok(json.semanticContext.used >= 1);
});
