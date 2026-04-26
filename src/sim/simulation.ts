import { BLOCK_REGISTRY, BlockId } from "./blocks";

export interface Vec3 { x: number; y: number; z: number; }

interface MoveAxes { readonly forward?: number; readonly right?: number; }

export interface SimulationIntents {
  readonly move?: MoveAxes;
  readonly movement?: MoveAxes;
  readonly forward?: boolean | number;
  readonly backward?: boolean | number;
  readonly left?: boolean | number;
  readonly right?: boolean | number;
  readonly moveForward?: boolean;
  readonly moveBackward?: boolean;
  readonly moveLeft?: boolean;
  readonly moveRight?: boolean;
  readonly mine?: boolean;
  readonly place?: boolean;
}

export interface Player { readonly position: Vec3; yaw: number; pitch: number; speed: number; radius: number; height: number; eyeHeight: number; }

export interface InventorySlot { blockId: BlockId; count: number; }

export interface Simulation { readonly world: World; readonly player: Player; readonly inventory: Inventory; selectedHotbarSlot: number; step(intents: SimulationIntents, dt: number): void; }

interface RaycastHit { readonly voxel: Vec3; readonly normal: Vec3; readonly blockId: BlockId; }

const CHUNK_SIZE = 16;
const HOTBAR_SIZE = 9;
const REACH = 5;
const EPSILON = 0.00001;

export class Chunk {
  readonly blocks = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE);

  constructor(readonly x: number, readonly y: number, readonly z: number) {}

  getBlock(x: number, y: number, z: number): BlockId {
    return this.blocks[index(x, y, z)] as BlockId;
  }

  setBlock(x: number, y: number, z: number, blockId: BlockId): void {
    this.blocks[index(x, y, z)] = blockId;
  }
}

export class World {
  readonly chunks = new Map<string, Chunk>();

  constructor(readonly seed: number) {}

  getChunk(x: number, y: number, z: number): Chunk {
    const key = `${x},${y},${z}`;
    const existing = this.chunks.get(key);

    if (existing !== undefined) {
      return existing;
    }

    const chunk = new Chunk(x, y, z);
    generateTerrain(this.seed, chunk);
    this.chunks.set(key, chunk);
    return chunk;
  }

  getBlock(x: number, y: number, z: number): BlockId {
    return this.chunkAt(x, y, z).getBlock(local(x), local(y), local(z));
  }

  setBlock(x: number, y: number, z: number, blockId: BlockId): void {
    this.chunkAt(x, y, z).setBlock(local(x), local(y), local(z), blockId);
  }

  private chunkAt(x: number, y: number, z: number): Chunk {
    return this.getChunk(chunkCoord(x), chunkCoord(y), chunkCoord(z));
  }
}

export class Inventory {
  readonly hotbar: InventorySlot[] = Array.from({ length: HOTBAR_SIZE }, () => ({ blockId: BlockId.AIR, count: 0 }));

  getCount(blockId: BlockId): number {
    return this.hotbar.reduce((total, slot) => total + (slot.blockId === blockId ? slot.count : 0), 0);
  }

  add(blockId: BlockId, count = 1): void {
    const slot = this.hotbar.find((item) => item.blockId === blockId && item.count > 0)
      ?? this.hotbar.find((item) => item.count === 0);

    if (slot !== undefined) {
      slot.blockId = blockId;
      slot.count += count;
    }
  }

  removeFromSlot(slotIndex: number): boolean {
    const slot = this.hotbar[slotIndex];

    if (slot === undefined || slot.count <= 0) {
      return false;
    }

    slot.count -= 1;

    if (slot.count === 0) {
      slot.blockId = BlockId.AIR;
    }

    return true;
  }
}

export function createSimulation({ seed }: { readonly seed: number }): Simulation {
  const world = new World(seed);
  const player: Player = {
    position: { x: 0.5, y: 2, z: 0.5 },
    yaw: 0,
    pitch: 0,
    speed: 4,
    radius: 0.3,
    height: 1.8,
    eyeHeight: 1.62
  };
  const inventory = new Inventory();
  const simulation: Simulation = {
    world,
    player,
    inventory,
    selectedHotbarSlot: 0,
    step(intents: SimulationIntents, dt: number): void {
      ensurePlayerChunks(world, player);
      movePlayer(world, player, moveVector(player, intents), dt);

      if (intents.mine === true) {
        mineTarget(world, player, inventory);
      }

      if (intents.place === true) {
        placeTarget(world, player, inventory, simulation.selectedHotbarSlot);
      }

      ensurePlayerChunks(world, player);
    }
  };

  ensurePlayerChunks(world, player);
  return simulation;
}

function generateTerrain(seed: number, chunk: Chunk): void {
  for (let x = 0; x < CHUNK_SIZE; x += 1) {
    for (let z = 0; z < CHUNK_SIZE; z += 1) {
      const surface = terrainHeight(seed, chunk.x * CHUNK_SIZE + x, chunk.z * CHUNK_SIZE + z);

      for (let y = 0; y < CHUNK_SIZE; y += 1) {
        const worldY = chunk.y * CHUNK_SIZE + y;
        chunk.setBlock(x, y, z, worldY > surface ? BlockId.AIR : worldY === surface ? BlockId.GRASS : BlockId.DIRT);
      }
    }
  }
}

function terrainHeight(seed: number, x: number, z: number): number {
  return (Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ Math.imul(seed, 1442695041)) % 5 === 0 ? 1 : 0;
}

function moveVector(player: Player, intents: SimulationIntents): Vec3 {
  const forward = intent(intents.move?.forward ?? intents.movement?.forward ?? intents.forward)
    - intent(intents.backward) + bool(intents.moveForward) - bool(intents.moveBackward);
  const right = intent(intents.move?.right ?? intents.movement?.right ?? intents.right)
    - intent(intents.left) + bool(intents.moveRight) - bool(intents.moveLeft);
  const flatForward = normalize({ ...viewDirection(player), y: 0 });
  const flatRight = { x: -flatForward.z, y: 0, z: flatForward.x };

  return normalize({
    x: flatForward.x * forward + flatRight.x * right,
    y: 0,
    z: flatForward.z * forward + flatRight.z * right
  });
}

function movePlayer(world: World, player: Player, direction: Vec3, dt: number): void {
  const distance = Math.max(0, dt) * player.speed;
  moveAxis(world, player, "x", direction.x * distance);
  moveAxis(world, player, "z", direction.z * distance);
}

function moveAxis(world: World, player: Player, axis: "x" | "z", delta: number): void {
  const steps = Math.max(1, Math.ceil(Math.abs(delta) / 0.25));
  const step = delta / steps;

  for (let count = 0; count < steps; count += 1) {
    player.position[axis] += step;

    if (playerOverlapsSolid(world, player)) {
      player.position[axis] -= step;
      return;
    }
  }
}

function mineTarget(world: World, player: Player, inventory: Inventory): void {
  const hit = raycast(world, eye(player), viewDirection(player));

  if (hit !== undefined && BLOCK_REGISTRY[hit.blockId].solid && BLOCK_REGISTRY[hit.blockId].mineable) {
    world.setBlock(hit.voxel.x, hit.voxel.y, hit.voxel.z, BlockId.AIR);
    inventory.add(hit.blockId);
  }
}

function placeTarget(world: World, player: Player, inventory: Inventory, selectedSlot: number): void {
  const slot = inventory.hotbar[selectedSlot];

  if (slot === undefined || slot.count <= 0 || !isPlaceable(slot.blockId)) {
    return;
  }

  const hit = raycast(world, eye(player), viewDirection(player));
  const blockId = slot.blockId;
  const target = hit === undefined ? undefined : add(hit.voxel, hit.normal);

  if (
    target === undefined
    || world.getBlock(target.x, target.y, target.z) !== BlockId.AIR
    || playerOverlapsVoxel(player, target)
    || !inventory.removeFromSlot(selectedSlot)
  ) {
    return;
  }

  world.setBlock(target.x, target.y, target.z, blockId);
}

function raycast(world: World, origin: Vec3, direction: Vec3): RaycastHit | undefined {
  const step = { x: Math.sign(direction.x), y: Math.sign(direction.y), z: Math.sign(direction.z) };
  const voxel = { x: Math.floor(origin.x), y: Math.floor(origin.y), z: Math.floor(origin.z) };
  const delta = { x: axisDelta(direction.x), y: axisDelta(direction.y), z: axisDelta(direction.z) };
  const next = {
    x: axisMax(origin.x, direction.x, step.x),
    y: axisMax(origin.y, direction.y, step.y),
    z: axisMax(origin.z, direction.z, step.z)
  };
  let distance = 0;
  let normal = { x: 0, y: 0, z: 0 };

  while (distance <= REACH) {
    const blockId = world.getBlock(voxel.x, voxel.y, voxel.z);

    if (blockId !== BlockId.AIR) {
      return { voxel: { ...voxel }, normal, blockId };
    }

    if (next.x < next.y && next.x < next.z) {
      distance = next.x;
      next.x += delta.x;
      voxel.x += step.x;
      normal = { x: -step.x, y: 0, z: 0 };
    } else if (next.y < next.z) {
      distance = next.y;
      next.y += delta.y;
      voxel.y += step.y;
      normal = { x: 0, y: -step.y, z: 0 };
    } else {
      distance = next.z;
      next.z += delta.z;
      voxel.z += step.z;
      normal = { x: 0, y: 0, z: -step.z };
    }
  }

  return undefined;
}

function playerOverlapsSolid(world: World, player: Player): boolean {
  const bounds = playerBounds(player);

  for (let x = Math.floor(bounds.min.x); x <= Math.floor(bounds.max.x - EPSILON); x += 1) {
    for (let y = Math.floor(bounds.min.y); y <= Math.floor(bounds.max.y - EPSILON); y += 1) {
      for (let z = Math.floor(bounds.min.z); z <= Math.floor(bounds.max.z - EPSILON); z += 1) {
        if (BLOCK_REGISTRY[world.getBlock(x, y, z)].solid) {
          return true;
        }
      }
    }
  }

  return false;
}

function playerOverlapsVoxel(player: Player, voxel: Vec3): boolean {
  const bounds = playerBounds(player);

  return bounds.min.x < voxel.x + 1 && bounds.max.x > voxel.x
    && bounds.min.y < voxel.y + 1 && bounds.max.y > voxel.y
    && bounds.min.z < voxel.z + 1 && bounds.max.z > voxel.z;
}

function ensurePlayerChunks(world: World, player: Player): void {
  const bounds = playerBounds(player);

  for (let x = Math.floor(bounds.min.x); x <= Math.floor(bounds.max.x); x += 1) {
    for (let y = Math.floor(bounds.min.y); y <= Math.floor(bounds.max.y); y += 1) {
      for (let z = Math.floor(bounds.min.z); z <= Math.floor(bounds.max.z); z += 1) {
        world.getBlock(x, y, z);
      }
    }
  }
}

function playerBounds(player: Player): { readonly min: Vec3; readonly max: Vec3 } {
  return {
    min: { x: player.position.x - player.radius, y: player.position.y, z: player.position.z - player.radius },
    max: { x: player.position.x + player.radius, y: player.position.y + player.height, z: player.position.z + player.radius }
  };
}

function viewDirection(player: Player): Vec3 {
  const pitchCos = Math.cos(player.pitch);
  return normalize({ x: pitchCos * Math.cos(player.yaw), y: Math.sin(player.pitch), z: pitchCos * Math.sin(player.yaw) });
}

function eye(player: Player): Vec3 {
  return { x: player.position.x, y: player.position.y + player.eyeHeight, z: player.position.z };
}

function isPlaceable(blockId: BlockId): boolean {
  return blockId !== BlockId.AIR && blockId !== BlockId.STICK;
}

function intent(value: boolean | number | undefined): number {
  return typeof value === "number" ? Math.max(-1, Math.min(1, value)) : value === true ? 1 : 0;
}

function bool(value: boolean | undefined): number {
  return value === true ? 1 : 0;
}

function normalize(vector: Vec3): Vec3 {
  const length = Math.hypot(vector.x, vector.y, vector.z);
  return length === 0 ? { x: 0, y: 0, z: 0 } : { x: vector.x / length, y: vector.y / length, z: vector.z / length };
}

function add(left: Vec3, right: Vec3): Vec3 {
  return { x: left.x + right.x, y: left.y + right.y, z: left.z + right.z };
}

function index(x: number, y: number, z: number): number {
  return x + CHUNK_SIZE * (y + CHUNK_SIZE * z);
}

function chunkCoord(value: number): number {
  return Math.floor(value / CHUNK_SIZE);
}

function local(value: number): number {
  return ((value % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
}

function axisDelta(direction: number): number {
  return direction === 0 ? Number.POSITIVE_INFINITY : Math.abs(1 / direction);
}

function axisMax(origin: number, direction: number, step: number): number {
  const boundary = step > 0 ? Math.floor(origin) + 1 : Math.floor(origin);
  return direction === 0 ? Number.POSITIVE_INFINITY : Math.abs((boundary - origin) / direction);
}
