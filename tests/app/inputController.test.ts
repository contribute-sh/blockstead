import { describe, expect, it, vi } from "vitest";

import {
  createInputController,
  nextFrameIntents,
  type InputActions
} from "../../src/app/inputController";
import {
  lookIntent,
  mineIntent,
  moveIntent,
  placeIntent,
  selectHotbarIntent
} from "../../src/input/intents";
import type {
  PointerLockAdapter,
  PointerLockLookDeltaHandler
} from "../../src/input/pointerLock";

class FakeEventSource {
  private readonly listeners = new Map<string, Set<EventListener>>();

  addEventListener(type: string, listener: EventListener): void {
    const listenersForType = this.listeners.get(type) ?? new Set<EventListener>();
    listenersForType.add(listener);
    this.listeners.set(type, listenersForType);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type: string, event: Event): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }

  listenerCount(type: string): number {
    return this.listeners.get(type)?.size ?? 0;
  }
}

class FakeCanvas extends FakeEventSource {
  readonly ownerDocument: { readonly defaultView: FakeEventSource | null };
  focusCalls = 0;

  constructor(defaultView: FakeEventSource | null = new FakeEventSource()) {
    super();
    this.ownerDocument = { defaultView };
  }

  focus(): void {
    this.focusCalls += 1;
  }

  asHtmlCanvasElement(): HTMLCanvasElement {
    return this as unknown as HTMLCanvasElement;
  }
}

class FakePointerLockAdapter implements PointerLockAdapter {
  disposed = false;
  locked = false;
  private readonly lookHandlers = new Set<PointerLockLookDeltaHandler>();

  isLocked(): boolean {
    return this.locked;
  }

  emitLookDelta(movementX: number, movementY: number): void {
    for (const handler of this.lookHandlers) {
      handler({ type: "look-delta", movementX, movementY });
    }
  }

  on(handler: PointerLockLookDeltaHandler): () => void {
    this.lookHandlers.add(handler);
    return () => {
      this.lookHandlers.delete(handler);
    };
  }

  off(handler: PointerLockLookDeltaHandler): void {
    this.lookHandlers.delete(handler);
  }

  dispose(): void {
    this.disposed = true;
    this.lookHandlers.clear();
  }
}

interface KeyboardEventInitLike {
  readonly code: string;
  readonly key: string;
  readonly repeat?: boolean;
}

function syntheticKeyboardEvent(
  type: "keydown" | "keyup",
  init: KeyboardEventInitLike
): KeyboardEvent {
  const event = new Event(type, { cancelable: true }) as unknown as KeyboardEvent;
  Object.defineProperty(event, "code", { value: init.code });
  Object.defineProperty(event, "key", { value: init.key });
  Object.defineProperty(event, "repeat", { value: init.repeat ?? false });
  return event;
}

function syntheticMouseEvent(type: "mousedown" | "contextmenu", button = 0): MouseEvent {
  const event = new Event(type, { cancelable: true }) as unknown as MouseEvent;
  Object.defineProperty(event, "button", { value: button });
  return event;
}

function createSubject(pointerLock?: PointerLockAdapter | null): {
  readonly actions: InputActions;
  readonly canvas: FakeCanvas;
  readonly input: ReturnType<typeof createInputController>;
  readonly view: FakeEventSource;
} {
  const view = new FakeEventSource();
  const canvas = new FakeCanvas(view);
  const actions: InputActions = {
    onToggleCrafting: vi.fn(),
    onSave: vi.fn()
  };
  const input = createInputController(canvas.asHtmlCanvasElement(), actions, {
    pointerLock
  });

  return { actions, canvas, input, view };
}

describe("input controller", () => {
  it("combines pressed movement keys into one frame state", () => {
    const { input, view } = createSubject();

    view.dispatch("keydown", syntheticKeyboardEvent("keydown", { code: "KeyW", key: "w" }));
    view.dispatch("keydown", syntheticKeyboardEvent("keydown", { code: "KeyD", key: "d" }));

    expect(nextFrameIntents(input)).toEqual({
      move: moveIntent(1, 1, 0, false),
      look: null,
      actions: []
    });

    view.dispatch("keyup", syntheticKeyboardEvent("keyup", { code: "KeyW", key: "w" }));
    view.dispatch("keyup", syntheticKeyboardEvent("keyup", { code: "KeyD", key: "d" }));
    view.dispatch("keydown", syntheticKeyboardEvent("keydown", { code: "KeyS", key: "s" }));
    view.dispatch("keydown", syntheticKeyboardEvent("keydown", { code: "KeyA", key: "a" }));

    expect(nextFrameIntents(input)).toEqual({
      move: moveIntent(-1, -1, 0, false),
      look: null,
      actions: []
    });
  });

  it("drains mouse button actions in the same frame as movement", () => {
    const { canvas, input, view } = createSubject();
    const mineEvent = syntheticMouseEvent("mousedown", 0);
    const placeEvent = syntheticMouseEvent("mousedown", 2);

    view.dispatch("keydown", syntheticKeyboardEvent("keydown", { code: "KeyW", key: "w" }));
    view.dispatch("keydown", syntheticKeyboardEvent("keydown", { code: "KeyD", key: "d" }));
    canvas.dispatch("mousedown", mineEvent);
    canvas.dispatch("mousedown", placeEvent);

    expect(canvas.focusCalls).toBe(2);
    expect(mineEvent.defaultPrevented).toBe(true);
    expect(placeEvent.defaultPrevented).toBe(true);
    expect(nextFrameIntents(input)).toEqual({
      move: moveIntent(1, 1, 0, false),
      look: null,
      actions: [mineIntent(), placeIntent()]
    });
    expect(nextFrameIntents(input).actions).toEqual([]);
  });

  it("drains pointer lock look deltas without blocking movement or mouse actions", () => {
    const pointerLock = new FakePointerLockAdapter();
    const { canvas, input, view } = createSubject(pointerLock);
    const mineEvent = syntheticMouseEvent("mousedown", 0);

    expect(input.isPointerLockSupported()).toBe(true);
    expect(input.isPointerLocked()).toBe(false);

    view.dispatch("keydown", syntheticKeyboardEvent("keydown", { code: "KeyW", key: "w" }));
    pointerLock.locked = true;
    pointerLock.emitLookDelta(4, -3);
    canvas.dispatch("mousedown", mineEvent);

    expect(input.isPointerLocked()).toBe(true);
    expect(nextFrameIntents(input)).toEqual({
      move: moveIntent(1, 0, 0, false),
      look: lookIntent(4, -3),
      actions: [mineIntent()]
    });
    expect(nextFrameIntents(input).look).toBeNull();

    input.dispose();

    expect(pointerLock.disposed).toBe(true);
  });

  it("creates hotbar selection actions from digit codes and digit keys", () => {
    const { input, view } = createSubject();
    const firstSlot = syntheticKeyboardEvent("keydown", { code: "Digit1", key: "1" });
    const ninthSlot = syntheticKeyboardEvent("keydown", {
      code: "Unidentified",
      key: "9"
    });
    const repeatedSlot = syntheticKeyboardEvent("keydown", {
      code: "Digit3",
      key: "3",
      repeat: true
    });

    view.dispatch("keydown", firstSlot);
    view.dispatch("keydown", ninthSlot);
    view.dispatch("keydown", repeatedSlot);

    expect(firstSlot.defaultPrevented).toBe(true);
    expect(ninthSlot.defaultPrevented).toBe(true);
    expect(repeatedSlot.defaultPrevented).toBe(false);
    expect(nextFrameIntents(input)).toEqual({
      move: null,
      look: null,
      actions: [selectHotbarIntent(0), selectHotbarIntent(8)]
    });
  });

  it("fires crafting and save callbacks once per non-repeat shortcut press", () => {
    const { actions, input, view } = createSubject();
    const craftingEvent = syntheticKeyboardEvent("keydown", { code: "KeyE", key: "e" });
    const repeatedCraftingEvent = syntheticKeyboardEvent("keydown", {
      code: "KeyE",
      key: "e",
      repeat: true
    });
    const saveEvent = syntheticKeyboardEvent("keydown", { code: "KeyP", key: "p" });
    const repeatedSaveEvent = syntheticKeyboardEvent("keydown", {
      code: "KeyP",
      key: "p",
      repeat: true
    });

    view.dispatch("keydown", craftingEvent);
    view.dispatch("keydown", repeatedCraftingEvent);
    view.dispatch("keydown", saveEvent);
    view.dispatch("keydown", repeatedSaveEvent);

    expect(actions.onToggleCrafting).toHaveBeenCalledTimes(1);
    expect(actions.onSave).toHaveBeenCalledTimes(1);
    expect(craftingEvent.defaultPrevented).toBe(true);
    expect(saveEvent.defaultPrevented).toBe(true);
    expect(nextFrameIntents(input).actions).toEqual([]);
  });

  it("prevents the canvas context menu while active", () => {
    const { canvas } = createSubject();
    const event = syntheticMouseEvent("contextmenu");

    canvas.dispatch("contextmenu", event);

    expect(event.defaultPrevented).toBe(true);
  });

  it("supports canvases whose owner document has no default view", () => {
    const canvas = new FakeCanvas(null);
    const actions: InputActions = {
      onToggleCrafting: vi.fn(),
      onSave: vi.fn()
    };
    const input = createInputController(canvas.asHtmlCanvasElement(), actions);

    canvas.dispatch("mousedown", syntheticMouseEvent("mousedown", 0));

    expect(nextFrameIntents(input)).toEqual({
      move: null,
      look: null,
      actions: [mineIntent()]
    });
  });

  it("reports unsupported pointer lock when no adapter is available", () => {
    const { input } = createSubject(null);

    expect(input.isPointerLockSupported()).toBe(false);
    expect(input.isPointerLocked()).toBe(false);
  });

  it("removes every listener on dispose and ignores later events", () => {
    const { actions, canvas, input, view } = createSubject();

    expect(canvas.listenerCount("mousedown")).toBe(1);
    expect(canvas.listenerCount("contextmenu")).toBe(1);
    expect(view.listenerCount("keydown")).toBe(1);
    expect(view.listenerCount("keyup")).toBe(1);

    input.dispose();

    expect(canvas.listenerCount("mousedown")).toBe(0);
    expect(canvas.listenerCount("contextmenu")).toBe(0);
    expect(view.listenerCount("keydown")).toBe(0);
    expect(view.listenerCount("keyup")).toBe(0);

    const mouseEvent = syntheticMouseEvent("mousedown", 0);
    const contextMenuEvent = syntheticMouseEvent("contextmenu");
    view.dispatch("keydown", syntheticKeyboardEvent("keydown", { code: "KeyW", key: "w" }));
    view.dispatch("keydown", syntheticKeyboardEvent("keydown", { code: "Digit1", key: "1" }));
    view.dispatch("keydown", syntheticKeyboardEvent("keydown", { code: "KeyE", key: "e" }));
    view.dispatch("keydown", syntheticKeyboardEvent("keydown", { code: "KeyP", key: "p" }));
    canvas.dispatch("mousedown", mouseEvent);
    canvas.dispatch("contextmenu", contextMenuEvent);

    expect(canvas.focusCalls).toBe(0);
    expect(mouseEvent.defaultPrevented).toBe(false);
    expect(contextMenuEvent.defaultPrevented).toBe(false);
    expect(actions.onToggleCrafting).not.toHaveBeenCalled();
    expect(actions.onSave).not.toHaveBeenCalled();
    expect(nextFrameIntents(input)).toEqual({
      move: null,
      look: null,
      actions: []
    });
  });

});
