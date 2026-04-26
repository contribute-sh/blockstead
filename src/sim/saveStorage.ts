import {
  deserializeSave,
  serializeSave,
  type SaveState
} from "./save";

export type SaveStorageResult =
  | { ok: true }
  | { ok: false; error: "quota_exceeded" };

export type LoadStorageResult =
  | { ok: true; state: SaveState }
  | { ok: false; error: "missing" | "malformed" };

function isQuotaExceededError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const candidate = error as { readonly name?: unknown; readonly code?: unknown };

  return candidate.name === "QuotaExceededError" || candidate.code === 22;
}

export function saveToStorage(
  key: string,
  snapshot: SaveState,
  storage: Storage
): SaveStorageResult {
  const payload = serializeSave(snapshot);

  try {
    storage.setItem(key, payload);
  } catch (error) {
    if (isQuotaExceededError(error)) {
      return { ok: false, error: "quota_exceeded" };
    }

    throw error;
  }

  return { ok: true };
}

export function loadFromStorage(key: string, storage: Storage): LoadStorageResult {
  const payload = storage.getItem(key);

  if (payload === null) {
    return { ok: false, error: "missing" };
  }

  const result = deserializeSave(payload);

  if (!result.ok) {
    return { ok: false, error: "malformed" };
  }

  return { ok: true, state: result.state };
}
