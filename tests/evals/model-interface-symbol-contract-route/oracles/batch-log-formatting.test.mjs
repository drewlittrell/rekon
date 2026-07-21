import assert from "node:assert/strict";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const repoRoot = process.env.REKON_EVAL_REPO_ROOT;

if (!repoRoot) {
  test("symbol-contract batch formatting oracle runs only inside the isolated eval repository", {
    skip: "Run through eval:model-interface:symbol-contract-route.",
  });
} else {
  test("batch formatting preserves order, sanitization, input, and single-message behavior", async () => {
    const logger = await import(pathToFileURL(join(repoRoot, "core/logging/src/logger.ts")));
    const messages = ["first token=secret", "second", "third token=other"];

    assert.equal(typeof logger.formatLogBatch, "function");
    assert.deepEqual(logger.formatLogBatch(messages), [
      "first token=[REDACTED]",
      "second",
      "third token=[REDACTED]",
    ]);
    assert.deepEqual(messages, ["first token=secret", "second", "third token=other"]);
    assert.equal(logger.formatLog("single token=secret"), "single token=[REDACTED]");
  });
}
