import { BlockId, getBlockDefinition } from "./blocks";
import { CHUNK_SIZE } from "./chunk";
import { addItem, removeItem, type Inventory } from "./inventory";
import type { ItemId } from "./items";
import { getBlock, setBlock, type ChunkKey, type World } from "./world";

export interface VoxelCoord {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface Hit {
  readonly target: VoxelCoord;
  readonly normal: VoxelCoord;
}

export interface BlockDrop {
  readonly itemId: BlockId | ItemId;
  readonly count: number;
}

export type BlockDrops = Readonly<Partial<Record<BlockId, BlockDrop>>>;

export interface ActionResolveResult {
  readonly ok: boolean;
  readonly world: World;
  readonly inventory: Inventory;
}

export function resolveMine(
  world: World,
  hit: Hit,
  inventory: Inventory,
  drops: BlockDrops
): ActionResolveResult {
  const blockId = getBlock(world, hit.target.x, hit.target.y, hit.target.z);
  const definition = getBlockDefinition(blockId);

  if (blockId === BlockId.AIR || !definition.mineable) {
    return { ok: false, world, inventory };
  }

  const nextWorld = cloneWorldForWrite(world, hit.target);
  setBlock(nextWorld, hit.target.x, hit.target.y, hit.target.z, BlockId.AIR);

  const drop = drops[blockId];
  const nextInventory =
    drop === undefined ? inventory : addItem(inventory, drop.itemId as BlockId, drop.count).inventory;

  return { ok: true, world: nextWorld, inventory: nextInventory };
}

export function resolvePlace(
  world: World,
  hit: Hit,
  inventory: Inventory,
  blockId: BlockId
): ActionResolveResult {
  if (blockId === BlockId.AIR) {
    return { ok: false, world, inventory };
  }

  const target = {
    x: hit.target.x + hit.normal.x,
    y: hit.target.y + hit.normal.y,
    z: hit.target.z + hit.normal.z
  };

  if (getBlock(world, target.x, target.y, target.z) !== BlockId.AIR) {
    return { ok: false, world, inventory };
  }

  const removed = removeItem(inventory, blockId, 1);

  if (removed.removed !== 1) {
    return { ok: false, world, inventory };
  }

  const nextWorld = cloneWorldForWrite(world, target);
  setBlock(nextWorld, target.x, target.y, target.z, blockId);

  return { ok: true, world: nextWorld, inventory: removed.inventory };
}

function cloneWorldForWrite(world: World, voxel: VoxelCoord): World {
  const nextWorld: World = { ...world };
  const key = chunkKeyForVoxel(voxel);
  const chunk = world[key];

  if (chunk !== undefined) {
    nextWorld[key] = {
      size: chunk.size,
      blocks: new Uint8Array(chunk.blocks)
    };
  }

  return nextWorld;
}

function chunkKeyForVoxel(voxel: VoxelCoord): ChunkKey {
  return `${chunkCoordinate(voxel.x)},${chunkCoordinate(voxel.y)},${chunkCoordinate(voxel.z)}`;
}

function chunkCoordinate(coordinate: number): number {
  return Math.floor(coordinate / CHUNK_SIZE);
}
