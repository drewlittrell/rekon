import assert from "node:assert/strict";
import test from "node:test";

import { formatLog } from "../../core/logging/src/logger.ts";

test("formatLog sanitizes a single message", () => {
  assert.equal(formatLog("request token=secret"), "request token=[REDACTED]");
});
