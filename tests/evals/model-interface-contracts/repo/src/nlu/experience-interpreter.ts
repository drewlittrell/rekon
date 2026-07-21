import { atomizeExperience } from "./atomize.ts";
import { composeExperienceMeaning } from "./compose-meaning.ts";
import { tokenizeExperience } from "./tokenize.ts";

export function interpretExperience(text: string) {
  return composeExperienceMeaning(atomizeExperience(tokenizeExperience(text)));
}
