import { type IntentFrame, type ActionIntent } from "../input/intents";
import { BlockId, getBlockDefinition } from "./blocks";
import { CHUNK_SIZE } from "./chunk";
import { addItem, createInventory, selectHotbarSlot, type Inventory, type InventorySlot } from "./inventory";
import { applyIntent, createPlayer, type Player, type PlayerIntent, type Vec3 } from "./player";
import type { SaveMutation } from "./save";
import { generateChunk } from "./terrain";
import { createWorld, getBlock, setBlock, type ChunkKey, type World } from "./world";

const PLAYER_HALF_WIDTH = 0.3;
const PLAYER_HEIGHT = 1.8;
const PLAYER_EYE_HEIGHT = 1.62;
const SPAWN_SCAN_Y = 12;
const INITIAL_PITCH = -1.05;
const REACH_DISTANCE = 5;
const COLLISION_STEP = 0.25;
const EPSILON = 0.0001;

type Axis = 0 | 1 | 2;

interface Bounds {
  readonly min: Vec3;
  readonly max: Vec3;
}

interface RayHit {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly normal: Vec3;
  readonly block: BlockId;
}

export interface Simulation {
  readonly seed: number;
  world: World;
  mutations: Array<SaveMutation>;
  player: Player;
  inventory: Inventory;
  selectedHotbarSlot: number;
  step(intents: Readonly<IntentFrame>, dt: number): void;
}

export function createSimulation({ seed }: { readonly seed: number }): Simulation {
  const simulation: Simulation = {
    seed,
    world: createWorld(),
    mutations: [],
    player: createPlayer(),
    inventory: createInventory(),
    selectedHotbarSlot: 0,
    step(intents, dt): void {
      stepSimulation(this, intents, dt);
    }
  };

  simulation.player.position = [0.5, SPAWN_SCAN_Y, 0.5];
  simulation.player.pitch = INITIAL_PITCH;
  ensureChunksForPlayer(simulation);
  simulation.player.position = [
    simulation.player.position[0],
    highestSolidY(simulation, 0, 0) + 2,
    simulation.player.position[2]
  ];
  ensureChunksForPlayer(simulation);

  return simulation;
}

function highestSolidY(simulation: Simulation, x: number, z: number): number {
  for (let y = CHUNK_SIZE - 1; y >= 0; y -= 1) {
    if (getBlock(simulation.world, x, y, z) !== BlockId.AIR) {
      return y;
    }
  }

  return 0;
}

function stepSimulation(simulation: Simulation, intents: Readonly<IntentFrame>, dt: number): void {
  const fixedDt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const nextPlayer = applyIntent(simulation.player, frameToPlayerIntent(simulation.player, intents), fixedDt);

  simulation.player = resolveMovement(simulation, simulation.player, nextPlayer);
  simulation.selectedHotbarSlot = simulation.player.selectedHotbarSlot;
  simulation.inventory = selectHotbarSlot(simulation.inventory, simulation.selectedHotbarSlot);
  ensureChunksForPlayer(simulation);

  for (const action of intents.actions) {
    applyAction(simulation, action);
  }
}

function frameToPlayerIntent(player: Readonly<Player>, intents: Readonly<IntentFrame>): PlayerIntent {
  const movement = intents.move === null ? { x: 0, z: 0 } : movementAxes(player.yaw, intents.move.forward, intents.move.right);

  return {
    moveX: movement.x,
    moveZ: movement.z,
    deltaYaw: intents.look?.yawDelta ?? 0,
    deltaPitch: intents.look?.pitchDelta ?? 0,
    hotbarDelta: 0
  };
}

function movementAxes(yaw: number, forward: number, right: number): { readonly x: number; readonly z: number } {
  const forwardX = Math.sin(yaw) * forward;
  const forwardZ = Math.cos(yaw) * forward;
  const rightX = Math.cos(yaw) * right;
  const rightZ = -Math.sin(yaw) * right;
  const x = forwardX + rightX;
  const z = forwardZ + rightZ;
  const length = Math.hypot(x, z);

  return length > 1 ? { x: x / length, z: z / length } : { x, z };
}

function applyAction(simulation: Simulation, action: Readonly<ActionIntent>): void {
  switch (action.kind) {
    case "mine":
      mineTarget(simulation);
      break;
    case "place":
      placeTarget(simulation);
      break;
    case "selectHotbar":
      selectSlot(simulation, action.slot);
      break;
    case "toggleInventory":
    case "save":
      break;
  }
}

function selectSlot(simulation: Simulation, slot: number): void {
  simulation.inventory = selectHotbarSlot(simulation.inventory, slot);
  simulation.selectedHotbarSlot = simulation.inventory.selectedHotbarSlot;
  simulation.player = { ...simulation.player, selectedHotbarSlot: simulation.selectedHotbarSlot };
}

function mineTarget(simulation: Simulation): void {
  const hit = castFromPlayer(simulation);

  if (hit === null) {
    return;
  }

  const definition = getBlockDefinition(hit.block);

  if (!definition.solid || !definition.mineable) {
    return;
  }

  writeBlock(simulation, hit.x, hit.y, hit.z, BlockId.AIR);
  simulation.inventory = addItem(simulation.inventory, hit.block, 1).inventory;
}

function placeTarget(simulation: Simulation): void {
  const hit = castFromPlayer(simulation);
  const slot = simulation.inventory.slots[simulation.selectedHotbarSlot];

  if (hit === null || slot === null || slot.count <= 0 || !isPlaceable(slot.id)) {
    return;
  }

  const target = { x: hit.x + hit.normal[0], y: hit.y + hit.normal[1], z: hit.z + hit.normal[2] };

  ensureChunkAtVoxel(simulation, target.x, target.y, target.z);

  if (
    getBlock(simulation.world, target.x, target.y, target.z) !== BlockId.AIR ||
    intersectsPlayer(simulation.player, target.x, target.y, target.z)
  ) {
    return;
  }

  writeBlock(simulation, target.x, target.y, target.z, slot.id);
  simulation.inventory = consumeSelectedSlot(simulation.inventory, simulation.selectedHotbarSlot);
}

export function restoreWorldMutations(
  simulation: Simulation,
  mutations: ReadonlyArray<SaveMutation>
): void {
  simulation.mutations = [];

  for (const mutation of mutations) {
    ensureChunkAtVoxel(simulation, mutation.x, mutation.y, mutation.z);
    setBlock(simulation.world, mutation.x, mutation.y, mutation.z, mutation.block);
    recordMutation(simulation, mutation);
  }
}

function writeBlock(
  simulation: Simulation,
  x: number,
  y: number,
  z: number,
  block: BlockId
): void {
  setBlock(simulation.world, x, y, z, block);
  recordMutation(simulation, { x, y, z, block });
}

function recordMutation(simulation: Simulation, mutation: SaveMutation): void {
  const existingIndex = simulation.mutations.findIndex(
    (entry) => entry.x === mutation.x && entry.y === mutation.y && entry.z === mutation.z
  );

  const nextMutation = {
    x: mutation.x,
    y: mutation.y,
    z: mutation.z,
    block: mutation.block
  };

  if (existingIndex === -1) {
    simulation.mutations = [...simulation.mutations, nextMutation];
    return;
  }

  simulation.mutations = simulation.mutations.map((entry, index) =>
    index === existingIndex ? nextMutation : entry
  );
}

function isPlaceable(id: BlockId): boolean {
  const definition = getBlockDefinition(id);

  return id !== BlockId.AIR && (definition.solid || definition.mineable);
}

function consumeSelectedSlot(inventory: Inventory, selectedHotbarSlot: number): Inventory {
  const slots = inventory.slots.map((slot, index): InventorySlot | null => {
    if (index !== selectedHotbarSlot || slot === null) {
      return slot === null ? null : { id: slot.id, count: slot.count };
    }

    return slot.count <= 1 ? null : { id: slot.id, count: slot.count - 1 };
  });

  return { slots, selectedHotbarSlot: inventory.selectedHotbarSlot };
}

function resolveMovement(simulation: Simulation, current: Readonly<Player>, target: Readonly<Player>): Player {
  const position = [...current.position] as Vec3;
  const velocity = [...target.velocity] as Vec3;

  for (const axis of [0, 1, 2] as const) {
    const requested = target.position[axis] - position[axis];
    const steps = Math.max(1, Math.ceil(Math.abs(requested) / COLLISION_STEP));
    const delta = requested / steps;

    for (let step = 0; step < steps; step += 1) {
      position[axis] += delta;
      ensureChunksForBounds(simulation, playerBounds(position));

      if (!collides(simulation, playerBounds(position))) {
        continue;
      }

      position[axis] -= delta;
      velocity[axis] = 0;
      break;
    }
  }

  return { ...target, position, velocity };
}

function collides(simulation: Simulation, bounds: Bounds): boolean {
  const minX = Math.floor(bounds.min[0] + EPSILON);
  const maxX = Math.floor(bounds.max[0] - EPSILON);
  const minY = Math.floor(bounds.min[1] + EPSILON);
  const maxY = Math.floor(bounds.max[1] - EPSILON);
  const minZ = Math.floor(bounds.min[2] + EPSILON);
  const maxZ = Math.floor(bounds.max[2] - EPSILON);

  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      for (let z = minZ; z <= maxZ; z += 1) {
        ensureChunkAtVoxel(simulation, x, y, z);

        if (getBlockDefinition(getBlock(simulation.world, x, y, z)).solid) {
          return true;
        }
      }
    }
  }

  return false;
}

function castFromPlayer(simulation: Simulation): RayHit | null {
  const origin: Vec3 = [simulation.player.position[0], simulation.player.position[1] + PLAYER_EYE_HEIGHT, simulation.player.position[2]];
  const direction = viewDirection(simulation.player);

  return raycast(simulation, origin, direction, REACH_DISTANCE);
}

function viewDirection(player: Readonly<Player>): Vec3 {
  const pitchScale = Math.cos(player.pitch);

  return [Math.sin(player.yaw) * pitchScale, Math.sin(player.pitch), Math.cos(player.yaw) * pitchScale];
}

function raycast(simulation: Simulation, origin: Readonly<Vec3>, direction: Readonly<Vec3>, maxDistance: number): RayHit | null {
  const voxel = [
    Math.floor(origin[0]),
    Math.floor(origin[1]),
    Math.floor(origin[2])
  ] as Vec3;
  const step = direction.map((component) => Math.sign(component)) as Vec3;
  const tDelta = direction.map((component) => (component === 0 ? Number.POSITIVE_INFINITY : Math.abs(1 / component))) as Vec3;
  const tMax = direction.map((component, axis) => {
    if (component > 0) {
      return (voxel[axis] + 1 - origin[axis]) / component;
    }

    if (component < 0) {
      return (origin[axis] - voxel[axis]) / -component;
    }

    return Number.POSITIVE_INFINITY;
  }) as Vec3;
  let distance = 0;
  let normal: Vec3 = [0, 0, 0];

  while (distance <= maxDistance) {
    ensureChunkAtVoxel(simulation, voxel[0], voxel[1], voxel[2]);

    const block = getBlock(simulation.world, voxel[0], voxel[1], voxel[2]);

    if (block !== BlockId.AIR) {
      return { x: voxel[0], y: voxel[1], z: voxel[2], normal, block };
    }

    const axis = minAxis(tMax);
    voxel[axis] += step[axis];
    distance = tMax[axis];
    tMax[axis] += tDelta[axis];
    normal = [0, 0, 0];
    normal[axis] = -step[axis];
  }

  return null;
}

function minAxis(values: Readonly<Vec3>): Axis {
  if (values[0] <= values[1] && values[0] <= values[2]) {
    return 0;
  }

  return values[1] <= values[2] ? 1 : 2;
}

function intersectsPlayer(player: Readonly<Player>, x: number, y: number, z: number): boolean {
  const bounds = playerBounds(player.position);

  return (
    bounds.min[0] < x + 1 &&
    bounds.max[0] > x &&
    bounds.min[1] < y + 1 &&
    bounds.max[1] > y &&
    bounds.min[2] < z + 1 &&
    bounds.max[2] > z
  );
}

function playerBounds(position: Readonly<Vec3>): Bounds {
  return {
    min: [position[0] - PLAYER_HALF_WIDTH, position[1], position[2] - PLAYER_HALF_WIDTH],
    max: [position[0] + PLAYER_HALF_WIDTH, position[1] + PLAYER_HEIGHT, position[2] + PLAYER_HALF_WIDTH]
  };
}

function ensureChunksForPlayer(simulation: Simulation): void {
  ensureChunksForBounds(simulation, playerBounds(simulation.player.position));
}

function ensureChunksForBounds(simulation: Simulation, bounds: Bounds): void {
  const minX = chunkCoordinate(bounds.min[0]);
  const maxX = chunkCoordinate(bounds.max[0]);
  const minY = chunkCoordinate(bounds.min[1]);
  const maxY = chunkCoordinate(bounds.max[1]);
  const minZ = chunkCoordinate(bounds.min[2]);
  const maxZ = chunkCoordinate(bounds.max[2]);

  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      for (let z = minZ; z <= maxZ; z += 1) {
        ensureChunk(simulation, x, y, z);
      }
    }
  }
}

function ensureChunkAtVoxel(simulation: Simulation, x: number, y: number, z: number): void {
  ensureChunk(simulation, chunkCoordinate(x), chunkCoordinate(y), chunkCoordinate(z));
}

function ensureChunk(simulation: Simulation, x: number, y: number, z: number): void {
  const key = chunkKey(x, y, z);

  if (simulation.world[key] === undefined) {
    simulation.world[key] = generateChunk(simulation.seed, { x, y, z });
  }
}

function chunkCoordinate(coordinate: number): number {
  return Math.floor(coordinate / CHUNK_SIZE);
}

function chunkKey(x: number, y: number, z: number): ChunkKey {
  return `${x},${y},${z}`;
}
