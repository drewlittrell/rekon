// Plain JS fixture — exercises the AST path with
// `language: "javascript"`. Includes a function
// declaration, a class declaration with a method, an
// arrow assignment, and a side-effect import.

import "./side-effects";

export function buildBriefSummary(brief) {
  return brief.title;
}

export class BriefSender {
  send(brief) {
    return brief;
  }
}

export const triageBrief = (brief) => {
  return brief.priority;
};
