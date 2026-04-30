import { describe, expect, it } from "vitest";

import { BlockId } from "../../src/sim/blocks";
import { SAVE_VERSION, type SaveState } from "../../src/sim/save";
import { loadFromStorage, saveToStorage } from "../../src/sim/saveStorage";

class MemoryStorage implements Storage {
  [name: string]: unknown;

  private readonly values = new Map<string, string>();

  public setError: unknown = null;

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
    if (this.setError !== null) {
      throw this.setError;
    }

    this.values.set(key, value);
  }
}

const baseState: SaveState = {
  version: SAVE_VERSION,
  seed: 12345,
  mutations: [
    { x: 1, y: 4, z: 2, block: BlockId.DIRT },
    { x: -3, y: 7, z: 9, block: BlockId.AIR },
    { x: 32, y: 5, z: -16, block: BlockId.TORCH }
  ],
  player: {
    position: [10.5, 12, -3.25],
    orientation: {
      yaw: 1.25,
      pitch: -0.5
    }
  },
  inventory: {
    slots: [
      { block: BlockId.GRASS, count: 12 },
      null,
      { block: BlockId.TORCH, count: 3 }
    ]
  },
  hotbar: {
    selected: 2
  }
};

describe("save storage", () => {
  it("round-trips save state through storage", () => {
    const storage = new MemoryStorage();

    expect(saveToStorage("save", baseState, storage)).toEqual({ ok: true });
    expect(loadFromStorage("save", storage)).toEqual({ ok: true, state: baseState });
  });

  it("returns missing for absent storage keys", () => {
    const storage = new MemoryStorage();

    expect(loadFromStorage("missing", storage)).toEqual({ ok: false, error: "missing" });
  });

  it("returns malformed for invalid JSON or invalid save shape", () => {
    const storage = new MemoryStorage();

    storage.setItem("bad-json", "{not json");
    storage.setItem("bad-shape", JSON.stringify({ version: SAVE_VERSION }));

    expect(loadFromStorage("bad-json", storage)).toEqual({ ok: false, error: "malformed" });
    expect(loadFromStorage("bad-shape", storage)).toEqual({ ok: false, error: "malformed" });
  });

  it("returns malformed when the save key contains unparseable JSON", () => {
    const storage = new MemoryStorage();

    storage.setItem("save", "{");

    expect(loadFromStorage("save", storage)).toEqual({ ok: false, error: "malformed" });
  });

  it("returns malformed when the save key contains schema-mismatched JSON", () => {
    const storage = new MemoryStorage();

    storage.setItem("save", JSON.stringify({ ...baseState, mutations: "not an array" }));

    expect(loadFromStorage("save", storage)).toEqual({ ok: false, error: "malformed" });
  });

  it("returns quota_exceeded when storage quota is exceeded", () => {
    const storage = new MemoryStorage();

    storage.setError = { name: "QuotaExceededError" };

    expect(saveToStorage("save", baseState, storage)).toEqual({
      ok: false,
      error: "quota_exceeded"
    });
  });

  it("returns quota_exceeded when storage throws a quota DOMException", () => {
    const storage = new MemoryStorage();

    storage.setError = new DOMException("Storage quota exceeded", "QuotaExceededError");

    expect(saveToStorage("save", baseState, storage)).toEqual({
      ok: false,
      error: "quota_exceeded"
    });
  });

  it("throws for null or undefined storage because saveStorage requires Storage", () => {
    const missingStorageValues = [null, undefined] as const;

    for (const storage of missingStorageValues) {
      expect(() => loadFromStorage("save", storage as unknown as Storage)).toThrow(TypeError);
      expect(() => saveToStorage("save", baseState, storage as unknown as Storage)).toThrow(
        TypeError
      );
    }
  });
});
