import { describe, expect, it } from "vitest";

import { applyIntent, createPlayer, type Player, type PlayerIntent } from "../../src/sim/player";

const neutralIntent: PlayerIntent = {
  moveX: 0,
  moveZ: 0,
  deltaYaw: 0,
  deltaPitch: 0,
  hotbarDelta: 0
};

function apply(player: Player, intent: Partial<PlayerIntent>): Player {
  return applyIntent(player, { ...neutralIntent, ...intent }, 1);
}

describe("player state", () => {
  it("creates the documented default state", () => {
    expect(createPlayer()).toEqual({
      position: [0, 0, 0],
      velocity: [0, 0, 0],
      yaw: 0,
      pitch: 0,
      selectedHotbarSlot: 0
    });
  });

  it("creates a fresh object on each call", () => {
    const first = createPlayer();
    const second = createPlayer();

    expect(first).not.toBe(second);
    expect(first.position).not.toBe(second.position);
    expect(first.velocity).not.toBe(second.velocity);
  });

  it("applies intent without mutating its input", () => {
    const player: Player = {
      position: [1, 2, 3],
      velocity: [0.5, 0, -0.25],
      yaw: 0.25,
      pitch: -0.25,
      selectedHotbarSlot: 4
    };
    const snapshot: Player = {
      position: [...player.position],
      velocity: [...player.velocity],
      yaw: player.yaw,
      pitch: player.pitch,
      selectedHotbarSlot: player.selectedHotbarSlot
    };
    const next = applyIntent(
      player,
      {
        moveX: 1,
        moveZ: -1,
        deltaYaw: 0.5,
        deltaPitch: 0.25,
        hotbarDelta: 2
      },
      0.5
    );

    expect(next).not.toBe(player);
    expect(next.position).not.toBe(player.position);
    expect(next.velocity).not.toBe(player.velocity);
    expect(player).toEqual(snapshot);
  });

  it("clamps pitch at positive half pi", () => {
    const player = { ...createPlayer(), pitch: Math.PI / 2 - 0.01 };
    const next = apply(player, { deltaPitch: 1 });

    expect(next.pitch).toBe(Math.PI / 2);
  });

  it("clamps pitch at negative half pi", () => {
    const player = { ...createPlayer(), pitch: -Math.PI / 2 + 0.01 };
    const next = apply(player, { deltaPitch: -1 });

    expect(next.pitch).toBe(-Math.PI / 2);
  });

  it("wraps the selected hotbar slot forward from 8 to 0", () => {
    const player = { ...createPlayer(), selectedHotbarSlot: 8 };
    const next = apply(player, { hotbarDelta: 1 });

    expect(next.selectedHotbarSlot).toBe(0);
  });

  it("wraps the selected hotbar slot backward from 0 to 8", () => {
    const next = apply(createPlayer(), { hotbarDelta: -1 });

    expect(next.selectedHotbarSlot).toBe(8);
  });

  it("wraps the selected hotbar slot for larger deltas", () => {
    const next = apply(createPlayer(), { hotbarDelta: 10 });

    expect(next.selectedHotbarSlot).toBe(1);
  });
});
