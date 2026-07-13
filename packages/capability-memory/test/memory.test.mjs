import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import memoryCapability from "../dist/index.js";
import { createRuntime } from "@rekon/runtime";

test("memory learner writes feedback and deterministic selections", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-memory-"));

  try {
    const runtime = await createRuntime({
      repoRoot: root,
      capabilities: [memoryCapability],
    });
    const added = await runtime.runLearn({
      input: {
        mode: "add",
        instruction: "Preserve public API compatibility.",
        path: "src",
      },
    });
    assert.deepEqual(added.map((ref) => ref.type), ["OperatorFeedbackEntry", "MemoryEvent"]);

    const selected = await runtime.runLearn({
      input: {
        mode: "select",
        path: "src/index.ts",
        goal: "modify bootstrap",
      },
    });
    const selection = await runtime.artifacts.read(selected[0]);

    assert.equal(selection.header.artifactType, "MemorySelection");
    assert.match(selection.header.supersession.key, /^memory-selection:[a-f0-9]{64}$/);
    assert.equal(selection.selections[0].instruction, "Preserve public API compatibility.");
    assert.equal(selection.selections[0].reason, "scope prefix match");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
