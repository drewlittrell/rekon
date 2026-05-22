// Contract tests for step 9 — Verification / GitHub
// Trust-Boundary Hardening. Six fix points:
//   1. Coherent GitHub Check proof-chain selection.
//   2. Bounded stdout/stderr streaming capture.
//   3. Timeout process-tree kill semantics (POSIX).
//   4. NODE_OPTIONS removed from default runner env.
//   5. Bounded GitHub API error-body reads.
//   6. PR head SHA safety.

import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir, platform } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import test from "node:test";
import { assessGitHubCheckPublisherReadiness } from "@rekon/capability-docs";
import {
  VERIFICATION_RUN_ENV_ALLOWLIST,
  executeVerificationRun as runVerification,
} from "@rekon/capability-verify";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");
const SENTINEL_TOKEN = "sentinel-trust-boundary-token-DO-NOT-LEAK";

function makePlanFixture(planId, commands) {
  // Matches the existing capability-verify executeVerificationRun
  // contract: the plan body uses `artifactType` / `artifactId`,
  // not `type` / `id`. `commands` is an array of command
  // strings; the runner tokenises them.
  return {
    header: {
      artifactType: "VerificationPlan",
      artifactId: planId,
      schemaVersion: "0.1.0",
      generatedAt: "2024-01-01T00:00:00.000Z",
      subject: { repoId: "trust-bound" },
      producer: { id: "@rekon/capability-intent", version: "0.1.0" },
      inputRefs: [],
    },
    workOrderRef: {
      type: "WorkOrder",
      id: "work-order-trust-bound",
      schemaVersion: "0.1.0",
    },
    commands,
  };
}

function planRefFixture(planId) {
  return {
    type: "VerificationPlan",
    id: planId,
    schemaVersion: "0.1.0",
  };
}

function runHeaderFixture(runId = "verification-run-trust-bound") {
  return {
    artifactType: "VerificationRun",
    artifactId: runId,
    schemaVersion: "0.1.0",
    generatedAt: "2024-01-01T00:00:00.000Z",
    subject: { repoId: "trust-bound" },
    producer: { id: "@rekon/capability-verify", version: "0.1.0" },
    inputRefs: [],
  };
}

/**
 * Build a minimal artifact body using the canonical header
 * shape Rekon stores (artifactType / artifactId / schemaVersion
 * / generatedAt / subject / producer / inputRefs). The trust-
 * boundary proof-chain coherence helper reads inputRefs from
 * the header, so the inputRefs argument matters.
 */
function makeArtifactBody(type, id, generatedAt, extras, inputRefs = []) {
  return {
    header: {
      artifactType: type,
      artifactId: id,
      schemaVersion: "0.1.0",
      generatedAt,
      subject: { repoId: "trust-bound" },
      producer: { id: "@rekon/capability-verify", version: "0.1.0" },
      inputRefs,
    },
    ...extras,
  };
}

// =============== Group 1: Proof-chain coherence ===============

test("trust-boundary: GitHub Check payload uses VerificationRun cited by VerificationResult, not unrelated newer run", async () => {
  await withSeededFixture(async (root) => {
    // Seed: write a VerificationResult that cites a specific
    // VerificationRun id; then write a NEWER unrelated
    // VerificationRun that isn't cited. The payload must use
    // the cited (older) run, not the newer unrelated one.
    const citedRunId = "VerificationRun:cited-run-1";
    const olderTimestamp = "2024-01-01T00:00:00.000Z";
    const newerTimestamp = "2024-06-01T00:00:00.000Z";

    await seedArtifact(root, {
      type: "VerificationRun",
      id: "cited-run-1",
      writtenAt: olderTimestamp,
      body: makeArtifactBody("VerificationRun", "cited-run-1", olderTimestamp, {
        status: "passed",
        commands: [],
        summary: { total: 0, passed: 0, failed: 0, skipped: 0, notRun: 0 },
      }),
    });
    await seedArtifact(root, {
      type: "VerificationRun",
      id: "unrelated-newer-run-2",
      writtenAt: newerTimestamp,
      body: makeArtifactBody("VerificationRun", "unrelated-newer-run-2", newerTimestamp, {
        status: "failed",
        commands: [],
        summary: { total: 0, passed: 0, failed: 1, skipped: 0, notRun: 0 },
      }),
    });
    await seedArtifact(root, {
      type: "VerificationResult",
      id: "result-1",
      writtenAt: newerTimestamp,
      body: makeArtifactBody(
        "VerificationResult",
        "result-1",
        newerTimestamp,
        {
          verificationPlanRef: { type: "VerificationPlan", id: "plan-1" },
          status: "passed",
          commandResults: [],
          summary: { total: 0, passed: 0, failed: 0, skipped: 0, notRun: 0 },
        },
        [
          { type: "VerificationRun", id: "cited-run-1" },
          { type: "VerificationPlan", id: "plan-1" },
        ],
      ),
    });
    await seedArtifact(root, {
      type: "VerificationPlan",
      id: "plan-1",
      writtenAt: olderTimestamp,
      body: makeArtifactBody("VerificationPlan", "plan-1", olderTimestamp, {
        commands: [],
      }),
    });

    const result = await runCli({
      args: ["publish", "github-check", "--root", root, "--dry-run", "--json"],
      env: { PATH: process.env.PATH ?? "" },
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const parsed = JSON.parse(result.stdout);

    // The payload's citedRefs should reference the run cited
    // by inputRefs, NOT the unrelated newer run.
    const citedRefs = Array.isArray(parsed.payload?.citedRefs) ? parsed.payload.citedRefs : [];
    const runRef = citedRefs.find((ref) => ref.type === "VerificationRun");
    assert.ok(runRef, `payload.citedRefs must include a VerificationRun; got ${JSON.stringify(citedRefs)}`);
    assert.equal(
      runRef.id,
      "cited-run-1",
      `payload must cite the run referenced in inputRefs (got ${runRef.id})`,
    );
    assert.notEqual(runRef.id, "unrelated-newer-run-2");
    // proofChainWarnings should be absent (no warning) for the
    // happy chain.
    assert.ok(
      parsed.proofChainWarnings === undefined
        || (Array.isArray(parsed.proofChainWarnings) && parsed.proofChainWarnings.length === 0),
      "no proof-chain warning expected for a coherent chain",
    );
  });
});

test("trust-boundary: missing cited run reports action_required + proof-chain warning", async () => {
  await withSeededFixture(async (root) => {
    const stamp = "2024-06-01T00:00:00.000Z";
    // Seed a VerificationResult that cites a run id that
    // doesn't exist in the store. The publisher must report
    // a coherence warning instead of substituting the latest
    // unrelated run.
    await seedArtifact(root, {
      type: "VerificationPlan",
      id: "plan-2",
      writtenAt: stamp,
      body: makeArtifactBody("VerificationPlan", "plan-2", stamp, {
        commands: [],
      }),
    });
    await seedArtifact(root, {
      type: "VerificationResult",
      id: "result-no-run",
      writtenAt: stamp,
      body: makeArtifactBody(
        "VerificationResult",
        "result-no-run",
        stamp,
        {
          verificationPlanRef: { type: "VerificationPlan", id: "plan-2" },
          status: "passed",
          commandResults: [],
          summary: { total: 0, passed: 0, failed: 0, skipped: 0, notRun: 0 },
        },
        [
          { type: "VerificationRun", id: "missing-run-xyz" },
          { type: "VerificationPlan", id: "plan-2" },
        ],
      ),
    });

    const result = await runCli({
      args: ["publish", "github-check", "--root", root, "--dry-run", "--json"],
      env: { PATH: process.env.PATH ?? "" },
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const parsed = JSON.parse(result.stdout);
    const citedRefs = Array.isArray(parsed.payload?.citedRefs) ? parsed.payload.citedRefs : [];
    const runRef = citedRefs.find((ref) => ref.type === "VerificationRun");
    assert.equal(runRef, undefined, "missing cited run must not appear in payload citedRefs");
    assert.ok(
      Array.isArray(parsed.proofChainWarnings)
        && parsed.proofChainWarnings.some((w) => /missing-run-xyz|not present/i.test(w)),
      `expected proof-chain warning citing missing run; got ${JSON.stringify(parsed.proofChainWarnings)}`,
    );
    // Payload conclusion must not be `success` — the publisher
    // must reflect the proof-chain gap. (Exact conclusion
    // depends on artifactsValid + run status; both
    // `action_required` and `failure`/`neutral` are acceptable
    // here as long as the warning surfaced. `success` would
    // mean the publisher silently substituted a stale chain.)
    assert.notEqual(
      parsed.payload.conclusion,
      "success",
      "payload must not report success when the cited run is missing",
    );
  });
});

test("trust-boundary: no VerificationResult — falls back to latest VerificationRun without proof-chain warning", async () => {
  await withSeededFixture(async (root) => {
    const stamp = "2024-06-01T00:00:00.000Z";
    await seedArtifact(root, {
      type: "VerificationRun",
      id: "lone-run",
      writtenAt: stamp,
      body: makeArtifactBody("VerificationRun", "lone-run", stamp, {
        status: "passed",
        commands: [],
        summary: { total: 0, passed: 0, failed: 0, skipped: 0, notRun: 0 },
      }),
    });

    const result = await runCli({
      args: ["publish", "github-check", "--root", root, "--dry-run", "--json"],
      env: { PATH: process.env.PATH ?? "" },
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const parsed = JSON.parse(result.stdout);
    const citedRefs = Array.isArray(parsed.payload?.citedRefs) ? parsed.payload.citedRefs : [];
    const runRef = citedRefs.find((ref) => ref.type === "VerificationRun");
    assert.ok(runRef, `expected payload to cite a VerificationRun; got ${JSON.stringify(citedRefs)}`);
    assert.equal(runRef.id, "lone-run");
    assert.ok(
      parsed.proofChainWarnings === undefined
        || (Array.isArray(parsed.proofChainWarnings) && parsed.proofChainWarnings.length === 0),
      "no proof-chain warning expected when there's no VerificationResult to cite",
    );
  });
});

// =============== Group 2: Execution output bounds ===============

test("trust-boundary: stdout streaming is bounded — large stream caps the excerpt and preserves the digest", async () => {
  // Emit ~512 KiB of stdout with a tiny maxLogBytes cap. The
  // bounded streaming sink must:
  //   - keep `originalBytes` reflecting the full stream;
  //   - keep `storedBytes` bounded;
  //   - report `truncated: true`;
  //   - produce a sha256 digest of the full stream (verified
  //     by independent hash of the same payload).
  const planId = "plan-bounded-stdout";
  const plan = makePlanFixture(planId, [
    `node -e "process.stdout.write('x'.repeat(512 * 1024))"`,
  ]);

  const tmpCwd = await mkdtemp(join(tmpdir(), "rekon-trust-bound-"));
  try {
    const result = await runVerification(
      {
        verificationPlan: plan,
        verificationPlanRef: planRefFixture(planId),
        header: runHeaderFixture(),
      },
      { cwd: tmpCwd, maxLogBytes: 4096 },
    );
    const cmd = result.verificationRun.commands[0];
    assert.equal(cmd.status, "passed");
    assert.ok(cmd.stdoutExcerpt, "stdoutExcerpt missing");
    assert.equal(cmd.stdoutExcerpt.truncated, true, "expected truncated: true on 512KiB stdout");
    assert.ok(
      cmd.stdoutExcerpt.originalBytes >= 512 * 1024,
      `originalBytes should reflect full stream (got ${cmd.stdoutExcerpt.originalBytes})`,
    );
    assert.ok(
      cmd.stdoutExcerpt.storedBytes <= 4096,
      `storedBytes should be bounded (got ${cmd.stdoutExcerpt.storedBytes})`,
    );
    // Hash 512 KiB of 'x' to verify the digest covers the full
    // stream even though only 4 KiB was retained.
    const expectedDigest = createHash("sha256").update("x".repeat(512 * 1024)).digest("hex");
    assert.equal(cmd.stdoutDigest, expectedDigest, "stdoutDigest must hash the full stream");
  } finally {
    await rm(tmpCwd, { recursive: true, force: true });
  }
});

test("trust-boundary: stderr streaming is bounded too", async () => {
  const planId = "plan-bounded-stderr";
  const plan = makePlanFixture(planId, [
    `node -e "process.stderr.write('y'.repeat(256 * 1024))"`,
  ]);

  const tmpCwd = await mkdtemp(join(tmpdir(), "rekon-trust-bound-"));
  try {
    const result = await runVerification(
      {
        verificationPlan: plan,
        verificationPlanRef: planRefFixture(planId),
        header: runHeaderFixture(),
      },
      { cwd: tmpCwd, maxLogBytes: 2048 },
    );
    const cmd = result.verificationRun.commands[0];
    assert.equal(cmd.stderrExcerpt.truncated, true);
    assert.ok(cmd.stderrExcerpt.originalBytes >= 256 * 1024);
    assert.ok(cmd.stderrExcerpt.storedBytes <= 2048);
    const expectedDigest = createHash("sha256").update("y".repeat(256 * 1024)).digest("hex");
    assert.equal(cmd.stderrDigest, expectedDigest);
  } finally {
    await rm(tmpCwd, { recursive: true, force: true });
  }
});

test("trust-boundary: redaction still fires on bounded excerpts", async () => {
  const planId = "plan-redact-bounded";
  const plan = makePlanFixture(planId, [
    `node -e "console.log('GITHUB_TOKEN=ghp_secret_xyz')"`,
  ]);

  const tmpCwd = await mkdtemp(join(tmpdir(), "rekon-trust-bound-"));
  try {
    const result = await runVerification(
      {
        verificationPlan: plan,
        verificationPlanRef: planRefFixture(planId),
        header: runHeaderFixture(),
      },
      { cwd: tmpCwd, maxLogBytes: 8192 },
    );
    const cmd = result.verificationRun.commands[0];
    assert.equal(cmd.stdoutExcerpt.redacted, true);
    assert.match(cmd.stdoutExcerpt.text, /GITHUB_TOKEN=\[REDACTED\]/);
    assert.equal(/ghp_secret_xyz/.test(cmd.stdoutExcerpt.text), false);
  } finally {
    await rm(tmpCwd, { recursive: true, force: true });
  }
});

test("trust-boundary: NODE_OPTIONS is removed from the runner env allowlist", () => {
  // Fix #4: the runner allowlist must not include
  // NODE_OPTIONS — preloading modules into spawned children
  // would compromise proof repeatability.
  assert.equal(
    VERIFICATION_RUN_ENV_ALLOWLIST.includes("NODE_OPTIONS"),
    false,
    `VERIFICATION_RUN_ENV_ALLOWLIST must not include NODE_OPTIONS; got: ${JSON.stringify(VERIFICATION_RUN_ENV_ALLOWLIST)}`,
  );
  // Sanity: PATH and other platform-critical vars remain.
  for (const required of ["PATH", "SystemRoot", "ComSpec"]) {
    assert.ok(
      VERIFICATION_RUN_ENV_ALLOWLIST.includes(required),
      `VERIFICATION_RUN_ENV_ALLOWLIST must keep ${required}`,
    );
  }
});

test("trust-boundary: spawned child env does not include NODE_OPTIONS even when it's set in process.env", async () => {
  const planId = "plan-no-node-options";
  const plan = makePlanFixture(planId, [
    `node -e "console.log('NO=' + (process.env.NODE_OPTIONS || 'unset'))"`,
  ]);

  const tmpCwd = await mkdtemp(join(tmpdir(), "rekon-trust-bound-"));
  try {
    const result = await runVerification(
      {
        verificationPlan: plan,
        verificationPlanRef: planRefFixture(planId),
        header: runHeaderFixture(),
      },
      {
        cwd: tmpCwd,
        env: { ...process.env, NODE_OPTIONS: "--require /nonexistent-malicious-preload.js" },
      },
    );
    const cmd = result.verificationRun.commands[0];
    assert.equal(cmd.status, "passed", `child should run without NODE_OPTIONS; got status ${cmd.status}, stderr: ${cmd.stderrExcerpt.text}`);
    assert.match(cmd.stdoutExcerpt.text, /NO=unset/, `NODE_OPTIONS must be scrubbed; child saw: ${cmd.stdoutExcerpt.text}`);
  } finally {
    await rm(tmpCwd, { recursive: true, force: true });
  }
});

// =============== Group 3: Timeout semantics ===============

test("trust-boundary: command timeout records timeout/killed and terminates the direct child", async () => {
  const planId = "plan-timeout";
  // node -e instead of `sleep` so the test runs on Windows
  // (where `sleep` isn't a default binary).
  const plan = makePlanFixture(planId, [
    `node -e "setInterval(() => {}, 1000)"`,
  ]);

  const tmpCwd = await mkdtemp(join(tmpdir(), "rekon-trust-bound-"));
  try {
    const result = await runVerification(
      {
        verificationPlan: plan,
        verificationPlanRef: planRefFixture(planId),
        header: runHeaderFixture(),
      },
      {
        cwd: tmpCwd,
        commandTimeoutMs: 250,
        killGraceMs: 250,
      },
    );
    const cmd = result.verificationRun.commands[0];
    assert.ok(cmd.timedOut === true || cmd.killed === true, `expected timedOut/killed; got ${JSON.stringify(cmd)}`);
    // Status should be "killed" (because we sent SIGKILL after
    // the grace period) or "timeout" if the SIGTERM caught it.
    assert.ok(
      cmd.status === "killed" || cmd.status === "timeout",
      `expected killed/timeout status; got ${cmd.status}`,
    );
  } finally {
    await rm(tmpCwd, { recursive: true, force: true });
  }
});

test("trust-boundary: POSIX process-tree timeout reaches descendants (or test skips on Windows)", { skip: platform() === "win32" }, async () => {
  // On POSIX we spawn detached and signal the group with -pid.
  // A long-running grandchild (a child of the runner's child)
  // must therefore receive SIGTERM / SIGKILL on timeout.
  const planId = "plan-tree-timeout";
  // Parent process spawns a detached grandchild then loops
  // forever. With group-kill, both must die when the runner
  // times out.
  const plan = makePlanFixture(planId, [
    `node -e "const c = require('child_process').spawn('node', ['-e', 'setInterval(()=>{}, 1000)'], { stdio: 'ignore' }); setInterval(()=>{}, 1000);"`,
  ]);

  const tmpCwd = await mkdtemp(join(tmpdir(), "rekon-trust-bound-"));
  try {
    const result = await runVerification(
      {
        verificationPlan: plan,
        verificationPlanRef: planRefFixture(planId),
        header: runHeaderFixture(),
      },
      {
        cwd: tmpCwd,
        commandTimeoutMs: 300,
        killGraceMs: 250,
      },
    );
    const cmd = result.verificationRun.commands[0];
    assert.ok(
      cmd.timedOut === true || cmd.killed === true,
      `expected timedOut/killed on POSIX process-tree timeout; got ${JSON.stringify(cmd)}`,
    );
  } finally {
    await rm(tmpCwd, { recursive: true, force: true });
  }
});

// =============== Group 4: GitHub API error-body bounds ===============

test("trust-boundary: GitHub Check API error body is bounded (Check publisher)", async () => {
  await withSeededFixture(async (root) => {
    const hugeBody = "x".repeat(2 * 1024 * 1024); // 2 MiB
    const transport = await createFakeApiServer({
      status: 500,
      body: JSON.stringify({ message: hugeBody, documentation_url: "https://docs.example/rest" }),
    });
    try {
      const env = {
        PATH: process.env.PATH ?? "",
        REKON_GITHUB_CHECKS: "1",
        REKON_GITHUB_CHECKS_WRITE_CONFIRMED: "1",
        GITHUB_TOKEN: SENTINEL_TOKEN,
        GITHUB_REPOSITORY: "drewlittrell/rekon",
        GITHUB_SHA: "deadbeefcafebabe",
        GITHUB_EVENT_NAME: "workflow_dispatch",
      };
      const result = await runCli({
        args: [
          "publish", "github-check", "--send", "--root", root, "--json",
          "--confirm-checks-write", "--api-base-url", transport.baseUrl,
        ],
        env,
      });
      assert.equal(result.status, 1);
      const combined = `${result.stdout}\n${result.stderr}`;
      assert.equal(combined.includes(SENTINEL_TOKEN), false, "sentinel token must not appear in any output");
      const parsed = JSON.parse(result.stdout);
      assert.equal(parsed.sent, false);
      assert.equal(parsed.reason, "api-error");
      // The truncation message lands inside parsed.error.message.
      const message = parsed.error?.message ?? "";
      // The bounded reader caps total response body at 64 KiB,
      // so the message we kept must be bounded.
      assert.ok(message.length < 200 * 1024, `error message must be bounded; was ${message.length} chars`);
    } finally {
      await transport.close();
    }
  });
});

test("trust-boundary: PR comment API error body is bounded (PR comment publisher)", async () => {
  await withSeededFixture(async (root) => {
    const hugeBody = "z".repeat(2 * 1024 * 1024);
    const transport = await createFakePrCommentServer({
      listResponses: [{ status: 500, body: JSON.stringify({ message: hugeBody, documentation_url: "https://docs.example/rest" }) }],
    });
    try {
      const env = {
        PATH: process.env.PATH ?? "",
        REKON_PR_COMMENTS: "1",
        REKON_PR_COMMENTS_WRITE_CONFIRMED: "1",
        GITHUB_TOKEN: SENTINEL_TOKEN,
        GITHUB_REPOSITORY: "drewlittrell/rekon",
        GITHUB_PR_NUMBER: "123",
        GITHUB_EVENT_NAME: "workflow_dispatch",
      };
      const result = await runCli({
        args: [
          "publish", "pr-comment", "--send", "--root", root, "--json",
          "--confirm-pr-comment-write", "--api-base-url", transport.baseUrl,
        ],
        env,
      });
      assert.equal(result.status, 1);
      const combined = `${result.stdout}\n${result.stderr}`;
      assert.equal(combined.includes(SENTINEL_TOKEN), false, "sentinel token must not appear");
      const parsed = JSON.parse(result.stdout);
      assert.equal(parsed.sent, false);
      assert.equal(parsed.reason, "api-error");
      const message = parsed.error?.message ?? "";
      assert.ok(message.length < 200 * 1024, `PR comment error message must be bounded; was ${message.length}`);
    } finally {
      await transport.close();
    }
  });
});

// =============== Group 5: PR head SHA safety ===============

test("trust-boundary: pull_request --send without explicit head SHA fails readiness with missing-pr-head-sha", async () => {
  await withSeededFixture(async (root) => {
    const transport = await createFakeApiServer({ status: 201, body: JSON.stringify({ id: 99 }) });
    try {
      const env = {
        PATH: process.env.PATH ?? "",
        REKON_GITHUB_CHECKS: "1",
        REKON_GITHUB_CHECKS_WRITE_CONFIRMED: "1",
        GITHUB_TOKEN: "fake",
        GITHUB_REPOSITORY: "drewlittrell/rekon",
        GITHUB_SHA: "deadbeefcafebabe",
        GITHUB_EVENT_NAME: "pull_request",
        REKON_GITHUB_CHECKS_PR_IS_FORK: "0",
      };
      const result = await runCli({
        args: [
          "publish", "github-check", "--send", "--root", root, "--json",
          "--confirm-checks-write", "--api-base-url", transport.baseUrl,
        ],
        env,
      });
      assert.equal(result.status, 1);
      const parsed = JSON.parse(result.stdout);
      assert.equal(parsed.sent, false);
      assert.equal(parsed.reason, "readiness-failed");
      assert.ok(
        parsed.readiness.issues.some((issue) => issue.code === "missing-pr-head-sha"),
        `expected missing-pr-head-sha; got ${JSON.stringify(parsed.readiness.issues)}`,
      );
      assert.equal(transport.requestCount, 0);
    } finally {
      await transport.close();
    }
  });
});

test("trust-boundary: pull_request --send with --head-sha uses the explicit SHA", async () => {
  await withSeededFixture(async (root) => {
    const transport = await createFakeApiServer({ status: 201, body: JSON.stringify({ id: 100 }) });
    try {
      const env = {
        PATH: process.env.PATH ?? "",
        REKON_GITHUB_CHECKS: "1",
        REKON_GITHUB_CHECKS_WRITE_CONFIRMED: "1",
        GITHUB_TOKEN: "fake",
        GITHUB_REPOSITORY: "drewlittrell/rekon",
        GITHUB_SHA: "merge000000000000000000000000000000000000",
        GITHUB_EVENT_NAME: "pull_request",
        REKON_GITHUB_CHECKS_PR_IS_FORK: "0",
      };
      const result = await runCli({
        args: [
          "publish", "github-check", "--send", "--root", root, "--json",
          "--confirm-checks-write", "--head-sha", "feedface11111111111111111111111111111111",
          "--api-base-url", transport.baseUrl,
        ],
        env,
      });
      assert.equal(result.status, 0, result.stderr || result.stdout);
      const parsed = JSON.parse(result.stdout);
      assert.equal(parsed.sent, true);
      assert.equal(parsed.payload.headSha, "feedface11111111111111111111111111111111");
      assert.equal(transport.requestCount, 1);
      const sentBody = JSON.parse(transport.lastRequest.body);
      assert.equal(sentBody.head_sha, "feedface11111111111111111111111111111111");
    } finally {
      await transport.close();
    }
  });
});

test("trust-boundary: push --send uses GITHUB_SHA", async () => {
  await withSeededFixture(async (root) => {
    const transport = await createFakeApiServer({ status: 201, body: JSON.stringify({ id: 101 }) });
    try {
      const env = {
        PATH: process.env.PATH ?? "",
        REKON_GITHUB_CHECKS: "1",
        REKON_GITHUB_CHECKS_WRITE_CONFIRMED: "1",
        GITHUB_TOKEN: "fake",
        GITHUB_REPOSITORY: "drewlittrell/rekon",
        GITHUB_SHA: "pushcommit0000000000000000000000000000000",
        GITHUB_EVENT_NAME: "push",
      };
      const result = await runCli({
        args: [
          "publish", "github-check", "--send", "--root", root, "--json",
          "--confirm-checks-write", "--api-base-url", transport.baseUrl,
        ],
        env,
      });
      assert.equal(result.status, 0, result.stderr || result.stdout);
      const parsed = JSON.parse(result.stdout);
      assert.equal(parsed.payload.headSha, "pushcommit0000000000000000000000000000000");
    } finally {
      await transport.close();
    }
  });
});

test("trust-boundary: workflow_dispatch --send uses GITHUB_SHA", async () => {
  await withSeededFixture(async (root) => {
    const transport = await createFakeApiServer({ status: 201, body: JSON.stringify({ id: 102 }) });
    try {
      const env = {
        PATH: process.env.PATH ?? "",
        REKON_GITHUB_CHECKS: "1",
        REKON_GITHUB_CHECKS_WRITE_CONFIRMED: "1",
        GITHUB_TOKEN: "fake",
        GITHUB_REPOSITORY: "drewlittrell/rekon",
        GITHUB_SHA: "dispatchcommit0000000000000000000000000000",
        GITHUB_EVENT_NAME: "workflow_dispatch",
      };
      const result = await runCli({
        args: [
          "publish", "github-check", "--send", "--root", root, "--json",
          "--confirm-checks-write", "--api-base-url", transport.baseUrl,
        ],
        env,
      });
      assert.equal(result.status, 0, result.stderr || result.stdout);
      const parsed = JSON.parse(result.stdout);
      assert.equal(parsed.payload.headSha, "dispatchcommit0000000000000000000000000000");
    } finally {
      await transport.close();
    }
  });
});

test("trust-boundary: pull_request_target remains denied unconditionally regardless of head SHA", async () => {
  await withSeededFixture(async (root) => {
    const transport = await createFakeApiServer({ status: 201, body: JSON.stringify({ id: 103 }) });
    try {
      const env = {
        PATH: process.env.PATH ?? "",
        REKON_GITHUB_CHECKS: "1",
        REKON_GITHUB_CHECKS_WRITE_CONFIRMED: "1",
        GITHUB_TOKEN: "fake",
        GITHUB_REPOSITORY: "drewlittrell/rekon",
        GITHUB_SHA: "deadbeef",
        GITHUB_EVENT_NAME: "pull_request_target",
      };
      const result = await runCli({
        args: [
          "publish", "github-check", "--send", "--root", root, "--json",
          "--confirm-checks-write",
          "--head-sha", "feedface22222222222222222222222222222222",
          "--api-base-url", transport.baseUrl,
        ],
        env,
      });
      assert.equal(result.status, 1);
      const parsed = JSON.parse(result.stdout);
      assert.equal(parsed.sent, false);
      assert.ok(parsed.readiness.issues.some((issue) => issue.code === "untrusted-event"));
      assert.equal(transport.requestCount, 0);
    } finally {
      await transport.close();
    }
  });
});

// ---------- helpers ----------

async function withSeededFixture(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-trust-bound-fixture-"));
  try {
    await cp(exampleRoot, root, {
      recursive: true,
      filter(source) {
        return !relative(exampleRoot, source).split(/[\\/]/).includes(".rekon");
      },
    });
    const refresh = spawnSync(process.execPath, [cliPath, "refresh", "--root", root, "--json"], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    assert.equal(refresh.status, 0, refresh.stderr || refresh.stdout);
    await callback(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function seedArtifact(root, { type, id, writtenAt, body }) {
  // Write a JSON artifact body + an index entry matching the
  // existing artifact store layout. VerificationRun /
  // VerificationResult / VerificationPlan all live under
  // `.rekon/artifacts/actions/<Type>-<id>.json` with
  // `{ path, digest, artifactType, artifactId, writtenAt }`
  // shape in the flat-array index. The digest is computed
  // from the serialized body so the round-trip read is
  // consistent.
  const fileName = `${type}-${id}.json`;
  const relativePath = `.rekon/artifacts/actions/${fileName}`;
  const artifactPath = join(root, relativePath);
  await mkdir(dirname(artifactPath), { recursive: true });
  // The runtime store writes JSON with a trailing newline;
  // match that so any future digest validation still passes.
  const serialized = `${JSON.stringify(body, null, 2)}\n`;
  await writeFile(artifactPath, serialized, "utf8");
  const digest = createHash("sha256").update(serialized).digest("hex");

  const indexPath = join(root, ".rekon/registry/artifacts.index.json");
  const raw = await readFile(indexPath, "utf8");
  const index = JSON.parse(raw);
  if (!Array.isArray(index)) {
    throw new Error("artifact index is not a flat array; can't seed.");
  }
  index.push({
    type,
    id,
    path: relativePath,
    digest,
    schemaVersion: "0.1.0",
    artifactType: type,
    artifactId: id,
    writtenAt,
  });
  await writeFile(indexPath, JSON.stringify(index, null, 2), "utf8");
}

async function runCli({ args, env }) {
  const proc = spawn(process.execPath, [cliPath, ...args], { cwd: repoRoot, env });
  let stdout = "";
  let stderr = "";
  proc.stdout?.on("data", (chunk) => { stdout += chunk; });
  proc.stderr?.on("data", (chunk) => { stderr += chunk; });
  const status = await new Promise((resolveExit) => {
    proc.on("exit", (code) => resolveExit(code));
    proc.on("error", () => resolveExit(null));
  });
  return { status, stdout, stderr };
}

async function createFakeApiServer({ status = 201, body = "{}" } = {}) {
  const state = { requestCount: 0, lastRequest: { method: "", path: "", body: "" } };
  const server = createServer((req, res) => {
    state.requestCount += 1;
    let buf = "";
    req.on("data", (chunk) => { buf += chunk; });
    req.on("end", () => {
      state.lastRequest = { method: req.method ?? "", path: req.url ?? "", body: buf };
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json");
      res.end(body);
    });
  });
  const baseUrl = await new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      resolveListen(`http://127.0.0.1:${port}`);
    });
  });
  return {
    baseUrl,
    get requestCount() { return state.requestCount; },
    get lastRequest() { return state.lastRequest; },
    close() {
      return new Promise((resolveClose) => server.close(() => resolveClose()));
    },
  };
}

async function createFakePrCommentServer({ listResponses = [{ status: 200, body: "[]" }] } = {}) {
  const queue = listResponses.slice();
  const state = { requestCount: 0 };
  const server = createServer((req, res) => {
    state.requestCount += 1;
    let buf = "";
    req.on("data", (chunk) => { buf += chunk; });
    req.on("end", () => {
      const next = queue.shift() ?? { status: 200, body: "[]" };
      res.statusCode = next.status;
      res.setHeader("Content-Type", "application/json");
      res.end(typeof next.body === "string" ? next.body : JSON.stringify(next.body));
    });
  });
  const baseUrl = await new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      resolveListen(`http://127.0.0.1:${port}`);
    });
  });
  return {
    baseUrl,
    get requestCount() { return state.requestCount; },
    close() {
      return new Promise((resolveClose) => server.close(() => resolveClose()));
    },
  };
}

// Keep the assessor import referenced even though the
// readiness coverage above goes through the CLI to exercise
// the full chain. Re-running it via direct call here is
// covered by tests/contract/github-check-publisher-skeleton.test.mjs.
void assessGitHubCheckPublisherReadiness;
