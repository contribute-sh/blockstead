import { describe, expect, it } from "vitest";

import { BLOCK_DROPS, getBlockDrops, type BlockDrop } from "../../src/sim/blockDrops";
import { BLOCK_REGISTRY, BlockId } from "../../src/sim/blocks";

describe("block drop registry", () => {
  it("has a registry entry for every block id", () => {
    const blockIds = Object.values(BlockId);

    expect(Object.keys(BLOCK_DROPS)).toHaveLength(blockIds.length);

    for (const id of blockIds) {
      expect(BLOCK_DROPS[id]).toBeDefined();
    }
  });

  it("returns empty drops for air and non-mineable blocks", () => {
    const nonMineableBlockIds = Object.values(BlockId).filter((id) => !BLOCK_REGISTRY[id].mineable);

    expect(nonMineableBlockIds).toContain(BlockId.AIR);

    for (const id of nonMineableBlockIds) {
      expect(getBlockDrops(id)).toEqual([]);
    }
  });

  it("returns expected mineable block drops", () => {
    const expectedDrops: ReadonlyArray<readonly [BlockId, ReadonlyArray<BlockDrop>]> = [
      [BlockId.GRASS, [{ item: BlockId.DIRT, count: 1 }]],
      [BlockId.DIRT, [{ item: BlockId.DIRT, count: 1 }]],
      [BlockId.STONE, [{ item: BlockId.STONE, count: 1 }]],
      [BlockId.WOOD, [{ item: BlockId.WOOD, count: 1 }]],
      [BlockId.PLANKS, [{ item: BlockId.PLANKS, count: 1 }]],
      [BlockId.COAL, [{ item: BlockId.COAL, count: 1 }]],
      [BlockId.TORCH, [{ item: BlockId.TORCH, count: 1 }]]
    ];

    for (const [id, drops] of expectedDrops) {
      expect(getBlockDrops(id)).toEqual(drops);
    }
  });

  it("returns stable registry references", () => {
    for (const id of Object.values(BlockId)) {
      const drops = getBlockDrops(id);

      expect(drops).toBe(BLOCK_DROPS[id]);
      expect(getBlockDrops(id)).toBe(drops);
    }
  });

  it("throws for unknown numeric ids", () => {
    expect(() => getBlockDrops(999 as BlockId)).toThrow("Unknown block id: 999");
  });
});
