import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const repoRoot = process.env.REKON_EVAL_REPO_ROOT;

if (!repoRoot) {
  test("bearer-redaction oracle runs only inside the isolated eval repository", {
    skip: "Run through eval:model-interface:independent.",
  });
} else {
  test("the registered extension rule redacts bearer tokens without changing core logging", async () => {
    const rulePath = join(repoRoot, "extensions/log-redaction/src/rules/bearer-token.ts");
    assert.equal(existsSync(rulePath), true, "bearer-token rule must live beside existing rules");
    const { sanitizeLogLine } = await import(pathToFileURL(join(
      repoRoot,
      "extensions/log-redaction/src/sanitize.ts",
    )));

    assert.equal(
      sanitizeLogLine("Authorization: Bearer abc.def-123_456"),
      "Authorization: Bearer [redacted]",
    );
    assert.equal(
      sanitizeLogLine("authorization: bearer SECRET ari@example.test api_key=value"),
      "authorization: bearer [redacted] [redacted-email] api_key=[redacted]",
    );
    assert.equal(sanitizeLogLine("Bearer"), "Bearer");
  });
}
