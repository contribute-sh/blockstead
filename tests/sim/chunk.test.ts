import { describe, expect, it } from "vitest";

import { BlockId } from "../../src/sim/blocks";
import { CHUNK_SIZE, chunkIndex, createChunk, getBlock, setBlock } from "../../src/sim/chunk";

describe("chunk", () => {
  it("creates fresh chunks filled with air", () => {
    const chunk = createChunk();

    expect(chunk.size).toBe(CHUNK_SIZE);
    expect(chunk.blocks).toHaveLength(CHUNK_SIZE ** 3);
    expect([...chunk.blocks].every((block) => block === BlockId.AIR)).toBe(true);
  });

  it.each([
    [0, 0, 0, BlockId.GRASS],
    [15, 15, 15, BlockId.STONE],
    [4, 7, 11, BlockId.TORCH]
  ] as const)("round-trips block ids at %i, %i, %i", (x, y, z, id) => {
    const chunk = createChunk();

    setBlock(chunk, x, y, z, id);

    expect(getBlock(chunk, x, y, z)).toBe(id);
  });

  it("sets one coordinate without affecting a neighbor", () => {
    const chunk = createChunk();

    setBlock(chunk, 3, 4, 5, BlockId.DIRT);

    expect(getBlock(chunk, 3, 4, 5)).toBe(BlockId.DIRT);
    expect(getBlock(chunk, 4, 4, 5)).toBe(BlockId.AIR);
  });

  it.each([
    [-1, 0, 0],
    [16, 0, 0],
    [0, -1, 0],
    [0, 16, 0],
    [0, 0, -1],
    [0, 0, 16]
  ] as const)("throws for out-of-bounds coordinates %i, %i, %i", (x, y, z) => {
    const chunk = createChunk();

    expect(() => getBlock(chunk, x, y, z)).toThrow(RangeError);
    expect(() => setBlock(chunk, x, y, z, BlockId.STONE)).toThrow(RangeError);
  });

  it.each([
    [1, 2, 3],
    [15, 15, 15]
  ] as const)("uses x + z*S + y*S*S layout for %i, %i, %i", (x, y, z) => {
    expect(chunkIndex(x, y, z)).toBe(x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE);
  });
});
