import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createApp, type App, type AppRenderer } from "../../src/app";
import { BlockId } from "../../src/sim/blocks";
import type { Inventory } from "../../src/sim/inventory";
import { SAVE_VERSION, serializeSave, type SaveState } from "../../src/sim/save";

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

const apps: App[] = [];

function createTestRenderer(): AppRenderer {
  return {
    domElement: document.createElement("canvas"),
    render() {},
    setSize() {}
  };
}

function createTrackedApp(storage: Storage | null): App {
  const app = createApp({
    rendererFactory: createTestRenderer,
    getLocalStorage: () => storage
  });

  apps.push(app);

  return app;
}

function getByTestId(root: ParentNode, testId: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(`[data-testid="${testId}"]`);

  if (element === null) {
    throw new Error(`Missing element with test id "${testId}".`);
  }

  return element;
}

function countItem(inventory: Inventory, block: BlockId): number {
  return inventory.slots.reduce(
    (total, slot) => (slot?.id === block ? total + slot.count : total),
    0
  );
}

function createSavedState(): SaveState {
  const slots: SaveState["inventory"]["slots"] = Array.from(
    { length: 36 },
    (): SaveState["inventory"]["slots"][number] => null
  );

  slots[0] = { block: BlockId.STONE, count: 3 };
  slots[5] = { block: BlockId.WOOD, count: 1 };

  return {
    version: SAVE_VERSION,
    seed: 1337,
    mutations: [],
    player: {
      position: [9.25, 10.5, -3.75],
      orientation: {
        yaw: 0.5,
        pitch: -0.25
      }
    },
    inventory: {
      slots
    },
    hotbar: {
      selected: 5
    }
  };
}

describe("createApp persistence branch", () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  afterEach(() => {
    for (const app of apps.splice(0)) {
      app.dispose();
    }
  });

  it("loads a valid save without applying the starter inventory seed", () => {
    const storage = new MemoryStorage();
    const saved = createSavedState();

    storage.setItem(SAVE_KEY, serializeSave(saved));

    const app = createTrackedApp(storage);
    const saveStatus = getByTestId(app.element, "hud-save-status");

    expect(saveStatus.dataset.state).toBe("loaded");
    expect(app.simulation.player.position).toEqual(saved.player.position);
    expect(app.simulation.selectedHotbarSlot).toBe(saved.hotbar.selected);
    expect(app.simulation.inventory.selectedHotbarSlot).toBe(saved.hotbar.selected);
    expect(app.simulation.inventory.slots).toEqual([
      { id: BlockId.STONE, count: 3 },
      null,
      null,
      null,
      null,
      { id: BlockId.WOOD, count: 1 },
      ...Array.from({ length: 30 }, () => null)
    ]);
    expect(countItem(app.simulation.inventory, BlockId.WOOD)).toBe(1);
    expect(countItem(app.simulation.inventory, BlockId.DIRT)).toBe(0);
  });

  it("seeds a fresh startup with the starter inventory", () => {
    const app = createTrackedApp(new MemoryStorage());

    expect(countItem(app.simulation.inventory, BlockId.WOOD)).toBe(2);
    expect(countItem(app.simulation.inventory, BlockId.DIRT)).toBe(6);
    expect(
      app.simulation.inventory.slots.filter((slot) => slot !== null)
    ).toEqual([
      { id: BlockId.WOOD, count: 2 },
      { id: BlockId.DIRT, count: 6 }
    ]);
    expect(app.simulation.inventory.selectedHotbarSlot).toBe(0);
    expect(app.simulation.selectedHotbarSlot).toBe(0);
  });
});
