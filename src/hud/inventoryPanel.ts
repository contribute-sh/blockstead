import { getBlockDefinition } from "../sim/blocks";
import type { Inventory, InventorySlot } from "../sim/inventory";

export interface InventoryPanel {
  readonly element: HTMLElement;
  update(snapshot: Inventory): void;
}

function createItemRow(slot: InventorySlot): HTMLElement {
  const row = document.createElement("div");
  const definition = getBlockDefinition(slot.id);

  row.dataset.itemId = String(slot.id);
  row.dataset.itemCount = String(slot.count);
  row.textContent = `${definition.name}: ${slot.count}`;

  return row;
}

export function createInventoryPanel(): InventoryPanel {
  const element = document.createElement("div");
  element.dataset.testid = "inventory-panel";

  return {
    element,
    update(snapshot) {
      // Empty slots are omitted so only real inventory items carry item data attributes.
      const rows = snapshot.slots.flatMap((slot) => (slot === null ? [] : [createItemRow(slot)]));

      element.replaceChildren(...rows);
    }
  };
}
