import { database } from "../../../../packages/runtime/src/private-database.js";

export function readRuntimeState(): unknown {
  return database.current();
}
