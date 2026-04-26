import { describe, expect, it } from "vitest";

import { BlockId } from "../../src/sim/blocks";
import { craft, type Inventory } from "../../src/sim/crafting";
import {
  MVP_RECIPES,
  MVP_RECIPES_BY_NAME,
  type MvpRecipeInput
} from "../../src/sim/recipes";

function expectSuccess(result: ReturnType<typeof craft>): asserts result is Extract<ReturnType<typeof craft>, { ok: true }> {
  expect(result.ok).toBe(true);
}

function inventoryFromInputs(inputs: ReadonlyArray<MvpRecipeInput>): Inventory {
  const inventory: Record<number, number> = {};

  for (const input of inputs) {
    inventory[input.item] = input.count;
  }

  return inventory;
}

describe("MVP recipe registry", () => {
  it("defines the MVP recipe ids, inputs, and outputs", () => {
    expect(MVP_RECIPES).toEqual([
      {
        id: "planks",
        inputs: [{ item: BlockId.WOOD, count: 1 }],
        output: { item: BlockId.PLANKS, count: 4 }
      },
      {
        id: "sticks",
        inputs: [{ item: BlockId.PLANKS, count: 2 }],
        output: { item: BlockId.STICK, count: 4 }
      },
      {
        id: "torch",
        inputs: [
          { item: BlockId.STICK, count: 1 },
          { item: BlockId.COAL, count: 1 }
        ],
        output: { item: BlockId.TORCH, count: 4 }
      }
    ]);

    for (const recipe of MVP_RECIPES) {
      expect(MVP_RECIPES_BY_NAME[recipe.id]).toBe(recipe);
    }
  });

  it("round-trips every registry recipe through craft", () => {
    for (const recipe of MVP_RECIPES) {
      const result = craft(inventoryFromInputs(recipe.inputs), recipe.id);

      expectSuccess(result);
      expect(result.inventory).toEqual({});
      expect(result.output).toEqual(recipe.output);
    }
  });

  it("keeps the torch stone fallback compatible with the registry output", () => {
    const result = craft({ [BlockId.STICK]: 1, [BlockId.STONE]: 1 }, "torch");

    expectSuccess(result);
    expect(result.inventory).toEqual({});
    expect(result.output).toEqual(MVP_RECIPES_BY_NAME.torch.output);
  });

  it("freezes the registry, lookup, and nested recipe records", () => {
    expect(Object.isFrozen(MVP_RECIPES)).toBe(true);
    expect(Object.isFrozen(MVP_RECIPES_BY_NAME)).toBe(true);

    for (const recipe of MVP_RECIPES) {
      expect(Object.isFrozen(recipe)).toBe(true);
      expect(Object.isFrozen(recipe.inputs)).toBe(true);
      expect(Object.isFrozen(recipe.output)).toBe(true);

      for (const input of recipe.inputs) {
        expect(Object.isFrozen(input)).toBe(true);
      }
    }
  });

  it("iterates recipes in deterministic order", () => {
    const firstPass = Array.from(MVP_RECIPES, (recipe) => recipe.id);
    const secondPass = Array.from(MVP_RECIPES, (recipe) => recipe.id);

    expect(firstPass).toEqual(["planks", "sticks", "torch"]);
    expect(secondPass).toEqual(firstPass);
  });
});
