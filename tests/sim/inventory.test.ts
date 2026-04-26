import { describe, expect, it } from "vitest";

import { BlockId } from "../../src/sim/blocks";
import {
  addItem,
  createInventory,
  HOTBAR_SLOT_COUNT,
  MAX_STACK_SIZE,
  moveSlot,
  removeItem,
  selectHotbarSlot,
  type Inventory
} from "../../src/sim/inventory";

function makeInventory(slots: Inventory["slots"], selectedHotbarSlot = 0): Inventory {
  return { slots, selectedHotbarSlot };
}

describe("inventory", () => {
  it("stacks matching items up to max stack size in one slot", () => {
    const inventory = makeInventory([{ id: BlockId.DIRT, count: 10 }, null]);
    const result = addItem(inventory, BlockId.DIRT, MAX_STACK_SIZE - 10);

    expect(result.remainder).toBe(0);
    expect(result.inventory.slots).toEqual([{ id: BlockId.DIRT, count: MAX_STACK_SIZE }, null]);
  });

  it("overflows added items into the next empty slot", () => {
    const inventory = makeInventory([{ id: BlockId.DIRT, count: MAX_STACK_SIZE - 1 }, null]);
    const result = addItem(inventory, BlockId.DIRT, 2);

    expect(result.remainder).toBe(0);
    expect(result.inventory.slots).toEqual([
      { id: BlockId.DIRT, count: MAX_STACK_SIZE },
      { id: BlockId.DIRT, count: 1 }
    ]);
  });

  it("returns a remainder when no slots can fit the added item", () => {
    const inventory = makeInventory([{ id: BlockId.STONE, count: MAX_STACK_SIZE }]);
    const result = addItem(inventory, BlockId.DIRT, 3);

    expect(result.remainder).toBe(3);
    expect(result.inventory.slots).toEqual(inventory.slots);
  });

  it("removes a partial count and leaves the remainder in the slot", () => {
    const inventory = makeInventory([{ id: BlockId.WOOD, count: 10 }]);
    const result = removeItem(inventory, BlockId.WOOD, 4);

    expect(result.removed).toBe(4);
    expect(result.inventory.slots).toEqual([{ id: BlockId.WOOD, count: 6 }]);
  });

  it("fully drains matching slots to empty", () => {
    const inventory = makeInventory([{ id: BlockId.WOOD, count: 3 }]);
    const result = removeItem(inventory, BlockId.WOOD, 10);

    expect(result.removed).toBe(3);
    expect(result.inventory.slots).toEqual([null]);
  });

  it("swaps two different item slots", () => {
    const inventory = makeInventory([
      { id: BlockId.DIRT, count: 2 },
      { id: BlockId.STONE, count: 5 }
    ]);
    const result = moveSlot(inventory, 0, 1);

    expect(result.slots).toEqual([
      { id: BlockId.STONE, count: 5 },
      { id: BlockId.DIRT, count: 2 }
    ]);
  });

  it("merges same-id slots without exceeding max stack size", () => {
    const inventory = makeInventory([
      { id: BlockId.DIRT, count: MAX_STACK_SIZE - 2 },
      { id: BlockId.DIRT, count: 5 }
    ]);
    const result = moveSlot(inventory, 1, 0);

    expect(result.slots).toEqual([
      { id: BlockId.DIRT, count: MAX_STACK_SIZE },
      { id: BlockId.DIRT, count: 3 }
    ]);
  });

  it("selects valid hotbar slots and clamps out-of-bounds selections", () => {
    const inventory = createInventory();

    expect(selectHotbarSlot(inventory, 3).selectedHotbarSlot).toBe(3);
    expect(selectHotbarSlot(inventory, -1).selectedHotbarSlot).toBe(0);
    expect(selectHotbarSlot(inventory, HOTBAR_SLOT_COUNT).selectedHotbarSlot).toBe(HOTBAR_SLOT_COUNT - 1);
  });

  it("does not mutate input inventories or slots", () => {
    const inventory = makeInventory([
      { id: BlockId.DIRT, count: 10 },
      { id: BlockId.DIRT, count: 1 },
      null
    ]);
    const snapshot = {
      selectedHotbarSlot: inventory.selectedHotbarSlot,
      slots: inventory.slots.map((slot) => (slot === null ? null : { id: slot.id, count: slot.count }))
    };

    const results = [
      addItem(inventory, BlockId.DIRT, 2).inventory,
      removeItem(inventory, BlockId.DIRT, 2).inventory,
      moveSlot(inventory, 0, 1),
      selectHotbarSlot(inventory, 2)
    ];

    expect(inventory).toEqual(snapshot);
    for (const result of results) {
      expect(result).not.toBe(inventory);
      expect(result.slots).not.toBe(inventory.slots);
      expect(result.slots[0]).not.toBe(inventory.slots[0]);
    }
  });
});
