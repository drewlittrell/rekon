import test from "node:test";
import capability from "../dist/index.js";
import { assertCapabilityConforms } from "@rekon/sdk";

test("TODO capability conforms to the Rekon SDK contract", async () => {
  await assertCapabilityConforms(capability);
});
