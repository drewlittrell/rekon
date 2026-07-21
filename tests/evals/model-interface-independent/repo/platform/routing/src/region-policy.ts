import type { RegionConfig } from "./load-region-config.ts";

export function chooseRegion(
  config: RegionConfig,
  currentRegion: string,
  tenantTier: "standard" | "enterprise",
  availableRegions: string[],
): string {
  if (availableRegions.includes(currentRegion)) return currentRegion;
  if (tenantTier !== "enterprise") return currentRegion;
  const candidate = config.failover[currentRegion];
  if (!candidate || !config.enabled.includes(candidate)) return currentRegion;
  return availableRegions.includes(candidate) ? candidate : currentRegion;
}
