import * as THREE from "three";

import { CHUNK_SIZE, type Chunk } from "../sim/chunk";
import type { ChunkKey, World } from "../sim/world";
import { buildChunkMesh } from "./chunkMesh";

type ChunkMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;

export interface WorldRenderer {
  sync(): void;
  dispose(): void;
}

export function createWorldRenderer(scene: THREE.Scene, world: World): WorldRenderer {
  const material = new THREE.MeshStandardMaterial();
  const meshes = new Map<ChunkKey, ChunkMesh>();
  const chunkHashes = new Map<ChunkKey, number>();
  let disposed = false;

  function sync(): void {
    if (disposed) {
      return;
    }

    const liveKeys = new Set<ChunkKey>();

    for (const [key, chunk] of Object.entries(world)) {
      if (chunk === undefined) {
        continue;
      }

      const chunkKey = key as ChunkKey;
      const chunkHash = hashChunk(chunk);

      liveKeys.add(chunkKey);

      if (chunkHashes.get(chunkKey) === chunkHash && meshes.has(chunkKey)) {
        continue;
      }

      rebuildChunkMesh(chunkKey, chunk, chunkHash);
    }

    for (const [key, mesh] of meshes) {
      if (liveKeys.has(key)) {
        continue;
      }

      scene.remove(mesh);
      mesh.geometry.dispose();
      meshes.delete(key);
      chunkHashes.delete(key);
    }
  }

  function dispose(): void {
    if (disposed) {
      return;
    }

    disposed = true;

    for (const mesh of meshes.values()) {
      scene.remove(mesh);
      mesh.geometry.dispose();
    }

    meshes.clear();
    chunkHashes.clear();
    material.dispose();
  }

  function rebuildChunkMesh(key: ChunkKey, chunk: Chunk, chunkHash: number): void {
    const geometry = buildChunkMesh(chunk);
    const mesh = meshes.get(key);

    if (mesh === undefined) {
      const nextMesh = new THREE.Mesh(geometry, material);

      positionChunkMesh(nextMesh, key);
      meshes.set(key, nextMesh);
      scene.add(nextMesh);
    } else {
      mesh.geometry.dispose();
      mesh.geometry = geometry;
    }

    chunkHashes.set(key, chunkHash);
  }

  return {
    sync,
    dispose
  };
}

function positionChunkMesh(mesh: ChunkMesh, key: ChunkKey): void {
  const [chunkX, chunkY, chunkZ] = parseChunkKey(key);

  mesh.position.set(
    chunkX * CHUNK_SIZE,
    chunkY * CHUNK_SIZE,
    chunkZ * CHUNK_SIZE
  );
}

function parseChunkKey(key: ChunkKey): readonly [number, number, number] {
  const [chunkXText, chunkYText, chunkZText] = key.split(",");

  if (chunkXText === undefined || chunkYText === undefined || chunkZText === undefined) {
    throw new Error(`Invalid chunk key: ${key}`);
  }

  return [Number(chunkXText), Number(chunkYText), Number(chunkZText)];
}

function hashChunk(chunk: Chunk): number {
  let hash = 2166136261;

  for (const blockId of chunk.blocks) {
    hash ^= blockId;
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}
