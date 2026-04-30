import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";

import { createWorldRenderer } from "../../src/render/worldRenderer";
import { BlockId } from "../../src/sim/blocks";
import { CHUNK_SIZE } from "../../src/sim/chunk";
import { createSimulation } from "../../src/sim/simulation";
import { createWorld, setBlock, type ChunkKey, type World } from "../../src/sim/world";

describe("createWorldRenderer", () => {
  it("adds one positioned mesh for every loaded chunk", () => {
    const scene = new THREE.Scene();
    const world = createSeededWorld();
    const renderer = createWorldRenderer(scene, world);

    renderer.sync();

    const keys = getChunkKeys(world);
    const meshes = getSceneMeshes(scene);

    expect(meshes).toHaveLength(keys.length);

    for (const key of keys) {
      const mesh = getMeshForChunk(scene, key);

      expect(mesh.position.toArray()).toEqual(getChunkOrigin(key));
      expect(scene.children).toContain(mesh);
    }

    renderer.dispose();
  });

  it("rebuilds only the mutated chunk mesh geometry", () => {
    const scene = new THREE.Scene();
    const world = createSeededWorld();
    const renderer = createWorldRenderer(scene, world);

    renderer.sync();

    const dirtyKey: ChunkKey = "0,0,0";
    const stableKey: ChunkKey = "1,0,0";
    const dirtyMesh = getMeshForChunk(scene, dirtyKey);
    const stableMesh = getMeshForChunk(scene, stableKey);
    const dirtyGeometry = dirtyMesh.geometry;
    const stableGeometry = stableMesh.geometry;
    const dirtyGeometryDispose = vi.spyOn(dirtyGeometry, "dispose");

    setBlock(world, 2, 2, 3, BlockId.DIRT);
    renderer.sync();

    expect(getMeshForChunk(scene, dirtyKey)).toBe(dirtyMesh);
    expect(dirtyMesh.geometry).not.toBe(dirtyGeometry);
    expect(dirtyGeometryDispose).toHaveBeenCalledTimes(1);
    expect(getMeshForChunk(scene, stableKey)).toBe(stableMesh);
    expect(stableMesh.geometry).toBe(stableGeometry);

    renderer.dispose();
  });

  it("preserves unaffected simulation chunk mesh geometry after a dirty sync", () => {
    const scene = new THREE.Scene();
    const simulation = createSimulation({ seed: 1337 });
    const renderer = createWorldRenderer(scene, simulation.world);

    const dirtyKey: ChunkKey = "0,0,0";
    const stableKey: ChunkKey = "1,0,0";

    setBlock(simulation.world, 2, 2, 3, BlockId.STONE);
    setBlock(simulation.world, CHUNK_SIZE + 1, 2, 3, BlockId.DIRT);
    renderer.sync();

    const dirtyMesh = getMeshForChunk(scene, dirtyKey);
    const stableMesh = getMeshForChunk(scene, stableKey);
    const dirtyGeometry = dirtyMesh.geometry;
    const stableGeometry = stableMesh.geometry;
    const dirtyGeometryDispose = vi.spyOn(dirtyGeometry, "dispose");
    const stableGeometryDispose = vi.spyOn(stableGeometry, "dispose");

    setBlock(simulation.world, 2, 2, 3, BlockId.DIRT);
    renderer.sync();

    expect(getMeshForChunk(scene, dirtyKey)).toBe(dirtyMesh);
    expect(dirtyMesh.geometry).not.toBe(dirtyGeometry);
    expect(dirtyGeometryDispose).toHaveBeenCalledTimes(1);
    expect(getMeshForChunk(scene, stableKey)).toBe(stableMesh);
    expect(stableMesh.geometry).toBe(stableGeometry);
    expect(stableGeometryDispose).not.toHaveBeenCalled();

    renderer.dispose();
  });

  it("removes evicted chunk meshes and disposes their geometry", () => {
    const scene = new THREE.Scene();
    const world = createSeededWorld();
    const renderer = createWorldRenderer(scene, world);

    renderer.sync();

    const evictedKey: ChunkKey = "1,0,0";
    const evictedMesh = getMeshForChunk(scene, evictedKey);
    const evictedGeometryDispose = vi.spyOn(evictedMesh.geometry, "dispose");

    delete world[evictedKey];
    renderer.sync();

    expect(scene.children).not.toContain(evictedMesh);
    expect(getSceneMeshes(scene)).toHaveLength(getChunkKeys(world).length);
    expect(evictedGeometryDispose).toHaveBeenCalledTimes(1);

    renderer.dispose();
  });
});

function createSeededWorld(): World {
  const world = createWorld();

  setBlock(world, 1, 2, 3, BlockId.STONE);
  setBlock(world, CHUNK_SIZE + 1, 2, 3, BlockId.DIRT);
  setBlock(world, -1, 1, 0, BlockId.GRASS);

  return world;
}

function getChunkKeys(world: World): ChunkKey[] {
  return (Object.keys(world) as ChunkKey[]).sort();
}

function getMeshForChunk(scene: THREE.Scene, key: ChunkKey): THREE.Mesh {
  const origin = getChunkOrigin(key);
  const mesh = getSceneMeshes(scene).find((candidate) => {
    return candidate.position.toArray().every((coordinate, index) => coordinate === origin[index]);
  });

  expect(mesh).toBeDefined();

  if (mesh === undefined) {
    throw new Error(`Missing mesh for chunk ${key}`);
  }

  return mesh;
}

function getSceneMeshes(scene: THREE.Scene): THREE.Mesh[] {
  return scene.children.filter((child): child is THREE.Mesh => child instanceof THREE.Mesh);
}

function getChunkOrigin(key: ChunkKey): readonly [number, number, number] {
  const [chunkX, chunkY, chunkZ] = parseChunkKey(key);

  return [
    chunkX * CHUNK_SIZE,
    chunkY * CHUNK_SIZE,
    chunkZ * CHUNK_SIZE
  ];
}

function parseChunkKey(key: ChunkKey): readonly [number, number, number] {
  const [chunkXText, chunkYText, chunkZText] = key.split(",");

  if (chunkXText === undefined || chunkYText === undefined || chunkZText === undefined) {
    throw new Error(`Invalid chunk key: ${key}`);
  }

  return [Number(chunkXText), Number(chunkYText), Number(chunkZText)];
}
