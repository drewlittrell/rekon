import assert from "node:assert/strict";
import test from "node:test";

import { UserEventPublisher } from "../src/users/user-event-publisher.ts";

test("publishes the legacy user-created payload", () => {
  const publisher = new UserEventPublisher();

  assert.deepEqual(publisher.publishCreated({
    userId: "user-1",
    email: "user-1@example.test",
  }), {
    userId: "user-1",
    email: "user-1@example.test",
  });
});
