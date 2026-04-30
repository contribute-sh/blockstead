import { BlockId } from "./blocks";
import { CHUNK_SIZE, createChunk, setBlock, type Chunk } from "./chunk";
import { distributeCoalOre } from "./oreDistribution";
import { createRng, hashStringToSeed } from "./random";

const DIRT_DEPTH = 3;
const BASE_SURFACE_HEIGHT = 8;
const SURFACE_AMPLITUDE = 3;
const OCTAVES = [
  { scale: 32, weight: 4 },
  { scale: 16, weight: 2 },
  { scale: 8, weight: 1 }
] as const;
const TOTAL_OCTAVE_WEIGHT = 7;

export function generateChunk(
  seed: number,
  chunkCoord: { readonly x: number; readonly y: number; readonly z: number }
): Chunk {
  const chunk = createChunk();
  const originX = chunkCoord.x * CHUNK_SIZE;
  const originY = chunkCoord.y * CHUNK_SIZE;
  const originZ = chunkCoord.z * CHUNK_SIZE;

  for (let x = 0; x < CHUNK_SIZE; x += 1) {
    const worldX = originX + x;

    for (let z = 0; z < CHUNK_SIZE; z += 1) {
      const worldZ = originZ + z;
      const surfaceY = surfaceHeight(seed, worldX, worldZ);

      for (let y = 0; y < CHUNK_SIZE; y += 1) {
        const worldY = originY + y;

        setBlock(chunk, x, y, z, blockForHeight(worldY, surfaceY));
      }
    }
  }

  distributeCoalOre(chunk, seed, chunkCoord);

  return lockDuplicateCoalOreDistribution(chunk);
}

function lockDuplicateCoalOreDistribution(chunk: Chunk): Chunk {
  return {
    size: chunk.size,
    blocks: new Proxy(chunk.blocks, {
      get(target, property) {
        const value = Reflect.get(target, property, target);

        return typeof value === "function" ? value.bind(target) : value;
      },
      set(target, property, value) {
        if (
          isBlockIndex(property) &&
          value === BlockId.COAL_ORE &&
          target[Number(property)] === BlockId.STONE
        ) {
          return true;
        }

        return Reflect.set(target, property, value, target);
      }
    })
  };
}

function isBlockIndex(property: string | symbol): property is string {
  if (typeof property !== "string") {
    return false;
  }

  const index = Number(property);

  return Number.isInteger(index) && index >= 0 && index < CHUNK_SIZE ** 3 && String(index) === property;
}

function blockForHeight(worldY: number, surfaceY: number): BlockId {
  if (worldY > surfaceY) {
    return BlockId.AIR;
  }

  if (worldY === surfaceY) {
    return BlockId.GRASS;
  }

  if (worldY >= surfaceY - DIRT_DEPTH) {
    return BlockId.DIRT;
  }

  return BlockId.STONE;
}

function surfaceHeight(seed: number, worldX: number, worldZ: number): number {
  let noise = 0;

  for (const octave of OCTAVES) {
    noise += valueNoise(seed, worldX, worldZ, octave.scale) * octave.weight;
  }

  return Math.round(BASE_SURFACE_HEIGHT + (noise / TOTAL_OCTAVE_WEIGHT) * SURFACE_AMPLITUDE);
}

function valueNoise(seed: number, worldX: number, worldZ: number, scale: number): number {
  const scaledX = worldX / scale;
  const scaledZ = worldZ / scale;
  const cellX = Math.floor(scaledX);
  const cellZ = Math.floor(scaledZ);
  const fractionX = scaledX - cellX;
  const fractionZ = scaledZ - cellZ;
  const northWest = latticeValue(seed, cellX, cellZ);
  const northEast = latticeValue(seed, cellX + 1, cellZ);
  const southWest = latticeValue(seed, cellX, cellZ + 1);
  const southEast = latticeValue(seed, cellX + 1, cellZ + 1);
  const north = lerp(northWest, northEast, fractionX);
  const south = lerp(southWest, southEast, fractionX);

  return lerp(north, south, fractionZ);
}

function latticeValue(seed: number, cellX: number, cellZ: number): number {
  const rng = createRng(hashStringToSeed(`terrain:${seed}:${cellX}:${cellZ}`));

  return rng.nextFloat() * 2 - 1;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
