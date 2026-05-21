// Contract tests for `rekon verify github-workflow validate`
// (P1.1 github-workflow-safety-validator).
//
// The validator is **static text-based** and **read-only**:
// it reads YAML content, runs checks, and reports issues
// without writing files, spawning processes, or touching the
// GitHub API.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

import { validateGitHubWorkflowSafety } from "../../packages/cli/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const executeWorkflowPath = join(
  repoRoot,
  "docs",
  "examples",
  "workflows",
  "rekon-verification.yml",
);
const dryRunWorkflowPath = join(
  repoRoot,
  "docs",
  "examples",
  "workflows",
  "rekon-verification-dry-run.yml",
);

// ---------- Helper-level tests ----------

test("validator passes the bundled execute template", async () => {
  const content = await readFile(executeWorkflowPath, "utf8");
  const report = validateGitHubWorkflowSafety({ path: "rekon-verification.yml", content });

  assert.equal(report.valid, true, `unexpected issues: ${JSON.stringify(report.issues, null, 2)}`);
  assert.equal(report.mode, "execute");
});

test("validator passes the bundled dry-run template", async () => {
  const content = await readFile(dryRunWorkflowPath, "utf8");
  const report = validateGitHubWorkflowSafety({ path: "rekon-verification-dry-run.yml", content });

  assert.equal(report.valid, true, `unexpected issues: ${JSON.stringify(report.issues, null, 2)}`);
  assert.equal(report.mode, "dry-run");
});

test("validator detects execute mode from `--execute`", () => {
  const yaml = makeBaseYaml({ verb: "--execute" });
  const report = validateGitHubWorkflowSafety({ path: "synthetic.yml", content: yaml });
  assert.equal(report.mode, "execute");
});

test("validator detects dry-run mode from `--dry-run`", () => {
  const yaml = makeBaseYaml({ verb: "--dry-run" });
  const report = validateGitHubWorkflowSafety({ path: "synthetic.yml", content: yaml });
  assert.equal(report.mode, "dry-run");
});

test("validator rejects pull_request_target", () => {
  const yaml = makeBaseYaml({ verb: "--execute", extraTriggers: "  pull_request_target:\n" });
  const report = validateGitHubWorkflowSafety({ path: "synthetic.yml", content: yaml });

  assert.equal(report.valid, false);
  const issue = report.issues.find((i) => i.code === "pull-request-target");
  assert.ok(issue, "expected pull-request-target issue");
  assert.equal(issue.severity, "error");
  assert.match(issue.recommendedFix, /pull_request/);
});

test("validator rejects checks: write", () => {
  const yaml = makeBaseYaml({ verb: "--execute", extraPermissions: "  checks: write\n" });
  const report = validateGitHubWorkflowSafety({ path: "synthetic.yml", content: yaml });

  assert.equal(report.valid, false);
  const issue = report.issues.find(
    (i) => i.code === "github-write-permission" && /checks: write/.test(i.message),
  );
  assert.ok(issue, "expected checks:write issue");
});

test("validator rejects pull-requests: write", () => {
  const yaml = makeBaseYaml({ verb: "--execute", extraPermissions: "  pull-requests: write\n" });
  const report = validateGitHubWorkflowSafety({ path: "synthetic.yml", content: yaml });

  assert.equal(report.valid, false);
  const issue = report.issues.find(
    (i) => i.code === "github-write-permission" && /pull-requests: write/.test(i.message),
  );
  assert.ok(issue, "expected pull-requests:write issue");
});

test("validator rejects contents: write", () => {
  // Replace the default `contents: read` with `contents: write`
  // so the check sees a write permission instead.
  const yaml = makeBaseYaml({ verb: "--execute" }).replace("contents: read", "contents: write");
  const report = validateGitHubWorkflowSafety({ path: "synthetic.yml", content: yaml });

  assert.equal(report.valid, false);
  const issue = report.issues.find(
    (i) => i.code === "github-write-permission" && /contents: write/.test(i.message),
  );
  assert.ok(issue, "expected contents:write issue");
});

test("validator rejects missing contents: read", () => {
  const yaml = makeBaseYaml({ verb: "--execute" }).replace("contents: read", "actions: read");
  const report = validateGitHubWorkflowSafety({ path: "synthetic.yml", content: yaml });

  assert.equal(report.valid, false);
  const issue = report.issues.find((i) => i.code === "missing-contents-read");
  assert.ok(issue);
});

test("validator rejects gh api usage", () => {
  const yaml = makeBaseYaml({ verb: "--execute", extraSteps: "      - run: gh api repos/owner/repo/check-runs\n" });
  const report = validateGitHubWorkflowSafety({ path: "synthetic.yml", content: yaml });

  assert.equal(report.valid, false);
  assert.ok(report.issues.some((i) => i.code === "uses-github-api"));
});

test("validator rejects curl api.github.com usage", () => {
  const yaml = makeBaseYaml({
    verb: "--execute",
    extraSteps: "      - run: curl -s https://api.github.com/repos/owner/repo\n",
  });
  const report = validateGitHubWorkflowSafety({ path: "synthetic.yml", content: yaml });

  assert.equal(report.valid, false);
  assert.ok(report.issues.some((i) => i.code === "uses-github-api"));
});

test("validator rejects actions/github-script usage", () => {
  const yaml = makeBaseYaml({
    verb: "--execute",
    extraSteps: "      - uses: actions/github-script@v7\n",
  });
  const report = validateGitHubWorkflowSafety({ path: "synthetic.yml", content: yaml });

  assert.equal(report.valid, false);
  assert.ok(report.issues.some((i) => i.code === "uses-github-api"));
});

test("validator rejects missing artifacts latest", () => {
  const yaml = makeBaseYaml({ verb: "--execute" }).replace(/artifacts latest/g, "artifacts list");
  const report = validateGitHubWorkflowSafety({ path: "synthetic.yml", content: yaml });

  assert.equal(report.valid, false);
  assert.ok(report.issues.some((i) => i.code === "missing-artifacts-latest"));
});

test("validator rejects missing .rekon/artifacts upload", () => {
  const yaml = makeBaseYaml({ verb: "--execute" }).replace(
    /\.rekon\/artifacts\/\*\*/g,
    "build/output/**",
  );
  const report = validateGitHubWorkflowSafety({ path: "synthetic.yml", content: yaml });

  assert.equal(report.valid, false);
  assert.ok(report.issues.some((i) => i.code === "missing-rekon-artifact-upload"));
});

test("validator rejects missing .log exclusion", () => {
  // Remove the log exclusion while keeping the upload path.
  const yaml = makeBaseYaml({ verb: "--execute" }).replace(
    /!\.rekon\/artifacts\/\*\*\/\*\.log\n/g,
    "",
  );
  const report = validateGitHubWorkflowSafety({ path: "synthetic.yml", content: yaml });

  assert.equal(report.valid, false);
  assert.ok(report.issues.some((i) => i.code === "missing-log-exclusion"));
});

test("validator rejects missing $GITHUB_STEP_SUMMARY", () => {
  const yaml = makeBaseYaml({ verb: "--execute" }).replace(/\$GITHUB_STEP_SUMMARY/g, "STDOUT");
  const report = validateGitHubWorkflowSafety({ path: "synthetic.yml", content: yaml });

  assert.equal(report.valid, false);
  assert.ok(report.issues.some((i) => i.code === "missing-job-summary"));
});

test("validator rejects unknown mode (no verify run)", () => {
  const yaml = makeBaseYaml({ verb: "--execute" }).replace(/verify run [^\n]+--execute/g, "");
  const report = validateGitHubWorkflowSafety({ path: "synthetic.yml", content: yaml });

  assert.equal(report.valid, false);
  assert.equal(report.mode, "unknown");
  assert.ok(report.issues.some((i) => i.code === "unknown-mode"));
});

test("canonical-truth reminder is a warning, not an error", () => {
  // Strip any line mentioning `canonical` so the warning fires.
  // The other echo line ("# Rekon Verification Summary") still
  // references $GITHUB_STEP_SUMMARY, so the missing-job-summary
  // error stays absent.
  const yaml = makeBaseYaml({ verb: "--execute" })
    .split("\n")
    .filter((line) => !/canonical/i.test(line))
    .join("\n");
  const report = validateGitHubWorkflowSafety({ path: "synthetic.yml", content: yaml });

  const warning = report.issues.find((i) => i.code === "missing-canonical-truth-reminder");
  assert.ok(warning, `expected canonical-truth warning; issues: ${JSON.stringify(report.issues, null, 2)}`);
  assert.equal(warning.severity, "warning");
  // The only issue should be the warning; valid stays true.
  assert.equal(
    report.valid,
    true,
    `expected valid: true with only canonical-truth warning; issues: ${JSON.stringify(report.issues, null, 2)}`,
  );
});

test("missing retention-days is a warning, not an error", () => {
  const yaml = makeBaseYaml({ verb: "--execute" }).replace(/retention-days:\s*\d+\n/g, "");
  const report = validateGitHubWorkflowSafety({ path: "synthetic.yml", content: yaml });

  const warning = report.issues.find((i) => i.code === "missing-retention-days");
  assert.ok(warning);
  assert.equal(warning.severity, "warning");
  assert.equal(report.valid, true);
});

// ---------- CLI tests ----------

test("CLI: validate execute template via --path", () => {
  const result = runCli([
    "verify", "github-workflow", "validate",
    "--path", "docs/examples/workflows/rekon-verification.yml",
    "--json",
  ]);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.valid, true);
  assert.equal(parsed.mode, "execute");
});

test("CLI: validate dry-run template via --path", () => {
  const result = runCli([
    "verify", "github-workflow", "validate",
    "--path", "docs/examples/workflows/rekon-verification-dry-run.yml",
    "--json",
  ]);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.valid, true);
  assert.equal(parsed.mode, "dry-run");
});

test("CLI: exits 1 for invalid workflow", async () => {
  // Use the test harness's temp dir for the synthetic file.
  const { mkdtemp, writeFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const root = await mkdtemp(join(tmpdir(), "rekon-workflow-validator-"));

  try {
    const filePath = join(root, "bad.yml");
    const yaml = makeBaseYaml({ verb: "--execute", extraTriggers: "  pull_request_target:\n" });
    await writeFile(filePath, yaml, "utf8");

    const result = spawnSync(
      process.execPath,
      [cliPath, "verify", "github-workflow", "validate", "--path", filePath, "--json"],
      { cwd: repoRoot, encoding: "utf8" },
    );
    assert.notEqual(result.status, 0, "expected non-zero exit for invalid workflow");
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.valid, false);
    assert.ok(parsed.issues.some((i) => i.code === "pull-request-target"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("CLI: human output includes issue code and recommended fix", async () => {
  const { mkdtemp, writeFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const root = await mkdtemp(join(tmpdir(), "rekon-workflow-validator-"));

  try {
    const filePath = join(root, "bad.yml");
    const yaml = makeBaseYaml({ verb: "--execute", extraPermissions: "  checks: write\n" });
    await writeFile(filePath, yaml, "utf8");

    const result = spawnSync(
      process.execPath,
      [cliPath, "verify", "github-workflow", "validate", "--path", filePath],
      { cwd: repoRoot, encoding: "utf8" },
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /GitHub workflow safety: invalid/);
    assert.match(result.stdout, /github-write-permission/);
    assert.match(result.stdout, /Fix:/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("CLI: requires --path", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "verify", "github-workflow", "validate", "--json"],
    { cwd: repoRoot, encoding: "utf8" },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /requires --path/);
});

test("CLI: read-only — does not write to the validated file or any other location", async () => {
  const { mkdtemp, writeFile, readFile, stat, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const root = await mkdtemp(join(tmpdir(), "rekon-workflow-validator-"));

  try {
    const filePath = join(root, "good.yml");
    const yaml = makeBaseYaml({ verb: "--execute" });
    await writeFile(filePath, yaml, "utf8");
    const beforeStat = await stat(filePath);
    const beforeContent = await readFile(filePath, "utf8");

    runCli([
      "verify", "github-workflow", "validate",
      "--path", filePath, "--json",
    ]);

    const afterContent = await readFile(filePath, "utf8");
    const afterStat = await stat(filePath);
    assert.equal(beforeContent, afterContent, "validated file was modified");
    assert.equal(beforeStat.mtimeMs, afterStat.mtimeMs, "validated file mtime changed");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// ---------- helpers ----------

function runCli(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}

/**
 * Build a minimal-but-valid workflow YAML for synthetic tests.
 * The base passes every check; tests mutate it to trigger
 * specific failures.
 */
function makeBaseYaml(input) {
  const verb = input?.verb ?? "--execute";
  const extraTriggers = input?.extraTriggers ?? "";
  const extraPermissions = input?.extraPermissions ?? "";
  const extraSteps = input?.extraSteps ?? "";

  return `name: Synthetic Workflow

on:
  pull_request:
${extraTriggers}
permissions:
  contents: read
${extraPermissions}
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - run: node packages/cli/dist/index.js verify run --plan x ${verb} --json
      - run: node packages/cli/dist/index.js artifacts latest --type VerificationPlan --id-only
${extraSteps}      - run: |
          echo "# Rekon Verification Summary" >> "$GITHUB_STEP_SUMMARY"
          echo "GitHub status is not canonical truth; Rekon artifacts remain canonical." >> "$GITHUB_STEP_SUMMARY"
      - uses: actions/upload-artifact@v4
        with:
          name: rekon-artifacts
          path: |
            .rekon/artifacts/**
            !.rekon/artifacts/**/*.log
          retention-days: 7
`;
}

// ---------- github-check-send profile tests ----------

const checkSendWorkflowPath = join(
  repoRoot,
  "docs",
  "examples",
  "workflows",
  "rekon-verification-check-send.yml",
);

test("read-only profile still validates the execute template", async () => {
  const content = await readFile(executeWorkflowPath, "utf8");
  const report = validateGitHubWorkflowSafety({ path: executeWorkflowPath, content, profile: "read-only" });
  assert.equal(report.valid, true, `unexpected issues: ${JSON.stringify(report.issues, null, 2)}`);
  assert.equal(report.profile, "read-only");
  assert.equal(report.mode, "execute");
});

test("read-only profile still validates the dry-run template", async () => {
  const content = await readFile(dryRunWorkflowPath, "utf8");
  const report = validateGitHubWorkflowSafety({ path: dryRunWorkflowPath, content, profile: "read-only" });
  assert.equal(report.valid, true, `unexpected issues: ${JSON.stringify(report.issues, null, 2)}`);
  assert.equal(report.profile, "read-only");
  assert.equal(report.mode, "dry-run");
});

test("read-only profile still rejects checks: write", () => {
  const yaml = makeBaseYaml({ verb: "--execute", extraPermissions: "  checks: write\n" });
  const report = validateGitHubWorkflowSafety({ path: "synthetic.yml", content: yaml, profile: "read-only" });
  assert.equal(report.valid, false);
  assert.ok(report.issues.some((issue) => issue.code === "github-write-permission" && /checks/i.test(issue.message)));
});

test("github-check-send profile validates the bundled opt-in template", async () => {
  const content = await readFile(checkSendWorkflowPath, "utf8");
  const report = validateGitHubWorkflowSafety({ path: checkSendWorkflowPath, content, profile: "github-check-send" });
  assert.equal(report.valid, true, `unexpected issues: ${JSON.stringify(report.issues, null, 2)}`);
  assert.equal(report.profile, "github-check-send");
  assert.equal(report.mode, "check-send");
  assert.equal(report.summary.hasChecksWrite, true);
  assert.equal(report.summary.hasRekonGitHubChecksOptIn, true);
  assert.equal(report.summary.hasWriteConfirmation, true);
  assert.equal(report.summary.hasPublishGitHubCheckDryRun, true);
  assert.equal(report.summary.hasPublishGitHubCheckSend, true);
  assert.equal(report.summary.hasConfirmChecksWriteFlag, true);
});

test("github-check-send profile requires checks: write", async () => {
  const content = await readFile(checkSendWorkflowPath, "utf8");
  const noChecksWrite = content.replace(/^\s*checks:\s*write\b.*$/m, "");
  const report = validateGitHubWorkflowSafety({ path: "synthetic.yml", content: noChecksWrite, profile: "github-check-send" });
  assert.equal(report.valid, false);
  assert.ok(report.issues.some((issue) => issue.code === "missing-checks-write"));
});

test("github-check-send profile requires REKON_GITHUB_CHECKS opt-in", async () => {
  const content = await readFile(checkSendWorkflowPath, "utf8");
  const noOptIn = content.replace(/REKON_GITHUB_CHECKS:\s*"1"/g, "REKON_GITHUB_CHECKS: \"0\"");
  const report = validateGitHubWorkflowSafety({ path: "synthetic.yml", content: noOptIn, profile: "github-check-send" });
  assert.equal(report.valid, false);
  assert.ok(report.issues.some((issue) => issue.code === "missing-rekon-github-checks-opt-in"));
});

test("github-check-send profile requires REKON_GITHUB_CHECKS_WRITE_CONFIRMED", async () => {
  const content = await readFile(checkSendWorkflowPath, "utf8");
  const noConfirm = content.replace(/REKON_GITHUB_CHECKS_WRITE_CONFIRMED:\s*"1"/g, "REKON_GITHUB_CHECKS_WRITE_CONFIRMED: \"0\"");
  const report = validateGitHubWorkflowSafety({ path: "synthetic.yml", content: noConfirm, profile: "github-check-send" });
  assert.equal(report.valid, false);
  assert.ok(report.issues.some((issue) => issue.code === "missing-write-confirmation"));
});

test("github-check-send profile requires publish github-check --dry-run step", async () => {
  const content = await readFile(checkSendWorkflowPath, "utf8");
  const noDryRun = content.replace(/publish\s+github-check[\s\S]*?--dry-run/g, "publish github-check --send-only");
  const report = validateGitHubWorkflowSafety({ path: "synthetic.yml", content: noDryRun, profile: "github-check-send" });
  assert.equal(report.valid, false);
  assert.ok(report.issues.some((issue) => issue.code === "missing-publish-github-check-dry-run"));
});

test("github-check-send profile requires publish github-check --send step", async () => {
  const content = await readFile(checkSendWorkflowPath, "utf8");
  const noSend = content.replace(/publish\s+github-check[\s\S]*?--send/g, "publish github-check --noop");
  const report = validateGitHubWorkflowSafety({ path: "synthetic.yml", content: noSend, profile: "github-check-send" });
  assert.equal(report.valid, false);
  assert.ok(report.issues.some((issue) => issue.code === "missing-publish-github-check-send"));
});

test("github-check-send profile rejects pull_request_target", async () => {
  const content = await readFile(checkSendWorkflowPath, "utf8");
  const malicious = content.replace(/^on:\s*\n  workflow_dispatch:/m, "on:\n  pull_request_target:\n  workflow_dispatch:");
  const report = validateGitHubWorkflowSafety({ path: "synthetic.yml", content: malicious, profile: "github-check-send" });
  assert.equal(report.valid, false);
  assert.ok(report.issues.some((issue) => issue.code === "pull-request-target"));
});

test("github-check-send profile rejects pull-requests: write", async () => {
  const content = await readFile(checkSendWorkflowPath, "utf8");
  const tooMuchWrite = content.replace(/^\s*checks:\s*write\b.*$/m, "  checks: write\n  pull-requests: write");
  const report = validateGitHubWorkflowSafety({ path: "synthetic.yml", content: tooMuchWrite, profile: "github-check-send" });
  assert.equal(report.valid, false);
  assert.ok(report.issues.some((issue) => issue.code === "github-write-permission" && /pull-requests/i.test(issue.message)));
});

test("github-check-send profile rejects contents: write", async () => {
  const content = await readFile(checkSendWorkflowPath, "utf8");
  // Replace the actual permissions-block contents: read with
  // contents: write. The comment-stripped YAML still contains the
  // permissions block, so the validator should see contents:
  // write.
  const tooMuchWrite = content.replace(/^(\s*)contents:\s*read\b/m, "$1contents: write");
  const report = validateGitHubWorkflowSafety({ path: "synthetic.yml", content: tooMuchWrite, profile: "github-check-send" });
  assert.equal(report.valid, false);
  assert.ok(report.issues.some((issue) => issue.code === "github-write-permission" && /contents/i.test(issue.message)));
});

test("github-check-send profile rejects missing --confirm-checks-write flag", async () => {
  const content = await readFile(checkSendWorkflowPath, "utf8");
  const noFlag = content.replace(/--confirm-checks-write\s*\\?\s*\n?/g, "");
  const report = validateGitHubWorkflowSafety({ path: "synthetic.yml", content: noFlag, profile: "github-check-send" });
  assert.equal(report.valid, false);
  assert.ok(report.issues.some((issue) => issue.code === "missing-confirm-checks-write-flag"));
});

test("github-check-send profile rejects pull_request trigger", async () => {
  const content = await readFile(checkSendWorkflowPath, "utf8");
  const withPrTrigger = content.replace(/^on:\s*\n  workflow_dispatch:/m, "on:\n  pull_request:\n  workflow_dispatch:");
  const report = validateGitHubWorkflowSafety({ path: "synthetic.yml", content: withPrTrigger, profile: "github-check-send" });
  assert.equal(report.valid, false);
  assert.ok(report.issues.some((issue) => issue.code === "pull-request-trigger-disallowed"));
});

// ---------- CLI: --profile flag ----------

test("CLI: --profile github-check-send validates the bundled opt-in template", () => {
  const result = spawnSync(process.execPath, [
    cliPath, "verify", "github-workflow", "validate",
    "--path", "docs/examples/workflows/rekon-verification-check-send.yml",
    "--profile", "github-check-send",
    "--json",
  ], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.valid, true);
  assert.equal(parsed.profile, "github-check-send");
});

test("CLI: --profile defaults to read-only when omitted", () => {
  const result = spawnSync(process.execPath, [
    cliPath, "verify", "github-workflow", "validate",
    "--path", "docs/examples/workflows/rekon-verification.yml",
    "--json",
  ], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.profile, "read-only");
});

test("CLI: --profile rejects unknown values", () => {
  const result = spawnSync(process.execPath, [
    cliPath, "verify", "github-workflow", "validate",
    "--path", "docs/examples/workflows/rekon-verification.yml",
    "--profile", "bogus",
    "--json",
  ], { cwd: repoRoot, encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--profile must be/);
});
