import assert from "node:assert/strict";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const repoRoot = process.env.REKON_EVAL_REPO_ROOT;

if (!repoRoot) {
  test("job implementation oracle runs only inside the isolated eval repository", {
    skip: "Run through eval:model-interface:refinement:adoption.",
  });
} else {
  test("cleanup job reports removals while preserving active sessions", async () => {
    const { cleanupExpiredSessions } = await import(pathToFileURL(join(
      repoRoot,
      "src/jobs/cleanup-expired-sessions.ts",
    )));

    assert.deepEqual(cleanupExpiredSessions([
      { id: "active-1", expired: false },
      { id: "expired-1", expired: true },
      { id: "active-2", expired: false },
    ]), {
      remaining: [
        { id: "active-1", expired: false },
        { id: "active-2", expired: false },
      ],
      removedCount: 1,
    });
  });
}
