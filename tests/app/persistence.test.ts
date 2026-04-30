import { describe, expect, it } from "vitest";

import { createApp, seedStarterInventory, type AppRenderer } from "../../src/app";
import { restoreSavedGame, saveGame } from "../../src/app/persistence";
import { BlockId } from "../../src/sim/blocks";
import { SAVE_VERSION, serializeSave, type SaveState } from "../../src/sim/save";
import { createSimulation } from "../../src/sim/simulation";
import { getBlock } from "../../src/sim/world";
import type { SaveStatusIndicator, SaveStatusState } from "../../src/hud/saveStatus";

const SAVE_KEY = "blockstead:mvp-save";
const UNAPPLIED_MUTATION = { x: 2, y: 15, z: 2, block: BlockId.PLANKS } as const;

type Simulation = ReturnType<typeof createSimulation>;

interface SimulationSnapshot {
  readonly position: Simulation["player"]["position"];
  readonly yaw: number;
  readonly pitch: number;
  readonly selectedHotbarSlot: number;
  readonly inventory: Simulation["inventory"];
  readonly mutations: Simulation["mutations"];
  readonly worldProbeBlock: BlockId;
}

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

function createTestRenderer(): AppRenderer {
  return {
    domElement: document.createElement("canvas"),
    render() {},
    setSize() {}
  };
}

function getByTestId(root: ParentNode, testId: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(`[data-testid="${testId}"]`);

  if (element === null) {
    throw new Error(`Missing element with test id "${testId}".`);
  }

  return element;
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

function snapshotSimulation(simulation: Simulation): SimulationSnapshot {
  return {
    position: [...simulation.player.position],
    yaw: simulation.player.yaw,
    pitch: simulation.player.pitch,
    selectedHotbarSlot: simulation.selectedHotbarSlot,
    inventory: {
      slots: simulation.inventory.slots.map((slot) =>
        slot === null ? null : { id: slot.id, count: slot.count }
      ),
      selectedHotbarSlot: simulation.inventory.selectedHotbarSlot
    },
    mutations: simulation.mutations.map((mutation) => ({ ...mutation })),
    worldProbeBlock: getBlock(
      simulation.world,
      UNAPPLIED_MUTATION.x,
      UNAPPLIED_MUTATION.y,
      UNAPPLIED_MUTATION.z
    )
  };
}

function expectSimulationToMatchSnapshot(
  simulation: Simulation,
  snapshot: SimulationSnapshot
): void {
  expect(simulation.player.position).toEqual(snapshot.position);
  expect(simulation.player.yaw).toBe(snapshot.yaw);
  expect(simulation.player.pitch).toBe(snapshot.pitch);
  expect(simulation.selectedHotbarSlot).toBe(snapshot.selectedHotbarSlot);
  expect(simulation.inventory).toEqual(snapshot.inventory);
  expect(simulation.mutations).toEqual(snapshot.mutations);
  expect(
    getBlock(
      simulation.world,
      UNAPPLIED_MUTATION.x,
      UNAPPLIED_MUTATION.y,
      UNAPPLIED_MUTATION.z
    )
  ).toBe(snapshot.worldProbeBlock);
}

function expectStarterInventory(simulation: Simulation): void {
  expect(simulation.inventory.slots.filter((slot) => slot !== null)).toEqual([
    { id: BlockId.WOOD, count: 2 },
    { id: BlockId.DIRT, count: 6 }
  ]);
  expect(simulation.inventory.selectedHotbarSlot).toBe(0);
  expect(simulation.selectedHotbarSlot).toBe(0);
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

  describe("restoreSavedGame invalid save payloads", () => {
    const invalidPayloads = [
      { name: "a non-JSON string", payload: "not-json" },
      { name: "a JSON array", payload: "[]" },
      { name: "a JSON number", payload: "42" },
      {
        name: "an object missing required top-level fields",
        payload: JSON.stringify({ version: SAVE_VERSION, seed: 1337 })
      },
      {
        name: "an object missing nested player fields",
        payload: JSON.stringify({
          ...makeSaveState({ mutations: [UNAPPLIED_MUTATION] }),
          player: { position: [0.5, 12, 0.5] }
        })
      },
      {
        name: "an object missing nested inventory fields",
        payload: JSON.stringify({
          ...makeSaveState({ mutations: [UNAPPLIED_MUTATION] }),
          inventory: { slots: [{ block: BlockId.WOOD }] }
        })
      },
      {
        name: "an object missing nested mutation fields",
        payload: JSON.stringify({
          ...makeSaveState({ mutations: [UNAPPLIED_MUTATION] }),
          mutations: [
            {
              x: UNAPPLIED_MUTATION.x,
              y: UNAPPLIED_MUTATION.y,
              z: UNAPPLIED_MUTATION.z
            }
          ]
        })
      },
      {
        name: "a future-version sentinel",
        payload: serializeSave(
          makeSaveState({
            version: SAVE_VERSION + 1,
            mutations: [UNAPPLIED_MUTATION]
          })
        )
      }
    ] satisfies ReadonlyArray<{ readonly name: string; readonly payload: string }>;

    it.each(invalidPayloads)("rejects $name without touching a fresh game", ({ payload }) => {
      const storage = new MemoryStorage();
      const simulation = createSimulation({ seed: 1337 });
      const snapshot = snapshotSimulation(simulation);
      let restored = true;

      storage.setItem(SAVE_KEY, payload);

      expect(() => {
        restored = restoreSavedGame(simulation, storage);
      }).not.toThrow();
      expect(restored).toBe(false);
      expectSimulationToMatchSnapshot(simulation, snapshot);

      seedStarterInventory(simulation);
      expectStarterInventory(simulation);

      const appStorage = new MemoryStorage();
      appStorage.setItem(SAVE_KEY, payload);
      const app = createApp({
        rendererFactory: createTestRenderer,
        getLocalStorage: () => appStorage
      });

      try {
        expect(getByTestId(app.element, "hud-world-status").textContent).toBe("Ready");
        expect(getByTestId(app.element, "hud-world-status").textContent).not.toBe(
          "Loaded saved world"
        );
        expectStarterInventory(app.simulation);
      } finally {
        app.dispose();
      }
    });
  });
});
