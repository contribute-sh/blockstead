import { describe, expect, it } from "vitest";

import { BLOCK_DROPS, getBlockDrops } from "../../src/sim/blockDrops";
import { BLOCK_REGISTRY, BlockId } from "../../src/sim/blocks";
import { ItemId } from "../../src/sim/items";

const EXPECTED_MINEABLE_ITEM_DROPS: ReadonlyArray<readonly [BlockId, ItemId]> = [
  [BlockId.WOOD, ItemId.WOOD_LOG],
  [BlockId.PLANKS, ItemId.PLANKS],
  [BlockId.COAL, ItemId.COAL],
  [BlockId.TORCH, ItemId.TORCH]
];

describe("block drop registry", () => {
  it("has a registry entry for every block id", () => {
    const blockIds = Object.values(BlockId);

    expect(Object.keys(BLOCK_DROPS)).toHaveLength(blockIds.length);

    for (const id of blockIds) {
      expect(Object.prototype.hasOwnProperty.call(BLOCK_DROPS, id)).toBe(true);
    }
  });

  it("returns no drops for air", () => {
    expect(getBlockDrops(BlockId.AIR)).toEqual([]);
  });

  it("drops one expected item for each mineable block with an item id", () => {
    for (const [blockId, item] of EXPECTED_MINEABLE_ITEM_DROPS) {
      expect(BLOCK_REGISTRY[blockId].mineable).toBe(true);
      expect(getBlockDrops(blockId)).toEqual([{ item, count: 1 }]);
    }
  });

  it("returns stable registry array references", () => {
    for (const id of Object.values(BlockId)) {
      expect(getBlockDrops(id)).toBe(BLOCK_DROPS[id]);
      expect(getBlockDrops(id)).toBe(getBlockDrops(id));
    }
  });

  it("throws for unknown numeric ids", () => {
    expect(() => getBlockDrops(999 as BlockId)).toThrow("Unknown block id: 999");
  });
});
