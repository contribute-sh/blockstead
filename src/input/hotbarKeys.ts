import { selectHotbarIntent, type SelectHotbarIntent } from "./intents";
import type {
  KeyboardEventLike,
  KeyboardEventListener,
  KeyboardEventSource
} from "./keyboard";

interface KeyboardModifierState {
  readonly ctrlKey?: boolean;
  readonly shiftKey?: boolean;
  readonly altKey?: boolean;
  readonly metaKey?: boolean;
}

export interface HotbarKeysAdapterOptions {
  readonly hotbarSize: number;
}

export type HotbarKeysIntentSubscriber = (intent: SelectHotbarIntent) => void;

export interface HotbarKeysAdapter {
  subscribe(subscriber: HotbarKeysIntentSubscriber): () => void;
  dispose(): void;
}

function digitSlot(code: string | undefined): number | null {
  if (code === undefined || !/^Digit[1-9]$/.test(code)) {
    return null;
  }

  return Number(code.slice("Digit".length)) - 1;
}

function hasModifier(event: KeyboardEventLike & KeyboardModifierState): boolean {
  return (
    event.ctrlKey === true ||
    event.shiftKey === true ||
    event.altKey === true ||
    event.metaKey === true
  );
}

export function createHotbarKeysAdapter(
  source: KeyboardEventSource,
  options: HotbarKeysAdapterOptions
): HotbarKeysAdapter {
  if (!Number.isInteger(options.hotbarSize) || options.hotbarSize <= 0) {
    throw new Error("Hotbar size must be a positive integer.");
  }

  const subscribers = new Set<HotbarKeysIntentSubscriber>();
  const pressedCodes = new Set<string>();
  let disposed = false;

  function emit(intent: SelectHotbarIntent): void {
    if (disposed) {
      return;
    }

    for (const subscriber of subscribers) {
      subscriber(intent);
    }
  }

  const onKeyDown: KeyboardEventListener = (event) => {
    const code = event.code;
    const slot = digitSlot(code);

    if (
      code === undefined ||
      slot === null ||
      slot >= options.hotbarSize ||
      event.repeat === true ||
      hasModifier(event) ||
      pressedCodes.has(code)
    ) {
      return;
    }

    pressedCodes.add(code);
    emit(selectHotbarIntent(slot));
  };

  const onKeyUp: KeyboardEventListener = (event) => {
    const code = event.code;

    if (code !== undefined && digitSlot(code) !== null) {
      pressedCodes.delete(code);
    }
  };

  source.addEventListener("keydown", onKeyDown);
  source.addEventListener("keyup", onKeyUp);

  return {
    subscribe(subscriber) {
      if (disposed) {
        return () => undefined;
      }

      subscribers.add(subscriber);
      return () => {
        subscribers.delete(subscriber);
      };
    },
    dispose() {
      if (disposed) {
        return;
      }

      disposed = true;
      source.removeEventListener("keydown", onKeyDown);
      source.removeEventListener("keyup", onKeyUp);
      subscribers.clear();
      pressedCodes.clear();
    }
  };
}
