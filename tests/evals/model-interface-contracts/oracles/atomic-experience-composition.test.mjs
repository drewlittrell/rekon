import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const repoRoot = process.env.REKON_EVAL_REPO_ROOT;

if (!repoRoot) {
  test("atomic-experience oracle runs only inside the isolated eval repository", {
    skip: "Run through eval:model-interface:contracts:adoption.",
  });
} else {
  test("new wording composes from atoms instead of a phrase alias", async () => {
    const interpreter = await import(pathToFileURL(join(repoRoot, "src/nlu/experience-interpreter.ts")));
    const tokenizer = await import(pathToFileURL(join(repoRoot, "src/nlu/tokenize.ts")));
    const vocabulary = await readFile(join(repoRoot, "src/nlu/vocabulary.ts"), "utf8");

    assert.deepEqual(tokenizer.tokenizeExperience("garden concert with friends"), ["garden", "concert", "friends"]);
    assert.deepEqual(interpreter.interpretExperience("garden concert with friends"), {
      status: "recognized",
      concepts: ["place:garden", "activity:concert", "social:friends"],
      unknownTokens: [],
    });
    assert.doesNotMatch(vocabulary, /garden concert with friends/iu);
  });
}
