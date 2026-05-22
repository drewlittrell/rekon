// Contract tests for `rekon publish pr-comment --dry-run`
// (step 7b of the CI / GitHub adapter implementation sequence
// pinned by docs/strategy/pr-comment-publisher-decision.md).
//
// The dry-run CLI:
// - never calls the GitHub API,
// - never reads `GITHUB_TOKEN`,
// - never imports a network client,
// - always renders the comment body (even when readiness is
//   `not ready`),
// - always includes the idempotency marker + the canonical-
//   truth reminder.

import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";

import {
  PR_COMMENT_PUBLISHER_CANONICAL_TRUTH_REMINDER,
  PR_COMMENT_PUBLISHER_MARKER,
  assessPrCommentPublisherReadiness,
  buildPrCommentBody,
} from "@rekon/capability-docs";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const cliSourcePath = join(repoRoot, "packages/cli/src/index.ts");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

function makeHeader(type, id) {
  return {
    type,
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
    header: { ...makeHeader("VerificationResult", "vr-1"), inputRefs: runId ? [{ type: "VerificationRun", id: runId }] : [] },
    verificationPlanRef: { type: "VerificationPlan", id: planId },
    status,
    summary: summary ?? { total: 3, passed: 3, failed: 0, skipped: 0, notRun: 0 },
  };
}

// ---------- 1: helper includes idempotency marker ----------

test("buildPrCommentBody includes idempotency marker at the top of the body", () => {
  const body = buildPrCommentBody({
    verificationResult: makeResult({ status: "passed", runId: "vrun-1" }),
    verificationResultRef: { type: "VerificationResult", id: "vr-1" },
    verificationRunRef: { type: "VerificationRun", id: "vrun-1" },
    verificationPlanRef: { type: "VerificationPlan", id: "vp-1" },
    proofReportRef: { type: "Publication", id: "pub-proof" },
    architectureSummaryRef: { type: "Publication", id: "pub-arch" },
    agentContractRef: { type: "Publication", id: "pub-agent" },
    artifactsValid: true,
  });
  assert.equal(body.marker, PR_COMMENT_PUBLISHER_MARKER);
  assert.ok(body.markdown.startsWith(PR_COMMENT_PUBLISHER_MARKER));
});

// ---------- 2: canonical-truth reminder ----------

test("buildPrCommentBody includes the canonical-truth reminder", () => {
  const body = buildPrCommentBody({
    verificationResult: makeResult({ status: "passed", runId: "vrun-1" }),
    verificationResultRef: { type: "VerificationResult", id: "vr-1" },
    verificationPlanRef: { type: "VerificationPlan", id: "vp-1" },
    artifactsValid: true,
  });
  assert.ok(body.markdown.includes(PR_COMMENT_PUBLISHER_CANONICAL_TRUTH_REMINDER));
  assert.match(body.markdown, /GitHub comments are not canonical truth/i);
  assert.match(body.markdown, /Rekon artifacts remain canonical/i);
});

// ---------- 3: cites every supplied ref ----------

test("buildPrCommentBody cites VerificationResult / Run / Plan / proof / architecture / agent-contract refs when present", () => {
  const body = buildPrCommentBody({
    verificationResult: makeResult({ status: "passed", runId: "vrun-1" }),
    verificationResultRef: { type: "VerificationResult", id: "vr-1" },
    verificationRunRef: { type: "VerificationRun", id: "vrun-1" },
    verificationPlanRef: { type: "VerificationPlan", id: "vp-1" },
    proofReportRef: { type: "Publication", id: "pub-proof" },
    architectureSummaryRef: { type: "Publication", id: "pub-arch" },
    agentContractRef: { type: "Publication", id: "pub-agent" },
    artifactsValid: true,
  });
  assert.match(body.markdown, /`VerificationResult:vr-1`/);
  assert.match(body.markdown, /`VerificationRun:vrun-1`/);
  assert.match(body.markdown, /`VerificationPlan:vp-1`/);
  assert.match(body.markdown, /`Publication:pub-proof`/);
  assert.match(body.markdown, /`Publication:pub-arch`/);
  assert.match(body.markdown, /`Publication:pub-agent`/);
  const types = body.citedRefs.map((ref) => ref.type);
  assert.ok(types.includes("VerificationResult"));
  assert.ok(types.includes("VerificationRun"));
  assert.ok(types.includes("VerificationPlan"));
  assert.ok(types.includes("Publication"));
});

// ---------- 4: artifacts validate status surfaced ----------

test("buildPrCommentBody surfaces artifacts-validate status", () => {
  const validTrue = buildPrCommentBody({
    verificationResult: makeResult({ status: "passed", runId: "vrun-1" }),
    verificationResultRef: { type: "VerificationResult", id: "vr-1" },
    verificationPlanRef: { type: "VerificationPlan", id: "vp-1" },
    artifactsValid: true,
  });
  assert.match(validTrue.markdown, /Artifacts valid \| `true`/);

  const validFalse = buildPrCommentBody({
    verificationResult: makeResult({ status: "passed", runId: "vrun-1" }),
    verificationResultRef: { type: "VerificationResult", id: "vr-1" },
    verificationPlanRef: { type: "VerificationPlan", id: "vp-1" },
    artifactsValid: false,
  });
  assert.match(validFalse.markdown, /Artifacts valid \| `false`/);
  assert.match(
    validFalse.markdown,
    /rekon artifacts validate.{0,80}issues/i,
    "artifactsValid: false should add an explicit warning",
  );

  const validUndefined = buildPrCommentBody({
    verificationResult: makeResult({ status: "passed", runId: "vrun-1" }),
    verificationResultRef: { type: "VerificationResult", id: "vr-1" },
    verificationPlanRef: { type: "VerificationPlan", id: "vp-1" },
  });
  assert.match(validUndefined.markdown, /Artifacts valid \| `not asserted`/);
});

// ---------- 5: stale proof warning ----------

test("buildPrCommentBody adds a stale-proof warning when proof is stale", () => {
  const body = buildPrCommentBody({
    // Result cites a different plan than the current latest.
    verificationResult: makeResult({ status: "passed", planId: "vp-old", runId: "vrun-1" }),
    verificationResultRef: { type: "VerificationResult", id: "vr-1" },
    verificationPlanRef: { type: "VerificationPlan", id: "vp-current" },
  });
  assert.equal(body.summary.proofFreshness, "stale");
  assert.match(body.markdown, /Proof is \*\*stale\*\*/i);
  assert.equal(body.summary.hasWarnings, true);
});

// ---------- 6: no stdout/stderr excerpts ----------

test("buildPrCommentBody does not include stdout/stderr excerpts", () => {
  const sentinel = "rekon-stdout-sentinel-9d57d28a";
  const body = buildPrCommentBody({
    verificationResult: {
      ...makeResult({ status: "failed", runId: "vrun-1" }),
      // Pretend a (malformed) result body leaked an `evidenceNotes`
      // field with raw stdout. The helper must not surface it.
      evidenceNotes: [sentinel],
      commandResults: [
        {
          command: "npm test",
          status: "failed",
          stdoutDigest: "sha256:" + "a".repeat(64),
          stderrDigest: "sha256:" + "b".repeat(64),
          notes: sentinel,
        },
      ],
    },
    verificationResultRef: { type: "VerificationResult", id: "vr-1" },
    verificationPlanRef: { type: "VerificationPlan", id: "vp-1" },
    artifactsValid: true,
  });
  assert.equal(
    body.markdown.includes(sentinel),
    false,
    "PR comment body must not include raw stdout / evidenceNotes / notes content",
  );
});

// ---------- 7: no token-looking inputs leak ----------

test("buildPrCommentBody does not include token-looking strings from inputs", () => {
  const sentinel = "ghp_token_sentinel_dead_beef_token";
  // The PR comment helper does not read tokens directly, but
  // if a caller mistakenly passed a token-looking string in
  // any of the artifact-like fields, the body must not echo
  // it. The helper only cites refs, so the sentinel should
  // never appear in the rendered markdown.
  const body = buildPrCommentBody({
    verificationResult: {
      ...makeResult({ status: "passed", runId: "vrun-1" }),
      recordedBy: sentinel,
      evidenceNotes: [sentinel],
    },
    verificationResultRef: { type: "VerificationResult", id: "vr-1" },
    verificationPlanRef: { type: "VerificationPlan", id: "vp-1" },
    artifactsValid: true,
  });
  assert.equal(
    body.markdown.includes(sentinel),
    false,
    "PR comment body must not echo recordedBy / evidenceNotes / arbitrary user-supplied fields",
  );
});

// ---------- 8: readiness not-enabled ----------

test("assessPrCommentPublisherReadiness reports `not-enabled` when REKON_PR_COMMENTS is absent", () => {
  const report = assessPrCommentPublisherReadiness({
    env: {},
    event: { name: "workflow_dispatch" },
    writePermissionConfirmed: true,
  });
  assert.equal(report.ready, false);
  assert.ok(report.issues.some((issue) => issue.code === "not-enabled"));
});

// ---------- 9: readiness rejects pull_request_target ----------

test("assessPrCommentPublisherReadiness rejects pull_request_target unconditionally", () => {
  const report = assessPrCommentPublisherReadiness({
    env: {
      REKON_PR_COMMENTS: "1",
      GITHUB_REPOSITORY: "drewlittrell/rekon",
      GITHUB_PR_NUMBER: "42",
      GITHUB_TOKEN: "fake",
    },
    event: { name: "pull_request_target" },
    writePermissionConfirmed: true,
  });
  assert.equal(report.ready, false);
  assert.ok(report.issues.some((issue) => issue.code === "untrusted-event"));
});

// ---------- 10: readiness rejects forked pull_request by default ----------

test("assessPrCommentPublisherReadiness rejects forked pull_request by default", () => {
  const report = assessPrCommentPublisherReadiness({
    env: {
      REKON_PR_COMMENTS: "1",
      GITHUB_REPOSITORY: "drewlittrell/rekon",
      GITHUB_PR_NUMBER: "42",
      GITHUB_TOKEN: "fake",
    },
    event: { name: "pull_request", pullRequestIsFork: true },
    writePermissionConfirmed: true,
  });
  assert.equal(report.ready, false);
  assert.ok(report.issues.some((issue) => issue.code === "untrusted-event"));
});

// ---------- 11: CLI returns comment + readiness ----------

test("CLI `publish pr-comment --dry-run --json` returns comment body + readiness", async () => {
  await withFixture(async (root) => {
    const result = await runCli({
      args: ["publish", "pr-comment", "--dry-run", "--root", root, "--json"],
      env: { PATH: process.env.PATH ?? "" },
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.kind, "rekon.pr-comment.dry-run");
    assert.equal(parsed.dryRun, true);
    assert.equal(parsed.wouldPublish, false);
    assert.ok(parsed.readiness && typeof parsed.readiness === "object");
    assert.equal(parsed.readiness.ready, false);
    assert.ok(parsed.comment && typeof parsed.comment === "object");
    assert.equal(parsed.comment.marker, "<!-- rekon:pr-comment:v1 -->");
    assert.ok(parsed.comment.markdown.startsWith("<!-- rekon:pr-comment:v1 -->"));
    assert.equal(
      parsed.canonicalTruthReminder,
      "GitHub comments are not canonical truth; Rekon artifacts remain canonical.",
    );
  });
});

// ---------- 12: CLI source has no network-client imports / GitHub calls in the pr-comment branch ----------

test("CLI source's pr-comment branch does not import a network client or call fetch", async () => {
  const raw = await readFile(cliSourcePath, "utf8");
  // The pr-comment branch is bounded by the `command === "publish" &&
  // subcommand === "pr-comment"` block. Extract it and scan the
  // body, not the entire file (the github-check send branch
  // legitimately calls fetch).
  const blockMatch = raw.match(/if \(command === "publish" && subcommand === "pr-comment"\) \{([\s\S]*?)\n  \}\n\n  if \(command === "agent-contract"/);
  assert.ok(blockMatch, "expected to locate the pr-comment branch in the CLI source");
  const block = blockMatch[1];

  // Strip strings + comments from the block to avoid false
  // positives.
  let code = block.replace(/\/\*[\s\S]*?\*\//g, "");
  code = code.replace(/\/\/[^\n]*/g, "");
  code = code.replace(/`(?:\\.|[^`\\])*`/g, "``");
  code = code.replace(/'(?:\\.|[^'\\])*'/g, "''");
  code = code.replace(/"(?:\\.|[^"\\])*"/g, '""');

  for (const pattern of [
    /\bfetch\s*\(/,
    /https\s*\.\s*request\s*\(/,
    /http\s*\.\s*request\s*\(/,
    /new\s+Request\s*\(/,
    /publishGitHubCheckRun\s*\(/,
  ]) {
    assert.equal(
      pattern.test(code),
      false,
      `pr-comment branch must not match ${pattern} (would imply a GitHub API call)`,
    );
  }
});

// ---------- 13: dry-run reads no GITHUB_TOKEN ----------

test("`publish pr-comment --dry-run` does not surface GITHUB_TOKEN even when set", async () => {
  await withFixture(async (root) => {
    const sentinel = "ghp-pr-comment-dry-run-token-d7c5f9aa";
    const result = await runCli({
      args: ["publish", "pr-comment", "--dry-run", "--root", root, "--json"],
      env: {
        PATH: process.env.PATH ?? "",
        GITHUB_TOKEN: sentinel,
        GH_TOKEN: sentinel,
        REKON_PR_COMMENTS: "1",
        GITHUB_REPOSITORY: "drewlittrell/rekon",
        GITHUB_PR_NUMBER: "42",
      },
    });
    assert.equal(result.status, 0);
    assert.equal(result.stdout.includes(sentinel), false);
    assert.equal(result.stderr.includes(sentinel), false);
    const parsed = JSON.parse(result.stdout);
    // The CLI uses an empty env map for readiness in dry-run
    // mode, so the report should still flag missing-token
    // even though the env has GITHUB_TOKEN — the dry-run
    // branch does not consult process.env for tokens.
    const codes = parsed.readiness.issues.map((issue) => issue.code);
    assert.ok(codes.includes("missing-token"));
    assert.ok(codes.includes("not-enabled"));
  });
});

// ---------- 14: refuses missing --dry-run ----------

test("CLI refuses missing --dry-run", async () => {
  await withFixture(async (root) => {
    const result = await runCli({
      args: ["publish", "pr-comment", "--root", root, "--json"],
      env: { PATH: process.env.PATH ?? "" },
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /requires --dry-run/i);
  });
});

// ---------- 15: refuses --send ----------

test("CLI refuses --send / --publish / --execute", async () => {
  for (const flag of ["send", "publish", "execute"]) {
    await withFixture(async (root) => {
      const result = await runCli({
        args: ["publish", "pr-comment", "--dry-run", `--${flag}`, "--root", root, "--json"],
        env: { PATH: process.env.PATH ?? "" },
      });
      assert.equal(result.status, 1, `--${flag} should be refused`);
      assert.match(result.stderr, /(does not support|is deferred)/i);
    });
  }
});

// ---------- 16: artifact index unchanged ----------

test("publish pr-comment --dry-run does not mutate the artifact index", async () => {
  await withFixture(async (root) => {
    const indexPath = join(root, ".rekon/registry/artifacts.index.json");
    const before = await readFile(indexPath, "utf8");

    await runCli({
      args: ["publish", "pr-comment", "--dry-run", "--root", root, "--json"],
      env: { PATH: process.env.PATH ?? "" },
    });

    const after = await readFile(indexPath, "utf8");
    assert.equal(after, before, "artifact index must be unchanged after a dry-run pr-comment run");
  });
});

// ---------- 17: artifacts validate clean ----------

test("`artifacts validate` is clean before and after publish pr-comment --dry-run", async () => {
  await withFixture(async (root) => {
    const before = JSON.parse(runCliSync(["artifacts", "validate", "--root", root, "--json"]).stdout);
    assert.equal(before.valid, true);

    await runCli({
      args: ["publish", "pr-comment", "--dry-run", "--root", root, "--json"],
      env: { PATH: process.env.PATH ?? "" },
    });

    const after = JSON.parse(runCliSync(["artifacts", "validate", "--root", root, "--json"]).stdout);
    assert.equal(after.valid, true);
  });
});

// ---------- 18: usage line ----------

test("`rekon publish pr-comment --dry-run` is listed in the CLI usage", () => {
  const result = spawnSync(process.execPath, [cliPath, "--help"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  const all = `${result.stdout}\n${result.stderr}`;
  assert.match(all, /rekon publish pr-comment --dry-run/);
});

// ---------- helpers ----------

async function withFixture(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-pr-comment-dry-run-"));
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

async function runCli({ args, env }) {
  const proc = spawn(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    env,
  });
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

function runCliSync(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  return result;
}
