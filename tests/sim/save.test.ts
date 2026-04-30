import { describe, expect, it } from "vitest";

import { BlockId } from "../../src/sim/blocks";
import {
  deserializeSave,
  SAVE_VERSION,
  serializeSave,
  type SaveState
} from "../../src/sim/save";

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

describe("save codec", () => {
  it("round-trips save state", () => {
    const result = deserializeSave(serializeSave(baseState));

    expect(result).toEqual({ ok: true, state: baseState });
  });

  it("rejects unsupported save versions", () => {
    const payload = {
      ...baseState,
      version: SAVE_VERSION + 1
    };
    const result = deserializeSave(JSON.stringify(payload));

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({
      ok: false,
      error: { kind: "version_mismatch" }
    });
  });

  it("returns invalid_json for malformed JSON", () => {
    const result = deserializeSave("{not json");

    expect(result).toMatchObject({
      ok: false,
      error: { kind: "invalid_json" }
    });
  });

  it("returns the typed invalid_json failure for unparseable JSON", () => {
    expect(deserializeSave("{\"version\":")).toEqual({
      ok: false,
      error: {
        kind: "invalid_json",
        message: "Save data is not valid JSON."
      }
    });
  });

  it("returns invalid_shape when required top-level fields are missing", () => {
    const expected = {
      ok: false,
      error: {
        kind: "invalid_shape",
        message: "Save data does not match the expected save schema."
      }
    };
    const payloads = [
      { label: "seed", payload: { ...baseState, seed: undefined } },
      { label: "mutations", payload: { ...baseState, mutations: undefined } },
      { label: "player", payload: { ...baseState, player: undefined } },
      { label: "inventory", payload: { ...baseState, inventory: undefined } },
      { label: "hotbar", payload: { ...baseState, hotbar: undefined } }
    ];

    for (const { label, payload } of payloads) {
      expect(deserializeSave(JSON.stringify(payload)), label).toEqual(expected);
    }
  });

  it("returns invalid_shape when nested save fields have the wrong type", () => {
    const expected = {
      ok: false,
      error: {
        kind: "invalid_shape",
        message: "Save data does not match the expected save schema."
      }
    };
    const payloads = [
      {
        label: "mutations",
        payload: { ...baseState, mutations: { x: 1, y: 2, z: 3, block: BlockId.DIRT } }
      },
      {
        label: "player.position length",
        payload: {
          ...baseState,
          player: { ...baseState.player, position: [1, 2] }
        }
      },
      {
        label: "player.position number",
        payload: {
          ...baseState,
          player: { ...baseState.player, position: [1, "2", 3] }
        }
      },
      {
        label: "inventory slot count",
        payload: {
          ...baseState,
          inventory: {
            slots: [{ block: BlockId.DIRT, count: "3" }]
          }
        }
      }
    ];

    for (const { label, payload } of payloads) {
      expect(deserializeSave(JSON.stringify(payload)), label).toEqual(expected);
    }
  });

  it("returns the typed version_mismatch failure for unsupported save versions", () => {
    expect(deserializeSave(JSON.stringify({ ...baseState, version: SAVE_VERSION + 1 }))).toEqual({
      ok: false,
      error: {
        kind: "version_mismatch",
        message: `Unsupported save version ${SAVE_VERSION + 1}; expected ${SAVE_VERSION}.`,
        expected: SAVE_VERSION,
        actual: SAVE_VERSION + 1
      }
    });
  });

  it("returns invalid_shape for missing or wrong-typed fields", () => {
    expect(deserializeSave(JSON.stringify({ ...baseState, seed: "12345" }))).toMatchObject({
      ok: false,
      error: { kind: "invalid_shape" }
    });

    expect(
      deserializeSave(
        JSON.stringify({
          ...baseState,
          mutations: [{ x: 1, y: 2, z: 3, block: 999 }]
        })
      )
    ).toMatchObject({
      ok: false,
      error: { kind: "invalid_shape" }
    });

    expect(deserializeSave(JSON.stringify({ version: SAVE_VERSION }))).toMatchObject({
      ok: false,
      error: { kind: "invalid_shape" }
    });
  });

  it("keeps sparse mutation payloads sparse", () => {
    const sparseState: SaveState = {
      ...baseState,
      seed: 999,
      mutations: [
        { x: 0, y: 1, z: 0, block: BlockId.STONE },
        { x: 16, y: 2, z: -16, block: BlockId.WOOD },
        { x: 31, y: 3, z: -1, block: BlockId.AIR }
      ]
    };
    const json = serializeSave(sparseState);
    const parsed = JSON.parse(json) as { mutations: unknown[] };

    expect(json.length).toBeLessThan(600);
    expect(parsed.mutations).toHaveLength(sparseState.mutations.length);
  });
});
