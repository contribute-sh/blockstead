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

  it("returns the full version_mismatch error shape for unsupported versions", () => {
    const version = SAVE_VERSION + 10;
    const result = deserializeSave(JSON.stringify({ ...baseState, version }));

    expect(result).toEqual({
      ok: false,
      error: {
        kind: "version_mismatch",
        message: `Unsupported save version ${version}; expected ${SAVE_VERSION}.`,
        expected: SAVE_VERSION,
        actual: version
      }
    });
  });

  it("returns invalid_json for malformed JSON", () => {
    const result = deserializeSave("{not json");

    expect(result).toMatchObject({
      ok: false,
      error: { kind: "invalid_json" }
    });
  });

  it("returns the full invalid_json error shape for malformed JSON", () => {
    expect(deserializeSave("{not json")).toEqual({
      ok: false,
      error: {
        kind: "invalid_json",
        message: "Save data is not valid JSON."
      }
    });
  });

  it.each(["seed", "mutations", "player", "inventory", "hotbar"])(
    "returns invalid_shape when %s is missing",
    (field) => {
      const payload: Record<string, unknown> = { ...baseState };

      delete payload[field];

      expect(deserializeSave(JSON.stringify(payload))).toEqual({
        ok: false,
        error: {
          kind: "invalid_shape",
          message: "Save data does not match the expected save schema."
        }
      });
    }
  );

  it.each([
    [
      "mutations is not an array",
      {
        ...baseState,
        mutations: { x: 1, y: 2, z: 3, block: BlockId.DIRT }
      }
    ],
    [
      "player.position is not a numeric 3-tuple",
      {
        ...baseState,
        player: {
          ...baseState.player,
          position: [1, 2, "3"]
        }
      }
    ],
    [
      "inventory.slots contains a wrong-typed count",
      {
        ...baseState,
        inventory: {
          slots: [{ block: BlockId.GRASS, count: "12" }]
        }
      }
    ]
  ])("returns invalid_shape when %s", (_label, payload) => {
    expect(deserializeSave(JSON.stringify(payload))).toEqual({
      ok: false,
      error: {
        kind: "invalid_shape",
        message: "Save data does not match the expected save schema."
      }
    });
  });

  it("preserves numeric inventory slot counts even when negative", () => {
    const payload = {
      ...baseState,
      inventory: {
        slots: [{ block: BlockId.GRASS, count: -1 }]
      }
    };

    expect(deserializeSave(JSON.stringify(payload))).toEqual({
      ok: true,
      state: payload
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
