import { describe, expect, it } from "vitest";

import { BlockId } from "../../src/sim/blocks";
import { CHUNK_SIZE, getBlock as getChunkBlock, type Chunk } from "../../src/sim/chunk";
import {
  createWorld,
  getBlock,
  setBlock,
  type ChunkKey,
  type World
} from "../../src/sim/world";

describe("world", () => {
  it("translates world coordinates across chunk boundaries", () => {
    const world = createWorld();

    setBlock(world, -1, 2, 3, BlockId.STONE);
    setBlock(world, CHUNK_SIZE, 2, 3, BlockId.DIRT);
    setBlock(world, CHUNK_SIZE - 1, 2, 3, BlockId.GRASS);
    setBlock(world, -1, -1, -1, BlockId.TORCH);

    expect(getBlock(world, -1, 2, 3)).toBe(BlockId.STONE);
    expect(getBlock(world, CHUNK_SIZE, 2, 3)).toBe(BlockId.DIRT);
    expect(getBlock(world, CHUNK_SIZE - 1, 2, 3)).toBe(BlockId.GRASS);
    expect(getBlock(world, -1, -1, -1)).toBe(BlockId.TORCH);

    expect(getChunkBlock(getExistingChunk(world, "-1,0,0"), CHUNK_SIZE - 1, 2, 3)).toBe(
      BlockId.STONE
    );
    expect(getChunkBlock(getExistingChunk(world, "1,0,0"), 0, 2, 3)).toBe(BlockId.DIRT);
    expect(getChunkBlock(getExistingChunk(world, "0,0,0"), CHUNK_SIZE - 1, 2, 3)).toBe(
      BlockId.GRASS
    );
    expect(
      getChunkBlock(
        getExistingChunk(world, "-1,-1,-1"),
        CHUNK_SIZE - 1,
        CHUNK_SIZE - 1,
        CHUNK_SIZE - 1
      )
    ).toBe(BlockId.TORCH);
  });

  it("returns air for missing chunks without allocating them", () => {
    const world = createWorld();

    expect(getBlock(world, 0, 0, 0)).toBe(BlockId.AIR);
    expect(getBlock(world, -1, 0, 0)).toBe(BlockId.AIR);
    expect(getBlock(world, CHUNK_SIZE, 0, 0)).toBe(BlockId.AIR);

    expect(Object.keys(world)).toHaveLength(0);
  });

  it("allocates a chunk on first write and returns the written block", () => {
    const world = createWorld();

    setBlock(world, 1, 2, 3, BlockId.WOOD);

    expect(Object.keys(world)).toEqual(["0,0,0"]);
    expect(getBlock(world, 1, 2, 3)).toBe(BlockId.WOOD);
  });

  it("keeps an existing chunk when writing air", () => {
    const world = createWorld();

    setBlock(world, 1, 2, 3, BlockId.STONE);
    setBlock(world, 1, 2, 3, BlockId.AIR);

    expect(Object.keys(world)).toEqual(["0,0,0"]);
    expect(getBlock(world, 1, 2, 3)).toBe(BlockId.AIR);
  });

  it("stores writes in different chunks as distinct entries", () => {
    const world = createWorld();

    setBlock(world, 0, 0, 0, BlockId.GRASS);
    setBlock(world, CHUNK_SIZE, 0, 0, BlockId.DIRT);

    expect(Object.keys(world).sort()).toEqual(["0,0,0", "1,0,0"]);
    expect(getExistingChunk(world, "0,0,0")).not.toBe(getExistingChunk(world, "1,0,0"));
  });
});

function getExistingChunk(world: World, key: ChunkKey): Chunk {
  const chunk = world[key];

  expect(chunk).toBeDefined();

  if (chunk === undefined) {
    throw new Error(`Missing chunk ${key}`);
  }

  return chunk;
}
