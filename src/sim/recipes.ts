import { BlockId } from "./blocks";

export type MvpRecipeName = "planks" | "sticks" | "torch";

export interface MvpRecipeInput {
  readonly item: BlockId;
  readonly count: number;
}

export interface MvpRecipeOutput {
  readonly item: BlockId;
  readonly count: number;
}

export interface MvpRecipe {
  readonly id: MvpRecipeName;
  readonly inputs: ReadonlyArray<MvpRecipeInput>;
  readonly output: MvpRecipeOutput;
}

const PLANKS_RECIPE: MvpRecipe = Object.freeze({
  id: "planks",
  inputs: Object.freeze([Object.freeze({ item: BlockId.WOOD, count: 1 })]),
  output: Object.freeze({ item: BlockId.PLANKS, count: 4 })
});

const STICKS_RECIPE: MvpRecipe = Object.freeze({
  id: "sticks",
  inputs: Object.freeze([Object.freeze({ item: BlockId.PLANKS, count: 2 })]),
  output: Object.freeze({ item: BlockId.STICK, count: 4 })
});

const TORCH_RECIPE: MvpRecipe = Object.freeze({
  id: "torch",
  inputs: Object.freeze([
    Object.freeze({ item: BlockId.STICK, count: 1 }),
    Object.freeze({ item: BlockId.COAL, count: 1 })
  ]),
  output: Object.freeze({ item: BlockId.TORCH, count: 4 })
});

export const MVP_RECIPES: ReadonlyArray<MvpRecipe> = Object.freeze([
  PLANKS_RECIPE,
  STICKS_RECIPE,
  TORCH_RECIPE
]);

export const MVP_RECIPES_BY_NAME: Readonly<Record<MvpRecipeName, MvpRecipe>> = Object.freeze({
  planks: PLANKS_RECIPE,
  sticks: STICKS_RECIPE,
  torch: TORCH_RECIPE
});
