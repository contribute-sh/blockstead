import { BlockId } from "./blocks";

export type Inventory = Readonly<Record<number, number>>;

export interface RecipeInput {
  readonly item: BlockId;
  readonly count: number;
}

export interface RecipeOutput {
  readonly item: BlockId;
  readonly count: number;
}

export interface Recipe {
  readonly id: string;
  readonly inputs: ReadonlyArray<RecipeInput>;
  readonly output: RecipeOutput;
}

export type CraftResult =
  | {
      readonly ok: true;
      readonly inventory: Inventory;
      readonly output: RecipeOutput;
    }
  | {
      readonly ok: false;
      readonly reason: "unknown_recipe" | "insufficient_inputs";
    };

export const RECIPES = {
  planks: {
    id: "planks",
    inputs: [{ item: BlockId.WOOD, count: 1 }],
    output: { item: BlockId.PLANKS, count: 4 }
  },
  sticks: {
    id: "sticks",
    inputs: [{ item: BlockId.PLANKS, count: 2 }],
    output: { item: BlockId.STICK, count: 4 }
  },
  torch: {
    id: "torch",
    inputs: [
      { item: BlockId.STICK, count: 1 },
      { item: BlockId.COAL, count: 1 }
    ],
    output: { item: BlockId.TORCH, count: 4 }
  }
} as const satisfies Readonly<Record<string, Recipe>>;

const RECIPE_ALTERNATIVES = {
  torch: [
    RECIPES.torch,
    {
      id: "torch_stone",
      inputs: [
        { item: BlockId.STICK, count: 1 },
        { item: BlockId.STONE, count: 1 }
      ],
      output: { item: BlockId.TORCH, count: 4 }
    }
  ]
} as const satisfies Readonly<Record<string, ReadonlyArray<Recipe>>>;

function hasOwn<T extends object>(object: T, key: PropertyKey): key is keyof T {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function inventoryCount(inventory: Inventory, item: BlockId): number {
  return inventory[item] ?? 0;
}

function hasInputs(inventory: Inventory, inputs: ReadonlyArray<RecipeInput>): boolean {
  return inputs.every((input) => inventoryCount(inventory, input.item) >= input.count);
}

function applyRecipe(inventory: Inventory, recipe: Recipe): Inventory {
  const nextInventory: Record<number, number> = { ...inventory };

  for (const input of recipe.inputs) {
    const remaining = inventoryCount(nextInventory, input.item) - input.count;

    if (remaining > 0) {
      nextInventory[input.item] = remaining;
    } else {
      delete nextInventory[input.item];
    }
  }

  return nextInventory;
}

export function craft(inventory: Inventory, recipeId: string): CraftResult {
  if (!hasOwn(RECIPES, recipeId)) {
    return { ok: false, reason: "unknown_recipe" };
  }

  const recipe = RECIPES[recipeId];
  const alternatives = hasOwn(RECIPE_ALTERNATIVES, recipeId)
    ? RECIPE_ALTERNATIVES[recipeId]
    : [recipe];
  const matchingRecipe = alternatives.find((alternative) => hasInputs(inventory, alternative.inputs));

  if (matchingRecipe === undefined) {
    return { ok: false, reason: "insufficient_inputs" };
  }

  return {
    ok: true,
    inventory: applyRecipe(inventory, matchingRecipe),
    output: matchingRecipe.output
  };
}
