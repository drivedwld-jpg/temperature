/**
 * Minecraft Bedrock Edition — Biome Base Temperature Lookup Map
 *
 * All 62 naturally generating Bedrock biomes (56 Overworld + 5 Nether + 1 End)
 * up to Dappled Forest (1.26.x / 26.3 Wilderness Bound).
 *
 * Verified against Minecraft Wiki & Mojang/bedrock-samples v1.26.60.5.
 */

/** @type {ReadonlyMap<string, number>} */
export const BEDROCK_BIOME_TEMPERATURES = new Map([
  // OVERWORLD — Woodland & Forest Biomes (12)
  ["minecraft:forest", 0.7],
  ["minecraft:flower_forest", 0.7],
  ["minecraft:birch_forest", 0.6],
  ["minecraft:birch_forest_mutated", 0.6],
  ["minecraft:roofed_forest", 0.7],
  ["minecraft:pale_garden", 0.7],
  ["minecraft:dappled_forest", 0.6],
  ["minecraft:taiga", 0.25],
  ["minecraft:cold_taiga", -0.5],
  ["minecraft:mega_taiga", 0.3],
  ["minecraft:redwood_taiga_mutated", 0.25],
  ["minecraft:cherry_grove", 0.3],

  // OVERWORLD — Jungle Biomes (3)
  ["minecraft:jungle", 0.95],
  ["minecraft:jungle_edge", 0.95],
  ["minecraft:bamboo_jungle", 0.95],

  // OVERWORLD — Flatland, Snowy & Windswept Biomes (7)
  ["minecraft:plains", 0.8],
  ["minecraft:sunflower_plains", 0.8],
  ["minecraft:ice_plains", 0.0],
  ["minecraft:ice_plains_spikes", 0.0],
  ["minecraft:extreme_hills", 0.2],
  ["minecraft:extreme_hills_plus_trees", 0.2],
  ["minecraft:extreme_hills_mutated", 0.2],

  // OVERWORLD — Highland / Mountain Biomes (6)
  ["minecraft:meadow", 0.3],
  ["minecraft:grove", -0.2],
  ["minecraft:snowy_slopes", -0.3],
  ["minecraft:jagged_peaks", -0.7],
  ["minecraft:frozen_peaks", -0.7],
  ["minecraft:stony_peaks", 1.0],

  // OVERWORLD — Arid-Land Biomes (7)
  ["minecraft:desert", 2.0],
  ["minecraft:savanna", 1.2],
  ["minecraft:savanna_plateau", 1.0],
  ["minecraft:savanna_mutated", 2.0],
  ["minecraft:mesa", 2.0],
  ["minecraft:mesa_plateau_stone", 2.0],
  ["minecraft:mesa_bryce", 2.0],

  // OVERWORLD — Wetland, River & Beach Biomes (7)
  ["minecraft:swampland", 0.8],
  ["minecraft:mangrove_swamp", 0.8],
  ["minecraft:river", 0.5],
  ["minecraft:frozen_river", 0.0],
  ["minecraft:beach", 0.8],
  ["minecraft:stone_beach", 0.2],
  ["minecraft:cold_beach", 0.05],

  // OVERWORLD — Ocean & Offshore Biomes (10)
  ["minecraft:ocean", 0.5],
  ["minecraft:deep_ocean", 0.5],
  ["minecraft:warm_ocean", 0.5],
  ["minecraft:lukewarm_ocean", 0.5],
  ["minecraft:deep_lukewarm_ocean", 0.5],
  ["minecraft:cold_ocean", 0.5],
  ["minecraft:deep_cold_ocean", 0.5],
  ["minecraft:frozen_ocean", 0.0],
  ["minecraft:deep_frozen_ocean", 0.5],
  ["minecraft:mushroom_island", 0.9],

  // OVERWORLD — Cave Biomes (4)
  ["minecraft:lush_caves", 0.9],
  ["minecraft:dripstone_caves", 0.2],
  ["minecraft:deep_dark", 0.8],
  ["minecraft:sulfur_caves", 0.8],

  // THE NETHER (5)
  ["minecraft:hell", 2.0],
  ["minecraft:soulsand_valley", 2.0],
  ["minecraft:crimson_forest", 2.0],
  ["minecraft:warped_forest", 2.0],
  ["minecraft:basalt_deltas", 2.0],

  // THE END (1)
  ["minecraft:the_end", 0.5],
]);

/** @type {ReadonlyMap<string, string>} */
export const BEDROCK_BIOME_NAMES = new Map([
  ["minecraft:forest", "Forest"],
  ["minecraft:flower_forest", "Flower Forest"],
  ["minecraft:birch_forest", "Birch Forest"],
  ["minecraft:birch_forest_mutated", "Old Growth Birch Forest"],
  ["minecraft:roofed_forest", "Dark Forest"],
  ["minecraft:pale_garden", "Pale Garden"],
  ["minecraft:dappled_forest", "Dappled Forest"],
  ["minecraft:taiga", "Taiga"],
  ["minecraft:cold_taiga", "Snowy Taiga"],
  ["minecraft:mega_taiga", "Old Growth Pine Taiga"],
  ["minecraft:redwood_taiga_mutated", "Old Growth Spruce Taiga"],
  ["minecraft:cherry_grove", "Cherry Grove"],
  ["minecraft:jungle", "Jungle"],
  ["minecraft:jungle_edge", "Sparse Jungle"],
  ["minecraft:bamboo_jungle", "Bamboo Jungle"],
  ["minecraft:plains", "Plains"],
  ["minecraft:sunflower_plains", "Sunflower Plains"],
  ["minecraft:ice_plains", "Snowy Plains"],
  ["minecraft:ice_plains_spikes", "Ice Spikes"],
  ["minecraft:extreme_hills", "Windswept Hills"],
  ["minecraft:extreme_hills_plus_trees", "Windswept Forest"],
  ["minecraft:extreme_hills_mutated", "Windswept Gravelly Hills"],
  ["minecraft:meadow", "Meadow"],
  ["minecraft:grove", "Grove"],
  ["minecraft:snowy_slopes", "Snowy Slopes"],
  ["minecraft:jagged_peaks", "Jagged Peaks"],
  ["minecraft:frozen_peaks", "Frozen Peaks"],
  ["minecraft:stony_peaks", "Stony Peaks"],
  ["minecraft:desert", "Desert"],
  ["minecraft:savanna", "Savanna"],
  ["minecraft:savanna_plateau", "Savanna Plateau"],
  ["minecraft:savanna_mutated", "Windswept Savanna"],
  ["minecraft:mesa", "Badlands"],
  ["minecraft:mesa_plateau_stone", "Wooded Badlands"],
  ["minecraft:mesa_bryce", "Eroded Badlands"],
  ["minecraft:swampland", "Swamp"],
  ["minecraft:mangrove_swamp", "Mangrove Swamp"],
  ["minecraft:river", "River"],
  ["minecraft:frozen_river", "Frozen River"],
  ["minecraft:beach", "Beach"],
  ["minecraft:stone_beach", "Stony Shore"],
  ["minecraft:cold_beach", "Snowy Beach"],
  ["minecraft:ocean", "Ocean"],
  ["minecraft:deep_ocean", "Deep Ocean"],
  ["minecraft:warm_ocean", "Warm Ocean"],
  ["minecraft:lukewarm_ocean", "Lukewarm Ocean"],
  ["minecraft:deep_lukewarm_ocean", "Deep Lukewarm Ocean"],
  ["minecraft:cold_ocean", "Cold Ocean"],
  ["minecraft:deep_cold_ocean", "Deep Cold Ocean"],
  ["minecraft:frozen_ocean", "Frozen Ocean"],
  ["minecraft:deep_frozen_ocean", "Deep Frozen Ocean"],
  ["minecraft:mushroom_island", "Mushroom Fields"],
  ["minecraft:lush_caves", "Lush Caves"],
  ["minecraft:dripstone_caves", "Dripstone Caves"],
  ["minecraft:deep_dark", "Deep Dark"],
  ["minecraft:sulfur_caves", "Sulfur Caves"],
  ["minecraft:hell", "Nether Wastes"],
  ["minecraft:soulsand_valley", "Soul Sand Valley"],
  ["minecraft:crimson_forest", "Crimson Forest"],
  ["minecraft:warped_forest", "Warped Forest"],
  ["minecraft:basalt_deltas", "Basalt Deltas"],
  ["minecraft:the_end", "The End"],
]);

/**
 * Resolve the base Minecraft temperature for a BiomeType or biome ID string.
 * Uses `BEDROCK_BIOME_TEMPERATURES` as the primary lookup, with a tag-based
 * fallback for legacy pre-1.18 chunks or custom third-party biomes.
 *
 * @param {string | { id: string, hasTags?: (tags: string[]) => boolean }} biomeOrId
 * @returns {number}
 */
export function getBiomeTemperature(biomeOrId) {
  const rawId = typeof biomeOrId === "string" ? biomeOrId : biomeOrId?.id;
  if (!rawId) return 0.7;

  const normalizedId = rawId.includes(":") ? rawId : `minecraft:${rawId}`;
  const mapped = BEDROCK_BIOME_TEMPERATURES.get(normalizedId);
  if (mapped !== undefined) return mapped;

  // Fallback for legacy pre-1.18 chunks or custom add-on biomes via tags
  if (typeof biomeOrId === "object" && typeof biomeOrId.hasTags === "function") {
    try {
      if (biomeOrId.hasTags(["nether"]) || biomeOrId.hasTags(["desert"]) || biomeOrId.hasTags(["mesa"])) return 2.0;
      if (biomeOrId.hasTags(["savanna"])) return 1.2;
      if (biomeOrId.hasTags(["jungle"])) return 0.95;
      if (biomeOrId.hasTags(["swamp"]) || biomeOrId.hasTags(["plains"])) return 0.8;
      if (biomeOrId.hasTags(["frozen"])) return 0.0;
      if (biomeOrId.hasTags(["cold"]) || biomeOrId.hasTags(["taiga"])) return 0.25;
      if (biomeOrId.hasTags(["ocean"]) || biomeOrId.hasTags(["the_end"])) return 0.5;
    } catch {
      // Ignore tag lookup failures
    }
  }
  return 0.7;
}

/**
 * Format a biome identifier into a clean display name.
 * @param {string} biomeId
 * @returns {string}
 */
export function getBiomeDisplayName(biomeId) {
  if (!biomeId) return "Unknown Biome";
  const normalized = biomeId.includes(":") ? biomeId : `minecraft:${biomeId}`;
  const known = BEDROCK_BIOME_NAMES.get(normalized);
  if (known) return known;

  const short = normalized.split(":")[1] ?? normalized;
  return short
    .split("_")
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}
