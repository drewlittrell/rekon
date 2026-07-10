// Contract tests for the gated GitHub Check publisher skeleton.
//
// Step 6a of the CI / GitHub adapter implementation sequence
// pinned by
// docs/strategy/verification-runner-ci-github-decision.md and
// docs/strategy/verification-runner-github-check-publisher-decision.md.
//
// The skeleton lives in `@rekon/capability-docs` and exposes
// `buildGitHubCheckPayload` + `assessGitHubCheckPublisherReadiness`.
// It must:
// - never call the GitHub API,
// - never import a network client or GitHub SDK,
// - always include the canonical-truth reminder in the summary,
// - cite the artifact ids it summarised,
// - refuse to mark itself ready unless every gate condition is met.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

import {
  GITHUB_CHECK_PUBLISHER_CANONICAL_TRUTH_REMINDER,
  GITHUB_CHECK_PUBLISHER_DEFAULT_NAME,
  assessGitHubCheckPublisherReadiness,
  buildGitHubCheckPayload,
} from "@rekon/capability-docs";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

function makeHeader(id) {
  return {
    type: "VerificationResult",
    id,
    schemaVersion: "1.0.0",
    createdAt: "2026-05-21T12:00:00.000Z",
    actorCapability: "@rekon/capability-verify",
    inputRefs: [],
    sources: [],
  };
}

function makeResult({ status, planId = "vp-1", runId, summary }) {
  return {
    header: { ...makeHeader("vr-1"), inputRefs: runId ? [{ type: "VerificationRun", id: runId }] : [] },
    verificationPlanRef: { type: "VerificationPlan", id: planId },
    status,
    summary: summary ?? { total: 3, passed: 3, failed: 0, skipped: 0, notRun: 0 },
  };
}

function makeBaseConfig(overrides = {}) {
  return {
    enabled: true,
    repository: "drewlittrell/rekon",
    headSha: "deadbeefcafebabe",
    runUrl: "https://github.com/drewlittrell/rekon/actions/runs/1",
    ...overrides,
  };
}

function makeBasePayloadInput(overrides = {}) {
  return {
    config: makeBaseConfig(),
    verificationResult: makeResult({ status: "passed", runId: "vrun-1" }),
    verificationResultRef: { type: "VerificationResult", id: "vr-1" },
    verificationRun: { header: { ...makeHeader("vrun-1"), type: "VerificationRun" }, status: "completed" },
    verificationRunRef: { type: "VerificationRun", id: "vrun-1" },
    verificationPlanRef: { type: "VerificationPlan", id: "vp-1" },
    proofReportRef: { type: "Publication", id: "pub-proof" },
    architectureSummaryRef: { type: "Publication", id: "pub-arch" },
    agentContractRef: { type: "Publication", id: "pub-agent" },
    artifactsValid: true,
    ...overrides,
  };
}

// ---------- payload conclusion mapping ----------

test("passed + fresh proof maps to conclusion: success", () => {
  const payload = buildGitHubCheckPayload(makeBasePayloadInput());
  assert.equal(payload.conclusion, "success");
  assert.equal(payload.status, "completed");
  assert.equal(payload.name, GITHUB_CHECK_PUBLISHER_DEFAULT_NAME);
  assert.equal(payload.headSha, "deadbeefcafebabe");
  assert.match(payload.output.title, /passed/i);
});

test("failed proof maps to conclusion: failure", () => {
  const input = makeBasePayloadInput({
    verificationResult: makeResult({ status: "failed", runId: "vrun-1" }),
  });
  const payload = buildGitHubCheckPayload(input);
  assert.equal(payload.conclusion, "failure");
  assert.match(payload.output.title, /failed/i);
});

test("partial proof maps to conclusion: action_required", () => {
  const input = makeBasePayloadInput({
    verificationResult: makeResult({ status: "partial", runId: "vrun-1" }),
  });
  const payload = buildGitHubCheckPayload(input);
  assert.equal(payload.conclusion, "action_required");
  assert.match(payload.output.title, /partial/i);
});

test("not-run proof maps to conclusion: neutral", () => {
  const input = makeBasePayloadInput({
    verificationResult: makeResult({ status: "not-run" }),
    verificationRun: undefined,
    verificationRunRef: undefined,
  });
  const payload = buildGitHubCheckPayload(input);
  assert.equal(payload.conclusion, "neutral");
  assert.match(payload.output.title, /not run|neutral/i);
});

test("timeout run maps to conclusion: timed_out", () => {
  const input = makeBasePayloadInput({
    verificationResult: makeResult({ status: "failed", runId: "vrun-1" }),
    verificationRun: { header: { ...makeHeader("vrun-1"), type: "VerificationRun" }, status: "timeout" },
  });
  const payload = buildGitHubCheckPayload(input);
  assert.equal(payload.conclusion, "timed_out");
});

test("killed run maps to conclusion: failure", () => {
  const input = makeBasePayloadInput({
    verificationResult: makeResult({ status: "failed", runId: "vrun-1" }),
    verificationRun: { header: { ...makeHeader("vrun-1"), type: "VerificationRun" }, status: "killed" },
  });
  const payload = buildGitHubCheckPayload(input);
  assert.equal(payload.conclusion, "failure");
});

test("stale proof maps to conclusion: action_required", () => {
  // Result cites a different plan than the latest plan ref.
  const input = makeBasePayloadInput({
    verificationResult: makeResult({ status: "passed", planId: "vp-old", runId: "vrun-1" }),
    verificationPlanRef: { type: "VerificationPlan", id: "vp-current" },
  });
  const payload = buildGitHubCheckPayload(input);
  assert.equal(payload.conclusion, "action_required");
});

test("missing proof maps to conclusion: action_required", () => {
  const input = makeBasePayloadInput({
    verificationResult: undefined,
    verificationResultRef: undefined,
  });
  const payload = buildGitHubCheckPayload(input);
  assert.equal(payload.conclusion, "action_required");
});

test("artifactsValid: false overrides everything to failure", () => {
  const input = makeBasePayloadInput({
    // Even with a clean passing fresh result, artifacts-invalid wins.
    artifactsValid: false,
  });
  const payload = buildGitHubCheckPayload(input);
  assert.equal(payload.conclusion, "failure");
});

test("proof-chain warnings downgrade a passing proof to action_required", () => {
  const payload = buildGitHubCheckPayload(makeBasePayloadInput({
    proofChainWarnings: ["VerificationRun missing-run is not present in the artifact index."],
  }));

  assert.equal(payload.conclusion, "action_required");
  assert.match(payload.output.title, /proof chain warning/i);
  assert.match(payload.output.summary, /Proof-chain warnings:/);
  assert.match(payload.output.summary, /missing-run/);
});

// ---------- summary content ----------

test("summary includes the canonical-truth reminder", () => {
  const payload = buildGitHubCheckPayload(makeBasePayloadInput());
  assert.ok(
    payload.output.summary.includes(GITHUB_CHECK_PUBLISHER_CANONICAL_TRUTH_REMINDER),
    `expected summary to include the canonical-truth reminder, got:\n${payload.output.summary}`,
  );
  assert.match(payload.output.summary, /GitHub status is not canonical truth/);
});

test("summary cites VerificationResult / Run / Publication refs when present", () => {
  const payload = buildGitHubCheckPayload(makeBasePayloadInput());
  assert.match(payload.output.summary, /VerificationResult:\s*`VerificationResult:vr-1`/);
  assert.match(payload.output.summary, /VerificationRun:\s*`VerificationRun:vrun-1`/);
  assert.match(payload.output.summary, /Proof report:\s*`Publication:pub-proof`/);
  assert.match(payload.output.summary, /Architecture summary:\s*`Publication:pub-arch`/);
  assert.match(payload.output.summary, /Agent contract:\s*`Publication:pub-agent`/);
  // citedRefs surfaces the same refs for callers without re-parsing.
  const types = payload.citedRefs.map((ref) => ref.type);
  assert.ok(types.includes("VerificationResult"));
  assert.ok(types.includes("VerificationRun"));
  assert.ok(types.includes("Publication"));
});

test("summary states artifacts-valid status", () => {
  const valid = buildGitHubCheckPayload(makeBasePayloadInput({ artifactsValid: true }));
  assert.match(valid.output.summary, /Artifacts valid:\s*`true`/);
  const invalid = buildGitHubCheckPayload(makeBasePayloadInput({ artifactsValid: false }));
  assert.match(invalid.output.summary, /Artifacts valid:\s*`false`/);
  const unknown = buildGitHubCheckPayload(makeBasePayloadInput({ artifactsValid: undefined }));
  assert.match(unknown.output.summary, /Artifacts valid:\s*`not asserted`/);
});

// ---------- readiness gating ----------

function makeReadinessInput(overrides = {}) {
  return {
    env: {
      REKON_GITHUB_CHECKS: "1",
      GITHUB_TOKEN: "ghs_token",
      GITHUB_REPOSITORY: "drewlittrell/rekon",
      GITHUB_SHA: "deadbeefcafebabe",
      ...(overrides.env ?? {}),
    },
    event: overrides.event ?? { name: "workflow_dispatch" },
    forkOverride: overrides.forkOverride,
    writePermissionConfirmed:
      overrides.writePermissionConfirmed === undefined ? true : overrides.writePermissionConfirmed,
    headShaOverride: overrides.headShaOverride,
  };
}

test("readiness fails when REKON_GITHUB_CHECKS is absent", () => {
  const report = assessGitHubCheckPublisherReadiness(
    makeReadinessInput({ env: { REKON_GITHUB_CHECKS: undefined } }),
  );
  assert.equal(report.ready, false);
  assert.ok(report.issues.some((issue) => issue.code === "not-enabled"));
});

test("readiness fails when GITHUB_TOKEN is absent", () => {
  const report = assessGitHubCheckPublisherReadiness(
    makeReadinessInput({ env: { GITHUB_TOKEN: undefined } }),
  );
  assert.equal(report.ready, false);
  assert.ok(report.issues.some((issue) => issue.code === "missing-token"));
});

test("readiness fails when GITHUB_REPOSITORY is absent", () => {
  const report = assessGitHubCheckPublisherReadiness(
    makeReadinessInput({ env: { GITHUB_REPOSITORY: undefined } }),
  );
  assert.equal(report.ready, false);
  assert.ok(report.issues.some((issue) => issue.code === "missing-repository"));
});

test("readiness fails when head SHA is absent", () => {
  const report = assessGitHubCheckPublisherReadiness(
    makeReadinessInput({ env: { GITHUB_SHA: undefined } }),
  );
  assert.equal(report.ready, false);
  assert.ok(report.issues.some((issue) => issue.code === "missing-sha"));
});

test("readiness fails for forked pull_request by default", () => {
  const report = assessGitHubCheckPublisherReadiness(
    makeReadinessInput({ event: { name: "pull_request", pullRequestIsFork: true } }),
  );
  assert.equal(report.ready, false);
  assert.ok(report.issues.some((issue) => issue.code === "untrusted-event"));
});

test("readiness rejects pull_request_target even with forkOverride", () => {
  const report = assessGitHubCheckPublisherReadiness(
    makeReadinessInput({
      event: { name: "pull_request_target" },
      forkOverride: true,
    }),
  );
  assert.equal(report.ready, false);
  assert.ok(report.issues.some((issue) => issue.code === "untrusted-event"));
});

test("readiness fails when writePermissionConfirmed is not set", () => {
  const report = assessGitHubCheckPublisherReadiness(
    makeReadinessInput({ writePermissionConfirmed: false }),
  );
  assert.equal(report.ready, false);
  assert.ok(report.issues.some((issue) => issue.code === "write-permission-not-confirmed"));
});

test("readiness passes for workflow_dispatch with all gates green", () => {
  const report = assessGitHubCheckPublisherReadiness(makeReadinessInput());
  assert.equal(report.ready, true, `expected ready, got issues: ${JSON.stringify(report.issues)}`);
  assert.equal(report.issues.length, 0);
});

test("readiness passes for push with all gates green", () => {
  const report = assessGitHubCheckPublisherReadiness(
    makeReadinessInput({ event: { name: "push" } }),
  );
  assert.equal(report.ready, true);
});

test("readiness passes for same-repo pull_request with explicit head SHA + all gates green", () => {
  // Trust-boundary hardening (step 9, fix #6): `pull_request`
  // events require an explicit head SHA — GITHUB_SHA on
  // pull_request is the merge commit, not the PR head.
  const report = assessGitHubCheckPublisherReadiness(
    makeReadinessInput({
      event: { name: "pull_request", pullRequestIsFork: false },
      headShaOverride: "feedface00000000000000000000000000000001",
    }),
  );
  assert.equal(report.ready, true);
});

test("readiness rejects pull_request without an explicit head SHA", () => {
  // Trust-boundary hardening (step 9, fix #6).
  const report = assessGitHubCheckPublisherReadiness(
    makeReadinessInput({ event: { name: "pull_request", pullRequestIsFork: false } }),
  );
  assert.equal(report.ready, false);
  assert.ok(report.issues.some((issue) => issue.code === "missing-pr-head-sha"));
});

test("readiness allows fork with explicit forkOverride and head SHA", () => {
  const report = assessGitHubCheckPublisherReadiness(
    makeReadinessInput({
      event: { name: "pull_request", pullRequestIsFork: true },
      forkOverride: true,
      headShaOverride: "feedface00000000000000000000000000000002",
    }),
  );
  assert.equal(report.ready, true);
});

// ---------- read-only / network-free invariant ----------
//
// The skeleton's pure helpers (`buildGitHubCheckPayload` and
// `assessGitHubCheckPublisherReadiness`) must never import a
// third-party network client or pull in GitHub SDKs. Step 6c
// added `publishGitHubCheckRun`, which uses Node's built-in
// `fetch` (no third-party dependency). The invariant for the
// skeleton is therefore narrower than "no fetch in the file":
// only forbidden THIRD-PARTY network clients / GitHub SDKs.
//
// The send-mode contract test
// (`github-check-publisher-send-cli.test.mjs`) scans the CLI
// source separately to prove `fetch` and `process.env.GITHUB_TOKEN`
// reads stay inside the `--send` branch.

test("the skeleton module imports no third-party network client or GitHub SDK", async () => {
  const sourcePath = resolve(repoRoot, "packages/capability-docs/src/index.ts");
  const source = await readFile(sourcePath, "utf8");

  // Strip comments + string literals so the scan only catches
  // real code references (comments may discuss forbidden names
  // without using them).
  let code = source.replace(/\/\*[\s\S]*?\*\//g, "");
  code = code.replace(/\/\/[^\n]*/g, "");
  code = code.replace(/`(?:\\.|[^`\\])*`/g, "``");
  code = code.replace(/'(?:\\.|[^'\\])*'/g, "''");
  code = code.replace(/"(?:\\.|[^"\\])*"/g, '""');

  // Only third-party modules; built-in `fetch` is allowed for the
  // step-6c `publishGitHubCheckRun` helper.
  for (const moduleSpec of [
    "@octokit/",
    "@actions/github",
    "octokit",
    "node-fetch",
    "axios",
    "undici",
  ]) {
    const escaped = moduleSpec.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const importRegex = new RegExp(`from\\s+["']${escaped}|require\\s*\\(\\s*["']${escaped}`);
    assert.equal(
      importRegex.test(code),
      false,
      `capability-docs must not import ${moduleSpec} (would imply a third-party network client landed)`,
    );
  }

  // `got` only as an import; the word appears in legitimate
  // English text elsewhere.
  assert.equal(
    /from\s+["']got["']|require\s*\(\s*["']got["']\)/.test(code),
    false,
    "capability-docs must not import the `got` HTTP client",
  );

  // Direct call-sites of low-level network primitives stay
  // forbidden in the skeleton. The send helper uses Node's
  // built-in `fetch`, which is permitted; raw `http.request` /
  // `https.request` and `new Request(` are not.
  for (const pattern of [
    /https\s*\.\s*request\s*\(/,
    /http\s*\.\s*request\s*\(/,
    /new\s+Request\s*\(/,
  ]) {
    assert.equal(
      pattern.test(code),
      false,
      `capability-docs must not match ${pattern} (would imply a manual low-level request handler instead of fetch)`,
    );
  }
});

test("readEnvFlag accepts 1 and true (case-insensitive)", () => {
  const ready1 = assessGitHubCheckPublisherReadiness(
    makeReadinessInput({ env: { REKON_GITHUB_CHECKS: "1" } }),
  );
  assert.equal(ready1.ready, true);
  const readyTrue = assessGitHubCheckPublisherReadiness(
    makeReadinessInput({ env: { REKON_GITHUB_CHECKS: "true" } }),
  );
  assert.equal(readyTrue.ready, true);
  const readyTRUE = assessGitHubCheckPublisherReadiness(
    makeReadinessInput({ env: { REKON_GITHUB_CHECKS: "TRUE" } }),
  );
  assert.equal(readyTRUE.ready, true);
  const readyNo = assessGitHubCheckPublisherReadiness(
    makeReadinessInput({ env: { REKON_GITHUB_CHECKS: "no" } }),
  );
  assert.equal(readyNo.ready, false);
});
