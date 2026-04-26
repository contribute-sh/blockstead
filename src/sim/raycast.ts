import { getBlockDefinition, type BlockId } from "./blocks";

export type Vec3 = readonly [number, number, number];

export interface Vec3Object {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export type Vec3Like = Vec3 | Vec3Object;
export type BlockGetter = (x: number, y: number, z: number) => BlockId;
export type AxisDirection = -1 | 0 | 1;
export type FaceNormal = readonly [AxisDirection, AxisDirection, AxisDirection];

export interface RaycastHit {
  readonly block: Vec3;
  readonly placement: Vec3;
  readonly normal: FaceNormal;
  readonly distance: number;
}

type Axis = 0 | 1 | 2;
type MutableVec3 = [number, number, number];
type MutableStepVec3 = [AxisDirection, AxisDirection, AxisDirection];

export function raycast(
  origin: Vec3Like,
  direction: Vec3,
  maxDistance: number,
  getBlock: BlockGetter
): RaycastHit | null {
  const originVec = toVec3(origin);
  const voxel: MutableVec3 = [
    Math.floor(originVec[0]),
    Math.floor(originVec[1]),
    Math.floor(originVec[2])
  ];

  if (isSolid(getBlock, voxel)) {
    return {
      block: [...voxel],
      placement: [...voxel],
      normal: [0, 0, 0],
      distance: 0
    };
  }

  if (!Number.isFinite(maxDistance) || maxDistance < 0) {
    return null;
  }

  const step: MutableStepVec3 = [
    getStep(direction[0]),
    getStep(direction[1]),
    getStep(direction[2])
  ];
  const tDelta: MutableVec3 = [
    getTDelta(direction[0]),
    getTDelta(direction[1]),
    getTDelta(direction[2])
  ];
  const tMax: MutableVec3 = [
    getInitialTMax(originVec[0], voxel[0], direction[0], step[0]),
    getInitialTMax(originVec[1], voxel[1], direction[1], step[1]),
    getInitialTMax(originVec[2], voxel[2], direction[2], step[2])
  ];

  let distance = 0;

  while (distance <= maxDistance) {
    const axis = getNextAxis(tMax);
    distance = tMax[axis];

    if (distance > maxDistance) {
      return null;
    }

    const placement: MutableVec3 = [...voxel];
    voxel[axis] += step[axis];

    if (isSolid(getBlock, voxel)) {
      return {
        block: [...voxel],
        placement,
        normal: getNormal(axis, step[axis]),
        distance
      };
    }

    tMax[axis] += tDelta[axis];
  }

  return null;
}

function toVec3(value: Vec3Like): Vec3 {
  if ("x" in value) {
    return [value.x, value.y, value.z];
  }

  return value;
}

function getStep(value: number): AxisDirection {
  if (value > 0) {
    return 1;
  }

  if (value < 0) {
    return -1;
  }

  return 0;
}

function getTDelta(direction: number): number {
  if (direction === 0) {
    return Infinity;
  }

  return Math.abs(1 / direction);
}

function getInitialTMax(
  origin: number,
  voxel: number,
  direction: number,
  step: AxisDirection
): number {
  if (step > 0) {
    return (voxel + 1 - origin) / direction;
  }

  if (step < 0) {
    return (origin - voxel) / -direction;
  }

  return Infinity;
}

function getNextAxis(tMax: Readonly<MutableVec3>): Axis {
  if (tMax[0] <= tMax[1] && tMax[0] <= tMax[2]) {
    return 0;
  }

  if (tMax[1] <= tMax[2]) {
    return 1;
  }

  return 2;
}

function getNormal(axis: Axis, step: AxisDirection): FaceNormal {
  const normalStep = invertStep(step);

  if (axis === 0) {
    return [normalStep, 0, 0];
  }

  if (axis === 1) {
    return [0, normalStep, 0];
  }

  return [0, 0, normalStep];
}

function invertStep(step: AxisDirection): AxisDirection {
  if (step === 1) {
    return -1;
  }

  if (step === -1) {
    return 1;
  }

  return 0;
}

function isSolid(getBlock: BlockGetter, voxel: Readonly<MutableVec3>): boolean {
  return getBlockDefinition(getBlock(voxel[0], voxel[1], voxel[2])).solid;
}
