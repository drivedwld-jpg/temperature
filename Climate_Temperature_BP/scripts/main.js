import {
  CommandPermissionLevel,
  CustomCommandSource,
  CustomCommandStatus,
  EntityComponentTypes,
  EquipmentSlot,
  GameMode,
  ItemComponentTypes,
  system,
  world,
} from "@minecraft/server";
import {
  NORMAL_BODY_TEMP_C,
  getPlayerBodyTemp,
  setPlayerBodyTemp,
  stepPlayerTemperature,
} from "./temperatureEngine.js";
import {
  cyclePlayerUnit,
  formatTemp,
  getPlayerUnit,
  openThermometerMenu,
  updatePlayerHud,
} from "./ui.js";

/** @type {Map<string, string>} Dimension ID -> "Clear" | "Rain" | "Thunder" */
const dimensionWeather = new Map([
  ["minecraft:overworld", "Clear"],
  ["minecraft:nether", "Clear"],
  ["minecraft:the_nether", "Clear"],
  ["minecraft:the_end", "Clear"],
]);

/** @type {Map<string, ReturnType<typeof stepPlayerTemperature>>} Latest snapshot per player ID */
const latestSnapshots = new Map();

const COOLING_CONSUMABLES = new Set([
  "minecraft:potion",
  "minecraft:milk_bucket",
  "minecraft:melon_slice",
  "minecraft:sweet_berries",
  "minecraft:glow_berries",
  "minecraft:apple",
]);

const WARMING_CONSUMABLES = new Set([
  "minecraft:mushroom_stew",
  "minecraft:rabbit_stew",
  "minecraft:beetroot_soup",
  "minecraft:suspicious_stew",
  "minecraft:cooked_beef",
  "minecraft:cooked_porkchop",
  "minecraft:cooked_mutton",
  "minecraft:cooked_chicken",
  "minecraft:cooked_salmon",
  "minecraft:cooked_cod",
  "minecraft:baked_potato",
  "minecraft:pumpkin_pie",
]);

/**
 * Damage a custom reusable thermal pack by 1 durability point in Survival/Adventure.
 * @param {import("@minecraft/server").Player} player
 */
function consumePackDurability(player) {
  try {
    const mode = player.getGameMode();
    if (mode === GameMode.Creative || mode === GameMode.Spectator) return;

    const equip = player.getComponent(EntityComponentTypes.Equippable);
    if (!equip) return;

    const item = equip.getEquipment(EquipmentSlot.Mainhand);
    if (!item) return;

    const dur = item.getComponent(ItemComponentTypes.Durability);
    if (!dur || dur.unbreakable) return;

    if (dur.damage + 1 >= dur.maxDurability) {
      equip.setEquipment(EquipmentSlot.Mainhand, undefined);
      player.playSound("random.break", { pitch: 1.0, volume: 0.8 });
    } else {
      dur.damage += 1;
      equip.setEquipment(EquipmentSlot.Mainhand, item);
    }
  } catch {
    // Ignore durability errors
  }
}

// ============================================================================
// 1. Register Custom Item Components & Slash Command at Startup
// ============================================================================
system.beforeEvents.startup.subscribe((initEvent) => {
  // Pocket Thermometer (`climate:thermometer`)
  initEvent.itemComponentRegistry.registerCustomComponent("climate:thermometer_use", {
    onUse(event) {
      const player = event.source;
      if (!player?.isValid) return;

      system.run(() => {
        if (!player.isValid) return;

        // Sneak + Use quickly cycles °C -> °F -> MC Raw
        if (player.isSneaking) {
          const nextUnit = cyclePlayerUnit(player);
          player.playSound("random.click", { pitch: 1.25, volume: 0.7 });
          const snap =
            latestSnapshots.get(player.id) ??
            stepPlayerTemperature(
              player,
              dimensionWeather.get(player.dimension.id) ?? "Clear",
              world.getTimeOfDay(),
              0,
              false
            );
          latestSnapshots.set(player.id, snap);
          updatePlayerHud(player, snap);
          player.sendMessage(`§a[Climate]§r Display unit set to §e${nextUnit}§r.`);
          return;
        }

        const snap =
          latestSnapshots.get(player.id) ??
          stepPlayerTemperature(
            player,
            dimensionWeather.get(player.dimension.id) ?? "Clear",
            world.getTimeOfDay(),
            0,
            false
          );
        latestSnapshots.set(player.id, snap);
        player.playSound("random.pop", { pitch: 1.4, volume: 0.5 });
        openThermometerMenu(player, snap);
      });
    },
  });

  // Frost Cooling Pack (`climate:ice_pack`) — emergency heat relief
  initEvent.itemComponentRegistry.registerCustomComponent("climate:ice_pack_use", {
    onUse(event) {
      const player = event.source;
      if (!player?.isValid) return;

      system.run(() => {
        if (!player.isValid) return;
        const current = getPlayerBodyTemp(player);
        const cooled = Math.max(35.5, current - 2.2);
        setPlayerBodyTemp(player, cooled);
        consumePackDurability(player);

        const unit = getPlayerUnit(player);
        player.playSound("random.fizz", { pitch: 1.5, volume: 0.6 });
        player.dimension.spawnParticle("minecraft:snowflake_particle", {
          x: player.location.x,
          y: player.location.y + 1.2,
          z: player.location.z,
        });
        player.sendMessage(
          `§b[Frost Pack]§r Cooled body temperature to §b${formatTemp(cooled, unit)}§r.`
        );
      });
    },
  });

  // Ember Hand Warmer (`climate:hand_warmer`) — emergency cold relief
  initEvent.itemComponentRegistry.registerCustomComponent("climate:hand_warmer_use", {
    onUse(event) {
      const player = event.source;
      if (!player?.isValid) return;

      system.run(() => {
        if (!player.isValid) return;
        const current = getPlayerBodyTemp(player);
        const warmed = Math.min(38.2, current + 2.2);
        setPlayerBodyTemp(player, warmed);
        consumePackDurability(player);

        const unit = getPlayerUnit(player);
        player.playSound("fire.ignite", { pitch: 1.2, volume: 0.6 });
        player.dimension.spawnParticle("minecraft:basic_flame_particle", {
          x: player.location.x,
          y: player.location.y + 1.1,
          z: player.location.z,
        });
        player.sendMessage(
          `§6[Ember Warmer]§r Warmed body temperature to §e${formatTemp(warmed, unit)}§r.`
        );
      });
    },
  });

  // Custom slash command `/climate:temp` (usable in Survival without cheats)
  try {
    initEvent.customCommandRegistry.registerCommand(
      {
        name: "climate:temp",
        description: "Open your Climate & Body Temperature report and HUD settings.",
        permissionLevel: CommandPermissionLevel.Any,
        cheatsRequired: false,
      },
      (origin) => {
        if (
          origin.sourceType !== CustomCommandSource.Entity ||
          !origin.sourceEntity ||
          origin.sourceEntity.typeId !== "minecraft:player"
        ) {
          return {
            status: CustomCommandStatus.Failure,
            message: "This command can only be run by a player.",
          };
        }

        const player = /** @type {import("@minecraft/server").Player} */ (origin.sourceEntity);
        system.run(() => {
          if (!player.isValid) return;
          const snap =
            latestSnapshots.get(player.id) ??
            stepPlayerTemperature(
              player,
              dimensionWeather.get(player.dimension.id) ?? "Clear",
              world.getTimeOfDay(),
              0,
              false
            );
          latestSnapshots.set(player.id, snap);
          openThermometerMenu(player, snap);
        });

        return {
          status: CustomCommandStatus.Success,
        };
      }
    );
  } catch {
    // Ignore if command already registered
  }
});

// ============================================================================
// 2. World Event Listeners (Weather, Respawn, Food & Drink Thermal Relief)
// ============================================================================
world.afterEvents.weatherChange.subscribe((ev) => {
  dimensionWeather.set(ev.dimension, String(ev.newWeather));
});

world.afterEvents.playerSpawn.subscribe((ev) => {
  if (!ev.initialSpawn && ev.player?.isValid) {
    // Reset core body temperature to 37.0°C after respawning from death
    setPlayerBodyTemp(ev.player, NORMAL_BODY_TEMP_C);
  }
});

world.afterEvents.playerLeave.subscribe((ev) => {
  latestSnapshots.delete(ev.playerId);
});

world.afterEvents.itemCompleteUse.subscribe((ev) => {
  const player = ev.source;
  if (!player?.isValid) return;
  const itemId = ev.itemStack?.typeId;
  if (!itemId) return;

  const bodyC = getPlayerBodyTemp(player);
  if (COOLING_CONSUMABLES.has(itemId) && bodyC > NORMAL_BODY_TEMP_C) {
    setPlayerBodyTemp(player, Math.max(NORMAL_BODY_TEMP_C, bodyC - 0.9));
  } else if (WARMING_CONSUMABLES.has(itemId) && bodyC < NORMAL_BODY_TEMP_C) {
    setPlayerBodyTemp(player, Math.min(NORMAL_BODY_TEMP_C, bodyC + 0.9));
  }
});

// ============================================================================
// 3. Main Survival Temperature Loop (Runs every 10 ticks = 0.5 seconds)
// ============================================================================
const STEP_TICKS = 10;
const DT_SECONDS = STEP_TICKS / 20.0;
let stepCounter = 0;

system.runInterval(() => {
  stepCounter += 1;
  // Apply hazard damage/effects every 6 steps (3.0 seconds)
  const applyDamageTick = stepCounter % 6 === 0;
  const timeOfDay = world.getTimeOfDay();

  for (const player of world.getAllPlayers()) {
    if (!player?.isValid) continue;
    const weather = dimensionWeather.get(player.dimension.id) ?? "Clear";
    const snap = stepPlayerTemperature(
      player,
      weather,
      timeOfDay,
      DT_SECONDS,
      applyDamageTick
    );
    latestSnapshots.set(player.id, snap);
    updatePlayerHud(player, snap);
  }
}, STEP_TICKS);
