import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { applyPlayerPose, createPlayerCamera } from "../../src/render/camera";

function snapshotStableCameraFields(camera: THREE.PerspectiveCamera) {
  return {
    aspect: camera.aspect,
    far: camera.far,
    filmGauge: camera.filmGauge,
    filmOffset: camera.filmOffset,
    focus: camera.focus,
    fov: camera.fov,
    frustumCulled: camera.frustumCulled,
    layersMask: camera.layers.mask,
    matrixAutoUpdate: camera.matrixAutoUpdate,
    matrixWorldAutoUpdate: camera.matrixWorldAutoUpdate,
    name: camera.name,
    near: camera.near,
    renderOrder: camera.renderOrder,
    scale: camera.scale.toArray(),
    type: camera.type,
    up: camera.up.toArray(),
    visible: camera.visible,
    zoom: camera.zoom
  };
}

describe("createPlayerCamera", () => {
  it("applies player camera defaults", () => {
    const camera = createPlayerCamera();

    expect(camera).toBeInstanceOf(THREE.PerspectiveCamera);
    expect(camera.fov).toBe(70);
    expect(camera.aspect).toBe(1);
    expect(camera.near).toBe(0.1);
    expect(camera.far).toBe(1000);
  });

  it("applies player camera option overrides", () => {
    const camera = createPlayerCamera({
      aspect: 16 / 9,
      far: 500,
      fov: 80,
      near: 0.25
    });

    expect(camera.fov).toBe(80);
    expect(camera.aspect).toBe(16 / 9);
    expect(camera.near).toBe(0.25);
    expect(camera.far).toBe(500);
  });
});

describe("applyPlayerPose", () => {
  it("mutates the existing position and rotation without changing stable fields", () => {
    const camera = createPlayerCamera({
      aspect: 4 / 3,
      far: 750,
      fov: 75,
      near: 0.2
    });
    camera.name = "player-camera";
    camera.scale.set(2, 2, 2);
    camera.zoom = 1.25;

    const position = camera.position;
    const rotation = camera.rotation;
    const stableFields = snapshotStableCameraFields(camera);

    applyPlayerPose(camera, {
      position: { x: 3, y: 4, z: 5 },
      yaw: 0.5,
      pitch: -0.25
    });

    expect(camera.position).toBe(position);
    expect(camera.rotation).toBe(rotation);
    expect(snapshotStableCameraFields(camera)).toEqual(stableFields);
    expect(camera.position.toArray()).toEqual([3, 4, 5]);
    expect(camera.rotation.order).toBe("YXZ");
    expect(camera.rotation.x).toBeCloseTo(-0.25);
    expect(camera.rotation.y).toBeCloseTo(0.5);
    expect(camera.rotation.z).toBe(0);
  });

  it("maps yaw around Y while zero pitch keeps the camera level", () => {
    const camera = createPlayerCamera();
    const direction = new THREE.Vector3();

    applyPlayerPose(camera, {
      position: [0, 0, 0],
      yaw: Math.PI / 2,
      pitch: 0
    });

    camera.getWorldDirection(direction);

    expect(camera.rotation.order).toBe("YXZ");
    expect(camera.rotation.x).toBeCloseTo(0);
    expect(camera.rotation.y).toBeCloseTo(Math.PI / 2);
    expect(camera.rotation.z).toBeCloseTo(0);
    expect(direction.x).toBeCloseTo(-1);
    expect(direction.y).toBeCloseTo(0);
    expect(direction.z).toBeCloseTo(0);
  });
});
