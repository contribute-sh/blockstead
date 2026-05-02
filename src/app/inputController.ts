import {
  lookIntent,
  mineIntent,
  moveIntent,
  placeIntent,
  selectHotbarIntent,
  type ActionIntent,
  type IntentAxis,
  type IntentFrame,
  type LookIntent
} from "../input/intents";
import {
  createPointerLock,
  type PointerLockAdapter,
  type PointerLockDocument
} from "../input/pointerLock";

export interface InputController {
  readonly pressedKeys: ReadonlySet<string>;
  isPointerLockSupported(): boolean;
  isPointerLocked(): boolean;
  drainLook(): LookIntent | null;
  drainActions(): ReadonlyArray<ActionIntent>;
  dispose(): void;
}

export interface InputActions {
  onToggleCrafting(): void;
  onSave(): void;
}

export interface InputControllerOptions {
  readonly pointerLock?: PointerLockAdapter | null;
}

export function createInputController(
  canvas: HTMLCanvasElement,
  actions: InputActions,
  options: InputControllerOptions = {}
): InputController {
  const pressedKeys = new Set<string>();
  const pendingActions: ActionIntent[] = [];
  const view = canvas.ownerDocument.defaultView;
  const pointerLock =
    options.pointerLock === undefined
      ? createCanvasPointerLock(canvas)
      : options.pointerLock;
  let hasPendingLook = false;
  let pendingLookX = 0;
  let pendingLookY = 0;

  const unsubscribePointerLock =
    pointerLock?.on((event) => {
      pendingLookX += event.movementX;
      pendingLookY += event.movementY;
      hasPendingLook = true;
    }) ?? (() => undefined);

  function handleKeyDown(event: KeyboardEvent): void {
    pressedKeys.add(event.code);
    pressedKeys.add(event.key);

    if (event.repeat) {
      return;
    }

    const hotbarSlot = readHotbarSlot(event);

    if (hotbarSlot !== null) {
      event.preventDefault();
      pendingActions.push(selectHotbarIntent(hotbarSlot));
      return;
    }

    if (event.code === "KeyE" || event.key.toLowerCase() === "e") {
      event.preventDefault();
      releasePointerLock();
      actions.onToggleCrafting();
      return;
    }

    if (event.code === "KeyP" || event.key.toLowerCase() === "p") {
      event.preventDefault();
      actions.onSave();
    }
  }

  function releasePointerLock(): void {
    if (pointerLock?.isLocked() !== true) {
      return;
    }

    canvas.ownerDocument.exitPointerLock();
  }

  function handleKeyUp(event: KeyboardEvent): void {
    pressedKeys.delete(event.code);
    pressedKeys.delete(event.key);
  }

  function handlePointerDown(event: MouseEvent): void {
    canvas.focus();

    if (event.button === 0) {
      event.preventDefault();
      pendingActions.push(mineIntent());
      return;
    }

    if (event.button === 2) {
      event.preventDefault();
      pendingActions.push(placeIntent());
    }
  }

  function handleContextMenu(event: MouseEvent): void {
    event.preventDefault();
  }

  canvas.addEventListener("mousedown", handlePointerDown);
  canvas.addEventListener("contextmenu", handleContextMenu);
  view?.addEventListener("keydown", handleKeyDown);
  view?.addEventListener("keyup", handleKeyUp);

  return {
    pressedKeys,
    isPointerLockSupported() {
      return pointerLock !== null;
    },
    isPointerLocked() {
      return pointerLock?.isLocked() ?? false;
    },
    drainLook() {
      if (!hasPendingLook) {
        return null;
      }

      const look = lookIntent(pendingLookX, pendingLookY);
      pendingLookX = 0;
      pendingLookY = 0;
      hasPendingLook = false;
      return look;
    },
    drainActions() {
      const drained = [...pendingActions];
      pendingActions.length = 0;
      return drained;
    },
    dispose() {
      canvas.removeEventListener("mousedown", handlePointerDown);
      canvas.removeEventListener("contextmenu", handleContextMenu);
      view?.removeEventListener("keydown", handleKeyDown);
      view?.removeEventListener("keyup", handleKeyUp);
      unsubscribePointerLock();
      pointerLock?.dispose();
    }
  };
}

export function nextFrameIntents(input: InputController): IntentFrame {
  const move = movementIntent(input.pressedKeys);

  return {
    move,
    look: input.drainLook(),
    actions: input.drainActions()
  };
}

function movementIntent(pressedKeys: ReadonlySet<string>): IntentFrame["move"] {
  const forward = axisValue(
    hasAnyKey(pressedKeys, ["KeyW", "w", "W", "ArrowUp"]),
    hasAnyKey(pressedKeys, ["KeyS", "s", "S", "ArrowDown"])
  );
  const right = axisValue(
    hasAnyKey(pressedKeys, ["KeyD", "d", "D", "ArrowRight"]),
    hasAnyKey(pressedKeys, ["KeyA", "a", "A", "ArrowLeft"])
  );

  return forward === 0 && right === 0 ? null : moveIntent(forward, right, 0, false);
}

function hasAnyKey(pressedKeys: ReadonlySet<string>, keys: ReadonlyArray<string>): boolean {
  return keys.some((key) => pressedKeys.has(key));
}

function axisValue(positive: boolean, negative: boolean): IntentAxis {
  if (positive === negative) {
    return 0;
  }

  return positive ? 1 : -1;
}

function readHotbarSlot(event: KeyboardEvent): number | null {
  if (/^Digit[1-9]$/.test(event.code)) {
    return Number(event.code.slice("Digit".length)) - 1;
  }

  if (/^[1-9]$/.test(event.key)) {
    return Number(event.key) - 1;
  }

  return null;
}

function createCanvasPointerLock(canvas: HTMLCanvasElement): PointerLockAdapter | null {
  if (
    typeof canvas.requestPointerLock !== "function" ||
    !isPointerLockDocument(canvas.ownerDocument)
  ) {
    return null;
  }

  return createPointerLock(canvas);
}

function isPointerLockDocument(value: unknown): value is PointerLockDocument {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    "pointerLockElement" in value &&
    "addEventListener" in value &&
    typeof value.addEventListener === "function" &&
    "removeEventListener" in value &&
    typeof value.removeEventListener === "function"
  );
}
