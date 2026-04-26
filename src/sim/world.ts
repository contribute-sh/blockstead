import { BlockId } from "./blocks";
import {
  CHUNK_SIZE,
  createChunk,
  getBlock as getChunkBlock,
  setBlock as setChunkBlock,
  type Chunk
} from "./chunk";

export type ChunkKey = `${number},${number},${number}`;

export type World = Partial<Record<ChunkKey, Chunk>>;

interface ChunkPosition {
  readonly key: ChunkKey;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export function createWorld(): World {
  return {};
}

export function getBlock(world: World, x: number, y: number, z: number): BlockId {
  const position = getChunkPosition(x, y, z);
  const chunk = world[position.key];

  if (chunk === undefined) {
    return BlockId.AIR;
  }

  return getChunkBlock(chunk, position.x, position.y, position.z);
}

export function setBlock(world: World, x: number, y: number, z: number, blockId: BlockId): void {
  const position = getChunkPosition(x, y, z);
  let chunk = world[position.key];

  if (chunk === undefined) {
    chunk = createChunk();
    world[position.key] = chunk;
  }

  setChunkBlock(chunk, position.x, position.y, position.z, blockId);
}

function getChunkPosition(x: number, y: number, z: number): ChunkPosition {
  const cx = chunkCoordinate(x);
  const cy = chunkCoordinate(y);
  const cz = chunkCoordinate(z);

  return {
    key: `${cx},${cy},${cz}`,
    x: localCoordinate(x),
    y: localCoordinate(y),
    z: localCoordinate(z)
  };
}

function chunkCoordinate(coordinate: number): number {
  return Math.floor(coordinate / CHUNK_SIZE);
}

function localCoordinate(coordinate: number): number {
  return ((coordinate % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
}
