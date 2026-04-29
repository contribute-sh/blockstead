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
  const rows = new Map<CraftingRecipeId, HTMLElement>();
  let totals: ReadonlyMap<BlockId, number> = new Map<BlockId, number>();

  element.dataset.testid = "crafting-panel";

  function createRecipeRow(recipeId: CraftingRecipeId): HTMLElement {
    const row = document.createElement("div");

    row.addEventListener("click", () => {
      for (const listener of listeners) {
        listener(recipeId);
      }
    });

    updateRecipeRow(row, recipeId);

    return row;
  }

  function updateRecipeRow(row: HTMLElement, recipeId: CraftingRecipeId): void {
    const recipe = RECIPES[recipeId];

    row.dataset.recipeId = recipeId;
    row.dataset.testid = `craft-recipe-${recipeId}`;
    row.dataset.craftable = String(hasInputs(totals, recipe.inputs));
    row.dataset.requiredInputs = serializeRequiredInputs(recipe.inputs);
    row.textContent = recipe.id;
  }

  function render(): void {
    for (const recipeId of RECIPE_IDS) {
      let row = rows.get(recipeId);

      if (row === undefined) {
        row = createRecipeRow(recipeId);
        rows.set(recipeId, row);
        element.append(row);
      } else {
        updateRecipeRow(row, recipeId);
      }
    }
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
