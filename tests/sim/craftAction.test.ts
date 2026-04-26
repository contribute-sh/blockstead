import { describe, expect, it } from "vitest";

import { BlockId } from "../../src/sim/blocks";
import { resolveCraft, type CraftActionResult } from "../../src/sim/craftAction";
import { type Inventory } from "../../src/sim/inventory";

function expectSuccess(result: CraftActionResult): asserts result is Extract<CraftActionResult, { ok: true }> {
  expect(result.ok).toBe(true);
}

function makeInventory(slots: Inventory["slots"], selectedHotbarSlot = 0): Inventory {
  return { slots, selectedHotbarSlot };
}

function cloneInventory(inventory: Inventory): Inventory {
  return {
    selectedHotbarSlot: inventory.selectedHotbarSlot,
    slots: inventory.slots.map((slot) => (slot === null ? null : { id: slot.id, count: slot.count }))
  };
}

describe("craft action resolver", () => {
  it.each([
    {
      recipeId: "planks",
      inventory: makeInventory([{ id: BlockId.WOOD, count: 1 }, null]),
      expectedSlots: [{ id: BlockId.PLANKS, count: 4 }, null],
      output: { item: BlockId.PLANKS, count: 4 }
    },
    {
      recipeId: "sticks",
      inventory: makeInventory([{ id: BlockId.PLANKS, count: 2 }, null]),
      expectedSlots: [{ id: BlockId.STICK, count: 4 }, null],
      output: { item: BlockId.STICK, count: 4 }
    },
    {
      recipeId: "torch",
      inventory: makeInventory([{ id: BlockId.STICK, count: 1 }, { id: BlockId.COAL, count: 1 }, null]),
      expectedSlots: [{ id: BlockId.TORCH, count: 4 }, null, null],
      output: { item: BlockId.TORCH, count: 4 }
    }
  ])("crafts $recipeId using the MVP recipe registry", ({ recipeId, inventory, expectedSlots, output }) => {
    const result = resolveCraft(inventory, recipeId);

    expectSuccess(result);
    expect(result.inventory).not.toBe(inventory);
    expect(result.inventory.slots).toEqual(expectedSlots);
    expect(result.output).toEqual(output);
  });

  it("reports missing inputs with the original inventory reference untouched", () => {
    const inventory = makeInventory([{ id: BlockId.STICK, count: 1 }, null]);
    const snapshot = cloneInventory(inventory);
    const result = resolveCraft(inventory, "torch");

    expect(result).toEqual({
      ok: false,
      reason: "insufficient_inputs",
      inventory,
      missing: { [BlockId.COAL]: 1 }
    });
    expect(result.inventory).toBe(inventory);
    expect(inventory).toEqual(snapshot);
  });

  it("reports unknown recipes with the original inventory reference untouched", () => {
    const inventory = makeInventory([{ id: BlockId.WOOD, count: 1 }]);
    const snapshot = cloneInventory(inventory);
    const result = resolveCraft(inventory, "missing");

    expect(result).toEqual({ ok: false, reason: "unknown_recipe", inventory });
    expect(result.inventory).toBe(inventory);
    expect(inventory).toEqual(snapshot);
  });

  it("does not mutate the input inventory on a successful craft", () => {
    const inventory = makeInventory([{ id: BlockId.WOOD, count: 2 }, null]);
    const snapshot = cloneInventory(inventory);
    const result = resolveCraft(inventory, "planks");

    expectSuccess(result);
    expect(inventory).toEqual(snapshot);
    expect(result.inventory).not.toBe(inventory);
  });
});
