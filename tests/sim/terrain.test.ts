import { describe, expect, it } from "vitest";

import { BlockId } from "../../src/sim/blocks";
import { CHUNK_SIZE, getBlock, type Chunk } from "../../src/sim/chunk";
import { generateChunk } from "../../src/sim/terrain";

const DIRT_DEPTH = 3;

describe("terrain generator", () => {
  it("creates byte-equal chunks for the same seed and coordinate", () => {
    const chunkCoord = { x: 2, y: 0, z: -3 };
    const first = generateChunk(12345, chunkCoord);
    const second = generateChunk(12345, chunkCoord);

    expect(Array.from(first.blocks)).toEqual(Array.from(second.blocks));
  });

  it("orders air, grass, dirt, and stone within every column", () => {
    const chunk = generateChunk(2026, { x: 0, y: 0, z: 0 });

    for (let x = 0; x < CHUNK_SIZE; x += 1) {
      for (let z = 0; z < CHUNK_SIZE; z += 1) {
        const topY = topSolidY(chunk, x, z);

        expect(getBlock(chunk, x, topY, z)).toBe(BlockId.GRASS);

        for (let y = topY + 1; y < CHUNK_SIZE; y += 1) {
          expect(getBlock(chunk, x, y, z)).toBe(BlockId.AIR);
        }

        for (let offset = 1; offset <= DIRT_DEPTH; offset += 1) {
          expect(getBlock(chunk, x, topY - offset, z)).toBe(BlockId.DIRT);
        }

        for (let y = 0; y < topY - DIRT_DEPTH; y += 1) {
          expect(getBlock(chunk, x, y, z)).toBe(BlockId.STONE);
        }
      }
    }
  });

  it("keeps adjacent chunk boundary columns close in height", () => {
    const west = generateChunk(77, { x: 0, y: 0, z: 0 });
    const east = generateChunk(77, { x: 1, y: 0, z: 0 });

    for (let z = 0; z < CHUNK_SIZE; z += 1) {
      const westHeight = topSolidY(west, CHUNK_SIZE - 1, z);
      const eastHeight = topSolidY(east, 0, z);

      expect(Math.abs(westHeight - eastHeight)).toBeLessThanOrEqual(2);
    }
  });
});

function topSolidY(chunk: Chunk, x: number, z: number): number {
  for (let y = CHUNK_SIZE - 1; y >= 0; y -= 1) {
    if (getBlock(chunk, x, y, z) !== BlockId.AIR) {
      return y;
    }
  }

  throw new Error(`Column has no solid blocks: ${x}, ${z}`);
}
