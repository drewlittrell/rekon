import { incrementCounter } from "./counter.ts";

export function recordMetric(value: number): number {
  return incrementCounter(value);
}
