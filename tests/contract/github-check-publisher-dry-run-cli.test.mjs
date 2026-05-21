// Contract tests for `rekon publish github-check --dry-run`
// (step 6b of the CI / GitHub adapter implementation sequence
// pinned by docs/strategy/verification-runner-ci-github-decision.md
// and docs/strategy/verification-runner-github-check-publisher-decision.md).
//
// The CLI must:
// - require `--dry-run` (the publish path is not implemented yet),
// - print a stable JSON shape under `--json`,
// - delegate conclusion-mapping to `buildGitHubCheckPayload`
//   (no duplicate precedence logic in the CLI),
// - never read `GITHUB_TOKEN` / `GH_TOKEN`,
// - never import any network client or GitHub SDK,
// - treat readiness `ready: false` as a successful render
//   (exit 0), not a CLI failure.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const cliSourcePath = join(repoRoot, "packages/cli/src/index.ts");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- 1: --dry-run or --send is required ----------

test("rekon publish github-check refuses to run without --dry-run or --send", async () => {
  await withFixture(async (root) => {
    const result = runCliExpectFailure([
      "publish", "github-check",
      "--root", root, "--json",
    ]);

    assert.match(
      result.stderr,
      /requires either --dry-run or --send/i,
      `expected stderr to mention --dry-run or --send requirement; got: ${result.stderr}`,
    );
  });
});

// ---------- 2: --dry-run --json renders the stable shape ----------

test("rekon publish github-check --dry-run --json prints { kind, dryRun, payload, readiness, canonicalTruthReminder }", async () => {
  await withFixture(async (root) => {
    const output = runCliJson([
      "publish", "github-check",
      "--dry-run",
      "--root", root, "--json",
    ]);

    assert.equal(output.kind, "rekon.github-check.dry-run");
    assert.equal(output.dryRun, true);
    assert.ok(output.payload && typeof output.payload === "object", "payload object required");
    assert.ok(output.readiness && typeof output.readiness === "object", "readiness object required");
    assert.equal(
      output.canonicalTruthReminder,
      "GitHub status is not canonical truth; Rekon artifacts remain canonical.",
    );

    // Payload shape comes from `buildGitHubCheckPayload`. We don't
    // reassert every field here — the helper's own contract test
    // (github-check-publisher-skeleton.test.mjs) covers conclusion
    // mapping precedence in depth. Here we only confirm the CLI
    // surfaces those fields without rewriting them.
    assert.ok(typeof output.payload.name === "string", "payload.name required");
    assert.equal(output.payload.status, "completed");
    assert.ok(typeof output.payload.conclusion === "string", "payload.conclusion required");
    assert.ok(output.payload.output && typeof output.payload.output === "object");
    assert.ok(typeof output.payload.output.title === "string");
    assert.ok(typeof output.payload.output.summary === "string");
    assert.match(
      output.payload.output.summary,
      /GitHub status is not canonical truth; Rekon artifacts remain canonical/,
    );
    assert.ok(Array.isArray(output.payload.citedRefs));
  });
});

// ---------- 3: readiness false is exit 0, not a CLI failure ----------

test("readiness ready: false is reflected in JSON but does not fail the CLI", async () => {
  await withFixture(async (root) => {
    // Default environment (no REKON_GITHUB_CHECKS, no GITHUB_TOKEN,
    // no GITHUB_REPOSITORY, no SHA, no write-permission flag)
    // makes the readiness gate return ready:false. The render path
    // should still succeed.
    const output = runCliJson([
      "publish", "github-check",
      "--dry-run",
      "--root", root, "--json",
    ]);

    assert.equal(output.readiness.ready, false);
    assert.ok(Array.isArray(output.readiness.issues));
    assert.ok(output.readiness.issues.length > 0, "expected gated issues");

    const codes = output.readiness.issues.map((issue) => issue.code);
    assert.ok(codes.includes("not-enabled"));
    assert.ok(codes.includes("missing-token"));
    assert.ok(codes.includes("missing-repository"));
    assert.ok(codes.includes("missing-sha"));
    assert.ok(codes.includes("write-permission-not-confirmed"));
  });
});

// ---------- 4: artifacts-valid status surfaced + publications cited when present ----------

test("payload summary cites the publications produced by refresh + explicit publish", async () => {
  await withFixture(async (root) => {
    // `refresh` produces the architecture-summary publication
    // implicitly. Run `publish proof` and `publish agent-contract`
    // to surface the other two so we can assert all three
    // citations.
    runCliJson(["publish", "proof", "--root", root, "--json"]);
    runCliJson(["publish", "agent-contract", "--root", root, "--json"]);

    const output = runCliJson([
      "publish", "github-check",
      "--dry-run",
      "--root", root, "--json",
    ]);

    assert.match(output.payload.output.summary, /Proof report:\s*`Publication:proof-report-/);
    assert.match(output.payload.output.summary, /Architecture summary:\s*`Publication:architecture-summary-/);
    assert.match(output.payload.output.summary, /Agent contract:\s*`Publication:agent-contract-/);
    assert.match(output.payload.output.summary, /Artifacts valid:\s*`true`/);
  });
});

// ---------- 5: CLI delegates conclusion mapping (does not duplicate it) ----------

test("CLI source does not duplicate conclusion-mapping logic from buildGitHubCheckPayload", async () => {
  const source = await readFile(cliSourcePath, "utf8");

  // The CLI should call the helper, not reimplement precedence.
  assert.ok(
    source.includes("buildGitHubCheckPayload"),
    "CLI must call buildGitHubCheckPayload (delegate conclusion mapping)",
  );

  // The CLI must not redeclare a `pickConclusion`-style function
  // or otherwise duplicate the precedence ladder.
  assert.equal(
    /function\s+pickConclusion/.test(source),
    false,
    "CLI must not define a local pickConclusion (would duplicate helper precedence)",
  );

  // The CLI must not redeclare the conclusion string literals
  // in an array/switch that looks like the mapping.
  const conclusionLiterals = [
    `"success"`,
    `"failure"`,
    `"neutral"`,
    `"timed_out"`,
    `"action_required"`,
  ];
  let literalsHits = 0;
  for (const literal of conclusionLiterals) {
    if (source.includes(literal)) literalsHits += 1;
  }
  // Hitting one or two literals (e.g. for a comparison in unrelated
  // code or in a usage hint) is acceptable. Hitting four or more
  // suggests duplicated mapping; fail in that case.
  assert.ok(
    literalsHits < 4,
    `CLI source matches ${literalsHits} GitHub Check conclusion literals; conclusion mapping must live in @rekon/capability-docs`,
  );
});

// ---------- 6: --dry-run behavior reads no token / no network ----------

test("--dry-run with GITHUB_TOKEN set in env still does not surface the token in output", async () => {
  // Behavioural test (step 6c reshaped this from a source-scan).
  // The dry-run branch must pass an empty env map to the readiness
  // assessor, so any caller-provided `GITHUB_TOKEN` value must not
  // appear in the rendered JSON.
  await withFixture(async (root) => {
    const sentinel = "rekon-dry-run-test-token-9d57d28a";
    const result = spawnSync(process.execPath, [
      cliPath,
      "publish", "github-check",
      "--dry-run",
      "--root", root, "--json",
    ], {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        GITHUB_TOKEN: sentinel,
        GH_TOKEN: sentinel,
        REKON_GITHUB_CHECKS: "1",
        REKON_GITHUB_CHECKS_WRITE_CONFIRMED: "1",
        GITHUB_REPOSITORY: "drewlittrell/rekon",
        GITHUB_SHA: "deadbeefcafebabe",
      },
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(
      result.stdout.includes(sentinel),
      false,
      "dry-run output must not contain the GITHUB_TOKEN sentinel — token reads belong to --send only",
    );
    assert.equal(
      result.stderr.includes(sentinel),
      false,
      "dry-run stderr must not contain the GITHUB_TOKEN sentinel",
    );
    const parsed = JSON.parse(result.stdout);
    // Readiness for the dry-run path uses an empty env map, so
    // every gate failure issue (including `missing-token`) should
    // appear; that proves the dry-run readiness was computed
    // from the empty env, not from process.env.
    const codes = parsed.readiness.issues.map((issue) => issue.code);
    assert.ok(codes.includes("missing-token"));
    assert.ok(codes.includes("not-enabled"));
  });
});

// ---------- 7: no network call in --dry-run (behavioural) ----------

test("--dry-run with REKON_NET_FAIL_HARD set still succeeds (no network attempt)", async () => {
  // Behavioural test. The dry-run branch must not make any
  // outbound network request, so even with all proxy / DNS env
  // pointed at an unreachable address, the command should
  // succeed.
  await withFixture(async (root) => {
    const result = spawnSync(process.execPath, [
      cliPath,
      "publish", "github-check",
      "--dry-run",
      "--root", root, "--json",
    ], {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        // Pointing the proxy at a closed port would cause any
        // network call to error immediately; the dry-run branch
        // must not see it because it never opens a socket.
        HTTPS_PROXY: "http://127.0.0.1:1",
        HTTP_PROXY: "http://127.0.0.1:1",
        NO_PROXY: "",
      },
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.kind, "rekon.github-check.dry-run");
    assert.equal(parsed.dryRun, true);
  });
});

// ---------- 8: read-only — artifact index is unchanged ----------

test("running `publish github-check --dry-run` does not mutate the artifact store", async () => {
  await withFixture(async (root) => {
    const indexPath = join(root, ".rekon/registry/artifacts.index.json");
    const before = await readFile(indexPath, "utf8");

    runCliJson([
      "publish", "github-check",
      "--dry-run",
      "--root", root, "--json",
    ]);

    const after = await readFile(indexPath, "utf8");
    assert.equal(after, before, "artifact index must be unchanged after a dry-run publish");
  });
});

// ---------- 9: usage line registered ----------

test("`rekon publish github-check --dry-run` is listed in the CLI usage", async () => {
  const result = spawnSync(process.execPath, [cliPath, "--help"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  // The CLI may return a non-zero status for `--help`; what matters
  // is that the usage block is emitted.
  const all = `${result.stdout}\n${result.stderr}`;
  assert.match(all, /rekon publish github-check --dry-run/);
});

// ---------- helpers ----------

async function withFixture(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-github-check-dry-run-"));

  try {
    await cp(exampleRoot, root, {
      recursive: true,
      filter(source) {
        return !relative(exampleRoot, source).split(/[\\/]/).includes(".rekon");
      },
    });

    runCliJson(["refresh", "--root", root, "--json"]);
    await callback(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function runCli(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}

function runCliJson(args) {
  return JSON.parse(runCli(args).stdout);
}

function runCliExpectFailure(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.notEqual(
    result.status,
    0,
    `expected non-zero exit; stdout: ${result.stdout}; stderr: ${result.stderr}`,
  );
  return result;
}
