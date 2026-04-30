import { describe, expect, it } from "vitest";

import { restoreSavedGame, saveGame } from "../../src/app/persistence";
import { BlockId } from "../../src/sim/blocks";
import { SAVE_VERSION, serializeSave, type SaveState } from "../../src/sim/save";
import { createSimulation } from "../../src/sim/simulation";
import { getBlock } from "../../src/sim/world";
import type { SaveStatusIndicator, SaveStatusState } from "../../src/hud/saveStatus";

const SAVE_KEY = "blockstead:mvp-save";

class MemoryStorage implements Storage {
  [name: string]: unknown;

  private readonly values = new Map<string, string>();

  public get length(): number {
    return this.values.size;
  }

  public clear(): void {
    this.values.clear();
  }

  public getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  public key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  public removeItem(key: string): void {
    this.values.delete(key);
  }

  public setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function createSaveStatus(): SaveStatusIndicator & {
  readonly states: Array<{ state: SaveStatusState; detail?: string }>;
} {
  const states: Array<{ state: SaveStatusState; detail?: string }> = [];

  return {
    element: document.createElement("div"),
    states,
    setStatus(state, detail) {
      states.push({ state, detail });
    }
  };
}

function makeSaveState(overrides: Partial<SaveState> = {}): SaveState {
  return {
    version: SAVE_VERSION,
    seed: 1337,
    mutations: [
      { x: 1, y: 8, z: 1, block: BlockId.AIR },
      { x: 1, y: 9, z: 1, block: BlockId.DIRT }
    ],
    player: {
      position: [0.5, 12, 0.5],
      orientation: {
        yaw: 0,
        pitch: -1.05
      }
    },
    inventory: {
      slots: [
        { block: BlockId.WOOD, count: 1 },
        { block: BlockId.DIRT, count: 5 }
      ]
    },
    hotbar: {
      selected: 1
    },
    ...overrides
  };
}

describe("app persistence", () => {
  it("treats unavailable localStorage as no saved game", () => {
    const simulation = createSimulation({ seed: 1337 });

    expect(restoreSavedGame(simulation, null)).toBe(false);
  });

  it("reports an error status when saving without localStorage", () => {
    const simulation = createSimulation({ seed: 1337 });
    const status = createSaveStatus();

    expect(() => saveGame(simulation, null, status)).not.toThrow();
    expect(status.states).toEqual([
      { state: "error", detail: "localStorage unavailable" }
    ]);
  });

  it("restores saved world mutations into generated terrain", () => {
    const storage = new MemoryStorage();
    const saved = makeSaveState();
    const simulation = createSimulation({ seed: 1337 });

    storage.setItem(SAVE_KEY, serializeSave(saved));

    expect(restoreSavedGame(simulation, storage)).toBe(true);
    expect(getBlock(simulation.world, 1, 8, 1)).toBe(BlockId.AIR);
    expect(getBlock(simulation.world, 1, 9, 1)).toBe(BlockId.DIRT);
    expect(simulation.mutations).toEqual(saved.mutations);
  });

  it("saves current world mutations instead of dropping them", () => {
    const storage = new MemoryStorage();
    const saved = makeSaveState({
      mutations: [{ x: 2, y: 8, z: 2, block: BlockId.PLANKS }]
    });
    const simulation = createSimulation({ seed: 1337 });
    const status = createSaveStatus();

    storage.setItem(SAVE_KEY, serializeSave(saved));
    restoreSavedGame(simulation, storage);
    saveGame(simulation, storage, status);

    const raw = storage.getItem(SAVE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw ?? "{}") as SaveState;
    expect(parsed.mutations).toEqual(saved.mutations);
    expect(status.states.at(-1)).toEqual({ state: "saved", detail: "local save" });
  });
});
