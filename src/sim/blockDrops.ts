import { BlockId } from "./blocks";

export interface BlockDrop {
  readonly item: BlockId;
  readonly count: number;
}

export const BLOCK_DROPS = {
  [BlockId.AIR]: [],
  [BlockId.GRASS]: [{ item: BlockId.DIRT, count: 1 }],
  [BlockId.DIRT]: [{ item: BlockId.DIRT, count: 1 }],
  [BlockId.STONE]: [{ item: BlockId.STONE, count: 1 }],
  [BlockId.WOOD]: [{ item: BlockId.WOOD, count: 1 }],
  [BlockId.PLANKS]: [{ item: BlockId.PLANKS, count: 1 }],
  [BlockId.STICK]: [],
  [BlockId.COAL]: [{ item: BlockId.COAL, count: 1 }],
  [BlockId.TORCH]: [{ item: BlockId.TORCH, count: 1 }]
} as const satisfies Readonly<Record<BlockId, ReadonlyArray<BlockDrop>>>;

export function getBlockDrops(blockId: BlockId): ReadonlyArray<BlockDrop> {
  const drops = BLOCK_DROPS[blockId];

  if (drops === undefined) {
    throw new Error(`Unknown block id: ${blockId}`);
  }

  return drops;
}
