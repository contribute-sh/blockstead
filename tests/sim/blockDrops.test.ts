import { describe, expect, it } from "vitest";

import { BLOCK_DROPS, getBlockDrops } from "../../src/sim/blockDrops";
import { BLOCK_REGISTRY, BlockId } from "../../src/sim/blocks";

describe("block drop registry", () => {
  it("has an explicit drop entry for every block id", () => {
    const blockIds = Object.values(BlockId);

    expect(Object.keys(BLOCK_DROPS)).toHaveLength(blockIds.length);

    for (const id of blockIds) {
      expect(BLOCK_DROPS[id]).toBeDefined();
    }
  });

  it("returns empty drops for air and non-mineable blocks", () => {
    for (const definition of Object.values(BLOCK_REGISTRY)) {
      if (definition.id === BlockId.AIR || !definition.mineable) {
        expect(getBlockDrops(definition.id)).toEqual([]);
      }
    }
  });

  it("returns expected drops for mineable blocks", () => {
    expect(getBlockDrops(BlockId.GRASS)).toEqual([{ item: BlockId.DIRT, count: 1 }]);
    expect(getBlockDrops(BlockId.DIRT)).toEqual([{ item: BlockId.DIRT, count: 1 }]);
    expect(getBlockDrops(BlockId.STONE)).toEqual([{ item: BlockId.STONE, count: 1 }]);
    expect(getBlockDrops(BlockId.WOOD)).toEqual([{ item: BlockId.WOOD, count: 1 }]);
    expect(getBlockDrops(BlockId.PLANKS)).toEqual([{ item: BlockId.PLANKS, count: 1 }]);
    expect(getBlockDrops(BlockId.COAL)).toEqual([{ item: BlockId.COAL, count: 1 }]);
    expect(getBlockDrops(BlockId.TORCH)).toEqual([{ item: BlockId.TORCH, count: 1 }]);
  });

  it("returns stable registry references", () => {
    for (const id of Object.values(BlockId)) {
      expect(getBlockDrops(id)).toBe(BLOCK_DROPS[id]);
      expect(getBlockDrops(id)).toBe(getBlockDrops(id));
    }
  });

  it("throws for unknown numeric ids", () => {
    expect(() => getBlockDrops(999 as BlockId)).toThrow("Unknown block id: 999");
  });
});
