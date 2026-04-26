export type Vec3 = [number, number, number];

export interface Player {
  position: Vec3;
  velocity: Vec3;
  yaw: number;
  pitch: number;
  selectedHotbarSlot: number;
}

// Deterministic per-frame input deltas for the simulation layer.
export interface PlayerIntent {
  moveX: number;
  moveZ: number;
  deltaYaw: number;
  deltaPitch: number;
  hotbarDelta: number;
}

const HOTBAR_SLOT_COUNT = 9;
const PLAYER_ACCELERATION = 12;
const MIN_PITCH = -Math.PI / 2;
const MAX_PITCH = Math.PI / 2;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function wrapHotbarSlot(slot: number): number {
  const wrapped = Math.trunc(slot) % HOTBAR_SLOT_COUNT;

  return wrapped < 0 ? wrapped + HOTBAR_SLOT_COUNT : wrapped;
}

export function createPlayer(seed?: number): Player;
export function createPlayer(): Player {
  return {
    position: [0, 0, 0],
    velocity: [0, 0, 0],
    yaw: 0,
    pitch: 0,
    selectedHotbarSlot: 0
  };
}

export function applyIntent(player: Readonly<Player>, intent: Readonly<PlayerIntent>, dt: number): Player {
  const velocity: Vec3 = [
    player.velocity[0] + intent.moveX * PLAYER_ACCELERATION * dt,
    player.velocity[1],
    player.velocity[2] + intent.moveZ * PLAYER_ACCELERATION * dt
  ];

  return {
    position: [
      player.position[0] + velocity[0] * dt,
      player.position[1] + velocity[1] * dt,
      player.position[2] + velocity[2] * dt
    ],
    velocity,
    yaw: player.yaw + intent.deltaYaw,
    pitch: clamp(player.pitch + intent.deltaPitch, MIN_PITCH, MAX_PITCH),
    selectedHotbarSlot: wrapHotbarSlot(player.selectedHotbarSlot + intent.hotbarDelta)
  };
}
