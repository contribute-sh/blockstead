import type { Inventory, InventorySlot } from "./inventory";

export interface Hotbar {
  readonly size: number;
  readonly selected: number;
}

export function createHotbar(size: number): Hotbar {
  if (!Number.isInteger(size) || size <= 0) {
    throw new Error("Hotbar size must be a positive integer.");
  }

  return {
    size,
    selected: 0
  };
}

export function selectSlot(state: Hotbar, index: number): Hotbar {
  if (!Number.isInteger(index) || index < 0 || index >= state.size) {
    return state;
  }

  return {
    size: state.size,
    selected: index
  };
}

export function nextSlot(state: Hotbar): Hotbar {
  return {
    size: state.size,
    selected: (state.selected + 1) % state.size
  };
}

export function prevSlot(state: Hotbar): Hotbar {
  return {
    size: state.size,
    selected: (state.selected - 1 + state.size) % state.size
  };
}

export function getSelectedItem(hotbar: Hotbar, inventory: Inventory): InventorySlot | null {
  return inventory.slots[hotbar.selected] ?? null;
}
