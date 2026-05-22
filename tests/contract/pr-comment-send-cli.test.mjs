// Contract tests for `rekon publish pr-comment --send`
// (step 7f of the CI / GitHub adapter implementation sequence
// pinned by docs/strategy/verification-runner-ci-github-decision.md
// and docs/strategy/pr-comment-api-writer-go-no-go-review.md).
//
// Tests use a fake GitHub PR comments API server running on a
// local loopback port + --api-base-url to redirect the CLI's
// requests. No real GitHub token is required. The fake server
// implements the three endpoints the writer touches:
//
//   GET   /repos/{owner}/{repo}/issues/{n}/comments?per_page=...&page=N
//   POST  /repos/{owner}/{repo}/issues/{n}/comments
//   PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}

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
const SENTINEL_TOKEN = "sentinel-token-xyz-DO-NOT-LEAK-7f";
const MARKER = "<!-- rekon:pr-comment:v1 -->";

// ---------- 1: --send refuses when readiness is not green ----------

test("--send with no env / no flags refuses (readiness false, no network call)", async () => {
  await withFixture(async (root) => {
    const transport = await createFakePrCommentServer();
    try {
      const result = await runCli({
        args: [
          "publish", "pr-comment", "--send", "--root", root, "--json",
          "--api-base-url", transport.baseUrl,
        ],
        env: emptyEnv(),
      });
      assert.equal(result.status, 1, `expected exit 1; stderr: ${result.stderr}`);
      const parsed = JSON.parse(result.stdout);
      assert.equal(parsed.kind, "rekon.pr-comment.send");
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

// ---------- 2: --send refuses without REKON_PR_COMMENTS ----------

test("--send without REKON_PR_COMMENTS refuses with `not-enabled` issue", async () => {
  await withFixture(async (root) => {
    const transport = await createFakePrCommentServer();
    try {
      const env = readinessEnv();
      delete env.REKON_PR_COMMENTS;
      const result = await runCli({
        args: [
          "publish", "pr-comment", "--send", "--root", root, "--json",
          "--confirm-pr-comment-write", "--api-base-url", transport.baseUrl,
        ],
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
    const transport = await createFakePrCommentServer();
    try {
      const env = readinessEnv();
      delete env.GITHUB_TOKEN;
      const result = await runCli({
        args: [
          "publish", "pr-comment", "--send", "--root", root, "--json",
          "--confirm-pr-comment-write", "--api-base-url", transport.baseUrl,
        ],
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

// ---------- 4: --send refuses without PR number ----------

test("--send without PR number refuses with `missing-pr-number` issue", async () => {
  await withFixture(async (root) => {
    const transport = await createFakePrCommentServer();
    try {
      const env = readinessEnv();
      delete env.GITHUB_PR_NUMBER;
      delete env.PR_NUMBER;
      const result = await runCli({
        args: [
          "publish", "pr-comment", "--send", "--root", root, "--json",
          "--confirm-pr-comment-write", "--api-base-url", transport.baseUrl,
        ],
        env,
      });
      assert.equal(result.status, 1);
      const parsed = JSON.parse(result.stdout);
      assert.ok(parsed.readiness.issues.some((issue) => issue.code === "missing-pr-number"));
      assert.equal(transport.requestCount, 0);
    } finally {
      await transport.close();
    }
  });
});

// ---------- 5: --send refuses without --confirm-pr-comment-write / env ----------

test("--send without --confirm-pr-comment-write and without env confirm refuses", async () => {
  await withFixture(async (root) => {
    const transport = await createFakePrCommentServer();
    try {
      const env = readinessEnv();
      delete env.REKON_PR_COMMENTS_WRITE_CONFIRMED;
      const result = await runCli({
        args: [
          "publish", "pr-comment", "--send", "--root", root, "--json",
          "--api-base-url", transport.baseUrl,
        ],
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

// ---------- 6: --send rejects pull_request_target ----------

test("--send refuses pull_request_target unconditionally", async () => {
  await withFixture(async (root) => {
    const transport = await createFakePrCommentServer();
    try {
      const env = {
        ...readinessEnv(),
        GITHUB_EVENT_NAME: "pull_request_target",
      };
      const result = await runCli({
        args: [
          "publish", "pr-comment", "--send", "--root", root, "--json",
          "--confirm-pr-comment-write", "--api-base-url", transport.baseUrl,
        ],
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

// ---------- 7: --send with fake API creates comment (no marker match) ----------

test("--send creates a new comment when no marker match is found", async () => {
  await withFixture(async (root) => {
    const transport = await createFakePrCommentServer({
      listResponses: [{ status: 200, body: [] }],
      createResponse: { status: 201, body: { id: 42, url: "https://api.example/c/42", html_url: "https://example/c/42", issue_url: "https://api.example/i/123" } },
    });
    try {
      const result = await runCli({
        args: [
          "publish", "pr-comment", "--send", "--root", root, "--json",
          "--confirm-pr-comment-write", "--api-base-url", transport.baseUrl,
        ],
        env: readinessEnv(),
      });
      assert.equal(result.status, 0, `expected exit 0; stderr: ${result.stderr}; stdout: ${result.stdout}`);
      const parsed = JSON.parse(result.stdout);
      assert.equal(parsed.sent, true);
      assert.equal(parsed.action, "created");
      assert.equal(parsed.github.id, 42);
      assert.equal(parsed.github.action, "created");
      // 1 list + 1 post = 2 requests
      assert.equal(transport.requestCount, 2);
      const list = transport.requests[0];
      const post = transport.requests[1];
      assert.equal(list.method, "GET");
      assert.match(list.path, /\/repos\/drewlittrell\/rekon\/issues\/123\/comments/);
      assert.equal(post.method, "POST");
      assert.match(post.path, /\/repos\/drewlittrell\/rekon\/issues\/123\/comments/);
      // POST body must contain the marker
      assert.ok(post.body.includes(MARKER), `POST body missing marker; got: ${post.body.slice(0, 200)}`);
    } finally {
      await transport.close();
    }
  });
});

// ---------- 8: --send updates existing marker comment ----------

test("--send updates an existing marker comment (PATCH, no POST)", async () => {
  await withFixture(async (root) => {
    const existing = [
      { id: 11, body: "some reviewer comment" },
      { id: 12, body: `${MARKER}\nold rekon body` },
      { id: 13, body: "another reviewer comment" },
    ];
    const transport = await createFakePrCommentServer({
      listResponses: [{ status: 200, body: existing }],
      updateResponse: { status: 200, body: { id: 12, url: "https://api.example/c/12", html_url: "https://example/c/12" } },
    });
    try {
      const result = await runCli({
        args: [
          "publish", "pr-comment", "--send", "--root", root, "--json",
          "--confirm-pr-comment-write", "--api-base-url", transport.baseUrl,
        ],
        env: readinessEnv(),
      });
      assert.equal(result.status, 0, `expected exit 0; stderr: ${result.stderr}; stdout: ${result.stdout}`);
      const parsed = JSON.parse(result.stdout);
      assert.equal(parsed.sent, true);
      assert.equal(parsed.action, "updated");
      assert.equal(parsed.github.id, 12);
      // 1 list + 1 patch = 2 requests, no POST
      assert.equal(transport.requestCount, 2);
      const list = transport.requests[0];
      const patch = transport.requests[1];
      assert.equal(list.method, "GET");
      assert.equal(patch.method, "PATCH");
      assert.match(patch.path, /\/repos\/drewlittrell\/rekon\/issues\/comments\/12/);
      assert.equal(transport.posts.length, 0, "must not POST when marker already present");
    } finally {
      await transport.close();
    }
  });
});

// ---------- 9: --send paginates until marker is found ----------

test("--send walks pages until it finds the marker, then PATCHes", async () => {
  await withFixture(async (root) => {
    const fullPage = Array.from({ length: 100 }, (_, idx) => ({
      id: 1000 + idx,
      body: `reviewer comment #${idx}`,
    }));
    const pageTwoWithMarker = [
      { id: 2001, body: "reviewer comment 2.1" },
      { id: 2002, body: `${MARKER}\nrekon owned body` },
    ];
    const transport = await createFakePrCommentServer({
      listResponses: [
        { status: 200, body: fullPage },
        { status: 200, body: pageTwoWithMarker },
      ],
      updateResponse: { status: 200, body: { id: 2002 } },
    });
    try {
      const result = await runCli({
        args: [
          "publish", "pr-comment", "--send", "--root", root, "--json",
          "--confirm-pr-comment-write", "--api-base-url", transport.baseUrl,
        ],
        env: readinessEnv(),
      });
      assert.equal(result.status, 0, result.stderr || result.stdout);
      const parsed = JSON.parse(result.stdout);
      assert.equal(parsed.action, "updated");
      assert.equal(parsed.github.id, 2002);
      assert.ok(parsed.github.pagesScanned >= 2, `expected pagesScanned >= 2, got ${parsed.github.pagesScanned}`);
      // 2 list pages + 1 patch = 3 requests
      assert.equal(transport.requestCount, 3);
      assert.match(transport.requests[0].path, /[?&]page=1\b/);
      assert.match(transport.requests[1].path, /[?&]page=2\b/);
    } finally {
      await transport.close();
    }
  });
});

// ---------- 10: --send maps request paths correctly ----------

test("--send list path uses the correct repo + PR number + per_page", async () => {
  await withFixture(async (root) => {
    const transport = await createFakePrCommentServer({
      listResponses: [{ status: 200, body: [] }],
      createResponse: { status: 201, body: { id: 99 } },
    });
    try {
      const result = await runCli({
        args: [
          "publish", "pr-comment", "--send", "--root", root, "--json",
          "--confirm-pr-comment-write", "--api-base-url", transport.baseUrl,
          "--pr-number", "456",
        ],
        env: readinessEnv(),
      });
      assert.equal(result.status, 0, result.stderr || result.stdout);
      const list = transport.requests[0];
      assert.match(list.path, /\/repos\/drewlittrell\/rekon\/issues\/456\/comments\?per_page=100&page=1/);
    } finally {
      await transport.close();
    }
  });
});

// ---------- 11: --send sanitizes API errors + never leaks token ----------

test("--send sanitizes API errors and never leaks the token", async () => {
  await withFixture(async (root) => {
    const transport = await createFakePrCommentServer({
      listResponses: [{
        status: 403,
        body: { message: "Resource not accessible by integration", documentation_url: "https://docs.example/rest" },
      }],
    });
    try {
      const result = await runCli({
        args: [
          "publish", "pr-comment", "--send", "--root", root, "--json",
          "--confirm-pr-comment-write", "--api-base-url", transport.baseUrl,
        ],
        env: { ...readinessEnv(), GITHUB_TOKEN: SENTINEL_TOKEN },
      });
      assert.equal(result.status, 1);
      const combined = `${result.stdout}\n${result.stderr}`;
      assert.equal(
        combined.includes(SENTINEL_TOKEN),
        false,
        "sentinel token must NEVER appear in stdout/stderr",
      );
      const parsed = JSON.parse(result.stdout);
      assert.equal(parsed.sent, false);
      assert.equal(parsed.reason, "api-error");
      assert.equal(parsed.error.status, 403);
      assert.match(parsed.error.message, /Resource not accessible/);
      assert.equal(parsed.error.documentationUrl, "https://docs.example/rest");
    } finally {
      await transport.close();
    }
  });
});

// ---------- 12: --send exits 0 even when proof status is failed/stale ----------

test("--send exits 0 on API success regardless of proof status in the body", async () => {
  await withFixture(async (root) => {
    // Even if the underlying proof state were `failed` or
    // `stale`, the CLI op succeeded as transport. We can't
    // easily force the proof state from this test, but we
    // verify the contract by checking exit 0 + sent: true
    // when the API responds 2xx. The companion summary check
    // ensures the body still carries the canonical-truth
    // reminder regardless of status.
    const transport = await createFakePrCommentServer({
      listResponses: [{ status: 200, body: [] }],
      createResponse: { status: 201, body: { id: 7, url: "https://api.example/c/7" } },
    });
    try {
      const result = await runCli({
        args: [
          "publish", "pr-comment", "--send", "--root", root, "--json",
          "--confirm-pr-comment-write", "--api-base-url", transport.baseUrl,
        ],
        env: readinessEnv(),
      });
      assert.equal(result.status, 0, result.stderr || result.stdout);
      const parsed = JSON.parse(result.stdout);
      assert.equal(parsed.sent, true);
      assert.equal(
        parsed.canonicalTruthReminder,
        "GitHub comments are not canonical truth; Rekon artifacts remain canonical.",
      );
    } finally {
      await transport.close();
    }
  });
});

// ---------- 13: --send output includes canonical-truth reminder ----------

test("--send output includes the canonical-truth reminder", async () => {
  await withFixture(async (root) => {
    const transport = await createFakePrCommentServer({
      listResponses: [{ status: 200, body: [] }],
      createResponse: { status: 201, body: { id: 8 } },
    });
    try {
      const result = await runCli({
        args: [
          "publish", "pr-comment", "--send", "--root", root, "--json",
          "--confirm-pr-comment-write", "--api-base-url", transport.baseUrl,
        ],
        env: readinessEnv(),
      });
      assert.equal(result.status, 0, result.stderr || result.stdout);
      const parsed = JSON.parse(result.stdout);
      assert.match(parsed.canonicalTruthReminder, /not canonical truth/);
      assert.match(parsed.canonicalTruthReminder, /Rekon artifacts remain canonical/);
    } finally {
      await transport.close();
    }
  });
});

// ---------- 14: --dry-run remains no-token / no-network ----------

test("--dry-run does not call the fake server even when api-base-url is set", async () => {
  await withFixture(async (root) => {
    const transport = await createFakePrCommentServer();
    try {
      const result = await runCli({
        args: [
          "publish", "pr-comment", "--dry-run", "--root", root, "--json",
          "--api-base-url", transport.baseUrl,
        ],
        env: { ...readinessEnv(), GITHUB_TOKEN: SENTINEL_TOKEN },
      });
      assert.equal(result.status, 0, result.stderr || result.stdout);
      const parsed = JSON.parse(result.stdout);
      assert.equal(parsed.kind, "rekon.pr-comment.dry-run");
      assert.equal(parsed.dryRun, true);
      assert.equal(transport.requestCount, 0, "dry-run must NOT call the API");
      // Sentinel token must not leak even via dry-run
      const combined = `${result.stdout}\n${result.stderr}`;
      assert.equal(combined.includes(SENTINEL_TOKEN), false);
    } finally {
      await transport.close();
    }
  });
});

// ---------- 15: --dry-run + --send is mutually exclusive ----------

test("--dry-run and --send together is exit 1", async () => {
  await withFixture(async (root) => {
    const result = await runCli({
      args: [
        "publish", "pr-comment", "--dry-run", "--send",
        "--root", root, "--json",
      ],
      env: readinessEnv(),
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /mutually exclusive/i);
  });
});

// ---------- 16: missing both --dry-run and --send is exit 1 ----------

test("missing both --dry-run and --send is exit 1", async () => {
  await withFixture(async (root) => {
    const result = await runCli({
      args: ["publish", "pr-comment", "--root", root, "--json"],
      env: emptyEnv(),
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /requires either --dry-run or --send/i);
  });
});

// ---------- 17: artifact index byte-identical before / after --send ----------

test("artifact index is byte-identical before and after --send", async () => {
  await withFixture(async (root) => {
    const indexPath = join(root, ".rekon/registry/artifacts.index.json");
    const before = await readFile(indexPath, "utf8");

    const transport = await createFakePrCommentServer({
      listResponses: [{ status: 200, body: [] }],
      createResponse: { status: 201, body: { id: 314 } },
    });
    try {
      const result = await runCli({
        args: [
          "publish", "pr-comment", "--send", "--root", root, "--json",
          "--confirm-pr-comment-write", "--api-base-url", transport.baseUrl,
        ],
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

// ---------- 18: refuses --execute / --publish ----------

test("refuses --execute and --publish aliases", async () => {
  await withFixture(async (root) => {
    const result1 = await runCli({
      args: ["publish", "pr-comment", "--execute", "--root", root, "--json"],
      env: emptyEnv(),
    });
    assert.equal(result1.status, 1);
    assert.match(result1.stderr, /does not support --execute/i);

    const result2 = await runCli({
      args: ["publish", "pr-comment", "--publish", "--root", root, "--json"],
      env: emptyEnv(),
    });
    assert.equal(result2.status, 1);
    assert.match(result2.stderr, /does not support --publish/i);
  });
});

// ---------- 19: usage line registered ----------

test("`rekon publish pr-comment --send` is listed in the CLI usage", () => {
  const result = spawnSync(process.execPath, [cliPath, "--help"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  const all = `${result.stdout}\n${result.stderr}`;
  assert.match(all, /rekon publish pr-comment --send/);
});

// ---------- helpers ----------

async function withFixture(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-pr-comment-send-"));

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
  return { PATH: process.env.PATH || "" };
}

function readinessEnv() {
  return {
    PATH: process.env.PATH || "",
    REKON_PR_COMMENTS: "1",
    REKON_PR_COMMENTS_WRITE_CONFIRMED: "1",
    GITHUB_TOKEN: "fake-token-pr-comment-7f",
    GITHUB_REPOSITORY: "drewlittrell/rekon",
    GITHUB_PR_NUMBER: "123",
    GITHUB_EVENT_NAME: "workflow_dispatch",
  };
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

/**
 * Fake GitHub PR comments API server.
 *
 * Supports three endpoints:
 *  - GET   /repos/.../issues/{n}/comments  → returns a configurable list per call
 *  - POST  /repos/.../issues/{n}/comments  → returns the configured `createResponse`
 *  - PATCH /repos/.../issues/comments/{id} → returns the configured `updateResponse`
 *
 * `listResponses` is an array — each GET dequeues the next entry.
 * Unused requests fall through to 500 so tests fail loudly.
 */
async function createFakePrCommentServer(options = {}) {
  const listResponses = (options.listResponses ?? [{ status: 200, body: [] }]).slice();
  const createResponse = options.createResponse ?? { status: 201, body: { id: 1 } };
  const updateResponse = options.updateResponse ?? { status: 200, body: { id: 1 } };
  const requests = [];
  const posts = [];

  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      const entry = { method: req.method ?? "", path: req.url ?? "", body };
      requests.push(entry);

      const method = req.method ?? "";
      const path = req.url ?? "";

      if (method === "GET" && /\/issues\/\d+\/comments/.test(path)) {
        const next = listResponses.shift() ?? { status: 200, body: [] };
        respond(res, next);
        return;
      }

      if (method === "POST" && /\/issues\/\d+\/comments/.test(path)) {
        posts.push(entry);
        respond(res, createResponse);
        return;
      }

      if (method === "PATCH" && /\/issues\/comments\/\d+/.test(path)) {
        respond(res, updateResponse);
        return;
      }

      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ message: `unexpected ${method} ${path}` }));
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
    get requestCount() { return requests.length; },
    get requests() { return requests; },
    get posts() { return posts; },
    close() {
      return new Promise((resolveClose) => server.close(() => resolveClose()));
    },
  };
}

function respond(res, { status, body }) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}
