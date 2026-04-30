import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createInputController,
  nextFrameIntents,
  type InputActions
} from "../../src/app/inputController";
import {
  mineIntent,
  moveIntent,
  placeIntent,
  selectHotbarIntent
} from "../../src/input/intents";

interface KeyboardEventInitLike {
  readonly code?: string;
  readonly key?: string;
  readonly repeat?: boolean;
}

interface MouseEventInitLike {
  readonly button?: number;
}

class FakeEventSource {
  private readonly listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();

  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    const listenersForType =
      this.listeners.get(type) ?? new Set<EventListenerOrEventListenerObject>();

    listenersForType.add(listener);
    this.listeners.set(type, listenersForType);
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type: string, event: Event): void {
    for (const listener of this.listeners.get(type) ?? []) {
      if (typeof listener === "function") {
        listener(event);
      } else {
        listener.handleEvent(event);
      }
    }
  }

  listenerCount(type: string): number {
    return this.listeners.get(type)?.size ?? 0;
  }
}

class FakeWindowEventSource extends FakeEventSource {
  asWindow(): Window {
    return this as unknown as Window;
  }
}

class FakeCanvasEventSource extends FakeEventSource {
  readonly ownerDocument: Document;
  focusCalls = 0;

  constructor(defaultView: Window | null) {
    super();
    this.ownerDocument = { defaultView } as unknown as Document;
  }

  focus(): void {
    this.focusCalls += 1;
  }

  asCanvas(): HTMLCanvasElement {
    return this as unknown as HTMLCanvasElement;
  }
}

function syntheticKeyboardEvent(
  type: "keydown" | "keyup",
  init: KeyboardEventInitLike
): Event {
  const event = new Event(type, { cancelable: true });

  Object.defineProperty(event, "code", { value: init.code ?? "" });
  Object.defineProperty(event, "key", { value: init.key ?? "" });
  Object.defineProperty(event, "repeat", { value: init.repeat ?? false });

  return event;
}

function syntheticMouseEvent(type: "mousedown" | "contextmenu", init: MouseEventInitLike): Event {
  const event = new Event(type, { cancelable: true });

  if (init.button !== undefined) {
    Object.defineProperty(event, "button", { value: init.button });
  }

  return event;
}

function createActions(): InputActions {
  return {
    onToggleCrafting: vi.fn(),
    onSave: vi.fn()
  };
}

function createHarness(): {
  readonly actions: InputActions;
  readonly canvas: FakeCanvasEventSource;
  readonly controller: ReturnType<typeof createInputController>;
  readonly view: FakeWindowEventSource;
} {
  const view = new FakeWindowEventSource();
  const canvas = new FakeCanvasEventSource(view.asWindow());
  const actions = createActions();
  const controller = createInputController(canvas.asCanvas(), actions);

  return { actions, canvas, controller, view };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("input controller", () => {
  it("combines currently pressed movement keys into one frame", () => {
    const { controller, view } = createHarness();

    view.dispatch("keydown", syntheticKeyboardEvent("keydown", { code: "KeyW", key: "w" }));
    view.dispatch("keydown", syntheticKeyboardEvent("keydown", { code: "KeyA", key: "a" }));

    expect(nextFrameIntents(controller)).toEqual({
      move: moveIntent(1, -1, 0, false),
      look: null,
      actions: []
    });

    view.dispatch("keyup", syntheticKeyboardEvent("keyup", { code: "KeyW", key: "w" }));
    view.dispatch("keyup", syntheticKeyboardEvent("keyup", { code: "KeyA", key: "a" }));
    view.dispatch("keydown", syntheticKeyboardEvent("keydown", { code: "KeyS", key: "s" }));
    view.dispatch("keydown", syntheticKeyboardEvent("keydown", { code: "KeyD", key: "d" }));

    expect(nextFrameIntents(controller)).toEqual({
      move: moveIntent(-1, 1, 0, false),
      look: null,
      actions: []
    });
  });

  it("drains mouse button actions in the same frame as movement", () => {
    const { canvas, controller, view } = createHarness();
    const mineEvent = syntheticMouseEvent("mousedown", { button: 0 });
    const placeEvent = syntheticMouseEvent("mousedown", { button: 2 });

    view.dispatch("keydown", syntheticKeyboardEvent("keydown", { code: "KeyW", key: "w" }));
    canvas.dispatch("mousedown", mineEvent);
    canvas.dispatch("mousedown", placeEvent);

    expect(canvas.focusCalls).toBe(2);
    expect(mineEvent.defaultPrevented).toBe(true);
    expect(placeEvent.defaultPrevented).toBe(true);
    expect(nextFrameIntents(controller)).toEqual({
      move: moveIntent(1, 0, 0, false),
      look: null,
      actions: [mineIntent(), placeIntent()]
    });
    expect(nextFrameIntents(controller).actions).toEqual([]);
  });

  it("prevents the canvas context menu without queuing an action", () => {
    const { canvas, controller } = createHarness();
    const event = syntheticMouseEvent("contextmenu", {});

    canvas.dispatch("contextmenu", event);

    expect(event.defaultPrevented).toBe(true);
    expect(nextFrameIntents(controller)).toEqual({
      move: null,
      look: null,
      actions: []
    });
  });

  it("queues hotbar selections from digit code and key fallbacks", () => {
    const { controller, view } = createHarness();
    const codeEvent = syntheticKeyboardEvent("keydown", { code: "Digit4", key: "4" });
    const keyEvent = syntheticKeyboardEvent("keydown", { key: "9" });
    const repeatEvent = syntheticKeyboardEvent("keydown", {
      code: "Digit2",
      key: "2",
      repeat: true
    });

    view.dispatch("keydown", codeEvent);
    view.dispatch("keydown", keyEvent);
    view.dispatch("keydown", repeatEvent);

    expect(codeEvent.defaultPrevented).toBe(true);
    expect(keyEvent.defaultPrevented).toBe(true);
    expect(repeatEvent.defaultPrevented).toBe(false);
    expect(nextFrameIntents(controller)).toEqual({
      move: null,
      look: null,
      actions: [selectHotbarIntent(3), selectHotbarIntent(8)]
    });
  });

  it("fires the crafting toggle callback once per non-repeat KeyE press", () => {
    const { actions, controller, view } = createHarness();
    const toggleEvent = syntheticKeyboardEvent("keydown", { code: "KeyE", key: "e" });
    const repeatEvent = syntheticKeyboardEvent("keydown", {
      code: "KeyE",
      key: "e",
      repeat: true
    });

    view.dispatch("keydown", toggleEvent);
    view.dispatch("keydown", repeatEvent);

    expect(toggleEvent.defaultPrevented).toBe(true);
    expect(repeatEvent.defaultPrevented).toBe(false);
    expect(actions.onToggleCrafting).toHaveBeenCalledTimes(1);
    expect(actions.onSave).not.toHaveBeenCalled();
    expect(nextFrameIntents(controller).actions).toEqual([]);
  });

  it("fires the save callback once per non-repeat KeyP press", () => {
    const { actions, controller, view } = createHarness();
    const saveEvent = syntheticKeyboardEvent("keydown", { code: "KeyP", key: "p" });
    const repeatEvent = syntheticKeyboardEvent("keydown", {
      code: "KeyP",
      key: "p",
      repeat: true
    });

    view.dispatch("keydown", saveEvent);
    view.dispatch("keydown", repeatEvent);

    expect(saveEvent.defaultPrevented).toBe(true);
    expect(repeatEvent.defaultPrevented).toBe(false);
    expect(actions.onSave).toHaveBeenCalledTimes(1);
    expect(actions.onToggleCrafting).not.toHaveBeenCalled();
    expect(nextFrameIntents(controller)).toEqual({
      move: null,
      look: null,
      actions: []
    });
  });

  it("supports a canvas whose owner document has no defaultView", () => {
    const canvas = new FakeCanvasEventSource(null);
    const actions = createActions();
    const controller = createInputController(canvas.asCanvas(), actions);

    canvas.dispatch("mousedown", syntheticMouseEvent("mousedown", { button: 0 }));

    expect(nextFrameIntents(controller)).toEqual({
      move: null,
      look: null,
      actions: [mineIntent()]
    });

    controller.dispose();

    expect(canvas.listenerCount("mousedown")).toBe(0);
    expect(canvas.listenerCount("contextmenu")).toBe(0);
  });

  it("removes every listener and ignores later dispatches on dispose", () => {
    const { actions, canvas, controller, view } = createHarness();

    expect(canvas.listenerCount("mousedown")).toBe(1);
    expect(canvas.listenerCount("contextmenu")).toBe(1);
    expect(view.listenerCount("keydown")).toBe(1);
    expect(view.listenerCount("keyup")).toBe(1);

    controller.dispose();

    const mouseEvent = syntheticMouseEvent("mousedown", { button: 0 });
    const contextMenuEvent = syntheticMouseEvent("contextmenu", {});

    view.dispatch("keydown", syntheticKeyboardEvent("keydown", { code: "KeyW", key: "w" }));
    view.dispatch("keydown", syntheticKeyboardEvent("keydown", { code: "Digit1", key: "1" }));
    view.dispatch("keydown", syntheticKeyboardEvent("keydown", { code: "KeyE", key: "e" }));
    view.dispatch("keydown", syntheticKeyboardEvent("keydown", { code: "KeyP", key: "p" }));
    canvas.dispatch("mousedown", mouseEvent);
    canvas.dispatch("contextmenu", contextMenuEvent);

    expect(canvas.listenerCount("mousedown")).toBe(0);
    expect(canvas.listenerCount("contextmenu")).toBe(0);
    expect(view.listenerCount("keydown")).toBe(0);
    expect(view.listenerCount("keyup")).toBe(0);
    expect(canvas.focusCalls).toBe(0);
    expect(mouseEvent.defaultPrevented).toBe(false);
    expect(contextMenuEvent.defaultPrevented).toBe(false);
    expect(actions.onToggleCrafting).not.toHaveBeenCalled();
    expect(actions.onSave).not.toHaveBeenCalled();
    expect(nextFrameIntents(controller)).toEqual({
      move: null,
      look: null,
      actions: []
    });
  });
});
