// WO-18: the package-platform archetype - the library's FIRST net-new
// pack (no classic source; the four shaping decisions were operator
// rulings, 2026-06-12). The school it encodes: agent-era platform
// monorepos with a kernel substrate, library tiers, product packs, and
// consumption surfaces. Authored through the operator pathway; edit the
// same way.

import type { ArchitectureGrammarPackInput } from "../schema.js";

export const grammarArchetypePackagePlatform: ArchitectureGrammarPackInput = {
  id: "grammar-archetype-package-platform",
  version: "1.0.0",
  kind: "overlay",
  tier: "archetype",
  description:
    "Architecture archetype: agent-era platform monorepos with a kernel substrate, library tiers, product packs, and consumption surfaces. The library's first net-new archetype (WO-18): operator-authored, no classic source. Backs findings only when ratified in repo config.",
  provenance: {
    migratedFrom: "operator",
    note: "net-new school content ruled 2026-06-12 (WO-18); the package-boundary axis (operator:wo-18#package-boundary) is this archetype's symbol-level companion law",
  },
  topology: {
    archetype: "package_platform",
    description:
      "Kernel imports nothing above itself (the constitutional edge). Core is the cohesive platform body above kernel (operator ruling: core is not a capability). Capabilities are pluggable platform packages. Product packs sit above the platform; surfaces are entry points (operator ruling: runtime and sdk are surfaces) - everything may import downward, nothing imports surface. Adapters stay leaf: kernel at most.",
    requiredLayers: ["kernel", "surface"],
    layerEdges: [
      { fromLayer: "kernel", toLayer: "core", required: false, forbidden: true },
      { fromLayer: "kernel", toLayer: "capability", required: false, forbidden: true },
      { fromLayer: "kernel", toLayer: "product", required: false, forbidden: true },
      { fromLayer: "kernel", toLayer: "surface", required: false, forbidden: true },
      { fromLayer: "core", toLayer: "capability", required: false, forbidden: true },
      { fromLayer: "core", toLayer: "product", required: false, forbidden: true },
      { fromLayer: "core", toLayer: "surface", required: false, forbidden: true },
      { fromLayer: "capability", toLayer: "product", required: false, forbidden: true },
      { fromLayer: "capability", toLayer: "surface", required: false, forbidden: true },
      { fromLayer: "product", toLayer: "surface", required: false, forbidden: true },
      { fromLayer: "contract", toLayer: "core", required: false, forbidden: true },
      { fromLayer: "contract", toLayer: "capability", required: false, forbidden: true },
      { fromLayer: "contract", toLayer: "product", required: false, forbidden: true },
      { fromLayer: "contract", toLayer: "surface", required: false, forbidden: true },
      { fromLayer: "contract", toLayer: "adapter", required: false, forbidden: true },
      { fromLayer: "adapter", toLayer: "core", required: false, forbidden: true },
      { fromLayer: "adapter", toLayer: "capability", required: false, forbidden: true },
      { fromLayer: "adapter", toLayer: "product", required: false, forbidden: true },
      { fromLayer: "adapter", toLayer: "surface", required: false, forbidden: true },
    ],
    source: "operator:wo-18#package-platform",
  },
  layers: [
    {
      id: "kernel",
      name: "Kernel",
      description: "The kernel substrate: imports nothing above itself; the constitutional edge.",
      position: 1,
      paths: ["packages/kernel-*/**", "kernel/**"],
      source: "operator:wo-18#kernel",
    },
    {
      id: "core",
      name: "Core",
      description:
        "The cohesive platform body above kernel (operator ruling: core is not a capability); imports kernel only.",
      position: 2,
      paths: ["core/**"],
      source: "operator:wo-18#core",
    },
    {
      id: "capability",
      name: "Capability",
      description:
        "Pluggable platform packages; imports kernel and sibling capabilities through public surfaces only (the package-boundary law, operator:wo-18#package-boundary).",
      position: 2,
      paths: ["packages/capability-*/**"],
      source: "operator:wo-18#capability",
    },
    {
      id: "product",
      name: "Product",
      description: "Product packs; imports kernel, core, capability; never surface.",
      position: 3,
      paths: ["product-packs/**"],
      source: "operator:wo-18#product",
    },
    {
      id: "contract",
      name: "Contract",
      description:
        "The capability contract tier: the sdk, consumed by capabilities to define themselves and by the runtime host to register them. Imports kernel only; capability, product, and surface may import contract. The original surface assignment was a misclassification the detector caught - the repo was right; the law adjusts (operator:wo-19#contract-layer).",
      position: 2,
      paths: ["packages/sdk/**"],
      source: "operator:wo-19#contract-layer",
    },
    {
      id: "surface",
      name: "Surface",
      description:
        "Entry points (operator ruling: runtime and sdk are surfaces; WO-19 reassigned sdk to the contract layer); imports everything below; nothing imports surface.",
      position: 4,
      paths: ["cli/**", "packages/cli/**", "packages/mcp/**", "packages/runtime/**", "web/**", "api/**"],
      source: "operator:wo-18#surface",
    },
    {
      id: "adapter",
      name: "Adapter",
      description: "External integrations stay leaf: kernel at most.",
      position: 2,
      paths: ["packages/llm-provider/**"],
      source: "operator:wo-18#adapter",
    },
    {
      id: "generated",
      name: "Generated",
      description:
        "Codegen output; exempt from naming and placement law (the WO-15 generated class as a layer).",
      position: -1,
      paths: ["generated/**"],
      source: "operator:wo-18#generated",
    },
    {
      id: "config",
      name: "Config",
      description: "Outside the import stack.",
      position: -1,
      paths: ["config.project/**", "governance/**", "tools/**"],
      source: "operator:wo-18#config",
    },
  ],
};
