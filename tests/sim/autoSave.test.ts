import { describe, expect, it } from "vitest";

import { BlockId } from "../../src/sim/blocks";
import { createAutoSaver } from "../../src/sim/autoSave";
import { SAVE_VERSION, type SaveState } from "../../src/sim/save";
import type { SaveStorageResult } from "../../src/sim/saveStorage";

const snapshot: SaveState = {
  version: SAVE_VERSION,
  seed: 12345,
  mutations: [
    { x: 1, y: 2, z: 3, block: BlockId.DIRT }
  ],
  player: {
    position: [4, 5, 6],
    orientation: {
      yaw: 0.5,
      pitch: -0.25
    }
  },
  inventory: {
    slots: [
      { block: BlockId.GRASS, count: 4 },
      null
    ]
  },
  hotbar: {
    selected: 0
  }
};

function createClock(start = 0): {
  now: () => number;
  advance: (ms: number) => void;
  set: (value: number) => void;
} {
  let current = start;

  return {
    now: () => current,
    advance: (ms: number) => {
      current += ms;
    },
    set: (value: number) => {
      current = value;
    }
  };
}

describe("auto-save scheduler", () => {
  it("does not save on tick when state is not dirty", () => {
    const clock = createClock();
    let saveCount = 0;
    const autoSaver = createAutoSaver({
      intervalMs: 1000,
      now: clock.now,
      save: () => {
        saveCount += 1;
        return { ok: true };
      }
    });

    clock.advance(1000);
    autoSaver.tick(snapshot);

    expect(saveCount).toBe(0);
    expect(autoSaver.getStatus()).toEqual({ state: "idle", lastSavedAt: null });
  });

  it("flushes dirty state after intervalMs elapses", () => {
    const clock = createClock();
    let saveCount = 0;
    const autoSaver = createAutoSaver({
      intervalMs: 1000,
      now: clock.now,
      save: () => {
        saveCount += 1;
        return { ok: true };
      }
    });

    autoSaver.markDirty();
    autoSaver.tick(snapshot);
    clock.advance(999);
    autoSaver.tick(snapshot);
    clock.advance(1);
    autoSaver.tick(snapshot);

    expect(saveCount).toBe(1);
    expect(autoSaver.getStatus()).toEqual({ state: "saved", lastSavedAt: 1000 });
  });

  it("flushes after dirtyTickThreshold ticks even before intervalMs elapses", () => {
    const clock = createClock();
    let saveCount = 0;
    const autoSaver = createAutoSaver({
      intervalMs: 1000,
      dirtyTickThreshold: 3,
      now: clock.now,
      save: () => {
        saveCount += 1;
        return { ok: true };
      }
    });

    autoSaver.markDirty();
    autoSaver.tick(snapshot);
    autoSaver.tick(snapshot);
    autoSaver.tick(snapshot);

    expect(saveCount).toBe(1);
    expect(autoSaver.getStatus()).toEqual({ state: "saved", lastSavedAt: 0 });
  });

  it("exposes saving during synchronous successful saves before settling as saved", () => {
    const clock = createClock();
    const observedStates: Array<string> = [];
    let autoSaver: ReturnType<typeof createAutoSaver> | null = null;

    autoSaver = createAutoSaver({
      intervalMs: 0,
      now: clock.now,
      save: () => {
        if (autoSaver === null) {
          throw new Error("autoSaver was not initialized");
        }

        observedStates.push(autoSaver.getStatus().state);
        return { ok: true };
      }
    });

    expect(autoSaver.getStatus()).toEqual({ state: "idle", lastSavedAt: null });

    autoSaver.markDirty();
    autoSaver.tick(snapshot);

    expect(observedStates).toEqual(["saving"]);
    expect(autoSaver.getStatus()).toEqual({ state: "saved", lastSavedAt: 0 });
  });

  it("sets error status detail from quota_exceeded storage failures", () => {
    const clock = createClock();
    const autoSaver = createAutoSaver({
      intervalMs: 0,
      now: clock.now,
      save: () => ({ ok: false, error: "quota_exceeded" })
    });

    autoSaver.markDirty();
    autoSaver.tick(snapshot);

    expect(autoSaver.getStatus()).toEqual({
      state: "error",
      lastSavedAt: null,
      detail: "quota_exceeded"
    });
  });

  it("advances lastSavedAt only after successful saves", () => {
    const clock = createClock(10);
    const results: Array<SaveStorageResult> = [
      { ok: true },
      { ok: false, error: "quota_exceeded" },
      { ok: true }
    ];
    const autoSaver = createAutoSaver({
      intervalMs: 5,
      now: clock.now,
      save: () => results.shift() ?? { ok: true }
    });

    autoSaver.forceSave(snapshot);
    expect(autoSaver.getStatus()).toEqual({ state: "saved", lastSavedAt: 10 });

    clock.set(20);
    autoSaver.markDirty();
    autoSaver.tick(snapshot);
    expect(autoSaver.getStatus()).toEqual({
      state: "error",
      lastSavedAt: 10,
      detail: "quota_exceeded"
    });

    clock.set(30);
    autoSaver.tick(snapshot);
    expect(autoSaver.getStatus()).toEqual({ state: "saved", lastSavedAt: 30 });
  });

  it("forceSave bypasses interval and dirty tick gates", () => {
    const clock = createClock();
    let saveCount = 0;
    const autoSaver = createAutoSaver({
      intervalMs: 1000,
      dirtyTickThreshold: 10,
      now: clock.now,
      save: () => {
        saveCount += 1;
        return { ok: true };
      }
    });

    autoSaver.forceSave(snapshot);

    expect(saveCount).toBe(1);
    expect(autoSaver.getStatus()).toEqual({ state: "saved", lastSavedAt: 0 });
  });

  it("gates repeated successful saves from the most recent save time", () => {
    const clock = createClock();
    let saveCount = 0;
    const autoSaver = createAutoSaver({
      intervalMs: 1000,
      now: clock.now,
      save: () => {
        saveCount += 1;
        return { ok: true };
      }
    });

    autoSaver.markDirty();
    clock.set(1000);
    autoSaver.tick(snapshot);

    autoSaver.markDirty();
    clock.set(1500);
    autoSaver.tick(snapshot);
    clock.set(1999);
    autoSaver.tick(snapshot);
    clock.set(2000);
    autoSaver.tick(snapshot);

    expect(saveCount).toBe(2);
    expect(autoSaver.getStatus()).toEqual({ state: "saved", lastSavedAt: 2000 });
  });
});
