export interface PlayerLookPose {
  readonly yaw: number;
  readonly pitch: number;
}

export interface MouseLookDelta {
  readonly x: number;
  readonly y: number;
}

export interface ApplyLookDeltaOptions {
  readonly pitchLimit?: number;
}

const FULL_TURN = Math.PI * 2;

export const PITCH_LIMIT = Math.PI / 2 - Math.PI / 180;

export function applyLookDelta(
  pose: Readonly<PlayerLookPose>,
  mouseDelta: Readonly<MouseLookDelta>,
  sensitivity: number,
  options: Readonly<ApplyLookDeltaOptions> = {}
): PlayerLookPose {
  const pitchLimit = options.pitchLimit ?? PITCH_LIMIT;

  return {
    yaw: wrapYaw(pose.yaw + mouseDelta.x * sensitivity),
    pitch: clamp(pose.pitch + mouseDelta.y * sensitivity, -pitchLimit, pitchLimit)
  };
}

function wrapYaw(yaw: number): number {
  if (yaw >= -Math.PI && yaw <= Math.PI) {
    return yaw;
  }

  const wrapped = ((((yaw + Math.PI) % FULL_TURN) + FULL_TURN) % FULL_TURN) - Math.PI;

  return wrapped === -Math.PI && yaw > Math.PI ? Math.PI : wrapped;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
