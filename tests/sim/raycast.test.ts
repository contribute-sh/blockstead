import { describe, expect, it } from "vitest";

import { BlockId } from "../../src/sim/blocks";
import {
  raycast,
  type BlockGetter,
  type FaceNormal,
  type RaycastHit,
  type Vec3
} from "../../src/sim/raycast";

interface AxisCase {
  readonly name: string;
  readonly block: Vec3;
  readonly direction: Vec3;
  readonly placement: Vec3;
  readonly normal: FaceNormal;
}

interface FaceCase {
  readonly name: string;
  readonly origin: Vec3;
  readonly direction: Vec3;
  readonly placement: Vec3;
  readonly normal: FaceNormal;
}

interface ExpectedHit {
  readonly block: Vec3;
  readonly placement: Vec3;
  readonly normal: FaceNormal;
  readonly distance: number;
}

const ORIGIN: Vec3 = [0.5, 0.5, 0.5];
const AXIS_CASES: readonly AxisCase[] = [
  { name: "+X", block: [2, 0, 0], direction: [1, 0, 0], placement: [1, 0, 0], normal: [-1, 0, 0] },
  { name: "-X", block: [-2, 0, 0], direction: [-1, 0, 0], placement: [-1, 0, 0], normal: [1, 0, 0] },
  { name: "+Y", block: [0, 2, 0], direction: [0, 1, 0], placement: [0, 1, 0], normal: [0, -1, 0] },
  { name: "-Y", block: [0, -2, 0], direction: [0, -1, 0], placement: [0, -1, 0], normal: [0, 1, 0] },
  { name: "+Z", block: [0, 0, 2], direction: [0, 0, 1], placement: [0, 0, 1], normal: [0, 0, -1] },
  { name: "-Z", block: [0, 0, -2], direction: [0, 0, -1], placement: [0, 0, -1], normal: [0, 0, 1] }
];
const FACE_CASES: readonly FaceCase[] = [
  { name: "+X", origin: [2.5, 0.5, 0.5], direction: [-1, 0, 0], placement: [1, 0, 0], normal: [1, 0, 0] },
  { name: "-X", origin: [-1.5, 0.5, 0.5], direction: [1, 0, 0], placement: [-1, 0, 0], normal: [-1, 0, 0] },
  { name: "+Y", origin: [0.5, 2.5, 0.5], direction: [0, -1, 0], placement: [0, 1, 0], normal: [0, 1, 0] },
  { name: "-Y", origin: [0.5, -1.5, 0.5], direction: [0, 1, 0], placement: [0, -1, 0], normal: [0, -1, 0] },
  { name: "+Z", origin: [0.5, 0.5, 2.5], direction: [0, 0, -1], placement: [0, 0, 1], normal: [0, 0, 1] },
  { name: "-Z", origin: [0.5, 0.5, -1.5], direction: [0, 0, 1], placement: [0, 0, -1], normal: [0, 0, -1] }
];

describe("raycast", () => {
  it.each(AXIS_CASES)(
    "hits a solid block with an axis-aligned $name ray",
    ({ block, direction, placement, normal }) => {
      expectHit(raycast(ORIGIN, direction, 10, blocks([block])), {
        block,
        placement,
        normal,
        distance: 1.5
      });
    }
  );

  it("traverses multiple voxels before a diagonal hit", () => {
    expectHit(raycast({ x: 0.2, y: 0.2, z: 0.5 }, [0.6, 0.8, 0], 10, blocks([[2, 2, 0]])), {
      block: [2, 2, 0],
      placement: [1, 2, 0],
      normal: [-1, 0, 0],
      distance: 3
    });
  });

  it("returns null when no solid block is hit within maxDistance", () => {
    expect(raycast(ORIGIN, [1, 0, 0], 2.9, blocks([[4, 0, 0]]))).toBeNull();
  });

  it.each(FACE_CASES)(
    "reports the $name face normal when approaching a single block",
    ({ origin, direction, placement, normal }) => {
      expectHit(raycast(origin, direction, 10, blocks([[0, 0, 0]])), {
        block: [0, 0, 0],
        placement,
        normal,
        distance: 1.5
      });
    }
  );

  it("returns distance zero when the ray starts inside a solid block", () => {
    expectHit(raycast([1.25, 2.25, 3.25], [1, 0, 0], 10, blocks([[1, 2, 3]])), {
      block: [1, 2, 3],
      placement: [1, 2, 3],
      normal: [0, 0, 0],
      distance: 0
    });
  });
});

function blocks(cells: readonly Vec3[]): BlockGetter {
  const solidCells = new Map(cells.map((cell) => [key(cell[0], cell[1], cell[2]), BlockId.STONE]));

  return (x: number, y: number, z: number) => solidCells.get(key(x, y, z)) ?? BlockId.AIR;
}

function key(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

function expectHit(hit: RaycastHit | null, expected: ExpectedHit): void {
  expect(hit).not.toBeNull();

  if (hit === null) {
    return;
  }

  expect(hit.block).toEqual(expected.block);
  expect(hit.placement).toEqual(expected.placement);
  expect(hit.normal).toEqual(expected.normal);
  expect(hit.distance).toBeCloseTo(expected.distance);
}
