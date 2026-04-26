import { BlockId } from "./blocks";

export const SAVE_VERSION = 1;

export interface SaveMutation {
  x: number;
  y: number;
  z: number;
  block: BlockId;
}

export interface SaveState {
  version: number;
  seed: number;
  mutations: Array<SaveMutation>;
  player: {
    position: [number, number, number];
    orientation: {
      yaw: number;
      pitch: number;
    };
  };
  inventory: {
    slots: Array<{ block: BlockId; count: number } | null>;
  };
  hotbar: {
    selected: number;
  };
}

export type SaveError =
  | { kind: "invalid_json"; message: string }
  | { kind: "version_mismatch"; message: string; expected: number; actual: number }
  | { kind: "invalid_shape"; message: string };

export type DeserializeSaveResult =
  | { ok: true; state: SaveState }
  | { ok: false; error: SaveError };

const VALID_BLOCK_IDS = new Set<number>(Object.values(BlockId));

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isBlockId(value: unknown): value is BlockId {
  return typeof value === "number" && Number.isInteger(value) && VALID_BLOCK_IDS.has(value);
}

function invalidShape(message: string): DeserializeSaveResult {
  return { ok: false, error: { kind: "invalid_shape", message } };
}

function readNumber(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];

  return isFiniteNumber(value) ? value : null;
}

function readBlockId(record: Record<string, unknown>, key: string): BlockId | null {
  const value = record[key];

  return isBlockId(value) ? value : null;
}

function validateMutation(value: unknown): SaveMutation | null {
  if (!isRecord(value)) {
    return null;
  }

  const x = readNumber(value, "x");
  const y = readNumber(value, "y");
  const z = readNumber(value, "z");
  const block = readBlockId(value, "block");

  if (x === null || y === null || z === null || block === null) {
    return null;
  }

  return { x, y, z, block };
}

function validateMutations(value: unknown): Array<SaveMutation> | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const mutations: Array<SaveMutation> = [];

  for (const entry of value) {
    const mutation = validateMutation(entry);

    if (mutation === null) {
      return null;
    }

    mutations.push(mutation);
  }

  return mutations;
}

function validatePosition(value: unknown): [number, number, number] | null {
  if (!Array.isArray(value) || value.length !== 3) {
    return null;
  }

  const [x, y, z] = value;

  if (!isFiniteNumber(x) || !isFiniteNumber(y) || !isFiniteNumber(z)) {
    return null;
  }

  return [x, y, z];
}

function validatePlayer(value: unknown): SaveState["player"] | null {
  if (!isRecord(value) || !isRecord(value.orientation)) {
    return null;
  }

  const position = validatePosition(value.position);
  const yaw = readNumber(value.orientation, "yaw");
  const pitch = readNumber(value.orientation, "pitch");

  if (position === null || yaw === null || pitch === null) {
    return null;
  }

  return {
    position,
    orientation: { yaw, pitch }
  };
}

function validateInventorySlot(value: unknown): SaveState["inventory"]["slots"][number] | null | undefined {
  if (value === null) {
    return null;
  }

  if (!isRecord(value)) {
    return undefined;
  }

  const block = readBlockId(value, "block");
  const count = readNumber(value, "count");

  if (block === null || count === null) {
    return undefined;
  }

  return { block, count };
}

function validateInventory(value: unknown): SaveState["inventory"] | null {
  if (!isRecord(value) || !Array.isArray(value.slots)) {
    return null;
  }

  const slots: SaveState["inventory"]["slots"] = [];

  for (const entry of value.slots) {
    const slot = validateInventorySlot(entry);

    if (slot === undefined) {
      return null;
    }

    slots.push(slot);
  }

  return { slots };
}

function validateHotbar(value: unknown): SaveState["hotbar"] | null {
  if (!isRecord(value)) {
    return null;
  }

  const selected = readNumber(value, "selected");

  return selected === null ? null : { selected };
}

export function serializeSave(state: SaveState): string {
  return JSON.stringify({
    version: state.version,
    seed: state.seed,
    mutations: state.mutations.map((mutation) => ({
      x: mutation.x,
      y: mutation.y,
      z: mutation.z,
      block: mutation.block
    })),
    player: {
      position: [
        state.player.position[0],
        state.player.position[1],
        state.player.position[2]
      ],
      orientation: {
        yaw: state.player.orientation.yaw,
        pitch: state.player.orientation.pitch
      }
    },
    inventory: {
      slots: state.inventory.slots.map((slot) =>
        slot === null
          ? null
          : {
              block: slot.block,
              count: slot.count
            }
      )
    },
    hotbar: {
      selected: state.hotbar.selected
    }
  });
}

export function deserializeSave(json: string): DeserializeSaveResult {
  let payload: unknown;

  try {
    payload = JSON.parse(json);
  } catch {
    return {
      ok: false,
      error: {
        kind: "invalid_json",
        message: "Save data is not valid JSON."
      }
    };
  }

  if (!isRecord(payload)) {
    return invalidShape("Save data must be a JSON object.");
  }

  const version = readNumber(payload, "version");

  if (version === null) {
    return invalidShape("Save data must include a numeric version.");
  }

  if (version !== SAVE_VERSION) {
    return {
      ok: false,
      error: {
        kind: "version_mismatch",
        message: `Unsupported save version ${version}; expected ${SAVE_VERSION}.`,
        expected: SAVE_VERSION,
        actual: version
      }
    };
  }

  const seed = readNumber(payload, "seed");
  const mutations = validateMutations(payload.mutations);
  const player = validatePlayer(payload.player);
  const inventory = validateInventory(payload.inventory);
  const hotbar = validateHotbar(payload.hotbar);

  if (
    seed === null ||
    mutations === null ||
    player === null ||
    inventory === null ||
    hotbar === null
  ) {
    return invalidShape("Save data does not match the expected save schema.");
  }

  return {
    ok: true,
    state: {
      version,
      seed,
      mutations,
      player,
      inventory,
      hotbar
    }
  };
}
