import { resolveCollision, type AABB, type BlockGetter } from "./collision";
import { type Player, type Vec3 } from "./player";

export interface KinematicsIntent {
  readonly forward: number;
  readonly strafe: number;
  readonly jump: boolean;
}

const PLAYER_HALF_WIDTH = 0.3;
const PLAYER_HEIGHT = 1.8;
const WALK_SPEED = 4;
const JUMP_IMPULSE = 5;
const GROUND_PROBE_DISTANCE = 0.01;

export function stepPlayer(
  player: Readonly<Player>,
  intent: Readonly<KinematicsIntent>,
  gravity: number,
  dt: number,
  getBlock: BlockGetter
): Player {
  const fixedDt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const grounded = isGrounded(player, getBlock);
  const horizontal = rotateHorizontalIntent(player.yaw, intent.forward, intent.strafe);
  const velocity: Vec3 = [
    horizontal[0] * WALK_SPEED,
    grounded && intent.jump ? JUMP_IMPULSE : player.velocity[1],
    horizontal[1] * WALK_SPEED
  ];

  velocity[1] += gravity * fixedDt;

  const collision = resolveCollision(
    playerAabb(player.position),
    [velocity[0] * fixedDt, velocity[1] * fixedDt, velocity[2] * fixedDt],
    getBlock
  );

  return {
    ...player,
    position: [
      player.position[0] + collision.delta[0],
      player.position[1] + collision.delta[1],
      player.position[2] + collision.delta[2]
    ],
    velocity: [
      collision.contacts.x ? 0 : velocity[0],
      collision.contacts.y ? 0 : velocity[1],
      collision.contacts.z ? 0 : velocity[2]
    ]
  };
}

function isGrounded(player: Readonly<Player>, getBlock: BlockGetter): boolean {
  return resolveCollision(playerAabb(player.position), [0, -GROUND_PROBE_DISTANCE, 0], getBlock).grounded;
}

function rotateHorizontalIntent(yaw: number, forward: number, strafe: number): readonly [number, number] {
  const x = Math.sin(yaw) * forward + Math.cos(yaw) * strafe;
  const z = Math.cos(yaw) * forward - Math.sin(yaw) * strafe;
  const length = Math.hypot(x, z);

  return length > 1 ? [x / length, z / length] : [x, z];
}

function playerAabb(position: Readonly<Vec3>): AABB {
  return {
    min: [position[0] - PLAYER_HALF_WIDTH, position[1], position[2] - PLAYER_HALF_WIDTH],
    max: [position[0] + PLAYER_HALF_WIDTH, position[1] + PLAYER_HEIGHT, position[2] + PLAYER_HALF_WIDTH]
  };
}
