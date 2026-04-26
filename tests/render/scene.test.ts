import * as THREE from "three";
import { describe, expect, it } from "vitest";

import {
  createScene,
  DEFAULT_AMBIENT_LIGHT_INTENSITY,
  DEFAULT_FOG_COLOR,
  DEFAULT_FOG_FAR,
  DEFAULT_FOG_NEAR,
  DEFAULT_SUN_LIGHT_INTENSITY
} from "../../src/render/scene";

function getLights(scene: THREE.Scene): THREE.Light[] {
  return scene.children.filter(
    (child): child is THREE.Light => child instanceof THREE.Light
  );
}

describe("createScene", () => {
  it("returns a Three.js scene", () => {
    expect(createScene()).toBeInstanceOf(THREE.Scene);
  });

  it("adds default presentation lights", () => {
    const lights = getLights(createScene());
    const ambientLight = lights.find(
      (light): light is THREE.HemisphereLight =>
        light instanceof THREE.HemisphereLight
    );
    const sunLight = lights.find(
      (light): light is THREE.DirectionalLight =>
        light instanceof THREE.DirectionalLight
    );

    expect(lights.length).toBeGreaterThanOrEqual(1);
    expect(ambientLight?.intensity).toBe(DEFAULT_AMBIENT_LIGHT_INTENSITY);
    expect(sunLight?.intensity).toBe(DEFAULT_SUN_LIGHT_INTENSITY);
  });

  it("sets the default voxel fog", () => {
    const fog = createScene().fog;

    expect(fog).toBeInstanceOf(THREE.Fog);
    if (!(fog instanceof THREE.Fog)) {
      throw new Error("Expected scene fog to be THREE.Fog");
    }

    expect(fog.color.getHex()).toBe(DEFAULT_FOG_COLOR);
    expect(fog.near).toBe(DEFAULT_FOG_NEAR);
    expect(fog.far).toBe(DEFAULT_FOG_FAR);
  });

  it("creates independent scene instances", () => {
    const first = createScene();
    const second = createScene();
    const secondChildCount = second.children.length;

    expect(first).not.toBe(second);
    expect(first.fog).not.toBe(second.fog);
    expect(getLights(first)[0]).not.toBe(getLights(second)[0]);

    first.add(new THREE.Object3D());
    expect(second.children).toHaveLength(secondChildCount);

    if (!(first.fog instanceof THREE.Fog) || !(second.fog instanceof THREE.Fog)) {
      throw new Error("Expected scene fog to be THREE.Fog");
    }

    first.fog.color.setHex(0x000000);
    expect(second.fog.color.getHex()).toBe(DEFAULT_FOG_COLOR);
  });
});
