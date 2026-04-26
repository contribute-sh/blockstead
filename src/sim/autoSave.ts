import type { SaveStatusState } from "../hud/saveStatus";
import type { SaveState } from "./save";
import type { SaveStorageResult } from "./saveStorage";

const DEFAULT_DIRTY_TICK_THRESHOLD = 60;

export interface AutoSaveStatus {
  state: SaveStatusState;
  lastSavedAt: number | null;
  detail?: string;
}

export interface AutoSaver {
  markDirty: () => void;
  tick: (snapshot: SaveState) => void;
  getStatus: () => AutoSaveStatus;
  forceSave: (snapshot: SaveState) => void;
}

export interface AutoSaverOptions {
  intervalMs: number;
  now: () => number;
  save: (snapshot: SaveState) => SaveStorageResult;
  dirtyTickThreshold?: number;
}

export function createAutoSaver({
  intervalMs,
  now,
  save,
  dirtyTickThreshold = DEFAULT_DIRTY_TICK_THRESHOLD
}: AutoSaverOptions): AutoSaver {
  const startedAt = now();
  let dirty = false;
  let dirtyTicks = 0;
  let state: SaveStatusState = "idle";
  let lastSavedAt: number | null = null;
  let detail: string | undefined;

  function getStatus(): AutoSaveStatus {
    return detail === undefined
      ? { state, lastSavedAt }
      : { state, lastSavedAt, detail };
  }

  function flush(snapshot: SaveState, savedAt: number): void {
    state = "saving";
    detail = undefined;

    const result = save(snapshot);

    if (result.ok) {
      dirty = false;
      dirtyTicks = 0;
      lastSavedAt = savedAt;
      state = "saved";
      return;
    }

    state = "error";
    detail = result.error;
  }

  function markDirty(): void {
    dirty = true;
  }

  function tick(snapshot: SaveState): void {
    if (!dirty) {
      return;
    }

    dirtyTicks += 1;

    const currentTime = now();
    const lastGateAt = lastSavedAt ?? startedAt;
    const shouldSave =
      currentTime - lastGateAt >= intervalMs || dirtyTicks >= dirtyTickThreshold;

    if (shouldSave) {
      flush(snapshot, currentTime);
    }
  }

  function forceSave(snapshot: SaveState): void {
    flush(snapshot, now());
  }

  return {
    markDirty,
    tick,
    getStatus,
    forceSave
  };
}
