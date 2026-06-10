// Behavioral test for scripts/stamp-doc-snapshots.mjs (WO-5): the stamp is
// additive, allowlist-aware, archive-skipping, and idempotent (a second run
// is byte-identical).

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import { after, test } from "node:test";

import { LIVING_NOTE, SNAPSHOT_BANNER } from "../../scripts/stamp-doc-snapshots.mjs";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const scriptPath = join(repoRoot, "scripts/stamp-doc-snapshots.mjs");

const tempRoots = [];

after(() => {
  for (const root of tempRoots) {
    rmSync(root, { recursive: true, force: true });
  }
});

function buildFixtureTree() {
  const root = mkdtempSync(join(tmpdir(), "rekon-stamp-"));
  tempRoots.push(root);

  writeFileSync(join(root, "north-star.md"), "# NorthStar\n\nLiving strategy content.\n", "utf8");
  writeFileSync(join(root, "some-memo.md"), "# Some memo\n\nDecision text.\n", "utf8");
  writeFileSync(
    join(root, "already-stamped.md"),
    `# Already stamped\n\n${SNAPSHOT_BANNER}\n\nOlder decision text.\n`,
    "utf8",
  );
  mkdirSync(join(root, "real-repo-cohort"), { recursive: true });
  writeFileSync(join(root, "real-repo-cohort", "report.md"), "# Cohort report\n\nFindings.\n", "utf8");
  mkdirSync(join(root, "archive"), { recursive: true });
  writeFileSync(join(root, "archive", "old-memo.md"), "# Old memo\n\nSuperseded text.\n", "utf8");

  return root;
}

function hashTree(root) {
  const hashes = new Map();

  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const entryPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        walk(entryPath);
      } else {
        hashes.set(relative(root, entryPath), createHash("sha256").update(readFileSync(entryPath)).digest("hex"));
      }
    }
  };

  walk(root);
  return hashes;
}

function runStamp(root) {
  const result = spawnSync(process.execPath, [scriptPath, "--root", root], { encoding: "utf8" });
  assert.equal(result.status, 0, `stamp script failed:\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

test("stamp inserts the banner after the H1, notes the allowlist, skips archive, and is idempotent", () => {
  const root = buildFixtureTree();

  const firstOutput = runStamp(root);
  assert.match(firstOutput, /2 stamped, 1 living-noted/);

  const memo = readFileSync(join(root, "some-memo.md"), "utf8");
  assert.ok(memo.startsWith(`# Some memo\n\n${SNAPSHOT_BANNER}\n`), "banner must sit immediately after the H1");
  assert.ok(memo.includes("Decision text."), "memo content must be untouched");

  const cohort = readFileSync(join(root, "real-repo-cohort", "report.md"), "utf8");
  assert.ok(cohort.includes(SNAPSHOT_BANNER), "subdirectory memos are stamped");

  const northStar = readFileSync(join(root, "north-star.md"), "utf8");
  assert.ok(northStar.includes(LIVING_NOTE), "allowlist files receive the living note");
  assert.ok(!northStar.includes("**SNAPSHOT.**"), "allowlist files must not receive the snapshot banner");

  const archived = readFileSync(join(root, "archive", "old-memo.md"), "utf8");
  assert.equal(archived, "# Old memo\n\nSuperseded text.\n", "archive/ is never touched");

  const stamped = readFileSync(join(root, "already-stamped.md"), "utf8");
  assert.equal(stamped.split("**SNAPSHOT.**").length, 2, "already-stamped files gain no second banner");

  const before = hashTree(root);
  runStamp(root);
  const afterTree = hashTree(root);

  assert.deepEqual([...afterTree.entries()].sort(), [...before.entries()].sort(), "second run must be byte-identical");
});
