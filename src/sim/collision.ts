import { BLOCK_REGISTRY, type BlockId } from "./blocks";

export type Vec3 = readonly [number, number, number];

export interface AABB {
  readonly min: Vec3;
  readonly max: Vec3;
}

export interface CollisionContacts {
  readonly x: boolean;
  readonly y: boolean;
  readonly z: boolean;
}

export interface CollisionResult {
  readonly delta: Vec3;
  readonly contacts: CollisionContacts;
  readonly grounded: boolean;
}

export type BlockGetter = (x: number, y: number, z: number) => BlockId;

type Axis = 0 | 1 | 2;
type MutableVec3 = [number, number, number];

interface SweepResult {
  readonly movement: number;
  readonly contact: boolean;
}

const SWEEP_AXES: readonly Axis[] = [0, 2, 1];
const COLLISION_EPSILON = 0.0001;
const CELL_EPSILON = 1e-9;

export function resolveCollision(
  aabb: Readonly<AABB>,
  delta: Vec3,
  getBlock: BlockGetter
): CollisionResult {
  const min: MutableVec3 = [...aabb.min];
  const max: MutableVec3 = [...aabb.max];
  const resolved: MutableVec3 = [0, 0, 0];
  const contacts = { x: false, y: false, z: false };

  for (const axis of SWEEP_AXES) {
    const sweep = sweepAxis(min, max, axis, delta[axis], getBlock);

    resolved[axis] = sweep.movement;

    if (sweep.contact) {
      setContact(contacts, axis);
    }

    min[axis] += sweep.movement;
    max[axis] += sweep.movement;
  }

  return {
    delta: resolved,
    contacts,
    grounded: contacts.y && delta[1] < 0
  };
}

function sweepAxis(
  min: Readonly<MutableVec3>,
  max: Readonly<MutableVec3>,
  axis: Axis,
  desired: number,
  getBlock: BlockGetter
): SweepResult {
  if (desired === 0) {
    return { movement: 0, contact: false };
  }

  return desired > 0
    ? sweepPositive(min, max, axis, desired, getBlock)
    : sweepNegative(min, max, axis, desired, getBlock);
}

function sweepPositive(
  min: Readonly<MutableVec3>,
  max: Readonly<MutableVec3>,
  axis: Axis,
  desired: number,
  getBlock: BlockGetter
): SweepResult {
  const ranges = getRanges(min, max);
  ranges[axis] = {
    min: Math.floor(max[axis]),
    max: Math.floor(max[axis] + desired - CELL_EPSILON)
  };

  let movement = desired;
  let contact = false;

  forEachCell(ranges, (x, y, z) => {
    if (!isSolid(getBlock, x, y, z)) {
      return;
    }

    const blockMin = getAxisValue(axis, x, y, z);
    const candidate = Math.max(0, blockMin - max[axis] - COLLISION_EPSILON);

    if (candidate < movement) {
      movement = candidate;
      contact = true;
    }
  });

  return { movement, contact };
}

function sweepNegative(
  min: Readonly<MutableVec3>,
  max: Readonly<MutableVec3>,
  axis: Axis,
  desired: number,
  getBlock: BlockGetter
): SweepResult {
  const ranges = getRanges(min, max);
  ranges[axis] = {
    min: Math.floor(min[axis] + desired),
    max: Math.floor(min[axis] - CELL_EPSILON)
  };

  let movement = desired;
  let contact = false;

  forEachCell(ranges, (x, y, z) => {
    if (!isSolid(getBlock, x, y, z)) {
      return;
    }

    const blockMax = getAxisValue(axis, x, y, z) + 1;
    const candidate = Math.min(0, blockMax - min[axis] + COLLISION_EPSILON);

    if (candidate > movement) {
      movement = candidate;
      contact = true;
    }
  });

  return { movement, contact };
}

function isSolid(getBlock: BlockGetter, x: number, y: number, z: number): boolean {
  return BLOCK_REGISTRY[getBlock(x, y, z)].solid;
}

function setContact(contacts: { x: boolean; y: boolean; z: boolean }, axis: Axis): void {
  if (axis === 0) {
    contacts.x = true;
  } else if (axis === 1) {
    contacts.y = true;
  } else {
    contacts.z = true;
  }
}

function getAxisValue(axis: Axis, x: number, y: number, z: number): number {
  if (axis === 0) {
    return x;
  }

  if (axis === 1) {
    return y;
  }

  return z;
}

function getRanges(
  min: Readonly<MutableVec3>,
  max: Readonly<MutableVec3>
): MutableVec3Range {
  return [
    { min: Math.floor(min[0] + CELL_EPSILON), max: Math.floor(max[0] - CELL_EPSILON) },
    { min: Math.floor(min[1] + CELL_EPSILON), max: Math.floor(max[1] - CELL_EPSILON) },
    { min: Math.floor(min[2] + CELL_EPSILON), max: Math.floor(max[2] - CELL_EPSILON) }
  ];
}

interface CellRange {
  min: number;
  max: number;
}

type MutableVec3Range = [CellRange, CellRange, CellRange];

function forEachCell(ranges: Readonly<MutableVec3Range>, visit: BlockGetterVisit): void {
  for (let x = ranges[0].min; x <= ranges[0].max; x += 1) {
    for (let y = ranges[1].min; y <= ranges[1].max; y += 1) {
      for (let z = ranges[2].min; z <= ranges[2].max; z += 1) {
        visit(x, y, z);
      }
    }
  }
}

type BlockGetterVisit = (x: number, y: number, z: number) => void;
