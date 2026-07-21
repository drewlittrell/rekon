import assert from "node:assert/strict";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const repoRoot = process.env.REKON_EVAL_REPO_ROOT;

if (!repoRoot) {
  test("user-event consumer oracle runs only inside the isolated eval repository", {
    skip: "Run through eval:model-interface:refinement:adoption.",
  });
} else {
  test("optional display names reach the declared consumer without changing legacy payloads", async () => {
    const { UserEventPublisher } = await import(pathToFileURL(join(
      repoRoot,
      "src/users/user-event-publisher.ts",
    )));
    const { profileLabel } = await import(pathToFileURL(join(
      repoRoot,
      "src/profiles/profile-event-consumer.ts",
    )));

    const publisher = new UserEventPublisher();
    const enriched = publisher.publishCreated({
      userId: "user-2",
      email: "user-2@example.test",
      displayName: "Ada",
    });
    assert.deepEqual(enriched, {
      userId: "user-2",
      email: "user-2@example.test",
      displayName: "Ada",
    });
    assert.equal(profileLabel(enriched), "Ada");

    const legacy = publisher.publishCreated({
      userId: "user-3",
      email: "user-3@example.test",
    });
    assert.deepEqual(legacy, {
      userId: "user-3",
      email: "user-3@example.test",
    });
    assert.equal(Object.hasOwn(legacy, "displayName"), false);
    assert.equal(profileLabel(legacy), "user-3");
  });
}
