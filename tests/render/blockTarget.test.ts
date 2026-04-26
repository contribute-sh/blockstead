import * as THREE from "three";
import { describe, expect, it } from "vitest";

import {
  createBlockTargetMesh,
  setBlockTarget
} from "../../src/render/blockTarget";

describe("block target mesh", () => {
  it("creates a hidden unit-cube wireframe", () => {
    const mesh = createBlockTargetMesh();

    expect(mesh).toBeInstanceOf(THREE.LineSegments);
    expect(mesh.geometry).toBeInstanceOf(THREE.EdgesGeometry);
    expect(mesh.visible).toBe(false);
  });

  it("positions the target around integer voxel coordinates", () => {
    const mesh = createBlockTargetMesh();

    setBlockTarget(mesh, { x: 3, y: 5, z: -2 });

    expect(mesh.visible).toBe(true);
    expect(mesh.position.toArray()).toEqual([3.5, 5.5, -1.5]);
  });

  it("hides the target without moving it", () => {
    const mesh = createBlockTargetMesh();

    setBlockTarget(mesh, { x: 3, y: 5, z: -2 });
    setBlockTarget(mesh, null);

    expect(mesh.visible).toBe(false);
    expect(mesh.position.toArray()).toEqual([3.5, 5.5, -1.5]);
  });
});
