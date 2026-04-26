import { BlockId } from "./blocks";

export const ItemId = {
  WOOD_LOG: 100,
  PLANKS: 101,
  STICK: 102,
  COAL: 103,
  TORCH: 104
} as const;

export type ItemId = (typeof ItemId)[keyof typeof ItemId];

export interface ItemDef {
  readonly id: ItemId;
  readonly name: string;
  readonly stackSize: number;
  readonly placesBlockId?: BlockId;
}

export const ITEM_REGISTRY = {
  [ItemId.WOOD_LOG]: {
    id: ItemId.WOOD_LOG,
    name: "Wood Log",
    stackSize: 64,
    placesBlockId: BlockId.WOOD
  },
  [ItemId.PLANKS]: {
    id: ItemId.PLANKS,
    name: "Planks",
    stackSize: 64,
    placesBlockId: BlockId.PLANKS
  },
  [ItemId.STICK]: {
    id: ItemId.STICK,
    name: "Stick",
    stackSize: 64
  },
  [ItemId.COAL]: {
    id: ItemId.COAL,
    name: "Coal",
    stackSize: 64
  },
  [ItemId.TORCH]: {
    id: ItemId.TORCH,
    name: "Torch",
    stackSize: 64,
    placesBlockId: BlockId.TORCH
  }
} as const satisfies Readonly<Record<ItemId, ItemDef>>;

export function getItemDefinition(id: ItemId): ItemDef {
  const definition = ITEM_REGISTRY[id];

  if (definition === undefined) {
    throw new Error(`Unknown item id: ${id}`);
  }

  return definition;
}
