import { describe, expect, it } from "vitest";

import { BlockId } from "../../src/sim/blocks";
import { type BlockGetter } from "../../src/sim/collision";
import { createPlayer, type Player, type Vec3 } from "../../src/sim/player";
import { stepPlayer, type KinematicsIntent } from "../../src/sim/playerKinematics";

const GROUNDED_Y = 1.0001;
const GRAVITY = -10;

const NEUTRAL_INTENT: KinematicsIntent = {
  forward: 0,
  strafe: 0,
  jump: false
};

describe("stepPlayer", () => {
  it("walks forward on flat solid ground and stays able to jump", () => {
    const player = makePlayer({
      position: [0.5, GROUNDED_Y, 0.5],
      velocity: [0, 0, 0],
      yaw: 0
    });
    const next = stepPlayer(player, { ...NEUTRAL_INTENT, forward: 1 }, GRAVITY, 0.1, ground());

    expect(next.position[0]).toBeCloseTo(0.5);
    expect(next.position[1]).toBeCloseTo(GROUNDED_Y);
    expect(next.position[2]).toBeGreaterThan(player.position[2]);
    expect(next.velocity[1]).toBe(0);

    const jump = stepPlayer(next, { ...NEUTRAL_INTENT, jump: true }, GRAVITY, 0.1, ground());

    expect(jump.velocity[1]).toBeGreaterThan(0);
  });

  it("zeroes blocked-axis velocity when walking into a wall", () => {
    const player = makePlayer({
      position: [0.5, GROUNDED_Y, 0.5],
      velocity: [0, 0, 0],
      yaw: 0
    });
    const next = stepPlayer(
      player,
      { ...NEUTRAL_INTENT, forward: 1 },
      GRAVITY,
      0.5,
      groundWithBlocks([
        [0, 1, 1],
        [0, 2, 1]
      ])
    );

    expect(next.position[2]).toBeCloseTo(0.7);
    expect(next.velocity[2]).toBe(0);
    expect(next.velocity[1]).toBe(0);
  });

  it("lands on top of a solid block and zeroes vertical velocity", () => {
    const player = makePlayer({
      position: [0.5, 2, 0.5],
      velocity: [0, -4, 0]
    });
    const next = stepPlayer(player, NEUTRAL_INTENT, 0, 1, ground());

    expect(next.position[1]).toBeCloseTo(GROUNDED_Y);
    expect(next.velocity[1]).toBe(0);

    const jump = stepPlayer(next, { ...NEUTRAL_INTENT, jump: true }, 0, 0, ground());

    expect(jump.velocity[1]).toBeGreaterThan(0);
  });

  it("only applies jump impulse while grounded at the start of the tick", () => {
    const grounded = makePlayer({
      position: [0.5, GROUNDED_Y, 0.5],
      velocity: [0, 0, 0]
    });
    const airborne = makePlayer({
      position: [0.5, 2, 0.5],
      velocity: [0, 0, 0]
    });

    expect(
      stepPlayer(grounded, { ...NEUTRAL_INTENT, jump: true }, GRAVITY, 0.1, ground()).velocity[1]
    ).toBeGreaterThan(0);
    expect(
      stepPlayer(airborne, { ...NEUTRAL_INTENT, jump: true }, GRAVITY, 0.1, ground()).velocity[1]
    ).toBeLessThanOrEqual(0);
  });

  it("does not mutate the input player or vector arrays", () => {
    const player = makePlayer({
      position: [0.5, GROUNDED_Y, 0.5],
      velocity: [1, 2, 3],
      yaw: Math.PI / 2
    });
    const snapshot: Player = {
      ...player,
      position: [...player.position],
      velocity: [...player.velocity]
    };
    const next = stepPlayer(player, { ...NEUTRAL_INTENT, strafe: 1 }, GRAVITY, 0.1, ground());

    expect(player).toEqual(snapshot);
    expect(next).not.toBe(player);
    expect(next.position).not.toBe(player.position);
    expect(next.velocity).not.toBe(player.velocity);
  });
});

function makePlayer(overrides: Partial<Player>): Player {
  const player = createPlayer();

  return {
    ...player,
    ...overrides,
    position: overrides.position === undefined ? [...player.position] : [...overrides.position],
    velocity: overrides.velocity === undefined ? [...player.velocity] : [...overrides.velocity]
  };
}

function ground(): BlockGetter {
  return (...cell: Vec3) => (cell[1] === 0 ? BlockId.STONE : BlockId.AIR);
}

function groundWithBlocks(cells: readonly Vec3[]): BlockGetter {
  const solidCells = new Map(cells.map((cell) => [key(cell[0], cell[1], cell[2]), BlockId.STONE]));
  const groundBlock = ground();

  return (x: number, y: number, z: number) => solidCells.get(key(x, y, z)) ?? groundBlock(x, y, z);
}

function key(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}
