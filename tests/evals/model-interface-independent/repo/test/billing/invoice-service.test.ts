import assert from "node:assert/strict";
import test from "node:test";

import { invoiceStatus } from "../../domains/billing/src/invoice-service.ts";

test("reports invoice status", async () => {
  assert.equal(await invoiceStatus({ async findById() { return { id: "i-1", status: "draft" }; } }, "i-1"), "draft");
});
