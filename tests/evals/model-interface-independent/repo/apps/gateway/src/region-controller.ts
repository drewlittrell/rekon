import { loadRegionConfig } from "../../../platform/routing/src/load-region-config.ts";
import { chooseRegion } from "../../../platform/routing/src/region-policy.ts";

export function resolveRequestRegion(
  currentRegion: string,
  tenantTier: "standard" | "enterprise",
  availableRegions: string[],
) {
  return {
    region: chooseRegion(loadRegionConfig(), currentRegion, tenantTier, availableRegions),
  };
}
