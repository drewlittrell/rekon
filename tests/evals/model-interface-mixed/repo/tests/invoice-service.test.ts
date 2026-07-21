import assert from "node:assert/strict";
import test from "node:test";

import { InvoiceService } from "../src/billing/invoice-service.ts";

test("draft invoices can be finalized", async () => {
  const service = new InvoiceService({
    async findById() { return { id: "invoice-1", status: "draft" }; },
  });
  assert.equal(await service.canFinalize("invoice-1"), true);
});
