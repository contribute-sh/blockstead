import type { Hotbar } from "../sim/hotbar";
import type { Inventory } from "../sim/inventory";

export interface HotbarRenderState {
  readonly hotbar: Hotbar;
  readonly inventory: Inventory;
}

export function createHotbarElement(state: HotbarRenderState): HTMLElement {
  const root = document.createElement("div");

  root.dataset.testid = "hud-hotbar";

  return updateHotbarElement(root, state);
}

export function updateHotbarElement(root: HTMLElement, state: HotbarRenderState): HTMLElement {
  root.dataset.testid = "hud-hotbar";

  const slots = Array.from({ length: state.hotbar.size }, (_, index) => {
    const slotElement = document.createElement("div");
    const slot = state.inventory.slots[index] ?? null;

    slotElement.dataset.testid = `hud-hotbar-slot-${index}`;

    if (slot !== null) {
      slotElement.dataset.itemId = String(slot.id);
    }

    if (index === state.hotbar.selected) {
      slotElement.dataset.selected = "true";
    }

    return slotElement;
  });

  root.replaceChildren(...slots);

  return root;
}
