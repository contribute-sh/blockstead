import { describe, expect, it } from "vitest";

import { BLOCK_REGISTRY, BlockId, getBlockDefinition } from "../../src/sim/blocks";

describe("block registry", () => {
  it("keeps existing block ids stable and appends coal ore", () => {
    expect(BlockId.AIR).toBe(0);
    expect(BlockId.GRASS).toBe(1);
    expect(BlockId.DIRT).toBe(2);
    expect(BlockId.STONE).toBe(3);
    expect(BlockId.WOOD).toBe(4);
    expect(BlockId.PLANKS).toBe(5);
    expect(BlockId.STICK).toBe(6);
    expect(BlockId.COAL).toBe(7);
    expect(BlockId.TORCH).toBe(8);
    expect(BlockId.COAL_ORE).toBe(9);
  });

  it("has a registry entry for every block id", () => {
    const blockIds = Object.values(BlockId);

    expect(Object.keys(BLOCK_REGISTRY)).toHaveLength(blockIds.length);

    for (const id of blockIds) {
      expect(BLOCK_REGISTRY[id]?.id).toBe(id);
    }
  });

  it("defines expected solid and mineable behavior", () => {
    expect(BLOCK_REGISTRY[BlockId.AIR]).toMatchObject({
      solid: false,
      mineable: false
    });
    expect(BLOCK_REGISTRY[BlockId.STONE]).toMatchObject({
      solid: true,
      mineable: true
    });
    expect(BLOCK_REGISTRY[BlockId.TORCH]).toMatchObject({
      solid: false,
      mineable: true
    });
    expect(BLOCK_REGISTRY[BlockId.COAL_ORE]).toMatchObject({
      name: "Coal Ore",
      solid: true,
      mineable: true
    });
  });

  it("gets block definitions by id", () => {
    expect(getBlockDefinition(BlockId.STONE)).toBe(BLOCK_REGISTRY[BlockId.STONE]);
  });

  it("throws for unknown numeric ids", () => {
    expect(() => getBlockDefinition(999 as BlockId)).toThrow("Unknown block id: 999");
  });
});
