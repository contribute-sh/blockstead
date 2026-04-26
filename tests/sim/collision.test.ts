import { describe, expect, it } from "vitest";

import { BlockId } from "../../src/sim/blocks";
import {
  resolveCollision,
  type AABB,
  type BlockGetter,
  type CollisionContacts,
  type Vec3
} from "../../src/sim/collision";

const EPSILON = 0.0001;
const BODY: AABB = {
  min: [0.2, 1.1, 0.2],
  max: [0.8, 1.9, 0.8]
};

describe("resolveCollision", () => {
  it("leaves free movement through air unchanged", () => {
    const result = resolveCollision(BODY, [1, -0.25, 0.5], air);

    expect(result.delta).toEqual([1, -0.25, 0.5]);
    expectContacts(result.contacts, {});
    expect(result.grounded).toBe(false);
  });

  it.each([
    {
      name: "+X",
      block: [1, 1, 0] as Vec3,
      delta: [1, 0, 0] as Vec3,
      expected: 0.2 - EPSILON,
      axis: 0
    },
    {
      name: "-X",
      block: [-1, 1, 0] as Vec3,
      delta: [-1, 0, 0] as Vec3,
      expected: -0.2 + EPSILON,
      axis: 0
    },
    {
      name: "+Z",
      block: [0, 1, 1] as Vec3,
      delta: [0, 0, 1] as Vec3,
      expected: 0.2 - EPSILON,
      axis: 2
    },
    {
      name: "-Z",
      block: [0, 1, -1] as Vec3,
      delta: [0, 0, -1] as Vec3,
      expected: -0.2 + EPSILON,
      axis: 2
    }
  ])("clamps horizontal motion into a $name wall", ({ block, delta, expected, axis }) => {
    const result = resolveCollision(BODY, delta, blocks([block]));

    expect(result.delta[axis]).toBeCloseTo(expected);
    expect(result.delta[1]).toBe(0);
    expectContacts(result.contacts, { [axis === 0 ? "x" : "z"]: true });
    expect(result.grounded).toBe(false);
  });

  it("clamps downward motion onto a floor and reports grounded", () => {
    const body: AABB = {
      min: [0.2, 1.2, 0.2],
      max: [0.8, 2.8, 0.8]
    };
    const result = resolveCollision(body, [0, -1, 0], blocks([[0, 0, 0]]));

    expect(result.delta).toEqual([0, expect.closeTo(-0.2 + EPSILON), 0]);
    expectContacts(result.contacts, { y: true });
    expect(result.grounded).toBe(true);
  });

  it("clamps upward motion into a ceiling", () => {
    const body: AABB = {
      min: [0.2, 1.2, 0.2],
      max: [0.8, 2.8, 0.8]
    };
    const result = resolveCollision(body, [0, 1, 0], blocks([[0, 3, 0]]));

    expect(result.delta).toEqual([0, expect.closeTo(0.2 - EPSILON), 0]);
    expectContacts(result.contacts, { y: true });
    expect(result.grounded).toBe(false);
  });

  it("slides along the clear axis when diagonal motion clips a corner", () => {
    const result = resolveCollision(BODY, [1, 0, 0.5], blocks([[1, 1, 0]]));

    expect(result.delta[0]).toBeCloseTo(0.2 - EPSILON);
    expect(result.delta[2]).toBe(0.5);
    expectContacts(result.contacts, { x: true });
  });

  it("blocks horizontal step movement while allowing a separate vertical landing", () => {
    const standing: AABB = {
      min: [0.2, 1 + EPSILON, 0.2],
      max: [0.8, 2.8, 0.8]
    };
    const stepBlocks = blocks([[1, 1, 0]]);
    const horizontal = resolveCollision(standing, [1, 0, 0], stepBlocks);

    expect(horizontal.delta[0]).toBeCloseTo(0.2 - EPSILON);
    expectContacts(horizontal.contacts, { x: true });

    const aboveStep: AABB = {
      min: [1.2, 2.4, 0.2],
      max: [1.8, 4.2, 0.8]
    };
    const vertical = resolveCollision(aboveStep, [0, -1, 0], stepBlocks);

    expect(vertical.delta[1]).toBeCloseTo(-0.4 + EPSILON);
    expectContacts(vertical.contacts, { y: true });
    expect(vertical.grounded).toBe(true);
  });
});

function air(): BlockId {
  return BlockId.AIR;
}

function blocks(cells: readonly Vec3[]): BlockGetter {
  const solidCells = new Map(cells.map((cell) => [key(cell[0], cell[1], cell[2]), BlockId.STONE]));

  return (x: number, y: number, z: number) => solidCells.get(key(x, y, z)) ?? BlockId.AIR;
}

function key(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

function expectContacts(contacts: CollisionContacts, expected: Partial<CollisionContacts>): void {
  expect(contacts).toEqual({
    x: expected.x ?? false,
    y: expected.y ?? false,
    z: expected.z ?? false
  });
}
