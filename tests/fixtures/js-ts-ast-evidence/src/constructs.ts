// Construct coverage fixture for the AST-backed JS/TS
// evidence provider. Exercises function declarations,
// class declarations, class methods, exported variables,
// arrow-function assignments, function-expression
// assignments, interfaces, type aliases, and enums.

import { otherThing } from "./reexports";

export function createUser(name: string): { name: string } {
  return { name };
}

export class UserService {
  greet(user: { name: string }): string {
    return `hello ${user.name}`;
  }

  rename(user: { name: string }, next: string): { name: string } {
    return { name: next };
  }
}

export const fetchUser = async (id: string): Promise<{ name: string }> => {
  return { name: id };
};

export const handleRequest = function handle() {
  return "handled";
};

export const UserConfig = {
  enabled: true,
  retries: 3,
};

export interface UserShape {
  name: string;
}

export type UserId = string;

export enum UserRole {
  Admin = "admin",
  Member = "member",
}

// Non-exported local declarations exercise the
// `exported: false` path.
function helper(): void {}

const LOCAL_FLAG = true;

// Reference to `otherThing` so the import is not pruned.
helper();
const _ref = LOCAL_FLAG ? otherThing : null;
