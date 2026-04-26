import { describe, expect, it } from "vitest";

import { BlockId } from "../../src/sim/blocks";
import {
  createHotbar,
  getSelectedItem,
  nextSlot,
  prevSlot,
  selectSlot,
  type Hotbar
} from "../../src/sim/hotbar";
import type { Inventory } from "../../src/sim/inventory";

function makeInventory(slots: Inventory["slots"]): Inventory {
  return { slots, selectedHotbarSlot: 0 };
}

describe("hotbar", () => {
  it("creates an initial hotbar state", () => {
    expect(createHotbar(9)).toEqual({ size: 9, selected: 0 });
    expect(() => createHotbar(0)).toThrow("Hotbar size must be a positive integer.");
    expect(() => createHotbar(-1)).toThrow("Hotbar size must be a positive integer.");
    expect(() => createHotbar(1.5)).toThrow("Hotbar size must be a positive integer.");
  });

  it("selects an in-range slot without mutating the input state", () => {
    const hotbar = createHotbar(9);
    const result = selectSlot(hotbar, 3);

    expect(result).toEqual({ size: 9, selected: 3 });
    expect(result).not.toBe(hotbar);
    expect(hotbar).toEqual({ size: 9, selected: 0 });
  });

  it("returns the input state for out-of-range selections", () => {
    const hotbar: Hotbar = { size: 9, selected: 2 };

    for (const index of [-1, 9, Number.NaN, 2.5]) {
      expect(selectSlot(hotbar, index)).toBe(hotbar);
    }
  });

  it("wraps nextSlot from the last slot to the first", () => {
    const hotbar: Hotbar = { size: 4, selected: 3 };
    const result = nextSlot(hotbar);

    expect(result).toEqual({ size: 4, selected: 0 });
    expect(result).not.toBe(hotbar);
  });

  it("wraps prevSlot from the first slot to the last", () => {
    const hotbar: Hotbar = { size: 4, selected: 0 };
    const result = prevSlot(hotbar);

    expect(result).toEqual({ size: 4, selected: 3 });
    expect(result).not.toBe(hotbar);
  });

  it("advances deterministically after number-key selection intents", () => {
    let hotbar = selectSlot(createHotbar(9), 2);
    const selectedIndices: Array<number> = [];

    for (let step = 0; step < 4; step += 1) {
      hotbar = nextSlot(hotbar);
      selectedIndices.push(hotbar.selected);
    }

    expect(selectedIndices).toEqual([3, 4, 5, 6]);
  });

  it("returns the inventory slot at the selected hotbar index", () => {
    const slot = { id: BlockId.STONE, count: 6 };
    const inventory = makeInventory([null, slot]);

    expect(getSelectedItem({ size: 9, selected: 1 }, inventory)).toBe(slot);
  });

  it("returns null when the selected inventory slot is empty", () => {
    const inventory = makeInventory([null]);

    expect(getSelectedItem({ size: 9, selected: 0 }, inventory)).toBeNull();
  });

  it("returns null when the selected hotbar index is past inventory slots", () => {
    const inventory = makeInventory([{ id: BlockId.DIRT, count: 1 }]);

    expect(getSelectedItem({ size: 9, selected: 3 }, inventory)).toBeNull();
  });
});
