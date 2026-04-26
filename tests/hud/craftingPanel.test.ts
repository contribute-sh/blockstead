import { beforeEach, describe, expect, it } from "vitest";

import { createCraftingPanel } from "../../src/hud/craftingPanel";
import { BlockId } from "../../src/sim/blocks";
import type { Inventory } from "../../src/sim/inventory";

function makeInventory(slots: Inventory["slots"]): Inventory {
  return {
    slots,
    selectedHotbarSlot: 0
  };
}

function getCraftingRoot(): HTMLElement {
  const root = document.querySelector<HTMLElement>('[data-testid="crafting-panel"]');

  if (root === null) {
    throw new Error("Crafting panel was not rendered");
  }

  return root;
}

function getRecipeRows(): HTMLElement[] {
  return Array.from(getCraftingRoot().querySelectorAll<HTMLElement>("[data-recipe-id]"));
}

function readRenderedRecipes(): Array<{ id: string; requiredInputs: string; craftable: string }> {
  return getRecipeRows().map((row) => ({
    id: row.dataset.recipeId ?? "",
    requiredInputs: row.dataset.requiredInputs ?? "",
    craftable: row.dataset.craftable ?? ""
  }));
}

describe("crafting panel", () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it("renders all recipe rows in source order with deterministic input data", () => {
    const panel = createCraftingPanel();
    document.body.append(panel.element);

    expect(readRenderedRecipes()).toEqual([
      { id: "planks", requiredInputs: `${BlockId.WOOD}:1`, craftable: "false" },
      { id: "sticks", requiredInputs: `${BlockId.PLANKS}:2`, craftable: "false" },
      { id: "torch", requiredInputs: `${BlockId.STICK}:1,${BlockId.COAL}:1`, craftable: "false" }
    ]);
  });

  it("flips craftable data when inventory satisfies recipe inputs across slots", () => {
    const panel = createCraftingPanel();
    document.body.append(panel.element);

    panel.update(makeInventory([null, { id: BlockId.PLANKS, count: 1 }]));
    expect(readRenderedRecipes().find((recipe) => recipe.id === "sticks")?.craftable).toBe("false");

    panel.update(makeInventory([{ id: BlockId.PLANKS, count: 1 }, null, { id: BlockId.PLANKS, count: 1 }]));
    expect(readRenderedRecipes().find((recipe) => recipe.id === "sticks")?.craftable).toBe("true");
  });

  it("updates craftable data deterministically for different inventories", () => {
    const panel = createCraftingPanel();
    document.body.append(panel.element);

    panel.update(makeInventory([{ id: BlockId.STICK, count: 1 }, { id: BlockId.COAL, count: 1 }]));
    const withTorchInputs = readRenderedRecipes();

    panel.update(makeInventory([{ id: BlockId.WOOD, count: 1 }]));
    const withWood = readRenderedRecipes();

    panel.update(makeInventory([{ id: BlockId.WOOD, count: 1 }]));
    const withWoodAgain = readRenderedRecipes();

    expect(withTorchInputs).toEqual([
      { id: "planks", requiredInputs: `${BlockId.WOOD}:1`, craftable: "false" },
      { id: "sticks", requiredInputs: `${BlockId.PLANKS}:2`, craftable: "false" },
      { id: "torch", requiredInputs: `${BlockId.STICK}:1,${BlockId.COAL}:1`, craftable: "true" }
    ]);
    expect(withWood).toEqual([
      { id: "planks", requiredInputs: `${BlockId.WOOD}:1`, craftable: "true" },
      { id: "sticks", requiredInputs: `${BlockId.PLANKS}:2`, craftable: "false" },
      { id: "torch", requiredInputs: `${BlockId.STICK}:1,${BlockId.COAL}:1`, craftable: "false" }
    ]);
    expect(withWoodAgain).toEqual(withWood);
  });

  it("emits craft intents to every listener when a recipe row is clicked", () => {
    const panel = createCraftingPanel();
    const firstListenerCalls: string[] = [];
    const secondListenerCalls: string[] = [];

    document.body.append(panel.element);
    panel.onCraft((recipeId) => firstListenerCalls.push(recipeId));
    panel.onCraft((recipeId) => secondListenerCalls.push(recipeId));

    getRecipeRows()[0]?.click();

    expect(firstListenerCalls).toEqual(["planks"]);
    expect(secondListenerCalls).toEqual(["planks"]);
  });

  it("renders all rows as non-craftable before update is called", () => {
    const panel = createCraftingPanel();
    document.body.append(panel.element);

    expect(readRenderedRecipes()).toEqual([
      { id: "planks", requiredInputs: `${BlockId.WOOD}:1`, craftable: "false" },
      { id: "sticks", requiredInputs: `${BlockId.PLANKS}:2`, craftable: "false" },
      { id: "torch", requiredInputs: `${BlockId.STICK}:1,${BlockId.COAL}:1`, craftable: "false" }
    ]);
  });
});
