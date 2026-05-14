import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

test("usage record writes a MemoryUsageLedger artifact", async () => {
  await withFixture(async (root) => {
    runCli(["refresh", "--root", root, "--json"]);
    const memoryEntryId = addMemory(root, {
      instruction: "Provider retry behavior belongs in provider layer.",
    });

    const result = JSON.parse(
      runCli([
        "memory",
        "usage",
        "record",
        memoryEntryId,
        "--root",
        root,
        "--outcome",
        "helpful",
        "--note",
        "Helped scope the change.",
        "--json",
      ]).stdout,
    );

    assert.equal(result.artifact.type, "MemoryUsageLedger");
    assert.ok(result.artifact.id.startsWith("memory-usage-ledger-"));
    assert.equal(result.ledger.events.length, 1);

    const event = result.ledger.events[0];
    assert.equal(event.memoryEntryId, memoryEntryId);
    assert.equal(event.outcome, "helpful");
    assert.equal(event.note, "Helped scope the change.");
    assert.ok(typeof event.usedAt === "string" && event.usedAt.length > 0);
  });
});

test("harmful usage without a note is rejected", async () => {
  await withFixture(async (root) => {
    runCli(["refresh", "--root", root, "--json"]);
    const memoryEntryId = addMemory(root, {
      instruction: "Hot path memory.",
    });

    const failure = runCliExpectFailure([
      "memory",
      "usage",
      "record",
      memoryEntryId,
      "--root",
      root,
      "--outcome",
      "harmful",
      "--json",
    ]);

    assert.ok(
      failure.stderr.includes("memory usage note is required when outcome is harmful."),
      `expected note-required error, got stderr: ${failure.stderr}`,
    );
  });
});

test("stale usage without a note is rejected", async () => {
  await withFixture(async (root) => {
    runCli(["refresh", "--root", root, "--json"]);
    const memoryEntryId = addMemory(root, {
      instruction: "Stale guidance.",
    });

    const failure = runCliExpectFailure([
      "memory",
      "usage",
      "record",
      memoryEntryId,
      "--root",
      root,
      "--outcome",
      "stale",
      "--json",
    ]);

    assert.ok(
      failure.stderr.includes("memory usage note is required when outcome is stale."),
      `expected stale note-required error, got stderr: ${failure.stderr}`,
    );
  });
});

test("ignored usage without a note is rejected", async () => {
  await withFixture(async (root) => {
    runCli(["refresh", "--root", root, "--json"]);
    const memoryEntryId = addMemory(root, {
      instruction: "Ignored guidance.",
    });

    const failure = runCliExpectFailure([
      "memory",
      "usage",
      "record",
      memoryEntryId,
      "--root",
      root,
      "--outcome",
      "ignored",
      "--json",
    ]);

    assert.ok(
      failure.stderr.includes("memory usage note is required when outcome is ignored."),
      `expected ignored note-required error, got stderr: ${failure.stderr}`,
    );
  });
});

test("usage list returns recorded events from the latest ledger", async () => {
  await withFixture(async (root) => {
    runCli(["refresh", "--root", root, "--json"]);
    const memoryEntryId = addMemory(root, {
      instruction: "First memory.",
    });

    recordUsage(root, memoryEntryId, "helpful", "First helpful use.");
    recordUsage(root, memoryEntryId, "helpful", "Second helpful use.");

    const list = JSON.parse(
      runCli(["memory", "usage", "list", "--root", root, "--json"]).stdout,
    );

    assert.equal(list.artifact.type, "MemoryUsageLedger");
    assert.equal(list.events.length, 2);
    assert.equal(list.events[0].outcome, "helpful");
    assert.equal(list.events[1].outcome, "helpful");
  });
});

test("curation report recommends reinforce for repeated helpful memory", async () => {
  await withFixture(async (root) => {
    runCli(["refresh", "--root", root, "--json"]);
    const memoryEntryId = addMemory(root, {
      instruction: "Repeatedly helpful guidance.",
    });

    recordUsage(root, memoryEntryId, "helpful", "First.");
    recordUsage(root, memoryEntryId, "helpful", "Second.");
    recordUsage(root, memoryEntryId, "helpful", "Third.");

    const report = JSON.parse(
      runCli(["memory", "curation", "--root", root, "--json"]).stdout,
    );

    assert.equal(report.report.summary.totalUsageEvents, 3);
    const item = report.report.items.find((entry) => entry.memoryEntryId === memoryEntryId);
    assert.ok(item, "curation item should exist for recorded memory");
    assert.equal(item.recommendation, "reinforce");
    assert.equal(item.helpfulCount, 3);
    assert.ok(item.reasons.some((reason) => reason.includes("helpful-count")));
  });
});

test("curation report recommends review for a single harmful event", async () => {
  await withFixture(async (root) => {
    runCli(["refresh", "--root", root, "--json"]);
    const memoryEntryId = addMemory(root, {
      instruction: "Possibly harmful guidance.",
    });

    recordUsage(root, memoryEntryId, "harmful", "Caused confusion.");

    const report = JSON.parse(
      runCli(["memory", "curation", "--root", root, "--json"]).stdout,
    );

    const item = report.report.items.find((entry) => entry.memoryEntryId === memoryEntryId);
    assert.ok(item);
    assert.equal(item.recommendation, "review");
    assert.equal(item.harmfulCount, 1);
    assert.equal(report.report.summary.review, 1);
  });
});

test("curation report recommends deprecate for repeated harmful events", async () => {
  await withFixture(async (root) => {
    runCli(["refresh", "--root", root, "--json"]);
    const memoryEntryId = addMemory(root, {
      instruction: "Repeatedly harmful guidance.",
    });

    recordUsage(root, memoryEntryId, "harmful", "Harm 1.");
    recordUsage(root, memoryEntryId, "harmful", "Harm 2.");

    const report = JSON.parse(
      runCli(["memory", "curation", "--root", root, "--json"]).stdout,
    );

    const item = report.report.items.find((entry) => entry.memoryEntryId === memoryEntryId);
    assert.ok(item);
    assert.equal(item.recommendation, "deprecate");
    assert.equal(item.harmfulCount, 2);
    assert.equal(report.report.summary.deprecate, 1);
  });
});

test("curation report recommends supersede-candidate for repeated stale events", async () => {
  await withFixture(async (root) => {
    runCli(["refresh", "--root", root, "--json"]);
    const memoryEntryId = addMemory(root, {
      instruction: "Repeatedly stale guidance.",
    });

    recordUsage(root, memoryEntryId, "stale", "Stale 1.");
    recordUsage(root, memoryEntryId, "stale", "Stale 2.");

    const report = JSON.parse(
      runCli(["memory", "curation", "--root", root, "--json"]).stdout,
    );

    const item = report.report.items.find((entry) => entry.memoryEntryId === memoryEntryId);
    assert.ok(item);
    assert.equal(item.recommendation, "supersede-candidate");
    assert.equal(item.staleCount, 2);
    assert.equal(report.report.summary.supersedeCandidate, 1);
  });
});

test("curation does not mutate OperatorFeedbackEntry.status", async () => {
  await withFixture(async (root) => {
    runCli(["refresh", "--root", root, "--json"]);
    const memoryEntryId = addMemory(root, {
      instruction: "Memory that gets harmful feedback.",
    });

    const entryBeforePath = await locateOperatorFeedback(root, memoryEntryId);
    const beforeBody = JSON.parse(await readFile(entryBeforePath, "utf8"));

    recordUsage(root, memoryEntryId, "harmful", "Harm 1.");
    recordUsage(root, memoryEntryId, "harmful", "Harm 2.");

    runCli(["memory", "curation", "--root", root, "--json"]);

    const afterBody = JSON.parse(await readFile(entryBeforePath, "utf8"));

    assert.equal(afterBody.status, beforeBody.status);
    assert.deepEqual(afterBody, beforeBody, "OperatorFeedbackEntry must not be mutated by curation");
  });
});

test("memory select does not automatically record usage", async () => {
  await withFixture(async (root) => {
    runCli(["refresh", "--root", root, "--json"]);
    addMemory(root, {
      instruction: "Some scoped guidance.",
    });

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
    ]);

    const list = JSON.parse(
      runCli(["memory", "usage", "list", "--root", root, "--json"]).stdout,
    );

    assert.equal(list.events.length, 0, "memory select must not write usage events");
    assert.equal(list.artifact, null);
  });
});

test("MemoryCurationReport freshness goes stale after a newer MemoryUsageLedger", async () => {
  await withFixture(async (root) => {
    runCli(["refresh", "--root", root, "--json"]);
    const memoryEntryId = addMemory(root, {
      instruction: "Freshness test guidance.",
    });

    recordUsage(root, memoryEntryId, "helpful", "First.");

    const firstReport = JSON.parse(
      runCli(["memory", "curation", "--root", root, "--json"]).stdout,
    );
    const reportId = firstReport.artifact.id;

    await new Promise((resolveTimer) => setTimeout(resolveTimer, 10));
    recordUsage(root, memoryEntryId, "helpful", "Second, recorded later.");

    const freshness = JSON.parse(
      runCli([
        "artifacts",
        "freshness",
        "--root",
        root,
        "--type",
        "MemoryCurationReport",
        "--id",
        reportId,
        "--json",
      ]).stdout,
    );

    const entry = freshness.artifacts.find((candidate) => candidate.id === reportId);
    assert.ok(entry, "expected freshness entry for the curation report");
    assert.equal(entry.status, "stale");
    assert.ok(
      entry.issues.some(
        (issue) => issue.code === "newer-input-exists" && issue.inputType === "MemoryUsageLedger",
      ),
      `expected stale issue citing newer MemoryUsageLedger, got: ${JSON.stringify(entry.issues)}`,
    );
  });
});

test("agent-contract publication mentions Memory Curation Status when a report exists", async () => {
  await withFixture(async (root) => {
    runCli(["refresh", "--root", root, "--json"]);
    const memoryEntryId = addMemory(root, {
      instruction: "Curation-status guidance.",
    });

    recordUsage(root, memoryEntryId, "harmful", "Mistake.");
    runCli(["memory", "curation", "--root", root, "--json"]);
    runCli(["publish", "agent-contract", "--root", root, "--json"]);

    const publication = await readLatestPublicationOfKind(root, "agent-contract");

    assert.ok(publication.content.includes("### Memory Curation Status"));
    assert.ok(publication.content.includes("memories needing review: 1"));
    assert.ok(publication.content.includes("reinforce candidates: 0"));
    assert.ok(
      publication.header.inputRefs.some((ref) => ref.type === "MemoryCurationReport"),
      "agent-contract should cite the curation report in inputRefs",
    );
  });
});

// ---------- helpers ----------

function addMemory(root, options) {
  const args = [
    "memory",
    "add",
    "--root",
    root,
    "--instruction",
    options.instruction,
    "--path",
    options.path ?? "src",
    "--json",
  ];
  if (options.system) {
    args.push("--system", options.system);
  }
  if (options.capability) {
    args.push("--capability", options.capability);
  }
  if (options.priority) {
    args.push("--priority", options.priority);
  }
  if (options.verified) {
    args.push("--verified");
  }

  const result = JSON.parse(runCli(args).stdout);
  const feedbackRef = result.artifacts.find((ref) => ref.type === "OperatorFeedbackEntry");
  assert.ok(feedbackRef, "memory add should write an OperatorFeedbackEntry");
  return feedbackRef.id;
}

function recordUsage(root, memoryEntryId, outcome, note) {
  return runCli([
    "memory",
    "usage",
    "record",
    memoryEntryId,
    "--root",
    root,
    "--outcome",
    outcome,
    "--note",
    note,
    "--json",
  ]);
}

async function readArtifactIndex(root) {
  const indexPath = join(root, ".rekon/registry/artifacts.index.json");
  const raw = JSON.parse(await readFile(indexPath, "utf8"));
  return Array.isArray(raw) ? raw : Array.isArray(raw.artifacts) ? raw.artifacts : [];
}

async function locateOperatorFeedback(root, memoryEntryId) {
  const entries = await readArtifactIndex(root);
  const entry = entries.find(
    (candidate) => candidate.type === "OperatorFeedbackEntry" && candidate.id === memoryEntryId,
  );
  assert.ok(entry, `expected to find OperatorFeedbackEntry ${memoryEntryId} in artifact index`);
  return join(root, entry.path);
}

async function readLatestPublicationOfKind(root, kind) {
  const entries = await readArtifactIndex(root);
  const publications = entries.filter((candidate) => candidate.type === "Publication");
  publications.sort((left, right) => right.id.localeCompare(left.id));

  for (const candidate of publications) {
    const body = JSON.parse(await readFile(join(root, candidate.path), "utf8"));
    if (body.kind === kind) {
      return body;
    }
  }

  throw new Error(`No Publication of kind ${kind} found.`);
}

async function withFixture(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-memory-usage-curation-"));

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

function runCliExpectFailure(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0, `expected non-zero exit, stdout: ${result.stdout}`);
  return result;
}
