type State = { kind: "ready"; value: string } | { kind: "failed"; error: Error };

export function describe(state: State): string {
  switch (state.kind) {
    case "ready":
      return state.value;
    case "failed":
      return state.error.message;
  }
}
