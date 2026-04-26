import { RECIPES, type Recipe, type RecipeOutput } from "./crafting";
import { addItem, removeItem, type Inventory } from "./inventory";
import type { BlockId } from "./blocks";
import type { ItemId } from "./items";

export type RecipeId = string;
export type CraftFailureReason = "unknown_recipe" | "insufficient_inputs";
export type MissingCraftInputs = Partial<Record<BlockId | ItemId, number>>;

export type CraftActionResult =
  | {
      readonly ok: true;
      readonly inventory: Inventory;
      readonly output: RecipeOutput;
    }
  | {
      readonly ok: false;
      readonly reason: "unknown_recipe";
      readonly inventory: Inventory;
    }
  | {
      readonly ok: false;
      readonly reason: "insufficient_inputs";
      readonly inventory: Inventory;
      readonly missing: MissingCraftInputs;
    };

function hasOwn<T extends object>(object: T, key: PropertyKey): key is keyof T {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function findRecipe(recipeId: RecipeId): Recipe | undefined {
  return hasOwn(RECIPES, recipeId) ? RECIPES[recipeId] : undefined;
}

function countItem(inventory: Inventory, item: BlockId): number {
  return inventory.slots.reduce((total, slot) => total + (slot?.id === item ? slot.count : 0), 0);
}

function missingInputs(inventory: Inventory, recipe: Recipe): MissingCraftInputs {
  const missing: MissingCraftInputs = {};

  for (const input of recipe.inputs) {
    const shortfall = input.count - countItem(inventory, input.item);

    if (shortfall > 0) {
      missing[input.item] = shortfall;
    }
  }

  return missing;
}

function hasMissingInputs(missing: MissingCraftInputs): boolean {
  return Object.keys(missing).length > 0;
}

export function resolveCraft(inventory: Inventory, recipeId: RecipeId): CraftActionResult {
  const recipe = findRecipe(recipeId);

  if (recipe === undefined) {
    return { ok: false, reason: "unknown_recipe", inventory };
  }

  const missing = missingInputs(inventory, recipe);

  if (hasMissingInputs(missing)) {
    return { ok: false, reason: "insufficient_inputs", inventory, missing };
  }

  let nextInventory = inventory;

  for (const input of recipe.inputs) {
    nextInventory = removeItem(nextInventory, input.item, input.count).inventory;
  }

  return {
    ok: true,
    inventory: addItem(nextInventory, recipe.output.item, recipe.output.count).inventory,
    output: { item: recipe.output.item, count: recipe.output.count }
  };
}
