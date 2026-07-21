import { ATOMIC_VOCABULARY } from "./vocabulary.ts";

export type AtomizedExperience = {
  concepts: string[];
  unknownTokens: string[];
};

export function atomizeExperience(tokens: string[]): AtomizedExperience {
  const concepts: string[] = [];
  const unknownTokens: string[] = [];
  for (const token of tokens) {
    const concept = ATOMIC_VOCABULARY[token];
    if (concept) concepts.push(concept);
    else unknownTokens.push(token);
  }
  return { concepts, unknownTokens };
}
