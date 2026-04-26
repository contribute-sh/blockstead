import * as THREE from "three";

const DEFAULT_PLAYER_CAMERA_FOV = 70;
const DEFAULT_PLAYER_CAMERA_ASPECT = 1;
const DEFAULT_PLAYER_CAMERA_NEAR = 0.1;
const DEFAULT_PLAYER_CAMERA_FAR = 1000;

type PlayerCameraOptions = {
  readonly fov?: number;
  readonly aspect?: number;
  readonly near?: number;
  readonly far?: number;
};

export type PlayerPose = {
  readonly position:
    | { readonly x: number; readonly y: number; readonly z: number }
    | readonly [number, number, number];
  readonly yaw: number;
  readonly pitch: number;
};

function isTuplePosition(
  position: PlayerPose["position"]
): position is readonly [number, number, number] {
  return Array.isArray(position);
}

export function createPlayerCamera(
  options: PlayerCameraOptions = {}
): THREE.PerspectiveCamera {
  return new THREE.PerspectiveCamera(
    options.fov ?? DEFAULT_PLAYER_CAMERA_FOV,
    options.aspect ?? DEFAULT_PLAYER_CAMERA_ASPECT,
    options.near ?? DEFAULT_PLAYER_CAMERA_NEAR,
    options.far ?? DEFAULT_PLAYER_CAMERA_FAR
  );
}

export function applyPlayerPose(
  camera: THREE.PerspectiveCamera,
  pose: PlayerPose
): void {
  const { position } = pose;

  if (isTuplePosition(position)) {
    camera.position.set(position[0], position[1], position[2]);
  } else {
    camera.position.set(position.x, position.y, position.z);
  }

  camera.rotation.set(pose.pitch, pose.yaw, 0, "YXZ");
}
