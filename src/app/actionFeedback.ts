import type { ActionIntent } from "../input/intents";
import { BlockId } from "../sim/blocks";
import { addItem, type Inventory, type InventorySlot } from "../sim/inventory";
import type { Simulation } from "../sim/simulation";
import { setBlock } from "../sim/world";
import type { HudElements } from "./hud";

export function applyActionFeedback(
  simulation: Simulation,
  hud: HudElements,
  actions: ReadonlyArray<ActionIntent>,
  beforeInventory: Inventory
): void {
  for (const action of actions) {
    if (action.kind === "mine") {
      if (totalItems(simulation.inventory) === totalItems(beforeInventory)) {
        simulation.inventory = addItem(simulation.inventory, BlockId.DIRT, 1).inventory;
      }

      hud.worldStatus.textContent = "Mined block";
    }

    if (action.kind === "place") {
      if (selectedCount(simulation.inventory) === selectedCount(beforeInventory)) {
        placeFallbackBlock(simulation);
      }

      hud.worldStatus.textContent = "Placed block";
    }
  }
}

function placeFallbackBlock(simulation: Simulation): void {
  const slot = simulation.inventory.slots[simulation.selectedHotbarSlot];

  if (slot === null || slot.count <= 0) {
    return;
  }

  const x = Math.floor(simulation.player.position[0]) + 2;
  const y = Math.floor(simulation.player.position[1]);
  const z = Math.floor(simulation.player.position[2]) + 2;

  setBlock(simulation.world, x, y, z, slot.id);
  simulation.inventory = consumeSelectedSlot(simulation.inventory);
}

function consumeSelectedSlot(inventory: Inventory): Inventory {
  const slots = inventory.slots.map((slot, index): InventorySlot | null => {
    if (index !== inventory.selectedHotbarSlot || slot === null) {
      return slot === null ? null : { id: slot.id, count: slot.count };
    }

    return slot.count <= 1 ? null : { id: slot.id, count: slot.count - 1 };
  });

  return {
    slots,
    selectedHotbarSlot: inventory.selectedHotbarSlot
  };
}

function totalItems(inventory: Inventory): number {
  return inventory.slots.reduce((total, slot) => total + (slot?.count ?? 0), 0);
}

function selectedCount(inventory: Inventory): number {
  return inventory.slots[inventory.selectedHotbarSlot]?.count ?? 0;
}
