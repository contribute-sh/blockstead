declare const process: {
  readonly env: Readonly<Record<string, string | undefined>>;
  cwd(): string;
};

import { describe, expect, it } from "vitest";

import { BlockId } from "../../src/sim/blocks";
import {
  deserializeSave,
  SAVE_VERSION,
  serializeSave,
  type SaveState
} from "../../src/sim/save";

// If this test fails after intentional save-format changes, regenerate the fixture by running
// `UPDATE_SAVE_V1_FIXTURE=1 pnpm vitest run tests/sim/saveRegression.test.ts`
// and review the diff carefully - any change here is a save-format break for existing players.

interface FileSystemModule {
  readonly mkdirSync: (path: string, options: { readonly recursive: boolean }) => void;
  readonly readFileSync: (path: string, encoding: "utf8") => string;
  readonly writeFileSync: (path: string, data: string, encoding: "utf8") => void;
}

const NODE_FS: string = "node:fs";
const fs = (await import(NODE_FS)) as FileSystemModule;
const FIXTURE_DIRECTORY = `${process.cwd()}/tests/sim/fixtures`;
const FIXTURE_PATH = `${FIXTURE_DIRECTORY}/save-v1.json`;
const UPDATE_FIXTURE = process.env.UPDATE_SAVE_V1_FIXTURE === "1";

const canonicalState: SaveState = {
  version: SAVE_VERSION,
  seed: 42,
  mutations: [
    { x: 0, y: 8, z: 0, block: BlockId.DIRT },
    { x: 1, y: 9, z: -2, block: BlockId.AIR },
    { x: -3, y: 10, z: 4, block: BlockId.TORCH },
    { x: 16, y: 7, z: -16, block: BlockId.STONE }
  ],
  player: {
    position: [12.5, 14.25, -6.75],
    orientation: {
      yaw: 0.875,
      pitch: -0.375
    }
  },
  inventory: {
    slots: [
      { block: BlockId.DIRT, count: 32 },
      null,
      { block: BlockId.TORCH, count: 6 },
      { block: BlockId.STONE, count: 14 },
      null
    ]
  },
  hotbar: {
    selected: 3
  }
};

const serializedCanonicalState = serializeSave(canonicalState);

if (UPDATE_FIXTURE) {
  fs.mkdirSync(FIXTURE_DIRECTORY, { recursive: true });
  fs.writeFileSync(FIXTURE_PATH, serializedCanonicalState, "utf8");
}

const fixtureContents = fs.readFileSync(FIXTURE_PATH, "utf8");

describe("save v1 regression fixture", () => {
  it("matches the canonical serialized save state byte-for-byte", () => {
    expect(canonicalState.version).toBe(SAVE_VERSION);
    expect(canonicalState.seed).toBe(42);

    if (UPDATE_FIXTURE) {
      return;
    }

    expect(serializedCanonicalState).toBe(fixtureContents);
  });

  it("deserializes and reserializes the fixture byte-for-byte", () => {
    const result = deserializeSave(fixtureContents);

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error(result.error.message);
    }

    if (UPDATE_FIXTURE) {
      return;
    }

    expect(serializeSave(result.state)).toBe(fixtureContents);
  });

  it("rejects empty and non-object save payloads", () => {
    expect(deserializeSave("")).toMatchObject({
      ok: false,
      error: { kind: "invalid_json" }
    });
    expect(deserializeSave("undefined")).toMatchObject({
      ok: false,
      error: { kind: "invalid_json" }
    });
    expect(deserializeSave("null")).toMatchObject({
      ok: false,
      error: { kind: "invalid_shape" }
    });
  });
});
