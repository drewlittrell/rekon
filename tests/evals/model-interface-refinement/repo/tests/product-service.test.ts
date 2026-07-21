import assert from "node:assert/strict";
import test from "node:test";

import { productLabel } from "../src/catalog/product-service.ts";

test("formats product labels", () => {
  assert.equal(productLabel("sku-1"), "Product sku-1");
});
