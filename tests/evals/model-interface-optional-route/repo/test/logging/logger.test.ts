import assert from "node:assert/strict";
import test from "node:test";

import { requestLog } from "../../apps/api/src/request-logger.ts";
import { formatLog } from "../../core/logging/src/logger.ts";

test("formatLog sanitizes a single message", () => {
  assert.equal(formatLog("request token=secret"), "request token=[REDACTED]");
});

test("requestLog preserves its public output", () => {
  assert.equal(requestLog("/health"), "request path=/health");
});
