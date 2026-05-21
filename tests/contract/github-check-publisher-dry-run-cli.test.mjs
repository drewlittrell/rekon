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

// ---------- 1: --dry-run is required ----------

test("rekon publish github-check refuses to run without --dry-run", async () => {
  await withFixture(async (root) => {
    const result = runCliExpectFailure([
      "publish", "github-check",
      "--root", root, "--json",
    ]);

    assert.match(
      result.stderr,
      /requires --dry-run/i,
      `expected stderr to mention --dry-run requirement; got: ${result.stderr}`,
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

// ---------- 6: no GITHUB_TOKEN / GH_TOKEN reads ----------

function stripCommentsAndStrings(source) {
  // Strip `// line comments`, `/* block comments */`, then strip
  // `'…'`, `"…"`, and `` `…` `` literals so the source scan only
  // catches real code references. Sufficient for a conservative
  // first pass — the CLI source uses these conventions throughout.
  let out = source.replace(/\/\*[\s\S]*?\*\//g, "");
  out = out.replace(/\/\/[^\n]*/g, "");
  out = out.replace(/`(?:\\.|[^`\\])*`/g, "``");
  out = out.replace(/'(?:\\.|[^'\\])*'/g, "''");
  out = out.replace(/"(?:\\.|[^"\\])*"/g, '""');
  return out;
}

test("CLI source does not read GITHUB_TOKEN or GH_TOKEN from process.env", async () => {
  const raw = await readFile(cliSourcePath, "utf8");
  const code = stripCommentsAndStrings(raw);

  // The CLI must not look up tokens itself — the future API-call
  // slice will surface them explicitly. The readiness helper reads
  // tokens from a caller-provided env map (which the CLI passes as
  // `{}` explicitly in this slice), not from process.env.
  for (const pattern of [
    /process\s*\.\s*env\s*\.\s*GITHUB_TOKEN\b/,
    /process\s*\.\s*env\s*\.\s*GH_TOKEN\b/,
    /process\s*\.\s*env\s*\[\s*GITHUB_TOKEN\s*\]/,
    /process\s*\.\s*env\s*\[\s*GH_TOKEN\s*\]/,
  ]) {
    assert.equal(
      pattern.test(code),
      false,
      `CLI source must not match ${pattern} (would read tokens from process.env)`,
    );
  }
});

// ---------- 7: no network-client imports in CLI ----------

test("CLI source imports no network client or GitHub SDK", async () => {
  const raw = await readFile(cliSourcePath, "utf8");
  const code = stripCommentsAndStrings(raw);

  // Match imports / requires, not arbitrary substring occurrences
  // (the word "got" appears in legitimate error messages elsewhere
  // in the CLI; we only care about actual module references).
  for (const moduleSpec of [
    "@octokit/",
    "@actions/github",
    "octokit",
    "node-fetch",
    "axios",
    "undici",
  ]) {
    // Build an import-style regex: from / require referring to the
    // module spec.
    const escaped = moduleSpec.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const importRegex = new RegExp(`from\\s+["']${escaped}|require\\s*\\(\\s*["']${escaped}`);
    assert.equal(
      importRegex.test(code),
      false,
      `CLI must not import ${moduleSpec} (would imply a network client landed in the dry-run slice)`,
    );
  }

  // Direct call-site checks — these are syntactic markers a
  // network call would leave behind.
  for (const pattern of [
    /\bfetch\s*\(/,
    /https\s*\.\s*request\s*\(/,
    /http\s*\.\s*request\s*\(/,
    /new\s+Request\s*\(/,
  ]) {
    assert.equal(
      pattern.test(code),
      false,
      `CLI must not match ${pattern} (would imply a network call in the dry-run slice)`,
    );
  }

  // `got` as a bare module is tricky because the word appears in
  // legitimate error messages ("got <value>"). Check the import
  // form explicitly.
  assert.equal(
    /from\s+["']got["']|require\s*\(\s*["']got["']\)/.test(code),
    false,
    "CLI must not import the `got` HTTP client",
  );
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
