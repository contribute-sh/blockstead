import * as THREE from "three";

export interface BlockTargetVoxel {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export function createBlockTargetMesh(): THREE.LineSegments {
  const geometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
  const material = new THREE.LineBasicMaterial({ color: 0xffffff });
  const mesh = new THREE.LineSegments(geometry, material);

  mesh.visible = false;

  return mesh;
}

export function setBlockTarget(
  mesh: THREE.LineSegments,
  voxel: BlockTargetVoxel | null
): void {
  if (voxel === null) {
    mesh.visible = false;
    return;
  }

  mesh.visible = true;
  mesh.position.set(voxel.x + 0.5, voxel.y + 0.5, voxel.z + 0.5);
}
