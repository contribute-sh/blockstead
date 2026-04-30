declare const process: {
  readonly env: Readonly<Record<string, string | undefined>>;
  cwd(): string;
};

import { describe, expect, it } from "vitest";

import { BlockId } from "../../src/sim/blocks";
import { CHUNK_SIZE, chunkIndex, type Chunk } from "../../src/sim/chunk";
import { generateChunk } from "../../src/sim/terrain";

// If this test fails after intentional terrain changes, regenerate the fixture by running
// `UPDATE_TERRAIN_SEED_42_FIXTURE=1 pnpm vitest run tests/sim/terrainRegression.test.ts`
// and review the diff carefully - any change here is a determinism break for existing seeds.
// The current pipeline has no tree decoration pass or leaves block, so this fixture covers terrain + coal ore only.

interface ChunkCoord {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

interface FixtureChunk {
  readonly coord: ChunkCoord;
  readonly blocks: readonly number[];
}

interface TerrainFixture {
  readonly seed: number;
  readonly chunks: readonly FixtureChunk[];
}

interface FileSystemModule {
  readonly mkdirSync: (path: string, options: { readonly recursive: boolean }) => void;
  readonly readFileSync: (path: string, encoding: "utf8") => string;
  readonly writeFileSync: (path: string, data: string, encoding: "utf8") => void;
}

const NODE_FS: string = "node:fs";
const fs = (await import(NODE_FS)) as FileSystemModule;
const FIXTURE_DIRECTORY = `${process.cwd()}/tests/sim/fixtures`;
const FIXTURE_PATH = `${FIXTURE_DIRECTORY}/terrain-seed-42.json`;
const FIXTURE_COORDS = [
  { x: 0, y: 0, z: 0 },
  { x: 1, y: 0, z: 0 }
] as const satisfies readonly ChunkCoord[];
const BLOCK_COUNT = CHUNK_SIZE ** 3;
const NUMBERS_PER_FIXTURE_LINE = 64;

if (process.env.UPDATE_TERRAIN_SEED_42_FIXTURE === "1") {
  fs.mkdirSync(FIXTURE_DIRECTORY, { recursive: true });
  fs.writeFileSync(FIXTURE_PATH, serializeFixture(createFixture()), "utf8");
}

const fixture = loadFixture();

describe("terrain seed=42 regression fixture", () => {
  it("matches byte-for-byte generated terrain and coal ore chunks", () => {
    expect(fixture.seed).toBe(42);
    expect(fixture.chunks.map((chunk) => chunk.coord)).toEqual(FIXTURE_COORDS);

    for (const entry of fixture.chunks) {
      const chunk = generateTerrainPipeline(fixture.seed, entry.coord);

      expect(Array.from(chunk.blocks)).toEqual(entry.blocks);
    }
  });

  it("captures layered terrain and coal ore output", () => {
    const ids = new Set(fixture.chunks.flatMap((chunk) => chunk.blocks));
    const originChunk = fixture.chunks[0];

    expect(ids.has(BlockId.GRASS)).toBe(true);
    expect(ids.has(BlockId.DIRT)).toBe(true);
    expect(ids.has(BlockId.STONE)).toBe(true);
    expect(ids.has(BlockId.COAL_ORE)).toBe(true);
    expect(originChunk).toBeDefined();
    expect(blockAt(originChunk.blocks, 0, 8, 0)).toBe(BlockId.GRASS);
    expect(blockAt(originChunk.blocks, 0, 7, 0)).toBe(BlockId.DIRT);
    expect(blockAt(originChunk.blocks, 0, 5, 0)).toBe(BlockId.DIRT);
    expect(blockAt(originChunk.blocks, 0, 4, 0)).toBe(BlockId.STONE);
  });
});

function createFixture(): TerrainFixture {
  return {
    seed: 42,
    chunks: FIXTURE_COORDS.map((coord) => ({
      coord,
      blocks: Array.from(generateTerrainPipeline(42, coord).blocks)
    }))
  };
}

function generateTerrainPipeline(seed: number, coord: ChunkCoord): Chunk {
  return generateChunk(seed, coord);
}

function loadFixture(): TerrainFixture {
  return parseFixture(JSON.parse(fs.readFileSync(FIXTURE_PATH, "utf8")) as unknown);
}

function parseFixture(value: unknown): TerrainFixture {
  if (!isRecord(value)) {
    throw new Error("Terrain fixture must be an object");
  }

  const { seed, chunks } = value;

  if (typeof seed !== "number" || !Number.isInteger(seed)) {
    throw new Error("Terrain fixture seed must be an integer");
  }

  if (!Array.isArray(chunks)) {
    throw new Error("Terrain fixture chunks must be an array");
  }

  return {
    seed,
    chunks: chunks.map(parseFixtureChunk)
  };
}

function parseFixtureChunk(value: unknown): FixtureChunk {
  if (!isRecord(value)) {
    throw new Error("Terrain fixture chunk must be an object");
  }

  return {
    coord: parseChunkCoord(value.coord),
    blocks: parseBlocks(value.blocks)
  };
}

function parseChunkCoord(value: unknown): ChunkCoord {
  if (!isRecord(value)) {
    throw new Error("Terrain fixture chunk coordinate must be an object");
  }

  const { x, y, z } = value;

  if (
    typeof x !== "number" ||
    typeof y !== "number" ||
    typeof z !== "number" ||
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    !Number.isInteger(z)
  ) {
    throw new Error("Terrain fixture chunk coordinates must be integers");
  }

  return { x, y, z };
}

function parseBlocks(value: unknown): number[] {
  if (!Array.isArray(value)) {
    throw new Error("Terrain fixture blocks must be an array");
  }

  if (value.length !== BLOCK_COUNT) {
    throw new Error(`Terrain fixture chunk must contain ${BLOCK_COUNT} blocks`);
  }

  return value.map((block) => {
    if (typeof block !== "number" || !Number.isInteger(block)) {
      throw new Error("Terrain fixture block ids must be integers");
    }

    return block;
  });
}

function blockAt(blocks: readonly number[], x: number, y: number, z: number): number {
  return blocks[chunkIndex(x, y, z)];
}

function serializeFixture(value: TerrainFixture): string {
  const chunks = value.chunks.map(serializeFixtureChunk).join(",\n");

  return `{\n  "seed": ${value.seed},\n  "chunks": [\n${chunks}\n  ]\n}\n`;
}

function serializeFixtureChunk(chunk: FixtureChunk): string {
  return [
    "    {",
    `      "coord": { "x": ${chunk.coord.x}, "y": ${chunk.coord.y}, "z": ${chunk.coord.z} },`,
    '      "blocks": [',
    serializeBlocks(chunk.blocks),
    "      ]",
    "    }"
  ].join("\n");
}

function serializeBlocks(blocks: readonly number[]): string {
  const lines: string[] = [];

  for (let index = 0; index < blocks.length; index += NUMBERS_PER_FIXTURE_LINE) {
    const lineBlocks = blocks.slice(index, index + NUMBERS_PER_FIXTURE_LINE);
    const suffix = index + NUMBERS_PER_FIXTURE_LINE < blocks.length ? "," : "";

    lines.push(`        ${lineBlocks.join(", ")}${suffix}`);
  }

  return lines.join("\n");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
