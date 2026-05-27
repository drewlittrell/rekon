// TSX fixture — exercises the AST path's TSX
// ScriptKind selection. Includes a React-shaped
// component and a hook.

import * as ReactNamespace from "./react-shim";
import type { ReactNode } from "./react-shim";

export interface PageProps {
  title: string;
  children: ReactNode;
}

export function Page(props: PageProps) {
  return null;
}

export const useUser = (id: string) => {
  return { id };
};

export default function App() {
  return null;
}

// Reference the namespace import so it is not pruned.
ReactNamespace.noop?.();
