import { BlockId } from "./blocks";

export const CHUNK_SIZE = 16;
const CHUNK_BLOCK_COUNT = CHUNK_SIZE ** 3;

export interface Chunk {
  readonly size: number;
  readonly blocks: Uint8Array;
}

export function createChunk(): Chunk {
  return {
    size: CHUNK_SIZE,
    blocks: new Uint8Array(CHUNK_BLOCK_COUNT).fill(BlockId.AIR)
  };
}

export function chunkIndex(x: number, y: number, z: number): number {
  return x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE;
}

export function inBounds(x: number, y: number, z: number): boolean {
  return (
    Number.isInteger(x) &&
    Number.isInteger(y) &&
    Number.isInteger(z) &&
    x >= 0 &&
    x < CHUNK_SIZE &&
    y >= 0 &&
    y < CHUNK_SIZE &&
    z >= 0 &&
    z < CHUNK_SIZE
  );
}

export function getBlock(chunk: Chunk, x: number, y: number, z: number): BlockId {
  assertInBounds(x, y, z);

  return chunk.blocks[chunkIndex(x, y, z)] as BlockId;
}

export function setBlock(chunk: Chunk, x: number, y: number, z: number, id: BlockId): void {
  assertInBounds(x, y, z);

  chunk.blocks[chunkIndex(x, y, z)] = id;
}

function assertInBounds(x: number, y: number, z: number): void {
  if (!inBounds(x, y, z)) {
    throw new RangeError(`Chunk coordinates out of bounds: ${x}, ${y}, ${z}`);
  }
}
