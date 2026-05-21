// Contract tests for `rekon artifacts latest` (P1.1
// artifacts-latest-cli-helper).
//
// The helper is **read-only**: it reads the artifact index
// (and optionally artifact bodies for Publication --kind
// filtering) and writes nothing. Tests pin:
//
//   - latest-by-type behaviour
//   - missing → null + exit 1
//   - --allow-missing → exit 0
//   - --id-only emits typed ref to stdout (no JSON)
//   - --type Publication --kind proof-report filters by
//     body.kind
//   - --kind with non-Publication type fails
//   - kind lookup reads body.kind (not id prefix)
//   - older artifact of same type is ignored
//   - artifact index is unchanged before/after (read-only)
//   - `artifacts validate` stays clean

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- 1: latest-by-type returns the entry ----------

test("artifacts latest --type returns latest artifact ref", async () => {
  await withFixture(async (root) => {
    runCliJson([
      "intent", "work-order",
      "--path", "src/index.ts",
      "--goal", "Latest helper smoke",
      "--root", root, "--json",
    ]);

    const result = runCliJson([
      "artifacts", "latest",
      "--type", "VerificationPlan",
      "--root", root, "--json",
    ]);

    assert.equal(result.artifact.type, "VerificationPlan");
    assert.ok(result.artifact.id.startsWith("verification-plan-"));
    assert.ok(typeof result.artifact.path === "string");
    assert.ok(typeof result.artifact.schemaVersion === "string");
  });
});

// ---------- 2: missing → null + exit 1 ----------

test("artifacts latest exits 1 with null when artifact is missing", async () => {
  await withFixture(async (root) => {
    const result = runCliExpectFailure([
      "artifacts", "latest",
      "--type", "VerificationPlan",
      "--root", root, "--json",
    ]);

    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.artifact, null);
    assert.match(parsed.message, /No artifact found/);
  });
});

// ---------- 3: --allow-missing → exit 0 ----------

test("artifacts latest --allow-missing returns artifact null with exit 0", async () => {
  await withFixture(async (root) => {
    const result = runCliJson([
      "artifacts", "latest",
      "--type", "VerificationPlan",
      "--allow-missing",
      "--root", root, "--json",
    ]);

    assert.equal(result.artifact, null);
    assert.match(result.message, /No artifact found/);
  });
});

// ---------- 4: --id-only emits typed ref to stdout ----------

test("artifacts latest --id-only emits a typed ref and no JSON", async () => {
  await withFixture(async (root) => {
    runCliJson([
      "intent", "work-order",
      "--path", "src/index.ts",
      "--goal", "id-only smoke",
      "--root", root, "--json",
    ]);

    const raw = runCli([
      "artifacts", "latest",
      "--type", "VerificationPlan",
      "--id-only",
      "--root", root,
    ]).stdout.trim();

    assert.match(raw, /^VerificationPlan:verification-plan-\d+/);
    assert.equal(raw.includes("{"), false, "id-only output must not be JSON");
  });
});

// ---------- 5: --type Publication --kind proof-report ----------

test("artifacts latest --type Publication --kind proof-report returns the latest proof report", async () => {
  await withFixture(async (root) => {
    // Generate a plan so `publish proof` has something to cite.
    runCliJson([
      "intent", "work-order",
      "--path", "src/index.ts",
      "--goal", "kind smoke",
      "--root", root, "--json",
    ]);
    runCliJson(["publish", "proof", "--root", root, "--json"]);

    const result = runCliJson([
      "artifacts", "latest",
      "--type", "Publication",
      "--kind", "proof-report",
      "--root", root, "--json",
    ]);

    assert.equal(result.artifact.type, "Publication");
    assert.equal(result.kind, "proof-report");
    // Confirm the chosen Publication's body really has kind: "proof-report".
    const body = JSON.parse(await readFile(join(root, result.artifact.path), "utf8"));
    assert.equal(body.kind, "proof-report");
  });
});

// ---------- 6: --kind with non-Publication type fails clearly ----------

test("artifacts latest --kind on a non-Publication type fails clearly", async () => {
  await withFixture(async (root) => {
    const failure = runCliExpectFailure([
      "artifacts", "latest",
      "--type", "VerificationPlan",
      "--kind", "proof-report",
      "--root", root, "--json",
    ]);

    assert.match(
      failure.stderr,
      /--kind is only valid with --type Publication/,
    );
  });
});

// ---------- 7: kind lookup reads body.kind ----------

test("artifacts latest --kind reads body.kind, not id prefix", async () => {
  await withFixture(async (root) => {
    runCliJson([
      "intent", "work-order",
      "--path", "src/index.ts",
      "--goal", "kind body smoke",
      "--root", root, "--json",
    ]);

    // Generate two Publications with different kinds. The second
    // call (architecture-summary) is newer; with no kind filter
    // it should win, but with --kind proof-report the helper must
    // walk past it and return the older proof-report.
    runCliJson(["publish", "proof", "--root", root, "--json"]);
    runCliJson(["publish", "architecture", "--root", root, "--json"]);

    const latestAny = runCliJson([
      "artifacts", "latest",
      "--type", "Publication",
      "--root", root, "--json",
    ]);
    assert.equal(latestAny.artifact.type, "Publication");
    // The newer publication should win without a kind filter.
    const latestAnyBody = JSON.parse(
      await readFile(join(root, latestAny.artifact.path), "utf8"),
    );
    assert.equal(
      latestAnyBody.kind,
      "architecture-summary",
      `expected architecture-summary; got kind ${latestAnyBody.kind}`,
    );

    const filtered = runCliJson([
      "artifacts", "latest",
      "--type", "Publication",
      "--kind", "proof-report",
      "--root", root, "--json",
    ]);
    const filteredBody = JSON.parse(
      await readFile(join(root, filtered.artifact.path), "utf8"),
    );
    assert.equal(filteredBody.kind, "proof-report");
  });
});

// ---------- 8: older artifact ignored ----------

test("artifacts latest ignores older artifacts of the same type", async () => {
  await withFixture(async (root) => {
    const first = runCliJson([
      "intent", "work-order",
      "--path", "src/index.ts",
      "--goal", "First plan",
      "--root", root, "--json",
    ]);
    const firstPlan = first.artifacts.find((entry) => entry.type === "VerificationPlan");
    // Wait at least 1 ms so the artifact id timestamp changes.
    await new Promise((resolveAfter) => setTimeout(resolveAfter, 5));
    const second = runCliJson([
      "intent", "work-order",
      "--path", "src/index.ts",
      "--goal", "Second plan",
      "--root", root, "--json",
    ]);
    const secondPlan = second.artifacts.find((entry) => entry.type === "VerificationPlan");
    assert.notEqual(firstPlan.id, secondPlan.id);

    const latest = runCliJson([
      "artifacts", "latest",
      "--type", "VerificationPlan",
      "--root", root, "--json",
    ]);
    assert.equal(latest.artifact.id, secondPlan.id);
  });
});

// ---------- 9: command is read-only ----------

test("artifacts latest is read-only — artifact index unchanged before/after", async () => {
  await withFixture(async (root) => {
    runCliJson([
      "intent", "work-order",
      "--path", "src/index.ts",
      "--goal", "Read-only smoke",
      "--root", root, "--json",
    ]);
    const indexPath = join(root, ".rekon/registry/artifacts.index.json");
    const before = await readFile(indexPath, "utf8");

    runCliJson([
      "artifacts", "latest",
      "--type", "VerificationPlan",
      "--root", root, "--json",
    ]);
    runCli([
      "artifacts", "latest",
      "--type", "VerificationPlan",
      "--id-only",
      "--root", root,
    ]);
    runCliJson([
      "artifacts", "latest",
      "--type", "Publication",
      "--kind", "proof-report",
      "--allow-missing",
      "--root", root, "--json",
    ]);

    const after = await readFile(indexPath, "utf8");
    assert.equal(after, before, "artifact index changed after `artifacts latest`");
  });
});

// ---------- 10: artifacts validate stays clean ----------

test("artifacts validate stays clean after artifacts latest calls", async () => {
  await withFixture(async (root) => {
    runCliJson([
      "intent", "work-order",
      "--path", "src/index.ts",
      "--goal", "Validate smoke",
      "--root", root, "--json",
    ]);
    runCliJson([
      "artifacts", "latest",
      "--type", "VerificationPlan",
      "--root", root, "--json",
    ]);
    const validation = runCliJson(["artifacts", "validate", "--root", root, "--json"]);
    assert.equal(validation.valid, true, `validate issues: ${JSON.stringify(validation.issues)}`);
  });
});

// ---------- 11: --type required ----------

test("artifacts latest without --type fails clearly", async () => {
  await withFixture(async (root) => {
    const failure = runCliExpectFailure([
      "artifacts", "latest",
      "--root", root, "--json",
    ]);
    assert.match(failure.stderr, /requires --type/);
  });
});

// ---------- 12: --id-only missing exits 1 ----------

test("artifacts latest --id-only --type X with no match exits 1 and writes to stderr", async () => {
  await withFixture(async (root) => {
    const failure = runCliExpectFailure([
      "artifacts", "latest",
      "--type", "VerificationPlan",
      "--id-only",
      "--root", root,
    ]);
    assert.match(failure.stderr, /No artifact found/);
    assert.equal(failure.stdout.trim(), "");
  });
});

// ---------- helpers ----------

async function withFixture(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-artifacts-latest-"));

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
