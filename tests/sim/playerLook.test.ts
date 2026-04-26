import { describe, expect, it } from "vitest";

import {
  applyLookDelta,
  PITCH_LIMIT,
  type PlayerLookPose
} from "../../src/sim/playerLook";

describe("player look controller", () => {
  it("wraps yaw from just below pi across the positive boundary", () => {
    const next = applyLookDelta({ yaw: Math.PI - 0.01, pitch: 0 }, { x: 0.02, y: 0 }, 1);

    expect(next.yaw).toBeGreaterThanOrEqual(-Math.PI);
    expect(next.yaw).toBeLessThanOrEqual(Math.PI);
    expect(next.yaw).toBeCloseTo(-Math.PI + 0.01);
  });

  it("wraps yaw symmetrically across the negative boundary", () => {
    const next = applyLookDelta({ yaw: -Math.PI + 0.01, pitch: 0 }, { x: -0.02, y: 0 }, 1);

    expect(next.yaw).toBeGreaterThanOrEqual(-Math.PI);
    expect(next.yaw).toBeLessThanOrEqual(Math.PI);
    expect(next.yaw).toBeCloseTo(Math.PI - 0.01);
  });

  it("clamps pitch to the positive limit", () => {
    const next = applyLookDelta({ yaw: 0, pitch: PITCH_LIMIT - 0.01 }, { x: 0, y: 1 }, 1);

    expect(next.pitch).toBe(PITCH_LIMIT);
  });

  it("clamps pitch to the negative limit", () => {
    const next = applyLookDelta({ yaw: 0, pitch: -PITCH_LIMIT + 0.01 }, { x: 0, y: -1 }, 1);

    expect(next.pitch).toBe(-PITCH_LIMIT);
  });

  it("scales yaw and pitch deltas linearly with sensitivity", () => {
    const next = applyLookDelta({ yaw: 0.1, pitch: -0.2 }, { x: 0.2, y: -0.1 }, 2);

    expect(next.yaw).toBeCloseTo(0.5);
    expect(next.pitch).toBeCloseTo(-0.4);
  });

  it("allows callers to override the pitch limit", () => {
    const next = applyLookDelta({ yaw: 0, pitch: 0 }, { x: 0, y: 1 }, 1, { pitchLimit: 0.5 });

    expect(next.pitch).toBe(0.5);
  });

  it("returns an equal new pose for zero mouse delta without mutating input", () => {
    const pose: PlayerLookPose = { yaw: 0.75, pitch: -0.25 };
    const snapshot = { ...pose };
    const next = applyLookDelta(pose, { x: 0, y: 0 }, 4);

    expect(next).toEqual(pose);
    expect(next).not.toBe(pose);
    expect(pose).toEqual(snapshot);
  });
});
