import { readFileSync } from "node:fs";

export type RegionConfig = {
  enabled: string[];
  failover: Record<string, string>;
};

export function loadRegionConfig(): RegionConfig {
  const path = new URL("../../../config/failover-regions.json", import.meta.url);
  return JSON.parse(readFileSync(path, "utf8")) as RegionConfig;
}
