import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { buildChunkMesh, getBlockFaceUV } from "../../src/render/chunkMesh";
import { BlockId } from "../../src/sim/blocks";
import { CHUNK_SIZE, createChunk, setBlock } from "../../src/sim/chunk";

describe("buildChunkMesh", () => {
  it("produces zero faces for an all-air chunk", () => {
    const geometry = buildChunkMesh(createChunk());

    expect(geometry.getIndex()?.count).toBe(0);
    expect(getFaceCount(geometry)).toBe(0);
  });

  it("emits six faces for a single solid block surrounded by air", () => {
    const chunk = createChunk();

    setBlock(chunk, 4, 5, 6, BlockId.STONE);

    const geometry = buildChunkMesh(chunk);

    expect(getFaceCount(geometry)).toBe(6);
    expect(geometry.getIndex()?.count).toBe(36);
    expect(geometry.getAttribute("position").count).toBe(24);
  });

  it("emits faces and UVs for coal ore", () => {
    const chunk = createChunk();

    setBlock(chunk, 4, 5, 6, BlockId.COAL_ORE);

    const geometry = buildChunkMesh(chunk);

    expect(getFaceCount(geometry)).toBe(6);
    expect(getBlockFaceUV(BlockId.COAL_ORE)).toHaveLength(4);
    expect(geometry.getAttribute("uv").count).toBe(24);
  });

  it("omits the internal face between adjacent solid blocks", () => {
    const chunk = createChunk();

    setBlock(chunk, 4, 5, 6, BlockId.STONE);
    setBlock(chunk, 5, 5, 6, BlockId.DIRT);

    expect(getFaceCount(buildChunkMesh(chunk))).toBe(10);
  });

  it("emits only the exterior shell for a fully solid chunk", () => {
    const chunk = createChunk();

    chunk.blocks.fill(BlockId.STONE);

    expect(getFaceCount(buildChunkMesh(chunk))).toBe(CHUNK_SIZE * CHUNK_SIZE * 6);
  });

  it("returns a BufferGeometry with indexed position, normal, and uv attributes", () => {
    const chunk = createChunk();

    setBlock(chunk, 4, 5, 6, BlockId.STONE);

    const geometry = buildChunkMesh(chunk);
    const position = geometry.getAttribute("position");
    const normal = geometry.getAttribute("normal");
    const uv = geometry.getAttribute("uv");

    expect(geometry).toBeInstanceOf(THREE.BufferGeometry);
    expect(geometry.getIndex()).not.toBeNull();
    expect(position).toBeInstanceOf(THREE.BufferAttribute);
    expect(normal).toBeInstanceOf(THREE.BufferAttribute);
    expect(uv).toBeInstanceOf(THREE.BufferAttribute);
    expect(normal.count).toBe(position.count);
    expect(uv.count).toBe(position.count);
  });
});

function getFaceCount(geometry: THREE.BufferGeometry): number {
  const index = geometry.getIndex();

  if (index === null) {
    throw new Error("Expected indexed chunk geometry");
  }

  return index.count / 6;
}
