import * as THREE from "three";

import { BLOCK_REGISTRY, BlockId } from "../sim/blocks";
import { CHUNK_SIZE, chunkIndex, type Chunk } from "../sim/chunk";

type Vec3 = readonly [number, number, number];

export type BlockFaceUV = readonly [
  readonly [number, number],
  readonly [number, number],
  readonly [number, number],
  readonly [number, number]
];

interface FaceDefinition {
  readonly offset: Vec3;
  readonly normal: Vec3;
  readonly corners: readonly [Vec3, Vec3, Vec3, Vec3];
}

const DEFAULT_FACE_UV = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1]
] as const satisfies BlockFaceUV;

const BLOCK_FACE_UVS = {
  [BlockId.AIR]: DEFAULT_FACE_UV,
  [BlockId.GRASS]: DEFAULT_FACE_UV,
  [BlockId.DIRT]: DEFAULT_FACE_UV,
  [BlockId.STONE]: DEFAULT_FACE_UV,
  [BlockId.WOOD]: DEFAULT_FACE_UV,
  [BlockId.PLANKS]: DEFAULT_FACE_UV,
  [BlockId.STICK]: DEFAULT_FACE_UV,
  [BlockId.COAL]: DEFAULT_FACE_UV,
  [BlockId.TORCH]: DEFAULT_FACE_UV,
  [BlockId.COAL_ORE]: DEFAULT_FACE_UV
} as const satisfies Readonly<Record<BlockId, BlockFaceUV>>;

const FACE_DEFINITIONS: readonly FaceDefinition[] = [
  {
    offset: [1, 0, 0],
    normal: [1, 0, 0],
    corners: [
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
      [1, 0, 1]
    ]
  },
  {
    offset: [-1, 0, 0],
    normal: [-1, 0, 0],
    corners: [
      [0, 0, 0],
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0]
    ]
  },
  {
    offset: [0, 1, 0],
    normal: [0, 1, 0],
    corners: [
      [0, 1, 0],
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0]
    ]
  },
  {
    offset: [0, -1, 0],
    normal: [0, -1, 0],
    corners: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1]
    ]
  },
  {
    offset: [0, 0, 1],
    normal: [0, 0, 1],
    corners: [
      [0, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1]
    ]
  },
  {
    offset: [0, 0, -1],
    normal: [0, 0, -1],
    corners: [
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
      [1, 0, 0]
    ]
  }
];

export function getBlockFaceUV(blockId: BlockId): BlockFaceUV {
  return BLOCK_FACE_UVS[blockId];
}

export function buildChunkMesh(chunk: Chunk): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let y = 0; y < CHUNK_SIZE; y += 1) {
    for (let z = 0; z < CHUNK_SIZE; z += 1) {
      for (let x = 0; x < CHUNK_SIZE; x += 1) {
        const blockId = chunk.blocks[chunkIndex(x, y, z)];

        if (!isSolidBlock(blockId)) {
          continue;
        }

        for (const face of FACE_DEFINITIONS) {
          const [offsetX, offsetY, offsetZ] = face.offset;

          if (isSolidNeighbor(chunk, x + offsetX, y + offsetY, z + offsetZ)) {
            continue;
          }

          appendFace(positions, normals, uvs, indices, x, y, z, blockId as BlockId, face);
        }
      }
    }
  }

  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);

  return geometry;
}

function appendFace(
  positions: number[],
  normals: number[],
  uvs: number[],
  indices: number[],
  x: number,
  y: number,
  z: number,
  blockId: BlockId,
  face: FaceDefinition
): void {
  const vertexOffset = positions.length / 3;
  const faceUV = getBlockFaceUV(blockId);

  for (let vertexIndex = 0; vertexIndex < face.corners.length; vertexIndex += 1) {
    const [cornerX, cornerY, cornerZ] = face.corners[vertexIndex];
    const [normalX, normalY, normalZ] = face.normal;
    const [u, v] = faceUV[vertexIndex];

    positions.push(x + cornerX, y + cornerY, z + cornerZ);
    normals.push(normalX, normalY, normalZ);
    uvs.push(u, v);
  }

  indices.push(
    vertexOffset,
    vertexOffset + 1,
    vertexOffset + 2,
    vertexOffset,
    vertexOffset + 2,
    vertexOffset + 3
  );
}

function isSolidNeighbor(chunk: Chunk, x: number, y: number, z: number): boolean {
  if (
    x < 0 ||
    x >= CHUNK_SIZE ||
    y < 0 ||
    y >= CHUNK_SIZE ||
    z < 0 ||
    z >= CHUNK_SIZE
  ) {
    return false;
  }

  return isSolidBlock(chunk.blocks[chunkIndex(x, y, z)]);
}

function isSolidBlock(blockId: number): boolean {
  return BLOCK_REGISTRY[blockId as BlockId]?.solid === true;
}
