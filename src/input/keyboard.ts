import {
  moveIntent,
  saveIntent,
  selectHotbarIntent,
  toggleInventoryIntent,
  type Intent,
  type IntentAxis
} from "./intents";

export type KeyboardEventName = "keydown" | "keyup";

export interface KeyboardEventLike {
  readonly code?: string;
  readonly key?: string;
  readonly repeat?: boolean;
}

export type KeyboardEventListener = (event: KeyboardEventLike) => void;

export interface KeyboardEventSource {
  addEventListener(type: KeyboardEventName, listener: KeyboardEventListener): void;
  removeEventListener(type: KeyboardEventName, listener: KeyboardEventListener): void;
}

export type MoveDirection = "forward" | "backward" | "left" | "right" | "up" | "down";

export type KeyboardBinding =
  | { readonly kind: "move"; readonly direction: MoveDirection }
  | { readonly kind: "jump" }
  | { readonly kind: "selectHotbar"; readonly slot: number }
  | { readonly kind: "toggleInventory" }
  | { readonly kind: "save" };

export type KeyboardBindingMap = Readonly<Record<string, KeyboardBinding>>;

export interface KeyboardAdapterConfig {
  readonly bindings?: KeyboardBindingMap;
}

export type KeyboardIntentSubscriber = (intent: Intent) => void;

export interface KeyboardAdapter {
  subscribe(subscriber: KeyboardIntentSubscriber): () => void;
  drain(): Intent[];
  dispose(): void;
}

const DEFAULT_BINDINGS: KeyboardBindingMap = {
  KeyW: { kind: "move", direction: "forward" },
  KeyS: { kind: "move", direction: "backward" },
  KeyA: { kind: "move", direction: "left" },
  KeyD: { kind: "move", direction: "right" },
  ArrowUp: { kind: "move", direction: "forward" },
  ArrowDown: { kind: "move", direction: "backward" },
  ArrowLeft: { kind: "move", direction: "left" },
  ArrowRight: { kind: "move", direction: "right" },
  Space: { kind: "jump" },
  Digit1: { kind: "selectHotbar", slot: 0 },
  Digit2: { kind: "selectHotbar", slot: 1 },
  Digit3: { kind: "selectHotbar", slot: 2 },
  Digit4: { kind: "selectHotbar", slot: 3 },
  Digit5: { kind: "selectHotbar", slot: 4 },
  Digit6: { kind: "selectHotbar", slot: 5 },
  Digit7: { kind: "selectHotbar", slot: 6 },
  Digit8: { kind: "selectHotbar", slot: 7 },
  Digit9: { kind: "selectHotbar", slot: 8 },
  KeyE: { kind: "toggleInventory" },
  KeyP: { kind: "save" }
};

interface MovementState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
}

function createMovementState(): MovementState {
  return {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false
  };
}

function toAxis(positive: boolean, negative: boolean): IntentAxis {
  if (positive === negative) {
    return 0;
  }

  return positive ? 1 : -1;
}

function eventBindingKey(event: KeyboardEventLike): string | null {
  return event.code ?? event.key ?? null;
}

export function createKeyboardAdapter(
  source: KeyboardEventSource,
  config: KeyboardAdapterConfig = {}
): KeyboardAdapter {
  const bindings = { ...DEFAULT_BINDINGS, ...config.bindings };
  const movement = createMovementState();
  const queue: Intent[] = [];
  const subscribers = new Set<KeyboardIntentSubscriber>();
  let disposed = false;

  function emit(intent: Intent): void {
    if (disposed) {
      return;
    }

    queue.push(intent);
    for (const subscriber of subscribers) {
      subscriber(intent);
    }
  }

  function emitMove(): void {
    emit(
      moveIntent(
        toAxis(movement.forward, movement.backward),
        toAxis(movement.right, movement.left),
        toAxis(movement.up, movement.down),
        movement.jump
      )
    );
  }

  function setMovement(direction: MoveDirection, pressed: boolean): boolean {
    if (movement[direction] === pressed) {
      return false;
    }

    movement[direction] = pressed;
    return true;
  }

  function setJump(pressed: boolean): boolean {
    if (movement.jump === pressed) {
      return false;
    }

    movement.jump = pressed;
    return true;
  }

  function handleKeyEvent(event: KeyboardEventLike, pressed: boolean): void {
    const bindingKey = eventBindingKey(event);
    const binding = bindingKey === null ? undefined : bindings[bindingKey];

    if (binding === undefined) {
      return;
    }

    switch (binding.kind) {
      case "move":
        if (setMovement(binding.direction, pressed)) {
          emitMove();
        }
        return;
      case "jump":
        if (setJump(pressed)) {
          emitMove();
        }
        return;
      case "selectHotbar":
        if (pressed && event.repeat !== true) {
          emit(selectHotbarIntent(binding.slot));
        }
        return;
      case "toggleInventory":
        if (pressed && event.repeat !== true) {
          emit(toggleInventoryIntent());
        }
        return;
      case "save":
        if (pressed && event.repeat !== true) {
          emit(saveIntent());
        }
        return;
    }
  }

  const onKeyDown: KeyboardEventListener = (event) => {
    handleKeyEvent(event, true);
  };
  const onKeyUp: KeyboardEventListener = (event) => {
    handleKeyEvent(event, false);
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
    drain() {
      const drained = queue.slice();
      queue.length = 0;
      return drained;
    },
    dispose() {
      if (disposed) {
        return;
      }

      disposed = true;
      source.removeEventListener("keydown", onKeyDown);
      source.removeEventListener("keyup", onKeyUp);
      subscribers.clear();
    }
  };
}
