import { BlockId } from "./blocks";
import { CHUNK_SIZE, getBlock, inBounds, setBlock, type Chunk } from "./chunk";
import { createRng, hashStringToSeed, nextInt, type Rng } from "./random";

interface ChunkCoord {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

interface Coordinate {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

const VEIN_COUNT = 5;
const MIN_VEIN_SIZE = 3;
const MAX_VEIN_SIZE = 5;
const START_ATTEMPTS_PER_VEIN = 16;
const GROW_ATTEMPTS_PER_BLOCK = 12;
const DIRECTIONS = [
  { x: 1, y: 0, z: 0 },
  { x: -1, y: 0, z: 0 },
  { x: 0, y: 1, z: 0 },
  { x: 0, y: -1, z: 0 },
  { x: 0, y: 0, z: 1 },
  { x: 0, y: 0, z: -1 }
] as const satisfies readonly Coordinate[];

export function distributeCoalOre(chunk: Chunk, seed: number, chunkCoord: ChunkCoord): void {
  const rng = createRng(hashStringToSeed(`coal_ore:${seed}:${chunkCoord.x}:${chunkCoord.y}:${chunkCoord.z}`));

  for (let veinIndex = 0; veinIndex < VEIN_COUNT; veinIndex += 1) {
    const targetSize = nextInt(rng, MIN_VEIN_SIZE, MAX_VEIN_SIZE + 1);
    const vein = planVein(chunk, rng, targetSize);

    for (const coordinate of vein) {
      setBlock(chunk, coordinate.x, coordinate.y, coordinate.z, BlockId.COAL_ORE);
    }
  }
}

function planVein(chunk: Chunk, rng: Rng, targetSize: number): Coordinate[] {
  for (let attempt = 0; attempt < START_ATTEMPTS_PER_VEIN; attempt += 1) {
    const start = randomCoordinate(rng);

    if (getBlock(chunk, start.x, start.y, start.z) !== BlockId.STONE) {
      continue;
    }

    const coordinates = [start];
    const used = new Set<string>([coordinateKey(start)]);

    while (coordinates.length < targetSize) {
      const nextCoordinate = findAdjacentStone(chunk, rng, coordinates, used);

      if (nextCoordinate === undefined) {
        break;
      }

      coordinates.push(nextCoordinate);
      used.add(coordinateKey(nextCoordinate));
    }

    if (coordinates.length >= MIN_VEIN_SIZE) {
      return coordinates;
    }
  }

  return [];
}

function findAdjacentStone(
  chunk: Chunk,
  rng: Rng,
  coordinates: readonly Coordinate[],
  used: ReadonlySet<string>
): Coordinate | undefined {
  for (let attempt = 0; attempt < GROW_ATTEMPTS_PER_BLOCK; attempt += 1) {
    const base = coordinates[nextInt(rng, 0, coordinates.length)];
    const direction = DIRECTIONS[nextInt(rng, 0, DIRECTIONS.length)];
    const candidate = {
      x: base.x + direction.x,
      y: base.y + direction.y,
      z: base.z + direction.z
    };

    if (
      inBounds(candidate.x, candidate.y, candidate.z) &&
      !used.has(coordinateKey(candidate)) &&
      getBlock(chunk, candidate.x, candidate.y, candidate.z) === BlockId.STONE
    ) {
      return candidate;
    }
  }

  return undefined;
}

function randomCoordinate(rng: Rng): Coordinate {
  return {
    x: nextInt(rng, 0, CHUNK_SIZE),
    y: nextInt(rng, 0, CHUNK_SIZE),
    z: nextInt(rng, 0, CHUNK_SIZE)
  };
}

function coordinateKey(coordinate: Coordinate): string {
  return `${coordinate.x},${coordinate.y},${coordinate.z}`;
}
