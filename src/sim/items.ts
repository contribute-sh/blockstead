import { BLOCK_REGISTRY, BlockId, getBlockDefinition } from "./blocks";

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

function hasOwn<T extends object>(object: T, key: PropertyKey): key is keyof T {
  return Object.prototype.hasOwnProperty.call(object, key);
}

export function getItemDefinition(id: ItemId): ItemDef {
  const definition = ITEM_REGISTRY[id];

  if (definition === undefined) {
    throw new Error(`Unknown item id: ${id}`);
  }

  return definition;
}

export function getItemOrBlockName(id: number): string {
  if (hasOwn(ITEM_REGISTRY, id)) {
    return ITEM_REGISTRY[id].name;
  }

  if (hasOwn(BLOCK_REGISTRY, id)) {
    return getBlockDefinition(id).name;
  }

  throw new Error(`Unknown item or block id: ${id}`);
}
