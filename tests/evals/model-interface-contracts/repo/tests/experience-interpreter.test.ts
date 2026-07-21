import assert from "node:assert/strict";
import test from "node:test";

import { interpretExperience } from "../src/nlu/experience-interpreter.ts";

test("composes known experience atoms", () => {
  assert.deepEqual(interpretExperience("garden concert friends"), {
    status: "recognized",
    concepts: ["place:garden", "activity:concert", "social:friends"],
    unknownTokens: [],
  });
});
