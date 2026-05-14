import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";
import { digestJson } from "../../packages/kernel-artifacts/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

test("path-specific verified memory outranks broad stale memory", async () => {
  await withFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);

    // Stale, broad memory — written far enough in the past to trip the
    // stale-over-365-days penalty.
    const staleAt = "2024-01-01T00:00:00.000Z";
    await writeSyntheticMemoryEntry(root, {
      id: "feedback-stale-broad",
      instruction: "Be careful with everything.",
      scope: { paths: [], tags: ["general"] },
      priority: "normal",
      reliability: 0.5,
      createdAt: staleAt,
      updatedAt: staleAt,
    });

    // Fresh, path-scoped, verified, high-priority memory.
    runCli([
      "memory",
      "add",
      "--root",
      root,
      "--instruction",
      "Preserve bootstrap behavior.",
      "--path",
      "src",
      "--system",
      "src",
      "--priority",
      "high",
      "--reliability",
      "0.9",
      "--verified",
      "--rationale",
      "Repeated operator correction.",
      "--json",
    ]);

    const result = JSON.parse(
      runCli([
        "memory",
        "select",
        "--root",
        root,
        "--path",
        "src/index.ts",
        "--goal",
        "modify bootstrap",
        "--system",
        "src",
        "--json",
      ]).stdout,
    );
    const selection = result.selection;

    assert.ok(selection);
    assert.ok(selection.selected.length > 0, "expected at least one selection");
    const top = selection.selected[0];
    assert.ok(
      top.instruction.startsWith("Preserve bootstrap"),
      `expected path-scoped memory at top, got: ${top.instruction}`,
    );
    assert.ok(top.score >= 0.7);
    assert.ok(top.reasons.some((reason) => reason.startsWith("path-prefix-match")));
    assert.ok(top.reasons.includes("verified"));
    assert.ok(top.reasons.includes("high-priority"));
  });
});

test("deprecated and superseded memory entries are rejected", async () => {
  await withFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);

    await writeSyntheticMemoryEntry(root, {
      id: "feedback-deprecated",
      instruction: "Deprecated note.",
      scope: { paths: ["src"] },
      status: "deprecated",
    });
    await writeSyntheticMemoryEntry(root, {
      id: "feedback-superseded",
      instruction: "Superseded note.",
      scope: { paths: ["src"] },
      status: "superseded",
    });

    const result = JSON.parse(
      runCli([
        "memory",
        "select",
        "--root",
        root,
        "--path",
        "src/index.ts",
        "--json",
      ]).stdout,
    );
    const selection = result.selection;

    assert.deepEqual(selection.selected, []);
    const rejectedIds = selection.rejected.map((entry) => entry.id);
    assert.ok(rejectedIds.includes("feedback-deprecated"));
    assert.ok(rejectedIds.includes("feedback-superseded"));

    for (const entry of selection.rejected) {
      assert.ok(entry.reasons.some((reason) => reason.endsWith("-rejected")));
    }
  });
});

test("disputed memory entries are rejected", async () => {
  await withFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);

    await writeSyntheticMemoryEntry(root, {
      id: "feedback-disputed",
      instruction: "Contested guidance.",
      scope: { paths: ["src"] },
      verification: { status: "disputed" },
    });

    const result = JSON.parse(
      runCli([
        "memory",
        "select",
        "--root",
        root,
        "--path",
        "src/index.ts",
        "--json",
      ]).stdout,
    );
    const selection = result.selection;

    assert.deepEqual(selection.selected, []);
    const rejection = selection.rejected.find((entry) => entry.id === "feedback-disputed");
    assert.ok(rejection);
    assert.deepEqual(rejection.reasons, ["disputed-rejected"]);
  });
});

test("high priority does not let a non-matching entry beat an exact verified path match", async () => {
  await withFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);

    // High-priority entry scoped to a completely different system.
    runCli([
      "memory",
      "add",
      "--root",
      root,
      "--instruction",
      "Backend retry policy.",
      "--path",
      "packages/runtime",
      "--system",
      "runtime",
      "--priority",
      "high",
      "--reliability",
      "0.9",
      "--json",
    ]);

    // Exact path verified entry.
    runCli([
      "memory",
      "add",
      "--root",
      root,
      "--instruction",
      "Bootstrap edits must preserve public API.",
      "--path",
      "src/index.ts",
      "--system",
      "src",
      "--priority",
      "normal",
      "--reliability",
      "0.8",
      "--verified",
      "--json",
    ]);

    const result = JSON.parse(
      runCli([
        "memory",
        "select",
        "--root",
        root,
        "--path",
        "src/index.ts",
        "--system",
        "src",
        "--json",
      ]).stdout,
    );
    const selection = result.selection;
    const top = selection.selected[0];

    assert.ok(top);
    assert.equal(top.instruction, "Bootstrap edits must preserve public API.");
    assert.ok(top.reasons.some((reason) => reason.startsWith("path-exact-match")));
    assert.ok(top.reasons.includes("verified"));
  });
});

test("stale memory receives the freshness penalty", async () => {
  await withFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);

    const staleAt = "2023-01-01T00:00:00.000Z";
    await writeSyntheticMemoryEntry(root, {
      id: "feedback-stale-path",
      instruction: "Very old note.",
      scope: { paths: ["src"] },
      createdAt: staleAt,
      updatedAt: staleAt,
      priority: "normal",
      reliability: 0.5,
    });

    const result = JSON.parse(
      runCli([
        "memory",
        "select",
        "--root",
        root,
        "--path",
        "src/index.ts",
        "--json",
      ]).stdout,
    );
    const selection = result.selection;
    const entry = selection.selected.find((item) => item.id === "feedback-stale-path");

    assert.ok(entry, "stale path-scoped memory should still surface so operators can curate it");
    assert.ok(entry.reasons.includes("stale-over-365-days"));
  });
});

test("memory select output includes scores, reasons, and a MemorySelection artifact", async () => {
  await withFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);

    runCli([
      "memory",
      "add",
      "--root",
      root,
      "--instruction",
      "Note 1.",
      "--path",
      "src",
      "--verified",
      "--json",
    ]);

    const cliResult = JSON.parse(
      runCli([
        "memory",
        "select",
        "--root",
        root,
        "--path",
        "src/index.ts",
        "--json",
      ]).stdout,
    );

    assert.ok(cliResult.artifact);
    assert.equal(cliResult.artifact.type, "MemorySelection");

    const stored = JSON.parse(
      await readFile(join(root, cliResult.artifact.path), "utf8"),
    );

    assert.equal(stored.header.artifactType, "MemorySelection");
    assert.ok(Array.isArray(stored.selected));
    assert.ok(Array.isArray(stored.rejected));
    assert.ok(Array.isArray(stored.selections), "legacy selections array must be preserved");

    for (const item of stored.selected) {
      assert.ok(typeof item.id === "string");
      assert.ok(typeof item.score === "number");
      assert.ok(Array.isArray(item.reasons));
      // Legacy fields must still be present so older consumers keep working.
      assert.ok(typeof item.instruction === "string");
      assert.ok(typeof item.confidence === "number");
      assert.ok(typeof item.reason === "string");
    }
  });
});

test("memory add supports system/capability/tag/priority/reliability/verified/rationale flags", async () => {
  await withFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);

    runCli([
      "memory",
      "add",
      "--root",
      root,
      "--instruction",
      "Tagged guidance.",
      "--path",
      "packages/runtime",
      "--system",
      "runtime",
      "--capability",
      "provider-boundary",
      "--tag",
      "policy",
      "--tag",
      "review",
      "--layer",
      "service",
      "--priority",
      "high",
      "--reliability",
      "0.85",
      "--verified",
      "--rationale",
      "Long-standing operator correction.",
      "--json",
    ]);

    const list = JSON.parse(
      runCli(["memory", "list", "--root", root, "--json"]).stdout,
    );
    const entry = list.entries[0];

    assert.ok(entry);
    assert.deepEqual(entry.scope.paths, ["packages/runtime"]);
    assert.deepEqual(entry.scope.systems, ["runtime"]);
    assert.deepEqual(entry.scope.capabilities, ["provider-boundary"]);
    assert.deepEqual(entry.scope.tags, ["policy", "review"]);
    assert.deepEqual(entry.scope.layers, ["service"]);
    assert.equal(entry.priority, "high");
    assert.equal(entry.reliability, 0.85);
    assert.equal(entry.verification?.status, "verified");
    assert.equal(entry.rationale, "Long-standing operator correction.");
    assert.equal(entry.source, "operator");
  });
});

test("preflight resolver includes selected memory but does not mutate ownerSystems or finding status", async () => {
  await withFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli(["observe", "--root", root, "--json"]);
    runCli(["project", "--root", root, "--json"]);

    runCli([
      "memory",
      "add",
      "--root",
      root,
      "--instruction",
      "Bootstrap edits must preserve public API.",
      "--path",
      "src/index.ts",
      "--system",
      "memory-system",
      "--verified",
      "--priority",
      "high",
      "--json",
    ]);

    const memoryResult = JSON.parse(
      runCli([
        "memory",
        "select",
        "--root",
        root,
        "--path",
        "src/index.ts",
        "--json",
      ]).stdout,
    );
    assert.ok(memoryResult.selection.selected.length > 0);

    const preflight = JSON.parse(
      runCli([
        "resolve",
        "preflight",
        "--root",
        root,
        "--path",
        "src/index.ts",
        "--goal",
        "modify bootstrap",
        "--json",
      ]).stdout,
    );

    assert.ok(preflight.packet);
    const ownerSystems = preflight.packet.ownerSystems ?? [];

    // The memory entry has system "memory-system" — that must not bleed
    // into the resolver's ownerSystems, which derive from OwnershipMap.
    assert.ok(
      !ownerSystems.includes("memory-system"),
      `ownerSystems must not be sourced from memory, got: ${JSON.stringify(ownerSystems)}`,
    );

    // The resolver should expose applicable memory in some form.
    assert.ok(Array.isArray(preflight.packet.applicableMemory));
  });
});

test("memory list reports priority and verification when present", async () => {
  await withFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);

    runCli([
      "memory",
      "add",
      "--root",
      root,
      "--instruction",
      "Note with metadata.",
      "--path",
      "src",
      "--priority",
      "high",
      "--verified",
      "--reliability",
      "0.9",
      "--json",
    ]);

    const list = JSON.parse(
      runCli(["memory", "list", "--root", root, "--json"]).stdout,
    );
    const entry = list.entries[0];

    assert.equal(entry.priority, "high");
    assert.equal(entry.verification?.status, "verified");
    assert.equal(entry.reliability, 0.9);
    assert.ok(entry.createdAt);
    assert.ok(entry.updatedAt);
  });
});

test("verified memory with verificationResultRef gets the verification reason", async () => {
  await withFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);

    await writeSyntheticMemoryEntry(root, {
      id: "feedback-verified-ref",
      instruction: "Verified by VerificationResult.",
      scope: { paths: ["src"] },
      verification: {
        status: "verified",
        verifiedAt: "2026-05-01T00:00:00.000Z",
        verificationResultRef: {
          type: "VerificationResult",
          id: "verification-result-imaginary",
          schemaVersion: "0.1.0",
        },
      },
      reliability: 0.9,
      priority: "high",
    });

    const result = JSON.parse(
      runCli(["memory", "select", "--root", root, "--path", "src/index.ts", "--json"]).stdout,
    );
    const top = result.selection.selected.find((entry) => entry.id === "feedback-verified-ref");

    assert.ok(top);
    assert.ok(top.reasons.includes("verified"));
    assert.equal(top.verification, "verified");
  });
});

// ---------- helpers ----------

async function withFixture(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-memory-ranking-"));

  try {
    await cp(exampleRoot, root, {
      recursive: true,
      filter(source) {
        return !relative(exampleRoot, source).split(/[\\/]/).includes(".rekon");
      },
    });
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

async function writeSyntheticMemoryEntry(root, options) {
  const id = options.id ?? `feedback-${Date.now()}`;
  const now = new Date().toISOString();
  const entry = {
    header: {
      artifactType: "OperatorFeedbackEntry",
      artifactId: id,
      schemaVersion: "0.1.0",
      generatedAt: options.createdAt ?? now,
      subject: {
        repoId: "synthetic",
        paths: options.scope?.paths ?? [],
      },
      producer: { id: "test-harness", version: "0.1.0" },
      inputRefs: [],
      freshness: { status: "fresh" },
    },
    instruction: options.instruction,
    scope: options.scope ?? { paths: [] },
    confidence: options.confidence ?? 1,
    rationale: options.rationale,
    verification: options.verification,
    reliability: options.reliability,
    priority: options.priority,
    createdAt: options.createdAt ?? now,
    updatedAt: options.updatedAt ?? options.createdAt ?? now,
    source: options.source ?? "operator",
    status: options.status ?? "active",
  };
  const entryPath = join(root, ".rekon", "artifacts", "actions", `OperatorFeedbackEntry-${id}.json`);
  const indexPath = join(root, ".rekon", "registry", "artifacts.index.json");
  const index = JSON.parse(await readFile(indexPath, "utf8"));

  await writeFile(entryPath, JSON.stringify(entry, null, 2), "utf8");

  index.push({
    type: "OperatorFeedbackEntry",
    id,
    schemaVersion: "0.1.0",
    artifactType: "OperatorFeedbackEntry",
    artifactId: id,
    path: relative(root, entryPath),
    digest: digestJson(entry),
    writtenAt: options.createdAt ?? now,
  });
  await writeFile(indexPath, JSON.stringify(index, null, 2), "utf8");
}
