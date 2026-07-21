import { interpretExperience } from "../nlu/experience-interpreter.ts";

export function handleExperienceRequest(text: string) {
  return { interpretation: interpretExperience(text) };
}
