import { describe, expect, it } from "vitest";

import { BlockId } from "../../src/sim/blocks";
import { craft, type Inventory } from "../../src/sim/crafting";

function expectSuccess(result: ReturnType<typeof craft>): asserts result is Extract<ReturnType<typeof craft>, { ok: true }> {
  expect(result.ok).toBe(true);
}

describe("crafting", () => {
  it("crafts planks from wood", () => {
    const inventory: Inventory = { [BlockId.WOOD]: 2 };
    const result = craft(inventory, "planks");

    expectSuccess(result);
    expect(result.inventory).toEqual({ [BlockId.WOOD]: 1 });
    expect(result.inventory).not.toBe(inventory);
    expect(result.output).toEqual({ item: BlockId.PLANKS, count: 4 });
  });

  it("crafts sticks from planks", () => {
    const inventory: Inventory = { [BlockId.PLANKS]: 3 };
    const result = craft(inventory, "sticks");

    expectSuccess(result);
    expect(result.inventory).toEqual({ [BlockId.PLANKS]: 1 });
    expect(result.inventory).not.toBe(inventory);
    expect(result.output).toEqual({ item: BlockId.STICK, count: 4 });
  });

  it("crafts torches from sticks and coal", () => {
    const inventory: Inventory = { [BlockId.STICK]: 2, [BlockId.COAL]: 1 };
    const result = craft(inventory, "torch");

    expectSuccess(result);
    expect(result.inventory).toEqual({ [BlockId.STICK]: 1 });
    expect(result.inventory).not.toBe(inventory);
    expect(result.output).toEqual({ item: BlockId.TORCH, count: 4 });
  });

  it("crafts torches from sticks and stone", () => {
    const inventory: Inventory = { [BlockId.STICK]: 1, [BlockId.STONE]: 2 };
    const result = craft(inventory, "torch");

    expectSuccess(result);
    expect(result.inventory).toEqual({ [BlockId.STONE]: 1 });
    expect(result.output).toEqual({ item: BlockId.TORCH, count: 4 });
  });

  it.each([
    ["planks", {}],
    ["sticks", { [BlockId.PLANKS]: 1 }],
    ["torch", { [BlockId.STICK]: 1 }]
  ] as const)("fails %s with insufficient inputs without mutating inventory", (recipeId, inventory) => {
    const originalInventory: Inventory = inventory;
    const originalSnapshot = { ...originalInventory };
    const result = craft(originalInventory, recipeId);

    expect(result).toEqual({ ok: false, reason: "insufficient_inputs" });
    expect(originalInventory).toBe(inventory);
    expect(originalInventory).toEqual(originalSnapshot);
  });

  it("fails unknown recipe ids", () => {
    expect(craft({ [BlockId.WOOD]: 1 }, "missing")).toEqual({
      ok: false,
      reason: "unknown_recipe"
    });
  });
});
