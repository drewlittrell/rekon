// Contract tests for the path-freshness publication
// surfacing slice (P1.1
// path-freshness-publication-surfacing). Pins:
//
//   1. architecture summary renders no-report
//      guidance when PathFreshnessReport is absent.
//   2. architecture summary renders status fresh.
//   3. architecture summary renders status stale.
//   4. architecture summary renders the
//      changed/missing/new path table when stale.
//   5. architecture summary cites PathFreshnessReport
//      in header.inputRefs when present.
//   6. agent contract renders the working-tree
//      freshness subsection.
//   7. agent contract warns agents when stale (via the
//      new Do-Not-Do reminder).
//   8. agent contract says artifact lineage freshness
//      is not working-tree freshness.
//   9. agent contract cites PathFreshnessReport in
//      header.inputRefs when present.
//  10. proof report renders the compact working-tree
//      freshness context section.
//  11. publication generation does not create a new
//      PathFreshnessReport.
//  12. publication generation does not run refresh.
//  13. `artifacts validate` remains clean.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cp,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliEntry = join(repoRoot, "packages", "cli", "dist", "index.js");
const exampleRoot = join(repoRoot, "examples", "simple-js-ts");

async function makeRepo() {
  const tmp = await mkdtemp(join(tmpdir(), "rekon-path-freshness-pub-"));
  const root = join(tmp, "simple-js-ts");
  await cp(exampleRoot, root, { recursive: true });
  return { tmp, root, cleanup: () => rm(tmp, { recursive: true, force: true }) };
}

function runCli(args, root) {
  const result = spawnSync("node", [cliEntry, ...args, "--root", root, "--json"], {
    encoding: "utf8",
    env: { ...process.env, NODE_ENV: "test" },
  });
  if (result.status !== 0) {
    throw new Error(
      `CLI ${args.join(" ")} exited ${result.status}: ${result.stderr || result.stdout}`,
    );
  }
  return JSON.parse(result.stdout);
}

async function readPublicationContent(root, kind) {
  const result = runCli(["publish", kind], root);
  const ref = result.artifacts?.[0];
  if (!ref?.path) {
    throw new Error(`publish ${kind} returned no artifact path: ${JSON.stringify(result)}`);
  }
  const raw = await readFile(join(root, ref.path), "utf8");
  const json = JSON.parse(raw);
  return { content: json.content, header: json.header, ref };
}

function artifactCountsByType(listing) {
  const items = Array.isArray(listing) ? listing : listing.artifacts ?? [];
  const counts = new Map();
  for (const entry of items) {
    if (!entry || typeof entry !== "object") continue;
    const type = entry.type;
    if (typeof type !== "string") continue;
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }
  return counts;
}

// ---------- 1: architecture summary no-report guidance ----------

test("architecture summary renders no-report guidance when PathFreshnessReport is absent", async () => {
  const { root, cleanup } = await makeRepo();
  try {
    runCli(["init"], root);
    // Note: never run `rekon paths freshness` here so no
    // PathFreshnessReport exists.
    const { content } = await readPublicationContent(root, "architecture");
    assert.match(content, /## Working Tree Path Freshness/);
    assert.match(content, /No `PathFreshnessReport` found/i);
    assert.match(content, /rekon paths freshness/);
  } finally {
    await cleanup();
  }
});

// ---------- 2: status fresh ----------

test("architecture summary renders status fresh when baseline matches working tree", async () => {
  const { root, cleanup } = await makeRepo();
  try {
    runCli(["init"], root);
    runCli(["paths", "freshness"], root); // first run = unknown baseline
    runCli(["paths", "freshness"], root); // second run = fresh
    const { content } = await readPublicationContent(root, "architecture");
    assert.match(content, /## Working Tree Path Freshness/);
    assert.match(content, /Status: fresh/);
    assert.match(content, /Refresh recommended: no/);
  } finally {
    await cleanup();
  }
});

// ---------- 3: status stale ----------

test("architecture summary renders status stale after a tracked path changes", async () => {
  const { root, cleanup } = await makeRepo();
  try {
    runCli(["init"], root);
    runCli(["paths", "freshness", "--path", "src/index.ts"], root);
    await writeFile(join(root, "src", "index.ts"), "// edit\nexport const z = 1;\n");
    runCli(["paths", "freshness", "--path", "src/index.ts"], root);
    const { content } = await readPublicationContent(root, "architecture");
    assert.match(content, /## Working Tree Path Freshness/);
    assert.match(content, /Status: stale/);
    assert.match(content, /Refresh recommended: yes/);
    assert.match(content, /rekon refresh/);
  } finally {
    await cleanup();
  }
});

// ---------- 4: changed/missing/new path table ----------

test("architecture summary renders the changed/missing/new path table when stale", async () => {
  const { root, cleanup } = await makeRepo();
  try {
    runCli(["init"], root);
    runCli(["paths", "freshness", "--path", "src/index.ts"], root);
    await writeFile(join(root, "src", "index.ts"), "// edit-2\nexport const q = 1;\n");
    runCli(["paths", "freshness", "--path", "src/index.ts"], root);
    const { content } = await readPublicationContent(root, "architecture");
    assert.match(content, /\| Path \| Status \| Message \|/);
    assert.match(content, /\| src\/index\.ts \| changed \|/);
  } finally {
    await cleanup();
  }
});

// ---------- 5: architecture summary cites PathFreshnessReport in inputRefs ----------

test("architecture summary cites PathFreshnessReport in header.inputRefs when present", async () => {
  const { root, cleanup } = await makeRepo();
  try {
    runCli(["init"], root);
    runCli(["paths", "freshness"], root);
    const { header } = await readPublicationContent(root, "architecture");
    const refs = Array.isArray(header?.inputRefs) ? header.inputRefs : [];
    const hasReportRef = refs.some((ref) => ref?.type === "PathFreshnessReport");
    assert.ok(hasReportRef, `expected PathFreshnessReport in inputRefs; got ${JSON.stringify(refs)}`);
  } finally {
    await cleanup();
  }
});

// ---------- 6: agent contract renders the section ----------

test("agent contract renders the working-tree path freshness subsection", async () => {
  const { root, cleanup } = await makeRepo();
  try {
    runCli(["init"], root);
    runCli(["paths", "freshness"], root);
    const { content } = await readPublicationContent(root, "agent-contract");
    assert.match(content, /### Working Tree Path Freshness/);
    assert.match(content, /Status: (fresh|stale|unknown)/);
  } finally {
    await cleanup();
  }
});

// ---------- 7: agent contract warns when stale ----------

test("agent contract warns agents when working-tree freshness is stale", async () => {
  const { root, cleanup } = await makeRepo();
  try {
    runCli(["init"], root);
    runCli(["paths", "freshness", "--path", "src/index.ts"], root);
    await writeFile(join(root, "src", "index.ts"), "// dirty\nexport const dirty = 1;\n");
    runCli(["paths", "freshness", "--path", "src/index.ts"], root);
    const { content } = await readPublicationContent(root, "agent-contract");
    assert.match(content, /Status: stale/);
    assert.match(content, /Working-tree paths have drifted/i);
    // Also pin the Do-Not-Do reminder.
    assert.match(
      content,
      /Do not treat artifact lineage freshness as proof that the working tree has not changed/i,
    );
  } finally {
    await cleanup();
  }
});

// ---------- 8: agent contract pins lineage ≠ working-tree distinction ----------

test("agent contract pins: artifact lineage freshness is not working-tree freshness", async () => {
  const { root, cleanup } = await makeRepo();
  try {
    runCli(["init"], root);
    runCli(["paths", "freshness"], root);
    const { content } = await readPublicationContent(root, "agent-contract");
    assert.match(
      content,
      /Working-tree freshness is distinct from artifact lineage freshness/i,
    );
  } finally {
    await cleanup();
  }
});

// ---------- 9: agent contract cites PathFreshnessReport ----------

test("agent contract cites PathFreshnessReport in header.inputRefs when present", async () => {
  const { root, cleanup } = await makeRepo();
  try {
    runCli(["init"], root);
    runCli(["paths", "freshness"], root);
    const { header } = await readPublicationContent(root, "agent-contract");
    const refs = Array.isArray(header?.inputRefs) ? header.inputRefs : [];
    assert.ok(
      refs.some((ref) => ref?.type === "PathFreshnessReport"),
      `expected PathFreshnessReport in inputRefs; got ${JSON.stringify(refs)}`,
    );
  } finally {
    await cleanup();
  }
});

// ---------- 10: proof report renders compact section ----------

test("proof report renders compact working-tree freshness context", async () => {
  const { root, cleanup } = await makeRepo();
  try {
    runCli(["init"], root);
    runCli(["paths", "freshness"], root);
    const { content, header } = await readPublicationContent(root, "proof");
    assert.match(content, /## Working Tree Path Freshness/);
    assert.match(content, /Status: (fresh|stale|unknown)/);
    const refs = Array.isArray(header?.inputRefs) ? header.inputRefs : [];
    assert.ok(
      refs.some((ref) => ref?.type === "PathFreshnessReport"),
      `expected PathFreshnessReport in proof-report inputRefs; got ${JSON.stringify(refs)}`,
    );
  } finally {
    await cleanup();
  }
});

// ---------- 11: publication generation does not create a new PathFreshnessReport ----------

test("publication generation does not create a new PathFreshnessReport", async () => {
  const { root, cleanup } = await makeRepo();
  try {
    runCli(["init"], root);
    runCli(["paths", "freshness"], root);
    const before = artifactCountsByType(runCli(["artifacts", "list"], root));
    runCli(["publish", "architecture"], root);
    runCli(["publish", "agent-contract"], root);
    runCli(["publish", "proof"], root);
    const after = artifactCountsByType(runCli(["artifacts", "list"], root));
    assert.equal(
      after.get("PathFreshnessReport") ?? 0,
      before.get("PathFreshnessReport") ?? 0,
      "publishers must NOT write new PathFreshnessReport artifacts",
    );
  } finally {
    await cleanup();
  }
});

// ---------- 12: publication generation does not run paths freshness or write a new PathFreshnessReport ----------

test("publication generation does not run `rekon paths freshness` (read-only against PathFreshnessReport)", async () => {
  // The existing `publish architecture` CLI flow calls
  // ensureSnapshotReady() which may add a snapshot/evidence
  // chain on first run — that is pre-existing behaviour
  // unrelated to this slice. The path-freshness publication
  // surfacing claim is narrower: publishers MUST cite the
  // existing PathFreshnessReport without writing a new one
  // and without calling `rekon paths freshness` themselves.
  const { root, cleanup } = await makeRepo();
  try {
    runCli(["init"], root);
    runCli(["paths", "freshness"], root);
    const reportListBefore = runCli(["artifacts", "list"], root);
    const beforeCount = (artifactCountsByType(reportListBefore).get("PathFreshnessReport") ?? 0);
    // Latest PathFreshnessReport id captured before publish:
    const items = Array.isArray(reportListBefore)
      ? reportListBefore
      : reportListBefore.artifacts ?? [];
    const priorIds = items
      .filter((entry) => entry?.type === "PathFreshnessReport")
      .map((entry) => entry.id);
    const latestPriorId = priorIds[priorIds.length - 1];
    assert.ok(latestPriorId, "expected at least one PathFreshnessReport before publish");

    const archResult = await readPublicationContent(root, "architecture");
    const agentResult = await readPublicationContent(root, "agent-contract");
    const proofResult = await readPublicationContent(root, "proof");

    const afterCount = (artifactCountsByType(runCli(["artifacts", "list"], root))
      .get("PathFreshnessReport") ?? 0);
    assert.equal(
      afterCount,
      beforeCount,
      "publish must not add a new PathFreshnessReport (must read the existing one)",
    );

    for (const [name, res] of [
      ["architecture", archResult],
      ["agent-contract", agentResult],
      ["proof", proofResult],
    ]) {
      const refs = Array.isArray(res.header?.inputRefs) ? res.header.inputRefs : [];
      const reportRef = refs.find((ref) => ref?.type === "PathFreshnessReport");
      assert.ok(reportRef, `expected ${name} to cite PathFreshnessReport`);
      assert.equal(
        reportRef.id,
        latestPriorId,
        `${name} must cite the existing PathFreshnessReport, not a fresh one`,
      );
    }
  } finally {
    await cleanup();
  }
});

// ---------- 13: artifacts validate remains clean ----------

test("artifacts validate remains clean after path-freshness publication surfacing", async () => {
  const { root, cleanup } = await makeRepo();
  try {
    runCli(["init"], root);
    runCli(["paths", "freshness"], root);
    runCli(["paths", "freshness"], root);
    await writeFile(join(root, "src", "index.ts"), "// edit-c\nexport const c = 1;\n");
    runCli(["paths", "freshness", "--path", "src/index.ts"], root);
    runCli(["publish", "architecture"], root);
    runCli(["publish", "agent-contract"], root);
    runCli(["publish", "proof"], root);
    const validate = runCli(["artifacts", "validate"], root);
    assert.equal(validate.valid, true, `expected valid: true; got ${JSON.stringify(validate.issues)}`);
  } finally {
    await cleanup();
  }
});
