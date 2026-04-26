import * as THREE from "three";

export const DEFAULT_FOG_COLOR = 0x9ec7e8;
export const DEFAULT_FOG_NEAR = 24;
export const DEFAULT_FOG_FAR = 128;
export const DEFAULT_AMBIENT_LIGHT_INTENSITY = 0.75;
export const DEFAULT_SUN_LIGHT_INTENSITY = 1.2;

export function createScene(): THREE.Scene {
  const scene = new THREE.Scene();

  scene.background = new THREE.Color(DEFAULT_FOG_COLOR);
  scene.fog = new THREE.Fog(
    DEFAULT_FOG_COLOR,
    DEFAULT_FOG_NEAR,
    DEFAULT_FOG_FAR
  );

  const ambientLight = new THREE.HemisphereLight(
    0xeaf6ff,
    0x52624a,
    DEFAULT_AMBIENT_LIGHT_INTENSITY
  );
  const sunLight = new THREE.DirectionalLight(
    0xffffff,
    DEFAULT_SUN_LIGHT_INTENSITY
  );

  sunLight.position.set(32, 48, 24);
  scene.add(ambientLight, sunLight);

  return scene;
}
