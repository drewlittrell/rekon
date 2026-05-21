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

test("readiness passes for same-repo pull_request with all gates green", () => {
  const report = assessGitHubCheckPublisherReadiness(
    makeReadinessInput({ event: { name: "pull_request", pullRequestIsFork: false } }),
  );
  assert.equal(report.ready, true);
});

test("readiness allows fork with explicit forkOverride", () => {
  const report = assessGitHubCheckPublisherReadiness(
    makeReadinessInput({
      event: { name: "pull_request", pullRequestIsFork: true },
      forkOverride: true,
    }),
  );
  assert.equal(report.ready, true);
});

// ---------- read-only / network-free invariant ----------

test("the skeleton module imports no network client or GitHub SDK", async () => {
  const sourcePath = resolve(repoRoot, "packages/capability-docs/src/index.ts");
  const source = await readFile(sourcePath, "utf8");
  const forbidden = [
    "@octokit/",
    "octokit",
    "node-fetch",
    "got",
    "axios",
    "undici",
    "https.request",
    "http.request",
    "fetch(",
    "new Request(",
  ];
  for (const token of forbidden) {
    assert.equal(
      source.includes(token),
      false,
      `capability-docs/src/index.ts must not reference ${token} (would imply a network client landed in the skeleton slice)`,
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
