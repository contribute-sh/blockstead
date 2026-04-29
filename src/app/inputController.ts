import {
  mineIntent,
  moveIntent,
  placeIntent,
  selectHotbarIntent,
  type ActionIntent,
  type IntentAxis,
  type IntentFrame
} from "../input/intents";

export interface InputController {
  readonly pressedKeys: ReadonlySet<string>;
  drainActions(): ReadonlyArray<ActionIntent>;
  dispose(): void;
}

export interface InputActions {
  onToggleCrafting(): void;
  onSave(): void;
}

export function createInputController(
  canvas: HTMLCanvasElement,
  actions: InputActions
): InputController {
  const pressedKeys = new Set<string>();
  const pendingActions: ActionIntent[] = [];
  const view = canvas.ownerDocument.defaultView;

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
      actions.onToggleCrafting();
      return;
    }

    if (event.code === "KeyP" || event.key.toLowerCase() === "p") {
      event.preventDefault();
      actions.onSave();
    }
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
    }
  };
}

export function nextFrameIntents(input: InputController): IntentFrame {
  const move = movementIntent(input.pressedKeys);

  return {
    move,
    look: null,
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
