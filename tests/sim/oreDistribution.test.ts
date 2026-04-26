import { describe, expect, it } from "vitest";

import { BlockId } from "../../src/sim/blocks";
import { CHUNK_SIZE, createChunk, getBlock, setBlock, type Chunk } from "../../src/sim/chunk";
import { distributeCoalOre } from "../../src/sim/oreDistribution";

describe("ore distribution", () => {
  it("places coal ore deterministically for the same seed and coordinate", () => {
    const chunkCoord = { x: 2, y: -1, z: 4 };
    const first = stoneChunk();
    const second = stoneChunk();

    distributeCoalOre(first, 1337, chunkCoord);
    distributeCoalOre(second, 1337, chunkCoord);

    expect(coalOrePositions(first)).toEqual(coalOrePositions(second));
    expect(Array.from(first.blocks)).toEqual(Array.from(second.blocks));
  });

  it("mixes chunk coordinates into independent placements", () => {
    const first = stoneChunk();
    const second = stoneChunk();

    distributeCoalOre(first, 1337, { x: 0, y: 0, z: 0 });
    distributeCoalOre(second, 1337, { x: 1, y: 0, z: 0 });

    expect(coalOrePositions(first)).not.toEqual(coalOrePositions(second));
  });

  it("only converts stone blocks into coal ore", () => {
    const chunk = stoneChunk();

    distributeCoalOre(chunk, 2026, { x: 0, y: 0, z: 0 });

    forEachBlock(chunk, (block) => {
      expect([BlockId.STONE, BlockId.COAL_ORE]).toContain(block);
    });
  });

  it("leaves air, grass, dirt, and other non-stone blocks untouched", () => {
    const chunk = stoneChunk();
    const protectedBlocks = [
      { x: 1, y: 2, z: 3, id: BlockId.AIR },
      { x: 4, y: 5, z: 6, id: BlockId.GRASS },
      { x: 7, y: 8, z: 9, id: BlockId.DIRT },
      { x: 10, y: 11, z: 12, id: BlockId.TORCH }
    ] as const;

    for (const block of protectedBlocks) {
      setBlock(chunk, block.x, block.y, block.z, block.id);
    }

    distributeCoalOre(chunk, 2026, { x: 0, y: 0, z: 0 });

    for (const block of protectedBlocks) {
      expect(getBlock(chunk, block.x, block.y, block.z)).toBe(block.id);
    }
  });

  it("keeps a fixed seed fixture pinned to exact coordinates", () => {
    const chunk = stoneChunk();

    distributeCoalOre(chunk, 2468, { x: -3, y: 1, z: 5 });

    expect(coalOrePositions(chunk)).toContain("14,3,9");
  });
});

function stoneChunk(): Chunk {
  const chunk = createChunk();

  forEachCoordinate((x, y, z) => {
    setBlock(chunk, x, y, z, BlockId.STONE);
  });

  return chunk;
}

function coalOrePositions(chunk: Chunk): string[] {
  const positions: string[] = [];

  forEachCoordinate((x, y, z) => {
    if (getBlock(chunk, x, y, z) === BlockId.COAL_ORE) {
      positions.push(`${x},${y},${z}`);
    }
  });

  return positions;
}

function forEachBlock(chunk: Chunk, fn: (block: BlockId) => void): void {
  forEachCoordinate((x, y, z) => {
    fn(getBlock(chunk, x, y, z));
  });
}

function forEachCoordinate(fn: (x: number, y: number, z: number) => void): void {
  for (let y = 0; y < CHUNK_SIZE; y += 1) {
    for (let z = 0; z < CHUNK_SIZE; z += 1) {
      for (let x = 0; x < CHUNK_SIZE; x += 1) {
        fn(x, y, z);
      }
    }
  }
}
