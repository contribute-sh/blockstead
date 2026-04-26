import { RECIPES } from "../sim/crafting";
import type { RecipeInput } from "../sim/crafting";
import type { BlockId } from "../sim/blocks";
import type { Inventory } from "../sim/inventory";

const RECIPE_IDS = ["planks", "sticks", "torch"] as const satisfies ReadonlyArray<keyof typeof RECIPES>;

export type CraftingRecipeId = (typeof RECIPE_IDS)[number];
export type CraftIntentListener = (recipeId: CraftingRecipeId) => void;

export interface CraftingPanel {
  readonly element: HTMLElement;
  update(snapshot: Inventory): void;
  onCraft(listener: CraftIntentListener): void;
}

function serializeRequiredInputs(inputs: ReadonlyArray<RecipeInput>): string {
  return inputs.map((input) => `${input.item}:${input.count}`).join(",");
}

function getInventoryTotals(snapshot: Inventory): ReadonlyMap<BlockId, number> {
  const totals = new Map<BlockId, number>();

  for (const slot of snapshot.slots) {
    if (slot === null) {
      continue;
    }

    totals.set(slot.id, (totals.get(slot.id) ?? 0) + slot.count);
  }

  return totals;
}

function hasInputs(totals: ReadonlyMap<BlockId, number>, inputs: ReadonlyArray<RecipeInput>): boolean {
  return inputs.every((input) => (totals.get(input.item) ?? 0) >= input.count);
}

export function createCraftingPanel(): CraftingPanel {
  const element = document.createElement("div");
  const listeners = new Set<CraftIntentListener>();
  let totals: ReadonlyMap<BlockId, number> = new Map<BlockId, number>();

  element.dataset.testid = "crafting-panel";

  function createRecipeRow(recipeId: CraftingRecipeId): HTMLElement {
    const recipe = RECIPES[recipeId];
    const row = document.createElement("div");

    row.dataset.recipeId = recipeId;
    row.dataset.craftable = String(hasInputs(totals, recipe.inputs));
    row.dataset.requiredInputs = serializeRequiredInputs(recipe.inputs);
    row.textContent = recipe.id;
    row.addEventListener("click", () => {
      for (const listener of listeners) {
        listener(recipeId);
      }
    });

    return row;
  }

  function render(): void {
    element.replaceChildren(...RECIPE_IDS.map((recipeId) => createRecipeRow(recipeId)));
  }

  render();

  return {
    element,
    update(snapshot) {
      totals = getInventoryTotals(snapshot);
      render();
    },
    onCraft(listener) {
      listeners.add(listener);
    }
  };
}
