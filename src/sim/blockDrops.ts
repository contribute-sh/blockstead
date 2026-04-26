import { BlockId } from "./blocks";
import { ItemId } from "./items";

export type BlockDrop = {
  readonly item: ItemId;
  readonly count: number;
};

const NO_DROPS: ReadonlyArray<BlockDrop> = [];

export const BLOCK_DROPS = {
  [BlockId.AIR]: NO_DROPS,
  [BlockId.GRASS]: NO_DROPS,
  [BlockId.DIRT]: NO_DROPS,
  [BlockId.STONE]: NO_DROPS,
  [BlockId.WOOD]: [{ item: ItemId.WOOD_LOG, count: 1 }],
  [BlockId.PLANKS]: [{ item: ItemId.PLANKS, count: 1 }],
  [BlockId.STICK]: NO_DROPS,
  [BlockId.COAL]: [{ item: ItemId.COAL, count: 1 }],
  [BlockId.TORCH]: [{ item: ItemId.TORCH, count: 1 }]
} as const satisfies Readonly<Record<BlockId, ReadonlyArray<BlockDrop>>>;

export function getBlockDrops(blockId: BlockId): ReadonlyArray<BlockDrop> {
  if (!Object.prototype.hasOwnProperty.call(BLOCK_DROPS, blockId)) {
    throw new Error(`Unknown block id: ${blockId}`);
  }

  return BLOCK_DROPS[blockId];
}
