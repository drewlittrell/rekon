// Contract tests for `rekon scan` — the canonical first-run command
// (Rekon First-Run Scan Implementation).
//
// scan shares the refresh substrate pipeline: it initializes `.rekon/` if needed,
// runs the scan, and reports workspace state + post-scan next actions, without
// prompting, generating docs/agents/CI/verification before the first scan,
// executing commands, or writing source files outside `.rekon/`.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { access, cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

function runCli(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function withFixture(sourceRoot, callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-scan-"));
  try {
    await cp(sourceRoot, root, {
      recursive: true,
      filter(source) {
        return !relative(sourceRoot, source).split(/[\\/]/).includes(".rekon");
      },
    });
    await callback(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

// ---------- first scan from a clean repo (no .rekon) ----------
test("rekon scan --json first-run initializes, builds substrate, reports state + boundaries", async () => {
  await withFixture(exampleRoot, async (root) => {
    // precondition: no .rekon before the first scan
    assert.equal(await exists(join(root, ".rekon")), false, ".rekon must not exist before first scan");

    // (1) scan --json succeeds when `.rekon/` does not exist
    const result = JSON.parse(runCli(["scan", "--root", root, "--json"]).stdout);

    // (2) scan creates `.rekon/`
    assert.equal(await exists(join(root, ".rekon")), true, "scan must create .rekon/");
    assert.equal(await exists(join(root, ".rekon", "config.json")), true, "scan must create config.json");

    // (4) scan creates an artifact index / snapshot substrate
    assert.equal(result.snapshot.ready, true, "snapshot must be ready after first scan");
    assert.ok(result.summary.artifacts > 0, "scan must create substrate artifacts");

    // (5) JSON output reports command scan
    assert.equal(result.command, "scan");
    // (6) stateBefore is not_initialized for first run
    assert.equal(result.workspace.stateBefore, "not_initialized");
    // (7) stateAfter is snapshot_ready
    assert.equal(result.workspace.stateAfter, "snapshot_ready");
    // (8) workspace.initialized is true on first run
    assert.equal(result.workspace.initialized, true);

    // (9)-(15) boundary booleans are all false
    assert.equal(result.boundaries.createdDocs, false);
    assert.equal(result.boundaries.createdAgentHandoff, false);
    assert.equal(result.boundaries.createdCi, false);
    assert.equal(result.boundaries.createdVerificationPlan, false);
    assert.equal(result.boundaries.executedCommands, false);
    assert.equal(result.boundaries.wroteSourceFiles, false);
    assert.equal(result.boundaries.implementedIntentGo, false);
  });
});

// ---------- (3) config posture matches init ----------
test("rekon scan initializes config with the same default posture as rekon init", async () => {
  let initConfig;
  await withFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    initConfig = JSON.parse(await readFile(join(root, ".rekon", "config.json"), "utf8"));
  });

  let scanConfig;
  await withFixture(exampleRoot, async (root) => {
    runCli(["scan", "--root", root, "--json"]);
    scanConfig = JSON.parse(await readFile(join(root, ".rekon", "config.json"), "utf8"));
  });

  // (3) Same default config posture: scan initializes the workspace config via the
  // same default mechanism as init (writeConfigIfMissing) — identical top-level keys,
  // a `capabilities` array, and a `permissions` object. init enumerates the default
  // capability packages; the shared refresh pipeline normalizes config.capabilities to
  // `[]` (= "use default capabilities"), which is existing refresh behavior (a repeat
  // refresh on a fresh repo already works with the empty-capabilities config). Both are
  // the default posture. See review packet "CURRENT INIT / REFRESH BEHAVIOR".
  assert.deepEqual(Object.keys(scanConfig).sort(), Object.keys(initConfig).sort());
  assert.ok(Array.isArray(scanConfig.capabilities), "scan config must have a capabilities array");
  assert.ok(
    scanConfig.permissions &&
      typeof scanConfig.permissions === "object" &&
      !Array.isArray(scanConfig.permissions),
    "scan config must have a permissions object",
  );
  assert.ok(initConfig.capabilities.length > 0, "init must enumerate default capability packages");
});

// ---------- repeat scan ----------
test("rekon scan twice succeeds, reports snapshot_ready, and does not recreate config destructively", async () => {
  await withFixture(exampleRoot, async (root) => {
    runCli(["scan", "--root", root, "--json"]); // first scan
    const configAfterFirst = await readFile(join(root, ".rekon", "config.json"), "utf8");

    // (16) running scan again succeeds
    const second = JSON.parse(runCli(["scan", "--root", root, "--json"]).stdout);
    assert.equal(second.status, "passed");
    // (17) second scan reports stateBefore snapshot_ready
    assert.equal(second.workspace.stateBefore, "snapshot_ready");
    assert.equal(second.workspace.initialized, false);

    // (18) second scan does not recreate config destructively
    const configAfterSecond = await readFile(join(root, ".rekon", "config.json"), "utf8");
    assert.equal(configAfterSecond, configAfterFirst, "scan must not rewrite an existing config");
  });
});

// ---------- human output ----------
test("rekon scan human output mentions Rekon scan, next actions, and the boundary statement", async () => {
  await withFixture(exampleRoot, async (root) => {
    const out = runCli(["scan", "--root", root]).stdout;
    // (19) human output mentions Rekon scan
    assert.match(out, /Rekon scan/);
    // (20) human output includes next actions
    assert.match(out, /rekon intent assess/);
    assert.match(out, /rekon publish agents/);
    assert.match(out, /rekon resolve preflight/);
    // (21) human output includes the boundary statement
    assert.ok(
      out.includes(
        "No commands, source writes, docs, agent handoffs, CI changes, or intent:go were created by scan.",
      ),
      "human output must include the scan boundary statement",
    );
    // first scan on a clean repo says "First scan complete." and "initialized"
    assert.ok(out.includes("First scan complete."), "first scan should say First scan complete.");
    assert.match(out, /Workspace: initialized/);
  });
});

// ---------- help ----------
test("rekon help lists scan and still lists refresh as expert / compatibility", async () => {
  const help = runCli(["help"]).stdout;
  // (22) help lists scan
  assert.ok(help.includes("rekon scan ["), "help must list rekon scan");
  // (23) help still lists refresh
  assert.ok(help.includes("rekon refresh ["), "help must still list rekon refresh");
  // (24) help describes refresh as expert / compatibility / update command
  assert.ok(
    help.includes("expert / compatibility update command"),
    "help must describe refresh as an expert / compatibility update command",
  );
});

// ---------- no ASCII art in JSON ----------
test("rekon scan --json emits no ASCII art and is pure JSON", async () => {
  await withFixture(exampleRoot, async (root) => {
    const raw = runCli(["scan", "--root", root, "--json"]).stdout;
    // (25) scan --json must not contain ASCII art / box-drawing characters
    assert.ok(!/[┌┐└┘─│╔╗╚╝═║]/.test(raw), "scan --json must not contain ASCII art");
    assert.equal(raw.trim().startsWith("{"), true, "scan --json must be pure JSON (no banner prefix)");
    JSON.parse(raw); // throws (fails the test) if the output is not pure JSON
  });
});
