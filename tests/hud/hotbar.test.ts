import { beforeEach, describe, expect, it } from "vitest";

import { createHotbarElement, updateHotbarElement, type HotbarRenderState } from "../../src/hud/hotbar";
import { BlockId } from "../../src/sim/blocks";
import type { Hotbar } from "../../src/sim/hotbar";
import type { Inventory } from "../../src/sim/inventory";

function makeState(hotbar: Hotbar, slots: Inventory["slots"]): HotbarRenderState {
  return {
    hotbar,
    inventory: {
      slots,
      selectedHotbarSlot: hotbar.selected
    }
  };
}

function getSlot(root: HTMLElement, index: number): HTMLElement {
  const slot = root.querySelector<HTMLElement>(`[data-testid="hud-hotbar-slot-${index}"]`);

  if (slot === null) {
    throw new Error(`Missing hotbar slot ${index}.`);
  }

  return slot;
}

describe("hud hotbar", () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it("renders one child per slot with stable selectors and item ids", () => {
    const root = createHotbarElement(
      makeState({ size: 3, selected: 1 }, [
        { id: BlockId.DIRT, count: 8 },
        null,
        { id: BlockId.STONE, count: 2 }
      ])
    );

    expect(root.dataset.testid).toBe("hud-hotbar");
    expect(root.children).toHaveLength(3);
    expect(getSlot(root, 0).dataset.itemId).toBe(String(BlockId.DIRT));
    expect(getSlot(root, 1).dataset.itemId).toBeUndefined();
    expect(getSlot(root, 2).dataset.itemId).toBe(String(BlockId.STONE));
  });

  it("marks only the selected slot with data-selected", () => {
    const root = createHotbarElement(
      makeState({ size: 4, selected: 2 }, [
        { id: BlockId.DIRT, count: 1 },
        { id: BlockId.GRASS, count: 1 },
        { id: BlockId.WOOD, count: 1 },
        null
      ])
    );

    expect(getSlot(root, 0).dataset.selected).toBeUndefined();
    expect(getSlot(root, 1).dataset.selected).toBeUndefined();
    expect(getSlot(root, 2).dataset.selected).toBe("true");
    expect(getSlot(root, 3).dataset.selected).toBeUndefined();
  });

  it("updates the same root when selection and item ids change", () => {
    const root = createHotbarElement(
      makeState({ size: 3, selected: 0 }, [
        { id: BlockId.DIRT, count: 8 },
        null,
        { id: BlockId.STONE, count: 2 }
      ])
    );

    const updatedRoot = updateHotbarElement(
      root,
      makeState({ size: 3, selected: 2 }, [
        null,
        { id: BlockId.WOOD, count: 1 },
        { id: BlockId.GRASS, count: 5 }
      ])
    );

    expect(updatedRoot).toBe(root);
    expect(getSlot(root, 0).dataset.itemId).toBeUndefined();
    expect(getSlot(root, 0).dataset.selected).toBeUndefined();
    expect(getSlot(root, 1).dataset.itemId).toBe(String(BlockId.WOOD));
    expect(getSlot(root, 1).dataset.selected).toBeUndefined();
    expect(getSlot(root, 2).dataset.itemId).toBe(String(BlockId.GRASS));
    expect(getSlot(root, 2).dataset.selected).toBe("true");
  });

  it("exposes documented selectors through document and element queries", () => {
    const root = createHotbarElement(
      makeState({ size: 2, selected: 1 }, [
        { id: BlockId.TORCH, count: 3 },
        { id: BlockId.COAL, count: 4 }
      ])
    );

    document.body.append(root);

    expect(document.querySelector('[data-testid="hud-hotbar"]')).toBe(root);
    expect(root.querySelector('[data-testid="hud-hotbar-slot-0"]')).toBe(getSlot(root, 0));
    expect(root.querySelector('[data-testid="hud-hotbar-slot-1"]')).toBe(getSlot(root, 1));
    expect(getSlot(root, 1).dataset.itemId).toBe(String(BlockId.COAL));
  });
});
