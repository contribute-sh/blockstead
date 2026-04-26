import { describe, expect, it } from "vitest";

import { BLOCK_REGISTRY, BlockId, getBlockDefinition } from "../../src/sim/blocks";

describe("block registry", () => {
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
  });

  it("gets block definitions by id", () => {
    expect(getBlockDefinition(BlockId.STONE)).toBe(BLOCK_REGISTRY[BlockId.STONE]);
  });

  it("throws for unknown numeric ids", () => {
    expect(() => getBlockDefinition(999 as BlockId)).toThrow("Unknown block id: 999");
  });
});
