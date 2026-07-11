import { readFile } from "node:fs/promises";

export function label(value: string): string {
  return value.trim();
}
