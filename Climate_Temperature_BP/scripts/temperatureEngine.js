import {
  EntityComponentTypes,
  EntityDamageCause,
  EquipmentSlot,
  GameMode,
} from "@minecraft/server";
import { getBiomeDisplayName, getBiomeTemperature } from "./biomeTemperatures.js";

export const BODY_TEMP_PROP = "climate:body_temp";
export const NORMAL_BODY_TEMP_C = 37.0;

const CAVE_BIOMES = new Set([
  "minecraft:lush_caves",
  "minecraft:dripstone_caves",
  "minecraft:deep_dark",
  "minecraft:sulfur_caves",
]);

const ARID_BIOMES = new Set([
  "minecraft:desert",
  "minecraft:mesa",
  "minecraft:mesa_plateau_stone",
  "minecraft:mesa_bryce",
  "minecraft:savanna",
  "minecraft:savanna_plateau",
  "minecraft:savanna_mutated",
]);

/** @type {ReadonlyMap<string, number>} */
const HEAT_BLOCKS = new Map([
  ["minecraft:lava", 20.0],
  ["minecraft:flowing_lava", 18.0],
  ["minecraft:fire", 15.0],
  ["minecraft:soul_fire", 15.0],
  ["minecraft:campfire", 13.0],
  ["minecraft:soul_campfire", 13.0],
  ["minecraft:magma", 10.0],
  ["minecraft:lit_furnace", 9.0],
  ["minecraft:lit_blast_furnace", 9.0],
  ["minecraft:lit_smoker", 9.0],
  ["minecraft:torch", 3.0],
  ["minecraft:soul_torch", 3.0],
  ["minecraft:lantern", 3.5],
  ["minecraft:soul_lantern", 3.5],
  ["minecraft:glowstone", 3.0],
  ["minecraft:shroomlight", 3.0],
]);

/** @type {ReadonlyMap<string, number>} */
const COLD_BLOCKS = new Map([
  ["minecraft:powder_snow", -15.0],
  ["minecraft:blue_ice", -11.0],
  ["minecraft:packed_ice", -8.0],
  ["minecraft:ice", -5.0],
  ["minecraft:frosted_ice", -5.0],
  ["minecraft:snow", -4.0],
  ["minecraft:snow_layer", -2.0],
]);

const PORTABLE_WARM_ITEMS = new Set([
  "minecraft:torch",
  "minecraft:soul_torch",
  "minecraft:lantern",
  "minecraft:soul_lantern",
  "minecraft:lava_bucket",
  "minecraft:blaze_rod",
  "climate:hand_warmer",
]);

const PORTABLE_COOL_ITEMS = new Set([
  "minecraft:blue_ice",
  "minecraft:packed_ice",
  "minecraft:ice",
  "minecraft:powder_snow_bucket",
  "climate:ice_pack",
]);

/**
 * Convert Minecraft base temperature (-0.7 .. 2.0) to intuitive °C.
 * Calibrated so 0.15 (Minecraft's exact snow threshold) === 0.0°C (32°F),
 * 0.80 (Plains) === 22.0°C, 0.60 (Dappled Forest) === 15.2°C, and 2.00 (Desert) === 48.0°C.
 *
 * @param {number} mcTemp
 * @returns {number}
 */
export function mcTempToCelsius(mcTemp) {
  if (mcTemp <= 0.8) {
    return (mcTemp - 0.15) * (22.0 / 0.65);
  }
  return 22.0 + (mcTemp - 0.8) * (26.0 / 1.2);
}

/**
 * Convert °C back to approximate Minecraft temperature units.
 * @param {number} celsius
 * @returns {number}
 */
export function celsiusToMcTemp(celsius) {
  if (celsius <= 22.0) {
    return 0.15 + celsius * (0.65 / 22.0);
  }
  return 0.8 + (celsius - 22.0) * (1.2 / 26.0);
}

/**
 * Convert °C to °F.
 * @param {number} celsius
 * @returns {number}
 */
export function celsiusToFahrenheit(celsius) {
  return celsius * 1.8 + 32.0;
}

/**
 * Read a player's persisted body temperature (°C), defaulting to 37.0°C.
 * @param {import("@minecraft/server").Player} player
 * @returns {number}
 */
export function getPlayerBodyTemp(player) {
  const val = player.getDynamicProperty(BODY_TEMP_PROP);
  if (typeof val === "number" && Number.isFinite(val)) {
    return Math.max(29.0, Math.min(43.5, val));
  }
  return NORMAL_BODY_TEMP_C;
}

/**
 * Persist a player's body temperature (°C).
 * @param {import("@minecraft/server").Player} player
 * @param {number} tempC
 */
export function setPlayerBodyTemp(player, tempC) {
  const clamped = Math.max(29.0, Math.min(43.5, tempC));
  player.setDynamicProperty(BODY_TEMP_PROP, Math.round(clamped * 1000) / 1000);
}

/**
 * Scan nearby 3x3x3 blocks around the player for heat/cold emitters.
 * @param {import("@minecraft/server").Dimension} dimension
 * @param {{ x: number, y: number, z: number }} loc
 * @param {{ min: number, max: number }} heightRange
 * @returns {{ blockDeltaC: number, inPowderSnow: boolean, inLavaOrFire: boolean }}
 */
function scanNearbyThermalBlocks(dimension, loc, heightRange) {
  const bx = Math.floor(loc.x);
  const by = Math.floor(loc.y);
  const bz = Math.floor(loc.z);

  let strongestHeat = 0;
  let extraHeat = 0;
  let strongestCold = 0;
  let inPowderSnow = false;
  let inLavaOrFire = false;

  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const y = by + dy;
      if (y < heightRange.min || y >= heightRange.max) continue;

      for (let dz = -1; dz <= 1; dz++) {
        let block;
        try {
          block = dimension.getBlock({ x: bx + dx, y, z: bz + dz });
        } catch {
          continue;
        }
        if (!block) continue;

        const typeId = block.typeId;
        const isAtBody = dx === 0 && (dy === 0 || dy === 1) && dz === 0;

        if (typeId === "minecraft:powder_snow" && isAtBody) {
          inPowderSnow = true;
        }
        if (
          isAtBody &&
          (typeId === "minecraft:lava" ||
            typeId === "minecraft:flowing_lava" ||
            typeId === "minecraft:fire" ||
            typeId === "minecraft:soul_fire")
        ) {
          inLavaOrFire = true;
        }

        let heat = HEAT_BLOCKS.get(typeId);
        if (heat !== undefined) {
          // Unlit campfires emit no heat
          if (typeId === "minecraft:campfire" || typeId === "minecraft:soul_campfire") {
            try {
              if (block.permutation.getState("extinguished") === true) {
                heat = 0;
              }
            } catch {
              // Ignore permutation state check errors
            }
          }
          if (heat > 0) {
            const distFactor = dx === 0 && dz === 0 ? 1.0 : 0.72;
            const weighted = heat * distFactor;
            if (weighted > strongestHeat) {
              extraHeat += strongestHeat * 0.2;
              strongestHeat = weighted;
            } else {
              extraHeat += weighted * 0.2;
            }
          }
        }

        const cold = COLD_BLOCKS.get(typeId);
        if (cold !== undefined && cold < strongestCold) {
          strongestCold = cold;
        }
      }
    }
  }

  const totalHeat = Math.min(24.0, strongestHeat + extraHeat);
  const totalCold = Math.max(-16.0, strongestCold);
  return {
    blockDeltaC: totalHeat + totalCold,
    inPowderSnow,
    inLavaOrFire,
  };
}

/**
 * Evaluate equipped armor insulation and held thermal items.
 * @param {import("@minecraft/server").Player} player
 */
export function evaluateEquipmentThermal(player) {
  let coldProtectionC = 0;
  let heatProtectionC = 0;
  let coldLossMultiplier = 1.0;
  let heldDeltaC = 0;
  let holdingThermometer = false;

  try {
    const equip = player.getComponent(EntityComponentTypes.Equippable);
    if (equip) {
      const armorSlots = [
        EquipmentSlot.Head,
        EquipmentSlot.Chest,
        EquipmentSlot.Legs,
        EquipmentSlot.Feet,
      ];
      for (const slot of armorSlots) {
        const item = equip.getEquipment(slot);
        if (!item) continue;
        const id = item.typeId;

        if (id.includes("leather_")) {
          coldProtectionC += 3.25; // +13°C full set
          coldLossMultiplier -= 0.14; // up to 56% slower cooling
        } else if (id.includes("chainmail_") || id.includes("golden_") || id.includes("turtle_")) {
          heatProtectionC += 2.0; // breathable / reflective in hot climates
          coldProtectionC += 0.5;
        } else if (id.includes("netherite_") || id.includes("iron_") || id.includes("diamond_") || id.includes("copper_")) {
          coldProtectionC += 1.0;
          heatProtectionC -= 1.0; // heavy armor retains heat in deserts
        }
      }

      const hands = [
        equip.getEquipment(EquipmentSlot.Mainhand),
        equip.getEquipment(EquipmentSlot.Offhand),
      ];
      for (const handItem of hands) {
        if (!handItem) continue;
        if (handItem.typeId === "climate:thermometer") {
          holdingThermometer = true;
        }
        if (PORTABLE_WARM_ITEMS.has(handItem.typeId)) {
          heldDeltaC += handItem.typeId === "minecraft:lava_bucket" ? 5.0 : 2.5;
        } else if (PORTABLE_COOL_ITEMS.has(handItem.typeId)) {
          heldDeltaC -= 2.5;
        }
      }
    }
  } catch {
    // Ignore equipment read errors
  }

  return {
    coldProtectionC,
    heatProtectionC,
    coldLossMultiplier: Math.max(0.35, coldLossMultiplier),
    heldDeltaC,
    holdingThermometer,
  };
}

/**
 *Classify core body temperature (°C) into one of 7 survival states.
 * @param {number} bodyTempC
 */
export function classifyBodyState(bodyTempC) {
  if (bodyTempC <= 32.5) {
    return {
      id: "SEVERE_HYPOTHERMIA",
      label: "Freezing",
      color: "§b",
      icon: "❄",
      isDanger: true,
    };
  }
  if (bodyTempC <= 34.0) {
    return {
      id: "HYPOTHERMIA",
      label: "Hypothermia",
      color: "§3",
      icon: "❄",
      isDanger: true,
    };
  }
  if (bodyTempC <= 35.4) {
    return {
      id: "COLD",
      label: "Chilly",
      color: "§b",
      icon: "•",
      isDanger: false,
    };
  }
  if (bodyTempC < 38.5) {
    return {
      id: "COMFORTABLE",
      label: "Comfortable",
      color: "§a",
      icon: "✦",
      isDanger: false,
    };
  }
  if (bodyTempC < 39.6) {
    return {
      id: "WARM",
      label: "Warm",
      color: "§e",
      icon: "•",
      isDanger: false,
    };
  }
  if (bodyTempC < 41.0) {
    return {
      id: "HEAT_EXHAUSTION",
      label: "Overheating",
      color: "§6",
      icon: "☀",
      isDanger: true,
    };
  }
  return {
    id: "HEATSTROKE",
    label: "Heatstroke",
    color: "§c",
    icon: "🔥",
    isDanger: true,
  };
}

/**
 * Compute full ambient & body temperature snapshot for a player and step their
 * body core temperature forward by `dtSeconds`.
 *
 * @param {import("@minecraft/server").Player} player
 * @param {string} currentWeather "Clear" | "Rain" | "Thunder"
 * @param {number} timeOfDay 0..23999
 * @param {number} dtSeconds Elapsed seconds since last update
 * @param {boolean} applyDamageTick Whether periodic hazard damage/effects should fire on this tick
 */
export function stepPlayerTemperature(
  player,
  currentWeather,
  timeOfDay,
  dtSeconds,
  applyDamageTick
) {
  const dim = player.dimension;
  const loc = player.location;
  const heightRange = dim.heightRange ?? { min: -64, max: 320 };
  const clampedY = Math.max(heightRange.min, Math.min(heightRange.max - 1, Math.floor(loc.y)));
  const samplePos = { x: loc.x, y: clampedY, z: loc.z };

  // 1. Biome lookup via BEDROCK_BIOME_TEMPERATURES Map
  let biomeId = "minecraft:plains";
  let baseMcTemp = 0.8;
  try {
    const biome = dim.getBiome(samplePos);
    if (biome?.id) {
      biomeId = biome.id;
      baseMcTemp = getBiomeTemperature(biome);
    }
  } catch {
    if (dim.id === "minecraft:nether" || dim.id === "minecraft:the_nether") {
      biomeId = "minecraft:hell";
      baseMcTemp = 2.0;
    } else if (dim.id === "minecraft:the_end") {
      biomeId = "minecraft:the_end";
      baseMcTemp = 0.5;
    }
  }

  // 2. Altitude adjustment (Minecraft formula: -0.00125 MC temp per block above Y=80)
  const altitudeMcDelta = loc.y > 80 && dim.id === "minecraft:overworld" ? -(loc.y - 80) * 0.00125 : 0;
  const heightMcTemp = baseMcTemp + altitudeMcDelta;

  const baseBiomeC = mcTempToCelsius(baseMcTemp);
  let ambientC = mcTempToCelsius(heightMcTemp);
  const altitudeDeltaC = ambientC - baseBiomeC;

  // Dimension baseline modifier (Nether is intensely hot)
  let dimensionDeltaC = 0;
  if (dim.id === "minecraft:nether" || dim.id === "minecraft:the_nether") {
    dimensionDeltaC = 12.0;
  } else if (dim.id === "minecraft:the_end") {
    dimensionDeltaC = -6.0;
  }
  ambientC += dimensionDeltaC;

  // 3. Sky light, time of day, weather, and underground cave moderation
  let skyLight = 15;
  try {
    skyLight = dim.getSkyLightLevel({
      x: Math.floor(loc.x),
      y: Math.min(heightRange.max - 1, Math.max(heightRange.min, Math.floor(loc.y + 1))),
      z: Math.floor(loc.z),
    }) ?? 15;
  } catch {
    skyLight = dim.id === "minecraft:overworld" ? 15 : 0;
  }

  let sunTimeDeltaC = 0;
  let weatherDeltaC = 0;
  let caveDeltaC = 0;

  if (dim.id === "minecraft:overworld") {
    const isDay = timeOfDay >= 0 && timeOfDay < 12500;
    const isArid = ARID_BIOMES.has(biomeId);

    if (isDay) {
      // Peak warmth around noon (6000 ticks)
      const dayCurve = Math.sin((Math.min(12500, timeOfDay) / 12500) * Math.PI);
      const maxSun = isArid ? 7.5 : 4.5;
      const sunFactor = currentWeather === "Clear" ? (skyLight >= 12 ? 1.0 : skyLight / 24.0) : 0.2;
      sunTimeDeltaC = dayCurve * maxSun * sunFactor;
    } else {
      // Peak chill around midnight (18000 ticks)
      const nightProgress = (timeOfDay - 12500) / 11500;
      const nightCurve = Math.sin(Math.max(0, Math.min(1, nightProgress)) * Math.PI);
      const maxChill = isArid ? -9.0 : -4.5; // Clear desert nights get cold
      const exposure = Math.max(0.25, skyLight / 15.0);
      sunTimeDeltaC = nightCurve * maxChill * exposure;
    }

    if (currentWeather === "Rain" && skyLight >= 12) {
      weatherDeltaC = -4.0;
    } else if (currentWeather === "Thunder" && skyLight >= 12) {
      weatherDeltaC = -6.5;
    }

    // Deep enclosed caves moderate surface extremes unless in a dedicated cave biome
    if (loc.y < 48 && skyLight <= 2 && !CAVE_BIOMES.has(biomeId)) {
      const depthFactor = Math.min(0.65, (48 - loc.y) / 60);
      const targetCaveC = 16.0;
      caveDeltaC = (targetCaveC - (ambientC + sunTimeDeltaC)) * depthFactor;
    }
  }

  ambientC += sunTimeDeltaC + weatherDeltaC + caveDeltaC;

  // 4. Nearby blocks (campfires, lava, furnaces, ice, powder snow)
  const { blockDeltaC, inPowderSnow, inLavaOrFire } = scanNearbyThermalBlocks(dim, loc, heightRange);
  ambientC += blockDeltaC;

  // 5. Player activity & immersion
  const equipment = evaluateEquipmentThermal(player);
  let activityDeltaC = equipment.heldDeltaC;
  if (player.isSprinting) activityDeltaC += 2.5;
  if (player.isInWater || player.isSwimming) {
    // Water pulls effective felt temperature toward cool water (~14°C) or icy water in frozen biomes
    const waterTargetC = baseBiomeC < 2 ? 2.0 : 15.0;
    activityDeltaC += (waterTargetC - ambientC) * 0.45;
  }
  if (inPowderSnow) {
    activityDeltaC -= 12.0;
  }

  const effectiveFeltC = ambientC + activityDeltaC;

  // 6. Compute target equilibrium Core Body Temperature (°C)
  const comfortMinC = 12.0 - equipment.coldProtectionC;
  const comfortMaxC = 29.0 + equipment.heatProtectionC;

  let hasFireRes = false;
  try {
    hasFireRes = Boolean(player.getEffect("fire_resistance"));
  } catch {
    hasFireRes = false;
  }

  let targetBodyC = NORMAL_BODY_TEMP_C;
  if (effectiveFeltC < comfortMinC) {
    const deficit = comfortMinC - effectiveFeltC;
    targetBodyC = NORMAL_BODY_TEMP_C - deficit * 0.14 * equipment.coldLossMultiplier;
  } else if (effectiveFeltC > comfortMaxC) {
    const excess = effectiveFeltC - comfortMaxC;
    targetBodyC = NORMAL_BODY_TEMP_C + excess * 0.13;
    if (hasFireRes) {
      targetBodyC = Math.min(38.2, targetBodyC);
    }
  }

  if (inLavaOrFire && !hasFireRes) {
    targetBodyC = Math.max(targetBodyC, 42.5);
  }
  if (inPowderSnow) {
    targetBodyC = Math.min(targetBodyC, 31.5);
  }
  targetBodyC = Math.max(30.0, Math.min(43.0, targetBodyC));

  // 7. Step body temperature smoothly with thermal inertia
  const prevBodyC = getPlayerBodyTemp(player);
  let gameMode = GameMode.Survival;
  try {
    gameMode = player.getGameMode();
  } catch {
    gameMode = GameMode.Survival;
  }

  const isVulnerable = gameMode === GameMode.Survival || gameMode === GameMode.Adventure;
  let nextBodyC = prevBodyC;

  if (!isVulnerable) {
    // Smoothly return to 37.0°C in Creative / Spectator
    nextBodyC = prevBodyC + (NORMAL_BODY_TEMP_C - prevBodyC) * Math.min(1, dtSeconds * 0.4);
  } else {
    let ratePerSec = 0.045; // ~22s time constant for realistic gradual survival pacing
    if (player.isInWater || player.isSwimming) ratePerSec *= 2.4;
    if (Math.abs(NORMAL_BODY_TEMP_C - targetBodyC) < Math.abs(NORMAL_BODY_TEMP_C - prevBodyC)) {
      // Recovering back toward normal near a campfire or shade is slightly faster
      ratePerSec *= 1.65;
    }
    const alpha = Math.min(1.0, ratePerSec * dtSeconds);
    nextBodyC = prevBodyC + (targetBodyC - prevBodyC) * alpha;
  }

  setPlayerBodyTemp(player, nextBodyC);
  const state = classifyBodyState(nextBodyC);

  // 8. Apply survival status effects & periodic hazard damage
  if (isVulnerable && applyDamageTick) {
    applyThermalSurvivalEffects(player, state.id, hasFireRes);
  }

  const trend =
    targetBodyC - nextBodyC > 0.25 ? "up" : targetBodyC - nextBodyC < -0.25 ? "down" : "stable";

  return {
    biomeId,
    biomeName: getBiomeDisplayName(biomeId),
    baseMcTemp,
    baseBiomeC,
    altitudeDeltaC,
    dimensionDeltaC,
    sunTimeDeltaC,
    weatherDeltaC,
    caveDeltaC,
    blockDeltaC,
    activityDeltaC,
    ambientC,
    effectiveFeltC,
    comfortMinC,
    comfortMaxC,
    coldProtectionC: equipment.coldProtectionC,
    heatProtectionC: equipment.heatProtectionC,
    holdingThermometer: equipment.holdingThermometer,
    bodyTempC: nextBodyC,
    targetBodyC,
    trend,
    state,
    hasFireRes,
    skyLight,
    weather: currentWeather,
  };
}

/**
 * Apply survival status effects and periodic hazard damage for extreme body temperatures.
 * @param {import("@minecraft/server").Player} player
 * @param {string} stateId
 * @param {boolean} hasFireRes
 */
function applyThermalSurvivalEffects(player, stateId, hasFireRes) {
  try {
    if (stateId === "SEVERE_HYPOTHERMIA") {
      player.addEffect("slowness", 80, { amplifier: 1, showParticles: false });
      player.addEffect("mining_fatigue", 80, { amplifier: 0, showParticles: false });
      player.applyDamage(1, { cause: EntityDamageCause.freezing });
      player.dimension.spawnParticle("minecraft:snowflake_particle", {
        x: player.location.x,
        y: player.location.y + 1.4,
        z: player.location.z,
      });
    } else if (stateId === "HYPOTHERMIA") {
      player.addEffect("slowness", 80, { amplifier: 0, showParticles: false });
      player.addEffect("weakness", 80, { amplifier: 0, showParticles: false });
    } else if (stateId === "HEAT_EXHAUSTION" && !hasFireRes) {
      player.addEffect("hunger", 80, { amplifier: 0, showParticles: false });
      player.addEffect("weakness", 80, { amplifier: 0, showParticles: false });
    } else if (stateId === "HEATSTROKE" && !hasFireRes) {
      player.addEffect("slowness", 80, { amplifier: 0, showParticles: false });
      player.addEffect("hunger", 80, { amplifier: 1, showParticles: false });
      player.applyDamage(1, { cause: EntityDamageCause.fireTick });
      player.dimension.spawnParticle("minecraft:basic_smoke_particle", {
        x: player.location.x,
        y: player.location.y + 1.5,
        z: player.location.z,
      });
    }
  } catch {
    // Safely ignore if player died or disconnected mid-tick
  }
}
