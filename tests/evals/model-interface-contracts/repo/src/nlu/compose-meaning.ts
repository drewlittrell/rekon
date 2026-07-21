import type { AtomizedExperience } from "./atomize.ts";

export type ExperienceMeaning = {
  status: "recognized" | "unknown";
  concepts: string[];
  unknownTokens: string[];
};

export function composeExperienceMeaning(input: AtomizedExperience): ExperienceMeaning {
  return {
    status: input.unknownTokens.length === 0 ? "recognized" : "unknown",
    concepts: [...input.concepts],
    unknownTokens: [...input.unknownTokens],
  };
}
