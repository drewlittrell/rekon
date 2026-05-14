import { localThing } from "../local";
import { generatedThing } from "../../dist/generated";

export function handle() {
  return `${localThing()}-${generatedThing()}`;
}
