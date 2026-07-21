import assert from "node:assert/strict";
import test from "node:test";

import { sanitizeLogLine } from "../../extensions/log-redaction/src/sanitize.ts";

test("redacts email addresses and API keys", () => {
  assert.equal(
    sanitizeLogLine("ari@example.test api_key=secret"),
    "[redacted-email] api_key=[redacted]",
  );
});
