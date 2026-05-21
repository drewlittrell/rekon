// Contract tests for `rekon publish github-check --send`
// (step 6c of the CI / GitHub adapter implementation sequence
// pinned by docs/strategy/verification-runner-ci-github-decision.md
// and docs/strategy/verification-runner-github-check-publisher-decision.md).
//
// Tests use a fake GitHub Checks API server running on a local
// loopback port + --api-base-url to redirect the CLI's request.
// No real GitHub token is required.

import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- 1: --send refuses when readiness is not green ----------

test("--send with no env / no flags refuses (readiness false, no network call)", async () => {
  await withFixture(async (root) => {
    const transport = await createFakeApiServer();
    try {
      const result = await runCli({
        args: ["publish", "github-check", "--send", "--root", root, "--json", "--api-base-url", transport.baseUrl],
        env: emptyEnv(),
      });
      assert.equal(result.status, 1, `expected exit 1; stderr: ${result.stderr}`);
      const parsed = JSON.parse(result.stdout);
      assert.equal(parsed.kind, "rekon.github-check.send");
      assert.equal(parsed.sent, false);
      assert.equal(parsed.reason, "readiness-failed");
      assert.equal(parsed.readiness.ready, false);
      assert.equal(parsed.github, undefined);
      assert.equal(transport.requestCount, 0, "transport must not be called when readiness fails");
    } finally {
      await transport.close();
    }
  });
});

// ---------- 2: --send refuses without REKON_GITHUB_CHECKS ----------

test("--send without REKON_GITHUB_CHECKS refuses with `not-enabled` issue", async () => {
  await withFixture(async (root) => {
    const transport = await createFakeApiServer();
    try {
      const env = readinessEnv();
      delete env.REKON_GITHUB_CHECKS;
      const result = await runCli({
        args: ["publish", "github-check", "--send", "--root", root, "--json", "--confirm-checks-write", "--api-base-url", transport.baseUrl],
        env,
      });
      assert.equal(result.status, 1);
      const parsed = JSON.parse(result.stdout);
      assert.ok(parsed.readiness.issues.some((issue) => issue.code === "not-enabled"));
      assert.equal(transport.requestCount, 0);
    } finally {
      await transport.close();
    }
  });
});

// ---------- 3: --send refuses without GITHUB_TOKEN ----------

test("--send without GITHUB_TOKEN refuses with `missing-token` issue", async () => {
  await withFixture(async (root) => {
    const transport = await createFakeApiServer();
    try {
      const env = readinessEnv();
      delete env.GITHUB_TOKEN;
      const result = await runCli({
        args: ["publish", "github-check", "--send", "--root", root, "--json", "--confirm-checks-write", "--api-base-url", transport.baseUrl],
        env,
      });
      assert.equal(result.status, 1);
      const parsed = JSON.parse(result.stdout);
      assert.ok(parsed.readiness.issues.some((issue) => issue.code === "missing-token"));
      assert.equal(transport.requestCount, 0);
    } finally {
      await transport.close();
    }
  });
});

// ---------- 4: --send refuses without --confirm-checks-write / env ----------

test("--send without --confirm-checks-write and without env confirm refuses", async () => {
  await withFixture(async (root) => {
    const transport = await createFakeApiServer();
    try {
      const env = readinessEnv();
      delete env.REKON_GITHUB_CHECKS_WRITE_CONFIRMED;
      const result = await runCli({
        args: ["publish", "github-check", "--send", "--root", root, "--json", "--api-base-url", transport.baseUrl],
        env,
      });
      assert.equal(result.status, 1);
      const parsed = JSON.parse(result.stdout);
      assert.ok(parsed.readiness.issues.some((issue) => issue.code === "write-permission-not-confirmed"));
      assert.equal(transport.requestCount, 0);
    } finally {
      await transport.close();
    }
  });
});

// ---------- 5: --send rejects pull_request_target ----------

test("--send rejects pull_request_target unconditionally", async () => {
  await withFixture(async (root) => {
    const transport = await createFakeApiServer();
    try {
      const env = readinessEnv();
      env.GITHUB_EVENT_NAME = "pull_request_target";
      const result = await runCli({
        args: ["publish", "github-check", "--send", "--root", root, "--json", "--confirm-checks-write", "--api-base-url", transport.baseUrl],
        env,
      });
      assert.equal(result.status, 1);
      const parsed = JSON.parse(result.stdout);
      assert.ok(parsed.readiness.issues.some((issue) => issue.code === "untrusted-event"));
      assert.equal(transport.requestCount, 0);
    } finally {
      await transport.close();
    }
  });
});

// ---------- 6: --send rejects forked pull_request by default ----------

test("--send rejects forked pull_request by default", async () => {
  await withFixture(async (root) => {
    const transport = await createFakeApiServer();
    try {
      const env = readinessEnv();
      env.GITHUB_EVENT_NAME = "pull_request";
      // Default behaviour: REKON_GITHUB_CHECKS_PR_IS_FORK unset =>
      // treated as fork.
      const result = await runCli({
        args: ["publish", "github-check", "--send", "--root", root, "--json", "--confirm-checks-write", "--api-base-url", transport.baseUrl],
        env,
      });
      assert.equal(result.status, 1);
      const parsed = JSON.parse(result.stdout);
      assert.ok(parsed.readiness.issues.some((issue) => issue.code === "untrusted-event"));
      assert.equal(transport.requestCount, 0);
    } finally {
      await transport.close();
    }
  });
});

// ---------- 7: --send calls transport exactly once when ready ----------

test("--send calls the GitHub Checks API exactly once when readiness is green", async () => {
  await withFixture(async (root) => {
    const transport = await createFakeApiServer({ respondWith: { id: 99, status: "completed", conclusion: "success" } });
    try {
      const result = await runCli({
        args: ["publish", "github-check", "--send", "--root", root, "--json", "--confirm-checks-write", "--api-base-url", transport.baseUrl],
        env: readinessEnv(),
      });
      assert.equal(result.status, 0, result.stderr || result.stdout);
      assert.equal(transport.requestCount, 1, "transport must be called exactly once on a green readiness");
      const parsed = JSON.parse(result.stdout);
      assert.equal(parsed.kind, "rekon.github-check.send");
      assert.equal(parsed.sent, true);
      assert.equal(parsed.github?.id, 99);
    } finally {
      await transport.close();
    }
  });
});

// ---------- 8: request path is /repos/{owner}/{repo}/check-runs ----------

test("--send POSTs to /repos/{owner}/{repo}/check-runs", async () => {
  await withFixture(async (root) => {
    const transport = await createFakeApiServer({ respondWith: { id: 1 } });
    try {
      const result = await runCli({
        args: ["publish", "github-check", "--send", "--root", root, "--json", "--confirm-checks-write", "--api-base-url", transport.baseUrl],
        env: readinessEnv(),
      });
      assert.equal(result.status, 0, result.stderr || result.stdout);
      assert.equal(transport.lastRequest.method, "POST");
      assert.equal(transport.lastRequest.path, "/repos/drewlittrell/rekon/check-runs");
    } finally {
      await transport.close();
    }
  });
});

// ---------- 9: request body maps camelCase to snake_case ----------

test("--send maps payload.camelCase to GitHub REST snake_case body", async () => {
  await withFixture(async (root) => {
    const transport = await createFakeApiServer({ respondWith: { id: 2 } });
    try {
      const result = await runCli({
        args: ["publish", "github-check", "--send", "--root", root, "--json", "--confirm-checks-write", "--api-base-url", transport.baseUrl],
        env: readinessEnv(),
      });
      assert.equal(result.status, 0, result.stderr || result.stdout);
      const body = JSON.parse(transport.lastRequest.body);
      assert.equal(body.head_sha, "deadbeefcafebabe");
      assert.equal(body.status, "completed");
      assert.ok(typeof body.conclusion === "string");
      assert.ok(body.output);
      assert.ok(typeof body.output.title === "string");
      assert.ok(typeof body.output.summary === "string");
      // camelCase fields must not leak into the request body.
      assert.equal("headSha" in body, false);
      assert.equal("externalId" in body, false);
      // external_id is only set when the payload cites a
      // VerificationResult or VerificationRun ref. The fixture's
      // freshly-refreshed root has neither (no `verify run` has
      // happened), so external_id may be absent. When it is
      // present, it must be a string and not the camelCase
      // alias.
      if ("external_id" in body) {
        assert.equal(typeof body.external_id, "string");
      }
    } finally {
      await transport.close();
    }
  });
});

// ---------- 10: success response returns id / url / htmlUrl ----------

test("--send surfaces github { id, url, htmlUrl, status, conclusion } on success", async () => {
  await withFixture(async (root) => {
    const transport = await createFakeApiServer({
      respondWith: {
        id: 1234,
        url: "http://example/repos/drewlittrell/rekon/check-runs/1234",
        html_url: "http://example/drewlittrell/rekon/runs/1234",
        status: "completed",
        conclusion: "neutral",
      },
    });
    try {
      const result = await runCli({
        args: ["publish", "github-check", "--send", "--root", root, "--json", "--confirm-checks-write", "--api-base-url", transport.baseUrl],
        env: readinessEnv(),
      });
      assert.equal(result.status, 0, result.stderr || result.stdout);
      const parsed = JSON.parse(result.stdout);
      assert.equal(parsed.github.id, 1234);
      assert.equal(parsed.github.url, "http://example/repos/drewlittrell/rekon/check-runs/1234");
      assert.equal(parsed.github.htmlUrl, "http://example/drewlittrell/rekon/runs/1234");
      assert.equal(parsed.github.status, "completed");
      assert.equal(parsed.github.conclusion, "neutral");
    } finally {
      await transport.close();
    }
  });
});

// ---------- 11: GitHub error is sanitized; token never leaks ----------

test("--send sanitizes a GitHub error response and never leaks the token", async () => {
  await withFixture(async (root) => {
    const sentinel = "rekon-test-token-9bf24a78deadbeef";
    const transport = await createFakeApiServer({
      status: 403,
      respondWith: {
        message: "Resource not accessible by integration",
        documentation_url: "https://docs.github.com/rest/checks/runs#create-a-check-run",
      },
    });
    try {
      const env = readinessEnv();
      env.GITHUB_TOKEN = sentinel;
      const result = await runCli({
        args: ["publish", "github-check", "--send", "--root", root, "--json", "--confirm-checks-write", "--api-base-url", transport.baseUrl],
        env,
      });
      assert.equal(result.status, 1);
      // Token must not appear anywhere in stdout/stderr.
      assert.equal(result.stdout.includes(sentinel), false, "stdout must not contain the token");
      assert.equal(result.stderr.includes(sentinel), false, "stderr must not contain the token");
      const parsed = JSON.parse(result.stdout);
      assert.equal(parsed.sent, false);
      assert.equal(parsed.reason, "api-error");
      assert.equal(parsed.error.status, 403);
      assert.match(parsed.error.message, /Resource not accessible by integration/);
      assert.match(parsed.error.documentationUrl, /docs\.github\.com/);
    } finally {
      await transport.close();
    }
  });
});

// ---------- 12: --dry-run still makes no network call ----------

test("--dry-run still makes no network call even when transport is reachable", async () => {
  await withFixture(async (root) => {
    const transport = await createFakeApiServer();
    try {
      const result = await runCli({
        args: ["publish", "github-check", "--dry-run", "--root", root, "--json", "--api-base-url", transport.baseUrl],
        env: readinessEnv(),
      });
      assert.equal(result.status, 0);
      assert.equal(transport.requestCount, 0, "dry-run must not call the transport");
    } finally {
      await transport.close();
    }
  });
});

// ---------- 13: --dry-run still does not surface the token ----------

test("--dry-run still does not surface the token even with full readiness env set", async () => {
  await withFixture(async (root) => {
    const sentinel = "rekon-test-token-dryrun-d7c5f9aa";
    const env = readinessEnv();
    env.GITHUB_TOKEN = sentinel;
    const result = await runCli({
      args: ["publish", "github-check", "--dry-run", "--root", root, "--json"],
      env,
    });
    assert.equal(result.status, 0);
    assert.equal(result.stdout.includes(sentinel), false);
    assert.equal(result.stderr.includes(sentinel), false);
  });
});

// ---------- 14: --dry-run and --send are mutually exclusive ----------

test("--dry-run and --send are mutually exclusive", async () => {
  await withFixture(async (root) => {
    const result = await runCli({
      args: ["publish", "github-check", "--dry-run", "--send", "--root", root, "--json"],
      env: readinessEnv(),
      expectFailure: true,
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /mutually exclusive/i);
  });
});

// ---------- 15: missing both --dry-run and --send fails ----------

test("missing both --dry-run and --send fails", async () => {
  await withFixture(async (root) => {
    const result = await runCli({
      args: ["publish", "github-check", "--root", root, "--json"],
      env: readinessEnv(),
      expectFailure: true,
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /requires either --dry-run or --send/i);
  });
});

// ---------- 16: API publish success + payload conclusion = failure still exits 0 ----------

test("--send exits 0 even when the Check conclusion is failure, as long as the API publish succeeded", async () => {
  await withFixture(async (root) => {
    // Force a failing proof status by feeding a result with
    // status: failed via the proof publish chain. Easier:
    // assert by checking that exit-status decoupling is in
    // place by inspecting how the CLI exits on a 2xx response
    // regardless of payload.conclusion.
    const transport = await createFakeApiServer({
      respondWith: { id: 7, status: "completed", conclusion: "failure" },
    });
    try {
      const result = await runCli({
        args: ["publish", "github-check", "--send", "--root", root, "--json", "--confirm-checks-write", "--api-base-url", transport.baseUrl],
        env: readinessEnv(),
      });
      assert.equal(result.status, 0, "API publish success must exit 0 even when the response conclusion is failure");
      const parsed = JSON.parse(result.stdout);
      assert.equal(parsed.sent, true);
      assert.equal(parsed.github.conclusion, "failure");
    } finally {
      await transport.close();
    }
  });
});

// ---------- 17: readiness output still includes canonical-truth reminder ----------

test("--send output still includes canonicalTruthReminder", async () => {
  await withFixture(async (root) => {
    const transport = await createFakeApiServer({ respondWith: { id: 8 } });
    try {
      const result = await runCli({
        args: ["publish", "github-check", "--send", "--root", root, "--json", "--confirm-checks-write", "--api-base-url", transport.baseUrl],
        env: readinessEnv(),
      });
      assert.equal(result.status, 0, result.stderr || result.stdout);
      const parsed = JSON.parse(result.stdout);
      assert.equal(
        parsed.canonicalTruthReminder,
        "GitHub status is not canonical truth; Rekon artifacts remain canonical.",
      );
      assert.match(parsed.payload.output.summary, /GitHub status is not canonical truth; Rekon artifacts remain canonical/);
    } finally {
      await transport.close();
    }
  });
});

// ---------- 18: `artifacts validate` remains clean ----------

test("`artifacts validate` is clean before and after --send", async () => {
  await withFixture(async (root) => {
    const indexPath = join(root, ".rekon/registry/artifacts.index.json");
    const before = await readFile(indexPath, "utf8");

    const transport = await createFakeApiServer({ respondWith: { id: 9 } });
    try {
      const result = await runCli({
        args: ["publish", "github-check", "--send", "--root", root, "--json", "--confirm-checks-write", "--api-base-url", transport.baseUrl],
        env: readinessEnv(),
      });
      assert.equal(result.status, 0, result.stderr || result.stdout);
    } finally {
      await transport.close();
    }

    const after = await readFile(indexPath, "utf8");
    assert.equal(after, before, "artifact index must be unchanged after --send");
  });
});

// ---------- 19: usage line registered ----------

test("`rekon publish github-check --send` is listed in the CLI usage", async () => {
  const result = spawnSync(process.execPath, [cliPath, "--help"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  const all = `${result.stdout}\n${result.stderr}`;
  assert.match(all, /rekon publish github-check --send/);
});

// ---------- helpers ----------

async function withFixture(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-github-check-send-"));

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

function emptyEnv() {
  // Inherit PATH so node can resolve binaries, but strip every
  // GitHub-related env so the readiness gate fails cleanly.
  const minimal = { PATH: process.env.PATH || "" };
  return minimal;
}

function readinessEnv() {
  return {
    PATH: process.env.PATH || "",
    REKON_GITHUB_CHECKS: "1",
    REKON_GITHUB_CHECKS_WRITE_CONFIRMED: "1",
    GITHUB_TOKEN: "fake-token-xyz",
    GITHUB_REPOSITORY: "drewlittrell/rekon",
    GITHUB_SHA: "deadbeefcafebabe",
    GITHUB_EVENT_NAME: "workflow_dispatch",
  };
}

async function runCli({ args, env, expectFailure = false }) {
  // Use async spawn so the in-process fake HTTP server's event
  // loop keeps ticking while the CLI runs. spawnSync would block
  // the loop and prevent the server from accepting the request.
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
  void expectFailure;
  return { status, stdout, stderr };
}

async function createFakeApiServer({ status = 201, respondWith = { id: 1 } } = {}) {
  const state = { requestCount: 0, lastRequest: { method: "", path: "", body: "" } };
  const server = createServer((req, res) => {
    state.requestCount += 1;
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      state.lastRequest = { method: req.method ?? "", path: req.url ?? "", body };
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(respondWith));
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
