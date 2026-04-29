import type { ActionIntent } from "../input/intents";
import type { Inventory } from "../sim/inventory";
import type { Simulation } from "../sim/simulation";
import type { HudElements } from "./hud";

export function applyActionFeedback(
  simulation: Simulation,
  hud: HudElements,
  actions: ReadonlyArray<ActionIntent>,
  beforeInventory: Inventory
): void {
  for (const action of actions) {
    if (action.kind === "mine") {
      hud.worldStatus.textContent =
        totalItems(simulation.inventory) > totalItems(beforeInventory)
          ? "Mined block"
          : "No mineable block in reach";
    }

    if (action.kind === "place") {
      hud.worldStatus.textContent =
        selectedCount(simulation.inventory) < selectedCount(beforeInventory)
          ? "Placed block"
          : "Cannot place block";
    }
  }
}

function totalItems(inventory: Inventory): number {
  return inventory.slots.reduce((total, slot) => total + (slot?.count ?? 0), 0);
}

function selectedCount(inventory: Inventory): number {
  return inventory.slots[inventory.selectedHotbarSlot]?.count ?? 0;
}
