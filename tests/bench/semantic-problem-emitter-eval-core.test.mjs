import assert from "node:assert/strict";
import test from "node:test";

import {
  assessmentOverlapsChangedLines,
  changedLineNumbers,
} from "../../scripts/lib/semantic-problem-emitter-eval.mjs";

test("changed-line matching distinguishes the repaired statement from unchanged nearby cache code", () => {
  const buggy = [
    "const code = read(codePath);",
    "write(dataPath, data);",
    "write(codePath, code);",
  ].join("\n");
  const fixed = [
    "const code = readVerified(codePath);",
    "write(dataPath, data);",
    "writeVerified(codePath, code);",
  ].join("\n");
  const changed = changedLineNumbers(fixed, buggy);

  assert.deepEqual([...changed], [1, 3]);
  assert.equal(assessmentOverlapsChangedLines({
    details: { sourceEvidence: [{ lineStart: 2, lineEnd: 2 }] },
  }, changed), false);
  assert.equal(assessmentOverlapsChangedLines({
    details: { sourceEvidence: [{ lineStart: 3, lineEnd: 3 }] },
  }, changed), true);
});

test("changed-line matching accounts for deleted control flow in the buggy revision", () => {
  const buggy = ["selected = candidate;", "if (!resolved) {", "  break;", "}", "return selected;"].join("\n");
  const fixed = ["selected = candidate;", "break;", "return selected;"].join("\n");
  const changed = changedLineNumbers(buggy, fixed);

  assert.ok(changed.has(2));
  assert.equal(assessmentOverlapsChangedLines({
    details: { sourceEvidence: [{ lineStart: 2, lineEnd: 4 }] },
  }, changed), true);
});
