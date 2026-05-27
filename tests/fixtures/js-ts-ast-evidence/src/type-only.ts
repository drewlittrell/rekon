// Type-only import/export fixture — exercises the AST
// path's importKind: "type-only" and exportKind:
// "type-only" classifications.

import type { UserShape } from "./constructs";

export type ProjectedUser = UserShape & { id: string };

export { type ProjectedUser as PublicProjectedUser };
