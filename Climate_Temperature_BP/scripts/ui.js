import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { celsiusToFahrenheit, celsiusToMcTemp } from "./temperatureEngine.js";

export const UNIT_PROP = "climate:unit";
export const HUD_MODE_PROP = "climate:hud_mode";

export const UNITS = ["C", "F", "MC"];
export const HUD_MODES = ["always", "item_or_danger", "item_only", "off"];

const HUD_MODE_LABELS = [
  "Always On",
  "Thermometer Held or Danger Zone",
  "Only While Holding Thermometer",
  "Hidden (Off)",
];

const UNIT_LABELS = [
  "Celsius (°C)",
  "Fahrenheit (°F)",
  "Minecraft Raw (-0.70 to 2.00)",
];

/**
 * Get player's preferred temperature unit ("C" | "F" | "MC").
 * @param {import("@minecraft/server").Player} player
 * @returns {"C" | "F" | "MC"}
 */
export function getPlayerUnit(player) {
  const val = player.getDynamicProperty(UNIT_PROP);
  if (val === "F" || val === "MC" || val === "C") return val;
  return "C";
}

/**
 * Cycle player's temperature unit ("C" -> "F" -> "MC" -> "C").
 * @param {import("@minecraft/server").Player} player
 * @returns {"C" | "F" | "MC"}
 */
export function cyclePlayerUnit(player) {
  const current = getPlayerUnit(player);
  const idx = UNITS.indexOf(current);
  const next = /** @type {"C" | "F" | "MC"} */ (UNITS[(idx + 1) % UNITS.length]);
  player.setDynamicProperty(UNIT_PROP, next);
  return next;
}

/**
 * Get player's preferred HUD mode.
 * @param {import("@minecraft/server").Player} player
 * @returns {"always" | "item_or_danger" | "item_only" | "off"}
 */
export function getPlayerHudMode(player) {
  const val = player.getDynamicProperty(HUD_MODE_PROP);
  if (val === "always" || val === "item_or_danger" || val === "item_only" || val === "off") {
    return val;
  }
  return "always";
}

/**
 * Format a Celsius value into the player's chosen unit.
 * @param {number} celsius
 * @param {"C" | "F" | "MC"} unit
 * @returns {string}
 */
export function formatTemp(celsius, unit) {
  if (unit === "F") {
    return `${celsiusToFahrenheit(celsius).toFixed(1)}°F`;
  }
  if (unit === "MC") {
    return `${celsiusToMcTemp(celsius).toFixed(2)} MC`;
  }
  return `${celsius.toFixed(1)}°C`;
}

/**
 * Format a signed temperature delta in the player's chosen unit.
 * @param {number} deltaC
 * @param {"C" | "F" | "MC"} unit
 * @returns {string}
 */
function formatDelta(deltaC, unit) {
  const sign = deltaC >= 0 ? "+" : "";
  if (unit === "F") {
    return `${sign}${(deltaC * 1.8).toFixed(1)}°F`;
  }
  if (unit === "MC") {
    return `${sign}${(deltaC * (0.65 / 22.0)).toFixed(2)} MC`;
  }
  return `${sign}${deltaC.toFixed(1)}°C`;
}

/**
 * Build a 10-segment visual thermometer bar for body temperature (32°C .. 42°C).
 * @param {number} bodyTempC
 * @returns {string}
 */
function buildThermometerBar(bodyTempC) {
  const total = 10;
  const normalized = Math.max(0, Math.min(1, (bodyTempC - 32.0) / 10.0));
  const filled = Math.max(1, Math.min(total, Math.round(normalized * total)));

  let bar = "§8[";
  for (let i = 0; i < total; i++) {
    if (i < filled) {
      if (i <= 2) bar += "§b█";
      else if (i <= 6) bar += "§a█";
      else if (i <= 7) bar += "§e█";
      else bar += "§c█";
    } else {
      bar += "§8░";
    }
  }
  bar += "§8]§r";
  return bar;
}

/**
 * Render the actionbar HUD for a player if enabled by their HUD mode.
 * @param {import("@minecraft/server").Player} player
 * @param {ReturnType<import("./temperatureEngine.js").stepPlayerTemperature>} snap
 */
export function updatePlayerHud(player, snap) {
  const hudMode = getPlayerHudMode(player);
  if (hudMode === "off") return;

  const nonComfort = snap.state.id !== "COMFORTABLE";
  if (hudMode === "item_only" && !snap.holdingThermometer) return;
  if (hudMode === "item_or_danger" && !snap.holdingThermometer && !nonComfort) return;

  const unit = getPlayerUnit(player);
  const bar = buildThermometerBar(snap.bodyTempC);
  const trendGlyph =
    snap.trend === "up" ? "§c▲" : snap.trend === "down" ? "§b▼" : "§7•";

  let text;
  if (snap.holdingThermometer) {
    // Expanded meteorological readout when holding the Pocket Thermometer
    text =
      `${snap.state.color}${snap.state.icon} ${snap.state.label}§r ` +
      `${bar} §fBody ${formatTemp(snap.bodyTempC, unit)} ${trendGlyph}§r ` +
      `§8| §eEnv ${formatTemp(snap.ambientC, unit)} §7(${snap.biomeName})`;
  } else {
    text =
      `${snap.state.color}${snap.state.icon} §f${formatTemp(snap.bodyTempC, unit)} ` +
      `${bar} ${snap.state.color}${snap.state.label} ${trendGlyph}`;
  }

  try {
    player.onScreenDisplay.setActionBar(text);
  } catch {
    // Ignore display errors
  }
}

/**
 * Open the interactive Pocket Thermometer report & settings menu.
 * @param {import("@minecraft/server").Player} player
 * @param {ReturnType<import("./temperatureEngine.js").stepPlayerTemperature>} snap
 */
export async function openThermometerMenu(player, snap) {
  const unit = getPlayerUnit(player);
  const hudMode = getPlayerHudMode(player);
  const hudLabel = HUD_MODE_LABELS[HUD_MODES.indexOf(hudMode)] ?? "Always On";

  const trendLabel =
    snap.trend === "up"
      ? `§c▲ Warming toward ${formatTemp(snap.targetBodyC, unit)}`
      : snap.trend === "down"
      ? `§b▼ Cooling toward ${formatTemp(snap.targetBodyC, unit)}`
      : "§a● Stable";

  const lines = [
    `§l§6Environment§r`,
    `§7Biome: §f${snap.biomeName} §8(${snap.biomeId})`,
    `§7Biome Base Temp: §f${snap.baseMcTemp.toFixed(2)} MC §7(${formatTemp(snap.baseBiomeC, unit)})`,
    `§7Altitude (Y=${Math.floor(player.location.y)}): §f${formatDelta(snap.altitudeDeltaC, unit)}`,
    `§7Time / Sky Exposure: §f${formatDelta(snap.sunTimeDeltaC + snap.caveDeltaC, unit)} §8(Sky ${snap.skyLight}/15)`,
    `§7Weather (${snap.weather}): §f${formatDelta(snap.weatherDeltaC, unit)}`,
    `§7Nearby Blocks: §f${formatDelta(snap.blockDeltaC, unit)}`,
    `§7Ambient Air Temp: §e${formatTemp(snap.ambientC, unit)}`,
    ``,
    `§l§bBody & Insulation§r`,
    `§7Status: ${snap.state.color}${snap.state.icon} ${snap.state.label}§r`,
    `§7Core Body Temp: §f${formatTemp(snap.bodyTempC, unit)} §8(${trendLabel}§8)`,
    `§7Comfort Window: §a${formatTemp(snap.comfortMinC, unit)} §7to §e${formatTemp(snap.comfortMaxC, unit)}`,
    `§7Armor Cold / Heat Bonus: §b+${snap.coldProtectionC.toFixed(1)}°C §7/ §6${snap.heatProtectionC >= 0 ? "+" : ""}${snap.heatProtectionC.toFixed(1)}°C`,
    `§7HUD Mode: §f${hudLabel}`,
  ];

  const form = new ActionFormData()
    .title("Pocket Thermometer")
    .body(lines.join("\n"))
    .button(`Switch Unit (Current: ${unit})`, "textures/items/thermometer")
    .button("HUD & Display Settings", "textures/ui/gear")
    .button("Close");

  try {
    const res = await form.show(player);
    if (res.canceled || res.selection === undefined) return;

    if (res.selection === 0) {
      const nextUnit = cyclePlayerUnit(player);
      player.playSound("random.click", { pitch: 1.2, volume: 0.7 });
      player.sendMessage(`§a[Climate]§r Temperature unit switched to §e${nextUnit}§r.`);
    } else if (res.selection === 1) {
      await openSettingsModal(player);
    }
  } catch {
    // Ignore if player is busy or closes UI
  }
}

/**
 * Open the HUD & Unit preferences modal.
 * @param {import("@minecraft/server").Player} player
 */
export async function openSettingsModal(player) {
  const currentUnitIdx = Math.max(0, UNITS.indexOf(getPlayerUnit(player)));
  const currentHudIdx = Math.max(0, HUD_MODES.indexOf(getPlayerHudMode(player)));

  const modal = new ModalFormData()
    .title("Thermometer & HUD Settings")
    .dropdown("Temperature Scale", UNIT_LABELS, {
      defaultValueIndex: currentUnitIdx,
      tooltip: "Choose how temperatures are displayed on the HUD and Thermometer.",
    })
    .dropdown("HUD Visibility Mode", HUD_MODE_LABELS, {
      defaultValueIndex: currentHudIdx,
      tooltip: "Control when the temperature bar appears above your hotbar.",
    })
    .submitButton("Save Preferences");

  try {
    const res = await modal.show(player);
    if (res.canceled || !res.formValues) return;

    const unitIdx = Number(res.formValues[0] ?? 0);
    const hudIdx = Number(res.formValues[1] ?? 0);

    const chosenUnit = UNITS[unitIdx] ?? "C";
    const chosenHud = HUD_MODES[hudIdx] ?? "always";

    player.setDynamicProperty(UNIT_PROP, chosenUnit);
    player.setDynamicProperty(HUD_MODE_PROP, chosenHud);
    player.playSound("random.orb", { pitch: 1.3, volume: 0.6 });
    player.sendMessage(
      `§a[Climate]§r Saved settings — Unit: §e${chosenUnit}§r, HUD: §e${HUD_MODE_LABELS[hudIdx]}§r.`
    );
  } catch {
    // Ignore UI cancellation
  }
}
